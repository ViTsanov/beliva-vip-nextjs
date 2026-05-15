"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, MapPin, ChevronDown } from 'lucide-react';
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

const INTERVAL = 8000;
const THUMB_W = 88; // px width of the desktop thumbnail strip

export default function Hero() {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % SLIDES.length);
    }, INTERVAL);
  }, []);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  const goTo = useCallback((i: number) => {
    setCurrent(i);
    startTimer();
  }, [startTimer]);

  const slide = SLIDES[current];

  return (
    <section
      className="relative w-full overflow-hidden bg-[#0a1520]"
      style={{ height: '100dvh', minHeight: 600 }}
    >

      {/* ══════════════════════════════════════════
          FULL-BLEED BACKGROUND IMAGE — desktop only
          (mobile has its own image block)
      ══════════════════════════════════════════ */}
      <div className="absolute inset-0 z-0 hidden lg:block">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`bg-${current}`}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute inset-0"
          >
            <Image
              src={slide.img}
              alt={slide.destination}
              fill
              className="object-cover"
              style={{ objectPosition: 'center 30%' }}
              priority={current === 0}
              sizes="100vw"
              quality={90}
              fetchPriority={current === 0 ? 'high' : 'auto'}
            />
          </motion.div>
        </AnimatePresence>

        {/* Dark overlay for overall legibility */}
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />

        {/* Vignette — heavier at top (navbar) and bottom-left (text area) */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 35%, transparent 55%, rgba(0,0,0,0.75) 100%)',
          }}
        />
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 50%)',
          }}
        />
      </div>

      {/* ══════════════════════════════════════════
          DESKTOP LAYOUT
      ══════════════════════════════════════════ */}
      <div
        className="hidden lg:flex absolute inset-0 z-10"
        style={{ paddingRight: THUMB_W }}
      >

        {/* ── Bottom-left text block ── */}
        <div className="flex flex-col justify-end flex-1 px-14 xl:px-16 pb-14">

          {/* Agency tagline */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-white/100 text-xl font-light leading-relaxed mb-8 max-w-[280px] border-l-2 border-brand-gold/40 pl-4"
          >
            Туристическа агенция с лично отношение —
            работим с водещи оператори и подбираме
            внимателно всяка екскурзия.
          </motion.p>

          {/* Thin gold rule */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px w-10 bg-brand-gold/50" />
            <span className="text-brand-gold/90 text-[9px] font-black uppercase tracking-[0.4em]">
              Открийте
            </span>
          </div>

          {/* Destination headline */}
          <div className="overflow-hidden mb-3">
            <AnimatePresence mode="wait" initial={false}>
              <motion.h1
                key={`dh-${current}`}
                initial={{ opacity: 0, y: 36 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="font-serif italic text-white leading-none"
                style={{
                  fontSize: 'clamp(3.5rem, 7vw, 6.5rem)',
                  textShadow: '0 3px 30px rgba(0,0,0,0.5)',
                }}
              >
                {slide.destination}
              </motion.h1>
            </AnimatePresence>
          </div>

          {/* Subtitle */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={`ds-${current}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="text-white/55 text-base font-light mb-9 max-w-[320px]"
            >
              {slide.subtitle}
            </motion.p>
          </AnimatePresence>

          {/* CTA row */}
          <div className="flex items-center gap-4 flex-wrap">
            <a
              href="/#tours-grid"
              className="inline-flex items-center gap-2 bg-brand-gold text-brand-dark px-8 py-3.5 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-amber-400 active:scale-95 transition-all shadow-xl shadow-brand-gold/20 group"
            >
              Всички оферти
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </a>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={`dbtn-${current}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Link
                  href={slide.filterHref}
                  className="inline-flex items-center gap-2 border border-white/25 text-white/65 px-6 py-3.5 rounded-full font-black uppercase text-[11px] tracking-widest hover:border-brand-gold hover:text-brand-gold transition-all"
                >
                  <MapPin size={11} /> {slide.destination}
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-7 mt-10 pt-7 border-t border-white/10">
            {[
              { value: '60+', label: 'Дестинации' },
              { value: '150+', label: 'Групи' },
              { value: '★ 4.9', label: 'Оценка' },
            ].map(({ value, label }, i, arr) => (
              <div key={label} className="flex items-center gap-7">
                <div className="flex flex-col">
                  <span className="text-brand-gold font-serif font-bold text-2xl leading-none">{value}</span>
                  <span className="text-white/30 text-[9px] font-bold uppercase tracking-[0.25em] mt-1">{label}</span>
                </div>
                {i < arr.length - 1 && (
                  <div className="h-8 w-px bg-white/10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Desktop thumbnail strip (right edge) ── */}
      <div
        className="hidden lg:flex absolute top-0 right-0 bottom-0 z-20 flex-col"
        style={{ width: THUMB_W }}
      >
        {SLIDES.map((s, i) => {
          const isActive = i === current;
          return (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="relative flex-1 overflow-hidden group transition-all duration-300"
              aria-label={s.destination}
              style={{
                borderBottom: i < SLIDES.length - 1 ? '1px solid rgba(0,0,0,0.4)' : 'none',
              }}
            >
              {/* Thumbnail image */}
              <Image
                src={s.img}
                alt={s.destination}
                fill
                className="object-cover transition-all duration-500 group-hover:scale-105"
                style={{ objectPosition: 'center 30%' }}
                sizes={`${THUMB_W}px`}
                quality={50}
              />

              {/* Dark overlay — lighter on active */}
              <div
                className="absolute inset-0 transition-all duration-300"
                style={{
                  background: isActive
                    ? 'rgba(0,0,0,0.2)'
                    : 'rgba(0,0,0,0.55)',
                }}
              />

              {/* Active indicator — gold left border */}
              <div
                className="absolute left-0 top-0 bottom-0 transition-all duration-400"
                style={{
                  width: 3,
                  background: isActive ? '#d4af37' : 'transparent',
                }}
              />

              {/* Destination label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <span
                  className="font-bold uppercase text-center px-1 leading-tight transition-colors duration-300"
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    color: isActive ? '#d4af37' : 'rgba(255,255,255,0.55)',
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    textOrientation: 'mixed',
                  }}
                >
                  {s.destination}
                </span>
              </div>

              {/* Progress bar on active thumb — runs across the bottom */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden">
                  <motion.div
                    key={current}
                    className="h-full bg-brand-gold"
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: INTERVAL / 1000, ease: 'linear' }}
                    style={{ transformOrigin: 'left' }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════
          MOBILE LAYOUT — completely separate
      ══════════════════════════════════════════ */}
      <div
        className="lg:hidden flex flex-col"
        style={{ height: '100dvh', minHeight: 600 }}
      >
        {/* Image — top 58% */}
        <div
          className="relative overflow-hidden flex-none"
          style={{ height: '58dvh', minHeight: 300 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`mi-${current}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="absolute inset-0"
            >
              <Image
                src={slide.img}
                alt={slide.destination}
                fill
                className="object-cover"
                style={{ objectPosition: 'center 30%' }}
                priority={current === 0}
                sizes="100vw"
                quality={85}
              />
            </motion.div>
          </AnimatePresence>

          <div className="absolute inset-0 bg-black/30 pointer-events-none" />
          {/* Navbar scrim */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent pointer-events-none z-10" />
          {/* Fade into panel */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0a1520] to-transparent pointer-events-none" />
        </div>

        {/* Thumbnail row — sits at the seam */}
        <div className="flex flex-none bg-[#0a1520]">
          {SLIDES.map((s, i) => {
            const isActive = i === current;
            return (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="relative flex-1 overflow-hidden"
                style={{
                  height: 42,
                  borderRight: i < SLIDES.length - 1 ? '1px solid rgba(0,0,0,0.4)' : 'none',
                }}
                aria-label={s.destination}
              >
                <Image
                  src={s.img}
                  alt={s.destination}
                  fill
                  className="object-cover"
                  style={{ objectPosition: 'center 30%' }}
                  sizes="20vw"
                  quality={40}
                />
                <div
                  className="absolute inset-0"
                  style={{ background: isActive ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.6)' }}
                />
                {/* Active top bar */}
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand-gold" />
                )}
                <span
                  className="absolute inset-0 flex items-center justify-center font-bold uppercase"
                  style={{
                    fontSize: 8,
                    letterSpacing: '0.08em',
                    color: isActive ? '#d4af37' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  {s.destination.slice(0, 5)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Text panel */}
        <div
          className="flex flex-col justify-between flex-1 px-6 pt-5"
          style={{
            background: '#0a1520',
            paddingBottom: 'max(1.25rem, calc(env(safe-area-inset-bottom) + 1rem))',
          }}
        >
          <div className="flex flex-col gap-2">
            {/* Destination */}
            <div className="overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.h1
                  key={`mh-${current}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                  className="font-serif italic text-white leading-none"
                  style={{ fontSize: 'clamp(2rem, 9vw, 2.8rem)' }}
                >
                  {slide.destination}
                </motion.h1>
              </AnimatePresence>
            </div>

            {/* Subtitle */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={`ms-${current}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28 }}
                className="text-white/45 text-xs font-light line-clamp-1"
              >
                {slide.subtitle}
              </motion.p>
            </AnimatePresence>

            {/* CTAs */}
            <div className="flex gap-2 mt-1">
              <a
                href="/#tours-grid"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-brand-gold text-brand-dark py-2.5 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-amber-400 transition-all group"
              >
                Всички оферти
                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </a>
              <Link
                href={slide.filterHref}
                aria-label={`Оферти за ${slide.destination}`}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-full border border-white/15 text-white/55 hover:border-brand-gold hover:text-brand-gold transition-all"
              >
                <MapPin size={13} />
              </Link>
            </div>
          </div>

          {/* Scroll hint + stats */}
          <div className="flex flex-col items-center gap-3">
            <motion.a
              href="/#tours-grid"
              className="flex flex-col items-center gap-1 group"
              animate={{ y: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              aria-label="Скролни надолу"
            >
              <span className="text-white/20 text-[8px] font-bold uppercase tracking-[0.25em] group-hover:text-brand-gold/50 transition-colors">
                Разгледай
              </span>
              <ChevronDown size={15} className="text-white/20 group-hover:text-brand-gold/50 transition-colors" />
            </motion.a>

            {/* Mini stats */}
            <div className="flex items-center gap-5">
              {[
                { value: '60+', label: 'Дестинации' },
                { value: '150+', label: 'Групи' },
                { value: '★ 4.9', label: 'Оценка' },
              ].map(({ value, label }, i, arr) => (
                <div key={label} className="flex items-center gap-5">
                  <div className="flex flex-col items-center">
                    <span className="text-brand-gold font-serif font-bold text-lg leading-none">{value}</span>
                    <span className="text-white/25 text-[8px] font-bold uppercase tracking-wider mt-0.5">{label}</span>
                  </div>
                  {i < arr.length - 1 && <div className="h-5 w-px bg-white/10" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
