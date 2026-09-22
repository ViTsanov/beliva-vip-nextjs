import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireAdmin } from '@/lib/adminAuth';
import { getAdminDb, getAdminStorage } from '@/lib/firebaseAdmin';
import sharp from 'sharp';

// Оптимизира ЕДНА вече качена снимка — извиква се веднъж на снимка от MediaLibrary.tsx (клиентски цикъл,
// едно повикване наведнъж). ВСИЧКО тук е сървърно (Node.js fetch + sharp) — заобикаля CORS напълно,
// за разлика от предишния client-side canvas опит, който гръмна с "No 'Access-Control-Allow-Origin' header".
export async function POST(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { mediaId, url, path: storagePath, name } = await request.json();
    if (!mediaId || !url) {
      return NextResponse.json({ error: 'Липсва mediaId или url' }, { status: 400 });
    }

    // 1. Изтегляме оригиналната снимка — сървър-до-сървър, без браузърни CORS ограничения.
    const imgRes = await fetch(url);
    if (!imgRes.ok) {
      return NextResponse.json({ error: `Неуспешно изтегляне на снимката (${imgRes.status})` }, { status: 500 });
    }
    const inputBuffer = Buffer.from(await imgRes.arrayBuffer());

    // 2. Проверяваме реалните пикселни размери — пропускаме, ако вече е достатъчно малка.
    const metadata = await sharp(inputBuffer).metadata();
    const { width = 0, height = 0 } = metadata;

    if (width <= 2000 && height <= 2000) {
      return NextResponse.json({ success: true, skipped: true, width, height });
    }

    // 3. Смаляваме (максимум 2000px по дългата страна, запазвайки пропорциите) + конвертираме към WebP —
    // същите параметри като convertToWebP.ts, ползван при ново качване.
    const outputBuffer = await sharp(inputBuffer)
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    // 4. Качваме новата версия в Storage. Генерираме собствен download token и го слагаме като metadata —
    // това е точно как Firebase Client SDK изгражда своите ...?alt=media&token=... линкове, така че новият
    // URL да изглежда идентично на всички съществуващи в базата (не различен формат за новите файлове).
    const storage = getAdminStorage();
    const bucket = storage.bucket();
    const newPath = `library-optimized/${Date.now()}-${(name || 'image').replace(/\.[^/.]+$/, '')}.webp`;
    const file = bucket.file(newPath);
    const downloadToken = randomUUID();

    await file.save(outputBuffer, {
      metadata: {
        contentType: 'image/webp',
        metadata: { firebaseStorageDownloadTokens: downloadToken },
      },
    });

    const newUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(newPath)}?alt=media&token=${downloadToken}`;

    // 5. Обновяваме media документа в Firestore.
    const db = getAdminDb();
    await db.collection('media').doc(mediaId).update({ url: newUrl, path: newPath });

    // 6. Обновяваме ВСИЧКИ турове, които реферират старото URL (hero снимка или в галерията) —
    // в един batch запис, за да е атомарно и бързо.
    const toursSnap = await db.collection('tours').get();
    const batch = db.batch();
    let updatedCount = 0;

    toursSnap.forEach(doc => {
      const data = doc.data();
      let needsUpdate = false;
      const updates: Record<string, unknown> = {};

      if (data.img === url) {
        updates.img = newUrl;
        needsUpdate = true;
      }
      if (Array.isArray(data.galleryWithCaptions)) {
        const newGallery = data.galleryWithCaptions.map((g: any) =>
          g?.url === url ? { ...g, url: newUrl } : g
        );
        if (JSON.stringify(newGallery) !== JSON.stringify(data.galleryWithCaptions)) {
          updates.galleryWithCaptions = newGallery;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        batch.update(doc.ref, updates);
        updatedCount++;
      }
    });

    if (updatedCount > 0) await batch.commit();

    // 7. Трием старото, оригинално голямо изображение от Storage — само ако реално е наше (не external/drive).
    if (storagePath && storagePath !== 'external' && storagePath !== 'google_drive') {
      await bucket.file(storagePath).delete().catch(() => {});
    }

    return NextResponse.json({ success: true, skipped: false, newUrl, width, height, updatedTours: updatedCount });
  } catch (error: unknown) {
    console.error('[optimize-image]', error);
    const message = error instanceof Error ? error.message : 'Грешка при оптимизиране на снимката';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
