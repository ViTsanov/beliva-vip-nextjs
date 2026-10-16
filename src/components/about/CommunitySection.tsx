"use client";

import Image from 'next/image';
import type { ComponentType } from 'react';
import { ArrowUpRight, Facebook, Instagram, Lock } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';
import { TikTokIcon } from './SocialIcons';
import { COMPANY_INFO } from '@/lib/companyInfo';

const IS_DEV = process.env.NODE_ENV !== 'production';

type Channel = {
  href: string;
  name: string;
  handle: string;
  text: string;
  Icon: ComponentType<{ className?: string }>;
};

const { socials } = COMPANY_INFO;

const CHANNELS: Channel[] = [
  {
    href: socials.tiktok,
    name: 'TikTok',
    handle: socials.tiktokHandle ? `@${socials.tiktokHandle}` : 'Поли в TikTok',
    text: 'Кратки видеа от пътя — гледките, храната и моментите, които не влизат в каталога.',
    Icon: TikTokIcon,
  },
  {
    href: socials.instagram,
    name: 'Instagram',
    handle: '@belivavip',
    text: 'Снимки от групите и новите дестинации.',
    Icon: Instagram,
  },
  {
    href: socials.facebook,
    name: 'Facebook',
    handle: 'Beliva VIP Tour',
    text: 'Новини, нови дати и промоции.',
    Icon: Facebook,
  },
];

// Липсващ линк: на живия сайт картата не се показва, в режим на разработка — чернова с пунктирана рамка
const visible = (href: string) => Boolean(href) || IS_DEV;

// „Пътувайте с Поли и онлайн“ — голямата карта е затворената Facebook група на Поли, до нея социалните мрежи.
export default function CommunitySection() {
  const channels = CHANNELS.filter(c => visible(c.href));
  const showGroup = visible(socials.poliGroup);
  if (!showGroup && channels.length === 0) return null;

  return (
    <section aria-labelledby="community-title" className="bg-white py-20 md:py-28">
      <div className="container mx-auto px-6">
        <Reveal className="mb-12 max-w-2xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px w-8 bg-brand-gold" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-goldDeep">Общността</span>
          </div>
          <h2 id="community-title" className="font-display text-[clamp(1.6rem,3.4vw,2.6rem)] font-semibold uppercase leading-[1.05] tracking-[-0.02em] text-brand-dark">
            Пътуването продължава<br />и онлайн
          </h2>
        </Reveal>

        <div className="grid gap-5 lg:grid-cols-12">
          {showGroup && (
            <Reveal className="lg:col-span-7">
              <a
                href={socials.poliGroup || undefined}
                target="_blank"
                rel="noreferrer"
                aria-disabled={!socials.poliGroup || undefined}
                className={`group relative flex h-full min-h-[22rem] flex-col justify-end overflow-hidden rounded-[2rem] bg-brand-dark p-7 text-white transition-transform duration-150 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-dark md:p-10 ${
                  socials.poliGroup ? '' : 'outline-dashed outline-2 outline-offset-4 outline-brand-gold/60'
                }`}
              >
                <Image
                  src="/guides/poly-8.jpg"
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  className="object-cover opacity-45 transition-transform duration-700 group-hover:scale-105"
                  style={{ objectPosition: 'center 55%' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/70 to-brand-dark/10" />
                <div className="relative">
                  <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-gold px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-brand-dark">
                    <Lock size={12} aria-hidden="true" /> Затворена група
                  </span>
                  <h3 className="mb-4 max-w-md font-serif text-3xl italic leading-tight md:text-4xl">
                    Групата на пътуващите с Поли
                  </h3>
                  <p className="mb-8 max-w-md text-[15px] leading-relaxed text-white/70">
                    Място само за нашите пътуващи — снимки и спомени от екскурзиите и първи новини за новите пътувания.
                  </p>
                  <span className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[13px] font-bold text-brand-dark transition-colors group-hover:bg-brand-gold">
                    <Facebook size={16} aria-hidden="true" />
                    {socials.poliGroup ? 'Поискай достъп' : 'Чернова: добави линк в companyInfo.ts (poliGroup)'}
                    <ArrowUpRight size={16} aria-hidden="true" className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                  <span className="sr-only">(отваря се в нов прозорец)</span>
                </div>
              </a>
            </Reveal>
          )}

          <div className={`grid gap-5 ${showGroup ? 'lg:col-span-5' : 'lg:col-span-12 lg:grid-cols-3'}`}>
            {channels.map((c, i) => (
              <Reveal key={c.name} delay={0.08 * (i + 1)}>
                <a
                  href={c.href || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className={`group flex h-full items-start gap-5 rounded-[1.5rem] border p-6 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-brand-dark/20 hover:shadow-[0_18px_40px_-18px_rgba(15,23,42,0.35)] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark ${
                    c.href ? 'border-brand-dark/10' : 'border-dashed border-brand-gold/70'
                  }`}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-dark text-white transition-colors group-hover:bg-brand-gold group-hover:text-brand-dark">
                    <c.Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-goldDeep">{c.name}</span>
                      <ArrowUpRight size={16} aria-hidden="true" className="text-brand-dark/40 transition-[transform,color] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-dark" />
                    </span>
                    <span className="mt-1 block text-lg font-semibold text-brand-dark">{c.handle}</span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-slate-600">
                      {c.href ? c.text : 'Чернова: добави линка в companyInfo.ts — без него картата не се показва на сайта.'}
                    </span>
                  </span>
                  <span className="sr-only">(отваря се в нов прозорец)</span>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
