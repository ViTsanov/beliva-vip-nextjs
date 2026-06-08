"use client";

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin } from 'lucide-react';

// Страничните снимки — 8 тотал, по 2 в колона
// Смени с реални снимки: /public/guides/poly-1.jpg ... poly-8.jpg
const SIDE_PHOTOS = [
  { src: '/guides/poly-8.jpg', pos: 'center 10%' },
  { src: '/guides/poly-1.jpg', pos: 'center 45%' },
  { src: '/guides/poly-2.jpg', pos: 'center 70%' },
  { src: '/guides/poly-3.jpg', pos: 'center 25%' },
  { src: '/guides/poly-4.jpg', pos: 'center 55%' },
  { src: '/guides/poly-5.jpg', pos: 'center 80%' },
  { src: '/guides/poly-6.jpg', pos: 'center 30%' },
  { src: '/guides/poly-7.jpg', pos: 'center 60%' },
];

// translateY стагеринг на всяка от 4-те колони (2 снимки в колона)
const STAGGER = [-65, 50, -30, 75];

export default function MeetGuides() {
  return (
    <section className="bg-[#f7f0e4] overflow-hidden">

      {/* Горна секция с лого и описание — запазена в container */}
      <div className="container mx-auto px-6 pt-12 md:pt-16 pb-10">
        <div className="flex flex-col items-center text-center gap-4 pb-10 border-b border-brand-gold/15">
          <Image
            src="/beliva_logo.png"
            alt="Beliva VIP Tour"
            width={72}
            height={72}
            className="w-16 h-auto object-contain"
          />
          <div>
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="h-px w-6 bg-brand-gold" />
              <span className="text-brand-gold text-[9px] font-black uppercase tracking-[0.4em]">Beliva VIP Tour</span>
              <div className="h-px w-6 bg-brand-gold" />
            </div>
            <p className="text-brand-dark/55 text-sm leading-relaxed max-w-md mx-auto">
              Не сме масов туроператор. Работим с водещи операторски компании и подбираме
              само турове, зад които стоим лично — от запитването до завръщането.
            </p>
          </div>
        </div>

        {/* Section header */}
        <div className="text-center mt-10 mb-4">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-8 bg-brand-gold/40" />
            <span className="text-brand-gold text-[9px] font-black uppercase tracking-[0.4em]">
              Вашият водач
            </span>
            <div className="h-px w-8 bg-brand-gold/40" />
          </div>
          <h2 className="text-4xl md:text-5xl font-serif italic text-brand-dark leading-tight">
            Човекът зад <span className="text-brand-gold">пътуванията</span>
          </h2>
        </div>
      </div>

      {/* ─── DESKTOP: пълна ширина, стагериран грид — 4 колони странични снимки + централна карта ─── */}
      <div
        className="hidden lg:grid w-full px-5 xl:px-8"
        style={{
          gridTemplateColumns: '1fr 1fr 380px 1fr 1fr',
          gap: '14px',
          alignItems: 'stretch',
          paddingTop: 100,
          paddingBottom: 120,
        }}
      >
        {/* Лява колона 1 — 2 снимки, изместена нагоре */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0 }}
          className="flex flex-col gap-3"
          style={{ transform: `translateY(${STAGGER[0]}px)` }}
        >
          {[SIDE_PHOTOS[0], SIDE_PHOTOS[1]].map((p, i) => (
            <div key={i} className="relative rounded-2xl overflow-hidden shadow-md flex-1">
              <Image src={p.src} alt="Поли в пътуване" fill className="object-cover"
                style={{ objectPosition: p.pos }} sizes="20vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
            </div>
          ))}
        </motion.div>

        {/* Лява колона 2 — 2 снимки, изместена надолу */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.06 }}
          className="flex flex-col gap-3"
          style={{ transform: `translateY(${STAGGER[1]}px)` }}
        >
          {[SIDE_PHOTOS[2], SIDE_PHOTOS[3]].map((p, i) => (
            <div key={i} className="relative rounded-2xl overflow-hidden shadow-md flex-1">
              <Image src={p.src} alt="Поли в пътуване" fill className="object-cover"
                style={{ objectPosition: p.pos }} sizes="20vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
            </div>
          ))}
        </motion.div>

        {/* Централна карта */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, delay: 0.04 }}
        >
          <PoliCard />
        </motion.div>

        {/* Дясна колона 3 — 2 снимки, леко нагоре */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.06 }}
          className="flex flex-col gap-3"
          style={{ transform: `translateY(${STAGGER[2]}px)` }}
        >
          {[SIDE_PHOTOS[4], SIDE_PHOTOS[5]].map((p, i) => (
            <div key={i} className="relative rounded-2xl overflow-hidden shadow-md flex-1">
              <Image src={p.src} alt="Поли в пътуване" fill className="object-cover"
                style={{ objectPosition: p.pos }} sizes="20vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
            </div>
          ))}
        </motion.div>

        {/* Дясна колона 4 — 2 снимки, най-надолу */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0 }}
          className="flex flex-col gap-3"
          style={{ transform: `translateY(${STAGGER[3]}px)` }}
        >
          {[SIDE_PHOTOS[6], SIDE_PHOTOS[7]].map((p, i) => (
            <div key={i} className="relative rounded-2xl overflow-hidden shadow-md flex-1">
              <Image src={p.src} alt="Поли в пътуване" fill className="object-cover"
                style={{ objectPosition: p.pos }} sizes="20vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
            </div>
          ))}
        </motion.div>
      </div>

      {/* ─── МОБИЛЕН: само централна карта ─── */}
      <div className="lg:hidden container mx-auto px-6 py-6">
        <PoliCard />
      </div>

      {/* Бутон */}
      <div className="pb-12 md:pb-16 text-center">
        <Link
          href="/about-us"
          className="inline-flex items-center gap-2 bg-brand-dark text-white px-8 py-3.5 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-brand-gold hover:text-brand-dark transition-all group shadow-md"
        >
          Научете повече за нас
          <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

    </section>
  );
}

// Изнесена централна карта — използва се и на desktop, и на мобилен
function PoliCard() {
  return (
    <Link
      href="/?cat=vodena-ot-poli#tours-grid"
      className="group block relative rounded-[2rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500"
      style={{ height: 440 }}
    >
      <div className="absolute inset-0">
        <Image
          src="/guides/poly.jpg"
          alt="Паулина Алексиева — Beliva VIP Tour"
          fill
          className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 1024px) 100vw, 380px"
          priority
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #1a0f04, #2a1a08)', zIndex: -1 }} />
      </div>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.05) 100%)' }} />

      {/* Badge горе */}
      <div className="absolute top-6 left-6 right-6 flex items-start justify-between z-10">
        <span className="inline-flex items-center text-[9px] font-black uppercase tracking-widest px-3.5 py-2 rounded-full shadow-lg bg-brand-gold text-brand-dark">
          ★ Водена от ПОЛИ
        </span>
        <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:bg-brand-gold group-hover:border-brand-gold">
          <ArrowRight size={15} className="text-white group-hover:text-brand-dark" />
        </div>
      </div>

      {/* Съдържание долу */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col justify-end" style={{ height: 240, padding: '0 1.75rem 1.75rem' }}>
        <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.28em] mb-2">
          Основател & Водач
        </p>
        <h3
          className="font-serif italic text-white leading-none mb-4 transition-colors duration-300 group-hover:text-brand-gold"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}
        >
          Паулина Алексиева
        </h3>
        <div className="h-px bg-white/15 mb-4 transition-all duration-300 group-hover:bg-brand-gold/40" />
        <p className="text-white/60 text-sm font-light leading-relaxed mb-4">
          Лично водени екскурзии до Япония, Австралия, Перу и над 40 дестинации.
        </p>
        <div className="flex flex-wrap gap-2 mb-5">
          {['Япония', 'Австралия', 'Перу', 'Китай', 'ОАЕ'].map(dest => (
            <span key={dest} className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-white/10 border border-white/15 text-white/65 px-2.5 py-1 rounded-full backdrop-blur-sm">
              <MapPin size={8} className="shrink-0" />{dest}
            </span>
          ))}
        </div>
        <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-gold border-b border-brand-gold/40 pb-0.5 group-hover:border-brand-gold transition-all">
          Вижте турове с Поли <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
