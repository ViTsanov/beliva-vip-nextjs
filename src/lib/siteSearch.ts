// Търсачката в менюто: думи от заглавието (в произволен ред и с окончания), държави, места, месец/дата
// и ключови думи за страниците на сайта („екскурзоводи“ → За нас и Поли).
import { datesMatchQuery, normalizeTourDates } from '@/lib/tourDates';

const MONTHS = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември'];
const MONTH_LABELS = ['Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни', 'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'];

// Предлози и общи думи — не са задължителни за съвпадение („екскурзия до Япония през ноември“)
const FILLER_WORDS = new Set([
  'в', 'във', 'през', 'на', 'за', 'и', 'до', 'от', 'с', 'със', 'към', 'по',
  'екскурзия', 'екскурзии', 'екскурзията', 'тур', 'турове', 'тура', 'пътуване', 'пътувания', 'почивка', 'почивки',
]);

export const STATIC_PAGES = [
  { title: 'Всички дестинации', path: '/destinations', keywords: ['дестинации', 'дестинация', 'държави', 'държава', 'страни', 'континенти', 'направления', 'свят', 'накъде', 'къде'] },
  { title: 'За нас — историята на Поли', path: '/about-us', keywords: ['за нас', 'кои сме', 'кой сме ние', 'екип', 'агенция', 'мисия', 'история', 'биография', 'екскурзовод', 'водач', 'гид', 'ръководител', 'поли', 'паулина', 'алексиева'] },
  { title: 'Коя е Поли — вашият екскурзовод', path: '/#poli', keywords: ['поли', 'паулина', 'алексиева', 'екскурзовод', 'водач', 'гид', 'ръководител', 'придружител'] },
  { title: 'Отзиви от клиенти', path: '/reviews', keywords: ['отзиви', 'отзив', 'мнения', 'коментари', 'рейтинг', 'клиенти', 'ревюта', 'ревю'] },
  { title: 'Контакти', path: '/contacts', keywords: ['контакти', 'адрес', 'телефон', 'email', 'имейл', 'връзка', 'офис', 'локация'] },
  { title: 'Блог / Пътеводител', path: '/blog', keywords: ['блог', 'статии', 'новини', 'съвети', 'информация', 'четене', 'пътеводител'] },
  { title: 'Често задавани въпроси', path: '/faq', keywords: ['въпроси', 'чзв', 'faq', 'виза', 'визи', 'застраховка', 'плащане', 'капаро'] },
  { title: 'Любими', path: '/favorites', keywords: ['любими', 'запазени', 'сърце', 'харесани'] },
  { title: 'Общи условия', path: '/terms', keywords: ['общи условия', 'условия', 'договор', 'анулация', 'отказ'] },
  { title: 'Политика за поверителност', path: '/privacy', keywords: ['поверителност', 'лични данни', 'gdpr', 'бисквитки'] },
  { title: 'Карта на сайта (Всички страници)', path: '/sitemaps', keywords: ['карта', 'меню', 'всички', 'страници', 'списък'] },
];

export type StaticPage = (typeof STATIC_PAGES)[number];

export function splitWords(query: string): string[] {
  return query.trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
}

// Обща начална част на две думи
function commonPrefix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/**
 * Дали думата я има в текста — като част от дума или с друго окончание:
 * „японията“ ~ „Япония“, „мексиканска“ ~ „Мексико“. Различават се най-много в последната буква
 * на по-късата дума, така че „Австрия“ ≠ „Австралия“.
 */
export function wordInText(word: string, text: string): boolean {
  if (text.includes(word)) return true;
  if (word.length < 5) return false;
  return text.split(/[^a-zа-яё0-9]+/i).some(textWord => {
    const shared = commonPrefix(word, textWord);
    return shared >= 4 && shared >= Math.min(word.length, textWord.length) - 1;
  });
}

export interface SearchableTour {
  title?: string;
  country?: string | string[];
  visitedPlaces?: string[];
  dates?: unknown[];
  date?: unknown;
}

export interface TourMatch {
  /** Предстоящите дати (ISO), които да се покажат — съвпадащите с търсенето, ако е търсено по месец/дата */
  dates: string[];
  /** true, ако търсенето е стеснило датите (по месец/дата) */
  datesFiltered: boolean;
}

export function upcomingDates(tour: SearchableTour, todayISO: string): string[] {
  return normalizeTourDates([...(tour.dates || []), tour.date]).filter(d => d >= todayISO);
}

export function tourCountries(tour: SearchableTour): string[] {
  return (Array.isArray(tour.country) ? tour.country : String(tour.country || '').split(','))
    .map(c => c.trim())
    .filter(Boolean);
}

/**
 * Съвпада ли тур с търсенето. Всяка дума трябва да е в заглавието/държавите/местата, а останалите
 * заедно да са дата или месец: „Япония ноември“, „перу 27 ноември“, „сакура японията“, „декември“.
 * Връща null, ако не съвпада.
 */
export function matchTour(tour: SearchableTour, query: string, todayISO: string): TourMatch | null {
  const upcoming = upcomingDates(tour, todayISO);
  const words = splitWords(query);
  if (words.length === 0) return { dates: upcoming, datesFiltered: false };

  const text = [tour.title || '', ...tourCountries(tour), ...(tour.visitedPlaces || [])].join(' ').toLowerCase();
  // Думите, които ги няма в текста (общите думи като „екскурзии“ не се броят), трябва заедно да са дата/месец
  const dateWords = words.filter(word => !FILLER_WORDS.has(word) && !wordInText(word, text));
  if (dateWords.length === 0) return { dates: upcoming, datesFiltered: false };

  const dateQuery = dateWords.join(' ');
  if (!datesMatchQuery(upcoming, dateQuery)) return null;
  return { dates: upcoming.filter(d => datesMatchQuery([d], dateQuery)), datesFiltered: true };
}

/** Търсене само по месец (по желание с година): „ноември“, „ное 2026“ → стойност за ?month= на началната страница */
export function parseMonthQuery(query: string): { value: string; label: string } | null {
  const words = splitWords(query).filter(word => !FILLER_WORDS.has(word));
  let month = -1;
  let year = '';
  for (const word of words) {
    if (/^\d{4}$/.test(word) && !year) { year = word; continue; }
    const index = word.length >= 3 ? MONTHS.findIndex(name => name.startsWith(word)) : -1;
    if (index === -1 || month !== -1) return null;
    month = index;
  }
  if (month === -1) return null;
  const mm = String(month + 1).padStart(2, '0');
  return { value: year ? `${year}-${mm}` : mm, label: year ? `${MONTH_LABELS[month]} ${year}` : MONTH_LABELS[month] };
}

/** Страниците на сайта, които отговарят на търсенето — по заглавие или по ключова дума (с окончания: „екскурзоводи“) */
export function matchPages(query: string): StaticPage[] {
  const q = query.trim().toLowerCase();
  const words = splitWords(q);
  if (words.length === 0) return [];
  return STATIC_PAGES.filter(page =>
    page.title.toLowerCase().includes(q) ||
    page.keywords.some(keyword =>
      keyword.includes(' ')
        ? q.includes(keyword) || (q.length >= 3 && keyword.startsWith(q))
        : words.some(word =>
            (word.length >= 3 && keyword.startsWith(word)) ||
            (word.startsWith(keyword) && word.length - keyword.length <= 3),
          ),
    ),
  );
}
