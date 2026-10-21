// src/lib/shareImage.ts
//
// Прави снимката за превю при споделяне: JPEG точно 1200×630 (изрязана по средата). Само за сървъра —
// ползва се от маршрутите */og.jpg. Адресите им идват от shareMeta.ts.
import sharp from 'sharp';
import { readFile } from 'fs/promises';
import path from 'path';
import { CUSTOM_DEFAULT_PHOTO, HERO_SHARE_PHOTOS, SHARE_IMAGE_SIZE } from '@/lib/shareMeta';

const { width: W, height: H } = SHARE_IMAGE_SIZE;
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const MAX_BYTES = 20 * 1024 * 1024;

// Снимка от /public или от интернет (Firebase Storage и т.н.). null, ако липсва или не се изтегля навреме.
async function loadPhoto(src: string): Promise<Buffer | null> {
  try {
    if (src.startsWith('/')) {
      const file = path.join(PUBLIC_DIR, decodeURIComponent(src.split('?')[0]));
      if (!file.startsWith(PUBLIC_DIR + path.sep)) return null;
      return await readFile(file);
    }
    const res = await fetch(src, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!res.ok || !(res.headers.get('content-type') || '').startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 0 && buf.length <= MAX_BYTES ? buf : null;
  } catch {
    return null;
  }
}

const toJpeg = (img: sharp.Sharp) =>
  img.flatten({ background: '#ffffff' }).jpeg({ quality: 82, mozjpeg: true, progressive: true }).toBuffer();

async function cover(photo: Buffer, width: number = W, height: number = H) {
  return sharp(photo).rotate().resize(width, height, { fit: 'cover', position: 'centre' });
}

// Първата снимка от списъка, която се изтегли и прочете, като JPEG 1200×630
export async function renderPhoto(sources: string[]): Promise<Buffer | null> {
  for (const src of sources) {
    const photo = await loadPhoto(src);
    if (!photo) continue;
    try {
      return await toJpeg(await cover(photo));
    } catch {
      // повредена или непозната снимка — пробваме следващата
    }
  }
  return null;
}

// Снимката по подразбиране: public/og-default.jpg, ако собственикът е сложил такава, иначе колаж от hero снимките —
// голямата първа вляво, другите четири 2×2 вдясно, логото в бяло квадратче долу вляво.
export async function renderDefault(): Promise<Buffer> {
  const custom = await renderPhoto([CUSTOM_DEFAULT_PHOTO]);
  if (custom) return custom;

  const GAP = 6;
  const bigW = 696;
  const tileW = (W - bigW - GAP * 2) / 2;
  const tileH = (H - GAP) / 2;
  const [first, ...rest] = await Promise.all(HERO_SHARE_PHOTOS.slice(0, 5).map(loadPhoto));

  const layers: sharp.OverlayOptions[] = [];
  if (first) layers.push({ input: await (await cover(first, bigW, H)).toBuffer(), left: 0, top: 0 });
  for (const [i, photo] of rest.entries()) {
    if (!photo) continue;
    const left = bigW + GAP + (i % 2) * (tileW + GAP);
    const top = Math.floor(i / 2) * (tileH + GAP);
    layers.push({ input: await (await cover(photo, tileW, tileH)).toBuffer(), left, top });
  }

  const logo = await loadPhoto('/beliva_logo.png');
  if (logo) {
    const box = 132;
    const badge = await sharp({ create: { width: box, height: box, channels: 4, background: '#ffffff' } })
      .composite([
        { input: Buffer.from(`<svg width="${box}" height="${box}"><rect width="${box}" height="${box}" rx="22" fill="#fff"/></svg>`), blend: 'dest-in' },
        { input: await sharp(logo).resize(108, 108, { fit: 'contain', background: '#ffffff00' }).toBuffer(), left: 12, top: 12 },
      ])
      .png()
      .toBuffer();
    layers.push({ input: badge, left: 32, top: H - box - 32 });
  }

  return toJpeg(sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } }).composite(layers));
}

// Отговорът на маршрута. Адресите в meta таговете носят ?v=<отпечатък на снимката>, затова отговорът се кешира
// дълго (браузъри, CDN, Facebook) — при нова снимка адресът се сменя сам.
export function jpegResponse(jpeg: Buffer) {
  return new Response(new Uint8Array(jpeg), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(jpeg.length),
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
    },
  });
}

// Снимка от списъка или, ако никоя не стане, колажът по подразбиране
export async function shareImageResponse(sources: string[]) {
  return jpegResponse((await renderPhoto(sources)) || (await renderDefault()));
}
