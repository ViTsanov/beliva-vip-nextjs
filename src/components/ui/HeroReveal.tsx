"use client";

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { isClientNavigation } from '@/lib/heroPhoto';

// Предпазна мрежа: героят се показва наведнъж — снимката и текстът заедно. Обикновено снимката вече е готова
// (HeroPreloader отваря тур/държава чак когато е свалена). Ако не е — напр. Назад, търсачката или линк без снимка —
// след вътрешен клик съдържанието е скрито (остава тъмният фон на героя), докато снимката (img[data-hero-photo]) се
// зареди, най-много 1.2 s. При първо посещение не чака нищо — HTML-ът от сървъра се показва веднага.
// display: contents — обвивката не е кутия и не пипа подредбата; крие се всяко дете поотделно (виж globals.css).
const MAX_WAIT = 1200;

export default function HeroReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // При хидратацията на първата страница isClientNavigation() е false — също като на сървъра
  const [ready, setReady] = useState(() => !isClientNavigation());

  useEffect(() => {
    if (ready) return;
    const show = () => setReady(true);
    const img = ref.current?.querySelector<HTMLImageElement>('img[data-hero-photo]');
    if (!img || (img.complete && img.naturalWidth > 0)) {
      const raf = requestAnimationFrame(show);
      return () => cancelAnimationFrame(raf);
    }
    img.addEventListener('load', show, { once: true });
    img.addEventListener('error', show, { once: true });
    const t = setTimeout(show, MAX_WAIT);
    return () => {
      img.removeEventListener('load', show);
      img.removeEventListener('error', show);
      clearTimeout(t);
    };
  }, [ready]);

  return (
    <div ref={ref} data-hero-reveal data-ready={ready} className="contents">
      {children}
    </div>
  );
}
