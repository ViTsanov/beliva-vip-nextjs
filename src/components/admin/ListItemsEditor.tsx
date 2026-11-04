"use client";
// Списък с по едно поле за всяка точка — „Цената включва“, „Не включва“, „Документи“ в админ формата.
// Enter добавя нова точка под текущата; поставен текст с няколко реда става няколко точки.

import { useEffect, useRef } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';

const field = "flex-1 min-w-0 p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/5 outline-none transition-all text-brand-dark text-sm font-medium resize-y";

export default function ListItemsEditor({ label, labelClassName, items, onChange, addLabel, placeholder }: {
  label: string;
  labelClassName?: string;
  items: string[];
  onChange: (items: string[]) => void;
  addLabel: string;
  placeholder?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // Новата точка получава курсора веднага щом се появи
  const focusAfterRender = useRef<number | null>(null);
  useEffect(() => {
    if (focusAfterRender.current === null) return;
    listRef.current?.querySelectorAll('textarea')[focusAfterRender.current]?.focus();
    focusAfterRender.current = null;
  });
  const update = (index: number, value: string) => onChange(items.map((item, i) => (i === index ? value : item)));
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  const insertAfter = (index: number, added: string[]) => {
    focusAfterRender.current = index + added.length;
    onChange([...items.slice(0, index + 1), ...added, ...items.slice(index + 1)]);
  };

  return (
    <div>
      <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-2 ${labelClassName || 'text-gray-400'}`}>
        {label} <span className="text-gray-400">({items.filter(item => item.trim()).length})</span>
      </label>
      <div ref={listRef} className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <textarea
              className={field}
              rows={Math.max(1, Math.ceil(item.length / 55))}
              value={item}
              placeholder={placeholder}
              aria-label={`${label}, точка ${i + 1}`}
              onChange={e => update(i, e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  insertAfter(i, ['']);
                }
              }}
              onPaste={e => {
                const lines = e.clipboardData.getData('text').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
                if (lines.length < 2) return;
                e.preventDefault();
                const [first, ...rest] = lines;
                const next = [...items];
                next[i] = `${item}${item && first ? ' ' : ''}${first}`;
                next.splice(i + 1, 0, ...rest);
                onChange(next);
              }}
            />
            <button type="button" onClick={() => remove(i)} className="p-2.5 mt-0.5 rounded-full text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" aria-label={`Изтрий точка ${i + 1}`}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => insertAfter(items.length - 1, [''])} className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 font-bold text-[11px] uppercase tracking-widest hover:border-brand-gold hover:text-brand-goldDeep transition-colors">
        <PlusCircle size={15} /> {addLabel}
      </button>
    </div>
  );
}
