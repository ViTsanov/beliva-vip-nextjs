import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import type { Metadata } from 'next';
import { cache } from 'react';
import TourClient from "@/components/TourClient";
import TourSchema from "@/components/TourSchema";

const SITE_URL = "https://belivavip.bg";

// Тъй като нямаш og-default.jpg, ползваме логото за краен резервен вариант
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

// 3. 🛡️ ОПТИМИЗАЦИЯ НА СНИМКАТА
const getOptimizedImageUrl = (tour: any) => {
    let rawImage = FALLBACK_IMAGE; // Започваме с логото, ако нищо друго не се намери

    // Проверка 1: Поле 'img'
    if (tour.img) {
        if (Array.isArray(tour.img)) {
             rawImage = tour.img[0];
        } else if (typeof tour.img === 'string') {
             // Чистим ако има запетаи (понякога се случва)
             rawImage = tour.img.includes(',') ? tour.img.split(',')[0].trim() : tour.img;
        }
    } 
    // Проверка 2: Поле 'images' (ако img е празно)
    else if (tour.images && typeof tour.images === 'string') {
        const splitImages = tour.images.split(',');
        if (splitImages.length > 0) rawImage = splitImages[0].trim();
    }
    // Проверка 3: Поле 'gallery'
    else if (Array.isArray(tour.gallery) && tour.gallery.length > 0) {
        rawImage = tour.gallery[0];
    }

    // ВАЖНО: Тук оправяме проблема с размера (Unsplash w=3000 -> w=1200)
    if (rawImage.startsWith("http")) {
        // Facebook не харесва твърде големи снимки. Unsplash често дава w=3000.
        // Ние го променяме насила на w=1200.
        if (rawImage.includes("images.unsplash.com")) {
            let optimized = rawImage.replace("w=3000", "w=1200");
            optimized = optimized.replace("q=60", "q=80"); // Подобрено качество
            return optimized;
        }
        return rawImage;
    } else {
        // Локален път (ако не е пълен URL)
        const cleanPath = rawImage.startsWith('/') ? rawImage.substring(1) : rawImage;
        // Предпазваме се от двойни наклонени черти
        if (cleanPath.startsWith('http')) return cleanPath;
        return `${SITE_URL}/${cleanPath}`;
    }
};

// 4. ГЕНЕРИРАНЕ НА МЕТАДАННИ
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const tour = await getTourData(resolvedParams.id);

  if (!tour) return { title: 'Турът не е намерен | Beliva VIP Tour' };

  const finalImageUrl = getOptimizedImageUrl(tour);

  return {
    metadataBase: new URL(SITE_URL),
    title: `${tour.title} | Екскурзия до ${tour.country}`,
    description: tour.intro 
        ? tour.intro.replace(/<[^>]*>?/gm, '').substring(0, 150) + "..." 
        : `Резервирайте незабравимо пътуване до ${tour.country}.`,
    openGraph: {
      title: `${tour.title} | Екскурзия до ${tour.country}`,
      description: `Разгледайте програмата за ${tour.country}. Цена от ${tour.price}.`,
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

  const schemaImage = getOptimizedImageUrl(tour);
  const tourForSchema = { ...tour, img: schemaImage };

  return (
    <>
      <TourSchema tour={tourForSchema} />
      <TourClient tourData={tour} relatedPostData={relatedPost} id={resolvedParams.id} />
    </>
  );
}