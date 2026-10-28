"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { markHydrated, preloadHeroPhoto } from '@/lib/heroPhoto';
import { startNavigationProgress } from '@/components/NavigationProgress';

// Тур или държава се отваря чак когато е готова цялата — снимката на героя е свалена и данните са дошли. Дотогава
// посетителят остава на текущата страница и вижда златната лента (NavigationProgress), без скелет и без страница,
// на която снимката идва секунда след текста.
//  - Докосване / посочване на линка: тегли данните на страницата (router.prefetch) и голямата снимка на героя.
//  - Клик: лентата тръгва, изчакваме снимката (най-много MAX_WAIT) и чак тогава отваряме страницата. Данните ги
//    чака самият Next — без loading.tsx старата страница остава на екрана, докато новата е готова.
// Снимката на картата (тур, държава) е същата като героя на страницата ѝ — взимаме я от <img> в картата. Линк без
// снимка (обикновен текст) се отваря както винаги, пак с лентата.
const TARGET = /^\/(tour|destinations)\/[^/]+\/?$/;
const MAX_WAIT = 4000;

function photoOf(a: HTMLAnchorElement): string | null {
  const card = a.closest('article, li') || a;
  const img = card.querySelector('img') || a.querySelector('img');
  if (!img) return null;
  const src = img.currentSrc || img.src;
  if (!src) return null;
  const url = new URL(src, location.href);
  // /_next/image?url=<оригинал>&w=… — ни трябва оригиналът
  return url.pathname === '/_next/image' ? url.searchParams.get('url') : src;
}

export default function HeroPreloader() {
  const router = useRouter();

  useEffect(() => {
    markHydrated();
    let hoverTimer: ReturnType<typeof setTimeout> | null = null;
    let latestClick = 0;

    const linkFrom = (e: Event) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return null;
      const url = new URL(a.href, location.href);
      return url.origin === location.origin && TARGET.test(url.pathname) && url.pathname !== location.pathname ? a : null;
    };
    const warm = (a: HTMLAnchorElement | null) => {
      if (!a) return;
      router.prefetch(a.pathname);
      const src = photoOf(a);
      if (src) void preloadHeroPhoto(src);
    };

    // Докосване / натискане / клавиатура — веднага; посочване с мишка — след кратко задържане (не при всяко минаване)
    const now = (e: Event) => warm(linkFrom(e));
    const hover = (e: Event) => {
      if (hoverTimer) clearTimeout(hoverTimer);
      const a = linkFrom(e);
      if (a) hoverTimer = setTimeout(() => warm(a), 80);
    };

    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = linkFrom(e);
      const src = a && photoOf(a);
      if (!a || !src) return;
      // Спираме отварянето от Link (фаза „capture“ на document — преди React да види клика) и отваряме сами
      e.preventDefault();
      e.stopPropagation();
      const href = a.pathname + a.search + a.hash;
      const click = ++latestClick;
      startNavigationProgress(href);
      router.prefetch(a.pathname);
      Promise.race([preloadHeroPhoto(src), new Promise(r => setTimeout(r, MAX_WAIT))]).then(() => {
        // Междувременно посетителят е натиснал друго — отваряме само последното
        if (click === latestClick) router.push(href);
      });
    };

    document.addEventListener('pointerdown', now, { passive: true });
    document.addEventListener('focusin', now);
    document.addEventListener('mouseover', hover, { passive: true });
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('pointerdown', now);
      document.removeEventListener('focusin', now);
      document.removeEventListener('mouseover', hover);
      document.removeEventListener('click', onClick, true);
      if (hoverTimer) clearTimeout(hoverTimer);
    };
  }, [router]);

  return null;
}
