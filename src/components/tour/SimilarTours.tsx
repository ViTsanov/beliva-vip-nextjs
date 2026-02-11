"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, getDocs } from 'firebase/firestore'; 
import { MapPin, Calendar, ArrowRight } from 'lucide-react';
import { ITour } from "@/types";

export default function SimilarTours({ currentTour }: { currentTour: ITour }) {
  const [similarTours, setSimilarTours] = useState<ITour[]>([]);

  useEffect(() => {
    const fetchSimilarTours = async () => {
      if (!currentTour) return;

      try {
        const toursRef = collection(db, "tours");
        let combinedTours: any[] = [];

        // 1. Търсим от същата държава
        const countryQuery = query(
          toursRef, 
          where("status", "==", "public"),
          where("country", "==", currentTour.country),
          limit(4) 
        );
        const countrySnapshot = await getDocs(countryQuery);
        const countryTours = countrySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((t: any) => t.tourId !== currentTour.id && t.id !== currentTour.id);

        combinedTours = [...countryTours];

        // 2. Допълваме от континента ако няма достатъчно
        if (combinedTours.length < 3) {
          const continentQuery = query(
            toursRef,
            where("status", "==", "public"),
            where("continent", "==", currentTour.continent),
            limit(10)
          );
          const continentSnapshot = await getDocs(continentQuery);
          const continentTours = continentSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((t: any) => t.tourId !== currentTour.id && t.id !== currentTour.id && t.country !== currentTour.country); 

          combinedTours = [...combinedTours, ...continentTours];
        }

        setSimilarTours(combinedTours.slice(0, 3) as ITour[]);

      } catch (error) {
        console.error("Error fetching similar tours:", error);
      }
    };

    fetchSimilarTours();
  }, [currentTour]);

  if (similarTours.length === 0) return null;

  return (
    <section className="mt-24 pt-16 border-t border-brand-gold/10 container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
        <div>
            <span className="text-brand-gold font-bold uppercase tracking-widest text-xs mb-2 block">
            Още вдъхновение
            </span>
            <h2 className="text-3xl md:text-4xl font-serif text-brand-dark">
            Вижте още от <span className="italic text-brand-gold">{currentTour.country}</span> и региона
            </h2>
        </div>
        <Link 
            href={`/?continent=${encodeURIComponent(currentTour.continent)}`}
            className="group flex items-center gap-2 text-brand-dark font-bold hover:text-brand-gold transition-colors"
        >
            Всички предложения <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {similarTours.map((tour) => (
            <Link 
            key={tour.id} 
            href={`/tour/${tour.tourId || tour.id}`}
            className="group bg-white rounded-[2rem] overflow-hidden border border-brand-gold/10 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
            >
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

            <div className="p-6 flex flex-col flex-grow">
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
  );
}