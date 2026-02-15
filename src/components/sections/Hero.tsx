"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ArrowRight, MapPin } from 'lucide-react';
import Image from 'next/image';

const heroImages = [
  "/hero/thailand.webp",
  "/hero/australia.webp",
  "/hero/china.webp",
  "/hero/peru.webp", 
  "/hero/singapore.webp",
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.8, ease: "easeOut" }
  },
};

export default function Hero() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative h-[100dvh] w-full overflow-hidden flex items-center justify-center bg-black">
      
      {/* --- ФОН --- */}
      <div className="absolute inset-0 z-0">
        <Image
          src={heroImages[0]}
          alt="Beliva VIP Tours"
          fill
          className="object-cover"
          priority={true}
          sizes="100vw"
          quality={75}
          fetchPriority="high"
          loading="eager"
        />

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
                  alt="Beliva VIP Hero images"
                  fill
                  className="object-cover"
                  sizes="100vw"
                  quality={85}
               />
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="absolute inset-0 bg-black/50 z-20" /> 
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 z-20" />
      </div>

      {/* --- СЪДЪРЖАНИЕ --- */}
      <div className="relative z-30 container mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
        >
          {/* Заглавие */}
          <motion.h1 
            variants={itemVariants}
            className="font-serif text-white mb-6 md:mb-8 leading-tight drop-shadow-2xl flex flex-col items-center justify-center"
          >
            <span className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl block mb-1 md:mb-2 font-medium tracking-wide">
              Изживейте своята
            </span>
            
            {/* ПРОМЯНА: Сменена дума с "Мечтата" */}
            {/* Тъй като думата е по-кратка, можем да ползваме по-голям размер (18vw) */}
            <span className="italic text-brand-gold text-[18vw] sm:text-7xl md:text-9xl lg:text-[11rem] whitespace-nowrap leading-none pb-2 font-bold">
              Мечта
            </span>
          </motion.h1>
          
          {/* Текст */}
          <motion.p 
            variants={itemVariants}
            className="text-gray-100 text-sm md:text-xl max-w-xl md:max-w-2xl mx-auto mb-8 md:mb-12 font-light tracking-wide leading-relaxed drop-shadow-md px-2"
          >
           Пътешествия и ексклузивни маршрути, подбрани специално за Вас. 
            Открийте света с класа и лично отношение.
          </motion.p>

          {/* Бутони */}
          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-6 px-4"
          >
            <a 
              href="#tours-grid"
              className="group relative px-6 py-3 md:px-8 md:py-4 bg-brand-gold text-brand-dark text-sm md:text-base font-bold rounded-full overflow-hidden transition-transform hover:scale-105 shadow-[0_0_20px_rgba(212,175,55,0.4)] w-full sm:w-auto inline-flex items-center justify-center" aria-label="Разгледай дестинации"
            >
              РАЗГЛЕДАЙ ОФЕРТИ <ArrowRight size={16} className="ml-2"/>
            </a>

            <a 
              href="#top-destinations"
              className="group px-6 py-3 md:px-8 md:py-4 bg-white/10 backdrop-blur-md border border-white/30 text-white text-sm md:text-base hover:bg-white hover:text-brand-dark font-bold rounded-full transition-all duration-300 w-full sm:w-auto inline-flex items-center justify-center " aria-label="ТОП дестинации"
            >
              <MapPin size={16} className="inline mr-2" /> ТОП ДЕСТИНАЦИИ
            </a>
          </motion.div>
        </motion.div>
      </div>

      {/* Индикатори */}
      <div className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 z-40 flex gap-3">
        {heroImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImageIndex(index)}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              index === currentImageIndex ? 'w-8 md:w-10 bg-brand-gold' : 'w-2 bg-white/30 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </section>
  );
}