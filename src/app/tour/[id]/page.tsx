import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import type { Metadata } from 'next';
import { cache } from 'react';
import TourClient from "@/components/TourClient";
import TourSchema from "@/components/TourSchema";

const SITE_URL = "https://belivavip.bg";
// Използваме логото само ако наистина няма друга снимка
const FALLBACK_IMAGE = `${SITE_URL}/beliva_logo.png`;

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

// 3. 🛡️ ОПРОСТЕНА ЛОГИКА (KISS Principle - Keep It Simple)
// Правим го като при блога, но с обработка на запетаите
const getFinalImage = (tour: any) => {
    let rawImage = "";

    // 1. Извличане (както преди, защото базата ти е шарена)
    if (tour.img && typeof tour.img === 'string') {
        rawImage = tour.img;
    } else if (tour.images && typeof tour.images === 'string') {
        rawImage = tour.images;
    } else if (Array.isArray(tour.gallery) && tour.gallery.length > 0) {
        rawImage = tour.gallery[0];
    }

    // 2. Почистване на запетаи (Това е единствената разлика с блога)
    if (rawImage && rawImage.includes(',')) {
        rawImage = rawImage.split(',')[0].trim();
    }

    // 3. Ако няма снимка -> Логото
    if (!rawImage || rawImage.length < 5) return FALLBACK_IMAGE;

    // 4. Абсолютен URL (Логиката от Блога)
    let finalUrl = rawImage.startsWith("http") ? rawImage : `${SITE_URL}/${rawImage.startsWith('/') ? rawImage.substring(1) : rawImage}`;

    // 5. ЕДИНСТВЕНАТА ОПТИМИЗАЦИЯ: Сменяме само ширината като текст, без да парсваме URL
    // Това е безопасно и не чупи линка.
    if (finalUrl.includes("w=3000")) {
        finalUrl = finalUrl.replace("w=3000", "w=1200");
    }
    // Леко вдигаме качеството ако е зададено ниско
    if (finalUrl.includes("q=60")) {
        finalUrl = finalUrl.replace("q=60", "q=80");
    }

    return finalUrl;
};

// 4. ГЕНЕРИРАНЕ НА МЕТАДАННИ
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const tour = await getTourData(resolvedParams.id);

  if (!tour) return { title: 'Турът не е намерен | Beliva VIP Tour' };

  const finalImageUrl = getFinalImage(tour);
  
  // Debug log
  console.log(`[SEO Simple] Tour: ${tour.tourId} | Image: ${finalImageUrl}`);

  return {
    metadataBase: new URL(SITE_URL),
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

  const schemaImage = getFinalImage(tour);
  const tourForSchema = { ...tour, img: schemaImage };

  return (
    <>
      <TourSchema tour={tourForSchema} />
      <TourClient tourData={tour} relatedPostData={relatedPost} id={resolvedParams.id} />
    </>
  );
}