"use client";

import { ITour } from "@/types";
import { ArrowLeft, MapPin, Heart, Flame } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TourHeroProps {
  tour: ITour;
  isFavorite: boolean;
  toggleFavorite: () => void;
}

export default function TourHero({ tour, isFavorite, toggleFavorite }: TourHeroProps) {
  const router = useRouter();
  const isPromoActive = tour.isPromo && tour.discountPrice;

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
        
        <div className="mb-6 flex flex-wrap items-center justify-center gap-3 animate-in slide-in-from-bottom duration-700 fade-in">
          {/* СТАТУС НА ГРУПАТА */}
          <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] shadow-2xl backdrop-blur-md border border-white/20 ${
            tour.groupStatus === 'confirmed' ? 'bg-emerald-600 text-white' : 
            tour.groupStatus === 'last-places' ? 'bg-amber-600 text-white' : 
            tour.groupStatus === 'sold-out' ? 'bg-rose-600 text-white' : 'bg-brand-gold text-brand-dark'
          }`}>
            {tour.groupStatus === 'confirmed' ? '● Потвърдена група' : 
             tour.groupStatus === 'last-places' ? '● Последни места' : 
             tour.groupStatus === 'sold-out' ? '● Изчерпана' : '● Оформяща се група'}
          </span>

          {/* ПРОМО ЕТИКЕТ */}
          {isPromoActive && (
             <span 
               className="px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] shadow-2xl backdrop-blur-md border border-white/20 flex items-center gap-1.5"
               style={{ backgroundColor: tour.promoBgColor || '#dc2626', color: tour.promoTextColor || '#ffffff' }}
             >
               <Flame size={14} style={{ color: tour.promoTextColor || '#ffffff' }} /> 
               {tour.promoLabel || 'ПРОМОЦИЯ'}
             </span>
          )}
        </div>
        
        <h1 className="text-4xl md:text-7xl lg:text-8xl font-serif italic text-white drop-shadow-2xl mb-8 max-w-5xl leading-tight animate-in slide-in-from-bottom duration-1000 delay-100 fade-in">
          {tour.title}
        </h1>

        {/* МАРШРУТ - С леко подобрен премиум дизайн */}
        {tour.route && (
           <div className="flex items-center gap-3 text-brand-gold bg-black/40 backdrop-blur-md px-6 py-3.5 rounded-full border border-brand-gold/30 animate-in slide-in-from-bottom duration-1000 delay-200 fade-in shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <MapPin size={18} className="opacity-90" />
              <span className="font-bold tracking-[0.2em] uppercase text-[11px] md:text-xs">
                {tour.route}
              </span>
           </div>
        )}
      </div>
    </div>
  );
}