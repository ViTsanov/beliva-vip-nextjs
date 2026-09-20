import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { WORLD_COUNTRIES } from '@/lib/constants';
import { requireAdmin } from '@/lib/adminAuth';

// Единственият разрешен домейн — предпазва от SSRF към вътрешни мрежи/метаданни
const ALLOWED_HOSTNAMES = new Set(['2mko.com', 'www.2mko.com']);

export async function POST(req: Request) {
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const { url } = await req.json();
        if (!url) return NextResponse.json({ error: 'Липсва линк' }, { status: 400 });

        // Проверка на домейна преди fetch-а
        let parsed: URL;
        try { parsed = new URL(url); } catch {
            return NextResponse.json({ error: 'Невалиден URL' }, { status: 400 });
        }
        if (!ALLOWED_HOSTNAMES.has(parsed.hostname)) {
            return NextResponse.json({ error: 'Домейнът не е разрешен' }, { status: 400 });
        }

        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });

        const buffer = await response.arrayBuffer();
        let html = new TextDecoder('utf-8').decode(buffer);
        // Проверяваме за Unicode replacement character (�) — знак за неуспешен UTF-8 decode.
        // ВАЖНО: трябва да е explicit \uFFFD escape, не гол копиран символ — иначе проверката '' е винаги вярна (всеки низ "съдържа" празен низ)
        if (html.includes('\uFFFD')) html = new TextDecoder('windows-1251').decode(buffer);

        const $ = cheerio.load(html);

        let title = '', price = '', durationDays = '', durationNights = '', route = '';
        const program: { day: number; title: string; description: string }[] = [];
        const dates: string[] = [];
        const detectedCountries: string[] = [];
        let included = '', notIncluded = '', documents = '', generalInfo = '';
        let debugRawMatchCount = 0;
        let debugDenWordCount = 0;
        let debugFirstRawMatches: any[] = [];
        let debugSnippetAroundDen: string | null = null;
        let debugDay1Contexts: string[] = [];

        if (url.includes('2mko')) {
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
            if (routeMatch) route = routeMatch[1].trim();

            const titleLower = title.toLowerCase();
            WORLD_COUNTRIES.forEach(c => {
                if (titleLower.includes(c.toLowerCase())) {
                    detectedCountries.push(c);
                }
            });

            // Извличаме ЦЕЛИЯ текст след етикета "Дати на отпътуване:" (до ~200 символа), след това търсим ВСИЧКИ
            // дати вътре него — НЕ само първата. Преди това тук имаше .match() с обикновен (не global)
            // regex, който по дефиниция връща само първото съвпадение — ако страницата изброява няколко
            // дати след един същ етикет, всичко освен първата се губеше тихо. bodyText вече е колапснало
            // всичко whitespace в един интервал по-горе, така че това работи еднакво добре, независимо от
            // разделителя между датите (запетая, тире, нов ред в оригинала).
            const datesLabelMatch = bodyText.match(/Дати на отпътуване:\s*([^|]{0,200})/i);
            if (datesLabelMatch) {
                const allDatesFound = [...datesLabelMatch[1].matchAll(/\d{2}\.\d{2}\.\d{4}/g)].map(m => m[0]);
                dates.push(...allDatesFound);
            }

            // ==========================================
            // HTML ПОДГОТОВКА - СЕЛЕКТИВНИ МАРКЕРИ
            // ==========================================
            $('script, style, nav, footer, header, aside, .sidebar, #menu').remove();

            // Маркираме САМО истински заглавия (h2-h4) и SELECTIVE strong/b тагове —
            // чието СОБСТВЕНО текст съвпада с позната фраза за заглавие.
            // Това предпазва всяка удебелена цена/час/име на хотел в програмата да
            // се възприема грешно като заглавие и да се загубите цялото съдържание.
            const headingKeywords = [
                'в цената са включени', 'в цената се включват', 'цената включва', 'включени в цената',
                'в цената не са включени', 'в цената не се включват', 'цената не включва', 'не са включени',
                'допълнително се заплаща', 'допълнителни услуги',
                'необходими документи', 'визов режим', 'документи за пътуване',
                'пояснения по програмата', 'забележк', 'условия за записване', 'условия на плащане'
            ];

            $('h2, h3, h4').each((_: any, el: any) => { $(el).prepend('|||HEAD|||'); });
            $('strong, b').each((_: any, el: any) => {
                const t = $(el).text().trim().toLowerCase();
                // Маркираме само ако текстът е кратък (наистина заглавие, не цял абзац текст)
                // и съдържа позната фраза — така избягваме фалшиви срещу в цени/часове/имена на хотели
                if (t.length > 0 && t.length < 80 && headingKeywords.some(k => t.includes(k))) {
                    $(el).prepend('|||HEAD|||');
                }
            });

            $('br').replaceWith('\n');
            $('li').prepend('- '); // Правиме HTML списъците красиви с тиренце
            $('p, div, h1, h2, h3, h4, li').append('\n');

            const rawBodyText = $('body').text();
            const lines = rawBodyText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            // ==========================================
            // ЕТАП 1: ИЗВЛИЧАНЕ НА ПРОГРАМАТА (ГЛОБАЛЕН REGEX, НЕ ПО РЕДОВЕ!)
            // ==========================================
            // Важно: на 2mko цялата дневна програма често е в ЕДИН непрекъснат параграф, без нови
            // редове между дните — само с <strong> маркери вътре в текуща проза.
            // Затова търсим ден-маркери по цялото тяло, не само в началото на ред.
            const cleanFullText = rawBodyText.replace(/\|\|\|HEAD\|\|\|/g, '');
            // ВАЖНО: JavaScript \b (word boundary) разпознава само ASCII букви/цифри като "дума" —
            // кирилицата НЕ се разпознава, затова \b веднага след "ден" НИКОГА не съвпадаше и
            // целият regex тихо не намираше нищо. Използваме явен lookahead/lookbehind вместо \b.
            // Два формата: "1 ден" / "1-ви ДЕН" (число преди) ИЛИ "Ден 1" (число след) — някои турове ползват втория
            const dayRegexGlobal = /(?:(\d{1,2})\s*(?:-?\s*(?:ви|ри|ти|ми|ва))?\s*(?<![а-яА-Я])ден(?![а-яА-Я])|(?<![а-яА-Я])ден(?![а-яА-Я])\s*(\d{1,2}))/gi;
            const rawMatches = [...cleanFullText.matchAll(dayRegexGlobal)];

            // ДИАГНОСТИКА: брой сурови съвпадения (преди sequential филтъра) + прост търсен на думата "ден" в текста
            debugRawMatchCount = rawMatches.length;
            debugDenWordCount = (cleanFullText.match(/[Дд]ен/g) || []).length;
            debugFirstRawMatches = rawMatches.slice(0, 5).map(m => ({ text: m[0], day: m[1] || m[2], index: m.index }));
            // Извадка от текста около първото срещане на "ден" (за визуална проверка)
            const denIdx = cleanFullText.search(/[Дд]ен/);
            debugSnippetAroundDen = denIdx !== -1 ? cleanFullText.slice(Math.max(0, denIdx - 60), denIdx + 60) : null;

            // ДОПЪЛНИТЕЛНА ДИАГНОСТИКА: извадки около ВСЯКО "1" следвано от "ден" в близост (до 20 символа),
            // за да видим точния формат на първите дни от програмата
            const day1Regex = /(?<![0-9])1\s*(?:-?\s*ви)?\s*(?<![а-яА-Я])ден(?![а-яА-Я])/gi;
            const day1Hits = [...cleanFullText.matchAll(day1Regex)].slice(0, 5);
            debugDay1Contexts = day1Hits.map(m =>
                cleanFullText.slice(Math.max(0, (m.index || 0) - 40), (m.index || 0) + 40)
            );

            // Филтрираме само ПОСЛЕДОВАТЕЛНи номера (1,2,3...), за да не хванем случайни споменавания
            // (напр. "5 дни" навякъде в текста вместо на реален ден 5)
            const dayMarkers: { day: number; index: number }[] = [];
            let expectedDayNum = 1;
            for (const m of rawMatches) {
                const num = parseInt(m[1] || m[2], 10);
                if (num === expectedDayNum && m.index !== undefined) {
                    dayMarkers.push({ day: num, index: m.index });
                    expectedDayNum++;
                }
            }

            // Крайни маркери, където обикновено свършва програмата на 2mko — ако ги намерим след последния ден, рязваме там
            const endMarkers = ['забележк', 'крайна цена', 'в цената', 'необходими документи', 'пояснения'];

            for (let i = 0; i < dayMarkers.length; i++) {
                const start = dayMarkers[i].index;
                let end: number;
                if (i + 1 < dayMarkers.length) {
                    end = dayMarkers[i + 1].index;
                } else {
                    // Последен ден — търсим най-близкия end marker след този index
                    const remainder = cleanFullText.slice(start);
                    let earliestEnd = 3000; // fallback лимит, ако не намерим end marker
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
            // ЕТАП 2: ИЗВЛИЧАНЕ НА СЕКЦИИТЕ
            // ==========================================
            let currentSection = 'none';

            lines.forEach(line => {
                const lowerLine = line.toLowerCase();
                
                // ПРОМЯНАТА Е САМО ТУК: Добавих \s+ за да хваща и двойни интервали безопасно!
                const isHeading = line.includes('|||HEAD|||') || 
                                  lowerLine.match(/^(?:\d+\.)?\s*(в\s+цената\s+се\s+включват|в\s+цената\s+не\s+се\s+включват|пояснения\s+по\s+програма|необходими\s+документи)/);

                // Премахваме маркера, за да запишем чист текст в базата данни
                const finalLine = line.replace(/\|\|\|HEAD\|\|\|/g, '').trim();

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
                    // Спирачки - край на страницата
                    if (lowerLine.includes('изтегли в ms word') || lowerLine.includes('популярни дестинации') || lowerLine.includes('оформена група')) {
                        currentSection = 'none';
                        return;
                    }

                    // Наливаме текста в правилната кофа
                    if (currentSection === 'included') included += finalLine + '\n';
                    else if (currentSection === 'notIncluded') notIncluded += finalLine + '\n';
                    else if (currentSection === 'docs') documents += finalLine + '\n';
                    else if (currentSection === 'info') generalInfo += finalLine + '\n';
                }
            });
        }

        return NextResponse.json({
            success: true, title, price, durationDays, durationNights, dates, route,
            program, detectedCountries,
            included: included.trim(),
            notIncluded: notIncluded.trim(),
            documents: documents.trim(),
            generalInfo: generalInfo.trim(),
            // Дебъг данни само в development — не излагаме вътрешна логика в production
            ...(process.env.NODE_ENV !== 'production' && {
                debug: {
                    programDaysFound: program.length,
                    bodyTextLength: $('body').text().length,
                    rawMatchCount: debugRawMatchCount,
                    denWordCount: debugDenWordCount,
                    firstRawMatches: debugFirstRawMatches,
                    snippetAroundFirstDen: debugSnippetAroundDen,
                    day1Contexts: debugDay1Contexts
                }
            })
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}