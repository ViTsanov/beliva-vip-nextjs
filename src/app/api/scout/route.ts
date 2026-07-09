import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

// Нормализира URL за стабилна дедупликация:
// - маха http/https разлики, www, trailing slash, query params, ловъркейс
// Така https://www.2mko.com/ekskurzia/yaponia/2036/ и http://2mko.com/ekskurzia/yaponia/2036?x=1 са ЕДНО и също
export function normalizeUrl(url: string): string {
    try {
        let u = url.trim().toLowerCase();
        u = u.replace(/^https?:\/\//, '').replace(/^www\./, '');
        u = u.split('?')[0].split('#')[0];
        u = u.replace(/\/+$/, ''); // маха trailing slashes
        return u;
    } catch {
        return url;
    }
}

// Помощна функция: тегли страница и връща cheerio обект (с windows-1251 fallback за кирилица)
async function fetchPage(url: string) {
    const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const buffer = await response.arrayBuffer();
    let html = new TextDecoder('utf-8').decode(buffer);
    if (html.includes('�')) html = new TextDecoder('windows-1251').decode(buffer);
    return cheerio.load(html);
}

// КАНОНИЗАЦИЯ: Ако линкът съдържа '/ekskurzia/', взимаме САМО тази част
// и изграждаме чист абсолютен URL. Това предпазва дублирани префикси (напр.
// "/oferti/yaponia/ekskurzia/yaponia/2036" → "/ekskurzia/yaponia/2036"), които възникват при
// резолюция на относителни без водеща черта линкове спрямо вложена страница
function canonicalizeEkskurziaUrl(resolvedHref: string): string {
    const idx = resolvedHref.indexOf('/ekskurzia/');
    if (idx === -1) return resolvedHref;
    return `https://www.2mko.com${resolvedHref.slice(idx)}`;
}

// Почиства заглавие: цялата "offer card" е в един <a>, така че .text() взима и
// дати/цени заедно. Взимаме само първия непразен ред като чисто заглавие за превъз
function extractCleanTitle(rawText: string): string {
    const lines = rawText.split('\n').map(s => s.trim()).filter(Boolean);
    return lines[0] || rawText.trim();
}

export async function POST(req: Request) {
    try {
        const { countries } = await req.json();
        
        if (!countries || countries.length === 0) {
            return NextResponse.json({ error: 'Моля, изберете поне една държава.' }, { status: 400 });
        }

        // ==========================================
        // 1. ИЗВЛИЧАНЕ НА ВЕЧЕ СЪЩЕСТВУВАЩИТЕ ЛИНКОВЕ
        // ==========================================
        // Взимаме всички екскурзии от Firebase и нормализираме линковете им за сравнение
        const toursSnapshot = await getDocs(collection(db, "tours"));
        const existingUrls = new Set(
            toursSnapshot.docs
                .map(doc => doc.data().originalUrl)
                .filter(Boolean)
                .map((u: string) => normalizeUrl(u))
        );

        let newLinksFound: { url: string; title: string; countryMatched: string }[] = [];
        let visitedUrls = new Set<string>(); // За да не добавяме един и същ линк два пъти

        // ==========================================
        // 2. СКАНИРАНЕ НА ТУРОПЕРАТОРА (2mko)
        // ==========================================
        // Тъй като не знаем точния URL на всички екскурзии, влизаме в главните им секции 
        // (можеш да добавиш още линкове в масива, напр. екзотики, почивки и т.н.)
        const targetPagesToScout = [
            'https://www.2mko.com/ekskurzii.html', 
            'https://www.2mko.com/' 
        ];

        const countryOfertiPages: Record<string, Set<string>> = {};
        countries.forEach((c: string) => { countryOfertiPages[c] = new Set(); });

        for (const targetUrl of targetPagesToScout) {
            const response = await fetch(targetUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });

            const buffer = await response.arrayBuffer();
            let html = new TextDecoder('utf-8').decode(buffer);
            if (html.includes('')) html = new TextDecoder('windows-1251').decode(buffer);

            const $ = cheerio.load(html);

            // Обикаляме абсолютно всички <a> тагове на страницата
            $('a').each((_, el) => {
                const hrefRaw = $(el).attr('href');
                let text = $(el).text().trim().toLowerCase();
                let titleAttr = $(el).attr('title')?.trim().toLowerCase() || '';

                if (!hrefRaw) return;

                // Правилна URL резолюция — обработва всички варианти на относителни линкове
                let href: string;
                try {
                    href = new URL(hrefRaw, targetUrl).href;
                } catch {
                    return;
                }

                for (const country of countries) {
                    const countryLower = country.toLowerCase();
                    const matchesCountry = text.includes(countryLower) || titleAttr.includes(countryLower);
                    if (!matchesCountry) continue;

                    if (href.includes('/ekskurzia/')) {
                        const canonHref = canonicalizeEkskurziaUrl(href);
                        const normHref = normalizeUrl(canonHref);
                        if (!existingUrls.has(normHref) && !visitedUrls.has(normHref)) {
                            newLinksFound.push({ url: canonHref, title: extractCleanTitle($(el).text()), countryMatched: country });
                            visitedUrls.add(normHref);
                        }
                    } else if (href.includes('/oferti/')) {
                        countryOfertiPages[country].add(href);
                    }
                }
            });
        }

        // НИВО 2: влизаме във всяка държавна страница и събираме ВСИЧКИ /ekskurzia/ линкове от нея
        const level2Debug: any[] = [];
        for (const country of countries) {
            for (const ofertiUrl of countryOfertiPages[country]) {
                try {
                    const res2 = await fetch(ofertiUrl, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                    });
                    const buf2 = await res2.arrayBuffer();
                    let html2 = new TextDecoder('utf-8').decode(buf2);
                    if (html2.includes('\uFFFD')) html2 = new TextDecoder('windows-1251').decode(buf2);
                    const $2 = cheerio.load(html2);

                    let totalAnchors = 0;
                    let ekskurziaAnchors = 0;
                    let foundOnThisPage = 0;

                    $2('a').each((_, el) => {
                        totalAnchors++;
                        const hrefRaw = $2(el).attr('href');
                        if (!hrefRaw) return;

                        // Правилна URL резолюция — обработва абсолютни, роут-относителни (/x/y)
                        // И релативни без водеща черта ("ekskurzia/...") спрямо текущата страница
                        let href2: string;
                        try {
                            href2 = new URL(hrefRaw, ofertiUrl).href;
                        } catch {
                            return;
                        }

                        if (href2.includes('/ekskurzia/')) {
                            ekskurziaAnchors++;
                            const canonHref2 = canonicalizeEkskurziaUrl(href2);
                            const normHref2 = normalizeUrl(canonHref2);
                            if (!existingUrls.has(normHref2) && !visitedUrls.has(normHref2)) {
                                const linkTitle = extractCleanTitle($2(el).text()) || $2(el).attr('title')?.trim() || '';
                                newLinksFound.push({ url: canonHref2, title: linkTitle, countryMatched: country });
                                visitedUrls.add(normHref2);
                                foundOnThisPage++;
                            }
                        }
                    });

                    level2Debug.push({
                        ofertiUrl,
                        status: res2.status,
                        htmlLength: html2.length,
                        totalAnchors,
                        ekskurziaAnchors,
                        newFoundOnThisPage: foundOnThisPage,
                        // ДИАГНОСТИКА: търсим суровата дума за "ekskurzia" вън анкерите —
                        // ако я няма въобще = съдържанието е JS-рендърнато (ако го има = cheerio не го хваща)
                        rawTextHasEkskurzia: html2.toLowerCase().includes('ekskurzia'),
                        rawTextEkskurziaCount: (html2.toLowerCase().match(/ekskurzia/g) || []).length,
                        htmlSnippetAroundFirstEkskurzia: (() => {
                            const idx = html2.toLowerCase().indexOf('ekskurzia');
                            if (idx === -1) return null;
                            return html2.slice(Math.max(0, idx - 150), idx + 150);
                        })()
                    });
                } catch (e: any) {
                    level2Debug.push({ ofertiUrl, error: e.message });
                }
            }
        }

        return NextResponse.json({ 
            success: true, 
            totalNewFound: newLinksFound.length, 
            newLinks: newLinksFound,
            debug: {
                ofertiPagesFound: Object.fromEntries(
                    Object.entries(countryOfertiPages).map(([c, set]) => [c, Array.from(set)])
                ),
                level2Debug
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}