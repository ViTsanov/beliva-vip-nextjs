import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ITour } from "@/types";

/**
 * 1. АДАПТЕР (Normalizer) 
 * Тази функция взима "мръсните" данни от Firebase и ги превръща 
 * в перфектен, строго типизиран обект за фронтенда.
 */
export const normalizeTour = (docData: any, docId: string): ITour => {
  // 1. Гарантираме, че included е ВИНАГИ масив
  let includedArr: string[] = [];
  if (Array.isArray(docData.included)) includedArr = docData.included;
  else if (typeof docData.included === 'string') includedArr = docData.included.split(',').map((s: string) => s.trim());

  // 2. Обединяваме notIncluded и excluded в един единствен масив (excluded)
  let excludedArr: string[] = [];
  const rawExcluded = docData.excluded || docData.notIncluded;
  if (Array.isArray(rawExcluded)) excludedArr = rawExcluded;
  else if (typeof rawExcluded === 'string') excludedArr = rawExcluded.split(',').map((s: string) => s.trim());

  // 3. Гарантираме, че gallery винаги е масив
  let galleryArr: string[] = [];
  if (Array.isArray(docData.gallery)) galleryArr = docData.gallery;
  else if (typeof docData.images === 'string') galleryArr = docData.images.split(',');

  return {
    ...docData,
    id: docId,
    tourId: docData.tourId || docData.slug || docId, // Гаранция за наличие на URL slug
    price: docData.price ? String(docData.price) : "По запитване",
    included: includedArr,
    excluded: excludedArr,
    gallery: galleryArr,
    createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate().toISOString() : null,
    updatedAt: docData.updatedAt?.toDate ? docData.updatedAt.toDate().toISOString() : null,
    dates: Array.isArray(docData.dates) ? docData.dates.map((d: any) => d.toDate ? d.toDate().toISOString() : d) : [],
  } as ITour;
};


/**
 * 2. УСЛУГИ ЗА ИЗВЛИЧАНЕ (Firebase Queries)
 */

// Взима всички публични екскурзии (Ползва се в Начална страница и Sitemap)
export async function getActiveTours(): Promise<ITour[]> {
  try {
    const q = query(collection(db, "tours"), where("status", "==", "public"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => normalizeTour(doc.data(), doc.id));
  } catch (error) {
    console.error("Грешка при изтегляне на турове:", error);
    return [];
  }
}

// Взима единична екскурзия по ID или Slug (Ползва се в индивидуалната страница)
export async function getTourBySlug(slug: string): Promise<ITour | null> {
  if (!slug) return null;
  const decodedId = decodeURIComponent(slug);
  
  try {
    const q = query(collection(db, "tours"), where("tourId", "==", decodedId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    return normalizeTour(snapshot.docs[0].data(), snapshot.docs[0].id);
  } catch (error) {
    console.error("Грешка при изтегляне на конкретен тур:", error);
    return null;
  }
}