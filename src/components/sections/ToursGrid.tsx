"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { MapPin, Calendar, ArrowRight, CheckCircle2, Clock, Filter, X, Heart, Star, SlidersHorizontal, Globe2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import FiltersBar from '@/components/FiltersBar';

interface Tour {
  id: string;
  tourId?: string;
  title: string;
  date: string;
  dates?: string[];
  price: string;
  img: string;
  country: string;
  continent: string;
  status: string;
  groupStatus: string;
  categories?: string[];
}

export default function ToursGrid() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL STATE
  const searchQuery = searchParams.get('q') || '';
  const filterContinent = searchParams.get('continent') || '';
  const filterCountry = searchParams.get('country') || '';
  const filterMonth = searchParams.get('month') || '';
  const filterCategory = searchParams.get('cat') || '';
  const sortBy = searchParams.get('sort') || 'date';

  const [tours, setTours] = useState<Tour[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const hasActiveFilters = searchQuery || filterContinent || filterCountry || filterMonth || filterCategory;

  // Автоматично отваряне
  useEffect(() => {
      if (hasActiveFilters) {
          setIsFiltersOpen(true);
      }
  }, [hasActiveFilters]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key === 'continent') params.delete('country');
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  const clearFilters = () => {
    router.push('/', { scroll: false });
    // setIsFiltersOpen(false); // 👈 Това го махаме
  };

  const resultsRef = useRef<HTMLDivElement>(null);
  const scrollToResults = () => {
     if (resultsRef.current) {
         // Скролваме с лек офсет заради менюто
         const yOffset = -100; 
         const y = resultsRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
         window.scrollTo({ top: y, behavior: 'smooth' });
     }
     setIsFiltersOpen(false); // Затваряме панела, за да се виждат офертите
  };

  useEffect(() => {
    const q = query(collection(db, "tours"), where("status", "==", "public"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTours(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Tour[]);
      setLoading(false);
    });

    const loadFavorites = () => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('beliva_favorites');
            if (stored) setFavorites(JSON.parse(stored));
        }
    };
    loadFavorites();
    window.addEventListener('storage', loadFavorites);
    return () => {
        unsubscribe();
        window.removeEventListener('storage', loadFavorites);
    };
  }, []);

  const toggleFavorite = (e: React.MouseEvent, tour: Tour) => {
    e.preventDefault(); e.stopPropagation();
    let newFavorites = [...favorites];
    const targetId = tour.tourId || tour.id; 
    if (favorites.some((f: any) => f.id === targetId)) { 
        newFavorites = newFavorites.filter((f: any) => f.id !== targetId); 
    } else {
        newFavorites.push({ id: targetId, title: tour.title, img: tour.img, price: tour.price, country: tour.country, date: tour.date });
    }
    setFavorites(newFavorites);
    localStorage.setItem('beliva_favorites', JSON.stringify(newFavorites));
    window.dispatchEvent(new Event("storage"));
  };

  const getAllDates = (tour: Tour) => {
    let dates = [...(tour.dates || [])];
    if (tour.date) {
      const parts = tour.date.split('-');
      const mainIso = parts[0].length === 2 ? parts.reverse().join('-') : tour.date;
      if (!dates.includes(mainIso)) dates.push(mainIso);
    } return dates.sort();
  };

  const parsePrice = (priceStr: string) => parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;

  const filteredTours = useMemo(() => {
    let result = tours.filter(tour => {
      if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchTitle = tour.title.toLowerCase().includes(query);
          const matchCountry = tour.country.toLowerCase().includes(query);
          if (!matchTitle && !matchCountry) return false;
      }
      if (filterContinent && tour.continent !== filterContinent) return false;
      if (filterCountry && tour.country !== filterCountry) return false;
      if (filterCategory && !tour.categories?.includes(filterCategory)) return false;
      if (filterMonth) {
        const tourDates = getAllDates(tour);
        if (!tourDates.some(date => date.split('-')[1] === filterMonth)) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'price_asc') return parsePrice(a.price) - parsePrice(b.price);
      if (sortBy === 'price_desc') return parsePrice(b.price) - parsePrice(a.price);
      const dateA = getAllDates(a)[0] || '9999'; 
      const dateB = getAllDates(b)[0] || '9999';
      return dateA.localeCompare(dateB);
    });
    return result;
  }, [tours, filterContinent, filterCountry, filterCategory, filterMonth, sortBy, searchQuery]);

  const uniqueContinents = Array.from(new Set(tours.map(t => t.continent).filter(Boolean)));
  const uniqueCountries = Array.from(new Set(tours.filter(t => filterContinent ? t.continent === filterContinent : true).map(t => t.country).filter(Boolean))).sort();
  const formatISOtoDisplay = (isoDate: string) => { if (!isoDate) return ""; return isoDate.split('-').reverse().join('.'); };
  
  let lastYear = "";
  const badgeStyle = "backdrop-blur-md bg-white/80 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md border border-white/40 flex items-center gap-1 transition-all hover:bg-white";
  const statusColors: Record<string, string> = {
      'confirmed': 'text-emerald-700 bg-emerald-50/80 border-emerald-100',
      'last-places': 'text-amber-700 bg-amber-50/80 border-amber-100',
      'sold-out': 'text-rose-700 bg-rose-50/80 border-rose-100',
      'active': 'text-brand-dark bg-white/80 border-white/40'
  };

  if (loading) return <div className="text-center py-20"><div className="inline-block w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <section id="tours-grid" className="container mx-auto px-6 py-16 scroll-mt-20 relative overflow-hidden">
      
      {/* 🎨 ФОНОВИ ЕФЕКТИ */}
      <div className="absolute top-20 left-0 w-96 h-96 bg-brand-gold/5 rounded-full blur-[120px] pointer-events-none -translate-x-1/2" />
      <div className="absolute bottom-40 right-0 w-80 h-80 bg-blue-900/5 rounded-full blur-[100px] pointer-events-none translate-x-1/2" />

      {/* 👇 ПРОМЯНА: Header на секцията с интегриран бутон */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 relative z-20 border-b border-brand-gold/10 pb-6">
          <div>
              <div className="flex items-center gap-2 mb-2">
                  <Globe2 size={18} className="text-brand-gold"/>
                  <span className="text-brand-gold text-xs font-black uppercase tracking-[0.2em]">Пътешествия</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-serif text-brand-dark leading-tight">
                  Всички <span className="italic text-brand-gold">Предложения</span>
              </h2>
          </div>

          <div className="flex items-center gap-4">
              {/* Брояч на резултатите */}
              <div className="text-right hidden md:block">
                  <p className="text-3xl font-bold text-brand-dark leading-none">{filteredTours.length}</p>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Намерени</p>
              </div>

              {/* БУТОН ЗА ФИЛТЪР (Вече част от хедъра) */}
              <button 
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className={`
                    flex items-center gap-3 px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs transition-all duration-300 border
                    ${isFiltersOpen 
                        ? 'bg-brand-dark text-white border-brand-dark shadow-lg transform scale-105' 
                        : 'bg-white text-brand-dark border-brand-gold/30 hover:border-brand-gold hover:shadow-md'
                    }
                `}
            >
                {isFiltersOpen ? <X size={16}/> : <SlidersHorizontal size={16} className={isFiltersOpen ? "text-white" : "text-brand-gold"}/>}
                {isFiltersOpen ? 'Скрий' : 'Филтрирай'}
                
                {hasActiveFilters && !isFiltersOpen && (
                    <span className="flex h-2 w-2 relative ml-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                )}
            </button>
          </div>
      </div>

      {/* 1. ФИЛТЪР ПАНЕЛ (Вече без собствения си бутон, защото го изнесохме горе) */}
      <div className={`${isFiltersOpen ? 'block' : 'hidden'} animate-in slide-in-from-top-4 fade-in duration-300 mb-12`}>
         {/* Подаваме isOpen=true винаги, защото ние контролираме видимостта отвън с div-а */}
         <FiltersBar 
            isOpen={true} 
            toggleOpen={() => {}} // Празна функция, защото бутонът е горе
            searchQuery={searchQuery}
            filterContinent={filterContinent}
            filterCountry={filterCountry}
            filterMonth={filterMonth}
            filterCategory={filterCategory}
            sortBy={sortBy}
            uniqueContinents={uniqueContinents}
            uniqueCountries={uniqueCountries}
            updateParam={updateParam}
            clearFilters={clearFilters}
            hasActiveFilters={!!hasActiveFilters}
            resultsCount={filteredTours.length} // 👈 Подаваме бройката
            scrollToResults={scrollToResults}
          />
      </div>

      {/* 2. РЕЗУЛТАТИ */}
      <div ref={resultsRef} className="scroll-mt-32"></div>
      {filteredTours.length === 0 ? (
        <div className="text-center py-20 opacity-50">
          <Filter size={48} className="mx-auto text-gray-300 mb-4"/>
          <h3 className="text-2xl font-serif text-gray-400">Няма намерени резултати</h3>
          <p className="text-sm text-gray-400">Опитайте да промените критериите за търсене.</p>
          <button onClick={clearFilters} className="mt-4 text-brand-gold font-bold underline hover:text-brand-dark transition-colors">Изчисти всички филтри</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16 items-start relative z-10">
          {filteredTours.map((tour) => {
            let allDatesISO = getAllDates(tour);
            let tourYear = ""; if (allDatesISO.length > 0) tourYear = allDatesISO[0].split('-')[0];
            const showYearHeader = tourYear !== lastYear && tourYear !== ""; if (showYearHeader) lastYear = tourYear;
            const isFav = favorites.some((f: any) => f.id === (tour.tourId || tour.id));
            const isLedByPoli = tour.categories?.includes('Водена от ПОЛИ');

            return (
              <React.Fragment key={tour.id}>
                {showYearHeader && (
                  <div className="col-span-full text-left mb-4 mt-8 flex items-center gap-4 animate-in fade-in duration-700">
                    <h3 className="text-5xl md:text-6xl font-serif italic text-brand-gold/20 select-none">{tourYear}</h3>
                    <div className="h-[1px] flex-grow bg-brand-gold/10"></div>
                  </div>
                )}
                
                <Link 
                    href={`/tour/${tour.tourId || tour.id}`} 
                    className={`
                        group bg-white rounded-[2.5rem] overflow-hidden transition-all duration-500 border flex flex-col h-full relative hover:-translate-y-2 transform-gpu
                        hover:shadow-[0_20px_40px_-10px_rgba(197,163,93,0.25)] 
                        ${isLedByPoli 
                            ? 'border-2 border-brand-gold shadow-[0_0_20px_rgba(197,163,93,0.15)]' 
                            : 'border-brand-gold/20 hover:border-brand-gold/30'
                        }
                    `}
                >
                  
                  {isLedByPoli && (
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-brand-gold to-yellow-500 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-[0_5px_15px_-5px_rgba(197,163,93,0.6)] flex items-center gap-1 border border-white/20 whitespace-nowrap tracking-wider">
                          <Star size={10} fill="currentColor" /> Водена от Поли
                      </div>
                  )}
                  
                  <button onClick={(e) => toggleFavorite(e, tour)} className="absolute top-6 right-6 p-2.5 bg-white/20 backdrop-blur-md rounded-full hover:bg-white transition-all group/heart z-20 border border-white/30 shadow-sm">
                      <Heart size={20} className={`transition-colors ${isFav ? 'fill-red-500 text-red-500' : 'text-white group-hover/heart:text-red-500'}`} />
                  </button>
                  
                  <div className="relative h-72 overflow-hidden bg-gray-100">
                    <Image 
                        src={tour.img} 
                        alt={tour.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110 transform-gpu"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />

                    <div className="absolute top-6 left-6 flex flex-col gap-2 items-start z-10">
                      {tour.groupStatus === 'confirmed' && <span className={`${badgeStyle} ${statusColors['confirmed']}`}><CheckCircle2 size={12} /> Потвърдена</span>}
                      {tour.groupStatus === 'last-places' && <span className={`${badgeStyle} ${statusColors['last-places']}`}><Clock size={12} /> Последни места</span>}
                      {tour.groupStatus === 'sold-out' && <span className={`${badgeStyle} ${statusColors['sold-out']}`}><X size={12} /> Изчерпана</span>}
                      {tour.groupStatus === 'active' && <span className={`${badgeStyle} ${statusColors['active']}`}>● Оформяща се</span>}
                    </div>
                    
                    <div className="absolute top-16 right-6 flex flex-col items-end gap-1.5 z-10">
                        {tour.categories?.filter(c => c !== 'Водена от ПОЛИ').slice(0, 2).map(cat => ( <span key={cat} className="bg-black/40 backdrop-blur-md border border-white/20 text-white text-[9px] font-bold uppercase px-2.5 py-1 rounded-lg shadow-sm">{cat}</span>))}
                        {(tour.categories?.filter(c => c !== 'Водена от ПОЛИ').length || 0) > 2 && (<span className="bg-black/40 backdrop-blur-md border border-white/20 text-white text-[9px] font-bold uppercase px-2.5 py-1 rounded-lg shadow-sm">+{((tour.categories?.filter(c => c !== 'Водена от ПОЛИ').length || 0) - 2)}</span>)}
                    </div>

                    <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                      <div className="bg-white/95 backdrop-blur-xl p-3.5 rounded-2xl shadow-lg border border-white/50 text-center min-w-[5rem]">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Цена от</p>
                        <p className="text-2xl font-serif font-bold text-brand-dark leading-none">{tour.price}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 flex flex-col grow">
                    <div className="flex items-center gap-2 text-brand-gold mb-3">
                        <MapPin size={14} className="animate-bounce-slow" />
                        <span className="text-sm font-bold uppercase tracking-widest">{tour.country}</span>
                    </div>
                    
                    <h3 className="text-2xl font-serif font-bold text-brand-dark mb-4 group-hover:text-brand-gold transition-colors leading-tight">{tour.title}</h3>
                    
                    <div className="mt-auto pt-6 border-t border-gray-50 flex items-start justify-between">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase mb-1">
                            <Calendar size={14} className="text-brand-gold" /><span>Дати на отпътуване:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {allDatesISO.map((isoDate, idx) => (
                                <span key={idx} className="text-[13px] font-bold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100 hover:border-brand-gold/50 transition-colors">
                                    {formatISOtoDisplay(isoDate)}
                                </span>
                            ))}
                        </div>
                      </div>
                      
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 mt-2 shadow-md
                          ${isLedByPoli 
                              ? 'bg-gradient-to-br from-brand-gold to-yellow-600 text-white shadow-brand-gold/30' 
                              : 'bg-white border border-gray-100 text-brand-gold group-hover:bg-brand-gold group-hover:text-brand-dark group-hover:border-brand-gold'
                          }
                      `}>
                        <ArrowRight size={22} className={`transition-transform duration-300 ${isLedByPoli ? '' : 'group-hover:-rotate-45'}`} />
                      </div>
                    </div>
                  </div>
                </Link>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </section>
  );
}