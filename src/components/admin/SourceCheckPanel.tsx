"use client";
import { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RefreshCw, ExternalLink, AlertTriangle, CalendarDays, Type, CheckCircle2 } from 'lucide-react';
import { normalizeTourDates, displayTourDate } from '@/lib/tourDates';

// Проверка на туровете при туроператорите: за всеки активен тур с линк (originalUrl / externalSourceLink)
// изтегля страницата през /api/scrape и сравнява заглавието и бъдещите дати. Нищо не се променя само —
// всяка разлика се показва и се одобрява една по една.
//
// ЗАГЛАВИЕ: нашите заглавия са пренаписани от AI, затова НЕ ги сравняваме с тези на туроператора (би излизала
// „промяна“ за всеки тур). Пазим оригиналното заглавие на туроператора в sourceTitle и следим дали ТО се сменя.
// Турове без sourceTitle (внесени преди тази проверка) го получават при първата проверка, без въпрос.
//
// ДАТИ: сравняваме само бъдещите. Ако при туроператора не прочетем нито една дата, не предлагаме да махаме
// нашите — по-вероятно е страницата да е сменила вида си, отколкото всички дати да са отпаднали.

type Finding =
  | { kind: 'title'; tour: any; url: string; oldSource: string; newSource: string }
  | { kind: 'dates'; tour: any; url: string; added: string[]; removed: string[] }
  | { kind: 'broken'; tour: any; url: string; error: string };

const LAST_RUN_KEY = 'sourceCheckLastRun';
const normTitle = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
const tourUrl = (t: any): string => t.originalUrl || t.externalSourceLink || '';

export default function SourceCheckPanel({ tours }: { tours: any[] }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: '' });
  const [findings, setFindings] = useState<Finding[]>([]);
  const [summary, setSummary] = useState<{ checked: number; baselined: number; error?: string } | null>(null);
  const [lastRun, setLastRun] = useState('');

  // Решението за текущата промяна
  const [titleDraft, setTitleDraft] = useState('');
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try { setLastRun(localStorage.getItem(LAST_RUN_KEY) || ''); } catch {}
  }, []);

  const current = findings[0];

  // При нова текуща промяна — попълваме полетата по подразбиране
  useEffect(() => {
    if (!current) return;
    if (current.kind === 'title') setTitleDraft(current.tour.title || '');
    if (current.kind === 'dates') setSelectedDates(new Set([...current.added, ...current.removed]));
  }, [current]);

  const toCheck = tours.filter(t => t.status === 'public' && tourUrl(t));

  const runCheck = async () => {
    setRunning(true);
    setFindings([]);
    setSummary(null);
    const today = new Date().toISOString().split('T')[0];
    const found: Finding[] = [];
    let baselined = 0;
    let checked = 0;

    for (const [i, tour] of toCheck.entries()) {
      const url = tourUrl(tour);
      setProgress({ done: i, total: toCheck.length, current: tour.title });
      try {
        const res = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        if (res.status === 401) {
          setSummary({ checked, baselined, error: 'Сесията ти в админа е изтекла — влез отново и пусни проверката пак.' });
          break;
        }
        const data = await res.json();
        checked++;

        if (!data.success) {
          found.push({ kind: 'broken', tour, url, error: data.error || `HTTP ${res.status}` });
          continue;
        }

        const scrapedTitle = String(data.title || '').trim();
        const scrapedDates = normalizeTourDates(data.dates || []).filter(d => d >= today);
        if (!scrapedTitle && scrapedDates.length === 0) {
          found.push({ kind: 'broken', tour, url, error: 'Страницата вече не изглежда като екскурзия — може да е премахната.' });
          continue;
        }

        if (scrapedTitle) {
          if (!tour.sourceTitle) {
            await updateDoc(doc(db, 'tours', tour.id), { sourceTitle: scrapedTitle });
            baselined++;
          } else if (normTitle(tour.sourceTitle) !== normTitle(scrapedTitle)) {
            found.push({ kind: 'title', tour, url, oldSource: tour.sourceTitle, newSource: scrapedTitle });
          }
        }

        if (scrapedDates.length > 0) {
          const ours = normalizeTourDates([...(tour.dates || []), tour.date]).filter(d => d >= today);
          const added = scrapedDates.filter(d => !ours.includes(d));
          const removed = ours.filter(d => !scrapedDates.includes(d));
          if (added.length || removed.length) found.push({ kind: 'dates', tour, url, added, removed });
        }
      } catch (e: any) {
        checked++;
        found.push({ kind: 'broken', tour, url, error: e?.message || 'Няма връзка' });
      }
      setFindings([...found]);
    }

    setProgress(p => ({ ...p, done: p.total, current: '' }));
    setSummary(s => s ?? { checked, baselined });
    const stamp = new Date().toLocaleString('bg-BG', { dateStyle: 'short', timeStyle: 'short' });
    setLastRun(stamp);
    try { localStorage.setItem(LAST_RUN_KEY, stamp); } catch {}
    setRunning(false);
  };

  // Записва решението (ако има какво) и минава към следващата промяна
  const decide = async (update: Record<string, any> | null) => {
    if (!current) return;
    setSaving(true);
    try {
      if (update) await updateDoc(doc(db, 'tours', current.tour.id), update);
      setFindings(f => f.slice(1));
    } catch (e: any) {
      alert(`Не успяхме да запишем промяната: ${e?.message || ''}`);
    }
    setSaving(false);
  };

  const applyDates = () => {
    if (current?.kind !== 'dates') return;
    const add = current.added.filter(d => selectedDates.has(d));
    const remove = current.removed.filter(d => selectedDates.has(d));
    const dates = normalizeTourDates([...(current.tour.dates || []), current.tour.date, ...add]).filter(d => !remove.includes(d));
    decide({ dates, date: dates[0] || '' });
  };

  const toggleDate = (d: string) => setSelectedDates(prev => {
    const next = new Set(prev);
    if (next.has(d)) next.delete(d); else next.add(d);
    return next;
  });

  const btnPrimary = 'flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-brand-dark text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand-gold hover:text-brand-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed';
  const btnSecondary = 'flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <section className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-gray-100">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="font-serif italic text-2xl text-brand-dark flex items-center gap-2">
            <RefreshCw size={22} className="text-brand-gold" /> Проверка при туроператорите
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-xl">
            Ботът отваря линка на всеки активен тур ({toCheck.length}) и проверява дали туроператорът е сменил заглавието
            или датите. Нищо не се променя само — всяка разлика ти се показва поотделно.
            {lastRun && <> Последна проверка: <span className="font-bold text-gray-500">{lastRun}</span>.</>}
          </p>
        </div>
        <button type="button" onClick={runCheck} disabled={running || saving || toCheck.length === 0} className={`${btnPrimary} shrink-0`}>
          <RefreshCw size={14} className={running ? 'motion-safe:animate-spin' : ''} aria-hidden="true" />
          {running ? 'Проверява...' : 'Провери туровете'}
        </button>
      </div>

      {running && (
        <div className="bg-gray-50 rounded-2xl p-5 mb-4" role="status" aria-live="polite">
          <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
            <span className="truncate pr-4">{progress.current}</span>
            <span className="shrink-0">{progress.done} / {progress.total}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-brand-gold transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
          </div>
          {findings.length > 0 && <p className="text-xs text-gray-500 mt-2">Намерени промени досега: <span className="font-bold">{findings.length}</span></p>}
        </div>
      )}

      {summary && !running && (
        <p className={`text-sm rounded-2xl p-4 mb-4 ${summary.error ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'}`}>
          {summary.error || <>
            Проверени: <b>{summary.checked}</b> тура · За преглед: <b>{findings.length}</b>
            {summary.baselined > 0 && <> · Запомнени заглавия на туроператора: <b>{summary.baselined}</b> (първа проверка — промени в тях ще се виждат от следващия път)</>}
          </>}
        </p>
      )}

      {/* Текущата промяна — една по една */}
      {current && !running && (
        <div className="border-2 border-brand-gold/30 rounded-[2rem] p-5 md:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-gold mb-1">
                Остават за преглед: {findings.length}
              </p>
              <h3 className="font-bold text-brand-dark leading-tight">{current.tour.title}</h3>
            </div>
            <a href={current.url} target="_blank" rel="noopener noreferrer" className="shrink-0 flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline">
              При туроператора <ExternalLink size={12} aria-hidden="true" />
            </a>
          </div>

          {current.kind === 'title' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 flex items-center gap-2 font-bold"><Type size={16} className="text-brand-gold" aria-hidden="true" /> Туроператорът е сменил заглавието</p>
              <div className="text-sm bg-gray-50 rounded-2xl p-4 space-y-1">
                <p><span className="text-gray-400">Беше:</span> <span className="line-through text-gray-500">{current.oldSource}</span></p>
                <p><span className="text-gray-400">Сега:</span> <span className="font-bold text-brand-dark">{current.newSource}</span></p>
              </div>
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Нашето заглавие</span>
                <input value={titleDraft} onChange={e => setTitleDraft(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-gray-200 text-sm font-bold text-brand-dark outline-none focus:border-brand-gold" />
              </label>
              <button type="button" onClick={() => setTitleDraft(current.newSource)} className="text-xs font-bold text-blue-600 hover:underline">
                Вземи заглавието на туроператора
              </button>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button type="button" disabled={saving || !titleDraft.trim()} className={btnPrimary}
                  onClick={() => decide({ title: titleDraft.trim(), sourceTitle: current.newSource })}>
                  <CheckCircle2 size={14} aria-hidden="true" /> Запази заглавието
                </button>
                {/* Запомняме новото заглавие на туроператора, за да не питаме пак за същото */}
                <button type="button" disabled={saving} className={btnSecondary} onClick={() => decide({ sourceTitle: current.newSource })}>
                  Не променяй нашето
                </button>
              </div>
            </div>
          )}

          {current.kind === 'dates' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 flex items-center gap-2 font-bold"><CalendarDays size={16} className="text-brand-gold" aria-hidden="true" /> Датите при туроператора са различни</p>
              <ul className="space-y-2">
                {current.added.map(d => (
                  <li key={`a${d}`}>
                    <label className="flex items-center gap-3 text-sm bg-emerald-50 rounded-xl px-4 py-3 cursor-pointer">
                      <input type="checkbox" checked={selectedDates.has(d)} onChange={() => toggleDate(d)} className="accent-emerald-600 w-4 h-4" />
                      <span className="font-bold text-emerald-800">{displayTourDate(d)}</span>
                      <span className="text-emerald-700 text-xs">нова дата при туроператора — добави я</span>
                    </label>
                  </li>
                ))}
                {current.removed.map(d => (
                  <li key={`r${d}`}>
                    <label className="flex items-center gap-3 text-sm bg-red-50 rounded-xl px-4 py-3 cursor-pointer">
                      <input type="checkbox" checked={selectedDates.has(d)} onChange={() => toggleDate(d)} className="accent-red-600 w-4 h-4" />
                      <span className="font-bold text-red-800">{displayTourDate(d)}</span>
                      <span className="text-red-700 text-xs">вече я няма при туроператора — махни я</span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button type="button" disabled={saving || selectedDates.size === 0} className={btnPrimary} onClick={applyDates}>
                  <CheckCircle2 size={14} aria-hidden="true" /> Приложи избраните
                </button>
                <button type="button" disabled={saving} className={btnSecondary} onClick={() => decide(null)}>
                  Не променяй
                </button>
              </div>
            </div>
          )}

          {current.kind === 'broken' && (
            <div className="space-y-3">
              <p className="text-sm text-red-700 flex items-center gap-2 font-bold"><AlertTriangle size={16} aria-hidden="true" /> Линкът към туроператора не работи</p>
              <p className="text-sm bg-red-50 text-red-700 rounded-2xl p-4">{current.error}</p>
              <p className="text-xs text-gray-500">Отвори линка, за да провериш дали екскурзията още я има. Ако е премахната, можеш да архивираш тура.</p>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button type="button" disabled={saving} className={btnPrimary} onClick={() => decide({ status: 'archived' })}>
                  Архивирай тура
                </button>
                <button type="button" disabled={saving} className={btnSecondary} onClick={() => decide(null)}>
                  Остави го
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {summary && !summary.error && !running && findings.length === 0 && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-2xl p-4 flex items-center gap-2">
          <CheckCircle2 size={16} aria-hidden="true" /> Всичко е прегледано — няма други промени.
        </p>
      )}
    </section>
  );
}
