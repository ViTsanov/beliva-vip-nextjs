"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Filter, Globe2, X, SlidersHorizontal } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import FiltersBar from '@/components/FiltersBar';
import TourCard from '@/components/tours/TourCard';
import { ITour } from '@/types';
import { slugify } from '@/lib/admin-helpers';
import { WORLD_COUNTRIES } from '@/lib/constants';

interface ToursGridProps {
  initialTours?: ITour[];
  hideFilters?: boolean;
}

const getNormalizedDate = (dateStr: string) => {
  if (!dateStr) return "9999-99-99"; 
  const parts = dateStr.split('-');
  if (parts[0].length === 2) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr; 
};

const getEarliestDate = (tour: ITour) => {
  let allDates: string[] = [];
  if (tour.date) allDates.push(getNormalizedDate(tour.date));
  if (tour.dates && Array.isArray(tour.dates)) {
    tour.dates.forEach(d => {
       if(typeof d === 'string') allDates.push(getNormalizedDate(d));
    });
  }
  allDates.sort(); 
  return allDates.length > 0 ? allDates[0] : "9999-99-99";
};

export default function ToursGrid({ initialTours = [], hideFilters = false }: ToursGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resultsRef = useRef<HTMLDivElement>(null);

  const searchQuery = searchParams.get('q') || '';
  const filterContinent = searchParams.get('continent') || '';
  const filterCountry = searchParams.get('country') || '';
  const filterMonth = searchParams.get('month') || '';
  const filterCategory = searchParams.get('cat') || '';
  const sortBy = searchParams.get('sort') || 'date';

  // 1. ВЕЧЕ ИЗПОЛЗВАМЕ initialTours ВМЕСТО ДА ТЕГЛИМ ОТ FIREBASE
  const [allTours] = useState<ITour[]>(initialTours);
  
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const hasActiveFilters = !!(searchQuery || filterContinent || filterCountry || filterMonth || filterCategory);

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

  // 2. ИЗТРИВАМЕ useEffect-а, който извикваше getDocs от Firebase, защото вече нямаме нужда от него!

  const filteredTours = useMemo(() => {
    let result = allTours.filter(tour => {
      // 1. Търсене по ключова дума
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const titleMatch = tour.title?.toLowerCase().includes(q);
        const countryMatch = Array.isArray(tour.country) 
          ? tour.country.some(c => c.toLowerCase().includes(q))
          : tour.country?.toLowerCase().includes(q);

        if (!titleMatch && !countryMatch) return false;
      }

      // 2. Филтър Държава
      if (filterCountry) {
        const tourCountries = typeof tour.country === 'string' 
          ? tour.country.split(',').map(c => c.trim()) 
          : (Array.isArray(tour.country) ? tour.country : []);

        const hasMatch = tourCountries.some(c => slugify(c) === filterCountry);
        if (!hasMatch) return false;
      }

      // 3. Филтър Континент
      if (filterContinent) {
        const tourContinentSlug = slugify(tour.continent || "");
        if (tourContinentSlug !== filterContinent) return false;
      }

      // 4. Филтър Категория
      if (filterCategory) {
        // Уверяваме се, че имаме categories или categorySlugs
        const cats = tour.categories || [];
        const hasMatch = cats.some(c => slugify(c) === filterCategory);
        if (!hasMatch) return false;
      }
      
      // 5. Филтър Месец
      if (filterMonth) {
        const earliest = getEarliestDate(tour);
        const monthPart = earliest.split('-')[1]; 
        if (monthPart !== filterMonth) return false;
      }
      return true;
    });

    // Сортиране
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
      const dateA = getEarliestDate(a);
      const dateB = getEarliestDate(b);
      return dateA.localeCompare(dateB);
    });

    return result;
  }, [allTours, filterContinent, filterCountry, filterCategory, filterMonth, sortBy, searchQuery]);

  const uniqueContinents = useMemo(() => 
    Array.from(new Set(allTours.map(t => t.continent).filter(Boolean))).sort(), 
  [allTours]);

  const uniqueCountries = useMemo(() => {
    let list = allTours;
    if (filterContinent) {
        list = allTours.filter(t => slugify(t.continent || "") === filterContinent);
    }
    const countries = new Set<string>();
    list.forEach(t => {
        if (t.country) {
            const names = typeof t.country === 'string' 
                ? t.country.split(',').map(c => c.trim()) 
                : (Array.isArray(t.country) ? t.country : []);
            names.forEach(n => countries.add(n));
        }
    });
    return Array.from(countries).sort();
  }, [allTours, filterContinent]);

  useEffect(() => {
    const hasActiveDeepLink = 
        searchParams.get('country') || 
        searchParams.get('continent') || 
        searchParams.get('cat') ||
        (typeof window !== 'undefined' && window.location.hash === '#tours-grid');
    
    if (hasActiveDeepLink) {
      const element = document.getElementById('tours-grid');
      if (element) {
        const yOffset = -100;
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  }, [searchParams]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key === 'continent') params.delete('country');
    router.push(`/?${params.toString()}#tours-grid`, { scroll: false });
  };

  const clearFilters = () => router.replace('/#tours-grid', { scroll: false });

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

  let lastYear = "";

  const displayCountryName = filterCountry 
    ? (WORLD_COUNTRIES.find(c => slugify(c) === filterCountry) || filterCountry)
    : '';

  const displayContinentName = filterContinent 
    ? (['Азия', 'Европа', 'Африка', 'Северна Америка', 'Южна Америка', 'Австралия'].find(c => slugify(c) === filterContinent) || filterContinent)
    : '';

  return (
    
    <section id="tours-grid" className="container mx-auto px-6 py-16 scroll-mt-20 relative overflow-hidden">
      
      <div className="absolute top-20 left-0 w-96 h-96 bg-brand-gold/5 rounded-full blur-[120px] pointer-events-none -translate-x-1/2" />
      <div className="absolute bottom-40 right-0 w-80 h-80 bg-blue-900/5 rounded-full blur-[100px] pointer-events-none translate-x-1/2" />

      {/* HEADER */}
      {!hideFilters &&
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6 mb-6 md:mb-12 relative z-20 border-b border-brand-gold/10 pb-6">
            <div className="text-center md:text-left w-full md:w-auto">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                    <Globe2 size={18} className="text-brand-gold"/>
                    <span className="text-brand-gold text-xs font-black uppercase tracking-[0.2em]">Пътешествия</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-serif text-brand-dark leading-tight">
                  {filterCountry ? (
                    <>Екскурзии в <span className="italic text-brand-gold">{displayCountryName}</span></>
                  ) : filterContinent ? (
                    <>Оферти за <span className="italic text-brand-gold">{displayContinentName}</span></>
                  ) : (
                    <>Всички <span className="italic text-brand-gold">Предложения</span></>
                  )}
                </h2>
                {(filterCountry || filterContinent || filterCategory) && (
                  <div className="mt-2 flex items-center justify-center md:justify-start gap-2 animate-in fade-in slide-in-from-left-4 duration-500">
                      <div className="h-[1px] w-6 bg-brand-gold"></div>
                      <span className="text-xl md:text-2xl font-serif italic text-brand-dark/70">
                          {filterCountry || filterContinent || (filterCategory === 'Водена от ПОЛИ' ? 'Групи с Поли' : filterCategory)}
                      </span>
                  </div>
                )}
            </div>

            <div className="flex items-center justify-center md:justify-end gap-4 w-full md:w-auto mt-4 md:mt-0">
                <div className="text-right hidden md:block">
                    <p className="text-3xl font-bold text-brand-dark leading-none">{filteredTours.length}</p>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Намерени</p>
                </div>

                <button 
                  onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                  className={`flex items-center justify-center w-full md:w-auto gap-3 px-8 md:px-6 py-4 md:py-3 rounded-full font-bold uppercase tracking-widest text-xs transition-all duration-300 border
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
      }
      {/* ФИЛТЪР ПАНЕЛ */}
      <div className={`${isFiltersOpen ? 'block' : 'hidden'} animate-in slide-in-from-top-4 fade-in duration-300`}>
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
      <div ref={resultsRef} className="scroll-mt-32 relative z-10 pt-4 md:pt-0">
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
                const earliestDate = getEarliestDate(tour);
                let tourYear = earliestDate !== "9999-99-99" ? earliestDate.split('-')[0] : "";
                
                const showYearHeader = tourYear !== lastYear && tourYear !== ""; 
                if (showYearHeader) lastYear = tourYear;
                
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