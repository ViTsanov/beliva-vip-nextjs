"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Filter, Globe2, Check, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CATEGORY_OPTIONS, ALL_MONTHS } from '@/components/FiltersBar';
import DeparturesCalendar from './DeparturesCalendar';
import QuickFilters from './QuickFilters';
import TourCard from '@/components/tours/TourCard';
import { ITour } from '@/types';
import { slugify } from '@/lib/admin-helpers';
import { WORLD_COUNTRIES } from '@/lib/constants';
import { useMounted } from '@/lib/hooks/useMounted';

interface ToursGridProps {
  initialTours?: ITour[];
  hideFilters?: boolean;
  todayStr: string;
}

const getNormalizedDate = (dateStr: string) => {
  if (!dateStr) return "9999-99-99";
  const clean = String(dateStr).split('T')[0].trim();
  const sep = clean.includes('-') ? '-' : clean.includes('.') ? '.' : clean.includes('/') ? '/' : null;
  if (!sep) return "9999-99-99";
  const parts = clean.split(sep).map(p => p.trim());
  if (parts.length !== 3) return "9999-99-99";
  const [a, b, c] = parts;
  if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
  if (c.length === 4) return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
  return "9999-99-99";
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

export default function ToursGrid({ initialTours = [], hideFilters = false, todayStr }: ToursGridProps) {
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

  // За календара по месеци: изчислението му зависи от "днешна дата", която е различна между сървърния
  // рендър и клиентската хидратация и гърми хидратационна грешка — затова календарът
  // се появява едва след реално монтиране на клиента, когато това вече не влиза в хидратацията.
  const mounted = useMounted();

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

  // Общ helper за нормализиране на дата към YYYY-MM-DD, независимо от входния формат ("-", ".", "/")
  const normDate = (d: string): string => {
    if (!d) return '';
    const clean = d.split('T')[0].trim();
    const sep = clean.includes('-') ? '-' : clean.includes('.') ? '.' : clean.includes('/') ? '/' : null;
    if (!sep) return '';
    const parts = clean.split(sep).map(p => p.trim());
    if (parts.length !== 3) return '';
    const [a, b, c] = parts;
    if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`; // YYYY-MM-DD
    if (c.length === 4) return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`; // DD.MM.YYYY / DD/MM/YYYY
    return '';
  };

  // Общ predicate, който проверява един тур срещу всички активни филтри — със възможност да пропуснем един конкретен филтър.
  // Това ни позволява всяка бърза картина (календар, категории, континенти) да отразява всички ДРУГИ
  // активни филтри, без да се самоограничава до вече избраната си стойност.
  const passesFilters = (tour: ITour, opts: { skipCountry?: boolean; skipContinent?: boolean; skipCategory?: boolean; skipMonth?: boolean } = {}) => {
    const allDates = [
      ...(tour.dates || []).map(d => normDate(String(d))),
      ...(tour.date ? [normDate(tour.date)] : [])
    ].filter(Boolean);

    if (allDates.length === 0) return false; // Няма дати изобщо — скрий
    const hasFutureDate = allDates.some(d => d >= todayStr);
    if (!hasFutureDate) return false; // Всички дати са минали — скрий

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const titleMatch = tour.title?.toLowerCase().includes(q);
      const countryMatch = Array.isArray(tour.country)
        ? tour.country.some(c => c.toLowerCase().includes(q))
        : tour.country?.toLowerCase().includes(q);
      if (!titleMatch && !countryMatch) return false;
    }

    if (!opts.skipCountry && filterCountry) {
      const tourCountries = typeof tour.country === 'string'
        ? tour.country.split(',').map(c => c.trim())
        : (Array.isArray(tour.country) ? tour.country : []);
      if (!tourCountries.some(c => slugify(c) === filterCountry)) return false;
    }

    if (!opts.skipContinent && filterContinent) {
      if (slugify(tour.continent || "") !== filterContinent) return false;
    }

    if (!opts.skipCategory && filterCategory) {
      const cats = tour.categories || [];
      if (!cats.some(c => slugify(c) === filterCategory)) return false;
    }

    if (!opts.skipMonth && filterMonth) {
      const isYearMonth = filterMonth.length === 7;
      const matches = isYearMonth
        ? allDates.some(iso => iso.slice(0, 7) === filterMonth)
        : allDates.some(iso => iso.split('-')[1] === filterMonth);
      if (!matches) return false;
    }

    return true;
  };

  // Всички филтри ОСВЕН месец — преизползва се от календара по месеци (който трябва да показва целия диапазон,
  // независимо кой месец вече е избран).
  const preMonthTours = useMemo(() =>
    allTours.filter(t => passesFilters(t, { skipMonth: true })),
  [allTours, filterContinent, filterCountry, filterCategory, searchQuery, todayStr]);

  // Само за континент-плочките: всички филтри вкл. месец, НО без континент — така плочките реално се стесняват
  // до избрания месец, но все още показват всички континенти (не само вече избрания), за да може да се превключва.
  const toursForContinentFacet = useMemo(() =>
    allTours.filter(t => passesFilters(t, { skipContinent: true })),
  [allTours, filterCountry, filterCategory, filterMonth, searchQuery, todayStr]);

  // Само за категорийните чипове: аналогично — всичко вкл. месец, без категория.
  const toursForCategoryFacet = useMemo(() =>
    allTours.filter(t => passesFilters(t, { skipCategory: true })),
  [allTours, filterCountry, filterContinent, filterMonth, searchQuery, todayStr]);

  const filteredTours = useMemo(() => {
    let result = allTours.filter(t => passesFilters(t, {}));

    // Сортиране
    result = [...result].sort((a, b) => {
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
  }, [allTours, filterContinent, filterCountry, filterCategory, filterMonth, sortBy, searchQuery, todayStr]);

  // Данни за лентата "Разгледай по месеци" — започва от ТЕКУЩИЯ месец и продължава докато има
  // реално добавена в админ екскурзия (не фиксирани 12 месеца) — с годишен маркер при смяна на година.
  // Слагаме кап от 36 месеца като защита срещу случайно въведена грешна дата (напр. година 2099).
  const calendarMonths = useMemo(() => {
    const currentYear = parseInt(todayStr.slice(0, 4), 10);
    const currentMonthNum = parseInt(todayStr.slice(5, 7), 10); // 1-12

    let maxYear = currentYear;
    let maxMonthNum = currentMonthNum;

    const monthlyBuckets = new Map<string, ITour[]>(); // key = "YYYY-MM"

    preMonthTours.forEach(tour => {
      const allDatesISO = [
        ...(tour.dates || []).map(d => normDate(String(d))),
        ...(tour.date ? [normDate(tour.date)] : [])
      ].filter(iso => iso && iso >= todayStr);

      const monthsForTour = new Set<string>();
      allDatesISO.forEach(iso => monthsForTour.add(iso.slice(0, 7)));

      monthsForTour.forEach(ym => {
        const [y, m] = ym.split('-').map(Number);
        if (y > maxYear || (y === maxYear && m > maxMonthNum)) { maxYear = y; maxMonthNum = m; }
        if (!monthlyBuckets.has(ym)) monthlyBuckets.set(ym, []);
        monthlyBuckets.get(ym)!.push(tour);
      });
    });

    // Ограничаваме диапазона до разумен максимум (3 години), за да не експлодира при грешно въведена дата
    const cappedTotalMonths = Math.min(
      (maxYear - currentYear) * 12 + (maxMonthNum - currentMonthNum) + 1,
      36
    );

    const result: { value: string; label: string; year: number; count: number; countries: string[]; isFirstOfYear: boolean }[] = [];
    let y = currentYear;
    let m = currentMonthNum;
    for (let i = 0; i < cappedTotalMonths; i++) {
      const ym = `${y}-${String(m).padStart(2, '0')}`;
      const tours = monthlyBuckets.get(ym) || [];
      const countries = Array.from(new Set(
        tours.flatMap(t => Array.isArray(t.country) ? t.country : (t.country ? [t.country] : []))
      ));
      result.push({
        value: ym,
        label: ALL_MONTHS[m - 1].label,
        year: y,
        count: tours.length,
        countries,
        isFirstOfYear: i === 0 || m === 1,
      });
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return result;
  }, [preMonthTours, todayStr]);

  // Снимки за континентите в бързите филтри — вземаме реална снимка от първия намерен тур за този континент
  // (вместо генерични стокови снимки) — така винаги отразява реалното съдържание.
  // Свързан с товрсФацет (а не preMonthTours) — така ако е избран месец, остават само континентите,
  // които реално имат заминавания точно този месец.
  const continentTiles = useMemo(() => {
    const CONTINENT_LIST = ['Азия', 'Европа', 'Африка', 'Северна Америка', 'Южна Америка', 'Австралия'];
    return CONTINENT_LIST.map(continent => {
      const toursForContinent = toursForContinentFacet.filter(t => t.continent === continent);
      return {
        name: continent,
        slug: slugify(continent),
        count: toursForContinent.length,
        img: toursForContinent.find(t => t.img)?.img || '',
      };
    }).filter(c => c.count > 0);
  }, [toursForContinentFacet]);

  // Само категориите, които реално имат екскурзии (напр. в избрания месец) — крие останалите вместо да ги сиви.
  const availableCategories = useMemo(() => {
    return CATEGORY_OPTIONS.filter(cat => {
      const slug = slugify(cat);
      return toursForCategoryFacet.some(t => (t.categories || []).some(c => slugify(c) === slug));
    });
  }, [toursForCategoryFacet]);

  // Читаемо име на избрания месец, за надписа "Налични за месец X" над бързите филтри.
  // Поддържа и "MM" (от простото меню), и "YYYY-MM" (от календара) — във втория случай добавя годината.
  const selectedMonthLabel = useMemo(() => {
    if (!filterMonth) return '';
    if (filterMonth.length === 7) {
      const [y, m] = filterMonth.split('-');
      const label = ALL_MONTHS[parseInt(m, 10) - 1]?.label;
      return label ? `${label} ${y}` : '';
    }
    return ALL_MONTHS[parseInt(filterMonth, 10) - 1]?.label || '';
  }, [filterMonth]);

  // "Дълбок линк" scroll — само при първоначално зареждане на страницата (напр. линк от Footer "Топ Дестинации" с ?country=... в URL-а).
  // НАРОЧИТО без searchParams в dependency array — ако следеше searchParams, щеше се ре-тригва при всяко
  // интерактивно кликване на филтър и ще се бие с scrollToResults() по-долу — точно това правеше страницата
  // видимо да „скача“ нагоре след всяко кликване.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key === 'continent') params.delete('country');
    // Без #tours-grid тук — наличието му в URL-а караше браузъра/Next.js да скача мигновено към този елемент,
    // което се биеше със плавния scrollToResults() по-долу и правеше видимото „долу-горе“ подскачане.
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  const clearFilters = () => router.replace('/#tours-grid', { scroll: false });

  const scrollToResults = () => {
    if (resultsRef.current) {
      const yOffset = -100;
      const y = resultsRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleSelectMonth = (value: string) => {
    updateParam('month', filterMonth === value ? '' : value);
  };

  const handleSelectCategory = (value: string) => {
    updateParam('cat', filterCategory === value ? '' : value);
  };

  const handleSelectContinent = (value: string) => {
    updateParam('continent', filterContinent === value ? '' : value);
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

  // Реверс-lookup от slug (каквато е в URL-а, напр. "vodena-ot-poli") към читаемо име на български —
  // преди това се показваше суровият slug, защото сравнението беше със суров текст вместо със slug.
  const displayCategoryName = filterCategory
    ? (CATEGORY_OPTIONS.find(c => slugify(c) === filterCategory) || filterCategory)
    : '';

  const hasActiveFilters = !!(searchQuery || filterCountry || filterContinent || filterCategory || filterMonth);

  // Малка "чипка" за активен филтър — със собствен бутон за премахване, за да не се налага
  // на потребителя да скролва обратно до пикъра само за да изчисти един филтър.
  const renderFilterChip = (label: string, onRemove: () => void) => (
    <button
      key={label}
      onClick={onRemove}
      className="group flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-white border border-brand-gold/25 text-brand-dark text-[11px] font-bold hover:border-brand-gold hover:bg-brand-gold/5 transition-all shadow-sm"
    >
      {label}
      <span className="w-4 h-4 rounded-full bg-gray-100 group-hover:bg-brand-gold text-gray-400 group-hover:text-white flex items-center justify-center transition-colors">
        <X size={10} />
      </span>
    </button>
  );

  return (

    <div
      className="w-full py-16 relative overflow-hidden bg-#f7f0e4"
    >

    <section
      id="tours-grid"
      className="container mx-auto px-6 scroll-mt-20 relative"
    >
      

      {/* HEADER — тъмен текст — заглавието е в центъра на container-а, който винаги седи върху кремавото „плато“ на градиента,
          не върху тъмно синьото (то е видимо само в празните полета отстрани, извън контейнера). */}
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
                {filterCategory && (
                  <div className="mt-2 flex items-center justify-center md:justify-start gap-2 animate-in fade-in slide-in-from-left-4 duration-500">
                      <div className="h-[1px] w-6 bg-brand-gold"></div>
                      <span className="text-xl md:text-2xl font-serif italic text-brand-dark/70">
                          {filterCategory === slugify('Водена от ПОЛИ') ? 'Групи с Поли' : displayCategoryName}
                      </span>
                  </div>
                )}
            </div>

            <div className="flex items-center justify-center md:justify-end w-full md:w-auto mt-4 md:mt-0">
                <div className="bg-gradient-to-br from-white to-brand-gold/5 border border-brand-gold/15 rounded-2xl px-6 py-3 text-center md:text-right shadow-sm">
                    <p className="text-3xl font-bold text-brand-dark leading-none">{filteredTours.length}</p>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Намерени</p>
                </div>
            </div>
        </div>
      }

      {/* Активни филтри — видими веднага, всеки премахваем поотделно, без да се налага скрол обратно до пикърите */}
      {!hideFilters && hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-8 relative z-20">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mr-1">Активни филтри:</span>
          {searchQuery && renderFilterChip(`„${searchQuery}“`, () => updateParam('q', ''))}
          {filterContinent && renderFilterChip(displayContinentName, () => updateParam('continent', ''))}
          {filterCountry && renderFilterChip(displayCountryName, () => updateParam('country', ''))}
          {filterCategory && renderFilterChip(
            filterCategory === slugify('Водена от ПОЛИ') ? 'Групи с Поли' : displayCategoryName,
            () => updateParam('cat', '')
          )}
          {filterMonth && renderFilterChip(selectedMonthLabel, () => updateParam('month', ''))}
          <button
            onClick={clearFilters}
            className="text-[10px] font-black uppercase tracking-widest text-brand-gold hover:text-brand-dark underline underline-offset-2 ml-1"
          >
            Изчисти всички
          </button>
        </div>
      )}

      {!hideFilters && mounted && (
        <>
          <DeparturesCalendar months={calendarMonths} activeMonth={filterMonth} onSelectMonth={handleSelectMonth} />
          <QuickFilters
            categories={availableCategories}
            activeCategory={filterCategory}
            onSelectCategory={handleSelectCategory}
            slugify={slugify}
            continents={continentTiles}
            activeContinent={filterContinent}
            onSelectContinent={handleSelectContinent}
            scopedMonthLabel={selectedMonthLabel}
          />
          {/* Единствено действие, което скролва надолу — докато клиентът избира филтри, страницата остава отгоре,
              докато той не реши да види резултатите. */}
          <div className="flex justify-center mb-10 md:mb-12">
            <button
              onClick={scrollToResults}
              className="flex items-center justify-center gap-2 px-10 py-4 rounded-full font-black uppercase text-xs tracking-widest bg-brand-dark text-white border border-brand-dark hover:bg-brand-gold hover:text-brand-dark hover:border-brand-gold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Check size={16} /> Виж намерените {filteredTours.length} екскурзии
            </button>
          </div>
        </>
      )}

      {/* РЕЗУЛТАТИ — без отделен фон вече — цялата container зона вече е кремава от външния градиент (платото му). */}
      <div ref={resultsRef} className="scroll-mt-32 relative z-10 pt-4 md:pt-0">
        {filteredTours.length === 0 ? (
            <div className="text-center py-20 min-h-[400px] flex flex-col items-center justify-center">
                <Filter size={48} className="mx-auto text-brand-dark/30 mb-4"/>
                <h3 className="text-2xl font-serif text-brand-dark/60">Няма намерени резултати</h3>
                <p className="text-sm text-brand-dark/50">Опитайте да промените критериите за търсене.</p>
                <button onClick={clearFilters} className="mt-4 text-brand-dark font-bold underline hover:opacity-70 transition-opacity">Изчисти всички филтри</button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16 items-start">
            {filteredTours.map((tour, index) => {
                const earliestDate = getEarliestDate(tour);
                let tourYear = earliestDate !== "9999-99-99" ? earliestDate.split('-')[0] : "";
                
                const showYearHeader = tourYear !== lastYear && tourYear !== ""; 
                if (showYearHeader) lastYear = tourYear;
                
                const isFav = favorites.some((f: any) => f.id === (tour.tourId || tour.id));

                return (
                <React.Fragment key={tour.id}>
                    {showYearHeader && (
                    <div className="col-span-full text-left mb-4 mt-8 flex items-center gap-4 animate-in fade-in duration-700">
                        <h3 className="text-5xl md:text-6xl font-serif italic text-brand-dark/15 select-none">{tourYear}</h3>
                        <div className="h-[1px] flex-grow bg-brand-dark/10"></div>
                    </div>
                    )}
                    <TourCard 
                        tour={tour} 
                        isFav={isFav} 
                        toggleFavorite={toggleFavorite} 
                        isLedByPoli={!!tour.categories?.includes('Водена от ПОЛИ')}
                        priority={index < 3}
                    />
                </React.Fragment>
                );
            })}
            </div>
        )}
      </div>
    </section>
    </div>
  );
}