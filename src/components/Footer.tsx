"use client";

import React, { useEffect, useState } from 'react';
import { Facebook, Instagram, Phone, Mail, MapPin, Send, CheckCircle2, Sparkles, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { COMPANY_INFO } from '@/lib/companyInfo';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const [footerLinks, setFooterLinks] = useState<any[]>([]);

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

  useEffect(() => {
    const fetchFooter = async () => {
      const docSnap = await getDoc(doc(db, "settings", "homepage"));
      if (docSnap.exists()) {
        setFooterLinks(docSnap.data().footerLinks || []);
      }
    };
  fetchFooter();
  }, []);

  return (
    <footer className="bg-brand-dark text-white pt-12 pb-10 rounded-t-[3rem] mt-auto">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-12 border-b border-white/10 pb-12">

          {/* Brand */}
          <div className="lg:col-span-2 space-y-6">
            <Link href="/" className="text-3xl font-serif italic font-bold block">
              Beliva <span className="text-brand-gold">VIP</span> Tour
            </Link>

            <div className="space-y-2">
              <p className="text-brand-gold/80 text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
                <ShieldCheck size={12} /> {COMPANY_INFO.legalName}
              </p>
              <p className="text-gray-400 text-sm leading-relaxed">
                Препродаваме турове на водещи оператори — проверени, надеждни и на добри цени.
                Работим с личен подход и грижа за всеки клиент.
              </p>
              <p className="text-gray-500 text-[10px] uppercase tracking-tighter italic">
                Лиценз: {COMPANY_INFO.license} | ЕИК: {COMPANY_INFO.eik}
              </p>
            </div>

            <div className="flex gap-4">
              <a href={COMPANY_INFO.socials.facebook} target="_blank" rel="noreferrer" aria-label="Beliva VIP Tour във Facebook" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-gold hover:text-brand-dark transition-all"><Facebook size={18}/></a>
              <a href={COMPANY_INFO.socials.instagram} target="_blank" rel="noreferrer" aria-label="Beliva VIP Tour в Instagram" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-gold hover:text-brand-dark transition-all"><Instagram size={18}/></a>
              <a href={COMPANY_INFO.socials.whatsapp} target="_blank" rel="noreferrer" aria-label="Beliva VIP Tour в WhatsApp" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-gold hover:text-brand-dark transition-all">
                {/* WhatsApp icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            </div>
          </div>

          {/* Дестинации — изцяло админ-контролирано (footerLinks от Settings → "Дестинации за всеки вкус"/Футър Линкове) — без
              твърдо закодени държави като fallback — ако админът още не е добавил нищо, колоната просто остава празна
              (без заглавие, чрез условието по-долу). */}
          {footerLinks.length > 0 && (
          <div>
            <h4 className="font-bold uppercase tracking-widest text-xs mb-6 text-brand-gold">Дестинации</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              {footerLinks.map((link, idx) => (
                <li key={idx}>
                  <Link href={link.href} className="hover:text-white transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          )}

          {/* Информация */}
          <div>
            <h4 className="font-bold uppercase tracking-widest text-xs mb-6 text-brand-gold">Информация</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link href="/about-us"  className="hover:text-white transition-colors">За нас</Link></li>
              <li><Link href="/blog"      className="hover:text-white transition-colors">Блог & Пътеводител</Link></li>
              <li><Link href="/reviews"   className="hover:text-white transition-colors">Отзиви</Link></li>
              <li><Link href="/contacts"  className="hover:text-white transition-colors">Контакти</Link></li>
              <li><Link href="/faq"       className="hover:text-white transition-colors">Въпроси и отговори</Link></li>
              <li><Link href="/terms"     className="hover:text-white transition-colors">Общи условия</Link></li>
              <li><Link href="/privacy"   className="hover:text-white transition-colors">Поверителност</Link></li>
              <li><Link href="/sitemaps"  className="hover:text-white transition-colors">Карта на сайта</Link></li>
            </ul>
          </div>

          {/* Newsletter — собствена колона */}
          <div>
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
                    <label htmlFor="footer-newsletter-email" className="sr-only">Имейл адрес за бюлетина</label>
                    <input
                      id="footer-newsletter-email"
                      type="email"
                      placeholder="Вашият имейл..."
                      required
                      autoComplete="email"
                      className="w-full bg-white border-0 rounded-xl py-3 pl-4 pr-12 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-dark/20 shadow-sm"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={status === 'loading'}
                      aria-label="Абонирай се за бюлетина"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-brand-dark text-brand-gold rounded-lg hover:bg-gray-800 hover:scale-105 transition-all disabled:opacity-70 shadow-md"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                )}
              </div>

          </div>{/* end newsletter column */}
        </div>{/* end grid */}

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