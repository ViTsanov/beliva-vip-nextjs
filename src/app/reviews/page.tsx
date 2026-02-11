"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Star, MessageSquarePlus, MapPin, Quote, MessageSquareQuote, User, UserRound, UsersRound, Ban, Filter } from 'lucide-react';
import ReviewModal from '@/components/ReviewModal';
import ReviewDetailModal from '@/components/ReviewDetailModal';

const AVATARS = [
  { id: 'none', label: 'Без', icon: Ban, color: 'bg-gray-50 text-gray-400 border-gray-200' },
  { id: 'man', label: 'Мъж', icon: User, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { id: 'woman', label: 'Жена', icon: UserRound, color: 'bg-rose-50 text-rose-600 border-rose-200' },
  { id: 'family', label: 'Семейство', icon: UsersRound, color: 'bg-amber-50 text-amber-600 border-amber-200' },
];

function ReviewCard({ review, onReadMore }: { review: any, onReadMore: () => void }) {
  const textLimit = 150;
  const isLongText = review.text.length > textLimit;
  const displayText = review.text.substring(0, textLimit);

  const avatarData = AVATARS.find(a => a.id === review.avatarId);
  const Icon = (avatarData && review.avatarId !== 'none') ? avatarData.icon : null;

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-brand-gold/10 flex flex-col justify-between hover:shadow-lg transition-all duration-300 h-full group relative overflow-hidden">
      <Quote className="absolute top-6 right-6 text-gray-100 rotate-180 transition-transform group-hover:scale-110" size={64} />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
            <div className="flex text-brand-gold gap-0.5">
               {[...Array(review.rating || 5)].map((_, i) => (<Star key={i} size={14} className="fill-brand-gold" />))}
            </div>
            {review.destination && (
                <span className="bg-gray-50 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md text-gray-500 flex items-center gap-1 border border-gray-100">
                    <MapPin size={10} className="text-brand-gold"/> {review.destination}
                </span>
            )}
        </div>

        <div>
          <p className="text-gray-600 italic mb-4 leading-relaxed group-hover:text-brand-dark transition-colors font-serif">
            "{displayText}{isLongText ? '...' : ''}"
          </p>
          {isLongText && (
            <button onClick={onReadMore} className="flex items-center gap-1 text-brand-gold text-xs font-bold uppercase tracking-wider hover:text-brand-dark mb-6 transition-colors">
              Прочети още
            </button>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4 border-t border-gray-50 pt-6 mt-auto relative z-10">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center border shrink-0 ${Icon ? (avatarData?.color || '') : 'bg-brand-gold/10 text-brand-gold border-brand-gold/20'}`}>
             {Icon ? <Icon size={24} strokeWidth={1.5} /> : <span className="text-xl font-bold uppercase">{review.name.charAt(0)}</span>}
        </div>
        <div>
          <h4 className="font-bold text-brand-dark text-sm">{review.name}</h4>
          <span className="text-[10px] text-gray-400">Клиент на Beliva VIP Tour</span>
        </div>
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddReviewModal, setShowAddReviewModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);

  useEffect(() => {
    const q = query(
      collection(db, "reviews"),
      where("isVisible", "==", true),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / totalReviews).toFixed(1)
    : "5.0";

  return (
    <main className="min-h-screen bg-[#fcf9f2] pt-32 pb-20">
      
      <div className="container mx-auto px-6">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 flex items-center justify-center text-brand-gold">
                    <MessageSquareQuote size={24} />
                </div>
                <span className="text-brand-gold text-sm font-black uppercase tracking-[0.25em]">Впечатления</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-serif italic text-brand-dark mb-6 leading-tight">
                Истории от <span className="text-brand-gold">първо лице</span>
            </h1>
            
            <p className="text-gray-500 mb-8 text-lg">
                Всяко пътуване е уникална емоция. Тук събираме спомените на тези, които ни се довериха да бъдем техни спътници в света.
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                {totalReviews > 0 && (
                    <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl shadow-sm border border-brand-gold/10">
                        <div className="flex gap-1 text-brand-gold">
                            <Star className="fill-brand-gold" size={20}/>
                            <Star className="fill-brand-gold" size={20}/>
                            <Star className="fill-brand-gold" size={20}/>
                            <Star className="fill-brand-gold" size={20}/>
                            <Star className="fill-brand-gold" size={20}/>
                        </div>
                        <div className="flex flex-col text-left leading-none">
                            <span className="font-bold text-brand-dark text-xl">{averageRating}</span>
                            <span className="text-[10px] uppercase font-bold text-gray-400">от {totalReviews} ревюта</span>
                        </div>
                    </div>
                )}
                
                <button 
                    onClick={() => setShowAddReviewModal(true)}
                    className="flex items-center gap-2 bg-brand-dark text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-brand-gold hover:text-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                    <MessageSquarePlus size={18} /> Добави своя отзив
                </button>
            </div>
        </div>

        {loading ? (
             <div className="text-center py-20">
                <div className="inline-block w-10 h-10 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
             </div>
        ) : reviews.length === 0 ? (
             <div className="text-center py-20 opacity-50 flex flex-col items-center">
                <Filter size={64} className="text-gray-200 mb-4"/>
                <h3 className="text-2xl font-serif text-gray-400">Все още няма ревюта</h3>
                <p className="text-gray-400 mb-6">Бъдете първият, който ще сподели мнение!</p>
             </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {reviews.map((review, idx) => (
                    <div key={review.id} className="animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: `${idx * 50}ms` }}>
                        <ReviewCard review={review} onReadMore={() => setSelectedReview(review)} />
                    </div>
                ))}
            </div>
        )}
      </div>

      {showAddReviewModal && <ReviewModal onClose={() => setShowAddReviewModal(false)} />}
      {selectedReview && <ReviewDetailModal review={selectedReview} onClose={() => setSelectedReview(null)} />}
    </main>
  );
}