import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import type { Metadata } from 'next';
import { cache } from 'react';
import TourClient from "@/components/TourClient";
import TourSchema from "@/components/TourSchema";

const SITE_URL = "https://belivavip.bg";
// ⚠️ ВАЖНО: Увери се, че това е точното Project ID от твоя .firebaserc файл!
const FIREBASE_PROJECT_ID = "belivavip"; 

type Props = {
  params: { id: string }
};

// 1. Помощна функция
const serializeData = (data: any, id: string) => {
  return {
    ...data,
    id: id,
    price: data.price ? String(data.price) : "По запитване",
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null,
    dates: Array.isArray(data.dates) ? data.dates.map((d: any) => d.toDate ? d.toDate().toISOString() : d) : [],
  };
};

// 2. Кеширана заявка
const getTourData = cache(async (id: string) => {
  if (!id) return null;
  const decodedId = decodeURIComponent(id);
  const q = query(collection(db, "tours"), where("tourId", "==", decodedId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return serializeData(snapshot.docs[0].data(), snapshot.docs[0].id);
});

async function getRelatedPosts(countryData: string | string[], continentData?: string) {
  if (!countryData || countryData.length === 0) return [];
  
  const tourCountries = Array.isArray(countryData) 
      ? countryData 
      : countryData.split(',').map(c => c.trim());
      
  if (tourCountries.length === 0) return [];

  // Взимаме всички статии (ако са много, можеш да сложиш лимит)
  const q = query(collection(db, "posts"));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return [];
  
  const allPosts = snapshot.docs.map(doc => serializeData(doc.data(), doc.id));
  
  // Филтрираме ръчно: Търсим статии, които съдържат ПОНЕ ЕДНА от държавите на екскурзията,
  // ИЛИ статии, които са за целия континент (ако континентът е зададен).
  const matchedPosts = allPosts.filter(post => {
      // 1. Проверка по Континент
      if (continentData && post.relatedCountry === continentData) return true;
      
      // 2. Проверка по Държави
      if (!post.relatedCountry) return false;
      
      const postCountries = Array.isArray(post.relatedCountry) 
          ? post.relatedCountry 
          : post.relatedCountry.split(',').map((c: string) => c.trim());
          
      return tourCountries.some(tc => postCountries.includes(tc));
  });

  return matchedPosts;
}

// 3. ПОМОЩНА ФУНКЦИЯ ЗА СНИМКАТА В САЙТА (За Schema.org и fallback)
const getRawImageUrl = (tour: any) => {
    let rawImage = "";
    if (tour.img && typeof tour.img === 'string') rawImage = tour.img;
    else if (tour.images && typeof tour.images === 'string') rawImage = tour.images;
    else if (Array.isArray(tour.gallery) && tour.gallery.length > 0) rawImage = tour.gallery[0];

    if (rawImage.includes(',')) rawImage = rawImage.split(',')[0].trim();
    
    // Ако е Unsplash, махаме параметрите
    if (rawImage.includes('unsplash.com') && rawImage.includes('?')) {
        return rawImage.split('?')[0];
    }
    
    if (rawImage && rawImage.startsWith('/')) {
        return `${SITE_URL}${rawImage}`;
    }

    return rawImage || `${SITE_URL}/hero/australia.webp`;
};

// 4. ГЕНЕРИРАНЕ НА МЕТАДАННИ (С FIREBASE ФУНКЦИЯТА)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const tour = await getTourData(resolvedParams.id);

  if (!tour) return { title: 'Турът не е намерен | Beliva VIP Tour' };

  const proxyImageUrl = `https://us-central1-${FIREBASE_PROJECT_ID}.cloudfunctions.net/proxyOgImage?id=${tour.tourId}`;

  // 👇 ДОБАВЯМЕ ТАЗИ ПРОМЕНЛИВА: Кой е официалният линк?
  const canonicalUrl = `${SITE_URL}/tour/${tour.slug || tour.tourId || tour.id}`;

  return {
    title: `${tour.title} | Екскурзия до ${tour.country}`,
    description: tour.intro 
        ? tour.intro.replace(/<[^>]*>?/gm, '').substring(0, 150) + "..." 
        : `Резервирайте незабравимо пътуване до ${tour.country}.`,
    alternates: {
      // ПРОМЯНА ТУК: Вече ползваме новия canonicalUrl
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${tour.title} | Екскурзия до ${tour.country}`,
      description: `Цена от ${tour.price}. Разгледайте програмата.`,
      // ПРОМЯНА И ТУК
      url: canonicalUrl,
      siteName: 'Beliva VIP Tour',
      locale: 'bg_BG',
      type: 'website',
      images: [{
          url: proxyImageUrl,
          width: 1200,
          height: 630,
          alt: tour.title,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${tour.title} | Екскурзия до ${tour.country}`,
      description: `Цена от ${tour.price}.`,
      images: [proxyImageUrl],
    },
  };
}

// 5. ОСНОВНА СТРАНИЦА
export default async function TourPage({ params }: Props) {
  const resolvedParams = await params;
  const tour = await getTourData(resolvedParams.id);
  
  // Взимаме МАСИВ от свързани статии
  const relatedPosts = tour && tour.country ? await getRelatedPosts(tour.country, tour.continent) : [];

  if (!tour) {
    return (
        <div className="min-h-screen flex items-center justify-center pt-20">
             <h1 className="text-2xl font-serif italic text-brand-dark">Екскурзията не е намерена.</h1>
        </div>
    );
  }

  const schemaImage = getRawImageUrl(tour);
  const tourForSchema = { ...tour, img: schemaImage };

  return (
    <>
      <TourSchema tour={tourForSchema} />
      {/* Подаваме relatedPostsData вместо relatedPostData */}
      <TourClient tourData={tour} relatedPostsData={relatedPosts} id={resolvedParams.id} />
    </>
  );
}