import Link from 'next/link';
import { ArrowRight, Phone } from 'lucide-react';
import { COMPANY_INFO } from '@/lib/companyInfo';

export default function CTASection() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="relative overflow-hidden py-24 px-6 text-center"
      style={{
        background: 'linear-gradient(135deg, #b8920e 0%, #d4af37 40%, #c9a227 70%, #a37c0a 100%)',
      }}
    >
      {/* Нежен светъл рефлекс в центъра */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 65% 140% at 50% -5%, rgba(255,255,255,.18) 0%, transparent 65%)',
        }}
      />

      <div className="relative mx-auto max-w-2xl">
        <p className="mb-3 text-[9px] font-black uppercase tracking-[.3em] text-brand-dark/50">
          Готови ли сте?
        </p>

        <h2
          id="cta-heading"
          className="mb-4 font-serif italic font-semibold leading-[1.05] tracking-tight text-brand-dark"
          style={{ fontSize: 'clamp(2.1rem,5.5vw,3.6rem)' }}
        >
          Следващото ви пътуване ни чака
        </h2>

        <p className="mx-auto mb-9 max-w-[48ch] text-[.9375rem] leading-relaxed text-brand-dark/60">
          Изпратете запитване и ние ще се свържем с вас в рамките на 24 часа —
          за да планираме заедно пътуването, за което сте мечтали.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/contacts"
            className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-7 py-3.5 text-[9px] font-black uppercase tracking-[.2em] text-brand-gold transition hover:-translate-y-0.5 hover:bg-[#0f172a] hover:shadow-[0_8px_28px_rgba(0,0,0,.35)]"
          >
            Изпрати запитване
            <ArrowRight size={13} aria-hidden="true" />
          </Link>

          <a
            href={`tel:${COMPANY_INFO.phone}`}
            className="inline-flex items-center gap-2 rounded-full border-2 border-brand-dark/30 px-7 py-3.5 text-[9px] font-black uppercase tracking-[.2em] text-brand-dark transition hover:-translate-y-0.5 hover:border-brand-dark hover:bg-brand-dark/8"
          >
            <Phone size={13} aria-hidden="true" />
            {COMPANY_INFO.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
