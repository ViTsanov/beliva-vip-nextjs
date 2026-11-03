"use client";
// Допълнителните екскурзии „по желание“ на тура (ITour.extras) в админ формата. AI ги попълва от Word файла на
// 2МКО; тук се поправят, добавят и трият. В текста на деня [*N] показва звездичката на мястото на екскурзия N.

import { Star, Trash2, PlusCircle } from 'lucide-react';
import type { ITourExtra } from '@/types';
import { nextExtraId, markedExtraIds, advanceExtrasTotal, formatEuro } from '@/lib/tourExtras';

const input = "w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/5 outline-none transition-all text-brand-dark font-medium text-sm";
const label = "block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1";

export default function TourExtrasEditor({ extras, onChange, dayTexts }: {
  extras: ITourExtra[];
  onChange: (extras: ITourExtra[]) => void;
  dayTexts: string[]; // текстовете на дните — за да се види коя екскурзия няма звездичка в текста
}) {
  const marked = new Set(dayTexts.flatMap(t => [...markedExtraIds(t)]));
  const total = advanceExtrasTotal(extras);

  const update = (id: string, patch: Partial<ITourExtra>) => onChange(extras.map(e => (e.id === id ? { ...e, ...patch } : e)));
  const remove = (id: string) => onChange(extras.filter(e => e.id !== id));
  const add = () => onChange([...extras, { id: nextExtraId(extras), name: '', info: '', price: '', payment: 'advance' }]);

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
      <div>
        <div className="flex items-center gap-3 text-brand-gold">
          <Star size={20} /> <h3 className="font-bold uppercase tracking-widest text-sm">Допълнителни екскурзии (по желание)</h3>
        </div>
        <p className="text-sm text-gray-500 mt-2 max-w-3xl">
          На сайта всяка излиза като звездичка в текста на деня — с името, описанието и цената при посочване — и в таблица
          с цените. В PDF-а са под деня си и в таблица със сумата. За звездичка в текста на деня напиши <code className="px-1.5 py-0.5 bg-gray-100 rounded text-brand-dark">[*N]</code> след
          мястото, където се споменава екскурзия N.
        </p>
      </div>

      {extras.length === 0 && <p className="text-sm text-gray-400 italic">Няма допълнителни екскурзии.</p>}

      <div className="space-y-4">
        {extras.map(e => (
          <div key={e.id} className="p-5 rounded-3xl border border-gray-100 bg-gray-50/40 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-brand-dark">
                <Star size={14} className="fill-brand-gold text-brand-gold" aria-hidden="true" /> [*{e.id}]
                {!marked.has(e.id) && (
                  <span className="ml-2 font-medium text-amber-600">няма звездичка в текста — на сайта ще е под текста на деня</span>
                )}
              </span>
              <button type="button" onClick={() => remove(e.id)} className="p-2 rounded-full text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" aria-label={`Изтрий „${e.name || 'екскурзията'}“`}>
                <Trash2 size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-12 gap-3">
              <div className="md:col-span-2">
                <label className={label}>Ден</label>
                <input type="number" min={1} className={input} value={e.day ?? ''} onChange={ev => update(e.id, { day: ev.target.value ? Number(ev.target.value) : undefined })} />
              </div>
              <div className="col-span-2 md:col-span-5">
                <label className={label}>Име</label>
                <input className={input} value={e.name} placeholder="пр. Чайна церемония „Садо“" onChange={ev => update(e.id, { name: ev.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className={label}>Цена</label>
                <input className={input} value={e.price} placeholder="пр. 50 €" onChange={ev => update(e.id, { price: ev.target.value })} />
              </div>
              <div className="col-span-2 md:col-span-3">
                <label className={label}>Плащане</label>
                <select className={input} value={e.payment} onChange={ev => update(e.id, { payment: ev.target.value as ITourExtra['payment'] })}>
                  <option value="advance">Предварително (с договора)</option>
                  <option value="onsite">На място</option>
                </select>
              </div>
            </div>
            <div>
              <label className={label}>Какво включва (1–2 изречения)</label>
              <textarea className={`${input} h-16`} value={e.info || ''} onChange={ev => update(e.id, { info: ev.target.value })} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <button type="button" onClick={add} className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border-2 border-dashed border-brand-gold/50 text-brand-goldDeep font-bold text-xs uppercase tracking-widest hover:bg-brand-gold/10 transition-colors">
          <PlusCircle size={16} /> Добави екскурзия
        </button>
        {total !== null && <p className="text-sm text-gray-500">Всички предварителни заедно: <strong className="text-brand-dark">{formatEuro(total)}</strong></p>}
      </div>
    </div>
  );
}
