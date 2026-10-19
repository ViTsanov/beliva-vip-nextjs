"use client";

import React, { useEffect, useId, useRef, useState } from 'react';
import { X, AlertCircle, Loader2, Star } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // 👈 Next.js import
import { useBackToClose } from '@/lib/hooks/useBackToClose';
import { useScrollLock } from '@/lib/hooks/useScrollLock';
import ReviewStamp, { REVIEW_AVATARS } from '@/components/reviews/ReviewStamp';

interface ReviewModalProps {
  onClose: () => void;
}

const RATING_WORDS = ['', 'Слабо', 'Средно', 'Добре', 'Много добре', 'Отлично'];
const TEXT_MAX = 1500;

const labelClass = 'mb-1.5 block text-[13px] font-semibold text-brand-dark';
const fieldClass =
  'block w-full rounded-xl border border-slate-300 bg-white px-4 text-[15px] text-brand-dark placeholder:text-slate-400 transition-colors focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-dark/15';

// Прозорецът „Споделете пътуването“: картинката до името е пощенска марка (пътешественик, пътешественичка,
// семейство или първата буква от името), после име, дестинация, оценка и текст.
// На телефон излиза отдолу (като лист), на по-широк екран — в центъра. Затваря се с X, Escape, Назад
// и клик извън него (само докато нищо не е написано — за да не се губи текст).
export default function ReviewModal({ onClose }: ReviewModalProps) {
  // Компонентът се монтира само докато е отворен → винаги активен. Назад го затваря.
  useBackToClose(true, onClose);
  useScrollLock(true);

  const uid = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    destination: '',
    text: '',
    rating: 5,
    avatarId: 'none',
  });
  const [hoverRating, setHoverRating] = useState(0);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  // Плаващите бутони (чат, „нагоре“, бисквитки) се скриват, докато прозорецът е отворен (globals.css)
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.dialogOpen = 'review';
    panelRef.current?.focus();
    return () => { delete html.dataset.dialogOpen; };
  }, []);

  const update = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) =>
    setFormData(prev => ({ ...prev, [key]: value }));

  const isDirty = !!(formData.name.trim() || formData.destination.trim() || formData.text.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    try {
      await addDoc(collection(db, "reviews"), {
        ...formData,
        name: formData.name.trim(),
        destination: formData.destination.trim(),
        text: formData.text.trim(),
        isVisible: true,
        createdAt: serverTimestamp(),
      });
      setStatus('success');
    } catch (error) {
      console.error("Грешка:", error);
      setStatus('error');
    }
  };

  // Escape затваря; Tab обикаля само в прозореца
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]):not([type="radio"]), input[type="radio"]:checked, textarea:not([disabled])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const shownRating = hoverRating || formData.rating;
  const firstName = formData.name.trim().split(/\s+/)[0];

  return (
    <div
      className="dialog-backdrop-in fixed inset-0 z-[300] flex items-end justify-center bg-brand-dark/60 sm:items-center sm:p-4"
      onMouseDown={e => { if (e.target === e.currentTarget && !isDirty && status !== 'submitting') onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="dialog-in flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.5)] focus:outline-none sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 id={`${uid}-title`} className="font-serif text-2xl italic leading-tight text-brand-dark">
              {status === 'success' ? 'Отзивът е публикуван' : 'Оставете отзив'}
            </h2>
            {status !== 'success' && (
              <p className="mt-1 text-[13px] text-slate-600">Отзивът се появява сред останалите веднага след публикуване.</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Затвори"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-brand-dark transition-colors hover:bg-brand-dark hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {status === 'success' ? (
          <div className="flex flex-col items-center px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 text-center" role="status">
            <ReviewStamp avatarId={formData.avatarId} name={formData.name} size={88} postmarked />
            <p className="mt-6 max-w-xs text-[15px] leading-relaxed text-slate-600">
              Благодарим{firstName ? `, ${firstName}` : ''}! Отзивът ви вече се вижда сред останалите.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 inline-flex h-12 items-center rounded-full bg-brand-dark px-8 text-[15px] font-semibold text-white transition-colors hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
            >
              Затвори
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto overscroll-contain px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
            {/* МАРКИТЕ — картинката до името */}
            <fieldset>
              <legend className={labelClass}>Картинка до името ви</legend>
              <div className="mt-1 grid grid-cols-4 gap-2 sm:gap-3">
                {REVIEW_AVATARS.map(avatar => {
                  const selected = formData.avatarId === avatar.id;
                  return (
                    <label key={avatar.id} className="group flex cursor-pointer flex-col items-center gap-2">
                      <input
                        type="radio"
                        name={`${uid}-avatar`}
                        value={avatar.id}
                        checked={selected}
                        onChange={() => update('avatarId', avatar.id)}
                        aria-label={avatar.label}
                        className="peer sr-only"
                      />
                      <span
                        className={`block w-full max-w-[88px] rounded-md p-1 transition-transform duration-150 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-brand-dark ${
                          selected ? '-rotate-2' : 'group-hover:-translate-y-0.5'
                        }`}
                      >
                        <ReviewStamp avatarId={avatar.id} name={formData.name} postmarked={selected} />
                      </span>
                      <span className={`text-[12px] leading-none ${selected ? 'font-semibold text-brand-dark' : 'text-slate-500'}`}>
                        {avatar.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor={`${uid}-name`} className={labelClass}>Име</label>
                <input
                  id={`${uid}-name`}
                  required
                  maxLength={60}
                  autoComplete="name"
                  placeholder="Напр. Мария Петрова"
                  className={`${fieldClass} h-12`}
                  value={formData.name}
                  onChange={e => update('name', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor={`${uid}-destination`} className={labelClass}>
                  Къде пътувахте <span className="font-normal text-slate-500">(по желание)</span>
                </label>
                <input
                  id={`${uid}-destination`}
                  maxLength={80}
                  placeholder="Напр. Япония"
                  className={`${fieldClass} h-12`}
                  value={formData.destination}
                  onChange={e => update('destination', e.target.value)}
                />
              </div>
            </div>

            {/* ОЦЕНКА */}
            <fieldset className="mt-6">
              <legend className={labelClass}>Оценка</legend>
              <div className="flex items-center gap-3">
                <div className="flex" onMouseLeave={() => setHoverRating(0)}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <label
                      key={star}
                      className="cursor-pointer p-1"
                      onMouseEnter={() => setHoverRating(star)}
                    >
                      <input
                        type="radio"
                        name={`${uid}-rating`}
                        value={star}
                        checked={formData.rating === star}
                        onChange={() => update('rating', star)}
                        className="peer sr-only"
                        aria-label={`${star} от 5`}
                      />
                      <Star
                        size={30}
                        strokeWidth={1.5}
                        aria-hidden="true"
                        className={`rounded-sm transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-dark ${
                          star <= shownRating ? 'fill-brand-gold text-brand-gold' : 'fill-transparent text-slate-300'
                        }`}
                      />
                    </label>
                  ))}
                </div>
                <span className="text-[14px] font-medium text-slate-600" aria-hidden="true">{RATING_WORDS[shownRating]}</span>
              </div>
            </fieldset>

            <div className="mt-6">
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <label htmlFor={`${uid}-text`} className="text-[13px] font-semibold text-brand-dark">Вашият отзив</label>
                <span className="text-[12px] tabular-nums text-slate-400">{formData.text.length}/{TEXT_MAX}</span>
              </div>
              <textarea
                id={`${uid}-text`}
                required
                rows={5}
                maxLength={TEXT_MAX}
                placeholder="Какво ви остана в спомените — места, хора, групата, Поли…"
                className={`${fieldClass} resize-none py-3 leading-relaxed`}
                value={formData.text}
                onChange={e => update('text', e.target.value)}
              />
            </div>

            {status === 'error' && (
              <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-[14px] text-red-700">
                <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                <p>Отзивът не се публикува. Проверете връзката с интернет и натиснете „Публикувай отзива“ отново.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-dark py-3.5 text-[15px] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-slate-700 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
            >
              {status === 'submitting' ? (
                <><Loader2 size={18} className="motion-safe:animate-spin" aria-hidden="true" /> Публикуваме…</>
              ) : (
                'Публикувай отзива'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
