"use client";

import { motion } from 'framer-motion';
import { ShieldCheck, Sparkles, Map, Headphones } from 'lucide-react';

export default function Advantages() {
  return (
    <section className="py-16 bg-[#f7f0e4] border-y border-brand-gold/5 relative z-20">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Предимство 1: Сигурност */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-5 bg-white/40 p-6 rounded-[2rem] border border-brand-gold/10 hover:bg-white/60 transition-colors"
          >
            <div className="w-12 h-12 shrink-0 bg-brand-dark text-brand-gold rounded-2xl flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-brand-dark">Сигурност</h3>
              <p className="text-gray-500 text-xs leading-tight">Лицензиран агент, работещ с ТОП туроператори.</p>
            </div>
          </motion.div>

          {/* Предимство 2: Опит */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-5 bg-white/40 p-6 rounded-[2rem] border border-brand-gold/10 hover:bg-white/60 transition-colors"
          >
            <div className="w-12 h-12 shrink-0 bg-brand-dark text-brand-gold rounded-2xl flex items-center justify-center">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-brand-dark">Опит в сферата</h3>
              <p className="text-gray-500 text-xs leading-tight">Лично отношение към всеки детайл.</p>
            </div>
          </motion.div>

          {/* Предимство 3: Ексклузивност */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-5 bg-white/40 p-6 rounded-[2rem] border border-brand-gold/10 hover:bg-white/60 transition-colors"
          >
            <div className="w-12 h-12 shrink-0 bg-brand-dark text-brand-gold rounded-2xl flex items-center justify-center">
              <Map size={24} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-brand-dark">Ексклузивност</h3>
              <p className="text-gray-500 text-xs leading-tight">Маршрути извън масовия каталог.</p>
            </div>
          </motion.div>

          {/* Предимство 4: Поддръжка */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-5 bg-white/40 p-6 rounded-[2rem] border border-brand-gold/10 hover:bg-white/60 transition-colors"
          >
            <div className="w-12 h-12 shrink-0 bg-brand-dark text-brand-gold rounded-2xl flex items-center justify-center">
              <Headphones size={24} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-brand-dark">Поддръжка</h3>
              <p className="text-gray-500 text-xs leading-tight">Лесна връзка с Вашия агент.</p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}