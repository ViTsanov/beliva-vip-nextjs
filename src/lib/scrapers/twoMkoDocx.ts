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
  const $ = load(html);
  const href = $('a[href$=".docx" i], a[href*=".docx?" i]').first().attr('href');
  if (!href) return null;
  try {
    // <base href="/"> → относителните линкове са спрямо корена на сайта, не спрямо /ekskurzia/...
    const url = new URL(href, SITE);
    return url.hostname.endsWith('2mko.com') ? url.href : null;
  } catch {
    return null;
  }
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

/** Разделът „ПОЛЕТНА ИНФОРМАЦИЯ“: заглавието и следващите абзаци, докато приличат на полет или бележка за багажа. */
export function flightsFromDocx(docx: Uint8Array): string {
  const paragraphs = docxParagraphs(docx);
  const start = paragraphs.findIndex((p) => FLIGHTS_HEADING.test(p));
  if (start === -1) return '';
  const lines: string[] = [];
  for (const p of paragraphs.slice(start + 1)) {
    if (!FLIGHT_LINE.test(p)) break;
    lines.push(p.replace(/^\*\s*/, ''));
  }
  return lines.join('\n');
}
