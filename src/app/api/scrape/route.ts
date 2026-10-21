import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { DARI_HOSTNAMES, parseDariTour } from '@/lib/scrapers/dariTour';
import { parseTwoMkoTour } from '@/lib/scrapers/twoMko';
import { fetchTwoMkoDocx, parseTwoMkoDocx } from '@/lib/scrapers/twoMkoDocx';
import { flightsFromProgram } from '@/lib/scrapers/flightSchedule';

// Разрешени са САМО домейните на туроператорите, с които работим — предпазва от SSRF към вътрешни мрежи/метаданни
const ALLOWED_HOSTNAMES = new Set(['2mko.com', 'www.2mko.com', ...DARI_HOSTNAMES]);

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

        // Дари Тур има собствен парсер (src/lib/scrapers/dariTour.ts) — връща същата структура като 2mko по-долу
        if (DARI_HOSTNAMES.has(parsed.hostname)) {
            if (!response.ok) {
                return NextResponse.json({ error: `Дари Тур върна грешка (HTTP ${response.status})` }, { status: 502 });
            }
            return NextResponse.json({ success: true, operator: 'dari', ...parseDariTour(html) });
        }

        // Премахнат/сгрешен линк — казваме го ясно (проверката на туровете го показва като „линкът не работи“)
        if (!response.ok) {
            return NextResponse.json({ error: `Туроператорът върна грешка (HTTP ${response.status})` }, { status: 502 });
        }

        // 2МКО — парсерът е в src/lib/scrapers/twoMko.ts
        const { debug, ...tour } = parseTwoMkoTour(html);

        // Word файлът на програмата („Изтегли в MS Word“) има същия текст, но с ясни раздели — оттам взимаме
        // „включва / не включва“, документите и допълнителната информация (условия, хотели, кораб, забележки), а
        // и полетите, които на страницата обикновено ги няма. Празен раздел в Word файла не заменя страницата.
        const docx = await fetchTwoMkoDocx(html);
        if (docx) {
            try {
                const sections = parseTwoMkoDocx(docx);
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

        return NextResponse.json({
            success: true, operator: '2mko', ...tour,
            // Дебъг данни само в development — не излагаме вътрешна логика в production
            ...(process.env.NODE_ENV !== 'production' && { debug }),
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}