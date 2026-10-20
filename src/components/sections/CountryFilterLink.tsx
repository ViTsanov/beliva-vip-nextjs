"use client";

import type { CSSProperties, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// Линк, който филтрира каталога на началната страница по държава, без да я презарежда: сменя ?country= на място
// и плавно скролва до каталога (#tours-grid). Адресът е истински (/?country=…#tours-grid), така че нов раздел
// и Google работят нормално. Ползва се в „Дестинации за всеки вкус“.
export default function CountryFilterLink({
  countrySlug,
  className,
  style,
  children,
}: {
  countrySlug: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const router = useRouter();
  const href = `/?country=${encodeURIComponent(countrySlug)}#tours-grid`;

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Ctrl/Cmd/Shift-клик и среден бутон — нов раздел, както при обикновен линк
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    router.push(`/?country=${encodeURIComponent(countrySlug)}`, { scroll: false });
    // Изчакваме каталога да се подреди с новия филтър, после скролваме под менюто
    window.setTimeout(() => {
      const grid = document.getElementById('tours-grid');
      if (!grid) return;
      const navHeight = document.querySelector<HTMLElement>('[data-site-navbar]')?.offsetHeight ?? 80;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({
        top: grid.getBoundingClientRect().top + window.scrollY - navHeight - 16,
        behavior: reduce ? 'instant' : 'smooth',
      });
    }, 120);
  };

  return (
    <a href={href} onClick={onClick} className={className} style={style}>
      {children}
    </a>
  );
}
