import type { Metadata } from 'next';
import { shareMetadata } from '@/lib/shareMeta';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
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

// Hub страница „Всички дестинации“ — по континенти, всеки в свой цвят и със своя силует (public/assets/continents),
// а под него картите на държавите му (снимка, брой екскурзии, цена от, следващо заминаване). Континентите се редуват
// ляво/дясно, а най-голямата държава на всеки континент е на широка карта — страницата е разчупена, но всеки
// континент е ясно отделен с голямо заглавие. Обикновени (server-rendered) линкове към всяка страница на дестинация
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
      <header className="mx-auto max-w-[1240px] px-4 pb-10 pt-[112px] sm:px-6 md:pb-14 md:pt-[140px]">
        <nav aria-label="Навигационна пътека" className="mb-6 px-2 sm:px-0">
          <ol className="flex flex-wrap items-center gap-2.5 text-[15px] text-slate-600">
            <li><Link href="/" className={`rounded-sm hover:text-brand-dark ${focusRing}`}>Начало</Link></li>
            <li aria-hidden="true" className="text-slate-400">/</li>
            <li aria-current="page" className="font-semibold text-brand-dark">Дестинации</li>
          </ol>
        </nav>
        <div className="px-2 sm:px-0">
          <h1 className="font-serif text-[clamp(42px,5.5vw,68px)] font-normal italic leading-[1.05] tracking-[-0.01em]">Дестинации</h1>
          <p className="mt-5 max-w-[640px] text-lg leading-[1.7] text-slate-700">
            {plural(byCountry.size, 'държава', 'държави')} и {plural(tours.length, 'групова екскурзия', 'групови екскурзии')} с водач,
            подредени по континенти. Изберете континент или държава, за да видите всички дати, програми и цени.
          </p>
        </div>
        {continents.length > 1 && (
          <div className="mt-9">
            <ContinentLinks
              continents={continents.map((c) => ({ id: c.id, name: c.name, countries: c.countries.length, bg: c.bg, ink: c.ink, shape: c.shape }))}
            />
          </div>
        )}
      </header>

      {/* Континенти — цветни ленти, заглавието се редува ляво/дясно */}
      <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-4 pb-20 sm:px-6 md:gap-8 md:pb-28">
        {continents.map((continent, ci) => {
          const flip = ci % 2 === 1;
          const count = continent.countries.length;
          return (
            <section
              key={continent.id}
              id={continent.id}
              aria-labelledby={`${continent.id}-title`}
              style={{ backgroundColor: continent.bg }}
              className="relative scroll-mt-24 rounded-[32px] px-5 pb-6 pt-7 sm:px-8 sm:pb-8 md:rounded-[44px] lg:px-12 lg:py-12"
            >
              <div className={`grid grid-cols-1 gap-7 lg:gap-12 ${flip ? 'lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]' : 'lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]'}`}>
                {/* Заглавието на континента със силуета му; на компютър върви с превъртането */}
                <div className={`self-start lg:sticky lg:top-28 ${flip ? 'lg:order-2' : ''}`}>
                  <div className="flex items-center justify-between gap-4 lg:flex-col lg:items-start lg:justify-start lg:gap-0">
                    <div className="lg:mt-6">
                      <h2 id={`${continent.id}-title`} className="font-serif text-[clamp(34px,4vw,52px)] font-normal italic leading-[1.05]">
                        {continent.name}
                      </h2>
                      <p className="mt-2 text-base text-slate-700">
                        {plural(count, 'държава', 'държави')}, {plural(continent.tours, 'екскурзия', 'екскурзии')}
                      </p>
                    </div>
                    <ContinentShape src={continent.shape} color={continent.ink} className="h-24 w-24 shrink-0 sm:h-28 sm:w-28 lg:order-first lg:h-[220px] lg:w-full lg:max-w-[260px]" />
                  </div>
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

      {/* Край на страницата — тъмна, заоблена и стига под ъглите на футъра (-mb-12), като на страницата на държава */}
      <section aria-labelledby="dest-close-title" className="-mb-12 rounded-t-[48px] bg-brand-dark pb-[calc(88px+3rem)] pt-20 text-white md:pt-24">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-end gap-8 px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
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

// Карта на държава: снимка, име, факти с надписи и ясно „Виж екскурзиите“. Широката е хоризонтална (от sm нагоре).
// Без анимация на появяване: картите се виждат веднага, дори ако JavaScript закъснее.
function CountryCard({ country, wide, accent }: { country: Country; wide: boolean; accent: string }) {
  return (
    <article className="h-full overflow-hidden rounded-3xl bg-white shadow-[0_12px_28px_-16px_rgba(15,23,42,0.35)] transition-shadow hover:shadow-[0_20px_38px_-16px_rgba(15,23,42,0.45)]">
      <Link href={`/destinations/${country.slug}`} className={`group flex h-full flex-col rounded-3xl ${wide ? 'sm:flex-row' : ''} ${focusRing}`}>
        <div className={`relative shrink-0 overflow-hidden bg-slate-200 ${wide ? 'h-52 sm:h-auto sm:min-h-[260px] sm:w-1/2' : 'h-48'}`}>
          {country.img && (
            <Image
              src={country.img}
              alt={`Екскурзии до ${country.name}`}
              fill
              sizes={wide ? '(max-width: 640px) 100vw, 420px' : '(max-width: 640px) 100vw, 380px'}
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
