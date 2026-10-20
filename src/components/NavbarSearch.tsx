"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, MapPin, FileText, Globe, ArrowRight, ChevronRight, Layout, Filter, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation'; // Трябва ни за навигацията към филтъра
import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';
import { slugify } from '@/lib/admin-helpers'; // Провери дали точно така се казва експорта
import { getActiveTours } from '@/services/tourService';
import { displayTourDate } from '@/lib/tourDates';
import { formatPrice } from '@/lib/formatPrice';
import { matchTour, matchPages, parseMonthQuery, splitWords, wordInText, upcomingDates, tourCountries, type StaticPage } from '@/lib/siteSearch';
import { useBackToClose, markModalNavigation } from '@/lib/hooks/useBackToClose';
import { useScrollLock } from '@/lib/hooks/useScrollLock';
import type { ITour } from '@/types';

// Колко дати да се виждат на ред в резултата; останалите са „+N“
const MAX_DATES_SHOWN = 3;

type FoundTour = ITour & { shownDates: string[]; datesFiltered: boolean };

// Цената е или число с валута („от 4325 €“), или текст („По запитване“) — тогава без „от“
const priceLabel = (price?: string) => {
  const formatted = formatPrice(price);
  if (!formatted) return '';
  return /\d/.test(formatted) ? `от ${formatted}` : formatted;
};

interface NavbarSearchProps {
    isScrolled?: boolean;
    isMobile?: boolean;
    iconOnly?: boolean;
    onCloseParent?: () => void;
}

export default function NavbarSearch({ isScrolled, isMobile, iconOnly, onCloseParent }: NavbarSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [queryText, setQueryText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // ДАННИ
  const [allTours, setAllTours] = useState<ITour[]>([]);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [uniqueCountries, setUniqueCountries] = useState<string[]>([]); // Списък с уникални държави
  const [todayISO, setTodayISO] = useState('');
  const [suggestedTours, setSuggestedTours] = useState<ITour[]>([]); // 3 случайни тура, докато полето е празно

  useEffect(() => { setMounted(true); }, []);

  // 1. Зареждаме данните веднъж – при първото отваряне на търсачката
  const [dataRequested, setDataRequested] = useState(false);
  useEffect(() => {
    if (!isOpen || dataRequested) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDataRequested(true);
    const fetchData = async () => {
      try {
        const postsQuery = query(collection(db, "posts"));
        const [activeTours, postsSnap] = await Promise.all([getActiveTours(), getDocs(postsQuery)]);

        // Както в списъка на началната страница — само турове с поне една предстояща дата
        const today = new Date().toISOString().split('T')[0];
        const tours = activeTours.filter(t => upcomingDates(t, today).length > 0);
        setTodayISO(today);
        setAllTours(tours);
        setSuggestedTours([...tours].sort(() => 0.5 - Math.random()).slice(0, 3));
        setAllPosts(postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Извличаме уникалните държави от всички турове
        setUniqueCountries(Array.from(new Set(tours.flatMap(tourCountries))));

      } catch (error) {
        console.error("Error loading search data", error);
      }
    };
    fetchData();
  }, [isOpen, dataRequested]);

  // 2. Логика за Търсене
  const { foundTours, foundPosts, foundPages, foundCountries, foundMonth } = useMemo(() => {
    if (!queryText.trim()) {
      return {
        foundTours: suggestedTours.map((t): FoundTour => ({ ...t, shownDates: upcomingDates(t, todayISO), datesFiltered: false })),
        foundPosts: [],
        foundPages: [] as StaticPage[],
        foundCountries: [] as string[],
        foundMonth: null,
      };
    }

    const lowerQuery = queryText.trim().toLowerCase();
    const words = splitWords(lowerQuery);

    // Търсене в държави (за бърз филтър) — „Япония“, „японията“, „Япония ноември“
    const matchedCountries = uniqueCountries.filter(c => words.some(word => wordInText(word, c.toLowerCase())));

    // Турове: думи от заглавието в произволен ред + месец/дата; подредени по първата (съвпадаща) дата
    const tours: FoundTour[] = [];
    allTours.forEach(t => {
      const match = matchTour(t, lowerQuery, todayISO);
      if (match && match.dates.length > 0) tours.push({ ...t, shownDates: match.dates, datesFiltered: match.datesFiltered });
    });
    tours.sort((a, b) => a.shownDates[0].localeCompare(b.shownDates[0]));

    // Търсене в постове — всички думи да са в заглавието или държавата
    const posts = allPosts.filter((p: any) => {
      const text = `${p.title || ''} ${p.relatedCountry || ''}`.toLowerCase();
      return words.every(word => wordInText(word, text));
    }).slice(0, 3);

    return {
      foundTours: tours,
      foundPosts: posts,
      foundPages: matchPages(lowerQuery),
      foundCountries: matchedCountries,
      foundMonth: parseMonthQuery(lowerQuery), // Търсене само по месец → бърз филтър
    };
  }, [queryText, allTours, allPosts, uniqueCountries, todayISO, suggestedTours]);

  // 3. Управление на прозореца
  const handleClose = () => {
    setIsOpen(false);
    setQueryText('');
    if (onCloseParent) onCloseParent();
  };

  // Бутонът Назад (на телефона) затваря търсачката, вместо да сменя страницата
  useBackToClose(isOpen, handleClose);
  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
      window.addEventListener('keydown', handleEsc);
      return () => {
        window.removeEventListener('keydown', handleEsc);
      };
    }
  }, [isOpen]);

  // Бърз филтър на началната страница — по държава или по месец
  const applyCountryFilter = (country: string) => applyHomeFilter(`/?country=${encodeURIComponent(slugify(country))}`);
  const applyMonthFilter = (month: string) => applyHomeFilter(`/?month=${encodeURIComponent(month)}`);

  const applyHomeFilter = (url: string) => {
      // Навигация от отворен модал — затварянето му не бива да връща историята назад
      markModalNavigation();
      handleClose();

      if (pathname === '/') {
          // Вече сме на началната страница: ToursGrid е монтиран и "дълбокият линк" скрол там се изпълнява само
          // при първоначално зареждане, а Next.js по подразбиране връща страницата най-горе при смяна на URL-а.
          // Затова спираме автоматичния скрол и скролваме ръчно до грида (-100px заради менюто).
          router.push(url, { scroll: false });
          setTimeout(() => {
              const grid = document.getElementById('tours-grid');
              if (grid) {
                  const y = grid.getBoundingClientRect().top + window.scrollY - 100;
                  window.scrollTo({ top: y, behavior: 'smooth' });
              }
          }, 100);
      } else {
          // От друга страница: началната се монтира наново и самата тя скролва до грида заради ?country=
          router.push(`${url}#tours-grid`);
      }
  };

  const hasResults = foundTours.length > 0 || foundPosts.length > 0 || foundPages.length > 0 || foundCountries.length > 0 || !!foundMonth;

  // Бутон за отваряне
  const TriggerButton = iconOnly ? (
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Търсене"
        className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <Search size={24} className={isScrolled ? 'text-brand-dark' : 'text-white'} />
      </button>
  ) : isMobile ? (
      <div onClick={() => setIsOpen(true)} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 w-full max-w-xs cursor-text">
        <span className="text-brand-dark text-sm font-bold flex-grow text-left opacity-50">Търсене...</span>
        <Search size={18} className="text-brand-gold"/>
      </div>
  ) : (
      <button onClick={() => setIsOpen(true)} className={`p-2 hover:bg-brand-gold/10 rounded-full transition-colors group ${isScrolled ? 'text-brand-dark' : 'text-white'}`} title="Търсене">
        <Search size={20} className="text-current group-hover:text-brand-gold transition-colors"/>
      </button>
  );

  return (
    <>
      {TriggerButton}

      {mounted && isOpen && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[9999] bg-brand-dark/90 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
              onClick={(e) => e.target === e.currentTarget && handleClose()}
            >
              <motion.div 
                initial={{ y: -50, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -20, opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden relative max-h-[80vh] flex flex-col"
              >
                {/* HEADER */}
                <div className="flex items-center gap-4 p-6 border-b border-gray-100 shrink-0">
                  <Search className="text-brand-gold" size={24} />
                  <input 
                    ref={inputRef}
                    type="text" 
                    placeholder="Държава, месец, екскурзия или 'Отзиви'..."
                    className="flex-grow text-xl text-brand-dark placeholder-gray-300 outline-none font-serif italic bg-transparent"
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                  />
                  <button onClick={handleClose} className="p-2 rounded-full text-red-500 hover:bg-red-50 transition-colors">
                    <X size={24} />
                  </button>
                </div>

                {/* RESULTS CONTAINER */}
                <div className="overflow-y-auto p-4 bg-gray-50/50 custom-scrollbar flex-grow">
                  
                  {!hasResults && queryText && (
                      <div className="text-center py-10 text-gray-400">Няма намерени резултати за "{queryText}".</div>
                  )}

                  {/* Празно поле: винаги бърз път до всички дестинации */}
                  {!queryText && (
                      <Link
                          href="/destinations"
                          onClick={handleClose}
                          className="mb-6 flex w-full items-center justify-between rounded-2xl border border-brand-gold/20 bg-brand-gold/5 p-3 text-left transition-all hover:bg-brand-gold hover:text-white group"
                      >
                          <span className="flex items-center gap-2 text-sm font-bold text-brand-dark group-hover:text-white">
                              <Globe size={16} className="text-brand-gold group-hover:text-white" aria-hidden="true" />
                              Всички дестинации
                          </span>
                          <ArrowRight size={16} className="text-brand-gold group-hover:text-white" aria-hidden="true"/>
                      </Link>
                  )}

                  {!queryText && !hasResults && (
                      <div className="text-center py-10 text-gray-300 flex flex-col items-center gap-2">
                          <Globe size={40} className="opacity-20"/>
                          <p className="text-sm">Въведете дестинация (напр. "Австралия"), месец (напр. "Ноември") или тема (напр. "Отзиви")</p>
                      </div>
                  )}

                  {/* 0. БЪРЗ ФИЛТЪР ПО ДЪРЖАВА ИЛИ МЕСЕЦ */}
                  {(foundCountries.length > 0 || foundMonth) && (
                      <div className="mb-6">
                          <h3 className="text-[10px] font-black uppercase text-brand-gold ml-2 tracking-widest mb-3 flex items-center gap-2">
                              <Filter size={12}/> Бърз достъп
                          </h3>
                          <div className="space-y-2">
                              {foundMonth && (
                                  <button
                                      onClick={() => applyMonthFilter(foundMonth.value)}
                                      className="w-full flex items-center justify-between bg-brand-gold/5 p-3 rounded-2xl border border-brand-gold/20 hover:bg-brand-gold hover:text-white transition-all group text-left"
                                  >
                                      <span className="font-bold text-brand-dark group-hover:text-white text-sm">
                                          Виж всички екскурзии през <span className="uppercase">{foundMonth.label}</span>
                                      </span>
                                      <ArrowRight size={16} className="text-brand-gold group-hover:text-white"/>
                                  </button>
                              )}
                              {foundCountries.map(country => (
                                  <button 
                                      key={country}
                                      onClick={() => applyCountryFilter(country)}
                                      className="w-full flex items-center justify-between bg-brand-gold/5 p-3 rounded-2xl border border-brand-gold/20 hover:bg-brand-gold hover:text-white transition-all group text-left"
                                  >
                                      <span className="font-bold text-brand-dark group-hover:text-white text-sm">
                                          Виж всички екскурзии за <span className="uppercase">{country}</span>
                                      </span>
                                      <ArrowRight size={16} className="text-brand-gold group-hover:text-white"/>
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* 1. ЕКСКУРЗИИ */}
                  {foundTours.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-[10px] font-black uppercase text-brand-gold ml-2 tracking-widest mb-3 flex items-center gap-2">
                            <MapPin size={12}/> Екскурзии ({foundTours.length})
                        </h3>
                        <div className="space-y-3">
                            {foundTours.map(item => (
                                <Link 
                                    key={item.id} 
                                    href={`/tour/${item.tourId || item.id}`}
                                    onClick={handleClose}
                                    className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-100 hover:border-brand-gold/30 hover:shadow-md transition-all group"
                                >
                                    <div className="flex flex-col gap-1 pl-2">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-brand-gold">
                                            {Array.isArray(item.country) ? item.country.join(', ') : item.country}
                                        </div>
                                        <h4 className="font-bold text-brand-dark text-lg leading-tight group-hover:text-brand-gold transition-colors">
                                            {item.title}
                                        </h4>
                                        {/* Предстоящите дати — при търсене по месец/дата само съвпадащите, в златно */}
                                        {item.shownDates.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-1 mt-1" aria-label="Дати на тръгване">
                                                <CalendarDays size={13} className="text-brand-gold shrink-0 mr-0.5" aria-hidden="true" />
                                                {item.shownDates.slice(0, MAX_DATES_SHOWN).map(d => (
                                                    <span
                                                        key={d}
                                                        className={`text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md ${
                                                            item.datesFiltered ? 'bg-brand-gold/15 text-brand-dark' : 'bg-gray-100 text-gray-600'
                                                        }`}
                                                    >
                                                        {displayTourDate(d)}
                                                    </span>
                                                ))}
                                                {item.shownDates.length > MAX_DATES_SHOWN && (
                                                    <span className="text-[11px] font-semibold text-gray-400 px-1">
                                                        +{item.shownDates.length - MAX_DATES_SHOWN}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {priceLabel(item.price) && (
                                            <span className="text-xs font-medium text-gray-500 mt-1">
                                                {priceLabel(item.price)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative w-20 h-14 rounded-xl overflow-hidden shrink-0 ml-4">
                                        <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                  )}

                  {/* 2. БЛОГ ПОСТОВЕ */}
                  {foundPosts.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-[10px] font-black uppercase text-brand-gold ml-2 tracking-widest mb-3 flex items-center gap-2">
                            <FileText size={12}/> Пътеводител & Блог
                        </h3>
                        <div className="space-y-3">
                            {foundPosts.map((post: any) => (
                                <Link 
                                    key={post.id} 
                                    href={`/blog/${post.slug || post.id}`}
                                    onClick={handleClose}
                                    className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-gray-100 hover:border-brand-gold/30 hover:shadow-md transition-all group"
                                >
                                    <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-200">
                                        {post.coverImg && <img src={post.coverImg} alt="" className="w-full h-full object-cover" />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-brand-dark text-sm leading-tight group-hover:text-brand-gold transition-colors line-clamp-1">
                                            {post.title}
                                        </h4>
                                        {post.relatedCountry && (
                                            <span className="text-[9px] text-gray-400 uppercase tracking-widest mt-1 block">
                                                За: {post.relatedCountry}
                                            </span>
                                        )}
                                    </div>
                                    <ArrowRight size={16} className="ml-auto text-gray-300 group-hover:text-brand-gold -translate-x-2 group-hover:translate-x-0 transition-all opacity-0 group-hover:opacity-100"/>
                                </Link>
                            ))}
                        </div>
                    </div>
                  )}

                  {/* 3. СТРАНИЦИ */}
                  {foundPages.length > 0 && (
                    <div className="mb-4">
                        <h3 className="text-[10px] font-black uppercase text-brand-gold ml-2 tracking-widest mb-3 flex items-center gap-2">
                            <Layout size={12}/> Открити Страници
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {foundPages.map(page => (
                                <Link 
                                    key={page.path} 
                                    href={page.path}
                                    onClick={handleClose}
                                    className="flex items-center justify-between bg-gray-50 px-5 py-4 rounded-2xl border border-gray-200 hover:bg-white hover:border-brand-gold hover:shadow-md transition-all group"
                                >
                                    <span className="font-bold text-brand-dark group-hover:text-brand-gold transition-colors">
                                        {page.title}
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 group-hover:text-brand-gold group-hover:bg-brand-gold/10 transition-all">
                                        <ChevronRight size={16}/>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                  )}

                </div>
                
                {/* FOOTER */}
                <div className="bg-gray-50 p-3 text-center text-[10px] text-gray-400 border-t border-gray-100 flex justify-between px-6 shrink-0">
                    <span>Натиснете <b>ESC</b> за затваряне</span>
                    {queryText && <span>Общо {foundTours.length + foundPosts.length + foundPages.length + foundCountries.length + (foundMonth ? 1 : 0)} резултата</span>}
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}