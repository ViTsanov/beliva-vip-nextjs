"use client";

import { useState } from 'react';
import { MessageSquareHeart, Send } from 'lucide-react';
import {
  getGroupReturnDate, reviewAvailableFrom, sendReviewRequest, formatDateBg, RECENT_RETURN_WINDOW_DAYS,
} from '@/lib/reviewRequests';

// Табло: туристи, които са се върнали наскоро (поне 2 дни, най-много RECENT_RETURN_WINDOW_DAYS), и още не
// им е поискан отзив и не са дали такъв. Бутонът изпраща имейл с личен линк за отзив.
interface ReviewRequestsPanelProps {
  groups: any[];
  allTours: any[];
  customers: any[];
}

export default function ReviewRequestsPanel({ groups, allTours, customers }: ReviewRequestsPanelProps) {
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [sentKeys, setSentKeys] = useState<Set<string>>(new Set());

  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - RECENT_RETURN_WINDOW_DAYS);

  const rows = groups.flatMap(group => {
    const tour = allTours.find(t => t.id === group.tourId);
    const returnDate = getGroupReturnDate(group, tour);
    if (!returnDate || now < reviewAvailableFrom(returnDate) || returnDate < windowStart) return [];
    return (Array.isArray(group.tourists) ? group.tourists : []).flatMap((tourist: any, idx: number) => {
      if (!tourist || tourist.reviewRequestedAt || tourist.reviewReceived) return [];
      const key = `${group.id}:${idx}`;
      if (sentKeys.has(key)) return [];
      const customer = customers.find(c => c.id === tourist.customerId);
      return [{ key, groupId: group.id, idx, name: tourist.name || customer?.name || 'Клиент', tourTitle: group.tourTitle, returnDate, email: customer?.email || '' }];
    });
  }).sort((a, b) => b.returnDate.getTime() - a.returnDate.getTime());

  const handleSend = async (row: (typeof rows)[number]) => {
    setSendingKey(row.key);
    try {
      await sendReviewRequest(row.groupId, row.idx);
      setSentKeys(prev => new Set(prev).add(row.key));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Грешка при изпращане.');
    } finally {
      setSendingKey(null);
    }
  };

  return (
    <section className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="font-serif italic text-2xl text-brand-dark flex items-center gap-2">
            <MessageSquareHeart size={22} className="text-brand-gold" /> Поискайте отзив
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Туристи, върнали се през последните {RECENT_RETURN_WINDOW_DAYS} дни, на които още не е поискан отзив.
          </p>
        </div>
        {rows.length > 0 && (
          <span className="shrink-0 bg-brand-gold/15 text-brand-dark text-xs font-black px-3 py-1.5 rounded-full">{rows.length}</span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 bg-gray-50 rounded-2xl p-5 text-center">Няма туристи, които чакат запитване за отзив.</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {rows.map(row => (
            <li key={row.key} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-brand-dark truncate">{row.name}</p>
                <p className="text-xs text-gray-400 truncate">{row.tourTitle} · върна се на {formatDateBg(row.returnDate)}</p>
              </div>
              <button
                onClick={() => handleSend(row)}
                disabled={!row.email || sendingKey !== null}
                title={row.email ? `Изпраща имейл на ${row.email}` : 'Клиентът няма имейл в профила'}
                className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-dark text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand-gold hover:text-brand-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={12} /> {sendingKey === row.key ? 'Изпращане...' : row.email ? 'Изпрати запитване' : 'Няма имейл'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
