// src/lib/scrapers/twoMkoDocx.ts
//
// 2МКО държи полетите (часове, номера, авиокомпании) в Word файла на програмата („Изтегли в MS Word“), а на
// страницата на екскурзията обикновено ги няма. Линкът е <a href="img/PROGRAMI/<id><име>.docx"> спрямо <base href="/">.
// Тук: намираме линка, а след изтеглянето (в /api/scrape) вадим раздела „ПОЛЕТНА ИНФОРМАЦИЯ“ от документа.

import { load } from 'cheerio';
import { unzipSync, strFromU8 } from 'fflate';
import { FLIGHTS_HEADING, FLIGHT_LINE } from './dariTour';

const SITE = 'https://www.2mko.com/';

/** Абсолютният адрес на Word файла с програмата, или null ако страницата няма такъв. */
export function findTwoMkoDocxUrl(html: string): string | null {
  return findTwoMkoDocxUrls(html)[0] ?? null;
}

// Кирилица → windows-1251 байтове, %-кодирани. Сървърът на 2МКО търси файловете с кирилско име („…Коригиран
// правопис и полети.docx“) в тази кодировка — стандартното UTF-8 кодиране връща 404.
function encodeCp1251Path(path: string): string {
  return [...path].map((ch) => {
    const code = ch.codePointAt(0)!;
    let byte: number | null = null;
    if (code >= 0x410 && code <= 0x44f) byte = code - 0x410 + 0xc0; // А–я
    else if (code === 0x401) byte = 0xa8; // Ё
    else if (code === 0x451) byte = 0xb8; // ё
    if (byte !== null) return `%${byte.toString(16).toUpperCase()}`;
    return /[A-Za-z0-9\-._~/()&,!']/.test(ch) ? ch : encodeURIComponent(ch);
  }).join('');
}

/** Адресите, на които може да е Word файлът: стандартният и (при кирилско име) този в windows-1251. */
export function findTwoMkoDocxUrls(html: string): string[] {
  const $ = load(html);
  const href = $('a[href$=".docx" i], a[href*=".docx?" i]').first().attr('href');
  if (!href) return [];
  try {
    // <base href="/"> → относителните линкове са спрямо корена на сайта, не спрямо /ekskurzia/...
    const url = new URL(href, SITE);
    if (!url.hostname.endsWith('2mko.com')) return [];
    const urls = [url.href];
    const path = decodeURIComponent(url.pathname);
    if (/[Ѐ-ӿ]/.test(path)) urls.push(`${url.origin}${encodeCp1251Path(path)}${url.search}`);
    return urls;
  } catch {
    return [];
  }
}

/** Изтегля Word файла (опитва и двата адреса). null, ако не стане — тогава остава текстът от страницата. */
export async function fetchTwoMkoDocx(html: string): Promise<Uint8Array | null> {
  for (const url of findTwoMkoDocxUrls(html)) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(15000),
      });
      const type = res.headers.get('content-type') || '';
      if (res.ok && !type.includes('text/html')) return new Uint8Array(await res.arrayBuffer());
    } catch (err) {
      console.error('[scrape] Word файлът на 2МКО не се изтегли:', url, err);
    }
  }
  return null;
}

const decodeXml = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/** Абзаците на документа като текст (word/document.xml: <w:p> → абзац, <w:t> → текст, <w:tab>/<w:br> → интервал). */
export function docxParagraphs(docx: Uint8Array): string[] {
  const files = unzipSync(docx, { filter: (f) => f.name === 'word/document.xml' });
  const xml = files['word/document.xml'];
  if (!xml) return [];
  return strFromU8(xml)
    .split(/<w:p[\s>]/)
    .slice(1)
    .map((p) => decodeXml(
      [...p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:(?:tab|br)\b[^>]*\/>/g)].map((m) => m[1] ?? ' ').join(''),
    ).replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

export interface TwoMkoDocxSections {
  included: string;
  notIncluded: string;
  documents: string;
  generalInfo: string; // условия + „Хотели:“ + „Информация за кораба:“ + „Забележки:“
  flightInfo: string;
}

type Bucket = 'skip' | 'info' | 'included' | 'notIncluded' | 'flights' | 'hotels' | 'ship' | 'notes' | 'docs';

// Заглавията на разделите в Word файла на 2МКО, в реда, в който се срещат след програмата по дни
function headingBucket(p: string): Bucket | null {
  if (p.length > 120) return null;
  // Само в началото на абзаца: изречение като „…виж раздел „В цената не се включени“…“ над програмата не е заглавие
  const l = p.toLowerCase().replace(/^\d+\.\s*/, '').replace(/^в\s+/, '').replace(/^пакетната\s+/, '');
  if (/^пояснения\s+по\s+програма/.test(l)) return 'info';
  if (/^цена(?:та)?\s+не\s+(?:са\s+|се\s+)?включ|^не\s+са\s+включени/.test(l)) return 'notIncluded';
  if (/^цена(?:та)?\s+(?:са\s+|се\s+)?включ|^включени\s+в\s+цената|^обиколки\s+и\s+посещения/.test(l)) return 'included';
  if (FLIGHTS_HEADING.test(p)) return 'flights';
  if (/^хотели\s*:?\s*$|^изисквания\s+при\s+настаняване/.test(l)) return 'hotels';
  if (/^информация\s+за\s+(?:круизния\s+)?кораб/.test(l)) return 'ship';
  if (/^\*?\s*забележк/.test(l)) return 'notes';
  if (/банкови\s+сметки/.test(l)) return 'skip';
  if (/^необходими\s+документи/.test(l)) return 'docs';
  return null;
}

// Данните на 2МКО (адрес, телефони, e-mail, сметки) никога не стигат до нашия сайт; адресите на хотелите се махат
const OPERATOR_LINE = /2\s*м\s*-?\s*ко|2\s*m\s*-?\s*ko|iban|\bbic\s*:|e-?mail|@|настоящата\s+програма\s+представлява/i;
const clean = (p: string) => p.replace(/https?:\/\/\S+/g, '').replace(/\s+[-–]\s*$/, '').replace(/\s{2,}/g, ' ').trim();

/**
 * Разделите след програмата: какво включва / не включва, полети, хотели, кораб, забележки, документи.
 * Страницата на 2МКО има горе-долу същия текст, но без ясни заглавия (хотелите се смесваха с „Цената включва“),
 * а във Word файла всеки раздел е със заглавие. Текстът под линията „-----“ е общ правен текст — спираме там.
 */
export function parseTwoMkoDocx(docx: Uint8Array): TwoMkoDocxSections {
  const paragraphs = docxParagraphs(docx);
  const buckets: Record<Bucket, string[]> = { skip: [], info: [], included: [], notIncluded: [], flights: [], hotels: [], ship: [], notes: [], docs: [] };
  let current: Bucket | null = null; // null — още сме в заглавието/програмата
  let beforeFlights: Bucket = 'included';

  for (const raw of paragraphs) {
    if (/^-{5,}/.test(raw)) break;
    const heading = headingBucket(raw);
    if (heading) {
      if (heading === 'flights' && current) beforeFlights = current;
      current = heading;
      // „Информация за кораб Wonder of the Seas: …“ — текстът след двоеточието е съдържание
      if (heading === 'ship') buckets.ship.push(clean(raw.replace(/^[^:]*:\s*/, '')));
      // Подзаглавията на документите („… ЗА ВИЗА:“ / „… ЗА ПЪТУВАНЕ:“) остават като ред
      if (heading === 'docs') buckets.docs.push(clean(raw));
      continue;
    }
    if (!current || current === 'skip' || OPERATOR_LINE.test(raw)) continue;
    // Полетите свършват с първия абзац, който не прилича на полет — после продължава предишният раздел
    if (current === 'flights' && !FLIGHT_LINE.test(raw)) current = beforeFlights;
    const line = clean(current === 'flights' ? raw.replace(/^\*\s*/, '') : raw);
    if (line) buckets[current].push(line);
  }

  const block = (title: string, lines: string[]) => (lines.length ? `${title}\n${lines.join('\n')}` : '');
  return {
    included: buckets.included.join('\n'),
    notIncluded: buckets.notIncluded.join('\n'),
    documents: buckets.docs.join('\n'),
    generalInfo: [
      buckets.info.join('\n'),
      block('Хотели:', buckets.hotels),
      block('Информация за кораба:', buckets.ship),
      block('Забележки:', buckets.notes),
    ].filter(Boolean).join('\n\n'),
    flightInfo: buckets.flights.join('\n'),
  };
}
