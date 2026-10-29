"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRevealOnce, revealVars } from '@/components/ui/Reveal';

const PHOTO = { src: '/guides/poly-10.jpg', alt: 'Поли пред Ангкор Ват, Камбоджа' };

// Цитатът дума по дума — всяка „изплува“ изпод невидима линия. gold — думата в злато, after — текст след нея,
// който не е златен (затварящите кавички).
const QUOTE: { t: string; gold?: boolean; after?: string }[] = [
  { t: '"Някъде' }, { t: 'отвъд' }, { t: 'хоризонта' }, { t: 'има' }, { t: 'залез,' },
  { t: 'който' }, { t: 'вече' }, { t: 'ти' }, { t: 'принадлежи.', gold: true, after: '"' },
];

// Веднага след героса: цитатът за залеза и кратко представяне на Поли — коя е и защо да ѝ се доверите.
// Подробната секция за нея (MeetGuides) остава в края на страницата.
// Фонът е топлият беж (brand-cream = #f7f0e4, същият като в MeetGuides) — фонът е цвят, не снимка.
// На широк екран: текстът вляво, голяма снимка на Поли вдясно, висока колкото текста. На телефон и таблет
// снимката е малка, до въведението.
//
// Един оркестриран момент при първото появяване (35% от секцията в екрана): думите на цитата една след друга,
// после снимката се разкрива отдолу нагоре и накрая представянето. Всичко е CSS (.reveal / .reveal-wipe /
// .reveal-zoom в globals.css), задействано с класа .revealed на секцията — без framer-motion, който „примигваше“
// в края на анимацията. При „намалено движение“ остава само затъмняването и разкриването на снимката.
export default function PoliIntro() {
  const [ref, revealed] = useRevealOnce<HTMLElement>({ threshold: 0.35, rootMargin: '0px' });

  return (
    <section ref={ref} aria-labelledby="poli-intro-title" className={`bg-brand-cream ${revealed ? 'revealed' : ''}`}>
      <div className="container mx-auto px-6 py-16 lg:grid lg:grid-cols-12 lg:gap-x-16 lg:py-20">
        <div className="lg:col-span-7 lg:flex lg:flex-col lg:justify-center">
          <blockquote
            className="font-serif italic leading-[1.1] tracking-[-0.01em] text-brand-dark [text-wrap:balance]"
            style={{ fontSize: 'clamp(2.1rem, 4.6vw, 4.25rem)' }}
          >
            {QUOTE.map((w, i) => (
              <span key={i}>
                {/* Изрязващата рамка: думата тръгва под долния ѝ ръб. Отстъпите пазят опашките на буквите и наклона на курсива. */}
                <span className="-mb-[0.14em] -mr-[0.1em] inline-block overflow-hidden pb-[0.14em] pr-[0.1em] align-bottom">
                  <span className="reveal inline-block" style={revealVars({ y: '105%', duration: 0.7, delay: i * 0.05 })}>
                    {w.gold ? <span className="text-brand-gold">{w.t}</span> : w.t}
                    {w.after}
                  </span>
                </span>
                {i < QUOTE.length - 1 && ' '}
              </span>
            ))}
          </blockquote>
          <p className="reveal mt-5 text-base italic text-slate-600 lg:text-lg" style={revealVars({ y: 14, delay: 0.55 })}>
            Просто трябва да отидеш да си го вземеш.
          </p>

          {/* Поли: на телефон снимката е до въведението, а текстът — под тях; от sm — снимката е в отделна колона;
              от lg малката снимка изчезва, защото голямата е вдясно */}
          <div
            className="reveal mt-11 grid grid-cols-[88px_minmax(0,1fr)] items-center gap-4 sm:mt-14 sm:grid-cols-[128px_minmax(0,32.5rem)] sm:items-start sm:gap-x-7 sm:gap-y-2.5 lg:mt-12 lg:block lg:max-w-[32.5rem]"
            style={revealVars({ y: 14, delay: 0.7 })}
          >
            <div className="relative h-[110px] w-[88px] overflow-hidden rounded-[14px] sm:row-span-2 sm:h-40 sm:w-32 sm:rounded-2xl lg:hidden">
              <Image
                src={PHOTO.src}
                alt={PHOTO.alt}
                fill
                sizes="128px"
                quality={75}
                className="object-cover"
                style={{ objectPosition: '100% 50%', transform: 'scale(1.5)', transformOrigin: '10% 66%' }}
              />
            </div>
            {/* Абзац, не заглавие: цял поздрав като H2 размиваше структурата на страницата за Google. Видът е същият. */}
            <p
              id="poli-intro-title"
              className="text-[17px] font-semibold leading-[1.3] tracking-[-0.01em] text-brand-dark [text-wrap:pretty] sm:text-[22px]"
            >
              Здравейте! Аз съм Паулина Алексиева, основател на Beliva и водач на групи от над 13 години. Всяка екскурзия, която намерите тук е лично проверена и одобрена от мен.
            </p>
            <div className="col-span-2 sm:col-span-1 sm:col-start-2 lg:mt-2.5">
              <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-3">
                <Link
                  href="/about-us"
                  className="cursor-pointer touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark inline-flex h-12 items-center rounded-full bg-brand-dark px-6 text-[15px] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-slate-700 active:scale-[0.97]"
                >
                  Запознай се с мен
                </Link>
                <Link
                  href="/?cat=vodena-ot-poli#tours-grid"
                  className="cursor-pointer touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark inline-flex min-h-11 items-center text-[15px] font-semibold text-brand-dark underline decoration-brand-gold decoration-2 underline-offset-[6px] transition-[text-decoration-color] hover:decoration-brand-dark"
                >
                  Турове, водени от Поли
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Голямата снимка — само от lg нагоре; разтяга се до височината на текста и се разкрива отдолу нагоре */}
        <div
          className="reveal-wipe relative hidden min-h-[26rem] overflow-hidden rounded-3xl lg:col-span-5 lg:block"
          style={revealVars({ delay: 0.15 })}
        >
          <div className="reveal-zoom absolute inset-0" style={revealVars({ delay: 0.15 })}>
            <Image
              src={PHOTO.src}
              alt={PHOTO.alt}
              fill
              sizes="(min-width: 1536px) 600px, 40vw"
              quality={75}
              className="object-cover"
              style={{ objectPosition: '85% 50%' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
