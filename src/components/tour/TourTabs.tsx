"use client";

import { useState } from 'react';
import { ITour } from "@/types";
import { Calendar, Clock, Globe, Euro, CalendarDays, ChevronDown, ChevronUp, Image as ImageIcon, ChevronsUpDown } from 'lucide-react';

interface TourTabsProps {
  tour: ITour;
  galleryImages: string[];
  onImageClick: (index: number) => void;
}

export default function TourTabs({ tour, galleryImages, onImageClick }: TourTabsProps) {
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isGalleryExpanded, setIsGalleryExpanded] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  // Accordion: set of open day indices. Day 0 open by default.
  const [openDays, setOpenDays] = useState<number[]>([0]);

  const hasMultipleDates = tour.dates && tour.dates.length > 1;
  const formatDate = (dateStr: string) => dateStr.split('-').reverse().join('.');
  const programData = tour.itinerary || tour.program || [];
  const isPromoActive = tour.isPromo && tour.discountPrice;

  const toggleDay = (index: number) => {
    setOpenDays(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const allOpen = openDays.length === programData.length;
  const toggleAll = () => {
    setOpenDays(allOpen ? [] : programData.map((_, i) => i));
  };

  return (
    <div className="space-y-12">

      {/* INFO GRID */}
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

      {/* MULTIPLE DATES */}
      {hasMultipleDates && (
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-brand-gold"></div>
          <div className="flex items-center justify-center gap-2 mb-6 text-brand-dark">
            <CalendarDays size={24} className="text-brand-gold"/>
            <span className="text-lg font-bold font-serif italic">Налични дати за пътуване</span>
          </div>
          <div className="flex flex-wrap justify-center gap-3 relative z-10">
            {tour.dates?.sort().map((d: string, index: number) => (
              <span key={index} className="px-6 py-3 bg-gray-50 border border-gray-200 rounded-xl text-brand-dark font-bold text-sm shadow-sm hover:bg-brand-dark hover:text-brand-gold transition-all cursor-default">
                {formatDate(d)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* VISITED PLACES */}
      {tour.visitedPlaces && tour.visitedPlaces.length > 0 && (
        <div className="bg-gradient-to-r from-[#fcf9f2] to-white p-6 sm:p-8 rounded-[2rem] border border-brand-gold/20 shadow-sm animate-in fade-in duration-700">
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

      {/* INTRO / ВПЕЧАТЛЕНИЯ */}
      {tour.intro && (
        <div className="bg-[#fffdf5] p-8 md:p-12 rounded-[2.5rem] shadow-lg border border-brand-gold/10 relative">
          <div className="absolute top-6 left-8 text-6xl text-brand-gold/10 font-serif italic">"</div>
          <h2 className="text-3xl font-serif italic mb-6 text-brand-dark relative z-10">Впечатления</h2>
          <div className={`relative transition-all duration-700 overflow-hidden ${!isDescExpanded ? 'max-h-40' : 'max-h-[5000px]'}`}>
            <p className="leading-relaxed whitespace-pre-wrap text-[18px] text-gray-700 font-light relative z-10">{tour.intro}</p>
            {!isDescExpanded && <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#fffdf5] to-transparent z-20"></div>}
          </div>
          <button
            onClick={() => setIsDescExpanded(!isDescExpanded)}
            className="mt-6 flex items-center gap-2 text-brand-dark hover:text-brand-gold font-bold text-xs uppercase tracking-widest transition-colors relative z-20"
          >
            {isDescExpanded ? <>Скрий <ChevronUp size={14}/></> : <>Прочети цялото описание <ChevronDown size={14}/></>}
          </button>
        </div>
      )}

      {/* ─── ПРОГРАМА — АКОРДЕОН ─── */}
      {programData.length > 0 && (
        <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100">

          {/* Header */}
          <div className="flex items-center justify-between px-6 md:px-10 py-7 border-b border-gray-100">
            <div>
              <span className="text-brand-gold text-[10px] font-black uppercase tracking-[0.3em] block mb-1">Ден по ден</span>
              <h2 className="text-3xl md:text-4xl font-serif italic text-brand-dark leading-none">
                Програма
                <span className="text-gray-300 font-normal text-2xl ml-3">· {programData.length} {programData.length === 1 ? 'ден' : 'дни'}</span>
              </h2>
            </div>
            {programData.length > 1 && (
              <button
                onClick={toggleAll}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-brand-gold transition-colors shrink-0"
              >
                <ChevronsUpDown size={14}/>
                {allOpen ? 'Скрий всички' : 'Разгъни всички'}
              </button>
            )}
          </div>

          {/* Accordion rows */}
          <div className="divide-y divide-gray-50">
            {programData.map((day: any, index: number) => {
              const isOpen = openDays.includes(index);
              const dayNum = day.day || index + 1;
              const content = day.content || day.desc || '';

              return (
                <div key={index}>
                  {/* Row header — always visible */}
                  <button
                    onClick={() => toggleDay(index)}
                    className="w-full flex items-center gap-4 px-6 md:px-10 py-5 text-left hover:bg-[#fffdf8] transition-colors group"
                  >
                    {/* Day circle */}
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-serif font-bold text-base shrink-0 transition-all duration-300 border-2 ${
                      isOpen
                        ? 'bg-brand-gold text-brand-dark border-brand-gold shadow-md shadow-brand-gold/20'
                        : 'bg-white text-brand-dark border-gray-200 group-hover:border-brand-gold group-hover:text-brand-gold'
                    }`}>
                      {dayNum}
                    </div>

                    {/* Title */}
                    <div className="flex-grow min-w-0">
                      <span className={`text-[10px] font-black uppercase tracking-widest block mb-0.5 transition-colors ${isOpen ? 'text-brand-gold' : 'text-gray-400'}`}>
                        Ден {dayNum}
                      </span>
                      <span className={`font-bold text-base md:text-lg leading-snug transition-colors ${isOpen ? 'text-brand-gold' : 'text-brand-dark group-hover:text-brand-gold'}`}>
                        {day.title}
                      </span>
                    </div>

                    {/* Chevron */}
                    <ChevronDown
                      size={20}
                      className={`shrink-0 transition-all duration-300 ${isOpen ? 'rotate-180 text-brand-gold' : 'text-gray-300 group-hover:text-brand-gold'}`}
                    />
                  </button>

                  {/* Expandable content */}
                  <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-6 md:px-10 pb-7 pt-1">
                      {/* Gold left bar + content */}
                      <div className="ml-[3.75rem] pl-6 border-l-2 border-brand-gold/30">
                        <p className="leading-8 text-[16px] text-gray-600 font-light whitespace-pre-line">
                          {content}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer progress indicator */}
          <div className="px-6 md:px-10 py-4 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
            <div className="flex-grow h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-gold rounded-full transition-all duration-500"
                style={{ width: `${programData.length > 0 ? (openDays.length / programData.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0">
              {openDays.length} / {programData.length} дни
            </span>
          </div>
        </div>
      )}
      {/* ─── КРАЙ НА АКОРДЕОНА ─── */}

      {/* ДОПЪЛНИТЕЛНА ИНФОРМАЦИЯ */}
      {tour.generalInfo && (
        <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-xl border border-gray-100 relative">
          <h2 className="text-3xl md:text-4xl font-serif italic mb-6 text-brand-dark pl-4 border-l-4 border-brand-gold">Допълнителна информация</h2>
          <div className={`relative transition-all duration-700 overflow-hidden ${!isInfoExpanded ? 'max-h-48' : 'max-h-[10000px]'}`}>
            <p className="leading-relaxed whitespace-pre-wrap text-[16px] text-gray-600 font-light">{tour.generalInfo}</p>
            {!isInfoExpanded && <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent z-20"></div>}
          </div>
          <button
            onClick={() => setIsInfoExpanded(!isInfoExpanded)}
            className="mt-6 flex items-center gap-2 text-brand-gold font-bold text-xs uppercase tracking-widest hover:text-brand-dark transition-colors relative z-30"
          >
            {isInfoExpanded ? <>Скрий информацията <ChevronUp size={14}/></> : <>Виж цялата информация <ChevronDown size={14}/></>}
          </button>
        </div>
      )}

      {/* GALLERY */}
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
              <button
                onClick={() => setIsGalleryExpanded(!isGalleryExpanded)}
                className="text-sm font-bold uppercase tracking-wider text-gray-500 hover:text-brand-gold flex items-center gap-1"
              >
                {isGalleryExpanded
                  ? <>Скрий галерията <ChevronUp size={16}/></>
                  : <>Виж още {galleryImages.length - 2} снимки <ChevronDown size={16}/></>}
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
