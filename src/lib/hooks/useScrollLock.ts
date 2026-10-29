import { useEffect } from 'react';
import { isModalNavigationPending } from './useBackToClose';

// Блокира скрола на страницата зад отворен плаващ панел (филтри, търсачка, запитване, ревюта…), докато `locked` е true.
// Скролът остава възможен само вътре в самия панел (той е с overscroll-contain).
//
// - Само overflow: hidden не стига: Safari на iPhone (и браузърът във Facebook) го пренебрегва при скрол с пръст и
//   страницата отдолу продължава да се мести. Затова <body> се „закрепва“ (position: fixed) на текущото място, а при
//   затваряне връщаме точно същата позиция — без плавно превъртане (behavior: instant), без скок.
// - Ако страницата има видима лента за скрол (desktop), добавяме еднакъв padding-right, за да не се премества
//   съдържанието, когато лентата изчезне.
// - Брояч: два панела един върху друг не освобождават страницата твърде рано. Ако <body> вече е закрепено от друг
//   (мобилното меню в Navbar прави същото), не го пипаме — то пази своята позиция.
// - Затваряне с линк към друга страница (markModalNavigation): позицията не се връща — иначе се надпреварва
//   със скрола към върха на новата страница.
let locks = 0;
let saved: { y: number; pinned: boolean; html: Partial<CSSStyleDeclaration>; body: Partial<CSSStyleDeclaration> } | null = null;

function lock() {
  if (locks++ > 0) return;
  const html = document.documentElement;
  const body = document.body;
  const y = window.scrollY;
  const scrollbarWidth = window.innerWidth - html.clientWidth;
  const pinned = body.style.position !== 'fixed';
  saved = {
    y,
    pinned,
    html: { overflow: html.style.overflow, paddingRight: html.style.paddingRight },
    body: { position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, width: body.style.width },
  };
  html.style.overflow = 'hidden';
  if (scrollbarWidth > 0) html.style.paddingRight = `${scrollbarWidth}px`;
  if (pinned) {
    body.style.position = 'fixed';
    body.style.top = `-${y}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
  }
}

function unlock() {
  if (--locks > 0 || !saved) return;
  const { y, pinned, html, body } = saved;
  saved = null;
  Object.assign(document.documentElement.style, html);
  if (!pinned) return;
  Object.assign(document.body.style, body);
  if (!isModalNavigationPending()) window.scrollTo({ top: y, left: 0, behavior: 'instant' });
}

export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    lock();
    return unlock;
  }, [locked]);
}
