"use client";

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

// Тънка златна лента най-горе, докато се отваря друга страница. Без нея след натискане на линк 1–2 секунди не се
// случваше нищо видимо (новата страница идва от сървъра) и посетителят не беше сигурен, че е натиснал.
// Тръгва при натискане на вътрешен линк (или startNavigationProgress() преди router.push към друга страница) и
// изчезва, щом адресът се смени. Предпазно — сама се скрива след 15 s.
const START_EVENT = 'beliva:navigation-start';

// Преди router.push(href): лентата тръгва само ако href е друга страница (не филтър на същата)
export function startNavigationProgress(href: string) {
  if (new URL(href, location.href).pathname !== location.pathname) window.dispatchEvent(new Event(START_EVENT));
}

// Натискането води ли към ДРУГА страница на сайта (а не нов таб, котва на същата страница, файл и т.н.)
function isPageLink(e: MouseEvent): boolean {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return false;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return false;
  if (/\.(pdf|jpg|png|webp|zip)$/i.test(url.pathname)) return false;
  return url.pathname !== location.pathname;
}

export default function NavigationProgress() {
  const pathname = usePathname();
  // От коя страница е тръгнало отварянето. Докато адресът е същият — зарежда; щом се смени — новата страница е тук.
  const [from, setFrom] = useState<string | null>(null);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loading = from !== null && from === pathname;
  const done = from !== null && from !== pathname;

  useEffect(() => {
    const start = () => {
      setFrom(location.pathname);
      if (safety.current) clearTimeout(safety.current);
      safety.current = setTimeout(() => setFrom(null), 15000);
    };
    const onClick = (e: MouseEvent) => { if (isPageLink(e)) start(); };
    // Фаза „capture“ — преди Link да спре събитието; самото навигиране не се пипа
    document.addEventListener('click', onClick, true);
    window.addEventListener(START_EVENT, start);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener(START_EVENT, start);
      if (safety.current) clearTimeout(safety.current);
    };
  }, []);

  // Новата страница е тук: лентата се допълва, избледнява и изчезва
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setFrom(null), 400);
    return () => clearTimeout(t);
  }, [done]);

  if (!loading && !done) return null;
  return (
    <div
      role="progressbar"
      aria-label="Зареждане на страницата"
      aria-busy={loading}
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px]"
    >
      <div className={`nav-progress h-full bg-brand-gold shadow-[0_0_8px_rgba(212,175,55,0.8)] ${done ? 'nav-progress-done' : ''}`} />
    </div>
  );
}
