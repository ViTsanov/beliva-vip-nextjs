"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Star, Palmtree, Check } from 'lucide-react';
import { BLUR_PLACEHOLDER } from '@/lib/blurPlaceholder';

interface ContinentTile {
  name: string;
  slug: string;
  count: number;
  img: string;
}

interface CountryOption {
  name: string;
  slug: string;
  count: number;
}

interface QuickFiltersProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (slug: string) => void;
  slugify: (text: string) => string;
  continents: ContinentTile[];
  activeContinent: string;
  onSelectContinent: (slug: string) => void;
  countries: CountryOption[]; // празен арай, ако няма избран континент — редицата се показва само тогава
  activeCountry: string;
  onSelectCountry: (slug: string) => void;
  scopedMonthLabel?: string; // ако е избран месец — бележка, че изборът по-долу е само за него
}

// Един вид за всички чипове: бял с рамка; избраният — тъмносин с ✓. Поли и Турция имат само иконка отпред.
const chipBase =
  'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark';
const chipIdle = 'border-slate-200 bg-white text-brand-dark hover:border-brand-dark';
const chipSelected = 'border-brand-dark bg-brand-dark text-white';

const headingClass = 'mb-3 text-[15px] font-semibold text-brand-dark';

export default function QuickFilters({
  categories, activeCategory, onSelectCategory, slugify,
  continents, activeContinent, onSelectContinent,
  countries, activeCountry, onSelectCountry,
  scopedMonthLabel,
}: QuickFiltersProps) {
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  if (categories.length === 0 && continents.length === 0) return null;

  return (
    <div className="space-y-8">

      {scopedMonthLabel && (
        <p className="rounded-xl bg-brand-mist px-4 py-3 text-[13px] text-slate-600">
          Показваме само екскурзиите с отпътуване през <span className="font-semibold text-brand-dark">{scopedMonthLabel}</span>.
        </p>
      )}

      {/* Категории — бързи чипове */}
      {categories.length > 0 && (
        <section aria-labelledby="filters-category-heading">
          <h3 id="filters-category-heading" className={headingClass}>Вид пътуване</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => {
              const isPoli = cat === 'Водена от ПОЛИ';
              const isTurkey = cat === 'Почивка в Турция';
              const isSelected = activeCategory === slugify(cat);

              return (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectCategory(isSelected ? '' : slugify(cat))}
                  className={`${chipBase} ${isSelected ? chipSelected : isPoli ? 'border-brand-gold bg-brand-gold/10 text-brand-dark hover:border-brand-dark' : chipIdle}`}
                >
                  {isSelected ? (
                    <Check size={15} strokeWidth={3} className="text-brand-gold" aria-hidden="true" />
                  ) : isPoli ? (
                    <Star size={14} fill="currentColor" className="text-brand-goldDeep" aria-hidden="true" />
                  ) : isTurkey ? (
                    <Palmtree size={14} className="text-rose-600" aria-hidden="true" />
                  ) : null}
                  {cat}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Континенти — визуален избор със снимки. На мобилно: фиксирана ширина + хоризонтален скрол/swipe;
          от md — три равни колони без скрол. */}
      {continents.length > 0 && (
        <section aria-labelledby="filters-continent-heading">
          <h3 id="filters-continent-heading" className={headingClass}>Къде</h3>
          {/* p-1 / -m-1: място за рамката на избраната плочка, за да не се реже от overflow-x-auto */}
          <div className="snap-carousel -m-1 flex gap-3 overflow-x-auto p-1 scrollbar-hide md:grid md:grid-cols-3 md:gap-4 md:overflow-visible">
            {continents.map(c => {
              const isSelected = activeContinent === c.slug;
              const hasError = imgErrors[c.slug];
              return (
                <button
                  key={c.slug}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectContinent(isSelected ? '' : c.slug)}
                  className={`group relative h-[100px] w-[150px] shrink-0 overflow-hidden rounded-2xl transition-shadow duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark md:h-[140px] md:w-full ${
                    isSelected ? 'ring-[3px] ring-brand-dark' : ''
                  }`}
                >
                  {c.img && !hasError ? (
                    <Image
                      src={c.img}
                      alt=""
                      fill
                      placeholder="blur"
                      blurDataURL={BLUR_PLACEHOLDER}
                      sizes="(max-width: 768px) 150px, 20vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={() => setImgErrors(prev => ({ ...prev, [c.slug]: true }))}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-brand-dark" />
                  )}
                  <div className={`absolute inset-0 transition-colors ${isSelected ? 'bg-brand-dark/55' : 'bg-black/35 group-hover:bg-black/45'}`} />
                  {isSelected && (
                    <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand-gold text-brand-dark" aria-hidden="true">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
                    <span className="font-serif text-base italic leading-tight text-white drop-shadow-md md:text-lg">{c.name}</span>
                    <span className="mt-0.5 text-[11px] font-semibold text-white/85">
                      {c.count} {c.count === 1 ? 'екскурзия' : 'екскурзии'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Държави в рамките на избрания континент — появява се САМО ако има избран континент. Чипове, не снимки —
          второ ниво на стесняване, затова с по-малка визуална тежест. */}
      {countries.length > 0 && (
        <section aria-labelledby="filters-country-heading" className="animate-in fade-in slide-in-from-top-2 duration-300">
          <h3 id="filters-country-heading" className={headingClass}>Държава</h3>
          <div className="flex flex-wrap gap-2">
            {countries.map(c => {
              const isSelected = activeCountry === c.slug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectCountry(isSelected ? '' : c.slug)}
                  className={`${chipBase} ${isSelected ? chipSelected : chipIdle}`}
                >
                  {isSelected && <Check size={15} strokeWidth={3} className="text-brand-gold" aria-hidden="true" />}
                  {c.name}
                  <span className={isSelected ? 'text-white/60' : 'text-slate-400'}>{c.count}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
