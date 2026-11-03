// src/lib/promo.ts
//
// Важи ли промоцията на тура днес. Кампанията записва на тура promoStart / promoEnd, но когато изтече, нищо не
// трие промо цената от тура — затова всяко място, което показва или смята с промо цена, пита тук.

import type { ITour } from '@/types';
import { toISODate } from '@/lib/tourDates';

type PromoFields = Pick<ITour, 'isPromo' | 'discountPrice' | 'promoStart' | 'promoEnd' | 'price'>;

/** Днешната дата в България (YYYY-MM-DD) — промоцията изтича в полунощ българско време, не UTC. */
export const todayInSofia = (now = new Date()) => now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Sofia' });

/** Има промо цена и днес е в периода ѝ — включително последния ден. Без дати промоцията важи, докато е включена. */
export function hasActivePromo(tour: Partial<PromoFields> | null | undefined, today = todayInSofia()): boolean {
  if (!tour?.isPromo || !tour.discountPrice) return false;
  const start = toISODate(tour.promoStart);
  const end = toISODate(tour.promoEnd);
  if (start && today < start) return false;
  if (end && today > end) return false;
  return true;
}

/** Цената, която важи днес: промо цената по време на промоцията, иначе редовната. */
export const currentPrice = (tour: Partial<PromoFields>, today = todayInSofia()): string =>
  String((hasActivePromo(tour, today) ? tour.discountPrice : tour.price) || '');
