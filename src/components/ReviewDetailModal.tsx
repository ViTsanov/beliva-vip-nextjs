"use client";

import { X, MapPin, Quote, Star, User, UserRound, UsersRound, Ban } from 'lucide-react';

const AVATARS = [
  { id: 'none', label: 'Без', icon: Ban, color: 'bg-gray-50 text-gray-400 border-gray-200' },
  { id: 'man', label: 'Мъж', icon: User, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { id: 'woman', label: 'Жена', icon: UserRound, color: 'bg-rose-50 text-rose-600 border-rose-200' },
  { id: 'family', label: 'Семейство', icon: UsersRound, color: 'bg-amber-50 text-amber-600 border-amber-200' },
];

export default function ReviewDetailModal({ review, onClose }: { review: any, onClose: () => void }) {
  if (!review) return null;

  const avatarData = AVATARS.find(a => a.id === review.avatarId);
  const Icon = (avatarData && review.avatarId !== 'none') ? avatarData.icon : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-dark/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 md:p-10 relative shadow-2xl animate-in zoom-in-95 duration-300 border border-brand-gold/10">
        
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full hover:bg-brand-gold hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="flex flex-col gap-4 mb-8">
            <div className="flex text-brand-gold">
                {[...Array(review.rating || 5)].map((_, i) => (
                    <Star key={i} size={20} className="fill-brand-gold" />
                ))}
            </div>
            {review.destination && (
                <span className="self-start bg-brand-gold/10 text-brand-dark text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <MapPin size={12} className="text-brand-gold"/> {review.destination}
                </span>
            )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar mb-8">
             <Quote className="text-brand-gold/20 mb-2 rotate-180" size={40} />
             <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                 {review.text}
             </p>
        </div>

        <div className="flex items-center gap-4 border-t border-gray-100 pt-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 shrink-0 ${Icon ? (avatarData?.color || '') : 'bg-brand-dark text-brand-gold border-transparent'}`}>
                {Icon ? <Icon size={32} strokeWidth={1.5} /> : <span className="text-2xl font-bold uppercase">{review.name.charAt(0)}</span>}
            </div>
            <div>
                <h4 className="font-bold text-brand-dark text-lg">{review.name}</h4>
                <p className="text-xs text-gray-400 uppercase tracking-widest">Клиент на Beliva</p>
            </div>
        </div>
      </div>
    </div>
  );
}