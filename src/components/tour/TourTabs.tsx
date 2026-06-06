"use client";

import { useState } from 'react';
import { ITour } from "@/types";
import { Calendar, Clock, Globe, Euro, CalendarDays, ChevronDown, ChevronUp, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TourTabsProps {
  tour: ITour;
  galleryImages: string[];
  onImageClick: (index: number) => void;
}

export default function TourTabs({ tour, galleryImages, onImageClick }: TourTabsProps) {
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isGalleryExpanded, setIsGalleryExpanded] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  const hasMultipleDates = tour.dates && tour.dates.length > 1;
  const formatDate = (dateStr: string) => dateStr.split('-').reverse().join('.');
  const programData = tour.itinerary || tour.program || [];
  const isPromoActive = tour.isPromo && tour.discountPrice;

  const goToDay = (index: number) => {
    setDirection(index > activeDay ? 1 : -1);
    setActiveDay(index);
  };

  const goNext = () => { if (activeDay < programData.length - 1) goToDay(activeDay + 1); };
  const goPrev = () => { if (activeDay > 0) goToDay(activeDay - 1); };

  return (
    <div className="space-y-10">

      {/* ─── INFO GRID ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {!hasMultipleDates && (
          <div className="bg-white p-5 rounded-3xl shadow-xl border-b-4 border-brand-dark group hover:-translate-y-1 transition-all">
            <div className="mb-2 text-gray-400 group-hover:text-brand-gold transition-colors"><Calendar size={24}/></div>
            <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">Дата</p>
            <p className="font-bold text-brand-dark text-sm md:text-lg">{tour.date}</p>
          </div>
        )}
        <div className={`bg-white p-5 rounded-3xl shadow-xl border-b-4 border-brand-dark group hover:-translate-y-1 transition-all ${hasMultipleDates ? 'md:col-span-2' : ''}`}>
          <div className="mb-2 text-gray-400 group-hover:text-brand-gold transition-colors"><Clock size={24}/></div>
          <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">Продължителност</p>
          <p className="font-bold text-brand-dark text-sm md:text-lg">
            {tour.durationDays ? `${tour.durationDays} дни` : ''}
            {tour.durationDays && tour.nights ? ' / ' : ''}
            {tour.nights ? `${tour.nights} нощувки` : tour.duration}
          </p>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-xl border-b-4 border-brand-dark group hover:-translate-y-1 transition-all">
          <div className="mb-2 text-gray-400 group-hover:text-brand-gold transition-colors"><Globe size={24}/></div>
          <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">Държава</p>
          <p className="font-bold text-brand-dark text-sm md:text-lg">{Array.isArray(tour.country) ? tour.country.join(', ') : tour.country}</p>
        </div>
        <div className="bg-brand-dark p-5 rounded-3xl shadow-xl border-b-4 border-brand-gold group hover:-translate-y-1 transition-all relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Euro size={64} className="text-white"/></div>
          <div className="mb-2 text-brand-gold relative z-10"><Euro size={24}/></div>
          {isPromoActive ? (
            <div className="relative z-10 flex flex-col">
              <p className="text-[10px] uppercase font-black text-brand-gold/70 tracking-widest mb-0.5">Специална цена</p>
              <span className="text-xs text-gray-400 line-through decoration-red-500/50 decoration-2 font-serif leading-none mt-1">{tour.price}</span>
              <span className="font-bold text-red-500 text-xl md:text-2xl drop-shadow-sm leading-tight">{tour.discountPrice}</span>
            </div>
          ) : (
            <div className="relative z-10">
              <p className="text-[10px] uppercase font-black text-brand-gold/70 tracking-widest mb-1">Цена от</p>
              <p className="font-bold text-white text-lg md:text-xl">{tour.price}</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── MULTIPLE DATES ─── */}
      {hasMultipleDates && (
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-brand-gold"></div>
          <div className="flex items-center gap-2 mb-6 text-brand-dark">
            <CalendarDays size={24} className="text-brand-gold"/>
            <span className="text-lg font-bold font-serif italic">Налични дати за пътуване</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {tour.dates?.sort().map((d: string, index: number) => (
              <span key={index} className="px-6 py-3 bg-gray-50 border border-gray-200 rounded-xl text-brand-dark font-bold text-sm shadow-sm hover:bg-brand-dark hover:text-brand-gold transition-all cursor-default">
                {formatDate(d)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ─── VISITED PLACES ─── */}
      {tour.visitedPlaces && tour.visitedPlaces.length > 0 && (
        <div className="bg-gradient-to-r from-[#fcf9f2] to-white p-6 sm:p-8 rounded-[2rem] border border-brand-gold/20 shadow-sm">
          <p className="text-sm font-serif italic text-brand-dark mb-4 flex items-center gap-2">
            <span className="w-8 h-[1px] bg-brand-gold inline-block"></span>
            В тази екскурзия ще посетите:
          </p>
          <div className="flex flex-wrap gap-2.5">
            {tour.visitedPlaces.map((place: string, idx: number) => (
              <span key={idx} className="bg-white text-brand-dark px-4 py-2 rounded-2xl text-[11px] font-bold uppercase tracking-wider shadow-sm border border-gray-100 flex items-center gap-2 hover:border-brand-gold transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-gold"></span>
                {place}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ─── INTRO / ВПЕЧАТЛЕНИЯ ─── */}
      {tour.intro && (
        <div className="bg-[#fffdf5] p-8 md:p-12 rounded-[2.5rem] shadow-lg border border-brand-gold/10 relative">
          <div className="absolute top-6 left-8 text-6xl text-brand-gold/10 font-serif italic">"</div>
          <h2 className="text-3xl font-serif italic mb-6 text-brand-dark relative z-10">Впечатления</h2>
          <div className={`relative transition-all duration-700 overflow-hidden ${!isDescExpanded ? 'max-h-40' : 'max-h-[5000px]'}`}>
            <p className="leading-relaxed whitespace-pre-wrap text-[18px] text-gray-700 font-light relative z-10">{tour.intro}</p>
            {!isDescExpanded && <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#fffdf5] to-transparent z-20"></div>}
          </div>
          <button onClick={() => setIsDescExpanded(!isDescExpanded)} className="mt-6 flex items-center gap-2 text-brand-dark hover:text-brand-gold font-bold text-xs uppercase tracking-widest transition-colors relative z-20">
            {isDescExpanded ? <>Скрий <ChevronUp size={14}/></> : <>Прочети цялото описание <ChevronDown size={14}/></>}
          </button>
        </div>
      )}

      {/* ─── ПРОГРАМА — НОВ ДИЗАЙН ─── */}
      {programData.length > 0 && (
        <div className="rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-xl bg-white">

          {/* Section header */}
          <div className="px-8 md:px-12 pt-9 pb-7 border-b border-gray-100 bg-gradient-to-r from-white to-[#fffdf8]">
            <span className="text-brand-gold text-[10px] font-black uppercase tracking-[0.35em] block mb-1">Ден по ден</span>
            <h2 className="text-3xl md:text-4xl font-serif italic text-brand-dark leading-none">
              Програма
              <span className="text-gray-300 font-normal text-2xl ml-3">· {programData.length} {programData.length === 1 ? 'ден' : 'дни'}</span>
            </h2>
          </div>

          {/* Day pills selector */}
          <div className="px-8 md:px-12 py-5 border-b border-gray-100 bg-gray-50/60 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {programData.map((_: any, i: number) => (
                <button
                  key={i}
                  onClick={() => goToDay(i)}
                  className={`flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-2xl font-black text-xs transition-all duration-200 border ${
                    activeDay === i
                      ? 'bg-brand-dark text-brand-gold border-brand-dark shadow-md scale-105'
                      : 'bg-white text-gray-400 border-gray-200 hover:border-brand-gold/40 hover:text-brand-dark'
                  }`}
                >
                  <span className={`text-[8px] uppercase tracking-widest font-bold ${activeDay === i ? 'text-brand-gold/60' : 'text-gray-300'}`}>
                    Ден
                  </span>
                  <span className="text-base leading-none font-serif">{i + 1}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Day content panel */}
          <div className="relative overflow-hidden" style={{ minHeight: 260 }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeDay}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="px-8 md:px-12 py-9"
              >
                {(() => {
                  const day = programData[activeDay];
                  const dayNum = day.day || activeDay + 1;
                  const content = day.content || day.desc || '';
                  return (
                    <div className="flex gap-7 md:gap-10">
                      {/* Large day number */}
                      <div className="flex flex-col items-center shrink-0 pt-1">
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-brand-gold flex items-center justify-center shadow-lg shadow-brand-gold/25">
                          <span className="font-serif font-bold text-brand-dark text-2xl md:text-3xl leading-none">{dayNum}</span>
                        </div>
                        {/* Vertical connector */}
                        <div className="w-px flex-1 bg-brand-gold/20 mt-3 hidden md:block" style={{ minHeight: 40 }} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <span className="text-brand-gold text-[9px] font-black uppercase tracking-[0.3em] block mb-1">
                          Ден {dayNum} от {programData.length}
                        </span>
                        <h3 className="text-2xl md:text-3xl font-serif italic text-brand-dark leading-tight mb-5">
                          {day.title}
                        </h3>
                        <div className="h-px bg-brand-gold/20 mb-5" />
                        <p className="text-gray-600 leading-8 text-[16px] font-light whitespace-pre-line">
                          {content}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer: prev / progress / next */}
          <div className="px-8 md:px-12 py-5 bg-gray-50/60 border-t border-gray-100 flex items-center gap-5">
            <button
              onClick={goPrev}
              disabled={activeDay === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-brand-dark text-brand-dark font-black text-[11px] uppercase tracking-widest hover:bg-brand-dark hover:text-brand-gold transition-all disabled:opacity-25 disabled:cursor-not-allowed group shrink-0"
            >
              <ChevronLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
              Предишен
            </button>

            {/* Progress bar */}
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-gold rounded-full transition-all duration-400"
                  style={{ width: `${((activeDay + 1) / programData.length) * 100}%` }}
                />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                {activeDay + 1} / {programData.length} {programData.length === 1 ? 'ден' : 'дни'}
              </span>
            </div>

            <button
              onClick={goNext}
              disabled={activeDay === programData.length - 1}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-dark text-brand-gold font-black text-[11px] uppercase tracking-widest hover:bg-brand-gold hover:text-brand-dark transition-all disabled:opacity-25 disabled:cursor-not-allowed group shrink-0"
            >
              Следващ
              <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* ─── ДОПЪЛНИТЕЛНА ИНФОРМАЦИЯ ─── */}
      {tour.generalInfo && (
        <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-xl border border-gray-100 relative">
          <h2 className="text-3xl md:text-4xl font-serif italic mb-6 text-brand-dark pl-4 border-l-4 border-brand-gold">Допълнителна информация</h2>
          <div className={`relative transition-all duration-700 overflow-hidden ${!isInfoExpanded ? 'max-h-48' : 'max-h-[10000px]'}`}>
            <p className="leading-relaxed whitespace-pre-wrap text-[16px] text-gray-600 font-light">{tour.generalInfo}</p>
            {!isInfoExpanded && <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent z-20"></div>}
          </div>
          <button onClick={() => setIsInfoExpanded(!isInfoExpanded)} className="mt-6 flex items-center gap-2 text-brand-gold font-bold text-xs uppercase tracking-widest hover:text-brand-dark transition-colors relative z-30">
            {isInfoExpanded ? <>Скрий информацията <ChevronUp size={14}/></> : <>Виж цялата информация <ChevronDown size={14}/></>}
          </button>
        </div>
      )}

      {/* ─── ГАЛЕРИЯ ─── */}
      {galleryImages.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-3xl font-serif italic text-brand-dark pl-4 border-l-4 border-brand-gold">Галерия</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {galleryImages.map((url: string, index: number) => {
              const isHiddenOnMobile = !isGalleryExpanded && index >= 2;
              return (
                <div
                  key={index}
                  className={`aspect-square rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all cursor-pointer relative group ${isHiddenOnMobile ? 'hidden md:block' : 'block'}`}
                  onClick={() => onImageClick(index)}
                >
                  <img src={url} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ImageIcon className="text-white w-10 h-10 drop-shadow-md" />
                  </div>
                </div>
              );
            })}
          </div>
          {galleryImages.length > 2 && (
            <div className="md:hidden flex justify-center mt-4">
              <button onClick={() => setIsGalleryExpanded(!isGalleryExpanded)} className="text-sm font-bold uppercase tracking-wider text-gray-500 hover:text-brand-gold flex items-center gap-1">
                {isGalleryExpanded ? <>Скрий галерията <ChevronUp size={16}/></> : <>Виж още {galleryImages.length - 2} снимки <ChevronDown size={16}/></>}
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
