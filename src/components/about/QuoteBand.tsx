"use client";

import Image from 'next/image';
import { revealVars, useRevealOnce } from '@/components/ui/Reveal';
import { QUOTE_PHOTO } from '@/app/about-us/aboutContent';

const WORDS: { t: string; gold?: boolean; br?: boolean }[] = [
  { t: '"Не' }, { t: 'търсете' }, { t: 'най-евтината' }, { t: 'екскурзия.', br: true },
  { t: 'Търсете' }, { t: 'тази,' }, { t: 'за' }, { t: 'която' }, { t: 'ще' },
  { t: 'разказвате', gold: true }, { t: 'истории', gold: true }, { t: 'години' }, { t: 'наред."' },
];

// Цитатът на Поли върху снимка от пътуванията ѝ. Думите изплуват една след друга (CSS, .reveal),
// снимката идва леко отдалеч (.reveal-zoom). При „намалено движение“ — само затъмняване.
export default function QuoteBand() {
  const [ref, revealed] = useRevealOnce<HTMLElement>({ threshold: 0.35, rootMargin: '0px' });

  return (
    <section ref={ref} className={`relative h-[70svh] max-h-[640px] min-h-[440px] w-full overflow-hidden bg-brand-dark ${revealed ? 'revealed' : ''}`}>
      <div className="reveal-zoom absolute inset-0">
        <Image src={QUOTE_PHOTO.src} alt={QUOTE_PHOTO.alt} fill className="object-cover" style={{ objectPosition: QUOTE_PHOTO.pos }} sizes="100vw" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black/65" />
      <figure className="relative z-10 flex h-full flex-col items-center justify-start px-6 pt-14 text-center md:items-start md:justify-center md:pl-12 md:pr-6 md:pt-0 md:text-left lg:pl-24">
        <blockquote
          className="mx-auto max-w-3xl font-serif italic leading-[1.15] tracking-[-0.01em] text-white md:mx-0"
          style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3.5rem)', textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
        >
          {WORDS.map((w, i) => (
            <span key={i}>
              <span className="-mb-[0.14em] -mr-[0.1em] inline-block overflow-hidden pb-[0.14em] pr-[0.1em] align-bottom">
                <span className="reveal inline-block" style={revealVars({ y: '105%', duration: 0.7, delay: 0.1 + i * 0.045 })}>
                  {w.gold ? <span className="text-brand-gold">{w.t}</span> : w.t}
                </span>
              </span>
              {w.br ? <br className="hidden md:block" /> : null}
              {i < WORDS.length - 1 && ' '}
            </span>
          ))}
        </blockquote>
        <figcaption className="reveal mt-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/60" style={revealVars({ y: 10, delay: 0.8 })}>
          — Поли
        </figcaption>
      </figure>
    </section>
  );
}
