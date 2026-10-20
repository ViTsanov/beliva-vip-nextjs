"use client";

import React, { useEffect, useRef, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, Check } from 'lucide-react';

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

// Месеците като ред от карти: налични — бели с рамка; без дати — сиви и неактивни; избраният — тъмносин с ✓.
// Едно състояние = един вид, без допълнителни цветове (зелено/червено) и мащабиране.
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

  // Лента за превъртане под месеците. Нарисувана е сами, защото на iPhone браузърът не показва лента на
  // хоризонтален скрол (и не приема стилове за нея). size = видимата част, pos = докъде е превъртяно (0…1).
  const [bar, setBar] = useState({ size: 1, pos: 0 });
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setBar({ size: el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1, pos: max > 0 ? el.scrollLeft / max : 0 });
    };
    const first = setTimeout(update, 0);
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      clearTimeout(first);
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [months.length]);

  // Влачене на лентата (и докосване по нея — плъзгачът отива там). Докато се влачи, „залепването“ към карта е
  // изключено, иначе редът подскача на всяка стъпка.
  const dragRef = useRef<{ x: number; left: number } | null>(null);
  const onBarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const thumbW = rect.width * bar.size;
    const thumbLeft = rect.left + bar.pos * (rect.width - thumbW);
    el.style.scrollSnapType = 'none';
    if (e.clientX < thumbLeft || e.clientX > thumbLeft + thumbW) {
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left - thumbW / 2) / (rect.width - thumbW)));
      el.scrollLeft = ratio * (el.scrollWidth - el.clientWidth);
    }
    dragRef.current = { x: e.clientX, left: el.scrollLeft };
  };
  const onBarPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    const drag = dragRef.current;
    if (!el || !drag) return;
    const rect = e.currentTarget.getBoundingClientRect();
    el.scrollLeft = drag.left + (e.clientX - drag.x) * (el.scrollWidth / rect.width);
  };
  const onBarPointerEnd = () => {
    dragRef.current = null;
    if (scrollerRef.current) scrollerRef.current.style.scrollSnapType = '';
  };

  // Ако в текущия филтърен контекст няма никакви бъдещи заминавания — не показваме календара
  const hasAny = months.some(m => m.count > 0);
  if (!hasAny) return null;

  const arrowClass =
    'flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-brand-dark transition-colors hover:border-brand-dark hover:bg-brand-dark hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark';

  return (
    <section className="relative z-20" aria-labelledby="filters-months-heading">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 id="filters-months-heading" className="flex items-center gap-2 text-[15px] font-semibold text-brand-dark">
          <CalendarRange size={17} className="text-brand-goldDeep" aria-hidden="true" />
          Кога искате да пътувате
        </h3>
        {/* Стрелки за скрол — само desktop/mouse, на мобилно жестът за swipe е естествен */}
        <div className="hidden items-center gap-2 md:flex">
          <button type="button" onClick={() => scrollByAmount(-1)} aria-label="Предишни месеци" className={arrowClass}>
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => scrollByAmount(1)} aria-label="Следващи месеци" className={arrowClass}>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* pt/px дават място за рамката на фокуса, за да не се реже от overflow-x-auto */}
      <div ref={scrollerRef} className="snap-carousel -mx-1 flex items-stretch gap-2.5 overflow-x-auto px-1 pb-2 pt-1 scrollbar-hide">
        {months.map((m, idx) => {
          const isSelected = activeMonth === m.value;
          const isEmpty = m.count === 0;

          return (
            <React.Fragment key={m.value}>
              {/* Годишен разделител — показва се пред първия месец от всяка нова година */}
              {m.isFirstOfYear && (
                <div className="flex shrink-0 flex-col items-center gap-1.5 py-1" aria-hidden="true">
                  <span className="whitespace-nowrap text-[11px] font-bold text-slate-500">{m.year}</span>
                  <div className="min-h-[50px] w-px flex-1 rounded-full bg-slate-200" />
                </div>
              )}

              <button
                ref={(el) => { cardRefs.current[m.value] = el; }}
                type="button"
                onClick={() => !isEmpty && onSelectMonth(isSelected ? '' : m.value)}
                disabled={isEmpty}
                aria-pressed={isSelected}
                aria-label={`${m.label} ${m.year}: ${isEmpty ? 'няма дати' : `${m.count} ${m.count === 1 ? 'екскурзия' : 'екскурзии'}`}`}
                className={`relative w-[136px] shrink-0 rounded-2xl border p-4 text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark ${
                  isSelected
                    ? 'border-brand-dark bg-brand-dark text-white'
                    : isEmpty
                    ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
                    : 'border-slate-200 bg-white text-brand-dark hover:border-brand-dark'
                }`}
              >
                {isSelected && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-gold text-brand-dark" aria-hidden="true">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
                {idx === 0 && !isEmpty && (
                  <span className={`mb-1.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isSelected ? 'bg-white/15 text-white' : 'bg-brand-mist text-brand-dark'}`}>
                    Скоро
                  </span>
                )}
                <span className={`block pr-5 font-serif text-xl italic leading-tight ${isSelected ? 'text-brand-gold' : ''}`}>
                  {m.label}
                </span>
                <span className={`mt-2 block text-[13px] font-semibold ${isSelected ? 'text-white' : isEmpty ? '' : 'text-brand-dark'}`}>
                  {isEmpty ? 'Няма дати' : `${m.count} ${m.count === 1 ? 'екскурзия' : 'екскурзии'}`}
                </span>
                {!isEmpty && m.countries.length > 0 && (
                  <span className={`mt-1 block text-[11px] leading-snug ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                    {m.countries.slice(0, 2).join(', ')}
                    {m.countries.length > 2 ? ` +${m.countries.length - 2}` : ''}
                  </span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Лентата за превъртане — само когато месеците не се побират. Висока зона за докосване, тънка на вид. */}
      {bar.size < 0.995 && (
        <div
          className="-my-1 cursor-pointer touch-none select-none py-2"
          onPointerDown={onBarPointerDown}
          onPointerMove={onBarPointerMove}
          onPointerUp={onBarPointerEnd}
          onPointerCancel={onBarPointerEnd}
          aria-hidden="true"
        >
          <div className="relative h-1.5 rounded-full bg-slate-200">
            <div
              className="absolute inset-y-0 rounded-full bg-brand-gold"
              style={{ width: `${bar.size * 100}%`, left: `${bar.pos * (1 - bar.size) * 100}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
