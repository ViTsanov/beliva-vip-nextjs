"use client";

import { useEffect, useRef, useState } from 'react';
import { Phone, X } from 'lucide-react';
import InquiryForm from './InquiryForm';
import type { InquiryInput } from '@/lib/sendInquiry';
import { COMPANY_INFO } from '@/lib/companyInfo';
import { useBackToClose } from '@/lib/hooks/useBackToClose';
import { useScrollLock } from '@/lib/hooks/useScrollLock';

interface InquiryDialogProps {
  open: boolean;
  onClose: () => void;
  defaultTourSlug?: string;
  // Предварително избрана дестинация (страницата на държава), когато запитването не е за конкретен тур.
  defaultCountry?: string;
  // Откъде е запитването — за статистиката в CRM-а (менюто или бутона на страницата на тура).
  source?: InquiryInput['source'];
}

// Прозорецът „Запитване“ от менюто. На телефон излиза отдолу (като лист), на по-широк екран — в центъра.
// Затваря се с X, Escape, клик извън него и бутона Назад; страницата отдолу не скролва; фокусът остава вътре.
// Плаващите бутони (чат, „нагоре“, бисквитки) се скриват, докато е отворен (data-dialog-open, globals.css).
export default function InquiryDialog({ open, onClose, defaultTourSlug, defaultCountry, source = 'navbar_modal' }: InquiryDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useBackToClose(open, onClose);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    html.dataset.dialogOpen = 'inquiry';
    return () => { delete html.dataset.dialogOpen; };
  }, [open]);

  // Клавиатурата на телефона закрива долната част на екрана, а 100dvh не се намалява с нея — полетата отдолу оставаха
  // под клавиатурата. Затова на телефон затъмнението (и листът в него) следи visualViewport: точно височината и
  // мястото на видимото над клавиатурата. Същото прави чатът (AIChatWidget).
  const [visibleArea, setVisibleArea] = useState<{ height: number; top: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!open || window.innerWidth >= 640 || !vv) return;
    const update = () => setVisibleArea({ height: vv.height, top: vv.offsetTop });
    const first = setTimeout(update, 0);
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      clearTimeout(first);
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      setVisibleArea(null);
    };
  }, [open]);

  // Само с мишка курсорът отива направо в полето „Име“. На телефон фокус в поле отваря клавиатурата още преди
  // човек да е избрал къде да пише — затова там фокусът е на самия прозорец (за екранните четци), без клавиатура.
  // (Затворен прозорец не рендира нищо, затова разликата сървър/браузър тук не пречи на хидратацията.)
  const [finePointer] = useState(() => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  useEffect(() => {
    if (open && !finePointer) requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
  }, [open, finePointer]);

  if (!open) return null;

  // Escape затваря; Tab обикаля само в прозореца.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="dialog-backdrop-in fixed inset-x-0 top-0 z-[300] flex h-[100dvh] items-end justify-center bg-brand-dark/60 sm:items-center sm:p-4"
      // На телефон: точно видимото над клавиатурата (виж visibleArea); иначе цял екран
      style={visibleArea ? { height: visibleArea.height, top: visibleArea.top } : undefined}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-dialog-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        // max-h спрямо затъмнението (то следи клавиатурата), не спрямо екрана
        className="dialog-in flex max-h-[92%] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.5)] outline-none sm:max-h-[92dvh] sm:max-w-xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 id="inquiry-dialog-title" className="font-serif text-2xl italic leading-tight text-brand-dark">Запитване</h2>
            <p className="mt-1 text-[13px] text-slate-600">
              Отговаряме до 24 часа. Или се обадете:{' '}
              <a href={`tel:${COMPANY_INFO.phone}`} className="inline-flex items-center gap-1 font-semibold text-brand-dark underline decoration-brand-gold decoration-2 underline-offset-4">
                <Phone size={13} aria-hidden="true" />
                {COMPANY_INFO.phone}
              </a>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Затвори запитването"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-brand-dark transition-colors hover:bg-brand-dark hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {/* min-h-0: без него флекс колоната не позволява на тази част да се свие под височината на формата —
            долните полета се изрязваха вместо да се скролват */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
          <InquiryForm source={source} defaultTourSlug={defaultTourSlug} defaultCountry={defaultCountry} autoFocus={finePointer} onDone={onClose} />
        </div>
      </div>
    </div>
  );
}
