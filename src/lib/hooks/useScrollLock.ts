import { useEffect } from 'react';

// Блокира скрола на страницата зад отворен плаващ панел (напр. падащите филтри), докато `locked` е true.
// Скролът остава възможен само вътре в самия панел (той е с overscroll-contain).
//
// - Заключваме <html> (не <body>), защото именно html е скрол контейнерът на страницата. Така позицията на скрола
//   се запазва сама и страницата не „скача“ нагоре при отваряне/затваряне.
// - Ако страницата има видима лента за скрол (desktop), добавяме еднакъв padding-right, за да не се премества
//   съдържанието, когато лентата изчезне.
// - Връщаме предишните стойности, а не празен низ — така не чупим друг код, който вече е сложил overflow.
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const html = document.documentElement;
    const scrollbarWidth = window.innerWidth - html.clientWidth;
    const prevOverflow = html.style.overflow;
    const prevPaddingRight = html.style.paddingRight;

    html.style.overflow = 'hidden';
    if (scrollbarWidth > 0) html.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      html.style.overflow = prevOverflow;
      html.style.paddingRight = prevPaddingRight;
    };
  }, [locked]);
}
