import type { Metadata } from 'next';
import { shareMetadata } from '@/lib/shareMeta';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { getActiveTours } from '@/services/tourService';
import {
  ArrowRight, BookOpen, ChevronDown, CircleHelp, Compass, Globe2, Heart, Home, Phone, Star, Users,
} from 'lucide-react';
import { slugify } from '@/lib/admin-helpers';
import { COUNTRY_TO_CONTINENT } from '@/lib/constants';
import { COMPANY_INFO } from '@/lib/companyInfo';
import { formatPrice } from '@/lib/formatPrice';
import { isOperatorHotlink } from '@/lib/operatorImageDomains';
import { fetchAllMedia, findCountryHeroImage } from '@/lib/media-helpers';
import { normalizeTourDates } from '@/lib/tourDates';
import type { ITour } from '@/types';
import JsonLd from '@/components/JsonLd';
import ContinentLinks from '@/components/destination/ContinentLinks';
import ContinentShape from '@/components/destination/ContinentShape';
import { DestinationInquiryHost, InquiryButton } from '@/components/destination/DestinationInquiry';
import styles from '@/components/sitemap/sitemapAccordion.module.css';

// Карта на сайта: основните страници като плочки, а дестинациите по континенти — всяка държава е падащ ред
// (снимка, име, стрелка) и натискането показва екскурзиите ѝ отдолу. Падащите редове са <details>, затова всички
// линкове към държави и турове са в HTML-а (и за Google), дори когато са затворени.
export const revalidate = 3600;

const SITE_URL = 'https://belivavip.bg';

export const metadata: Metadata = {
  title: 'Карта на сайта',
  description: 'Пълен списък с всички дестинации, екскурзии, статии и информационни страници на Beliva VIP Tour.',
  alternates: { canonical: `${SITE_URL}/sitemaps` },
  ...shareMetadata({
    path: '/sitemaps',
    title: 'Карта на сайта | Beliva VIP Tour',
    description: 'Пълен списък с всички дестинации, екскурзии, статии и информационни страници на Beliva VIP Tour.',
  }),
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Карта на сайта Beliva VIP Tour',
  description: 'Списък с всички екскурзии, блог статии и информационни страници.',
  url: `${SITE_URL}/sitemaps`,
};

const POLI = 'Водена от ПОЛИ';

// Континентите в реда, цветовете и силуетите от /destinations
const CONTINENTS: { key: string; name: string; bg: string; ink: string; shape: string }[] = [
  { key: 'Азия', name: 'Азия', bg: '#fbeadf', ink: '#c0623a', shape: '/assets/continents/asia_tr.png' },
  { key: 'Европа', name: 'Европа', bg: '#e6edf8', ink: '#47679f', shape: '/assets/continents/europe_tr.png' },
  { key: 'Африка', name: 'Африка', bg: '#f7ecd2', ink: '#b07d1c', shape: '/assets/continents/africa_tr.png' },
  { key: 'Северна Америка', name: 'Северна Америка', bg: '#e1eff4', ink: '#2c7a95', shape: '/assets/continents/north_america_tr.png' },
  { key: 'Южна Америка', name: 'Южна Америка', bg: '#e4f1e6', ink: '#3c8a5a', shape: '/assets/continents/south_america_tr.png' },
  { key: 'Австралия', name: 'Австралия и Океания', bg: '#eee8f6', ink: '#7f5aa6', shape: '/assets/continents/australia_tr.png' },
  { key: 'Други', name: 'Други дестинации', bg: '#eef1f4', ink: '#64748b', shape: '/assets/continents/europe_tr.png' },
];

const MAIN_PAGES = [
  { href: '/', label: 'Начало', note: 'Най-новите екскурзии', icon: Home },
  { href: '/#tours-grid', label: 'Всички екскурзии', note: 'Каталог с филтри', icon: Compass },
  { href: '/destinations', label: 'Дестинации', note: 'Държавите по континенти', icon: Globe2 },
  { href: '/blog', label: 'Блог и пътеводител', note: 'Статии и съвети', icon: BookOpen },
  { href: '/about-us', label: 'За нас', note: 'Поли и агенцията', icon: Users },
  { href: '/reviews', label: 'Отзиви', note: 'Мнения на пътували', icon: Star },
  { href: '/faq', label: 'Въпроси и отговори', note: 'Честите въпроси', icon: CircleHelp },
  { href: '/contacts', label: 'Контакти', note: 'Телефон и имейл', icon: Phone },
  { href: '/favorites', label: 'Любими', note: 'Запазените от вас', icon: Heart },
];

const LEGAL_PAGES = [
  { href: '/terms', label: 'Общи условия' },
  { href: '/privacy', label: 'Политика за поверителност' },
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
const longDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const focusRing = 'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-brand-gold';

type TourRow = { id: string; href: string; title: string; price: string | null; next: string | null; poli: boolean };
type Country = { name: string; slug: string; img: string | null; rows: TourRow[]; minPrice: string | null; poli: boolean };

export default async function SitemapPage() {
  const [tours, allMedia] = await Promise.all([getActiveTours(), fetchAllMedia()]);
  const today = new Date().toISOString().split('T')[0];

  let posts: { id: string; href: string; title: string }[] = [];
  try {
    const snap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc')));
    posts = snap.docs
      .map((d) => ({ id: d.id, href: `/blog/${d.data().slug || d.id}`, title: String(d.data().title || '') }))
      .filter((p) => p.title);
  } catch (error) {
    console.error('Error fetching sitemap posts:', error);
  }

  // Групиране: континент → държава → турове (тур с няколко държави влиза във всяка от тях)
  const byCountry = new Map<string, ITour[]>();
  tours.forEach((t) => tourCountries(t).forEach((name) => byCountry.set(name, [...(byCountry.get(name) || []), t])));

  const byContinent = new Map<string, Country[]>();
  byCountry.forEach((list, name) => {
    const found = COUNTRY_TO_CONTINENT[name] || list[0]?.continent?.trim() || 'Други';
    const key = CONTINENTS.some((c) => c.key === found) ? found : 'Други';
    const rows: TourRow[] = list
      .map((t) => ({
        id: t.id,
        href: `/tour/${t.slug || t.tourId || t.id}`,
        title: t.title,
        price: priceNumber(priceOf(t)) !== Infinity ? formatPrice(priceOf(t)) : null,
        next: normalizeTourDates([...(t.dates || []), t.date]).find((d) => d >= today) || null,
        poli: !!t.categories?.includes(POLI),
      }))
      // Най-близкото заминаване първо; без бъдеща дата — накрая
      .sort((a, b) => (a.next || '9999').localeCompare(b.next || '9999') || a.title.localeCompare(b.title, 'bg'));
    const cheapest = [...list].sort((a, b) => priceNumber(priceOf(a)) - priceNumber(priceOf(b)))[0];
    const country: Country = {
      name,
      slug: slugify(name),
      img: findCountryHeroImage(allMedia, name) || list.map((t) => t.img).find((img) => img && !isOperatorHotlink(img)) || null,
      rows: rows.map((r) => ({ ...r, next: r.next ? longDate(r.next) : null })),
      minPrice: cheapest && priceNumber(priceOf(cheapest)) !== Infinity ? formatPrice(priceOf(cheapest)) : null,
      poli: rows.some((r) => r.poli),
    };
    byContinent.set(key, [...(byContinent.get(key) || []), country]);
  });

  const continents = CONTINENTS.filter((c) => byContinent.has(c.key)).map((c) => ({
    ...c,
    id: slugify(c.key),
    countries: byContinent.get(c.key)!.sort((a, b) => a.name.localeCompare(b.name, 'bg')),
  }));

  return (
    // Обвивката е <div>, не <main>: LayoutWrapper вече слага <main> около всяка страница
    <div className="min-h-screen bg-white text-brand-dark">
      <JsonLd data={jsonLd} />
      <DestinationInquiryHost country="" />

      {/* Заглавие */}
      <header className="mx-auto max-w-[960px] px-4 pb-10 pt-[112px] sm:px-6 md:pb-12 md:pt-[140px]">
        <nav aria-label="Навигационна пътека" className="mb-6 px-1">
          <ol className="flex flex-wrap items-center gap-2.5 text-[15px] text-slate-600">
            <li><Link href="/" className={`rounded-sm hover:text-brand-dark ${focusRing}`}>Начало</Link></li>
            <li aria-hidden="true" className="text-slate-400">/</li>
            <li aria-current="page" className="font-semibold text-brand-dark">Карта на сайта</li>
          </ol>
        </nav>
        <h1 className="px-1 font-display text-[clamp(36px,6vw,72px)] font-extrabold uppercase leading-[0.98] tracking-[-0.03em]">
          Карта на сайта
        </h1>
        <p className="mt-5 max-w-[620px] px-1 text-[18px] leading-[1.65] text-slate-700">
          Всички страници на едно място. Изберете страница отдолу или натиснете държава, за да видите нейните екскурзии.
        </p>
      </header>

      <div className="mx-auto flex max-w-[960px] flex-col gap-16 px-4 pb-24 sm:px-6 md:gap-20 md:pb-32">
        {/* ── Основни страници: плочки с икона ── */}
        <section aria-labelledby="main-pages-title">
          <h2 id="main-pages-title" className="mb-6 px-1 font-serif text-[clamp(30px,3.4vw,40px)] italic leading-tight">Основни страници</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MAIN_PAGES.map((p) => (
              <li key={p.href}>
                <Link
                  href={p.href}
                  className={`group flex h-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-[border-color,box-shadow] duration-200 hover:border-brand-gold hover:shadow-[0_10px_24px_-14px_rgba(15,23,42,0.35)] ${focusRing}`}
                >
                  <span aria-hidden="true" className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-cream text-brand-goldDeep transition-colors duration-200 group-hover:bg-brand-gold group-hover:text-brand-dark">
                    <p.icon size={22} strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[18px] font-semibold leading-tight">{p.label}</span>
                    <span className="mt-0.5 block text-[15px] text-slate-600">{p.note}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Дестинации: континент → падащи държави ── */}
        <section aria-labelledby="dest-title">
          <h2 id="dest-title" className="px-1 font-serif text-[clamp(30px,3.4vw,40px)] italic leading-tight">Дестинации и екскурзии</h2>
          <p className="mb-6 mt-2 px-1 text-[17px] text-slate-700">Натиснете държава - отдолу ще се покажат всичките ѝ екскурзии.</p>
          {continents.length > 1 && (
            <div className="mb-10">
              <ContinentLinks continents={continents.map((c) => ({ id: c.id, name: c.name, countries: c.countries.length, bg: c.bg, ink: c.ink, shape: c.shape }))} />
            </div>
          )}

          <div className="flex flex-col gap-6 md:gap-8">
            {continents.map((c) => (
              <section
                key={c.id}
                id={c.id}
                aria-labelledby={`${c.id}-title`}
                style={{ backgroundColor: c.bg }}
                className="scroll-mt-24 rounded-[28px] px-3 pb-3 pt-6 sm:px-5 sm:pb-5 md:rounded-[36px] md:px-7 md:pb-7 md:pt-8"
              >
                <div className="mb-5 flex items-center gap-4 px-2">
                  <ContinentShape src={c.shape} color={c.ink} className="h-14 w-14 shrink-0" />
                  <div>
                    <h3 id={`${c.id}-title`} className="font-serif text-[clamp(28px,3vw,36px)] italic leading-[1.05]">{c.name}</h3>
                    <p className="mt-1 text-[15px] text-slate-700">{plural(c.countries.length, 'държава', 'държави')}</p>
                  </div>
                </div>

                <ul className="flex flex-col gap-2.5">
                  {c.countries.map((k) => (
                    <li key={k.slug}>
                      <details className={`${styles.acc} group overflow-hidden rounded-[22px] bg-white shadow-[0_6px_18px_-12px_rgba(15,23,42,0.35)]`}>
                        <summary className={`flex min-h-[84px] items-center gap-4 rounded-[22px] p-3 pr-4 sm:gap-5 sm:pr-5 ${focusRing}`}>
                          <span className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-2xl bg-slate-200 sm:h-[68px] sm:w-[68px]">
                            {k.img && <Image src={k.img} alt="" fill sizes="68px" className="object-cover" />}
                          </span>
                          <span className="min-w-0 grow">
                            <span className="block font-serif text-[22px] font-semibold leading-tight sm:text-[25px]">{k.name}</span>
                            <span className="mt-1 block text-[15px] text-slate-700 sm:text-[16px]">
                              {plural(k.rows.length, 'екскурзия', 'екскурзии')}
                              {k.minPrice && <>, от <strong className="whitespace-nowrap font-semibold text-brand-dark">{k.minPrice}</strong></>}
                            </span>
                          </span>
                          {k.poli && (
                            <span className="hidden shrink-0 rounded-full bg-brand-gold/15 px-3 py-1 text-sm font-semibold text-brand-goldDeep sm:inline">
                              Водена от Поли
                            </span>
                          )}
                          <span
                            aria-hidden="true"
                            style={{ backgroundColor: c.ink }}
                            className={`${styles.chev} inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white`}
                          >
                            <ChevronDown size={22} strokeWidth={2.4} />
                          </span>
                        </summary>

                        <div className="border-t border-slate-100 px-3 pb-4 pt-2 sm:px-5">
                          <ul className="flex flex-col">
                            {k.rows.map((r) => (
                              <li key={r.id} className="border-b border-slate-100 last:border-b-0">
                                <Link href={r.href} className={`group/tour flex items-center gap-4 rounded-xl px-1 py-3.5 transition-colors hover:bg-brand-cream/60 sm:px-2 ${focusRing}`}>
                                  <span className="min-w-0 grow">
                                    <span className="block text-[17px] font-semibold leading-snug group-hover/tour:underline group-hover/tour:decoration-brand-gold group-hover/tour:decoration-2 group-hover/tour:underline-offset-4">
                                      {r.title}
                                    </span>
                                    <span className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[15px] text-slate-700">
                                      <span>{r.next ? <>Заминаване: <strong className="whitespace-nowrap font-semibold text-brand-dark">{r.next}</strong></> : 'Дата по запитване'}</span>
                                      <span>{r.price ? <>Цена от <strong className="whitespace-nowrap font-semibold text-brand-dark">{r.price}</strong></> : 'Цена по запитване'}</span>
                                      {r.poli && <span className="font-semibold text-brand-goldDeep">Водена от Поли</span>}
                                    </span>
                                  </span>
                                  <ArrowRight size={20} aria-hidden="true" className="shrink-0 text-slate-400 transition-[color,transform] duration-200 group-hover/tour:translate-x-1 group-hover/tour:text-brand-goldDeep" />
                                </Link>
                              </li>
                            ))}
                          </ul>
                          <Link
                            href={`/destinations/${k.slug}`}
                            className={`mt-3 flex min-h-[52px] items-center justify-center gap-2 rounded-full border-2 px-5 text-[16px] font-semibold transition-colors hover:bg-slate-50 ${focusRing}`}
                            style={{ borderColor: c.ink, color: c.ink }}
                          >
                            Страницата на {k.name}
                            <ArrowRight size={18} aria-hidden="true" />
                          </Link>
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {continents.length === 0 && (
              <p className="rounded-3xl bg-brand-mist p-8 text-lg text-slate-700">В момента няма публикувани екскурзии.</p>
            )}
          </div>
        </section>

        {/* ── Блог ── */}
        {posts.length > 0 && (
          <section aria-labelledby="blog-title">
            <h2 id="blog-title" className="mb-6 px-1 font-serif text-[clamp(30px,3.4vw,40px)] italic leading-tight">Блог и пътеводител</h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {posts.map((p) => (
                <li key={p.id}>
                  <Link href={p.href} className={`flex h-full items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 text-[17px] font-semibold transition-colors hover:border-brand-gold ${focusRing}`}>
                    {p.title}
                    <ArrowRight size={18} aria-hidden="true" className="shrink-0 text-slate-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Правна информация ── */}
        <section aria-labelledby="legal-title">
          <h2 id="legal-title" className="mb-5 px-1 font-serif text-[clamp(26px,3vw,32px)] italic leading-tight">Правна информация</h2>
          <ul className="flex flex-wrap gap-3">
            {LEGAL_PAGES.map((p) => (
              <li key={p.href}>
                <Link href={p.href} className={`inline-flex min-h-[48px] items-center gap-2 rounded-full border border-slate-300 px-5 text-[16px] font-medium transition-colors hover:border-brand-gold ${focusRing}`}>
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 px-1 text-[15px] leading-relaxed text-slate-600">
            {COMPANY_INFO.legalName}, ЕИК {COMPANY_INFO.eik}. Лицензирана туристическа агенция, регистрация № {COMPANY_INFO.license}.
          </p>
        </section>
      </div>

      {/* Край — тъмен и стига под ъглите на футъра (-mb-12), като на /destinations */}
      <section aria-labelledby="sitemap-close-title" className="-mb-12 rounded-t-[48px] bg-brand-dark pb-[calc(88px+3rem)] pt-20 text-white md:pt-24">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-end gap-8 px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
          <div>
            <h2 id="sitemap-close-title" className="font-serif text-[clamp(32px,4vw,52px)] font-normal italic leading-[1.08] [text-wrap:balance]">
              Не намирате това, което търсите?
            </h2>
            <p className="mt-5 max-w-[540px] text-[17px] leading-[1.7] text-white/80">
              Обадете ни се или ни напишете — ще ви помогнем да намерите подходящата екскурзия.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <a
              href={`tel:${COMPANY_INFO.phone.replace(/\s/g, '')}`}
              className={`inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-brand-gold px-[26px] text-[15px] font-bold text-brand-dark transition-colors hover:bg-[#e6c65c] ${focusRing}`}
            >
              <Phone size={17} strokeWidth={2.2} aria-hidden="true" />
              {COMPANY_INFO.phone}
            </a>
            <InquiryButton className={`inline-flex min-h-[52px] items-center gap-2.5 rounded-full border border-white/45 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-white/15 ${focusRing}`}>
              Направи запитване
            </InquiryButton>
          </div>
        </div>
      </section>
    </div>
  );
}
