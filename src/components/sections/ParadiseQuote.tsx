"use client";

import { motion } from 'framer-motion';

// Пълноекранен editorial момент — прекъсва утилитарния ритъм на страницата (Hero → Топ турове → Оферти)
// с емоционална пауза, преди потребителят да влезе в "пазаруващия" режим на цялата решетка с оферти.
export default function ParadiseQuote() {
  return (
    <section className="relative h-[70vh] min-h-[440px] max-h-[640px] w-full overflow-hidden bg-brand-dark">
      <video
        src="/videos/sunset.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: 'center 0%' }}
      />
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
