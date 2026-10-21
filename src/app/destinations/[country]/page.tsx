import { getActiveTours } from "@/services/tourService";
import { slugify } from "@/lib/admin-helpers";
import { WORLD_COUNTRIES, COUNTRY_TO_CONTINENT } from "@/lib/constants";
import { fetchAllMedia, findCountryHeroImage } from "@/lib/media-helpers";
import { formatPrice } from "@/lib/formatPrice";
import { isOperatorHotlink } from "@/lib/operatorImageDomains";
import { normalizeTourDates } from "@/lib/tourDates";
import { getCountryGuide } from "@/lib/countryGuide";
import { COMPANY_INFO } from "@/lib/companyInfo";
import type { ITour } from "@/types";
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, Compass, Shield, Star, Users } from 'lucide-react';
import DestinationHero from "@/components/DestinationHero";
import DestinationTourList, { type DestinationTourRow } from "@/components/destination/DestinationTourList";
import { DestinationInquiryHost, InquiryButton } from "@/components/destination/DestinationInquiry";
import CountryFavButton from "@/components/destination/CountryFavButton";
import JsonLd from "@/components/JsonLd";
import Reveal from "@/components/ui/Reveal";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, limit } from "firebase/firestore";

export const revalidate = 3600;
// Първото отваряне на нова държава може да чака ИИ да напише текста „За <държава>“ (5–15 s)
export const maxDuration = 60;

type Props = { params: Promise<{ country: string }> };

const SITE_URL = 'https://belivavip.bg';
const POLI = 'Водена от ПОЛИ';
const POLI_PHOTO = { src: '/guides/poly-10.jpg', alt: 'Поли пред Ангкор Ват, Камбоджа' };

const MONTHS = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември'];

const tourCountryList = (tour: ITour): string[] =>
  typeof tour.country === 'string'
    ? tour.country.split(',').map(c => c.trim()).filter(Boolean)
    : (Array.isArray(tour.country) ? tour.country.filter(Boolean) : []);

const priceOf = (tour: ITour) => String(tour.discountPrice || tour.price || '');
const priceNumber = (raw: string) => {
  const n = parseFloat(raw.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : Infinity;
};

// „2027-03-16“ → „16 март 2027“
const longDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
};

// Името на държавата от адреса. Преди се търсеше само в WORLD_COUNTRIES — за държави извън списъка
// (напр. Френска Полинезия) заглавието в Google излизаше със самия адрес: „Екскурзии до frenska-polineziya“.
// Затова търсим и в държавите на самите турове и в COUNTRY_TO_CONTINENT.
function resolveCountryName(countrySlug: string, tours: ITour[]): string {
  return WORLD_COUNTRIES.find(c => slugify(c) === countrySlug)
    || tours.flatMap(tourCountryList).find(c => slugify(c) === countrySlug)
    || Object.keys(COUNTRY_TO_CONTINENT).find(c => slugify(c) === countrySlug)
    || countrySlug;
}

// Главна снимка: „<Държава> hero“ от Media Library; ако няма — снимката на първия тур
function resolveHeroImage(allMedia: { name?: string; url?: string }[], countryName: string, tours: ITour[]): string | null {
  return findCountryHeroImage(allMedia, countryName) || tours.map(t => t.img).find(img => img && !isOperatorHotlink(img)) || tours[0]?.img || null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const countrySlug = resolvedParams.country;
  const canonicalUrl = `${SITE_URL}/destinations/${countrySlug}`;
  const allTours = await getActiveTours();
  const destinationTours = allTours.filter(tour => tourCountryList(tour).some(c => slugify(c) === countrySlug));
  const countryName = resolveCountryName(countrySlug, destinationTours);
  const rawHero = resolveHeroImage(await fetchAllMedia(), countryName, destinationTours) || '/hero/australia.webp';
  const ogImage = rawHero.startsWith('http') ? rawHero : `${SITE_URL}${rawHero}`;
  const count = destinationTours.length;
  const year = new Date().getFullYear();
  const title = `Екскурзии до ${countryName} ${year}/${year + 1} | Beliva VIP Tour`;
  const description = `${count > 0 ? `${count} оферти` : 'Оферти'} за ${countryName} с водач. Групови пакети с полети, хотели и гид.`;
  return {
    title: { absolute: title }, description,
    alternates: { canonical: canonicalUrl },
    openGraph: { type: 'website', url: canonicalUrl, title, description, images: [{ url: ogImage, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  };
}

function statusOf(tour: ITour): DestinationTourRow['status'] {
  switch (tour.groupStatus) {
    case 'active': return { label: 'Оформяща група', tone: 'gold' };
    case 'confirmed': return { label: 'Потвърдена група', tone: 'green' };
    case 'last-places': return {
      label: tour.spotsLeft ? `Остават ${tour.spotsLeft} ${tour.spotsLeft === 1 ? 'място' : 'места'}` : 'Последни места',
      tone: 'red',
    };
    case 'sold-out': return { label: 'Изчерпана', tone: 'grey' };
    default: return null;
  }
}

export default async function DestinationPage({ params }: Props) {
  const resolvedParams = await params;
  const countrySlug = resolvedParams.country;
  const allTours = await getActiveTours();

  const destinationTours = allTours.filter(tour => tourCountryList(tour).some(c => slugify(c) === countrySlug));
  if (destinationTours.length === 0) notFound();

  const countryName = resolveCountryName(countrySlug, destinationTours);
  const continent = COUNTRY_TO_CONTINENT[countryName] || destinationTours[0]?.continent || null;
  const today = new Date().toISOString().split('T')[0];

  const [allMedia, guide, relatedPosts] = await Promise.all([
    fetchAllMedia(),
    getCountryGuide(countryName),
    // Статии от блога за държавата (публично четими)
    getDocs(query(collection(db, "posts"), where("relatedCountry", "==", countryName), limit(3)))
      .then(snap => snap.docs.map(d => {
        const p = d.data();
        return { id: d.id, title: String(p.title || ''), slug: p.slug as string | undefined, coverImg: p.coverImg as string | undefined };
      }))
      .catch(() => [] as { id: string; title: string; slug?: string; coverImg?: string }[]),
  ]);
  const heroImg = resolveHeroImage(allMedia, countryName, destinationTours) || '/hero/hero-bg.webp';

  // ── Офертите: подредени по следваща дата ──
  const withDates = destinationTours.map(tour => {
    const dates = normalizeTourDates([...(tour.dates || []), tour.date]);
    const future = dates.filter(d => d >= today);
    return { tour, future, next: future[0] || null };
  }).sort((a, b) => (a.next || '9999').localeCompare(b.next || '9999'));

  const cheapest = destinationTours.length > 1
    ? [...destinationTours].sort((a, b) => priceNumber(priceOf(a)) - priceNumber(priceOf(b)))[0]
    : null;

  const rows: DestinationTourRow[] = withDates.map(({ tour, future, next }) => {
    const price = priceOf(tour);
    const slug = tour.slug || tour.tourId || tour.id;
    const img = tour.img && !isOperatorHotlink(tour.img) ? tour.img : null;
    const [y, m, d] = (next || '').split('-');
    return {
      id: tour.id,
      href: `/tour/${slug}`,
      inquirySlug: slug,
      title: tour.title,
      img,
      imgPosition: tour.imgPosition,
      countries: tourCountryList(tour),
      category: tour.categories?.find(c => c !== POLI) || null,
      poli: !!tour.categories?.includes(POLI),
      best: !!cheapest && cheapest.id === tour.id && priceNumber(price) !== Infinity,
      price: priceNumber(price) !== Infinity ? formatPrice(price) : null,
      oldPrice: tour.discountPrice && tour.price && tour.discountPrice !== tour.price ? formatPrice(String(tour.price)) : null,
      date: next ? { day: String(Number(d)), month: MONTHS[Number(m) - 1], year: y } : null,
      moreDates: Math.max(0, future.length - 1),
      status: statusOf(tour),
      favorite: { id: tour.tourId || tour.id, title: tour.title, img: tour.img, price: tour.price, country: tour.country, date: tour.date },
    };
  });

  // ── Фактите в героя ──
  const minPriceTour = [...destinationTours].sort((a, b) => priceNumber(priceOf(a)) - priceNumber(priceOf(b)))[0];
  const minPrice = minPriceTour && priceNumber(priceOf(minPriceTour)) !== Infinity ? formatPrice(priceOf(minPriceTour)) : null;
  const allFuture = [...new Set(withDates.flatMap(w => w.future))].sort();
  const nextDeparture = allFuture[0] ? longDate(allFuture[0]) : null;
  const departures = (() => {
    if (allFuture.length === 0) return null;
    const [fy, fm] = allFuture[0].split('-');
    const [ly, lm] = allFuture[allFuture.length - 1].split('-');
    const first = MONTHS[Number(fm) - 1];
    const last = MONTHS[Number(lm) - 1];
    if (fy === ly) return fm === lm ? `${first} ${fy}` : `${first} – ${last} ${fy}`;
    return `${first} ${fy} – ${last} ${ly}`;
  })();
  const poliRows = rows.filter(r => r.poli);

  // ── Още дестинации: първо от същия континент, после най-търсените ──
  const others = new Map<string, { name: string; tours: ITour[] }>();
  allTours.forEach(tour => tourCountryList(tour).forEach(name => {
    if (slugify(name) === countrySlug) return;
    const entry = others.get(name) || { name, tours: [] };
    entry.tours.push(tour);
    others.set(name, entry);
  }));
  const ranked = [...others.values()].sort((a, b) => {
    const sameA = (COUNTRY_TO_CONTINENT[a.name] || a.tours[0]?.continent) === continent ? 1 : 0;
    const sameB = (COUNTRY_TO_CONTINENT[b.name] || b.tours[0]?.continent) === continent ? 1 : 0;
    return sameB - sameA || b.tours.length - a.tours.length || a.name.localeCompare(b.name, 'bg');
  });
  const moreCards = ranked.slice(0, 4).map(({ name, tours }) => {
    const cheapestOther = [...tours].sort((a, b) => priceNumber(priceOf(a)) - priceNumber(priceOf(b)))[0];
    const price = cheapestOther && priceNumber(priceOf(cheapestOther)) !== Infinity ? formatPrice(priceOf(cheapestOther)) : undefined;
    return {
      slug: slugify(name),
      name,
      region: COUNTRY_TO_CONTINENT[name] || tours[0]?.continent || '',
      tours: tours.length,
      price,
      img: resolveHeroImage(allMedia, name, tours) || undefined,
    };
  });
  const morePills = ranked.slice(4, 10).map(o => o.name);

  const jsonLd = {
    "@context": "https://schema.org", "@type": "ItemList",
    "name": `Екскурзии до ${countryName}`, "url": `${SITE_URL}/destinations/${countrySlug}`,
    "numberOfItems": destinationTours.length,
    "itemListElement": rows.slice(0, 10).map((row, i) => ({
      "@type": "ListItem", "position": i + 1, "name": row.title, "url": `${SITE_URL}${row.href}`,
    })),
  };

  const guideSections = guide ? [
    { title: 'История', text: guide.history, lead: true },
    { title: 'География', text: guide.geography },
    { title: 'Икономика', text: guide.economy },
    { title: 'Интересно', text: guide.facts },
  ].filter(s => s.text) : [];

  const pillars = [
    { icon: Users, title: 'Малки групи', desc: 'Внимание към всеки. Без тълпи.' },
    { icon: Compass, title: poliRows.length > 0 ? 'Водена от Поли' : 'Опитен водач', desc: poliRows.length > 0 ? 'Лично присъствие и местни тайни.' : 'Дестинацията — позната в детайли.' },
    { icon: Shield, title: 'Гарантирано', desc: 'Планирано и проверено.' },
    { icon: Star, title: 'Подбрани места', desc: 'По-добре от всеки каталог.' },
  ];

  const eyebrow = (text: string, light = false) => (
    <p className={`mb-[18px] flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.22em] ${light ? 'text-brand-gold' : 'text-brand-goldDeep'}`}>
      <span aria-hidden="true" className={`h-px w-9 ${light ? 'bg-brand-gold' : 'bg-brand-goldDeep'}`} />
      {text}
    </p>
  );
  const focusRing = 'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-brand-gold';

  // Обвивката е <div>, не <main>: LayoutWrapper вече слага <main> около всяка страница.
  return (
    <div className="bg-[#f7f4ee] text-brand-dark">
      <JsonLd data={jsonLd} />
      <DestinationInquiryHost country={countryName} />

      {/* ═══ 1. ГЕРОЙ ═══ */}
      <DestinationHero
        countryName={countryName}
        heroImg={heroImg}
        continent={continent}
        tagline={guide?.tagline || 'Групови пакети с полети, хотели и водач.'}
        tourCount={destinationTours.length}
        minPrice={minPrice}
        nextDeparture={nextDeparture}
        departures={departures}
        poliCount={poliRows.length}
        favorite={{ slug: countrySlug, name: countryName, img: heroImg, region: continent || undefined, tours: destinationTours.length, price: minPrice || undefined }}
      />

      {/* ═══ 2. ОФЕРТИ ═══ */}
      <section id="oferti" aria-labelledby="oferti-title" className="scroll-mt-20 py-20 md:pb-[104px] md:pt-24">
        <div className="mx-auto max-w-[1240px] px-6">
          <DestinationTourList tours={rows} countryName={countryName} />
          <p className="mt-8 text-[15px] text-slate-600">
            Търсите по месец или тип пътуване?{' '}
            <Link href={`/?country=${countrySlug}#tours-grid`} className={`inline-flex items-center gap-1 rounded-sm font-semibold text-brand-goldDeep underline decoration-brand-gold decoration-2 underline-offset-4 hover:text-brand-dark ${focusRing}`}>
              Филтрирайте офертите за {countryName} в каталога
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </p>
        </div>
      </section>

      {/* ═══ 3. ЗА ДЪРЖАВАТА — собствен текст (до 200 думи), написан от ИИ (src/lib/countryGuide.ts) ═══ */}
      {guideSections.length > 0 && (
        <section id="za-durzhavata" aria-labelledby="about-title" className="border-y border-brand-dark/[0.08] bg-[#fffdf8] py-20 md:py-[104px]">
          <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-8 px-6 min-[1081px]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] min-[1081px]:gap-16">
            <Reveal>
              {eyebrow('Опознайте дестинацията')}
              <h2 id="about-title" className="font-serif text-[clamp(40px,5vw,64px)] font-normal italic leading-none tracking-[-0.015em]">За {countryName}</h2>
              <p className="mt-5 text-sm text-slate-600">Около 1 минута четене</p>
            </Reveal>
            <div className="flex max-w-[760px] flex-col gap-7">
              {guideSections.map((s, i) => (
                <Reveal key={s.title} delay={i * 0.08} y={16}>
                  <div className={`grid grid-cols-1 gap-1.5 min-[721px]:grid-cols-[120px_minmax(0,1fr)] min-[721px]:gap-6 ${i > 0 ? 'border-t border-brand-dark/10 pt-7' : ''}`}>
                    <h3 className="mt-1 text-[13px] font-semibold uppercase tracking-[0.14em] text-brand-goldDeep">{s.title}</h3>
                    <p className={s.lead
                      ? 'font-serif text-xl leading-[1.55] text-brand-dark [text-wrap:pretty] sm:text-[23px]'
                      : 'text-[17px] leading-[1.75] text-slate-700 [text-wrap:pretty]'}
                    >
                      {s.text}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ 4. ПОЛИ — само ако има екскурзия, водена от нея ═══ */}
      {poliRows.length > 0 && (
        <section id="poli" aria-labelledby="poli-title" className="relative scroll-mt-20 overflow-hidden bg-brand-dark py-20 text-white md:py-28">
          <svg aria-hidden="true" viewBox="0 0 1440 600" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-[0.07]" fill="none" stroke="#d4af37" strokeWidth="1.2">
            <path d="M0 470 C 240 380, 420 520, 700 400 S 1180 300, 1440 380" />
            <path d="M0 500 C 260 410, 440 550, 720 430 S 1200 330, 1440 410" />
            <path d="M0 530 C 280 440, 460 580, 740 460 S 1220 360, 1440 440" />
            <path d="M0 120 C 300 60, 520 200, 820 110 S 1240 40, 1440 90" />
            <path d="M0 150 C 320 90, 540 230, 840 140 S 1260 70, 1440 120" />
          </svg>
          <div className="relative mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <figure>
                <div className="reveal-wipe relative aspect-[4/3] overflow-hidden rounded-[200px_200px_28px_28px] bg-slate-800">
                  <Image src={POLI_PHOTO.src} alt={POLI_PHOTO.alt} fill sizes="(max-width: 1024px) 100vw, 600px" className="object-cover object-[50%_40%]" />
                </div>
                <figcaption className="mt-3.5 text-sm text-white/[0.72]">Поли — основател на Beliva VIP Tour и водач</figcaption>
              </figure>
            </Reveal>
            <Reveal delay={0.1}>
              {eyebrow('Водена от Поли', true)}
              <h2 id="poli-title" className="font-serif text-[clamp(34px,4vw,52px)] font-normal italic leading-[1.12] tracking-[-0.01em] [text-wrap:pretty]">
                Поли познава {countryName} лично — <span className="text-brand-gold">знае тайните места.</span>
              </h2>
              <p className="mt-6 max-w-[520px] text-[17px] leading-[1.7] text-white/80">
                Лично присъствие и местни тайни. {poliRows.length === 1 ? `Тази екскурзия до ${countryName} е водена лично от Поли:` : `Тези екскурзии до ${countryName} са водени лично от Поли:`}
              </p>
              <ul className="mt-7 flex max-w-[560px] flex-col gap-3">
                {poliRows.map(r => (
                  <li key={r.id}>
                    <Link href={r.href} className={`group flex flex-wrap items-center gap-5 rounded-[22px] border border-brand-gold/35 bg-brand-gold/[0.07] px-[22px] py-5 transition-colors hover:bg-brand-gold/[0.12] ${focusRing}`}>
                      {r.img && (
                        <span className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl">
                          <Image src={r.img} alt="" fill sizes="72px" className="object-cover" />
                        </span>
                      )}
                      <span className="flex min-w-0 flex-[1_1_200px] flex-col gap-1">
                        <span className="text-base font-semibold leading-snug">{r.title}</span>
                        <span className="text-sm text-white/75">
                          {r.date ? `${r.date.day} ${r.date.month} ${r.date.year}` : 'Дата по запитване'}
                          {r.price && <> · от <strong className="text-brand-gold">{r.price}</strong></>}
                        </span>
                      </span>
                      <span aria-hidden="true" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-gold text-brand-dark transition-transform group-hover:translate-x-0.5">
                        <ArrowRight size={18} strokeWidth={2.2} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {COMPANY_INFO.socials.tiktok && (
                <a href={COMPANY_INFO.socials.tiktok} target="_blank" rel="noopener noreferrer" className={`mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-sm text-[15px] font-medium text-white/90 underline decoration-white/30 underline-offset-4 hover:text-white ${focusRing}`}>
                  Следвайте Поли в TikTok · @{COMPANY_INFO.socials.tiktokHandle}
                </a>
              )}
            </Reveal>
          </div>
        </section>
      )}

      {/* ═══ 5. ЗАЩО С BELIVA ═══ */}
      <section aria-labelledby="zashto-title" className="py-20 md:py-28">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-start gap-14 px-6 lg:grid-cols-2">
          <Reveal>
            {eyebrow('Защо с Beliva')}
            <h2 id="zashto-title" className="font-serif text-[clamp(38px,4.6vw,60px)] font-normal italic leading-[1.06] tracking-[-0.015em]">
              Изживяването, <span className="text-brand-goldDeep">не само пейзажът</span>
            </h2>
            <p className="mt-7 max-w-[500px] text-[17px] leading-[1.75] text-slate-600">
              Нашите групи са малки, маршрутите — внимателно подбрани, а водачите познават дестинацията лично. Всяка екскурзия е история, не просто списък с градове.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <InquiryButton className={`inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-brand-dark px-[26px] text-[15px] font-semibold text-white transition-colors hover:bg-slate-800 ${focusRing}`}>
                Направи запитване
                <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
              </InquiryButton>
              <p className="text-sm text-slate-600">Лицензирана туристическа агенция · {COMPANY_INFO.license}</p>
            </div>
            {relatedPosts.length > 0 && (
              <div className="mt-10">
                <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-brand-goldDeep">Пътеводител за {countryName}</p>
                <ul className="flex flex-col gap-2">
                  {relatedPosts.map(post => (
                    <li key={post.id}>
                      <Link href={`/blog/${post.slug || post.id}`} className={`group inline-flex items-center gap-2 rounded-sm text-[15px] font-semibold text-brand-dark hover:text-brand-goldDeep ${focusRing}`}>
                        {post.title}
                        <ArrowUpRight size={15} aria-hidden="true" className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Reveal>

          <ul className="grid grid-cols-1 border-t border-brand-dark/[0.14] sm:grid-cols-2">
            {pillars.map(({ icon: Icon, title, desc }, i) => (
              <li key={title} className="border-b border-brand-dark/[0.14] py-7 pr-6">
                <Reveal delay={i * 0.06} y={16}>
                  <span className="flex items-center justify-between">
                    <Icon size={26} strokeWidth={1.6} aria-hidden="true" className="text-brand-goldDeep" />
                    <span aria-hidden="true" className="font-display text-xs text-slate-500">{String(i + 1).padStart(2, '0')}</span>
                  </span>
                  <h3 className="mt-3 text-[19px] font-semibold">{title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{desc}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ═══ 6. ОЩЕ ДЕСТИНАЦИИ ═══ — стига под заоблените ъгли на футъра (-mb-12), за да няма светла ивица между тях */}
      {moreCards.length > 0 && (
        <section aria-labelledby="more-title" className="-mb-12 rounded-t-[48px] bg-brand-dark pb-[calc(96px+3rem)] pt-20 text-white md:pt-[104px]">
          <div className="mx-auto max-w-[1240px] px-6">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <div>
                {eyebrow('Открийте повече', true)}
                <h2 id="more-title" className="font-serif text-[clamp(34px,4vw,52px)] font-normal italic leading-[1.08]">Още дестинации</h2>
              </div>
              <Link href="/#tours-grid" className={`inline-flex min-h-[48px] items-center gap-2.5 rounded-full bg-brand-gold px-[22px] text-sm font-bold text-brand-dark transition-colors hover:bg-[#e6c65c] ${focusRing}`}>
                Всички оферти
                <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
              </Link>
            </div>

            <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
              {moreCards.map((d, i) => (
                <li key={d.slug}>
                  <Reveal delay={i * 0.06} y={16}>
                    <article className="group relative aspect-[4/5] overflow-hidden rounded-3xl bg-slate-800">
                      {d.img && (
                        <Image src={d.img} alt="" fill sizes="(max-width: 480px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover transition-transform duration-[800ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.06]" />
                      )}
                      <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,17,32,.25)_0%,rgba(11,17,32,0)_30%,rgba(11,17,32,0)_45%,rgba(11,17,32,.88)_100%)]" />
                      <Link
                        href={`/destinations/${d.slug}`}
                        aria-label={`${d.name} — виж екскурзиите`}
                        className={`absolute inset-0 z-[1] rounded-3xl ${focusRing}`}
                      />
                      <span className="pointer-events-none absolute inset-x-[22px] bottom-[22px] flex flex-col gap-1">
                        {d.region && <span className="text-[13px] text-white/[0.82]">{d.region}</span>}
                        <span className="font-serif text-[28px] font-medium leading-[1.1]">{d.name}</span>
                        <span className="text-sm text-white/[0.88]">
                          {d.tours} {d.tours === 1 ? 'оферта' : 'оферти'}
                          {d.price && <> · от <strong className="text-brand-gold">{d.price}</strong></>}
                        </span>
                      </span>
                      <CountryFavButton country={d} variant="card" />
                    </article>
                  </Reveal>
                </li>
              ))}
            </ul>

            {morePills.length > 0 && (
              <div className="mt-7 flex flex-wrap items-center gap-2.5">
                <span className="mr-1.5 text-sm text-white/[0.72]">Също:</span>
                {morePills.map(name => (
                  <Link
                    key={name}
                    href={`/destinations/${slugify(name)}`}
                    className={`inline-flex min-h-[44px] items-center rounded-full border border-white/25 px-[18px] text-sm font-medium text-white/90 transition-colors hover:border-brand-gold hover:text-white ${focusRing}`}
                  >
                    {name}
                  </Link>
                ))}
                <Link href="/destinations" className={`ml-1 inline-flex min-h-[44px] items-center gap-1.5 rounded-sm px-2 text-sm font-semibold text-brand-gold hover:text-white ${focusRing}`}>
                  Всички дестинации <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
