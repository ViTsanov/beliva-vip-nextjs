import type { Metadata } from 'next';
import { shareMetadata } from '@/lib/shareMeta';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Star } from 'lucide-react';
import { getActiveTours } from '@/services/tourService';
import { slugify } from '@/lib/admin-helpers';
import { COUNTRY_TO_CONTINENT } from '@/lib/constants';
import { formatPrice } from '@/lib/formatPrice';
import { isOperatorHotlink } from '@/lib/operatorImageDomains';
import { fetchAllMedia, findCountryHeroImage } from '@/lib/media-helpers';
import { normalizeTourDates } from '@/lib/tourDates';
import type { ITour } from '@/types';
import JsonLd from '@/components/JsonLd';
import ContinentLinks from '@/components/destination/ContinentLinks';
import ContinentShape from '@/components/destination/ContinentShape';
import { DestinationInquiryHost, InquiryButton } from '@/components/destination/DestinationInquiry';
import { ContourLines, PalmSilhouette } from '@/components/decor/TravelDecor';

// Hub страница „Всички дестинации“ — по континенти, всеки в свой цвят и със своя силует (public/assets/continents),
// а под него картите на държавите му (снимка, брой екскурзии, цена от, следващо заминаване). Най-голямата държава на
// всеки континент е на широка карта, а на компютър вдясно стои тъмен панел с 5 препоръчани дестинации. Обикновени (server-rendered) линкове към всяка страница на дестинация
// са важни и за Google; линковете към всеки тур са в каталога на началната страница и в sitemap.
export const revalidate = 3600;

const SITE_URL = 'https://belivavip.bg';
const POLI = 'Водена от ПОЛИ';

export const metadata: Metadata = {
  title: { absolute: 'Дестинации – екскурзии по държави | Beliva VIP Tour' },
  description:
    'Всички дестинации на Beliva VIP Tour на едно място: групови екскурзии с водач по държави и континенти – дати, цени и програми.',
  alternates: { canonical: `${SITE_URL}/destinations` },
  ...shareMetadata({
    path: '/destinations',
    title: 'Дестинации – екскурзии по държави | Beliva VIP Tour',
    description: 'Групови екскурзии с водач по държави и континенти.',
  }),
};

// Континентите — ред, име, цвят на фона (bg), по-тъмен тон за силуета (ink) и силует
const CONTINENTS: { key: string; name: string; bg: string; ink: string; shape: string }[] = [
  { key: 'Азия', name: 'Азия', bg: '#fbeadf', ink: '#c0623a', shape: '/assets/continents/asia_tr.png' },
  { key: 'Европа', name: 'Европа', bg: '#e6edf8', ink: '#47679f', shape: '/assets/continents/europe_tr.png' },
  { key: 'Африка', name: 'Африка', bg: '#f7ecd2', ink: '#b07d1c', shape: '/assets/continents/africa_tr.png' },
  { key: 'Северна Америка', name: 'Северна Америка', bg: '#e1eff4', ink: '#2c7a95', shape: '/assets/continents/north_america_tr.png' },
  { key: 'Южна Америка', name: 'Южна Америка', bg: '#e4f1e6', ink: '#3c8a5a', shape: '/assets/continents/south_america_tr.png' },
  // „Австралия“ е и държава — като континент я пишем „Австралия и Океания“, за да не се бъркат
  { key: 'Австралия', name: 'Австралия и Океания', bg: '#eee8f6', ink: '#7f5aa6', shape: '/assets/continents/australia_tr.png' },
  { key: 'Други', name: 'Други дестинации', bg: '#eef1f4', ink: '#64748b', shape: '/assets/continents/europe_tr.png' },
];

const MONTHS = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември'];

const tourCountries = (tour: ITour): string[] =>
  Array.isArray(tour.country)
    ? tour.country.filter(Boolean)
    : typeof tour.country === 'string'
      ? tour.country.split(',').map((c) => c.trim()).filter(Boolean)
      : [];

const priceOf = (tour: ITour) => String(tour.discountPrice || tour.price || '');
const priceNumber = (raw: string): number => {
  const n = parseFloat(raw.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : Infinity;
};

// „2027-03-16“ → „16 март 2027“
const longDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const focusRing = 'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-brand-gold';

type Country = {
  slug: string;
  name: string;
  img: string | null;
  tours: number;
  price: string | null;
  nextDeparture: string | null;
  poli: boolean;
};

export default async function DestinationsPage() {
  const [tours, allMedia] = await Promise.all([getActiveTours(), fetchAllMedia()]);
  const today = new Date().toISOString().split('T')[0];

  // Групираме по държава (тур с няколко държави влиза във всяка от тях)
  const byCountry = new Map<string, ITour[]>();
  tours.forEach((tour) => {
    tourCountries(tour).forEach((name) => byCountry.set(name, [...(byCountry.get(name) || []), tour]));
  });

  // Държавите по континенти; пазим и самите турове, за да преброим екскурзиите на континента без повторения
  const byContinent = new Map<string, { countries: Country[]; tourIds: Set<string> }>();
  byCountry.forEach((list, name) => {
    const cheapest = [...list].sort((a, b) => priceNumber(priceOf(a)) - priceNumber(priceOf(b)))[0];
    const next = normalizeTourDates(list.flatMap((t) => [...(t.dates || []), t.date])).find((d) => d >= today);
    const continent = COUNTRY_TO_CONTINENT[name] || list[0]?.continent || 'Други';
    const key = CONTINENTS.some((c) => c.key === continent) ? continent : 'Други';
    const entry = byContinent.get(key) || { countries: [], tourIds: new Set<string>() };
    list.forEach((t) => entry.tourIds.add(t.id));
    entry.countries.push({
      slug: slugify(name),
      name,
      // Снимка: „<Държава> hero“ от Media Library, иначе първата снимка от неин тур
      img: findCountryHeroImage(allMedia, name) || list.map((t) => t.img).find((img) => img && !isOperatorHotlink(img)) || null,
      tours: list.length,
      price: cheapest && priceNumber(priceOf(cheapest)) !== Infinity ? formatPrice(priceOf(cheapest)) : null,
      nextDeparture: next ? longDate(next) : null,
      poli: list.some((t) => t.categories?.includes(POLI)),
    });
    byContinent.set(key, entry);
  });

  const continents = CONTINENTS
    .filter((c) => byContinent.has(c.key))
    .map((c) => {
      const { countries, tourIds } = byContinent.get(c.key)!;
      return {
        ...c,
        id: slugify(c.key),
        tours: tourIds.size,
        countries: countries.sort((a, b) => b.tours - a.tours || a.name.localeCompare(b.name, 'bg')),
      };
    });

  // Препоръчани (панелът вдясно на компютър): първо държавите с екскурзии, водени от Поли, после тези с най-много екскурзии
  const recommended = continents
    .flatMap((c) => c.countries)
    .sort((a, b) => Number(b.poli) - Number(a.poli) || b.tours - a.tours || a.name.localeCompare(b.name, 'bg'))
    .slice(0, 5);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Дестинации – Beliva VIP Tour',
    url: `${SITE_URL}/destinations`,
    numberOfItems: byCountry.size,
    itemListElement: continents.flatMap((c) => c.countries).map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `Екскурзии до ${c.name}`,
      url: `${SITE_URL}/destinations/${c.slug}`,
    })),
  };

  // Обвивката е <div>, не <main>: LayoutWrapper вече слага <main> около всяка страница, а <main> в <main> е невалиден HTML.
  return (
    <div className="min-h-screen bg-white text-brand-dark">
      <JsonLd data={jsonLd} />
      <DestinationInquiryHost country="" />

      {/* Заглавие и плочките на континентите */}
      <header className="relative mx-auto max-w-[1600px] px-4 pb-10 pt-[112px] sm:px-6 md:pb-14 lg:px-8 md:pt-[140px]">
        <HeaderArt />
        <nav aria-label="Навигационна пътека" className="relative mb-6 px-2 sm:px-0">
          <ol className="flex flex-wrap items-center gap-2.5 text-[15px] text-slate-600">
            <li><Link href="/" className={`rounded-sm hover:text-brand-dark ${focusRing}`}>Начало</Link></li>
            <li aria-hidden="true" className="text-slate-400">/</li>
            <li aria-current="page" className="font-semibold text-brand-dark">Дестинации</li>
          </ol>
        </nav>
        <div className="relative px-2 sm:px-0">
          <h1 className="font-serif text-[clamp(42px,5.5vw,68px)] font-normal italic leading-[1.05] tracking-[-0.01em]">Дестинации</h1>
          <p className="mt-5 max-w-[640px] text-lg leading-[1.7] text-slate-700">
            {plural(byCountry.size, 'държава', 'държави')} и {plural(tours.length, 'групова екскурзия', 'групови екскурзии')} с водач,
            подредени по континенти. Изберете континент или държава, за да видите всички дати, програми и цени.
          </p>
        </div>
        {continents.length > 1 && (
          <div className="relative mt-9">
            <ContinentLinks
              continents={continents.map((c) => ({ id: c.id, name: c.name, countries: c.countries.length, bg: c.bg, ink: c.ink, shape: c.shape }))}
            />
          </div>
        )}
      </header>

      {/* На компютър — две колони: вляво континентите, вдясно тъмен панел с 5 препоръчани дестинации, който стои
          на място при превъртане (sticky). На телефон и таблет панелът го няма — само континентите един под друг. */}
      <div className="mx-auto max-w-[1600px] px-4 pb-20 sm:px-6 md:pb-28 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8 lg:px-8 xl:grid-cols-[minmax(0,1fr)_350px] 2xl:grid-cols-[minmax(0,1fr)_380px] 2xl:gap-10">
      {/* Континенти — цветни ленти: заглавие и силует отгоре, картите на държавите отдолу. В горния ляв ъгъл на всяка
          лента има бели линии като на карта (изохипси). */}
      <div className="flex flex-col gap-6 md:gap-8">
        {continents.map((continent) => {
          const count = continent.countries.length;
          return (
            <section
              key={continent.id}
              id={continent.id}
              aria-labelledby={`${continent.id}-title`}
              style={{ backgroundColor: continent.bg }}
              className="relative scroll-mt-24 overflow-hidden rounded-[32px] px-5 pb-6 pt-7 sm:px-8 sm:pb-8 md:rounded-[44px] lg:px-9 lg:py-10"
            >
              <ContourLines className="pointer-events-none absolute -left-24 -top-24 w-72 text-white lg:w-96" />
              <div className="relative grid grid-cols-1 gap-7">
                {/* Заглавието на континента със силуета му */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 id={`${continent.id}-title`} className="font-serif text-[clamp(34px,4vw,52px)] font-normal italic leading-[1.05]">
                      {continent.name}
                    </h2>
                    <p className="mt-2 text-base text-slate-700">
                      {plural(count, 'държава', 'държави')}, {plural(continent.tours, 'екскурзия', 'екскурзии')}
                    </p>
                  </div>
                  <ContinentShape src={continent.shape} color={continent.ink} className="h-24 w-24 shrink-0 sm:h-28 sm:w-28 lg:h-32 lg:w-32" />
                </div>

                {/* Държавите: първата (с най-много екскурзии) е на широка карта; ако останат нечетен брой, и последната */}
                <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {continent.countries.map((country, i) => {
                    const wide = count > 1 && (i === 0 || (i === count - 1 && (count - 1) % 2 === 1));
                    return (
                      <li key={country.slug} className={wide ? 'sm:col-span-2' : ''}>
                        <CountryCard country={country} wide={wide} accent={continent.ink} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          );
        })}

        {continents.length === 0 && (
          <p className="rounded-3xl bg-slate-50 p-10 text-center text-lg text-slate-600">В момента няма публикувани екскурзии.</p>
        )}
      </div>

      {recommended.length > 0 && <RecommendedPanel countries={recommended} />}
      </div>

      {/* Край на страницата — тъмна, заоблена и стига под ъглите на футъра (-mb-12), като на страницата на държава */}
      <section aria-labelledby="dest-close-title" className="relative -mb-12 overflow-hidden rounded-t-[48px] bg-brand-dark pb-[calc(88px+3rem)] pt-20 text-white md:pt-24">
        {/* Палма и изохипси на фона — същият мотив като тъмната лента „Топ 3“ на началната страница */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <ContourLines className="absolute -right-24 -top-28 w-80 text-white/10 md:w-[460px]" />
          {/* bottom-12: долните 48px на секцията са под футъра — палмата „стъпва“ точно на ръба му */}
          <PalmSilhouette className="absolute -left-10 bottom-12 w-40 text-white/10 md:w-64" />
        </div>
        <div className="relative mx-auto grid max-w-[1600px] grid-cols-1 items-end gap-8 px-6 lg:px-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
          <div>
            <h2 id="dest-close-title" className="font-serif text-[clamp(32px,4vw,52px)] font-normal italic leading-[1.08] [text-wrap:balance]">
              Не знаете откъде да започнете?
            </h2>
            <p className="mt-5 max-w-[540px] text-[17px] leading-[1.7] text-white/80">
              Напишете ни кога искате да пътувате и какво ви привлича, и ще ви предложим подходящите екскурзии. Или
              разгледайте всички оферти с филтри по месец, континент и тип пътуване.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <InquiryButton className={`inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-brand-gold px-[26px] text-[15px] font-bold text-brand-dark transition-colors hover:bg-[#e6c65c] ${focusRing}`}>
              Направи запитване
              <ArrowRight size={17} strokeWidth={2.2} aria-hidden="true" />
            </InquiryButton>
            <Link
              href="/#tours-grid"
              className={`inline-flex min-h-[52px] items-center gap-2.5 rounded-full border border-white/45 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-white/15 ${focusRing}`}
            >
              Всички оферти с филтри
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// Украсата в празното място вдясно от заглавието: залязващо слънце, палма, пунктирен маршрут между две точки и бледи
// паралели. На телефон — само слънцето и палмата, малки, в горния десен ъгъл. Само украса: aria-hidden, без движение.
function HeaderArt() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute right-2 top-[76px] h-[150px] w-[130px] sm:right-6 md:top-[96px] lg:h-[300px] lg:w-[540px]">
      <svg viewBox="0 0 540 300" preserveAspectRatio="xMaxYMin meet" className="absolute inset-0 hidden h-full w-full lg:block">
        <g fill="none" stroke="#0f172a" strokeWidth="1.25" opacity="0.08">
          <path d="M0 250 Q270 200 540 250" />
          <path d="M0 290 Q270 240 540 290" />
          <path d="M0 60 Q270 10 540 60" />
        </g>
        <path d="M30 255 Q190 30 470 70" fill="none" stroke="#0f172a" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" opacity="0.4" />
        <circle cx="30" cy="255" r="6" fill="#0f172a" opacity="0.55" />
        <circle cx="470" cy="70" r="8" fill="#d4af37" stroke="#fff" strokeWidth="3" />
      </svg>
      {/* Слънцето и палмата пред него */}
      <span className="absolute right-[6%] top-[8%] block aspect-square w-[78%] rounded-full bg-brand-gold/20 lg:right-[17%] lg:top-[14%] lg:w-[36%]" />
      <PalmSilhouette className="absolute bottom-0 right-[22%] h-[92%] w-auto text-brand-gold/60 lg:right-[20%] lg:h-[88%]" />
    </div>
  );
}

// Панелът вдясно на компютър: 5 препоръчани държави на тъмен фон със собствена украса — златно слънце, палма и изохипси.
// Стои на място при превъртане (sticky). На ниски екрани редовете се свиват, за да се вижда целият панел заедно с бутона.
function RecommendedPanel({ countries }: { countries: Country[] }) {
  return (
    <aside aria-labelledby="recommended-title" className="relative hidden self-start overflow-hidden rounded-[32px] bg-brand-dark px-5 pb-6 pt-7 text-white lg:sticky lg:top-28 lg:block">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="absolute -right-10 -top-10 block h-40 w-40 rounded-full bg-brand-gold/20" />
        <ContourLines className="absolute -bottom-24 -left-24 w-72 text-white/10" />
        <PalmSilhouette className="absolute -bottom-3 -right-6 w-36 text-white/[0.08]" />
      </div>

      <div className="relative">
        <h2 id="recommended-title" className="px-2 font-serif text-[28px] font-normal italic leading-tight">Препоръчани дестинации</h2>
        {/* Звездата до името е по-къса от надпис „С Поли“ — така и дългите имена (Френска Полинезия) се виждат цели */}
        <p className="mt-1.5 flex items-start gap-1.5 px-2 text-[15px] leading-snug text-white/75">
          <Star size={15} aria-hidden="true" className="mt-0.5 shrink-0 fill-brand-gold text-brand-gold" />
          Със звезда са пътуванията, водени от Поли.
        </p>

        <ul className="mt-5 flex flex-col gap-1 [@media(max-height:820px)]:mt-3 [@media(max-height:820px)]:gap-0.5">
          {countries.map((country) => (
            <li key={country.slug}>
              <Link
                href={`/destinations/${country.slug}`}
                className={`group flex items-center gap-3.5 rounded-2xl p-2 transition-colors hover:bg-white/10 [@media(max-height:820px)]:py-1.5 ${focusRing}`}
              >
                <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/10 [@media(max-height:820px)]:h-12 [@media(max-height:820px)]:w-12">
                  {country.img && <Image src={country.img} alt="" fill sizes="64px" className="object-cover" />}
                </span>
                <span className="min-w-0 grow">
                  <span className="block font-serif text-[20px] font-semibold leading-tight">
                    {country.name}
                    {country.poli && (
                      <>
                        <Star size={14} aria-hidden="true" className="ml-1.5 inline-block -translate-y-0.5 fill-brand-gold text-brand-gold" />
                        <span className="sr-only">, водена от Поли</span>
                      </>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[14px] text-white/75">
                    {plural(country.tours, 'екскурзия', 'екскурзии')}
                    {country.price && <>, от {country.price}</>}
                  </span>
                </span>
                <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" className="shrink-0 text-brand-gold transition-transform motion-safe:group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>

        <InquiryButton className={`mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full bg-brand-gold px-5 text-[15px] font-bold text-brand-dark transition-colors hover:bg-[#e6c65c] [@media(max-height:820px)]:mt-3 ${focusRing}`}>
          Направи запитване
          <ArrowRight size={17} strokeWidth={2.2} aria-hidden="true" />
        </InquiryButton>
      </div>
    </aside>
  );
}

// Карта на държава: снимка, име, факти с надписи и ясно „Виж екскурзиите“. Широката е хоризонтална (от sm нагоре).
// Без анимация на появяване: картите се виждат веднага, дори ако JavaScript закъснее.
function CountryCard({ country, wide, accent }: { country: Country; wide: boolean; accent: string }) {
  return (
    <article className="h-full overflow-hidden rounded-3xl bg-white shadow-[0_12px_28px_-16px_rgba(15,23,42,0.35)] transition-shadow hover:shadow-[0_20px_38px_-16px_rgba(15,23,42,0.45)]">
      <Link href={`/destinations/${country.slug}`} className={`group flex h-full flex-col rounded-3xl ${wide ? 'sm:flex-row' : ''} ${focusRing}`}>
        <div className={`relative shrink-0 overflow-hidden bg-slate-200 ${wide ? 'h-52 sm:h-auto sm:min-h-[260px] sm:w-1/2 xl:min-h-[320px]' : 'h-48 xl:h-60'}`}>
          {country.img && (
            <Image
              src={country.img}
              alt={`Екскурзии до ${country.name}`}
              fill
              sizes={wide ? '(max-width: 640px) 100vw, 640px' : '(max-width: 640px) 100vw, 600px'}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
          {country.poli && (
            <span className="absolute left-4 top-4 rounded-full bg-brand-gold px-3.5 py-1.5 text-sm font-semibold text-brand-dark shadow-sm">
              Водена от Поли
            </span>
          )}
        </div>

        {/* <div>, не <span>: вътре има заглавие и списък, които не може да са в <span> */}
        <div className={`flex grow flex-col px-6 pb-5 ${wide ? 'pt-5 sm:justify-center sm:px-8 sm:py-7' : 'pt-5'}`}>
          <h3 className={`font-serif font-semibold leading-tight ${wide ? 'text-[28px] sm:text-[36px]' : 'text-[26px]'}`}>{country.name}</h3>
          <dl className="mb-5 mt-3 flex flex-col gap-1.5 text-base text-slate-700">
            <div className="flex gap-2">
              <dt>Екскурзии:</dt>
              <dd className="font-semibold text-brand-dark">{country.tours}</dd>
            </div>
            {country.price && (
              <div className="flex gap-2">
                <dt>Цени от:</dt>
                <dd className="font-semibold text-brand-dark">{country.price}</dd>
              </div>
            )}
            {country.nextDeparture && (
              <div className="flex flex-wrap gap-x-2">
                <dt>Следващо заминаване:</dt>
                <dd className="font-semibold text-brand-dark">{country.nextDeparture}</dd>
              </div>
            )}
          </dl>
          <span className={`flex items-center justify-between border-t border-slate-200 pt-4 text-base font-semibold text-brand-goldDeep ${wide ? 'mt-auto sm:mt-0' : 'mt-auto'}`}>
            {country.tours === 1 ? 'Виж екскурзията' : 'Виж екскурзиите'}
            <span
              aria-hidden="true"
              style={{ backgroundColor: accent }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform group-hover:translate-x-1"
            >
              <ArrowRight size={18} strokeWidth={2.2} />
            </span>
          </span>
        </div>
      </Link>
    </article>
  );
}
