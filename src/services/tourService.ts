import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
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
// Търси в ред поред по: tourId → slug → директен doc ID
export async function getTourBySlug(slug: string): Promise<ITour | null> {
  if (!slug) return null;
  const decodedId = decodeURIComponent(slug);
  
  try {
    // 1. Търси по tourId поле
    const q1 = query(collection(db, "tours"), where("tourId", "==", decodedId));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) return normalizeTour(snap1.docs[0].data(), snap1.docs[0].id);

    // 2. Търси по slug поле
    const q2 = query(collection(db, "tours"), where("slug", "==", decodedId));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) return normalizeTour(snap2.docs[0].data(), snap2.docs[0].id);

    // 3. Търси директно по Firestore doc ID
    const docRef = doc(db, "tours", decodedId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return normalizeTour(docSnap.data(), docSnap.id);

    return null;
  } catch (error) {
    console.error("Грешка при изтегляне на конкретен тур:", error);
    return null;
  }
}

// Взима конфигурацията за Топ Дестинации (слайдер на началната страница)
export async function getTopDestinationsConfig(): Promise<{ name: string; image: string }[]> {
  try {
    const docSnap = await getDoc(doc(db, "settings", "homepage"));
    if (docSnap.exists()) {
      return docSnap.data().topDestinations || [];
    }
    return [];
  } catch {
    // Silently returns [] — component handles this with client-side fallback.
    // If you see this failing, check Firestore rules: settings collection needs public read.
    return [];
  }
}