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
    video: '/videos/thailand.mp4' ,
    filterHref: '/?country=tayland#tours-grid',
  },
  {
    destination: 'Австралия',
    subtitle: 'Природа без граници, приключения без край',
    img: '/hero/australia.webp',
    video: '/videos/australia.mov' , // Файлът е .mov, не .mp4 — пътят е коригиран да съвпада с реалния файл. Ако не тръгне в някой браузър,
    // fallback логиката по-долу автоматично показва снимката вместо него.
    filterHref: '/?country=avstraliya#tours-grid',
  },
  {
    destination: 'Китай',
    subtitle: 'Хиляди години история и модерни чудеса',
    img: '/hero/china.webp',
    video: '/videos/china.mp4' ,
    filterHref: '/?country=kitay#tours-grid',
  },
  {
    destination: 'Перу',
    subtitle: 'Мачу Пикчу и изгубените цивилизации',
    img: '/hero/peru.webp',
    video: '/videos/peru.mp4' ,
    filterHref: '/?country=peru#tours-grid',
  },
  {
    destination: 'Сингапур',
    subtitle: 'Бъдещето среща традицията в Азия',
    img: '/hero/singapore.webp',
    video: '/videos/singapore.mp4' ,
    filterHref: '/?country=singapur#tours-grid',
  },
];

// Фиксиран, предвидим ритъм на всеки слайд: 3s само снимка, после клипче отгоре. Преходът към следващата
// държава се задвижва от реалното края на видеото (onEnded), не от фиксиран таймер. Фиксираният таймер по-долу
// остава само като предпазна мрежа за случай, в който видеото никога не затръгне/не завърши.
const PHOTO_DURATION = 3000;
// Таван за fallback-а — генерозен, така че да не пречи никога нормално играещо видео (клипчетата са 5-10s) —
// onEnded винаги ще стреля първо за работещо видео, тази стойност се използва само ако той никога не стреля.
const FALLBACK_VIDEO_CEILING = 12000;
const CROSSFADE_DURATION = 1400; // съвпада с opacity transition-а на обвиващия div по-долу

export default function Hero() {
  const [current, setCurrent] = useState(0);
  // Проследява последния РЕНДВАН current — служи за синхронно засичане на смяна ПО ВРЕМЕ НА render (не в useEffect).
  // Официален React pattern за "adjust state when a value changes" (React docs), различен от useEffect, който
  // винаги изостава с поне един render цикъл.
  const [renderedCurrent, setRenderedCurrent] = useState(0);
  const [showVideoEl, setShowVideoEl] = useState(false); // след PHOTO_DURATION: дали <video> елементът вече е монтиран
  const [videoVisible, setVideoVisible] = useState(false); // дали видеото реално свири и трябва да е видимо (насложено върху снимката)
  // Индекс на слайда, чието видео все още трябва да остане монтирано, докато външният crossfade не завърши.
  const [lingeringIndex, setLingeringIndex] = useState<number | null>(null);

  // СИНХРОННО по време на render (НЕ useEffect!) — засича смяна на current в СЪЩИЯ render цикъл, преди браузърът
  // изобщо да нарисува нещо. Точно тук беше бъгът от преди: useEffect винаги изпълнява един render кадър по-късно,
  // оставяйки видим момент, в който старият слайд вече не е current, но lingeringIndex още не е наваксал — видеото
  // му мигновено се демонтираше, разкривайки снимката му за части от секундата, преди crossfade-ът изобщо да
  // започне. С тази синхронна проверка React прихваща новото състояние и пре-рендва веднага, преди да нарисува
  // каквото и да е — така че бъгливият междинен кадър никога не се вижда.
  if (current !== renderedCurrent) {
    setLingeringIndex(renderedCurrent);
    setShowVideoEl(false);
    setVideoVisible(false);
    setRenderedCurrent(current);
  }

  // Таймерите остават в useEffect — setTimeout е неизбежен side effect, не може да се случи по време на render.
  useEffect(() => {
    const startVideoTimer = setTimeout(() => setShowVideoEl(true), PHOTO_DURATION);
    const lingerTimer = setTimeout(() => setLingeringIndex(null), CROSSFADE_DURATION);
    // Fallback — само ако onEnded никога не стреля (грешка, видео липсва за този слайд, браузърът блокира автоплей).
    // За работещо видео никога не трябва да се стига дотук — handleVideoEnded винаги ще стреля първо и ще го анулира.
    const fallbackTimer = setTimeout(() => {
      setCurrent(c => (c + 1) % SLIDES.length);
    }, PHOTO_DURATION + FALLBACK_VIDEO_CEILING);

    return () => {
      clearTimeout(startVideoTimer);
      clearTimeout(fallbackTimer);
      clearTimeout(lingerTimer);
    };
  }, [current]);

  const handleVideoPlaying = () => setVideoVisible(true);
  // Основният двигател на прехода към следващата държава — стреля точно когато видеото реално свърши,
  // без изкуствена пауза между края на видеото и самия преход.
  const handleVideoEnded = () => setCurrent(c => (c + 1) % SLIDES.length);

  // Истински плавен progress bar чрез requestAnimationFrame (60 пъти/сек), вместо timeupdate (~4 пъти/сек), който
  // изглеждаше стъпаловидно/накъсано. Обновяваме style директно по DOM (не React state), за да няма излишни re-render-и.
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let rafId: number;
    const tick = () => {
      const v = videoRef.current;
      if (v && v.duration > 0 && progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${Math.min(1, v.currentTime / v.duration)})`;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [current]);

  const goTo = useCallback((i: number) => {
    setCurrent(prev => (i === prev ? prev : i));
  }, []);

  const slide = SLIDES[current];

  return (
    <section
      className="relative w-full overflow-hidden bg-brand-dark"
      style={{ height: '100dvh', minHeight: 600 }}
    >

      {/* ─── LAYER 0: images — pure CSS transition, no framer-motion flash ─── */}
      <div className="absolute inset-0 z-0">
        {SLIDES.map((s, i) => {
          const isCurrent = i === current;
          const isLingering = i === lingeringIndex;
          // Видеото се монтира: (а) за активния слайд, след PHOTO_DURATION, или (б) за слайда, който тъкмо
          // престана да е активен, докато crossfade-ът му не завърши (isLingering) — за да не изчезне рязко.
          const shouldMountVideo = (isCurrent && showVideoEl) || isLingering;
          // За lingering слайда видеото просто остава на пълна видимост (вече беше видимо) — целият div
          // (снимка+видео) избледнява заедно чрез външния opacity transition. За активния слайд видимостта
          // зависи от реалния playback статус.
          const isVideoVisible = isLingering || (isCurrent && videoVisible);

          return (
          <div
            key={s.img}
            className="absolute inset-0"
            style={{
              opacity: isCurrent ? 1 : 0,
              transition: 'opacity 1.4s ease-in-out',
            }}
          >
            <Image
              src={s.img}
              alt={`${s.destination} — ${s.subtitle}`}
              fill
              className="object-cover"
              style={{ objectPosition: 'center 35%' }}
              priority={i === 0}
              sizes="100vw"
              quality={90}
              fetchPriority={i === 0 ? 'high' : 'auto'}
            />

            {/* Монтира се точно {PHOTO_DURATION / 1000}s след като слайдът стане активен, автоматично стартира, и се появява
                плавно едва когато onPlaying реално стреля. БЕЗ loop — onEnded веднага превключва към следващата държава,
                без пауза след края на видеото. */}
            {shouldMountVideo && s.video && (
              <video
                key={s.video}
                ref={isCurrent ? videoRef : undefined}
                src={s.video}
                autoPlay={isCurrent}
                muted
                playsInline
                preload="auto"
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  objectPosition: 'center 35%',
                  opacity: isVideoVisible ? 1 : 0,
                  transition: 'opacity 0.8s ease-in-out',
                }}
                onPlaying={handleVideoPlaying}
                onEnded={isCurrent ? handleVideoEnded : undefined}
              />
            )}
          </div>
          );
        })}
      </div>

      {/* ─── LAYER 0.5: aurora mesh wash — adds depth/color without fighting the photo ─── */}
      <div
        className="aurora-mesh absolute inset-0 z-[5] pointer-events-none"
        style={{ mixBlendMode: 'screen', opacity: 0.85 }}
      />

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

        {/* Истински H1 за SEO/screen readers — визуално скрит, защото видимата дестинация се сменя автоматично
            и сама по себе си не описва бизнеса пред търсачки/асистивни технологии. */}
        <h1 className="sr-only">
          Beliva VIP Tour — Луксозни пътувания, екскурзии и почивки по света с личен водач
        </h1>

        {/* Destination name — no overflow-hidden so letters don't clip */}
        <div className="mb-4 py-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={`dest-${current}`}
              initial={{ opacity: 0, y: 50, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -30, filter: 'blur(4px)' }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif italic text-white leading-none"
              style={{
                fontSize: 'clamp(2.75rem, 14vw, 11rem)',
                textShadow: '0 4px 40px rgba(0,0,0,0.5)',
                letterSpacing: '-0.01em',
              }}
            >
              {slide.destination}
            </motion.div>
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

        {/* Floating glass dock — CTAs + trust stats, docked as one unit (2026 spatial-UI treatment) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="glass-panel flex flex-col items-center gap-6 rounded-[2rem] px-6 py-6 sm:px-10 sm:py-7"
        >
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/#tours-grid"
              className="inline-flex items-center gap-2 bg-brand-gold text-brand-dark px-8 py-3.5 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-amber-400 active:scale-95 transition-all shadow-2xl shadow-brand-gold/30 group"
            >
              Разгледай оферти
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* Second button — fixed width so row never shifts */}
            <Link
              href={slide.filterHref}
              className="inline-flex items-center justify-center gap-2 border border-white/25 text-white/70 px-7 py-3.5 rounded-full font-black uppercase text-[11px] tracking-widest hover:border-brand-gold hover:text-brand-gold transition-all"
              style={{ minWidth: 180 }}
            >
              <MapPin size={11} /> {slide.destination}
            </Link>
          </div>

          {/* Trust pills */}
          <div className="flex items-center gap-6">
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
          </div>
        </motion.div>
      </div>

      {/* ─── LAYER 3: destination slider at the bottom ─── */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
        {/* Global progress bar — обновяван на всеки анимационен кадър (requestAnimationFrame) спрямо реалния
            прогрес на текущото видео. При смяна на слайда се нулира автоматично (key={current}). По време на
            PHOTO_DURATION (само снимка) остава празна. */}
        <div className="h-[2px] bg-white/10 overflow-hidden">
          <div
            key={current}
            ref={progressBarRef}
            className="h-full bg-brand-gold/70 origin-left"
            style={{ transform: 'scaleX(0)' }}
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
                  alt={`Разгледай оферти за ${s.destination}`}
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
                    <div className="h-[1.5px] w-8 bg-brand-gold" />
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
