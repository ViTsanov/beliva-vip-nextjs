// src/lib/shareMeta.ts
//
// Превюто при споделяне (Facebook, Messenger, Viber, WhatsApp, X) и снимката в резултатите на Google.
// Всяка публична страница дава своите og:* и twitter:* тагове през shareMetadata(), със снимка 1200×630 JPEG
// от нашия домейн — WebP снимките (hero, Firebase Storage) Messenger изобщо не ги показва, а Facebook ги реже
// грешно, защото истинският им размер не е 1200×630. JPEG-ите се правят от маршрутите
// /og/default.jpg, /tour/<id>/og.jpg, /destinations/<държава>/og.jpg и /blog/<id>/og.jpg (виж shareImage.ts).
import type { Metadata } from 'next';
import type { ITour } from '@/types';
import { isOperatorHotlink } from '@/lib/operatorImageDomains';

export const SITE_URL = 'https://belivavip.bg';
export const SITE_NAME = 'Beliva VIP Tour';
export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const;

// Снимките на началната страница — по реда на слайдовете в Hero.tsx / HeroClassic.tsx. От тях е колажът на
// /og/default.jpg (началната страница и страниците без собствена снимка): първата голяма вляво, другите 2×2.
// При смяна на hero снимките се сменя и този списък.
export const HERO_SHARE_PHOTOS = [
  '/hero/peru2.jpg',
  '/hero/china2.jpg',
  '/hero/mexico.webp',
  '/hero/australia3.jpg',
  '/hero/thailand2.jpg',
];

// Собствена снимка по подразбиране: ако съществува public/og-default.jpg (1200×630), /og/default.jpg ползва нея вместо колажа
export const CUSTOM_DEFAULT_PHOTO = '/og-default.jpg';

// Кратък отпечатък на източника — влиза в адреса като ?v=…, така при нова снимка Facebook вижда нов адрес
// и не показва старата от кеша си
function version(...parts: (string | null | undefined)[]): string {
  let h = 5381;
  for (const ch of parts.filter(Boolean).join('|')) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  return h.toString(36);
}

export const defaultShareImage = () => `${SITE_URL}/og/default.jpg?v=${version(...HERO_SHARE_PHOTOS)}`;

// Адрес, който външни ботове (Facebook, Google) могат да изтеглят. Google Drive иска вход, а сайтовете на
// туроператорите имат защита срещу hotlink (и снимките не са наши).
export function isPublicPhoto(url: unknown): url is string {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('/')) return !url.startsWith('//');
  if (!url.startsWith('http')) return false;
  if (url.includes('drive.google.com') || url.includes('docs.google.com')) return false;
  return !isOperatorHotlink(url);
}

// Кандидатите за снимката на тура, по ред: основната снимка, после галерията. /tour/<id>/og.jpg пробва
// всеки поред и взима първия, който се изтегли.
export function tourShareSources(tour: Pick<ITour, 'img' | 'gallery' | 'galleryWithCaptions'>): string[] {
  const gallery = [
    ...(Array.isArray(tour.galleryWithCaptions) ? tour.galleryWithCaptions : []),
    ...(Array.isArray(tour.gallery) ? tour.gallery : []),
  ].map((item) => (typeof item === 'string' ? item : (item as { url?: string } | null)?.url));
  return [...new Set([tour.img, ...gallery].filter(isPublicPhoto))].slice(0, 4);
}

export const tourShareImage = (tour: ITour, slug: string) =>
  `${SITE_URL}/tour/${encodeURIComponent(slug)}/og.jpg?v=${version(...tourShareSources(tour))}`;

// heroPhoto — от resolveHeroImage (countryPage.ts)
export const countryShareImage = (countrySlug: string, heroPhoto: string | null) =>
  `${SITE_URL}/destinations/${encodeURIComponent(countrySlug)}/og.jpg?v=${version(heroPhoto)}`;

type PostPhotos = { coverImg?: unknown; img?: unknown };

export const blogShareSources = (post: object): string[] =>
  [(post as PostPhotos).coverImg, (post as PostPhotos).img].filter(isPublicPhoto);

export const blogShareImage = (slug: string, post: object) =>
  `${SITE_URL}/blog/${encodeURIComponent(slug)}/og.jpg?v=${version(...blogShareSources(post))}`;

type ShareInput = {
  path: string;           // „/contacts“ — адресът, който Facebook запомня за превюто
  title: string;          // пълното заглавие, както да излезе в превюто
  description: string;
  image?: string;         // абсолютен адрес на JPEG 1200×630; по подразбиране колажът /og/default.jpg
  imageAlt?: string;
  type?: 'website' | 'article';
  article?: { publishedTime?: string; authors?: string[] };
};

// og:* и twitter:* за една страница. Next не слива openGraph на страницата с този от layout.tsx — замества го
// изцяло, затова всичко (адрес, заглавие, снимка с размер и тип) се дава наведнъж тук.
export function shareMetadata({ path, title, description, image, imageAlt, type = 'website', article }: ShareInput): Pick<Metadata, 'openGraph' | 'twitter'> {
  const url = `${SITE_URL}${path === '/' ? '' : path}`;
  const img = {
    url: image || defaultShareImage(),
    ...SHARE_IMAGE_SIZE,
    type: 'image/jpeg',
    alt: imageAlt || title,
  };
  return {
    openGraph: {
      url,
      title,
      description,
      siteName: SITE_NAME,
      locale: 'bg_BG',
      images: [img],
      ...(type === 'article' ? { type: 'article', ...article } : { type: 'website' }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [img],
    },
  };
}
