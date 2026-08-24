"use client";

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Star, Palmtree, ChevronLeft, ChevronRight } from 'lucide-react';
import { BLUR_PLACEHOLDER } from '@/lib/blurPlaceholder';

interface ContinentTile {
  name: string;
  slug: string;
  count: number;
  img: string;
}

interface QuickFiltersProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (slug: string) => void;
  slugify: (text: string) => string;
  continents: ContinentTile[];
  activeContinent: string;
  onSelectContinent: (slug: string) => void;
  scopedMonthLabel?: string; // ако е избран месец, показваме "Налични за месец X" над чиповете
}

export default function QuickFilters({
  categories, activeCategory, onSelectCategory, slugify,
  continents, activeContinent, onSelectContinent, scopedMonthLabel,
}: QuickFiltersProps) {
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const continentScrollerRef = useRef<HTMLDivElement>(null);

  const scrollContinents = (dir: 1 | -1) => {
    continentScrollerRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  if (categories.length === 0 && continents.length === 0) return null;

  return (
    <div className="mb-8 md:mb-10 space-y-4">

      {scopedMonthLabel && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-gold">
            Налични за месец {scopedMonthLabel}
          </span>
        </div>
      )}

      <div className="space-y-6">

      {/* Категории — бързи чипове */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => {
            const isPoli = cat === 'Водена от ПОЛИ';
            const isTurkey = cat === 'Почивка в Турция';
            const isSelected = activeCategory === slugify(cat);

            let btnClass = 'bg-white text-gray-500 border-gray-100 hover:border-brand-gold/50 hover:text-brand-gold hover:bg-brand-gold/5';
            if (isSelected) {
              btnClass = isTurkey
                ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white border-rose-500 shadow-lg shadow-rose-500/30 transform scale-105'
                : 'bg-gradient-to-r from-brand-gold to-[#d4af37] text-white border-brand-gold shadow-lg shadow-brand-gold/20 transform scale-105';
            } else if (isPoli) {
              btnClass = 'bg-gradient-to-r from-brand-gold/10 to-transparent text-brand-gold border-brand-gold/50 shadow-sm hover:bg-brand-gold hover:text-white';
            } else if (isTurkey) {
              btnClass = 'bg-gradient-to-r from-rose-50 to-transparent text-rose-600 border-rose-200 shadow-sm hover:bg-rose-500 hover:text-white';
            }

            return (
              <button
                key={cat}
                onClick={() => onSelectCategory(isSelected ? '' : slugify(cat))}
                className={`relative px-4 py-3 min-h-[44px] rounded-xl text-xs font-black uppercase transition-all duration-300 border active:scale-95 ${btnClass}`}
              >
                {isPoli && <div className="absolute -top-1.5 -left-1.5 text-brand-gold bg-white rounded-full p-0.5 border border-brand-gold shadow-sm z-10"><Star size={10} fill="currentColor" /></div>}
                {isTurkey && <div className="absolute -top-1.5 -left-1.5 text-rose-600 bg-white rounded-full p-0.5 border border-rose-200 shadow-sm z-10"><Palmtree size={10} /></div>}
                <div className="flex items-center gap-1.5">
                  {isSelected && <span>✓</span>}
                  {cat}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Континенти — визуален избор със снимки */}
      {continents.length > 0 && (
        <div className="relative">
        {/* Стрелки за скрол — само desktop/mouse, на мобилно жестът за swipe е естествен */}
        {continents.length > 4 && (
          <div className="hidden md:flex items-center gap-2 absolute -top-9 right-0">
            <button
              type="button"
              onClick={() => scrollContinents(-1)}
              aria-label="Предишни континенти"
              className="w-8 h-8 rounded-full border border-gray-200 text-gray-400 flex items-center justify-center hover:border-brand-gold hover:text-brand-gold active:scale-90 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => scrollContinents(1)}
              aria-label="Следващи континенти"
              className="w-8 h-8 rounded-full border border-gray-200 text-gray-400 flex items-center justify-center hover:border-brand-gold hover:text-brand-gold active:scale-90 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
        {/* pt-2/pb-3 дават резервно място за ring-а и scale трансформацията при избран елемент —
        без тях overflow-x-auto кара браузъра имплицитно да отреже overflow-y и златният border отгоре се реже.
        px-3 (вместо px-1) дава реален хоризонтален буфер (нетно ~8px след -mx-1) — без него ring-ът на
        първата/последната плочка (които нямат съсед от тази страна, от който да вземе място) се реже. */}
        <div ref={continentScrollerRef} className="snap-carousel flex gap-3 overflow-x-auto pt-2 pb-3 -mx-1 px-3 scrollbar-hide">
          {continents.map(c => {
            const isSelected = activeContinent === c.slug;
            const hasError = imgErrors[c.slug];
            return (
              <button
                key={c.slug}
                onClick={() => onSelectContinent(isSelected ? '' : c.slug)}
                className={`relative shrink-0 w-[150px] h-[100px] rounded-2xl overflow-hidden group transition-all duration-200 active:scale-95 ${
                  isSelected
                    ? 'ring-[3px] ring-brand-gold scale-[1.05] shadow-[0_8px_24px_rgba(197,163,93,0.45)]'
                    : 'hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                {c.img && !hasError ? (
                  <Image
                    src={c.img}
                    alt={`Екскурзии до ${c.name}`}
                    fill
                    placeholder="blur"
                    blurDataURL={BLUR_PLACEHOLDER}
                    sizes="150px"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={() => setImgErrors(prev => ({ ...prev, [c.slug]: true }))}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-dark to-brand-dark/60" />
                )}
                {/* При избор — топъл златен воал върху снимката, вместо просто затъмняване — по-видимо състояние */}
                <div className={`absolute inset-0 transition-colors ${
                  isSelected
                    ? 'bg-gradient-to-t from-brand-gold/70 via-brand-gold/35 to-brand-gold/15'
                    : 'bg-black/35 group-hover:bg-black/45'
                }`} />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                  <span className="font-serif italic text-white text-base leading-tight drop-shadow-md">{c.name}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/80 mt-0.5">
                    {c.count} {c.count === 1 ? 'екскурзия' : 'екскурзии'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        </div>
      )}
      </div>
    </div>
  );
}
