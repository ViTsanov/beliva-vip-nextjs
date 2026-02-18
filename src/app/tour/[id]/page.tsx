import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import type { Metadata } from 'next';
import { cache } from 'react';
import TourClient from "@/components/TourClient";
import TourSchema from "@/components/TourSchema";

const SITE_URL = "https://belivavip.bg";
// Използваме абсолютен път към fallback снимката
const FALLBACK_IMAGE = `${SITE_URL}/hero/australia.webp`;

type Props = {
  params: { id: string }
};

// 1. Помощна функция за данни
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

// 3. 🛡️ ИЗЧИСТЕНА ЛОГИКА ЗА СНИМКАТА
const getSafeImageUrl = (tour: any) => {
    let rawImage = "";

    // А. Извличане на суровия стринг (приоритет: img -> images -> gallery)
    if (tour.img && typeof tour.img === 'string' && tour.img.length > 5) {
        rawImage = tour.img;
    } else if (tour.images && typeof tour.images === 'string' && tour.images.length > 5) {
        rawImage = tour.images;
    } else if (Array.isArray(tour.gallery) && tour.gallery.length > 0) {
        rawImage = tour.gallery[0];
    }

    // Б. Почистване на запетаи (Ако има списък, взимаме първата част)
    if (rawImage.includes(',')) {
        rawImage = rawImage.split(',')[0].trim();
    }

    // В. Валидация: Ако няма снимка -> Връщаме FALLBACK
    if (!rawImage || rawImage.length < 5) {
        return FALLBACK_IMAGE;
    }

    // Г. Обработка на URL
    if (rawImage.startsWith("http")) {
        // ВАЖНО: Връщаме URL-а точно както е в базата!
        // НЕ променяме w=3000 на w=1200, защото това чупи Signed URLs (plus.unsplash.com)
        // и води до грешка 403, заради която Facebook показва логото.
        return rawImage;
    } else {
        // Локален път - правим го абсолютен
        // Чистим двойни наклонени черти ако има
        const cleanPath = rawImage.startsWith('/') ? rawImage.substring(1) : rawImage;
        return `${SITE_URL}/${cleanPath}`;
    }
};

// 4. ГЕНЕРИРАНЕ НА МЕТАДАННИ
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const tour = await getTourData(resolvedParams.id);

  if (!tour) return { title: 'Турът не е намерен | Beliva VIP Tour' };

  // Изчисляваме валиден URL за снимката
  const finalImageUrl = getSafeImageUrl(tour);

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
          url: finalImageUrl,
          width: 1200,
          height: 630,
          alt: tour.title,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${tour.title} | Екскурзия до ${tour.country}`,
      description: `Цена от ${tour.price}.`,
      images: [finalImageUrl],
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

  const schemaImage = getSafeImageUrl(tour);
  const tourForSchema = { ...tour, img: schemaImage };

  return (
    <>
      <TourSchema tour={tourForSchema} />
      <TourClient tourData={tour} relatedPostData={relatedPost} id={resolvedParams.id} />
    </>
  );
}