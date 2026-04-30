import { getActiveTours } from "@/services/tourService";
import ToursGrid from "@/components/sections/ToursGrid";
import { slugify } from "@/lib/admin-helpers";
import { WORLD_COUNTRIES } from "@/lib/constants";
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Globe, Users, Shield, Star, ArrowRight, Compass, BookOpen, ArrowUpRight } from 'lucide-react';
import DestinationHero from "@/components/DestinationHero";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, limit } from "firebase/firestore";

export const revalidate = 3600;

type Props = { params: Promise<{ country: string }> };

const SITE_URL = 'https://belivavip.bg';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const countrySlug = resolvedParams.country;
  const countryName = WORLD_COUNTRIES.find(c => slugify(c) === countrySlug) || countrySlug;
  const canonicalUrl = `${SITE_URL}/destinations/${countrySlug}`;
  const allTours = await getActiveTours();
  const destinationTours = allTours.filter(tour => {
    const tourCountries = typeof tour.country === 'string'
      ? tour.country.split(',').map(c => c.trim())
      : (Array.isArray(tour.country) ? tour.country : []);
    return tourCountries.some(c => slugify(c) === countrySlug);
  });
  const rawHero = destinationTours[0]?.img || '/hero/australia.webp';
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

export default async function DestinationPage({ params }: Props) {
  const resolvedParams = await params;
  const countrySlug = resolvedParams.country;
  const allTours = await getActiveTours();

  const destinationTours = allTours.filter(tour => {
    const tourCountries = typeof tour.country === 'string'
      ? tour.country.split(',').map(c => c.trim())
      : (Array.isArray(tour.country) ? tour.country : []);
    return tourCountries.some(c => slugify(c) === countrySlug);
  });

  if (destinationTours.length === 0) notFound();

  const countryName = WORLD_COUNTRIES.find(c => slugify(c) === countrySlug) || countrySlug;
  const heroImg = destinationTours[0]?.img || '/hero/hero-bg.webp';
  const hasPoliTours = destinationTours.some(t => t.categories?.includes('Водена от ПОЛИ'));

  // Min price
  const minPrice = destinationTours.reduce<string | null>((acc, tour) => {
    const raw = (tour.discountPrice || tour.price || '').toString();
    const num = parseFloat(raw.replace(/[^\d.]/g, ''));
    if (isNaN(num)) return acc;
    if (!acc) return raw;
    return num < parseFloat(acc.replace(/[^\d.]/g, '')) ? raw : acc;
  }, null);

  // Fetch related blog posts (publicly readable)
  let relatedPosts: { id: string; title: string; slug?: string; coverImg?: string; excerpt?: string }[] = [];
  try {
    const q = query(collection(db, "posts"), where("relatedCountry", "==", countryName), limit(3));
    const snap = await getDocs(q);
    relatedPosts = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  } catch { /* posts will be empty — no crash */ }

  // Other destinations
  const relatedCountries = Array.from(new Set(
    allTours
      .filter(t => !destinationTours.some(dt => dt.id === t.id))
      .flatMap(t => Array.isArray(t.country) ? t.country : (typeof t.country === 'string' ? t.country.split(',').map(c => c.trim()) : []))
      .filter(Boolean)
  )).slice(0, 8);

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org", "@type": "ItemList",
    "name": `Екскурзии до ${countryName}`, "url": `${SITE_URL}/destinations/${countrySlug}`,
    "numberOfItems": destinationTours.length,
    "itemListElement": destinationTours.slice(0, 10).map((tour, i) => ({
      "@type": "ListItem", "position": i + 1, "name": tour.title,
      "url": `${SITE_URL}/tour/${tour.slug || tour.tourId || tour.id}`,
    }))
  };

  const trustPillars = [
    { icon: Users, title: "Малки групи", desc: "Внимание към всеки. Без тълпи." },
    { icon: Compass, title: hasPoliTours ? "Водена от Поли" : "Опитен водач", desc: hasPoliTours ? "Лично присъствие и местни тайни." : "Дестинацията — позната в детайли." },
    { icon: Shield, title: "Гарантирано", desc: "Планирано и проверено." },
    { icon: Star, title: "Подбрани места", desc: "По-добре от всеки каталог." },
  ];

  return (
    <main className="min-h-screen bg-[#f7f4ee]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── 1. HERO ── */}
      <DestinationHero
        countryName={countryName} heroImg={heroImg}
        tourCount={destinationTours.length} minPrice={minPrice} hasPoliTours={hasPoliTours}
      />

      {/* ── 2. EDITORIAL — broken asymmetric layout ── */}
      <div className="bg-[#0f1724] text-white overflow-hidden relative">

        {/* Large decorative background number */}
        <div className="absolute right-0 top-0 bottom-0 flex items-center pointer-events-none select-none overflow-hidden">
          <span className="text-[20rem] font-serif italic font-bold text-white/[0.025] leading-none translate-x-20">
            {countryName.charAt(0)}
          </span>
        </div>

        <div className="container mx-auto px-6 py-24 relative z-10">

          {/* Top row: label + trust pills (horizontal, breaks the vertical grid) */}
          <div className="flex flex-wrap items-center gap-3 mb-16">
            <div className="h-px w-10 bg-brand-gold shrink-0" />
            <span className="text-brand-gold text-[10px] font-black uppercase tracking-[0.3em] shrink-0">
              Защо {countryName}?
            </span>
            <div className="h-px flex-grow bg-white/5 hidden md:block" />
            {/* Trust pills inline — breaks the boxy 2x2 */}
            {trustPillars.map(({ icon: Icon, title }) => (
              <div key={title} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/50 text-[10px] font-bold uppercase tracking-wider">
                <Icon size={10} className="text-brand-gold shrink-0" />
                {title}
              </div>
            ))}
          </div>

          {/* Main editorial grid — intentionally asymmetric */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

            {/* Left: large pull quote — takes 7 cols */}
            <div className="lg:col-span-7">
              <div className="relative">
                {/* Giant opening quote */}
                <span className="absolute -top-8 -left-4 text-8xl text-brand-gold/20 font-serif leading-none select-none">"</span>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif italic text-white leading-[1.1] pl-6 mb-10">
                  Изживяването,<br />
                  <span className="text-brand-gold">не само пейзажът</span>
                </h2>
              </div>

              <p className="text-white/50 text-lg leading-relaxed font-light mb-10 pl-6 border-l border-white/10">
                Открийте {countryName} по начин, по който повечето туристи никога не го виждат.
                Нашите групи са малки, маршрутите — внимателно подбрани, а водачите познават
                дестинацията лично. Всяка екскурзия е история, не просто списък с градове.
              </p>

              {/* Поли card — only if applicable */}
              {hasPoliTours && (
                <div className="ml-6 flex items-center gap-4 p-5 rounded-2xl border border-brand-gold/20 bg-brand-gold/5">
                  <div className="w-11 h-11 rounded-full bg-brand-gold flex items-center justify-center text-brand-dark font-serif font-bold text-xl shrink-0">П</div>
                  <div>
                    <p className="text-brand-gold font-bold text-sm">Водена от Поли</p>
                    <p className="text-white/45 text-xs mt-0.5">Поли познава {countryName} лично — знае тайните места.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right: blog posts — takes 5 cols, offset downward on desktop */}
            <div className="lg:col-span-5 lg:pt-16">
              <div className="flex items-center gap-3 mb-6">
                <BookOpen size={14} className="text-brand-gold" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">
                  Пътеводител за {countryName}
                </span>
              </div>

              {relatedPosts.length > 0 ? (
                <div className="space-y-3">
                  {relatedPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/blog/${post.slug || post.id}`}
                      className="group flex items-start gap-4 p-4 rounded-2xl border border-white/8 bg-white/4 hover:bg-white/8 hover:border-brand-gold/30 transition-all"
                    >
                      {/* Post thumbnail */}
                      {post.coverImg && (
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                          <Image src={post.coverImg} alt={post.title} fill className="object-cover" sizes="64px" />
                        </div>
                      )}
                      <div className="flex-grow min-w-0">
                        <p className="text-white/80 text-sm font-bold leading-snug group-hover:text-brand-gold transition-colors line-clamp-2">
                          {post.title}
                        </p>
                        {post.excerpt && (
                          <p className="text-white/35 text-xs mt-1 line-clamp-1">{post.excerpt}</p>
                        )}
                      </div>
                      <ArrowUpRight size={14} className="text-white/20 group-hover:text-brand-gold shrink-0 mt-1 transition-colors" />
                    </Link>
                  ))}

                  <Link
                    href={`/blog?country=${countrySlug}`}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-brand-gold transition-colors pt-2 pl-1"
                  >
                    <span>Всички статии</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              ) : (
                /* No posts yet — show a teaser card */
                <div className="p-6 rounded-2xl border border-dashed border-white/10 text-center">
                  <BookOpen size={24} className="text-white/20 mx-auto mb-3" />
                  <p className="text-white/30 text-sm font-medium">Очаквайте скоро<br />статии за {countryName}</p>
                  <Link
                    href="/blog"
                    className="inline-flex items-center gap-1.5 mt-4 text-[10px] font-black uppercase tracking-widest text-brand-gold/60 hover:text-brand-gold transition-colors"
                  >
                    Разгледай пътеводителя <ArrowRight size={10} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Diagonal bottom edge — breaks the straight horizontal line */}
        <div className="h-16 relative overflow-hidden">
          <div
            className="absolute inset-x-0 bottom-0 h-32 bg-[#f7f4ee]"
            style={{ clipPath: "polygon(0 100%, 100% 40%, 100% 100%)" }}
          />
        </div>
      </div>

      {/* ── 3. TOURS ── */}
      <div id="tours-list" className="scroll-mt-20 -mt-1">
        <div className="bg-[#f7f4ee] border-b border-brand-gold/15">
          <div className="container mx-auto px-6 pt-4 pb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <span className="text-brand-gold text-[10px] font-black uppercase tracking-[0.3em] block mb-2">Избрани оферти</span>
                <h2 className="text-4xl md:text-5xl font-serif italic text-brand-dark">
                  Екскурзии до <span className="text-brand-gold">{countryName}</span>
                </h2>
              </div>
              <div className="text-right shrink-0">
                <p className="text-5xl font-serif font-bold text-brand-dark/70 leading-none">{destinationTours.length}</p>
              </div>
            </div>
          </div>
        </div>
        <ToursGrid initialTours={destinationTours} hideFilters={true} />
      </div>

      {/* ── 4. EXPLORE MORE ── */}
      {relatedCountries.length > 0 && (
        <div className="bg-[#f7f4ee] px-0 pt-0 pb-0">
          {/* Dark pill — rounded on all four corners so it floats above the footer */}
          <div className="bg-[#0f1724] rounded-b-[3rem] py-20">
            <div className="container mx-auto px-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px w-8 bg-brand-gold/40" />
                    <span className="text-brand-gold text-[10px] font-black uppercase tracking-[0.3em]">Открийте повече</span>
                  </div>
                  <h3 className="text-3xl font-serif italic text-white">Още дестинации</h3>
                </div>
                <Link
                  href="/#tours-grid"
                  className="inline-flex items-center gap-3 bg-brand-gold text-brand-dark px-7 py-3.5 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-amber-400 transition-all shadow-lg shadow-brand-gold/20 shrink-0 group"
                >
                  <Globe size={14} className="group-hover:rotate-12 transition-transform" />
                  Всички оферти
                </Link>
              </div>

              <div className="flex flex-wrap gap-2">
                {relatedCountries.map(country => (
                  <Link
                    key={country}
                    href={`/destinations/${slugify(country)}`}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 text-white/55 text-sm font-medium hover:border-brand-gold hover:text-brand-gold transition-all hover:bg-brand-gold/5"
                  >
                    {country}
                    <ArrowRight size={11} />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Golden ornamental separator between the dark section and the footer */}
          <div className="flex items-center justify-center gap-0 py-6 px-6">
            <div className="flex-grow h-px bg-gradient-to-r from-transparent to-brand-gold/50" />
            <div className="flex items-center gap-2 px-5">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
              <div className="w-8 h-px bg-brand-gold" />
              <div className="w-2.5 h-2.5 rounded-full border-2 border-brand-gold" />
              <div className="w-8 h-px bg-brand-gold" />
              <div className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
            </div>
            <div className="flex-grow h-px bg-gradient-to-l from-transparent to-brand-gold/50" />
          </div>
        </div>
      )}
    </main>
  );
}
