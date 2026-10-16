"use client";

import { useMemo, useState } from 'react';
import { Check, MapPin, Search, X } from 'lucide-react';
import { formatPrice } from '@/lib/formatPrice';

// Избор на екскурзия без да се знае заглавието ѝ: по дестинация (чипове с броя турове), с търсене по държава,
// град или част от името, и списък с карти (снимка, държава, следваща дата, цена).
// Ползва се във формата за запитване (сайта) и в админ модалите (ново пътуване на клиент, запис от телефон,
// корекция на запитване).

export interface PickerTour {
  id: string;
  title: string;
  country?: string | string[];
  img?: string;
  dates?: string[];
  historicalDates?: string[];
  price?: string;
  status?: string;
}

// Изборът: общо запитване, само дестинация (още без конкретен тур) или конкретна екскурзия
// (по желание с дата — избрана директно от датите в реда на тура).
export type TourChoice =
  | { kind: 'general' }
  | { kind: 'destination'; country: string }
  | { kind: 'tour'; tourId: string; date?: string };

interface TourPickerProps {
  tours: PickerTour[];
  value: TourChoice;
  onChange: (value: TourChoice) => void;
  // Може ли да се остави „Общо запитване“ (без дестинация и без тур).
  allowGeneral?: boolean;
  // Може ли да се избере само дестинация, без конкретен тур (за запитвания).
  allowDestination?: boolean;
  // Филтър по месец на отпътуване — в админа (вкл. минали дати от historicalDates).
  showMonthFilter?: boolean;
  label?: string;
}

const MONTHS = ['Яну', 'Фев', 'Мар', 'Апр', 'Май', 'Юни', 'Юли', 'Авг', 'Сеп', 'Окт', 'Ное', 'Дек'];
const VISIBLE_COUNTRIES = 8;

// Държавите на тура като масив — полето е или масив, или низ (понякога „Япония, Южна Корея“).
export function tourCountries(t: PickerTour): string[] {
  const raw = Array.isArray(t.country) ? t.country : t.country ? [t.country] : [];
  return raw.flatMap(c => String(c).split(',')).map(c => c.trim()).filter(Boolean);
}

const norm = (s: string) => s.toLocaleLowerCase('bg').trim();
const isoDay = (d: string) => String(d).slice(0, 10);
const displayDate = (iso: string) => iso.split('-').reverse().join('.');
// Всички дати на тура (в админа — и миналите от historicalDates), без повторения, подредени.
const datesOf = (t: PickerTour, includeHistorical: boolean) =>
  [...new Set([...(t.dates || []), ...(includeHistorical ? t.historicalDates || [] : [])].map(isoDay))].sort();

export default function TourPicker({
  tours, value, onChange, allowGeneral = true, allowDestination = true, showMonthFilter = false, label = 'Какво ви интересува?',
}: TourPickerProps) {
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState(value.kind === 'destination' ? value.country : '');
  const [month, setMonth] = useState<number | null>(null);
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [changing, setChanging] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Държави с брой турове, най-честите първи.
  const countries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tours) for (const c of tourCountries(t)) counts.set(c, (counts.get(c) || 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'bg'))
      .map(([name, count]) => ({ name, count }));
  }, [tours]);

  const filtered = useMemo(() => {
    const q = norm(search);
    return tours.filter(t => {
      const cs = tourCountries(t);
      if (countryFilter && !cs.includes(countryFilter)) return false;
      if (q && !norm(t.title).includes(q) && !cs.some(c => norm(c).includes(q))) return false;
      if (month !== null && !datesOf(t, showMonthFilter).some(d => Number(d.slice(5, 7)) === month + 1)) return false;
      return true;
    });
  }, [tours, search, countryFilter, month, showMonthFilter]);

  const selectedTour = value.kind === 'tour' ? tours.find(t => t.id === value.tourId) : undefined;

  const pickCountry = (name: string) => {
    if (countryFilter === name) {
      setCountryFilter('');
      if (value.kind === 'destination') onChange(allowGeneral ? { kind: 'general' } : value);
      return;
    }
    setCountryFilter(name);
    setSearch('');
    if (allowDestination && value.kind !== 'tour') onChange({ kind: 'destination', country: name });
  };

  const pickTour = (t: PickerTour, date?: string) => {
    onChange({ kind: 'tour', tourId: t.id, ...(date ? { date } : {}) });
    setChanging(false);
  };

  // Датите, които показваме в реда на тура: на сайта — само предстоящите; в админа (showMonthFilter) — всички,
  // включително минали (за записване на вече проведено пътуване).
  const shownDates = (t: PickerTour) => {
    const ds = datesOf(t, showMonthFilter);
    return showMonthFilter ? ds : ds.filter(d => d >= today);
  };

  // Избрана екскурзия — показваме я като карта с „Смени“, вместо целия списък.
  if (selectedTour && !changing) {
    return (
      <div>
        <p className="mb-1.5 text-[13px] font-semibold text-brand-dark">{label}</p>
        <div className="flex items-center gap-3 rounded-2xl border-2 border-brand-dark bg-white p-3">
          <TourThumb tour={selectedTour} />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-brand-dark">{selectedTour.title}</p>
            <p className="mt-0.5 truncate text-[12px] text-slate-500">
              {tourCountries(selectedTour).join(', ')}
              {value.kind === 'tour' && value.date && (
                <> · <span className="font-semibold text-brand-dark">{displayDate(value.date)}</span></>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setChanging(true)}
            className="shrink-0 rounded-full border border-slate-300 px-3 py-2 text-[13px] font-semibold text-brand-dark transition-colors hover:border-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
          >
            Смени
          </button>
        </div>
      </div>
    );
  }

  const visibleCountries = showAllCountries ? countries : countries.slice(0, VISIBLE_COUNTRIES);
  const chip = (active: boolean) =>
    `inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark ${
      active ? 'border-brand-dark bg-brand-dark text-white' : 'border-slate-200 bg-white text-brand-dark hover:border-brand-dark'
    }`;

  return (
    <div>
      <p className="mb-1.5 text-[13px] font-semibold text-brand-dark">{label}</p>

      {/* Общо запитване — за тези, които още не знаят къде */}
      {allowGeneral && (
        <button
          type="button"
          aria-pressed={value.kind === 'general'}
          onClick={() => { onChange({ kind: 'general' }); setCountryFilter(''); setSearch(''); setMonth(null); }}
          className={`mb-3 ${chip(value.kind === 'general')}`}
        >
          {value.kind === 'general' && <Check size={14} strokeWidth={3} className="text-brand-gold" aria-hidden="true" />}
          Още не знам — общо запитване
        </button>
      )}

      {/* Дестинации */}
      <p className="mb-2 text-[12px] text-slate-500">Изберете дестинация</p>
      <div className="flex flex-wrap gap-2">
        {visibleCountries.map(c => {
          const active = countryFilter === c.name;
          return (
            <button key={c.name} type="button" aria-pressed={active} onClick={() => pickCountry(c.name)} className={chip(active)}>
              {active && <Check size={14} strokeWidth={3} className="text-brand-gold" aria-hidden="true" />}
              {c.name}
              <span className={active ? 'text-white/60' : 'text-slate-400'}>{c.count}</span>
            </button>
          );
        })}
        {countries.length > VISIBLE_COUNTRIES && (
          <button
            type="button"
            onClick={() => setShowAllCountries(v => !v)}
            className="inline-flex min-h-10 items-center px-2 text-[13px] font-semibold text-brand-dark underline decoration-slate-300 decoration-2 underline-offset-4 hover:decoration-brand-dark"
          >
            {showAllCountries ? 'По-малко' : `Още ${countries.length - VISIBLE_COUNTRIES}`}
          </button>
        )}
      </div>

      {showMonthFilter && (
        <>
          <p className="mb-2 mt-4 text-[12px] text-slate-500">Месец на пътуването</p>
          <div className="flex flex-wrap gap-1.5">
            {MONTHS.map((m, i) => (
              <button key={m} type="button" aria-pressed={month === i} onClick={() => setMonth(month === i ? null : i)} className={chip(month === i)}>
                {m}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Търсене + списък с екскурзии */}
      <div className="relative mt-4">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Търсете държава, град или част от името"
          aria-label="Търсене на екскурзия"
          className="block h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 text-[14px] text-brand-dark placeholder:text-slate-400 focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-dark/15"
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} aria-label="Изчисти търсенето" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      {(countryFilter || search || month !== null || !allowGeneral) && (
        <div className="mt-3">
          <p className="mb-2 text-[12px] text-slate-500">
            {filtered.length === 0
              ? 'Няма екскурзии с този избор.'
              : `${filtered.length} ${filtered.length === 1 ? 'екскурзия' : 'екскурзии'}${allowDestination && countryFilter ? ' — изберете една или оставете само дестинацията' : ''}`}
          </p>
          {filtered.length > 0 && (
            <ul className="max-h-80 space-y-1.5 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 p-1.5">
              {filtered.map(t => {
                const active = value.kind === 'tour' && value.tourId === t.id;
                const dates = shownDates(t);
                return (
                  <li key={t.id} className={`rounded-xl p-2 transition-colors ${active ? 'bg-brand-dark/[0.04] ring-2 ring-brand-dark' : 'hover:bg-slate-50'}`}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => pickTour(t)}
                      className="flex w-full items-center gap-3 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
                    >
                      <TourThumb tour={t} />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-[14px] font-semibold leading-snug text-brand-dark">
                          {t.title}
                          {t.status === 'archived' && <span className="ml-1.5 text-[11px] font-normal text-slate-400">(в архив)</span>}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-slate-500">
                          <MapPin size={11} className="shrink-0" aria-hidden="true" />
                          {tourCountries(t).join(', ')}
                        </span>
                      </span>
                      {t.price && <span className="shrink-0 text-[13px] font-bold text-brand-goldDeep">{formatPrice(t.price)}</span>}
                    </button>
                    {/* Всички дати на тура — натискането избира тура и датата наведнъж */}
                    <div className="mt-2 flex flex-wrap gap-1.5 pl-[68px]">
                      {dates.length === 0 ? (
                        <span className="text-[12px] text-slate-500">Дати по запитване</span>
                      ) : (
                        dates.map(d => {
                          const picked = active && value.kind === 'tour' && value.date === d;
                          const past = d < today;
                          return (
                            <button
                              key={d}
                              type="button"
                              aria-pressed={picked}
                              aria-label={`${t.title}, ${displayDate(d)}${past ? ' (минала дата)' : ''}`}
                              onClick={() => pickTour(t, d)}
                              className={`min-h-8 rounded-lg border px-2 text-[12px] font-semibold tabular-nums transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-dark ${
                                picked
                                  ? 'border-brand-dark bg-brand-dark text-white'
                                  : past
                                    ? 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-400'
                                    : 'border-slate-200 bg-white text-brand-dark hover:border-brand-dark'
                              }`}
                            >
                              {displayDate(d)}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {value.kind === 'destination' && (
        <p className="mt-3 rounded-xl bg-brand-mist px-3.5 py-2.5 text-[13px] text-slate-600">
          Ще изпратите запитване за <span className="font-semibold text-brand-dark">{value.country}</span>. Можете да изберете и конкретна екскурзия от списъка.
        </p>
      )}
    </div>
  );
}

// Малка снимка на тура; ако няма — първата буква на държавата.
function TourThumb({ tour }: { tour: PickerTour }) {
  const first = tourCountries(tour)[0] || tour.title;
  return (
    <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-dark">
      {tour.img ? (
        // Обикновен <img>: снимките може да са от външни оператори, които не са в next/image домейните.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tour.img} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span className="font-serif text-xl italic text-brand-gold/60" aria-hidden="true">{first.charAt(0)}</span>
      )}
    </span>
  );
}
