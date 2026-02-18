"use client";

import React, { useState } from 'react';
import { Facebook, Instagram, Phone, Mail, MapPin, Send, CheckCircle2, Sparkles, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
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
        {/* Добавихме още една колона, затова grid-cols-4 става grid-cols-5 на големи екрани или преразпределяме */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16 border-b border-white/10 pb-16">
          
          {/* Brand */}
          <div className="space-y-6">
            <Link href="/" className="text-3xl font-serif italic font-bold block">
              Beliva <span className="text-brand-gold">VIP</span> Tour
            </Link>
            
            <div className="space-y-2">
                <p className="text-brand-gold/80 text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
                    <ShieldCheck size={12} /> {COMPANY_INFO.legalName}
                </p>
                <p className="text-gray-400 text-sm leading-relaxed">
                    Вашият доверен партньор в света на пътешествията. Създаваме спомени, които остават за цял живот.
                </p>
                <p className="text-gray-500 text-[10px] uppercase tracking-tighter italic">
                    Лиценз: {COMPANY_INFO.license} | ЕИК: {COMPANY_INFO.eik}
                </p>
            </div>

            <div className="flex gap-4">
              <a href={COMPANY_INFO.socials.facebook} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-gold hover:text-brand-dark transition-all"><Facebook size={18}/></a>
              <a href={COMPANY_INFO.socials.instagram} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-gold hover:text-brand-dark transition-all"><Instagram size={18}/></a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-8 lg:col-span-2">
              <div>
                <h4 className="font-bold uppercase tracking-widest text-xs mb-6 text-brand-gold">Навигация</h4>
                <ul className="space-y-4 text-sm text-gray-400">
                    <li><Link href="/" className="hover:text-white transition-colors">Начало</Link></li>
                    <li><Link href="/about-us" className="hover:text-white transition-colors">За нас</Link></li>
                    <li><Link href="/blog" className="hover:text-white transition-colors">Блог & Пътеводител</Link></li>
                    <li><Link href="/favorites" className="hover:text-white transition-colors">Любими оферти</Link></li>
                    <li><Link href="/contacts" className="hover:text-white transition-colors">Контакти</Link></li>
                    <li><Link href="/reviews" className="hover:text-white transition-colors">Отзиви</Link></li>
                </ul>
              </div>

              {/* 🚀 НОВА КОЛОНА: ТОП ДЕСТИНАЦИИ (Deep Links) */}
              <div>
                <h4 className="font-bold uppercase tracking-widest text-xs mb-6 text-brand-gold">Топ Дестинации</h4>
                <ul className="space-y-4 text-sm text-gray-400">
                    <li>
                        <Link href="/?country=Тайланд#tours-grid" className="hover:text-white transition-colors">Екзотика Тайланд</Link>
                    </li>
                    <li>
                        <Link href="/?country=Дубай#tours-grid" className="hover:text-white transition-colors">Екскурзии Дубай</Link>
                    </li>
                    <li>
                        <Link href="/?country=Япония#tours-grid" className="hover:text-white transition-colors">Екскурзии Япония</Link>
                    </li>
                    <li>
                        <Link href="/?country=Бали#tours-grid" className="hover:text-white transition-colors">Екзотика Бали</Link>
                    </li>
                    <li>
                        <Link href="/?country=Перу#tours-grid" className="hover:text-white transition-colors">Екскурзии Перу</Link>
                    </li>
                    <li>
                        <Link href="/?continent=Азия#tours-grid" className="hover:text-white transition-colors text-brand-gold/70">Всички в Азия</Link>
                    </li>
                </ul>
              </div>
          </div>

          {/* NEWSLETTER (Оставяме го в 4-тата колона) */}
          <div className="lg:-mt-6">
              <div className="bg-gradient-to-br from-brand-gold via-yellow-400 to-amber-500 p-6 rounded-2xl shadow-[0_10px_40px_-10px_rgba(234,179,8,0.4)] text-brand-dark relative overflow-hidden transform hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={16} className="text-brand-dark" />
                    <h4 className="font-black uppercase tracking-widest text-xs text-brand-dark">Нашият Бюлетин</h4>
                </div>
                
                <p className="text-brand-dark/80 text-xs mb-5 font-medium leading-relaxed">
                   Абонирай се за ексклузивни оферти и тайни дестинации.
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
                      className="w-full bg-white border-0 rounded-xl py-3 pl-4 pr-12 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-dark/20 shadow-sm"
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
              </div>

              {/* Legal Links (Сложих ги тук под бюлетина за баланс, или може да са отделно) */}
               <div className="mt-8">
                  <h4 className="font-bold uppercase tracking-widest text-xs mb-4 text-brand-gold">Полезна информация</h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-400">
                    <Link href="/terms" className="hover:text-white transition-colors">Общи условия</Link>
                    <Link href="/privacy" className="hover:text-white transition-colors">Политика</Link>
                    <Link href="/faq" className="hover:text-white transition-colors">FAQ</Link>
                  </div>
               </div>
          </div>
        </div>

        {/* Contacts, Legal & Copyright */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-8 text-[10px] md:text-xs text-gray-500 font-medium tracking-tight">
          
          {/* Контакти */}
          <div className="flex flex-col sm:flex-row flex-wrap justify-center lg:justify-start gap-x-8 gap-y-4">
             <a href={`tel:${COMPANY_INFO.phone}`} className="flex items-center gap-2 hover:text-white transition-colors font-bold whitespace-nowrap">
                <Phone size={14} className="text-brand-gold"/> {COMPANY_INFO.phone}
             </a>
             <a href={`mailto:${COMPANY_INFO.email}`} className="flex items-center gap-2 hover:text-white transition-colors whitespace-nowrap">
                <Mail size={14} className="text-brand-gold"/> {COMPANY_INFO.email}
             </a>
             <span className="flex items-center gap-2 whitespace-nowrap">
                <MapPin size={14} className="text-brand-gold"/> {COMPANY_INFO.address}
             </span>
          </div>

          {/* Легални данни и Copyright */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 border-t lg:border-t-0 border-white/5 pt-6 lg:pt-0 w-full lg:w-auto justify-center">
             <div className="flex gap-4 text-gray-400">
                <span>ЕИК: <span className="text-gray-300 font-bold">{COMPANY_INFO.eik}</span></span>
                <span className="text-white/10">|</span>
                <span>Лиценз: <span className="text-gray-300 font-bold">{COMPANY_INFO.license}</span></span>
             </div>
             <p className="text-gray-600">© {new Date().getFullYear()} {COMPANY_INFO.name}</p>
          </div>

        </div>
      </div>
    </footer>
  );
}