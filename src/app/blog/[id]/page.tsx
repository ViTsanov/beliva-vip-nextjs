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

// 3. 🛡️ ОПТИМИЗАЦИЯ НА СНИМКАТА (FIXED за plus.unsplash.com)
const getOptimizedImageUrl = (tour: any) => {
    let rawImage = "";

    // ПРИОРИТЕТ 1: 'img' (Единична снимка, както потвърди)
    if (tour.img && typeof tour.img === 'string') {
        // Дори да е една, понякога copy-paste грешки вкарват запетаи.
        // split(',')[0] е безопасно: ако няма запетая, връща целия стринг.
        rawImage = tour.img.split(',')[0].trim();
    } 
    
    // ПРИОРИТЕТ 2: 'images' (Списък със запетаи - взимаме първата)
    else if (tour.images && typeof tour.images === 'string') {
        rawImage = tour.images.split(',')[0].trim();
    }
    
    // ПРИОРИТЕТ 3: 'gallery'
    else if (Array.isArray(tour.gallery) && tour.gallery.length > 0) {
        rawImage = tour.gallery[0];
    }

    // Ако няма нищо -> Логото
    if (!rawImage || rawImage.length < 5) return FALLBACK_IMAGE;

    // ВАЖНО: ОПТИМИЗАЦИЯ НА РАЗМЕРА
    if (rawImage.startsWith("http")) {
        try {
            // Проверка дали е Unsplash (хваща и 'images.', и 'plus.')
            if (rawImage.includes("unsplash.com")) {
                const urlObj = new URL(rawImage);
                // Насилствено намаляваме размера, защото 3000px чупи Facebook
                urlObj.searchParams.set('w', '1200');
                urlObj.searchParams.set('h', '630');
                urlObj.searchParams.set('fit', 'crop');
                urlObj.searchParams.set('q', '80');
                return urlObj.toString();
            }
            return rawImage;
        } catch (e) {
            // Ако URL парсването гръмне, връщаме оригинала
            return rawImage;
        }
    } else {
        // Локален път
        const cleanPath = rawImage.startsWith('/') ? rawImage.substring(1) : rawImage;
        return `${SITE_URL}/${cleanPath}`;
    }
};

// 4. ГЕНЕРИРАНЕ НА МЕТАДАННИ
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const tour = await getTourData(resolvedParams.id);

  if (!tour) return { title: 'Турът не е намерен | Beliva VIP Tour' };

  const finalImageUrl = getOptimizedImageUrl(tour);

  // Лог за проверка
  console.log(`[SEO] ID: ${tour.tourId} | Img Source: ${finalImageUrl}`);

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