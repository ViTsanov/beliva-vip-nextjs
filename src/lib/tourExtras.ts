// src/lib/tourExtras.ts
//
// Допълнителните екскурзии „по желание“ (ITour.extras). В текста на деня мястото на всяка се отбелязва с [*<id>]:
// на сайта там излиза звездичка с цената при посочване (TourTabs), а в PDF-а маркерът се маха и екскурзиите на
// деня се изброяват под текста му. Общи са за сайта, PDF-а, админ формата и AI пренаписването.

import type { ITourExtra } from '@/types';

export const EXTRA_MARKER = /\[\*\s*(\d+)\s*\]/g;

/** Данни от базата, AI или формата → само валидни екскурзии, с уникални id. */
export function normalizeExtras(raw: unknown): ITourExtra[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ITourExtra[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const e = item as Record<string, unknown>;
    const name = String(e.name ?? '').trim();
    if (!name) continue;
    let id = String(e.id ?? '').replace(/[^\d]/g, '');
    if (!id || seen.has(id)) id = nextExtraId(out);
    seen.add(id);
    const day = Number(e.day);
    out.push({
      id,
      ...(Number.isInteger(day) && day > 0 ? { day } : {}),
      name,
      info: String(e.info ?? '').trim(),
      price: String(e.price ?? '').trim(),
      payment: e.payment === 'onsite' ? 'onsite' : 'advance',
    });
  }
  return out;
}

/** Следващият свободен номер — след най-големия, за да не се пренасочат стари [*N] към нова екскурзия. */
export function nextExtraId(extras: Pick<ITourExtra, 'id'>[]): string {
  return String(extras.reduce((max, e) => Math.max(max, Number(e.id) || 0), 0) + 1);
}

export type TextPart = { text: string } | { extra: ITourExtra };

/** Текстът на деня на части: обикновен текст и звездички. Маркер към несъществуваща екскурзия изчезва. */
export function splitByExtras(text: string, extras: ITourExtra[]): TextPart[] {
  const byId = new Map(extras.map(e => [e.id, e]));
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(EXTRA_MARKER)) {
    const before = text.slice(last, m.index);
    if (before) parts.push({ text: before });
    const extra = byId.get(m[1]);
    if (extra) parts.push({ extra });
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** Текстът без маркерите (за PDF, търсачки и места без звездички). */
export const stripExtraMarkers = (text: string) =>
  text.replace(/\s*\[\*\s*\d+\s*\]/g, '').replace(/[ \t]{2,}/g, ' ');

/** id-тата на екскурзиите, отбелязани в текста. */
export const markedExtraIds = (text: string) => new Set([...text.matchAll(EXTRA_MARKER)].map(m => m[1]));

export const extrasForDay = (extras: ITourExtra[], day: number) => extras.filter(e => e.day === day);

/** „32 €“, „1 079 €“, „75.50 €“ → число; цена в друга валута, „около …“ или „по запитване“ → null. */
export function euroAmount(price: string): number | null {
  const m = price.trim().match(/^(\d{1,3}(?:[  ]\d{3})*|\d+)(?:[.,](\d{1,2}))?\s*(?:€|евро|EUR)$/i);
  if (!m) return null;
  return Number(m[1].replace(/[  ]/g, '')) + (m[2] ? Number(`0.${m[2]}`) : 0);
}

/** Сумата на предварителните екскурзии — само ако всички са с точна цена в евро. */
export function advanceExtrasTotal(extras: ITourExtra[]): number | null {
  const advance = extras.filter(e => e.payment === 'advance');
  if (advance.length < 2) return null;
  let sum = 0;
  for (const e of advance) {
    const value = euroAmount(e.price);
    if (value === null) return null;
    sum += value;
  }
  return sum;
}

/** 4316 → „4 316 €“ (неразделящ интервал, за да не се пренася на два реда). */
// Ръчно групиране: bg-BG в toLocaleString не разделя четирицифрени числа („4316“)
export function formatEuro(value: number) {
  const [whole, cents] = (Math.round(value * 100) / 100).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${grouped}${cents === '00' ? '' : `,${cents}`} €`;
}

export const paymentLabel = (payment: ITourExtra['payment']) =>
  payment === 'onsite' ? 'плаща се на място' : 'заявява се предварително';
