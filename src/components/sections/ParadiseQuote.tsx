"use client";

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

// Пълноекранен editorial момент — прекъсва утилитарния ритъм на страницата (Hero → Топ турове → Оферти)
// с емоционална пауза, преди потребителят да влезе в "пазаруващия" режим на цялата решетка с оферти.
export default function ParadiseQuote() {
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  // Видеото се теглеше веднага при отваряне на страницата (дори 76 MB оригинал), макар секцията да е далеч под
  // първия екран. Сега се зарежда едва когато секцията се доближи до viewport-а, и само на широк екран, при нормална
  // връзка и без „намалено движение“. Иначе остава снимката.
  const sectionRef = useRef<HTMLElement>(null);
  const [loadVideo, setLoadVideo] = useState(false);
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const slowNetwork = !!conn && (conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType ?? ''));
    const allowed =
      window.matchMedia('(min-width: 1024px)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      !slowNetwork;
    const el = sectionRef.current;
    if (!allowed || !el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setLoadVideo(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative h-[70vh] min-h-[440px] max-h-[640px] w-full overflow-hidden bg-brand-dark">
      {/* Винаги видима снимка отдолу — ако видеото гръмне/забави (напр. ERR_QUIC_PROTOCOL_ERROR от Firebase
          Hosting CDN — мрежов/протоколен проблем, не бъг в кода), остава видима вместо черен/„замръзнал“ екран. */}
      <Image
        src="/hero/hero-bg.webp"
        alt=""
        fill
        className="object-cover"
        style={{ objectPosition: 'center 40%' }}
        sizes="100vw"
        quality={80}
      />

      {loadVideo && !videoFailed && (
        <video
          key="/videos/web/sunset.mp4"
          src="/videos/web/sunset.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            objectPosition: 'center 0%',
            opacity: videoReady ? 1 : 0,
            transition: 'opacity 0.8s ease-in-out',
          }}
          onPlaying={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
          onStalled={() => setVideoFailed(true)}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black/70" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />

      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="h-px w-10 bg-brand-gold/70" />
            <span className="text-brand-gold text-[10px] font-black uppercase tracking-[0.4em]">Философия</span>
            <div className="h-px w-10 bg-brand-gold/70" />
          </div>
          <blockquote
            className="font-serif italic text-white leading-[1.15] max-w-4xl mx-auto"
            style={{ fontSize: 'clamp(2rem, 5.5vw, 4.5rem)', textShadow: '0 4px 40px rgba(0,0,0,0.5)' }}
          >
            Някъде отвъд хоризонта има залез,<br className="hidden md:block" />
            който вече ти <span className="text-brand-gold">принадлежи</span>.
          </blockquote>
          <p className="text-amber-400/60 text-sm md:text-base font-mono mt-8 tracking-wide ">
            Просто трябва да отидеш да си го вземеш.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
