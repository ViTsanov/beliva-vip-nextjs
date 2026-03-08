"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ITour } from '@/types';
import { Heart, CheckCircle2, Clock, X, MapPin, Calendar, ArrowRight, Star, Flame } from 'lucide-react';

interface TourCardProps {
  tour: ITour;
  isFav: boolean;
  toggleFavorite: (e: React.MouseEvent, tour: ITour) => void;
  isLedByPoli: boolean;
}

export default function TourCard({ tour, isFav, toggleFavorite, isLedByPoli }: TourCardProps) {
  const getAllDates = () => {
    let dates = [...(tour.dates || [])];
    if (tour.date) {
      const parts = tour.date.split('-');
      const mainIso = parts[0].length === 2 ? parts.reverse().join('-') : tour.date;
      if (!dates.includes(mainIso)) dates.push(mainIso);
    } 
    return dates.sort();
  };

  const allDatesISO = getAllDates();
  
  const formatISOtoDisplay = (isoDate: string) => { 
      if (!isoDate) return ""; 
      return isoDate.split('-').reverse().join('.'); 
  };

  const badgeStyle = "backdrop-blur-md text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm flex items-center gap-1 border border-white/20 transition-all";

  // Интелигентна логика за промоция (отчита и кампании с дати)
  let isPromoActive = !!(tour.isPromo && tour.discountPrice);
  if (tour.campaignId && tour.promoStart && tour.promoEnd) {
      const now = new Date().toISOString();
      isPromoActive = now >= tour.promoStart && now <= tour.promoEnd;
  }
  
  return (
    <Link 
      href={`/tour/${tour.tourId || tour.id}`} 
      className={`group bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border flex flex-col h-full relative hover:-translate-y-2 transform-gpu 
      ${isLedByPoli ? 'border-2 border-brand-gold shadow-[0_0_15px_rgba(197,163,93,0.3)]' : 'border-brand-gold/5'}
      ${isPromoActive ? 'border-red-500/30 shadow-[0_4px_20px_rgba(220,38,38,0.1)]' : ''}`}
    >
        <button 
            onClick={(e) => toggleFavorite(e, tour)} 
            aria-label={isFav ? "Премахни от любими" : "Добави в любими"}
            className="absolute top-6 right-6 p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white transition-all group/heart z-20"
        >
            <Heart size={20} className={`transition-colors ${isFav ? 'fill-red-500 text-red-500' : 'text-white group-hover/heart:text-red-500'}`} />
        </button>
        
        {/* ✨ ИЗОЛИРАН КОНТЕЙНЕР ЗА СНИМКА (РЕШАВА ПРОБЛЕМА С КВАДРАТНИТЕ ЪГЛИ) ✨ */}
        <div className="relative h-72 overflow-hidden bg-gray-200 isolate transform-gpu rounded-t-[2.5rem]">
            <Image
                src={tour.img}
                alt={`Екскурзия до ${tour.country} - ${tour.title}`}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            
            {/* ГОРЕ ВЛЯВО: ПРОМОЦИИ И СТАТУСИ */}
            <div className="absolute top-6 left-6 flex flex-col gap-2 items-start z-10">
                {isPromoActive && (
                    <span 
                        className={`${badgeStyle} shadow-[0_4px_15px_rgba(0,0,0,0.3)] border-none`}
                        style={{ 
                            backgroundColor: tour.promoBgColor || '#dc2626', 
                            color: tour.promoTextColor || '#ffffff' 
                        }}
                        >
                        <Flame size={12} style={{ color: tour.promoTextColor || '#ffffff', opacity: 0.8 }} /> 
                        {tour.promoLabel || 'ПРОМОЦИЯ'}
                    </span>
                )}

                {tour.groupStatus === 'confirmed' && <span className={`${badgeStyle} bg-emerald-800/90 text-white`}><CheckCircle2 size={12} /> Потвърдена</span>}
                {tour.groupStatus === 'last-places' && <span className={`${badgeStyle} bg-amber-700/90 text-white`}><Clock size={12} /> Последни места</span>}
                {tour.groupStatus === 'sold-out' && <span className={`${badgeStyle} bg-rose-800/90 text-white`}><X size={12} /> Изчерпана</span>}
                {tour.groupStatus === 'active' && <span className={`${badgeStyle} bg-brand-gold/90 text-brand-dark`}>● Оформяща група</span>}
            </div>

            {/* ДОЛУ ВДЯСНО: ВОДЕНА ОТ ПОЛИ */}
            {isLedByPoli && (
                <div className="absolute bottom-4 right-4 z-10">
                    <span className="bg-brand-gold text-brand-dark px-3 py-1.5 rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-[0_4px_15px_rgba(212,175,55,0.4)] flex items-center gap-1.5">
                        <Star size={12} fill="currentColor" /> С Поли
                    </span>
                </div>
            )}
            
            {/* КАТЕГОРИИ */}
            <div className="absolute top-16 right-6 flex flex-col items-end gap-1 z-10">
                {tour.categories?.filter(c => c !== 'Водена от ПОЛИ').slice(0, 2).map(cat => ( <span key={cat} className="bg-white/90 backdrop-blur-sm text-[9px] font-bold uppercase px-2 py-1 rounded-lg text-brand-dark shadow-sm">{cat}</span>))}
                {(tour.categories?.filter(c => c !== 'Водена от ПОЛИ').length || 0) > 2 && (<span className="bg-white/90 backdrop-blur-sm text-[9px] font-bold uppercase px-2 py-1 rounded-lg text-brand-dark shadow-sm">+{((tour.categories?.filter(c => c !== 'Водена от ПОЛИ').length || 0) - 2)}</span>)}
            </div>

            <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                {/* ЦЕНА */}
                <div className="bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-lg border border-brand-gold/10 text-center min-w-24">
                    <p className="text-[10px] font-black text-brand-dark uppercase tracking-widest opacity-60 mb-1">
                        {isPromoActive ? 'Стандартна цена' : 'Цена от'}
                    </p>
                    <div className="flex flex-col items-center">
                        <p className={`font-serif font-bold leading-none transition-all ${isPromoActive ? 'text-gray-400 line-through text-lg decoration-red-500/50 decoration-2' : 'text-brand-gold text-2xl'}`}>
                            {tour.price}
                        </p>
                        {isPromoActive && (
                            <p className="text-2xl font-serif font-bold text-red-600 leading-none mt-1">
                                {tour.discountPrice}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>

        <div className="p-8 flex flex-col grow">
            <div className="flex items-center gap-2 text-brand-gold mb-3">
                <MapPin size={14} />
                <span className="text-xl font-bold uppercase tracking-widest">{tour.country}</span>
            </div>
            <h3 className="text-2xl font-serif font-bold text-brand-dark mb-4 group-hover:text-brand-gold transition-colors leading-tight">
                {tour.title}
            </h3>
            <div className="mt-auto pt-6 border-t border-gray-50 flex items-start justify-between">
                <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase mb-1">
                    <Calendar size={14} className="text-brand-gold" /><span>Дати на отпътуване:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {allDatesISO.slice(0, 3).map((isoDate, idx) => (
                        <span key={idx} className="text-[15px] font-bold text-brand-dark bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                            {formatISOtoDisplay(isoDate)}
                        </span>
                    ))}
                    {allDatesISO.length > 3 && (
                        <span className="text-[12px] font-bold text-gray-400 self-center">+{allDatesISO.length - 3}</span>
                    )}
                </div>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 mt-2 ${isLedByPoli ? 'bg-brand-gold text-white shadow-md' : 'bg-brand-gold/10 text-brand-gold group-hover:bg-brand-gold group-hover:text-white'}`}>
                    <ArrowRight size={20} />
                </div>
            </div>
        </div>
    </Link>
  );
}