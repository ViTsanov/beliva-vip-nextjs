// src/lib/scrapers/twoMko.ts
//
// Парсер за страница на екскурзия на 2МКО (https://www.2mko.com/ekskurzia/...). Ползва се от /api/scrape.
// Връща същата структура като парсера на Дари Тур (src/lib/scrapers/dariTour.ts).
//
// Как е устроена страницата (проверено октомври 2026): <h1> заглавие, „Дати на отпътуване:“, програма по дни в
// един-два дълги параграфа с <strong> „1 ДЕН –“, после списъци „В цената са включени“ / „не са включени“ и т.н.
// Полетите са отделен <ul>, чийто първи ред е „Полетна информация:“ — вътре в списъка „включени“, затова ги
// вадим в отделно поле (flightInfo), а не ги оставяме сред точките на „Цената включва“.

import { load } from 'cheerio';
import { WORLD_COUNTRIES } from '@/lib/constants';
import { FLIGHTS_HEADING, FLIGHT_LINE, type ScrapedTour } from './dariTour';

export function parseTwoMkoTour(html: string) {
  const $ = load(html);

  let title = '', price = '', durationDays = '', durationNights = '', route = '';
  const program: ScrapedTour['program'] = [];
  const dates: string[] = [];
  const detectedCountries: string[] = [];
  let included = '', notIncluded = '', documents = '', generalInfo = '';
  const flightLines: string[] = [];

  title = $('h1').first().text().trim();
  const priceText = $('.price, .tour-price, h2:contains("лв"), h3:contains("лв")').text();
  const priceMatch = priceText.match(/(\d[\d\s]*\d|\d+)/);
  if (priceMatch) price = priceMatch[0].replace(/\s/g, '');

  const bodyText = $('body').text().replace(/\s+/g, ' ');
  const durationMatch = bodyText.match(/(\d+)\s*(?:дни|ден).*?(\d+)\s*(?:нощувки|нощи|нощ)/i);
  if (durationMatch) {
    durationDays = durationMatch[1];
    durationNights = durationMatch[2];
  }

  const routeMatch = bodyText.match(/Маршрут:\s*([^\n|.]+)/i);
  // bodyText е на един ред, затова маршрутът се реже при следващия етикет („Продължителност: …“, „Дати …“)
  if (routeMatch) route = routeMatch[1].split(/\s*(?:Продължителност|Дати на отпътуване|Транспорт|Цена)\s*:/i)[0].trim();

  const titleLower = title.toLowerCase();
  WORLD_COUNTRIES.forEach(c => {
    if (titleLower.includes(c.toLowerCase())) detectedCountries.push(c);
  });

  // Извличаме ЦЕЛИЯ текст след етикета "Дати на отпътуване:" (до ~200 символа), след това търсим ВСИЧКИ дати вътре
  // в него — не само първата (обикновен .match() връща само първото съвпадение и останалите дати се губеха).
  const datesLabelMatch = bodyText.match(/Дати на отпътуване:\s*([^|]{0,200})/i);
  if (datesLabelMatch) {
    const allDatesFound = [...datesLabelMatch[1].matchAll(/\d{2}\.\d{2}\.\d{4}/g)].map(m => m[0]);
    dates.push(...allDatesFound);
  }

  // ==========================================
  // HTML ПОДГОТОВКА - СЕЛЕКТИВНИ МАРКЕРИ
  // ==========================================
  $('script, style, nav, footer, header, aside, .sidebar, #menu').remove();

  // Маркираме САМО истински заглавия (h2-h4) и онези strong/b тагове, чийто СОБСТВЕН текст съвпада с позната
  // фраза за заглавие. Така удебелена цена/час/име на хотел в програмата не се взима за заглавие.
  const headingKeywords = [
    'в цената са включени', 'в цената се включват', 'цената включва', 'включени в цената',
    'в цената не са включени', 'в цената не се включват', 'цената не включва', 'не са включени',
    'допълнително се заплаща', 'допълнителни услуги',
    'необходими документи', 'визов режим', 'документи за пътуване',
    'пояснения по програмата', 'забележк', 'условия за записване', 'условия на плащане'
  ];

  $('h2, h3, h4').each((_, el) => { $(el).prepend('|||HEAD|||'); });
  $('strong, b').each((_, el) => {
    // Интервалите се свеждат до един: 2МКО пише „В&nbsp; ЦЕНАТА СА ВКЛЮЧЕНИ“ и иначе заглавието не се разпознаваше
    const t = $(el).text().replace(/\s+/g, ' ').trim().toLowerCase();
    if (t.length > 0 && t.length < 80 && headingKeywords.some(k => t.includes(k))) {
      $(el).prepend('|||HEAD|||');
    }
  });

  $('br').replaceWith('\n');
  $('li').prepend('- ');
  $('p, div, h1, h2, h3, h4, li').append('\n');

  const rawBodyText = $('body').text();
  const lines = rawBodyText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // ==========================================
  // ЕТАП 1: ПРОГРАМАТА (ГЛОБАЛЕН REGEX, НЕ ПО РЕДОВЕ!)
  // ==========================================
  // На 2mko цялата дневна програма често е в ЕДИН параграф, без нови редове между дните — затова търсим
  // ден-маркери по цялото тяло, не само в началото на ред.
  const cleanFullText = rawBodyText.replace(/\|\|\|HEAD\|\|\|/g, '');
  // JavaScript \b разпознава само ASCII букви като „дума“ — за кирилица ползваме явен lookahead/lookbehind.
  // Два формата: "1 ден" / "1-ви ДЕН" (число преди) ИЛИ "Ден 1" (число след).
  const dayRegexGlobal = /(?:(\d{1,2})\s*(?:-?\s*(?:ви|ри|ти|ми|ва))?\s*(?<![а-яА-Я])ден(?![а-яА-Я])|(?<![а-яА-Я])ден(?![а-яА-Я])\s*(\d{1,2}))/gi;
  const rawMatches = [...cleanFullText.matchAll(dayRegexGlobal)];

  // Само ПОСЛЕДОВАТЕЛНИ номера (1,2,3...), за да не хванем случайни споменавания („5 дни“). Блокът с полети
  // също започва с „1 ДЕН –“, но той е след програмата и последователността вече е минала оттам.
  const dayMarkers: { day: number; index: number }[] = [];
  let expectedDayNum = 1;
  for (const m of rawMatches) {
    const num = parseInt(m[1] || m[2], 10);
    if (num === expectedDayNum && m.index !== undefined) {
      dayMarkers.push({ day: num, index: m.index });
      expectedDayNum++;
    }
  }

  // Крайни маркери, където обикновено свършва програмата — ако ги намерим след последния ден, режем там
  const endMarkers = ['забележк', 'крайна цена', 'в цената', 'необходими документи', 'пояснения', 'полетна информация'];

  for (let i = 0; i < dayMarkers.length; i++) {
    const start = dayMarkers[i].index;
    let end: number;
    if (i + 1 < dayMarkers.length) {
      end = dayMarkers[i + 1].index;
    } else {
      const remainder = cleanFullText.slice(start);
      let earliestEnd = 3000; // fallback лимит, ако не намерим краен маркер
      for (const marker of endMarkers) {
        const idx = remainder.toLowerCase().indexOf(marker);
        if (idx !== -1 && idx < earliestEnd) earliestEnd = idx;
      }
      end = start + earliestEnd;
    }
    const segment = cleanFullText.slice(start, end).replace(/\s+/g, ' ').trim();
    program.push({ day: dayMarkers[i].day, title: `Ден ${dayMarkers[i].day}`, description: segment });
  }

  // ==========================================
  // ЕТАП 2: СЕКЦИИТЕ
  // ==========================================
  let currentSection = 'none';
  // Секцията преди блока с полети — след последния полет се връщаме в нея (обикновено „включени“)
  let sectionBeforeFlights = 'none';

  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    const finalLine = line.replace(/\|\|\|HEAD\|\|\|/g, '').trim();
    const bare = finalLine.replace(/^-\s*/, '');

    // Полети: заглавният ред и всички следващи редове, които приличат на полет или бележка за багажа
    if (FLIGHTS_HEADING.test(bare)) {
      if (currentSection !== 'flights') sectionBeforeFlights = currentSection;
      currentSection = 'flights';
      return;
    }
    if (currentSection === 'flights') {
      if (FLIGHT_LINE.test(bare)) {
        flightLines.push(bare);
        return;
      }
      currentSection = sectionBeforeFlights;
    }

    const isHeading = line.includes('|||HEAD|||') ||
      lowerLine.match(/^(?:\d+\.)?\s*(в\s+цената\s+се\s+включват|в\s+цената\s+не\s+се\s+включват|пояснения\s+по\s+програма|необходими\s+документи)/);

    if (isHeading) {
      if (lowerLine.includes('не са включени') || lowerLine.includes('не се включват') || lowerLine.includes('цената не включва') || lowerLine.includes('не включва') || lowerLine.includes('не се включва') || lowerLine.includes('допълнително се заплаща') || lowerLine.includes('допълнителни услуги')) {
        currentSection = 'notIncluded';
      } else if (lowerLine.includes('са включени') || lowerLine.includes('се включват') || lowerLine.includes('включва') || lowerLine.includes('включени в цената')) {
        currentSection = 'included';
      } else if (lowerLine.includes('документи') || lowerLine.includes('визов режим')) {
        currentSection = 'docs';
      } else if (lowerLine.includes('пояснения') || lowerLine.includes('забележк') || lowerLine.includes('условия')) {
        currentSection = 'info';
      }
    } else if (currentSection !== 'none' && finalLine.length > 2) {
      // Край на страницата
      if (lowerLine.includes('изтегли в ms word') || lowerLine.includes('популярни дестинации') || lowerLine.includes('оформена група')) {
        currentSection = 'none';
        return;
      }

      if (currentSection === 'included') included += finalLine + '\n';
      else if (currentSection === 'notIncluded') notIncluded += finalLine + '\n';
      else if (currentSection === 'docs') documents += finalLine + '\n';
      else if (currentSection === 'info') generalInfo += finalLine + '\n';
    }
  });

  const result: ScrapedTour = {
    title, price, durationDays, durationNights, dates, route,
    transport: '',
    program,
    detectedCountries,
    included: included.trim(),
    notIncluded: notIncluded.trim(),
    documents: documents.trim(),
    generalInfo: generalInfo.trim(),
    flightInfo: flightLines.join('\n').trim(),
  };

  // Диагностика само в development — не излагаме вътрешна логика в production
  const debug = {
    programDaysFound: program.length,
    bodyTextLength: rawBodyText.length,
    rawMatchCount: rawMatches.length,
    firstRawMatches: rawMatches.slice(0, 5).map(m => ({ text: m[0], day: m[1] || m[2], index: m.index })),
    flightLinesFound: flightLines.length,
  };

  return { ...result, debug };
}
