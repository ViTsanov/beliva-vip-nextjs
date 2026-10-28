"use client";

import { createElement, useEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';

// Появяване при скрол с чист CSS (класовете .reveal / .revealed в globals.css), без framer-motion.
// framer пуска opacity през Web Animations API и в края ѝ записва крайната стойност отделно — за един кадър
// елементът се вижда в началното си състояние и „примигва“. CSS анимацията с fill-mode: both просто остава
// на последния кадър, затова няма какво да мигне (същото като входа на героса).

// true, след като елементът веднъж влезе в екрана. threshold — каква част от него трябва да се вижда.
export function useRevealOnce<T extends Element>({ threshold = 0, rootMargin = '0px 0px -60px 0px' } = {}) {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin]);

  return [ref, revealed] as const;
}

// Променливите, които .reveal чете: изместване, продължителност и закъснение.
export function revealVars({ y, duration, delay }: { y?: number | string; duration?: number; delay?: number }): CSSProperties {
  const vars: Record<string, string> = {};
  if (y !== undefined) vars['--reveal-y'] = typeof y === 'number' ? `${y}px` : y;
  if (duration !== undefined) vars['--reveal-duration'] = `${duration}s`;
  if (delay !== undefined) vars['--reveal-delay'] = `${delay}s`;
  return vars as CSSProperties;
}

// Обвивка за единичен блок, който се появява сам.
export default function Reveal({
  children, className = '', y, duration, delay, style,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  duration?: number;
  delay?: number;
  style?: CSSProperties;
}) {
  const [ref, revealed] = useRevealOnce<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal ${revealed ? 'revealed' : ''} ${className}`}
      style={{ ...revealVars({ y, duration, delay }), ...style }}
    >
      {children}
    </div>
  );
}

// Обвивка за група (секция, списък): щом влезе в екрана, получава .revealed и всички .reveal / .reveal-zoom вътре
// тръгват — всеки със своето закъснение (--reveal-delay). Ползва се и от сървърни компоненти: закъснението се дава
// направо в style={{ '--reveal-delay': '0.1s' }}, без revealVars (то е клиентска функция).
export function RevealGroup({
  as = 'div', className = '', children, ...rest
}: { as?: 'div' | 'section' | 'ul'; className?: string; children: ReactNode } & HTMLAttributes<HTMLElement>) {
  const [ref, revealed] = useRevealOnce<HTMLElement>();
  return createElement(as, { ...rest, ref, className: `${className} ${revealed ? 'revealed' : ''}` }, children);
}
