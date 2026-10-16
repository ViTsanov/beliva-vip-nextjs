"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

// Хоризонтална лента, която се влачи с мишката (на телефон — нормалният плъзгащ се скрол на браузъра).
// - Влачене 1:1: лентата следва мишката от точката, в която е хваната.
// - При пускане скоростта не се губи: изчисляваме докъде би „доплъзгала“ лентата (проекция на инерцията, като
//   скрола в iOS) и спираме на най-близката снимка до ТАЗИ точка, с пружина, която тръгва с ръчната скорост.
// - Пружината може да се хване по всяко време — новото влачене тръгва от текущата позиция, без скок.
// - Докато влачим/пружинираме, CSS scroll-snap е изключен (иначе би се борил с нас) и се връща на точката на спиране.
// - Влачене над 6px не се брои за клик (картите с видео са бутони).

const DECELERATION = 0.998;
const project = (velocity: number) => (velocity / 1000) * DECELERATION / (1 - DECELERATION);

export default function DragScroller({
  children, label, tone = 'light', className = '',
}: {
  children: ReactNode;
  label: string;
  tone?: 'light' | 'dark';
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const anim = useRef(0);
  const dragged = useRef(false);
  const [edges, setEdges] = useState({ start: true, end: false });

  const stop = useCallback(() => {
    if (anim.current) cancelAnimationFrame(anim.current);
    anim.current = 0;
  }, []);

  // Позициите на спиране: началото на всяка карта минус отстъпа на лентата (scroll-padding)
  const snapPoints = useCallback(() => {
    const el = ref.current;
    if (!el) return [0];
    const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
    const max = el.scrollWidth - el.clientWidth;
    return Array.from(el.children as HTMLCollectionOf<HTMLElement>).map(c => Math.min(max, Math.max(0, c.offsetLeft - pad)));
  }, []);

  // Критично затихнала пружина (без отскок) върху scrollLeft; v0 — началната скорост в px/s
  const springTo = useCallback((target: number, v0 = 0) => {
    const el = ref.current;
    if (!el) return;
    stop();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      el.scrollLeft = target;
      el.style.scrollSnapType = '';
      return;
    }
    el.style.scrollSnapType = 'none';
    const omega = (2 * Math.PI) / 0.45; // response 0.45 s
    let x = el.scrollLeft;
    let v = v0;
    let last = performance.now();
    const step = (now: number) => {
      let dt = Math.min(0.064, (now - last) / 1000);
      last = now;
      while (dt > 0) {
        const h = Math.min(dt, 1 / 120);
        v += (-omega * omega * (x - target) - 2 * omega * v) * h;
        x += v * h;
        dt -= h;
      }
      if (Math.abs(x - target) < 0.5 && Math.abs(v) < 8) {
        el.scrollLeft = target;
        el.style.scrollSnapType = '';
        anim.current = 0;
        return;
      }
      el.scrollLeft = x;
      anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }, [stop]);

  const nearest = useCallback((pos: number) => {
    const points = snapPoints();
    return points.reduce((best, p) => (Math.abs(p - pos) < Math.abs(best - pos) ? p : best), points[0]);
  }, [snapPoints]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let pointerId = -1;
    let startX = 0;
    let startScroll = 0;
    let samples: { x: number; t: number }[] = [];

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return; // пръстът ползва естествения скрол
      stop(); // хващаме лентата в движение — от текущата ѝ позиция
      pointerId = e.pointerId;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      samples = [{ x: e.clientX, t: e.timeStamp }];
      dragged.current = false;
      el.style.scrollSnapType = 'none';
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      if (!dragged.current && Math.abs(dx) > 6) {
        dragged.current = true;
        el.setPointerCapture(pointerId);
        el.dataset.dragging = 'true';
      }
      if (!dragged.current) return;
      el.scrollLeft = startScroll - dx;
      samples.push({ x: e.clientX, t: e.timeStamp });
      samples = samples.filter(s => e.timeStamp - s.t < 100);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      pointerId = -1;
      delete el.dataset.dragging;
      if (!dragged.current) {
        el.style.scrollSnapType = '';
        return;
      }
      const first = samples[0];
      const lastS = samples[samples.length - 1];
      const dt = lastS && first ? lastS.t - first.t : 0;
      const pointerV = dt > 0 ? ((lastS.x - first.x) / dt) * 1000 : 0;
      const scrollV = -pointerV;
      springTo(nearest(el.scrollLeft + project(scrollV)), scrollV);
    };
    // Клик след влачене не отваря картата
    const onClick = (e: MouseEvent) => {
      if (dragged.current) {
        e.preventDefault();
        e.stopPropagation();
        dragged.current = false;
      }
    };
    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth;
      setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft >= max - 2 });
    };
    // Колелото и пръстът прекъсват пружината веднага
    const interrupt = () => {
      if (anim.current) {
        stop();
        el.style.scrollSnapType = '';
      }
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('click', onClick, true);
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('wheel', interrupt, { passive: true });
    el.addEventListener('touchstart', interrupt, { passive: true });
    onScroll();
    return () => {
      stop();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('click', onClick, true);
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('wheel', interrupt);
      el.removeEventListener('touchstart', interrupt);
    };
  }, [nearest, springTo, stop]);

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const points = snapPoints();
    const current = nearest(el.scrollLeft);
    const idx = points.indexOf(current);
    const next = points[Math.min(points.length - 1, Math.max(0, idx + dir))];
    // Ако няколко карти накрая имат една и съща точка (краят на лентата), продължаваме до следващата различна
    springTo(next === current ? points.find(p => (dir > 0 ? p > current : p < current)) ?? current : next);
  };

  const btn = tone === 'dark'
    ? 'border-white/20 text-white hover:border-brand-gold hover:text-brand-gold'
    : 'border-brand-dark/15 text-brand-dark hover:border-brand-dark hover:bg-brand-dark hover:text-white';

  return (
    <div className={`[--gutter:max(1.5rem,calc((100%-var(--c))/2+1.5rem))] [--c:100%] sm:[--c:640px] md:[--c:768px] lg:[--c:1024px] xl:[--c:1280px] 2xl:[--c:1536px] ${className}`}>
      <div
        ref={ref}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="relative flex select-none snap-x snap-mandatory gap-5 overflow-x-auto px-[var(--gutter)] pb-6 pt-2 scrollbar-hide [scroll-padding-inline:var(--gutter)] md:gap-8 [&[data-dragging]]:cursor-grabbing md:cursor-grab focus-visible:outline-none"
      >
        {children}
        {/* Отстъп след последната карта — padding-right на скрол контейнер не се брои навсякъде */}
        <span aria-hidden="true" className="w-px shrink-0" />
      </div>
      <div className="mt-4 hidden justify-end gap-3 px-[var(--gutter)] md:flex">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={edges.start}
          aria-label="Назад"
          className={`flex h-11 w-11 items-center justify-center rounded-full border transition-[background-color,border-color,color,transform,opacity] duration-150 active:scale-90 disabled:pointer-events-none disabled:opacity-30 ${btn}`}
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={edges.end}
          aria-label="Напред"
          className={`flex h-11 w-11 items-center justify-center rounded-full border transition-[background-color,border-color,color,transform,opacity] duration-150 active:scale-90 disabled:pointer-events-none disabled:opacity-30 ${btn}`}
        >
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
