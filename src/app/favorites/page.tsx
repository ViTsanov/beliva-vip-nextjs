"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Trash2, MapPin, Calendar, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('beliva_favorites');
    if (stored) {
      setFavorites(JSON.parse(stored));
    }
  }, []);

  const removeFavorite = (id: string) => {
    const newFavs = favorites.filter(f => f.id !== id);
    setFavorites(newFavs);
    localStorage.setItem('beliva_favorites', JSON.stringify(newFavs));
    
    // Събитие, за да се обнови бройката в Навигацията веднага
    window.dispatchEvent(new Event("favoritesUpdated"));
    window.dispatchEvent(new Event("storage"));
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-gray-50 pt-32 pb-20">
      <div className="container mx-auto px-6">
        
        <div className="text-center mb-16">
          <span className="text-brand-gold font-bold tracking-[0.2em] uppercase text-xs mb-3 block">
            Вашият избор
          </span>
          <h1 className="text-4xl md:text-5xl font-serif italic text-brand-dark">
            Любими Оферти ({favorites.length})
          </h1>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[3rem] shadow-sm border border-gray-100 max-w-2xl mx-auto">
            <h3 className="text-2xl font-serif text-gray-400 mb-4">Все още нямате любими оферти.</h3>
            <p className="text-gray-500 mb-8">Разгледайте нашите предложения и натиснете сърцето, за да ги запазите тук.</p>
            <Link href="/" className="bg-brand-dark text-white px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-brand-gold hover:text-brand-dark transition-all">
              Към Екскурзиите
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {favorites.map((tour) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={tour.id} 
                className="group bg-white rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all relative"
              >
                {/* Бутон за изтриване */}
                <button 
                  onClick={() => removeFavorite(tour.id)}
                  className="absolute top-4 right-4 z-20 bg-white/90 p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-white shadow-md transition-all"
                  title="Премахни"
                >
                  <Trash2 size={18} />
                </button>

                <Link href={`/tour/${tour.id}`}>
                  <div className="relative h-60 overflow-hidden">
                    <img 
                      src={tour.img} 
                      alt={tour.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute top-4 left-4 bg-brand-dark text-brand-gold px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide shadow-lg">
                       {tour.price}
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase text-gray-400 mb-3 tracking-widest">
                       <span className="flex items-center gap-1"><MapPin size={12} className="text-brand-gold"/> {tour.country}</span>
                       <span className="flex items-center gap-1"><Calendar size={12} className="text-brand-gold"/> {tour.date}</span>
                    </div>

                    <h3 className="text-xl font-serif font-bold text-brand-dark mb-4 line-clamp-2 group-hover:text-brand-gold transition-colors">
                      {tour.title}
                    </h3>

                    <div className="flex items-center text-brand-gold font-bold text-xs uppercase tracking-widest gap-2 group-hover:gap-4 transition-all mt-auto">
                        Виж офертата <ArrowRight size={16} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}