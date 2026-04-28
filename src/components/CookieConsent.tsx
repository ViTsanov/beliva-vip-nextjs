"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Cookie, FileText, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showMiniBadge, setShowMiniBadge] = useState(false);
  const pathname = usePathname();
  const isTourPage = pathname.startsWith('/tour/');

  useEffect(() => {
    // Проверяваме дали имаме записан избор
    const consent = localStorage.getItem('beliva_cookie_consent');
    
    if (!consent) {
      // Няма избор -> Показваме банера след 1 сек за плавен ефект
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    } else {
      // Има избор -> Показваме само малката значка за настройки
      setShowMiniBadge(true);
    }
  }, []);

  // 1. ПРИЕМИ ВСИЧКИ
  const handleAcceptAll = () => {
    localStorage.setItem('beliva_cookie_consent', 'all');
    setShowBanner(false);
    setShowMiniBadge(true);
  };

  // 2. САМО НЕОБХОДИМИ
  const handleNecessary = () => {
    localStorage.setItem('beliva_cookie_consent', 'necessary');
    setShowBanner(false);
    setShowMiniBadge(true);
  };

  // 3. ОТКАЗВАМ
  const handleDecline = () => {
    localStorage.setItem('beliva_cookie_consent', 'declined');
    setShowBanner(false);
    setShowMiniBadge(true);
  };

  // Отваряне на настройките отново
  const openSettings = () => {
    setShowBanner(true);
    setShowMiniBadge(false);
  };

  return (
    <>
      {/* --- ГОЛЯМ БАНЕР --- */}
      {showBanner && (
        <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-brand-gold/20 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] z-[1001] p-6 animate-in slide-in-from-bottom duration-500">
          <div className="container mx-auto">
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
              
              {/* Текст */}
              <div className="flex items-start gap-5">
                <div className="p-4 bg-brand-gold/10 rounded-full text-brand-gold hidden sm:block shrink-0">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <h4 className="text-base font-bold uppercase tracking-widest text-brand-dark mb-2 flex items-center gap-2">
                    Вашата поверителност е важна <Cookie size={16} className="text-brand-gold"/>
                  </h4>
                  <p className="text-gray-600 text-sm max-w-2xl leading-relaxed">
                    Ние и нашите партньори използваме бисквитки, за да персонализираме съдържанието и да анализираме трафика. Можете да приемете всички, да отхвърлите или да изберете само необходимите за функционирането на сайта.
                    <br />
                    <Link href="/privacy" className="text-brand-gold font-bold hover:underline inline-flex items-center gap-1 mt-2 text-xs uppercase tracking-wider">
                        <FileText size={12}/> Прочетете пълната политика
                    </Link>
                  </p>
                </div>
              </div>

              {/* Бутони (3 броя) */}
              <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full xl:w-auto mt-4 xl:mt-0 flex-wrap justify-end">
                  
                  {/* 1. ОТКАЗВАМ */}
                  <button 
                      onClick={handleDecline}
                      className="px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest border border-red-200 text-red-500 hover:bg-red-50 transition-all flex-grow sm:flex-grow-0"
                  >
                      Отказвам
                  </button>

                  {/* 2. САМО НЕОБХОДИМИ */}
                  <button 
                      onClick={handleNecessary}
                      className="px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-brand-dark transition-all flex-grow sm:flex-grow-0"
                  >
                      Само необходими
                  </button>
                  
                  {/* 3. ПРИЕМАМ ВСИЧКИ */}
                  <button 
                      onClick={handleAcceptAll}
                      className="bg-brand-dark text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-brand-gold hover:text-brand-dark transition-all shadow-lg flex-grow sm:flex-grow-0"
                  >
                      Приемам всички
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- МАЛКА ЗНАЧКА (Когато банерът е затворен) --- */}
      {showMiniBadge && !showBanner && (
        <button 
            onClick={openSettings}
            className={`fixed z-[999] bg-white p-3 rounded-full shadow-lg border border-gray-100 text-brand-dark hover:text-brand-gold hover:scale-110 transition-all group
              ${isTourPage ? 'bottom-24 left-4 lg:bottom-4' : 'bottom-4 left-4'}`}
            title="Настройки за бисквитки"
        >
            <Cookie size={24} />
            <span className="absolute left-12 top-1/2 -translate-y-1/2 bg-brand-dark text-white text-[10px] uppercase font-bold px-3 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Настройки бисквитки
            </span>
        </button>
      )}
    </>
  );
}