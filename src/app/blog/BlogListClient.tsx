'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Calendar, Clock, MapPin, Globe, LayoutGrid, ChevronRight } from 'lucide-react';
import type { BlogPost } from './page';

// ─── Continent map ──────────────────────────────────────────────
const CONTINENTS: Record<string, { label: string; emoji: string; countries: string[] }> = {
  asia: {
    label: 'Азия', emoji: '🌏',
    countries: ['Япония','Тайланд','Китай','Сингапур','Индия','Виетнам','Малайзия','ОАЕ','Индонезия','Камбоджа','Непал','Шри Ланка','Мианмар','Лаос','Бахрейн','Катар','Саудитска Арабия','Йордания','Израел','Монголия','Казахстан','Узбекистан','Таджикистан','Киргизстан','Туркменистан','Азербайджан','Армения','Грузия','Иран','Ирак','Сирия','Ливан','Кипър','Бруней','Тайван','Южна Корея','Северна Корея','Бутан','Бангладеш','Пакистан','Афганистан','Малдиви','Филипини'],
  },
  europe: {
    label: 'Европа', emoji: '🏰',
    countries: ['Гърция','Италия','Испания','Франция','Германия','Хърватия','Австрия','Швейцария','Швеция','Норвегия','Финландия','Дания','Нидерландия','Белгия','Португалия','Полша','Чехия','Унгария','Румъния','България','Словакия','Словения','Босна и Херцеговина','Сърбия','Черна гора','Косово','Северна Македония','Албания','Молдова','Украйна','Беларус','Русия','Исландия','Ирландия','Великобритания','Малта','Люксембург','Монако','Лихтенщайн','Андора','Ватикан','Сан Марино','Естония','Латвия','Литва','Турция'],
  },
  america: {
    label: 'Америка', emoji: '🌎',
    countries: ['САЩ','Мексико','Перу','Бразилия','Аржентина','Куба','Колумбия','Чили','Еквадор','Боливия','Парагвай','Уругвай','Венецуела','Гватемала','Коста Рика','Панама','Никарагуа','Хондурас','Ел Салвадор','Хаити','Доминиканска република','Ямайка','Тринидад и Тобаго','Барбадос','Канада','Гвиана','Суринам'],
  },
  africa: {
    label: 'Африка', emoji: '🦁',
    countries: ['Южна Африка','ЮАР','Мароко','Египет','Кения','Танзания','Уганда','Руанда','Намибия','Ботсвана','Зимбабве','Замбия','Мадагаскар','Мозамбик','Гана','Нигерия','Сенегал','Тунис','Алжир','Либия','Судан','Еритрея','Сомалия','Джибути','Етиопия','Мали','Буркина Фасо','Нигер','Чад','Камерун','Ангола','Конго','Сейшели','Мавриций','Кабо Верде','Мавритания','Гамбия','Либерия','Бенин','Того','Лесото','Есватини','Малави','Южен Судан'],
  },
  oceania: {
    label: 'Океания', emoji: '🌊',
    countries: ['Австралия','Нова Зеландия','Фиджи','Папуа Нова Гвинея','Самоа','Тонга','Вануату','Кирибати','Науру','Тувалу','Маршалови острови','Микронезия','Палау','Соломонови острови'],
  },
};

function getContinent(country: string): string | null {
  for (const [key, val] of Object.entries(CONTINENTS)) {
    if (val.countries.includes(country)) return key;
  }
  return null;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return ''; }
}

// ─── Post card ──────────────────────────────────────────────────
function PostCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  const href = `/blog/${post.slug || post.id}`;
  const date = formatDate(post.createdAt);

  if (featured) {
    return (
      <Link href={href} className="group block rounded-[2.5rem] overflow-hidden shadow-xl border border-brand-gold/10 hover:shadow-2xl transition-all duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[360px]">
          <div className="relative h-[260px] lg:h-full overflow-hidden bg-brand-dark">
            {post.coverImg && (
              <Image src={post.coverImg} alt={post.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 1024px) 100vw, 50vw" priority />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            <div className="absolute top-5 left-5 flex items-center gap-2">
              <span className="bg-brand-gold text-brand-dark px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow">Последна публикация</span>
              {post.relatedCountry && (
                <span className="bg-white/90 backdrop-blur-sm text-brand-dark px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow">{post.relatedCountry}</span>
              )}
            </div>
          </div>
          <div className="bg-brand-dark text-white p-10 lg:p-14 flex flex-col justify-center gap-4">
            <div className="flex items-center gap-3 text-brand-gold/70 text-[10px] font-bold uppercase tracking-widest">
              <Calendar size={12} /><span>{date}</span>
              {post.readTime && <><span className="text-white/20">·</span><Clock size={12} /><span>{post.readTime} мин.</span></>}
            </div>
            <h2 className="text-3xl lg:text-4xl font-serif italic text-white leading-tight group-hover:text-brand-gold transition-colors duration-300">{post.title}</h2>
            {post.excerpt && <p className="text-white/50 text-base leading-relaxed line-clamp-3">{post.excerpt}</p>}
            <div className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-brand-gold group-hover:gap-5 transition-all pt-2 border-t border-white/10">
              Прочети историята <ArrowRight size={16} />
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className="group block bg-white rounded-[1.8rem] overflow-hidden shadow-sm hover:shadow-xl border border-brand-gold/8 hover:border-brand-gold/25 transition-all duration-300 hover:-translate-y-0.5">
      <div className="relative h-52 overflow-hidden bg-brand-dark/10">
        {post.coverImg && (
          <Image src={post.coverImg} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
        )}
        {post.relatedCountry && (
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-brand-dark px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
            <MapPin size={8} className="text-brand-gold" />{post.relatedCountry}
          </div>
        )}
      </div>
      <div className="p-6">
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase text-gray-400 tracking-wider mb-3">
          <Clock size={10} className="text-brand-gold/70" /><span>{date}</span>
          {post.readTime && <><span className="text-gray-300">·</span><span>{post.readTime} мин.</span></>}
        </div>
        <h3 className="font-serif italic text-xl text-brand-dark mb-3 leading-snug group-hover:text-brand-gold transition-colors line-clamp-2">{post.title}</h3>
        {post.excerpt && <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-4">{post.excerpt}</p>}
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand-dark border-b border-brand-gold/30 pb-0.5 group-hover:border-brand-gold group-hover:text-brand-gold transition-all">
          Виж повече <ChevronRight size={11} />
        </span>
      </div>
    </Link>
  );
}

// ─── Destination tile ───────────────────────────────────────────
function DestinationTile({ country, posts, img, onClick }: { country: string; posts: BlogPost[]; img?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group relative rounded-2xl overflow-hidden bg-brand-dark shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 aspect-[4/3] w-full text-left">
      {img && <Image src={img} alt={country} fill className="object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500" sizes="200px" />}
      {!img && <div className="absolute inset-0 bg-gradient-to-br from-brand-dark to-brand-dark/60" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-white font-serif italic text-lg leading-tight font-bold">{country}</p>
        <p className="text-brand-gold/80 text-[9px] font-black uppercase tracking-widest mt-0.5">
          {posts.length} {posts.length === 1 ? 'статия' : 'статии'}
        </p>
      </div>
    </button>
  );
}

// ─── Hero collage images ────────────────────────────────────────
const COLLAGE_IMGS = [
  '/hero/thailand.webp',
  '/hero/australia.webp',
  '/hero/china.webp',
  '/hero/peru.webp',
  '/hero/singapore.webp',
];

// ─── Main component ─────────────────────────────────────────────
export default function BlogListClient({ posts }: { posts: BlogPost[] }) {
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<'all' | 'destination'>('all');
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  // Read URL params on mount — supports ?country=X from external links / destination tiles
  useEffect(() => {
    const country = searchParams.get('country');
    const continent = searchParams.get('continent');
    if (country) {
      setMode('all');
      setSelectedCountry(country);
      const cont = getContinent(country);
      if (cont) setSelectedContinent(cont);
    } else if (continent) {
      setMode('all');
      setSelectedContinent(continent);
    }
  }, [searchParams]);

  // Countries that appear in posts
  const postCountries = useMemo(() => {
    const map: Record<string, BlogPost[]> = {};
    posts.forEach(p => {
      if (p.relatedCountry) {
        if (!map[p.relatedCountry]) map[p.relatedCountry] = [];
        map[p.relatedCountry].push(p);
      }
    });
    return map;
  }, [posts]);

  // Countries available under the selected continent
  const countriesForContinent = useMemo(() => {
    if (!selectedContinent) return Object.keys(postCountries);
    return CONTINENTS[selectedContinent]?.countries.filter(c => postCountries[c]) || [];
  }, [selectedContinent, postCountries]);

  // Filtered posts for "all" mode
  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      if (selectedCountry) return p.relatedCountry === selectedCountry;
      if (selectedContinent) return CONTINENTS[selectedContinent]?.countries.includes(p.relatedCountry || '');
      return true;
    });
  }, [posts, selectedContinent, selectedCountry]);

  // Grouped posts for "destination" mode
  const grouped = useMemo(() => {
    const result: Record<string, { continent: typeof CONTINENTS[string]; countries: Record<string, BlogPost[]> }> = {};
    Object.entries(CONTINENTS).forEach(([key, cont]) => {
      const countries: Record<string, BlogPost[]> = {};
      cont.countries.forEach(c => { if (postCountries[c]) countries[c] = postCountries[c]; });
      if (Object.keys(countries).length > 0) result[key] = { continent: cont, countries };
    });
    return result;
  }, [postCountries]);

  const handleContinent = (key: string) => {
    setSelectedContinent(prev => prev === key ? null : key);
    setSelectedCountry(null);
  };

  const handleCountry = (c: string) => {
    setSelectedCountry(prev => prev === c ? null : c);
  };

  const resetFilters = () => { setSelectedContinent(null); setSelectedCountry(null); };
  const hasFilters = !!(selectedContinent || selectedCountry);

  return (
    <div className="min-h-screen bg-[#f9f6f0]">

      {/* ── Hero with photo collage ── */}
      <div className="bg-brand-dark pt-32 pb-14 px-6 relative overflow-hidden">
        {/* Vertical image strips */}
        <div className="absolute inset-0 flex">
          {COLLAGE_IMGS.map((src, i) => (
            <div key={i} className="relative flex-1 overflow-hidden">
              <Image src={src} alt="" fill className="object-cover" sizes="20vw" quality={40} aria-hidden />
            </div>
          ))}
        </div>
        {/* Dark overlays for text */}
        <div className="absolute inset-0 bg-black/55 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/30 via-transparent to-brand-dark pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/60 via-transparent to-brand-dark/60 pointer-events-none" />

        <div className="container mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-brand-gold/50" />
            <span className="text-brand-gold/70 text-[9px] font-black uppercase tracking-[0.4em]">Beliva VIP Tour</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-serif italic text-white leading-none mb-4">
            Пътеводителят
          </h1>
          <p className="text-white/50 text-base font-light max-w-md">
            Статии, съвети и истории от над 60 дестинации — написани от хора, които са ги изживели.
          </p>
        </div>
      </div>

      {/* ── Mode toggle + filter bar ── */}
      <div className="bg-white border-b border-brand-gold/15 sticky top-16 z-30 shadow-sm">
        <div className="container mx-auto px-6 flex items-center gap-3 pt-3 pb-2">
          <button
            onClick={() => { setMode('all'); resetFilters(); }}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'all' ? 'bg-brand-dark text-brand-gold shadow-md' : 'text-gray-400 hover:text-brand-dark'}`}
          >
            <LayoutGrid size={12} /> Всички
          </button>
          <button
            onClick={() => { setMode('destination'); resetFilters(); }}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'destination' ? 'bg-brand-dark text-brand-gold shadow-md' : 'text-gray-400 hover:text-brand-dark'}`}
          >
            <Globe size={12} /> По дестинация
          </button>
          <div className="ml-auto text-[10px] text-gray-400 font-medium hidden sm:block">
            {filteredPosts.length} {filteredPosts.length === 1 ? 'статия' : 'статии'}
          </div>
        </div>

        {/* Filter pills */}
        {mode === 'all' && (
          <div className="container mx-auto px-6 pb-3 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              <button
                onClick={resetFilters}
                className={`text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-full border transition-all whitespace-nowrap ${!hasFilters ? 'bg-brand-dark text-brand-gold border-brand-dark' : 'border-brand-gold/30 text-brand-dark/60 hover:border-brand-gold hover:text-brand-dark'}`}
              >
                ✦ Всички
              </button>

              {Object.entries(CONTINENTS)
                .filter(([key]) => grouped[key])
                .map(([key, cont]) => (
                  <button
                    key={key}
                    onClick={() => handleContinent(key)}
                    className={`text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-full border transition-all whitespace-nowrap ${selectedContinent === key ? 'bg-brand-dark text-brand-gold border-brand-dark' : 'border-gray-200 text-gray-500 bg-gray-50 hover:border-brand-gold/40 hover:text-brand-dark'}`}
                  >
                    {cont.emoji} {cont.label}
                  </button>
                ))}

              {/* Country pills — only when continent is active */}
              {selectedContinent && countriesForContinent.length > 0 && (
                <>
                  <div className="h-5 w-px bg-gray-200 mx-1" />
                  {countriesForContinent.map(c => (
                    <button
                      key={c}
                      onClick={() => handleCountry(c)}
                      className={`text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-full border transition-all whitespace-nowrap ${selectedCountry === c ? 'bg-brand-gold text-brand-dark border-brand-gold' : 'border-brand-gold/20 text-brand-dark/70 bg-brand-gold/5 hover:bg-brand-gold/15'}`}
                    >
                      {c}
                      <span className="ml-1.5 text-[8px] opacity-60">{postCountries[c]?.length}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <main className="container mx-auto px-6 py-12">

        {/* MODE: ALL */}
        {mode === 'all' && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedContinent ?? ''}-${selectedCountry ?? ''}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {filteredPosts.length === 0 && (
                <div className="text-center py-24">
                  <p className="text-gray-400 text-lg font-serif italic mb-3">
                    Все още няма статии за тази дестинация.
                  </p>
                  <button onClick={resetFilters} className="text-brand-gold text-sm font-bold uppercase tracking-widest hover:underline">
                    Виж всички статии
                  </button>
                </div>
              )}

              {filteredPosts.length > 0 && (
                <>
                  {/* Featured — always first post */}
                  <div className="mb-12">
                    <PostCard post={filteredPosts[0]} featured />
                  </div>

                  {/* Grid — remaining posts */}
                  {filteredPosts.length > 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                      {filteredPosts.slice(1).map((post, i) => (
                        <motion.div
                          key={post.id}
                          initial={{ opacity: 0, y: 16 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: '-40px' }}
                          transition={{ duration: 0.4, delay: i * 0.06 }}
                        >
                          <PostCard post={post} />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* MODE: DESTINATION */}
        {mode === 'destination' && (
          <AnimatePresence mode="wait">
            <motion.div
              key="destination"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-16"
            >
              {Object.entries(grouped).map(([key, { continent, countries }]) => (
                <div key={key}>
                  <div className="flex items-center gap-4 mb-7">
                    <span className="text-3xl select-none">{continent.emoji}</span>
                    <div>
                      <p className="text-brand-gold text-[9px] font-black uppercase tracking-[0.3em] mb-0.5">Дестинации</p>
                      <h2 className="text-2xl md:text-3xl font-serif italic text-brand-dark leading-none">{continent.label}</h2>
                    </div>
                    <div className="flex-1 h-px bg-brand-gold/15 hidden md:block" />
                    <span className="hidden md:block text-[10px] text-gray-400 font-medium shrink-0">
                      {Object.keys(countries).length} {Object.keys(countries).length === 1 ? 'държава' : 'държави'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {Object.entries(countries).map(([country, cPosts]) => (
                      <DestinationTile
                        key={country}
                        country={country}
                        posts={cPosts}
                        img={cPosts[0]?.coverImg}
                        onClick={() => {
                          setMode('all');
                          setSelectedContinent(key);
                          setSelectedCountry(country);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {Object.keys(grouped).length === 0 && (
                <div className="text-center py-24 text-gray-400 font-serif italic text-lg">
                  Все още няма статии с посочена дестинация.
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
