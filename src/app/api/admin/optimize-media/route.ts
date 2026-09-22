import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getAdminDb, getAdminStorage } from '@/lib/firebaseAdmin';
import sharp from 'sharp';
import crypto from 'crypto';

// Сървърна (Admin SDK) оптимизация на вече качени снимки, по-големи от нужното — обработва малка партида
// (BATCH_SIZE) на всяко извикване в масов режим, или ЕДНА конкретна снимка в единичен режим (mediaId),
// за да не рискуваме да ударим лимит на времето за изпълнение при много снимки наведнъж.
//
// ЗАЩО СЪРВЪРНО, НЕ В БРАУЗЪРА: първоначалният опит ползваше canvas в браузъра, но Firebase Storage
// download URL-ите не изпращат Access-Control-Allow-Origin хедър по подразбиране — браузърът блокира
// четенето на пикселите с CORS грешка. Admin SDK тук чете директно от Storage (Node-към-Google, не
// през HTTP fetch от браузъра), напълно заобикаляйки този проблем.

const MAX_DIMENSION = 2000;
const BATCH_SIZE = 5;

type MediaDocSnap = FirebaseFirestore.QueryDocumentSnapshot;
type TourRef = { ref: FirebaseFirestore.DocumentReference; data: any };

// Обработва ЕДНА снимка — сваля я, проверява размера, смалява ако е нужно, качва новата версия,
// обновява media документа и всички турове, които я реферират. Връща статус И конкретното
// съобщение за грешка, ако има такава — без това грешките са невъзможни за диагностициране от
// клиентската страна — console.error сам по себе си се вижда само в сървърния терминал, не в браузъра.
async function optimizeSingleMedia(
  mediaDoc: MediaDocSnap,
  bucket: ReturnType<ReturnType<typeof getAdminStorage>['bucket']>,
  allTours: TourRef[]
): Promise<{ status: 'processed' | 'skipped' | 'failed'; error?: string }> {
  const media = mediaDoc.data();
  try {
    const file = bucket.file(media.path);
    const [buffer] = await file.download();
    const metadata = await sharp(buffer).metadata();

    if ((metadata.width || 0) <= MAX_DIMENSION && (metadata.height || 0) <= MAX_DIMENSION) {
      return { status: 'skipped' };
    }

    const resizedBuffer = await sharp(buffer)
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const newPath = `library-optimized/${Date.now()}-${(media.name || 'image').replace(/\.[^/.]+$/, '')}.webp`;
    const newFile = bucket.file(newPath);
    const token = crypto.randomUUID();
    await newFile.save(resizedBuffer, {
      metadata: {
        contentType: 'image/webp',
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });
    const newUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(newPath)}?alt=media&token=${token}`;
    const oldUrl = media.url;

    await mediaDoc.ref.update({ url: newUrl, path: newPath });

    // Обновяваме всички турове, реферати старото URL — и като hero (img), и в галерията
    for (const tour of allTours) {
      let needsUpdate = false;
      const updates: Record<string, unknown> = {};
      if (tour.data.img === oldUrl) {
        updates.img = newUrl;
        needsUpdate = true;
      }
      if (Array.isArray(tour.data.galleryWithCaptions)) {
        const newGallery = tour.data.galleryWithCaptions.map((g: any) =>
          g?.url === oldUrl ? { ...g, url: newUrl } : g
        );
        if (JSON.stringify(newGallery) !== JSON.stringify(tour.data.galleryWithCaptions)) {
          updates.galleryWithCaptions = newGallery;
          needsUpdate = true;
        }
      }
      if (needsUpdate) await tour.ref.update(updates);
    }

    // Трием старото, оригинално голямо изображение — вече не ни трябва, плащаме за него излишно
    await file.delete().catch(() => {});

    return { status: 'processed' };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[optimize-media] Грешка при ${media.name}:`, e);
    return { status: 'failed', error: message };
  }
}

export async function POST(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({}));
    const mediaId: string | undefined = typeof body.mediaId === 'string' ? body.mediaId : undefined;
    const skipIds: string[] = Array.isArray(body.skipIds) ? body.skipIds : [];

    const db = getAdminDb();
    const bucket = getAdminStorage().bucket();

    // Зареждаме ВСИЧКИ турове ЕДИН път — нужни са и за единичен, и за масов режим
    const toursSnap = await db.collection('tours').get();
    const allTours: TourRef[] = toursSnap.docs.map(d => ({ ref: d.ref, data: d.data() as any }));

    // ЕДИНИЧЕН РЕЖИМ: обработваме само конкретната снимка, независимо от skipIds/партиди
    if (mediaId) {
      const mediaDoc = await db.collection('media').doc(mediaId).get();
      if (!mediaDoc.exists) {
        return NextResponse.json({ error: 'Снимката не е намерена' }, { status: 404 });
      }
      const data = mediaDoc.data()!;
      if (!data.path || data.path === 'external' || data.path === 'google_drive') {
        return NextResponse.json({ error: 'Тази снимка не е директно качена (линк или Drive) — няма какво да се смали.' }, { status: 400 });
      }
      const result = await optimizeSingleMedia(mediaDoc as unknown as MediaDocSnap, bucket, allTours);
      return NextResponse.json({
        done: true,
        processed: result.status === 'processed' ? 1 : 0,
        skipped: result.status === 'skipped' ? 1 : 0,
        failed: result.status === 'failed' ? 1 : 0,
        remaining: 0,
        processedIds: [mediaId],
        result: result.status,
        error: result.error,
      });
    }

    // МАСОВ РЕЖИМ: партида от BATCH_SIZE необработени кандидати
    const mediaSnap = await db.collection('media').get();
    const candidates = mediaSnap.docs.filter(d => {
      const data = d.data();
      return data.path && data.path !== 'external' && data.path !== 'google_drive' && !skipIds.includes(d.id);
    });

    if (candidates.length === 0) {
      return NextResponse.json({ done: true, processed: 0, skipped: 0, failed: 0, remaining: 0, processedIds: [] });
    }

    const batch = candidates.slice(0, BATCH_SIZE);
    let processed = 0, skipped = 0, failed = 0;
    const processedIds: string[] = [];

    for (const mediaDoc of batch) {
      processedIds.push(mediaDoc.id);
      const result = await optimizeSingleMedia(mediaDoc, bucket, allTours);
      if (result.status === 'processed') processed++;
      else if (result.status === 'skipped') skipped++;
      else failed++;
    }

    return NextResponse.json({
      done: candidates.length <= BATCH_SIZE,
      processed,
      skipped,
      failed,
      remaining: Math.max(0, candidates.length - BATCH_SIZE),
      processedIds,
    });
  } catch (error: unknown) {
    console.error('[optimize-media]', error);
    const message = error instanceof Error ? error.message : 'Грешка при оптимизация';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
