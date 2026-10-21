import type { Metadata } from 'next';
import { shareMetadata } from '@/lib/shareMeta';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Calendar } from 'lucide-react';
import { getActiveTours } from '@/services/tourService';
import { slugify } from '@/lib/admin-helpers';
import { COUNTRY_TO_CONTINENT } from '@/lib/constants';
import { formatPrice } from '@/lib/formatPrice';
import { isOperatorHotlink } from '@/lib/operatorImageDomains';
import { fetchAllMedia, findCountryHeroImage } from '@/lib/media-helpers';
import { BLUR_PLACEHOLDER } from '@/lib/blurPlaceholder';
import type { ITour } from '@/types';
import JsonLd from '@/components/JsonLd';

// Hub страница „Всички дестинации“. Освен за клиентите, тя е важна и за Google: от нея има обикновени
// (server-rendered) линкове към всяка страница на дестинация и към всеки тур — така Googlebot намира новите
// екскурзии за 1–2 клика от началната страница, без да зависи от JavaScript-а на филтрите.
export const revalidate = 3600;

const SITE_URL = 'https://belivavip.bg';

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

// Редът на континентите на страницата
const CONTINENT_ORDER = ['Азия', 'Европа', 'Африка', 'Северна Америка', 'Южна Америка', 'Австралия', 'Други'];

const tourCountries = (tour: ITour): string[] =>
  Array.isArray(tour.country)
    ? tour.country.filter(Boolean)
    : typeof tour.country === 'string'
      ? tour.country.split(',').map((c) => c.trim()).filter(Boolean)
      : [];

const priceNumber = (tour: ITour): number => {
  const n = parseFloat(String(tour.discountPrice || tour.price || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : Infinity;
};

const displayDate = (iso?: string) => (iso ? iso.split('T')[0].split('-').reverse().join('.') : '');

type CountryGroup = { name: string; slug: string; tours: ITour[]; minPriceTour?: ITour; image?: string };

export default async function DestinationsPage() {
  const tours = await getActiveTours();

  // Групираме по държава (тур с няколко държави влиза във всяка от тях)
  const byCountry = new Map<string, CountryGroup>();
  tours.forEach((tour) => {
    tourCountries(tour).forEach((name) => {
      const group = byCountry.get(name) || { name, slug: slugify(name), tours: [] };
      group.tours.push(tour);
      byCountry.set(name, group);
    });
  });

  // Снимка на държавата: „<Държава> hero“ от Media Library, иначе първата снимка от неин тур
  const allMedia = await fetchAllMedia();
  byCountry.forEach((group) => {
    group.tours.sort((a, b) => String(a.date || '9999').localeCompare(String(b.date || '9999')));
    group.minPriceTour = [...group.tours].sort((a, b) => priceNumber(a) - priceNumber(b))[0];
    group.image = findCountryHeroImage(allMedia, group.name)
      || group.tours.map((t) => t.img).find((img) => img && !isOperatorHotlink(img));
  });

  // Групираме държавите по континент
  const byContinent = new Map<string, CountryGroup[]>();
  byCountry.forEach((group) => {
    const continent = COUNTRY_TO_CONTINENT[group.name] || group.tours[0]?.continent || 'Други';
    const key = CONTINENT_ORDER.includes(continent) ? continent : 'Други';
    byContinent.set(key, [...(byContinent.get(key) || []), group]);
  });
  const continents = CONTINENT_ORDER
    .filter((c) => byContinent.has(c))
    .map((c) => ({
      name: c,
      id: slugify(c),
      countries: byContinent.get(c)!.sort((a, b) => b.tours.length - a.tours.length || a.name.localeCompare(b.name, 'bg')),
    }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Дестинации – Beliva VIP Tour',
    url: `${SITE_URL}/destinations`,
    numberOfItems: byCountry.size,
    itemListElement: Array.from(byCountry.values()).map((g, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `Екскурзии до ${g.name}`,
      url: `${SITE_URL}/destinations/${g.slug}`,
    })),
  };

  // Обвивката е <div>, не <main>: LayoutWrapper вече слага <main> около всяка страница, а <main> в <main> е невалиден HTML.
  return (
    <div className="min-h-screen bg-[#f7f4ee]">
      <JsonLd data={jsonLd} />

      {/* Заглавие */}
      <section className="bg-[#0f1724] pb-14 pt-32 text-white md:pb-16 md:pt-40">
        <div className="container mx-auto px-6">
          <nav aria-label="Навигация" className="mb-6 text-xs text-white/50">
            <Link href="/" className="transition-colors hover:text-brand-gold">Начало</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-white/80">Дестинации</span>
          </nav>
          <h1 className="font-serif text-5xl italic leading-tight md:text-6xl">Дестинации</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">
            {byCountry.size} държави и {tours.length} групови екскурзии с водач. Изберете държава, за да видите всички дати,
            програми и цени.
          </p>

          {continents.length > 1 && (
            <ul className="mt-8 flex flex-wrap gap-2">
              {continents.map((c) => (
                <li key={c.id}>
                  <a
                    href={`#${c.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition-colors hover:border-brand-gold hover:text-brand-gold"
                  >
                    {c.name}
                    <span className="text-white/40">{c.countries.length}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Континенти → държави → турове */}
      <div className="container mx-auto space-y-16 px-6 py-14 md:py-20">
        {continents.map((continent) => (
          <section key={continent.id} id={continent.id} className="scroll-mt-28" aria-labelledby={`${continent.id}-heading`}>
            <h2 id={`${continent.id}-heading`} className="mb-8 border-b border-brand-gold/20 pb-3 font-serif text-3xl italic text-brand-dark md:text-4xl">
              {continent.name}
            </h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {continent.countries.map((country) => (
                <article key={country.slug} className="flex flex-col overflow-hidden rounded-[2rem] border border-brand-gold/15 bg-white shadow-sm">
                  <Link href={`/destinations/${country.slug}`} className="group relative block h-44 overflow-hidden">
                    {country.image ? (
                      <Image
                        src={country.image}
                        alt={`Екскурзии до ${country.name}`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        placeholder="blur"
                        blurDataURL={BLUR_PLACEHOLDER}
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-brand-dark to-brand-dark/70" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute inset-x-5 bottom-4 text-white">
                      <h3 className="font-serif text-2xl italic leading-tight">Екскурзии до {country.name}</h3>
                      <p className="mt-1 text-sm text-white/80">
                        {country.tours.length} {country.tours.length === 1 ? 'екскурзия' : 'екскурзии'}
                        {country.minPriceTour && priceNumber(country.minPriceTour) !== Infinity && (
                          <> · от {formatPrice(String(country.minPriceTour.discountPrice || country.minPriceTour.price))}</>
                        )}
                      </p>
                    </div>
                  </Link>

                  <ul className="flex-1 divide-y divide-gray-100 px-5 py-2">
                    {country.tours.slice(0, 5).map((tour) => (
                      <li key={tour.id}>
                        <Link
                          href={`/tour/${tour.slug || tour.tourId || tour.id}`}
                          className="group flex items-start justify-between gap-3 py-3 text-sm text-brand-dark transition-colors hover:text-brand-goldDeep"
                        >
                          <span className="font-medium leading-snug">{tour.title}</span>
                          {tour.date && (
                            <span className="flex shrink-0 items-center gap-1 text-xs text-gray-500">
                              <Calendar size={12} className="text-brand-gold" aria-hidden="true" />
                              {displayDate(String(tour.date))}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={`/destinations/${country.slug}`}
                    className="flex items-center justify-between border-t border-gray-100 px-5 py-4 text-xs font-bold uppercase tracking-widest text-brand-dark transition-colors hover:bg-brand-gold/5 hover:text-brand-goldDeep"
                  >
                    {country.tours.length > 5 ? `Всички ${country.tours.length} екскурзии` : 'Повече за дестинацията'}
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ))}

        {continents.length === 0 && (
          <p className="rounded-[2rem] bg-white p-10 text-center text-gray-500">В момента няма публикувани екскурзии.</p>
        )}

        <div className="flex justify-center pt-4">
          <Link
            href="/#tours-grid"
            className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-8 py-4 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-brand-gold hover:text-brand-dark"
          >
            Всички оферти с филтри
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
