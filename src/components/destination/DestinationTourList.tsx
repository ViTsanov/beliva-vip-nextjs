"use client";

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Heart, MapPin } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';
import { useFavoriteTours, type FavoriteTour } from '@/lib/favoriteTours';
import { openDestinationInquiry } from './DestinationInquiry';

// Една оферта от страницата на държавата — само полетата, които редът показва (без програмата и т.н.,
// за да не се праща целият тур към браузъра).
export interface DestinationTourRow {
  id: string;
  href: string;
  inquirySlug: string;
  title: string;
  img: string | null;
  imgPosition?: string;
  countries: string[];
  category: string | null;
  poli: boolean;
  best: boolean;
  price: string | null;
  oldPrice: string | null;
  date: { day: string; month: string; year: string } | null;
  moreDates: number;
  status: { label: string; tone: 'gold' | 'green' | 'red' | 'grey' } | null;
  favorite: FavoriteTour;
}

type FilterKey = 'all' | 'poli' | 'single' | 'combo';

const TESTS: Record<FilterKey, (t: DestinationTourRow) => boolean> = {
  all: () => true,
  poli: (t) => t.poli,
  single: (t) => t.countries.length <= 1,
  combo: (t) => t.countries.length > 1,
};

const STATUS_TONE: Record<NonNullable<DestinationTourRow['status']>['tone'], { chip: string; dot: string }> = {
  gold: { chip: 'bg-[#f4ecd2] text-[#5c470a]', dot: 'bg-[#b8921f]' },
  green: { chip: 'bg-[#e7f0ea] text-[#1f5133]', dot: 'bg-[#2f7a4c]' },
  red: { chip: 'bg-rose-50 text-rose-800', dot: 'bg-rose-600' },
  grey: { chip: 'bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
};

const focusRing = 'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-brand-gold';

export default function DestinationTourList({ tours, countryName }: { tours: DestinationTourRow[]; countryName: string }) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const { isFavorite, toggle } = useFavoriteTours();

  const filters = useMemo(() => {
    const labels: [FilterKey, string][] = [['all', 'Всички'], ['poli', 'С Поли'], ['single', `Само ${countryName}`], ['combo', 'Комбинирани']];
    return labels
      .map(([key, label]) => ({ key, label, count: tours.filter(TESTS[key]).length }))
      // Филтър без оферти не се показва; ако всички оферти попадат в един и същ филтър — няма какво да се избира
      .filter((f) => f.key === 'all' || (f.count > 0 && f.count < tours.length));
  }, [tours, countryName]);

  const shown = tours.filter(TESTS[filter]);

  return (
    <>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-7">
        <div>
          <p className="mb-3.5 flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.22em] text-brand-goldDeep">
            <span aria-hidden="true" className="h-px w-9 bg-brand-goldDeep" />
            Избрани оферти
          </p>
          <h2 id="oferti-title" className="font-serif text-[clamp(36px,4.4vw,56px)] font-medium leading-[1.05] tracking-[-0.015em] text-brand-dark">
            Екскурзии до <em className="italic text-brand-goldDeep">{countryName}</em>
          </h2>
          <p className="mt-3.5 text-[15px] text-slate-600" aria-live="polite">
            Подредени по следваща дата · показани {shown.length} от {tours.length}
          </p>
        </div>
        {filters.length > 1 && (
          <div role="group" aria-label="Филтър на офертите" className="flex flex-wrap gap-2">
            {filters.map((f) => {
              const on = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(f.key)}
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-[18px] text-sm font-semibold transition-colors ${focusRing} ${
                    on ? 'border-brand-dark bg-brand-dark text-white' : 'border-brand-dark/20 text-brand-dark hover:border-brand-dark'
                  }`}
                >
                  {f.label}
                  <span className={`font-display text-xs ${on ? 'text-brand-gold' : 'text-brand-goldDeep'}`}>{f.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ul className="flex flex-col gap-5">
        {shown.map((t, i) => {
          const fav = isFavorite(t.favorite.id);
          const tone = t.status ? STATUS_TONE[t.status.tone] : null;
          return (
            <li key={`${filter}-${t.id}`}>
              <Reveal delay={Math.min(i, 4) * 0.06} y={20}>
                <article
                  className={`group grid grid-cols-1 overflow-hidden rounded-[28px] bg-[#fffdf8] shadow-[0_1px_0_rgba(15,23,42,0.04),0_18px_40px_-28px_rgba(15,23,42,0.35)] min-[721px]:grid-cols-[120px_260px_minmax(0,1fr)] min-[1081px]:grid-cols-[136px_300px_minmax(0,1fr)_236px] ${
                    t.poli ? 'border-2 border-brand-gold' : 'border border-brand-dark/10'
                  }`}
                >
                  {/* Отрязък на билета: датата на заминаване */}
                  <div
                    className={`flex items-center gap-3.5 border-b-2 border-dashed border-brand-dark/[0.18] px-5 py-4 min-[721px]:flex-col min-[721px]:justify-center min-[721px]:gap-0 min-[721px]:border-b-0 min-[721px]:border-r-2 min-[721px]:px-4 min-[721px]:py-6 min-[721px]:text-center ${
                      t.poli ? 'bg-[#fbf3da]' : 'bg-[#fffdf8]'
                    }`}
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 max-[720px]:sr-only">Заминаване</span>
                    {t.date ? (
                      <>
                        <span className="font-display text-[44px] font-bold leading-none tracking-[-0.03em] text-brand-dark min-[721px]:mt-1.5 min-[721px]:text-[52px]">{t.date.day}</span>
                        <span className="flex flex-col gap-0.5 min-[721px]:mt-2 min-[721px]:items-center">
                          <span className="text-[15px] font-semibold text-brand-dark">{t.date.month}</span>
                          <span className="text-[13px] text-slate-600">{t.date.year}</span>
                        </span>
                        {t.moreDates > 0 && (
                          <span className="ml-auto rounded-full bg-brand-dark/5 px-2.5 py-1 text-xs font-semibold text-slate-700 min-[721px]:ml-0 min-[721px]:mt-3">
                            + още {t.moreDates} {t.moreDates === 1 ? 'дата' : 'дати'}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[15px] font-semibold text-brand-dark min-[721px]:mt-2">По запитване</span>
                    )}
                  </div>

                  <div className="relative min-h-[220px] overflow-hidden bg-slate-800 min-[721px]:min-h-[270px]">
                    {t.img ? (
                      <Image
                        src={t.img}
                        alt={t.title}
                        fill
                        sizes="(max-width: 720px) 100vw, 300px"
                        className="object-cover transition-transform duration-700 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-105"
                        style={t.imgPosition ? { objectPosition: t.imgPosition } : undefined}
                      />
                    ) : (
                      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-brand-dark to-slate-600" />
                    )}
                    <button
                      type="button"
                      onClick={() => toggle(t.favorite)}
                      aria-pressed={fav}
                      aria-label={fav ? `Премахни „${t.title}“ от любими` : `Добави „${t.title}“ в любими`}
                      className={`absolute right-3.5 top-3.5 z-[2] inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-brand-dark transition-transform hover:scale-105 ${focusRing}`}
                    >
                      <Heart size={19} aria-hidden="true" className={fav ? 'fill-rose-600 text-rose-600' : ''} />
                    </button>
                    {t.poli && (
                      <span className="absolute bottom-3.5 left-3.5 inline-flex items-center gap-2 rounded-full bg-brand-dark py-[7px] pl-[7px] pr-3 text-[13px] font-semibold text-white">
                        <span aria-hidden="true" className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-gold font-serif text-sm font-semibold text-brand-dark">П</span>
                        Водена от Поли
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-col justify-center gap-3.5 px-6 py-6 sm:px-8 sm:py-7">
                    <div className="flex flex-wrap gap-2">
                      {t.status && tone && (
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold ${tone.chip}`}>
                          <span aria-hidden="true" className={`h-[7px] w-[7px] rounded-full ${tone.dot}`} />
                          {t.status.label}
                        </span>
                      )}
                      {t.category && (
                        <span className="inline-flex items-center rounded-full border border-brand-dark/15 px-3 py-1.5 text-[13px] font-semibold text-slate-700">{t.category}</span>
                      )}
                      {t.best && (
                        <span className="inline-flex items-center rounded-full bg-[#e7f0ea] px-3 py-1.5 text-[13px] font-semibold text-[#1f5133]">Най-изгодна</span>
                      )}
                    </div>
                    <h3 className="font-serif text-[23px] font-medium leading-[1.2] tracking-[-0.01em] text-brand-dark [text-wrap:pretty] sm:text-[27px]">
                      <Link href={t.href} className={`rounded-sm transition-colors hover:text-brand-goldDeep ${focusRing}`}>{t.title}</Link>
                    </h3>
                    <p className="flex items-center gap-2 text-[15px] font-semibold text-brand-goldDeep">
                      <MapPin size={16} aria-hidden="true" className="shrink-0" />
                      {t.countries.join(' · ')}
                    </p>
                  </div>

                  <div className="col-span-full flex flex-col items-stretch gap-4 border-t border-brand-dark/10 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7 min-[1081px]:col-span-1 min-[1081px]:flex-col min-[1081px]:items-start min-[1081px]:justify-center min-[1081px]:border-l min-[1081px]:border-t-0">
                    <div>
                      <p className="text-[13px] text-slate-600">Цена от</p>
                      {t.price ? (
                        <p className="mt-1 whitespace-nowrap font-display text-[30px] font-bold tracking-[-0.02em] text-brand-dark">{t.price}</p>
                      ) : (
                        <p className="mt-1 text-lg font-semibold text-brand-dark">По запитване</p>
                      )}
                      <p className="mt-1 text-[13px] text-slate-600">
                        {t.oldPrice ? <><s className="mr-1.5">{t.oldPrice}</s>на човек</> : 'на човек'}
                      </p>
                    </div>
                    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:max-w-[220px] sm:flex-col min-[1081px]:w-full">
                      <Link
                        href={t.href}
                        className={`inline-flex min-h-[48px] items-center justify-center gap-2 whitespace-nowrap rounded-full bg-brand-dark px-[18px] text-sm font-semibold text-white transition-colors hover:bg-slate-800 ${focusRing}`}
                      >
                        Виж програмата
                        <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => openDestinationInquiry(t.inquirySlug)}
                        className={`inline-flex min-h-[44px] items-center justify-center rounded-full border border-brand-dark/20 px-[18px] text-sm font-semibold text-brand-dark transition-colors hover:border-brand-dark ${focusRing}`}
                      >
                        Запитване
                      </button>
                    </div>
                  </div>
                </article>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </>
  );
}
