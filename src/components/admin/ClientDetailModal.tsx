import React from 'react';
import { X, Phone, Mail, Award, History, FileText, User, CreditCard } from 'lucide-react';
import { IClient } from '@/types';

interface ClientDetailModalProps {
  client: IClient;
  onClose: () => void;
}

export default function ClientDetailModal({ client, onClose }: ClientDetailModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-end bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-brand-dark text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-gold rounded-full flex items-center justify-center text-xl font-bold">
              {client.firstName[0]}{client.lastName[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold">{client.firstName} {client.lastName}</h2>
              <p className="text-sm text-brand-gold/80">Клиент от {new Date(client.createdAt?.seconds * 1000).toLocaleDateString('bg-BG')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* Контакти и Статус */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase text-gray-400 flex items-center gap-2">
                <User size={14} /> Контакти
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-gray-700">
                  <Phone size={18} className="text-brand-gold" /> {client.phone}
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Mail size={18} className="text-brand-gold" /> {client.email}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase text-gray-400 flex items-center gap-2">
                <Award size={14} /> Лоялност
              </h3>
              <div className="p-4 bg-brand-gold/5 rounded-2xl border border-brand-gold/20">
                <p className="text-2xl font-bold text-brand-dark">{client.tripsCount}</p>
                <p className="text-xs text-gray-500 uppercase">Реализирани пътувания</p>
                {client.discountFlag && (
                  <div className="mt-2 inline-block px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded">
                    ПРАВО НА ОТСТЪПКА {client.discountPercentage}%
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Секция Финанси в Модала */}
          <div className="space-y-4 pt-6 border-t">
            <h3 className="text-sm font-black uppercase text-gray-400 flex items-center gap-2">
              <CreditCard size={14} /> Финансова информация
            </h3>
            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
              <p className="text-[10px] text-blue-400 uppercase font-bold">Банкова сметка (IBAN)</p>
              <p className="font-mono text-sm tracking-wider">
                {client.iban || 'Не е въведен'}
              </p>
            </div>
          </div>

          {/* Документи за пътуване */}
          <div className="space-y-4 pt-6 border-t">
            <h3 className="text-sm font-black uppercase text-gray-400 flex items-center gap-2">
              <FileText size={14} /> Данни по Паспорт (за билети/застраховки)
            </h3>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl">
              <div>
                <p className="text-[10px] text-gray-400 uppercase">Имена на Латиница</p>
                <p className="font-bold">{client.latinName || '---'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase">ЕГН</p>
                <p className="font-bold">{client.egn || '---'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase">Паспорт №</p>
                <p className="font-bold">{client.passportNumber || '---'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase">Валидност до</p>
                <p className="font-bold">{client.passportValidity || '---'}</p>
              </div>
            </div>
          </div>

          {/* История на пътуванията */}
          <div className="space-y-4 pt-6 border-t">
            <h3 className="text-sm font-black uppercase text-gray-400 flex items-center gap-2">
              <History size={14} /> История на пътуванията
            </h3>
            {/* Тук ще се зареждат автоматично приключените резервации */}
            <div className="space-y-3">
              <p className="text-sm text-gray-500 italic">Списъкът се генерира автоматично от таб "Групи"...</p>
            </div>
          </div>

          {/* Вътрешни бележки */}
          <div className="space-y-4 pt-6 border-t">
            <h3 className="text-sm font-black uppercase text-gray-400">Бележки на агента</h3>
            <textarea 
              className="w-full h-32 p-4 bg-yellow-50/50 border border-yellow-100 rounded-2xl text-sm focus:outline-none"
              defaultValue={client.notes}
              placeholder="Специфични изисквания, любими места в автобуса..."
            />
          </div>
        </div>
        

        {/* Footer Actions */}
        <div className="p-6 border-t bg-gray-50 flex gap-4">
          <button className="flex-1 bg-brand-dark text-white py-3 rounded-xl font-bold hover:bg-black transition-all">
            Запази промените
          </button>
          <button className="px-6 py-3 border border-gray-200 rounded-xl font-bold hover:bg-white transition-all text-red-500">
            Изтрий клиент
          </button>
        </div>
      </div>
    </div>
  );
}