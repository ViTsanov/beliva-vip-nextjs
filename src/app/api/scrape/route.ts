import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { WORLD_COUNTRIES } from '@/lib/constants';

export async function POST(req: Request) {
    try {
        const { url } = await req.json();
        if (!url) return NextResponse.json({ error: 'Липсва линк' }, { status: 400 });

        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });

        const buffer = await response.arrayBuffer();
        let html = new TextDecoder('utf-8').decode(buffer);
        if (html.includes('')) html = new TextDecoder('windows-1251').decode(buffer);

        const $ = cheerio.load(html);

        let title = '', price = '', durationDays = '', durationNights = '', route = '';
        let program: { day: number; title: string; description: string }[] = [];
        let dates: string[] = [];
        let detectedCountries: string[] = [];
        let included = '', notIncluded = '', documents = '', generalInfo = '';

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

            const exactDateMatch = bodyText.match(/Дати на отпътуване:\s*(\d{2}\.\d{2}\.\d{4})/i);
            if (exactDateMatch) {
                dates.push(exactDateMatch[1]);
            }

            // ==========================================
            // HTML ПОДГОТОВКА - ТРИКЪТ С МАРКЕРИТЕ
            // ==========================================
            $('script, style, nav, footer, header, aside, .sidebar, #menu').remove();
            
            // Намираме всички HTML заглавия и удебелени текстове и им слагаме маркер!
            $('strong, b, h2, h3, h4').prepend('|||HEAD|||'); 
            
            $('br').replaceWith('\n');
            $('li').prepend('- '); // Правим HTML списъците красиви с тиренце
            $('p, div, h1, h2, h3, h4, li').append('\n');

            const lines = $('body').text().split('\n').map(l => l.trim()).filter(l => l.length > 0);

            // ==========================================
            // ЕТАП 1: ИЗВЛИЧАНЕ САМО НА ПРОГРАМАТА
            // ==========================================
            let expectedDay = 1;
            let currentDayDesc = '';
            let hasStartedProgram = false;
            let isReadingProgram = true;

            lines.forEach(line => {
                if (!isReadingProgram) return;

                // Чистим маркера, когато търсим дните, за да не ни пречи
                const cleanLine = line.replace(/\|\|\|HEAD\|\|\|/g, '').trim();
                const lowerLine = cleanLine.toLowerCase();
                
                if (hasStartedProgram && (
                    lowerLine.match(/^(?:\d+\.)?\s*(в цената се включват|в цената се включва|цената включва|пояснения)/)
                )) {
                    isReadingProgram = false;
                    return;
                }

                const regex1 = new RegExp(`^[^a-zа-я0-9]*${expectedDay}\\s*(?:-|ви|ри|ти|ми)?\\s*(?:ден|Ден|ДЕН)`, 'i');
                const regex2 = new RegExp(`^[^a-zа-я0-9]*(?:Ден|Day)\\s*${expectedDay}\\b`, 'i');
                const match = cleanLine.match(regex1) || cleanLine.match(regex2);

                if (match) {
                    if (expectedDay > 1) {
                        program.push({ day: expectedDay - 1, title: `Ден ${expectedDay - 1}`, description: currentDayDesc.trim() });
                    }
                    hasStartedProgram = true;
                    currentDayDesc = cleanLine.replace(match[0], '').replace(/^[ \-–.,:]+/, '').trim() + '\n';
                    expectedDay++; 
                } else if (hasStartedProgram) {
                    currentDayDesc += cleanLine + '\n';
                }
            });

            if (expectedDay > 1) {
                program.push({ day: expectedDay - 1, title: `Ден ${expectedDay - 1}`, description: currentDayDesc.trim() });
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
                let finalLine = line.replace(/\|\|\|HEAD\|\|\|/g, '').trim();

                if (isHeading) {
                    if (lowerLine.includes('не се включват') || lowerLine.includes('не включва') || lowerLine.includes('не се включва') || lowerLine.includes('допълнително се заплаща')) {
                        currentSection = 'notIncluded';
                    } else if (lowerLine.includes('включват') || lowerLine.includes('включва') || lowerLine.includes('са включени')) {
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
            generalInfo: generalInfo.trim()
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}