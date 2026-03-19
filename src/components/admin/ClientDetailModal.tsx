"use client";

import React, { useState, useEffect } from 'react';
import { X, Phone, Mail, Award, History, FileText, User, CreditCard, Star, Save, Calendar, MessageSquare, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { IClient } from '@/types';
import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface ClientDetailModalProps {
  client: IClient;
  onClose: () => void;
  onUpdate: (updatedClient: IClient) => void; 
  onOpenGroup?: (tourId: string) => void;
}

export default function ClientDetailModal({ client, onClose, onUpdate, onOpenGroup }: ClientDetailModalProps) {
  const [formData, setFormData] = useState({
    firstName: client.firstName || '',
    lastName: client.lastName || '',
    phone: client.phone || '',
    email: client.email || '',
    latinName: client.latinName || '',
    egn: client.egn || '',
    passportNumber: client.passportNumber || '',
    passportValidity: client.passportValidity || '',
    iban: client.iban || '',
    notes: client.notes || '',
    discountPercentage: client.discountPercentage || 0,
    discountFlag: client.discountFlag || false
  });

  const [isSaving, setIsSaving] = useState(false);
  
  // State за ревютата
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  // Извличане на ревютата, които този клиент е написал (по имейл)
  useEffect(() => {
    const fetchClientReviews = async () => {
      if (!client.email) return;
      setIsLoadingReviews(true);
      try {
        // Търсим ревюта, където имейлът съвпада с този на клиента
        const q = query(collection(db, 'reviews'), where('email', '==', client.email));
        const snap = await getDocs(q);
        const fetchedReviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setReviews(fetchedReviews);
      } catch (error) {
        console.error("Грешка при извличане на ревюта:", error);
      } finally {
        setIsLoadingReviews(false);
      }
    };

    fetchClientReviews();
  }, [client.email]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'discountPercentage') {
      setFormData(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    if (!client.id) return;
    setIsSaving(true);
    try {
      const clientRef = doc(db, 'customers', client.id);
      await updateDoc(clientRef, formData);
      onUpdate({ ...client, ...formData });
      alert('Промените са запазени успешно!');
    } catch (error) {
      console.error('Грешка при запазване:', error);
      alert('Възникна грешка при запазването.');
    } finally {
      setIsSaving(false);
    }
  };

  // Функция за скриване/показване на ревю
  const toggleReviewStatus = async (reviewId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'approved' ? 'hidden' : 'approved';
      await updateDoc(doc(db, 'reviews', reviewId), { status: newStatus });
      
      // Обновяваме локалния state, за да се смени бутончето веднага
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status: newStatus } : r));
    } catch (error) {
      console.error('Грешка при промяна статуса на ревюто:', error);
      alert('Неуспешна промяна на статуса на ревюто.');
    }
  };

  const joinedDate = client.createdAt?.seconds 
    ? new Date(client.createdAt.seconds * 1000).toLocaleDateString('bg-BG')
    : 'Неизвестна дата';

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-end bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* HEADER */}
        <div className="p-6 border-b flex justify-between items-center bg-brand-dark text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-gold rounded-full flex items-center justify-center text-xl font-bold uppercase text-brand-dark shrink-0">
              {formData.firstName?.[0] || ''}{formData.lastName?.[0] || ''}
            </div>
            <div>
              <div className="flex gap-2">
                <input 
                  type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                  className="text-xl font-bold bg-transparent border-b border-transparent hover:border-brand-gold/50 focus:border-brand-gold focus:outline-none px-1 py-0.5 w-32 placeholder:text-gray-400"
                  placeholder="Име"
                />
                <input 
                  type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                  className="text-xl font-bold bg-transparent border-b border-transparent hover:border-brand-gold/50 focus:border-brand-gold focus:outline-none px-1 py-0.5 w-40 placeholder:text-gray-400"
                  placeholder="Фамилия"
                />
              </div>
              <p className="text-sm text-brand-gold/80 px-1">Клиент от {joinedDate}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0">
            <X size={24} />
          </button>
        </div>

        {/* СЪДЪРЖАНИЕ */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* Секция 1: Контакти и Лоялност */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase text-gray-400 flex items-center gap-2">
                <User size={14} /> Контакти
              </h3>
              <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-3 text-gray-700 text-sm font-medium">
                  <Phone size={16} className="text-brand-gold shrink-0" /> 
                  <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-brand-gold focus:outline-none py-1" placeholder="Телефон" />
                </div>
                <div className="flex items-center gap-3 text-gray-700 text-sm font-medium">
                  <Mail size={16} className="text-brand-gold shrink-0" /> 
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-brand-gold focus:outline-none py-1" placeholder="Имейл" />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase text-gray-400 flex items-center gap-2">
                <Award size={14} /> Лоялност
              </h3>
              <div className="p-4 bg-brand-gold/5 rounded-2xl border border-brand-gold/20 flex flex-col justify-center h-full relative overflow-hidden">
                <Star className="absolute -right-4 -bottom-4 text-brand-gold/10" size={80} />
                <p className="text-3xl font-bold text-brand-dark relative z-10">{(client as any).tripHistory?.length || client.tripsCount || (client as any).totalTrips || 0}</p>
                <p className="text-xs text-gray-500 uppercase font-bold relative z-10">Пътувания с нас</p>
                
                <div className="mt-4 relative z-10 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input type="checkbox" name="discountFlag" checked={formData.discountFlag} onChange={handleChange} className="rounded text-brand-gold focus:ring-brand-gold" />
                    VIP Клиент (Има отстъпка)
                  </label>
                  
                  {formData.discountFlag && (
                    <div className="flex items-center gap-2">
                      <input type="number" name="discountPercentage" value={formData.discountPercentage} onChange={handleChange} className="w-16 px-2 py-1 text-sm border border-brand-gold/30 rounded focus:outline-none focus:ring-1 focus:ring-brand-gold bg-white" min="0" max="100" />
                      <span className="text-xs font-bold text-gray-500">% Отстъпка</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Секция 2: Документи */}
          <div className="space-y-4 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-black uppercase text-gray-400 flex items-center gap-2">
              <FileText size={14} /> Данни по Паспорт
            </h3>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Имена на Латиница</p>
                <input type="text" name="latinName" value={formData.latinName} onChange={handleChange} className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm font-medium focus:outline-none focus:border-brand-gold" placeholder="IVAN IVANOV" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">ЕГН / Дата на раждане</p>
                <input type="text" name="egn" value={formData.egn} onChange={handleChange} className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm font-medium focus:outline-none focus:border-brand-gold" placeholder="Въведи ЕГН..." />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Международен Паспорт №</p>
                <input type="text" name="passportNumber" value={formData.passportNumber} onChange={handleChange} className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm font-medium focus:outline-none focus:border-brand-gold" placeholder="№ Паспорт..." />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Валидност до</p>
                <input type="text" name="passportValidity" value={formData.passportValidity} onChange={handleChange} className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm font-medium focus:outline-none focus:border-brand-gold" placeholder="ДД.ММ.ГГГГ" />
              </div>
            </div>
          </div>

          {/* Секция 3: IBAN */}
          <div className="space-y-4 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-black uppercase text-gray-400 flex items-center gap-2">
              <CreditCard size={14} /> Финансова информация
            </h3>
            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
              <p className="text-[10px] text-blue-500 font-bold uppercase mb-1">Банкова сметка (IBAN)</p>
              <input type="text" name="iban" value={formData.iban} onChange={handleChange} className="w-full bg-white border border-blue-200 rounded px-3 py-2 text-sm font-mono tracking-wider focus:outline-none focus:border-blue-400 text-blue-900" placeholder="BGXX XXXX XXXX XXXX XXXX XX" />
            </div>
          </div>

          {/* Секция 4: Бележки */}
          <div className="space-y-4 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-black uppercase text-gray-400">Бележки на агента</h3>
            <textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full h-32 p-4 bg-yellow-50/50 border border-yellow-200/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-700 resize-none" placeholder="Специфични изисквания, диети, предпочитания за стая/място..." />
          </div>
          
          {/* Секция 5: История на пътуванията (С КЛИКЪБЪЛ ЛИНК) */}
          <div className="space-y-4 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-black uppercase text-gray-400 flex items-center gap-2">
              <History size={14} /> История на пътуванията
            </h3>
            
            {(client as any).tripHistory && (client as any).tripHistory.length > 0 ? (
              <div className="space-y-3">
                {(client as any).tripHistory.map((trip: any, index: number) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center hover:bg-gray-100 transition-colors">
                    <div>
                      {/* Ако има tourId го правим на линк, ако не - просто показваме текста */}
                      {/* Вече не е <a> линк към сайта, а бутон, който отваря вътрешен картон */}
                      {trip.tourId ? (
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            if(onOpenGroup) onOpenGroup(trip.tourId);
                          }} 
                          className="font-bold text-gray-800 text-sm hover:text-brand-gold transition-colors flex items-center gap-1 group text-left cursor-pointer"
                        >
                          {trip.tourTitle} <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ) : (
                        <p className="font-bold text-gray-800 text-sm">{trip.tourTitle}</p>
                      )}
                      
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Calendar size={12} className="text-brand-gold" /> {trip.date}
                      </p>
                      {trip.paidPrice > 0 && (
                        <p className="text-[11px] text-green-600 font-bold mt-1">
                          Платено: {trip.paidPrice} €. 
                          {trip.promoName && <span className="text-gray-400 font-medium ml-1">({trip.promoName})</span>}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase px-2 py-1 bg-white border border-gray-200 text-gray-500 rounded-lg shadow-sm">
                        {trip.tourOperator || 'Неизвестен'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                <p className="text-sm text-gray-500 italic py-2">Няма записани пътувания за този клиент до момента.</p>
              </div>
            )}
          </div>

          {/* Секция 6: НОВО - Ревюта на клиента */}
          <div className="space-y-4 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-black uppercase text-gray-400 flex items-center gap-2">
              <MessageSquare size={14} /> Ревюта от този клиент
            </h3>
            
            {isLoadingReviews ? (
              <p className="text-sm text-gray-500 italic">Търсене на ревюта...</p>
            ) : reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((review) => {
                  const isHidden = review.status === 'hidden' || review.status === 'rejected'; // Зависи как го записваш в базата
                  
                  return (
                    <div key={review.id} className={`p-4 rounded-2xl border ${isHidden ? 'bg-gray-100 border-gray-200 opacity-75' : 'bg-green-50/50 border-green-100'}`}>
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <div>
                          <p className="font-bold text-sm text-gray-800">{review.tourTitle || 'Към екскурзия'}</p>
                          <div className="flex text-brand-gold mt-1">
                            {Array.from({ length: review.rating || 5 }).map((_, i) => (
                              <Star key={i} size={12} fill="currentColor" />
                            ))}
                          </div>
                        </div>
                        
                        {/* Бутон за Скриване/Показване */}
                        <button 
                          onClick={() => toggleReviewStatus(review.id, review.status || 'approved')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                            isHidden 
                              ? 'bg-white text-gray-500 hover:bg-gray-200 border border-gray-300' 
                              : 'bg-white text-red-500 hover:bg-red-50 border border-red-100'
                          }`}
                        >
                          {isHidden ? <><Eye size={14} /> Покажи в сайта</> : <><EyeOff size={14} /> Скрий от сайта</>}
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 italic">"{review.comment || review.text}"</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                <p className="text-sm text-gray-500 italic py-2">Този клиент все още не е оставил ревюта.</p>
              </div>
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4 shrink-0">
          <button onClick={handleSave} disabled={isSaving} className="flex-1 bg-brand-dark text-white py-3.5 rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg shadow-brand-dark/20 disabled:opacity-50 flex items-center justify-center gap-2">
            {isSaving ? 'Запазване...' : <><Save size={18} /> Запази промените</>}
          </button>
        </div>
      </div>
    </div>
  );
}