"use client";

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, MapPin, FileText, Globe, ArrowRight, ChevronRight, Layout, Filter } from 'lucide-react'; 
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Трябва ни за навигацията към филтъра
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';

// --- КОНФИГУРАЦИЯ НА СТАТИЧНИТЕ СТРАНИЦИ ---
const STATIC_PAGES = [
  { title: 'Отзиви от клиенти', path: '/reviews', keywords: ['отзиви', 'мнения', 'коментари', 'рейтинг', 'клиенти', 'ревюта'] },
  { title: 'Контакти', path: '/contacts', keywords: ['контакти', 'адрес', 'телефон', 'email', 'връзка', 'офис', 'локация'] },
  { title: 'За Нас', path: '/about-us', keywords: ['за нас', 'екип', 'агенция', 'мисия', 'история', 'кой сме ние'] },
  { title: 'Блог / Пътеводител', path: '/blog', keywords: ['блог', 'статии', 'новини', 'съвети', 'информация', 'четене'] },
  { title: 'Любими', path: '/favorites', keywords: ['любими', 'запазени', 'сърце', 'харесани'] },
  { title: 'Карта на сайта (Всички страници)', path: '/sitemaps', keywords: ['карта', 'меню', 'всички', 'страници', 'списък'] },
];

interface NavbarSearchProps {
    isScrolled?: boolean;
    isMobile?: boolean;
    onCloseParent?: () => void;
}

export default function NavbarSearch({ isScrolled, isMobile, onCloseParent }: NavbarSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [queryText, setQueryText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // ДАННИ
  const [allTours, setAllTours] = useState<any[]>([]);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [uniqueCountries, setUniqueCountries] = useState<string[]>([]); // Списък с уникални държави

  // РЕЗУЛТАТИ
  const [foundTours, setFoundTours] = useState<any[]>([]);
  const [foundPosts, setFoundPosts] = useState<any[]>([]);
  const [foundPages, setFoundPages] = useState<any[]>([]);
  const [foundCountries, setFoundCountries] = useState<string[]>([]); // Намерени държави

  useEffect(() => { setMounted(true); }, []);

  // 1. Зареждаме ВСИЧКИ данни веднъж
  useEffect(() => {
    const fetchData = async () => {
      try {
        const toursQuery = query(collection(db, "tours"), where("status", "==", "public"));
        const postsQuery = query(collection(db, "posts"));

        const [toursSnap, postsSnap] = await Promise.all([getDocs(toursQuery), getDocs(postsQuery)]);

        const tours = toursSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllTours(tours);
        setAllPosts(postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Извличаме уникалните държави от всички турове
        const countries = Array.from(new Set(tours.map((t: any) => t.country).filter(Boolean))) as string[];
        setUniqueCountries(countries);

      } catch (error) {
        console.error("Error loading search data", error);
      }
    };
    fetchData();
  }, []);

  // 2. Логика за Търсене
  useEffect(() => {
    if (!queryText.trim()) {
      setFoundTours([]);
      setFoundPosts([]);
      setFoundPages([]);
      setFoundCountries([]);
      
      if (allTours.length > 0) {
         const shuffled = [...allTours].sort(() => 0.5 - Math.random());
         setFoundTours(shuffled.slice(0, 3));
      }
      return;
    }

    const lowerQuery = queryText.toLowerCase();

    // Търсене в държави (за бърз филтър)
    const matchedCountries = uniqueCountries.filter(c => c.toLowerCase().includes(lowerQuery));

    // Търсене в турове
    const tours = allTours.filter((t: any) => 
      t.title?.toLowerCase().includes(lowerQuery) || 
      t.country?.toLowerCase().includes(lowerQuery)
    );

    // Търсене в постове
    const posts = allPosts.filter((p: any) => 
      p.title?.toLowerCase().includes(lowerQuery) || 
      (p.relatedCountry && p.relatedCountry.toLowerCase().includes(lowerQuery))
    ).slice(0, 3); 

    // Търсене в страници
    const pages = STATIC_PAGES.filter(p => 
      p.title.toLowerCase().includes(lowerQuery) || 
      p.keywords.some(k => k.includes(lowerQuery))
    );

    setFoundCountries(matchedCountries);
    setFoundTours(tours);
    setFoundPosts(posts);
    setFoundPages(pages);

  }, [queryText, allTours, allPosts, uniqueCountries]);

  // 3. Управление на прозореца
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', handleEsc);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setQueryText('');
    if (onCloseParent) onCloseParent();
  };

  // Функция за прилагане на филтър по държава
  const applyCountryFilter = (country: string) => {
      // Навигираме към Home с параметър country
      router.push(`/?country=${encodeURIComponent(country)}`);
      handleClose();
      
      // Допълнително скролване до грида
      setTimeout(() => {
          const grid = document.getElementById('tours-grid');
          if (grid) grid.scrollIntoView({ behavior: 'smooth' });
      }, 500);
  };

  const hasResults = foundTours.length > 0 || foundPosts.length > 0 || foundPages.length > 0 || foundCountries.length > 0;

  // Бутон за отваряне
  const TriggerButton = isMobile ? (
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
                    placeholder="Държава, Екскурзия, Блог или 'Отзиви'..." 
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

                  {!queryText && !hasResults && (
                      <div className="text-center py-10 text-gray-300 flex flex-col items-center gap-2">
                          <Globe size={40} className="opacity-20"/>
                          <p className="text-sm">Въведете дестинация (напр. "Австралия") или тема (напр. "Отзиви")</p>
                      </div>
                  )}

                  {/* 0. БЪРЗ ФИЛТЪР ПО ДЪРЖАВА (НОВО!) */}
                  {foundCountries.length > 0 && (
                      <div className="mb-6">
                          <h3 className="text-[10px] font-black uppercase text-brand-gold ml-2 tracking-widest mb-3 flex items-center gap-2">
                              <Filter size={12}/> Бърз достъп
                          </h3>
                          <div className="space-y-2">
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
                            {foundTours.map((item: any) => (
                                <Link 
                                    key={item.id} 
                                    href={`/tour/${item.tourId || item.id}`}
                                    onClick={handleClose}
                                    className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-100 hover:border-brand-gold/30 hover:shadow-md transition-all group"
                                >
                                    <div className="flex flex-col gap-1 pl-2">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-brand-gold">
                                            {item.country}
                                        </div>
                                        <h4 className="font-bold text-brand-dark text-lg leading-tight group-hover:text-brand-gold transition-colors">
                                            {item.title}
                                        </h4>
                                        <span className="text-xs font-medium text-gray-500 mt-1 bg-gray-100 self-start px-2 py-0.5 rounded-md">
                                            от {item.price}
                                        </span>
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
                            {foundPages.map((page: any) => (
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
                    {queryText && <span>Общо {foundTours.length + foundPosts.length + foundPages.length + foundCountries.length} резултата</span>}
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