"use client";
// Звездичка за допълнителна екскурзия „по желание“ в текста на деня ([*N] → тук). При посочване с мишката или при
// докосване показва името, какво включва и цената. Балончето е в портал с position: fixed — панелът с деня е с
// overflow-hidden и иначе го изрязваше.

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Star } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { ITourExtra } from '@/types';
import { paymentLabel } from '@/lib/tourExtras';
import { useMounted } from '@/lib/hooks/useMounted';

const WIDTH = 280;
const GAP = 10;
const EDGE = 12;

export default function ExtraStar({ extra, withLabel = false }: { extra: ITourExtra; withLabel?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const tipId = useId();
  const reduceMotion = useReducedMotion();
  const mounted = useMounted(); // порталът — само след хидратацията

  // Над звездичката, а ако горе няма място — под нея; винаги в рамките на екрана
  const place = useCallback(() => {
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(WIDTH, window.innerWidth - EDGE * 2);
    const left = Math.min(Math.max(r.left + r.width / 2 - width / 2, EDGE), window.innerWidth - width - EDGE);
    const height = tipRef.current?.offsetHeight ?? 160;
    const below = r.top - height - GAP < EDGE;
    setPos({ left, top: below ? r.bottom + GAP : r.top - GAP - height, below });
  }, []);

  // „Отворено от посочване“: щракване след посочване го задържа отворено (иначе щракването веднага го затваряше),
  // а махането на мишката затваря само такова, незадържано балонче
  const [hoverOnly, setHoverOnly] = useState(false);
  // Затварянето след посочване е с малко закъснение: звездичката е малка и при всяко трепване на мишката
  // през ръба ѝ балончето премигваше; така има и време мишката да стигне до самото балонче
  const closeTimer = useRef<number | undefined>(undefined);
  const cancelClose = () => { window.clearTimeout(closeTimer.current); closeTimer.current = undefined; };
  const scheduleClose = () => { cancelClose(); closeTimer.current = window.setTimeout(() => setOpen(false), 300); };
  const show = (byHover: boolean) => { cancelClose(); place(); setOpen(true); setHoverOnly(byHover); };
  const onClick = () => {
    cancelClose();
    if (!open) show(false);
    else if (hoverOnly) setHoverOnly(false);
    else setOpen(false);
  };
  const onMouseLeave = (e: React.PointerEvent) => { if (e.pointerType === 'mouse' && hoverOnly) scheduleClose(); };

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!open) return;
    // След първия рендер балончето вече има реална височина — нагласяме отново
    let frame = requestAnimationFrame(place);
    // При превъртане балончето върви със звездичката (не се затваря — на телефон докосването често идва с леко
    // превъртане и балончето се затваряше веднага); затваря се чак когато звездичката излезе от екрана
    const follow = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = buttonRef.current?.getBoundingClientRect();
        if (!r || r.bottom < 0 || r.top > window.innerHeight) setOpen(false);
        else place();
      });
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); } };
    const onDown = (e: PointerEvent) => {
      if (!buttonRef.current?.contains(e.target as Node) && !tipRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('scroll', follow, { passive: true, capture: true });
    window.addEventListener('resize', follow);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', follow, { capture: true });
      window.removeEventListener('resize', follow);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, place]);

  const label = `По желание: ${extra.name}${extra.price ? ` — ${extra.price}` : ''}`;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={withLabel ? undefined : label}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={onClick}
        onPointerEnter={e => { if (e.pointerType !== 'mouse') return; if (open) cancelClose(); else show(true); }}
        onPointerLeave={onMouseLeave}
        className={withLabel
          ? 'inline-flex items-center gap-2 text-left rounded-full bg-rose-50 border border-rose-100 pl-2 pr-3.5 py-1.5 text-[14px] text-brand-dark hover:bg-rose-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold'
          : 'relative inline-flex align-[-0.2em] mx-0.5 items-center justify-center w-7 h-7 -my-1 rounded-full text-brand-gold hover:bg-brand-gold/15 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold'}
      >
        <Star size={withLabel ? 15 : 17} className="fill-brand-gold text-brand-goldDeep shrink-0" aria-hidden="true" />
        {withLabel && (
          <span>
            <span className="font-bold text-rose-700">По желание:</span> {extra.name}
            {extra.price && <span className="font-bold"> — {extra.price}</span>}
          </span>
        )}
      </button>

      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={tipRef}
              id={tipId}
              role="tooltip"
              // Мишката върху балончето го държи отворено — може да се чете, без да се стои върху звездичката
              onPointerEnter={e => { if (e.pointerType === 'mouse') cancelClose(); }}
              onPointerLeave={onMouseLeave}
              initial={{ opacity: 0, y: reduceMotion ? 0 : (pos?.below ? -4 : 4) }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'fixed',
                left: pos?.left ?? -9999,
                top: pos?.top ?? -9999,
                width: `min(${WIDTH}px, calc(100vw - ${EDGE * 2}px))`,
              }}
              className="z-[10000] rounded-2xl bg-white p-4 shadow-2xl shadow-brand-dark/15 border border-gray-100 text-left"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-700">
                По желание · {paymentLabel(extra.payment)}
              </p>
              <p className="mt-1.5 font-serif text-[18px] leading-snug text-brand-dark">{extra.name}</p>
              {extra.info && <p className="mt-1.5 text-[14px] leading-relaxed text-gray-600">{extra.info}</p>}
              <p className="mt-3 text-[17px] font-black text-brand-goldDeep">{extra.price || 'Цена при запитване'}</p>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
