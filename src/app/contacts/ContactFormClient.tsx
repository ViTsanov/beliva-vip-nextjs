"use client";

import { useState } from "react";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function ContactFormClient() {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    try {
        // Записваме във Firebase
        await addDoc(collection(db, "inquiries"), {
            ...formData,
            type: "general_contact",
            createdAt: serverTimestamp(),
            isRead: false
        });

        // Тук можеш да добавиш EmailJS ако искаш, но засега само базата данни е достатъчна
        setStatus('success');
        setFormData({ name: "", email: "", phone: "", message: "" });

    } catch (error) {
        console.error("Error:", error);
        setStatus('error');
    }
  };

  if (status === 'success') {
      return (
          <div className="text-center py-10 animate-in zoom-in">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-serif italic mb-2">Благодарим ви!</h3>
              <p className="text-gray-300 mb-6">Вашето съобщение беше изпратено успешно.</p>
              <button onClick={() => setStatus('idle')} className="text-brand-gold font-bold underline text-sm uppercase tracking-widest">
                  Изпрати ново
              </button>
          </div>
      );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gold mb-1 block">Вашето име</label>
            <input 
                type="text" 
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold focus:bg-white/10 transition-all"
                placeholder="Иван Иванов"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gold mb-1 block">Email</label>
                <input 
                    type="email" 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold focus:bg-white/10 transition-all"
                    placeholder="ivan@mail.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                />
            </div>
            <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gold mb-1 block">Телефон</label>
                <input 
                    type="tel" 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold focus:bg-white/10 transition-all"
                    placeholder="0888 123 456"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                />
            </div>
        </div>

        <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gold mb-1 block">Съобщение</label>
            <textarea 
                required
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold focus:bg-white/10 transition-all resize-none"
                placeholder="Здравейте, интересувам се от..."
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
            />
        </div>

        {status === 'error' && (
            <div className="bg-red-500/20 text-red-300 p-3 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle size={16} /> Възникна грешка. Моля опитайте отново.
            </div>
        )}

        <button 
            type="submit" 
            disabled={status === 'sending'}
            className="w-full bg-brand-gold text-brand-dark py-4 rounded-xl font-black uppercase text-xs tracking-[0.2em] hover:bg-white transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
            {status === 'sending' ? 'Изпращане...' : <><Send size={16} /> Изпрати съобщение</>}
        </button>
    </form>
  );
}