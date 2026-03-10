import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'Липсва линк' }, { status: 400 });
        }

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Сайтът върна грешка' }, { status: 500 });
        }

        // 1. МАГИЯТА ЗА КИРИЛИЦАТА (Оправя въпросителните)
        const buffer = await response.arrayBuffer();
        let html = new TextDecoder('utf-8').decode(buffer);
        // Ако видим въпросителни, обръщаме кодировката към стария БГ стандарт
        if (html.includes('')) {
            html = new TextDecoder('windows-1251').decode(buffer);
        }

        const $ = cheerio.load(html);

        let title = '';
        let price = '';
        let program: { day: number; title: string; description: string }[] = [];
        let isSoldOut = false;
        let operator = 'Неизвестен';

        // ---------------------------------------------------------
        // ЛОГИКА ЗА 2МКО
        // ---------------------------------------------------------
        if (url.includes('2mko')) {
            operator = '2MKO';
            
            // 2. ЗАГЛАВИЕ
            title = $('h1').first().text().trim();
            if (!title) title = $('title').text().replace(/2MKO.*/i, '').trim();

            // 3. ЦЕНА
            const priceText = $('.price, .tour-price, .price-val, h2:contains("лв"), h3:contains("лв")').text() 
                || $('body').text().match(/Цена[:\s]*(\d[\d\s]*\d|\d+)\s*(лв|BGN)/i)?.[0] || '';
            const priceMatch = priceText.match(/(\d[\d\s]*\d|\d+)/);
            if (priceMatch) {
                price = priceMatch[0].replace(/\s/g, ''); 
            }

            // 4. УМЕН ЧЕТЕЦ НА ПРОГРАМАТА (Чете ред по ред)
            // Първо изтриваме менютата и футърите, за да не четем глупости
            $('script, style, nav, footer, header, .menu, .sidebar').remove();
            
            // Взимаме чистия текст на целия сайт и го цепим на отделни редове
            const rawText = $('body').text();
            const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            let currentDay = 0;
            let currentDesc = '';

            lines.forEach(line => {
                // Търсим всякакви вариации на: "1 Ден", "Ден 1", "1-ви ден", "1 ден -"
                const strictDayMatch = line.match(/^(?:Ден|Day)\s*(\d+)/i) || line.match(/^(\d+)\s*[-]*\s*(?:ден|Ден|ДЕН|ви ден|ти ден)/i);

                if (strictDayMatch) {
                    // Ако сме намерили нов ден, записваме предишния
                    if (currentDay > 0 && currentDesc.length > 10) {
                        program.push({ day: currentDay, title: `Ден ${currentDay}`, description: currentDesc.trim() });
                    }
                    // Започваме новия ден
                    currentDay = parseInt(strictDayMatch[1] || strictDayMatch[2]);
                    currentDesc = line.replace(strictDayMatch[0], '').trim();
                } else if (currentDay > 0) {
                    // Ако стигнем до секцията "Цената включва", спираме да четем програмата
                    if (line.toLowerCase().includes('цена') || line.toLowerCase().includes('цената включва') || line.toLowerCase().includes('условия')) {
                        if (currentDay > 0 && currentDesc.length > 10) {
                            program.push({ day: currentDay, title: `Ден ${currentDay}`, description: currentDesc.trim() });
                            currentDay = -1; // Изключваме четеца
                        }
                    } else if (currentDay > 0 && line.length > 5) {
                        currentDesc += '\n' + line;
                    }
                }
            });

            // Ако сме стигнали до края на файла и не сме записали последния ден
            if (currentDay > 0 && currentDesc.length > 10) {
                program.push({ day: currentDay, title: `Ден ${currentDay}`, description: currentDesc.trim() });
            }
        }

        return NextResponse.json({ success: true, operator, title, price, program, isSoldOut });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}