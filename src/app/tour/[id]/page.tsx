import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import type { Metadata } from 'next';
import { cache } from 'react';
import TourClient from "@/components/TourClient";
import TourSchema from "@/components/TourSchema";

const SITE_URL = "https://belivavip.bg";
const FALLBACK_IMAGE = `${SITE_URL}/beliva_logo.png`;

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

// 3. 🛡️ ПРЕЦИЗНА ОБРАБОТКА НА СНИМКАТА
const getOptimizedImageUrl = (tour: any) => {
    let rawImage = "";

    // А. Извличане на "суров" URL от базата
    // Приоритет 1: img
    if (tour.img) {
        if (Array.isArray(tour.img)) rawImage = tour.img[0];
        else if (typeof tour.img === 'string') rawImage = tour.img;
    } 
    // Приоритет 2: images
    else if (tour.images && typeof tour.images === 'string') {
        rawImage = tour.images;
    }
    // Приоритет 3: gallery
    else if (Array.isArray(tour.gallery) && tour.gallery.length > 0) {
        rawImage = tour.gallery[0];
    }

    // Ако сме намерили стринг, но той съдържа запетаи (чест случай), взимаме само първата част
    if (rawImage && typeof rawImage === 'string' && rawImage.includes(',')) {
        rawImage = rawImage.split(',')[0].trim();
    }

    // Ако след всичко това нямаме снимка, връщаме логото
    if (!rawImage || typeof rawImage !== 'string' || rawImage.length < 5) {
        console.log(`[SEO Warning] No valid image found for tour: ${tour.title}`);
        return FALLBACK_IMAGE;
    }

    // Б. Валидация и Оптимизация (Unsplash Fix)
    try {
        // Проверка дали е абсолютен URL
        if (rawImage.startsWith("http")) {
            const urlObj = new URL(rawImage);

            // Специална логика за Unsplash
            if (urlObj.hostname.includes('unsplash')) {
                // Насилствено задаваме параметрите, независимо как са били преди
                urlObj.searchParams.set('w', '1200');
                urlObj.searchParams.set('h', '630');
                urlObj.searchParams.set('fit', 'crop');
                urlObj.searchParams.set('q', '80');
                return urlObj.toString();
            }

            return rawImage;
        } else {
            // Локален път - махаме водещата наклонена черта и добавяме домейна
            const cleanPath = rawImage.startsWith('/') ? rawImage.substring(1) : rawImage;
            return `${SITE_URL}/${cleanPath}`;
        }
    } catch (error) {
        console.error("Error parsing image URL:", error);
        return FALLBACK_IMAGE;
    }
};

// 4. ГЕНЕРИРАНЕ НА МЕТАДАННИ
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const tour = await getTourData(resolvedParams.id);

  if (!tour) return { title: 'Турът не е намерен | Beliva VIP Tour' };

  const finalImageUrl = getOptimizedImageUrl(tour);
  
  // Логваме в сървърната конзола, за да сме сигурни какво се генерира
  console.log(`[SEO Check] Tour: ${tour.tourId} | Image: ${finalImageUrl}`);

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

  const schemaImage = getOptimizedImageUrl(tour);
  const tourForSchema = { ...tour, img: schemaImage };

  return (
    <>
      <TourSchema tour={tourForSchema} />
      <TourClient tourData={tour} relatedPostData={relatedPost} id={resolvedParams.id} />
    </>
  );
}