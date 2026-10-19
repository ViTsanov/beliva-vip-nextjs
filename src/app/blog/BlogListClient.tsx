'use client';

import { useMemo, useRef, type CSSProperties } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BookOpen, Clock, MapPin } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';
import { slugify } from '@/lib/admin-helpers';
import { COUNTRY_TO_CONTINENT, canonicalCountry } from '@/lib/constants';
import type { BlogPost, BlogDestination } from './page';

// Пътеводителят (/blog): заглавие, водеща статия, филтър по континент и държава, мрежа от статии и „По дестинация“.
// Филтърът живее в адреса (?continent=…&country=…) — линк от страница на държава (/blog?country=peru) отваря
// направо нейните статии, а смяната му заменя адреса, без да трупа история (Назад излиза от блога).

const CONTINENT_ORDER = ['Азия', 'Европа', 'Африка', 'Северна Америка', 'Южна Америка', 'Австралия'];
// Старите адреси бяха с английски ключове (?continent=asia)
const LEGACY_CONTINENTS: Record<string, string> = { asia: 'Азия', europe: 'Европа', africa: 'Африка', oceania: 'Австралия' };

const focusRing = 'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-brand-gold';
const rise = (d: number) => ({ '--d': `${d}s` }) as CSSProperties;

function continentOf(post: BlogPost): string | null {
  const country = post.relatedCountry ? canonicalCountry(post.relatedCountry) : '';
  return (country && COUNTRY_TO_CONTINENT[country]) || post.relatedContinent || null;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Sofia' });
}

const postHref = (post: BlogPost) => `/blog/${post.slug || post.id}`;
const articlesLabel = (n: number) => `${n} ${n === 1 ? 'статия' : 'статии'}`;

function Meta({ post, light = false }: { post: BlogPost; light?: boolean }) {
  const date = formatDate(post.createdAt);
  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] ${light ? 'text-white/75' : 'text-slate-600'}`}>
      {date && <time dateTime={post.createdAt || undefined}>{date}</time>}
      {post.readTime ? (
        <>
          {date && <span aria-hidden="true">·</span>}
          <span className="inline-flex items-center gap-1"><Clock size={13} aria-hidden="true" />{post.readTime} мин. четене</span>
        </>
      ) : null}
    </p>
  );
}

function CountryPill({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-brand-dark shadow-sm">
      <MapPin size={12} aria-hidden="true" className="text-brand-goldDeep" />
      {name}
    </span>
  );
}

// Водещата (най-новата) статия — голяма снимка и текст до нея
function FeaturedPost({ post }: { post: BlogPost }) {
  return (
    <article className="group relative grid grid-cols-1 overflow-hidden rounded-[28px] border border-brand-dark/10 bg-[#fffdf8] shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_50px_-32px_rgba(15,23,42,0.4)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-800 lg:aspect-auto lg:min-h-[440px]">
        {post.coverImg && (
          <Image
            src={post.coverImg}
            alt=""
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-105"
          />
        )}
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-brand-gold px-3 py-1.5 text-xs font-bold text-brand-dark">Най-нова</span>
          {post.relatedCountry && <CountryPill name={post.relatedCountry} />}
        </div>
      </div>
      <div className="flex flex-col justify-center gap-5 p-7 sm:p-10 lg:p-12">
        <Meta post={post} />
        <h2 className="font-serif text-[clamp(28px,3.2vw,44px)] font-medium leading-[1.12] tracking-[-0.015em] text-brand-dark [text-wrap:pretty]">
          {/* Целият картон е линк чрез ::after — така има един фокус и един линк към статията */}
          <Link href={postHref(post)} className={`rounded-sm after:absolute after:inset-0 after:content-[''] hover:text-brand-goldDeep ${focusRing}`}>
            {post.title}
          </Link>
        </h2>
        {post.excerpt && <p className="line-clamp-4 text-[17px] leading-[1.7] text-slate-600">{post.excerpt}</p>}
        <span aria-hidden="true" className="inline-flex w-fit items-center gap-2.5 rounded-full bg-brand-dark px-6 py-3.5 text-[15px] font-semibold text-white transition-colors group-hover:bg-slate-800">
          Прочети историята
          <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </article>
  );
}

function PostCard({ post }: { post: BlogPost }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-brand-dark/10 bg-[#fffdf8] shadow-[0_1px_0_rgba(15,23,42,0.04),0_18px_40px_-30px_rgba(15,23,42,0.35)] transition-shadow duration-300 hover:shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_48px_-26px_rgba(15,23,42,0.45)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-800">
        {post.coverImg && (
          <Image
            src={post.coverImg}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-105"
          />
        )}
        {post.relatedCountry && <span className="absolute bottom-3 left-3"><CountryPill name={post.relatedCountry} /></span>}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <Meta post={post} />
        <h3 className="font-serif text-[22px] font-medium leading-[1.25] text-brand-dark [text-wrap:pretty]">
          <Link href={postHref(post)} className={`rounded-sm after:absolute after:inset-0 after:content-[''] group-hover:text-brand-goldDeep ${focusRing}`}>
            {post.title}
          </Link>
        </h3>
        {post.excerpt && <p className="line-clamp-2 text-[15px] leading-relaxed text-slate-600">{post.excerpt}</p>}
        <span aria-hidden="true" className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-brand-goldDeep">
          Прочети <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </article>
  );
}

// Карта на държава (снимка, име, брой) — за „По дестинация“ и за празния пътеводител
function DestinationTile({ name, img, caption, href, onSelect }: { name: string; img?: string; caption: string; href?: string; onSelect?: () => void }) {
  const inner = (
    <>
      {img && <Image src={img} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.06]" />}
      <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,17,32,0)_35%,rgba(11,17,32,.85)_100%)]" />
      <span className="absolute inset-x-4 bottom-4 flex flex-col gap-0.5 text-left text-white">
        <span className="font-serif text-xl font-medium leading-tight">{name}</span>
        <span className="text-[13px] text-white/85">{caption}</span>
      </span>
    </>
  );
  const cls = `group relative block aspect-[4/5] w-full overflow-hidden rounded-3xl bg-slate-800 ${focusRing}`;
  return href
    ? <Link href={href} className={cls}>{inner}</Link>
    : <button type="button" onClick={onSelect} className={cls} aria-label={`${name} — ${caption}`}>{inner}</button>;
}

export default function BlogListClient({ posts, destinations }: { posts: BlogPost[]; destinations: BlogDestination[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filterRef = useRef<HTMLDivElement>(null);

  // Държави и континенти, за които има статии
  const countries = useMemo(() => {
    const map = new Map<string, { name: string; slug: string; posts: BlogPost[] }>();
    posts.forEach((p) => {
      if (!p.relatedCountry) return;
      const name = p.relatedCountry;
      const entry = map.get(name) || { name, slug: slugify(name), posts: [] };
      entry.posts.push(p);
      map.set(name, entry);
    });
    return [...map.values()].sort((a, b) => b.posts.length - a.posts.length || a.name.localeCompare(b.name, 'bg'));
  }, [posts]);

  const continents = useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach((p) => {
      const c = continentOf(p);
      if (c) counts.set(c, (counts.get(c) || 0) + 1);
    });
    return CONTINENT_ORDER.filter((c) => counts.has(c)).map((c) => ({ name: c, slug: slugify(c), count: counts.get(c)! }));
  }, [posts]);

  // Филтърът от адреса: континент по slug (или стар английски ключ), държава по slug или по име
  const continentParam = searchParams.get('continent') || '';
  const countryParam = searchParams.get('country') || '';
  const selectedContinent = continents.find((c) => c.slug === continentParam || c.name === LEGACY_CONTINENTS[continentParam])?.name || null;
  const selectedCountry = countries.find((c) => c.slug === countryParam || c.name === countryParam) || null;
  const activeContinent = selectedCountry ? continentOf(selectedCountry.posts[0]) : selectedContinent;

  const setFilter = (next: { continent?: string | null; country?: string | null }, scroll = false) => {
    const params = new URLSearchParams();
    if (next.continent) params.set('continent', slugify(next.continent));
    if (next.country) params.set('country', slugify(next.country));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    if (scroll) filterRef.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  const filtered = posts.filter((p) => {
    if (selectedCountry) return p.relatedCountry === selectedCountry.name;
    if (selectedContinent) return continentOf(p) === selectedContinent;
    return true;
  });
  const hasFilter = !!(selectedCountry || selectedContinent);
  const [featured, ...rest] = filtered;
  const countriesInContinent = activeContinent ? countries.filter((c) => continentOf(c.posts[0]) === activeContinent) : [];

  const chip = (on: boolean) =>
    `inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-[18px] text-sm font-semibold transition-colors ${focusRing} ${
      on ? 'border-brand-dark bg-brand-dark text-white' : 'border-brand-dark/20 bg-[#fffdf8] text-brand-dark hover:border-brand-dark'
    }`;

  return (
    <div className="bg-[#f7f4ee] text-brand-dark">
      {/* ═══ ЗАГЛАВИЕ ═══ */}
      <header className="mx-auto max-w-[1240px] px-6 pb-12 pt-28 md:pb-16 md:pt-36">
        <nav aria-label="Навигационна пътека" className="dest-rise mb-8" style={rise(0.05)}>
          <ol className="flex flex-wrap items-center gap-2.5 text-sm text-slate-600">
            <li><Link href="/" className={`rounded-sm hover:text-brand-dark ${focusRing}`}>Начало</Link></li>
            <li aria-hidden="true" className="text-slate-400">/</li>
            <li aria-current="page" className="font-semibold text-brand-dark">Пътеводител</li>
          </ol>
        </nav>
        <div className="grid grid-cols-1 items-end gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-12">
          <div>
            <p className="dest-rise mb-[18px] flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.22em] text-brand-goldDeep" style={rise(0.1)}>
              <span aria-hidden="true" className="h-px w-9 bg-brand-goldDeep" />
              Блогът на Beliva
            </p>
            <h1 className="dest-rise font-serif text-[clamp(48px,8vw,104px)] font-normal italic leading-[0.95] tracking-[-0.02em]" style={rise(0.2)}>
              Пътеводителят
            </h1>
            <p className="dest-rise mt-6 max-w-[560px] text-lg leading-relaxed text-slate-600 [text-wrap:pretty]" style={rise(0.35)}>
              Статии, съвети и истории от пътуванията ни — написани от хора, които са били там.
            </p>
          </div>
          {posts.length > 0 && (
            <dl className="dest-rise grid grid-cols-2 overflow-hidden rounded-3xl border border-brand-dark/10 bg-[#fffdf8]" style={rise(0.45)}>
              <div className="border-r border-brand-dark/10 px-6 py-5">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Статии</dt>
                <dd className="mt-2 font-display text-3xl font-bold">{posts.length}</dd>
              </div>
              <div className="px-6 py-5">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Дестинации</dt>
                <dd className="mt-2 font-display text-3xl font-bold text-brand-goldDeep">{countries.length}</dd>
              </div>
            </dl>
          )}
        </div>
      </header>

      {posts.length === 0 ? (
        /* ═══ ПРАЗЕН ПЪТЕВОДИТЕЛ: вместо празна страница — дестинациите от каталога ═══ */
        <section aria-labelledby="empty-title" className="mx-auto max-w-[1240px] px-6 pb-24">
          <Reveal>
            <div className="flex flex-col gap-5 rounded-[28px] border border-brand-dark/10 bg-[#fffdf8] p-8 sm:flex-row sm:items-center sm:p-10">
              <span aria-hidden="true" className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-dark text-brand-gold">
                <BookOpen size={24} />
              </span>
              <div>
                <h2 id="empty-title" className="font-serif text-[clamp(26px,3vw,36px)] font-medium italic leading-tight">Първите истории се пишат</h2>
                <p className="mt-2 max-w-[640px] text-[16px] leading-relaxed text-slate-600">
                  Скоро тук ще има пътеводители и разкази от пътуванията. Дотогава — опознайте дестинациите: всяка има кратък разказ за историята, природата и любопитните ѝ факти.
                </p>
              </div>
            </div>
          </Reveal>
          {destinations.length > 0 && (
            <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {destinations.map((d, i) => (
                <li key={d.slug}>
                  <Reveal delay={(i % 4) * 0.06} y={16}>
                    <DestinationTile name={d.name} img={d.img} caption={`${d.tours} ${d.tours === 1 ? 'екскурзия' : 'екскурзии'}`} href={`/destinations/${d.slug}`} />
                  </Reveal>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          {/* ═══ ФИЛТЪР — лепне под менюто ═══ */}
          {continents.length > 0 && (
            <div ref={filterRef} className="sticky top-16 z-30 scroll-mt-16 border-y border-brand-dark/10 bg-[#f7f4ee] md:top-[72px] md:scroll-mt-[72px]">
              <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-6 py-3">
                <div className="flex items-center gap-3">
                  <div role="group" aria-label="Филтър по континент" className="snap-strip -mx-6 flex min-w-0 flex-1 gap-2 overflow-x-auto px-6">
                    <button type="button" aria-pressed={!hasFilter} onClick={() => setFilter({})} className={chip(!hasFilter)}>
                      Всички <span className={`font-display text-xs ${!hasFilter ? 'text-brand-gold' : 'text-brand-goldDeep'}`}>{posts.length}</span>
                    </button>
                    {continents.map((c) => {
                      const on = activeContinent === c.name;
                      return (
                        <button key={c.slug} type="button" aria-pressed={on} onClick={() => setFilter(on && !selectedCountry ? {} : { continent: c.name })} className={chip(on)}>
                          {c.name} <span className={`font-display text-xs ${on ? 'text-brand-gold' : 'text-brand-goldDeep'}`}>{c.count}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="hidden shrink-0 text-sm text-slate-600 md:block" aria-live="polite">{articlesLabel(filtered.length)}</p>
                </div>
                {countriesInContinent.length > 1 && (
                  <div role="group" aria-label={`Държави в ${activeContinent}`} className="snap-strip -mx-6 flex gap-2 overflow-x-auto px-6">
                    {countriesInContinent.map((c) => {
                      const on = selectedCountry?.name === c.name;
                      return (
                        <button
                          key={c.slug}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setFilter(on ? { continent: activeContinent } : { country: c.name })}
                          className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors ${focusRing} ${
                            on ? 'bg-brand-gold text-brand-dark' : 'bg-brand-gold/10 text-brand-goldDeep hover:bg-brand-gold/20'
                          }`}
                        >
                          {c.name} <span className="opacity-70">{c.posts.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ СТАТИИТЕ ═══ — key: при смяна на филтъра новият списък се появява плавно */}
          <section aria-label="Статии" className="mx-auto max-w-[1240px] px-6 py-12 md:py-16">
            <div key={`${activeContinent}-${selectedCountry?.slug}`} className="dest-list-in">
              {selectedCountry && (
                <p className="mb-6 text-[15px] text-slate-600">
                  Статии за <strong className="text-brand-dark">{selectedCountry.name}</strong>
                  {' · '}
                  <Link href={`/destinations/${selectedCountry.slug}`} className={`inline-flex items-center gap-1 rounded-sm font-semibold text-brand-goldDeep underline decoration-brand-gold decoration-2 underline-offset-4 hover:text-brand-dark ${focusRing}`}>
                    Екскурзии до {selectedCountry.name} <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </p>
              )}
              {featured ? (
                <>
                  <FeaturedPost post={featured} />
                  {rest.length > 0 && (
                    <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
                      {rest.map((post, i) => (
                        <li key={post.id}>
                          <Reveal delay={(i % 3) * 0.07} y={20} className="h-full">
                            <PostCard post={post} />
                          </Reveal>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <div className="rounded-[28px] border border-brand-dark/10 bg-[#fffdf8] px-6 py-16 text-center">
                  <p className="font-serif text-2xl italic text-slate-600">Все още няма статии за тази дестинация.</p>
                  <button type="button" onClick={() => setFilter({})} className={`mt-5 inline-flex min-h-[44px] items-center rounded-full bg-brand-dark px-6 text-sm font-semibold text-white hover:bg-slate-800 ${focusRing}`}>
                    Виж всички статии
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ═══ ПО ДЕСТИНАЦИЯ ═══ */}
          {!hasFilter && countries.length > 1 && (
            <section aria-labelledby="by-destination" className="mx-auto max-w-[1240px] px-6 pb-24">
              <p className="mb-3.5 flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.22em] text-brand-goldDeep">
                <span aria-hidden="true" className="h-px w-9 bg-brand-goldDeep" />
                Разгледай
              </p>
              <h2 id="by-destination" className="mb-8 font-serif text-[clamp(32px,4vw,48px)] font-normal italic leading-tight">По дестинация</h2>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {countries.map((c, i) => (
                  <li key={c.slug}>
                    <Reveal delay={(i % 6) * 0.05} y={16}>
                      <DestinationTile
                        name={c.name}
                        img={c.posts.find((p) => p.coverImg)?.coverImg}
                        caption={articlesLabel(c.posts.length)}
                        onSelect={() => setFilter({ country: c.name }, true)}
                      />
                    </Reveal>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
