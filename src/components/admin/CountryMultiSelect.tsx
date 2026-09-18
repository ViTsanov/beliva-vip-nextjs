"use client";
import { useState } from 'react';
import { X } from 'lucide-react';
import { WORLD_COUNTRIES } from '@/lib/constants';

// Споделен компонент за избор на държави с търсене + чипове — извадено от TourForm.tsx, за да се
// преизползва и в automation панела на AdminDashboardClient.tsx (вместо свободен текст, който лесно
// може да не съвпадне с реалните имена на държави, ползвани от 2mko сканирането).
//
// variant='dark' е за automation панела (тъмен фон); variant='light' (по подразбиране) е оригиналният
// стил на TourForm.tsx — не пипай светлата версия, TourForm разчита на нея.
interface CountryMultiSelectProps {
  selected: string[];
  setSelected: (countries: string[]) => void;
  label: string;
  variant?: 'light' | 'dark';
  renderExtra?: (country: string) => React.ReactNode; // Допълнително съдържание вътре всеки чип (напр. бройки за тази държава)
}

export default function CountryMultiSelect({ selected, setSelected, label, variant = 'light', renderExtra }: CountryMultiSelectProps) {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const isDark = variant === 'dark';

    // Филтрираме държавите, които съвпадат с търсенето и още не са избрани
    const filtered = WORLD_COUNTRIES.filter(c =>
        c.toLowerCase().includes(search.toLowerCase()) && !selected.includes(c)
    );

    const addCountry = (c: string) => {
        setSelected([...selected, c]);
        setSearch('');
        setIsOpen(false);
    };

    const removeCountry = (idx: number) => {
        setSelected(selected.filter((_: any, i: number) => i !== idx));
    };

    return (
        <div className="relative">
            <label className={`text-[10px] font-black uppercase tracking-[0.15em] ml-2 mb-2 block ${isDark ? 'text-white/40' : 'text-gray-400'}`}>{label}</label>
            <div className={`border rounded-2xl p-2 flex flex-wrap gap-2 items-center transition-all relative z-10 ${
                isDark
                    ? 'bg-white/10 border-white/20 focus-within:border-brand-gold'
                    : 'bg-gray-50 border-gray-100 focus-within:bg-white focus-within:border-brand-gold'
            }`}>
                {selected.map((tag: string, idx: number) => (
                    <span key={idx} className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                        isDark ? 'bg-brand-gold/20 border border-brand-gold/40 text-brand-gold' : 'bg-brand-dark text-white'
                    }`}>
                        {tag} {renderExtra?.(tag)} <button type="button" onClick={() => removeCountry(idx)} className={isDark ? 'text-brand-gold/60 hover:text-white' : 'text-gray-400 hover:text-white'}><X size={12}/></button>
                    </span>
                ))}
                <input
                    type="text"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)} // Изчакваме клика
                    placeholder={selected.length === 0 ? "Търси държава..." : "Добави още..."}
                    className={`flex-grow bg-transparent outline-none min-w-[150px] p-2 text-sm ${isDark ? 'text-white placeholder:text-white/30' : 'text-brand-dark'}`}
                />
            </div>

            {/* ПАДАЩО МЕНЮ С РЕЗУЛТАТИ */}
            {isOpen && filtered.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 shadow-xl rounded-2xl max-h-48 overflow-y-auto">
                    {filtered.map(c => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => addCountry(c)}
                            className="w-full text-left px-4 py-3 hover:bg-brand-gold/10 text-sm text-brand-dark font-medium border-b border-gray-50 last:border-0 transition-colors"
                        >
                            {c}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
