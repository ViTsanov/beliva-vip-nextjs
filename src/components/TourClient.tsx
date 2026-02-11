"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, limit, getDocs } from 'firebase/firestore'; 
import emailjs from '@emailjs/browser';
import Image from 'next/image';
import { 
  Calendar, Clock, Globe, Euro, FileText, CheckCircle2, 
  ChevronDown, ChevronUp, XCircle, X, ScrollText, Send, 
  CalendarDays, AlertCircle, Heart, Clock as ClockIcon, 
  Compass, Image as ImageIcon, MapPin, ArrowUp, ArrowLeft, ArrowRight 
} from 'lucide-react';

import TopDestinations from "@/components/TopDestinations";

// Увери се, че тези компоненти съществуват в папката components
import ShareButtons from '@/components/ShareButtons';
import ImageModal from '@/components/ImageModal';

// Взимаме ключовете от Environment Variables
const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "";
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "";
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "";

interface TourProps {
  tourData: any;
  relatedPostData: any;
  id: string;
}

export default function TourClient({ tourData, relatedPostData, id }: TourProps) {
  const router = useRouter();
  
  const [tour, setTour] = useState<any>(tourData);
  const [relatedPost, setRelatedPost] = useState<any>(relatedPostData);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHeroLoaded, setIsHeroLoaded] = useState(false);
  
  const [showInclusionModal, setShowInclusionModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  
  const [isFavorite, setIsFavorite] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<any>({});
  
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const [formData, setFormData] = useState({
    user_name: '', user_email: '', user_phone: '',
    user_message: '', tour_title: tourData?.title || '', tour_price: tourData?.price || ''
  });

  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // 👇 НОВ STATE ЗА ПОДОБНИ ОФЕРТИ
  const [similarTours, setSimilarTours] = useState<any[]>([]);

  // 👇 ЛОГИКА ЗА ИЗВЛИЧАНЕ НА ПОДОБНИ ОФЕРТИ
  useEffect(() => {
    const fetchSimilarTours = async () => {
      if (!tourData) return;

      try {
        const toursRef = collection(db, "tours");
        let combinedTours: any[] = [];

        // 1. Търсим от същата държава (приоритет)
        const countryQuery = query(
          toursRef, 
          where("status", "==", "public"),
          where("country", "==", tourData.country),
          limit(4) 
        );
        const countrySnapshot = await getDocs(countryQuery);
        const countryTours = countrySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((t: any) => t.tourId !== id && t.id !== id);

        combinedTours = [...countryTours];

        // 2. Ако нямаме достатъчно (по-малко от 3), допълваме от континента
        if (combinedTours.length < 3) {
          const continentQuery = query(
            toursRef,
            where("status", "==", "public"),
            where("continent", "==", tourData.continent),
            limit(10)
          );
          const continentSnapshot = await getDocs(continentQuery);
          const continentTours = continentSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((t: any) => t.tourId !== id && t.id !== id && t.country !== tourData.country); 

          combinedTours = [...combinedTours, ...continentTours];
        }

        // Взимаме само първите 3 резултата
        setSimilarTours(combinedTours.slice(0, 3));

      } catch (error) {
        console.error("Error fetching similar tours:", error);
      }
    };

    fetchSimilarTours();
  }, [tourData, id]);

  // Scroll Listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoBack = () => {
    router.back(); // Това връща потребителя там, откъдето е дошъл, със запазен скрол
  };

  // Favorites Logic
  useEffect(() => {
    if (tour) {
        const stored = localStorage.getItem('beliva_favorites');
        if (stored) {
            const favorites = JSON.parse(stored);
            if (favorites.some((f: any) => f.id === (tour.tourId || id))) {
                setIsFavorite(true);
            }
        }
    }
  }, [tour, id]);

  const toggleFavorite = () => {
    const stored = localStorage.getItem('beliva_favorites');
    let favorites = stored ? JSON.parse(stored) : [];
    const currentId = tour.tourId || id; 
    if (isFavorite) {
        favorites = favorites.filter((f: any) => f.id !== currentId);
        setIsFavorite(false);
    } else {
        favorites.push({
            id: currentId,
            title: tour.title,
            img: tour.img,
            price: tour.price,
            country: tour.country,
            date: tour.date
        });
        setIsFavorite(true);
    }
    localStorage.setItem('beliva_favorites', JSON.stringify(favorites));
    // Изпращаме събитие, за да може навигацията да се обнови веднага
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("favoritesUpdated"));
  };

  // Form Validation
  const validate = () => {
    let newErrors: any = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/; 
    if (!formData.user_name) newErrors.name = "Моля, въведете име";
    if (!emailRegex.test(formData.user_email)) newErrors.email = "Невалиден имейл";
    if (!phoneRegex.test(formData.user_phone)) newErrors.phone = "10 цифри";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Inquiry Submit
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitStatus('sending');
    try {
        // 1. Запис в Firebase (за Админ панела)
        await addDoc(collection(db, "inquiries"), {
            tourId: tour.tourId || id,
            tourTitle: formData.tour_title,
            clientName: formData.user_name,
            clientEmail: formData.user_email,
            clientPhone: formData.user_phone,
            message: formData.user_message,
            status: 'new',
            createdAt: serverTimestamp(),
            isRead: false
        });

        // 2. Изпращане на имейл (чрез EmailJS)
        const templateParams = {
            name: "Beliva VIP Admin",
            time: new Date().toLocaleString('bg-BG'),
            tour_title: formData.tour_title,
            tour_price: formData.tour_price,
            user_name: formData.user_name,
            user_phone: formData.user_phone,
            user_email: formData.user_email,
            user_message: formData.user_message
        };
        await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
        
        setSubmitStatus('success');
        setTimeout(() => {
            closeInquiryModal();
        }, 3000);
    } catch (error) {
        console.error("Грешка:", error);
        setSubmitStatus('error');
    }
  };

  const closeInquiryModal = () => {
      setShowInquiryModal(false);
      setSubmitStatus('idle'); 
      setFormData(prev => ({...prev, user_message: ''}));
      setErrors({});
  };

  if (!tour) return <div className="min-h-screen flex items-center justify-center font-serif italic text-brand-dark text-2xl animate-pulse">Зареждане на дестинацията...</div>;

  if (tour.status === 'archived') {
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

  const galleryImages = Array.isArray(tour.images) ? tour.images : (typeof tour.images === 'string' ? tour.images.split(',').map((s: string) => s.trim()) : []);
  const formatList = (text: string) => text ? text.split('\n').filter(item => item.trim() !== '') : [];
  const hasMultipleDates = tour.dates && tour.dates.length > 1;

  return (
    <div className="bg-gray-50 min-h-screen pb-20 text-left selection:bg-brand-gold selection:text-white relative">
      
      {/* --- HERO SECTION --- */}
      <div className="relative h-[80vh] w-full bg-brand-dark overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent z-10 opacity-90"></div>
        <img 
          src={tour.img} 
          className="w-full h-full object-cover" 
          alt={tour.title} 
        />
        
        <button 
            onClick={handleGoBack} 
            className="absolute top-28 left-6 z-40 p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all lg:hidden shadow-lg border border-white/20"
        >
            <ArrowLeft size={24} />
        </button>

        <button 
            onClick={toggleFavorite}
            className="absolute top-28 right-6 md:top-24 md:right-12 p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full hover:bg-white hover:text-red-500 transition-all group z-30 shadow-lg"
            title={isFavorite ? "Премахни от любими" : "Добави в любими"}
        >
            <Heart 
                size={24} 
                className={`transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white group-hover:text-red-500'}`}
            />
        </button>

        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-6">
          <div className="mb-6 animate-in slide-in-from-bottom duration-700 fade-in">
            <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] shadow-2xl backdrop-blur-md border border-white/20 ${
              tour.groupStatus === 'confirmed' ? 'bg-emerald-600 text-white' : 
              tour.groupStatus === 'last-places' ? 'bg-amber-600 text-white' : 
              tour.groupStatus === 'sold-out' ? 'bg-rose-600 text-white' : 'bg-brand-gold text-brand-dark'
            }`}>
              {tour.groupStatus === 'confirmed' ? '● Потвърдена група' : 
               tour.groupStatus === 'last-places' ? '● Последни места' : 
               tour.groupStatus === 'sold-out' ? '● Изчерпана' : '● Оформяща се група'}
            </span>
          </div>
          
          <h1 className="text-4xl md:text-7xl lg:text-8xl font-serif italic text-white drop-shadow-2xl mb-8 max-w-5xl leading-tight animate-in slide-in-from-bottom duration-1000 delay-100 fade-in">
            {tour.title}
          </h1>

          {tour.route && (
             <div className="flex items-center gap-2 text-brand-gold/90 bg-black/60 backdrop-blur-sm px-6 py-3 rounded-full border border-white/10 animate-in slide-in-from-bottom duration-1000 delay-200 fade-in">
                <MapPin size={16} />
                <span className="font-bold tracking-[0.15em] uppercase text-[11px] md:text-xs">
                  {tour.route}
                </span>
             </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 -mt-20 relative z-30">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* --- MAIN CONTENT --- */}
          <div className="lg:col-span-8 space-y-12">
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {!hasMultipleDates && (
                <div className="bg-white p-5 rounded-3xl shadow-xl border-b-4 border-brand-dark group hover:-translate-y-1 transition-all">
                  <div className="mb-2 text-gray-400 group-hover:text-brand-gold transition-colors"><Calendar size={24}/></div>
                  <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">Дата</p>
                  <p className="font-bold text-brand-dark text-sm md:text-lg">{tour.date}</p>
                </div>
              )}
              
              <div className={`bg-white p-5 rounded-3xl shadow-xl border-b-4 border-brand-dark group hover:-translate-y-1 transition-all ${hasMultipleDates ? 'md:col-span-2' : ''}`}>
                <div className="mb-2 text-gray-400 group-hover:text-brand-gold transition-colors"><Clock size={24}/></div>
                <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">Продължителност</p>
                <p className="font-bold text-brand-dark text-sm md:text-lg">
                  {tour.duration} {tour.nights && `/ ${tour.nights} Нощувки`}
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl shadow-xl border-b-4 border-brand-dark group hover:-translate-y-1 transition-all">
                <div className="mb-2 text-gray-400 group-hover:text-brand-gold transition-colors"><Globe size={24}/></div>
                <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">Държава</p>
                <p className="font-bold text-brand-dark text-sm md:text-lg">{tour.country}</p>
              </div>

              <div className="bg-brand-dark p-5 rounded-3xl shadow-xl border-b-4 border-brand-gold group hover:-translate-y-1 transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Euro size={64} className="text-white"/></div>
                <div className="mb-2 text-brand-gold"><Euro size={24}/></div>
                <p className="text-[10px] uppercase font-black text-brand-gold/70 tracking-widest mb-1">Цена от</p>
                <p className="font-bold text-white text-lg md:text-xl">{tour.price}</p>
              </div>
            </div>

            {hasMultipleDates && (
              <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-brand-gold"></div>
                <div className="flex items-center justify-center gap-2 mb-6 text-brand-dark">
                    <CalendarDays size={24} className="text-brand-gold"/>
                    <span className="text-lg font-bold font-serif italic">Налични дати за пътуване</span>
                </div>
                <div className="flex flex-wrap justify-center gap-3 relative z-10">
                    {tour.dates.sort().map((d: string, index: number) => (
                      <span key={index} className="px-6 py-3 bg-gray-50 border border-gray-200 rounded-xl text-brand-dark font-bold text-sm shadow-sm hover:bg-brand-dark hover:text-brand-gold transition-all cursor-default">
                          {d.split('-').reverse().join('.')}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {tour.generalInfo && (
              <div className="bg-[#fffdf5] p-8 md:p-12 rounded-[2.5rem] shadow-lg border border-brand-gold/10 relative">
                <div className="absolute top-6 left-8 text-6xl text-brand-gold/10 font-serif italic">"</div>
                <h2 className="text-3xl font-serif italic mb-6 text-brand-dark relative z-10">Впечатления</h2>
                <div className={`relative transition-all duration-700 overflow-hidden ${!isExpanded ? 'max-h-40' : 'max-h-[2000px]'}`}>
                  <p className="leading-relaxed whitespace-pre-wrap text-[18px] text-gray-700 font-light relative z-10">{tour.generalInfo}</p>
                  {!isExpanded && <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#fffdf5] to-transparent z-20"></div>}
                </div>
                <button onClick={() => setIsExpanded(!isExpanded)} className="mt-6 flex items-center gap-2 text-brand-dark hover:text-brand-gold font-bold text-xs uppercase tracking-widest transition-colors relative z-20">
                  {isExpanded ? <>Скрий <ChevronUp size={14}/></> : <>Прочети цялото описание <ChevronDown size={14}/></>}
                </button>
              </div>
            )}

            <div className="bg-white p-4 md:p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-dark via-brand-gold to-brand-dark"></div>
              
              <div className="text-center mb-12 mt-4">
                <span className="text-brand-gold text-xs font-black uppercase tracking-[0.3em] block mb-3">Ден по ден</span>
                <h2 className="text-4xl md:text-5xl font-serif italic text-brand-dark">Програма</h2>
              </div>

              <div className="space-y-8 relative">
                <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-brand-gold/30 md:left-[27px]"></div>

                {tour.itinerary?.map((day: any) => (
                  <div key={day.day} className="relative pl-14 md:pl-20 group">
                    <div className="absolute left-0 top-0 w-10 h-10 md:w-14 md:h-14 bg-brand-dark text-brand-gold rounded-full flex items-center justify-center font-serif font-bold text-lg md:text-xl shadow-lg border-4 border-white z-10 group-hover:bg-brand-gold group-hover:text-brand-dark transition-colors duration-300">
                        {day.day}
                    </div>
                    
                    <div className="bg-gray-50 hover:bg-white p-6 md:p-8 rounded-3xl border-l-4 border-brand-gold shadow-sm hover:shadow-xl transition-all duration-300">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2 block">Ден {day.day}</span>
                        <h3 className="text-xl md:text-2xl font-bold text-brand-dark mb-4 group-hover:text-brand-gold transition-colors">{day.title}</h3>
                        <p className="leading-7 text-[16px] text-gray-600 font-normal">
                            {day.content}
                        </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {galleryImages.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-3xl font-serif italic text-brand-dark pl-4 border-l-4 border-brand-gold">Галерия</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {galleryImages.map((url: string, index: number) => (
                    <div 
                      key={index} 
                      className="aspect-square rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all cursor-pointer relative group"
                      onClick={() => setSelectedImageIndex(index)}
                    >
                      <img src={url} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ImageIcon className="text-white w-10 h-10 drop-shadow-md" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-28 space-y-6">
              
              <div className="bg-brand-dark p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                
                <h3 className="text-2xl font-serif italic mb-6 relative z-10 text-center">Резервирайте сега</h3>
                
                <div className="space-y-4 relative z-10">
                  <button onClick={() => setShowInquiryModal(true)} className="w-full bg-gradient-to-r from-brand-gold to-yellow-600 text-white py-4 rounded-2xl font-black uppercase text-[15px] tracking-widest hover:shadow-lg hover:scale-[1.02] transition-all shadow-md border border-white/10">
                    Изпрати запитване
                  </button>
                  
                  <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setShowInclusionModal(true)} className="flex flex-col items-center justify-center gap-2 bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-all group">
                        <CheckCircle2 size={20} className="text-emerald-400 group-hover:scale-110 transition-transform"/>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">Какво включва</span>
                      </button>
                      <button onClick={() => setShowDocumentsModal(true)} className="flex flex-col items-center justify-center gap-2 bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-all group">
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
                         <img src={relatedPost.coverImg || relatedPost.img} className="w-full h-full object-cover" alt="" />
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

      {showInquiryModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-8 md:p-12 relative shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
             <button onClick={closeInquiryModal} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-brand-dark hover:text-white transition-colors"><X size={20}/></button>
             {submitStatus === 'success' ? (
                <div className="text-center py-12">
                    <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-6"><CheckCircle2 size={48} /></div>
                    <h2 className="text-3xl font-serif italic mb-2 text-brand-dark">Благодарим ви!</h2>
                    <p className="text-gray-500">Вашето запитване е прието успешно.</p>
                </div>
             ) : submitStatus === 'error' ? (
                 <div className="text-center py-12">
                    <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6"><AlertCircle size={48} /></div>
                    <h2 className="text-3xl font-serif italic mb-2 text-brand-dark">Грешка</h2>
                    <p className="text-gray-500 mb-6">Не успяхме да изпратим формата.</p>
                    <button onClick={() => setSubmitStatus('idle')} className="text-brand-dark font-bold underline">Опитайте пак</button>
                 </div>
             ) : (
                <>
                    <h2 className="text-3xl font-serif italic mb-2 text-brand-dark">Направете запитване</h2>
                    <div className="h-1 w-20 bg-brand-gold mb-6 rounded-full"></div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-8 flex items-center gap-2"><Globe size={12}/> {tour.title}</p>
                    <form onSubmit={handleSendEmail} className="space-y-4">
                    <div>
                        <input placeholder="Вашето Име" className={`inquiry-input ${errors.name ? 'border-red-500 bg-red-50' : ''}`} onChange={e => setFormData({...formData, user_name: e.target.value})} />
                        {errors.name && <p className="text-[10px] text-red-500 mt-1 font-bold uppercase ml-2">{errors.name}</p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                        <input placeholder="Имейл" className={`inquiry-input ${errors.email ? 'border-red-500 bg-red-50' : ''}`} onChange={e => setFormData({...formData, user_email: e.target.value})} />
                        {errors.email && <p className="text-[10px] text-red-500 mt-1 font-bold uppercase ml-2">{errors.email}</p>}
                        </div>
                        <div>
                        <input placeholder="Телефон" className={`inquiry-input ${errors.phone ? 'border-red-500 bg-red-50' : ''}`} maxLength={10} onChange={e => setFormData({...formData, user_phone: e.target.value})} />
                        {errors.phone && <p className="text-[10px] text-red-500 mt-1 font-bold uppercase ml-2">{errors.phone}</p>}
                        </div>
                    </div>
                    <textarea placeholder="Вашите въпроси или предпочитания..." className="inquiry-input h-32 resize-none" onChange={e => setFormData({...formData, user_message: e.target.value})}></textarea>
                    <button type="submit" disabled={submitStatus === 'sending'} className="w-full bg-brand-dark text-white py-4 rounded-xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-brand-gold hover:text-brand-dark transition-all shadow-xl disabled:opacity-50">
                        {submitStatus === 'sending' ? 'ИЗПРАЩАНЕ...' : <><Send size={16}/> ИЗПРАТИ СЕГА</>}
                    </button>
                    </form>
                </>
             )}
           </div>
        </div>
      )}

      {showInclusionModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 md:p-12 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowInclusionModal(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-brand-dark hover:text-white transition-colors"><X size={20} /></button>
            <h2 className="text-3xl font-serif italic mb-8 text-brand-dark text-center">Пакетни услуги</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
                <h4 className="flex items-center gap-2 text-emerald-800 font-black uppercase text-xs tracking-widest mb-6 border-b border-emerald-200 pb-2"><CheckCircle2 size={16} /> Цената включва</h4>
                <ul className="space-y-3">{formatList(tour.included).map((item: string, i: number) => (<li key={i} className="text-[15px] text-gray-700 flex items-start gap-3"><span className="text-emerald-500 mt-1 font-bold">✓</span> {item}</li>))}</ul>
              </div>
              <div className="bg-rose-50/50 p-6 rounded-3xl border border-rose-100">
                <h4 className="flex items-center gap-2 text-rose-800 font-black uppercase text-xs tracking-widest mb-6 border-b border-rose-200 pb-2"><XCircle size={16} /> Цената не включва</h4>
                <ul className="space-y-3">{formatList(tour.notIncluded).map((item: string, i: number) => (<li key={i} className="text-[15px] text-gray-700 flex items-start gap-3"><span className="text-rose-400 mt-1 font-bold">✕</span> {item}</li>))}</ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDocumentsModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 md:p-12 relative shadow-2xl">
            <button onClick={() => setShowDocumentsModal(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-brand-dark hover:text-white transition-colors"><X size={20} /></button>
            <h2 className="text-3xl font-serif italic mb-8 text-brand-dark text-center">Необходими документи</h2>
            <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
              <ul className="space-y-4">{formatList(tour.documents).map((item: string, i: number) => (<li key={i} className="text-[16px] text-gray-700 flex items-start gap-4"><div className="w-6 h-6 bg-brand-gold/20 text-brand-dark rounded-full flex items-center justify-center shrink-0 font-bold text-xs">{i+1}</div>{item}</li>))}</ul>
            </div>
          </div>
        </div>
      )}

      <ImageModal 
        isOpen={selectedImageIndex !== null}
        image={selectedImageIndex !== null ? galleryImages[selectedImageIndex] : ''}
        onClose={() => setSelectedImageIndex(null)}
        onNext={() => selectedImageIndex !== null && setSelectedImageIndex((selectedImageIndex + 1) % galleryImages.length)}
        onPrev={() => selectedImageIndex !== null && setSelectedImageIndex((selectedImageIndex - 1 + galleryImages.length) % galleryImages.length)}
        hasNext={galleryImages.length > 1}
        hasPrev={galleryImages.length > 1}
      />

      {/* 👇 НОВА СЕКЦИЯ: ПОДОБНИ ОФЕРТИ (Преди TopDestinations) */}
      {similarTours.length > 0 && (
        <section className="mt-24 pt-16 border-t border-brand-gold/10 container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
            <div>
              <span className="text-brand-gold font-bold uppercase tracking-widest text-xs mb-2 block">
                Още вдъхновение
              </span>
              <h2 className="text-3xl md:text-4xl font-serif text-brand-dark">
                Вижте още от <span className="italic text-brand-gold">{tourData.country}</span> и региона
              </h2>
            </div>
            <Link 
              href={`/?continent=${encodeURIComponent(tourData.continent)}`}
              className="group flex items-center gap-2 text-brand-dark font-bold hover:text-brand-gold transition-colors"
            >
              Всички предложения <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 ">
            {similarTours.map((tour) => (
              <Link 
                key={tour.id} 
                href={`/tour/${tour.tourId || tour.id}`}
                className="group bg-white rounded-[2rem] overflow-hidden border border-brand-gold/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
              >
                {/* Снимка */}
                <div className="relative h-60 overflow-hidden">
                  <Image
                    src={tour.img}
                    alt={tour.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider mb-1 text-brand-gold">
                      <MapPin size={12} /> {tour.country}
                    </div>
                    <p className="font-serif text-xl">{tour.title}</p>
                  </div>
                </div>

                {/* Информация */}
                <div className="p-6 flex flex-col flex-grow">
                  {/* Дата и Цена */}
                  <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-50">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Дата</span>
                        <div className="flex items-center gap-1 text-sm font-bold text-gray-700">
                            <Calendar size={14} className="text-brand-gold" />
                            {tour.date ? tour.date.split('-').reverse().join('.') : 'Очаквайте'}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Цена от</span>
                        <div className="text-xl font-serif font-bold text-brand-gold">
                            {tour.price}
                        </div>
                      </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <TopDestinations />

      <style jsx global>{`.inquiry-input { width: 100%; padding: 1rem 1.2rem; background: #f3f4f6; border: 2px solid transparent; border-radius: 1rem; outline: none; font-size: 0.95rem; transition: 0.3s; font-weight: 500; color: #1f2937; } .inquiry-input:focus { border-color: #c5a35d; background: #fff; box-shadow: 0 4px 20px rgba(197, 163, 93, 0.1); } .inquiry-input::placeholder { color: #9ca3af; }`}</style>
    </div>
  );
}