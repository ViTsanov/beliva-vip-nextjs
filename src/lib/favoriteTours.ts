"use client";

import { useCallback, useEffect, useState } from 'react';

// Любими екскурзии — същият запис в браузъра (beliva_favorites), който ползват ToursGrid, страницата на тура
// и /favorites. id е tourId (или id на документа), както там.
const KEY = 'beliva_favorites';

export interface FavoriteTour {
  id: string;
  title: string;
  img?: string;
  price?: string;
  country?: string | string[];
  date?: string;
}

function read(): FavoriteTour[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useFavoriteTours() {
  const [list, setList] = useState<FavoriteTour[]>([]);

  useEffect(() => {
    const sync = () => setList(read());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('favoritesUpdated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('favoritesUpdated', sync);
    };
  }, []);

  const toggle = useCallback((tour: FavoriteTour) => {
    const current = read();
    const next = current.some((t) => t.id === tour.id) ? current.filter((t) => t.id !== tour.id) : [...current, tour];
    setList(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* без памет — не се запомня */ }
    window.dispatchEvent(new Event('favoritesUpdated'));
    window.dispatchEvent(new Event('storage'));
  }, []);

  const isFavorite = useCallback((id: string) => list.some((t) => t.id === id), [list]);

  return { toggle, isFavorite };
}
