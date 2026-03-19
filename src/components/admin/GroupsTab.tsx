"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Search, Users, Calendar, Plane, UserCheck, ChevronRight, History, Package } from 'lucide-react';
import GroupDetailModal from './GroupDetailModal'; // Ще го създадем в следващата стъпка

interface GroupsTabProps {
  onOpenClient: (id: string) => void;
}

export default function GroupsTab({ onOpenClient }: GroupsTabProps) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "groups"), orderBy("startDate", "desc"));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGroups(data);
    } catch (e) {
      console.error("Грешка при зареждане на групи:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroups(); }, []);

  const now = new Date();
  
  const filteredGroups = groups.filter(g => {
    const groupDate = new Date(g.startDate);
    const matchesSearch = g.tourTitle?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          g.guideName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'upcoming') return groupDate >= now && matchesSearch;
    return groupDate < now && matchesSearch;
  });

  if (loading) return <div className="p-10 text-center text-gray-400">Зареждане на групи...</div>;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* HEADER & FILTERS */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto">
          <button 
            onClick={() => setFilter('upcoming')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === 'upcoming' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Предстоящи
          </button>
          <button 
            onClick={() => setFilter('past')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === 'past' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Архив (Минали)
          </button>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
          <input 
            type="text" 
            placeholder="Търси група или гид..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-gold/20"
          />
        </div>
      </div>

      {/* GROUPS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.map(group => (
          <div 
            key={group.id} 
            onClick={() => setSelectedGroup(group)}
            className="group bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-brand-gold/30 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-brand-gold/10 rounded-2xl text-brand-gold">
                <Package size={24} />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">Дата на заминаване</p>
                <p className="text-sm font-bold text-brand-dark">{group.startDate}</p>
              </div>
            </div>

            <h3 className="font-serif italic text-xl text-brand-dark mb-4 line-clamp-2 leading-tight">
              {group.tourTitle}
            </h3>

            <div className="space-y-3 border-t border-gray-50 pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1.5"><Users size={14}/> Туристи:</span>
                <span className="font-black text-brand-dark bg-gray-50 px-2 py-1 rounded-lg">
                    {group.tourists?.length || 0} души
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1.5"><UserCheck size={14}/> Водач:</span>
                <span className="font-bold text-gray-700">{group.guideName || 'Не е избран'}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
                <div className="flex -space-x-2">
                    {/* Визуализация на запълненост */}
                    {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200" />)}
                    <div className="w-6 h-6 rounded-full border-2 border-white bg-brand-gold text-[8px] flex items-center justify-center font-bold text-white">
                        +{group.tourists?.length > 3 ? group.tourists.length - 3 : 0}
                    </div>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-brand-gold group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        ))}

        {filteredGroups.length === 0 && (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
            <History size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400 font-medium">Няма открити групи в тази секция.</p>
          </div>
        )}
      </div>

      {selectedGroup && (
        <GroupDetailModal 
          group={selectedGroup} 
          onClose={() => { setSelectedGroup(null); fetchGroups(); }} 
          onOpenClient={onOpenClient}
        />
      )}
    </div>
  );
}