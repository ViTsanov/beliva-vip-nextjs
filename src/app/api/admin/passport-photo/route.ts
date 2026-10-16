import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getAdminStorage } from '@/lib/firebaseAdmin';
import { decryptBuffer } from '@/lib/encryption';

// Връща разкодирана снимка на паспорт — САМО за логнат админ. Файловете в Storage са криптирани
// (виж /api/checkout/upload-passport), затова тук ги декриптираме в паметта и ги връщаме директно,
// без да ги записваме никъде и без кеширане.

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const path = new URL(request.url).searchParams.get('path') || '';
  // Само нашата папка със сканове; без излизане извън нея.
  if (!/^passport-scans\/[A-Za-z0-9_-]+\/[A-Za-z0-9-]+\.enc$/.test(path)) {
    return NextResponse.json({ error: 'Невалиден път' }, { status: 400 });
  }

  try {
    const [encrypted] = await getAdminStorage().bucket().file(path).download();
    const plain = decryptBuffer(encrypted);
    if (!plain) {
      return NextResponse.json({ error: 'Файлът не може да бъде разкодиран' }, { status: 422 });
    }
    const type = plain[0] === 0xff ? 'image/jpeg' : plain[0] === 0x89 ? 'image/png' : 'image/webp';
    return new NextResponse(new Uint8Array(plain), {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
      },
    });
  } catch (error: unknown) {
    console.error('[passport-photo]', error);
    return NextResponse.json({ error: 'Снимката не е намерена' }, { status: 404 });
  }
}
