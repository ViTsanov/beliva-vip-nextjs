"use client";

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin } from 'lucide-react';

const STATS = [
  { value: '15+', label: 'Години опит' },
  { value: '60+', label: 'Дестинации' },
  { value: '150+', label: 'Водени групи' },
  { value: '★ 4.9', label: 'Средна оценка' },
];

// Снимки от пътуванията на Поли, неизползвани в hero/story колажа — за диария лентата
const DIARY_STRIP = [
  { src: '/guides/poly-2.jpg', pos: 'center 30%', alt: 'Поли на АТВ сафари в пустинята на Дубай', place: 'Дубай, ОАЕ' },
  { src: '/guides/poly-4.jpg', pos: 'center 42%', alt: 'Поли с кенгуру в Австралия', place: 'Австралия' },
  { src: '/guides/poly-7.jpg', pos: 'center 58%', alt: 'Поли на Великата китайска стена', place: 'Китай' },
  { src: '/guides/poly-8.jpg', pos: 'center 55%', alt: 'Поли на Великденски остров, пред статуите моаи', place: 'Великденски остров' },
  { src: '/guides/poly-3.jpg', pos: 'center 55%', alt: 'Поли в Сингапур', place: 'Сингапур' },
];

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
};

export default function AboutUsClient() {
  return (
    <main className="bg-white min-h-screen overflow-x-hidden">

      {/* ── МАСТХЕД HERO — истинска снимка на Поли, не стокова, диагонален долен ръб ── */}
      <section className="relative h-[88vh] min-h-[560px] w-full overflow-hidden bg-brand-dark">
        <Image
          src="/guides/poly-9.jpg"
          alt="Поли на Мачу Пикчу"
          fill
          priority
          className="object-cover"
          style={{ objectPosition: 'center 40%' }}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/50 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />

        <div className="relative z-10 h-full flex flex-col justify-end px-6 md:px-14 pb-28 md:pb-32">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px w-10 bg-brand-gold" />
              <span className="text-brand-gold text-[10px] font-black uppercase tracking-[0.4em]">Историята зад Beliva VIP Tour</span>
            </div>
            <h1 className="font-serif italic text-white leading-[0.95] max-w-4xl" style={{ fontSize: 'clamp(3rem, 9vw, 8rem)' }}>
              Здравейте,<br />
              аз съм <span className="text-brand-gold">Поли</span>.
            </h1>
          </motion.div>
        </div>

        {/* Диагонален долен ръб — прекъсва правата хоризонтална линия */}
        <div className="absolute bottom-0 left-0 right-0 h-24 md:h-32 overflow-hidden">
          <div
            className="absolute inset-x-0 bottom-0 h-40 bg-white"
            style={{ clipPath: 'polygon(0 100%, 100% 55%, 100% 100%)' }}
          />
        </div>
      </section>

      {/* ── STATS — плаваща стъклена лента, застъпваща диагоналния ръб на героса ── */}
      <div className="relative z-20 -mt-16 md:-mt-20 px-6">
        <div className="container mx-auto">
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-brand-gold/10 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-brand-gold/10 overflow-hidden">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="flex flex-col items-center py-8 px-4"
              >
                <span className="text-3xl md:text-5xl font-serif font-bold text-brand-gold leading-none mb-2">{s.value}</span>
                <span className="text-brand-dark/40 text-[9px] font-black uppercase tracking-[0.3em] text-center">{s.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ИСТОРИЯТА — колаж от снимки + drop-cap разказ, асиметрично ── */}
      <section className="pt-20 md:pt-28 pb-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-center">

            {/* Колаж от 3 снимки — леко завъртени, като snapshot-и в дневник */}
            <motion.div {...fadeUp} className="lg:col-span-5 relative h-[420px] md:h-[520px]">
              <div
                className="absolute top-0 left-4 md:left-10 w-[62%] h-[65%] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white"
                style={{ transform: 'rotate(-4deg)' }}
              >
                <Image src="/guides/poly.jpg" alt="Паулина Алексиева — основател на Beliva VIP Tour" fill className="object-cover object-top" sizes="(max-width: 1024px) 60vw, 320px" />
              </div>
              <div
                className="absolute bottom-2 right-2 md:right-6 w-[54%] h-[48%] rounded-[1.75rem] overflow-hidden shadow-2xl border-4 border-white z-10"
                style={{ transform: 'rotate(5deg)' }}
              >
                <Image src="/guides/poly-5.jpg" alt="Поли пред Тадж Махал, Индия" fill className="object-cover" style={{ objectPosition: '65% 55%' }} sizes="(max-width: 1024px) 50vw, 260px" />
              </div>
              <div
                className="absolute bottom-24 left-0 w-[40%] h-[30%] rounded-[1.5rem] overflow-hidden shadow-xl border-4 border-white z-20 hidden sm:block"
                style={{ transform: 'rotate(3deg)' }}
              >
                <Image src="/guides/poly-3.jpg" alt="Поли сред орхидеи в Сингапур" fill className="object-cover" sizes="220px" />
              </div>
              <div className="absolute -bottom-4 -left-4 w-40 h-40 rounded-full bg-brand-gold/10 blur-3xl pointer-events-none" />
            </motion.div>

            {/* Текст с drop-cap */}
            <motion.div {...fadeUp} className="lg:col-span-7 lg:pl-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px w-8 bg-brand-gold" />
                <span className="text-brand-gold text-[10px] font-black uppercase tracking-[0.3em]">Запознайте се с Поли</span>
              </div>

              <h2 className="text-4xl md:text-5xl font-serif italic text-brand-dark leading-tight mb-8">
                Паулина Алексиева,<br /><span className="text-brand-gold">позната като Поли</span>
              </h2>

              <p className="text-gray-600 leading-relaxed text-[18px] font-light mb-5">
                <span className="float-left font-serif italic text-brand-gold leading-[0.8] mr-3 mt-1" style={{ fontSize: '5rem' }}>П</span>
                оли е сърцето на Beliva VIP Tour. С над 15 години в туризма и над 150 лично водени групи, тя не познава дестинациите от каталог — а от преживяване. Всяка страна, която предлага, е страна, която е посетила лично, проверила е хотелите и е избрала маршрута внимателно.
              </p>
              <p className="text-gray-600 leading-relaxed text-[18px] font-light mb-5">
                Работи като туристически агент към <strong className="text-brand-dark font-semibold">2МКО</strong> — един от водещите туроператори в България. Чрез Beliva VIP Tour тя предлага същите турове, но с нещо, което никой каталог не може да даде: лично присъствие, грижа и познаване на пътуващите си по име.
              </p>
              <p className="text-gray-600 leading-relaxed text-[18px] font-light mb-8">
                Нейните пътуващи не са клиенти — те са приятели. Затова много от тях се връщат на пето, шесто, седмо пътуване с Поли.
              </p>

              <div className="flex flex-wrap gap-2 mb-10">
                {['Япония', 'Австралия', 'Перу', 'Китай', 'Южна Африка', 'Индия', 'ОАЕ'].map(dest => (
                  <span key={dest} className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-brand-gold/20 text-brand-dark">
                    <MapPin size={9} className="text-brand-gold" />{dest}
                  </span>
                ))}
              </div>

              <Link
                href="/?cat=vodena-ot-poli#tours-grid"
                className="inline-flex items-center gap-2 bg-brand-dark text-white px-7 py-3.5 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-brand-gold hover:text-brand-dark active:scale-95 transition-all group"
              >
                Турове с Поли
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── ПАРАДАЙЗ ЦИТАТ — истинска снимка от пътуванията на Поли, не стокова ── */}
      <section className="relative h-[65vh] min-h-[420px] max-h-[600px] w-full overflow-hidden bg-brand-dark">
        <Image
          src="/guides/poly-10.jpg"
          alt="Поли в Камбоджа"
          fill
          className="object-cover"
          style={{ objectPosition: '80% 60%' }}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black/65" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6 md:items-start md:text-left md:pl-12 lg:pl-24 md:pr-6">
          <motion.div {...fadeUp}>
            <blockquote
              className="font-serif italic text-white leading-[1.15] max-w-3xl mx-auto md:mx-0"
              style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3.5rem)', textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
            >
              &quot;Не търсете най-евтината екскурзия.<br className="hidden md:block" />
              Търсете тази, за която ще <span className="text-brand-gold">разказвате истории</span> години наред.&quot;
            </blockquote>
            <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.3em] mt-8">— Поли</p>
          </motion.div>
        </div>
      </section>

      {/* ── ДНЕВНИК ОТ ПЪТУВАНИЯТА — филмова лента, разпръснати снимки ── */}
      <section className="py-20 md:py-24 bg-[#faf7f0] overflow-hidden">
        <div className="container mx-auto px-6 mb-12">
          <motion.div {...fadeUp} className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px w-8 bg-brand-gold/40" />
              <span className="text-brand-gold text-[10px] font-black uppercase tracking-[0.3em]">Дневник от пътя</span>
              <div className="h-px w-8 bg-brand-gold/40" />
            </div>
            <h2 className="text-3xl md:text-4xl font-serif italic text-brand-dark">
              Няколко <span className="text-brand-gold">спомена</span> по пътя
            </h2>
          </motion.div>
        </div>

        <div className="flex gap-5 md:gap-8 overflow-x-auto px-6 md:px-12 pb-6 scrollbar-hide snap-x snap-mandatory">
          {DIARY_STRIP.map((p, i) => (
            <motion.div
              key={p.src}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="relative shrink-0 w-[240px] md:w-[290px] h-[320px] md:h-[400px] rounded-[1.75rem] overflow-hidden shadow-xl snap-center"
              style={{ transform: `rotate(${i % 2 === 0 ? -2 : 2}deg)` }}
            >
              <Image src={p.src} alt={p.alt} fill className="object-cover" style={{ objectPosition: p.pos }} sizes="300px" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <span className="absolute bottom-5 left-5 text-white text-xs font-bold uppercase tracking-widest drop-shadow-md">{p.place}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 bg-[#f7f4ee] text-center">
        <div className="container mx-auto px-6">
          <div className="relative bg-brand-dark rounded-[3rem] px-5 py-12 md:px-8 md:py-16 lg:px-16 overflow-hidden">
            {/* Атмосферен gradient оверлай в отделен слой — aurora-mesh задава background shorthand, което ЩЕШЕ затрие
                твърдия bg-brand-dark, ако се сложи на същия елемент — оттам идваше почти прозрачният панел
                и нечитаемия бял текст от преди. */}
            <div className="absolute inset-0 aurora-mesh" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-serif italic text-white mb-4">
                Готови ли сте за следващото пътуване?
              </h2>
              <p className="text-white/50 mb-10 max-w-md mx-auto">
                Свържете се с Поли или Ива — и заедно ще планираме вашето мечтано приключение.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/#tours-grid"
                  className="inline-flex items-center gap-2 bg-brand-gold text-brand-dark px-8 py-4 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-amber-400 active:scale-95 transition-all group"
                >
                  Разгледай оферти
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/contacts"
                  className="inline-flex items-center gap-2 border border-white/20 text-white px-8 py-4 rounded-full font-black uppercase text-[10px] tracking-widest hover:border-brand-gold hover:text-brand-gold active:scale-95 transition-all"
                >
                  Свържи се с нас
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
