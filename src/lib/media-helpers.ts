// src/lib/media-helpers.ts
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getAdminDb } from './firebaseAdmin';
import { canonicalCountry } from './constants';

// Взима ВСИЧКИ снимки от Media Library наведнъж — извикващият код после търси в тях за няколко държави,
// вместо да прави отделна заявка за всяка (напр. DestinationsSection.tsx показва 8 държави наведнъж).
// Подредени като в самата библиотека (най-новите първи), за да е „първата“ снимка същата, която виждаш там.
//
// САМО за сървърни компоненти: колекцията media НЕ е публично четима в живата база, затова четем през
// Admin SDK (връщаме само име и URL). Ако Admin SDK не е конфигуриран (напр. локално без GA4 ключове),
// пробваме клиентския SDK — при отказ просто няма снимки и страниците падат на снимка от тур.
export async function fetchAllMedia(): Promise<{ name?: string; url?: string }[]> {
  try {
    const snap = await getAdminDb().collection('media').orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => ({ name: d.get('name'), url: d.get('url') }));
  } catch (adminErr) {
    try {
      const mediaSnap = await getDocs(collection(db, "media"));
      return mediaSnap.docs.map(d => ({ name: d.get('name'), url: d.get('url') }));
    } catch (e) {
      console.error("[fetchAllMedia]", adminErr, e);
      return [];
    }
  }
}

// Намира представителна снимка за държава — първата в Media Library с име „<Държава> hero“. Същият
// pattern, който автоматизацията ползва за hero снимките на туровете — тук е за снимката на цялата
// държава (destinations страници, „Дестинации за всеки вкус“), вместо снимка на случаен тур.
// Името може да е и с друго изписване на държавата („Доминикана hero“ → Доминиканска република).
export function findCountryHeroImage(allMedia: { name?: string; url?: string }[], country: string): string | null {
  const countryLower = country.toLowerCase();
  const target = canonicalCountry(country);
  const match = allMedia.find(m => {
    const n = (m.name || '').toLowerCase();
    if (!m.url || !n.includes('hero')) return false;
    return n.includes(countryLower) || canonicalCountry(n.replace(/hero/g, '').trim()) === target;
  });
  return match?.url || null;
}
