import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import type { Metadata } from 'next';
import TourClient from "@/components/TourClient";
import TourSchema from "@/components/TourSchema";

type Props = {
  params: { id: string }
};

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

async function getTourData(id: string) {
  if (!id) return null;
  const decodedId = decodeURIComponent(id);
  const q = query(collection(db, "tours"), where("tourId", "==", decodedId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return serializeData(snapshot.docs[0].data(), snapshot.docs[0].id);
}

async function getRelatedPost(country: string) {
  if (!country) return null;
  const q = query(collection(db, "posts"), where("relatedCountry", "==", country));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return serializeData(snapshot.docs[0].data(), snapshot.docs[0].id);
}

// 🚀 КОРЕКЦИЯТА Е ТУК
export async function generateMetadata(
  { params }: Props,
): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const decodedId = decodeURIComponent(id);

  const q = query(collection(db, "tours"), where("tourId", "==", decodedId));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return {
      title: 'Турът не е намерен | Beliva VIP Tour',
    };
  }

  const tour = snapshot.docs[0].data();
  const title = `${tour.title} | Екскурзия до ${tour.country}`;
  const description = tour.intro || `Резервирайте своето пътуване до ${tour.country}. Цена от ${tour.price}.`;
  
  // Уверяваме се, че имаме пълен URL към снимката
  const imageUrl = tour.img || "https://belivavip.bg/og-default.jpg";

  return {
    metadataBase: new URL("https://belivavip.bg"),
    title: title,
    description: description,
    alternates: {
      canonical: `/tour/${decodedId}`,
    },
    openGraph: {
      title: title,
      description: description,
      url: `https://belivavip.bg/tour/${decodedId}`,
      siteName: 'Beliva VIP Tour',
      images: [
        {
          url: imageUrl, // Вече е изрично подадено
          width: 1200,   // Стандарт за FB
          height: 630,   // Стандарт за FB
          alt: tour.title,
        },
      ],
      locale: 'bg_BG',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [imageUrl],
    },
  };
}

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

  return (
    <>
      <TourSchema tour={tour} />
      <TourClient tourData={tour} relatedPostData={relatedPost} id={resolvedParams.id} />
    </>
  );
}