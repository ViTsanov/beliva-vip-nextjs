"use client";

import type { CSSProperties } from 'react';
import Image from 'next/image';
import Reveal from '@/components/ui/Reveal';
import DragScroller from './DragScroller';
import { DIARY } from '@/app/about-us/aboutContent';

// „Дневник от пътя“ — снимките като разпилени в дневник, леко завъртени. Лентата се влачи (DragScroller);
// при посочване снимката се изправя и повдига — като да я вземеш от масата.
export default function DiaryStrip() {
  return (
    <section aria-labelledby="diary-title" className="overflow-hidden bg-brand-cream py-20 md:py-24">
      <Reveal className="container mx-auto mb-10 px-6 text-center md:mb-12">
        <div className="mb-4 flex items-center justify-center gap-3">
          <div className="h-px w-8 bg-brand-gold/50" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-goldDeep">Дневник от пътя</span>
          <div className="h-px w-8 bg-brand-gold/50" />
        </div>
        <h2 id="diary-title" className="font-serif text-3xl italic text-brand-dark md:text-4xl">
          Няколко <span className="text-brand-goldDeep">спомена</span> по пътя
        </h2>
      </Reveal>

      <DragScroller label="Снимки от пътуванията на Поли" className="[&>div:first-child]:py-10">
        {DIARY.map((p, i) => (
          <figure
            key={p.src}
            className="group relative h-[320px] w-[240px] shrink-0 snap-start md:h-[400px] md:w-[290px]"
          >
            <div
              className="relative h-full w-full overflow-hidden rounded-[1.75rem] border-[6px] border-white bg-white shadow-[0_20px_40px_-18px_rgba(15,23,42,0.45)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] [transform:rotate(var(--tilt))] group-hover:shadow-[0_30px_60px_-20px_rgba(15,23,42,0.55)] motion-safe:group-hover:[transform:rotate(0deg)_translateY(-8px)]"
              style={{ '--tilt': `${i % 2 === 0 ? -2 : 2}deg` } as CSSProperties}
            >
              <Image src={p.src} alt={p.alt} fill draggable={false} className="pointer-events-none rounded-[1.3rem] object-cover" style={{ objectPosition: p.pos }} sizes="300px" />
              <div className="absolute inset-0 rounded-[1.3rem] bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <figcaption className="absolute bottom-5 left-5 text-xs font-bold uppercase tracking-widest text-white drop-shadow-md">{p.place}</figcaption>
            </div>
          </figure>
        ))}
      </DragScroller>
    </section>
  );
}
