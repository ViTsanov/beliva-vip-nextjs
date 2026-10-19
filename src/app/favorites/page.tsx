"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2, MapPin, Calendar, ArrowRight } from "lucide-react";
import { useFavoriteCountries, removeFavoriteCountry } from "@/lib/favoriteCountries";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/formatPrice";
import { BLUR_PLACEHOLDER } from "@/lib/blurPlaceholder";
import { useMounted } from "@/lib/hooks/useMounted";

// Нормализира и форматира дата към DD.MM.YYYY, независимо от входния формат (ISO, точки, Firestore Timestamp)
// — преди това се показваше суровото ISO поле (напр. "2026-11-27" вместо "27.11.2026")
const formatDate = (d: any): string => {
  if (!d) return '';
  if (typeof d === 'object' && typeof d.toDate === 'function') d = d.toDate().toISOString();
  if (typeof d === 'object' && d.seconds) d = new Date(d.seconds * 1000).toISOString();
  const clean = String(d).trim().split('T')[0];
  const sep = clean.includes('-') ? '-' : clean.includes('.') ? '.' : clean.includes('/') ? '/' : null;
  if (!sep) return clean;
  const parts = clean.split(sep).map(p => p.trim());
  if (parts.length !== 3) return clean;
  const [a, b, c] = parts;
  if (a.length === 4) return `${c.padStart(2, '0')}.${b.padStart(2, '0')}.${a}`; // ISO -> DD.MM.YYYY
  if (c.length === 4) return `${a.padStart(2, '0')}.${b.padStart(2, '0')}.${c}`; // вече DD.MM.YYYY
  return clean;
};

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const mounted = useMounted();
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  // Любими държави (сърцето на страниците /destinations/<държава>)
  const { list: countries } = useFavoriteCountries();

  // Четенето от localStorage е генуинно client-only операция (не съществува при SSR) —
  // легитимна синхронизация с външен източник, не derived-state анти-патерн.
  useEffect(() => {
    const stored = localStorage.getItem('beliva_favorites');
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFavorites(JSON.parse(stored));
    }
  }, []);

  const removeFavorite = (id: string) => {
    const newFavs = favorites.filter(f => f.id !== id);
    setFavorites(newFavs);
    localStorage.setItem('beliva_favorites', JSON.stringify(newFavs));
    
    // Събитие, за да се обнови бройката в Навигацията веднага
    window.dispatchEvent(new Event("favoritesUpdated"));
    window.dispatchEvent(new Event("storage"));
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-gray-50 pt-32 pb-20">
      <div className="container mx-auto px-6">
        
        <div className="text-center mb-16">
          <span className="text-brand-goldDeep font-bold tracking-[0.2em] uppercase text-xs mb-3 block">
            Вашият избор
          </span>
          <h1 className="text-4xl md:text-5xl font-serif italic text-brand-dark">
            Любими ({favorites.length + countries.length})
          </h1>
        </div>

        {/* Любими дестинации */}
        {countries.length > 0 && (
          <section aria-labelledby="fav-countries" className="mb-16">
            <h2 id="fav-countries" className="mb-6 font-serif text-2xl italic text-brand-dark md:text-3xl">
              Дестинации <span className="font-sans text-base not-italic text-slate-500">({countries.length})</span>
            </h2>
            <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
              {countries.map((c) => (
                <li key={c.slug} className="dialog-backdrop-in">
                  <article className="group relative aspect-[4/5] overflow-hidden rounded-3xl bg-slate-800 text-white">
                    {c.img && (
                      <Image src={c.img} alt="" fill sizes="(max-width: 480px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    )}
                    <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,17,32,.25)_0%,rgba(11,17,32,0)_35%,rgba(11,17,32,.88)_100%)]" />
                    <Link
                      href={`/destinations/${c.slug}`}
                      aria-label={`${c.name} — виж екскурзиите`}
                      className="absolute inset-0 z-[1] rounded-3xl focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-brand-gold"
                    />
                    <span className="pointer-events-none absolute inset-x-5 bottom-5 flex flex-col gap-1">
                      {c.region && <span className="text-[13px] text-white/80">{c.region}</span>}
                      <span className="font-serif text-[26px] font-medium leading-[1.1]">{c.name}</span>
                      {(c.tours || c.price) && (
                        <span className="text-sm text-white/90">
                          {c.tours ? `${c.tours} ${c.tours === 1 ? 'оферта' : 'оферти'}` : ''}
                          {c.price && <>{c.tours ? ' · ' : ''}от <strong className="text-brand-gold">{c.price}</strong></>}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFavoriteCountry(c.slug)}
                      aria-label={`Премахни ${c.name} от любими`}
                      className="absolute right-3.5 top-3.5 z-[2] inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-gray-500 shadow-md transition-colors hover:text-red-500 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-brand-gold"
                    >
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        )}

        {countries.length > 0 && favorites.length > 0 && (
          <h2 className="mb-6 font-serif text-2xl italic text-brand-dark md:text-3xl">
            Екскурзии <span className="font-sans text-base not-italic text-slate-500">({favorites.length})</span>
          </h2>
        )}

        {favorites.length === 0 && countries.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[3rem] shadow-sm border border-gray-100 max-w-2xl mx-auto">
            <h3 className="text-2xl font-serif text-gray-400 mb-4">Все още нямате любими.</h3>
            <p className="text-gray-500 mb-8">Натиснете сърцето на екскурзия или дестинация, за да я запазите тук.</p>
            <Link href="/" className="bg-brand-dark text-white px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-brand-gold hover:text-brand-dark transition-all">
              Към Екскурзиите
            </Link>
          </div>
        ) : favorites.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {favorites.map((tour) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={tour.id} 
                className="group bg-white rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all relative"
              >
                {/* Бутон за изтриване */}
                <button 
                  onClick={() => removeFavorite(tour.id)}
                  className="absolute top-4 right-4 z-20 bg-white/90 p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-white shadow-md transition-all"
                  title="Премахни"
                >
                  <Trash2 size={18} />
                </button>

                <Link href={`/tour/${tour.id}`}>
                  <div className="relative h-60 overflow-hidden bg-gray-200">
                    {tour.img && !imgErrors[tour.id] ? (
                      <Image
                        src={tour.img}
                        alt={tour.title}
                        fill
                        placeholder="blur"
                        blurDataURL={BLUR_PLACEHOLDER}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                        onError={() => setImgErrors(prev => ({ ...prev, [tour.id]: true }))}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-brand-dark to-brand-dark/60" />
                    )}
                    <div className="absolute top-4 left-4 bg-brand-dark text-brand-gold px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide shadow-lg">
                       {formatPrice(tour.price)}
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] font-black uppercase text-gray-400 mb-3 tracking-widest">
                       <span className="flex items-center gap-1 min-w-0"><MapPin size={12} className="text-brand-gold shrink-0"/> <span className="truncate">{Array.isArray(tour.country) ? tour.country.join(', ') : tour.country}</span></span>
                       <span className="flex items-center gap-1 shrink-0"><Calendar size={12} className="text-brand-gold shrink-0"/> {formatDate(tour.date)}</span>
                    </div>

                    <h3 className="text-xl font-serif font-bold text-brand-dark mb-4 line-clamp-2 group-hover:text-brand-gold transition-colors">
                      {tour.title}
                    </h3>

                    <div className="flex items-center text-brand-gold font-bold text-xs uppercase tracking-widest gap-2 group-hover:gap-4 transition-all mt-auto">
                        Виж офертата <ArrowRight size={16} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}