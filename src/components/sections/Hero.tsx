"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const SLIDES = [
  {
    destination: 'Тайланд',
    subtitle: 'Храмове, плажове и незабравими залези',
    img: '/hero/thailand.webp',
    filterHref: '/destinations/tayland',
  },
  {
    destination: 'Австралия',
    subtitle: 'Природа без граници, приключения без край',
    img: '/hero/australia.webp',
    filterHref: '/destinations/avstraliya',
  },
  {
    destination: 'Китай',
    subtitle: 'Хиляди години история и модерни чудеса',
    img: '/hero/china.webp',
    filterHref: '/destinations/kitay',
  },
  {
    destination: 'Перу',
    subtitle: 'Мачу Пикчу и изгубените цивилизации',
    img: '/hero/peru.webp',
    filterHref: '/destinations/peru',
  },
  {
    destination: 'Сингапур',
    subtitle: 'Бъдещето среща традицията в Азия',
    img: '/hero/singapore.webp',
    filterHref: '/destinations/singapur',
  },
];

const INTERVAL = 7000;

export default function Hero() {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent(c => {
        setPrev(c);
        return (c + 1) % SLIDES.length;
      });
    }, INTERVAL);
  }, []);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  const goTo = useCallback((i: number) => {
    if (i === current) return;
    setPrev(current);
    setCurrent(i);
    startTimer();
  }, [current, startTimer]);

  const slide = SLIDES[current];

  return (
    <section
      className="relative w-full overflow-hidden bg-brand-dark"
      style={{ height: '100dvh', minHeight: 600 }}
    >

      {/* ─── LAYER 0: images (cross-fade) ─── */}
      <div className="absolute inset-0 z-0">
        {SLIDES.map((s, i) => (
          <motion.div
            key={s.img}
            className="absolute inset-0"
            animate={{ opacity: i === current ? 1 : 0 }}
            transition={{ duration: 1.4, ease: 'easeInOut' }}
          >
            <Image
              src={s.img}
              alt={s.destination}
              fill
              className="object-cover"
              style={{ objectPosition: 'center 35%' }}
              priority={i === 0}
              sizes="100vw"
              quality={90}
              fetchPriority={i === 0 ? 'high' : 'auto'}
            />
          </motion.div>
        ))}
      </div>

      {/* ─── LAYER 1: cinematic overlays ─── */}
      {/* Top vignette — navbar readability */}
      <div
        className="absolute inset-x-0 top-0 z-10 pointer-events-none"
        style={{ height: '35%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)' }}
      />
      {/* Bottom vignette — text area */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
        style={{ height: '60%', background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)' }}
      />
      {/* Side vignettes for depth */}
      <div
        className="absolute inset-y-0 left-0 z-10 pointer-events-none"
        style={{ width: '20%', background: 'linear-gradient(to right, rgba(0,0,0,0.35), transparent)' }}
      />
      <div
        className="absolute inset-y-0 right-0 z-10 pointer-events-none"
        style={{ width: '20%', background: 'linear-gradient(to left, rgba(0,0,0,0.35), transparent)' }}
      />

      {/* ─── LAYER 2: CENTER content ─── */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6">

        {/* Brand label */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex items-center gap-3 mb-10 md:mb-12"
        >
          <div className="h-px w-12 bg-brand-gold/90" />
          <span
            className="text-white text-[9px] md:text-[10px] font-black uppercase tracking-[0.45em]"
            style={{ textShadow: '0 1px 12px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.7)' }}
          >
            Beliva VIP Tour
          </span>
          <div className="h-px w-12 bg-brand-gold/90" />
        </motion.div>

        {/* Destination name — no overflow-hidden so letters don't clip */}
        <div className="mb-4 py-2">
          <AnimatePresence mode="wait">
            <motion.h1
              key={`dest-${current}`}
              initial={{ opacity: 0, y: 50, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -30, filter: 'blur(4px)' }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif italic text-white leading-none"
              style={{
                fontSize: 'clamp(4.5rem, 14vw, 11rem)',
                textShadow: '0 4px 40px rgba(0,0,0,0.5)',
                letterSpacing: '-0.01em',
              }}
            >
              {slide.destination}
            </motion.h1>
          </AnimatePresence>
        </div>

        {/* Subtitle — tall fixed container so buttons never shift */}
        <div className="relative mb-10 md:mb-12" style={{ height: '3.5rem' }}>
          <AnimatePresence mode="wait">
            <motion.p
              key={`sub-${current}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-x-0 top-0 text-white text-sm md:text-base font-light tracking-wide leading-snug"
              style={{
                textShadow: '0 1px 10px rgba(0,0,0,0.95), 0 2px 20px rgba(0,0,0,0.8)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {slide.subtitle}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <a
            href="/#tours-grid"
            className="inline-flex items-center gap-2 bg-brand-gold text-brand-dark px-8 py-3.5 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-amber-400 active:scale-95 transition-all shadow-2xl shadow-brand-gold/30 group"
          >
            Разгледай оферти
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </a>

          {/* Second button — fixed width so row never shifts */}
          <Link
            href={slide.filterHref}
            className="inline-flex items-center justify-center gap-2 border border-white/25 text-white/70 px-7 py-3.5 rounded-full font-black uppercase text-[11px] tracking-widest hover:border-brand-gold hover:text-brand-gold backdrop-blur-sm transition-all"
            style={{ minWidth: 180 }}
          >
            <MapPin size={11} /> {slide.destination}
          </Link>
        </motion.div>

        {/* Trust pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex items-center gap-6 mt-10"
        >
          {[
            { v: '60+', l: 'Дестинации' },
            { v: '150+', l: 'Водени групи' },
            { v: '★ 4.9', l: 'Оценка' },
          ].map(({ v, l }, i, arr) => (
            <div key={l} className="flex items-center gap-6">
              <div className="flex flex-col items-center">
                <span className="text-brand-gold font-serif font-bold text-xl leading-none">{v}</span>
                <span className="text-white/70 text-[8px] font-black uppercase tracking-[0.25em] mt-1">{l}</span>
              </div>
              {i < arr.length - 1 && <div className="h-6 w-px bg-white/12" />}
            </div>
          ))}
        </motion.div>
      </div>

      {/* ─── LAYER 3: destination slider at the bottom ─── */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
        {/* Global progress bar */}
        <div className="h-[1px] bg-white/10">
          <motion.div
            key={current}
            className="h-full bg-brand-gold/60"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: INTERVAL / 1000, ease: 'linear' }}
            style={{ transformOrigin: 'left' }}
          />
        </div>

        {/* Thumbnail strip */}
        <div className="flex" style={{ height: 80 }}>
          {SLIDES.map((s, i) => {
            const isActive = i === current;
            return (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={s.destination}
                className="relative flex-1 overflow-hidden group"
                style={{ borderRight: i < SLIDES.length - 1 ? '1px solid rgba(0,0,0,0.4)' : 'none' }}
              >
                {/* Thumbnail image */}
                <Image
                  src={s.img}
                  alt={s.destination}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  style={{ objectPosition: 'center 35%' }}
                  sizes="20vw"
                  quality={40}
                />

                {/* Overlay */}
                <div
                  className="absolute inset-0 transition-all duration-400"
                  style={{
                    background: isActive ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.60)',
                  }}
                />

                {/* Active gold top accent */}
                <div
                  className="absolute top-0 left-0 right-0 transition-all duration-300"
                  style={{
                    height: 3,
                    background: isActive ? '#d4af37' : 'transparent',
                  }}
                />

                {/* Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                  <span
                    className="font-black uppercase transition-colors duration-300"
                    style={{
                      fontSize: 9,
                      letterSpacing: '0.12em',
                      color: isActive ? '#d4af37' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {s.destination}
                  </span>
                  {isActive && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: INTERVAL / 1000, ease: 'linear' }}
                      className="h-[1.5px] w-8 bg-brand-gold"
                      style={{ transformOrigin: 'left', originX: 0 }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </section>
  );
}
