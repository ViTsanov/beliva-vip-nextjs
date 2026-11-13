"use client";

import { useEffect, useState } from 'react';
import { ExternalLink, Download, RefreshCw, Search, FileText, Wand2 } from 'lucide-react';
import CopyButton from './reservations/CopyButton';
import { formatDateTime } from './reservations/workflow';

// „PDF програми“: всички програми на публикуваните екскурзии като готови файлове — за изпращане на клиенти.
// Всяка програма се генерира веднъж и се пази (src/lib/pdf/pdfCache.ts); тук се вижда кога е създадена
// и дали турът е бил променен след това (тогава се генерира наново при следващото отваряне или от бутона).

interface Item {
  id: string;
  slug: string;
  title: string;
  operator: string;
  pdfUrl: string;
  status: 'fresh' | 'stale' | 'missing' | 'manual';
  generatedAt: string;
  size: number;
  canEnrich: boolean;
  lacks: string[];
  notAtSource: string[];
}

const STATUS: Record<Item['status'], { label: string; cls: string }> = {
  fresh: { label: 'Запазен', cls: 'bg-emerald-50 text-emerald-700' },
  stale: { label: 'Турът е променен — ще се обнови', cls: 'bg-amber-50 text-amber-800' },
  missing: { label: 'Още не е създаден', cls: 'bg-gray-100 text-gray-500' },
  manual: { label: 'Ръчно качен PDF', cls: 'bg-blue-50 text-blue-700' },
};

export default function PdfLibraryTab() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);

  const load = () => {
    fetch('/api/admin/pdf-library')
      .then(r => r.json())
      .then(data => (data.items ? setItems(data.items) : setError(data.error || 'Грешка при зареждане.')))
      .catch(() => setError('Грешка при връзка със сървъра.'));
  };
  useEffect(load, []);

  const linkFor = (item: Item) => item.pdfUrl || `${window.location.origin}/tour/${encodeURIComponent(item.slug)}/programa.pdf`;

  const regenerate = async (item: Item) => {
    setBusy(prev => new Set(prev).add(item.id));
    try {
      const res = await fetch('/api/admin/pdf-library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(prev => prev?.map(i => (i.id === item.id ? { ...i, status: 'fresh', generatedAt: data.generatedAt, size: data.size } : i)) || prev);
    } catch (e) {
      alert(`„${item.title}“: ${e instanceof Error && e.message ? e.message : 'PDF-ът не можа да бъде създаден.'}`);
    } finally {
      setBusy(prev => { const next = new Set(prev); next.delete(item.id); return next; });
    }
  };

  // „Внеси наново от 2МКО“: туроператорът → Word файл → AI пише програмата наново, в СЪЩАТА екскурзия
  // (адрес, снимки, цена, дати, статус и връзки остават). После веднага създава новата PDF програма.
  const reimport = async (item: Item) => {
    if (!confirm(`„${item.title}“

Програмата по дни, „включва / не включва“, документите и допълнителните екскурзии ще се напишат наново от 2МКО. Ръчните промени в тези текстове ще се загубят.

Заглавието, въведението, цената, датите и снимките остават.

Продължи?`)) return;
    setBusy(prev => new Set(prev).add(`reimport-${item.id}`));
    try {
      const res = await fetch('/api/admin/reimport-tour', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await regenerate({ ...item, status: 'stale' });
      load(); // наново от сървъра — какво се добави и какво го няма при 2МКО
      alert(`„${item.title}“ е внесена наново:
• ${data.days} дни
• ${data.extras} допълнителни екскурзии с цени
• депозит: ${data.deposit || '—'}
• единична стая: ${data.singleSupplement || '—'}
• полети: ${data.flights} реда

PDF програмата е създадена наново.`);
    } catch (e) {
      alert(`„${item.title}“: ${e instanceof Error && e.message ? e.message : 'Внасянето не успя.'}`);
    } finally {
      setBusy(prev => { const next = new Set(prev); next.delete(`reimport-${item.id}`); return next; });
    }
  };

  // Една по една — генерирането на PDF е тежко, а така се вижда и напредъкът.
  const regenerateAll = async () => {
    const todo = (items || []).filter(i => i.status === 'missing' || i.status === 'stale');
    setBulk({ done: 0, total: todo.length });
    for (const [idx, item] of todo.entries()) {
      await regenerate(item);
      setBulk({ done: idx + 1, total: todo.length });
    }
    setBulk(null);
  };

  if (error) return <p className="p-8 text-red-600 font-medium">{error}</p>;
  if (!items) return <p className="p-8 text-gray-500 font-medium">Зареждане на програмите…</p>;

  const term = search.toLowerCase();
  const visible = items.filter(i => !term || i.title.toLowerCase().includes(term) || i.operator.toLowerCase().includes(term));
  const pendingCount = items.filter(i => i.status === 'missing' || i.status === 'stale').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Търси екскурзия или туроператор…" aria-label="Търсене на програма" className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-gold/20 outline-none font-medium" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-semibold">{items.length} програми · {items.filter(i => i.status === 'fresh').length} запазени</span>
          <button onClick={regenerateAll} disabled={!!bulk || pendingCount === 0} className="inline-flex items-center gap-2 bg-brand-dark text-white px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-brand-gold disabled:opacity-40">
            <RefreshCw size={14} className={bulk ? 'motion-safe:animate-spin' : ''} />
            {bulk ? `Създаване ${bulk.done}/${bulk.total}…` : pendingCount ? `Създай всички липсващи (${pendingCount})` : 'Всички са създадени'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-xs font-black uppercase text-gray-400 tracking-widest">Екскурзия</th>
                <th className="p-4 text-xs font-black uppercase text-gray-400 tracking-widest">PDF</th>
                <th className="p-4 text-xs font-black uppercase text-gray-400 tracking-widest text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visible.length === 0 && <tr><td colSpan={3} className="p-10 text-center text-gray-400 italic">Няма намерени програми.</td></tr>}
              {visible.map(item => {
                const link = linkFor(item);
                const isBusy = busy.has(item.id);
                return (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="p-4">
                      <p className="font-bold text-sm text-brand-dark flex items-center gap-2"><FileText size={15} className="text-brand-gold shrink-0" /> {item.title}</p>
                      {item.operator && <p className="text-[11px] text-gray-400 mt-0.5 ml-6">{item.operator}</p>}
                      {item.lacks.length > 0 && (
                        <p className="text-[11px] text-amber-800 font-semibold mt-1 ml-6">Липсва: {item.lacks.join(', ')}</p>
                      )}
                      {item.notAtSource?.length > 0 && (
                        <p className="text-[11px] text-gray-400 mt-1 ml-6">При 2МКО няма: {item.notAtSource.join(', ')}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-lg ${STATUS[item.status].cls}`}>{isBusy ? 'Създаване…' : STATUS[item.status].label}</span>
                      {item.generatedAt && item.status !== 'manual' && <p className="text-[11px] text-gray-400 mt-1">{formatDateTime(item.generatedAt)}{item.size ? ` · ${Math.round(item.size / 1024)} KB` : ''}</p>}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end items-center gap-1 flex-wrap">
                        {item.canEnrich && (
                          <button
                            onClick={() => reimport(item)}
                            disabled={busy.has(`reimport-${item.id}`) || isBusy || !!bulk}
                            title="Изтегля програмата и Word файла от 2МКО и AI я пише наново в същата екскурзия"
                            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-black disabled:opacity-40 ${item.lacks.length ? 'bg-amber-500 text-white hover:bg-amber-600' : 'border border-gray-200 text-gray-600 hover:border-amber-500 hover:text-amber-700'}`}
                          >
                            <Wand2 size={13} /> {busy.has(`reimport-${item.id}`) ? 'Внасяне… (1–2 мин)' : 'Внеси наново от 2МКО'}
                          </button>
                        )}
                        {/* Създаване/обновяване — първо, с ясен надпис според състоянието */}
                        {item.status !== 'manual' && (
                          <button
                            onClick={() => regenerate(item)}
                            disabled={isBusy || !!bulk}
                            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-black transition-colors disabled:opacity-40 ${item.status === 'fresh' ? 'border border-gray-200 text-gray-600 hover:border-brand-gold hover:text-brand-dark' : 'bg-brand-gold text-brand-dark hover:bg-brand-dark hover:text-white'}`}
                          >
                            <RefreshCw size={13} className={isBusy ? 'motion-safe:animate-spin' : ''} />
                            {isBusy ? 'Създаване…' : item.status === 'missing' ? 'Създай програмата' : item.status === 'stale' ? 'Обнови' : 'Създай наново'}
                          </button>
                        )}
                        {/* Отвори/Изтегли/Копирай — когато файлът вече е създаден (или ще се създаде при отваряне) */}
                        <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-[11px] font-bold text-brand-dark hover:border-brand-gold"><ExternalLink size={13} /> Отвори</a>
                        <a href={link} download className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-[11px] font-bold text-brand-dark hover:border-brand-gold"><Download size={13} /> Изтегли</a>
                        <CopyButton text={link} label="Копирай линк" showLabel className="border border-gray-200 !px-3 !py-2" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-gray-400">Всяка програма се създава веднъж и се пази. Когато промениш екскурзията (или изтече промоция, или мине дата), PDF-ът се създава наново при следващото отваряне — от сайта или оттук.</p>
    </div>
  );
}
