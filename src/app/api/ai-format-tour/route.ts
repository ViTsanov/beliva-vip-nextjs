import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';

// AI пренаписва скрейпнатия тур със собствени думи. Голям тур (30 дни, 50 точки „не включва“, хотели, условия) не
// се събира в един отговор: GPT-4o връщаше само първите ~10 дни, а списъците сливаше и съкращаваше — без грешка.
// Затова работата е на части, всяка проверена отделно:
//   - основно извикване: заглавие, интро, държави, цена, дни, маршрут (вижда кратък план на дните);
//   - списъци (включва/не включва/документи/информация) — номерирани, отговорът трябва да е със СЪЩИЯ брой точки,
//     иначе този списък остава с оригиналните точки;
//   - програмата по PROGRAM_CHUNK дни; ден, който липсва в отговора, остава с оригиналния текст.
// Най-много PARALLEL извиквания наведнъж — OpenAI брои и max_tokens към лимита на минута.
const PROGRAM_CHUNK = 8;
const PARALLEL = 4;

const RULES = `
КРИТИЧНИ ПРАВИЛА ЗА ЗАПАЗВАНЕ НА СМИСЪЛА:
1. НИКОГА не променяй факти: дати, цени, брой нощувки, имена на хотели, градове, забележителности, полети, часове.
2. Не пропускай НИЩО и не добавяй нищо ново — само преформулирай със свои думи, запазвайки точния смисъл.
3. Пиши на книжовен български, без правописни грешки.
4. Ние сме туристическа агенция Beliva VIP. Не споменавай друга агенция или туроператор по име, нейни телефони, адреси, сайтове или банкови сметки.`;

const MAIN_PROMPT = `
Ти си главен редактор в луксозна туристическа агенция "Beliva VIP". Получаваш данни за екскурзия от друга агенция
(заглавие, цена, дати, маршрут и кратък план на дните). Напиши основните текстове в професионален VIP стил.
${RULES}
5. Държавите в "country" пиши с кратките български имена: "САЩ" (НЕ "Съединени щати"), "ОАЕ", "Великобритания", "Нидерландия", "ЮАР".

ВЪРНИ СТРОГ JSON ОБЕКТ:
{
  "title": "Стилно заглавие (напр. 'Магията на Перу: Мачу Пикчу и Лима')",
  "intro": "Отделен, емоционален текст от 2-4 изречения в VIP стил, който рисува атмосферата на дестинацията и въвлича читателя — не е резюме на програмата и не повтаря фактите от нея. ВИНАГИ има съдържание.",
  "country": ["Перу"],
  "price": "Само числото и символа на валутата (напр. '5500 €'). EUR → €, USD → $, GBP → £. НИКОГА 'EUR'.",
  "days": 10,
  "nights": 9,
  "route": "Маршрутът кратко"
}
Само чист JSON, без Markdown.`;

const LISTS_PROMPT = `
Ти си главен редактор в туристическа агенция "Beliva VIP". Получаваш списъци с точки за екскурзия (какво включва цената,
какво не включва, необходими документи, допълнителна информация). ПРЕФОРМУЛИРАЙ всяка точка със свои думи.
${RULES}
5. ВСЕКИ списък в отговора има ТОЧНО толкова точки, колкото във входа, в СЪЩИЯ ред — точка N от отговора е
   преформулираната точка N от входа. НЕ сливай точки, НЕ разделяй, НЕ пропускай, НЕ обобщавай.
6. Точка, която е подзаглавие (напр. „Хотели:“, „Забележки:“, „Доплащане за единична каюта:“) остава кратко подзаглавие.
7. Имена на хотели, кораби, авиокомпании, суми и дати се пишат дума по дума.

ВЪРНИ СТРОГ JSON със същите ключове като във входа, всеки с масив от низове. Само чист JSON, без Markdown.`;

const PROGRAM_PROMPT = `
Ти си главен редактор в луксозна туристическа агенция "Beliva VIP". Получаваш ЧАСТ от програмата по дни на екскурзия
(няколко поредни дни). ПРЕФОРМУЛИРАЙ всеки ден със собствени думи в професионален VIP стил.
${RULES}
5. Запази ВСИЧКИ събития/места от всеки ден — не изпускай нито една активност, хранене или детайл.
6. "description" НЕ Е резюме: поне толкова дълго, колкото оригиналния текст на деня, в 2-4 абзаца с празен ред (\\n\\n)
   между тях. Опиши всяка забележителност с 1-2 изречения. Само ден, който в оригинала е едно изречение
   („Свободно време. Нощувка.“), може да е кратък.
7. "title": кратко заглавие на деня, без номера на деня. Ако в текста на ТОЗИ ден изрично е написана дата
   (напр. "2 ДЕН -29.11.2026"), започни заглавието с нея във формат DD.MM.YY: "29.11.26 Свободен ден на плажа".
   Ако в текста на деня НЯМА дата — само заглавие. НИКОГА не измисляй и не изчислявай дати.
8. В "description" не повтаряй датата и не започвай с "1 ден", "Ден 1" и т.н.

ВЪРНИ СТРОГ JSON: { "program": [ { "day": <същият номер>, "title": "...", "description": "..." } ] }
— ТОЧНО по един елемент за ВСЕКИ ден от входа, със същите номера. Само чист JSON, без Markdown.`;

type Day = { day: number; title?: string; description?: string; content?: string };

async function askGpt(system: string, user: unknown, maxTokens: number) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      response_format: { type: "json_object" }, // Принуждава GPT да върне 100% валиден JSON
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(user) }
      ],
      temperature: 0.7
    })
  });

  const gptData = await response.json();
  if (gptData.error) throw new Error(gptData.error.message);
  // Отрязан отговор = невалиден JSON — казваме го ясно, вместо неразбираема грешка от JSON.parse
  if (gptData.choices?.[0]?.finish_reason === 'length') {
    throw new Error('AI отговорът е твърде дълъг и беше отрязан — турът е прекалено голям за едно извикване.');
  }
  return JSON.parse(gptData.choices[0].message.content);
}

// Изпълнява задачите по limit наведнъж, в реда, в който са подадени
async function inBatches<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (next < tasks.length) { const i = next++; results[i] = await tasks[i](); }
  }));
  return results;
}

// Описанието на оригинала без „3 ДЕН –“ отпред — за дни, които AI не е върнал
const DAY_PREFIX = /^\s*(?:\d{1,2}\s*(?:-?\s*(?:ви|ри|ти|ми|ва))?\s*ден(?![а-яА-Я])|ден\s*\d{1,2})\s*[–\-—:]?\s*/i;
const dayText = (d: Day) => String(d.description || d.content || '');
const originalDay = (d: Day): Day => ({ day: d.day, title: d.title || `Ден ${d.day}`, description: dayText(d).replace(DAY_PREFIX, '') });

// Заглавие на ден от AI: без номер на деня отпред („25. Насау“) и без дата, която я няма в оригиналния текст на деня
// (2МКО не пише дати по дните — AI ги измисляше, и то различни в различните части)
function cleanDayTitle(ai: Day, source: Day): Day {
  let title = String(ai.title || '').replace(/^\d{1,2}\.\s+(?!\d)/, '');
  const m = title.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})\s*/);
  if (m) {
    const written = new RegExp(`(?<!\\d)0?${Number(m[1])}\\.0?${Number(m[2])}\\.\\d{2,4}`).test(dayText(source));
    // Минала дата е останала от стара версия на програмата при туроператора (напр. „07.09.2025“ в тур за 2027 г.)
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const iso = `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (!written || iso < new Date().toISOString().slice(0, 10)) title = title.slice(m[0].length);
  }
  return { ...ai, title: title.trim() || `Ден ${source.day}` };
}

// Текст „по една точка на ред“ → масив от точки
const toItems = (text: unknown): string[] =>
  (Array.isArray(text) ? text.map(String) : String(text || '').split('\n')).map(s => s.trim()).filter(Boolean);

type ListKey = 'includes' | 'excludes' | 'docs' | 'info';

export async function POST(req: Request) {
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const { scrapedData } = await req.json();
        const { program: rawProgram, included, notIncluded, documents, generalInfo, rawProgram: rawText, ...meta } = scrapedData || {};
        const program: Day[] = Array.isArray(rawProgram) ? rawProgram : [];

        const lists: Record<ListKey, string[]> = {
            includes: toItems(included),
            excludes: toItems(notIncluded),
            docs: toItems(documents),
            info: toItems(generalInfo),
        };
        // Два списъчни извиквания с приблизително еднакъв обем
        const listGroups: ListKey[][] = [['includes', 'docs'], ['excludes', 'info']];

        const chunks: Day[][] = [];
        for (let i = 0; i < program.length; i += PROGRAM_CHUNK) chunks.push(program.slice(i, i + PROGRAM_CHUNK));
        // Основното извикване вижда кратък план на дните (началото на всеки ден) — за заглавието и интрото
        const programOutline = program.length
            ? program.map(d => ({ day: d.day, text: dayText(d).slice(0, 220) }))
            : (rawText ? String(rawText).slice(0, 4000) : undefined);

        const tasks: (() => Promise<unknown>)[] = [
            // Без основните текстове турът няма смисъл — грешката (напр. лимит на OpenAI) стига до клиента и той опитва пак
            () => askGpt(MAIN_PROMPT, { ...meta, programOutline, totalDays: program.length || undefined }, 2000),
            ...listGroups.map(keys => () => {
                const input = Object.fromEntries(keys.filter(k => lists[k].length).map(k => [k, lists[k]]));
                if (!Object.keys(input).length) return Promise.resolve({});
                return askGpt(LISTS_PROMPT, input, 12000)
                    .catch(err => { console.error('[ai-format-tour] списъци:', err); return {}; });
            }),
            ...chunks.map(chunk => () =>
                askGpt(PROGRAM_PROMPT, { tourTitle: meta.title, program: chunk }, 8000)
                    // Част, която гръмне, не проваля целия тур — тези дни остават с оригиналния текст
                    .catch(err => { console.error('[ai-format-tour] част от програмата:', err); return { program: [] }; })
            ),
            // Програма, която скрейпърът не успя да раздели по дни (rawProgram) — AI я разделя и пренаписва наведнъж
            ...(!program.length && rawText ? [() =>
                askGpt(PROGRAM_PROMPT, { tourTitle: meta.title, programText: String(rawText), note: 'Раздели текста по дни.' }, 16000)
            ] : []),
        ];
        const [main, listsA, listsB, ...chunkResults] = await inBatches(tasks, PARALLEL) as [
            Record<string, unknown>, Record<string, unknown>, Record<string, unknown>, ...{ program?: Day[] }[]
        ];

        // Списъци: приемаме преформулирания само ако е със същия брой точки — иначе оригиналните точки
        const rewrittenLists = { ...listsA, ...listsB } as Record<string, unknown>;
        const finalLists = Object.fromEntries((Object.keys(lists) as ListKey[]).map(k => {
            const ai = rewrittenLists[k];
            const ok = Array.isArray(ai) && ai.length === lists[k].length && ai.every(x => typeof x === 'string' && x.trim());
            if (!ok && lists[k].length) console.warn(`[ai-format-tour] „${k}“: AI върна ${Array.isArray(ai) ? ai.length : 0} от ${lists[k].length} точки — остават оригиналните`);
            return [k, ok ? (ai as string[]) : lists[k]];
        }));

        // Програмата по номер на деня: AI версия, ако я има, иначе оригиналът
        const rewritten = new Map<number, Day>();
        for (const d of chunkResults.flatMap(r => r?.program || [])) {
            const n = Number(d?.day);
            if (n && !rewritten.has(n)) rewritten.set(n, d);
        }
        const missing = program.filter(d => !rewritten.has(Number(d.day)));
        if (missing.length) console.warn(`[ai-format-tour] AI не върна дни ${missing.map(d => d.day).join(', ')} — остават с оригиналния текст`);

        const formattedTour = {
            ...main,
            days: main.days || program.length || undefined,
            program: program.length
                ? program.map(d => {
                    const ai = rewritten.get(Number(d.day));
                    return ai ? cleanDayTitle(ai, d) : originalDay(d);
                })
                // Само от суровия текст: каквото AI е разделило (датите се сверяват с целия текст)
                : [...rewritten.values()].map(d => cleanDayTitle(d, { day: d.day, description: String(rawText || '') })),
            ...finalLists,
        };
        return NextResponse.json({ success: true, tour: formattedTour });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
