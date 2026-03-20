"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ITour, IPost } from "@/types";
import { CheckCircle2, ScrollText, FileText, Flame, ChevronLeft, ChevronRight } from 'lucide-react';
import ShareButtons from '@/components/ShareButtons';

interface TourSidebarProps {
  tour: ITour;
  relatedPosts: IPost[];
  onOpenInquiry: () => void; 
  onOpenInclusions: () => void; 
  onOpenDocuments: () => void;  
}

export default function TourSidebar({ tour, relatedPosts, onOpenInquiry, onOpenInclusions, onOpenDocuments}: TourSidebarProps) {
  const isPromoActive = tour.isPromo && tour.discountPrice;

  // Стейт за слайдера с блогове
  const [currentPostIndex, setCurrentPostIndex] = useState(0);

  // Автоматично сменяне на блога на всеки 5 секунди
  useEffect(() => {
    if (!relatedPosts || relatedPosts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPostIndex((prev) => (prev + 1) % relatedPosts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [relatedPosts]);

  const nextPost = () => setCurrentPostIndex((prev) => (prev + 1) % relatedPosts.length);
  const prevPost = () => setCurrentPostIndex((prev) => (prev - 1 + relatedPosts.length) % relatedPosts.length);

  return (
    <>
      {/* СВИТ И КОМПАКТЕН РЕЗЕРВАЦИОНЕН БЛОК */}
      <div className="bg-brand-dark p-6 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <h3 className="text-xl font-serif italic mb-4 relative z-10 text-center">Резервирайте сега</h3>
        
        <div className="space-y-3 relative z-10">
          
          {isPromoActive && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-100 py-2 px-3 rounded-xl mb-3 text-center">
                  <p className="text-[10px] uppercase tracking-widest font-bold flex items-center justify-center">
                      <Flame size={12} className="text-red-400 mr-1" /> Ограничена промоция
                  </p>
                  {tour.discountAmount && (
                      <p className="text-[9px] mt-0.5 opacity-80">
                          Спестявате {tour.discountAmount} {tour.price.replace(/[0-9.,\s]/g, '') || '€'}!
                      </p>
                  )}
              </div>
          )}

          <button 
            onClick={onOpenInquiry} 
            className="w-full bg-gradient-to-r from-brand-gold to-yellow-600 text-white py-3.5 rounded-xl font-black uppercase text-[13px] tracking-widest hover:shadow-lg hover:scale-[1.02] transition-all shadow-md border border-white/10"
          >
            Изпрати запитване
          </button>
          
          <div className="grid grid-cols-2 gap-2">
              <button onClick={onOpenInclusions} className="flex flex-col items-center justify-center gap-1.5 bg-white/5 border border-white/10 py-3 rounded-xl hover:bg-white/10 transition-all group">
                <CheckCircle2 size={16} className="text-emerald-400 group-hover:scale-110 transition-transform"/>
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-300">Какво включва</span>
              </button>
              <button onClick={onOpenDocuments} className="flex flex-col items-center justify-center gap-1.5 bg-white/5 border border-white/10 py-3 rounded-xl hover:bg-white/10 transition-all group">
                <ScrollText size={16} className="text-brand-gold group-hover:scale-110 transition-transform"/>
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-300">Документи</span>
              </button>
          </div>

          {tour.pdfUrl && (
            <a href={tour.pdfUrl} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 border border-white/20 py-3 rounded-xl font-bold text-[10px] uppercase hover:bg-white hover:text-brand-dark transition-all mt-1">
              <FileText size={14}/> Изтегли PDF
            </a>
          )}
        </div>
      </div>

      {/* 🔄 АВТОМАТИЧЕН СЛАЙДЕР ЗА БЛОГОВЕ */}
      {relatedPosts && relatedPosts.length > 0 && (
          <div className="relative bg-white p-1.5 rounded-[2rem] shadow-xl border border-gray-100 group overflow-hidden">
              
              <div 
                  className="flex transition-transform duration-700 ease-in-out"
                  style={{ transform: `translateX(-${currentPostIndex * 100}%)` }}
              >
                  {relatedPosts.map(post => (
                      <div key={post.id} className="w-full flex-none">
                          <Link href={`/blog/${post.slug || post.id}`} className="block w-full">
                              
                              <div className="relative h-44 overflow-hidden rounded-[1.5rem] bg-gray-50">
                                  <img 
                                      src={post.coverImg || post.img || '/placeholder.jpg'} 
                                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                      alt={post.title} 
                                  />
                                  <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-sm border border-white/20">
                                      Пътеводител
                                  </div>
                              </div>

                              <div className="p-4 text-center">
                                  {/* Тук вече се показва истинското ИМЕ на статията, а не държавата */}
                                  <h4 className="font-serif font-bold text-brand-dark text-base group-hover:text-brand-gold transition-colors line-clamp-2">
                                      {post.title}
                                  </h4>
                                  <span className="text-[10px] text-gray-400 uppercase mt-2 block font-bold tracking-wider group-hover:text-brand-gold transition-colors">
                                      Прочети статията &rarr;
                                  </span>
                              </div>
                          </Link>
                      </div>
                  ))}
              </div>

              {/* Навигация (Показва се само ако има повече от 1 статия) */}
              {relatedPosts.length > 1 && (
                  <>
                      {/* Стрелки - ВЕЧЕ СА ВИДИМИ НА МОБИЛЕН ТЕЛЕФОН! (opacity-100 md:opacity-0) */}
                      <button 
                          onClick={(e) => { e.preventDefault(); prevPost(); }} 
                          className="absolute left-3 top-24 -translate-y-1/2 w-9 h-9 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-brand-dark shadow-lg hover:bg-brand-gold hover:text-white transition-all z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                      >
                          <ChevronLeft size={20} />
                      </button>
                      <button 
                          onClick={(e) => { e.preventDefault(); nextPost(); }} 
                          className="absolute right-3 top-24 -translate-y-1/2 w-9 h-9 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-brand-dark shadow-lg hover:bg-brand-gold hover:text-white transition-all z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                      >
                          <ChevronRight size={20} />
                      </button>

                      {/* Индикатори (Точици) вградени вътре в самата снимка */}
                      <div className="absolute top-[10.5rem] left-1/2 -translate-x-1/2 flex gap-1.5 z-10 drop-shadow-md">
                          {relatedPosts.map((_, i) => (
                              <button 
                                  key={i} 
                                  onClick={(e) => { e.preventDefault(); setCurrentPostIndex(i); }}
                                  className={`h-1.5 rounded-full transition-all shadow-md ${i === currentPostIndex ? 'w-5 bg-brand-gold' : 'w-1.5 bg-white/70 hover:bg-white'}`}
                                  aria-label={`Виж статия ${i + 1}`}
                              />
                          ))}
                      </div>
                  </>
              )}
          </div>
      )}

      {/* БУТОНИ ЗА СПОДЕЛЯНЕ */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-gray-100 text-center">
          <ShareButtons url={typeof window !== 'undefined' ? window.location.href : ''} title={tour.title} />
      </div>
    </>
  );
}