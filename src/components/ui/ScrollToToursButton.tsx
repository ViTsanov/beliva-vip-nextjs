"use client";

import React from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  targetId: string;
  label: string;
}

export default function ScrollToToursButton({ targetId, label }: Props) {
  const handleScroll = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // 1. Проверяваме дали елементът съществува
    const element = document.getElementById(targetId);
    
    if (element) {
      console.log("Елементът е намерен, започвам скрол към:", targetId);
      
      // 2. Използваме scrollIntoView - той е по-модерен и надежден
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start', // Скролва до началото на елемента
      });

      // 3. Ако хедърът ти е фиксиран и закрива заглавието, 
      // добавяме малко отместване след 100ms
      setTimeout(() => {
        window.scrollBy({
          top: -90, // Отместване нагоре, за да не го закрива менюто
          behavior: 'smooth'
        });
      }, 600); // Изчакваме основния скрол да приключи почти
      
    } else {
      console.error("Грешка: Не мога да намеря елемент с ID:", targetId);
    }
  };

  return (
    <div className="flex justify-center md:justify-start mb-8">
      <button 
        onClick={handleScroll}
        className="group flex items-center gap-3 bg-brand-gold/10 hover:bg-brand-gold text-brand-gold hover:text-white px-6 py-3 rounded-full transition-all duration-300 border border-brand-gold/20"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
        <div className="bg-brand-gold text-white rounded-full p-1 group-hover:bg-white group-hover:text-brand-gold transition-colors">
          <ChevronDown size={14} className="animate-bounce" />
        </div>
      </button>
    </div>
  );
}