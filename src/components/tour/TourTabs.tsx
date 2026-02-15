"use client";

import { useState } from 'react';
import { ITour } from "@/types";
import { Calendar, Clock, Globe, Euro, CalendarDays, ChevronDown, ChevronUp, Image as ImageIcon, Map } from 'lucide-react';

interface TourTabsProps {
  tour: ITour;
  galleryImages: string[];
  onImageClick: (index: number) => void;
}

export default function TourTabs({ tour, galleryImages, onImageClick }: TourTabsProps) {
  // State за разпъване на описанието (Впечатления)
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  
  // State за разпъване на програмата (Ден по ден)
  const [isProgramExpanded, setIsProgramExpanded] = useState(false);

  // State за разпъване на галерията на мобилни
  const [isGalleryExpanded, setIsGalleryExpanded] = useState(false);

  const hasMultipleDates = tour.dates && tour.dates.length > 1;
  const formatDate = (dateStr: string) => dateStr.split('-').reverse().join('.');
  const programData = tour.itinerary || tour.program || [];

  // Логика за показване на програмата: Ако е разпъната показва всичко, ако не - първите 3 дни
  const visibleProgram = isProgramExpanded ? programData : programData.slice(0, 3);
  const hasHiddenDays = programData.length > 3;

  // Логика за показване на галерията:
  // На desktop (md) винаги показваме всичко (или може да сложим лимит и там).
  // На mobile (default) показваме 2 снимки, ако не е разпъната.
  // За да работи responsive логиката в JS, най-чисто е с CSS класове за скриване, 
  // но тук ще използвам slice за по-лесно управление на бутона.
  
  return (
    <div className="space-y-12">
        {/* INFO GRID (Без промяна) */}
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
                {tour.duration} {tour.nights && `/ ${tour.nights} Нощувки`}
            </p>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-xl border-b-4 border-brand-dark group hover:-translate-y-1 transition-all">
            <div className="mb-2 text-gray-400 group-hover:text-brand-gold transition-colors"><Globe size={24}/></div>
            <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">Държава</p>
            <p className="font-bold text-brand-dark text-sm md:text-lg">{tour.country}</p>
            </div>

            <div className="bg-brand-dark p-5 rounded-3xl shadow-xl border-b-4 border-brand-gold group hover:-translate-y-1 transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Euro size={64} className="text-white"/></div>
            <div className="mb-2 text-brand-gold"><Euro size={24}/></div>
            <p className="text-[10px] uppercase font-black text-brand-gold/70 tracking-widest mb-1">Цена от</p>
            <p className="font-bold text-white text-lg md:text-xl">{tour.price}</p>
            </div>
        </div>

        {/* DATES (Без промяна) */}
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

        {/* DESCRIPTION (Впечатления) - С разпъване */}
        {tour.generalInfo && (
            <div className="bg-[#fffdf5] p-8 md:p-12 rounded-[2.5rem] shadow-lg border border-brand-gold/10 relative">
            <div className="absolute top-6 left-8 text-6xl text-brand-gold/10 font-serif italic">"</div>
            <h2 className="text-3xl font-serif italic mb-6 text-brand-dark relative z-10">Впечатления</h2>
            <div className={`relative transition-all duration-700 overflow-hidden ${!isDescExpanded ? 'max-h-40' : 'max-h-[5000px]'}`}>
                <p className="leading-relaxed whitespace-pre-wrap text-[18px] text-gray-700 font-light relative z-10">{tour.generalInfo}</p>
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

        {/* PROGRAM (Ден по ден) - С разпъване */}
        <div className="bg-white p-4 md:p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-dark via-brand-gold to-brand-dark"></div>
            
            <div className="text-center mb-12 mt-4">
                <span className="text-brand-gold text-xs font-black uppercase tracking-[0.3em] block mb-3">Ден по ден</span>
                <h2 className="text-4xl md:text-5xl font-serif italic text-brand-dark">Програма</h2>
            </div>

            <div className="space-y-8 relative">
                {/* Вертикална линия */}
                <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-brand-gold/30 md:left-[27px]"></div>

                {visibleProgram.map((day: any, index: number) => (
                    <div key={index} className="relative pl-14 md:pl-20 group animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="absolute left-0 top-0 w-10 h-10 md:w-14 md:h-14 bg-brand-dark text-brand-gold rounded-full flex items-center justify-center font-serif font-bold text-lg md:text-xl shadow-lg border-4 border-white z-10 group-hover:bg-brand-gold group-hover:text-brand-dark transition-colors duration-300">
                        {day.day || index + 1}
                    </div>
                    
                    <div className="bg-gray-50 hover:bg-white p-6 md:p-8 rounded-3xl border-l-4 border-brand-gold shadow-sm hover:shadow-xl transition-all duration-300">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2 block">Ден {day.day || index + 1}</span>
                        <h3 className="text-xl md:text-2xl font-bold text-brand-dark mb-4 group-hover:text-brand-gold transition-colors">{day.title}</h3>
                        <p className="leading-7 text-[16px] text-gray-600 font-normal whitespace-pre-line">
                            {day.content || day.desc}
                        </p>
                    </div>
                    </div>
                ))}
            </div>

            {/* Градиент и бутон за разпъване на програмата */}
            {hasHiddenDays && (
                <div className={`relative mt-8 pt-8 ${!isProgramExpanded ? '-mt-32 pt-32 bg-gradient-to-t from-white via-white/90 to-transparent z-20' : ''}`}>
                    <div className="flex justify-center">
                        <button 
                            onClick={() => setIsProgramExpanded(!isProgramExpanded)} 
                            className="group flex flex-col items-center gap-2 text-brand-dark hover:text-brand-gold transition-colors"
                        >
                             <span className="px-8 py-3 bg-brand-gold text-brand-dark font-bold rounded-full shadow-lg group-hover:scale-105 transition-transform flex items-center gap-2">
                                {isProgramExpanded ? (
                                    <>Скрий програмата <ChevronUp size={18}/></>
                                ) : (
                                    <>ВИЖ ЦЯЛАТА ПРОГРАМА ({programData.length} дни) <ChevronDown size={18}/></>
                                )}
                             </span>
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* GALLERY - С мобилно ограничение */}
        {galleryImages.length > 0 && (
            <div className="space-y-6">
                <h2 className="text-3xl font-serif italic text-brand-dark pl-4 border-l-4 border-brand-gold">Галерия</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {galleryImages.map((url: string, index: number) => {
                        // Логика за скриване:
                        // Ако е mobile (чрез клас hidden md:block) и индекс >= 2 и не е разпънато -> скрий
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

                {/* Бутон за разпъване на галерията (САМО ЗА МОБИЛНИ) */}
                {galleryImages.length > 2 && (
                    <div className="md:hidden flex justify-center mt-4">
                         <button 
                            onClick={() => setIsGalleryExpanded(!isGalleryExpanded)}
                            className="text-sm font-bold uppercase tracking-wider text-gray-500 hover:text-brand-gold flex items-center gap-1"
                        >
                            {isGalleryExpanded ? (
                                <>Скрий галерията <ChevronUp size={16}/></>
                            ) : (
                                <>Виж още {galleryImages.length - 2} снимки <ChevronDown size={16}/></>
                            )}
                        </button>
                    </div>
                )}
            </div>
        )}
    </div>
  );
}