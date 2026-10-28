import { getImageProps } from 'next/image';

// Общото между героите на тур (TourHero) и държава (DestinationHero): една и съща голяма снимка на цял екран.
// HeroPreloader я сваля при докосване на линка и отваря страницата чак когато е готова; HeroReveal я показва заедно
// със заглавието. За да се свали точно същият файл, настройките трябва да са едни и същи навсякъде.
export const HERO_PHOTO_SIZES = '100vw';
export const HERO_PHOTO_QUALITY = 70;

// Първата страница е заредена (хидратирана). От тук нататък всяко отваряне на страница е вътрешен клик, а не
// първо посещение — само тогава героят изчаква снимката (виж HeroReveal).
let hydrated = false;
export const markHydrated = () => { hydrated = true; };
export const isClientNavigation = () => hydrated;

// Сваля голямата снимка на героя в кеша на браузъра — същия размер, който ще избере героят. Обещанието се изпълнява,
// когато снимката е свалена и декодирана (готова за показване) — или при грешка, за да не блокира отварянето.
const loading = new Map<string, Promise<void>>();
export function preloadHeroPhoto(src: string): Promise<void> {
  const existing = loading.get(src);
  if (existing) return existing;
  const { props } = getImageProps({ src, alt: '', fill: true, sizes: HERO_PHOTO_SIZES, quality: HERO_PHOTO_QUALITY });
  const img = new window.Image();
  img.fetchPriority = 'high';
  if (props.sizes) img.sizes = props.sizes;
  if (props.srcSet) img.srcset = props.srcSet;
  img.src = props.src;
  const ready = img.decode().catch(() => undefined);
  loading.set(src, ready);
  return ready;
}
