"use client";

import { ITour } from "@/types";
import { ArrowLeft, MapPin, Heart, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TourHeroProps {
  tour: ITour;
  isFavorite: boolean;
  toggleFavorite: () => void;
}

export default function TourHero({ tour, isFavorite, toggleFavorite }: TourHeroProps) {
  const router = useRouter();

  return (
    <div className="relative h-[80vh] w-full bg-brand-dark overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent z-10 opacity-90"></div>
      <img 
        src={tour.img} 
        className="w-full h-full object-cover" 
        alt={tour.title} 
      />
      
      <button 
          onClick={() => router.back()} 
          className="absolute top-28 left-6 z-40 p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all lg:hidden shadow-lg border border-white/20"
      >
          <ArrowLeft size={24} />
      </button>

      <button 
          onClick={toggleFavorite}
          className="absolute top-28 right-6 md:top-24 md:right-12 p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full hover:bg-white hover:text-red-500 transition-all group z-30 shadow-lg"
          title={isFavorite ? "Премахни от любими" : "Добави в любими"}
      >
          <Heart 
              size={24} 
              className={`transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white group-hover:text-red-500'}`}
          />
      </button>

      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-6">
        <div className="mb-6 animate-in slide-in-from-bottom duration-700 fade-in">
          <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] shadow-2xl backdrop-blur-md border border-white/20 ${
            tour.groupStatus === 'confirmed' ? 'bg-emerald-600 text-white' : 
            tour.groupStatus === 'last-places' ? 'bg-amber-600 text-white' : 
            tour.groupStatus === 'sold-out' ? 'bg-rose-600 text-white' : 'bg-brand-gold text-brand-dark'
          }`}>
            {tour.groupStatus === 'confirmed' ? '● Потвърдена група' : 
             tour.groupStatus === 'last-places' ? '● Последни места' : 
             tour.groupStatus === 'sold-out' ? '● Изчерпана' : '● Оформяща се група'}
          </span>
        </div>
        
        <h1 className="text-4xl md:text-7xl lg:text-8xl font-serif italic text-white drop-shadow-2xl mb-8 max-w-5xl leading-tight animate-in slide-in-from-bottom duration-1000 delay-100 fade-in">
          {tour.title}
        </h1>

        {tour.route && (
           <div className="flex items-center gap-2 text-brand-gold/90 bg-black/60 backdrop-blur-sm px-6 py-3 rounded-full border border-white/10 animate-in slide-in-from-bottom duration-1000 delay-200 fade-in">
              <MapPin size={16} />
              <span className="font-bold tracking-[0.15em] uppercase text-[11px] md:text-xs">
                {tour.route}
              </span>
           </div>
        )}
      </div>
    </div>
  );
}