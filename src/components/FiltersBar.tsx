"use client";

import { MapPin, Calendar, ArrowUpDown, Search, X, Trash2, Star, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ALL_MONTHS = [
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

const CATEGORY_OPTIONS = ['Водена от ПОЛИ', 'Почивка', 'Екскурзия', 'Екзотика', 'Приключение', 'Круиз', 'Last Minute', 'City Break'];

interface FiltersBarProps {
    isOpen: boolean;
    toggleOpen: () => void;
    searchQuery: string;
    filterContinent: string;
    filterCountry: string;
    filterMonth: string;
    filterCategory: string;
    sortBy: string;
    uniqueContinents: string[];
    uniqueCountries: string[];
    updateParam: (key: string, value: string) => void;
    clearFilters: () => void;
    hasActiveFilters: boolean;
    resultsCount: number;
    scrollToResults: () => void;
}

export default function FiltersBar({
    isOpen, toggleOpen, searchQuery, filterContinent, filterCountry, filterMonth, filterCategory, sortBy,
    uniqueContinents, uniqueCountries, updateParam, clearFilters, hasActiveFilters, resultsCount, scrollToResults
}: FiltersBarProps) {

  return (
    // 👇 ПРОМЯНА: mb-2 за телефони, mb-8 за десктоп (намалява дупката) 👇
    <div className="relative mb-2 md:mb-8 z-30 w-full">
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden w-full"
                >
                    <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-8 shadow-[0_20px_50px_rgba(197,163,93,0.15)] border border-brand-gold/20 mt-4 md:mt-6 mx-1">
                        
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-8 gap-4">
                            <h3 className="text-xl font-serif italic text-brand-dark hidden lg:block">Намери своето пътешествие</h3>
                            <div className="flex w-full lg:w-auto items-center gap-4 flex-grow lg:justify-end">
                                <div className="relative w-full lg:max-w-xl group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-gold transition-colors" size={20} />
                                    <input 
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => updateParam('q', e.target.value)}
                                        placeholder="Търсене по име или държава..."
                                        className="w-full bg-gray-50/50 border border-gray-200 group-hover:border-brand-gold/40 rounded-2xl pl-12 pr-10 py-3.5 font-bold text-brand-dark focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/10 focus:bg-white transition-all shadow-sm"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => updateParam('q', '')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                             {[
                                // Около ред 84:
                                { label: 'Континент', val: filterContinent, set: (v:string) => updateParam('continent', v), opts: uniqueContinents, icon: MapPin },
                                { label: 'Държава', val: filterCountry, set: (v:string) => updateParam('country', v), opts: uniqueCountries, icon: MapPin, dis: !uniqueCountries.length },
                                { label: 'Месец', val: filterMonth, set: (v:string) => updateParam('month', v), opts: ALL_MONTHS, icon: Calendar, isMonth: true },
                                { label: 'Сортирай', val: sortBy, set: (v:string) => updateParam('sort', v), opts: [{label:'Най-скорошни', value:'date'}, {label:'Цена (↑)', value:'price_asc'}, {label:'Цена (↓)', value:'price_desc'}], icon: ArrowUpDown, isSort: true }
                            ].map((field, idx) => (
                                <div key={idx} className="relative group">
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4 mb-1 block group-focus-within:text-brand-gold transition-colors">{field.label}</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl px-5 py-3 font-bold text-brand-dark focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/10 appearance-none cursor-pointer transition-all hover:border-brand-gold/30 disabled:opacity-50 pr-10" 
                                            value={field.val} 
                                            onChange={e => field.set(e.target.value)}
                                            disabled={field.dis}
                                        >
                                            <option value="">{field.isSort ? 'Избери...' : 'Всички'}</option> 
                                            {field.opts.map((o: any) => (
                                                <option key={o.value || o} value={o.value || slugify(o)}>{o.label || o}</option>
                                            ))}
                                        </select>
                                        <field.icon className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-brand-gold transition-colors" size={16}/>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-gray-100 pt-6 flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
                            <div className="w-full xl:w-auto flex-grow">
                                <label className="text-[10px] font-black uppercase text-gray-400 mb-3 block">Тип преживяване</label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORY_OPTIONS.map(cat => {
                                        const isSpecial = cat === 'Водена от ПОЛИ';
                                        const isSelected = filterCategory === slugify(cat); 
                                        return (
                                            <button 
                                                key={cat} 
                                                onClick={() => updateParam('cat', isSelected ? '' : slugify(cat))} 
                                                className={`
                                                    relative px-4 py-2 rounded-xl text-xs font-black uppercase transition-all duration-300 border
                                                    ${isSelected 
                                                        ? 'bg-gradient-to-r from-brand-gold to-[#d4af37] text-white border-brand-gold shadow-lg shadow-brand-gold/20 transform scale-105' 
                                                        : isSpecial 
                                                            ? 'bg-gradient-to-r from-brand-gold/10 to-transparent text-brand-gold border-brand-gold/50 shadow-sm hover:bg-brand-gold hover:text-white' 
                                                            : 'bg-white text-gray-500 border-gray-100 hover:border-brand-gold/50 hover:text-brand-gold hover:bg-brand-gold/5'
                                                    }
                                                `}
                                            >
                                                {isSpecial && <div className="absolute -top-1.5 -left-1.5 text-brand-gold bg-white rounded-full p-0.5 border border-brand-gold shadow-sm z-10"><Star size={10} fill="currentColor" /></div>}
                                                {isSelected && <span className="mr-1">✓</span>} {cat}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto mt-4 xl:mt-0">
                                
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
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
}