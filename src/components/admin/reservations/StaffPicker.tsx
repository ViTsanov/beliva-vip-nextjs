"use client";

import { useState, useSyncExternalStore } from 'react';
import { UserRound, X } from 'lucide-react';
import { useBackToClose } from '@/lib/hooks/useBackToClose';
import { getStaffName, getStaffNames, setStaffName } from './workflow';

const STAFF_EVENT = 'beliva-staff-changed';

// Името на служителя, който работи на този компютър. Записва се към всяко действие в историята.
const subscribe = (cb: () => void) => {
  window.addEventListener(STAFF_EVENT, cb);
  return () => window.removeEventListener(STAFF_EVENT, cb);
};
const noopSubscribe = () => () => {};

export function useStaffName(): [string, (name: string) => void] {
  // На сървъра няма localStorage — там името е празно, в браузъра идва от localStorage.
  const name = useSyncExternalStore(subscribe, getStaffName, () => '');
  const update = (value: string) => {
    setStaffName(value);
    window.dispatchEvent(new Event(STAFF_EVENT));
  };
  return [name, update];
}

export default function StaffPicker() {
  const [name, setName] = useStaffName();
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [manualOpen, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  // Първо влизане на този компютър (още няма име) — питаме веднага, за да има име в историята от първото действие.
  const open = manualOpen || (isClient && !name);
  useBackToClose(manualOpen && !!name, () => setOpen(false));

  const save = () => {
    const value = draft.trim();
    if (!value) return;
    setName(value);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setDraft(name); setOpen(true); }}
        className="inline-flex items-center gap-2 bg-white border border-gray-100 shadow-sm rounded-2xl px-4 py-3 text-xs font-bold text-brand-dark hover:border-brand-gold transition-colors"
      >
        <UserRound size={16} className="text-brand-gold" />
        {name ? <>Работи: {name}</> : 'Кой работи сега?'}
      </button>

      {open && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-brand-dark/80 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="staff-picker-title">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h3 id="staff-picker-title" className="font-serif italic text-xl text-brand-dark">Кой работи сега?</h3>
              {name && <button onClick={() => setOpen(false)} aria-label="Затвори" className="p-2 text-gray-300 hover:text-red-500"><X size={20} /></button>}
            </div>
            <p className="text-xs text-gray-500">Името се записва към всяко действие в историята на запитванията и се помни на този компютър.</p>
            {getStaffNames().length > 0 && (
              <div className="flex flex-wrap gap-2">
                {getStaffNames().map(n => (
                  <button key={n} onClick={() => { setName(n); setOpen(false); }} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${n === name ? 'bg-brand-gold border-brand-gold text-brand-dark' : 'border-gray-200 text-gray-600 hover:border-brand-gold'}`}>
                    {n}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={e => { e.preventDefault(); save(); }} className="flex gap-2">
              <input
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Твоето име"
                aria-label="Име на служителя"
                className="flex-1 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-brand-gold"
              />
              <button type="submit" disabled={!draft.trim()} className="bg-brand-dark text-white px-5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-gold disabled:opacity-40">Запази</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
