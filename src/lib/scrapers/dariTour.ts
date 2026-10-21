// src/lib/scrapers/dariTour.ts
//
// Парсери за сайта на туроператор „Дари Тур“ (https://dari-tour.com/) — използват се от:
//   - /api/scout  → намира линковете към екскурзиите за избраните държави
//   - /api/scrape → извлича данните от страницата на конкретна екскурзия
//
// Как е устроен сайтът (проверено октомври 2026):
//   - Кодировка windows-1251 (не UTF-8) — затова HTML-ът се декодира с fallback, виж decodeHtml().
//   - Менюто на началната страница има линкове „ekskurzii-<държава>“ и „ekzotichni-<държава>“ с текст = името
//     на държавата на български (напр. „Китай“, „Дубай“, „Хърватска“).
//   - Всяка такава страница показва офертите като карти <a class="offer-item"> с .title, .date и .price.
//   - Страницата на екскурзия: <h1> заглавие, блокове .offer-info (продължителност / маршрут / транспорт), таблица
//     .dates-wrap table.dates (дата | цена | резервация) и табове .resp-tabs-list li ↔ .resp-tabs-container > div
//     („Програма“, „Цената включва“, „Цената не включва“, „Допълнителни екскурзии“, „Хотели“, „Допълнителна информация“).
//
// Ако Дари Тур смени дизайна на сайта си, тук е единственото място, което трябва да се пипне.

import { load } from 'cheerio';
import { WORLD_COUNTRIES } from '@/lib/constants';
import { readableFlightInfo } from './flightSchedule';

export const DARI_BASE_URL = 'https://dari-tour.com/';
export const DARI_HOSTNAMES = new Set(['dari-tour.com', 'www.dari-tour.com']);

export function isDariUrl(url: string): boolean {
  try {
    return DARI_HOSTNAMES.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

// Декодира отговора на сървъра. Пробваме UTF-8; ако се появят символи за грешка (�) — страницата е
// windows-1251 (така е при Дари Тур и при 2mko).
export function decodeHtml(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  if (!utf8.includes('�')) return utf8;
  return new TextDecoder('windows-1251').decode(buffer);
}

// ==========================================
// ИМЕНА НА ДЪРЖАВИ: наши (WORLD_COUNTRIES) ↔ на Дари Тур
// ==========================================
// Дари Тур ползва някои различни имена от нашия списък. Ключът е НАШЕТО име (малки букви), стойността —
// допълнителните имена, с които същата държава може да се появи в менюто/заглавията на Дари Тур.
const DARI_COUNTRY_ALIASES: Record<string, string[]> = {
  'оае': ['дубай', 'абу даби', 'обединени арабски емирства'],
  'хърватия': ['хърватска'],
  'южна африка': ['република южна африка', 'юар'],
  'юар': ['република южна африка', 'южна африка'],
  'аржентина': ['патагония'],
  'чили': ['патагония'],
  'нидерландия': ['холандия'],
  'великобритания': ['англия', 'шотландия'],
};

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

/** Всички имена, под които НАШАТА държава може да се появи при Дари Тур. */
export function dariNamesFor(country: string): string[] {
  const c = norm(country);
  return [c, ...(DARI_COUNTRY_ALIASES[c] || [])];
}

/** Обратното: от име, което ползва Дари Тур (напр. „Дубай“), към наше име от WORLD_COUNTRIES (напр. „ОАЕ“). */
function ourCountriesFromText(text: string): string[] {
  const t = norm(text);
  const found = new Set<string>();
  WORLD_COUNTRIES.forEach((c) => {
    if (dariNamesFor(c).some((name) => t.includes(name))) found.add(c);
  });
  return Array.from(found);
}

// ==========================================
// SCOUT: страници по държави и списък с оферти
// ==========================================

/**
 * От HTML-а на началната страница намира страниците с екскурзии за всяка от избраните държави.
 * Връща { държава: [абсолютни URL-и] }. Ако в менюто няма съвпадение, пробваме „ekskurzii-<slug>“ като резерва
 * (за Дари Тур „ъ“ се изписва като „u“ — „Гърция“ → „gurtsiya“, затова пробваме и двата варианта).
 */
export function findDariCountryPages(homeHtml: string, countries: string[], slugify: (s: string) => string): Record<string, string[]> {
  const $ = load(homeHtml);
  const labelToUrls = new Map<string, Set<string>>();

  $('a[href]').each((_, el) => {
    const hrefRaw = $(el).attr('href') || '';
    let href: string;
    try {
      href = new URL(hrefRaw, DARI_BASE_URL).href;
    } catch {
      return;
    }
    const path = new URL(href).pathname.replace(/^\/+/, '');
    if (!/^(ekskurzii|ekzotichni)-[a-z0-9-]+$/.test(path)) return;
    const label = norm($(el).text());
    if (!label) return;
    if (!labelToUrls.has(label)) labelToUrls.set(label, new Set());
    labelToUrls.get(label)!.add(href);
  });

  const result: Record<string, string[]> = {};
  for (const country of countries) {
    const names = dariNamesFor(country);
    const urls = new Set<string>();
    names.forEach((n) => labelToUrls.get(n)?.forEach((u) => urls.add(u)));

    if (urls.size === 0) {
      const slugA = slugify(country);
      const slugU = slugify(country.replace(/ъ/gi, 'у'));
      [slugA, slugU].filter(Boolean).forEach((s) => urls.add(`${DARI_BASE_URL}ekskurzii-${s}`));
    }
    result[country] = Array.from(urls);
  }
  return result;
}

export interface DariListingItem {
  url: string;
  title: string;
}

/** Картите с оферти от страница на държава (<a class="offer-item">). */
export function parseDariListing(html: string, pageUrl: string): DariListingItem[] {
  const $ = load(html);
  const items: DariListingItem[] = [];
  const seen = new Set<string>();

  $('a.offer-item[href]').each((_, el) => {
    const hrefRaw = $(el).attr('href') || '';
    let href: string;
    try {
      href = new URL(hrefRaw, pageUrl).href;
    } catch {
      return;
    }
    if (!isDariUrl(href) || seen.has(href)) return;
    seen.add(href);
    const title = $(el).find('.title').first().text().replace(/\s+/g, ' ').trim() || ($(el).attr('title') || '').trim();
    items.push({ url: href, title });
  });

  return items;
}

// ==========================================
// SCRAPE: страница на конкретна екскурзия
// ==========================================

export interface ScrapedTour {
  title: string;
  price: string;
  durationDays: string;
  durationNights: string;
  dates: string[];
  route: string;
  transport: string;
  program: { day: number; title: string; description: string }[];
  rawProgram?: string; // само ако не успеем да разделим програмата по дни — тогава AI-ът я разделя
  detectedCountries: string[];
  included: string;
  notIncluded: string;
  documents: string;
  generalInfo: string;
  flightInfo: string; // полетите (часове, номера на полети, багаж) — показват се отделно на сайта и в PDF-а
}

// Начало на блока с полети и редовете, които все още са част от него. Общи за 2МКО и Дари Тур.
// 2МКО: „Полетна информация:“; Дари Тур: „Полетно разписание“ (без двоеточие) в края на таба „Програма“.
export const FLIGHTS_HEADING = /^(полетн[ао]\s+(информация|разписание)|информация\s+за\s+полет\S*|полети)\s*:?\s*$/i;
// Ред от блока: „7 ДЕН – …“, ред с полет/кацане/багаж или ред от разписание „1 TK1128 21MAR SOFIST …“.
// „летище“ нарочно липсва — „трансфери летище-хотел-летище“ е точка от „Цената включва“.
export const FLIGHT_LINE = /^\d{1,2}\s*(?:-?\s*(?:ви|ри|ти|ми|ва))?\s*ден(?![а-яА-Я])|полет|кацане|излитане|багаж|авиокомпани|седалк|^\d{1,2}\s+[A-Z0-9]{2}\s?\d{1,4}\s/i;

// Текст от HTML фрагмент с запазени нови редове: <br>, блокови елементи и <li> стават отделни редове.
function blockText(html: string): string {
  const $$ = load(`<div id="__root">${html}</div>`);
  $$('script, style').remove();
  $$('br').replaceWith('\n');
  $$('li').prepend('- ');
  $$('p, div, li, tr, h1, h2, h3, h4, h5, h6, table, ul, ol').append('\n');
  return $$('#__root')
    .text()
    .replace(/ /g, ' ')
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

// Ден-маркери: „1-ви Ден“, „1 ДЕН:“, „Ден 1“. Същият regex като за 2mko (вж. /api/scrape) — JS \b не разпознава
// кирилица, затова границите на думата „ден“ са с явен lookahead/lookbehind.
const DAY_REGEX = /(?:(\d{1,2})\s*(?:-?\s*(?:ви|ри|ти|ми|ва))?\s*(?<![а-яА-Я])ден(?![а-яА-Я])|(?<![а-яА-Я])ден(?![а-яА-Я])\s*(\d{1,2}))/gi;

// Начало на РЕД, от който започва частта СЛЕД програмата. При Дари Тур в таба „Програма“ под последния ден обикновено
// има „Цена: …“, „Дати: …“, „Примерни хотели:“, „Цената включва:“, „Плащане:“, „Анулации:“ и т.н. Търсим ги само в
// началото на ред, за да не отрежем ден, в чийто текст случайно се споменава „цена“ или „хотели“.
const PROGRAM_END_LINE_STARTS = [
  'цена', 'дати:', 'дати на отпътуване', 'примерни хотели', 'хотели:', 'предвидени хотели', 'в цената',
  'цени на допълнителни', 'допълнителни екскурзии', 'плащане', 'анулаци', 'забележк', 'необходими документи',
  'документи', 'фабрики', 'условия', 'полетно разписание', 'полетна информация',
];

function splitProgram(text: string): { days: ScrapedTour['program']; tail: string } {
  const matches = [...text.matchAll(DAY_REGEX)];
  const markers: { day: number; index: number }[] = [];
  let expected = 1;
  for (const m of matches) {
    const num = parseInt(m[1] || m[2], 10);
    if (num === expected && m.index !== undefined) {
      markers.push({ day: num, index: m.index });
      expected++;
    }
  }
  if (markers.length === 0) return { days: [], tail: '' };

  const days: ScrapedTour['program'] = [];
  let tail = '';
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index;
    let end: number;
    if (i + 1 < markers.length) {
      end = markers[i + 1].index;
    } else {
      // Последен ден — режем при първия ред-маркер за край (след първите 15 символа, за да не хванем самия ден)
      const lower = text.toLowerCase();
      let earliest = -1;
      for (const marker of PROGRAM_END_LINE_STARTS) {
        const idx = lower.indexOf('\n' + marker, start + 15);
        if (idx !== -1 && (earliest === -1 || idx < earliest)) earliest = idx + 1;
      }
      end = earliest === -1 ? text.length : earliest;
      tail = text.slice(end).trim();
    }
    const description = text.slice(start, end).replace(/\s+/g, ' ').trim();
    days.push({ day: markers[i].day, title: `Ден ${markers[i].day}`, description });
  }
  return { days, tail };
}

type SectionKind = 'included' | 'notIncluded' | 'docs' | 'info' | 'flights';

function classifyHeading(heading: string): SectionKind {
  const h = heading.toLowerCase();
  if (FLIGHTS_HEADING.test(heading.trim())) return 'flights';
  if (/не\s+включва|не\s+са\s+включени|не\s+се\s+включват|допълнително\s+се\s+заплаща/.test(h)) return 'notIncluded';
  if (/включва|са\s+включени|се\s+включват/.test(h)) return 'included';
  if (/документ|виза|визи|паспорт/.test(h)) return 'docs';
  return 'info';
}

// Разделя „опашката“ след програмата на секции по заглавни редове („Плащане:“, „Анулации:“, „Цената включва:“...).
function splitTailSections(tail: string): { kind: SectionKind; heading: string; lines: string[] }[] {
  const sections: { kind: SectionKind; heading: string; lines: string[] }[] = [];
  let current = { kind: 'info' as SectionKind, heading: '', lines: [] as string[] };
  for (const line of tail.split('\n').map((l) => l.trim()).filter(Boolean)) {
    // „Полетно разписание“ при Дари Тур е без двоеточие — затова е отделна проверка
    const isHeading = (line.length < 70 && /:\s*$/.test(line)) || FLIGHTS_HEADING.test(line);
    if (isHeading) {
      if (current.heading || current.lines.length) sections.push(current);
      current = { kind: classifyHeading(line), heading: line, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.heading || current.lines.length) sections.push(current);
  return sections;
}

const DOC_LINE = /паспорт|виза|визи|документ|ваксин/i;

export function parseDariTour(html: string): ScrapedTour {
  const $ = load(html);
  $('script, style, noscript').remove();

  const title = $('h1').first().text().replace(/\s+/g, ' ').trim();

  // .offer-info блокове: часовник = продължителност, локация = маршрут, самолет/автобус = транспорт
  let durationText = '';
  let route = '';
  let transport = '';
  $('.offer-info').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if ($(el).find('[class*="icon-clock"]').length) durationText = text;
    else if ($(el).find('[class*="icon-location"]').length) route = text;
    else if ($(el).find('[class*="icon-airplane"], [class*="icon-bus"], [class*="icon-plane"], [class*="icon-ship"]').length) transport = text;
  });

  const bodyText = $('body').text().replace(/\s+/g, ' ');
  let durationDays = '';
  let durationNights = '';
  const dm = (durationText || bodyText).match(/(\d+)\s*(?:дни|ден)\s*\/?\s*(\d+)\s*(?:нощувки|нощувка|нощи|нощ)/i);
  if (dm) {
    durationDays = dm[1];
    durationNights = dm[2];
  }

  // Дати + цена: първо от таблицата с дати (най-надеждно), после от текста „Дати:“ в програмата
  const dates: string[] = [];
  const prices: number[] = [];
  $('.dates-wrap table.dates tr').each((_, tr) => {
    const cells = $(tr).children('td');
    if (cells.length < 2) return;
    const dateCell = $(cells[0]).text();
    // Ако клетката е период („18.01.2027 - 25.01.2027“), вземаме само началото
    const first = dateCell.match(/\d{1,2}\.\d{1,2}\.\d{4}/);
    if (first && !dates.includes(first[0])) dates.push(first[0]);
    const pm = $(cells[1]).text().replace(/\s+/g, ' ').match(/(\d[\d ]*(?:[.,]\d+)?)\s*(?:€|евро|EUR)/i);
    if (pm) prices.push(parseFloat(pm[1].replace(/\s/g, '').replace(',', '.')));
  });

  if (dates.length === 0) {
    const label = bodyText.match(/Дати(?:\s+на\s+отпътуване)?\s*:\s*(.{0,600})/i);
    if (label) {
      // „d1 - d2“ е период → само началото; самотна дата → тя самата
      const re = /(\d{1,2}\.\d{1,2}\.\d{4})(?:\s*[-–—]\s*\d{1,2}\.\d{1,2}\.\d{4})?/g;
      for (const m of label[1].matchAll(re)) if (!dates.includes(m[1])) dates.push(m[1]);
    }
  }

  // Цената е само число в евро (като при 2mko) — валутата се добавя от TourForm / AI форматирането
  let price = '';
  if (prices.length > 0) {
    price = String(Math.min(...prices));
  } else {
    const pm = bodyText.match(/Цена[^:]{0,40}:\s*от\s*(\d[\d ]*)\s*(?:€|евро|EUR)/i) || bodyText.match(/от\s*(\d[\d ]*)\s*(?:€|евро)/i);
    if (pm) price = pm[1].replace(/\s/g, '');
  }

  // Табове: заглавията и съдържанието са в един и същи ред (li[i] ↔ div[i])
  const tabTitles = $('.resp-tabs-list li').map((_, li) => $(li).text().replace(/\s+/g, ' ').trim()).get();
  const panes = $('.resp-tabs-container').first().children('div').toArray();

  let programText = '';
  let included = '';
  let notIncluded = '';
  const infoParts: string[] = [];
  const docLines: string[] = [];
  const flightLines: string[] = [];

  tabTitles.forEach((tabTitle, i) => {
    const pane = panes[i];
    if (!pane) return;
    const text = blockText($(pane).html() || '');
    if (!text) return;
    const t = tabTitle.toLowerCase();
    if (t.includes('програма')) programText = text;
    else if (t.includes('полет')) flightLines.push(...text.split('\n'));
    else if (/не\s+включва/.test(t)) notIncluded = text;
    else if (t.includes('включва')) included = text;
    else infoParts.push(`${tabTitle}:\n${text}`);
  });

  // Ако страницата няма табове (стар шаблон) — вземаме съдържанието на основната колона като програма
  if (!programText) {
    const main = $('.offer-side-bottom').first();
    if (main.length) programText = blockText(main.html() || '');
  }

  const { days, tail } = splitProgram(programText);

  // „Опашката“ след програмата: цени/плащане/анулации/документи. Секциите „включва/не включва“ ги взимаме оттук
  // само ако съответният таб липсва — иначе дублират таба.
  splitTailSections(tail).forEach((sec) => {
    const body = sec.lines.join('\n');
    if (sec.kind === 'included') {
      if (!included) included = body;
    } else if (sec.kind === 'notIncluded') {
      if (!notIncluded) notIncluded = body;
    } else if (sec.kind === 'docs') {
      docLines.push(...sec.lines);
    } else if (sec.kind === 'flights') {
      flightLines.push(...sec.lines);
    } else {
      infoParts.push(sec.heading ? `${sec.heading}\n${body}` : body);
    }
  });

  // Редовете за паспорт/виза/документи от информационните секции → „Необходими документи“
  const generalInfo = infoParts
    .join('\n\n')
    .split('\n')
    .filter((line) => {
      if (DOC_LINE.test(line) && line.length > 15) {
        docLines.push(line);
        return false;
      }
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const detectedCountries = ourCountriesFromText(`${title} ${route}`);

  return {
    title,
    price,
    durationDays,
    durationNights,
    dates,
    route,
    transport,
    program: days,
    ...(days.length === 0 && programText ? { rawProgram: programText.slice(0, 12000) } : {}),
    detectedCountries,
    included: included.trim(),
    notIncluded: notIncluded.trim(),
    documents: Array.from(new Set(docLines)).join('\n').trim(),
    generalInfo,
    // „2 TK 196 21MAR ISTPEK …“ → „21 март – полет TK 196 Истанбул (IST) – Пекин (PEK), …“
    flightInfo: readableFlightInfo(flightLines.map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n')),
  };
}
