"use client";

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowDown } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { revealVars, useRevealOnce } from '@/components/ui/Reveal';
import { HERO, STATS } from '@/app/about-us/aboutContent';

const TITLE: { t: string; gold?: boolean; br?: boolean }[] = [
  { t: 'Аз' }, { t: 'съм' }, { t: 'Поли', gold: true },
];

// Героят на „За нас“: снимката (или видеото) на цял екран, заглавието изплува дума по дума.
// При скрол снимката се движи по-бавно от страницата (паралакс), а текстът леко избледнява —
// само transform/opacity в requestAnimationFrame; при „намалено движение“ всичко стои на място.
export default function AboutHero() {
  const reduce = useReducedMotion();
  const mediaRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Видеото тръгва от JS, а не с autoPlay — при „намалено движение“ остава снимката
  useEffect(() => {
    const v = videoRef.current;
    if (!v || reduce !== false) return;
    v.play().catch(() => {});
    return () => v.pause();
  }, [reduce]);

  useEffect(() => {
    if (reduce) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = Math.min(window.scrollY, window.innerHeight);
      if (mediaRef.current) mediaRef.current.style.transform = `translate3d(0, ${y * 0.3}px, 0) scale(1.06)`;
      if (textRef.current) {
        textRef.current.style.transform = `translate3d(0, ${y * -0.12}px, 0)`;
        textRef.current.style.opacity = String(Math.max(0, 1 - y / (window.innerHeight * 0.7)));
      }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduce]);

  return (
    <>
      <section aria-labelledby="about-title" className="relative h-[calc(var(--hero-h,100svh)*0.88)] min-h-[560px] w-full overflow-hidden bg-brand-dark">
        <div ref={mediaRef} className="absolute inset-0 will-change-transform" style={{ transform: 'scale(1.06)' }}>
          <Image
            src={HERO.photo.src}
            alt={HERO.photo.alt}
            fill
            priority
            className="object-cover"
            style={{ objectPosition: HERO.photo.pos }}
            sizes="100vw"
          />
          {HERO.video && (
            <video
              ref={videoRef}
              src={HERO.video}
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
              onPlaying={() => setVideoReady(true)}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
            />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/45 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />

        <div ref={textRef} className="revealed relative z-10 flex h-full flex-col justify-end px-6 pb-28 md:px-14 md:pb-32">
          <div className="reveal mb-6 flex items-center gap-4" style={revealVars({ y: 12, delay: 0.1 })}>
            <div className="h-px w-10 bg-brand-gold" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold">Историята зад Beliva VIP Tour</span>
          </div>
          <h1
            id="about-title"
            className="max-w-4xl font-serif italic leading-[0.95] tracking-[-0.02em] text-white"
            style={{ fontSize: 'clamp(3rem, 9vw, 8rem)' }}
          >
            {TITLE.map((w, i) => (
              <span key={i}>
                <span className="-mb-[0.14em] -mr-[0.1em] inline-block overflow-hidden pb-[0.14em] pr-[0.1em] align-bottom">
                  <span className="reveal inline-block" style={revealVars({ y: '105%', duration: 0.8, delay: 0.2 + i * 0.08 })}>
                    {w.gold ? <span className="text-brand-gold">{w.t}</span> : w.t}
                    {w.gold && '.'}
                  </span>
                </span>
                {w.br ? <br /> : i < TITLE.length - 1 && ' '}
              </span>
            ))}
          </h1>
          {/* Втората половина на заглавието — по-малка, за да остане „Поли“ най-голямото на екрана */}
          <p
            className="reveal mt-3 font-serif italic leading-tight text-white/90"
            style={{ ...revealVars({ y: 14, delay: 0.5 }), fontSize: 'clamp(1.5rem, 3.6vw, 2.75rem)' }}
          >
            А светът е моето вдъхновение!
          </p>
          <p
            className="reveal mt-6 max-w-xl text-base font-light leading-relaxed text-white/75 md:text-lg"
            style={revealVars({ y: 14, delay: 0.65 })}
          >
            13 години из целия свят, над 80 посетени страни и една голяма любов - пътешествията. Водя с усмивка, спокойствие и познание, но най-вече с интуиция и сърце.
          </p>
          <a
            href="#istoriyata"
            className="reveal group mt-8 inline-flex w-fit items-center gap-3 text-[11px] font-black uppercase tracking-[0.3em] text-white/80 transition-colors hover:text-brand-gold"
            style={revealVars({ y: 10, delay: 0.75 })}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 transition-[border-color,transform] duration-150 group-hover:border-brand-gold group-active:scale-90">
              <ArrowDown size={16} aria-hidden="true" className="motion-safe:animate-bounce [animation-duration:2.4s]" />
            </span>
            Моята история
          </a>
        </div>

        {/* Диагонален долен ръб — прекъсва правата хоризонтална линия */}
        <div className="absolute bottom-0 left-0 right-0 h-24 overflow-hidden md:h-32">
          <div className="absolute inset-x-0 bottom-0 h-40 bg-white" style={{ clipPath: 'polygon(0 100%, 100% 55%, 100% 100%)' }} />
        </div>
      </section>

      <StatsBand />
    </>
  );
}

// Лентата с числата, застъпваща ръба на героса. Числата „се отброяват“ веднъж, когато лентата влезе в екрана.
function StatsBand() {
  const [ref, revealed] = useRevealOnce<HTMLDivElement>({ threshold: 0.4, rootMargin: '0px' });

  return (
    <div ref={ref} className={`relative z-20 -mt-16 px-6 md:-mt-20 ${revealed ? 'revealed' : ''}`}>
      <div className="container mx-auto">
        <dl className="grid grid-cols-2 divide-x divide-y divide-brand-gold/10 overflow-hidden rounded-[2rem] border border-brand-gold/10 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)] md:grid-cols-4 md:divide-y-0 md:rounded-[2.5rem]">
          {STATS.map((s, i) => (
            <div key={s.label} className="reveal flex flex-col-reverse items-center px-4 py-8" style={revealVars({ y: 16, delay: i * 0.08 })}>
              <dt className="text-center text-[9px] font-black uppercase tracking-[0.3em] text-brand-dark/50">{s.label}</dt>
              <dd className="mb-2 font-serif text-3xl font-bold leading-none tabular-nums text-brand-goldDeep md:text-5xl">
                <CountUp {...s} start={revealed} delay={i * 80} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function CountUp({ value, prefix, suffix, decimals = 0, start, delay }: {
  value: number; prefix: string; suffix: string; decimals?: number; start: boolean; delay: number;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value); // на сървъра и без JS — крайното число

  useEffect(() => {
    if (!start || reduce) return;
    let frame = 0;
    const t0 = performance.now() + delay;
    const duration = 1400;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / duration));
      const eased = 1 - Math.pow(1 - p, 4);
      setShown(value * eased);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick); // първият кадър е 0 (p = 0 до изтичане на закъснението)
    return () => cancelAnimationFrame(frame);
  }, [start, reduce, value, delay]);

  return (
    <>
      <span aria-hidden="true">{prefix}{shown.toFixed(decimals)}{suffix}</span>
      <span className="sr-only">{prefix}{value.toFixed(decimals)}{suffix}</span>
    </>
  );
}
