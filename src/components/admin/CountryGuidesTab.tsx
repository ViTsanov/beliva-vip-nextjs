"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Edit2, ExternalLink, FileText, RefreshCw, Save, Search, Sparkles, X } from 'lucide-react';
import { COUNTRY_GUIDE_MAX_WORDS, sectionWords } from '@/lib/countryGuideWords';
import type { CountryGuide } from '@/lib/countryGuide';
import type { CatalogueCountry } from '@/app/api/admin/country-guides/route';

// Таб „Текстове за държави“: текстът „За <държава>“ на /destinations/<държава>, който пише ИИ (src/lib/countryGuide.ts).
// Оттук собственикът го преглежда, поправя ръчно или пише наново — без Firebase конзолата.

type Draft = Pick<CountryGuide, 'tagline' | 'history' | 'geography' | 'economy' | 'facts'>;
type Row = { slug: string; name: string; tours: number; guide?: CountryGuide };
type Filter = 'all' | 'missing' | 'done';

const SECTIONS: { key: keyof Omit<Draft, 'tagline'>; label: string }[] = [
  { key: 'history', label: 'История' },
  { key: 'geography', label: 'География' },
  { key: 'economy', label: 'Икономика' },
  { key: 'facts', label: 'Интересни факти' },
];

const EMPTY_DRAFT: Draft = { tagline: '', history: '', geography: '', economy: '', facts: '' };

const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('bg-BG') : '');

const overLimitMessage = (words: number) =>
  `Текстът е ${words} думи — разрешени са най-много ${COUNTRY_GUIDE_MAX_WORDS} общо в четирите раздела. Съкратете го с ${words - COUNTRY_GUIDE_MAX_WORDS}.`;

// Едно извикване на ИИ за една държава. /api/country-guide приема и списък, но всяка държава е 5–15 s,
// затова „Напиши липсващите“ ги праща една по една (и показва напредъка).
async function writeWithAI(country: string, regenerate: boolean): Promise<string | null> {
  try {
    const res = await fetch('/api/country-guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ countries: [country], regenerate }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return data.error || `Грешка ${res.status}`;
    const result = Object.values(data.results || {})[0];
    return result === 'written' || result === 'exists' ? null : String(result || 'Неизвестна грешка');
  } catch {
    return 'Няма връзка със сървъра';
  }
}

export default function CountryGuidesTab() {
  const [guides, setGuides] = useState<Record<string, CountryGuide>>({});
  const [catalogue, setCatalogue] = useState<CatalogueCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const [editing, setEditing] = useState<string | null>(null); // slug
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState<Record<string, 'save' | 'ai'>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ slug: string; text: string } | null>(null);
  const [bulk, setBulk] = useState<{ done: number; total: number; current: string } | null>(null);

  const loadGuides = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/country-guides', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Грешка ${res.status}`);
      setGuides(data.guides || {});
      setCatalogue(data.countries || []);
      setLoadError('');
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Текстовете не можаха да се заредят');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGuides(); }, [loadGuides]);

  // Държавите от активните оферти + тези, които имат текст, но вече нямат активна оферта
  const rows = useMemo<Row[]>(() => {
    const map = new Map<string, Row>(catalogue.map(c => [c.slug, { ...c }]));
    Object.entries(guides).forEach(([slug, guide]) => {
      if (!map.has(slug)) map.set(slug, { slug, name: guide.country, tours: 0 });
    });
    return [...map.values()]
      .map(row => ({ ...row, guide: guides[row.slug] }))
      .sort((a, b) => a.name.localeCompare(b.name, 'bg'));
  }, [catalogue, guides]);

  const missing = rows.filter(r => !r.guide && r.tours > 0);
  const withText = rows.filter(r => r.guide).length;

  const visible = rows.filter(r => {
    if (filter === 'missing' && r.guide) return false;
    if (filter === 'done' && !r.guide) return false;
    return !search.trim() || r.name.toLowerCase().includes(search.trim().toLowerCase());
  });

  const draftWords = sectionWords(draft);
  const anyBusy = !!bulk || Object.keys(busy).length > 0;

  const setRowBusy = (slug: string, state: 'save' | 'ai' | null) =>
    setBusy(prev => {
      const next = { ...prev };
      if (state) next[slug] = state; else delete next[slug];
      return next;
    });

  const setRowError = (slug: string, error: string | null) =>
    setRowErrors(prev => {
      const next = { ...prev };
      if (error) next[slug] = error; else delete next[slug];
      return next;
    });

  const startEdit = (row: Row) => {
    setEditing(row.slug);
    setSaveError('');
    setNotice(null);
    setDraft(row.guide
      ? { tagline: row.guide.tagline || '', history: row.guide.history || '', geography: row.guide.geography || '', economy: row.guide.economy || '', facts: row.guide.facts || '' }
      : EMPTY_DRAFT);
  };

  const saveEdit = async (row: Row) => {
    if (SECTIONS.some(s => !draft[s.key].trim())) {
      setSaveError('Попълнете и четирите раздела: история, география, икономика и интересни факти.');
      return;
    }
    if (draftWords > COUNTRY_GUIDE_MAX_WORDS) {
      setSaveError(overLimitMessage(draftWords));
      return;
    }
    const guide = row.guide;
    if (guide && (Object.keys(draft) as (keyof Draft)[]).every(k => draft[k].trim() === (guide[k] || ''))) {
      setEditing(null);
      setNotice({ slug: row.slug, text: 'Няма промени — нищо не е записано.' });
      return;
    }
    setRowBusy(row.slug, 'save');
    setSaveError('');
    try {
      const res = await fetch('/api/admin/country-guides', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: row.name, ...draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Грешка ${res.status}`);
      setGuides(prev => ({ ...prev, [row.slug]: data.guide }));
      setEditing(null);
      setNotice({ slug: row.slug, text: 'Запазено — страницата на държавата вече показва новия текст.' });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Грешка при запис');
    } finally {
      setRowBusy(row.slug, null);
    }
  };

  const regenerate = async (row: Row) => {
    if (row.guide && !confirm(`Сегашният текст за ${row.name} ще бъде заменен с нов, написан от ИИ${row.guide.editedAt ? ' (включително ръчните поправки)' : ''}. Продължи?`)) return;
    setRowBusy(row.slug, 'ai');
    setRowError(row.slug, null);
    setNotice(null);
    const error = await writeWithAI(row.name, true);
    setRowError(row.slug, error);
    if (!error) {
      await loadGuides();
      setNotice({ slug: row.slug, text: row.guide ? 'Текстът е написан наново. Прегледайте го.' : 'Текстът е написан. Прегледайте го.' });
    }
    setRowBusy(row.slug, null);
  };

  const writeMissing = async () => {
    const list = [...missing];
    if (list.length === 0) return;
    setNotice(null);
    for (let i = 0; i < list.length; i++) {
      const row = list[i];
      setBulk({ done: i, total: list.length, current: row.name });
      setRowError(row.slug, await writeWithAI(row.name, false));
      await loadGuides();
    }
    setBulk(null);
  };

  const btnPrimary = 'flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-brand-dark text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand-gold hover:text-brand-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed';
  const btnSecondary = 'flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed';
  const fieldClass = 'mt-1 w-full p-3 rounded-xl border border-gray-200 text-sm text-brand-dark outline-none focus:border-brand-gold';

  if (loading) return <div className="p-10 text-center text-gray-400">Зареждане...</div>;

  return (
    <div className="space-y-6 animate-in fade-in pb-24">
      <section className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="font-serif italic text-2xl text-brand-dark flex items-center gap-2">
              <FileText size={22} className="text-brand-gold" aria-hidden="true" /> Текстове за държави
            </h2>
            <p className="text-xs text-gray-400 mt-1 max-w-xl">
              Разделът „За &lt;държава&gt;“ на страницата на всяка дестинация — история, география, икономика и интересни факти,
              общо до {COUNTRY_GUIDE_MAX_WORDS} думи. Пише го ИИ и излиза на сайта веднага, затова го прегледайте и поправете при нужда.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Държави: <b>{rows.length}</b> · С текст: <b className="text-emerald-700">{withText}</b> · Липсват: <b className={missing.length ? 'text-amber-700' : ''}>{missing.length}</b>
            </p>
          </div>
          <button type="button" onClick={writeMissing} disabled={anyBusy || missing.length === 0} className={`${btnPrimary} shrink-0`}>
            <Sparkles size={14} aria-hidden="true" />
            {bulk ? 'Пише...' : `Напиши липсващите${missing.length ? ` (${missing.length})` : ''}`}
          </button>
        </div>

        {bulk && (
          <div className="bg-gray-50 rounded-2xl p-5 mb-4" role="status" aria-live="polite">
            <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
              <span className="truncate pr-4">Пише: {bulk.current}</span>
              <span className="shrink-0">{bulk.done} / {bulk.total}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-brand-gold transition-all" style={{ width: `${(bulk.done / bulk.total) * 100}%` }} />
            </div>
          </div>
        )}

        {loadError && <p className="text-sm rounded-2xl p-4 mb-4 bg-red-50 text-red-700">{loadError}</p>}

        <div className="flex flex-col sm:flex-row gap-3">
          <label className="relative flex-grow">
            <span className="sr-only">Търси държава</span>
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" aria-hidden="true" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Търси държава..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-gold" />
          </label>
          <div className="flex gap-2" role="group" aria-label="Филтър по състояние">
            {([['all', 'Всички'], ['missing', 'Липсващи'], ['done', 'С текст']] as [Filter, string][]).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setFilter(id)} aria-pressed={filter === id}
                className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === id ? 'bg-brand-gold text-brand-dark' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {visible.length === 0 && (
        <p className="text-sm text-gray-400 text-center p-10">Няма държави за този филтър.</p>
      )}

      <ul className="space-y-4">
        {visible.map(row => {
          const isEditing = editing === row.slug;
          const rowBusy = busy[row.slug];
          const g = row.guide;
          return (
            <li key={row.slug} className={`bg-white rounded-[2rem] p-5 md:p-6 shadow-sm border ${isEditing ? 'border-brand-gold/40' : 'border-gray-100'}`}>
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-lg text-brand-dark">{row.name}</h3>
                    {g ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
                        <CheckCircle2 size={12} aria-hidden="true" /> Има текст
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest">
                        <AlertTriangle size={12} aria-hidden="true" /> Липсва
                      </span>
                    )}
                    {g?.editedAt && (
                      <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest">Ръчно поправен</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {row.tours > 0 ? `${row.tours} ${row.tours === 1 ? 'активна оферта' : 'активни оферти'}` : 'Няма активни оферти'}
                    {g && <>
                      {' · '}<span className={g.words > COUNTRY_GUIDE_MAX_WORDS ? 'font-bold text-red-600' : 'font-bold text-gray-500'}>{g.words} / {COUNTRY_GUIDE_MAX_WORDS} думи</span>
                      {' · '}Написан от {g.model} на {formatDate(g.createdAt)}
                      {g.editedAt && <> · поправен на {formatDate(g.editedAt)}</>}
                    </>}
                  </p>
                </div>
                {!isEditing && (
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button type="button" onClick={() => startEdit(row)} disabled={!!rowBusy || !!bulk} className={btnSecondary}>
                      <Edit2 size={14} aria-hidden="true" /> {g ? 'Редактирай' : 'Напиши ръчно'}
                    </button>
                    <button type="button" onClick={() => regenerate(row)} disabled={!!rowBusy || !!bulk} className={btnPrimary}>
                      <RefreshCw size={14} className={rowBusy === 'ai' ? 'motion-safe:animate-spin' : ''} aria-hidden="true" />
                      {rowBusy === 'ai' ? 'Пише...' : g ? 'Напиши наново' : 'Напиши с ИИ'}
                    </button>
                    <a href={`/destinations/${row.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`Отвори страницата на ${row.name} в нов раздел`}
                      className="flex items-center justify-center px-3 py-3 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all">
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  </div>
                )}
              </div>

              {rowErrors[row.slug] && (
                <p className="text-sm rounded-2xl p-4 mt-4 bg-red-50 text-red-700" role="alert">ИИ не успя да напише текста: {rowErrors[row.slug]}</p>
              )}
              {notice?.slug === row.slug && !isEditing && (
                <p className="text-sm rounded-2xl p-4 mt-4 bg-emerald-50 text-emerald-700 flex items-center gap-2" role="status">
                  <CheckCircle2 size={16} aria-hidden="true" /> {notice.text}
                </p>
              )}

              {/* Преглед на текста */}
              {g && !isEditing && (
                <div className="mt-4 bg-gray-50 rounded-2xl p-4 md:p-5 space-y-3 text-sm text-gray-600 leading-relaxed">
                  {g.tagline && <p className="font-serif italic text-brand-dark">{g.tagline}</p>}
                  {SECTIONS.map(s => (
                    <p key={s.key}><span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mr-2">{s.label}</span>{g[s.key]}</p>
                  ))}
                </div>
              )}

              {/* Редакция */}
              {isEditing && (
                <form className="mt-4 space-y-4" onSubmit={e => { e.preventDefault(); saveEdit(row); }}>
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Подзаглавие (под името в героя, не влиза в 200-те думи)</span>
                    <input value={draft.tagline} onChange={e => setDraft(d => ({ ...d, tagline: e.target.value }))} className={fieldClass} />
                  </label>
                  {SECTIONS.map(s => (
                    <label key={s.key} className="block">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{s.label}</span>
                      <textarea value={draft[s.key]} rows={3} onChange={e => setDraft(d => ({ ...d, [s.key]: e.target.value }))}
                        className={`${fieldClass} resize-y leading-relaxed`} />
                    </label>
                  ))}
                  <p className={`text-xs font-bold ${draftWords > COUNTRY_GUIDE_MAX_WORDS ? 'text-red-600' : 'text-gray-500'}`} aria-live="polite">
                    Думи в четирите раздела: {draftWords} / {COUNTRY_GUIDE_MAX_WORDS}
                    {draftWords > COUNTRY_GUIDE_MAX_WORDS && ` — с ${draftWords - COUNTRY_GUIDE_MAX_WORDS} повече`}
                  </p>
                  {saveError && <p className="text-sm rounded-2xl p-4 bg-red-50 text-red-700" role="alert">{saveError}</p>}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button type="submit" disabled={!!rowBusy} className={btnPrimary}>
                      <Save size={14} aria-hidden="true" /> {rowBusy === 'save' ? 'Запазва...' : 'Запази'}
                    </button>
                    <button type="button" disabled={!!rowBusy} onClick={() => { setEditing(null); setSaveError(''); }} className={btnSecondary}>
                      <X size={14} aria-hidden="true" /> Откажи
                    </button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
