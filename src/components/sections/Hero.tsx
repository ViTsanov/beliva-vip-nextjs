"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronDown, MapPin } from 'lucide-react';
import Image from 'next/image';

const heroImages = [
  "/hero/thailand.webp",
  "/hero/australia.webp",
  "/hero/china.webp",
  "/hero/peru.webp", 
  "/hero/singapore.webp",
];

export default function Hero() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true); // Маркираме, че компонентът е зареден на клиента
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative h-screen w-full overflow-hidden flex items-center justify-center bg-black">
      
      {/* --- КРИТИЧНА ЗОНА ЗА LCP --- */}
      <div className="absolute inset-0 z-0">
        
        {/* 1. СТАТИЧНА СНИМКА (Винаги в HTML)
            Тя е видима веднага, без да чака Framer Motion или JS състояния.
        */}
        <Image
          src={heroImages[0]} // Първата снимка
          alt="Beliva VIP Tours - Екзотични почивки"
          fill
          className="object-cover"
          priority={true} // Най-висок приоритет
          sizes="100vw"
          quality={85}
          fetchPriority="high" // Браузърът я тегли първа
          loading="eager"
        />

        {/* 2. АНИМИРАНИ СНИМКИ (Появяват се само след смяна)
            Те се рендират отгоре върху статичната само когато индексът е > 0.
        */}
        <AnimatePresence mode='popLayout'>
          {currentImageIndex !== 0 && (
            <motion.div
              key={currentImageIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5 }}
              className="absolute inset-0 w-full h-full z-10"
            >
               <Image
                  src={heroImages[currentImageIndex]}
                  alt="Beliva VIP"
                  fill
                  className="object-cover"
                  sizes="100vw"
                  quality={85}
               />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Затъмняване и градиенти */}
        <div className="absolute inset-0 bg-black/20 z-20" /> 
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90 z-20" />
      </div>

      {/* --- СЪДЪРЖАНИЕ --- */}
      <div className="relative z-30 container mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <h1 className="font-serif text-5xl md:text-7xl lg:text-9xl text-white mb-8 leading-tight drop-shadow-2xl">
            Изживейте <br/>
            <span className="italic text-brand-gold">Изключителното</span>
          </h1>
          
          <p className="text-gray-200 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-light tracking-wide leading-relaxed drop-shadow-md">
            Бутикови пътешествия и ексклузивни маршрути, създадени специално за Вас. 
            Открийте света с класа и лично отношение.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
            <a 
              href="#tours-grid"
              className="group relative px-8 py-4 bg-brand-gold text-brand-dark font-bold rounded-full overflow-hidden transition-transform hover:scale-105 shadow-[0_0_20px_rgba(212,175,55,0.4)] w-full md:w-auto inline-flex items-center justify-center"
            >
              РАЗГЛЕДАЙ ОФЕРТИ <ArrowRight size={18} className="ml-2" />
            </a>

            <a 
              href="#top-destinations"
              className="group px-8 py-4 bg-white/10 backdrop-blur-md border border-white/30 text-white hover:bg-white hover:text-brand-dark font-bold rounded-full transition-all w-full md:w-auto"
            >
              <MapPin size={18} className="inline mr-2" /> ТОП ДЕСТИНАЦИИ
            </a>
          </div>
        </motion.div>
      </div>

      {/* Индикатори */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-40 flex gap-3">
        {heroImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImageIndex(index)}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              index === currentImageIndex ? 'w-10 bg-brand-gold' : 'w-2 bg-white/30 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </section>
  );
}