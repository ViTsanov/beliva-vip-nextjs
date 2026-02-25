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

async function getRelatedPost(country: string) {
  if (!country) return null;
  const q = query(collection(db, "posts"), where("relatedCountry", "==", country));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return serializeData(snapshot.docs[0].data(), snapshot.docs[0].id);
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

  // 🚀 ГЕНЕРИРАМЕ ЛИНКА КЪМ FIREBASE ФУНКЦИЯТА
  // Това пренасочва заявките на Facebook директно към твоя Firebase сървър (proxyOgImage)
  const proxyImageUrl = `https://us-central1-${FIREBASE_PROJECT_ID}.cloudfunctions.net/proxyOgImage?id=${tour.tourId}`;

  return {
    title: `${tour.title} | Екскурзия до ${tour.country}`,
    description: tour.intro 
        ? tour.intro.replace(/<[^>]*>?/gm, '').substring(0, 150) + "..." 
        : `Резервирайте незабравимо пътуване до ${tour.country}.`,
    openGraph: {
      title: `${tour.title} | Екскурзия до ${tour.country}`,
      description: `Цена от ${tour.price}. Разгледайте програмата.`,
      url: `${SITE_URL}/tour/${tour.tourId}`,
      siteName: 'Beliva VIP Tour',
      locale: 'bg_BG',
      type: 'website',
      images: [{
          url: proxyImageUrl, // 👈 Подаваме функцията на Facebook!
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
  const relatedPost = tour && tour.country ? await getRelatedPost(tour.country) : null;

  if (!tour) {
    return (
        <div className="min-h-screen flex items-center justify-center pt-20">
             <h1 className="text-2xl font-serif italic text-brand-dark">Екскурзията не е намерена.</h1>
        </div>
    );
  }

  // За Schema.org си ползваме директния линк
  const schemaImage = getRawImageUrl(tour);
  const tourForSchema = { ...tour, img: schemaImage };

  return (
    <>
      <TourSchema tour={tourForSchema} />
      <TourClient tourData={tour} relatedPostData={relatedPost} id={resolvedParams.id} />
    </>
  );
}