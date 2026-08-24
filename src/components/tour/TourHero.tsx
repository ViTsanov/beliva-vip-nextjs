"use client";

import { useState } from 'react';
import { ITour } from "@/types";
import { ArrowLeft, MapPin, Heart, Flame } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Badge from '@/components/ui/Badge';
import { BLUR_PLACEHOLDER } from '@/lib/blurPlaceholder';
import { isOperatorHotlink } from '@/lib/operatorImageDomains';

interface TourHeroProps {
  tour: ITour;
  isFavorite: boolean;
  toggleFavorite: () => void;
}

export default function TourHero({ tour, isFavorite, toggleFavorite }: TourHeroProps) {
  const router = useRouter();
  const isPromoActive = tour.isPromo && tour.discountPrice;
  const [imgError, setImgError] = useState(false);
  // Снимка от чужд туроператорски сайт — не я рендираме директно като hero
  // (юридически риск + може да се счупи всеки момент, ако операторът я премести/изтрие).
  const heroImg = tour.img && !isOperatorHotlink(tour.img) ? tour.img : null;

  return (
    <div className="relative w-full bg-brand-dark overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent z-10 opacity-90"></div>
      {heroImg && !imgError ? (
        <Image 
          src={heroImg} 
          alt={tour.title}
          fill
          priority 
          placeholder="blur"
          blurDataURL={BLUR_PLACEHOLDER}
          sizes="100vw"
          className="object-cover" 
          onError={() => setImgError(true)}
        />
      ) : (
        // Снимката липсва или връща 404 (напр. изтрита от медийната библиотека) — показваме брандиран градиент вместо счупена снимка
        <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-dark to-black" />
      )}
      
      <button 
          onClick={() => router.back()} 
          className="absolute top-28 left-6 z-40 p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 active:scale-90 transition-all lg:hidden shadow-lg border border-white/20"
      >
          <ArrowLeft size={24} />
      </button>

      <button 
          onClick={toggleFavorite}
          className="absolute top-28 right-6 md:top-24 md:right-12 p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full hover:bg-white hover:text-red-500 active:scale-90 transition-all group z-30 shadow-lg"
          title={isFavorite ? "Премахни от любими" : "Добави в любими"}
      >
          <Heart 
              size={24} 
              className={`transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white group-hover:text-red-500'}`}
          />
      </button>

      <div className="relative z-20 flex flex-col items-center justify-center text-center px-6 pt-28 pb-12 min-h-[80vh]">
        
        <div className="mb-6 flex flex-wrap items-center justify-center gap-3 animate-in slide-in-from-bottom duration-700 fade-in">
          
          {/* СТАТУС НА ГРУПАТА */}
          {tour.groupStatus === 'confirmed' && <Badge variant="groupStatus" iconSize={14} className="px-4 py-2 text-[10px]" />}
          {tour.groupStatus === 'last-places' && <span className="px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] shadow-2xl backdrop-blur-md border border-white/20 bg-amber-600 text-white">● Последни места</span>}
          {tour.groupStatus === 'sold-out' && <span className="px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] shadow-2xl backdrop-blur-md border border-white/20 bg-rose-600 text-white">● Изчерпана</span>}
          {tour.groupStatus === 'active' && <span className="px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] shadow-2xl backdrop-blur-md border border-white/20 bg-brand-gold text-brand-dark">● Оформяща се група</span>}

          {/* ПРОМО ЕТИКЕТ */}
          {isPromoActive && (
            <Badge 
              variant="promo" 
              iconSize={14} 
              className="px-4 py-2 text-[10px]"
              text={tour.promoLabel}
              customBgColor={tour.promoBgColor}
              customTextColor={tour.promoTextColor}
              customEffect={tour.promoEffect}
            />
          )}

          {/* СПЕЦИАЛНИ КАТЕГОРИИ (Добавяме ги и тук, за да се виждат вътре в самата екскурзия) */}
          {tour.categories?.includes('Почивка в Турция') && <Badge variant="turkey" iconSize={14} className="px-4 py-2 text-[10px]" />}
          {tour.categories?.includes('Водена от ПОЛИ') && <Badge variant="poli" iconSize={14} className="px-4 py-2 text-[10px]" />}
          
        </div>
        
        <h1 className={`font-serif italic text-white drop-shadow-2xl mb-8 max-w-5xl leading-tight animate-in slide-in-from-bottom duration-1000 delay-100 fade-in ${
          (tour.title?.length || 0) > 60 ? 'text-3xl md:text-5xl lg:text-6xl' :
          (tour.title?.length || 0) > 40 ? 'text-3xl md:text-6xl lg:text-7xl' :
          'text-4xl md:text-7xl lg:text-8xl'
        }`}>
          {tour.title}
        </h1>

        {/* МАРШРУТ — скрит на mobile (бута заглавието), видимен само на md+ — или показан като truncate с max-w */}
        {tour.route && (
           <div className="hidden md:flex items-center gap-3 text-brand-gold bg-black/40 backdrop-blur-md px-6 py-3.5 rounded-full border border-brand-gold/30 animate-in slide-in-from-bottom duration-1000 delay-200 fade-in shadow-[0_10px_30px_rgba(0,0,0,0.5)] max-w-[90vw]">
              <MapPin size={18} className="opacity-90 shrink-0" />
              <span className="font-bold tracking-[0.2em] uppercase text-[11px] md:text-xs truncate">
                {tour.route}
              </span>
           </div>
        )}

        {/* МАРШРУТ mobile — много по-компактен пил, видимен само на mobile */}
        {tour.route && (
          <div className="flex md:hidden items-center gap-2 text-brand-gold/80 bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-brand-gold/20 max-w-[85vw]">
            <MapPin size={13} className="opacity-80 shrink-0" />
            <span className="font-bold uppercase text-[10px] truncate">{tour.route}</span>
          </div>
        )}
      </div>
    </div>
  );
}