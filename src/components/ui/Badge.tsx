"use client";

import React from 'react';
import { Star, Flame, Palmtree, CheckCircle } from 'lucide-react';

export type BadgeVariant = 'poli' | 'promo' | 'turkey' | 'groupStatus' | 'default';

interface BadgeProps {
  variant: BadgeVariant;
  text?: string;
  className?: string;
  iconSize?: number;
  customBgColor?: string;
  customTextColor?: string;
  customEffect?: string;
}

export default function Badge({ 
  variant, 
  text, 
  className = '', 
  iconSize = 12,
  customBgColor,
  customTextColor,
  customEffect
}: BadgeProps) {
  
  // 🔥 СПЕЦИАЛЕН, ИЗОЛИРАН БЛОК САМО ЗА ПРОМОЦИИ 🔥
  // Тук връщаме структурата абсолютно 1:1 с твоя оригинален код,
  // за да гарантираме, че CSS ефектите от globals.css работят безупречно!
  if (variant === 'promo') {
    const promoEffectClass = customEffect && customEffect !== 'none' ? `effect-${customEffect}` : '';
    const fallbackIconAnimation = !customEffect || customEffect === 'none' ? 'animate-bounce' : '';

    return (
      <span 
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-none shadow-[0_4px_15px_rgba(0,0,0,0.3)] backdrop-blur-md ${promoEffectClass} ${className}`}
        style={{ 
          backgroundColor: customBgColor || '#dc2626', 
          color: customTextColor || '#ffffff' 
        }}
      >
        <Flame 
          size={iconSize} 
          className={`relative z-10 ${fallbackIconAnimation}`} 
          style={{ color: customTextColor || '#ffffff', opacity: 0.9 }} 
        />
        <span className="relative z-10">{text || 'ПРОМОЦИЯ'}</span>
      </span>
    );
  }

  // ==========================================
  // ЗА ВСИЧКИ ОСТАНАЛИ БАДЖОВЕ (С Поли, Турция и т.н.)
  // ==========================================
  const config = {
    poli: {
      colorClass: "bg-white text-brand-dark border-brand-gold/30 shadow-lg",
      gradientClass: "absolute inset-0 bg-gradient-to-r from-brand-gold/10 to-transparent pointer-events-none rounded-full",
      Icon: Star,
      iconColor: "text-brand-gold",
      defaultText: "Водена от Поли",
      glowClass: "absolute -inset-1 bg-brand-gold/20 rounded-full blur-sm opacity-50",
    },
    turkey: {
      colorClass: "bg-rose-50 text-rose-600 border-rose-200 shadow-sm",
      gradientClass: "",
      Icon: Palmtree,
      iconColor: "text-rose-600",
      defaultText: "Почивка в Турция",
      glowClass: "",
    },
    groupStatus: {
      colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm",
      gradientClass: "",
      Icon: CheckCircle,
      iconColor: "text-emerald-600",
      defaultText: "Потвърдена група",
      glowClass: "",
    },
    default: {
      colorClass: "bg-gray-100 text-gray-600 border-gray-200",
      gradientClass: "",
      Icon: null,
      iconColor: "",
      defaultText: "",
      glowClass: "",
    }
  };

  const selected = config[variant as keyof typeof config] || config.default;
  const displayText = text || selected.defaultText;
  const IconComponent = selected.Icon;

  return (
    <div 
      className={`relative group/badge inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-transform duration-300 hover:scale-105 ${selected.colorClass} ${className}`}
    >
      {selected.glowClass && <div className={selected.glowClass} />}
      {selected.gradientClass && <div className={selected.gradientClass} />}
      
      {IconComponent && (
        <IconComponent 
          size={iconSize} 
          className={`relative z-10 ${selected.iconColor}`} 
          fill={variant === 'poli' ? "currentColor" : "none"} 
        />
      )}
      <span className="relative z-10">{displayText}</span>
    </div>
  );
}