"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, getDocs } from 'firebase/firestore'; 
import { MapPin, Calendar, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { ITour } from "@/types";

export default function SimilarTours({ currentTour }: { currentTour: ITour }) {
  const [similarTours, setSimilarTours] = useState<ITour[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null); // Реф за контейнера

  useEffect(() => {
    const fetchSimilarTours = async () => {
      if (!currentTour) return;

      try {
        const toursRef = collection(db, "tours");
        let combinedTours: any[] = [];

        // 1. Търсим от същата държава
        const countryQuery = query(
          toursRef, 
          where("status", "==", "public"),
          where("country", "==", currentTour.country),
          limit(4) 
        );
        const countrySnapshot = await getDocs(countryQuery);
        const countryTours = countrySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((t: any) => t.tourId !== currentTour.id && t.id !== currentTour.id);

        combinedTours = [...countryTours];

        // 2. Допълваме от континента ако няма достатъчно
        if (combinedTours.length < 3) {
          const continentQuery = query(
            toursRef,
            where("status", "==", "public"),
            where("continent", "==", currentTour.continent),
            limit(10)
          );
          const continentSnapshot = await getDocs(continentQuery);
          const continentTours = continentSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((t: any) => t.tourId !== currentTour.id && t.id !== currentTour.id && t.country !== currentTour.country); 

          combinedTours = [...combinedTours, ...continentTours];
        }

        setSimilarTours(combinedTours.slice(0, 3) as ITour[]);

      } catch (error) {
        console.error("Error fetching similar tours:", error);
      }
    };

    fetchSimilarTours();
  }, [currentTour]);

  // Функция за скролиране с бутоните
  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { current } = scrollContainerRef;
      const scrollAmount = current.clientWidth; // Скролваме с ширината на един екран
      
      current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (similarTours.length === 0) return null;

  return (
    <section className="mt-24 pt-16 border-t border-brand-gold/10 container mx-auto px-6 mb-20">
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
          <div>
              <span className="text-brand-gold font-bold uppercase tracking-widest text-xs mb-2 block">
              Още вдъхновение
              </span>
              <h2 className="text-3xl md:text-4xl font-serif text-brand-dark">
              Вижте още от <span className="italic text-brand-gold">{currentTour.country}</span> и региона
              </h2>
          </div>
          <Link 
              href={`/?continent=${encodeURIComponent(currentTour.continent)}`}
              className="hidden md:flex group items-center gap-2 text-brand-dark font-bold hover:text-brand-gold transition-colors"
          >
              Всички предложения <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* КОНТЕЙНЕР ЗА КАРТИТЕ 
            - На мобилни (default): flex, overflow-x-auto (скрол), snap-x (залепяне)
            - На desktop (md): grid, grid-cols-3 (решетка)
        */}
        <div 
            ref={scrollContainerRef}
            className="flex md:grid md:grid-cols-3 gap-4 md:gap-8 overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-hide pb-4"
        >
          {similarTours.map((tour) => (
              <Link 
              key={tour.id} 
              href={`/tour/${tour.tourId || tour.id}`}
              // min-w-full прави картата да заема целия екран на мобилно
              // snap-center центрира картата при спиране на скрола
              className="min-w-full md:min-w-0 snap-center group bg-white rounded-[2rem] overflow-hidden border border-brand-gold/10 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
              >
              <div className="relative h-60 md:h-60 overflow-hidden">
                  <Image
                  src={tour.img}
                  alt={tour.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                  <div className="absolute bottom-4 left-4 text-white">
                  <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider mb-1 text-brand-gold">
                      <MapPin size={12} /> {tour.country}
                  </div>
                  <p className="font-serif text-xl">{tour.title}</p>
                  </div>
              </div>

              <div className="p-6 flex flex-col flex-grow">
                  <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-50">
                      <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Дата</span>
                      <div className="flex items-center gap-1 text-sm font-bold text-gray-700">
                          <Calendar size={14} className="text-brand-gold" />
                          {tour.date ? tour.date.split('-').reverse().join('.') : 'Очаквайте'}
                      </div>
                      </div>
                      <div className="text-right">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Цена от</span>
                      <div className="text-xl font-serif font-bold text-brand-gold">
                          {tour.price}
                      </div>
                      </div>
                  </div>
              </div>
              </Link>
          ))}
        </div>

        {/* БУТОНИ ЗА КОНТРОЛ (САМО ЗА МОБИЛНИ)
            Показват се само ако сме на мобилно устройство (md:hidden)
        */}
        <div className="flex md:hidden justify-between items-center mt-4">
             {/* Индикатор/Текст или просто празно пространство */}
             <div className="flex gap-2 justify-center w-full">
                <button 
                    onClick={() => scroll('left')}
                    className="p-3 rounded-full bg-gray-100 hover:bg-brand-gold hover:text-white transition-colors" aria-label="Предишна статия"
                >
                    <ChevronLeft size={20} />
                </button>
                <button 
                    onClick={() => scroll('right')}
                    className="p-3 rounded-full bg-gray-100 hover:bg-brand-gold hover:text-white transition-colors" aria-label="Следваща статия"
                >
                    <ChevronRight size={20} />
                </button>
             </div>
             
             {/* Линк "Всички" за мобилно */}
             <div className="absolute right-6 -mt-16 md:static md:mt-0">
                 {/* Ако искате линкът "Всички" да е достъпен и на мобилно, може да го сложите тук или да го оставите скрит */}
             </div>
        </div>
        
        {/* Линк "Всички" за мобилно (показваме го долу центрирано) */}
        <div className="md:hidden text-center mt-8">
            <Link 
              href={`/?continent=${encodeURIComponent(currentTour.continent)}`}
              className="inline-flex items-center gap-2 text-brand-dark font-bold hover:text-brand-gold transition-colors text-sm uppercase tracking-wider"
            >
              Всички предложения <ArrowRight className="w-4 h-4" />
            </Link>
        </div>
    </section>
  );
}