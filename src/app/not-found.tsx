// src/app/not-found.tsx
import Link from 'next/link';
import { Home, MapPin, Search } from 'lucide-react';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#fcf9f2] flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* 🎨 Фонов слой - замъглени кръгове */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-gold/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto px-6 text-center relative z-10 py-20">
        
        {/* Голям надпис 404 с картинка вътре (clip-text) */}
        <div className="relative mb-8 inline-block">
            <h1 className="text-[150px] md:text-[220px] font-serif font-black leading-none text-transparent bg-clip-text bg-gradient-to-br from-brand-gold to-brand-dark opacity-20 select-none">
                404
            </h1>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-40 h-40 md:w-60 md:h-60 rounded-full overflow-hidden border-8 border-white shadow-2xl rotate-12 animate-in zoom-in duration-700">
                    <Image 
                        src="/hero/thailand.webp" // ⚠️ Увери се, че имаш тази снимка или сложи друга красива
                        alt="Lost in paradise"
                        fill
                        className="object-cover"
                    />
                </div>
            </div>
        </div>

        <h2 className="text-3xl md:text-5xl font-serif text-brand-dark mb-6">
          Опа! Изгубихте се в рая?
        </h2>
        
        <p className="text-gray-500 text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
          Страницата, която търсите, е отпътувала към неизвестна дестинация. 
          Може би е време да изберете нова посока за Вашето следващо приключение?
        </p>

        {/* Бутони за действие */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/"
            className="flex items-center gap-2 px-8 py-4 bg-brand-gold text-white font-bold rounded-full shadow-lg hover:bg-brand-dark hover:-translate-y-1 transition-all duration-300"
          >
            <Home size={20} />
            Към Началото
          </Link>
          
          <Link 
            href="/#tours-grid"
            className="flex items-center gap-2 px-8 py-4 bg-white text-brand-dark border border-gray-200 font-bold rounded-full shadow-sm hover:border-brand-gold hover:text-brand-gold transition-all duration-300"
          >
            <Search size={20} />
            Разгледай Оферти
          </Link>
        </div>

        {/* Декоративен компас или карта долу */}
        <div className="mt-20 opacity-30">
            <MapPin size={48} className="mx-auto text-brand-gold animate-bounce" />
        </div>

      </div>
    </div>
  );
}