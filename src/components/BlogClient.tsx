"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { 
  ArrowLeft, MapPin, Image as ImageIcon, Calendar, 
  ArrowDown, ArrowRight, User, Clock, ChevronLeft, ChevronRight, 
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Link from 'next/link';
import ImageModal from '@/components/ImageModal';
import ShareButtons from '@/components/ShareButtons';

export default function BlogClient({ post }: { post: any }) {
  const router = useRouter();
  
  const [relatedTours, setRelatedTours] = useState<any[]>([]);
  const [suggestedPosts, setSuggestedPosts] = useState<any[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isHeroLoaded, setIsHeroLoaded] = useState(false);
  const [isGalleryExpanded, setIsGalleryExpanded] = useState(false);

  const galleryRef = useRef<HTMLDivElement>(null);
  const suggestedScrollRef = useRef<HTMLDivElement>(null); // Реф за слайдъра на статиите

  const handleGoBack = () => {
    router.back();
  };

  useEffect(() => {
    if (post) {
       const images = post.gallery 
           ? post.gallery.split(',').map((img: string) => img.trim()).filter(Boolean)
           : [];
       setGalleryImages(images);

       if (post.relatedCountry) {
         const fetchRelatedTours = async () => {
             try {
                 // country is stored as an array in Firestore, so use array-contains
                 const countryToSearch = Array.isArray(post.relatedCountry)
                   ? post.relatedCountry[0]
                   : post.relatedCountry;

                 const qTours = query(
                   collection(db, "tours"),
                   where("country", "array-contains", countryToSearch),
                   where("status", "==", "public"),
                   limit(4)
                 );
                 const toursSnap = await getDocs(qTours);
                 setRelatedTours(toursSnap.docs.map(d => ({ id: d.id, ...d.data() })));
             } catch (e) { console.error(e); }
         };
         fetchRelatedTours();
       }

       const fetchSuggestedPosts = async () => {
          try {
              let recommendedDocs: any[] = [];
              const TARGET_COUNT = 4;

              if (post.relatedCountry) {
                  const qByCountry = query(
                      collection(db, "posts"),
                      where("relatedCountry", "==", post.relatedCountry),
                      limit(10)
                  );
                  const countrySnap = await getDocs(qByCountry);
                  const countryPosts = countrySnap.docs.map(d => ({ id: d.id, ...d.data() }));
                  recommendedDocs = [...countryPosts.filter((p: any) => p.id !== post.id)];
              }

              if (recommendedDocs.length < TARGET_COUNT) {
                  const qRecent = query(
                      collection(db, "posts"), 
                      orderBy("createdAt", "desc"),
                      limit(10) 
                  );
                  const recentSnap = await getDocs(qRecent);
                  const recentPosts = recentSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                  recommendedDocs = [...recommendedDocs, ...recentPosts];
              }

              const uniquePosts = recommendedDocs.filter((p, index, self) => 
                  index === self.findIndex((t) => t.id === p.id) && 
                  p.id !== post.id 
              );

              setSuggestedPosts(uniquePosts.slice(0, TARGET_COUNT));
          } catch (error) {
              console.error("Error fetching suggested posts:", error);
          }
       };
       fetchSuggestedPosts();
    }
  }, [post]);

  // Функция за скролиране на предложените статии
  const scrollSuggested = (direction: 'left' | 'right') => {
    if (suggestedScrollRef.current) {
      const { current } = suggestedScrollRef;
      const scrollAmount = current.clientWidth; 
      current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const scrollToGallery = () => {
    galleryRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!post) return <div className="min-h-screen flex items-center justify-center font-serif italic text-brand-dark text-2xl animate-pulse">Зареждане...</div>;

  const postDate = post.createdAt ? new Date(post.createdAt).toLocaleDateString('bg-BG') : new Date().toLocaleDateString('bg-BG');
  const hasScroll = relatedTours.length > 2;

  return (
    <main className="min-h-screen bg-gray-50 selection:bg-brand-gold selection:text-white">
      
      {/* --- HERO SECTION --- */}
      <div className="relative w-full h-[70vh] bg-brand-dark overflow-hidden">
          <img 
            src={post.coverImg || post.img} 
            className={`w-full h-full object-cover transition-all duration-1000 ease-out ${isHeroLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`} 
            alt={post.title} 
            onLoad={() => setIsHeroLoaded(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
          
          <div className="absolute inset-0 flex flex-col justify-end p-6 pb-20 md:pb-24">
              <div className="container mx-auto px-4 sm:px-6 relative z-10">
                  <button 
                    onClick={handleGoBack} 
                    className="inline-flex items-center gap-2 text-white/90 font-bold uppercase text-[10px] tracking-widest mb-8 hover:text-brand-gold transition-colors bg-white/10 backdrop-blur-md px-5 py-2 rounded-full border border-white/10 hover:bg-white/20"
                  >
                      <ArrowLeft size={14}/> Обратно към блога
                  </button>
                  
                  <div className="flex flex-wrap items-center gap-4 text-brand-gold text-xs font-bold uppercase tracking-widest mb-4">
                      {post.category && (
                        <span className="bg-brand-gold text-brand-dark px-3 py-1 rounded-md">{post.category}</span>
                      )}
                      <span className="flex items-center gap-1"><Calendar size={14}/> {postDate}</span>
                      {post.readTime && (
                         <span className="flex items-center gap-1 text-gray-300 border-l border-gray-500 pl-4"><Clock size={14}/> {post.readTime} мин.</span>
                      )}
                  </div>

                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif italic text-white drop-shadow-2xl max-w-5xl leading-tight mb-8 animate-in slide-in-from-bottom duration-700">
                      {post.title}
                  </h1>
              </div>
          </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-20 -mt-16 pb-20">
        
        {/* LEFT COLUMN: CONTENT */}
        <div className="lg:col-span-8 bg-white p-6 md:p-12 rounded-[3rem] shadow-2xl border border-gray-100">
            {post.author && (
              <div className="flex items-center gap-3 border-b border-gray-100 pb-6 mb-8">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                      <User size={20} />
                  </div>
                  <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Автор</p>
                      <p className="font-serif italic text-brand-dark">{post.author}</p>
                  </div>
              </div>
            )}

            {post.excerpt && (
              <div className="mb-8 p-8 bg-[#fffdf5] rounded-3xl border-l-4 border-brand-gold">
                 <p className="text-xl md:text-2xl text-brand-dark font-serif italic leading-relaxed opacity-90">
                     "{post.excerpt}"
                 </p>
              </div>
            )}

            {galleryImages.length > 0 && (
                <button 
                   onClick={scrollToGallery}
                   className="lg:hidden w-full mb-10 flex items-center justify-center gap-2 bg-brand-gold/10 text-brand-dark py-4 rounded-2xl font-bold uppercase text-xs tracking-widest border border-brand-gold/20 hover:bg-brand-gold hover:text-white transition-all group"
                >
                   <ImageIcon size={18} /> Виж галерията ({galleryImages.length})
                   <ArrowDown size={14} className="group-hover:translate-y-1 transition-transform" />
                </button>
            )}

            <div className="w-full max-w-full">
               <div 
                 className="prose prose-lg max-w-none w-full
                 prose-headings:font-serif prose-headings:text-brand-dark prose-headings:font-bold
                 prose-p:text-gray-600 prose-p:leading-8 prose-p:mb-6 prose-p:text-[18px]
                 prose-a:text-brand-gold prose-a:no-underline prose-a:font-bold
                 prose-img:rounded-3xl prose-img:shadow-xl prose-img:w-full prose-img:my-8
                 prose-ul:list-disc prose-ul:pl-6
                 break-words overflow-hidden" 
                 dangerouslySetInnerHTML={{ __html: post.content }}
               />
            </div>

            {galleryImages.length > 0 && (
                <div ref={galleryRef} className="mt-20 pt-12 border-t border-gray-100 scroll-mt-32">
                    <h3 className="flex items-center gap-3 font-serif italic text-3xl text-brand-dark mb-10">
                        <ImageIcon className="text-brand-gold w-8 h-8"/> Галерия
                    </h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {galleryImages.map((img, idx) => {
                            // Логика за скриване: на мобилни (под md) скриваме всичко след 4-тата снимка, ако не е разпънато
                            const isHiddenOnMobile = !isGalleryExpanded && idx >= 4;

                            return (
                                <div 
                                  key={idx} 
                                  className={`relative w-full aspect-square rounded-2xl overflow-hidden shadow-lg group cursor-pointer hover:shadow-2xl transition-all 
                                    ${isHiddenOnMobile ? 'hidden md:block' : 'block'}`}
                                  onClick={() => setSelectedImageIndex(idx)}
                                >
                                    <img 
                                      src={img} 
                                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                      alt={`Gallery ${idx}`}
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <ImageIcon className="text-white w-8 h-8" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* БУТОН ЗА РАЗПЪВАНЕ (САМО ЗА МОБИЛНИ) */}
                    {galleryImages.length > 4 && (
                        <div className="md:hidden flex justify-center mt-8">
                            <button 
                                onClick={() => setIsGalleryExpanded(!isGalleryExpanded)}
                                className="flex items-center gap-2 bg-brand-gold/10 text-brand-dark px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-widest border border-brand-gold/20 hover:bg-brand-gold hover:text-white transition-all"
                            >
                                {isGalleryExpanded ? (
                                    <>Скрий снимките <ChevronUp size={16}/></>
                                ) : (
                                    <>Виж още {galleryImages.length - 4} снимки <ChevronDown size={16}/></>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* 👇 ПРЕДЛОЖЕНИЯ ЗА ОЩЕ ЧЕТЕНЕ (СЛАЙДЪР ЗА МОБИЛНИ) */}
            {suggestedPosts.length > 0 && (
                <div className="mt-20 pt-12 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-2xl font-serif font-bold text-brand-dark flex items-center gap-3">
                            <span className="w-8 h-1 bg-brand-gold rounded-full"></span>
                            Още от нашия пътеводител
                        </h3>
                        
                        {/* Бутони за навигация (скрити на десктоп) */}
                        <div className="flex md:hidden gap-2">
                            <button 
                                onClick={() => scrollSuggested('left')}
                                className="p-2 rounded-full bg-gray-100 text-brand-dark hover:bg-brand-gold hover:text-white transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button 
                                onClick={() => scrollSuggested('right')}
                                className="p-2 rounded-full bg-gray-100 text-brand-dark hover:bg-brand-gold hover:text-white transition-colors"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>

                    <div 
                        ref={suggestedScrollRef}
                        className="flex md:grid md:grid-cols-2 gap-8 overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-hide pb-4"
                    >
                        {suggestedPosts.map((sPost) => (
                            <Link 
                                key={sPost.id} 
                                href={`/blog/${sPost.slug || sPost.id}`} 
                                className="min-w-full md:min-w-0 snap-center group flex flex-col gap-4"
                            >
                                <div className="relative h-48 w-full rounded-2xl overflow-hidden shadow-md">
                                    <img 
                                        src={sPost.coverImg || sPost.img} 
                                        alt={sPost.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                    />
                                    {sPost.relatedCountry && (
                                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-[10px] font-bold uppercase text-brand-dark shadow-sm border border-gray-100">
                                            {sPost.relatedCountry}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-serif font-bold text-xl text-brand-dark mb-2 group-hover:text-brand-gold transition-colors leading-tight">
                                        {sPost.title}
                                    </h4>
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                                        {sPost.excerpt}
                                    </p>
                                    <span className="text-brand-gold text-xs font-bold uppercase tracking-wider flex items-center gap-1 group-hover:gap-2 transition-all">
                                        Прочети <ArrowRight size={12}/>
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

        </div>

        {/* RIGHT COLUMN: SIDEBAR */}
        <div className="lg:col-span-4 h-full pt-6 lg:pt-0">
             <div className="sticky top-32 space-y-6 self-start">
               
               {galleryImages.length > 0 && (
                   <button 
                       onClick={scrollToGallery}
                       className="hidden lg:flex w-full items-center justify-between bg-white p-6 rounded-[2rem] shadow-lg border border-brand-gold/20 hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer shrink-0"
                   >
                       <span className="font-serif italic text-xl text-brand-dark">Виж галерията</span>
                       <div className="w-12 h-12 bg-brand-gold text-brand-dark rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                           <ImageIcon size={20} />
                       </div>
                   </button>
               )}

               {relatedTours.length > 0 ? (
                   <div className="bg-brand-dark text-white p-8 rounded-[3rem] shadow-2xl border border-brand-gold/10 overflow-hidden relative shrink-0">
                       <div className="absolute top-0 right-0 w-40 h-40 bg-brand-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                       
                       <div className="relative z-10">
                           <div className="flex items-center gap-2 mb-6 text-brand-gold">
                               <MapPin size={20}/>
                               <span className="text-xs font-black uppercase tracking-widest">Дестинация: {post.relatedCountry}</span>
                           </div>
                           <h3 className="font-serif italic text-3xl mb-4 text-white">Вдъхновени ли сте?</h3>
                           <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                           Открихме тези ексклузивни програми за {post.relatedCountry}, които може да ви харесат:
                           </p>
                           
                           <div className={`space-y-4 ${hasScroll ? 'max-h-[240px] overflow-y-auto pr-2 custom-scrollbar' : ''}`}>
                               {relatedTours.map((tour: any) => (
                                   <Link key={tour.id} href={`/tour/${tour.tourId || tour.id}`} className="block bg-white/5 hover:bg-white/10 hover:scale-[1.02] transition-all p-4 rounded-2xl border border-white/10 group shadow-md">
                                               <div className="flex items-center gap-4">
                                                   <img src={tour.img} className="w-16 h-16 rounded-xl object-cover shadow-sm" alt=""/>
                                                   <div>
                                                       <h4 className="font-bold text-sm leading-tight mb-2 group-hover:text-brand-gold transition-colors line-clamp-2">{tour.title}</h4>
                                                       <p className="text-xs text-brand-gold font-mono bg-brand-gold/10 inline-block px-2 py-1 rounded-md">{tour.price}</p>
                                                   </div>
                                               </div>
                                   </Link>
                               ))}
                           </div>
                       </div>
                   </div>
               ) : (
                   <div className="bg-white p-10 rounded-[3rem] border border-brand-gold/10 text-center shadow-xl shrink-0">
                       <div className="w-16 h-16 bg-brand-gold/10 text-brand-gold rounded-full flex items-center justify-center mx-auto mb-6">
                           <MapPin size={32}/>
                       </div>
                       <h3 className="font-serif italic text-2xl text-brand-dark mb-4">Мечтаете за пътуване?</h3>
                       <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                           Ние можем да изготвим индивидуална програма специално за вас и вашите изисквания.
                       </p>
                       <Link href="/contacts" className="inline-block w-full bg-brand-dark text-white px-8 py-4 rounded-xl font-bold uppercase text-xs hover:bg-brand-gold hover:text-brand-dark transition-all shadow-lg tracking-widest">
                           Свържете се с нас
                       </Link>
                   </div>
               )}

               <div className="bg-white p-8 rounded-[2.5rem] text-center border border-gray-100 shadow-md shrink-0">
                   <ShareButtons url={typeof window !== 'undefined' ? window.location.href : ''} title={post.title} />
               </div>

            </div>
        </div>
      </div>
      
      <ImageModal 
        isOpen={selectedImageIndex !== null}
        image={selectedImageIndex !== null ? galleryImages[selectedImageIndex] : ''}
        onClose={() => setSelectedImageIndex(null)}
        onNext={() => selectedImageIndex !== null && setSelectedImageIndex((selectedImageIndex + 1) % galleryImages.length)}
        onPrev={() => selectedImageIndex !== null && setSelectedImageIndex((selectedImageIndex - 1 + galleryImages.length) % galleryImages.length)}
        hasNext={galleryImages.length > 1}
        hasPrev={galleryImages.length > 1}
      />

    </main>
  );
}