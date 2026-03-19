"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Search, Plus, Trash2, Edit, User, Eye } from 'lucide-react';
import { IClient } from '@/types';
import ClientDetailModal from './ClientDetailModal';
// Ако имаш AddClientModal в същата папка, импортирай го. Засега ще го оставим коментиран или ще го имплементираме после.
// import AddClientModal from './AddClientModal';

interface ClientsTabProps {
  onAddClient: () => void;
}

export default function ClientsTab({ onAddClient }: ClientsTabProps) {
  const [clients, setClients] = useState<IClient[]>([]);
  const [filteredClients, setFilteredClients] = useState<IClient[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Модали
  const [selectedClient, setSelectedClient] = useState<IClient | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false); // За разглеждане
  // const [isAddModalOpen, setIsAddModalOpen] = useState(false); // За добавяне/редакция

  // 1. Извличане на клиентите
  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "customers"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IClient));
      setClients(data);
      setFilteredClients(data);
    } catch (error) {
      console.error("Грешка при извличане на клиенти:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // 2. Търсене (Филтриране)
  useEffect(() => {
    const term = clientSearch.toLowerCase();
    const filtered = clients.filter(c => 
      c.firstName?.toLowerCase().includes(term) ||
      c.lastName?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.phone?.includes(term)
    );
    setFilteredClients(filtered);
  }, [clientSearch, clients]);

  // 3. Изтриване
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Сигурни ли сте, че искате да изтриете този клиент?")) {
      try {
        await deleteDoc(doc(db, "customers", id));
        setClients(prev => prev.filter(c => c.id !== id));
      } catch (error) {
        console.error("Грешка при изтриване:", error);
      }
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Зареждане на клиенти...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER НА ТАБА */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Търси по име, имейл или телефон..." 
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-gold/20"
            />
          </div>
        </div>
        <button 
            onClick={onAddClient}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-brand-dark text-white rounded-2xl hover:bg-black transition-colors font-bold text-sm"
        >
            <Plus size={18} /> Добави Клиент
        </button>
      </div>

      {/* ТАБЛИЦА */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-5 text-xs font-black uppercase text-gray-400">Клиент</th>
                <th className="p-5 text-xs font-black uppercase text-gray-400">Контакти</th>
                <th className="p-5 text-xs font-black uppercase text-gray-400">Пътувания</th>
                <th className="p-5 text-xs font-black uppercase text-gray-400">Статус</th>
                <th className="p-5 text-xs font-black uppercase text-gray-400 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredClients.map(client => (
                <tr 
                  key={client.id} 
                  className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                  onClick={() => { setSelectedClient(client); setIsClientModalOpen(true); }}
                >
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-gold/10 text-brand-gold rounded-full flex items-center justify-center font-bold">
                        {client.firstName?.[0] || <User size={16} />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{client.firstName} {client.lastName}</p>
                        <p className="text-xs text-gray-400">{client.latinName || 'Няма данни по паспорт'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <p className="text-sm text-gray-600">{client.phone}</p>
                    <p className="text-xs text-gray-400">{client.email}</p>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                        <div className="bg-brand-gold/10 text-brand-gold px-3 py-1 rounded-full text-xs font-black">
                            {((client as any).tripHistory?.length) || client.tripsCount || (client as any).totalTrips || 0}
                        </div>
                    </div>
                  </td>
                  <td className="p-5">
                    {client.discountFlag ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold uppercase">
                        VIP (-{client.discountPercentage}%)
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-xs font-bold uppercase">
                        Стандартен
                      </span>
                    )}
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedClient(client); setIsClientModalOpen(true); }}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Виж Картон"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(client.id!, e)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">Няма намерени клиенти</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Извикване на Модала за Детайли */}
      {/* Извикване на Модала за Детайли */}
      {isClientModalOpen && selectedClient && (
        <ClientDetailModal 
          client={selectedClient} 
          onClose={() => { setIsClientModalOpen(false); setSelectedClient(null); }} 
          onUpdate={(updatedClient) => {
            setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
            setFilteredClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
            setSelectedClient(updatedClient);
          }}
          onOpenGroup={(tourId) => {
            // Временно съобщение, докато направим Стъпка 4
            alert(`Скоро тук ще се отваря Картонът на групата с детайли за полети и гидове! (ID: ${tourId})`);
          }}
        />
      )}
    </div>
  );
}