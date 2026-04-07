import type { Metadata } from 'next';
import TourClient from "@/components/TourClient";
import TourSchema from "@/components/TourSchema";
import { getTourBySlug } from "@/services/tourService"; // ИМПОРТИРАМЕ ОТ НОВИЯ СЕРВИЗ
import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";

// КЕШИРАНЕ НА СТРАНИЦАТА: Next.js ще я презарежда веднъж на 1 час (3600 секунди),
// за да виждат клиентите винаги актуални цени, но сайтът да остане светкавичен!
export const revalidate = 3600; 

const SITE_URL = "https://belivavip.bg";
const FIREBASE_PROJECT_ID = "belivavip"; 

type Props = {
  params: Promise<{ id: string }>
};

// Извличаме блог статиите (Тук логиката е добра, запазваме я)
async function getRelatedPosts(countryData: string | string[], continentData?: string) {
    // ... тук си остава същият код за getRelatedPosts, който имаше досега ...
    // (Копирай логиката за блога, която имаше преди, за да не стане прекалено дълго съобщението)
    return []; // Замести го с реалния код
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

  const proxyImageUrl = `https://us-central1-${FIREBASE_PROJECT_ID}.cloudfunctions.net/proxyOgImage?id=${tour.tourId}`;
  const canonicalUrl = `${SITE_URL}/tour/${tour.slug || tour.tourId || tour.id}`;

  return {
    title: `${tour.title} | Екскурзия до ${tour.country}`,
    description: tour.intro ? tour.intro.replace(/<[^>]*>?/gm, '').substring(0, 150) + "..." : "",
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${tour.title} | Екскурзия до ${tour.country}`,
      images: [{ url: proxyImageUrl, width: 1200, height: 630 }],
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