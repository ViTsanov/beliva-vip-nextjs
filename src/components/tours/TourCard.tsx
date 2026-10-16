"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRevealOnce, revealVars } from '@/components/ui/Reveal';
import { ITour } from '@/types';
import { Heart, Users, X, MapPin, Calendar, ArrowRight, AlertTriangle } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { formatPrice } from '@/lib/formatPrice';
import { isOperatorHotlink } from '@/lib/operatorImageDomains';

interface TourCardProps {
  tour: ITour;
  isFav: boolean;
  toggleFavorite: (e: React.MouseEvent, tour: ITour) => void;
  isLedByPoli: boolean;
  priority?: boolean;
  // Позицията в реда (0, 1, 2…) — картите в един ред се появяват една след друга.
  column?: number;
}

export default function TourCard({ tour, isFav, toggleFavorite, isLedByPoli, priority = false, column = 0 }: TourCardProps) {
  const [imgError, setImgError] = useState(false);
  // Снимката се показва плавно, след като се зареди. Преди размазаният заместител се сменяше рязко със снимката
  // точно след като картата се появи — изглеждаше като „примигване“.
  const [imgLoaded, setImgLoaded] = useState(false);
  // Брояч на натисканията на сърцето — само тогава то „изскача“; при първото зареждане не мърда.
  const [heartPops, setHeartPops] = useState(0);
  const cardImg = tour.img && !isOperatorHotlink(tour.img) ? tour.img : null;

  // Появяване при скрол: картата излиза едва когато е видима И снимката ѝ е заредена (или след 1.2 s най-много),
  // за да не се променя нищо по нея след като анимацията свърши — иначе се вижда „примигване“.
  const [revealRef, inView] = useRevealOnce<HTMLDivElement>();
  const [waitedForPhoto, setWaitedForPhoto] = useState(false);
  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setWaitedForPhoto(true), 1200);
    return () => clearTimeout(t);
  }, [inView]);
  const photoReady = !cardImg || imgError || imgLoaded || waitedForPhoto;
  const revealed = priority || (inView && photoReady);

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

  const badgeStyle = "text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm flex items-center gap-1 border border-white/20 transition-all";

  let isPromoActive = !!(tour.isPromo && tour.discountPrice);
  if (tour.campaignId && tour.promoStart && tour.promoEnd) {
    const now = new Date().toISOString();
    isPromoActive = now >= tour.promoStart && now <= tour.promoEnd;
  }

  const isTurkeyVacation = tour.categories?.includes('Почивка в Турция');
  const tourHref = `/tour/${tour.slug || tour.tourId || tour.id}`;
  const countryDisplay = Array.isArray(tour.country) ? tour.country.join(', ') : tour.country;

  // Рамка: водените от Поли — златна; промоциите — червеникава; останалите — тънка сива.
  // Рамката измества снимката надолу с дебелината си, затова и отрезите (--seam) се местят с толкова.
  const frameClass = isLedByPoli
    ? 'border-2 border-brand-gold [--seam:calc(18rem+2px)]'
    : isPromoActive
      ? 'border-2 border-red-500/40 [--seam:calc(18rem+2px)]'
      : 'border border-slate-200 [--seam:calc(18rem+1px)]';

  return (
    // Карта-билет: снимка отгоре, датите на отпътуване — като отрязък отдолу, с перфорация и два отреза между тях
    // (.ticket-cut в globals.css). Появява се при скрол (веднъж) с CSS анимация (.reveal в globals.css) — не с
    // framer-motion, който „примигваше“ в края. Първите карти (priority) са над сгъвката и не чакат — снимката им е LCP.
    // Вътре в картата няма backdrop-filter и filter: те също се прерисуват в края на анимацията на opacity.
    <div
      ref={revealRef}
      className={`group/card relative h-full ${priority ? '' : `reveal ${revealed ? 'revealed' : ''}`}`}
      style={priority ? undefined : revealVars({ y: 28, delay: (column % 3) * 0.08 })}
    >
    {/* Сянката е отделен слой зад картата (box-shadow би се изрязал от маската с отрезите) */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-3xl shadow-[0_10px_24px_-12px_rgba(15,23,42,0.28)] transition-shadow duration-300 group-hover/card:shadow-[0_18px_34px_-12px_rgba(15,23,42,0.4)]"
    />
    {/* <article> instead of <Link> fixes the invalid nested <button>-inside-<a> pattern.
        An absolute <Link> covers the card for pointer/keyboard nav; the fav button sits above it at z-20. */}
    <article
      className={`ticket-cut group relative flex h-full flex-col overflow-hidden rounded-3xl bg-white ${frameClass}`}
    >
      <Link
        href={tourHref}
        className="absolute inset-0 z-10 rounded-3xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-brand-dark"
        aria-label={`${tour.title} — тур до ${countryDisplay}`}
      />

      <button
        onClick={(e) => { toggleFavorite(e, tour); setHeartPops(n => n + 1); }}
        aria-label={isFav ? "Премахни от любими" : "Добави в любими"}
        className="absolute top-6 right-6 p-3 bg-black/25 rounded-full hover:bg-white active:scale-90 transition-all group/heart z-20"
      >
        {/* key се сменя при всяко натискане → CSS анимацията .heart-pop тръгва отначало; при зареждане не мърда */}
        <span key={heartPops} className={`block ${heartPops ? 'heart-pop' : ''}`}>
          <Heart size={20} className={`transition-colors ${isFav ? 'fill-red-500 text-red-500' : 'text-white group-hover/heart:text-red-500'}`} />
        </span>
      </button>

      {/* h-72 = --seam в .ticket-cut — при промяна на височината се сменят и двете */}
      <div className="relative h-72 shrink-0 overflow-hidden bg-gray-200 isolate transform-gpu">
        {cardImg && !imgError ? (
          <Image
            src={cardImg}
            alt={`Екскурзия до ${tour.country} - ${tour.title}`}
            fill
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            onLoad={() => setImgLoaded(true)}
            className={`object-cover group-hover:scale-110 ${imgLoaded || priority ? 'opacity-100' : 'opacity-0'}`}
            style={{ transition: 'transform 300ms ease, opacity 500ms ease', objectPosition: tour.imgPosition || '50% 50%' }}
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
            <span key={cat} className="bg-white/90 text-[10px] font-bold uppercase px-2 py-1 rounded-lg text-brand-dark shadow-sm">{cat}</span>
          ))}
          {(tour.categories?.filter(c => c !== 'Водена от ПОЛИ' && c !== 'Почивка в Турция').length || 0) > 2 && (
            <span className="bg-white/90 text-[10px] font-bold uppercase px-2 py-1 rounded-lg text-brand-dark shadow-sm">
              +{((tour.categories?.filter(c => c !== 'Водена от ПОЛИ' && c !== 'Почивка в Турция').length || 0) - 2)}
            </span>
          )}
        </div>

        {/* Price panel */}
        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
          <div className="bg-white/85 p-3 rounded-2xl shadow-lg text-center min-w-24">
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

      {/* Перфорацията на шева — между двата отреза */}
      <div aria-hidden="true" className="mx-6 border-t-2 border-dashed border-slate-300" />

      <div className="flex grow flex-col px-6 pb-6 pt-5">
        <div className="mb-2 flex items-center gap-1.5 text-brand-goldDeep">
          <MapPin size={14} className="shrink-0" aria-hidden="true" />
          <span className="text-[13px] font-bold leading-snug tracking-[0.02em]">
            {countryDisplay}
          </span>
        </div>
        <h3 className="mb-5 font-serif text-[22px] font-bold leading-tight text-brand-dark transition-colors group-hover:text-brand-goldDeep">
          {tour.title}
        </h3>
        <div className="mt-auto flex items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Calendar size={14} className="shrink-0" aria-hidden="true" />
              <span>Дати на отпътуване</span>
            </div>

            {tour.datePrices && Object.keys(tour.datePrices).length > 0 ? (
              <div className="flex flex-col">
                {allDatesISO.slice(0, 4).map((isoDate) => (
                  <div key={isoDate} className="flex items-center justify-between gap-3 border-b border-slate-100 py-1 last:border-0">
                    <time dateTime={isoDate} className="text-[14px] font-semibold tabular-nums text-brand-dark">
                      {formatISOtoDisplay(isoDate)}
                    </time>
                    {tour.datePrices?.[isoDate] && (
                      <span className="rounded-md bg-brand-gold/15 px-2 py-0.5 text-[12px] font-bold text-brand-goldDeep">
                        {formatPrice(tour.datePrices[isoDate])}
                      </span>
                    )}
                  </div>
                ))}
                {allDatesISO.length > 4 && (
                  <span className="mt-1 text-[12px] font-semibold text-slate-500">+{allDatesISO.length - 4} още</span>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {allDatesISO.slice(0, 3).map((isoDate, idx) => (
                  <time key={idx} dateTime={isoDate} className="rounded-md bg-brand-mist px-2 py-1 text-[14px] font-semibold tabular-nums text-brand-dark">
                    {formatISOtoDisplay(isoDate)}
                  </time>
                ))}
                {allDatesISO.length > 3 && (
                  <span className="self-center text-[12px] font-semibold text-slate-500">+{allDatesISO.length - 3}</span>
                )}
              </div>
            )}
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${isLedByPoli ? 'bg-brand-gold/35 text-brand-dark group-hover:bg-brand-gold' : 'bg-brand-mist text-brand-dark group-hover:bg-brand-dark group-hover:text-white'}`}>
            <ArrowRight size={18} aria-hidden="true" />
          </div>
        </div>
      </div>
    </article>
    </div>
  );
}
