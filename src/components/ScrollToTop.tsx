"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp, ArrowDown } from "lucide-react";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAboveGrid, setIsAboveGrid] = useState(false);
  const pathname = usePathname();
  
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

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Проверка при първоначално зареждане
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  // 🚀 ТВОЯТ СИГУРЕН ВАРИАНТ ЗА ПЛАВНО СКРОЛИРАНЕ С АНИМАЦИЯ
  const smoothScrollTo = (targetY: number, duration: number = 800) => {
    isProgrammaticScroll.current = true;
    setIsVisible(false); // Скриваме бутона ВЕДНАГА щом се кликне

    const startY = window.scrollY;
    const difference = targetY - startY;
    let startTime: number | null = null;

    const step = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = currentTime - startTime;
      
      // Easing функция за много естествено и плавно спиране
      const easeInOutCubic = (t: number) => 
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      
      const percent = Math.min(progress / duration, 1);
      window.scrollTo(0, startY + difference * easeInOutCubic(percent));

      if (progress < duration) {
        window.requestAnimationFrame(step);
      } else {
        window.scrollTo(0, targetY); // Фиксираме точно на крайната позиция
        
        // Даваме 100ms отсрочка на браузъра да "успокои" скрола, преди да върнем контрола
        setTimeout(() => {
          isProgrammaticScroll.current = false;
        }, 100);
      }
    };

    window.requestAnimationFrame(step);
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
      onClick={handleClick}
      aria-label="Scroll control"
      className={`
        fixed z-[90] 
        right-6 bottom-24 md:right-10 md:bottom-28 
        p-3 md:p-4 rounded-full 
        transition-all duration-500 ease-in-out hover:scale-110
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