"use client";

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, MapPin, Play, X } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';
import DragScroller from './DragScroller';
import { TikTokIcon } from './SocialIcons';
import { VIDEOS } from '@/app/about-us/aboutContent';
import { COMPANY_INFO } from '@/lib/companyInfo';
import { useBackToClose } from '@/lib/hooks/useBackToClose';
import { useScrollLock } from '@/lib/hooks/useScrollLock';

type Video = (typeof VIDEOS)[number];

const IS_DEV = process.env.NODE_ENV !== 'production';

// „На път с Поли“ — вертикални видеа (като в TikTok/Reels) в лента, която се влачи.
// С мишка: при посочване картата пуска беззвучен преглед. Натискане отваря плейъра със звук, който „израства“
// от самата карта и се прибира обратно в нея при затваряне. Видеата се добавят в aboutContent.ts (VIDEOS).
// Докато няма видеа: на живия сайт секцията не се показва; в режим на разработка — празни рамки-чернови.
export default function VideoReel() {
  const [open, setOpen] = useState<{ index: number; origin: string; card: HTMLElement } | null>(null);
  const [closing, setClosing] = useState(false);
  const hasVideos = VIDEOS.length > 0;
  const tiktok = COMPANY_INFO.socials.tiktok;
  const isOpen = open !== null;

  // Затварянето първо пуска анимацията „обратно в картата“; плейърът изчезва в края ѝ (onClosed)
  const requestClose = () => setClosing(true);
  const onClosed = () => {
    open?.card.focus();
    setOpen(null);
    setClosing(false);
  };

  // Куките са тук, а не в плейъра: плейърът се монтира вече отворен и в StrictMode (dev) двойното монтиране
  // би объркало записа в историята. Така е като при InquiryDialog — само `isOpen` се сменя.
  useBackToClose(isOpen, requestClose);
  useScrollLock(isOpen);
  useEffect(() => {
    if (!isOpen) return;
    const html = document.documentElement;
    html.dataset.dialogOpen = 'video';
    return () => { delete html.dataset.dialogOpen; };
  }, [isOpen]);

  if (!hasVideos && !IS_DEV) return null;

  const openAt = (index: number, card: HTMLElement) => {
    const r = card.getBoundingClientRect();
    setOpen({ index, card, origin: `${r.left + r.width / 2}px ${r.top + r.height / 2}px` });
  };

  return (
    <section aria-labelledby="videos-title" className="overflow-hidden bg-brand-dark py-20 md:py-28">
      <div className="container mx-auto mb-10 flex flex-col gap-6 px-6 md:mb-12 md:flex-row md:items-end md:justify-between">
        <Reveal>
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px w-8 bg-brand-gold" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold">Отвъд снимките</span>
          </div>
          <h2 id="videos-title" className="font-display text-[clamp(1.6rem,3.4vw,2.6rem)] font-semibold uppercase leading-[1.05] tracking-[-0.02em] text-white">
            На път<br />с Поли
          </h2>
        </Reveal>
        {tiktok && (
          <Reveal delay={0.1}>
            <a
              href={tiktok}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-3 text-sm font-semibold text-white/80 transition-colors hover:text-brand-gold"
            >
              <TikTokIcon className="h-5 w-5" />
              Още видеа в TikTok{COMPANY_INFO.socials.tiktokHandle && ` · @${COMPANY_INFO.socials.tiktokHandle}`}
              <ArrowUpRight size={16} aria-hidden="true" className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              <span className="sr-only">(отваря се в нов прозорец)</span>
            </a>
          </Reveal>
        )}
      </div>

      <DragScroller label="Видеа от пътуванията на Поли" tone="dark">
        {hasVideos
          ? VIDEOS.map((v, i) => <VideoCard key={v.src} video={v} onOpen={el => openAt(i, el)} />)
          : Array.from({ length: 4 }, (_, i) => <DraftCard key={i} n={i + 1} />)}
      </DragScroller>

      {open && (
        <VideoDialog
          index={open.index}
          origin={open.origin}
          closing={closing}
          onIndex={index => setOpen(o => (o ? { ...o, index } : o))}
          onRequestClose={requestClose}
          onClosed={onClosed}
        />
      )}
    </section>
  );
}

function VideoCard({ video, onOpen }: { video: Video; onOpen: (el: HTMLElement) => void }) {
  const ref = useRef<HTMLVideoElement>(null);

  // Беззвучен преглед само с мишка и без „намалено движение“
  const preview = (play: boolean) => {
    const v = ref.current;
    if (!v || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (play) v.play().catch(() => {});
    else v.pause();
  };

  return (
    <button
      type="button"
      onClick={e => onOpen(e.currentTarget)}
      onPointerEnter={e => e.pointerType === 'mouse' && preview(true)}
      onPointerLeave={() => preview(false)}
      aria-label={`Пусни видеото: ${video.title}, ${video.place}`}
      className="group relative aspect-[9/16] w-[230px] shrink-0 snap-start overflow-hidden rounded-[1.75rem] bg-white/5 text-left shadow-[0_24px_50px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/10 transition-transform duration-150 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-gold md:w-[270px]"
    >
      <video
        ref={ref}
        src={`${video.src}#t=0.1`}
        poster={video.poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/20" />
      <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-dark shadow-xl transition-[transform,opacity] duration-300 group-hover:scale-90 group-hover:opacity-0">
        <Play size={22} className="ml-1" fill="currentColor" aria-hidden="true" />
      </span>
      <span className="absolute inset-x-5 bottom-5 text-white">
        <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-gold">
          <MapPin size={11} aria-hidden="true" />{video.place}
        </span>
        <span className="block text-lg font-semibold leading-snug [text-wrap:balance]">{video.title}</span>
      </span>
    </button>
  );
}

// Само в режим на разработка: празна рамка, която показва къде ще стои видеото
function DraftCard({ n }: { n: number }) {
  return (
    <div className="flex aspect-[9/16] w-[230px] shrink-0 snap-start flex-col items-center justify-center gap-4 rounded-[1.75rem] border-2 border-dashed border-white/20 p-6 text-center text-white/50 md:w-[270px]">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20">
        <Play size={20} className="ml-1" aria-hidden="true" />
      </span>
      <span className="text-sm font-semibold text-white/70">Видео {n}</span>
      <span className="text-xs leading-relaxed">Сложи mp4 в public/videos/poli/ и го добави във VIDEOS в aboutContent.ts</span>
      <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">Чернова · не се вижда на сайта</span>
    </div>
  );
}

// Плейърът: на цял екран върху тъмен фон. Израства от картата (transform-origin = центъра ѝ) и се прибира
// обратно в нея. Затваря се с X, Escape, клик извън видеото и бутона Назад; стрелките сменят видеото.
function VideoDialog({ index, origin, closing, onIndex, onRequestClose: requestClose, onClosed }: {
  index: number; origin: string; closing: boolean;
  onIndex: (i: number) => void; onRequestClose: () => void; onClosed: () => void;
}) {
  const closeBtn = useRef<HTMLButtonElement>(null);
  const video = VIDEOS[index];

  useEffect(() => { closeBtn.current?.focus(); }, []);

  // Резерва, ако браузърът не изпрати animationend (напр. изключени анимации)
  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(onClosed, 450);
    return () => clearTimeout(t);
  }, [closing, onClosed]);

  const step = (dir: 1 | -1) => onIndex((index + dir + VIDEOS.length) % VIDEOS.length);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); requestClose(); }
    else if (e.key === 'ArrowRight' && VIDEOS.length > 1) step(1);
    else if (e.key === 'ArrowLeft' && VIDEOS.length > 1) step(-1);
  };

  const navBtn = 'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-[background-color,color,transform] duration-150 hover:bg-white hover:text-brand-dark active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${video.title}, ${video.place}`}
      onKeyDown={onKeyDown}
      className={`fixed inset-0 z-[300] bg-black/85 ${closing ? 'video-backdrop-out' : 'dialog-backdrop-in'}`}
      onAnimationEnd={e => { if (closing && e.target === e.currentTarget) onClosed(); }}
    >
      <div
        className={`absolute inset-0 flex items-center justify-center gap-3 p-4 md:gap-6 ${closing ? 'video-zoom-out' : 'video-zoom-in'}`}
        style={{ transformOrigin: origin }}
        onMouseDown={e => { if (e.target === e.currentTarget) requestClose(); }}
      >
        {VIDEOS.length > 1 && (
          <button type="button" onClick={() => step(-1)} aria-label="Предишно видео" className={`${navBtn} hidden md:flex`}>
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
        )}
        <figure className="relative flex min-w-0 max-h-full flex-col items-center">
          <video
            key={video.src}
            src={video.src}
            poster={video.poster}
            controls
            autoPlay
            playsInline
            // Височината е фиксирана, ширината идва от самото видео — вертикално и хоризонтално стоят еднакво добре
            className="h-[calc(100dvh-7rem)] max-h-[960px] w-auto max-w-full rounded-2xl bg-black object-contain shadow-2xl"
          />
          <figcaption className="mt-3 flex items-center gap-2 text-sm text-white/80">
            <MapPin size={13} className="text-brand-gold" aria-hidden="true" />
            <span className="font-semibold text-white">{video.title}</span> · {video.place}
          </figcaption>
        </figure>
        {VIDEOS.length > 1 && (
          <button type="button" onClick={() => step(1)} aria-label="Следващо видео" className={`${navBtn} hidden md:flex`}>
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        )}
      </div>

      <button ref={closeBtn} type="button" onClick={requestClose} aria-label="Затвори видеото" className={`${navBtn} absolute right-4 top-4 z-10`}>
        <X size={22} aria-hidden="true" />
      </button>
      {VIDEOS.length > 1 && (
        <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center gap-4 md:hidden">
          <button type="button" onClick={() => step(-1)} aria-label="Предишно видео" className={navBtn}><ChevronLeft size={22} aria-hidden="true" /></button>
          <button type="button" onClick={() => step(1)} aria-label="Следващо видео" className={navBtn}><ChevronRight size={22} aria-hidden="true" /></button>
        </div>
      )}
    </div>
  );
}
