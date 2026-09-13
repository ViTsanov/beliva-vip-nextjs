"use client";

import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

interface Props {
  inquiries: any[];
  tours: any[];
  clients: any[];
  groups: any[];
  subscribers: any[];
}

const MONTHS_BG = ["Яну","Фев","Мар","Апр","Май","Юни","Юли","Авг","Сеп","Окт","Ное","Дек"];

function lastNMonths(n: number) {
  const today = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (n - 1 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: MONTHS_BG[d.getMonth()],
    };
  });
}

function toMonthKey(seconds: number) {
  const d = new Date(seconds * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const CARD = "bg-white rounded-[2rem] shadow-sm border border-brand-gold/5 p-7 flex flex-col";
const TITLE = "font-bold text-gray-400 text-[10px] uppercase tracking-widest mb-5 shrink-0";
const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: 'none',
  boxShadow: '0 10px 20px -5px rgba(0,0,0,0.12)',
  fontSize: 12,
};
const AXIS_TICK = { fontSize: 11, fill: '#9ca3af' };
const GRID_H = { strokeDasharray: '3 3' as const, vertical: false, stroke: '#f0f0f0' };
const GRID_V = { strokeDasharray: '3 3' as const, horizontal: false, stroke: '#f0f0f0' };

const INQUIRY_STATUS_LABELS: Record<string, string> = {
  new: 'Ново',
  processing: 'В процес',
  paid: 'Платено',
  cancelled: 'Отказано',
};
const INQUIRY_STATUS_COLORS: Record<string, string> = {
  new: '#3b82f6',
  processing: '#d4af37',
  paid: '#10b981',
  cancelled: '#ef4444',
};
const PIE_COLORS = ['#c5a35d', '#0f172a', '#9ca3af', '#4b5563', '#d4d4d8'];

const EmptyState = ({ text = 'Няма данни' }: { text?: string }) => (
  <p className="text-gray-300 text-sm italic flex-1 flex items-center justify-center">{text}</p>
);

export default function DashboardCharts({ inquiries, tours, clients, groups, subscribers }: Props) {
  const months6  = useMemo(() => lastNMonths(6),  []);
  const months12 = useMemo(() => lastNMonths(12), []);

  // 1. Запитвания по месеци
  const inquiriesData = useMemo(() => {
    const counts = Object.fromEntries(months6.map(m => [m.key, 0]));
    inquiries.forEach(inq => {
      if (inq.createdAt?.seconds) {
        const k = toMonthKey(inq.createdAt.seconds);
        if (k in counts) counts[k]++;
      }
    });
    return months6.map(m => ({ name: m.label, Запитвания: counts[m.key] }));
  }, [inquiries, months6]);

  // 2. Приходи по месеци — сума от clients.tripHistory[].paidPrice (реалните плащания, както ги записва ReservationsTab.tsx),
  // не от колекцията "bookings" — нищо никога не пише там, графиката беше винаги празна. addedAt е
  // ISO стринг (new Date().toISOString()), не Firestore Timestamp — парсваме различно от останалите графики.
  const revenueData = useMemo(() => {
    const sums = Object.fromEntries(months6.map(m => [m.key, 0]));
    clients.forEach(c => {
      (c.tripHistory || []).forEach((trip: any) => {
        if (trip.addedAt && trip.paidPrice) {
          const d = new Date(trip.addedAt);
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (k in sums) sums[k] += Number(trip.paidPrice) || 0;
        }
      });
    });
    return months6.map(m => ({ name: m.label, Приходи: sums[m.key] }));
  }, [clients, months6]);

  // 3. Запитвания по статус — чете от inquiries.status (реалният вокабуляр: new/processing/paid/cancelled,
  // виж ReservationsTab.tsx), не от никога непопълваната колекция "bookings" с различен, никога
  // реално използван вокабуляр (new_inquiry/offer_sent/...).
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    inquiries.forEach(inq => {
      const s = inq.status || 'new';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([status, count]) => ({
        status,
        name: INQUIRY_STATUS_LABELS[status] || status,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [inquiries]);

  // 4. Нови клиенти по месеци
  const clientsData = useMemo(() => {
    const counts = Object.fromEntries(months6.map(m => [m.key, 0]));
    clients.forEach(c => {
      if (c.createdAt?.seconds) {
        const k = toMonthKey(c.createdAt.seconds);
        if (k in counts) counts[k]++;
      }
    });
    return months6.map(m => ({ name: m.label, Клиенти: counts[m.key] }));
  }, [clients, months6]);

  // 5. Ръст на абонатите (кумулативен, 12 месеца)
  const subscribersData = useMemo(() => {
    const counts = Object.fromEntries(months12.map(m => [m.key, 0]));
    subscribers.forEach(s => {
      if (s.createdAt?.seconds) {
        const k = toMonthKey(s.createdAt.seconds);
        if (k in counts) counts[k]++;
      }
    });
    // Стартова база: абонати преди прозореца от 12 месеца
    let cum = subscribers.filter(s => {
      if (!s.createdAt?.seconds) return false;
      return !(toMonthKey(s.createdAt.seconds) in counts);
    }).length;
    return months12.map(m => {
      cum += counts[m.key];
      return { name: m.label, Абонати: cum };
    });
  }, [subscribers, months12]);

  // 6. Топ дестинации по активни турове
  const destinationsData = useMemo(() => {
    const counts: Record<string, number> = {};
    tours.forEach(t => {
      if (t.status === 'public') {
        const countries: string[] = Array.isArray(t.country) ? t.country : [t.country].filter(Boolean);
        countries.forEach(c => { counts[c] = (counts[c] || 0) + 1; });
      }
    });
    return Object.entries(counts)
      .map(([name, Турове]) => ({ name, Турове }))
      .sort((a, b) => b.Турове - a.Турове)
      .slice(0, 8);
  }, [tours]);

  // 7. Топ категории
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    tours.forEach(t => {
      if (Array.isArray(t.categories)) {
        t.categories.forEach((cat: string) => { counts[cat] = (counts[cat] || 0) + 1; });
      }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [tours]);

  // 8. Пътници по потвърдени групи — чете от реалната "groups" колекция (която ReservationsTab.tsx реално пълни
  // при плащане). Преди тук имаше "Запълненост на заминаванията" (% спрямо капацитет) —
  // махнахте, тъй като концепцията за "капацитет" на тур все още не съществува никъде в модела.
  const groupsData = useMemo(() => {
    return groups
      .map(g => ({
        name: g.tourTitle ? `${g.tourTitle}${g.startDate ? ` (${g.startDate})` : ''}` : (g.startDate || g.id || '—'),
        Пътници: Array.isArray(g.tourists) ? g.tourists.length : 0,
      }))
      .sort((a, b) => b.Пътници - a.Пътници)
      .slice(0, 8);
  }, [groups]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

      {/* 1. Запитвания */}
      <div className={CARD}>
        <h3 className={TITLE}>Запитвания — последни 6 месеца</h3>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={inquiriesData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gInq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c5a35d" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#c5a35d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_H} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={AXIS_TICK} />
              <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="Запитвания" stroke="#c5a35d" strokeWidth={2}
                fillOpacity={1} fill="url(#gInq)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Приходи */}
      <div className={CARD}>
        <h3 className={TITLE}>Приходи от резервации (€)</h3>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_H} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={AXIS_TICK} />
              <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} />
              <Tooltip contentStyle={TOOLTIP_STYLE}
                formatter={(v: any) => [`€${Number(v).toLocaleString('bg-BG')}`, 'Приходи']} />
              <Bar dataKey="Приходи" fill="#c5a35d" radius={[4, 4, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Резервации по статус */}
      <div className={CARD}>
        <h3 className={TITLE}>Запитвания по статус</h3>
        {statusData.length === 0 ? <EmptyState text="Няма запитвания" /> : (
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical"
                margin={{ top: 4, right: 24, left: 10, bottom: 0 }}>
                <CartesianGrid {...GRID_V} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS_TICK} allowDecimals={false} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fontSize: 10, fill: '#9ca3af' }} width={114} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Брой" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={INQUIRY_STATUS_COLORS[entry.status] || '#9ca3af'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 4. Нови клиенти */}
      <div className={CARD}>
        <h3 className={TITLE}>Нови клиенти — последни 6 месеца</h3>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={clientsData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gClients" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_H} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={AXIS_TICK} />
              <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="Клиенти" stroke="#3b82f6" strokeWidth={2}
                fillOpacity={1} fill="url(#gClients)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Ръст на абонатите */}
      <div className={CARD}>
        <h3 className={TITLE}>Ръст на абонатите — 12 месеца</h3>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={subscribersData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gSubs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_H} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={AXIS_TICK} />
              <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="Абонати" stroke="#10b981" strokeWidth={2}
                fillOpacity={1} fill="url(#gSubs)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 6. Топ дестинации */}
      <div className={CARD}>
        <h3 className={TITLE}>Топ дестинации (активни турове)</h3>
        {destinationsData.length === 0 ? <EmptyState /> : (
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={destinationsData} layout="vertical"
                margin={{ top: 4, right: 24, left: 10, bottom: 0 }}>
                <CartesianGrid {...GRID_V} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS_TICK} allowDecimals={false} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fontSize: 10, fill: '#9ca3af' }} width={80} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="Турове" fill="#0f172a" radius={[0, 4, 4, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 7. Пътници по групи */}
      <div className={CARD}>
        <h3 className={TITLE}>Пътници по потвърдени групи</h3>
        {groupsData.length === 0 ? <EmptyState text="Няма потвърдени групи" /> : (
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupsData} layout="vertical"
                margin={{ top: 4, right: 24, left: 10, bottom: 0 }}>
                <CartesianGrid {...GRID_V} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS_TICK} allowDecimals={false} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fontSize: 10, fill: '#9ca3af' }} width={110} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="Пътници" fill="#c5a35d" radius={[0, 4, 4, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 8. Топ категории */}
      <div className={CARD}>
        <h3 className={TITLE}>Топ категории екскурзии</h3>
        {categoryData.length === 0 ? <EmptyState /> : (
          <div style={{ height: 220 }} className="relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} innerRadius={58} outerRadius={78}
                  paddingAngle={4} dataKey="value">
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend verticalAlign="middle" align="right" layout="vertical"
                  iconType="circle" wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pr-[100px]">
              <span className="text-2xl font-black text-brand-dark">{tours.length}</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
