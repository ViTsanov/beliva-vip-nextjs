"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp, ArrowDown } from "lucide-react";
import { glideTo } from "@/lib/smoothScroll";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAboveGrid, setIsAboveGrid] = useState(false);
  const pathname = usePathname();
  const isTourPage = pathname.startsWith('/tour/');
  
  // Този ref ни помага да разберем дали скролът е от бутона (програмен) или от потребителя
  const isProgrammaticScroll = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      // Ако нашият скрипт скролва в момента, игнорираме събитието (държим бутона скрит)
      if (isProgrammaticScroll.current) return;

      const scrollY = window.scrollY;

      if (pathname === "/") {
        const gridElement = document.getElementById("tours-grid");
        if (gridElement) {
          // Взимаме точната позиция на секцията с оферти (-100px заради менюто)
          const targetY = gridElement.getBoundingClientRect().top + window.scrollY - 100;
          
          // Определяме дали сме над офертите (за стрелка надолу) или под тях (за стрелка нагоре)
          setIsAboveGrid(scrollY < targetY - 10);
          
          // Показваме бутона само ако не сме в най-горната част на Hero секцията
          setIsVisible(scrollY > 100);
        } else {
          setIsVisible(scrollY > 400);
          setIsAboveGrid(false);
        }
      } else {
        // За всички вътрешни страници работи като класически бутон "Нагоре"
        setIsVisible(scrollY > 400);
        setIsAboveGrid(false);
      }
    };

    // Веднъж на кадър, а не при всяко scroll събитие: getBoundingClientRect насред скрола принуждава браузъра да
    // преподреди цялата страница извън реда (особено докато менюто анимира височината си) — на телефон това засича.
    let frame = 0;
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; handleScroll(); });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    handleScroll(); // Проверка при първоначално зареждане

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  // Плавно превъртане (src/lib/smoothScroll.ts). Докато трае, бутонът е скрит и не реагира на собствения си скрол.
  const smoothScrollTo = (targetY: number, duration: number = 800) => {
    isProgrammaticScroll.current = true;
    setIsVisible(false); // Скриваме бутона ВЕДНАГА щом се кликне
    // 100ms отсрочка, за да се "успокои" скролът, преди да върнем контрола
    glideTo(targetY, { duration, onDone: () => setTimeout(() => { isProgrammaticScroll.current = false; }, 100) });
  };

  const handleClick = () => {
    if (pathname === "/") {
      const gridElement = document.getElementById("tours-grid");
      if (gridElement) {
        // И НАГОРЕ, И НАДОЛУ скролват до ОФЕРТИТЕ!
        const targetY = gridElement.getBoundingClientRect().top + window.scrollY - 100;
        smoothScrollTo(targetY, 900); 
      } else {
        smoothScrollTo(0, 900);
      }
    } else {
      smoothScrollTo(0, 900); // За други страници отива най-горе
    }
  };

  return (
    <button
      data-floating-button
      onClick={handleClick}
      aria-label={isAboveGrid && pathname === "/" ? "Иди към офертите" : "Върни се в началото"}
      className={`
        fixed z-[90] right-6
        ${isTourPage
          ? 'bottom-[calc(10rem+env(safe-area-inset-bottom))] md:right-10 md:bottom-28'
          : 'bottom-[calc(6rem+env(safe-area-inset-bottom))] md:right-10 md:bottom-28'}
        p-3 md:p-4 rounded-full
        transition-all duration-500 ease-in-out hover:scale-110 active:scale-95
        flex items-center justify-center
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"}
        ${isAboveGrid && pathname === "/"
            ? "bg-white text-brand-gold shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:bg-brand-gold hover:text-white" 
            : "bg-brand-gold text-white shadow-[0_4px_20px_rgba(212,175,55,0.4)] hover:bg-brand-dark"
        }
      `}
    >
      {isAboveGrid && pathname === "/" ? (
        <ArrowDown size={24} strokeWidth={2.5} className="mt-0.5" />
      ) : (
        <ArrowUp size={24} strokeWidth={2.5} className="mb-0.5" />
      )}
    </button>
  );
}