"use client";

import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, User, UserRound, UsersRound, Ban } from 'lucide-react'; 
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // 👈 Next.js import

interface ReviewModalProps {
  onClose: () => void;
}

const AVATARS = [
  { id: 'none', label: 'Без', icon: Ban, color: 'bg-gray-50 text-gray-400 border-gray-200' },
  { id: 'man', label: 'Мъж', icon: User, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { id: 'woman', label: 'Жена', icon: UserRound, color: 'bg-rose-50 text-rose-600 border-rose-200' },
  { id: 'family', label: 'Семейство', icon: UsersRound, color: 'bg-amber-50 text-amber-600 border-amber-200' },
];

export default function ReviewModal({ onClose }: ReviewModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    destination: '', 
    text: '',
    rating: 5,
    avatarId: 'none',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    try {
      await addDoc(collection(db, "reviews"), {
        ...formData,
        isVisible: true, 
        createdAt: serverTimestamp(),
      });
      
      setStatus('success');
      setTimeout(() => onClose(), 3000);
    } catch (error) {
      console.error("Грешка:", error);
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-brand-dark/95 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 relative shadow-2xl transition-all max-h-[90vh] overflow-y-auto">
        
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-brand-gold hover:text-white transition-colors z-10">
          <X size={20} />
        </button>
        
        {status === 'success' && (
            <div className="flex flex-col items-center justify-center py-10 text-center animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6">
                    <CheckCircle2 size={40} />
                </div>
                <h3 className="text-2xl font-serif font-bold text-brand-dark mb-2">Успешно качено ревю!</h3>
            </div>
        )}

        {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-10 text-center animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-6">
                    <AlertCircle size={40} />
                </div>
                <h3 className="text-2xl font-serif font-bold text-brand-dark mb-2">Грешка при качване</h3>
                <button onClick={() => setStatus('idle')} className="text-brand-gold font-bold underline mt-4">Опитай пак</button>
            </div>
        )}

        {(status === 'idle' || status === 'submitting') && (
            <>
                <h3 className="text-3xl font-serif italic text-brand-dark mb-2 text-center">Споделете мнение</h3>
                <p className="text-center text-gray-400 text-xs mb-8 uppercase tracking-widest">Вашият опит е важен за нас</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* ИЗБОР НА АВАТАР */}
                <div className="flex flex-col items-center gap-3">
                    <span className="text-[10px] font-bold uppercase text-gray-400">Изберете иконка или оставете без</span>
                    <div className="flex gap-3 justify-center w-full flex-wrap sm:flex-nowrap">
                        {AVATARS.map((avatar) => {
                            const Icon = avatar.icon;
                            const isSelected = formData.avatarId === avatar.id;
                            const showLetterPreview = avatar.id === 'none' && formData.name.length > 0;

                            return (
                                <button
                                    key={avatar.id}
                                    type="button"
                                    onClick={() => setFormData({...formData, avatarId: avatar.id})}
                                    className={`flex flex-col items-center gap-2 group transition-all duration-300`}
                                >
                                    <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center transition-all border-2 ${isSelected ? `${avatar.color} border-current scale-110 shadow-lg` : 'bg-gray-50 text-gray-300 border-transparent hover:bg-gray-100 hover:text-gray-400'}`}>
                                        {showLetterPreview && isSelected ? (
                                            <span className="text-xl font-bold uppercase">{formData.name.charAt(0)}</span>
                                        ) : (
                                            <Icon size={28} strokeWidth={1.5} />
                                        )}
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wide transition-colors ${isSelected ? 'text-brand-dark' : 'text-gray-300'}`}>
                                        {avatar.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <input required placeholder="Вашето Име" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-xl outline-none focus:border-brand-gold/50 transition-colors placeholder:text-gray-400 text-brand-dark font-medium" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>

                <div>
                    <input placeholder="Коя дестинация посетихте? (по желание)" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-xl outline-none focus:border-brand-gold/50 transition-colors placeholder:text-gray-400 text-brand-dark" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} />
                </div>

                {/* РЕЙТИНГ */}
                <div className="flex justify-center gap-2 py-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setFormData({...formData, rating: star})} className={`transition-all hover:scale-110 text-2xl ${formData.rating >= star ? 'text-brand-gold' : 'text-gray-200'}`}>
                        ★
                    </button>
                    ))}
                </div>

                <div>
                    <textarea required placeholder="Напишете вашия отзив тук..." className="w-full bg-gray-50 border border-gray-100 p-4 rounded-xl outline-none focus:border-brand-gold/50 transition-colors h-28 resize-none placeholder:text-gray-400 text-brand-dark" value={formData.text} onChange={e => setFormData({...formData, text: e.target.value})} />
                </div>

                <button type="submit" disabled={status === 'submitting'} className="w-full bg-brand-dark text-white py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-gold hover:text-brand-dark transition-all shadow-lg disabled:opacity-50">
                    {status === 'submitting' ? 'Качване...' : 'Публикувай'}
                </button>
                </form>
            </>
        )}
      </div>
    </div>
  );
}