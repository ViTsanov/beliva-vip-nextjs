"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, User, Heart, LayoutGrid, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { logoutAction } from '@/app/actions/auth';
import NavbarSearch from './NavbarSearch';
import InquiryDialog from './inquiry/InquiryDialog';
import { readFavoriteCountries } from '@/lib/favoriteCountries';
import { useBackToClose, isModalNavigationPending } from '@/lib/hooks/useBackToClose';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [favCount, setFavCount] = useState(0);
  // Влязъл админ — от бисквитката admin_ui (виж createSession в actions/auth.ts), без Firebase Auth
  const [user, setUser] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const menuRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Прозорецът „Запитване“. На страница на тур (/tour/…) турът се избира автоматично във формата.
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const inquiryTriggerRef = useRef<HTMLButtonElement>(null);
  const tourSlug = pathname?.startsWith('/tour/') ? decodeURIComponent(pathname.split('/')[2] || '') : undefined;
  const openInquiry = () => {
    setIsOpen(false);
    setInquiryOpen(true);
  };
  const closeInquiry = () => {
    setInquiryOpen(false);
    // Фокусът се връща на бутона, който го отвори (на десктоп), за да не се губи мястото при клавиатура.
    requestAnimationFrame(() => inquiryTriggerRef.current?.focus());
  };

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
        // Любими екскурзии + любими държави (src/lib/favoriteCountries.ts)
        setFavCount((stored ? JSON.parse(stored).length : 0) + readFavoriteCountries().length);
      }
    };
    checkFavorites();
    window.addEventListener('storage', checkFavorites);
    window.addEventListener('favoritesUpdated', checkFavorites);

    setUser(/(?:^|;\s*)admin_ui=1(?:;|$)/.test(document.cookie));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('storage', checkFavorites);
      window.removeEventListener('favoritesUpdated', checkFavorites);
    };
  }, []);

  // Move focus to close button when menu opens
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  // Бутонът Назад на телефона затваря отвореното меню, вместо да сменя страницата
  useBackToClose(isOpen, () => setIsOpen(false));

  // Прозрачно меню над снимка на цял екран: началната страница и страниците на държави (/destinations/<държава>).
  const overHero = pathname === '/' || /^\/destinations\/[^/]+\/?$/.test(pathname || '');

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
        // Затваряне с линк към друга страница: НЕ връщаме старата позиция — иначе тя се надпреварва със
        // скрола към върха на новата страница и понякога тя се отваря по средата (напр. на формата в Контакти)
        if (isModalNavigationPending()) return;
        window.scrollTo({ top: scrollY, behavior: 'instant' });
      };
    }
  }, [isOpen]);

  const handleNavClick = () => {
    setIsOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    // Firebase Auth се зарежда само тук, при изход — на публичните страници не трябва
    const [{ auth }, { signOut }] = await Promise.all([import('@/lib/firebaseAuth'), import('firebase/auth')]);
    await signOut(auth);
    await logoutAction();
    setUser(false);
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
      {/* Плътно бяло вместо bg-white/95 + backdrop-blur: при 95% бяло блурът не се вижда, но iPhone го преизчислява
          на всеки кадър от скрола (менюто е fixed над снимки) — скролът засичаше. */}
      <nav data-site-navbar className={`fixed top-0 w-full z-[100] transition-[padding,background-color,box-shadow] duration-500 ${
        scrolled || !overHero ? 'bg-white py-2 md:py-3 shadow-lg' : 'bg-transparent py-4 md:py-6'
      }`}>
        <div className="container mx-auto px-6 flex justify-between items-center">

          {/* LOGO */}
          <Link
            href="/"
            onClick={handleNavClick}
            className={`flex items-center gap-2 md:gap-3 font-serif font-bold italic tracking-tighter transition-colors z-[110] ${
              scrolled || !overHero ? 'text-brand-dark' : 'text-white'
            }`}
          >
            <img
              src="/beliva_logo_nav.webp"
              width={96}
              height={96}
              alt="Beliva VIP Logo"
              className="h-8 md:h-10 lg:h-12 w-auto object-contain shrink-0"
            />
            <span className="whitespace-nowrap text-lg max-[360px]:text-base md:text-2xl lg:text-3xl">
              Beliva <span className="text-brand-gold">VIP</span> Tour
            </span>
          </Link>

          {/* DESKTOP MENU — от 1280px нагоре. На таблет и по-тесен лаптоп текстовите връзки не се побират до логото
              (застъпваха го, „За нас“ падаше на два реда), затова там е менюто с бургер, както на телефон. */}
          <div className={`hidden xl:flex items-center gap-6 2xl:gap-8 whitespace-nowrap text-xs font-black uppercase tracking-[0.2em] ${
            scrolled || !overHero ? 'text-brand-dark' : 'text-white'
          }`}>
            <Link href="/" onClick={handleNavClick} aria-current={pathname === '/' ? 'page' : undefined} className="hover:text-brand-gold transition-colors">Начало</Link>
            <Link href="/destinations" onClick={handleNavClick} aria-current={pathname?.startsWith('/destinations') ? 'page' : undefined} className="hover:text-brand-gold transition-colors">Дестинации</Link>
            <Link href="/about-us" onClick={handleNavClick} aria-current={pathname === '/about-us' ? 'page' : undefined} className="hover:text-brand-gold transition-colors">За нас</Link>
            <Link href="/blog" onClick={handleNavClick} aria-current={pathname === '/blog' ? 'page' : undefined} className="hover:text-brand-gold transition-colors">Блог</Link>
            <Link href="/contacts" onClick={handleNavClick} aria-current={pathname === '/contacts' ? 'page' : undefined} className="hover:text-brand-gold transition-colors">Контакти</Link>

            <Link href="/favorites" onClick={handleNavClick} className="relative group" aria-label="Любими оферти">
              <Heart size={20} className={`transition-colors ${scrolled || !overHero ? 'text-brand-dark group-hover:text-brand-gold' : 'text-white group-hover:text-brand-gold'}`}/>
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
              <LayoutGrid size={20} className={`transition-colors ${scrolled || !overHero ? 'text-brand-dark group-hover:text-brand-gold' : 'text-white group-hover:text-brand-gold'}`}/>
            </Link>

            <NavbarSearch isScrolled={scrolled || !overHero} />

            {/* „Запитване“ — второстепенен бутон с контур (бял върху героса, тъмносин върху бялото меню).
                Златният, плътен вид остава само за главното действие на страницата („Разгледай екскурзиите“ в героса). */}
            <button
              ref={inquiryTriggerRef}
              type="button"
              onClick={openInquiry}
              aria-haspopup="dialog"
              className={`inline-flex h-10 items-center gap-2 rounded-full border px-5 text-[13px] font-semibold normal-case tracking-normal transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                scrolled || !overHero
                  ? 'border-brand-dark/30 text-brand-dark hover:border-brand-dark hover:bg-brand-dark hover:text-white focus-visible:outline-brand-dark'
                  : 'border-white/70 text-white hover:border-white hover:bg-white hover:text-brand-dark focus-visible:outline-white'
              }`}
            >
              <MessageSquare size={16} aria-hidden="true" />
              Запитване
            </button>

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
          <div className="xl:hidden flex items-center gap-0.5 z-[110]">
            <NavbarSearch iconOnly isScrolled={scrolled || !overHero} />
            <Link
              href="/favorites"
              onClick={handleNavClick}
              className="relative p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Любими оферти"
            >
              <Heart size={24} className={scrolled || !overHero ? 'text-brand-dark' : 'text-white'} />
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
                <Menu size={28} className={scrolled || !overHero ? 'text-brand-dark' : 'text-white'} />
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
                <img src="/beliva_logo_nav.webp" width={96} height={96} alt="Beliva VIP Tour лого" className="h-8 w-auto" />
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

            {/* my-auto на първия/последния елемент центрира списъка, но при нисък екран той просто скролва —
                justify-center би изрязал горните връзки извън обсега */}
            <div className="flex flex-col items-center flex-grow gap-6 [@media(min-height:760px)]:gap-8 p-6 overflow-y-auto overscroll-contain [&>*]:shrink-0 [&>*:first-child]:mt-auto [&>*:last-child]:mb-auto">
              <button
                type="button"
                onClick={openInquiry}
                aria-haspopup="dialog"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-brand-dark px-7 text-[16px] font-semibold text-white transition-colors hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
              >
                <MessageSquare size={18} aria-hidden="true" />
                Изпрати запитване
              </button>
              <Link href="/" onClick={() => setIsOpen(false)} aria-current={pathname === '/' ? 'page' : undefined} className="text-2xl font-bold text-brand-dark hover:text-brand-gold transition-colors">Начало</Link>
              <Link href="/destinations" onClick={() => setIsOpen(false)} aria-current={pathname?.startsWith('/destinations') ? 'page' : undefined} className="text-2xl font-bold text-brand-dark hover:text-brand-gold transition-colors">Дестинации</Link>
              <Link href="/about-us" onClick={() => setIsOpen(false)} aria-current={pathname === '/about-us' ? 'page' : undefined} className="text-2xl font-bold text-brand-dark hover:text-brand-gold transition-colors">За нас</Link>
              <Link href="/blog" onClick={() => setIsOpen(false)} aria-current={pathname === '/blog' ? 'page' : undefined} className="text-2xl font-bold text-brand-dark hover:text-brand-gold transition-colors">Блог</Link>
              <Link href="/contacts" onClick={() => setIsOpen(false)} aria-current={pathname === '/contacts' ? 'page' : undefined} className="text-2xl font-bold text-brand-dark hover:text-brand-gold transition-colors">Контакти</Link>
              <Link href="/sitemaps" onClick={() => setIsOpen(false)} aria-current={pathname === '/sitemaps' ? 'page' : undefined} className="text-2xl font-bold text-brand-dark hover:text-brand-gold transition-colors flex items-center gap-2">
                <LayoutGrid size={24} /> Всички страници
              </Link>
              <div className="h-[1px] w-12 bg-gray-200 my-4" aria-hidden="true" />

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

      <InquiryDialog open={inquiryOpen} onClose={closeInquiry} defaultTourSlug={tourSlug} />
    </>
  );
}
