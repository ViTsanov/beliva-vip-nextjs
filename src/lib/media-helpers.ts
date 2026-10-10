// src/lib/media-helpers.ts
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

// Взима ВСИЧКИ снимки от Media Library наведнъж — извикващият код после търси в тях за няколко държави,
// вместо да прави отделна заявка за всяка (напр. DestinationsSection.tsx показва 8 държави наведнъж).
export async function fetchAllMedia(): Promise<any[]> {
  try {
    const mediaSnap = await getDocs(collection(db, "media"));
    return mediaSnap.docs.map(d => d.data());
  } catch (e) {
    console.error("[fetchAllMedia]", e);
    return [];
  }
}

// Намира представителна снимка за държава — първата в Media Library, чието име съдържа И държавата,
// И думата "hero". Същия pattern, който автоматизацията (runTourAutomation в AdminDashboardClient.tsx)
// вече ползва за hero снимките на самите турове — тук се преизползва за representативна снимка на
// цялата държава (destinations страници, "За всеки вкус" секцията), вместо да зависи от случайна
// снимка на конкретен тур.
export function findCountryHeroImage(allMedia: any[], country: string): string | null {
  const countryLower = country.toLowerCase();
  const match = allMedia.find(m =>
    m.name &&
    m.name.toLowerCase().includes(countryLower) &&
    m.name.toLowerCase().includes('hero')
  );
  return match?.url || null;
}
