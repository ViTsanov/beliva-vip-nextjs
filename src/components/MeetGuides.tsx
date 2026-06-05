"use client";

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

// Category slugs as produced by FiltersBar's slugify()
const GUIDES = [
  {
    name: 'Поли',
    fullName: 'Паулина Алексиева',
    role: 'Основател & Водач',
    photo: '/guides/poly.jpg',
    initial: 'П',
    tagline: 'Лично водени екзотични екскурзии — Япония, Австралия, Перу и още.',
    badgeClass: 'bg-brand-gold/10 text-brand-gold border-brand-gold/30',
    badge: '★ Водена от ПОЛИ',
    filterHref: '/?cat=vodena-ot-poli#tours-grid',
    accentColor: 'brand-gold',
  },
  {
    name: 'Ива',
    fullName: 'Ива',
    role: 'Специалист Турция',
    photo: '/guides/iva.jpg',
    initial: 'И',
    tagline: 'Перфектни почивки на Турското крайбрежие — Анталия, Бодрум, Мармарис.',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    badge: '🌴 Почивка в Турция',
    filterHref: '/?cat=pochivka-v-turtsiya#tours-grid',
    accentColor: 'teal-600',
  },
];

export default function MeetGuides() {
  return (
    <section className="bg-[#f7f0e4] border-y border-brand-gold/10 py-12">
      <div className="container mx-auto px-6">

        {/* ── Brand intro: logo + agency description ── */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10 mb-12 pb-12 border-b border-brand-gold/15">

          {/* Logo */}
          <div className="shrink-0 w-24 md:w-28">
            <Image
              src="/beliva_logo.png"
              alt="Beliva VIP Tour"
              width={112}
              height={112}
              className="w-full h-auto object-contain"
            />
          </div>

          {/* Description */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
              <div className="h-px w-8 bg-brand-gold" />
              <span className="text-brand-gold text-[9px] font-black uppercase tracking-[0.35em]">
                Beliva VIP Tour
              </span>
            </div>
            <h2 className="font-serif italic text-brand-dark text-2xl md:text-3xl mb-4 leading-snug">
              Туристическа агенция с лично отношение
            </h2>
            <p className="text-gray-500 text-sm md:text-base leading-relaxed max-w-2xl">
              Ние не сме масов туроператор. Работим с водещите операторски компании в България
              и подбираме само турове, зад които стоим лично. Всяка екскурзия преминава
              през нашия собствен критичен поглед — избираме по-добри снимки, представяме
              маршрута по-ясно и сме на линия от запитването до завръщането.
            </p>
          </div>
        </div>

        {/* ── Guides header ── */}
        <div className="flex items-center justify-between mb-7 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-brand-gold shrink-0" />
            <h3 className="text-brand-dark font-serif italic text-xl md:text-2xl">
              Вашите водачи
            </h3>
          </div>
          <Link
            href="/about-us"
            className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand-dark/50 hover:text-brand-gold transition-colors group"
          >
            Повече за нас
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Two cards side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GUIDES.map((guide) => (
            <Link
              key={guide.name}
              href={guide.filterHref}
              className="group flex items-center gap-5 bg-white rounded-[2rem] px-6 py-5 border border-brand-gold/10 hover:border-brand-gold/40 hover:shadow-md transition-all duration-300"
            >
              {/* Photo circle */}
              <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden shrink-0 bg-brand-dark shadow-md">
                <Image
                  src={guide.photo}
                  alt={guide.fullName}
                  fill
                  className="object-cover object-top"
                  sizes="80px"
                />
                {/* Initials fallback */}
                <div className="absolute inset-0 flex items-center justify-center">
                </div>
              </div>

              {/* Text */}
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-serif font-bold text-brand-dark text-lg leading-tight">
                    {guide.name}
                  </span>
                  <span className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${guide.badgeClass}`}>
                    {guide.badge}
                  </span>
                </div>
                <p className="text-[10px] text-brand-gold font-bold uppercase tracking-widest mb-1.5">
                  {guide.role}
                </p>
                <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">
                  {guide.tagline}
                </p>
              </div>

              {/* Arrow */}
              <ArrowRight
                size={18}
                className="text-gray-300 group-hover:text-brand-gold group-hover:translate-x-0.5 transition-all shrink-0"
              />
            </Link>
          ))}
        </div>

        {/* Mobile "about us" link */}
        <div className="md:hidden mt-5 text-center">
          <Link
            href="/about-us"
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand-dark/50 hover:text-brand-gold transition-colors"
          >
            Повече за нас <ArrowRight size={12} />
          </Link>
        </div>

      </div>
    </section>
  );
}
