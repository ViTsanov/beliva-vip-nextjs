import Image from 'next/image';
import Link from 'next/link';
import { ITour } from '@/types';
import { slugify } from '@/lib/admin-helpers';
import CountryFilterLink from './CountryFilterLink';
import { isOperatorHotlink } from '@/lib/operatorImageDomains';
import { fetchAllMedia, findCountryHeroImage } from '@/lib/media-helpers';

// Резервни градиентни цветове когато няма снимка от базата
const FALLBACK_COLORS: Record<string, [string, string]> = {
  'Тайланд':     ['#F59E0B', '#EA580C'],
  'Япония':      ['#F43F5E', '#9333EA'],
  'Австралия':   ['#EA580C', '#DC2626'],
  'Перу':        ['#10B981', '#0EA5E9'],
  'Сингапур':    ['#0EA5E9', '#6366F1'],
  'ОАЕ':         ['#D97706', '#92400E'],
  'Индия':       ['#DC2626', '#F97316'],
  'Китай':       ['#7C3AED', '#DC2626'],
  'Кения':       ['#047857', '#0EA5E9'],
  'Бразилия':    ['#16A34A', '#FACC15'],
  'Мексико':     ['#DC2626', '#16A34A'],
  'Мароко':      ['#C2410C', '#D97706'],
  'Египет':      ['#D97706', '#CA8A04'],
  'Малдиви':     ['#0EA5E9', '#06B6D4'],
  'Бали':        ['#10B981', '#F59E0B'],
  'Виетнам':     ['#DC2626', '#FACC15'],
};

const DEFAULT_FALLBACK: [string, string][] = [
  ['#6366F1', '#EC4899'],
  ['#F59E0B', '#EF4444'],
  ['#10B981', '#3B82F6'],
  ['#8B5CF6', '#F97316'],
];

interface Props {
  tours: ITour[];
  adminCountries?: string[]; // ако е зададено и непразно от админ панела — тези държави се показват, в това ред,
  // вместо автоматичното „топ 8 по брой турове“ поведение.
  adminImages?: Record<string, string>; // снимки, избрани ръчно в Настройки (държава → URL) — имат предимство пред всичко
}

export default async function DestinationsSection({ tours, adminCountries = [], adminImages = {} }: Props) {
  // Опитваме първо специална "<държава> hero" снимка от Media Library (същия pattern като в
  // автоматизацията) — фиксирана, не зависи от кой тур случайно е първи в списъка. Ако няма такава,
  // fallback към първата валидна снимка от тур, както досега.
  const allMedia = await fetchAllMedia();

  // Строим map: country → { count, img }
  // За снимка взимаме първия тур за тази дестинация с валиден img
  const destMap: Record<string, { count: number; img: string | null }> = {};

  for (const tour of tours) {
    const countries = Array.isArray(tour.country)
      ? tour.country
      : (tour.country ? tour.country.split(',').map((c: string) => c.trim()) : []);

    for (const c of countries) {
      if (!c) continue;
      if (!destMap[c]) destMap[c] = { count: 0, img: null };
      destMap[c].count += 1;
      // Запазваме първата валидна снимка, която не е hotlink
      if (!destMap[c].img && tour.img && !isOperatorHotlink(tour.img)) {
        destMap[c].img = tour.img;
      }
    }
  }

  const destinations = adminCountries.length > 0
    // Админ-избрани държави, в точно този ред — взимаме броят/снимката от destMap, ако ги има (0, ако държавата
    // временно няма активни турове, но все пак я показваме, тъй като админът изрично я е избрал).
    ? adminCountries.map(name => [name, destMap[name] || { count: 0, img: null }] as [string, { count: number; img: string | null }])
    // Автоматичен fallback — топ 8 по брой турове, ако админът още не е избрал нищо ръчно.
    : Object.entries(destMap)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 8);

  if (destinations.length === 0) return null;

  // Снимка по приоритет: избраната в Настройки → „<Държава> hero“ от Media Library → снимка на тур
  for (const entry of destinations) {
    const chosen = adminImages[entry[0]] || findCountryHeroImage(allMedia, entry[0]);
    if (chosen) entry[1] = { ...entry[1], img: chosen };
  }

  return (
    <section aria-labelledby="dest-heading" className="bg-white py-20">
      <div className="container mx-auto px-6">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[.3em] text-orange-700">
              Открий
            </span>
            <h2
              id="dest-heading"
              className="font-serif italic font-semibold leading-[1.08] tracking-tight text-brand-dark"
              style={{ fontSize: 'clamp(1.7rem,3vw,2.6rem)' }}
            >
              Дестинации за всеки вкус
            </h2>
          </div>
          <Link
            href="/destinations"
            className="flex items-center gap-1.5 border-b border-brand-gold pb-0.5 text-[9px] font-black uppercase tracking-[.2em] text-slate-600 transition hover:text-brand-goldDeep"
          >
            Всички дестинации →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {destinations.map(([name, { count, img }], i) => {
            const [from, to] =
              FALLBACK_COLORS[name] ?? DEFAULT_FALLBACK[i % DEFAULT_FALLBACK.length];

            return (
              <CountryFilterLink
                key={name}
                // Филтрира каталога по-долу на същата страница (собственикът не иска тук да води към /destinations/…;
                // към страниците на държавите води „Всички дестинации“ горе)
                countrySlug={slugify(name)}
                className="group relative flex h-48 flex-col justify-end overflow-hidden rounded-[1.25rem] transition duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
                style={!img ? { background: `linear-gradient(135deg, ${from}, ${to})` } : undefined}
              >
                {/* Снимка от базата */}
                {img && (
                  <Image
                    src={img}
                    alt={name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}

                {/* Затъмнение отдолу — върху снимка е по-силно, върху градиент е по-нежно */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: img
                      ? 'linear-gradient(to top, rgba(0,0,0,.68) 0%, rgba(0,0,0,.18) 50%, transparent 100%)'
                      : 'linear-gradient(to top, rgba(0,0,0,.42) 0%, transparent 60%)',
                  }}
                />

                <div className="relative px-5 pb-4">
                  <p className="font-serif text-[1.45rem] italic font-semibold leading-none text-white drop-shadow-sm">
                    {name}
                  </p>
                  <p className="mt-0.5 text-[8.5px] font-black uppercase tracking-[.2em] text-white/75">
                    {count} {count === 1 ? 'тур' : 'тура'}
                  </p>
                </div>
              </CountryFilterLink>
            );
          })}
        </div>
      </div>
    </section>
  );
}
