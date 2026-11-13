// Изтегляне на програма от сайта на туроператор (2МКО или Дари Тур) — общо за /api/scrape (внасяне на нов тур)
// и /api/admin/reimport-tour („Внеси наново от 2МКО“ в съществуващ тур).

import { DARI_HOSTNAMES, parseDariTour } from './dariTour';
import { parseTwoMkoTour } from './twoMko';
import { fetchTwoMkoDocx, parseTwoMkoDocx } from './twoMkoDocx';
import { flightsFromProgram } from './flightSchedule';

// Разрешени са САМО домейните на туроператорите, с които работим — предпазва от SSRF към вътрешни мрежи/метаданни
export const ALLOWED_HOSTNAMES = new Set(['2mko.com', 'www.2mko.com', ...DARI_HOSTNAMES]);

export class ScrapeError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function scrapeTourUrl(url: string): Promise<Record<string, any>> {
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new ScrapeError('Невалиден URL', 400); }
  if (!ALLOWED_HOSTNAMES.has(parsed.hostname)) throw new ScrapeError('Домейнът не е разрешен', 400);

  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
  const buffer = await response.arrayBuffer();
  let html = new TextDecoder('utf-8').decode(buffer);
  // Unicode replacement character (�) = неуспешен UTF-8 decode → кирилицата е в windows-1251
  if (html.includes('�')) html = new TextDecoder('windows-1251').decode(buffer);

  // Дари Тур има собствен парсер — връща същата структура като 2МКО по-долу
  if (DARI_HOSTNAMES.has(parsed.hostname)) {
    if (!response.ok) throw new ScrapeError(`Дари Тур върна грешка (HTTP ${response.status})`, 502);
    return { success: true, operator: 'dari', ...parseDariTour(html) };
  }

  // Премахнат/сгрешен линк — казваме го ясно (проверката на туровете го показва като „линкът не работи“)
  if (!response.ok) throw new ScrapeError(`Туроператорът върна грешка (HTTP ${response.status})`, 502);

  const { debug, ...tour } = parseTwoMkoTour(html);

  // Word файлът на програмата („Изтегли в MS Word“) има същия текст, но с ясни раздели — оттам взимаме
  // „включва / не включва“, документите и допълнителната информация, а и полетите. Празен раздел не заменя страницата.
  const docx = await fetchTwoMkoDocx(html);
  let docxText = '';
  if (docx) {
    try {
      const sections = parseTwoMkoDocx(docx);
      // Частите, от които AI взима допълнителните екскурзии с цените, единичната стая и депозита
      docxText = sections.extrasSource;
      if (sections.included) tour.included = sections.included;
      if (sections.notIncluded) tour.notIncluded = sections.notIncluded;
      if (sections.documents) tour.documents = sections.documents;
      if (sections.generalInfo) tour.generalInfo = sections.generalInfo;
      if (!tour.flightInfo) tour.flightInfo = sections.flightInfo;
    } catch (err) {
      console.error('[scrape] Word файлът на 2МКО не се прочете:', err);
    }
  }
  // Без раздел с полети — изреченията с полет и час от самата програма
  if (!tour.flightInfo) tour.flightInfo = flightsFromProgram(tour.program);

  return {
    success: true, operator: '2mko', ...tour,
    ...(docxText && { docxText }),
    // Дебъг данни само в development — не излагаме вътрешна логика в production
    ...(process.env.NODE_ENV !== 'production' && { debug }),
  };
}
