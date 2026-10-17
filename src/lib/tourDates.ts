// Дати на тур — в базата има смесени формати: YYYY-MM-DD (автоматизацията), DD.MM.YYYY (ръчно добавени
// в TourForm и от „Провери с бот“), DD-MM-YYYY (старото поле date), понякога Firestore Timestamp.
// Една и съща дата в два формата се показваше два пъти в админа (сайтът ги слива сам), затова всичко
// тук се свежда до ISO (YYYY-MM-DD) — така се записва и така се сравнява.

/** Всеки познат формат → YYYY-MM-DD, или null ако не е дата. */
export function toISODate(d: unknown): string | null {
  if (!d) return null;
  if (typeof d === 'object') {
    const o = d as { toDate?: () => Date; seconds?: number };
    if (typeof o.toDate === 'function') return o.toDate().toISOString().split('T')[0];
    if (typeof o.seconds === 'number') return new Date(o.seconds * 1000).toISOString().split('T')[0];
    return null;
  }
  const s = String(d).trim().split('T')[0];
  let m = s.match(/^(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-.\/](\d{1,2})[-.\/](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

/** Списък дати → ISO, без повторения, хронологично. Невалидните се изпускат. */
export function normalizeTourDates(dates: unknown[]): string[] {
  const iso = dates.map(toISODate).filter((d): d is string => !!d);
  return [...new Set(iso)].sort();
}

/** YYYY-MM-DD → DD.MM.YYYY за показване. */
export function displayTourDate(iso: string): string {
  return iso.split('-').reverse().join('.');
}

const BG_MONTHS = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември'];

/**
 * Дали някоя от датите (ISO) отговаря на търсенето в админа. Приема „27.11“, „27.11.2026“, „27/11“,
 * „27,11“, „27 ноември“, „ноември 2026“, „11.2026“, „2026-11-27“, или само месец („ноември“, „ное“).
 * Само цифри се търсят като текст, докато се пишат: „1“ → „19“ → „19.11“ стесняват списъка постепенно,
 * вместо всички турове да изчезват, докато датата не е дописана.
 */
export function datesMatchQuery(isoDates: string[], query: string): boolean {
  const tokens = query.trim().toLowerCase().replace(/г\.?$/, '').split(/[.\/\-\s,]+/).filter(Boolean);
  if (tokens.length === 0 || isoDates.length === 0) return false;

  let day: number | undefined, month: number | undefined, year: string | undefined;
  const nums: string[] = [];
  for (const t of tokens) {
    if (/^\d+$/.test(t)) { nums.push(t); continue; }
    // Месец с думи — поне 3 букви, за да не хваща всяка дума от заглавие
    const monthIdx = t.length >= 3 ? BG_MONTHS.findIndex(name => name.startsWith(t)) : -1;
    if (monthIdx === -1 || month !== undefined) return false;
    month = monthIdx + 1;
  }

  if (month === undefined) {
    // Само цифри — като текст срещу датата във всички изписвания (19.11.2027, 9.11.2027, 2027.11.19):
    // съвпада, ако започва от началото на дата или от началото на нейна част („11.2027“, „2027“)
    const q = nums.join('.');
    return isoDates.some(iso => {
      const [y, m, d] = iso.split('-');
      return [`${d}.${m}.${y}`, `${Number(d)}.${Number(m)}.${y}`, `${y}.${m}.${d}`]
        .some(s => s.startsWith(q) || s.includes(`.${q}`));
    });
  }

  // „ноември“, „27 ноември“, „ноември 2026“, „27 ноември 2026“
  for (const n of nums) {
    if (n.length === 4 && year === undefined) year = n;
    else if (n.length <= 2 && day === undefined) day = Number(n);
    else return false;
  }

  return isoDates.some(iso => {
    const [y, m, d] = iso.split('-');
    return (year === undefined || y.endsWith(year))
      && (month === undefined || Number(m) === month)
      && (day === undefined || Number(d) === day);
  });
}

/**
 * Търсачката за турове в админа: думи от заглавието (в произволен ред), държава и/или дата.
 * „сингапур австралия“, „Япония“, „27.11“, „Япония ноември“, „перу 27 ноември“.
 * includeHistorical — за архива, където активните дати са изчистени и остават само в historicalDates.
 */
export function tourMatchesSearch(
  tour: { title?: string; country?: string | string[]; dates?: unknown[]; date?: unknown; historicalDates?: unknown[] },
  query: string,
  includeHistorical = false,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const countries = Array.isArray(tour.country) ? tour.country : String(tour.country || '').split(',');
  const text = `${tour.title || ''} ${countries.join(' ')}`.toLowerCase();
  const dates = normalizeTourDates([...(tour.dates || []), tour.date, ...(includeHistorical ? tour.historicalDates || [] : [])]);

  if (text.includes(q) || datesMatchQuery(dates, q)) return true;

  // Думите, които ги има в заглавието/държавите, отпадат; останалите трябва заедно да са дата
  const rest = q.split(/\s+/).filter(w => !text.includes(w));
  return rest.length === 0 || datesMatchQuery(dates, rest.join(' '));
}
