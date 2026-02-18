import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import type { Metadata } from 'next';
import { cache } from 'react'; // 👈 ВАЖНО ЗА ОПТИМИЗАЦИЯТА
import TourClient from "@/components/TourClient";
import TourSchema from "@/components/TourSchema";

// 1. КОНСТАНТА ЗА ДОМЕЙНА
const SITE_URL = "https://belivavip.bg";

type Props = {
  params: { id: string }
};

// Помощна функция за сериализиране
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

// 2. 🚀 CACHED DATA FETCHING (Спестява пари и време)
// Тази функция се изпълнява само веднъж на рекуест, въпреки че я викаме на две места.
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

// 3. 🛡️ ПОМОЩНА ФУНКЦИЯ ЗА СНИМКИТЕ
const getOptimizedImageUrl = (imgField: any, imagesField: any) => {
    let rawImage = `${SITE_URL}/og-default.jpg`; // Дефолт

    // A. Проверка на главното поле 'img'
    if (imgField) {
        if (Array.isArray(imgField)) {
             rawImage = imgField[0];
        } else if (typeof imgField === 'string') {
             rawImage = imgField;
        }
    } 
    // B. Резерва: поле 'images' (което в твоята база е стринг със запетаи)
    else if (imagesField && typeof imagesField === 'string') {
        const splitImages = imagesField.split(',');
        if (splitImages.length > 0) rawImage = splitImages[0].trim();
    }

    // C. Валидация и Оптимизация на размера
    if (rawImage.startsWith("http")) {
        // ХИТЪР ТРИК: Ако е Unsplash снимка с w=3000, правим я w=1200 за Facebook
        if (rawImage.includes("w=3000")) {
            return rawImage.replace("w=3000", "w=1200");
        }
        return rawImage;
    } else {
        // Ако е локален път
        const cleanPath = rawImage.startsWith('/') ? rawImage.substring(1) : rawImage;
        return `${SITE_URL}/${cleanPath}`;
    }
};

// 4. ГЕНЕРИРАНЕ НА МЕТАДАННИ
export async function generateMetadata(
  { params }: Props,
): Promise<Metadata> {
  const resolvedParams = await params;
  const tour = await getTourData(resolvedParams.id); // Ползваме кешираната функция

  if (!tour) {
    return { title: 'Турът не е намерен | Beliva VIP Tour' };
  }

  const title = `${tour.title} | Екскурзия до ${tour.country}`;
  const description = tour.intro 
    ? tour.intro.replace(/<[^>]*>?/gm, '').substring(0, 150) + "..." 
    : `Резервирайте своето пътуване до ${tour.country}. Цена от ${tour.price}.`;
  
  // Изчисляваме снимката
  const finalImageUrl = getOptimizedImageUrl(tour.img, tour.images);

  console.log(`[SEO] Generated for: ${tour.title}`);
  console.log(`[SEO] Image URL: ${finalImageUrl}`);

  return {
    metadataBase: new URL(SITE_URL),
    title: title,
    description: description,
    alternates: {
      canonical: `/tour/${tour.tourId}`,
    },
    openGraph: {
      title: title,
      description: description,
      url: `${SITE_URL}/tour/${tour.tourId}`,
      siteName: 'Beliva VIP Tour',
      locale: 'bg_BG',
      type: 'website',
      images: [
        {
          url: finalImageUrl,
          width: 1200,
          height: 630,
          alt: tour.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [finalImageUrl],
    },
  };
}

// 5. ОСНОВНА СТРАНИЦА
export default async function TourPage({ params }: Props) {
  const resolvedParams = await params;
  
  // Тук НЕ правим нова заявка към базата, Next.js ползва кеша от generateMetadata
  const tour = await getTourData(resolvedParams.id);
  const relatedPost = tour && tour.country ? await getRelatedPost(tour.country) : null;

  if (!tour) {
    return (
        <div className="min-h-screen flex items-center justify-center pt-20">
             <h1 className="text-2xl font-serif italic text-brand-dark">Екскурзията не е намерена.</h1>
        </div>
    );
  }

  // Подготвяме снимка и за Schema
  const schemaImage = getOptimizedImageUrl(tour.img, tour.images);
  const tourForSchema = { ...tour, img: schemaImage };

  return (
    <>
      <TourSchema tour={tourForSchema} />
      <TourClient tourData={tour} relatedPostData={relatedPost} id={resolvedParams.id} />
    </>
  );
}