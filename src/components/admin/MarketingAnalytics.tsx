"use client";

import { useState, useEffect } from 'react';
import { BarChart3, Bot, Facebook, Loader2, Eye, Users, MousePointerClick, DollarSign, MessageCircleQuestion } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const CARD = "bg-white rounded-[2rem] shadow-sm border border-brand-gold/5 p-7 flex flex-col";
const TITLE = "font-bold text-gray-400 text-[10px] uppercase tracking-widest mb-5 shrink-0";
const TOOLTIP_STYLE = { borderRadius: 12, border: 'none', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.12)', fontSize: 12 };
const AXIS_TICK = { fontSize: 10, fill: '#9ca3af' };
const GRID_H = { strokeDasharray: '3 3' as const, vertical: false, stroke: '#f0f0f0' };

// Малка "статистическа" карта за горния ред (Активни потребители / Разход и т.н.)
function StatPill({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-5 flex items-center gap-4">
      <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: `${color}15`, color }}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-black text-brand-dark leading-none">{value}</p>
        <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mt-1">{label}</p>
      </div>
    </div>
  );
}

// Хук за зареждане на данни от собствените ни /api/admin/* routes — с изрично разграничаване между
// "не е конфигурирано" (501, показваме инструкции) и "реална грешка" (друг статус, показваме съобщението).
function useApiData(endpoint: string) {
  const [data, setData] = useState<any>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(endpoint)
      .then(async (res) => {
        const json = await res.json();
        if (res.status === 501) {
          setNotConfigured(true);
        } else if (json.error) {
          setError(json.error);
        } else {
          setData(json);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [endpoint]);

  return { data, error, notConfigured, loading };
}

function SectionHeader({ icon: Icon, title, subtitle, iconColor }: { icon: any; title: string; subtitle: string; iconColor: string }) {
  return (
    <div className="flex items-center gap-3 mb-1">
      <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${iconColor}15`, color: iconColor }}>
        <Icon size={18} />
      </div>
      <div>
        <h3 className="font-bold text-brand-dark text-lg">{title}</h3>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
    </div>
  );
}

function NotConfiguredCard({ steps }: { steps: string[] }) {
  return (
    <div className={CARD}>
      <p className="text-xs text-gray-400 mb-4">Все още не е свързано. За да включиш тази секция:</p>
      <ol className="text-xs text-gray-500 space-y-2.5 list-decimal list-inside">
        {steps.map((s, i) => <li key={i} className="leading-relaxed">{s}</li>)}
      </ol>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className={`${CARD} bg-red-50/50 border-red-100`}>
      <p className="text-xs text-red-500 font-medium">Грешка при извличане на данни: {message}</p>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className={`${CARD} items-center justify-center`} style={{ minHeight: 140 }}>
      <Loader2 className="animate-spin text-brand-gold" size={28} />
    </div>
  );
}

export default function MarketingAnalytics() {
  const ga4 = useApiData('/api/admin/ga4-stats');
  const openai = useApiData('/api/admin/openai-usage');
  const meta = useApiData('/api/admin/meta-ads');
  const chatQuestions = useApiData('/api/admin/chat-questions');

  return (
    <div className="space-y-10 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-serif italic text-brand-dark">Маркетинг & Разходи</h2>
        <p className="text-sm text-gray-400 mt-1">Google Analytics, OpenAI разход и Meta реклами — на едно място.</p>
      </div>

      {/* ═══════════════ GOOGLE ANALYTICS ═══════════════ */}
      <div className="space-y-4">
        <SectionHeader icon={BarChart3} title="Google Analytics" subtitle="Последните 28 дни" iconColor="#4285F4" />

        {ga4.loading ? <LoadingCard /> : ga4.notConfigured ? (
          <NotConfiguredCard steps={[
            'Създай Service Account в Google Cloud Console (проект: belivavip)',
            'Включи "Google Analytics Data API" в APIs & Services → Library',
            'В GA4 → Admin → Property Access Management, добави имейла на service account-а като "Viewer"',
            'Копирай Property ID (числово, GA4 Admin → Property Settings — не измервателния G-код)',
            'Постави GA4_PROPERTY_ID, GA4_CLIENT_EMAIL, GA4_PRIVATE_KEY в .env.local и apphosting.yaml (private key-ят през Secret Manager)',
          ]} />
        ) : ga4.error ? <ErrorCard message={ga4.error} /> : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatPill icon={Users} label="Активни потребители" value={ga4.data.totals.activeUsers.toLocaleString('bg-BG')} color="#4285F4" />
              <StatPill icon={Eye} label="Прегледи на страници" value={ga4.data.totals.pageViews.toLocaleString('bg-BG')} color="#c5a35d" />
              <StatPill icon={MousePointerClick} label="Сесии" value={ga4.data.totals.sessions.toLocaleString('bg-BG')} color="#10b981" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={CARD}>
                <h3 className={TITLE}>Активни потребители по дни</h3>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ga4.data.daily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gGa4" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4285F4" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#4285F4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid {...GRID_H} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={AXIS_TICK} interval={4} />
                      <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} allowDecimals={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Area type="monotone" dataKey="activeUsers" stroke="#4285F4" strokeWidth={2} fillOpacity={1} fill="url(#gGa4)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className={CARD}>
                <h3 className={TITLE}>Топ страници</h3>
                <ul className="space-y-2.5 flex-1 overflow-y-auto">
                  {ga4.data.topPages.map((p: any, i: number) => (
                    <li key={i} className="flex justify-between items-center text-sm gap-3">
                      <span className="text-gray-600 truncate">{p.path}</span>
                      <span className="font-bold text-brand-dark bg-gray-50 px-2 py-0.5 rounded-lg shrink-0">{p.views}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═══════════════ OPENAI РАЗХОД ═══════════════ */}
      <div className="space-y-4">
        <SectionHeader icon={Bot} title="OpenAI Разход" subtitle="Последните 30 дни" iconColor="#10a37f" />

        {openai.loading ? <LoadingCard /> : openai.notConfigured ? (
          <NotConfiguredCard steps={[
            'Влез в platform.openai.com → Settings → Admin keys (различно от обикновен API key)',
            'Създай нов Admin key с права за Usage/Costs',
            'Постави OPENAI_ADMIN_KEY в .env.local и apphosting.yaml (през Secret Manager)',
          ]} />
        ) : openai.error ? <ErrorCard message={openai.error} /> : (
          <>
            <StatPill icon={DollarSign} label="Общ разход (30 дни)" value={`$${openai.data.totalCost}`} color="#10a37f" />
            <div className={CARD}>
              <h3 className={TITLE}>Дневен разход ($)</h3>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={openai.data.daily} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <CartesianGrid {...GRID_H} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={AXIS_TICK} interval={4} />
                    <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`$${v}`, 'Разход']} />
                    <Bar dataKey="cost" fill="#10a37f" radius={[4, 4, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═══════════════ META РЕКЛАМИ ═══════════════ */}
      <div className="space-y-4">
        <SectionHeader icon={Facebook} title="Meta Реклами" subtitle="Последните 30 дни" iconColor="#1877F2" />

        {meta.loading ? <LoadingCard /> : meta.notConfigured ? (
          <NotConfiguredCard steps={[
            'Създай Meta App в developers.facebook.com (тип "Business")',
            'В Ads Manager → Business Settings → System Users, генерирай дълготраен access token с "ads_read" право',
            'Копирай Ad Account ID от Ads Manager (формат: act_1234567890)',
            'Постави META_ACCESS_TOKEN и META_AD_ACCOUNT_ID в .env.local и apphosting.yaml (токенът през Secret Manager)',
            'Тази секция ще покаже реални данни едва след като имаш активна кампания в Ads Manager',
          ]} />
        ) : meta.error ? <ErrorCard message={meta.error} /> : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatPill icon={DollarSign} label="Разход (€)" value={meta.data.totals.spend.toLocaleString('bg-BG')} color="#1877F2" />
              <StatPill icon={Eye} label="Impressions" value={meta.data.totals.impressions.toLocaleString('bg-BG')} color="#c5a35d" />
              <StatPill icon={MousePointerClick} label="Кликове" value={meta.data.totals.clicks.toLocaleString('bg-BG')} color="#10b981" />
            </div>
            <div className={CARD}>
              <h3 className={TITLE}>Разход по дни (€)</h3>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={meta.data.daily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gMeta" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1877F2" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1877F2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...GRID_H} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={AXIS_TICK} interval={4} />
                    <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Area type="monotone" dataKey="spend" stroke="#1877F2" strokeWidth={2} fillOpacity={1} fill="url(#gMeta)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═════════════ НАЙ-ЧЕСТО ЗАДАВАНИ ВЪПРОСИ ═════════════ */}
      <div className="space-y-4">
        <SectionHeader icon={MessageCircleQuestion} title="Най-често задавани въпроси" subtitle="От AI чат асистента, последните 500 въпроса" iconColor="#8b5cf6" />

        {chatQuestions.loading ? <LoadingCard /> : chatQuestions.notConfigured ? (
          <NotConfiguredCard steps={[
            'npm install firebase-admin в главната папка на проекта (не в functions/)',
            'В Google Cloud Console → IAM & Admin → IAM, намери същия service account, който вече използваш за GA4',
            'Редактирай го и добави роля "Cloud Datastore User" — това му дава четец достъп до Firestore',
            'Не трябват нови env променливи — преизползва същите GA4_CLIENT_EMAIL / GA4_PRIVATE_KEY',
            'Деплойни обновената Cloud Function: firebase deploy --only functions',
          ]} />
        ) : chatQuestions.error ? <ErrorCard message={chatQuestions.error} /> : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatPill icon={MessageCircleQuestion} label="Въпроси (последни 500)" value={String(chatQuestions.data.totalQuestions)} color="#8b5cf6" />
              <StatPill icon={Users} label="Уникални формулировки" value={String(chatQuestions.data.uniqueQuestions)} color="#c5a35d" />
            </div>
            <div className={CARD}>
              <h3 className={TITLE}>Топ 15 по точно съвпадение</h3>
              {chatQuestions.data.topQuestions.length === 0 ? (
                <p className="text-gray-300 text-sm italic">Все още няма логнати въпроси.</p>
              ) : (
                <ul className="space-y-2">
                  {chatQuestions.data.topQuestions.map((q: any, i: number) => (
                    <li key={i} className="flex justify-between items-center gap-3 text-sm py-2 border-b border-gray-50 last:border-0">
                      <span className="text-gray-600">{q.question}</span>
                      <span className="font-bold text-brand-dark bg-purple-50 text-purple-600 px-2.5 py-1 rounded-lg shrink-0">×{q.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
