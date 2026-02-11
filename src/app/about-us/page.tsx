"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Quote, MapPin } from 'lucide-react'; 
// import SEO from '@/components/SEO'; // Ако ползваш твоя компонент, разкоментирай го
// В Next.js обикновено Metadata се слага в Server Components, но тук ще сложим заглавието ръчно

export default function AboutPage() {
  const [isHeroLoaded, setIsHeroLoaded] = useState(false);

  // Данни за Google (Schema)
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "mainEntity": {
      "@type": "TravelAgency",
      "name": "Beliva VIP Tour",
      "foundingDate": "2019",
      "founder": {
        "@type": "Person",
        "name": "Паулина Алексиева"
      },
      "description": "Лицензиран туроператор с лично отношение."
    }
  };

  return (
    <main className="bg-white min-h-screen">
      
      {/* 1. SEO & SCHEMA (Ръчно добавяне за Client Component) */}
      <title>За Нас и Екипът | Beliva VIP Tour</title>
      <meta name="description" content="Информация за Beliva VIP Tour. Запознайте се с екипа зад вашите мечтани пътувания. Над 15 години опит и лично отношение." />
      
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      
      {/* HERO SECTION */}
      <section className="relative h-[60vh] flex items-center justify-center bg-brand-dark overflow-hidden">
        <div className="absolute inset-0 bg-black/40 z-10" /> {/* Потъмняване */}
        <img 
          src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80" 
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${
            isHeroLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
          }`} 
          onLoad={() => setIsHeroLoaded(true)}
          alt="Mountain Background" 
        />
        <div className="relative z-20 text-center text-white px-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="text-5xl md:text-6xl lg:text-8xl font-bold mb-4 font-serif"
          >
            Нашият <span className="text-brand-gold italic">Екип</span>
          </motion.h1>
          <p className="text-sm md:text-xl text-brand-gold uppercase tracking-[0.4em] font-light">Beliva VIP Tour</p>
        </div>
      </section>

      {/* MAIN CONTENT SECTION */}
      <section className="py-20 container mx-auto px-6">
        
        {/* ЗАГЛАВИЕ */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-6">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-brand-dark leading-tight">
              Повече от 15 години <br /> 
              <span className="text-brand-gold italic">споделяме света с Вас</span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed">
                Зад всяко перфектно пътуване стои не само добра организация, но и сърце. Запознайте се с хората, които превръщат мечтите ви в реалност.
            </p>
        </div>

        {/* 👥 ЕКИП */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-24">
            
            {/* ЧОВЕК 1 (Полина) */}
            <div className="flex flex-col gap-6 group">
                <div className="relative overflow-hidden rounded-[3rem] shadow-2xl aspect-[3/4] border-[10px] border-white">
                    <div className="absolute inset-0 bg-brand-gold/10 opacity-0 group-hover:opacity-100 transition-opacity z-10"></div>
                    <img 
                        src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800" 
                        alt="Паулина Алексиева" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                </div>
                <div className="text-center lg:text-left space-y-2">
                    <h3 className="text-3xl font-serif font-bold text-brand-dark">Полина Белива</h3>
                    <p className="text-brand-gold text-xs font-black uppercase tracking-widest mb-4">Основател & Управител</p>
                    <p className="text-gray-600 leading-relaxed text-sm">
                        С над 15 години опит в туризма, Полина създава Beliva VIP Tour с една цел - да предложи не просто екскурзии, а преживявания. Всяка фирма партньор и всеки хотел преминават през нейния строг личен подбор.
                    </p>
                </div>
            </div>

            {/* ЧОВЕК 2 (Партньор/Колега) */}
            <div className="flex flex-col gap-6 group lg:mt-20"> {/* lg:mt-20 за раздвижен ефект */}
                <div className="relative overflow-hidden rounded-[3rem] shadow-2xl aspect-[3/4] border-[10px] border-white">
                    <div className="absolute inset-0 bg-brand-gold/10 opacity-0 group-hover:opacity-100 transition-opacity z-10"></div>
                    <img 
                        src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800" 
                        alt="Травел Експерт" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                </div>
                <div className="text-center lg:text-left space-y-2">
                    <h3 className="text-3xl font-serif font-bold text-brand-dark">Иван Петров</h3>
                    <p className="text-brand-gold text-xs font-black uppercase tracking-widest mb-4">Травел Експерт</p>
                    <p className="text-gray-600 leading-relaxed text-sm">
                        Експерт по екзотични дестинации и логистика. Човекът, който се грижи всеки детайл от вашето пътуване да бъде изпипан до съвършенство, за да можете вие просто да се наслаждавате.
                    </p>
                </div>
            </div>

        </div>

        {/* 📜 ЦИТАТ */}
        <div className="relative py-16 px-6 md:px-20 bg-[#fffcf5] rounded-[3rem] text-center border border-brand-gold/10 mb-20 shadow-sm">
            <Quote className="absolute top-8 left-8 text-brand-gold/20 rotate-180" size={60} />
            <Quote className="absolute bottom-8 right-8 text-brand-gold/20" size={60} />
            
            <figure className="relative z-10">
                <blockquote className="text-2xl md:text-3xl lg:text-4xl font-serif italic text-brand-dark leading-relaxed">
                    "Пътуването е единственото нещо, за което даваш пари, а ставаш по-богат."
                </blockquote>
                <figcaption className="mt-6 text-brand-gold text-xs font-bold uppercase tracking-widest">
                    — Философия на Beliva VIP Tour
                </figcaption>
            </figure>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-gray-100 pt-16">
            <div className="text-center group">
                <p className="text-4xl md:text-5xl font-bold text-brand-gold mb-2 font-serif group-hover:scale-110 transition-transform">15+</p>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Години опит</p>
            </div>
            <div className="text-center group">
                <p className="text-4xl md:text-5xl font-bold text-brand-gold mb-2 font-serif group-hover:scale-110 transition-transform">100%</p>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Лично отношение</p>
            </div>
            <div className="text-center group">
                <p className="text-4xl md:text-5xl font-bold text-brand-gold mb-2 font-serif group-hover:scale-110 transition-transform">50+</p>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Дестинации</p>
            </div>
            <div className="text-center group">
                <p className="text-4xl md:text-5xl font-bold text-brand-gold mb-2 font-serif group-hover:scale-110 transition-transform">24/7</p>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Подкрепа</p>
            </div>
        </div>

      </section>
    </main>
  );
}