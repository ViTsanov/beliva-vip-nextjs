"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Star, MessageSquarePlus, ChevronRight, ChevronLeft, MapPin, Quote, MessageSquareQuote, User, UserRound, UsersRound, Ban } from 'lucide-react';
import ReviewModal from '@/components/ReviewModal';
import ReviewDetailModal from '@/components/ReviewDetailModal';

// ... (AVATARS и ReviewCard остават същите, няма нужда да ги променяме)
const AVATARS = [
  { id: 'none', label: 'Без', icon: Ban, color: 'bg-gray-50 text-gray-400 border-gray-200' },
  { id: 'man', label: 'Мъж', icon: User, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { id: 'woman', label: 'Жена', icon: UserRound, color: 'bg-rose-50 text-rose-600 border-rose-200' },
  { id: 'family', label: 'Семейство', icon: UsersRound, color: 'bg-amber-50 text-amber-600 border-amber-200' },
];

interface IReview {
  id: string;
  name: string;
  text: string;
  rating?: number;
  destination?: string;
  avatarId?: string;
}

function ReviewCard({ review, onReadMore }: { review: IReview, onReadMore: () => void }) {
  const textLimit = 150;
  const isLongText = review.text.length > textLimit;
  const displayText = review.text.substring(0, textLimit);

  const avatarData = AVATARS.find(a => a.id === review.avatarId);
  const Icon = (avatarData && review.avatarId !== 'none') ? avatarData.icon : null;

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-md border border-gray-200 hover:border-brand-gold/40 flex flex-col justify-between hover:shadow-lg transition-all duration-300 h-full group relative overflow-hidden">
      <Quote className="absolute top-6 right-6 text-gray-100 rotate-180" size={64} />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
            <div className="flex text-brand-gold gap-0.5">
            {[...Array(review.rating || 5)].map((_, i) => (
                <Star key={i} size={14} className="fill-brand-gold" />
            ))}
            </div>
            {review.destination && (
                <span className="bg-gray-50 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md text-gray-500 flex items-center gap-1 border border-gray-100">
                    <MapPin size={10} className="text-brand-gold"/> {review.destination}
                </span>
            )}
        </div>

        <div>
          <p className="text-gray-600 italic mb-4 leading-relaxed group-hover:text-brand-dark transition-colors font-serif">
            &quot;{displayText}{isLongText ? '...' : ''}&quot;
          </p>
          
          {isLongText && (
            <button 
              onClick={onReadMore}
              className="flex items-center gap-1 text-brand-gold text-xs font-bold uppercase tracking-wider hover:text-brand-dark mb-6 transition-colors group/btn"
            >
              Прочети още <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4 border-t border-gray-50 pt-6 mt-auto relative z-10">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center border shrink-0 
            ${Icon ? (avatarData?.color || '') : 'bg-brand-gold/10 text-brand-gold border-brand-gold/20'}
        `}>
             {Icon ? (
                <Icon size={24} strokeWidth={1.5} />
             ) : (
                <span className="text-xl font-bold uppercase">{review.name.charAt(0)}</span>
             )}
        </div>

        <div>
          <h4 className="font-bold text-brand-dark text-sm">{review.name}</h4>
        </div>
      </div>
    </div>
  );
}

export default function Testimonials() {
  const [reviews, setReviews] = useState<IReview[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAddReviewModal, setShowAddReviewModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<IReview | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setItemsPerPage(1);
      else setItemsPerPage(3);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "reviews"), where("isVisible", "==", true), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as IReview)));
    });
    return () => unsubscribe();
  }, []);

  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / totalReviews).toFixed(1) : "5.0";

  const prevReviews = () => {
    setCurrentIndex((prevIndex) => {
       const newIndex = prevIndex - itemsPerPage;
       if (newIndex < 0) {
           const remainder = reviews.length % itemsPerPage;
           return Math.max(0, reviews.length - (remainder === 0 ? itemsPerPage : remainder));
       }
       return newIndex;
    });
  };

  useEffect(() => {
    if (reviews.length <= itemsPerPage) return;
    if (selectedReview || showAddReviewModal) return;
    const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => prevIndex + itemsPerPage >= reviews.length ? 0 : prevIndex + itemsPerPage);
    }, 10000);
    return () => clearInterval(interval);
  }, [currentIndex, reviews.length, itemsPerPage, selectedReview, showAddReviewModal]);

  const visibleReviews = reviews.slice(currentIndex, currentIndex + itemsPerPage);
  const totalPages = Math.ceil(reviews.length / itemsPerPage);
  const activePage = Math.floor(currentIndex / itemsPerPage);
  const maxVisibleDots = 5;
  let translateValue = 0;

  if (totalPages > maxVisibleDots) {
      if (activePage <= 2) translateValue = 0;
      else if (activePage >= totalPages - 3) translateValue = (totalPages - maxVisibleDots) * 16;
      else translateValue = (activePage - 2) * 16;
  }

  return (
    // Светлосив сив фон (не бял, не cream като MeetGuides) — белите карти с техен бордер се губеше на чисто бял фон —
    // сега имат реален контраст и секцията остава визуално отделена от MeetGuides над нея.
    <section className="w-full py-20 overflow-hidden bg-gray-50 border-t border-brand-gold/10">
      
      {/* 👇 ПРОМЯНА 2: Добавяме вътрешен контейнер за центриране */}
      <div className="container mx-auto px-6">
      
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8 ">
            <div className="text-center md:text-left max-w-2xl">
            {totalReviews > 0 && (
                <div className="inline-flex items-center gap-2 mb-4 bg-[#f7f0e4] border border-brand-gold/20 px-4 py-2 rounded-full shadow-sm">
                    <div className="flex items-center gap-1">
                        <Star className="fill-brand-gold text-brand-gold" size={16} />
                        <span className="font-bold text-brand-dark text-lg leading-none">{averageRating}</span>
                        <span className="text-gray-400 text-xs font-medium">/ 5.0</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Общо оценка от {totalReviews} ревюта</span>
                </div>
            )}
            <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center text-brand-gold"><MessageSquareQuote size={20} /></div>
                <span className="text-brand-gold text-xs font-black uppercase tracking-[0.25em]">Отзиви</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-serif italic text-brand-dark mb-4 leading-tight">Какво казват нашите клиенти</h2>
            <p className="text-gray-500 text-sm md:text-base font-medium">Вашето доверие е нашата най-голяма награда. Споделете впечатленията си.</p>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto justify-center md:justify-end">
            <button onClick={() => setShowAddReviewModal(true)} className="flex items-center gap-2 bg-brand-gold text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-brand-dark transition-all text-xs shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                <MessageSquarePlus size={16} /> Остави отзив
            </button>
            
            {reviews.length > itemsPerPage && (
                <div className="flex gap-2">
                <button onClick={prevReviews} aria-label="Предишни отзиви" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-brand-gold/20 text-brand-gold hover:bg-brand-gold hover:text-white transition-all shadow-sm"><ChevronLeft size={20} /></button>
                <button onClick={() => setCurrentIndex((prevIndex) => prevIndex + itemsPerPage >= reviews.length ? 0 : prevIndex + itemsPerPage)} aria-label="Следващи отзиви" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-brand-gold/20 text-brand-gold hover:bg-brand-gold hover:text-white transition-all shadow-sm"><ChevronRight size={20} /></button>
                </div>
            )}
            </div>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch min-h-[300px]`}>
            {visibleReviews.map((review) => (
            <div key={review.id} className="transition-all duration-500 transform opacity-100 scale-100 h-full animate-in fade-in zoom-in-95">
                <ReviewCard review={review} onReadMore={() => setSelectedReview(review)} />
            </div>
            ))}
        </div>

        {reviews.length > itemsPerPage && (
            <div className="flex justify-center mt-12">
                <div className="w-[80px] overflow-hidden px-1 py-2">
                    <div className="flex gap-2 transition-transform duration-500 ease-out" style={{ transform: `translateX(-${translateValue}px)` }}>
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <button key={i} onClick={() => setCurrentIndex(i * itemsPerPage)} className={`rounded-full transition-all duration-300 flex-shrink-0 ${activePage === i ? 'w-2.5 h-2.5 bg-brand-gold scale-110 shadow-[0_0_10px_rgba(197,163,93,0.6)]' : 'w-2 h-2 bg-brand-gold/30 hover:bg-brand-gold/60'}`} aria-label={`Go to page ${i + 1}`} />
                        ))}
                    </div>
                </div>
            </div>
        )}

        {reviews.length === 0 && <div className="text-center py-20 text-gray-400 italic bg-white/50 rounded-[2rem] border border-dashed border-gray-300">Все още няма споделени отзиви. Бъдете първият!</div>}

        {showAddReviewModal && (
          <AnimatePresence>
            <ReviewModal key="add-review" onClose={() => setShowAddReviewModal(false)} />
          </AnimatePresence>
        )}
        {selectedReview && (
          <AnimatePresence>
            <ReviewDetailModal key="review-detail" review={selectedReview} onClose={() => setSelectedReview(null)} />
          </AnimatePresence>
        )}
      
      </div>
    </section>
  );
}