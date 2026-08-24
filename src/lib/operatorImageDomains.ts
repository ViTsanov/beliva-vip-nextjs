// src/lib/operatorImageDomains.ts
//
// Домейни на туроператори / трети сайтове, чиито снимки НЕ трябва да се показват
// директно (hotlink) в Beliva VIP Tour:
//  1. Юридически риск — не са наши снимки, нямаме права върху тях.
//  2. Ненадеждност — операторът може да премахне/премести файла по всяко време
//     и хероят на тур страницата ще се счупи без предупреждение.
//  3. Част от тях (webtours.bg, 2mko.com, anekatravel.com, phoenixtours.bg) имат
//     hotlink protection и блокират Facebook/Google crawler-а — OG превюто не се вижда.
//
// Използва се както за OG/Twitter/JSON-LD изображението (generateMetadata, TourSchema),
// така и за самия hero render в TourHero — едно място, една истина.
export const OPERATOR_HOTLINK_DOMAINS = [
  'webtours.bg',
  '2mko.com',
  'anekatravel.com',
  'phoenixtours.bg',
  'travelmax.bg',
];

export function isOperatorHotlink(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  return OPERATOR_HOTLINK_DOMAINS.some((domain) => url.includes(domain));
}
