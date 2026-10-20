import type { Metadata } from 'next';
import TourClient from "@/components/TourClient";
import TourSchema from "@/components/TourSchema";
import { getTourBySlug, getActiveTours } from "@/services/tourService";
import { notFound, permanentRedirect } from "next/navigation";
import { slugify } from "@/lib/admin-helpers";
import type { ITour } from "@/types";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, limit, doc, getDoc } from "firebase/firestore";
import { isOperatorHotlink } from "@/lib/operatorImageDomains";

// Презарежда на 60 секунди — новите турове се появяват в продукция максимум след  1 минута
export const revalidate = 60; 

const SITE_URL = "https://belivavip.bg";

type Props = {
  params: Promise<{ id: string }>
};

// Извличаме свързани блог статии по държава/континент
async function getRelatedPosts(countryData: string | string[], continentData?: string) {
  try {
    const countries = Array.isArray(countryData)
      ? countryData
      : countryData.split(',').map((c: string) => c.trim()).filter(Boolean);

    let posts: any[] = [];

    // 1. Търсим по всяка държава поотделно (Firebase не поддържа OR между различни стойности на масив)
    for (const country of countries.slice(0, 2)) {
      if (posts.length >= 4) break;
      try {
        const q = query(
          collection(db, "posts"),
          where("relatedCountry", "==", country),
          limit(4)
        );
        const snap = await getDocs(q);
        const found = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        posts = [...posts, ...found.filter(p => !posts.some((existing: any) => existing.id === p.id))];
      } catch (_) {}
    }

    // 2. Ако няма нищо по държава, пробваме по континент
    if (posts.length === 0 && continentData) {
      try {
        const q = query(
          collection(db, "posts"),
          where("relatedContinent", "==", continentData),
          limit(4)
        );
        const snap = await getDocs(q);
        posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (_) {}
    }

    // Serialize ALL Firestore Timestamps — any field with toDate() method
    const serializeDoc = (data: any): any => {
      if (!data || typeof data !== 'object') return data;
      const result: any = {};
      for (const key of Object.keys(data)) {
        const val = data[key];
        if (val && typeof val === 'object' && typeof val.toDate === 'function') {
          result[key] = val.toDate().toISOString();
        } else if (Array.isArray(val)) {
          result[key] = val.map(serializeDoc);
        } else {
          result[key] = val;
        }
      }
      return result;
    };

    return posts.slice(0, 4).map(serializeDoc);
  } catch (error) {
    console.error("Error fetching related posts:", error);
    return [];
  }
}

// Извлича най-добрия наличен URL за Facebook OG/Twitter preview
const getRawImageUrl = (tour: any): string => {
  // Проверява дали даденият URL е достъпен за външни ботове (FB, Twitter)
  const isPublicUrl = (url: any): url is string => {
    if (!url || typeof url !== 'string') return false;
    if (!url.startsWith('http')) return false;
    // Google Drive и lh3 изискват Google auth — не работят за OG
    if (url.includes('drive.google.com')) return false;
    if (url.includes('docs.google.com')) return false;
    // Сайтове на оператори — хотlink риск / hotlink protection, блокират Facebook crawler
    if (isOperatorHotlink(url)) return false;
    return true;
  };

  // 1. Основната снимка на тура
  if (isPublicUrl(tour.img)) return tour.img;

  // 2. Нов формат на галерията (galleryWithCaptions = [{url, caption}])
  if (Array.isArray(tour.galleryWithCaptions)) {
    for (const item of tour.galleryWithCaptions) {
      const url = typeof item === 'string' ? item : item?.url;
      if (isPublicUrl(url)) return url;
    }
  }

  // 3. Стар формат (gallery = [url1, url2] — масив от стрингове)
  if (Array.isArray(tour.gallery)) {
    for (const item of tour.gallery) {
      const url = typeof item === 'string' ? item : item?.url;
      if (isPublicUrl(url)) return url;
    }
  }

  // 4. Relative път (от /public)
  if (tour.img && typeof tour.img === 'string' && tour.img.startsWith('/')) {
    return `${SITE_URL}${tour.img}`;
  }

  // 5. Fallback — херо снимка от сайта (не логото!)
  return `${SITE_URL}/hero/singapore.webp`;
};

// 1. ГЕНЕРИРАНЕ НА МЕТАДАННИ
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const tour = await getTourBySlug(resolvedParams.id); // ВЕЧЕ Е САМО 1 РЕД!

  // Липсващ тур → страницата връща истински 404 (вж. TourPage). Без "| Beliva VIP Tour" тук — шаблонът в layout.tsx
  // вече го добавя (иначе заглавието ставаше „… | Beliva VIP Tour | Beliva VIP Tour“).
  if (!tour) return { title: 'Турът не е намерен', robots: { index: false, follow: true } };

  // Build the best possible absolute image URL
  const ogImageUrl = getRawImageUrl(tour);
  const canonicalUrl = `${SITE_URL}/tour/${tour.slug || tour.tourId || tour.id}`;
  const description = tour.intro
    ? tour.intro.replace(/<[^>]*>?/gm, '').substring(0, 155) + '...'
    : `Открийте ${Array.isArray(tour.country) ? tour.country.join(', ') : tour.country} с Beliva VIP Tour. ${tour.price ? 'Цена от ' + tour.price + '.' : ''}`;

  // Заглавие за Google: до ~60 знака се показва цялото. Държавата се добавя само ако я няма в името на тура
  // и се побира, а „| Beliva VIP Tour“ — също само ако се побира (иначе Google реже точно името на тура).
  const countries = Array.isArray(tour.country) ? tour.country : String(tour.country || '').split(',').map(c => c.trim()).filter(Boolean);
  const withCountry = countries[0]
    && !tour.title.toLowerCase().includes(countries[0].toLowerCase())
    && tour.title.length + countries[0].length + 3 <= 60
    ? `${tour.title} – ${countries[0]}`
    : tour.title;
  const seoTitle = withCountry.length <= 42 ? `${withCountry} | Beliva VIP Tour` : withCountry;

  return {
    title: { absolute: seoTitle },
    description,
    alternates: { canonical: canonicalUrl },
    // Архивирани / чакащи / чернови турове остават достъпни по линк (напр. за клиенти), но не трябва да се показват
    // в Google — с минали дати или непубликувано съдържание само биха влошили качеството на сайта в очите на търсачката.
    ...(tour.status !== 'public' && { robots: { index: false, follow: true } }),
    openGraph: {
      type: 'website',
      url: canonicalUrl,
      title: tour.title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: tour.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: tour.title,
      description,
      images: [ogImageUrl],
    },
  };
}

// Извлича реалните публикувани отзиви за конкретния тур — за aggregateRating/review в structured data (Google Search Console
// флагна липсата им). ВАЖНО: ако няма реални отзиви за този конкретен тур, НЕ измисляме фалшив
// рейтинг — Google изрично забранява фалшив/необосновани рейтинги в structured data.
async function getTourReviews(tourId: string) {
  try {
    const q = query(
      collection(db, "reviews"),
      where("tourId", "==", tourId),
      where("isPublished", "==", true)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => d.data())
      .filter(r => typeof r.rating === 'number' && r.rating > 0)
      .map(r => ({
        rating: r.rating,
        comment: (r.comment || r.text || '').toString(),
        customerName: r.customerName || 'Клиент',
      }));
  } catch (error) {
    console.error("Грешка при извличане на отзиви за тур:", error);
    return [];
  }
}

const countriesOf = (tour: ITour): string[] =>
  Array.isArray(tour.country)
    ? tour.country.filter(Boolean)
    : typeof tour.country === 'string'
      ? tour.country.split(',').map((c) => c.trim()).filter(Boolean)
      : [];

// „Вижте още“: първо турове от същата държава, после от същия континент, после най-близките по дата.
// Изчислява се на сървъра, за да са линковете в HTML-а — иначе Google вижда страницата на тура като задънена улица.
function pickSimilarTours(current: ITour, all: ITour[], max = 3) {
  const isSelf = (t: ITour) => t.id === current.id || (!!t.tourId && t.tourId === current.tourId);
  const currentCountries = new Set(countriesOf(current));
  const others = all.filter((t) => !isSelf(t)).sort((a, b) => String(a.date || '9999').localeCompare(String(b.date || '9999')));
  const sameCountry = others.filter((t) => countriesOf(t).some((c) => currentCountries.has(c)));
  const sameContinent = current.continent ? others.filter((t) => t.continent === current.continent) : [];
  const picked: ITour[] = [];
  for (const t of [...sameCountry, ...sameContinent, ...others]) {
    if (picked.length >= max) break;
    if (!picked.some((p) => p.id === t.id)) picked.push(t);
  }
  // Само полетата, които картата показва — по-малко данни в HTML-а
  return picked.map((t) => ({
    id: t.id, tourId: t.tourId, slug: t.slug, title: t.title, img: t.img,
    country: t.country, price: t.price, date: t.date, continent: t.continent,
  })) as ITour[];
}

// „Топ дестинации“ най-долу на страницата — данните идват от сървъра, за да не се показва първо мигащ
// заместител, който после се сменя с картите. Броят е на публичните турове по държава (както беше в браузъра).
async function getTopDestinations(activeTours: ITour[]) {
  let destinations: { name: string; image: string }[] = [];
  try {
    const snap = await getDoc(doc(db, "settings", "homepage"));
    if (snap.exists()) destinations = snap.data().topDestinations || [];
  } catch (error) {
    console.error("Грешка при зареждане на топ дестинации:", error);
  }
  const counts: Record<string, number> = {};
  activeTours.forEach((t) => countriesOf(t).forEach((c) => { if (c) counts[c] = (counts[c] || 0) + 1; }));
  return { destinations, counts };
}

// 2. ОСНОВНА СТРАНИЦА
export default async function TourPage({ params }: Props) {
  const resolvedParams = await params;
  const tour = await getTourBySlug(resolvedParams.id); // ОТНОВО САМО 1 РЕД!
  const activeTours = await getActiveTours();

  if (!tour) {
    // Изтрит тур. Преди тук се връщаше страница „Екскурзията не е намерена“ със статус 200 — Google я брои за
    // „soft 404“ и дори индексира няколко такива празни страници. Сега:
    //  - ако ID-то започва с държава, за която още имаме турове (напр. „kitay-03-2026-1“ → Китай), пренасочваме
    //    постоянно (308) към страницата на дестинацията — посетителят от стар линк вижда актуалните оферти;
    //  - иначе — истински 404.
    const id = decodeURIComponent(resolvedParams.id).toLowerCase();
    const activeSlugs = Array.from(new Set(activeTours.flatMap((t) => countriesOf(t).map((c) => slugify(c)))))
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
    const destinationSlug = activeSlugs.find((slug) => id === slug || id.startsWith(`${slug}-`));
    if (destinationSlug) permanentRedirect(`/destinations/${destinationSlug}`);
    notFound();
  }

  const similarTours = pickSimilarTours(tour, activeTours);
  const relatedPosts = tour.country ? await getRelatedPosts(tour.country, tour.continent) : [];
  const tourReviews = await getTourReviews(tour.id);
  const topDestinations = await getTopDestinations(activeTours);
  const tourForSchema = { ...tour, img: getRawImageUrl(tour) };

  return (
    <>
      <TourSchema tour={tourForSchema} reviews={tourReviews} />
      <TourClient tourData={tour} relatedPostsData={relatedPosts} id={resolvedParams.id} similarToursData={similarTours} topDestinationsData={topDestinations} />
    </>
  );
}