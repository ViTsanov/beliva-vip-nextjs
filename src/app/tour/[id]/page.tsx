import type { Metadata } from 'next';
import TourClient from "@/components/TourClient";
import TourSchema from "@/components/TourSchema";
import { getTourBySlug } from "@/services/tourService";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, limit } from "firebase/firestore";

// КЕШИРАНЕ НА СТРАНИЦАТА: Next.js ще я презарежда веднъж на 1 час (3600 секунди),
// за да виждат клиентите винаги актуални цени, но сайтът да остане светкавичен!
export const revalidate = 3600; 

const SITE_URL = "https://belivavip.bg";
const FIREBASE_PROJECT_ID = "belivavip"; 

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

const getRawImageUrl = (tour: any) => {
    let rawImage = tour.img || (tour.gallery && tour.gallery[0]) || "";
    if (rawImage && rawImage.startsWith('/')) return `${SITE_URL}${rawImage}`;
    return rawImage || `${SITE_URL}/hero/australia.webp`;
};

// 1. ГЕНЕРИРАНЕ НА МЕТАДАННИ
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const tour = await getTourBySlug(resolvedParams.id); // ВЕЧЕ Е САМО 1 РЕД!

  if (!tour) return { title: 'Турът не е намерен | Beliva VIP Tour' };

  // Build the best possible absolute image URL
  const ogImageUrl = getRawImageUrl(tour);
  const canonicalUrl = `${SITE_URL}/tour/${tour.slug || tour.tourId || tour.id}`;
  const description = tour.intro
    ? tour.intro.replace(/<[^>]*>?/gm, '').substring(0, 155) + '...'
    : `Открийте ${Array.isArray(tour.country) ? tour.country.join(', ') : tour.country} с Beliva VIP Tour. ${tour.price ? 'Цена от ' + tour.price + '.' : ''}`;

  return {
    title: `${tour.title} | Екскурзия до ${Array.isArray(tour.country) ? tour.country.join(', ') : tour.country}`,
    description,
    alternates: { canonical: canonicalUrl },
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

// 2. ОСНОВНА СТРАНИЦА
export default async function TourPage({ params }: Props) {
  const resolvedParams = await params;
  const tour = await getTourBySlug(resolvedParams.id); // ОТНОВО САМО 1 РЕД!
  
  if (!tour) {
    return (
        <div className="min-h-screen flex items-center justify-center pt-20">
             <h1 className="text-2xl font-serif text-brand-dark">Екскурзията не е намерена.</h1>
        </div>
    );
  }

  const relatedPosts = tour.country ? await getRelatedPosts(tour.country, tour.continent) : [];
  const tourForSchema = { ...tour, img: getRawImageUrl(tour) };

  return (
    <>
      <TourSchema tour={tourForSchema} />
      <TourClient tourData={tour} relatedPostsData={relatedPosts} id={resolvedParams.id} />
    </>
  );
}