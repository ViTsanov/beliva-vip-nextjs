"use client";

import { useCallback, useEffect, useState } from 'react';

// Любими държави — пазят се в браузъра, до любимите екскурзии (beliva_favorites). Сърцето в героя на
// /destinations/<държава> и на картите „Още дестинации“ ги добавя; показват се на /favorites, а бройката
// в менюто е сборът от двете. Записваме и снимка/брой/цена, за да се покаже картата без заявка към базата.
export const FAVORITE_COUNTRIES_KEY = 'beliva_favorite_countries';

export interface FavoriteCountry {
  slug: string;
  name: string;
  img?: string;
  region?: string;
  tours?: number;
  price?: string;
}

export function readFavoriteCountries(): FavoriteCountry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITE_COUNTRIES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((c) => c && typeof c.slug === 'string') : [];
  } catch {
    return [];
  }
}

function writeFavoriteCountries(list: FavoriteCountry[]) {
  try {
    localStorage.setItem(FAVORITE_COUNTRIES_KEY, JSON.stringify(list));
  } catch { /* частен прозорец или пълна памет — сърцето просто не се запомня */ }
  // Същите събития като при екскурзиите — менюто и другите сърца на страницата се обновяват веднага
  window.dispatchEvent(new Event('favoritesUpdated'));
  window.dispatchEvent(new Event('storage'));
}

export function removeFavoriteCountry(slug: string) {
  writeFavoriteCountries(readFavoriteCountries().filter((c) => c.slug !== slug));
}

// Списъкът и превключване. На сървъра и при хидратацията списъкът е празен — сърцата светват след монтиране,
// за да съвпадне HTML-ът от сървъра с първото рисуване в браузъра.
export function useFavoriteCountries() {
  const [list, setList] = useState<FavoriteCountry[]>([]);

  useEffect(() => {
    const sync = () => setList(readFavoriteCountries());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('favoritesUpdated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('favoritesUpdated', sync);
    };
  }, []);

  const toggle = useCallback((country: FavoriteCountry) => {
    const current = readFavoriteCountries();
    const next = current.some((c) => c.slug === country.slug)
      ? current.filter((c) => c.slug !== country.slug)
      : [...current, country];
    setList(next);
    writeFavoriteCountries(next);
  }, []);

  const isFavorite = useCallback((slug: string) => list.some((c) => c.slug === slug), [list]);

  return { list, toggle, isFavorite };
}
