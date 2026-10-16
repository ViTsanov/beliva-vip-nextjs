import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import AboutHero from '@/components/about/AboutHero';
import StoryChapters from '@/components/about/StoryChapters';
import QuoteBand from '@/components/about/QuoteBand';
import VideoReel from '@/components/about/VideoReel';
import DiaryStrip from '@/components/about/DiaryStrip';
import CommunitySection from '@/components/about/CommunitySection';

// „За нас“ като биография на Поли, разказана отгоре надолу:
// герой → числата → историята в три глави (закрепена снимка) → цитат → видеа → дневник от пътя → общността → CTA.
// Текстовете, снимките и видеата са в aboutContent.ts; всички появявания са CSS (Reveal), без framer-motion.
export default function AboutUsClient() {
  return (
    <main className="min-h-screen overflow-x-clip bg-white">
      <AboutHero />
      <StoryChapters />
      <QuoteBand />
      <VideoReel />
      <DiaryStrip />
      <CommunitySection />

      {/* ── CTA ── */}
      <section className="bg-white pb-20 text-center md:pb-28">
        <div className="container mx-auto px-6">
          <div className="relative overflow-hidden rounded-[3rem] bg-brand-dark px-5 py-12 md:px-8 md:py-16 lg:px-16">
            {/* Атмосферен gradient в отделен слой — aurora-mesh задава background shorthand и би затрил bg-brand-dark */}
            <div className="aurora-mesh absolute inset-0" />
            <div className="relative z-10">
              <h2 className="mb-4 font-serif text-3xl italic text-white md:text-4xl">
                Готови ли сте за следващото пътуване?
              </h2>
              <p className="mx-auto mb-10 max-w-md text-white/60">
                Свържете се с Поли или Ива — и заедно ще планираме вашето мечтано приключение.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/#tours-grid"
                  className="group inline-flex items-center gap-2 rounded-full bg-brand-gold px-8 py-4 text-[10px] font-black uppercase tracking-widest text-brand-dark transition-[background-color,transform] duration-150 hover:bg-amber-400 active:scale-95"
                >
                  Разгледай оферти
                  <ArrowRight size={14} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/contacts"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white transition-[border-color,color,transform] duration-150 hover:border-brand-gold hover:text-brand-gold active:scale-95"
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
