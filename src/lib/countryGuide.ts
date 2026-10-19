import { getAdminDb } from './firebaseAdmin';
import { slugify } from './admin-helpers';
import { COUNTRY_GUIDE_MAX_WORDS, sectionWords } from './countryGuideWords';

// Текстът „За <държава>“ на страницата /destinations/<държава>: история, география, икономика и интересни
// факти — общо до 200 думи. Пише го ИИ веднъж за всяка държава и се пази в Firestore (countryGuides/<slug>),
// така че всички посетители после виждат един и същ текст, без нови заявки към ИИ.
//
// Кога се пише:
//  • при запис на тур в админа (TourForm → /api/country-guide) — за всяка негова държава, която още няма текст;
//  • резервно — при първото отваряне на страницата на държавата, ако по някаква причина още го няма.
// Текстът се преглежда, поправя и пише наново от админа — таб „Текстове за държави“
// (src/components/admin/CountryGuidesTab.tsx → /api/admin/country-guides и /api/country-guide).

export interface CountryGuide {
  country: string;
  tagline: string;   // едно изречение под името в героя
  history: string;
  geography: string;
  economy: string;
  facts: string;
  words: number;     // общо думи в четирите раздела
  model: string;
  createdAt: string; // ISO
  editedAt?: string; // ISO — последна ръчна редакция от админа
}

const MAX_WORDS = COUNTRY_GUIDE_MAX_WORDS;
const MODEL = 'gpt-4o';
const COLLECTION = 'countryGuides';

const SYSTEM_PROMPT = `Ти си редактор в българска туристическа агенция „Beliva VIP Tour“ и пишеш кратко представяне на държава за страницата ѝ в сайта.

ПРАВИЛА:
1. Пиши на книжовен български, без правописни грешки, в спокоен и увлекателен тон. Без реклама на агенцията и без призиви „резервирайте“.
2. Само проверими, общоизвестни факти. Ако не си сигурен в число или дата — не го пиши. Без измислени подробности.
3. Четирите раздела ЗАЕДНО са между 150 и ${MAX_WORDS} думи (не повече от ${MAX_WORDS}!). Всеки раздел е 1–3 изречения.
4. Без Markdown, без списъци, без емотикони.

ВЪРНИ САМО JSON ОБЕКТ:
{
  "tagline": "Едно изречение до 14 думи — какво чака пътешественика там (напр. „Групови пакети с полети, хотели и водач — от Андите до Мачу Пикчу.“ за Перу)",
  "history": "Историята накратко — ключови епохи и събития.",
  "geography": "Географията — релеф, климат, забележителни природни места.",
  "economy": "Икономиката — с какво живее страната днес.",
  "facts": "Интересни факти, които малко хора знаят."
}`;

async function askAI(country: string, feedback?: string): Promise<Omit<CountryGuide, 'country' | 'words' | 'model' | 'createdAt'>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY липсва');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: 'json_object' },
      max_tokens: 1500,
      temperature: 0.5,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Държава: ${country}` },
        ...(feedback ? [{ role: 'user', content: feedback }] : []),
      ],
    }),
    // ИИ отговаря за 5–15 s; ако виси — страницата не бива да чака безкрайно
    signal: AbortSignal.timeout(30_000),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  if (data.choices?.[0]?.finish_reason === 'length') throw new Error('Отговорът на ИИ беше отрязан');

  const parsed = JSON.parse(data.choices[0].message.content);
  const field = (key: string) => (typeof parsed[key] === 'string' ? parsed[key].trim() : '');
  const guide = {
    tagline: field('tagline'),
    history: field('history'),
    geography: field('geography'),
    economy: field('economy'),
    facts: field('facts'),
  };
  if (!guide.history || !guide.geography || !guide.economy || !guide.facts) throw new Error('ИИ върна непълен текст');
  return guide;
}

// Пише текста (с една поправка, ако излезе над 200 думи) и го записва. Връща записания текст.
export async function generateCountryGuide(country: string): Promise<CountryGuide> {
  let guide = await askAI(country);
  let words = sectionWords(guide);
  if (words > MAX_WORDS) {
    guide = await askAI(country, `Текстът стана ${words} думи. Съкрати го до най-много ${MAX_WORDS} думи общо, като запазиш четирите раздела.`);
    words = sectionWords(guide);
    if (words > MAX_WORDS) throw new Error(`Текстът за ${country} е ${words} думи — над ${MAX_WORDS}`);
  }

  const record: CountryGuide = { country, ...guide, words, model: MODEL, createdAt: new Date().toISOString() };
  await getAdminDb().collection(COLLECTION).doc(slugify(country)).set(record);
  return record;
}

export async function readCountryGuide(country: string): Promise<CountryGuide | null> {
  const snap = await getAdminDb().collection(COLLECTION).doc(slugify(country)).get();
  return snap.exists ? (snap.data() as CountryGuide) : null;
}

// За админ екрана: всички записани текстове, ключ — slug на държавата
export async function listCountryGuides(): Promise<Record<string, CountryGuide>> {
  const snap = await getAdminDb().collection(COLLECTION).get();
  return Object.fromEntries(snap.docs.map((d) => [d.id, d.data() as CountryGuide]));
}

export type CountryGuideEdit = Pick<CountryGuide, 'tagline' | 'history' | 'geography' | 'economy' | 'facts'>;

// Ръчна редакция от админа. Пази модела и датата на писане, брои думите наново и отбелязва кога е редактиран.
// Проверката за 200 думи е в API маршрута (там е и съобщението за грешка).
export async function saveCountryGuideEdit(country: string, edit: CountryGuideEdit): Promise<CountryGuide> {
  const existing = await readCountryGuide(country);
  // Нищо не е променено — не пишем и не отбелязваме текста като ръчно поправен
  if (existing && (Object.keys(edit) as (keyof CountryGuideEdit)[]).every((k) => (existing[k] || '') === edit[k])) return existing;
  const now = new Date().toISOString();
  const record: CountryGuide = {
    country,
    ...edit,
    words: sectionWords(edit),
    model: existing?.model || 'ръчно',
    createdAt: existing?.createdAt || now,
    editedAt: now,
  };
  await getAdminDb().collection(COLLECTION).doc(slugify(country)).set(record);
  return record;
}

// За страницата на държавата: чете записания текст, а ако няма — пише го сега. Никога не хвърля грешка —
// без текст страницата просто не показва раздела „За <държава>“.
export async function getCountryGuide(country: string): Promise<CountryGuide | null> {
  let existing: CountryGuide | null;
  try {
    existing = await readCountryGuide(country);
  } catch (e) {
    // Admin SDK не е настроен (напр. локално без ключове) — без запис няма смисъл да викаме ИИ при всяко отваряне
    console.error('[countryGuide] четене', e);
    return null;
  }
  if (existing) return existing;
  try {
    return await generateCountryGuide(country);
  } catch (e) {
    console.error('[countryGuide] писане', country, e);
    return null;
  }
}
