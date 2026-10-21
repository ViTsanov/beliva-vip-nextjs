"use client";

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, MapPin, ShieldCheck } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';
import { CHAPTERS, VISITED } from '@/app/about-us/aboutContent';
import { COMPANY_INFO } from '@/lib/companyInfo';

const P = 'text-[17px] md:text-[18px] font-light leading-relaxed text-slate-600';

// Текстът на всяка глава (по id от CHAPTERS) — JSX, защото има удебелявания, буквица и бутони.
const BODY: Record<string, ReactNode> = {
  puteshestvenichkata: (
    <p className={P}>
      <span className="float-left mr-3 mt-1 font-serif italic leading-[0.8] text-brand-goldDeep" style={{ fontSize: '5rem' }} aria-hidden="true">П</span>
      <span className="sr-only">П</span>оли е сърцето на Beliva VIP Tour. С над 15 години в туризма и над 150 лично водени групи, тя не познава дестинациите от каталог — а от преживяване. Всяка страна, която предлага, е страна, която е посетила лично, проверила е хотелите и е избрала маршрута внимателно.
    </p>
  ),
  beliva: (
    <>
      <p className={P}>
        Работи като туристически агент към <strong className="font-semibold text-brand-dark">2МКО</strong> — един от водещите туроператори в България. Чрез Beliva VIP Tour тя предлага същите турове, но с нещо, което никой каталог не може да даде: лично присъствие, грижа и познаване на пътуващите си по име.
      </p>
      <p className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-brand-dark/10 px-4 py-2 text-[13px] font-semibold text-brand-dark">
        <ShieldCheck size={16} className="text-brand-goldDeep" aria-hidden="true" />
        Лицензирана туристическа агенция · {COMPANY_INFO.license}
      </p>
    </>
  ),
  priyateli: (
    <>
      <p className={P}>
        Нейните пътуващи не са клиенти — те са приятели. Затова много от тях се връщат на пето, шесто, седмо пътуване с Поли.
      </p>
      <p className="mb-4 mt-8 text-[10px] font-black uppercase tracking-[0.3em] text-brand-dark/50">Била е лично в</p>
      <ul className="mb-10 flex flex-wrap gap-2">
        {VISITED.map(dest => (
          <li key={dest} className="inline-flex items-center gap-1.5 rounded-full border border-brand-gold/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-dark">
            <MapPin size={9} className="text-brand-goldDeep" aria-hidden="true" />{dest}
          </li>
        ))}
      </ul>
      <Link
        href="/?cat=vodena-ot-poli#tours-grid"
        className="group inline-flex h-12 items-center gap-2 rounded-full bg-brand-dark px-7 text-[10px] font-black uppercase tracking-widest text-white transition-[background-color,color,transform] duration-150 hover:bg-brand-gold hover:text-brand-dark active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
      >
        Турове с Поли
        <ArrowRight size={14} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
      </Link>
    </>
  ),
};

// Историята в три глави. На широк екран снимката стои закрепена вляво и плавно се сменя с главата,
// която в момента е в средата на екрана; брояч „01 / 03“ показва къде сте. На телефон всяка глава си носи
// снимката над текста. Смяната е затъмняване (opacity), а лекото приближаване е само без „намалено движение“.
export default function StoryChapters() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      // Броим за активна главата, която пресича хоризонтална линия в средата на екрана
      { rootMargin: '-45% 0px -45% 0px' },
    );
    refs.current.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="istoriyata" aria-labelledby="istoriyata-title" className="scroll-mt-24 bg-white pb-16 pt-20 md:pb-24 md:pt-28">
      <div className="container mx-auto px-6">
        <Reveal className="mb-2 max-w-2xl lg:mb-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px w-8 bg-brand-gold" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-goldDeep">Запознайте се с Поли</span>
          </div>
          <h2 id="istoriyata-title" className="font-display text-[clamp(1.6rem,3.4vw,2.6rem)] font-semibold uppercase leading-[1.05] tracking-[-0.02em] text-brand-dark">
            Историята<br />на Поли
          </h2>
        </Reveal>

        <div className="lg:grid lg:grid-cols-12 lg:gap-16">
          {/* Закрепената снимка — само от lg */}
          <div className="hidden lg:col-span-5 lg:block">
            <div className="sticky top-28 h-[calc(100svh-9rem)] max-h-[720px] overflow-hidden rounded-[2rem] bg-brand-dark shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)]">
              {CHAPTERS.map((c, i) => (
                <div
                  key={c.id}
                  aria-hidden={i !== active}
                  className={`absolute inset-0 transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    i === active ? 'opacity-100 motion-safe:scale-100' : 'opacity-0 motion-safe:scale-[1.06]'
                  }`}
                >
                  <Image src={c.photo.src} alt={c.photo.alt} fill sizes="(min-width: 1536px) 600px, 40vw" className="object-cover" style={{ objectPosition: c.photo.pos }} />
                </div>
              ))}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute inset-x-6 bottom-6 flex items-end justify-between gap-4 text-white">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" aria-live="polite">
                  <MapPin size={13} className="text-brand-gold" aria-hidden="true" />
                  {CHAPTERS[active].photo.place}
                </p>
                <div className="flex items-center gap-3" aria-hidden="true">
                  <span className="font-display text-xs tabular-nums">
                    {String(active + 1).padStart(2, '0')}<span className="text-white/50"> / {String(CHAPTERS.length).padStart(2, '0')}</span>
                  </span>
                  <div className="flex gap-1">
                    {CHAPTERS.map((c, i) => (
                      <span key={c.id} className={`h-1 rounded-full transition-[width,background-color] duration-500 ${i === active ? 'w-6 bg-brand-gold' : 'w-2 bg-white/40'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            {CHAPTERS.map((c, i) => (
              <article
                key={c.id}
                ref={el => { refs.current[i] = el; }}
                data-index={i}
                aria-labelledby={`glava-${c.id}`}
                className="flex flex-col justify-center py-8 lg:min-h-[78svh] lg:py-16"
              >
                {/* Снимката на главата — само под lg */}
                <Reveal className="mb-8 lg:hidden">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] sm:aspect-[16/10]">
                    <Image src={c.photo.src} alt={c.photo.alt} fill sizes="100vw" className="object-cover" style={{ objectPosition: c.photo.pos }} />
                    <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 to-transparent" />
                    <p className="absolute bottom-4 left-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white">
                      <MapPin size={12} className="text-brand-gold" aria-hidden="true" />{c.photo.place}
                    </p>
                  </div>
                </Reveal>
                <Reveal>
                  <p className="mb-5 flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-brand-goldDeep">
                    <span className="font-display text-sm tracking-normal text-brand-dark/25">{String(i + 1).padStart(2, '0')}</span>
                    {c.kicker}
                  </p>
                  <h3 id={`glava-${c.id}`} className="mb-7 font-serif text-4xl italic leading-tight tracking-[-0.01em] text-brand-dark [text-wrap:balance] md:text-5xl">
                    {c.title}
                  </h3>
                  <div className="max-w-xl">{BODY[c.id]}</div>
                </Reveal>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
