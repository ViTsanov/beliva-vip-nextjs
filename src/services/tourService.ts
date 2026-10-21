import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, doc, getDoc, DocumentData, Timestamp } from "firebase/firestore";
import { ITour } from "@/types";
import { splitListText } from "@/lib/listItems";

/**
 * 1. АДАПТЕР (Normalizer) 
 * Тази функция взима "мръсните" данни от Firebase и ги превръща 
 * в перфектен, строго типизиран обект за фронтенда.
 */
export const normalizeTour = (docData: DocumentData, docId: string): ITour => {
  // 1. Гарантираме, че included е ВИНАГИ масив от отделни точки. Текстът е „по една точка на нов ред“ (скрейпър,
  //    TourForm) — делим по нови редове/булети, а не по запетаи (иначе целият списък ставаше една точка).
  const includedArr: string[] = splitListText(docData.included);

  // 2. Обединяваме notIncluded и excluded в един единствен масив (excluded)
  const excludedArr: string[] = splitListText(docData.excluded || docData.notIncluded);

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
    dates: Array.isArray(docData.dates) ? docData.dates.map((d: Timestamp | string) => (typeof d === 'string' ? d : d.toDate().toISOString())) : [],
  } as unknown as ITour; // Двоен каст през unknown — TypeScript губи index signature-а на спреднатия DocumentData при директен `as ITour`,
  // така че мисли че липсват полета които реално идват от спреда на docData. Това е стандартния TS идиом
  // за точно този случай — нормализация на хлабаво типизирани външни данни към строг вътрешен тип.
};


// Полета, които се виждат само на страницата на самия тур. Картите и филтрите не ги ползват, а всичко, подадено на
// клиентски компонент, влиза в HTML-а: на началната страница те бяха ~900 KB от 1.1 MB — телефонът ги теглеше и
// обработваше, преди страницата да оживее.
const DETAIL_ONLY_FIELDS = [
  'itinerary', 'gallery', 'galleryWithCaptions', 'images', 'included', 'excluded', 'notIncluded',
  'generalInfo', 'intro', 'documents', 'route', 'originalUrl', 'externalSourceLink', 'sourceTitle', 'flightInfo',
] as const;

// Тур без тежките полета — за списъци и карти (начална страница).
export const toTourSummary = (tour: ITour): ITour => {
  const summary: Record<string, unknown> = { ...tour };
  for (const field of DETAIL_ONLY_FIELDS) delete summary[field];
  return summary as unknown as ITour;
};


/**
 * 2. УСЛУГИ ЗА ИЗВЛИЧАНЕ (Firebase Queries)
 */

// Взима всички публични екскурзии (Ползва се в Начална страница и Sitemap)
// ВАЖНО: винаги с изричен orderBy — без него Firestore НЕ гарантира стабилен ред на резултатите между
// отделни извиквания на заявката. Ако редът варира между сървърния рендър и по-късен ре-фетч (напр. при
// клиентска навигация към нов URL), React вижда различно дърво и гърми хидратационна грешка.
// Подреждаме по document ID (__name__) — гарантирано стабилно, не изисква допълнителен composite индекс.
export async function getActiveTours(): Promise<ITour[]> {
  try {
    const q = query(collection(db, "tours"), where("status", "==", "public"), orderBy("__name__"));
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