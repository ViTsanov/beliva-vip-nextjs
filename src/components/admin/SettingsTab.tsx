"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Save, Globe, List, Plus, Trash2, ImageIcon, Link as LinkIcon } from 'lucide-react';
import MediaLibrary from '@/components/MediaLibrary';
import { slugify } from '@/lib/admin-helpers';
import { WORLD_COUNTRIES } from '@/lib/constants'; // Твоят масив

export default function SettingsTab() {
  const [loading, setLoading] = useState(true);
  const [topDestinations, setTopDestinations] = useState<any[]>([]);
  const [footerLinks, setFooterLinks] = useState<any[]>([]);
  
  // Состояние за галерията
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, "settings", "homepage"));
        if (docSnap.exists()) {
          setTopDestinations(docSnap.data().topDestinations || []);
          setFooterLinks(docSnap.data().footerLinks || []);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      await setDoc(doc(db, "settings", "homepage"), {
        topDestinations,
        footerLinks
      });
      alert("Настройките са запазени успешно!");
    } catch (e) { alert("Грешка при запис"); }
  };

  const handleImageSelect = (url: string) => {
    if (editingIndex !== null) {
      const newDest = [...topDestinations];
      newDest[editingIndex].image = url;
      setTopDestinations(newDest);
    }
    setIsMediaOpen(false);
    setEditingIndex(null);
  };

  if (loading) return <div className="p-10 text-center text-gray-400">Зареждане...</div>;

  return (
    <div className="space-y-10 animate-in fade-in pb-24">
      {/* СЕКЦИЯ: ТОП ДЕСТИНАЦИИ */}
      <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-brand-dark">
            <Globe className="text-brand-gold" /> Слайдер "Топ Дестинации"
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topDestinations.map((dest, idx) => (
            <div key={idx} className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-4 relative group">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 mb-1 ml-2 block">Държава</label>
                <select 
                  value={dest.name}
                  onChange={e => {
                    const newDest = [...topDestinations];
                    newDest[idx].name = e.target.value;
                    setTopDestinations(newDest);
                  }}
                  className="w-full p-3.5 rounded-2xl border-none text-sm font-bold bg-white shadow-sm outline-none focus:ring-2 focus:ring-brand-gold/20"
                >
                  <option value="">Избери от списъка...</option>
                  {WORLD_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div 
                onClick={() => { setEditingIndex(idx); setIsMediaOpen(true); }}
                className="relative h-40 bg-gray-200 rounded-2xl overflow-hidden cursor-pointer group/img shadow-inner"
              >
                {dest.image ? (
                  <img src={dest.image} className="w-full h-full object-cover transition-transform group-hover/img:scale-110 duration-500" alt="" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <ImageIcon size={32} strokeWidth={1.5} />
                    <span className="text-[10px] font-black mt-2">ИЗБЕРИ СНИМКА</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-brand-dark/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                   <span className="bg-white text-brand-dark px-4 py-2 rounded-xl text-xs font-black shadow-xl">СМЕНИ СНИМКА</span>
                </div>
              </div>

              <button onClick={() => setTopDestinations(topDestinations.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-white text-red-500 p-2.5 rounded-full shadow-lg border border-red-50 hover:bg-red-50 transition-colors">
                <Trash2 size={16}/>
              </button>
            </div>
          ))}
          <button 
            onClick={() => setTopDestinations([...topDestinations, { name: '', image: '' }])}
            className="border-2 border-dashed border-gray-200 rounded-[2rem] p-10 text-gray-400 hover:border-brand-gold hover:text-brand-gold transition-all flex flex-col items-center justify-center gap-3 bg-gray-50/50"
          >
            <Plus size={32} /> <span className="text-[10px] font-black uppercase tracking-widest">Добави дестинация</span>
          </button>
        </div>
      </section>

      {/* СЕКЦИЯ: ФУТЪР ЛИНКОВЕ */}
      <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-brand-dark">
            <List className="text-brand-gold" /> Линкове в "Топ Дестинации" (Футър)
        </h3>
        <div className="space-y-4">
          {footerLinks.map((link, idx) => (
            <div key={idx} className="flex flex-col md:flex-row gap-4 items-end bg-gray-50 p-6 rounded-[2rem] border border-gray-100 relative group">
              <div className="flex-1 w-full">
                <label className="text-[10px] font-black uppercase text-gray-400 mb-1 ml-2 block">Държава</label>
                <select 
                  value={link.label.replace('Екскурзии ', '').replace('Екзотика ', '')}
                  onChange={e => {
                    const country = e.target.value;
                    const newLinks = [...footerLinks];
                    const prefix = country.length > 8 ? "Екзотика" : "Екскурзии"; // Малка автоматика за заглавието
                    newLinks[idx].label = `${prefix} ${country}`;
                    // 👇 АВТОМАТИЧЕН SEO ЛИНК (напр. /?country=tailand)
                    newLinks[idx].href = `/?country=${slugify(country)}#tours-grid`;
                    setFooterLinks(newLinks);
                  }}
                  className="w-full p-3.5 rounded-2xl border-none text-sm font-bold bg-white shadow-sm outline-none"
                >
                  <option value="">Избери държава...</option>
                  {WORLD_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex-[1.5] w-full">
                 <label className="text-[10px] font-black uppercase text-gray-400 mb-1 ml-2 block">Генериран линк (Автоматично)</label>
                 <div className="p-3.5 bg-white rounded-2xl text-[11px] font-mono text-brand-gold flex items-center gap-2 shadow-sm border border-brand-gold/10">
                    <LinkIcon size={12} /> {link.href || 'Избери държава, за да се генерира...'}
                 </div>
              </div>
              <button onClick={() => setFooterLinks(footerLinks.filter((_, i) => i !== idx))} className="bg-white text-red-400 p-3.5 rounded-2xl shadow-sm hover:text-red-600 transition-colors border border-red-50">
                <Trash2 size={20}/>
              </button>
            </div>
          ))}
          <button 
            onClick={() => setFooterLinks([...footerLinks, { label: '', href: '' }])} 
            className="w-full py-5 border-2 border-dashed border-gray-200 rounded-[2rem] text-gray-400 hover:text-brand-gold transition-all font-bold text-xs uppercase tracking-widest"
          >
            + Добави нов линк в списъка
          </button>
        </div>
      </section>

      {/* ГАЛЕРИЯ МОДАЛ */}
      {isMediaOpen && (
        <div className="fixed inset-0 z-[200] bg-brand-dark/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
          <div className="w-full max-w-6xl h-[90vh] bg-white rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <MediaLibrary 
              onSelect={handleImageSelect} 
              onClose={() => setIsMediaOpen(false)} 
            />
          </div>
        </div>
      )}

      <div className="fixed bottom-8 right-10 z-[100]">
        <button 
            onClick={handleSave} 
            className="bg-brand-dark text-white px-10 py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-brand-gold hover:text-brand-dark transition-all flex items-center gap-3 active:scale-95"
        >
            <Save size={18} /> Запази всички настройки
        </button>
      </div>
    </div>
  );
}