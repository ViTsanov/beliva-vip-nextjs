"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, User, Heart, LayoutGrid } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import NavbarSearch from './NavbarSearch';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [favCount, setFavCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    
    const checkFavorites = () => {
        // Проверка за window, защото сме в Next.js (SSR)
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('beliva_favorites');
            if (stored) {
                setFavCount(JSON.parse(stored).length);
            } else {
                setFavCount(0);
            }
        }
    };
    checkFavorites();
    window.addEventListener('storage', checkFavorites);
    window.addEventListener('favoritesUpdated', checkFavorites);

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('storage', checkFavorites);
        window.removeEventListener('favoritesUpdated', checkFavorites);
        unsubscribeAuth();
    };
  }, []);

  const isHome = pathname === '/';
  const isAdmin = !!user; 

  const handleNavClick = () => {
    setIsOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsOpen(false);
    router.push('/');
    // alert('Успешно излязохте.'); // Можеш да го махнеш ако искаш
  };

  return (
    <>
      {/* 1. САМАТА ЛЕНТА (NAVBAR) */}
      <nav className={`fixed top-0 w-full z-[100] transition-all duration-500 ${
        scrolled || !isHome ? 'bg-white/95 backdrop-blur-md py-2 md:py-3 shadow-lg' : 'bg-transparent py-4 md:py-6'
      }`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          
          {/* LOGO SECTION */}
          <Link 
            href="/" 
            onClick={handleNavClick}
            className={`flex items-center gap-3 text-xl md:text-3xl font-serif font-bold italic tracking-tighter transition-colors z-[110] ${
              scrolled || !isHome ? 'text-brand-dark' : 'text-white'
            }`}
          >
            {/* Използваме обикновен img, както е в оригиналния код, за да не се бърка Next/Image */}
            <img 
                src="/beliva_logo.png" 
                alt="Beliva VIP Logo" 
                className="h-10 md:h-12 w-auto object-contain" 
            />
            <span>
                Beliva <span className="text-brand-gold">VIP</span> Tour
            </span>
          </Link>

          {/* DESKTOP MENU */}
          <div className={`hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.2em] ${
            scrolled || !isHome ? 'text-brand-dark' : 'text-white'
          }`}>
            <Link href="/" onClick={handleNavClick} className="hover:text-brand-gold transition-colors">Начало</Link>
            <Link href="/about-us" onClick={handleNavClick} className="hover:text-brand-gold transition-colors">За нас</Link>
            <Link href="/blog" onClick={handleNavClick} className="hover:text-brand-gold transition-colors">Блог</Link>
            <Link href="/contacts" onClick={handleNavClick} className="hover:text-brand-gold transition-colors">Контакти</Link>

            <Link href="/favorites" onClick={handleNavClick} className="relative group">
              <Heart size={20} className={`transition-colors ${scrolled || !isHome ? 'text-brand-dark group-hover:text-brand-gold' : 'text-white group-hover:text-brand-gold'}`}/>
              {favCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-brand-gold text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                      {favCount}
                  </span>
              )}
            </Link>
            <Link 
              href="/sitemaps" 
              onClick={handleNavClick} 
              className="group"
              title="Карта на сайта / Всички страници"
            >
               <LayoutGrid size={20} className={`transition-colors ${scrolled || !isHome ? 'text-brand-dark group-hover:text-brand-gold' : 'text-white group-hover:text-brand-gold'}`}/>
            </Link>
            
            {/* Търсачка за Desktop */}
            <NavbarSearch isScrolled={scrolled || !isHome} />

            {user ? (
              <Link 
              href="/admin-beliva-2025" 
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 bg-brand-gold/10 text-brand-gold border border-brand-gold/20 px-5 py-2 rounded-full hover:bg-brand-gold hover:text-white transition-all shadow-sm"
            >
              <User size={14} /> Админ
            </Link>
            ) : (
              <Link href="/login-vip" className="hover:text-brand-gold transition-colors"><User size={20}/></Link>
            )}
          </div>

          {/* MOBILE ACTIONS (FAVORITES + HAMBURGER) */}
          <div className="md:hidden flex items-center gap-4 z-[110]">
              
             {/* МОБИЛЕН БУТОН ЗА ЛЮБИМИ */}
             <Link href="/favorites" onClick={handleNavClick} className="relative p-2">
                <Heart size={24} className={scrolled || !isHome ? 'text-brand-dark' : 'text-white'} />
                {favCount > 0 && (
                    <span className="absolute top-0 right-0 bg-brand-gold text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold shadow-sm border border-white">
                        {favCount}
                    </span>
                )}
             </Link>

             {/* HAMBURGER MENU BUTTON */}
             <button className="p-2" onClick={() => setIsOpen(!isOpen)}>
               {isOpen ? (
                  <span className="opacity-0"><X size={28}/></span>
               ) : (
                 <Menu size={28} className={scrolled || !isHome ? 'text-brand-dark' : 'text-white'} />
               )}
             </button>
          </div>

        </div>
      </nav>

      {/* 2. МОБИЛНОТО МЕНЮ */}
      {isOpen && (
        <div className="fixed inset-0 z-[200] bg-white/95 backdrop-blur-xl animate-in fade-in slide-in-from-top-5 duration-300 flex flex-col h-[100dvh]">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
              {/* ЛОГО В МОБИЛНОТО МЕНЮ */}
              <div className="flex items-center gap-2">
                  <img src="/beliva_logo.png" alt="Logo" className="h-8 w-auto" />
                  <span className="text-2xl font-serif italic font-bold text-brand-dark">
                      Beliva <span className="text-brand-gold">VIP</span> Tour
                  </span>
              </div>

              <button 
                  onClick={() => setIsOpen(false)} 
                  className="p-2 bg-gray-100 rounded-full text-brand-dark hover:bg-brand-gold hover:text-white transition-all"
              >
                  <X size={24} />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center flex-grow gap-8 p-6 overflow-y-auto">
              <Link href="/" onClick={() => setIsOpen(false)} className="text-2xl font-bold text-brand-dark hover:text-brand-gold transition-colors">Начало</Link>
              <Link href="/about-us" onClick={() => setIsOpen(false)} className="text-2xl font-bold text-brand-dark hover:text-brand-gold transition-colors">За нас</Link>
              <Link href="/blog" onClick={() => setIsOpen(false)} className="text-2xl font-bold text-brand-dark hover:text-brand-gold transition-colors">Блог</Link>
              <Link href="/contacts" onClick={() => setIsOpen(false)} className="text-2xl font-bold text-brand-dark hover:text-brand-gold transition-colors">Контакти</Link>
              <Link href="/sitemaps" onClick={() => setIsOpen(false)} className="text-2xl font-bold text-brand-dark hover:text-brand-gold transition-colors flex items-center gap-2">
                 <LayoutGrid size={24} /> Всички страници
              </Link>
              <div className="h-[1px] w-12 bg-gray-200 my-4"></div>

              {/* Търсачка за Mobile */}
              <div className="flex items-center gap-2 w-full justify-center">
                  <NavbarSearch isMobile onCloseParent={() => setIsOpen(false)} />
              </div>

              {/* Favorites Link */}
              <Link href="/favorites" onClick={() => setIsOpen(false)} className="flex items-center gap-2 text-lg font-medium text-gray-600">
                  <Heart size={20} /> Любими ({favCount})
              </Link>
              
              {user ? (
                  <div className="flex flex-col items-center gap-4 mt-4">
                      {/* Тук проверяваме user.email или друга логика за admin, ако имаш custom claim */}
                      <Link href="/admin-beliva-2025" onClick={() => setIsOpen(false)} className="px-8 py-3 bg-brand-dark text-white rounded-xl font-bold uppercase text-xs">
                          Админ Панел
                      </Link>
                      <button onClick={handleLogout} className="text-red-500 font-bold uppercase text-xs">Изход</button>
                  </div>
              ) : (
                  <Link href="/login-vip" onClick={() => setIsOpen(false)} className="flex items-center gap-2 text-lg font-medium text-brand-gold">
                      <User size={20} /> Вход
                  </Link>
              )}
            </div>
            
            <div className="p-6 text-center text-gray-400 text-xs uppercase tracking-widest shrink-0">
                © Beliva VIP Tour
            </div>
        </div>
      )}
    </>
  );
}