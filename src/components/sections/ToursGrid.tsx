"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Filter, Globe2, X, SlidersHorizontal } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import FiltersBar from '@/components/FiltersBar';
import TourCard from '@/components/tours/TourCard';
import { ITour } from '@/types';

export default function ToursGrid() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resultsRef = useRef<HTMLDivElement>(null);

  // URL STATE
  const searchQuery = searchParams.get('q') || '';
  const filterContinent = searchParams.get('continent') || '';
  const filterCountry = searchParams.get('country') || '';
  const filterMonth = searchParams.get('month') || '';
  const filterCategory = searchParams.get('cat') || '';
  const sortBy = searchParams.get('sort') || 'date';

  // Стейт за всички данни (кеш) и любими
  const [allTours, setAllTours] = useState<ITour[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const hasActiveFilters = !!(searchQuery || filterContinent || filterCountry || filterMonth || filterCategory);

  // 1. Зареждане на любими
  useEffect(() => {
    const loadFavorites = () => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('beliva_favorites');
        if (stored) setFavorites(JSON.parse(stored));
      }
    };
    loadFavorites();
    window.addEventListener('storage', loadFavorites);
    return () => window.removeEventListener('storage', loadFavorites);
  }, []);

  // 2. 🚀 ИЗВЛИЧАНЕ НА ВСИЧКИ ДАННИ ВЕДНЪЖ (Премахва рефреша при филтриране)
  useEffect(() => {
    const fetchAllTours = async () => {
      setLoading(true);
      try {
        const toursRef = collection(db, "tours");
        const q = query(toursRef, where("status", "==", "public"));
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ITour[];
        setAllTours(fetched);
      } catch (error) {
        console.error("Error fetching tours:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllTours();
  }, []);

  // 3. 🧠 МИГНОВЕНО ФИЛТРИРАНЕ НА КЛИЕНТА
  const filteredTours = useMemo(() => {
    let result = allTours.filter(tour => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!tour.title.toLowerCase().includes(q) && !tour.country.toLowerCase().includes(q)) return false;
      }
      if (filterContinent && tour.continent !== filterContinent) return false;
      if (filterCountry && tour.country !== filterCountry) return false;
      if (filterCategory && (!tour.categories || !tour.categories.includes(filterCategory))) return false;
      if (filterMonth) {
        const tourDates = [...(tour.dates || [])];
        if (tour.date) tourDates.push(tour.date);
        if (!tourDates.some(date => date.split('-')[1] === filterMonth)) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'price_asc') {
        const pA = parseFloat(a.price?.toString().replace(/[^0-9.]/g, '')) || 0;
        const pB = parseFloat(b.price?.toString().replace(/[^0-9.]/g, '')) || 0;
        return pA - pB;
      }
      if (sortBy === 'price_desc') {
        const pA = parseFloat(a.price?.toString().replace(/[^0-9.]/g, '')) || 0;
        const pB = parseFloat(b.price?.toString().replace(/[^0-9.]/g, '')) || 0;
        return pB - pA;
      }
      return (a.date || '').localeCompare(b.date || '');
    });
    return result;
  }, [allTours, filterContinent, filterCountry, filterCategory, filterMonth, sortBy, searchQuery]);

  // 4. ОПЦИИ ЗА МЕНЮТАТА (Винаги стабилни)
  const uniqueContinents = useMemo(() => 
    Array.from(new Set(allTours.map(t => t.continent).filter(Boolean))).sort(), 
  [allTours]);

  const uniqueCountries = useMemo(() => 
    Array.from(new Set(
      allTours
        .filter(t => filterContinent ? t.continent === filterContinent : true)
        .map(t => t.country)
        .filter(Boolean)
    )).sort(), 
  [allTours, filterContinent]);

  // 5. 🛠️ МАКИРОВКА НА ПРЕМИНАВАНЕТО (Инстантно скачане при рефреш)
  useEffect(() => {
    const hasJumpTarget = searchParams.get('continent') || window.location.hash === '#tours-grid';
    
    if (hasJumpTarget && !loading) {
      const element = document.getElementById('tours-grid');
      if (element) {
        const yOffset = -100;
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        // Използваме 'instant', за да скрием процеса на скролиране
        window.scrollTo({ top: y, behavior: 'instant' });
      }
    }
  }, [loading, searchParams]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key === 'continent') params.delete('country');
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  const clearFilters = () => router.replace('/', { scroll: false });

  const scrollToResults = () => {
    if (resultsRef.current) {
      const yOffset = -100;
      const y = resultsRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const toggleFavorite = (e: React.MouseEvent, tour: ITour) => {
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

  const getAllDates = (tour: ITour) => {
    let dates = [...(tour.dates || [])];
    if (tour.date) {
      const parts = tour.date.split('-');
      const mainIso = parts[0].length === 2 ? parts.reverse().join('-') : tour.date;
      if (!dates.includes(mainIso)) dates.push(mainIso);
    } return dates.sort();
  };

  // Ако е първоначално зареждане, показваме глобален лоудър, за да маскираме Hero-то при нужда
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  let lastYear = "";

  return (
    <section id="tours-grid" className="container mx-auto px-6 py-16 scroll-mt-20 relative overflow-hidden">
      
      <div className="absolute top-20 left-0 w-96 h-96 bg-brand-gold/5 rounded-full blur-[120px] pointer-events-none -translate-x-1/2" />
      <div className="absolute bottom-40 right-0 w-80 h-80 bg-blue-900/5 rounded-full blur-[100px] pointer-events-none translate-x-1/2" />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 relative z-20 border-b border-brand-gold/10 pb-6">
          <div>
              <div className="flex items-center gap-2 mb-2">
                  <Globe2 size={18} className="text-brand-gold"/>
                  <span className="text-brand-gold text-xs font-black uppercase tracking-[0.2em]">Пътешествия</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-serif text-brand-dark leading-tight">
                  Всички <span className="italic text-brand-gold">Предложения</span>
              </h2>
              {(filterCountry || filterContinent) && (
                <div className="mt-2 flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div className="h-[1px] w-6 bg-brand-gold"></div>
                    <span className="text-xl md:text-2xl font-serif italic text-brand-dark/70">
                        {filterCountry || filterContinent}
                    </span>
                </div>
              )}
          </div>

          <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                  <p className="text-3xl font-bold text-brand-dark leading-none">{filteredTours.length}</p>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Намерени</p>
              </div>

              <button 
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className={`flex items-center gap-3 px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs transition-all duration-300 border
                    ${isFiltersOpen ? 'bg-brand-dark text-white border-brand-dark shadow-lg scale-105' : 'bg-white text-brand-dark border-brand-gold/30 hover:border-brand-gold hover:shadow-md'}
                `}
              >
                {isFiltersOpen ? <X size={16}/> : <SlidersHorizontal size={16} className="text-brand-gold"/>}
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

      {/* ФИЛТЪР ПАНЕЛ */}
      <div className={`${isFiltersOpen ? 'block' : 'hidden'} animate-in slide-in-from-top-4 fade-in duration-300 mb-12`}>
         <FiltersBar 
            isOpen={true} 
            toggleOpen={() => {}} 
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
            resultsCount={filteredTours.length}
            scrollToResults={scrollToResults}
          />
      </div>

      {/* РЕЗУЛТАТИ */}
      <div ref={resultsRef} className="scroll-mt-32 relative z-10">
        {filteredTours.length === 0 ? (
            <div className="text-center py-20 opacity-50 min-h-[400px] flex flex-col items-center justify-center">
                <Filter size={48} className="mx-auto text-gray-300 mb-4"/>
                <h3 className="text-2xl font-serif text-gray-400">Няма намерени резултати</h3>
                <p className="text-sm text-gray-400">Опитайте да промените критериите за търсене.</p>
                <button onClick={clearFilters} className="mt-4 text-brand-gold font-bold underline hover:text-brand-dark transition-colors">Изчисти всички филтри</button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16 items-start">
            {filteredTours.map((tour) => {
                let allDatesISO = getAllDates(tour);
                let tourYear = ""; if (allDatesISO.length > 0) tourYear = allDatesISO[0].split('-')[0];
                const showYearHeader = tourYear !== lastYear && tourYear !== ""; if (showYearHeader) lastYear = tourYear;
                const isFav = favorites.some((f: any) => f.id === (tour.tourId || tour.id));

                return (
                <React.Fragment key={tour.id}>
                    {showYearHeader && (
                    <div className="col-span-full text-left mb-4 mt-8 flex items-center gap-4 animate-in fade-in duration-700">
                        <h3 className="text-5xl md:text-6xl font-serif italic text-brand-gold/20 select-none">{tourYear}</h3>
                        <div className="h-[1px] flex-grow bg-brand-gold/10"></div>
                    </div>
                    )}
                    <TourCard 
                        tour={tour} 
                        isFav={isFav} 
                        toggleFavorite={toggleFavorite} 
                        isLedByPoli={!!tour.categories?.includes('Водена от ПОЛИ')}
                    />
                </React.Fragment>
                );
            })}
            </div>
        )}
      </div>
    </section>
  );
}