// Общото между страницата на държава /destinations/[country] и снимката ѝ за превю /destinations/[country]/og.jpg
import { slugify } from "@/lib/admin-helpers";
import { WORLD_COUNTRIES, COUNTRY_TO_CONTINENT } from "@/lib/constants";
import { findCountryHeroImage } from "@/lib/media-helpers";
import { isOperatorHotlink } from "@/lib/operatorImageDomains";
import type { ITour } from "@/types";

export const tourCountryList = (tour: ITour): string[] =>
  typeof tour.country === 'string'
    ? tour.country.split(',').map(c => c.trim()).filter(Boolean)
    : (Array.isArray(tour.country) ? tour.country.filter(Boolean) : []);

// Името на държавата от адреса. Преди се търсеше само в WORLD_COUNTRIES — за държави извън списъка
// (напр. Френска Полинезия) заглавието в Google излизаше със самия адрес: „Екскурзии до frenska-polineziya“.
// Затова търсим и в държавите на самите турове и в COUNTRY_TO_CONTINENT.
export function resolveCountryName(countrySlug: string, tours: ITour[]): string {
  return WORLD_COUNTRIES.find(c => slugify(c) === countrySlug)
    || tours.flatMap(tourCountryList).find(c => slugify(c) === countrySlug)
    || Object.keys(COUNTRY_TO_CONTINENT).find(c => slugify(c) === countrySlug)
    || countrySlug;
}

// Главна снимка: „<Държава> hero“ от Media Library; ако няма — снимката на първия тур
export function resolveHeroImage(allMedia: { name?: string; url?: string }[], countryName: string, tours: ITour[]): string | null {
  return findCountryHeroImage(allMedia, countryName) || tours.map(t => t.img).find(img => img && !isOperatorHotlink(img)) || tours[0]?.img || null;
}
