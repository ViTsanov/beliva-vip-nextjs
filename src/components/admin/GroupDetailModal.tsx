"use client";

import React, { useState } from 'react';
import { X, Plane, UserCheck, Users, Save, Phone, Clock, ExternalLink, MapPin, Calendar } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function GroupDetailModal({ group, onClose, onOpenClient }: { group: any, onClose: () => void, onOpenClient?: (id: string) => void }) {
  const [activeTab, setActiveTab] = useState<'logistics' | 'tourists'>('logistics');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    guideName: group.guideName || '',
    guidePhone: group.guidePhone || '',
    outboundFlight: group.outboundFlight || '',
    inboundFlight: group.inboundFlight || '',
    flightDetails: group.flightDetails || '', // Свободен текст за часове и летища
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "groups", group.id), formData);
      alert("Информацията е обновена!");
    } catch (e) {
      console.error(e);
      alert("Грешка при запис.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-end bg-brand-dark/80 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* HEADER */}
        <div className="p-8 border-b border-gray-50 bg-brand-dark text-white">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-brand-gold/20 rounded-2xl text-brand-gold">
                <Calendar size={28} />
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
                <X size={28} />
            </button>
          </div>
          <h2 className="font-serif italic text-3xl mb-2">{group.tourTitle}</h2>
          <p className="text-brand-gold font-bold tracking-widest uppercase text-xs">Група: {group.startDate}</p>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex p-2 bg-gray-50 border-b border-gray-100">
            <button 
                onClick={() => setActiveTab('logistics')}
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'logistics' ? 'bg-white text-brand-dark rounded-2xl shadow-sm' : 'text-gray-400'}`}
            >
                <Plane size={16} /> Логистика & Полети
            </button>
            <button 
                onClick={() => setActiveTab('tourists')}
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'tourists' ? 'bg-white text-brand-dark rounded-2xl shadow-sm' : 'text-gray-400'}`}
            >
                <Users size={16} /> Списък Туристи ({group.tourists?.length || 0})
            </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-8">
            {activeTab === 'logistics' ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    {/* ГИД / ВОДАЧ */}
                    <section className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                            <UserCheck size={14} className="text-brand-gold" /> Информация за Водача
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <input 
                                type="text" placeholder="Име на гида" value={formData.guideName}
                                onChange={e => setFormData({...formData, guideName: e.target.value})}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:border-brand-gold"
                            />
                            <input 
                                type="text" placeholder="Телефон на гида" value={formData.guidePhone}
                                onChange={e => setFormData({...formData, guidePhone: e.target.value})}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:border-brand-gold"
                            />
                        </div>
                    </section>

                    {/* ПОЛЕТИ */}
                    <section className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                            <Plane size={14} className="text-brand-gold" /> Детайли за Полетите
                        </h3>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Отиване</p>
                                    <input 
                                        type="text" placeholder="Номер полет (напр. FB451)" value={formData.outboundFlight}
                                        onChange={e => setFormData({...formData, outboundFlight: e.target.value})}
                                        className="w-full bg-transparent text-sm font-bold outline-none"
                                    />
                                </div>
                                <div className="flex-1 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Връщане</p>
                                    <input 
                                        type="text" placeholder="Номер полет (напр. FB452)" value={formData.inboundFlight}
                                        onChange={e => setFormData({...formData, inboundFlight: e.target.value})}
                                        className="w-full bg-transparent text-sm font-bold outline-none"
                                    />
                                </div>
                            </div>
                            <textarea 
                                placeholder="Допълнителна информация: Часове на излитане, летища, багаж..."
                                value={formData.flightDetails}
                                onChange={e => setFormData({...formData, flightDetails: e.target.value})}
                                className="w-full h-40 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none resize-none focus:bg-white focus:border-brand-gold"
                            />
                        </div>
                    </section>
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-50">
                                <th className="py-4 text-[10px] font-black uppercase text-gray-400">Турист</th>
                                <th className="py-4 text-[10px] font-black uppercase text-gray-400">Платена Сума</th>
                                <th className="py-4 text-right text-[10px] font-black uppercase text-gray-400">Действие</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {group.tourists?.map((tourist: any, idx: number) => (
                                <tr key={idx} className="group/row">
                                    <td className="py-4">
                                        <button 
                                            onClick={() => onOpenClient?.(tourist.customerId)}
                                            className="text-sm font-bold text-brand-dark hover:text-brand-gold transition-colors text-left"
                                        >
                                            {tourist.name}
                                        </button>
                                        <p className="text-[10px] text-gray-400">Записан на: {new Date(tourist.addedAt).toLocaleDateString()}</p>
                                    </td>
                                    <td className="py-4">
                                        <span className="text-sm font-black text-emerald-600">{tourist.paidPrice} €</span>
                                    </td>
                                    <td className="py-4 text-right">
                                        <button className="p-2 text-gray-300 hover:text-brand-gold transition-colors">
                                            <ExternalLink size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>

        {/* FOOTER */}
        <div className="p-8 border-t border-gray-50 bg-gray-50/50 flex gap-4">
            <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-brand-dark text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-black transition-all disabled:opacity-50"
            >
                {isSaving ? 'Запазване...' : 'Запази промените'}
            </button>
        </div>
      </div>
    </div>
  );
}