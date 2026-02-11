"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUp, Compass, Clock as ClockIcon, X, CheckCircle2, XCircle } from 'lucide-react';

import { ITour, IPost } from "@/types";
import TopDestinations from "@/components/TopDestinations";
import ImageModal from '@/components/ImageModal';

// Импортираме новите компоненти
import TourHero from './tour/TourHero';
import TourTabs from './tour/TourTabs';
import TourSidebar from './tour/TourSidebar';
import SimilarTours from './tour/SimilarTours'
import InquiryModal from './tour/InquiryModal'; // Внасяме го тук;

interface TourClientProps {
  tourData: ITour;
  relatedPostData: IPost | null;
  id: string;
}

export default function TourClient({ tourData, relatedPostData, id }: TourClientProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [showInclusions, setShowInclusions] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);

  // Parse images properly
  const galleryImages = Array.isArray(tourData.images) 
    ? tourData.images 
    : (typeof tourData.images === 'string' ? (tourData.images as string).split(',').map((s: string) => s.trim()) : []);

  // Favorites Logic
  useEffect(() => {
    if (tourData) {
        const stored = localStorage.getItem('beliva_favorites');
        if (stored) {
            const favorites = JSON.parse(stored);
            if (favorites.some((f: any) => f.id === (tourData.tourId || id))) {
                setIsFavorite(true);
            }
        }
    }
  }, [tourData, id]);

    // Помощна функция за списъци
  const getListItems = (data?: string | string[]): string[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.split('\n').filter(item => item.trim() !== '');
  };

  const toggleFavorite = () => {
    const stored = localStorage.getItem('beliva_favorites');
    let favorites = stored ? JSON.parse(stored) : [];
    const currentId = tourData.tourId || id; 
    if (isFavorite) {
        favorites = favorites.filter((f: any) => f.id !== currentId);
        setIsFavorite(false);
    } else {
        favorites.push({
            id: currentId,
            title: tourData.title,
            img: tourData.img,
            price: tourData.price,
            country: tourData.country,
            date: tourData.date
        });
        setIsFavorite(true);
    }
    localStorage.setItem('beliva_favorites', JSON.stringify(favorites));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("favoritesUpdated"));
  };

  // Scroll Listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) setShowScrollTop(true);
      else setShowScrollTop(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!tourData) return <div className="min-h-screen flex items-center justify-center font-serif italic text-brand-dark text-2xl animate-pulse">Зареждане на дестинацията...</div>;

  if (tourData.status === 'archived') {
    return (
        <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-6 text-center">
            <div className="max-w-lg w-full bg-white p-12 rounded-[2rem] shadow-2xl border-t-4 border-gray-400">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-8 text-gray-400">
                    <ClockIcon size={48} />
                </div>
                <h1 className="text-3xl font-serif italic text-gray-800 mb-4">Офертата не е активна</h1>
                <p className="text-gray-500 mb-8 leading-relaxed">
                    Тази екскурзия вече е проведена или свалена от продажба. <br/>
                    Моля, разгледайте нашите актуални предложения.
                </p>
                <Link href="/" className="inline-flex items-center gap-2 bg-brand-dark text-white px-8 py-4 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-brand-gold hover:text-brand-dark transition-all shadow-lg">
                    <Compass size={18} /> Виж Актуални Оферти
                </Link>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20 text-left selection:bg-brand-gold selection:text-white relative">
      
      <TourHero 
        tour={tourData} 
        isFavorite={isFavorite} 
        toggleFavorite={toggleFavorite} 
      />

      <div className="container mx-auto px-4 sm:px-6 -mt-20 relative z-30">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          <div className="lg:col-span-8 space-y-12">
            <TourTabs 
                tour={tourData} 
                galleryImages={galleryImages} 
                onImageClick={setSelectedImageIndex}
            />
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-28 space-y-6">
                <TourSidebar
                  tour={tourData} 
                  relatedPost={relatedPostData} 
                  onOpenInquiry={() => setShowInquiryModal(true)} 
                  onOpenInclusions={() => setShowInclusions(true)}
                  onOpenDocuments={() => setShowDocuments(true)}
                />
            </div>
          </div>
          
        </div>
      </div>

      <button 
        onClick={scrollToTop}
        className={`fixed bottom-24 right-6 z-40 p-4 bg-brand-gold text-white rounded-full shadow-2xl transition-all duration-300 lg:hidden ${
            showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
        }`}
      >
        <span className="absolute inset-0 rounded-full border border-white/30 animate-ping"></span>
        <ArrowUp size={24} />
      </button>

      

      <SimilarTours currentTour={tourData} />

      <TopDestinations />
      
      <ImageModal 
        isOpen={selectedImageIndex !== null}
        image={selectedImageIndex !== null ? galleryImages[selectedImageIndex] : ''}
        onClose={() => setSelectedImageIndex(null)}
        onNext={() => selectedImageIndex !== null && setSelectedImageIndex((selectedImageIndex + 1) % galleryImages.length)}
        onPrev={() => selectedImageIndex !== null && setSelectedImageIndex((selectedImageIndex - 1 + galleryImages.length) % galleryImages.length)}
        hasNext={galleryImages.length > 1}
        hasPrev={galleryImages.length > 1}
      />

      <InquiryModal 
        isOpen={showInquiryModal} 
        onClose={() => setShowInquiryModal(false)}
        tourId={tourData.id}
        tourTitle={tourData.title}
        tourPrice={tourData.price}
      />

      {/* 2. Inclusion Modal */}
      {showInclusions && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 md:p-12 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowInclusions(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-brand-dark hover:text-white transition-all">
                <X size={20} />
            </button>
            <h2 className="text-3xl font-serif italic mb-8 text-brand-dark text-center">Пакетни услуги</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
                <h4 className="flex items-center gap-2 text-emerald-800 font-black uppercase text-[10px] tracking-widest mb-6 border-b border-emerald-200 pb-2"><CheckCircle2 size={16} /> Включва</h4>
                <ul className="space-y-3">
                  {getListItems(tourData.included).map((item, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2"><span className="text-emerald-500 font-bold">✓</span> {item}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-rose-50/50 p-6 rounded-3xl border border-rose-100">
                <h4 className="flex items-center gap-2 text-rose-800 font-black uppercase text-[10px] tracking-widest mb-6 border-b border-rose-200 pb-2"><XCircle size={16} /> Не включва</h4>
                <ul className="space-y-3">
                  {getListItems(tourData.notIncluded || tourData.excluded).map((item, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2"><span className="text-rose-400 font-bold">✕</span> {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Documents Modal */}
      {showDocuments && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md text-left">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 md:p-12 relative shadow-2xl">
            <button onClick={() => setShowDocuments(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-brand-dark hover:text-white transition-all">
                <X size={20} />
            </button>
            <h2 className="text-3xl font-serif italic mb-8 text-brand-dark text-center">Необходими документи</h2>
            <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
              <ul className="space-y-4">
                {getListItems(tourData.documents).map((item, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-4">
                    <div className="w-6 h-6 bg-brand-gold/20 text-brand-dark rounded-full flex items-center justify-center shrink-0 font-bold text-xs">{i+1}</div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
        
      <style jsx global>{`.inquiry-input { width: 100%; padding: 1rem 1.2rem; background: #f3f4f6; border: 2px solid transparent; border-radius: 1rem; outline: none; font-size: 0.95rem; transition: 0.3s; font-weight: 500; color: #1f2937; } .inquiry-input:focus { border-color: #c5a35d; background: #fff; box-shadow: 0 4px 20px rgba(197, 163, 93, 0.1); } .inquiry-input::placeholder { color: #9ca3af; }`}</style>
    </div>
  );
}