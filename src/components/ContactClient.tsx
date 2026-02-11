"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import { motion } from 'framer-motion';
import { Phone, Mail, Clock, Send, ChevronDown, X, CheckCircle2, AlertCircle, Facebook, Instagram } from 'lucide-react';
import { COMPANY_INFO } from '@/lib/companyInfo';

// Взимаме ключовете от Next.js
const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "";
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "";
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "";

export default function ContactClient() {
  const [isHeroLoaded, setIsHeroLoaded] = useState(false);
  const [tours, setTours] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [formData, setFormData] = useState({
    user_name: '', user_email: '', user_phone: '',
    user_message: '', tour_title: 'Общо запитване', tour_price: 'N/A'
  });

  // Schema.org данни за Туристическа агенция (без физически адрес)
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "name": "Beliva VIP Tour",
    "url": "https://belivavip.bg",
    "logo": "https://belivavip.bg/beliva_logo.png",
    "description": "Луксозни екскурзии и почивки. Индивидуален подход и VIP обслужване.",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": COMPANY_INFO.phone,
      "contactType": "customer service",
      "email": COMPANY_INFO.email,
      "areaServed": "BG",
      "availableLanguage": "Bulgarian"
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"
      ],
      "opens": "09:00",
      "closes": "18:00"
    }
  };

  useEffect(() => {
    const fetchTours = async () => {
      try {
        const q = query(collection(db, "tours"), where("status", "==", "public"));
        const snap = await getDocs(q);
        setTours(snap.docs.map(d => ({ title: d.data().title, price: d.data().price })));
      } catch (err) {
        console.error("Error fetching tours:", err);
      }
    };
    fetchTours();
  }, []);

  const validate = () => {
    let newErrors: any = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;

    if (!formData.user_name) newErrors.name = "Моля, въведете име";
    if (!emailRegex.test(formData.user_email)) newErrors.email = "Невалиден имейл";
    if (!phoneRegex.test(formData.user_phone)) newErrors.phone = "Въведете точно 10 цифри";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSending(true);

    try {
        // 1. Запис в Firebase
        await addDoc(collection(db, "inquiries"), {
            tourId: 'general-contact',
            tourTitle: formData.tour_title,
            clientName: formData.user_name,
            clientEmail: formData.user_email,
            clientPhone: formData.user_phone,
            message: formData.user_message,
            status: 'new',
            createdAt: serverTimestamp(),
            isRead: false,
            source: 'contact_page'
        });

        // 2. Изпращане на имейл
        const templateParams = {
            name: "Beliva VIP Admin",
            time: new Date().toLocaleString('bg-BG'),
            tour_title: formData.tour_title,
            tour_price: formData.tour_price,
            user_name: formData.user_name,
            user_phone: formData.user_phone,
            user_email: formData.user_email,
            user_message: formData.user_message
        };

        await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);

        setStatus('success');
        setErrors({});
        setFormData({
            user_name: '', user_email: '', user_phone: '',
            user_message: '', tour_title: 'Общо запитване', tour_price: 'N/A'
        });

        setTimeout(() => setStatus('idle'), 5000);

    } catch (error) {
        console.error("Грешка:", error);
        setStatus('error');
    } finally {
        setSending(false);
    }
  };

  return (
    <main className="bg-white min-h-screen">
      
      {/* Schema JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      
      {/* HERO SECTION */}
      <section className="relative h-[60vh] flex items-center justify-center bg-brand-dark overflow-hidden">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <img 
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80" 
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${
            isHeroLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
          }`} 
          onLoad={() => setIsHeroLoaded(true)}
          alt="Contact Background" 
        />
        <div className="relative z-20 text-center text-white px-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="text-5xl md:text-6xl lg:text-8xl font-bold mb-4 font-serif"
          >
            Свържете се <span className="text-brand-gold italic">с Нас</span>
          </motion.h1>
          <p className="text-sm md:text-xl text-brand-gold uppercase tracking-[0.4em] font-light">Beliva VIP Tour</p>
        </div>
      </section>

      {/* CONTENT SECTION */}
      <section className="py-24 container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          
          {/* ЛЯВА КОЛОНА: ИНФОРМАЦИЯ (БЕЗ АДРЕС) */}
          <div className="space-y-12">
            <div>
              <h2 className="text-4xl font-serif text-brand-dark mb-6 italic">Контакти</h2>
              <p className="text-gray-500 font-light text-lg max-w-md">
                Ние работим изцяло онлайн за ваше удобство. На разположение сме за всякакви въпроси по телефон, имейл или социалните мрежи.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8">
              
              {/* ТЕЛЕФОН */}
              <div className="flex gap-4 group">
                <div className="w-14 h-14 bg-brand-gold/10 rounded-2xl flex items-center justify-center text-brand-gold shrink-0 group-hover:bg-brand-gold group-hover:text-white transition-colors"><Phone size={24}/></div>
                <div>
                  <p className="text-[10px] uppercase font-black text-gray-400 mb-1 tracking-widest">Телефон & WhatsApp</p>
                  <p className="font-bold text-brand-dark text-lg">
                    <a href={`tel:${COMPANY_INFO.phone}`} className="hover:text-brand-gold transition-colors">{COMPANY_INFO.phone}</a>
                  </p>
                </div>
              </div>

              {/* ИМЕЙЛ */}
              <div className="flex gap-4 group">
                <div className="w-14 h-14 bg-brand-gold/10 rounded-2xl flex items-center justify-center text-brand-gold shrink-0 group-hover:bg-brand-gold group-hover:text-white transition-colors"><Mail size={24}/></div>
                <div>
                  <p className="text-[10px] uppercase font-black text-gray-400 mb-1 tracking-widest">Имейл</p>
                  <p className="font-bold text-brand-dark text-lg">
                    <a href={`mailto:${COMPANY_INFO.email}`} className="hover:text-brand-gold transition-colors">{COMPANY_INFO.email}</a>
                  </p>
                </div>
              </div>

              {/* РАБОТНО ВРЕМЕ */}
              <div className="flex gap-4 group">
                <div className="w-14 h-14 bg-brand-gold/10 rounded-2xl flex items-center justify-center text-brand-gold shrink-0 group-hover:bg-brand-gold group-hover:text-white transition-colors"><Clock size={24}/></div>
                <div>
                  <p className="text-[10px] uppercase font-black text-gray-400 mb-1 tracking-widest">Работно Време</p>
                  <p className="font-bold text-brand-dark text-lg">{COMPANY_INFO.workHours}</p>
                </div>
              </div>
            </div>

            {/* SOCIALS */}
            <div className="pt-8 border-t border-gray-100">
                <p className="text-xs font-bold uppercase text-gray-400 mb-4 tracking-widest">Последвайте ни</p>
                <div className="flex gap-4">
                    <a href={COMPANY_INFO.socials.facebook} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-[#1877F2] hover:border-[#1877F2] hover:text-white transition-all shadow-sm">
                        <Facebook size={20}/>
                    </a>
                    <a href={COMPANY_INFO.socials.instagram} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-[#E4405F] hover:border-[#E4405F] hover:text-white transition-all shadow-sm">
                        <Instagram size={20}/>
                    </a>
                </div>
            </div>
          </div>

          {/* ДЯСНА КОЛОНА: ФОРМА */}
          <div className="relative">
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-brand-gold/5 rounded-full -z-10 animate-pulse" />
            <div className="bg-white p-8 md:p-12 rounded-[4rem] shadow-2xl border border-gray-50">
              <h3 className="text-3xl font-serif italic mb-8 text-brand-dark text-center lg:text-left">Изпратете ни Запитване</h3>
              
              {status === 'success' ? (
                 <div className="text-center py-20 animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-6">
                        <CheckCircle2 size={40} />
                    </div>
                    <h4 className="text-2xl font-bold text-brand-dark mb-2">Съобщението е изпратено!</h4>
                    <p className="text-gray-500 mb-6">Ще се свържем с вас възможно най-скоро.</p>
                    <button onClick={() => setStatus('idle')} className="text-brand-gold font-bold underline text-xs uppercase tracking-widest">Изпрати ново</button>
                 </div>
              ) : status === 'error' ? (
                 <div className="text-center py-20 animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto mb-6">
                        <AlertCircle size={40} />
                    </div>
                    <h4 className="text-2xl font-bold text-brand-dark mb-2">Възникна грешка!</h4>
                    <p className="text-gray-500 mb-6">Моля опитайте отново или се свържете с нас по телефона.</p>
                    <button onClick={() => setStatus('idle')} className="text-brand-dark font-bold underline">Опитай пак</button>
                 </div>
              ) : (
                <form onSubmit={handleSendEmail} className="space-y-6">
                  <div>
                    <input 
                      placeholder="Вашето Име" 
                      value={formData.user_name}
                      className={`modern-input ${errors.name ? 'border-red-500 bg-red-50' : 'border-gray-100'}`} 
                      onChange={e => setFormData({...formData, user_name: e.target.value})} 
                    />
                    {errors.name && <p className="text-[10px] text-red-500 mt-2 ml-4 font-bold uppercase">{errors.name}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <input 
                        placeholder="Имейл" 
                        value={formData.user_email}
                        className={`modern-input ${errors.email ? 'border-red-500 bg-red-50' : 'border-gray-100'}`} 
                        onChange={e => setFormData({...formData, user_email: e.target.value})} 
                      />
                      {errors.email && <p className="text-[10px] text-red-500 mt-2 ml-4 font-bold uppercase">{errors.email}</p>}
                    </div>
                    <div>
                      <input 
                        placeholder="Телефон" 
                        value={formData.user_phone}
                        className={`modern-input ${errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-100'}`} 
                        maxLength={10} 
                        onChange={e => setFormData({...formData, user_phone: e.target.value})} 
                      />
                      {errors.phone && <p className="text-[10px] text-red-500 mt-2 ml-4 font-bold uppercase">{errors.phone}</p>}
                    </div>
                  </div>

                  <div className="relative">
                    <select 
                      value={formData.tour_title}
                      className="modern-input appearance-none cursor-pointer font-medium text-brand-dark pr-12"
                      onChange={e => {
                        const selected = tours.find(t => t.title === e.target.value);
                        setFormData({...formData, tour_title: e.target.value, tour_price: selected ? selected.price : 'N/A'});
                      }}
                    >
                      <option value="Общо запитване">Общо запитване</option>
                      {tours.map((t, i) => <option key={i} value={t.title}>{t.title}</option>)}
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-brand-gold" size={20} />
                  </div>

                  <textarea 
                    placeholder="Вашето съобщение..." 
                    value={formData.user_message}
                    className="modern-input h-44 resize-none" 
                    onChange={e => setFormData({...formData, user_message: e.target.value})}
                  ></textarea>
                  
                  <button 
                    type="submit" 
                    disabled={sending} 
                    className="w-full bg-brand-dark text-white py-6 rounded-3xl font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-brand-gold hover:text-brand-dark transition-all duration-500 shadow-xl active:scale-95 disabled:opacity-50"
                  >
                    {sending ? 'ИЗПРАЩАНЕ...' : <><Send size={18}/> ИЗПРАТИ СЪОБЩЕНИЕ</>}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .modern-input { width: 100%; padding: 1.5rem; background: #fcfcfc; border: 1px solid #f0f0f0; border-radius: 2rem; outline: none; font-size: 0.95rem; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); } 
        .modern-input:focus { background: #fff; border-color: #c5a35d; box-shadow: 0 15px 40px rgba(197,163,93,0.08); transform: translateY(-2px); }
      `}</style>
    </main>
  );
}