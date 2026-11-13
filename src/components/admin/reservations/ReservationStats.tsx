"use client";

import { useMemo, useState } from 'react';
import { Download, AlertTriangle } from 'lucide-react';
import type { Operator } from '@/lib/operators';
import {
  stageOf, STAGES, tripStart, toDate, daysUntil, euro, paxOf, totalPriceOf, paidOf, unforwardedPayments, formatDate,
} from './workflow';

// „Справки“: всичко за запитванията и резервациите на едно място — колко, за колко, какво е платено, какво предстои.
// Резервация = има плащане или е отбелязана „Платено“. Отказаните не влизат в сумите, броят се отделно.

interface Row {
  inq: any;
  tour: any;
  stage: ReturnType<typeof stageOf>;
  operator: string;
  booked: boolean;
  cancelled: boolean;
  total: number;
  paid: number;
  pax: number;
  start: Date | null;
  created: Date | null;
}

const th = 'p-3 text-[10px] font-black uppercase text-gray-400 tracking-widest whitespace-nowrap';
const td = 'p-3 text-sm text-brand-dark whitespace-nowrap';
const num = `${td} text-right tabular-nums`;

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{label}</p>
      <p className="text-2xl font-black text-brand-dark mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <h3 className="px-6 pt-5 pb-3 font-bold text-brand-dark">{title}{count !== undefined ? <span className="text-gray-400 font-semibold"> · {count}</span> : null}</h3>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function csvCell(v: unknown): string {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function ReservationStats({ inquiries, tours, customers, operators, onOpen }: {
  inquiries: any[];
  tours: any[];
  customers: any[];
  operators: Operator[];
  onOpen: (inq: any) => void;
}) {
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [basis, setBasis] = useState<'trip' | 'created'>('trip');
  const [operatorFilter, setOperatorFilter] = useState('');

  const rows: Row[] = useMemo(() => {
    const byId = new Map(tours.map(t => [t.id, t]));
    return inquiries.map(inq => {
      const tour = byId.get(inq.tourId);
      const cancelled = inq.status === 'cancelled';
      const paid = paidOf(inq, customers);
      return {
        inq, tour, cancelled,
        stage: stageOf(inq, tour),
        operator: tour?.operator || 'Без туроператор',
        booked: !cancelled && (inq.status === 'paid' || paid > 0),
        total: totalPriceOf(inq, customers),
        paid,
        pax: paxOf(inq),
        start: tripStart(inq),
        created: toDate(inq.createdAt),
      };
    });
  }, [inquiries, tours, customers]);

  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    rows.forEach(r => { if (r.start) set.add(r.start.getFullYear()); if (r.created) set.add(r.created.getFullYear()); });
    return Array.from(set).sort((a, b) => b - a);
  }, [rows]);

  const filtered = rows.filter(r => {
    if (operatorFilter && r.operator !== operatorFilter) return false;
    if (year === 'all') return true;
    const d = basis === 'trip' ? r.start : r.created;
    return d ? String(d.getFullYear()) === year : false;
  });

  const booked = filtered.filter(r => r.booked);
  const sum = (list: Row[], f: (r: Row) => number) => list.reduce((s, r) => s + f(r), 0);
  const remaining = (r: Row) => (r.total ? Math.max(0, r.total - r.paid) : 0);
  const commissionPct = (name: string) => operators.find(o => o.name === name)?.commissionPercent || 0;
  const commission = (r: Row) => (r.total * commissionPct(r.operator)) / 100;
  const hasCommission = operators.some(o => (o.commissionPercent || 0) > 0);

  const depositOnly = booked.filter(r => r.inq.status !== 'paid').sort((a, b) => (a.start?.getTime() || 0) - (b.start?.getTime() || 0));
  const fullyPaid = booked.filter(r => r.inq.status === 'paid').sort((a, b) => (a.start?.getTime() || 0) - (b.start?.getTime() || 0));
  const unforwarded = filtered.flatMap(r => unforwardedPayments(r.inq).map(p => ({ r, p })));

  const group = <K extends string>(list: Row[], key: (r: Row) => K) => {
    const map = new Map<K, Row[]>();
    list.forEach(r => { const k = key(r); map.set(k, [...(map.get(k) || []), r]); });
    return Array.from(map.entries());
  };

  const byOperator = group(filtered, r => r.operator).sort((a, b) => sum(b[1].filter(r => r.booked), r => r.total) - sum(a[1].filter(r => r.booked), r => r.total));
  const byDeparture = group(booked, r => `${r.inq.tourTitle || 'Екскурзия'}|${r.inq.tourDate || '—'}`).sort((a, b) => (a[1][0].start?.getTime() || 0) - (b[1][0].start?.getTime() || 0));
  const monthOf = (r: Row) => { const d = basis === 'trip' ? r.start : r.created; return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'без дата'; };
  const byMonth = group(filtered, monthOf).sort((a, b) => a[0].localeCompare(b[0]));
  const byStage = STAGES.map(s => ({ ...s, count: filtered.filter(r => r.stage === s.key).length }));

  const exportCsv = () => {
    const header = ['Клиент', 'Телефон', 'Имейл', 'Екскурзия', 'Дата', 'Туроператор', 'Етап', 'Статус', 'Пътници', 'Цена €', 'Платено €', 'Остава €', 'Получено запитване'];
    const lines = filtered.map(r => [
      r.inq.clientName, r.inq.clientPhone, r.inq.clientEmail, r.inq.tourTitle, r.inq.tourDate, r.operator,
      STAGES.find(s => s.key === r.stage)?.label, r.cancelled ? 'отказано' : r.booked ? 'резервация' : 'запитване',
      r.pax || '', r.total || '', r.paid || '', remaining(r) || '', formatDate(r.inq.createdAt),
    ].map(csvCell).join(';'));
    // BOM, за да отвори Excel кирилицата правилно
    const blob = new Blob(['﻿' + [header.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rezervacii-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const select = 'p-3 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-brand-dark outline-none focus:border-brand-gold shadow-sm';
  const clickable = 'hover:bg-gray-50 cursor-pointer';

  return (
    <div className="space-y-6">
      {/* Филтри — един ред над всичко */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={year} onChange={e => setYear(e.target.value)} className={select} aria-label="Година">
          {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
          <option value="all">Всички години</option>
        </select>
        <select value={basis} onChange={e => setBasis(e.target.value as 'trip' | 'created')} className={select} aria-label="По коя дата">
          <option value="trip">по дата на пътуване</option>
          <option value="created">по дата на запитване</option>
        </select>
        <select value={operatorFilter} onChange={e => setOperatorFilter(e.target.value)} className={select} aria-label="Туроператор">
          <option value="">Всички туроператори</option>
          {Array.from(new Set(rows.map(r => r.operator))).sort().map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <button onClick={exportCsv} className="ml-auto inline-flex items-center gap-2 bg-brand-dark text-white px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-brand-gold"><Download size={15} /> Excel (CSV)</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label="Запитвания" value={String(filtered.length)} sub={`${filtered.filter(r => r.cancelled).length} отказани`} />
        <Tile label="Резервации" value={String(booked.length)} sub={filtered.length ? `${Math.round((booked.length / filtered.length) * 100)}% от запитванията` : undefined} />
        <Tile label="Пътници" value={String(sum(booked, r => r.pax))} sub="в резервациите" />
        <Tile label="Стойност на резервациите" value={euro(sum(booked, r => r.total))} />
        <Tile label="Получени плащания" value={euro(sum(booked, r => r.paid))} />
        <Tile label="Остава да се плати" value={euro(sum(booked, remaining))} sub={`${depositOnly.length} резервации с капаро`} />
        <Tile label="Платени изцяло" value={String(fullyPaid.length)} sub={euro(sum(fullyPaid, r => r.total))} />
        <Tile label="Очаквана комисионна" value={hasCommission ? euro(sum(booked, commission)) : '—'} sub={hasCommission ? 'по % от Настройки' : 'добави % в Настройки → Турооператори'} />
      </div>

      <div className="flex flex-wrap gap-2">
        {byStage.map(s => (
          <span key={s.key} className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold text-gray-600">{s.label}: <span className="text-brand-dark">{s.count}</span></span>
        ))}
      </div>

      {unforwarded.length > 0 && (
        <Section title="Плащания към нас, които чакат превод на туроператора" count={unforwarded.length}>
          <table className="w-full text-left">
            <thead><tr className="bg-gray-50"><th className={th}>Клиент</th><th className={th}>Екскурзия</th><th className={th}>Платено на</th><th className={`${th} text-right`}>Сума</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {unforwarded.map(({ r, p }) => (
                <tr key={p.id} className={clickable} onClick={() => onOpen(r.inq)}>
                  <td className={td}><span className="inline-flex items-center gap-1"><AlertTriangle size={13} className="text-amber-600" /> {r.inq.clientName}</span></td>
                  <td className={td}>{r.inq.tourTitle}</td>
                  <td className={td}>{formatDate(p.at)}</td>
                  <td className={num}>{euro(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      <Section title="Платено капаро — чака доплащане" count={depositOnly.length}>
        {depositOnly.length === 0 ? <p className="px-6 pb-5 text-sm text-gray-400">Няма.</p> : (
          <table className="w-full text-left">
            <thead><tr className="bg-gray-50"><th className={th}>Клиент</th><th className={th}>Екскурзия</th><th className={th}>Дата</th><th className={`${th} text-right`}>Дни до тръгване</th><th className={`${th} text-right`}>Цена</th><th className={`${th} text-right`}>Платено</th><th className={`${th} text-right`}>Остава</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {depositOnly.map(r => {
                const days = daysUntil(r.start);
                return (
                  <tr key={r.inq.id} className={clickable} onClick={() => onOpen(r.inq)}>
                    <td className={td}>{r.inq.clientName}</td>
                    <td className={td}>{r.inq.tourTitle}</td>
                    <td className={td}>{r.inq.tourDate}</td>
                    <td className={`${num} ${days !== null && days <= 45 ? 'font-black text-amber-700' : ''}`}>{days ?? '—'}</td>
                    <td className={num}>{r.total ? euro(r.total) : '—'}</td>
                    <td className={num}>{euro(r.paid)}</td>
                    <td className={num}>{r.total ? euro(remaining(r)) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Платени изцяло" count={fullyPaid.length}>
        {fullyPaid.length === 0 ? <p className="px-6 pb-5 text-sm text-gray-400">Няма.</p> : (
          <table className="w-full text-left">
            <thead><tr className="bg-gray-50"><th className={th}>Клиент</th><th className={th}>Екскурзия</th><th className={th}>Дата</th><th className={th}>Туроператор</th><th className={`${th} text-right`}>Пътници</th><th className={`${th} text-right`}>Сума</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {fullyPaid.map(r => (
                <tr key={r.inq.id} className={clickable} onClick={() => onOpen(r.inq)}>
                  <td className={td}>{r.inq.clientName}</td>
                  <td className={td}>{r.inq.tourTitle}</td>
                  <td className={td}>{r.inq.tourDate}</td>
                  <td className={td}>{r.operator}</td>
                  <td className={num}>{r.pax || '—'}</td>
                  <td className={num}>{r.total ? euro(r.total) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="По туроператор">
        <table className="w-full text-left">
          <thead><tr className="bg-gray-50"><th className={th}>Туроператор</th><th className={`${th} text-right`}>Запитвания</th><th className={`${th} text-right`}>Резервации</th><th className={`${th} text-right`}>Пътници</th><th className={`${th} text-right`}>Стойност</th><th className={`${th} text-right`}>Платено</th><th className={`${th} text-right`}>Остава</th>{hasCommission && <th className={`${th} text-right`}>Комисионна</th>}</tr></thead>
          <tbody className="divide-y divide-gray-50">
            {byOperator.map(([name, list]) => {
              const b = list.filter(r => r.booked);
              return (
                <tr key={name}>
                  <td className={`${td} font-bold`}>{name}</td>
                  <td className={num}>{list.length}</td>
                  <td className={num}>{b.length}</td>
                  <td className={num}>{sum(b, r => r.pax)}</td>
                  <td className={num}>{euro(sum(b, r => r.total))}</td>
                  <td className={num}>{euro(sum(b, r => r.paid))}</td>
                  <td className={num}>{euro(sum(b, remaining))}</td>
                  {hasCommission && <td className={num}>{commissionPct(name) ? euro(sum(b, commission)) : '—'}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>

      <Section title="По екскурзия и дата на тръгване" count={byDeparture.length}>
        {byDeparture.length === 0 ? <p className="px-6 pb-5 text-sm text-gray-400">Няма резервации.</p> : (
          <table className="w-full text-left">
            <thead><tr className="bg-gray-50"><th className={th}>Екскурзия</th><th className={th}>Дата</th><th className={`${th} text-right`}>Резервации</th><th className={`${th} text-right`}>Пътници</th><th className={`${th} text-right`}>Стойност</th><th className={`${th} text-right`}>Платено</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {byDeparture.map(([key, list]) => {
                const [title, date] = key.split('|');
                return (
                  <tr key={key}>
                    <td className={td}>{title}</td>
                    <td className={td}>{date}</td>
                    <td className={num}>{list.length}</td>
                    <td className={num}>{sum(list, r => r.pax)}</td>
                    <td className={num}>{euro(sum(list, r => r.total))}</td>
                    <td className={num}>{euro(sum(list, r => r.paid))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={`По месеци (${basis === 'trip' ? 'дата на пътуване' : 'дата на запитване'})`}>
        <table className="w-full text-left">
          <thead><tr className="bg-gray-50"><th className={th}>Месец</th><th className={`${th} text-right`}>Запитвания</th><th className={`${th} text-right`}>Резервации</th><th className={`${th} text-right`}>Пътници</th><th className={`${th} text-right`}>Стойност</th><th className={`${th} text-right`}>Платено</th></tr></thead>
          <tbody className="divide-y divide-gray-50">
            {byMonth.map(([month, list]) => {
              const b = list.filter(r => r.booked);
              const label = month === 'без дата' ? month : new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1).toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' });
              return (
                <tr key={month}>
                  <td className={td}>{label}</td>
                  <td className={num}>{list.length}</td>
                  <td className={num}>{b.length}</td>
                  <td className={num}>{sum(b, r => r.pax)}</td>
                  <td className={num}>{euro(sum(b, r => r.total))}</td>
                  <td className={num}>{euro(sum(b, r => r.paid))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>
      <p className="text-[11px] text-gray-400">Сумите за стари резервации без записани плащания се вземат от профила на клиента (платената сума при „Платено“).</p>
    </div>
  );
}
