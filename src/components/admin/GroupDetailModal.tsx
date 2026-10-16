"use client";

import React, { useState } from 'react';
import { X, Plane, UserCheck, Users, Calendar, ExternalLink, Star, Send, MessageSquareQuote, Building2 } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getGroupReturnDate, getTourDurationDays, reviewAvailableFrom, formatDateBg, sendReviewRequest } from '@/lib/reviewRequests';

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '';
const CLIENT_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_CLIENT_TEMPLATE_ID || '';
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '';

const REVIEW_SOURCES: Record<string, string> = { phone: 'По телефона', email: 'По имейл', form: 'От формата за отзив' };

// Текстът на клиентите отива в HTML имейл — екранираме го, за да не се тълкува като HTML.
const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface GroupDetailModalProps {
  group: any;
  tour?: any; // за продължителността (дата на връщане) и туроператора
  onClose: () => void;
  onOpenClient?: (id: string, fallbackName?: string) => void;
}

export default function GroupDetailModal({ group, tour, onClose, onOpenClient }: GroupDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'logistics' | 'tourists'>('logistics');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    guideName: group.guideName || '',
    guidePhone: group.guidePhone || '',
    outboundFlight: group.outboundFlight || '',
    inboundFlight: group.inboundFlight || '',
    flightDetails: group.flightDetails || '', // Свободен текст за часове и летища
    returnDate: group.returnDate || '',       // По избор — иначе се изчислява от заминаването + продължителността
  });

  // Локално копие на туристите — за отметките „дал отзив“ и мненията. Пазим кои редове са пипнати, за да
  // не презапишем отзив, който междувременно е дошъл от формата (виж persistTourists).
  const [tourists, setTourists] = useState<any[]>(Array.isArray(group.tourists) ? group.tourists : []);
  const [editedIdx, setEditedIdx] = useState<Set<number>>(new Set());
  const [sendingIdx, setSendingIdx] = useState<number | null>(null);
  const [operatorModal, setOperatorModal] = useState<{ email: string; name: string; subject: string; body: string } | null>(null);
  const [isSendingOperator, setIsSendingOperator] = useState(false);
  const [reviewsSentAt, setReviewsSentAt] = useState<string>(group.reviewsSentToOperatorAt || '');

  const returnDate = getGroupReturnDate({ ...group, returnDate: formData.returnDate }, tour);
  const availableFrom = returnDate ? reviewAvailableFrom(returnDate) : null;
  const canRequestReviews = !!availableFrom && new Date() >= availableFrom;
  const operatorName = group.tourOperator || tour?.operator || '';
  const reviewsWithText = tourists.filter(t => t?.reviewReceived && (t.reviewText || '').trim());

  const updateTourist = (idx: number, patch: any) => {
    setTourists(prev => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
    setEditedIdx(prev => new Set(prev).add(idx));
  };

  // Записва промените по отзивите върху СВЕЖО прочетените туристи — само пипнатите редове, и само ако на
  // този индекс е същият клиент. Така не губим нито нов турист, нито отзив, дошъл междувременно от формата.
  const persistTourists = async () => {
    const snap = await getDoc(doc(db, 'groups', group.id));
    const fresh: any[] = snap.exists() && Array.isArray(snap.data().tourists) ? [...snap.data().tourists] : [];
    const merged = fresh.map((t, i) => {
      const local = tourists[i];
      if (!editedIdx.has(i) || !local || local.customerId !== t.customerId) return t;
      return { ...t, reviewReceived: !!local.reviewReceived, reviewSource: local.reviewSource || '', reviewText: local.reviewText || '' };
    });
    return merged;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const merged = await persistTourists();
      await updateDoc(doc(db, "groups", group.id), { ...formData, tourists: merged });
      setTourists(merged);
      setEditedIdx(new Set());
      alert("Информацията е обновена!");
    } catch (e) {
      console.error(e);
      alert("Грешка при запис.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestReview = async (idx: number) => {
    setSendingIdx(idx);
    try {
      const { email, requestedAt, token } = await sendReviewRequest(group.id, idx);
      setTourists(prev => prev.map((t, i) => (i === idx ? { ...t, reviewRequestedAt: requestedAt, reviewToken: token } : t)));
      alert(`Запитването за отзив е изпратено на ${email}.`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Грешка при изпращане.');
    } finally {
      setSendingIdx(null);
    }
  };

  // Подготвя имейл с всички мнения към туроператора — админът го преглежда и редактира преди изпращане.
  const openOperatorSend = async () => {
    if (reviewsWithText.length === 0) return;
    let email = '';
    try {
      const snap = await getDoc(doc(db, 'settings', 'operators'));
      const list: any[] = snap.exists() && Array.isArray(snap.data().list) ? snap.data().list : [];
      const op = list.map(o => (typeof o === 'string' ? { name: o, email: '' } : o)).find(o => o.name === operatorName);
      email = op?.email || '';
    } catch (e) {
      console.error(e);
    }
    if (!email) {
      alert(`Оператор „${operatorName || 'Неизвестен'}“ няма зададен имейл в Настройки → Турооператори.`);
      return;
    }
    const lines = reviewsWithText.map((t, i) => {
      const rating = t.reviewRating ? ` — ${t.reviewRating}/5` : '';
      return `${i + 1}. ${t.name || 'Клиент'}${rating}\n„${(t.reviewText || '').trim()}“`;
    });
    setOperatorModal({
      email,
      name: operatorName,
      subject: `Отзиви от клиенти — ${group.tourTitle} (${group.startDate})`,
      body: `Здравейте,\n\nИзпращаме Ви отзивите на нашите клиенти от групата „${group.tourTitle}“ със заминаване ${group.startDate}:\n\n${lines.join('\n\n')}\n\nПоздрави,\nЕкипът на Beliva VIP Tour`,
    });
  };

  const handleSendToOperator = async () => {
    if (!operatorModal) return;
    setIsSendingOperator(true);
    try {
      // Първо записваме незапазените мнения, за да е едно и също в базата и в имейла.
      const merged = await persistTourists();
      await emailjs.send(SERVICE_ID, CLIENT_TEMPLATE_ID, {
        to_email: operatorModal.email,
        subject: operatorModal.subject,
        preheader: `Отзиви от клиенти — ${group.tourTitle}`,
        message: escapeHtml(operatorModal.body).replace(/\n/g, '<br>'),
      }, PUBLIC_KEY);
      const sentAt = new Date().toISOString();
      await updateDoc(doc(db, 'groups', group.id), { tourists: merged, reviewsSentToOperatorAt: sentAt });
      setTourists(merged);
      setEditedIdx(new Set());
      setReviewsSentAt(sentAt);
      setOperatorModal(null);
      alert(`Отзивите са изпратени на ${operatorModal.email}.`);
    } catch (e) {
      console.error(e);
      alert('Грешка при изпращането (провери EmailJS настройките).');
    } finally {
      setIsSendingOperator(false);
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

                    {/* ДАТА НА ВРЪЩАНЕ — от нея зависи кога може да се поиска отзив */}
                    <section className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                            <Calendar size={14} className="text-brand-gold" /> Дата на връщане
                        </h3>
                        <input
                            type="date"
                            value={formData.returnDate}
                            onChange={e => setFormData({...formData, returnDate: e.target.value})}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:border-brand-gold"
                        />
                        <p className="text-[11px] text-gray-400 ml-1">
                            {formData.returnDate
                                ? 'Зададена ръчно.'
                                : returnDate
                                    ? `Изчислена: ${formatDateBg(returnDate)} (заминаване + ${getTourDurationDays(tour) ?? '?'} дни). Задай я ръчно, ако е различна.`
                                    : 'Не може да се изчисли — задай я ръчно, за да може да се искат отзиви.'}
                        </p>
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
                    {/* Кога може да се иска отзив */}
                    <div className={`text-xs rounded-2xl p-4 border ${canRequestReviews ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                        {returnDate
                            ? canRequestReviews
                                ? `Групата се върна на ${formatDateBg(returnDate)} — може да се искат отзиви.`
                                : `Връщане: ${formatDateBg(returnDate)}. Запитванията за отзив стават активни от ${formatDateBg(availableFrom!)}.`
                            : 'Датата на връщане не е известна — задай я в „Логистика & Полети“.'}
                    </div>

                    {tourists.map((tourist: any, idx: number) => {
                        const requestedOn = tourist.reviewRequestedAt ? formatDateBg(new Date(tourist.reviewRequestedAt)) : '';
                        return (
                        <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <button
                                        onClick={() => onOpenClient?.(tourist.customerId, tourist.name)}
                                        className="text-sm font-bold text-brand-dark hover:text-brand-gold transition-colors text-left"
                                    >
                                        {tourist.name}
                                    </button>
                                    <p className="text-[10px] text-gray-400">
                                        Записан на: {new Date(tourist.addedAt).toLocaleDateString('bg-BG')} · <span className="font-black text-emerald-600">{tourist.paidPrice} €</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => onOpenClient?.(tourist.customerId, tourist.name)}
                                        className="p-2 text-gray-300 hover:text-brand-gold transition-colors"
                                        title="Отвори картона на клиента"
                                    >
                                        <ExternalLink size={18} />
                                    </button>
                                    {!tourist.reviewReceived && (
                                        <button
                                            onClick={() => handleRequestReview(idx)}
                                            disabled={!canRequestReviews || sendingIdx !== null}
                                            title={canRequestReviews
                                                ? (requestedOn ? `Поискан на ${requestedOn} — изпрати пак` : 'Изпраща имейл с линк за отзив')
                                                : availableFrom ? `Активно от ${formatDateBg(availableFrom)}` : 'Няма дата на връщане'}
                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed ${requestedOn ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-brand-gold/15 text-brand-dark hover:bg-brand-gold'}`}
                                        >
                                            <Send size={12} />
                                            {sendingIdx === idx ? 'Изпращане...' : requestedOn ? `Поискан ${requestedOn}` : 'Изпрати запитване за отзив'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Отзив — отметка (по телефон/имейл) и мнение, което после отива към туроператора */}
                            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={!!tourist.reviewReceived}
                                            onChange={e => updateTourist(idx, { reviewReceived: e.target.checked, reviewSource: e.target.checked ? (tourist.reviewSource || 'phone') : tourist.reviewSource })}
                                            className="rounded text-brand-gold focus:ring-brand-gold"
                                        />
                                        Даде отзив
                                    </label>
                                    {tourist.reviewReceived && (
                                        <select
                                            value={tourist.reviewSource || 'phone'}
                                            onChange={e => updateTourist(idx, { reviewSource: e.target.value })}
                                            className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-brand-gold"
                                        >
                                            {Object.entries(REVIEW_SOURCES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                        </select>
                                    )}
                                    {tourist.reviewRating > 0 && (
                                        <span className="flex items-center gap-0.5 text-brand-gold" title={`${tourist.reviewRating} от 5`}>
                                            {Array.from({ length: 5 }, (_, i) => <Star key={i} size={12} className={i < tourist.reviewRating ? 'fill-brand-gold' : 'text-gray-300'} />)}
                                        </span>
                                    )}
                                </div>
                                {tourist.reviewReceived && (
                                    <textarea
                                        value={tourist.reviewText || ''}
                                        onChange={e => updateTourist(idx, { reviewText: e.target.value })}
                                        placeholder="Мнението на клиента (ще се изпрати на туроператора)"
                                        className="w-full h-20 p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none resize-none focus:border-brand-gold"
                                    />
                                )}
                            </div>
                        </div>
                        );
                    })}

                    {/* Изпращане на всички мнения към туроператора */}
                    <div className="pt-2">
                        <button
                            onClick={openOperatorSend}
                            disabled={reviewsWithText.length === 0}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-brand-gold/40 text-brand-dark font-black uppercase text-[10px] tracking-widest hover:bg-brand-gold/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Building2 size={16} /> Изпрати мненията на туроператора ({reviewsWithText.length})
                        </button>
                        <p className="text-[11px] text-gray-400 text-center mt-2">
                            {reviewsSentAt ? `Последно изпратени на ${formatDateBg(new Date(reviewsSentAt))}.` : 'Изпращат се само отбелязаните отзиви с текст.'}
                        </p>
                    </div>
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

      {/* ПРЕГЛЕД ПРЕДИ ИЗПРАЩАНЕ НА МНЕНИЯТА КЪМ ТУРООПЕРАТОРА */}
      {operatorModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-brand-dark/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 shrink-0">
              <div>
                <h3 className="font-serif italic text-xl text-brand-dark flex items-center gap-2"><MessageSquareQuote size={20} className="text-brand-gold" /> Мнения към туроператора</h3>
                <p className="text-xs text-gray-400 mt-1">До: {operatorModal.name} ({operatorModal.email})</p>
              </div>
              <button onClick={() => setOperatorModal(null)} className="p-2 text-gray-300 hover:text-red-500"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-4 overflow-y-auto">
              <input
                type="text"
                value={operatorModal.subject}
                onChange={e => setOperatorModal(prev => prev ? { ...prev, subject: e.target.value } : prev)}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-brand-gold"
              />
              <textarea
                value={operatorModal.body}
                onChange={e => setOperatorModal(prev => prev ? { ...prev, body: e.target.value } : prev)}
                className="w-full h-72 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none resize-none focus:bg-white focus:border-brand-gold leading-relaxed"
              />
              <button
                onClick={handleSendToOperator}
                disabled={isSendingOperator}
                className="w-full bg-brand-dark text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSendingOperator ? 'Изпращане...' : <><Send size={16} /> Изпрати на туроператора</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
