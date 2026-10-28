"use client";

import React, { Suspense, useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Filter, Globe2, X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CATEGORY_OPTIONS, ALL_MONTHS } from '@/components/FiltersBar';
import DeparturesCalendar from './DeparturesCalendar';
import QuickFilters from './QuickFilters';
import TourCard from '@/components/tours/TourCard';
import { ITour } from '@/types';
import { slugify } from '@/lib/admin-helpers';
import { WORLD_COUNTRIES, COUNTRY_TO_CONTINENT } from '@/lib/constants';
import { useMounted } from '@/lib/hooks/useMounted';
import { useScrollLock } from '@/lib/hooks/useScrollLock';
import { useBackToClose } from '@/lib/hooks/useBackToClose';

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

// Държавите на тура като масив — полето country може да е низ "А, Б" или масив.
const getTourCountries = (tour: ITour): string[] =>
  typeof tour.country === 'string'
    ? tour.country.split(',').map(c => c.trim()).filter(Boolean)
    : (Array.isArray(tour.country) ? tour.country.filter(Boolean) : []);

// Континентите на тура се извличат от ДЪРЖАВИТЕ му чрез фиксираното COUNTRY_TO_CONTINENT, а не само от
// единичното поле tour.continent. Така тур "Сингапур + Австралия" принадлежи и на Азия, и на Австралия —
// показва се и при двата континента, а Сингапур остава канонично само в Азия.
// tour.continent се ползва като резерва, ако някоя държава липсва в мапинга.
const getTourContinents = (tour: ITour): string[] => {
  const result = new Set<string>();
  let hasUnmapped = false;
  getTourCountries(tour).forEach(c => {
    const continent = COUNTRY_TO_CONTINENT[c];
    if (continent) result.add(continent);
    else hasUnmapped = true;
  });
  if ((hasUnmapped || result.size === 0) && tour.continent) result.add(tour.continent);
  return Array.from(result);
};

// useSearchParams() на статична (ISR) страница кара Next да НЕ рендира компонента на сървъра — в HTML-а
// стоеше само спинър и целият каталог (и снимките му) се появяваше едва след като JavaScript-ът се зареди.
// Затова параметрите се четат в този малък компонент в собствен Suspense: каталогът се рендира на сървъра
// без филтри, а филтрите от адреса се прилагат веднага след зареждане (useLayoutEffect — преди да се изрисува
// кадър при навигация в сайта).
function SearchParamsSync({ onChange }: { onChange: (query: string) => void }) {
  const query = useSearchParams().toString();
  useLayoutEffect(() => { onChange(query); }, [query, onChange]);
  return null;
}

export default function ToursGrid({ initialTours = [], hideFilters = false, todayStr }: ToursGridProps) {
  const [query, setQuery] = useState('');
  const searchParams = useMemo(() => new URLSearchParams(query), [query]);
  const resultsRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);

  // Панелът с филтри е затворен по подразбиране — над първата екскурзия има бутон „Филтри“, който го отваря.
  // filtersEverOpened: съдържанието се монтира едва при първото отваряне (календарът центрира избрания месец със
  // scrollIntoView, което не бива да върти страницата, докато панелът е сгънат), а после остава монтирано,
  // за да може затварянето да се анимира плавно.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersEverOpened, setFiltersEverOpened] = useState(false);
  // Състоянието на филтрите в момента на отваряне на панела — при затваряне сравняваме с него, за да решим дали да
  // върнем клиента към първата екскурзия (само ако нещо е променено). closeFiltersRef позволява на Escape
  // слушателя (регистриран по-рано от closeFilters) винаги да вика най-новата версия на функцията.
  const filtersKeyAtOpenRef = useRef('');
  const closeFiltersRef = useRef<() => void>(() => {});
  const filtersButtonRef = useRef<HTMLButtonElement>(null);

  // Бутонът Назад (телефон/браузър) затваря отворения панел с филтри, а не сменя страницата.
  useBackToClose(filtersOpen, () => closeFiltersRef.current());

  // Докато панелът е отворен, страницата зад него не се скролва — скролва се само панелът.
  useScrollLock(filtersOpen);
  // Докато панелът с филтри е отворен, плаващите бутони (чат, „нагоре“, бисквитки) се скриват — иначе застъпват
  // долната лента на панела. Правилото е в globals.css ([data-dialog-open] [data-floating-button]).
  useEffect(() => {
    const html = document.documentElement;
    if (filtersOpen) html.dataset.dialogOpen = 'filters';
    else delete html.dataset.dialogOpen;
    return () => { delete html.dataset.dialogOpen; };
  }, [filtersOpen]);

  // Височина на фиксираното меню — лентата с бутона „Филтри“ се залепя точно под него, без процеп.
  // Мери се с ResizeObserver, защото менюто променя височината си (padding при скрол, мобилно/десктоп).
  // Пише се направо в стила на лентата и на панела, а не в state или в променлива на целия каталог: менюто анимира
  // височината си 0.5s в началото на скрола и иначе каталогът (50+ карти) се преизчисляваше на всеки кадър — на
  // телефон скролът засичаше точно тогава.
  const stickyBarRef = useRef<HTMLDivElement>(null);
  const filtersPanelRef = useRef<HTMLDivElement>(null);
  const navHeightRef = useRef(60);
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>('[data-site-navbar]');
    if (!nav) return;
    const update = () => {
      navHeightRef.current = Math.round(nav.getBoundingClientRect().height);
      if (stickyBarRef.current) stickyBarRef.current.style.top = `${navHeightRef.current - 1}px`;
      filtersPanelRef.current?.style.setProperty('--nav-h', `${navHeightRef.current}px`);
    };
    const observer = new ResizeObserver(update);
    // border-box е важно: при скрол менюто сменя само padding-а си (py-6 → py-3), а това НЕ променя content-box и
    // обикновеният ResizeObserver не би се задействал — лентата би останала на стара височина (видим процеп).
    observer.observe(nav, { box: 'border-box' });
    return () => observer.disconnect();
  }, []);

  // Escape затваря панела с филтри и връща фокуса на бутона
  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeFiltersRef.current();
        filtersButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtersOpen]);

  const searchQuery = searchParams.get('q') || '';
  const filterContinent = searchParams.get('continent') || '';
  const filterCountry = searchParams.get('country') || '';
  const filterMonth = searchParams.get('month') || '';
  const filterCategory = searchParams.get('cat') || '';
  const sortBy = searchParams.get('sort') || 'date';

  // 1. ВЕЧЕ ИЗПОЛЗВАМЕ initialTours ВМЕСТО ДА ТЕГЛИМ ОТ FIREBASE
  const [allTours] = useState<ITour[]>(initialTours);
  
  const [favorites, setFavorites] = useState<any[]>([]);

  // Фиксирани снимки за всеки континент, задавани в admin панела (Settings → Снимки за континентите). Заменява
  // по-ранната динамична логика (първата намерена снимка от тур за този континент), която правеше
  // снимката да скача всеки път, когато се сменят другите филтри (държава/месец).
  const [continentImages, setContinentImages] = useState<Record<string, string>>({});
  useEffect(() => {
    getDoc(doc(db, "settings", "continentImages")).then(snap => {
      if (snap.exists()) setContinentImages(snap.data() as Record<string, string>);
    }).catch(() => {});
  }, []);

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
      if (!getTourContinents(tour).some(c => slugify(c) === filterContinent)) return false;
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

  // Само за чиповете за държава: всичко вкл. месец, без държава (така че да може да се превключва
  // между държави в същия континент, без да изчезва останалите опции).
  const toursForCountryFacet = useMemo(() =>
    allTours.filter(t => passesFilters(t, { skipCountry: true })),
  [allTours, filterContinent, filterCategory, filterMonth, searchQuery, todayStr]);

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

  // Месеци без нито едно заминаване не се показват — първото място беше „Октомври — Няма дати“. Избраният месец
  // остава, дори да е празен (за да може да се махне). Маркерът за година се смята наново след махането.
  const visibleMonths = useMemo(() => {
    const shown = calendarMonths.filter(m => m.count > 0 || m.value === filterMonth);
    return shown.map((m, i) => ({ ...m, isFirstOfYear: i === 0 || m.year !== shown[i - 1].year }));
  }, [calendarMonths, filterMonth]);

  // Снимки за континентите в бързите филтри — вземаме реална снимка от първия намерен тур за този континент
  // (вместо генерични стокови снимки) — така винаги отразява реалното съдържание.
  // Свързан с товрсФацет (а не preMonthTours) — така ако е избран месец, остават само континентите,
  // които реално имат заминавания точно този месец.
  const continentTiles = useMemo(() => {
    const CONTINENT_LIST = ['Азия', 'Европа', 'Африка', 'Северна Америка', 'Южна Америка', 'Австралия'];
    // Ако е избрана държава, показваме САМО нейния канонален континент (Сингапур → само Азия),
    // вместо всички континенти на многодестинационните турове, в които участва.
    const selectedCountryName = filterCountry
      ? Object.keys(COUNTRY_TO_CONTINENT).find(c => slugify(c) === filterCountry)
      : undefined;
    const selectedCountryContinent = selectedCountryName ? COUNTRY_TO_CONTINENT[selectedCountryName] : undefined;
    return CONTINENT_LIST.map(continent => {
      const toursForContinent = toursForContinentFacet.filter(t => getTourContinents(t).includes(continent));
      return {
        name: continent,
        slug: slugify(continent),
        count: toursForContinent.length,
        img: continentImages[continent] || toursForContinent.find(t => t.img)?.img || '',
      };
    }).filter(c => c.count > 0 && (!selectedCountryContinent || c.name === selectedCountryContinent));
  }, [toursForContinentFacet, continentImages, filterCountry]);

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
    // От адреса, а не от searchParams: при първото изпълнение SearchParamsSync още не ги е подал.
    const urlParams = new URLSearchParams(window.location.search);
    const hasActiveDeepLink =
        urlParams.get('country') ||
        urlParams.get('continent') ||
        urlParams.get('cat') ||
        window.location.hash === '#tours-grid';
    
    if (hasActiveDeepLink) {
      // Мястото на каталога се мери, след като страницата се подреди (шрифтове, снимки над него), а ако след
      // плавния скрол каталогът се е отместил — още една корекция. Иначе понякога се спираше по-горе от него.
      const targetY = () => {
        const element = document.getElementById('tours-grid');
        return element ? element.getBoundingClientRect().top + window.pageYOffset - 100 : null;
      };
      const first = window.setTimeout(() => {
        const y = targetY();
        if (y !== null) window.scrollTo({ top: y, behavior: 'smooth' });
      }, 120);
      const check = window.setTimeout(() => {
        const y = targetY();
        if (y !== null && Math.abs(window.pageYOffset - y) > 40) window.scrollTo({ top: y, behavior: 'smooth' });
      }, 1100);
      return () => { window.clearTimeout(first); window.clearTimeout(check); };
    }
  }, []);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key === 'continent') params.delete('country');
    // Без #tours-grid тук — наличието му в URL-а караше браузъра/Next.js да скача мигновено към този елемент,
    // което се биеше със плавния scrollToResults() по-долу и правеше видимото „долу-горе“ подскачане.
    // Докато панелът с филтри е отворен, смяната на филтър ЗАМЕСТВА записа в историята (replace), вместо да добавя
    // нов — иначе бутонът Назад би връщал филтъра, вместо да затвори панела.
    setUrlQuery(params.toString(), filtersOpen ? 'replace' : 'push');
  };

  const clearFilters = () => setUrlQuery('', 'replace', '#tours-grid');

  // Филтрите сменят само адреса (history API), без router.push/replace: те теглеха наново цялата начална страница
  // от сървъра (~100 KB) и чипът светваше едва след отговора — на телефон с мобилни данни бутоните изглеждаха
  // „мъртви“ по няколко секунди. setQuery прилага филтъра веднага, а Next следи pushState/replaceState и сам
  // обновява useSearchParams (и Назад/Напред). null вместо history.state: Next копира своите данни в записа, а
  // записът на useBackToClose отпада — както при router.replace досега (затварянето на панела не връща филтъра).
  const setUrlQuery = (next: string, mode: 'push' | 'replace', hash = '') => {
    setQuery(next);
    const url = `/${next ? `?${next}` : ''}${hash}`;
    if (mode === 'replace') window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
  };

  // Скролва до заглавието на секцията („Оферти за …“ / „Екскурзии в …“), така че да е точно под менюто — клиентът
  // вижда кой филтър е приложен и под него идват резултатите. Ако заглавието го няма (hideFilters) — до резултатите.
  const scrollToResults = () => {
    const target = headingRef.current ?? resultsRef.current;
    if (target) {
      const y = target.getBoundingClientRect().top + window.pageYOffset - (navHeightRef.current + 16);
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Отваряне/затваряне на панела с филтри.
  //  - Отваряне: запомняме текущите филтри. Панелът е центриран на екрана (position: fixed), затова се вижда от
  //    всяка позиция на скрола и страницата не се мести.
  //  - Затваряне: ако филтрите са същите като при отваряне — оставаме точно където сме. Ако са променени — плавен скрол
  //    до първата екскурзия (списъкът е нов, затова е смислено да се започне от началото му). forceScroll е за
  //    бутона „Виж намерените“, който скролва винаги.
  const filtersKey = [filterCountry, filterContinent, filterCategory, filterMonth].join('|');
  const filtersKeyRef = useRef(filtersKey);
  useEffect(() => {
    filtersKeyRef.current = filtersKey;
  });
  const openFilters = () => {
    filtersKeyAtOpenRef.current = filtersKey;
    setFiltersEverOpened(true);
    setFiltersOpen(true);
  };
  const closeFilters = (opts: { forceScroll?: boolean } = {}) => {
    setFiltersOpen(false);
    if (opts.forceScroll || filtersKeyRef.current !== filtersKeyAtOpenRef.current) {
      // малко изчакване, за да се освободи заключеният скрол на страницата преди плавното превъртане
      window.setTimeout(scrollToResults, 60);
    }
  };
  useEffect(() => {
    closeFiltersRef.current = () => closeFilters();
  });

  const handleSelectMonth = (value: string) => {
    updateParam('month', filterMonth === value ? '' : value);
  };

  const handleSelectCategory = (value: string) => {
    updateParam('cat', filterCategory === value ? '' : value);
  };

  const handleSelectContinent = (value: string) => {
    updateParam('continent', filterContinent === value ? '' : value);
  };

  const handleSelectCountry = (value: string) => {
    updateParam('country', filterCountry === value ? '' : value);
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

  // Избрана е само държава (напр. от „Филтрирайте офертите за Япония“) — континентът ѝ се показва като избран,
  // за да се вижда редицата с държавите и в нея избраната.
  const countryContinentSlug = useMemo(() => {
    if (!filterCountry) return '';
    const name = Object.keys(COUNTRY_TO_CONTINENT).find(c => slugify(c) === filterCountry);
    return name ? slugify(COUNTRY_TO_CONTINENT[name]) : '';
  }, [filterCountry]);
  const shownContinent = filterContinent || countryContinentSlug;

  // Държави в рамките на избрания континент — показва се САМО ако има избран континент (празен арай, ако
  // няма). Сортирани по брой турове, не азбучно — най-популярните държави първи.
  const countryOptionsForContinent = useMemo(() => {
    if (!shownContinent) return [];
    const continentName = ['Азия', 'Европа', 'Африка', 'Северна Америка', 'Южна Америка', 'Австралия']
      .find(c => slugify(c) === shownContinent);
    if (!continentName) return [];

    const countryMap = new Map<string, number>();
    toursForCountryFacet.forEach(t => {
      if (!getTourContinents(t).includes(continentName)) return;
      const countries = getTourCountries(t);
      // ВАЖНО: добавяме държавата САМО ако тя КАНОНИЧНО принадлежи към този континент — без
      // това, много-дестинационни турове като "Австралия + Сингапур" (continent: "Австралия")
      // биха показали Сингапур и под Австралия, дори той да е в Азия.
      countries.forEach(c => {
        if (c && COUNTRY_TO_CONTINENT[c] === continentName) {
          countryMap.set(c, (countryMap.get(c) || 0) + 1);
        }
      });
    });

    return Array.from(countryMap.entries())
      .map(([name, count]) => ({ name, slug: slugify(name), count }))
      .sort((a, b) => b.count - a.count);
  }, [shownContinent, toursForCountryFacet]);

  let lastYear = "";
  // Позиция на картата в реда (за поетапното ѝ появяване); нулира се след всяко заглавие с година.
  let column = 0;

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
  // Брой филтри от панела (без търсенето) — показва се като значка на бутона „Филтри“
  const panelFilterCount = [filterCountry, filterContinent, filterCategory, filterMonth].filter(Boolean).length;

  // Малка "чипка" за активен филтър — със собствен бутон за премахване, за да не се налага
  // на потребителя да скролва обратно до пикъра само за да изчисти един филтър.
  // keyId е задължителен и различен от самия текст (label) — без това континент и държава със
  // едно и също име (напр. „Австралия“ е и двете) биха дали еднакъв React key,
  // гърмящ console грешка за дублиран ключ.
  const renderFilterChip = (keyId: string, label: string, onRemove: () => void) => (
    <button
      key={keyId}
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
      className="w-full py-16 relative overflow-clip bg-white"
    >
    <Suspense fallback={null}>
      <SearchParamsSync onChange={setQuery} />
    </Suspense>

    <section
      id="tours-grid"
      className="container mx-auto px-6 scroll-mt-20 relative"
    >
      

      {/* HEADER — тъмен текст — заглавието е в центъра на container-а, който винаги седи върху кремавото „плато“ на градиента,
          не върху тъмно синьото (то е видимо само в празните полета отстрани, извън контейнера). */}
      {!hideFilters &&
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6 mb-4 md:mb-8 relative z-20">
            <div ref={headingRef} className="text-center md:text-left w-full md:w-auto">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                    <Globe2 size={18} className="text-brand-gold"/>
                    <span className="text-brand-goldDeep text-xs font-black uppercase tracking-[0.2em]">Пътешествия</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-serif text-brand-dark leading-tight">
                  {filterCountry ? (
                    <>Екскурзии в <span className="italic text-[#a37d0d]">{displayCountryName}</span></>
                  ) : filterContinent ? (
                    <>Оферти за <span className="italic text-[#a37d0d]">{displayContinentName}</span></>
                  ) : (
                    <>Всички <span className="italic text-[#a37d0d]">Предложения</span></>
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

        </div>
      }

      {/* Активни филтри — видими веднага, всеки премахваем поотделно, без да се налага скрол обратно до пикърите */}
      {!hideFilters && hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-8 relative z-20">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mr-1">Активни филтри:</span>
          {searchQuery && renderFilterChip('search', `„${searchQuery}“`, () => updateParam('q', ''))}
          {filterContinent && renderFilterChip('continent', displayContinentName, () => updateParam('continent', ''))}
          {filterCountry && renderFilterChip('country', displayCountryName, () => updateParam('country', ''))}
          {filterCategory && renderFilterChip(
            'category',
            filterCategory === slugify('Водена от ПОЛИ') ? 'Групи с Поли' : displayCategoryName,
            () => updateParam('cat', '')
          )}
          {filterMonth && renderFilterChip('month', selectedMonthLabel, () => updateParam('month', ''))}
          <button
            onClick={clearFilters}
            className="text-[10px] font-black uppercase tracking-widest text-brand-gold hover:text-brand-dark underline underline-offset-2 ml-1"
          >
            Изчисти всички
          </button>
        </div>
      )}

      {/* Затъмнение зад отворения панел — клик извън панела го затваря. Винаги е в DOM (само избледнява), за да има анимация. */}
      {!hideFilters && (
        <div
          onClick={() => closeFilters()}
          aria-hidden="true"
          className={`fixed inset-0 z-[40] touch-none bg-brand-dark/40 backdrop-blur-[2px] transition-opacity duration-300 ${
            filtersOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        />
      )}

      {/* Лента с бутона „Филтри“ — точно над първата екскурзия. sticky: след като клиентът стигне до грида, лентата
          се залепя ТОЧНО под менюто (top = измерената му височина, -1px за да няма процеп от закръгляне) и следва
          скрола. Панелът с филтрите е центриран на екрана (fixed), затова се вижда от всяка позиция и не измества
          екскурзиите. Външната обвивка е с overflow-clip (не overflow-hidden), защото hidden създава
          скрол контейнер и чупи sticky. Лек градиент под лентата (after:) мае съдържанието, което минава отдолу. */}
      {!hideFilters && (
        <div
          ref={stickyBarRef}
          style={{ top: 59 }}
          className="sticky z-30 -mx-6 mb-3 flex items-center justify-between gap-3 bg-white px-6 pb-2 pt-0.5 md:pb-3 before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-3 before:bg-white after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-4 after:bg-gradient-to-b after:from-white after:to-transparent"
        >
          <button
            ref={filtersButtonRef}
            type="button"
            onClick={() => (filtersOpen ? closeFilters() : openFilters())}
            aria-expanded={filtersOpen}
            aria-controls="tours-filters-panel"
            // Плътен тъмносин бутон (най-контрастното нещо в лентата), със сянка — за да се вижда върху бялото.
            // Докато панелът е отворен, става златен, за да е ясно, че е натиснат. Размерът е непроменен.
            className={`group flex items-center gap-2.5 rounded-full border px-5 py-3 text-xs font-black uppercase tracking-widest transition-[background-color,border-color,box-shadow,transform] duration-200 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark ${
              filtersOpen
                ? 'border-brand-gold bg-brand-gold text-brand-dark shadow-[0_6px_16px_-6px_rgba(127,98,14,0.55)]'
                : 'border-brand-dark bg-brand-dark text-white shadow-[0_6px_16px_-6px_rgba(15,23,42,0.55)] hover:border-slate-700 hover:bg-slate-700'
            }`}
          >
            <SlidersHorizontal size={16} className={filtersOpen ? 'text-brand-dark' : 'text-brand-gold'} aria-hidden="true" />
            Филтри
            {panelFilterCount > 0 && (
              <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-black ${filtersOpen ? 'bg-brand-dark text-white' : 'bg-brand-gold text-brand-dark'}`}>
                {panelFilterCount}
              </span>
            )}
            <ChevronDown size={16} className={`transition-transform duration-300 ${filtersOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          <p className="text-sm font-semibold text-brand-dark/60" aria-live="polite">
            {filteredTours.length} {filteredTours.length === 1 ? 'екскурзия' : 'екскурзии'}
          </p>
        </div>
      )}

      {/* Панелът с филтри е ИЗВЪН лентата: лентата (z-30) е под затъмнението (z-40) и потъмнява заедно със страницата, а панелът (z-50) е над затъмнението.
          Панел с филтри — центриран на екрана (position: fixed, в средата на видимата област под менюто), затова
          се вижда от всяка позиция на скрола. Височината му е ограничена до екрана и се скролва вътре в себе си
          (overscroll-contain — скролът не „изтича“ към страницата). `inert` вади скритите контроли от tab-реда
          и от екранните четци, докато е затворен. * */}
      {!hideFilters && (
          <div
            ref={filtersPanelRef}
            id="tours-filters-panel"
            role="dialog"
            aria-label="Филтри"
            inert={!filtersOpen}
            // Телефон: лист отдолу (bottom sheet) — опира в долния ръб, плъзга се нагоре, бутонът „Покажи“ е под палеца.
            // От sm: центриран прозорец под менюто, както преди. Бял панел върху затъмнената страница.
            className={`fixed inset-x-0 bottom-0 z-[50] max-h-[88svh] overflow-y-auto overscroll-contain rounded-t-3xl bg-white px-5 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_40px_-12px_rgba(15,23,42,0.45)] transition-[opacity,transform,visibility] duration-300 ease-out sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-[calc(var(--nav-h,60px)_+_(100svh_-_var(--nav-h,60px))_/_2)] sm:max-h-[calc(100svh_-_var(--nav-h,60px)_-_2rem)] sm:w-[calc(100%-1.5rem)] sm:max-w-5xl sm:-translate-x-1/2 sm:rounded-3xl sm:px-7 sm:pb-0 sm:shadow-[0_24px_60px_-12px_rgba(15,23,42,0.45)] ${
              filtersOpen
                ? 'visible translate-y-0 opacity-100 sm:-translate-y-1/2 sm:scale-100'
                : 'pointer-events-none invisible translate-y-full opacity-100 sm:-translate-y-1/2 sm:scale-95 sm:opacity-0'
            }`}
          >
            {/* Дръжка — показва, че това е лист, който е излязъл отдолу (само на телефон) */}
            <div aria-hidden="true" className="sticky top-0 z-40 -mx-5 flex justify-center bg-white pb-1 pt-2.5 sm:hidden">
              <span className="h-1.5 w-10 rounded-full bg-slate-300" />
            </div>
            {/* Заглавие + затваряне — лепкаво най-горе в панела. Панелът няма padding-top: sticky се измерва от съдържанието
                (вътре в padding-а), което иначе би избутало заглавието 24px надолу и би го наложило върху календара. */}
            <div className="sticky top-5 z-30 -mx-5 mb-6 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:top-0 sm:-mx-7 sm:px-7">
              <div>
                <h2 className="font-serif text-2xl italic leading-tight text-brand-dark">Филтри</h2>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  {filteredTours.length} {filteredTours.length === 1 ? 'екскурзия отговаря' : 'екскурзии отговарят'} на избора
                </p>
              </div>
              {/* Неутрален бутон — червеното подсказва грешка или изтриване, а тук само затваряме */}
              <button
                type="button"
                onClick={() => closeFilters()}
                aria-label="Затвори филтрите"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-brand-dark transition-colors hover:bg-brand-dark hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            {mounted && filtersEverOpened && (
              <>
                <div className="space-y-8 pb-2">
                <DeparturesCalendar months={visibleMonths} activeMonth={filterMonth} onSelectMonth={handleSelectMonth} />
                <QuickFilters
                  categories={availableCategories}
                  activeCategory={filterCategory}
                  onSelectCategory={handleSelectCategory}
                  slugify={slugify}
                  continents={continentTiles}
                  activeContinent={shownContinent}
                  onSelectContinent={handleSelectContinent}
                  countries={countryOptionsForContinent}
                  activeCountry={filterCountry}
                  onSelectCountry={handleSelectCountry}
                  scopedMonthLabel={selectedMonthLabel}
                />
                </div>
                {/* Лепкава лента най-долу в панела — винаги достъпна, дори панелът да е по-висок от екрана.
                    „Изчисти всички“ се показва само при избран филтър; главният бутон затваря и скролва до резултатите. */}
                <div className="sticky bottom-0 z-30 -mx-5 mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-100 bg-white px-5 py-4 sm:-mx-7 sm:px-7">
                  {panelFilterCount > 0 ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="min-h-11 whitespace-nowrap px-1 text-[14px] font-semibold text-brand-dark underline decoration-slate-300 decoration-2 underline-offset-[6px] transition-[text-decoration-color] hover:decoration-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
                    >
                      Изчисти всички
                    </button>
                  ) : <span />}
                  <button
                    type="button"
                    onClick={() => closeFilters({ forceScroll: true })}
                    className="ml-auto inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-brand-dark px-6 text-[15px] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-slate-700 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark sm:px-8"
                  >
                    {filteredTours.length === 0
                      ? 'Няма екскурзии с този избор'
                      : `Покажи ${filteredTours.length} ${filteredTours.length === 1 ? 'екскурзия' : 'екскурзии'}`}
                  </button>
                </div>
              </>
            )}
          </div>
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
            {filteredTours.map((tour) => {
                const earliestDate = getEarliestDate(tour);
                let tourYear = earliestDate !== "9999-99-99" ? earliestDate.split('-')[0] : "";
                
                const showYearHeader = tourYear !== lastYear && tourYear !== ""; 
                if (showYearHeader) { lastYear = tourYear; column = 0; }
                
                const isFav = favorites.some((f: any) => f.id === (tour.tourId || tour.id));

                return (
                <React.Fragment key={tour.id}>
                    {showYearHeader && (
                    <div className="col-span-full text-left mb-4 mt-8 flex items-center gap-4 animate-in fade-in duration-700">
                        <h3 className="text-5xl md:text-6xl font-serif italic text-brand-dark/50 select-none">{tourYear}</h3>
                        <div className="h-[1px] flex-grow bg-brand-dark/10"></div>
                    </div>
                    )}
                    <TourCard 
                        tour={tour} 
                        isFav={isFav} 
                        toggleFavorite={toggleFavorite} 
                        isLedByPoli={!!tour.categories?.includes('Водена от ПОЛИ')}
                        column={column++}
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