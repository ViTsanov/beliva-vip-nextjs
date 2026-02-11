"use client";

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, MapPin, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// 👇 Тук махаме hardcoded 'count'. Оставяме само конфигурацията.
// ИМЕТО (name) трябва да съвпада точно с полето 'country' в базата данни!
const DESTINATIONS = [
  { name: "Тайланд", image: "/hero/singapore.webp" },
  { name: "Египет", image: "/hero/peru.webp" },
  { name: "ОАЕ", image: "/hero/thailand.webp" },
  { name: "Италия", image: "/hero/china.webp" },
  { name: "Мавриций", image: "/hero/australia.webp" },
  { name: "Малдиви", image: "/hero/thailand.webp" },
  { name: "Испания", image: "/hero/china.webp" }, // Пример за още
];

export default function TopDestinations() {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // State за бройките: { "Дубай": 5, "Египет": 3 ... }
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // 1. Извличане и преброяване на офертите
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const q = query(collection(db, "tours"), where("status", "==", "public"));
        const snapshot = await getDocs(q);
        
        const newCounts: Record<string, number> = {};

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const country = data.country; // Увери се, че полето в базата се казва 'country'
          
          if (country) {
            // Ако държавата вече я има в обекта, увеличаваме с 1, иначе я създаваме с 1
            newCounts[country] = (newCounts[country] || 0) + 1;
          }
        });

        setCounts(newCounts);
      } catch (error) {
        console.error("Error fetching tour counts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

  const handleSelect = (country: string) => {
    router.push(`/?country=${encodeURIComponent(country)}`, { scroll: false });
    
    setTimeout(() => {
        const grid = document.getElementById('tours-grid');
        if (grid) {
            const y = grid.getBoundingClientRect().top + window.scrollY - 150;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    }, 100);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
        const { current } = scrollContainerRef;
        const scrollAmount = 300; 
        if (direction === 'left') {
            current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        } else {
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    }
  };

  return (
    <section id="top-destinations" className="py-16 bg-white relative z-20 scroll-mt-28">
      <div className="container mx-auto px-6">
        
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
            <div>
                <span className="text-brand-gold text-xs font-black uppercase tracking-[0.25em] block mb-2">Вдъхновение</span>
                <h2 className="text-4xl md:text-5xl font-serif italic text-brand-dark">Топ Дестинации</h2>
            </div>

            <div className="hidden md:flex gap-2">
                <button onClick={() => scroll('left')} className="p-3 rounded-full border border-gray-200 hover:bg-brand-dark hover:text-white hover:border-brand-dark transition-all">
                    <ChevronLeft size={24} />
                </button>
                <button onClick={() => scroll('right')} className="p-3 rounded-full border border-gray-200 hover:bg-brand-dark hover:text-white hover:border-brand-dark transition-all">
                    <ChevronRight size={24} />
                </button>
            </div>
        </div>

        <div 
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory custom-scrollbar scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
            {DESTINATIONS.map((dest, index) => {
                const count = counts[dest.name] || 0; // Взимаме бройката от стейта

                return (
                    <motion.div 
                        key={dest.name}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => handleSelect(dest.name)}
                        className="min-w-[280px] md:min-w-[300px] h-[400px] relative group rounded-[2rem] overflow-hidden cursor-pointer snap-start border border-gray-100"
                    >
                        <img 
                            src={dest.image} 
                            alt={dest.name} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                        <div className="absolute bottom-0 left-0 w-full p-6 text-white translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                            <div className="flex items-center gap-2 mb-2 text-brand-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-y-2 group-hover:translate-y-0">
                                <MapPin size={14} /> 
                                <span className="text-[10px] font-bold uppercase tracking-widest">Разгледай</span>
                            </div>
                            
                            <h3 className="text-3xl font-serif font-bold italic mb-1">{dest.name}</h3>
                            
                            <div className="flex items-center justify-between border-t border-white/20 pt-3 mt-2">
                                <span className="text-xs font-medium text-gray-300">
                                    {/* Автоматичен текст */}
                                    {loading ? '...' : `${count} ${count === 1 ? 'оферта' : 'оферти'}`}
                                </span>
                                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-brand-gold group-hover:text-brand-dark transition-colors">
                                    <ArrowRight size={16} />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>

      </div>
    </section>
  );
}