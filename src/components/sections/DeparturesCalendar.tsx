"use client";

import React, { useEffect, useRef } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthData {
  value: string;        // "YYYY-MM", напр. "2026-08"
  label: string;         // "Август"
  year: number;
  count: number;
  countries: string[];   // уникални държави с заминаване през този месец
  isFirstOfYear: boolean;
}

interface DeparturesCalendarProps {
  months: MonthData[]; // очаква се вече подредено, започвайки от текущия месец
  activeMonth: string;
  onSelectMonth: (value: string) => void;
}

export default function DeparturesCalendar({ months, activeMonth, onSelectMonth }: DeparturesCalendarProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Ако активният месец е избран отвън (deep link) или се смени — плавно го центрираме във видимата зона,
  // вместо потребителят сам да го търси в ленен скрол от до 36 месеца.
  useEffect(() => {
    if (!activeMonth) return;
    const el = cardRefs.current[activeMonth];
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeMonth]);

  const scrollByAmount = (dir: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  // Ако в текущия филтърен контекст няма никакви бъдещи заминавания — не показваме календара
  const hasAny = months.some(m => m.count > 0);
  if (!hasAny) return null;

  return (
    <div className="mb-8 md:mb-10 relative z-20">
      <div className="flex items-center justify-between gap-2 mb-4 px-1">
        <div className="flex items-center gap-2">
          <CalendarRange size={16} className="text-brand-gold" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Разгледай по месеци</span>
        </div>
        {/* Стрелки за скрол — само desktop/mouse, на мобилно жестът за swipe е естествен */}
        <div className="hidden md:flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollByAmount(-1)}
            aria-label="Предишни месеци"
            className="w-8 h-8 rounded-full border border-gray-200 text-gray-400 flex items-center justify-center hover:border-brand-gold hover:text-brand-gold active:scale-90 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount(1)}
            aria-label="Следващи месеци"
            className="w-8 h-8 rounded-full border border-gray-200 text-gray-400 flex items-center justify-center hover:border-brand-gold hover:text-brand-gold active:scale-90 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* px-3 (вместо px-1) дава реален хоризонтален буфер — без него scale трансформацията на първата/последната карта
          (които нямат съсед от тази страна) може да се реже от overflow-x-auto. */}
      <div ref={scrollerRef} className="snap-carousel flex items-stretch gap-3 overflow-x-auto pt-1 pb-3 -mx-1 px-3 scrollbar-hide">
        {months.map((m, idx) => {
          const isSelected = activeMonth === m.value;
          const isEmpty = m.count === 0;

          return (
            <React.Fragment key={m.value}>
              {/* Годишен разделител — показва се пред първия месец от всяка нова година */}
              {m.isFirstOfYear && (
                <div className="shrink-0 flex flex-col items-center gap-1.5 py-1">
                  <span className="text-[10px] font-black text-gray-400 tracking-wide whitespace-nowrap">{m.year}</span>
                  <div className="w-px flex-1 bg-gray-200 rounded-full min-h-[50px]" />
                </div>
              )}

              <button
                ref={(el) => { cardRefs.current[m.value] = el; }}
                onClick={() => !isEmpty && onSelectMonth(isSelected ? '' : m.value)}
                disabled={isEmpty}
                className={`relative overflow-hidden shrink-0 w-[150px] text-left p-5 rounded-[1.75rem] border transition-all duration-300 active:scale-95 ${
                  isSelected
                    ? 'bg-gradient-to-br from-brand-dark to-[#1a2540] border-brand-gold text-white shadow-xl scale-[1.04] ring-2 ring-brand-gold/40 ring-offset-2'
                    : isEmpty
                    ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-br from-white to-brand-gold/[0.05] border-gray-200 hover:border-brand-gold/50 hover:shadow-lg hover:-translate-y-0.5'
                }`}
              >
                {/* Златна лента отгоре — само когато месецът е избран, добавя малко визуално "тегло" без да е само рамка */}
                {isSelected && (
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-gold via-amber-300 to-brand-gold" />
                )}
                <div className="flex items-center justify-between mb-2.5">
                  <span className={`font-serif italic text-xl ${isSelected ? 'text-brand-gold' : 'text-brand-dark'}`}>
                    {m.label}
                  </span>
                  {idx === 0 && !isEmpty && (
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full shrink-0 ${
                      isSelected ? 'bg-brand-gold text-brand-dark' : 'bg-brand-gold/10 text-brand-gold'
                    }`}>
                      Скоро
                    </span>
                  )}
                </div>

                {/* Малка златна разделителна линия между заглавието и броя — добавя визуална структура вместо просто стек текст */}
                <div className={`h-px w-8 mb-2.5 ${isSelected ? 'bg-brand-gold/40' : isEmpty ? 'bg-gray-200' : 'bg-brand-gold/25'}`} />

                <p className={`text-xs font-bold mb-1.5 ${
                  isSelected ? 'text-white/90' : isEmpty ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {isEmpty ? 'Няма дати' : `${m.count} ${m.count === 1 ? 'екскурзия' : 'екскурзии'}`}
                </p>

                {!isEmpty && m.countries.length > 0 && (
                  <p className={`text-[10px] leading-snug ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                    {m.countries.slice(0, 2).join(', ')}
                    {m.countries.length > 2 ? ` +${m.countries.length - 2}` : ''}
                  </p>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
