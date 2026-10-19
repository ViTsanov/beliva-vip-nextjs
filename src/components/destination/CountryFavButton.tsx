"use client";

import { Heart } from 'lucide-react';
import { useFavoriteCountries, type FavoriteCountry } from '@/lib/favoriteCountries';

// Сърцето „Запази <държава>“ — в героя (с текст) или в ъгъла на карта от „Още дестинации“ (само икона).
export default function CountryFavButton({ country, variant }: { country: FavoriteCountry; variant: 'hero' | 'card' }) {
  const { isFavorite, toggle } = useFavoriteCountries();
  const on = isFavorite(country.slug);

  if (variant === 'card') {
    return (
      <button
        type="button"
        onClick={() => toggle(country)}
        aria-pressed={on}
        aria-label={on ? `Премахни ${country.name} от любими` : `Запази ${country.name} в любими`}
        className="absolute right-3.5 top-3.5 z-[2] inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-brand-dark transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-brand-gold"
      >
        <Heart size={19} aria-hidden="true" className={on ? 'fill-rose-600 text-rose-600' : ''} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggle(country)}
      aria-pressed={on}
      className="inline-flex min-h-[52px] items-center gap-2.5 rounded-full border border-white/45 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-brand-gold"
    >
      <Heart size={18} aria-hidden="true" className={on ? 'fill-rose-600 text-rose-600' : ''} />
      {on ? 'Запазена' : `Запази ${country.name}`}
    </button>
  );
}
