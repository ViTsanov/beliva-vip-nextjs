"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, User, Heart, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
  const prefersReducedMotion = useReducedMotion();
  const menuRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 50);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    const checkFavorites = () => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('beliva_favorites');
        setFavCount(stored ? JSON.parse(stored).length : 0);
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

  // Move focus to close button when menu opens
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  const isHome = pathname === '/';

  // Lock body scroll on iOS Safari (overflow:hidden alone doesn't prevent rubber-band scroll behind fixed overlay)
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const handleNavClick = () => {
    setIsOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsOpen(false);
    router.push('/');
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (e.key === 'Tab') {
      const focusable = menuRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  const menuAnimation = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : { initial: { opacity: 0, y: -24 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -24 }, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <>
      {/* NAVBAR BAR */}
      <nav className={`fixed top-0 w-full z-[100] transition-all duration-500 ${
        scrolled || !isHome ? 'bg-white/95 backdrop-blur-md py-2 md:py-3 shadow-lg' : 'bg-transparent py-4 md:py-6'
      }`}>
        <div className="container mx-auto px-6 flex justify-between items-center">

          {/* LOGO */}
          <Link
            href="/"
            onClick={handleNavClick}
            className={`flex items-center gap-2 md:gap-3 font-serif font-bold italic tracking-tighter transition-colors z-[110] ${
              scrolled || !isHome ? 'text-brand-dark' : 'text-white'
            }`}
          >
            <img
              src="/beliva_logo.png"
              alt="Beliva VIP Logo"
              className="h-8 md:h-10 lg:h-12 w-auto object-contain shrink-0"
            />
            <span className="whitespace-nowrap text-lg md:text-2xl lg:text-3xl">
              Beliva <span className="text-brand-gold">VIP</span> Tour
            </span>
          </Link>

          {/* DESKTOP MENU */}
          <div className={`hidden md:flex items-center gap-4 lg:gap-8 text-xs font-black uppercase tracking-[0.2em] ${
            scrolled || !isHome ? 'text-brand-dark' : 'text-white'
          }`}>
            <Link href="/" onClick={handleNavClick} aria-current={pathname === '/' ? 'page' : undefined} className="hover:text-brand-gold transition-colors">Начало</Link>
            <Link href="/about-us" onClick={handleNavClick} aria-current={pathname === '/about-us' ? 'page' : undefined} className="hover:text-brand-gold transition-colors">За нас</Link>
            <Link href="/blog" onClick={handleNavClick} aria-current={pathname === '/blog' ? 'page' : undefined} className="hover:text-brand-gold transition-colors">Блог</Link>
            <Link href="/contacts" onClick={handleNavClick} aria-current={pathname === '/contacts' ? 'page' : undefined} className="hover:text-brand-gold transition-colors">Контакти</Link>

            <Link href="/favorites" onClick={handleNavClick} className="relative group" aria-label="Любими оферти">
              <Heart size={20} className={`transition-colors ${scrolled || !isHome ? 'text-brand-dark group-hover:text-brand-gold' : 'text-white group-hover:text-brand-gold'}`}/>
              {favCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-brand-gold text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                  {favCount}
                </span>
              )}
            </Link>
            <Link
              href="/sitemaps"
              onClick={handleNavClick}
              className="group"
              aria-label="Карта на сайта"
            >
              <LayoutGrid size={20} className={`transition-colors ${scrolled || !isHome ? 'text-brand-dark group-hover:text-brand-gold' : 'text-white group-hover:text-brand-gold'}`}/>
            </Link>

            <NavbarSearch isScrolled={scrolled || !isHome} />

            {user ? (
              <Link
                href="/admin-beliva-2025"
                onClick={() => setIsOpen(false)}
                className="hidden xl:flex items-center gap-2 bg-brand-gold/10 text-brand-gold border border-brand-gold/20 px-5 py-2 rounded-full hover:bg-brand-gold hover:text-white transition-all shadow-sm"
              >
                <User size={14} /> Админ
              </Link>
            ) : null}
          </div>

          {/* MOBILE ACTIONS */}
          <div className="md:hidden flex items-center gap-2 z-[110]">
            <Link
              href="/favorites"
              onClick={handleNavClick}
              className="relative p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Любими оферти"
            >
              <Heart size={24} className={scrolled || !isHome ? 'text-brand-dark' : 'text-white'} />
              {favCount > 0 && (
                <span className="absolute top-0 right-0 bg-brand-gold text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold shadow-sm border border-white">
                  {favCount}
                </span>
              )}
            </Link>

            {!isOpen && (
              <button
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center"
                onClick={() => setIsOpen(true)}
                aria-label="Отвори меню"
                aria-expanded={isOpen}
                aria-controls="mobile-menu"
              >
                <Menu size={28} className={scrolled || !isHome ? 'text-brand-dark' : 'text-white'} />
              </button>
            )}
          </div>

        </div>
      </nav>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Навигационно меню"
            onKeyDown={handleMenuKeyDown}
            {...menuAnimation}
            className="fixed inset-0 z-[200] bg-white/95 backdrop-blur-xl flex flex-col h-[100dvh]"
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <img src="/beliva_logo.png" alt="Beliva VIP Tour лого" className="h-8 w-auto" />
                <span className="text-2xl font-serif italic font-bold text-brand-dark">
                  Beliva <span className="text-brand-gold">VIP</span> Tour
                </span>
              </div>

              <button
                ref={closeButtonRef}
                onClick={() => setIsOpen(false)}
                aria-label="Затвори меню"
                className="p-2 bg-gray-100 rounded-full text-brand-dark hover:bg-brand-gold hover:text-white transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center flex-grow gap-8 p-6 overflow-y-auto">
              <Link href="/" onClick={() => setIsOpen(false)} aria-current={pathname === '/' ? 'page' : undefined} className="text-2xl font-bold text-brand-dark hover:text-brand-gold transition-colors">Начало</Link>
              <Link href="/about-us" onClick={() => setIsOpen(false)} aria-current={pathname === '/about-us' ? 'page' : undefined} className="text-2xl font-bold text-brand-dark hover:text-brand-gold transition-colors">За нас</Link>
              <Link href="/blog" onClick={() => setIsOpen(false)} aria-current={pathname === '/blog' ? 'page' : undefined} className="text-2xl font-bold text-brand-dark hover:text-brand-gold transition-colors">Блог</Link>
              <Link href="/contacts" onClick={() => setIsOpen(false)} aria-current={pathname === '/contacts' ? 'page' : undefined} className="text-2xl font-bold text-brand-dark hover:text-brand-gold transition-colors">Контакти</Link>
              <Link href="/sitemaps" onClick={() => setIsOpen(false)} aria-current={pathname === '/sitemaps' ? 'page' : undefined} className="text-2xl font-bold text-brand-dark hover:text-brand-gold transition-colors flex items-center gap-2">
                <LayoutGrid size={24} /> Всички страници
              </Link>
              <div className="h-[1px] w-12 bg-gray-200 my-4" aria-hidden="true" />

              <div className="flex items-center gap-2 w-full justify-center">
                <NavbarSearch isMobile onCloseParent={() => setIsOpen(false)} />
              </div>

              <Link href="/favorites" onClick={() => setIsOpen(false)} className="flex items-center gap-2 text-lg font-medium text-gray-600">
                <Heart size={20} aria-hidden="true" /> Любими ({favCount})
              </Link>

              {user ? (
                <div className="flex flex-col items-center gap-4 mt-4">
                  <Link href="/admin-beliva-2025" onClick={() => setIsOpen(false)} className="px-8 py-3 bg-brand-dark text-white rounded-xl font-bold uppercase text-xs">
                    Админ Панел
                  </Link>
                  <button onClick={handleLogout} className="text-red-500 font-bold uppercase text-xs">Изход</button>
                </div>
              ) : null}
            </div>

            <div className="p-6 text-center text-gray-400 text-xs uppercase tracking-widest shrink-0">
              © Beliva VIP Tour
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
