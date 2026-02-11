"use client";

import React, { useState } from 'react';
import { Facebook, Instagram, Phone, Mail, MapPin, Send, CheckCircle2, Sparkles } from 'lucide-react';
import Link from 'next/link'; // 👈 Next.js Link
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { COMPANY_INFO } from '@/lib/companyInfo';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setStatus('loading');
    setMessage('');

    try {
      const q = query(collection(db, "subscribers"), where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setStatus('error');
        setMessage('Вече сте абонирани за този бюлетин.');
        return;
      }

      await addDoc(collection(db, "subscribers"), {
        email: email,
        createdAt: serverTimestamp(),
        source: 'footer'
      });
      
      setStatus('success');
      setMessage('Успешен абонамент!');
      setEmail('');

    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage('Възникна грешка. Опитайте пак.');
    }
  };

  return (
    <footer className="bg-brand-dark text-white pt-20 pb-10 rounded-t-[3rem] mt-auto">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16 border-b border-white/10 pb-16">
          
          {/* Brand */}
          <div className="space-y-6">
            <Link href="/" className="text-3xl font-serif italic font-bold block">
              Beliva <span className="text-brand-gold">VIP</span> Tour
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Вашият доверен партньор в света на пътешествията. Създаваме спомени, които остават за цял живот.
            </p>
            <div className="flex gap-4">
              <a href={COMPANY_INFO.socials.facebook} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-gold hover:text-brand-dark transition-all"><Facebook size={18}/></a>
              <a href={COMPANY_INFO.socials.instagram} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-gold hover:text-brand-dark transition-all"><Instagram size={18}/></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold uppercase tracking-widest text-xs mb-6 text-brand-gold">Навигация</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><Link href="/" className="hover:text-white transition-colors">Начало</Link></li>
              <li><Link href="/about-us" className="hover:text-white transition-colors">За нас</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">Блог & Пътеводител</Link></li>
              <li><Link href="/favorites" className="hover:text-white transition-colors">Любими оферти</Link></li>
              <li><Link href="/contacts" className="hover:text-white transition-colors">Контакти</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold uppercase tracking-widest text-xs mb-6 text-brand-gold">Полезна информация</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><Link href="/faq" className="hover:text-white transition-colors">Често задавани въпроси</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Общи условия</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Политика за поверителност</Link></li>
              <li><Link href="/sitemap" className="hover:text-white transition-colors">Карта на сайта</Link></li>
              <li><Link href="/reviews" className="hover:text-white transition-colors">Отзиви</Link></li>
            </ul>
          </div>

          {/* NEWSLETTER - С ОРИГИНАЛНИЯ ЖЪЛТ ГРАДИЕНТ */}
          <div className="lg:-mt-6">
              <div className="bg-gradient-to-br from-brand-gold via-yellow-400 to-amber-500 p-6 rounded-2xl shadow-[0_10px_40px_-10px_rgba(234,179,8,0.4)] text-brand-dark relative overflow-hidden transform hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={16} className="text-brand-dark" />
                    <h4 className="font-black uppercase tracking-widest text-xs text-brand-dark">Нашият Бюлетин</h4>
                </div>
                
                <p className="text-brand-dark/80 text-xs mb-5 font-medium leading-relaxed">
                   Абонирай се за ексклузивни оферти и тайни дестинации, недостъпни за масовата публика.
                </p>
                
                {status === 'success' ? (
                  <div className="bg-white/90 backdrop-blur border border-white p-4 rounded-xl flex items-center gap-3 text-emerald-600 shadow-inner">
                    <CheckCircle2 size={20}/>
                    <span className="text-xs font-bold uppercase">{message}</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="relative">
                    <input 
                      type="email" 
                      placeholder="Вашият имейл..." 
                      required
                      className="w-full bg-white border-0 rounded-xl py-3 pl-4 pr-12 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-dark/20 shadow-sm"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                    <button 
                      type="submit" 
                      disabled={status === 'loading'}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-brand-dark text-brand-gold rounded-lg hover:bg-gray-800 hover:scale-105 transition-all disabled:opacity-70 shadow-md"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                )}
                
                {status === 'error' && (
                    <div className="mt-2 bg-red-100 text-red-600 text-[10px] font-bold px-3 py-1 rounded-md inline-block">
                        {message}
                    </div>
                )}
             </div>
          </div>
        </div>

        {/* Contacts & Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-gray-500 font-medium">
          <div className="flex flex-col sm:flex-row gap-6">
             <a href={`tel:${COMPANY_INFO.phone}`} className="flex items-center gap-2 hover:text-white transition-colors font-bold"><Phone size={14} className="text-brand-gold"/> {COMPANY_INFO.phone}</a>
             <a href={`mailto:${COMPANY_INFO.email}`} className="flex items-center gap-2 hover:text-white transition-colors"><Mail size={14} className="text-brand-gold"/> {COMPANY_INFO.email}</a>
             <span className="flex items-center gap-2"><MapPin size={14} className="text-brand-gold"/> {COMPANY_INFO.address}</span>
          </div>
          <p>© {new Date().getFullYear()} {COMPANY_INFO.name}. Всички права запазени.</p>
        </div>
      </div>
    </footer>
  );
}