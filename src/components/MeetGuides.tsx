"use client";

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin } from 'lucide-react';

const GUIDES = [
  {
    name: 'Поли',
    fullName: 'Паулина Алексиева',
    role: 'Основател & Водач',
    photo: '/guides/poly.jpg',
    initial: 'П',
    tagline: 'Лично водени екскурзии до Япония, Австралия, Перу и над 40 дестинации.',
    badge: '★ Водена от ПОЛИ',
    badgeBg: 'bg-brand-gold text-brand-dark',
    filterHref: '/?cat=vodena-ot-poli#tours-grid',
    destinations: ['Япония', 'Австралия', 'Перу', 'Китай', 'ОАЕ'],
    accentFrom: '#1a0f04',
    accentTo: '#2a1a08',
    cta: 'Вижте турове с Поли',
  },
  {
    name: 'Ива',
    fullName: 'Ива',
    role: 'Специалист Турция',
    photo: '/guides/iva.jpg',
    initial: 'И',
    tagline: 'Перфектни почивки на Турското крайбрежие — Анталия, Бодрум, Мармарис.',
    badge: '🌴 Почивка в Турция',
    badgeBg: 'bg-teal-600 text-white',
    filterHref: '/?cat=pochivka-v-turtsiya#tours-grid',
    destinations: ['Анталия', 'Бодрум', 'Мармарис', 'Алания', 'Сиде'],
    accentFrom: '#041a10',
    accentTo: '#0a2a1a',
    cta: 'Вижте турове с Ива',
  },
];

export default function MeetGuides() {
  return (
    <section className="bg-[#f7f0e4] py-12 md:py-16 overflow-hidden">
      <div className="container mx-auto px-6">

        {/* Logo + agency description */}
        <div className="flex flex-col items-center text-center gap-4 mb-10 pb-10 border-b border-brand-gold/15">
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
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-8 bg-brand-gold/40" />
            <span className="text-brand-gold text-[9px] font-black uppercase tracking-[0.4em]">
              Вашите водачи
            </span>
            <div className="h-px w-8 bg-brand-gold/40" />
          </div>
          <h2 className="text-4xl md:text-5xl font-serif italic text-brand-dark leading-tight">
            Хората зад <span className="text-brand-gold">пътуванията</span>
          </h2>
        </div>

        {/* Portrait cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GUIDES.map((guide, idx) => (
            <motion.div
              key={guide.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
            >
              <Link
                href={guide.filterHref}
                className="group block relative rounded-[2rem] overflow-hidden shadow-lg hover:shadow-xl transition-all duration-500"
                style={{ height: 440 }}
              >
                {/* Photo */}
                <div className="absolute inset-0">
                  <Image
                    src={guide.photo}
                    alt={guide.fullName}
                    fill
                    className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority={idx === 0}
                  />
                  {/* Fallback gradient behind photo */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(160deg, ${guide.accentFrom}, ${guide.accentTo})`,
                      zIndex: -1,
                    }}
                  />
                </div>

                {/* Dark gradient overlay — lighter at top, heavy at bottom */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.1) 100%)',
                  }}
                />

                {/* Top badge */}
                <div className="absolute top-6 left-6 right-6 flex items-start justify-between z-10">
                  <span className={`inline-flex items-center text-[9px] font-black uppercase tracking-widest px-3.5 py-2 rounded-full shadow-lg ${guide.badgeBg}`}>
                    {guide.badge}
                  </span>
                  <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:bg-brand-gold group-hover:border-brand-gold">
                    <ArrowRight size={15} className="text-white group-hover:text-brand-dark" />
                  </div>
                </div>

                {/* Bottom content — fixed height so both cards are identical */}
                <div className="absolute bottom-0 left-0 right-0 flex flex-col justify-end" style={{ height: 240, padding: '0 1.75rem 1.75rem' }}>

                  {/* Name & role */}
                  <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.28em] mb-2">
                    {guide.role}
                  </p>
                  <h3
                    className="font-serif italic text-white leading-none mb-4 transition-colors duration-300 group-hover:text-brand-gold"
                    style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}
                  >
                    {guide.name}
                  </h3>

                  {/* Separator */}
                  <div className="h-px bg-white/15 mb-5 transition-all duration-300 group-hover:bg-brand-gold/40" />

                  {/* Tagline */}
                  <p className="text-white/60 text-sm font-light leading-relaxed mb-5 max-w-xs">
                    {guide.tagline}
                  </p>

                  {/* Destination pills */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {guide.destinations.map(dest => (
                      <span
                        key={dest}
                        className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-white/10 border border-white/15 text-white/65 px-2.5 py-1 rounded-full backdrop-blur-sm"
                      >
                        <MapPin size={8} className="shrink-0" />
                        {dest}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-gold border-b border-brand-gold/40 pb-0.5 group-hover:border-brand-gold transition-all">
                    {guide.cta}
                    <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Mobile about us link */}
        <div className="mt-6 text-center">
          <Link
            href="/about-us"
            className="inline-flex items-center gap-2 bg-brand-dark text-white px-8 py-3.5 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-brand-gold hover:text-brand-dark transition-all group shadow-md"
          >
            Научете повече за нас
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

      </div>
    </section>
  );
}
