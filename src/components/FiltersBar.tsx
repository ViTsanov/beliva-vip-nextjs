"use client";

import { MapPin, Calendar, ArrowUpDown, Search, X, Trash2, Check } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export const ALL_MONTHS = [
  { value: '01', label: 'Януари' }, { value: '02', label: 'Февруари' },
  { value: '03', label: 'Март' }, { value: '04', label: 'Април' },
  { value: '05', label: 'Май' }, { value: '06', label: 'Юни' },
  { value: '07', label: 'Юли' }, { value: '08', label: 'Август' },
  { value: '09', label: 'Септември' }, { value: '10', label: 'Октомври' },
  { value: '11', label: 'Ноември' }, { value: '12', label: 'Декември' },
];

const slugify = (text: string) => {
  const chars: { [key: string]: string } = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sht', 'ъ': 'a', 'ь': 'y', 'ю': 'yu', 'я': 'ya'
  };
  return text.toLowerCase().split('').map(char => chars[char] || char).join('')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

export const CATEGORY_OPTIONS = ['Водена от ПОЛИ', 'Почивка в Турция', 'Екскурзия', 'Екзотика', 'Почивка', 'Приключение', 'Круиз', 'Last Minute', 'City Break'];

type FilterFieldOption = string | { value: string; label: string };

interface FiltersBarProps {
    isOpen: boolean;
    toggleOpen: () => void;
    searchQuery: string;
    filterCountry: string;
    filterMonth: string;
    sortBy: string;
    uniqueCountries: string[];
    updateParam: (key: string, value: string) => void;
    clearFilters: () => void;
    hasActiveFilters: boolean;
    resultsCount: number;
    scrollToResults: () => void;
}

export default function FiltersBar({
    isOpen, searchQuery, filterCountry, filterMonth, sortBy,
    uniqueCountries, updateParam, clearFilters, hasActiveFilters, resultsCount, scrollToResults
}: FiltersBarProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    // 👇 ПРОМЯНА: mb-2 за телефони, mb-8 за десктоп (намалява дупката) 👇
    <div className="relative mb-2 md:mb-8 z-30 w-full">
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: "easeInOut" }}
                    className="overflow-hidden w-full"
                >
                    <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-8 shadow-[0_20px_50px_rgba(197,163,93,0.15)] border border-brand-gold/20 mt-4 md:mt-6 mx-1">
                        
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-8 gap-4">
                            <h3 className="text-xl font-serif italic text-brand-dark hidden lg:block">Намери своето пътешествие</h3>
                            <div className="flex w-full lg:w-auto items-center gap-4 flex-grow lg:justify-end">
                                <div className="relative w-full lg:max-w-xl group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-gold transition-colors" size={20} aria-hidden="true" />
                                    <label htmlFor="tour-search" className="sr-only">Търсене по тур или държава</label>
                                    <input
                                        id="tour-search"
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => updateParam('q', e.target.value)}
                                        placeholder="Търсене по име или държава..."
                                        className="w-full bg-gray-50/50 border border-gray-200 group-hover:border-brand-gold/40 rounded-2xl pl-12 pr-10 py-3.5 font-bold text-brand-dark focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/10 focus:bg-white transition-all shadow-sm"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => updateParam('q', '')} aria-label="Изчисти търсенето" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                                            <X size={16} aria-hidden="true" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                             {([
                                { label: 'Държава', val: filterCountry, set: (v:string) => updateParam('country', v), opts: uniqueCountries as FilterFieldOption[], icon: MapPin, dis: !uniqueCountries.length },
                                { label: 'Месец', val: filterMonth, set: (v:string) => updateParam('month', v), opts: ALL_MONTHS as FilterFieldOption[], icon: Calendar, isMonth: true },
                                { label: 'Сортирай', val: sortBy, set: (v:string) => updateParam('sort', v), opts: [{label:'Най-скорошни', value:'date'}, {label:'Цена (↑)', value:'price_asc'}, {label:'Цена (↓)', value:'price_desc'}] as FilterFieldOption[], icon: ArrowUpDown, isSort: true }
                            ]).map((field, idx) => (
                                <div key={idx} className="relative group">
                                    <label htmlFor={`filter-field-${idx}`} className="text-[10px] font-black uppercase text-gray-400 ml-4 mb-1 block group-focus-within:text-brand-gold transition-colors">{field.label}</label>
                                    <div className="relative">
                                        <select
                                            id={`filter-field-${idx}`}
                                            className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl px-5 py-3 font-bold text-brand-dark focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/10 appearance-none cursor-pointer transition-all hover:border-brand-gold/30 disabled:opacity-50 pr-10"
                                            value={field.val}
                                            onChange={e => field.set(e.target.value)}
                                            disabled={field.dis}
                                        >
                                            <option value="">{field.isSort ? 'Избери...' : 'Всички'}</option> 
                                            {field.opts.map((o) => {
                                                const value = typeof o === 'string' ? slugify(o) : o.value;
                                                const label = typeof o === 'string' ? o : o.label;
                                                return <option key={value} value={value}>{label}</option>;
                                            })}
                                        </select>
                                        <field.icon className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-brand-gold transition-colors" size={16}/>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-end gap-3">
                                
                                <button 
                                    onClick={clearFilters} 
                                    disabled={!hasActiveFilters} 
                                    className={`
                                        w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold uppercase text-xs tracking-wider border transition-all
                                        ${hasActiveFilters 
                                            ? 'bg-red-50 text-red-500 border-red-100 hover:bg-red-100 hover:shadow-md cursor-pointer' 
                                            : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed opacity-70'
                                        }
                                    `}
                                >
                                    <Trash2 size={16}/> Изчисти
                                </button>

                                <button 
                                    onClick={scrollToResults}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-bold uppercase text-xs tracking-wider bg-brand-dark text-white border border-brand-dark hover:bg-black hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                                >
                                    <Check size={16} /> Виж {resultsCount} оферти
                                </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
}