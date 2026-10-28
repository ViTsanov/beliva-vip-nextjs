import { getImageProps } from 'next/image';

// Снимката в пълен размер в галерията (ImageModal). Преди беше оригиналният файл от Firebase Storage — голям и
// теглен чак когато снимката се покаже, затова всяка стрелка чакаше ~2 s. Сега е оразмерена от Next (WebP по
// размера на екрана), а следващите се теглят предварително.
// Снимката е „object-contain“ до 80vh височина: хоризонтална снимка 3:2 е широка най-много 120vh, затова не трябва
// по-широк файл от min(100vw, 120vh) — така на лаптоп излиза 1080 px, който скриптът за загряване вече е направил.
export const LIGHTBOX_SIZES = 'min(100vw, 120vh)';

export function lightboxImageProps(src: string, alt: string) {
  const { props } = getImageProps({ src, alt, fill: true, sizes: LIGHTBOX_SIZES, quality: 75 });
  return { src: props.src, srcSet: props.srcSet, sizes: props.sizes, alt };
}

// Сваля и декодира снимката (готова за показване). Грешката не спира галерията — тогава просто я показваме.
const ready = new Map<string, Promise<void>>();
export function preloadLightboxPhoto(src: string): Promise<void> {
  if (!src) return Promise.resolve();
  const existing = ready.get(src);
  if (existing) return existing;
  const p = lightboxImageProps(src, '');
  const img = new window.Image();
  img.sizes = p.sizes || LIGHTBOX_SIZES;
  if (p.srcSet) img.srcset = p.srcSet;
  img.src = p.src;
  const done = img.decode().catch(() => undefined);
  ready.set(src, done);
  return done;
}
