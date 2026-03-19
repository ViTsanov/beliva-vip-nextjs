"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, updateDoc, doc, deleteDoc, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { Search, Trash2, Calendar, Phone, Mail, Edit, X, FileText, CheckCircle, AlertTriangle, DollarSign, Tag } from 'lucide-react';

interface ReservationsTabProps {
  allTours: any[];
  allCampaigns: any[]; // Добавяме кампаниите като проп
  onSuccess?: () => void;
}

export default function ReservationsTab({ allTours, allCampaigns , onSuccess}: ReservationsTabProps) {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [filteredInquiries, setFilteredInquiries] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [editingInq, setEditingInq] = useState<any>(null);
  const [editForm, setEditForm] = useState({ tourId: '', tourTitle: '', tourDate: '', notes: '' });
  const [paymentModalData, setPaymentModalData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchInquiries = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "inquiries"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInquiries(data);
      setFilteredInquiries(data);
    } catch (error) {
      console.error("Грешка при извличане на запитвания:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  useEffect(() => {
    const term = searchQuery.toLowerCase();
    const filtered = inquiries.filter(inq => 
      inq.clientName?.toLowerCase().includes(term) ||
      inq.clientEmail?.toLowerCase().includes(term) ||
      inq.clientPhone?.includes(term) ||
      inq.tourTitle?.toLowerCase().includes(term) ||
      inq.notes?.toLowerCase().includes(term) ||
      inq.message?.toLowerCase().includes(term)
    );
    setFilteredInquiries(filtered);
  }, [searchQuery, inquiries]);

  // ПОМОЩНА ФУНКЦИЯ: Превръща текст като "1250 €" в число 1250
  const parsePrice = (priceStr: any) => {
    if (!priceStr) return 0;
    if (typeof priceStr === 'number') return priceStr;
    const cleaned = priceStr.replace(/[^\d.]/g, '');
    return parseFloat(cleaned) || 0;
  };

  const handleStatusChangeClick = async (inq: any, newStatus: string) => {
    if (newStatus === 'paid') {
      try {
        const customersRef = collection(db, "customers");
        let existingCustomer: any = null;
        let existingCustomerId = null;

        if (inq.clientEmail) {
            const qEmail = query(customersRef, where("email", "==", inq.clientEmail));
            const snapEmail = await getDocs(qEmail);
            if (!snapEmail.empty) {
                existingCustomerId = snapEmail.docs[0].id;
                existingCustomer = snapEmail.docs[0].data();
            }
        }
        if (!existingCustomer && inq.clientPhone) {
            const qPhone = query(customersRef, where("phone", "==", inq.clientPhone));
            const snapPhone = await getDocs(qPhone);
            if (!snapPhone.empty) {
                existingCustomerId = snapPhone.docs[0].id;
                existingCustomer = snapPhone.docs[0].data();
            }
        }

        // Взимаме данните за екскурзията
        const tour = allTours.find(t => t.id === inq.tourId);
        
        // Намираме името на кампанията, ако има такава
        let campaignName = "";
        if (tour?.campaignId) {
            const campaign = allCampaigns.find(c => c.id === tour.campaignId);
            campaignName = campaign ? campaign.name : "Промоционална кампания";
        } else if (tour?.promoLabel) {
            campaignName = tour.promoLabel;
        }

        // Вадим цените
        const basePrice = parsePrice(tour?.price);
        const promoPrice = tour?.discountPrice ? parsePrice(tour.discountPrice) : basePrice;

        setPaymentModalData({
          inquiry: inq,
          existingCustomer,
          existingCustomerId,
          tour,
          paidPrice: promoPrice, // Автоматично попълваме промо цената
          basePrice: basePrice,  // Показваме старата цена за сравнение
          promoName: campaignName, // Автоматично изписваме името на кампанията
          notes: inq.notes || ''
        });
      } catch (error) {
        console.error("Грешка:", error);
      }
    } else {
      try {
        await updateDoc(doc(db, "inquiries", inq.id), { status: newStatus });
        setInquiries(prev => prev.map(item => item.id === inq.id ? { ...item, status: newStatus } : item));
      } catch (e) { console.error(e); }
    }
  };

  const handleConfirmPayment = async () => {
    if (!paymentModalData) return;
    setIsSaving(true);
    try {
      const { inquiry, existingCustomer, existingCustomerId, tour, paidPrice, basePrice, promoName, notes } = paymentModalData;
      
      // 1. Обновяваме запитването
      await updateDoc(doc(db, "inquiries", inquiry.id), { status: 'paid' });
      setInquiries(prev => prev.map(item => item.id === inquiry.id ? { ...item, status: 'paid' } : item));

      // 2. Подготвяме обекта за пътуването
      const tripData = {
          tourId: inquiry.tourId || "",
          tourSlug: tour?.slug || inquiry.tourId || "",
          tourTitle: inquiry.tourTitle || "Екскурзия",
          date: inquiry.tourDate || "Не е избрана",
          tourOperator: tour?.operator || "Неизвестен",
          paidPrice: Number(paidPrice),
          basePrice: Number(basePrice),
          promoName: promoName,
          addedAt: new Date().toISOString(),
          feedbackStatus: 'pending'
      };

      // 3. Обновяваме/Създаваме Групата
      const groupsRef = collection(db, "groups");
      const qGroup = query(groupsRef, where("tourId", "==", inquiry.tourId), where("startDate", "==", inquiry.tourDate));
      const groupSnap = await getDocs(qGroup);

      const touristInfo = {
        customerId: existingCustomerId || "new",
        name: inquiry.clientName,
        paidPrice: Number(paidPrice),
        addedAt: new Date().toISOString()
      };

      if (!groupSnap.empty) {
        const groupDoc = groupSnap.docs[0];
        await updateDoc(doc(db, "groups", groupDoc.id), {
          tourists: [...(groupDoc.data().tourists || []), touristInfo]
        });
      } else {
        await addDoc(groupsRef, {
          tourId: inquiry.tourId,
          tourTitle: inquiry.tourTitle,
          startDate: inquiry.tourDate,
          tourists: [touristInfo],
          createdAt: serverTimestamp()
        });
      }

      // 4. ОБНОВЯВАНЕ НА КЛИЕНТА (Фикс на брояча)
      const customersRef = collection(db, "customers");

      if (existingCustomer) {
          // Взимаме текущата история и добавяме новото пътуване
          const updatedHistory = [...(existingCustomer.tripHistory || []), tripData];
          // Броим реално колко пътувания има вече в списъка
          const newCount = updatedHistory.length;

          const updatedNotes = notes 
            ? (existingCustomer.notes ? existingCustomer.notes + '\n---\n' + notes : existingCustomer.notes) 
            : existingCustomer.notes;

          await updateDoc(doc(db, "customers", existingCustomerId as string), {
              tripHistory: updatedHistory,
              totalTrips: newCount, // Старо поле за съвместимост
              tripsCount: newCount, // Ново поле за CRM картона
              notes: updatedNotes,
              updatedAt: serverTimestamp()
          });
      } else {
          // Създаване на нов клиент
          const nameParts = inquiry.clientName ? inquiry.clientName.split(' ') : [];
          await addDoc(customersRef, {
              name: inquiry.clientName || '',
              firstName: nameParts[0] || 'Неизвестно',
              lastName: nameParts.slice(1).join(' ') || '',
              email: inquiry.clientEmail || "",
              phone: inquiry.clientPhone || "",
              totalTrips: 1, 
              tripsCount: 1, 
              tripHistory: [tripData],
              vipDiscount: 0,
              discountFlag: false,
              notes: notes || '',
              createdAt: serverTimestamp()
          });
      }

      setPaymentModalData(null);
      alert("Резервацията е финализирана! Броячът на клиента е обновен.");
    } catch (e) {
      console.error(e);
      alert("Грешка при запис.");
    } finally {
      setIsSaving(false);
    }
  };

  // ... (Останалите функции handleDelete, openEditModal, handleSaveEdit остават същите) ...

  const handleDelete = async (id: string) => {
    if (confirm("Сигурни ли сте, че искате да изтриете това запитване?")) {
      try {
        await deleteDoc(doc(db, "inquiries", id));
        setInquiries(prev => prev.filter(i => i.id !== id));
      } catch (error) { console.error(error); }
    }
  };

  const openEditModal = (inq: any) => {
    setEditingInq(inq);
    setEditForm({
      tourId: inq.tourId || '',
      tourTitle: inq.tourTitle || '',
      tourDate: inq.tourDate || 'Не е потвърдена',
      // Взимаме 'notes' (ако сме го редактирали) или 'message' (оригиналното от клиента)
      notes: inq.notes || inq.message || '' 
    });
  };

  const handleSaveEdit = async () => {
    if (!editingInq) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "inquiries", editingInq.id), editForm);
      setInquiries(prev => prev.map(item => item.id === editingInq.id ? { ...item, ...editForm } : item));
      setEditingInq(null);
    } catch (error) { console.error(error); } finally { setIsSaving(false); }
  };

  const statusColors: any = {
    new: 'bg-blue-100 text-blue-700',
    processing: 'bg-yellow-100 text-yellow-700',
    paid: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700'
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500 font-medium">Зареждане на запитвания...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER: Търсачка */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Търси по име, телефон или бележки..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-gold/20 outline-none font-medium"
          />
        </div>
      </div>

      {/* ТАБЛИЦА */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-widest">Клиент & Контакти</th>
                <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-widest">Запитване</th>
                <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-widest">Бележки</th>
                <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-widest">Статус</th>
                <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-widest text-right">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredInquiries.map(inq => (
                <tr key={inq.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-5">
                    <div className="font-bold text-gray-800">{inq.clientName || 'Непознат'}</div>
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Phone size={12}/> {inq.clientPhone}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1"><Mail size={12}/> {inq.clientEmail}</div>
                  </td>
                  <td className="p-5">
                    <span className="font-bold text-sm text-brand-dark block">{inq.tourTitle || 'Общо запитване'}</span>
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mt-1 mb-2">
                      <Calendar size={14} className="text-brand-gold" />
                      {inq.tourDate || 'Не е уточнена'}
                    </div>
                    {/* НОВО: Изписваме съобщението от клиента под заглавието на екскурзията */}
                    {inq.message && (
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mt-2 max-w-xs">
                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest block mb-1">Съобщение:</span>
                        <p className="text-xs text-gray-600 italic line-clamp-3">{inq.message}</p>
                      </div>
                    )}
                  </td>
                  <td className="p-5">
                    {/* ТУК остават САМО бележките на Администратора */}
                    {inq.notes ? (
                      <p className="text-xs text-gray-500 line-clamp-3 bg-yellow-50/50 p-3 rounded-xl border border-yellow-100 max-w-xs">
                        {inq.notes}
                      </p>
                    ) : (
                      <span className="text-xs text-gray-300 italic">Няма въведени бележки</span>
                    )}
                  </td>
                  <td className="p-5">
                    <select 
                      value={inq.status || 'new'} 
                      onChange={(e) => handleStatusChangeClick(inq, e.target.value)}
                      className={`text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-2.5 border-none outline-none cursor-pointer shadow-sm transition-all ${statusColors[inq.status] || statusColors.new}`}
                    >
                      <option value="new">🆕 Ново</option>
                      <option value="processing">⚙️ В процес</option>
                      <option value="paid">✅ Платено</option>
                      <option value="cancelled">❌ Отказано</option>
                    </select>
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEditModal(inq)} className="p-2.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit size={18} /></button>
                      <button onClick={() => handleDelete(inq.id)} className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* МОДАЛ: РЕДАКЦИЯ НА ЗАПИТВАНЕ */}
      {editingInq && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-dark/90 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
             <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
               <h3 className="font-serif italic text-xl text-brand-dark">Редактиране на запитване</h3>
               <button onClick={() => setEditingInq(null)} className="p-2 text-gray-300 hover:text-red-500"><X size={24} /></button>
             </div>
             <div className="p-8 space-y-6">
                {/* НОВО: Показваме оригиналното съобщение на клиента само за четене */}
                {editingInq?.message && (
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">Съобщение от клиента</label>
                    <p className="text-sm text-gray-700 italic">{editingInq.message}</p>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2 mb-2 block">Екскурзия</label>
                  <select 
                    value={editForm.tourId} 
                    onChange={e => {
                        const t = allTours.find(x => x.id === e.target.value);
                        setEditForm({...editForm, tourId: e.target.value, tourTitle: t?.title || 'Общо запитване', tourDate: 'Не е потвърдена'});
                    }}
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium outline-none focus:bg-white focus:border-brand-gold"
                  >
                    <option value="">-- Общо запитване --</option>
                    {allTours.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2 mb-2 block">Дата на пътуване</label>
                  {editForm.tourId ? (
                    <select value={editForm.tourDate} onChange={e => setEditForm({...editForm, tourDate: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium outline-none focus:bg-white focus:border-brand-gold">
                      <option value="Не е потвърдена">Не е потвърдена</option>
                      {allTours.find(t => t.id === editForm.tourId)?.dates?.map((d: any) => {
                          const dateStr = typeof d === 'string' ? d : `${d.startDate} - ${d.endDate}`;
                          return <option key={dateStr} value={dateStr}>{dateStr}</option>;
                      })}
                    </select>
                  ) : (
                    <input type="text" value={editForm.tourDate} onChange={e => setEditForm({...editForm, tourDate: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium outline-none" placeholder="напр. Май 2026" />
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2 mb-2 block">Бележки</label>
                  <textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} className="w-full h-32 p-4 bg-yellow-50/50 border border-yellow-100 rounded-2xl text-sm outline-none resize-none" placeholder="Интересува се от..." />
                </div>
                <button onClick={handleSaveEdit} disabled={isSaving} className="w-full bg-brand-dark text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-all shadow-xl">{isSaving ? 'Запазване...' : 'Запази промените'}</button>
             </div>
          </div>
        </div>
      )}

      {/* МОДАЛ: ПОТВЪРЖДЕНИЕ НА ПЛАЩАНЕ (ФИНАНСОВ БЛОК) */}
      {paymentModalData && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-brand-dark/95 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-[3.5rem] w-full max-w-lg shadow-[0_30px_80px_rgba(0,0,0,0.4)] overflow-hidden animate-in zoom-in-95">
            <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-emerald-500 text-white">
              <h3 className="font-serif italic text-2xl flex items-center gap-3"><CheckCircle size={28} /> Финализиране</h3>
              <button onClick={() => setPaymentModalData(null)} className="p-2 hover:bg-white/20 rounded-full transition-all"><X size={24} /></button>
            </div>
            
            <div className="p-10 space-y-8">
              {/* Проверка на клиента */}
              {paymentModalData.existingCustomer ? (
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2rem]">
                  <h4 className="flex items-center gap-2 font-black text-blue-900 text-[10px] uppercase tracking-widest mb-3">
                    <AlertTriangle size={16} className="text-blue-500" /> Открит съществуващ клиент!
                  </h4>
                  <p className="text-sm font-bold text-blue-900">{paymentModalData.existingCustomer.name || paymentModalData.existingCustomer.firstName + ' ' + paymentModalData.existingCustomer.lastName}</p>
                  <p className="text-xs text-blue-600 mt-1">{paymentModalData.existingCustomer.phone} • {paymentModalData.existingCustomer.email}</p>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] flex items-center gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-500"><CheckCircle size={24} /></div>
                  <div>
                    <h4 className="font-black text-emerald-900 text-[10px] uppercase tracking-widest">Нов клиент</h4>
                    <p className="text-sm font-bold text-emerald-800">{paymentModalData.inquiry.clientName}</p>
                  </div>
                </div>
              )}

              {/* Финансов блок */}
              <div className="space-y-6 pt-2 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Цена по каталог</label>
                    <div className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-400 italic">
                      {paymentModalData.basePrice > 0 ? `${paymentModalData.basePrice} €` : 'Не е зададена'}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-2 mb-2 block">Платена сума *</label>
                    <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                        <input 
                            type="number" 
                            value={paymentModalData.paidPrice}
                            onChange={(e) => setPaymentModalData((prev: any) => ({...prev, paidPrice: e.target.value}))}
                            className="w-full pl-12 pr-4 py-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-lg font-black text-emerald-900 focus:ring-4 focus:ring-emerald-500/10 outline-none"
                        />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block items-center gap-1">
                    <Tag size={12} /> Кампания / Промоция
                  </label>
                  <input 
                    type="text" 
                    value={paymentModalData.promoName}
                    onChange={(e) => setPaymentModalData((prev: any) => ({...prev, promoName: e.target.value}))}
                    placeholder="напр. Black Friday или Ранно записване"
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-brand-dark outline-none focus:bg-white focus:border-brand-gold"
                  />
                </div>
              </div>

              <button 
                onClick={handleConfirmPayment} 
                disabled={isSaving} 
                className="w-full bg-emerald-500 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-2xl shadow-emerald-500/20 disabled:opacity-50"
              >
                {isSaving ? 'Записване...' : 'Потвърди и създай резервация'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}