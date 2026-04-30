"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin, ArrowDown } from "lucide-react";

interface DestinationHeroProps {
  countryName: string;
  heroImg: string;
  tourCount: number;
  minPrice: string | null;
  hasPoliTours: boolean;
}

export default function DestinationHero({
  countryName,
  heroImg,
  tourCount,
  minPrice,
  hasPoliTours,
}: DestinationHeroProps) {
  const [scrollY, setScrollY] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTours = () => {
    const el = document.getElementById("tours-list");
    if (!el) return;

    const targetY = el.getBoundingClientRect().top + window.scrollY - 100;
    const startY = window.scrollY;
    const distance = targetY - startY;
    const duration = 900;
    let startTime: number | null = null;

    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const step = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, startY + distance * easeInOutCubic(progress));
      if (elapsed < duration) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const words = countryName.split(" ");

  return (
    <div className="relative w-full h-screen min-h-[600px] max-h-[900px] overflow-hidden">

      {/* Parallax image — negative translateY so image moves UP as page scrolls DOWN */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate3d(0, ${-scrollY * 0.2}px, 0) scale(1.12)`,
          willChange: 'transform',
        }}
      >
        <Image src={heroImg} alt={countryName} fill className="object-cover" priority sizes="100vw" />
      </div>

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/50" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

      {/* Back */}
      <Link href="/" className="absolute top-28 left-6 md:left-10 z-30 flex items-center gap-2.5 text-white/70 hover:text-white transition-all group">
        <div className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center group-hover:border-brand-gold group-hover:bg-brand-gold/20 transition-all">
          <ArrowLeft size={16} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
          Всички дестинации
        </span>
      </Link>

      {/* Top-right */}
      <div className="absolute top-28 right-6 md:right-10 z-30 flex items-center gap-2">
        <MapPin size={11} className="text-brand-gold" />
        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/50">Destination Guide</span>
      </div>

      {/* Headline */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pb-24">
        <div
          className="flex items-center gap-4 mb-8"
          style={{
            transition: "opacity 1000ms 100ms, transform 1000ms 100ms",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
          }}
        >
          <div className="h-px w-14 bg-brand-gold" />
          <span className="text-brand-gold text-[10px] font-black uppercase tracking-[0.4em]">Beliva VIP Tour</span>
          <div className="h-px w-14 bg-brand-gold" />
        </div>

        <h1 className="leading-none">
          {words.map((word, i) => (
            <span
              key={i}
              className="block font-serif italic text-white"
              style={{
                fontSize: "clamp(3.5rem, 13vw, 10rem)",
                textShadow: "0 4px 50px rgba(0,0,0,0.6)",
                transition: `opacity 900ms ${i * 160 + 250}ms, transform 900ms ${i * 160 + 250}ms`,
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(28px)",
              }}
            >
              {word}
            </span>
          ))}
        </h1>
      </div>

      {/* Stats bar */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20"
        style={{
          transition: "opacity 1000ms 700ms, transform 1000ms 700ms",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
        }}
      >
        <div className="flex items-stretch border-t border-white/10 bg-black/65 backdrop-blur-md divide-x divide-white/10">

          {/* Stat: tours */}
          <div className="flex-1 flex flex-col items-center justify-center py-5 px-3">
            <span className="text-2xl md:text-3xl font-serif font-bold text-brand-gold leading-none">{tourCount}</span>
            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/45 mt-1">
              {tourCount === 1 ? "Оферта" : "Оферти"}
            </span>
          </div>

          {/* Stat: price */}
          {minPrice && (
            <div className="flex-1 flex flex-col items-center justify-center py-5 px-3">
              <span className="text-lg md:text-2xl font-serif font-bold text-white leading-none">от {minPrice}</span>
              <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/45 mt-1">Начална цена</span>
            </div>
          )}

          {/* Stat: guide */}
          <div className="flex-1 flex flex-col items-center justify-center py-5 px-3">
            <span className="text-base md:text-lg font-serif italic text-white/80 leading-none">
              {hasPoliTours ? "Водена от Поли" : "С Водач"}
            </span>
            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/45 mt-1">Групови Пакети</span>
          </div>

          {/* ── CTA BUTTON — visually unmistakable ── */}
          <button
            onClick={scrollToTours}
            className="relative flex-1 flex flex-col items-center justify-center py-5 px-4 bg-brand-gold hover:bg-amber-400 active:scale-95 transition-all cursor-pointer group overflow-hidden"
          >
            {/* Ripple background */}
            <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
            <ArrowDown
              size={22}
              className="text-brand-dark group-hover:translate-y-1 transition-transform duration-300 relative z-10"
              strokeWidth={3}
            />
            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-brand-dark mt-1 relative z-10">
              Виж офертите
            </span>
          </button>

        </div>
      </div>
    </div>
  );
}
