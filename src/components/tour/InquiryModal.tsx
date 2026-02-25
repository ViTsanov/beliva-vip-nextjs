"use client";

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 
import emailjs from '@emailjs/browser';
import { Globe, Send, CheckCircle2, AlertCircle, X, CalendarDays } from 'lucide-react';

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "";
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "";
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "";

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tourId: string;
  tourTitle: string;
  tourPrice?: string;
  tourDates?: string[]; 
}

export default function InquiryModal({ isOpen, onClose, tourId, tourTitle, tourPrice, tourDates }: InquiryModalProps) {
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [selectedDate, setSelectedDate] = useState(''); 
  const [formData, setFormData] = useState({
    user_name: '', user_email: '', user_phone: '', user_message: ''
  });
  const [errors, setErrors] = useState<any>({});

  if (!isOpen) return null;

  const validate = () => {
    let newErrors: any = {};
    if (!formData.user_name.trim()) newErrors.name = "Моля, въведете име";
    if (!formData.user_phone.trim()) newErrors.phone = "Моля, въведете телефон";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitStatus('sending');
    
    try {
        // 1. Запис на запитването (БЕЗ да пипаме колекция customers)
        await addDoc(collection(db, "inquiries"), {
            tourId: tourId || "unknown",
            tourTitle: tourTitle || "Няма заглавие",
            tourDate: selectedDate || "Не е избрана", 
            basePrice: tourPrice || "По запитване",
            clientName: formData.user_name.trim(),
            clientEmail: formData.user_email.toLowerCase().trim() || "няма имейл",
            clientPhone: formData.user_phone.trim(),
            message: formData.user_message.trim() || "",
            status: 'new',
            createdAt: serverTimestamp(),
            isRead: false
        });

        // 2. Изпращане на имейл известие
        const templateParams = {
            tour_title: tourTitle,
            tour_price: tourPrice || "По запитване",
            selected_date: selectedDate || "Не е посочена", 
            user_name: formData.user_name,
            user_phone: formData.user_phone,
            user_email: formData.user_email,
            user_message: formData.user_message
        };
        await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
        
        setSubmitStatus('success');
        setTimeout(() => {
            onClose();
            setSubmitStatus('idle');
            setFormData({ user_name: '', user_email: '', user_phone: '', user_message: '' });
        }, 3000);

    } catch (error) {
        console.error("Firebase/Email Error:", error);
        setSubmitStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 !z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-8 md:p-12 relative shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-brand-dark hover:text-white transition-colors"><X size={20}/></button>
            
            {submitStatus === 'success' ? (
                <div className="text-center py-12">
                    <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-6"><CheckCircle2 size={48} /></div>
                    <h2 className="text-3xl font-serif italic mb-2 text-brand-dark">Благодарим ви!</h2>
                    <p className="text-gray-500 text-sm">Запитването ви е изпратено успешно.</p>
                </div>
            ) : submitStatus === 'error' ? (
                <div className="text-center py-12">
                    <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6"><AlertCircle size={48} /></div>
                    <h2 className="text-3xl font-serif italic mb-2 text-brand-dark">Грешка</h2>
                    <p className="text-gray-500 text-sm mb-6">Не успяхме да изпратим данните. Моля, опитайте отново.</p>
                    <button onClick={() => setSubmitStatus('idle')} className="text-brand-dark font-bold underline">Опитай пак</button>
                </div>
            ) : (
                <>
                    <h2 className="text-3xl font-serif italic mb-2 text-brand-dark leading-none">Запитване</h2>
                    <div className="h-1 w-16 bg-brand-gold mt-4 mb-8 rounded-full"></div>
                    
                    <form onSubmit={handleSendEmail} className="space-y-4">
                        {tourDates && tourDates.length > 0 && (
                            <div className="relative">
                                <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <select className="w-full p-4 pl-12 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-gold appearance-none cursor-pointer text-sm font-bold" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}>
                                    <option value="">-- Изберете желана дата --</option>
                                    {tourDates.slice().sort().map((d, i) => <option key={i} value={d}>{d.split('-').reverse().join('.')}</option>)}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input placeholder="Име *" className={`w-full p-4 bg-gray-50 border rounded-xl outline-none focus:border-brand-gold ${errors.name ? 'border-red-500' : 'border-gray-100'}`} value={formData.user_name} onChange={e => setFormData({...formData, user_name: e.target.value})} />
                            <input placeholder="Телефон *" className={`w-full p-4 bg-gray-50 border rounded-xl outline-none focus:border-brand-gold ${errors.phone ? 'border-red-500' : 'border-gray-100'}`} value={formData.user_phone} onChange={e => setFormData({...formData, user_phone: e.target.value})} />
                        </div>
                        <input placeholder="Имейл" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-gold" value={formData.user_email} onChange={e => setFormData({...formData, user_email: e.target.value})} />
                        <textarea placeholder="Вашето съобщение..." className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-gold h-32 resize-none" value={formData.user_message} onChange={e => setFormData({...formData, user_message: e.target.value})} />

                        <button type="submit" disabled={submitStatus === 'sending'} className="w-full bg-brand-dark text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-all shadow-xl disabled:opacity-50">
                            {submitStatus === 'sending' ? 'ИЗПРАЩАНЕ...' : 'ИЗПРАТИ СЕГА'}
                        </button>
                    </form>
                </>
            )}
        </div>
    </div>
  );
}