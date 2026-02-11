"use client";

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 
import emailjs from '@emailjs/browser';
import { Globe, Send, CheckCircle2, AlertCircle, X } from 'lucide-react';

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "";
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "";
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "";

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tourId: string;
  tourTitle: string;
  tourPrice: string;
}

export default function InquiryModal({ isOpen, onClose, tourId, tourTitle, tourPrice }: InquiryModalProps) {
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    user_name: '', user_email: '', user_phone: '', user_message: ''
  });
  const [errors, setErrors] = useState<any>({});

  if (!isOpen) return null;

  const validate = () => {
    let newErrors: any = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/; 
    if (!formData.user_name) newErrors.name = "Моля, въведете име";
    if (!emailRegex.test(formData.user_email)) newErrors.email = "Невалиден имейл";
    if (!phoneRegex.test(formData.user_phone)) newErrors.phone = "10 цифри";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitStatus('sending');
    try {
        // 1. Firebase
        await addDoc(collection(db, "inquiries"), {
            tourId,
            tourTitle,
            clientName: formData.user_name,
            clientEmail: formData.user_email,
            clientPhone: formData.user_phone,
            message: formData.user_message,
            status: 'new',
            createdAt: serverTimestamp(),
            isRead: false
        });

        // 2. EmailJS
        const templateParams = {
            name: "Beliva VIP Admin",
            time: new Date().toLocaleString('bg-BG'),
            tour_title: tourTitle,
            tour_price: tourPrice,
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
        console.error("Грешка:", error);
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
                <p className="text-gray-500">Вашето запитване е прието успешно.</p>
            </div>
            ) : submitStatus === 'error' ? (
                <div className="text-center py-12">
                <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6"><AlertCircle size={48} /></div>
                <h2 className="text-3xl font-serif italic mb-2 text-brand-dark">Грешка</h2>
                <p className="text-gray-500 mb-6">Не успяхме да изпратим формата.</p>
                <button onClick={() => setSubmitStatus('idle')} className="text-brand-dark font-bold underline">Опитайте пак</button>
                </div>
            ) : (
            <>
                <h2 className="text-3xl font-serif italic mb-2 text-brand-dark">Направете запитване</h2>
                <div className="h-1 w-20 bg-brand-gold mb-6 rounded-full"></div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-8 flex items-center gap-2"><Globe size={12}/> {tourTitle}</p>
                <form onSubmit={handleSendEmail} className="space-y-4">
                <div>
                    <input placeholder="Вашето Име" className={`inquiry-input ${errors.name ? 'border-red-500 bg-red-50' : ''}`} onChange={e => setFormData({...formData, user_name: e.target.value})} />
                    {errors.name && <p className="text-[10px] text-red-500 mt-1 font-bold uppercase ml-2">{errors.name}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                    <input placeholder="Имейл" className={`inquiry-input ${errors.email ? 'border-red-500 bg-red-50' : ''}`} onChange={e => setFormData({...formData, user_email: e.target.value})} />
                    {errors.email && <p className="text-[10px] text-red-500 mt-1 font-bold uppercase ml-2">{errors.email}</p>}
                    </div>
                    <div>
                    <input placeholder="Телефон" className={`inquiry-input ${errors.phone ? 'border-red-500 bg-red-50' : ''}`} maxLength={10} onChange={e => setFormData({...formData, user_phone: e.target.value})} />
                    {errors.phone && <p className="text-[10px] text-red-500 mt-1 font-bold uppercase ml-2">{errors.phone}</p>}
                    </div>
                </div>
                <textarea placeholder="Вашите въпроси или предпочитания..." className="inquiry-input h-32 resize-none" onChange={e => setFormData({...formData, user_message: e.target.value})}></textarea>
                <button type="submit" disabled={submitStatus === 'sending'} className="w-full bg-brand-dark text-white py-4 rounded-xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-brand-gold hover:text-brand-dark transition-all shadow-xl disabled:opacity-50">
                    {submitStatus === 'sending' ? 'ИЗПРАЩАНЕ...' : <><Send size={16}/> ИЗПРАТИ СЕГА</>}
                </button>
                </form>
            </>
            )}
        </div>
    </div>
  );
}