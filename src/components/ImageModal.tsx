"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { useBackToClose } from '@/lib/hooks/useBackToClose';
import { lightboxImageProps, preloadLightboxPhoto } from '@/lib/lightboxPhoto';

interface ImageModalProps {
  isOpen: boolean;
  image: string;
  caption?: string;
  currentIndex?: number;   // optional — defaults to 0
  totalCount?: number;     // optional — hides counter when omitted
  images?: string[];       // цялата галерия — за предварително теглене на съседните снимки
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}

// Колко снимки напред и назад се теглят предварително — стрелката сменя снимката веднага
const AHEAD = 2;

// Снимка на цял екран с „Назад/Напред“.
// - Снимката е оразмерена от Next (lib/lightboxPhoto.ts), не оригиналният голям файл.
// - Показаната снимка остава на екрана, докато следващата се свали и декодира — после се сменя с кратко
//   избледняване. Преди всяка стрелка показваше празен екран ~2 s.
// - Появяването е с CSS (.dialog-backdrop-in / .lightbox-photo-in), не с framer-motion — то примигваше.
export default function ImageModal(props: ImageModalProps) {
  // Бутонът Назад затваря снимката, а не връща страницата
  useBackToClose(props.isOpen, props.onClose);
  // Съдържанието се създава наново при всяко отваряне — започва празно, без снимката от предишния път
  if (!props.isOpen || typeof document === 'undefined') return null;
  return createPortal(<Lightbox {...props} />, document.body);
}

function Lightbox({
  isOpen, image, caption, currentIndex = 0, totalCount, images,
  onClose, onNext, onPrev, hasNext, hasPrev
}: ImageModalProps) {
  // Коя снимка е на екрана — сменя се чак когато новата е готова (празно до първата)
  const [shown, setShown] = useState('');
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && hasNext) onNext();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, hasNext, hasPrev, onClose, onNext, onPrev]);

  // Новата снимка: изчакваме я да е готова и чак тогава я показваме; междувременно теглим съседите
  useEffect(() => {
    if (!isOpen || !image) return;
    let cancelled = false;
    const slow = setTimeout(() => { if (!cancelled) setWaiting(true); }, 250);
    preloadLightboxPhoto(image).then(() => {
      if (cancelled) return;
      clearTimeout(slow);
      setWaiting(false);
      setShown(image);
    });
    if (images && images.length > 1) {
      const i = images.indexOf(image);
      for (let d = 1; d <= AHEAD; d++) {
        if (images[i + d]) void preloadLightboxPhoto(images[i + d]);
        if (i - d >= 0) void preloadLightboxPhoto(images[i - d]);
      }
    }
    return () => {
      cancelled = true;
      clearTimeout(slow);
    };
  }, [isOpen, image, images]);

  const props = shown ? lightboxImageProps(shown, caption || 'Снимка от екскурзия') : null;

  return (
    <div className="dialog-backdrop-in fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center">

      {/* Top bar: close + counter (only shown when totalCount is provided) */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-5 z-50">
        {totalCount ? (
          <span className="text-white/60 text-xs font-black uppercase tracking-widest">
            {currentIndex + 1} / {totalCount}
          </span>
        ) : <span />}
        <button
          onClick={onClose}
          aria-label="Затвори снимката"
          className="p-3 bg-white/10 hover:bg-white/20 active:scale-90 text-white rounded-full transition-all"
        >
          <X size={22} />
        </button>
      </div>

      {/* Prev */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          aria-label="Предишна снимка"
          className="absolute left-4 md:left-8 p-3 bg-white/10 hover:bg-brand-gold active:scale-90 text-white rounded-full transition-all z-50"
        >
          <ChevronLeft size={32} />
        </button>
      )}

      {/* Image — takes remaining vertical space between top bar and caption bar */}
      <div
        className="relative w-full flex-1 flex items-center justify-center px-16 py-4"
        onClick={onClose}
      >
        {props ? (
          // eslint-disable-next-line @next/next/no-img-element -- srcSet/sizes идват от next/image (getImageProps)
          <img
            key={shown}
            {...props}
            alt={props.alt}
            decoding="async"
            className="lightbox-photo-in max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        ) : null}
        {/* Следващата снимка идва по-бавно от обикновено — малко кръгче, без да махаме сегашната */}
        {(waiting || !shown) && (
          <span role="status" aria-label="Зареждане на снимката" className="absolute bottom-6 h-8 w-8 rounded-full border-[3px] border-white/25 border-t-white motion-safe:animate-spin" />
        )}
      </div>

      {/* Next */}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          aria-label="Следваща снимка"
          className="absolute right-4 md:right-8 p-3 bg-white/10 hover:bg-brand-gold active:scale-90 text-white rounded-full transition-all z-50"
        >
          <ChevronRight size={32} />
        </button>
      )}

      {/* Caption bar — always rendered at bottom, shown only if caption exists */}
      <div className={`w-full px-6 pb-8 pt-4 flex items-center justify-center gap-2 transition-opacity duration-300 ${
        caption ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <div className="flex items-center gap-2.5 bg-white/10 border border-white/10 rounded-2xl px-6 py-3 max-w-lg">
          <MapPin size={14} className="text-brand-gold shrink-0" />
          <span className="text-white text-sm font-semibold tracking-wide">{caption || ''}</span>
        </div>
      </div>
    </div>
  );
}
