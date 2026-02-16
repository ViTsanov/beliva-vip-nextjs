import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import type { Metadata } from 'next';
import TourClient from "@/components/TourClient"; // 👈 Това е компонентът със стария дизайн
import TourSchema from "@/components/TourSchema"; // 👈 Импортирай

type Props = {
  params: { id: string }
};

// Помощна функция за превръщане на Firebase дати в текст
const serializeData = (data: any, id: string) => {
  return {
    ...data,
    id: id,
    price: data.price ? String(data.price) : "По запитване",
    // Next.js не харесва Timestamp обекти, затова ги правим на String
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null,
    dates: Array.isArray(data.dates) ? data.dates.map((d: any) => d.toDate ? d.toDate().toISOString() : d) : [],
  };
};

// 1. Теглим данните за екскурзията
async function getTourData(id: string) {
  if (!id) return null;
  const q = query(collection(db, "tours"), where("tourId", "==", id));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return serializeData(snapshot.docs[0].data(), snapshot.docs[0].id);
}

// 2. Теглим свързана статия (ако има такава държава)
async function getRelatedPost(country: string) {
  if (!country) return null;
  const q = query(collection(db, "posts"), where("relatedCountry", "==", country));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return serializeData(snapshot.docs[0].data(), snapshot.docs[0].id);
}

// 3. Генерираме SEO таговете (За Facebook/Google)
export async function generateMetadata(
  { params }: Props,
): Promise<Metadata> {
  // 1. ВАЖНО: В Next.js 15 params е Promise. Трябва да го изчакаме.
  const resolvedParams = await params;
  const id = resolvedParams.id;

  // 2. ВАЖНО: Използваме същата логика като в getTourData (query), 
  // защото 'id' в URL-а вероятно е 'tourId' полето, а не системното ID на документа.
  const q = query(collection(db, "tours"), where("tourId", "==", id));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return {
      title: 'Турът не е намерен | Beliva VIP Tour',
    };
  }

  // Взимаме първия намерен документ
  const tour = snapshot.docs[0].data();

  return {
    metadataBase: new URL("https://belivavip.bg"),
    title: `${tour.title} | Екскурзия до ${tour.country}`,
    description: `Резервирайте своето пътуване до ${tour.country}. Цена от ${tour.price}. ${tour.intro || ''}`,
    alternates: {
      canonical: `/tour/${params.id}`,
    },
    openGraph: {
      title: tour.title,
      description: `Ексклузивна оферта за ${tour.country}`,
      images: tour.img ? [tour.img] : [], 
    },
  };
}



// 4. Основната страница
export default async function TourPage({ params }: Props) {
  const resolvedParams = await params;
  
  // Изпълняваме заявките
  const tour = await getTourData(resolvedParams.id);
  const relatedPost = tour && tour.country ? await getRelatedPost(tour.country) : null;

  if (!tour) {
    return (
        <div className="min-h-screen flex items-center justify-center pt-20">
             <h1 className="text-2xl font-serif italic text-brand-dark">Екскурзията не е намерена.</h1>
        </div>
    );
  }

  // Подаваме данните на Клиентския компонент (който държи дизайна)
  
  return (
    <>
      <TourSchema tour={tour} /> {/* 👈 Сложи го тук най-горе */}
      <TourClient tourData={tour} relatedPostData={relatedPost} id={resolvedParams.id} />
    </>
  );
}