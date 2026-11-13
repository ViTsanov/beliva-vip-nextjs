"use client";

import { useState } from 'react';
import { X, Wallet } from 'lucide-react';
import { useBackToClose } from '@/lib/hooks/useBackToClose';
import { PAYMENT_KINDS, euro, paidTotal, type Payment } from './workflow';

export interface PaymentDraft {
  inquiry: any;
  kind: Payment['kind'];
  suggestedTotal: number; // цена на тура × брой пътници, ако още няма договорена цена
}

// Записва едно плащане (капаро, доплащане, друго или връщане) към резервацията.
// Ако клиентът е платил на агенцията, плащането чака отметка „Преведено на туроператора“.
export default function PaymentDialog({ draft, onClose, onSave }: {
  draft: PaymentDraft;
  onClose: () => void;
  onSave: (payment: Omit<Payment, 'id' | 'createdAt' | 'by'>, totalPrice: number) => Promise<void>;
}) {
  const { inquiry } = draft;
  const already = paidTotal(inquiry);
  const [kind, setKind] = useState<Payment['kind']>(draft.kind);
  const [total, setTotal] = useState<string>(String(Number(inquiry.totalPrice) || draft.suggestedTotal || ''));
  const totalNum = Number(total) || 0;
  const defaultAmount = kind === 'deposit' && totalNum ? '' : kind === 'balance' && totalNum > already ? String(totalNum - already) : '';
  const [amount, setAmount] = useState<string>(defaultAmount);
  const [at, setAt] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<Payment['method']>('bank');
  const [to, setTo] = useState<Payment['to']>('operator');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  useBackToClose(true, onClose);

  const amountNum = Number(amount) || 0;
  const label = 'text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1 mb-1.5 block';
  const field = 'w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-brand-gold';

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center bg-brand-dark/90 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="payment-dialog-title">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-7 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 shrink-0">
          <div>
            <h3 id="payment-dialog-title" className="font-serif italic text-xl text-brand-dark flex items-center gap-2"><Wallet size={20} className="text-brand-gold" /> Плащане</h3>
            <p className="text-xs text-gray-400 mt-1">{inquiry.clientName} · {inquiry.tourTitle}</p>
          </div>
          <button onClick={onClose} aria-label="Затвори" className="p-2 text-gray-300 hover:text-red-500"><X size={22} /></button>
        </div>
        <form
          className="p-7 space-y-4 overflow-y-auto"
          onSubmit={async e => {
            e.preventDefault();
            if (!amountNum) return;
            setSaving(true);
            try {
              await onSave({ kind, amount: amountNum, at, method, to, note: note.trim(), forwardedAt: null }, totalNum);
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={label} htmlFor="pay-total">Обща цена по договор (€)</label>
              <input id="pay-total" type="number" min={0} value={total} onChange={e => setTotal(e.target.value)} className={field} placeholder="за всички пътници" />
              {already > 0 && <p className="text-[11px] text-gray-500 mt-1 ml-1">Платено досега: {euro(already)}{totalNum ? ` · остават ${euro(Math.max(0, totalNum - already))}` : ''}</p>}
            </div>
            <div>
              <label className={label} htmlFor="pay-kind">Вид</label>
              <select id="pay-kind" value={kind} onChange={e => setKind(e.target.value as Payment['kind'])} className={field}>
                {Object.entries(PAYMENT_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="pay-amount">Сума (€) *</label>
              <input id="pay-amount" type="number" min={0} step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className={`${field} text-emerald-800`} />
            </div>
            <div>
              <label className={label} htmlFor="pay-date">Дата</label>
              <input id="pay-date" type="date" value={at} onChange={e => setAt(e.target.value)} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="pay-method">Начин</label>
              <select id="pay-method" value={method} onChange={e => setMethod(e.target.value as Payment['method'])} className={field}>
                <option value="bank">Банков превод</option>
                <option value="cash">В брой</option>
              </select>
            </div>
            <div className="col-span-2">
              <span className={label}>{kind === 'refund' ? 'Кой върна сумата' : 'Кой получи парите'}</span>
              <div className="grid grid-cols-2 gap-2">
                {([['operator', 'Туроператорът'], ['agency', 'Агенцията (ние)']] as const).map(([v, l]) => (
                  <button type="button" key={v} onClick={() => setTo(v)} aria-pressed={to === v} className={`p-3 rounded-2xl text-xs font-bold border transition-colors ${to === v ? 'bg-brand-dark text-white border-brand-dark' : 'border-gray-200 text-gray-600 hover:border-brand-gold'}`}>{l}</button>
                ))}
              </div>
              {to === 'agency' && kind !== 'refund' && (
                <p className="text-[11px] text-amber-700 font-semibold mt-2 ml-1">Сумата трябва да се преведе на туроператора до 1 работен ден. Ще остане напомняне, докато не отбележиш „Преведено“.</p>
              )}
            </div>
            <div className="col-span-2">
              <label className={label} htmlFor="pay-note">Бележка</label>
              <input id="pay-note" value={note} onChange={e => setNote(e.target.value)} className={field} placeholder="напр. основание на превода" />
            </div>
          </div>
          <button type="submit" disabled={saving || !amountNum} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-50">
            {saving ? 'Записване...' : `Запиши ${PAYMENT_KINDS[kind].toLowerCase()}${amountNum ? ` ${euro(amountNum)}` : ''}`}
          </button>
        </form>
      </div>
    </div>
  );
}
