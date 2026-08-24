"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ITour } from '@/types';
import { Heart, Users, X, MapPin, Calendar, ArrowRight, AlertTriangle } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { formatPrice } from '@/lib/formatPrice';
import { BLUR_PLACEHOLDER } from '@/lib/blurPlaceholder';
import { isOperatorHotlink } from '@/lib/operatorImageDomains';

interface TourCardProps {
  tour: ITour;
  isFav: boolean;
  toggleFavorite: (e: React.MouseEvent, tour: ITour) => void;
  isLedByPoli: boolean;
  priority?: boolean;
}

export default function TourCard({ tour, isFav, toggleFavorite, isLedByPoli, priority = false }: TourCardProps) {
  const [imgError, setImgError] = useState(false);
  const cardImg = tour.img && !isOperatorHotlink(tour.img) ? tour.img : null;

  const getAllDates = () => {
    const normalize = (d: any): string | null => {
      if (!d) return null;
      if (typeof d === 'object' && typeof d.toDate === 'function') return d.toDate().toISOString().split('T')[0];
      if (typeof d === 'object' && d.seconds) return new Date(d.seconds * 1000).toISOString().split('T')[0];
      const str = String(d).trim();
      const clean = str.split('T')[0];
      const sep = clean.includes('-') ? '-' : clean.includes('/') ? '/' : clean.includes('.') ? '.' : null;
      if (!sep) return null;
      const parts = clean.split(sep).map((p: string) => p.trim());
      if (parts.length !== 3) return null;
      const [a, b, c] = parts;
      if (a.length === 4) return `${a}-${b.padStart(2,'0')}-${c.padStart(2,'0')}`;
      if (c.length === 4) return `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`;
      return null;
    };

    const seen = new Set<string>();
    const result: string[] = [];

    for (const d of [...(tour.dates || []), ...(tour.date ? [tour.date] : [])]) {
      const norm = normalize(String(d));
      if (norm && !seen.has(norm)) {
        seen.add(norm);
        result.push(norm);
      }
    }

    return result.sort();
  };

  const allDatesISO = getAllDates();

  const formatISOtoDisplay = (isoDate: string) => {
    if (!isoDate) return "";
    return isoDate.split('-').reverse().join('.');
  };

  const badgeStyle = "backdrop-blur-md text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm flex items-center gap-1 border border-white/20 transition-all";

  let isPromoActive = !!(tour.isPromo && tour.discountPrice);
  if (tour.campaignId && tour.promoStart && tour.promoEnd) {
    const now = new Date().toISOString();
    isPromoActive = now >= tour.promoStart && now <= tour.promoEnd;
  }

  const isTurkeyVacation = tour.categories?.includes('Почивка в Турция');
  const tourHref = `/tour/${tour.slug || tour.tourId || tour.id}`;
  const countryDisplay = Array.isArray(tour.country) ? tour.country.join(', ') : tour.country;

  return (
    // <article> instead of <Link> fixes the invalid nested <button>-inside-<a> pattern.
    // An absolute <Link> covers the card for pointer/keyboard nav; the fav button sits above it at z-20.
    <article
      className={`group bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-[0_25px_70px_-15px_rgba(212,175,55,0.45)] transition-all duration-500 border flex flex-col h-full relative hover:-translate-y-2 transform-gpu
      ${isLedByPoli ? 'border-2 border-brand-gold shadow-[0_0_15px_rgba(197,163,93,0.3)]' : 'border-brand-gold/5 hover:border-brand-gold/40'}
      ${isPromoActive ? 'border-red-500/30 shadow-[0_4px_20px_rgba(220,38,38,0.1)]' : ''}`}
    >
      <Link
        href={tourHref}
        className="absolute inset-0 z-10 rounded-[2.5rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2"
        aria-label={`${tour.title} — тур до ${countryDisplay}`}
      />

      <button
        onClick={(e) => toggleFavorite(e, tour)}
        aria-label={isFav ? "Премахни от любими" : "Добави в любими"}
        className="absolute top-6 right-6 p-3 bg-white/20 backdrop-blur-md rounded-full hover:bg-white active:scale-90 transition-all group/heart z-20"
      >
        <Heart size={20} className={`transition-colors ${isFav ? 'fill-red-500 text-red-500' : 'text-white group-hover/heart:text-red-500'}`} />
      </button>

      <div className="relative h-72 overflow-hidden bg-gray-200 isolate transform-gpu rounded-t-[2.5rem]">
        {cardImg && !imgError ? (
          <Image
            src={cardImg}
            alt={`Екскурзия до ${tour.country} - ${tour.title}`}
            fill
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-dark to-brand-dark/60 flex items-center justify-center">
            <span className="text-6xl font-serif italic text-brand-gold/20 select-none" aria-hidden="true">
              {(Array.isArray(tour.country) ? tour.country[0] : tour.country || '?').charAt(0)}
            </span>
          </div>
        )}

        {/* Top-left: promo badges and group status */}
        <div className="absolute top-6 left-6 flex flex-col gap-2 items-start z-10">
          {isPromoActive && (
            <Badge
              variant="promo"
              text={tour.promoLabel}
              customBgColor={tour.promoBgColor}
              customTextColor={tour.promoTextColor}
              customEffect={tour.promoEffect}
            />
          )}

          {tour.groupStatus === 'confirmed' && <Badge variant="groupStatus" />}

          {tour.groupStatus === 'last-places' && (
            <span className={`${badgeStyle} bg-gradient-to-r from-rose-600 to-red-700 text-white border-rose-500/30 shadow-[0_0_16px_rgba(225,29,72,0.45)]`}>
              {/* motion-safe: only bounces when user has not requested reduced motion */}
              <AlertTriangle size={11} className="shrink-0 motion-safe:animate-bounce" aria-hidden="true" />
              {tour.spotsLeft
                ? `Остават само ${tour.spotsLeft} ${tour.spotsLeft === 1 ? 'място' : 'места'}`
                : 'Последни места'}
            </span>
          )}

          {tour.groupStatus === 'sold-out' && (
            <span className={`${badgeStyle} bg-rose-800/90 text-white`}>
              <X size={12} aria-hidden="true" /> Изчерпана
            </span>
          )}
          {tour.groupStatus === 'active' && (
            <span className={`${badgeStyle} bg-brand-gold/90 text-brand-dark`}>
              <span aria-hidden="true">●</span> Оформяща група
            </span>
          )}

          {tour.roomCombo && (
            <span className={`${badgeStyle} bg-brand-dark/90 text-brand-gold border-brand-gold/25 shadow-md`}>
              <Users size={11} className="shrink-0" aria-hidden="true" />
              {tour.roomCombo}
            </span>
          )}
        </div>

        {/* Bottom-right: Turkey / Poli badges */}
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2 items-end">
          {isTurkeyVacation && <Badge variant="turkey" />}
          {isLedByPoli && <Badge variant="poli" />}
        </div>

        {/* Top-right: category chips */}
        <div className="absolute top-16 right-6 flex flex-col items-end gap-1 z-10">
          {tour.categories?.filter(c => c !== 'Водена от ПОЛИ' && c !== 'Почивка в Турция').slice(0, 2).map(cat => (
            <span key={cat} className="bg-white/90 backdrop-blur-sm text-[10px] font-bold uppercase px-2 py-1 rounded-lg text-brand-dark shadow-sm">{cat}</span>
          ))}
          {(tour.categories?.filter(c => c !== 'Водена от ПОЛИ' && c !== 'Почивка в Турция').length || 0) > 2 && (
            <span className="bg-white/90 backdrop-blur-sm text-[10px] font-bold uppercase px-2 py-1 rounded-lg text-brand-dark shadow-sm">
              +{((tour.categories?.filter(c => c !== 'Водена от ПОЛИ' && c !== 'Почивка в Турция').length || 0) - 2)}
            </span>
          )}
        </div>

        {/* Price panel */}
        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
          <div className="glass-panel-light p-3 rounded-2xl shadow-lg text-center min-w-24">
            <p className="text-[10px] font-black text-brand-dark uppercase tracking-widest opacity-60 mb-1">
              {isPromoActive ? 'Стандартна цена' : 'Цена от'}
            </p>
            <div className="flex flex-col items-center">
              {isPromoActive ? (
                <>
                  <del className="font-serif font-bold leading-none text-gray-400 text-lg decoration-red-500/50 decoration-2">
                    <span className="sr-only">Стандартна цена: </span>
                    {formatPrice(tour.price)}
                  </del>
                  <p className="text-2xl font-serif font-bold text-red-600 leading-none mt-1">
                    <span className="sr-only">Промоционална цена: </span>
                    {formatPrice(tour.discountPrice)}
                  </p>
                </>
              ) : (
                <p className="font-serif font-bold leading-none text-brand-dark text-2xl">
                  {formatPrice(tour.price)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 flex flex-col grow">
        <div className="flex items-center gap-2 text-brand-gold mb-3">
          <MapPin size={14} aria-hidden="true" />
          <span className="text-xl font-bold uppercase tracking-widest">
            {countryDisplay}
          </span>
        </div>
        <h3 className="text-2xl font-serif font-bold text-brand-dark mb-4 group-hover:text-brand-gold transition-colors leading-tight">
          {tour.title}
        </h3>
        <div className="mt-auto pt-6 border-t border-gray-50 flex items-start justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase mb-1">
              <Calendar size={14} className="text-brand-gold" aria-hidden="true" />
              <span>Дати на отпътуване:</span>
            </div>

            {tour.datePrices && Object.keys(tour.datePrices).length > 0 ? (
              <div className="flex flex-col gap-1 mt-0.5">
                {allDatesISO.slice(0, 4).map((isoDate) => (
                  <div key={isoDate} className="flex items-center justify-between gap-3 py-1 border-b border-gray-50 last:border-0">
                    <time dateTime={isoDate} className="text-[13px] font-bold text-brand-dark">
                      {formatISOtoDisplay(isoDate)}
                    </time>
                    {tour.datePrices?.[isoDate] && (
                      <span className="text-[12px] font-bold text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded-md">
                        {formatPrice(tour.datePrices[isoDate])}
                      </span>
                    )}
                  </div>
                ))}
                {allDatesISO.length > 4 && (
                  <span className="text-[11px] text-gray-400 font-bold">+{allDatesISO.length - 4} още</span>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allDatesISO.slice(0, 3).map((isoDate, idx) => (
                  <time key={idx} dateTime={isoDate} className="text-[15px] font-bold text-brand-dark bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                    {formatISOtoDisplay(isoDate)}
                  </time>
                ))}
                {allDatesISO.length > 3 && (
                  <span className="text-[12px] font-bold text-gray-400 self-center">+{allDatesISO.length - 3}</span>
                )}
              </div>
            )}
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 mt-2 group-hover:scale-110 ${isLedByPoli ? 'bg-brand-gold text-white shadow-md' : 'bg-brand-gold/10 text-brand-gold group-hover:bg-brand-gold group-hover:text-white'}`}>
            <ArrowRight size={20} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </div>
        </div>
      </div>
    </article>
  );
}
