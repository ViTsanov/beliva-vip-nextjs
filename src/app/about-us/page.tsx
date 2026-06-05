import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, MapPin, Shield, Star, Users, Heart, Quote } from 'lucide-react';

export const metadata: Metadata = {
  title: { absolute: 'За Нас — Поли и Ива | Beliva VIP Tour' },
  description: 'Запознайте се с Поли и Ива — хората зад Beliva VIP Tour. Над 15 години опит, над 60 дестинации и над 150 лично водени групи.',
  alternates: { canonical: 'https://belivavip.bg/about-us' },
};

const schemaData = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  mainEntity: {
    "@type": "TravelAgency",
    name: "Beliva VIP Tour",
    foundingDate: "2010",
    founder: { "@type": "Person", name: "Паулина Алексиева" },
    description: "Лицензирана туристическа агенция с лично отношение и над 15 години опит.",
    url: "https://belivavip.bg",
  },
};

const VALUES = [
  {
    icon: Heart,
    title: 'Лично отношение',
    desc: 'Не сте номер в каталог. Поли и Ива познават своите клиенти лично и помнят предпочитанията им.',
  },
  {
    icon: Shield,
    title: 'Надеждност',
    desc: 'Работим с лицензирани туроператори. Всяка оферта е проверена лично от нас преди да бъде предложена.',
  },
  {
    icon: Star,
    title: 'Качество, не количество',
    desc: 'Предпочитаме малки групи и внимателно подбрани маршрути пред масов туризъм.',
  },
  {
    icon: Users,
    title: 'Общност',
    desc: 'Клиентите ни се връщат — не само заради дестинациите, а заради хората, с които пътуват.',
  },
];

const STATS = [
  { value: '15+', label: 'Години опит' },
  { value: '60+', label: 'Дестинации' },
  { value: '150+', label: 'Водени групи' },
  { value: '★ 4.9', label: 'Средна оценка' },
];

export default function AboutPage() {
  return (
    <main className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />

      {/* ── HERO ── */}
      <section className="relative h-[65vh] min-h-[480px] flex items-center justify-center bg-brand-dark overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80"
          alt="Beliva VIP Tour — За нас"
          fill
          className="object-cover opacity-40"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-brand-dark/80" />

        <div className="relative z-10 text-center px-6">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-12 bg-brand-gold" />
            <span className="text-brand-gold text-[10px] font-black uppercase tracking-[0.35em]">Beliva VIP Tour</span>
            <div className="h-px w-12 bg-brand-gold" />
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif italic text-white mb-4 leading-tight">
            За <span className="text-brand-gold">Нас</span>
          </h1>
          <p className="text-white/60 text-base md:text-lg max-w-lg mx-auto font-light">
            Хората зад пътуванията — Поли и Ива
          </p>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-brand-dark border-b border-brand-gold/20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-brand-gold/10">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center py-8 px-4">
                <span className="text-4xl md:text-5xl font-serif font-bold text-brand-gold leading-none mb-2">
                  {s.value}
                </span>
                <span className="text-white/40 text-[9px] font-black uppercase tracking-[0.3em] text-center">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ПОЛИ ── */}
      <section className="py-24 bg-[#faf7f0]">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">

            {/* Photo — 5 cols */}
            <div className="lg:col-span-5 relative">
              <div className="relative aspect-[3/4] rounded-[3rem] overflow-hidden shadow-2xl bg-brand-dark">
                <Image
                  src="/guides/poly.jpg"
                  alt="Паулина (Поли) — основател на Beliva VIP Tour"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-brand-dark">
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <span className="text-brand-gold text-[9px] font-black uppercase tracking-widest block mb-1">
                    ★ Водена от ПОЛИ
                  </span>
                  <span className="text-white text-xl font-serif italic">Основател & Водач</span>
                </div>
              </div>
              {/* Floating accent */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-brand-gold/10 blur-2xl pointer-events-none" />
            </div>

            {/* Text — 7 cols */}
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px w-8 bg-brand-gold" />
                <span className="text-brand-gold text-[10px] font-black uppercase tracking-[0.3em]">
                  Запознайте се с Поли
                </span>
              </div>

              <h2 className="text-4xl md:text-5xl font-serif italic text-brand-dark leading-tight mb-8">
                Паулина Алексиева,<br />
                <span className="text-brand-gold">позната като Поли</span>
              </h2>

              <div className="space-y-5 text-gray-600 leading-relaxed text-[17px] font-light border-l-2 border-brand-gold/25 pl-6">
                <p>
                  Поли е сърцето на Beliva VIP Tour. С над 15 години в туризма и над 150 лично водени групи, тя не познава дестинациите от каталог — а от преживяване. Всяка страна, която предлага, е страна, която е посетила лично, проверила е хотелите и е избрала маршрута внимателно.
                </p>
                <p>
                  Работи като туристически агент към <strong className="text-brand-dark font-semibold">2МКО</strong> — един от водещите туроператори в България. Чрез Beliva VIP Tour тя предлага същите турове, но с нещо, което никой каталог не може да даде: <em>лично присъствие, грижа и познаване на клиентите си по име</em>.
                </p>
                <p>
                  Нейните пътуващи не са клиенти — те са приятели. Затова много от тях се връщат на пето, шесто, седмо пътуване с Поли.
                </p>
              </div>

              <div className="mt-10 flex flex-wrap gap-2">
                {['Япония', 'Австралия', 'Перу', 'Китай', 'Южна Африка', 'Индия', 'ОАЕ'].map(dest => (
                  <span
                    key={dest}
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-brand-gold/20 text-brand-dark"
                  >
                    <MapPin size={9} className="text-brand-gold" />
                    {dest}
                  </span>
                ))}
              </div>

              <div className="mt-10">
                <Link
                  href="/?cat=vodena-ot-poli#tours-grid"
                  className="inline-flex items-center gap-2 bg-brand-dark text-white px-7 py-3.5 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-brand-gold hover:text-brand-dark transition-all group"
                >
                  Турове с Поли
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ИВА ── */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">

            {/* Text — 7 cols (first on desktop) */}
            <div className="lg:col-span-7 order-2 lg:order-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px w-8 bg-teal-600" />
                <span className="text-teal-600 text-[10px] font-black uppercase tracking-[0.3em]">
                  Запознайте се с Ива
                </span>
              </div>

              <h2 className="text-4xl md:text-5xl font-serif italic text-brand-dark leading-tight mb-8">
                Ива —<br />
                <span className="text-teal-600">Специалистът за Турция</span>
              </h2>

              <div className="space-y-5 text-gray-600 leading-relaxed text-[17px] font-light border-l-2 border-teal-600/25 pl-6">
                <p>
                  Ива е нашият специалист по почивки в Турция. Познава страната в детайли — от популярните курорти по Анталийското крайбрежие до по-скрити и автентични места, недостъпни за масовия турист.
                </p>
                <p>
                  Ако мечтаете за перфектна почивка на Турското крайбрежие, Ива ще ви намери предложение, съобразено точно с вашите предпочитания — хотел, дати, бюджет и компания.
                </p>
              </div>

              <div className="mt-10 flex flex-wrap gap-2">
                {['Анталия', 'Бодрум', 'Мармарис', 'Алания', 'Сиде', 'Белек', 'Кемер'].map(dest => (
                  <span
                    key={dest}
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-teal-600/20 text-brand-dark"
                  >
                    <MapPin size={9} className="text-teal-600" />
                    {dest}
                  </span>
                ))}
              </div>

              <div className="mt-10">
                <Link
                  href="/?cat=pochivka-v-turtsiya#tours-grid"
                  className="inline-flex items-center gap-2 bg-teal-700 text-white px-7 py-3.5 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-teal-600 transition-all group"
                >
                  Почивки с Ива
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Photo — 5 cols */}
            <div className="lg:col-span-5 relative order-1 lg:order-2">
              <div className="relative aspect-[3/4] rounded-[3rem] overflow-hidden shadow-2xl bg-teal-900">
                <Image
                  src="/public/guides/iva.jpg"
                  alt="Ива — специалист Турция, Beliva VIP Tour"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-teal-900">
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <span className="text-teal-300 text-[9px] font-black uppercase tracking-widest block mb-1">
                    🌴 Почивка в Турция
                  </span>
                  <span className="text-white text-xl font-serif italic">Специалист Турция</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section className="py-24 bg-brand-dark">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-px w-10 bg-brand-gold/40" />
              <span className="text-brand-gold text-[10px] font-black uppercase tracking-[0.3em]">Нашите ценности</span>
              <div className="h-px w-10 bg-brand-gold/40" />
            </div>
            <h2 className="text-3xl md:text-4xl font-serif italic text-white">
              Защо клиентите ни се <span className="text-brand-gold">връщат</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="p-7 rounded-2xl border border-white/8 bg-white/4 hover:bg-white/8 hover:border-brand-gold/30 transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-brand-gold/10 flex items-center justify-center mb-5 group-hover:bg-brand-gold/20 transition-colors">
                  <Icon size={20} className="text-brand-gold" />
                </div>
                <h3 className="text-white font-bold text-base mb-3">{title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUOTE ── */}
      <section className="py-24 bg-[#faf7f0]">
        <div className="container mx-auto px-6">
          <div className="relative max-w-3xl mx-auto text-center">
            <Quote size={48} className="text-brand-gold/20 mx-auto mb-6 rotate-180" />
            <blockquote className="text-3xl md:text-4xl font-serif italic text-brand-dark leading-relaxed mb-8">
              "Пътуването е единственото нещо, за което даваш пари,<br className="hidden md:block" />
              а ставаш по-богат."
            </blockquote>
            <p className="text-brand-gold text-[10px] font-black uppercase tracking-[0.3em]">
              — Философия на Beliva VIP Tour
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 bg-[#f7f4ee] text-center">
        <div className="container mx-auto px-6">
          <div className="bg-brand-dark rounded-[3rem] px-8 py-16 md:px-16">
            <h2 className="text-3xl md:text-4xl font-serif italic text-white mb-4">
              Готови ли сте за следващото пътуване?
            </h2>
            <p className="text-white/50 mb-10 max-w-md mx-auto">
              Свържете се с Поли или Ива — и заедно ще планираме вашето мечтано приключение.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/#tours-grid"
                className="inline-flex items-center gap-2 bg-brand-gold text-brand-dark px-8 py-4 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-amber-400 transition-all group"
              >
                Разгледай оферти
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/contacts"
                className="inline-flex items-center gap-2 border border-white/20 text-white px-8 py-4 rounded-full font-black uppercase text-[10px] tracking-widest hover:border-brand-gold hover:text-brand-gold transition-all"
              >
                Свържи се с нас
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
