"use client";

import { useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface DashboardChartsProps {
  inquiries: any[];
  tours: any[];
}

export default function DashboardCharts({ inquiries, tours }: DashboardChartsProps) {
  
  // 1. ДАННИ ЗА ЗАПИТВАНИЯ ПО МЕСЕЦИ (Area Chart)
  const inquiriesData = useMemo(() => {
    const months: any = {};
    const monthNames = ["Яну", "Фев", "Мар", "Апр", "Май", "Юни", "Юли", "Авг", "Сеп", "Окт", "Ное", "Дек"];

    const today = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = `${monthNames[d.getMonth()]}`;
        months[key] = 0;
    }

    inquiries.forEach(inq => {
        if (inq.createdAt?.seconds) {
            const date = new Date(inq.createdAt.seconds * 1000);
            const key = `${monthNames[date.getMonth()]}`;
            if (months.hasOwnProperty(key)) {
                months[key]++;
            }
        }
    });

    return Object.keys(months).map(key => ({
        name: key,
        Запитвания: months[key]
    }));
  }, [inquiries]);

  // 2. ДАННИ ЗА ТУРОВЕ ПО КАТЕГОРИИ (Pie Chart)
  const categoryData = useMemo(() => {
      const counts: any = {};
      tours.forEach(tour => {
          if (tour.categories && Array.isArray(tour.categories)) {
              tour.categories.forEach((cat: string) => {
                  counts[cat] = (counts[cat] || 0) + 1;
              });
          }
      });

      return Object.keys(counts)
        .map(key => ({ name: key, value: counts[key] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
  }, [tours]);

  const COLORS = ['#c5a35d', '#1a1a1a', '#9ca3af', '#4b5563', '#d4d4d8'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
      
      {/* ГРАФИКА 1 */}
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-brand-gold/5 h-96">
        <h3 className="font-bold text-gray-500 text-xs uppercase tracking-widest mb-6">Тенденция на запитванията</h3>
        <div className="h-full w-full -ml-4">
            <ResponsiveContainer width="100%" height="90%">
                <AreaChart data={inquiriesData}>
                    <defs>
                        <linearGradient id="colorInq" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#c5a35d" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#c5a35d" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
                    <Area type="monotone" dataKey="Запитвания" stroke="#c5a35d" strokeWidth={3} fillOpacity={1} fill="url(#colorInq)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* ГРАФИКА 2 */}
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-brand-gold/5 h-96 flex flex-col">
        <h3 className="font-bold text-gray-500 text-xs uppercase tracking-widest mb-2">Топ Категории Екскурзии</h3>
        <div className="flex-grow flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={categoryData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {categoryData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pr-24">
                <span className="text-2xl font-black text-brand-dark">{tours.length}</span>
            </div>
        </div>
      </div>

    </div>
  );
}