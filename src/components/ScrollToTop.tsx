"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  // 🚀 СИГУРЕН ВАРИАНТ ЗА ПЛАВНО СКРОЛИРАНЕ (Custom Animation)
  const smoothScrollTo = (targetY: number, duration: number = 800) => {
    const startY = window.scrollY;
    const difference = targetY - startY;
    let startTime: number | null = null;

    const step = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = currentTime - startTime;
      
      // Easing функция (ease-in-out) за много естествено и плавно спиране
      const easeInOutCubic = (t: number) => 
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      
      const percent = Math.min(progress / duration, 1);
      window.scrollTo(0, startY + difference * easeInOutCubic(percent));

      if (progress < duration) {
        window.requestAnimationFrame(step);
      } else {
        window.scrollTo(0, targetY); // Фиксираме точно на крайната позиция
      }
    };

    window.requestAnimationFrame(step);
  };

  const scrollToTarget = () => {
    if (pathname === "/") {
      const gridElement = document.getElementById("tours-grid");
      if (gridElement) {
        const yOffset = -100; // Отстояние от менюто
        const y = gridElement.getBoundingClientRect().top + window.scrollY + yOffset;
        smoothScrollTo(y, 900); // 900ms = 0.9 секунди продължителност на скрола
      } else {
        smoothScrollTo(0, 900);
      }
    } else {
      smoothScrollTo(0, 900); // За всички други страници връщаме най-горе
    }
  };

  return (
    <button
      onClick={scrollToTarget}
      aria-label="Scroll to top"
      className={`
        fixed z-[90] 
        right-6 bottom-24 md:right-10 md:bottom-28 
        p-3 md:p-4 rounded-full bg-brand-gold text-white 
        shadow-[0_4px_20px_rgba(212,175,55,0.4)]
        transition-all duration-500 ease-in-out hover:bg-brand-dark hover:scale-110
        flex items-center justify-center
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"}
      `}
    >
      <ArrowUp size={24} strokeWidth={2.5} />
    </button>
  );
}