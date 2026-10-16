import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminDb, getAdminStorage } from '@/lib/firebaseAdmin';
import { encryptBuffer } from '@/lib/encryption';
import { FieldValue } from 'firebase-admin/firestore';

// Публичен endpoint (клиентът няма логин) за качване на снимка на паспорт от checkout формата.
// Достъпът се пази ИЗЦЯЛО от токена на запитването: съществува, не е изтекъл и формата е отворена за
// попълване (още не е изпратена ИЛИ админът е поискал корекция). Файлът се криптира (AES-256-GCM)
// ПРЕДИ да влезе в Storage, защото Storage правилата в проекта позволяват публично четене.

export const runtime = 'nodejs';

const MAX_BYTES = 6 * 1024 * 1024; // клиентът свива снимките до ~0.5 MB; това е таван срещу злоупотреба
const MAX_UPLOADS_PER_INQUIRY = 20;

// Приемаме само реални изображения — проверяваме първите байтове, а не само подаденото Content-Type.
function detectImage(buf: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length > 12 && buf[0] === 0x89 && buf.subarray(1, 4).toString('ascii') === 'PNG') return 'png';
  if (buf.length > 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const token = String(form.get('token') || '');
    const file = form.get('file');

    if (!token || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Липсва файл или линк.' }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ success: false, error: 'Снимката е твърде голяма (максимум 6 MB).' }, { status: 413 });
    }

    const db = getAdminDb();
    const snap = await db.collection('inquiries').where('checkoutToken', '==', token).limit(1).get();
    if (snap.empty) {
      return NextResponse.json({ success: false, error: 'Този линк не е валиден.' }, { status: 403 });
    }
    const inquiryRef = snap.docs[0].ref;
    const data = snap.docs[0].data();

    if (!data.checkoutTokenExpiry || Date.now() > data.checkoutTokenExpiry) {
      return NextResponse.json({ success: false, error: 'Този линк е изтекъл.' }, { status: 403 });
    }
    if (data.checkoutCompletedAt && !data.checkoutReopened) {
      return NextResponse.json({ success: false, error: 'Данните за тази резервация вече са изпратени.' }, { status: 403 });
    }
    if ((data.passportUploadCount || 0) >= MAX_UPLOADS_PER_INQUIRY) {
      return NextResponse.json({ success: false, error: 'Достигнат е лимитът на качените снимки. Свържете се с агенцията.' }, { status: 429 });
    }

    const raw = Buffer.from(await file.arrayBuffer());
    if (!detectImage(raw)) {
      return NextResponse.json({ success: false, error: 'Файлът не е поддържана снимка (JPG, PNG или WebP).' }, { status: 415 });
    }

    const path = `passport-scans/${inquiryRef.id}/${crypto.randomUUID()}.enc`;
    await getAdminStorage().bucket().file(path).save(encryptBuffer(raw), {
      contentType: 'application/octet-stream',
      resumable: false,
      metadata: { cacheControl: 'private, no-store' },
    });
    await inquiryRef.update({ passportUploadCount: FieldValue.increment(1) });

    return NextResponse.json({ success: true, path });
  } catch (error: unknown) {
    console.error('[upload-passport]', error);
    return NextResponse.json({ success: false, error: 'Снимката не можа да бъде качена. Опитайте отново.' }, { status: 500 });
  }
}
