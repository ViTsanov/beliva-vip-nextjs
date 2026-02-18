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

// 3. 🛡️ ЛОГИКА ЗА СНИМКАТА (СПЕЦИАЛНО ЗА TVOYATA BAZA)
const getOptimizedImageUrl = (tour: any) => {
    // Функция, която изчиства единична стойност
    const cleanUrl = (val: any) => {
        if (!val) return null;
        if (Array.isArray(val)) return val[0]; // Ако е масив, взима първия
        if (typeof val === 'string') {
            // ТУК Е КЛЮЧЪТ: Ако има запетая, цепим и взимаме първото!
            if (val.includes(',')) {
                return val.split(',')[0].trim();
            }
            return val.trim();
        }
        return null;
    };

    // Проверяваме полетата по приоритет
    let rawImage = cleanUrl(tour.img) || cleanUrl(tour.images) || cleanUrl(tour.gallery);

    // Ако все още нямаме снимка, връщаме логото
    if (!rawImage) return FALLBACK_IMAGE;

    // ОПТИМИЗАЦИЯ ЗА URL
    try {
        if (rawImage.startsWith("http")) {
            // Unsplash логика
            if (rawImage.includes("images.unsplash.com")) {
                const urlObj = new URL(rawImage);
                urlObj.searchParams.set('w', '1200');
                urlObj.searchParams.set('h', '630');
                urlObj.searchParams.set('fit', 'crop');
                urlObj.searchParams.set('q', '80');
                return urlObj.toString();
            }
            return rawImage;
        } else {
            // Локален път
            const cleanPath = rawImage.startsWith('/') ? rawImage.substring(1) : rawImage;
            return `${SITE_URL}/${cleanPath}`;
        }
    } catch (e) {
        return FALLBACK_IMAGE;
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