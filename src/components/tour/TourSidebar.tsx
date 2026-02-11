"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ITour, IPost } from "@/types";
import { CheckCircle2, ScrollText, FileText, XCircle, X } from 'lucide-react';
import ShareButtons from '@/components/ShareButtons';

interface TourSidebarProps {
  tour: ITour;
  relatedPost: IPost | null;
  onOpenInquiry: () => void; // Добавяме нов проп
  onOpenInclusions: () => void; // Нов проп
  onOpenDocuments: () => void;  // Нов проп
}

export default function TourSidebar({ tour, relatedPost, onOpenInquiry, onOpenInclusions, onOpenDocuments}: TourSidebarProps) {
  const [showInclusionModal, setShowInclusionModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);

  // Helper за обработка на списъци (стринг или масив)
  const getListItems = (data?: string | string[]): string[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.split('\n').filter(item => item.trim() !== '');
  };

  const includedItems = getListItems(tour.included);
  // Проверяваме и двете възможни полета за "не е включено"
  const notIncludedItems = getListItems(tour.notIncluded || tour.excluded);
  const documentItems = getListItems(tour.documents);

  return (
    <>
      <div className="bg-brand-dark p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <h3 className="text-2xl font-serif italic mb-6 relative z-10 text-center">Резервирайте сега</h3>
        
        <div className="space-y-4 relative z-10">
            <button 
            onClick={onOpenInquiry} 
            className="w-full bg-gradient-to-r from-brand-gold to-yellow-600 text-white py-4 rounded-2xl font-black uppercase text-[15px] tracking-widest hover:shadow-lg hover:scale-[1.02] transition-all shadow-md border border-white/10"
          >
            Изпрати запитване
          </button>
          
          <div className="grid grid-cols-2 gap-3">
              {/* Бутони, които само викат функциите от родителя */}
              <button onClick={onOpenInclusions} className="flex flex-col items-center justify-center gap-2 bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-all group">
                <CheckCircle2 size={20} className="text-emerald-400 group-hover:scale-110 transition-transform"/>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">Какво включва</span>
              </button>
              <button onClick={onOpenDocuments} className="flex flex-col items-center justify-center gap-2 bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-all group">
                <ScrollText size={20} className="text-brand-gold group-hover:scale-110 transition-transform"/>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">Документи</span>
              </button>
          </div>

          {tour.pdfUrl && (
            <a href={tour.pdfUrl} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 border border-white/20 py-4 rounded-2xl font-bold text-xs uppercase hover:bg-white hover:text-brand-dark transition-all">
              <FileText size={16}/> Изтегли PDF
            </a>
          )}
        </div>
      </div>

      {relatedPost && (
          <Link href={`/blog/${relatedPost.slug || relatedPost.id}`} className="block bg-white p-1 rounded-[2.5rem] shadow-lg group hover:-translate-y-1 transition-transform">
              <div className="relative h-40 overflow-hidden rounded-[2rem]">
                  {/* Ползваме coverImg или img, като проверяваме дали съществуват */}
                  <img src={relatedPost.coverImg || relatedPost.img || '/placeholder.jpg'} className="w-full h-full object-cover" alt="" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="bg-white/20 backdrop-blur-md text-white px-4 py-1 rounded-full text-xs font-bold uppercase border border-white/30">Пътеводител</span>
                  </div>
              </div>
              <div className="p-6 text-center">
                  <h4 className="font-serif font-bold text-brand-dark text-lg group-hover:text-brand-gold transition-colors">Научете повече за {tour.country}</h4>
                  <span className="text-xs text-gray-400 uppercase mt-2 block font-bold tracking-wider">Прочети статията &rarr;</span>
              </div>
          </Link>
      )}

      <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-gray-100 text-center">
          <ShareButtons url={typeof window !== 'undefined' ? window.location.href : ''} title={tour.title} />
      </div>
    </>
  );
}