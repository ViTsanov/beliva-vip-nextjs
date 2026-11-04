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
    ).replace(/[-]/g, '').replace(/\s+/g, ' ').trim()) // U+F0B7 и др.: булети от символен шрифт на Word
    .filter(Boolean);
}

export interface TwoMkoDocxSections {
  included: string;
  notIncluded: string;
  documents: string;
  generalInfo: string; // условия + „Хотели:“ + „Информация за кораба:“ + „Забележки:“
  flightInfo: string;
  extrasSource: string; // само каквото AI търси за допълнителните екскурзии, единичната стая и депозита
}

type Bucket = 'skip' | 'info' | 'included' | 'notIncluded' | 'extras' | 'flights' | 'hotels' | 'ship' | 'notes' | 'docs';

// Заглавията на разделите в Word файла на 2МКО, в реда, в който се срещат след програмата по дни
function headingBucket(p: string): Bucket | null {
  // Само в началото на абзаца: изречение като „…виж раздел „В цената не се включени“…“ над програмата не е заглавие
  const l = p.toLowerCase().replace(/^\d+\.\s*/, '').replace(/^в\s+/, '').replace(/^пакетната\s+/, '');
  // Тези три понякога продължават с текста на същия ред („НЕОБХОДИМИ ДОКУМЕНТИ: - Задграничен паспорт…“), затова са
  // преди проверката за дължина. „Допълнителните мероприятия… се заявяват“ е бележка, а не заглавие — затова не „-ите“.
  if (/^\*?\s*забележк/.test(l)) return 'notes';
  if (/^необходими\s+документи/.test(l)) return 'docs';
  if (/^(?:допълнит(?:е|ел)ни\s+)*(?:екскурзии|посещения|мероприятия)\s.*(?:заявяват|заплащат|плащат)/.test(l)) return 'extras';
  if (p.length > 120) return null;
  if (/^описание\s+на\s+допълнителни/.test(l)) return 'extras';
  if (/^пояснения\s+по\s+програма/.test(l)) return 'info';
  if (/^цена(?:та)?\s+не\s+(?:са\s+|се\s+)?включ|^не\s+са\s+включени|^допълнително\s+се\s+заплаща/.test(l)) return 'notIncluded';
  if (/^цена(?:та)?\s+(?:са\s+|се\s+)?включ|^включени\s+в\s+цената|^обиколки\s+и\s+посещения/.test(l)) return 'included';
  if (FLIGHTS_HEADING.test(p)) return 'flights';
  if (/^хотели\s*:?\s*$|^изисквания\s+при\s+настаняване/.test(l)) return 'hotels';
  if (/^информация\s+за\s+(?:круизния\s+)?кораб|^техническа\s+информация|^за\s+кораба\s*:?\s*$/.test(l)) return 'ship';
  if (/банкови\s+сметки/.test(l)) return 'skip';
  return null;
}

// Данните на 2МКО (адрес, телефони, e-mail, сметки) никога не стигат до нашия сайт; адресите на хотелите се махат
const OPERATOR_LINE = /2\s*м\s*-?\s*ко|2\s*m\s*-?\s*ko|iban|\bbic\s*:|e-?mail|@|настоящата\s+програма\s+представлява/i;
const clean = (p: string) => p.replace(/https?:\/\/\S+/g, '').replace(/\s+[-–]\s*$/, '').replace(/\s{2,}/g, ' ').trim();

// Шапката на документа (адрес, телефон, факс, сайт, социални мрежи)
const HEADER_LINE = /^\d{4}\s+софия|^тел\s*[:.]|fax|web\s+страница|instagram|facebook/i;
// Изречение от програмата, което споменава нещо извън цената
const OPTIONAL_SENTENCE = /\*|по\s+желание|заплаща|плаща\s+се\s+на\s+място/i;
// Абзац, прекъснат по средата на изречението („… пране и гладене,“ + „румсървиз“)
const UNFINISHED_LINE = /(?:,|\s(?:от|на|в|и|за|с|към|до))$/i;

const lineKey = (line: string) =>
  `${line.toLowerCase().match(/[а-яa-z]+/g)?.slice(0, 3).join(' ')}|${line.match(/\d[\d\s]*/g)?.join('').replace(/\s/g, '')}`;

/**
 * Разделите след програмата: какво включва / не включва, допълнителни екскурзии, полети, хотели, кораб, забележки,
 * документи. Страницата на 2МКО има горе-долу същия текст, но без ясни заглавия (хотелите се смесваха с „Цената
 * включва“), а във Word файла всеки раздел е със заглавие. Текстът под линията „-----“ е общ правен текст — спираме там.
 */
export function parseTwoMkoDocx(docx: Uint8Array): TwoMkoDocxSections {
  const paragraphs = docxParagraphs(docx);
  const buckets: Record<Bucket, string[]> = { skip: [], info: [], included: [], notIncluded: [], extras: [], flights: [], hotels: [], ship: [], notes: [], docs: [] };
  const push = (bucket: Bucket, line: string) => {
    const list = buckets[bucket];
    if (list.length && UNFINISHED_LINE.test(list[list.length - 1])) list[list.length - 1] += ` ${line}`;
    else list.push(line);
  };
  const programSentences: string[] = [];
  const everything: string[] = []; // за Word файл без познати заглавия
  let current: Bucket | null = null; // null — още сме в заглавието/програмата
  let beforeFlights: Bucket = 'included';
  let day = '';
  let afterRequirements: Bucket | null = null; // „Изисквания при настаняване:“ е един абзац в средата на „включва“

  for (const raw of paragraphs) {
    // Общият правен текст в края. Линиите от тирета не са надежден край: при някои програми има такава и по средата
    if (/^туроператорът\s+(?:сключва|има\s+сключена)/i.test(raw)) break;
    if (/^[-–—_]{5,}/.test(raw)) continue;
    const skipLine = OPERATOR_LINE.test(raw) || HEADER_LINE.test(raw);
    if (!skipLine && current !== 'skip') everything.push(clean(raw));

    const heading = headingBucket(raw);
    if (heading) {
      if (heading === 'flights' && current) beforeFlights = current;
      if (heading === 'hotels' && /изисквания/i.test(raw)) afterRequirements = current;
      current = heading;
      // Текстът след двоеточието в заглавието е съдържание
      const rest = clean(raw.includes(':') ? raw.slice(raw.indexOf(':') + 1) : '');
      if (heading === 'ship') {
        // „Информация за кораб Wonder of the Seas: …“, „Техническа информация Costa Fascinosa“, „За кораба“
        const title = clean(raw);
        if (rest) push('ship', rest);
        else if (!/^техническа\s+информация$/i.test(title)) buckets.ship.push(/:$/.test(title) ? title : `${title}:`);
      } else if (heading === 'docs') {
        // Подзаглавията („… ЗА ВИЗА:“ / „… ЗА ПЪТУВАНЕ:“) остават като ред; общото „НЕОБХОДИМИ ДОКУМЕНТИ:“ не е документ
        if (/за\s+(?:виз[аи]|пътуване)/i.test(raw.split(':')[0])) buckets.docs.push(clean(raw.split(':')[0]) + ':');
        rest.split(/\s*;\s*|\s+-\s+(?=[А-ЯA-Z])/).map(item => clean(item.replace(/^\s*[-–]\s*/, ''))).filter(Boolean).forEach(item => buckets.docs.push(item));
      } else if ((heading === 'notes' || heading === 'extras') && rest) {
        push(heading, rest);
      }
      continue;
    }
    if (skipLine) continue;

    if (!current) {
      const dayMatch = raw.match(/^(\d{1,2})\s*-?\s*(?:ви|ри|ти|ми|ва)?\s*ден(?![а-яА-Я])/i);
      if (dayMatch) day = dayMatch[1];
      // И следващото изречение: там обикновено е какво включва („…„Невероятната Япония“*. Тя включва…“)
      const sentences = clean(raw).split(/(?<=[.!?])\s+/);
      sentences.forEach((sentence, i) => {
        if (OPTIONAL_SENTENCE.test(sentence) || (i > 0 && OPTIONAL_SENTENCE.test(sentences[i - 1]))) {
          programSentences.push(day ? `Ден ${day}: ${sentence}` : sentence);
        }
      });
      continue;
    }
    if (current === 'skip') continue;
    // Полетите свършват с първия абзац, който не прилича на полет — после продължава предишният раздел
    if (current === 'flights' && !FLIGHT_LINE.test(raw)) current = beforeFlights;
    const line = clean(current === 'flights' ? raw.replace(/^\*\s*/, '') : raw);
    if (!line) continue;

    // В „включва“ на 2МКО има и неща, които цената не включва: доплащанията и бележките със звездичка
    if (current === 'included' && /^доплащане/i.test(line)) {
      push('notIncluded', line);
    } else if (current === 'included' && /^\*|^моля,/i.test(line)) {
      push('info', line);
    } else if (current === 'extras' && /^важно\s*:/i.test(line)) {
      push('info', line);
    } else {
      push(current, line);
    }
    if (current === 'hotels' && afterRequirements) {
      current = afterRequirements;
      afterRequirements = null;
    }
  }

  // Едно общо „НЕОБХОДИМИ ДОКУМЕНТИ ЗА ПЪТУВАНЕ:“ не е документ; подзаглавия остават само ако делят няколко списъка
  const isDocsTitle = (line: string) => /^необходими\s+документи/i.test(line);
  const documents = buckets.docs.filter(isDocsTitle).length > 1 ? buckets.docs : buckets.docs.filter(line => !isDocsTitle(line));

  // Доплащанията често са и в двата раздела, понякога с различен правопис
  const seen = new Set<string>();
  const notIncluded = buckets.notIncluded.filter(line => {
    if (!/^доплащане/i.test(line)) return true;
    const key = lineKey(line);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const block = (title: string, lines: string[]) => (lines.length ? `${title}\n${lines.join('\n')}` : '');
  const hasHeadings = current !== null;
  return {
    included: buckets.included.join('\n'),
    notIncluded: notIncluded.join('\n'),
    documents: documents.join('\n'),
    generalInfo: [
      buckets.info.join('\n'),
      block('Хотели:', buckets.hotels),
      block('Информация за кораба:', buckets.ship),
      block('Забележки:', buckets.notes),
    ].filter(Boolean).join('\n\n'),
    // Полетите не минават през AI, затова тук: ние сме агенция, не туроператор
    flightInfo: buckets.flights.join('\n').replace(/туроператорът\s+уведомява,?\s+че/gi, 'Имайте предвид, че'),
    // Целият документ беше над 40% от входните токени на тура. Без познати заглавия се праща цял, за да не се изгубят цените.
    extrasSource: hasHeadings
      ? [...programSentences, ...buckets.info, ...notIncluded, ...buckets.extras, ...buckets.hotels, ...buckets.notes].join('\n')
      : everything.join('\n'),
  };
}
