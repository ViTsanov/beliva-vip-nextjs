import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import type { Metadata } from 'next';
import TourClient from "@/components/TourClient";
import TourSchema from "@/components/TourSchema";

// 1. Дефинираме домейна (Задължително за Facebook)
const SITE_URL = "https://belivavip.bg";

type Props = {
  params: { id: string }
};

// Помощна функция за датите
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

// 2. Функция за данните
async function getTourData(id: string) {
  if (!id) return null;
  const decodedId = decodeURIComponent(id);
  const q = query(collection(db, "tours"), where("tourId", "==", decodedId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return serializeData(snapshot.docs[0].data(), snapshot.docs[0].id);
}

// 3. Функция за свързан пост
async function getRelatedPost(country: string) {
  if (!country) return null;
  const q = query(collection(db, "posts"), where("relatedCountry", "==", country));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return serializeData(snapshot.docs[0].data(), snapshot.docs[0].id);
}

// 🚀 4. ГЕНЕРИРАНЕ НА МЕТАДАННИ (SEO FIX)
export async function generateMetadata(
  { params }: Props,
): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const decodedId = decodeURIComponent(id);

  // Търсим тура
  const q = query(collection(db, "tours"), where("tourId", "==", decodedId));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return { title: 'Турът не е намерен | Beliva VIP Tour' };
  }

  const tour = snapshot.docs[0].data();
  const title = `${tour.title} | Екскурзия до ${tour.country}`;
  const description = tour.intro || `Резервирайте своето пътуване до ${tour.country}. Цена от ${tour.price}.`;
  
  // --- FIX ЗА СНИМКАТА ---
  // Взимаме снимката или дефолтна
  const rawImage = tour.img || "/og-default.jpg";
  // Ако е относителен път (напр. /uploads/...), добавяме домейна отпред
  const imageUrl = rawImage.startsWith("http") ? rawImage : `${SITE_URL}${rawImage}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: title,
    description: description,
    alternates: {
      canonical: `/tour/${decodedId}`,
    },
    openGraph: {
      title: title,
      description: description,
      url: `${SITE_URL}/tour/${decodedId}`,
      siteName: 'Beliva VIP Tour',
      images: [
        {
          url: imageUrl, // 👈 Вече е гарантирано пълен URL
          width: 1200,   // Facebook изисква това
          height: 630,   // Facebook изисква това
          alt: tour.title,
        },
      ],
      locale: 'bg_BG',
      type: 'website', // За турове е по-добре website или product, но website е най-безопасно
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [imageUrl],
    },
  };
}

// 5. Основната страница
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

  // Подготвяме и снимката за Schema.org
  const rawImage = tour.img || "/og-default.jpg";
  const schemaImage = rawImage.startsWith("http") ? rawImage : `${SITE_URL}${rawImage}`;
  
  // Модифицираме тура за Schema компонента, за да има пълен URL
  const tourForSchema = { ...tour, img: schemaImage };

  return (
    <>
      <TourSchema tour={tourForSchema} />
      <TourClient tourData={tour} relatedPostData={relatedPost} id={resolvedParams.id} />
    </>
  );
}