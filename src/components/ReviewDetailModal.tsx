"use client";

import { useEffect, useId, useRef } from 'react';
import { X, MapPin, Star } from 'lucide-react';
import { useBackToClose } from '@/lib/hooks/useBackToClose';
import { useScrollLock } from '@/lib/hooks/useScrollLock';
import ReviewStamp from '@/components/reviews/ReviewStamp';

// Целият текст на един отзив. Същата обвивка като формата за отзив: на телефон излиза отдолу, на по-широк
// екран — в центъра. Затваря се с X, Escape, Назад и клик извън него.
export default function ReviewDetailModal({ review, onClose }: { review: any, onClose: () => void }) {
  // Hook-овете трябва да са ПРЕДИ ранното връщане. Активни са само когато има избрано ревю.
  useBackToClose(!!review, onClose);
  useScrollLock(!!review);

  const uid = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!review) return;
    const html = document.documentElement;
    html.dataset.dialogOpen = 'review';
    panelRef.current?.focus();
    return () => { delete html.dataset.dialogOpen; };
  }, [review]);

  if (!review) return null;

  const rating = review.rating || 5;

  return (
    <div
      className="dialog-backdrop-in fixed inset-0 z-[300] flex items-end justify-center bg-brand-dark/60 sm:items-center sm:p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-name`}
        tabIndex={-1}
        onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
        className="dialog-in flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.5)] focus:outline-none sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-5">
          <ReviewStamp avatarId={review.avatarId} name={review.name} size={48} />
          <div className="min-w-0 flex-1">
            <h2 id={`${uid}-name`} className="truncate font-serif text-2xl italic leading-tight text-brand-dark">{review.name}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-600">
              <span className="flex" role="img" aria-label={`Оценка ${rating} от 5`}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    size={15}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className={star <= rating ? 'fill-brand-gold text-brand-gold' : 'fill-transparent text-slate-300'}
                  />
                ))}
              </span>
              {review.destination && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} className="text-brand-goldDeep" aria-hidden="true" />
                  {review.destination}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Затвори"
            className="flex h-11 w-11 shrink-0 items-center justify-center self-start rounded-full bg-slate-100 text-brand-dark transition-colors hover:bg-brand-dark hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6">
          <p className="whitespace-pre-wrap font-serif text-[18px] leading-[1.7] text-slate-700">
            {review.text}
          </p>
        </div>
      </div>
    </div>
  );
}
