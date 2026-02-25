"use client";

import { useState, useEffect } from "react";
import { Send, CheckCircle2, AlertCircle, Globe, Calendar } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from "firebase/firestore";

interface ITour {
  id: string;
  title: string;
  status: string;
  dates?: string[];
}

export default function ContactFormClient() {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [tours, setTours] = useState<ITour[]>([]);
  const [selectedTour, setSelectedTour] = useState<ITour | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  useEffect(() => {
    const fetchTours = async () => {
      try {
        const snap = await getDocs(query(collection(db, "tours"), orderBy("title", "asc")));
        const tourData = snap.docs.map(d => ({ id: d.id, ...d.data() } as ITour));
        setTours(tourData.filter(t => t.status === 'public'));
      } catch (e) { console.error(e); }
    };
    fetchTours();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) return;
    setStatus('sending');

    try {
        // ЗАПИС В ИНФО (inquiries) - Подсигурен срещу undefined
        await addDoc(collection(db, "inquiries"), {
            clientName: formData.name.trim() || "Анонимен",
            clientEmail: formData.email.trim().toLowerCase() || "няма имейл",
            clientPhone: formData.phone.trim() || "няма телефон",
            message: formData.message.trim() || "",
            tourTitle: selectedTour?.title || "Общо запитване",
            tourDate: selectedDate || "Не е избрана",
            tourId: selectedTour?.id || "general",
            type: selectedTour ? "tour_inquiry" : "general_contact",
            status: 'new',
            createdAt: serverTimestamp(),
            isRead: false
        });

        setStatus('success');
        setFormData({ name: "", email: "", phone: "", message: "" });
        setSelectedTour(null);
        setSelectedDate("");
    } catch (error) {
        console.error("Contact Error:", error);
        setStatus('error');
    }
  };

  if (status === 'success') {
      return (
          <div className="text-center py-10 animate-in zoom-in bg-white/5 rounded-[2rem] border border-white/10 p-8 shadow-2xl">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-serif italic mb-2">Благодарим ви!</h3>
              <p className="text-gray-300 mb-6">Вашето съобщение беше изпратено успешно. Ще се свържем с вас скоро!</p>
              <button onClick={() => setStatus('idle')} className="text-brand-gold font-bold underline text-sm uppercase tracking-widest hover:text-white transition-all">
                  Изпрати ново съобщение
              </button>
          </div>
      );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gold ml-2 block">Вашето име *</label>
                <input type="text" required className="contact-input-v3 w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:border-brand-gold outline-none transition-all" placeholder="Иван Иванов" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gold ml-2 block">Телефон *</label>
                <input type="tel" required className="contact-input-v3 w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:border-brand-gold outline-none transition-all" placeholder="08XX XXX XXX" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
        </div>

        <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gold ml-2 block">Email *</label>
            <input type="email" required className="contact-input-v3 w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:border-brand-gold outline-none transition-all" placeholder="ivan@mail.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-2 flex items-center gap-1 mb-1"><Globe size={10}/> Избери Екскурзия (по избор)</label>
                <select 
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-gold transition-all cursor-pointer text-sm"
                    onChange={e => {
                        const tour = tours.find(t => t.id === e.target.value);
                        setSelectedTour(tour || null);
                        setSelectedDate("");
                    }}
                >
                    <option value="" className="bg-brand-dark">-- Общо запитване --</option>
                    {tours.map(t => <option key={t.id} value={t.id} className="bg-brand-dark">{t.title}</option>)}
                </select>
            </div>

            {selectedTour && selectedTour.dates && selectedTour.dates.length > 0 && (
                <div className="space-y-1 animate-in slide-in-from-left-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-2 flex items-center gap-1 mb-1"><Calendar size={10}/> Желана дата</label>
                    <select 
                        className="w-full bg-brand-gold/10 border border-brand-gold/30 rounded-xl p-3 text-white outline-none focus:border-brand-gold transition-all cursor-pointer text-sm font-bold"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                    >
                        <option value="" className="bg-brand-dark">-- Изберете дата --</option>
                        {selectedTour.dates.slice().sort().map((d: string) => (
                            <option key={d} value={d} className="bg-brand-dark">{d.split('-').reverse().join('.')}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>

        <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gold ml-2 block">Вашето съобщение *</label>
            <textarea required rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:border-brand-gold outline-none transition-all resize-none" placeholder="Здравейте, бих искал да науча повече за..." value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
        </div>

        {status === 'error' && (
            <div className="bg-red-500/20 text-red-300 p-4 rounded-xl text-sm flex items-center gap-3 border border-red-500/30">
                <AlertCircle size={20} /> Възникна грешка. Моля опитайте отново.
            </div>
        )}

        <button type="submit" disabled={status === 'sending'} className="w-full bg-brand-gold text-brand-dark py-5 rounded-2xl font-black uppercase text-xs tracking-[0.25em] hover:bg-white hover:scale-[1.02] transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 mt-4">
            {status === 'sending' ? 'ИЗПРАЩАНЕ...' : <><Send size={18} /> ИЗПРАТИ ЗАПИТВАНЕ</>}
        </button>
    </form>
  );
}