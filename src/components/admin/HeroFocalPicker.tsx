"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { AlertTriangle, Crosshair, Monitor, Smartphone, X } from 'lucide-react';

// Под тази ширина главната снимка се разтяга на голям екран и изглежда размазана
const MIN_HERO_WIDTH = 1600;

const parse = (pos?: string): [number, number] => {
  const m = String(pos || '').match(/(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
  return m ? [Number(m[1]), Number(m[2])] : [50, 50];
};
const clamp = (v: number) => Math.round(Math.min(100, Math.max(0, v)));

// Главната снимка в TourForm: цялата снимка, върху която се щраква (или влачи) точката, която трябва да остане
// във видимото — на страницата на тура снимката се изрязва широко на компютър и тясно на телефон. Отдолу —
// живи прегледи на двата изрязвания. Пази се като CSS object-position ("x% y%") в полето imgPosition на тура.
export default function HeroFocalPicker({ src, position, onChange, onRemove }: {
  src: string;
  position?: string;
  onChange: (position: string) => void;
  onRemove: () => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [x, y] = parse(position);
  const objectPosition = `${x}% ${y}%`;

  const setFromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = frame.current?.getBoundingClientRect();
    if (!r) return;
    onChange(`${clamp(((e.clientX - r.left) / r.width) * 100)}% ${clamp(((e.clientY - r.top) / r.height) * 100)}%`);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    onChange(`${clamp(x + m[0])}% ${clamp(y + m[1])}%`);
  };

  const tooSmall = natural && natural.w < MIN_HERO_WIDTH;

  return (
    <div className="space-y-4">
      <div className="relative">
        <div
          ref={frame}
          role="application"
          tabIndex={0}
          aria-label={`Точка на фокус: ${x}% хоризонтално, ${y}% вертикално. Щракни върху снимката или ползвай стрелките.`}
          onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setFromPointer(e); }}
          onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromPointer(e); }}
          onKeyDown={onKeyDown}
          className="relative cursor-crosshair touch-none select-none overflow-hidden rounded-3xl border bg-gray-100 shadow-md outline-none focus-visible:ring-4 focus-visible:ring-brand-gold/40"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Главна снимка"
            draggable={false}
            onLoad={e => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            className="block h-auto w-full"
          />
          {/* Точката на фокус */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-brand-gold/40 shadow-[0_0_0_2px_rgba(15,23,42,0.6),0_4px_14px_rgba(0,0,0,0.4)]"
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Премахни главната снимка"
          className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-red-500 shadow-xl transition-all hover:bg-red-500 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <Crosshair size={14} className="text-brand-gold" aria-hidden="true" />
          Щракни върху най-важното в снимката — то ще остане видимо.
        </span>
        <span className="flex items-center gap-3">
          {natural && <span className="tabular-nums">{natural.w}×{natural.h}px</span>}
          {(x !== 50 || y !== 50) && (
            <button type="button" onClick={() => onChange('')} className="font-bold text-brand-dark underline decoration-brand-gold underline-offset-4">
              Центрирай
            </button>
          )}
        </span>
      </div>

      {tooSmall && (
        <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
          Снимката е само {natural.w}px широка — на страницата на тура ще изглежда размазана. Избери снимка поне {MIN_HERO_WIDTH}px.
        </p>
      )}

      {/* Как ще изглежда: компютър (широко) и телефон (тясно, вертикално) */}
      <div className="flex items-end gap-4">
        <figure className="min-w-0 flex-1">
          <div className="relative aspect-[5/2] overflow-hidden rounded-xl bg-gray-100 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition }} />
          </div>
          <figcaption className="mt-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            <Monitor size={12} aria-hidden="true" /> Компютър
          </figcaption>
        </figure>
        <figure className="w-20 shrink-0">
          <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-gray-100 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition }} />
          </div>
          <figcaption className="mt-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            <Smartphone size={12} aria-hidden="true" /> Телефон
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
