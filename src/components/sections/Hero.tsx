"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronDown, MapPin } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image'; // Увери се, че имаш този импорт

const heroImages = [
  "/hero/australia.webp",
  "/hero/china.webp",
  "/hero/peru.webp", 
  "/hero/singapore.webp",
  "/hero/thailand.webp"
];

export default function Hero() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === heroImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 8000); // 👈 ПРОМЯНА: 10000ms = 10 секунди (по-бавно)

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative h-screen w-full overflow-hidden flex items-center justify-center bg-black">
      
      {/* --- ФОНОВ СЛАЙДЪР --- */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode='popLayout'>
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5 }} // 👈 ПРОМЯНА: 2.5s за по-плавно преливане
            className="absolute inset-0 w-full h-full"
          >
             <Image
                src={heroImages[currentImageIndex]}
                alt="Hero Background"
                fill
                className="object-cover"
                priority={true}
                sizes="100vw"
                fetchPriority="high"
             />
          </motion.div>
        </AnimatePresence>
        
        {/* 👇 ПРОМЯНА: Затъмняване */}
        {/* bg-black/60 прави снимките по-тъмни, за да се чете текстът */}
        <div className="absolute inset-0 bg-black/20" /> 
        
        {/* Допълнителен градиент отдолу и отгоре за дълбочина */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90" />
      </div>

      {/* --- СЪДЪРЖАНИЕ --- */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
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
            
            {/* 1. БУТОН: РАЗГЛЕДАЙ ОФЕРТИ */}
            <a 
              href="#tours-grid"
              className="group relative px-8 py-4 bg-brand-gold text-brand-dark font-bold rounded-full overflow-hidden transition-transform hover:scale-105 shadow-[0_0_20px_rgba(212,175,55,0.4)] w-full md:w-auto inline-flex items-center justify-center cursor-pointer"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative flex items-center justify-center gap-2">
                РАЗГЛЕДАЙ ОФЕРТИ <ArrowRight size={18} />
              </span>
            </a>

            {/* 2. БУТОН: ТОП ДЕСТИНАЦИИ */}
            <a 
              href="#top-destinations"
              className="group px-8 py-4 bg-white/10 backdrop-blur-md border border-white/30 text-white hover:bg-white hover:text-brand-dark font-bold rounded-full transition-all w-full md:w-auto hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] inline-flex items-center justify-center cursor-pointer"
            >
              <span className="flex items-center justify-center gap-2">
                <MapPin size={18} /> ТОП ДЕСТИНАЦИИ
              </span>
            </a>
          </div>
        </motion.div>
      </div>

      {/* Индикатори */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex gap-3">
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

      {/* Скрол индикатор */}
      <motion.div 
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-white/50 cursor-pointer hover:text-brand-gold transition-colors"
      >
        <a href="#top-destinations">
            <ChevronDown size={32} />
        </a>
      </motion.div>

    </section>
  );
}