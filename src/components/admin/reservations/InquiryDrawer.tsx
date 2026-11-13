"use client";

import { useEffect, useState } from 'react';
import {
  X, Phone, Mail, Calendar, CheckCircle2, Circle, Clock, Users, Wallet, FileText, History, ListChecks,
  Send, Link2, Copy, RefreshCw, Building2, Trash2, Edit, Undo2, Ban, ExternalLink, AlertTriangle, MessageSquarePlus,
} from 'lucide-react';
import { useBackToClose } from '@/lib/hooks/useBackToClose';
import type { Operator } from '@/lib/operators';
import CopyButton from './CopyButton';
import {
  STEPS, STAGES, PAYMENT_KINDS, stepState, stageOf, nextStep, buildTimeline, formatDateTime, formatDate, payments,
  paidTotal, euro, paxOf, contactText, travelerText, reservationText, unforwardedPayments, nextWorkingDay, toDate,
  type StepKey, type StepDef,
} from './workflow';

export interface DrawerActions {
  toggleStep: (key: StepKey, done: boolean) => Promise<void>;
  addNote: (text: string) => Promise<void>;
  openPayment: (kind: 'deposit' | 'balance' | 'other' | 'refund') => void;
  markForwarded: (paymentId: string) => Promise<void>;
  removePayment: (paymentId: string) => Promise<void>;
  saveFinance: (data: { totalPrice: number; paxCount: number }) => Promise<void>;
  runStep: (step: StepDef) => void;
  emailClient: () => void;
  sendOffer: () => void;
  askOperator: () => void;
  dataLink: (method: 'email' | 'copy') => void;
  correction: (method: 'email' | 'copy') => void;
  sendToOperator: () => void;
  sendProgram: () => void;
  cancel: () => void;
  restore: () => void;
  edit: () => void;
  remove: () => void;
}

type Section = 'steps' | 'history' | 'travelers' | 'payments' | 'documents';

const SECTIONS: { key: Section; label: string; icon: typeof ListChecks }[] = [
  { key: 'steps', label: 'Стъпки', icon: ListChecks },
  { key: 'history', label: 'История', icon: History },
  { key: 'travelers', label: 'Пътници', icon: Users },
  { key: 'payments', label: 'Плащания', icon: Wallet },
  { key: 'documents', label: 'Документи', icon: FileText },
];

export default function InquiryDrawer({ inq, tour, operator, pdfUrl, actions, onClose }: {
  inq: any;
  tour: any;
  operator?: Operator;
  pdfUrl: string;
  actions: DrawerActions;
  onClose: () => void;
}) {
  const [section, setSection] = useState<Section>('steps');
  const [note, setNote] = useState('');
  const [travelers, setTravelers] = useState<any[] | null>(null);
  const [travelersError, setTravelersError] = useState('');
  const [finance, setFinance] = useState({ totalPrice: String(inq.totalPrice || ''), paxCount: String(paxOf(inq) || '') });
  const [busyStep, setBusyStep] = useState<StepKey | null>(null);
  useBackToClose(true, onClose);

  useEffect(() => {
    setFinance({ totalPrice: String(inq.totalPrice || ''), paxCount: String(paxOf(inq) || '') });
  }, [inq.id, inq.totalPrice, inq.paxCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Данните на пътниците се декриптират чак когато се отвори разделът „Пътници“.
  useEffect(() => {
    if (section !== 'travelers' || travelers !== null || !inq.checkoutCompletedAt) return;
    fetch('/api/admin/decrypt-travelers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ travelers: inq.travelers || [] }) })
      .then(r => r.json())
      .then(data => (data.success ? setTravelers(data.travelers) : setTravelersError(data.error || 'Грешка при зареждане.')))
      .catch(() => setTravelersError('Грешка при връзка със сървъра.'));
  }, [section, travelers, inq.checkoutCompletedAt, inq.travelers]);

  const stage = stageOf(inq, tour);
  const stageLabel = STAGES.find(s => s.key === stage)?.label;
  const next = nextStep(inq, tour);
  const timeline = buildTimeline(inq);
  const paid = paidTotal(inq);
  const total = Number(inq.totalPrice) || 0;
  const pending = unforwardedPayments(inq);
  const email = inq.clientEmail && inq.clientEmail !== 'няма имейл' ? inq.clientEmail : '';

  const tabBtn = (s: Section) => `flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-colors ${section === s ? 'bg-brand-dark text-white' : 'text-gray-500 hover:bg-gray-100'}`;
  const actionBtn = 'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-200 text-brand-dark hover:border-brand-gold hover:text-brand-gold transition-colors disabled:opacity-40';

  return (
    <div className="fixed inset-0 z-[140] flex justify-end bg-brand-dark/50 backdrop-blur-[2px]" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        onClick={e => e.stopPropagation()}
        className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
      >
        {/* Заглавие: клиент, контакти, екскурзия, етап */}
        <header className="p-6 border-b border-gray-100 shrink-0 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold">{stageLabel}</span>
              <h2 id="drawer-title" className="font-serif italic text-2xl text-brand-dark flex items-center gap-1">
                {inq.clientName || 'Непознат'} <CopyButton text={inq.clientName || ''} label="Копирай името" />
              </h2>
            </div>
            <button onClick={onClose} aria-label="Затвори" className="p-2 text-gray-300 hover:text-red-500 shrink-0"><X size={24} /></button>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
            {inq.clientPhone && <span className="inline-flex items-center gap-1"><Phone size={14} className="text-gray-400" /><a href={`tel:${inq.clientPhone}`} className="hover:text-brand-gold">{inq.clientPhone}</a><CopyButton text={inq.clientPhone} label="Копирай телефона" /></span>}
            {email && <span className="inline-flex items-center gap-1"><Mail size={14} className="text-gray-400" /><a href={`mailto:${email}`} className="hover:text-brand-gold break-all">{email}</a><CopyButton text={email} label="Копирай имейла" /></span>}
            <CopyButton text={contactText(inq)} label="Копирай контакта" showLabel />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-bold text-brand-dark">{inq.tourTitle || 'Общо запитване'}</span>
            <span className="inline-flex items-center gap-1 text-gray-500"><Calendar size={14} className="text-brand-gold" />{inq.tourDate || 'без дата'}</span>
            {tour?.operator && <span className="inline-flex items-center gap-1 text-gray-500"><Building2 size={14} />{tour.operator}</span>}
            {inq.status !== 'paid' && inq.status !== 'cancelled' && (
              <button onClick={actions.edit} className="inline-flex items-center gap-1 text-xs font-bold text-brand-dark underline underline-offset-2 hover:text-brand-gold"><Edit size={13} /> Смени екскурзия / дата</button>
            )}
          </div>
          {inq.message && <p className="text-xs text-gray-600 italic bg-gray-50 rounded-xl p-3 border border-gray-100">„{inq.message}“</p>}
          {pending.length > 0 && (
            <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle size={14} /> {pending.length === 1 ? 'Едно плащане' : `${pending.length} плащания`} към нас чака{pending.length === 1 ? '' : 'т'} превод на туроператора (до {formatDate(nextWorkingDay(toDate(pending[0].createdAt) || new Date()))}).
            </p>
          )}
          {next && next.action !== 'auto' && (
            <button onClick={() => actions.runStep(next)} className="w-full bg-brand-gold text-brand-dark py-3 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-brand-dark hover:text-white transition-colors">
              Следваща стъпка: {next.cta}
            </button>
          )}
          {next?.action === 'auto' && <p className="text-xs text-gray-500 font-semibold">Следва: {next.label.toLowerCase()} — чака клиента.</p>}
        </header>

        <nav className="px-6 py-3 border-b border-gray-50 flex gap-1 overflow-x-auto shrink-0" aria-label="Раздели">
          {SECTIONS.map(s => (
            <button key={s.key} onClick={() => setSection(s.key)} className={tabBtn(s.key)} aria-current={section === s.key ? 'page' : undefined}>
              <s.icon size={14} /> {s.label}{s.key === 'history' ? ` (${timeline.length})` : ''}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-6">
          {section === 'steps' && (
            <ol className="space-y-1">
              {STEPS.map(step => {
                const st = stepState(inq, step.key);
                const done = !!st;
                // Ръчна отметка: обикновените стъпки, а също оферта и данни към туроператора, ако са минали извън
                // системата (Viber, телефон). Махане — само на ръчно поставени отметки.
                const canTick = done
                  ? !st?.auto && step.key !== 'received'
                  : step.action === 'tick' || step.action === 'offer_email' || step.action === 'operator_send';
                return (
                  <li key={step.key} className={`flex items-start gap-3 p-3 rounded-2xl ${next?.key === step.key ? 'bg-brand-gold/10' : ''}`}>
                    <button
                      type="button"
                      disabled={!canTick || busyStep === step.key}
                      onClick={async () => { setBusyStep(step.key); try { await actions.toggleStep(step.key, !done); } finally { setBusyStep(null); } }}
                      aria-label={done ? `Махни отметката „${step.label}“` : `Отбележи „${step.label}“`}
                      className="mt-0.5 shrink-0 disabled:cursor-default"
                    >
                      {done ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Circle size={20} className={canTick ? 'text-gray-300 hover:text-brand-gold' : 'text-gray-200'} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold ${done ? 'text-brand-dark' : 'text-gray-500'}`}>{step.label}</p>
                      {done ? (
                        <p className="text-[11px] text-gray-400 flex items-center gap-1"><Clock size={10} /> {formatDateTime(st!.at)}{st!.by ? ` · ${st!.by}` : ''}{st!.auto ? ' · автоматично' : ''}</p>
                      ) : step.hint ? (
                        <p className="text-[11px] text-gray-400">{step.hint}</p>
                      ) : null}
                    </div>
                    {!done && step.action !== 'tick' && step.action !== 'auto' && (
                      <button onClick={() => actions.runStep(step)} className="text-[11px] font-bold text-brand-dark underline underline-offset-2 hover:text-brand-gold shrink-0">{step.cta}</button>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {section === 'history' && (
            <div className="space-y-5">
              <form
                onSubmit={async e => { e.preventDefault(); if (!note.trim()) return; await actions.addNote(note.trim()); setNote(''); }}
                className="flex gap-2"
              >
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="Бележка: обадих се, мисли до петък…" aria-label="Нова бележка в историята" className="flex-1 p-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:border-brand-gold" />
                <button type="submit" disabled={!note.trim()} className="inline-flex items-center gap-1.5 bg-brand-dark text-white px-4 rounded-2xl text-xs font-bold hover:bg-brand-gold disabled:opacity-40"><MessageSquarePlus size={15} /> Добави</button>
              </form>
              <ol>
                {timeline.map((event, idx, all) => (
                  <li key={idx} className="relative pl-6 pb-5 last:pb-0">
                    {idx < all.length - 1 && <span className="absolute left-[5px] top-3 bottom-0 w-px bg-gray-200" aria-hidden="true" />}
                    <span className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 ${idx === 0 ? 'border-brand-gold bg-brand-gold' : 'border-gray-300 bg-white'}`} aria-hidden="true" />
                    <p className="text-[11px] font-bold text-gray-400 flex items-center gap-1"><Clock size={10} /> {formatDateTime(event.at)}{event.by ? ` · ${event.by}` : ''}</p>
                    <p className={`text-sm mt-0.5 ${event.type === 'note' ? 'text-gray-700 bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2 inline-block' : 'text-brand-dark'}`}>{event.text}</p>
                  </li>
                ))}
              </ol>
              {(inq.emailLog || []).length > 0 && (
                <details className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <summary className="text-xs font-bold text-gray-600 cursor-pointer">Текстът на изпратените имейли ({inq.emailLog.length})</summary>
                  <div className="space-y-3 mt-3">
                    {inq.emailLog.slice().reverse().map((entry: any, idx: number) => (
                      <div key={idx} className="bg-white rounded-xl p-4 border border-gray-100">
                        <p className="font-bold text-brand-dark text-sm">{entry.subject}</p>
                        <p className="text-[10px] text-gray-400 mb-2">{formatDateTime(entry.sentAt)}{entry.to ? ` · до ${entry.to}` : ''}{entry.by ? ` · ${entry.by}` : ''}</p>
                        <p className="text-xs text-gray-600 whitespace-pre-wrap">{entry.body}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {section === 'travelers' && (
            <div className="space-y-4">
              {!inq.checkoutCompletedAt ? (
                <div className="text-sm text-gray-500 space-y-3">
                  <p>Клиентът още не е попълнил данните на пътниците.</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => actions.dataLink('email')} disabled={!email} className={actionBtn}><Link2 size={15} /> Изпрати линк по имейл</button>
                    <button onClick={() => actions.dataLink('copy')} className={actionBtn}><Copy size={15} /> Копирай линка (Viber/WhatsApp)</button>
                  </div>
                </div>
              ) : travelersError ? (
                <p className="text-sm text-red-600">{travelersError}</p>
              ) : travelers === null ? (
                <p className="text-sm text-gray-400">Зареждане на данните…</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <CopyButton text={reservationText(inq, travelers)} label="Копирай всички пътници (за туроператора)" showLabel className="border border-gray-200 !px-3 !py-2" />
                    <button onClick={actions.sendToOperator} className={actionBtn}><Building2 size={15} /> Изпрати на туроператора (защитен линк)</button>
                    <button onClick={() => actions.correction('email')} disabled={!email} className={actionBtn}><RefreshCw size={15} /> Поискай корекция</button>
                    <button onClick={() => actions.correction('copy')} className={actionBtn}><Copy size={15} /> Линк за корекция</button>
                  </div>
                  {travelers.map((t, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Пътник {idx + 1}</p>
                        <CopyButton text={travelerText(t)} label="Копирай пътника" showLabel />
                      </div>
                      <dl className="grid grid-cols-2 gap-3 text-xs">
                        {([['Име по паспорт', t.latinName], ['ЕГН', t.egn], ['Паспорт №', t.passportNumber], ['Валиден до', t.passportValidity]] as const).map(([k, v]) => (
                          <div key={k}>
                            <dt className="text-gray-400">{k}</dt>
                            <dd className="font-mono font-bold text-brand-dark flex items-center gap-1">{v || '—'} {v && <CopyButton text={String(v)} label={`Копирай: ${k}`} />}</dd>
                          </div>
                        ))}
                      </dl>
                      {t.passportPhoto && (
                        <a href={`/api/admin/passport-photo?path=${encodeURIComponent(t.passportPhoto)}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-dark underline underline-offset-2 hover:text-brand-gold">
                          <ExternalLink size={12} /> Снимка на паспорта
                        </a>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {section === 'payments' && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-2xl p-4"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Цена</p><p className="text-lg font-black text-brand-dark">{total ? euro(total) : '—'}</p></div>
                <div className="bg-emerald-50 rounded-2xl p-4"><p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Платено</p><p className="text-lg font-black text-emerald-800">{euro(paid)}</p></div>
                <div className="bg-amber-50 rounded-2xl p-4"><p className="text-[10px] font-black uppercase text-amber-700 tracking-widest">Остава</p><p className="text-lg font-black text-amber-800">{total ? euro(Math.max(0, total - paid)) : '—'}</p></div>
              </div>
              <form
                onSubmit={async e => { e.preventDefault(); await actions.saveFinance({ totalPrice: Number(finance.totalPrice) || 0, paxCount: Number(finance.paxCount) || 0 }); }}
                className="flex flex-wrap items-end gap-2"
              >
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Обща цена (€)
                  <input type="number" min={0} value={finance.totalPrice} onChange={e => setFinance({ ...finance, totalPrice: e.target.value })} className="block mt-1 w-32 p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none focus:border-brand-gold" />
                </label>
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Пътници
                  <input type="number" min={0} value={finance.paxCount} onChange={e => setFinance({ ...finance, paxCount: e.target.value })} className="block mt-1 w-20 p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none focus:border-brand-gold" />
                </label>
                <button type="submit" className="px-4 py-2.5 rounded-xl text-xs font-bold bg-brand-dark text-white hover:bg-brand-gold">Запази</button>
              </form>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => actions.openPayment('deposit')} className={actionBtn}><Wallet size={15} /> Капаро</button>
                <button onClick={() => actions.openPayment('balance')} className={actionBtn}><Wallet size={15} /> Доплащане</button>
                <button onClick={() => actions.openPayment('refund')} className={actionBtn}><Undo2 size={15} /> Връщане</button>
              </div>
              {payments(inq).length === 0 ? (
                <p className="text-sm text-gray-400">Още няма записани плащания.</p>
              ) : (
                <ul className="divide-y divide-gray-100 border border-gray-100 rounded-2xl">
                  {payments(inq).slice().sort((a, b) => b.at.localeCompare(a.at)).map(p => (
                    <li key={p.id} className="p-4 flex flex-wrap items-center gap-3 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-brand-dark">{PAYMENT_KINDS[p.kind]} · <span className={p.kind === 'refund' ? 'text-red-600' : 'text-emerald-700'}>{p.kind === 'refund' ? '−' : ''}{euro(p.amount)}</span></p>
                        <p className="text-[11px] text-gray-400">{formatDate(p.at)} · {p.method === 'cash' ? 'в брой' : 'банков превод'} · {p.to === 'agency' ? 'към агенцията' : 'към туроператора'}{p.by ? ` · ${p.by}` : ''}{p.note ? ` · ${p.note}` : ''}</p>
                        {p.to === 'agency' && p.kind !== 'refund' && (
                          <p className={`text-[11px] font-bold ${p.forwardedAt ? 'text-emerald-600' : 'text-amber-700'}`}>{p.forwardedAt ? `Преведено на туроператора ${formatDate(p.forwardedAt)}` : 'Чака превод на туроператора'}</p>
                        )}
                      </div>
                      {p.to === 'agency' && p.kind !== 'refund' && !p.forwardedAt && (
                        <button onClick={() => actions.markForwarded(p.id)} className="px-3 py-2 rounded-xl text-[11px] font-bold bg-amber-500 text-white hover:bg-amber-600">Преведено</button>
                      )}
                      <button onClick={() => actions.removePayment(p.id)} aria-label="Изтрий плащането" className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={15} /></button>
                    </li>
                  ))}
                </ul>
              )}
              {inq.status !== 'paid' && (
                <button onClick={() => actions.runStep(STEPS.find(s => s.key === 'fully_paid')!)} disabled={!inq.checkoutCompletedAt} className="w-full bg-emerald-500 text-white py-3 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-emerald-600 disabled:opacity-40">
                  Платено изцяло — създай клиент и група
                </button>
              )}
              {!inq.checkoutCompletedAt && inq.status !== 'paid' && <p className="text-[11px] text-gray-400">„Платено изцяло“ става възможно, след като клиентът попълни данните на пътниците.</p>}
            </div>
          )}

          {section === 'documents' && (
            <div className="space-y-5">
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-3">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Програма (PDF)</p>
                {pdfUrl ? (
                  <div className="flex flex-wrap gap-2">
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className={actionBtn}><ExternalLink size={15} /> Отвори</a>
                    <CopyButton text={pdfUrl} label="Копирай линка към програмата" showLabel className="border border-gray-200 !px-3 !py-2" />
                    <button onClick={actions.sendProgram} disabled={!email} className={actionBtn}><Send size={15} /> Изпрати по имейл</button>
                  </div>
                ) : <p className="text-sm text-gray-400">Запитването не е за конкретна екскурзия.</p>}
              </div>
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-3">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Туроператор</p>
                {operator ? (
                  <div className="text-sm text-gray-700 space-y-1">
                    <p className="font-bold">{operator.legalName || operator.name}{operator.regNumber ? ` · рег. № ${operator.regNumber}` : ''}</p>
                    {operator.email && <p className="flex items-center gap-1">{operator.email} <CopyButton text={operator.email} label="Копирай имейла на туроператора" /></p>}
                    {operator.phone && <p>{operator.phone}</p>}
                    {operator.termsUrl && <a href={operator.termsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold underline underline-offset-2 hover:text-brand-gold"><ExternalLink size={12} /> Общи условия на туроператора</a>}
                    {(!operator.legalName || !operator.address) && <p className="text-[11px] text-amber-700 font-semibold">Липсват данни за офертата — попълни ги в Настройки → Турооператори.</p>}
                  </div>
                ) : <p className="text-sm text-gray-400">Туроператорът на екскурзията не е в Настройки → Турооператори.</p>}
                <div className="flex flex-wrap gap-2">
                  <button onClick={actions.askOperator} disabled={!operator?.email || !inq.tourId} className={actionBtn}><Mail size={15} /> Питай за места по имейл</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={actions.emailClient} disabled={!email} className={actionBtn}><Send size={15} /> Свободен имейл до клиента</button>
                <button onClick={actions.sendOffer} disabled={!email} className={actionBtn}><FileText size={15} /> Оферта по имейл</button>
              </div>
            </div>
          )}
        </div>

        {/* Редки и опасни действия — най-отдолу, отделно */}
        <footer className="p-4 border-t border-gray-100 flex flex-wrap gap-2 shrink-0 bg-gray-50/60">
          <button onClick={actions.edit} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-gray-600 hover:bg-white"><Edit size={14} /> Редактирай</button>
          {inq.status === 'cancelled'
            ? <button onClick={actions.restore} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-gray-600 hover:bg-white"><Undo2 size={14} /> Върни от архива</button>
            : inq.status !== 'paid' && <button onClick={actions.cancel} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-gray-600 hover:bg-white"><Ban size={14} /> Отказано</button>}
          <button onClick={actions.remove} className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-red-500 hover:bg-red-50"><Trash2 size={14} /> Изтрий</button>
        </footer>
      </aside>
    </div>
  );
}
