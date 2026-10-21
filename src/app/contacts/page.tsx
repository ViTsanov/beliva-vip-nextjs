import type { Metadata } from "next";
import { shareMetadata } from "@/lib/shareMeta";
import Image from "next/image";
import { ArrowUpRight, Clock, Facebook, Instagram, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import InquiryForm from "@/components/inquiry/InquiryForm";
import { COMPANY_INFO } from "@/lib/companyInfo";

export const metadata: Metadata = {
  title: "Контакти",
  alternates: { canonical: "https://belivavip.bg/contacts" },
  description: "Свържете се с нас за индивидуална консултация. Ние сме на линия онлайн и по телефона, за да организираме вашето мечтано пътуване.",
  ...shareMetadata({
    path: "/contacts",
    title: "Контакти | Beliva VIP Tour",
    description: "Свържете се с нас за индивидуална консултация. Ние сме на линия онлайн и по телефона, за да организираме вашето мечтано пътуване.",
  }),
};

// Schema.org — туристическа агенция без физически адрес. Работното време съвпада с COMPANY_INFO.workHours
// (Пон - Нед: 09:00 - 19:00); при промяна там се сменя и тук.
const schemaData = {
  "@context": "https://schema.org",
  "@type": "TravelAgency",
  name: COMPANY_INFO.name,
  url: "https://belivavip.bg",
  logo: "https://belivavip.bg/beliva_logo.png",
  description: "Групови екскурзии по света с водач. Индивидуален подход и лична грижа.",
  contactPoint: {
    "@type": "ContactPoint",
    telephone: COMPANY_INFO.phone,
    contactType: "customer service",
    email: COMPANY_INFO.email,
    areaServed: "BG",
    availableLanguage: "Bulgarian",
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "09:00",
    closes: "19:00",
  },
  sameAs: [COMPANY_INFO.socials.facebook, COMPANY_INFO.socials.instagram],
};

// Начините за връзка — всеки ред е голяма зона за натискане (телефон, WhatsApp, имейл).
const CHANNELS = [
  { icon: Phone, label: "Телефон", value: COMPANY_INFO.phone, href: `tel:${COMPANY_INFO.phone}`, external: false },
  { icon: MessageCircle, label: "WhatsApp", value: "Пишете ни в WhatsApp", href: COMPANY_INFO.socials.whatsapp, external: true },
  { icon: Mail, label: "Имейл", value: COMPANY_INFO.email, href: `mailto:${COMPANY_INFO.email}`, external: false },
];

// Как протича запитването — реална последователност, затова е номерирана.
const STEPS = [
  { title: "Пишете ни или се обадете", text: "Разкажете ни къде искате да пътувате и кога — с формата, по телефона или в WhatsApp." },
  { title: "Поли ви се обажда", text: "Уточнявате програмата, хотелите и датите и получавате отговор на всеки въпрос." },
  { title: "Резервирате", text: "Получавате оферта и линк за онлайн резервация на избраната екскурзия." },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />

      {/* ── Връзка: вляво начините за контакт, вдясно формата ── */}
      <section className="bg-brand-cream pb-16 pt-28 md:pt-32 lg:pb-24 lg:pt-40">
        <div className="container mx-auto grid gap-12 px-6 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <h1
              className="hero-enter font-serif italic leading-[1.02] text-brand-dark [text-wrap:balance]"
              style={{ fontSize: "clamp(2.6rem, 5.5vw, 4.25rem)" }}
            >
              Свържете се с нас
            </h1>
            <p className="hero-enter mt-5 max-w-md text-[17px] leading-relaxed text-slate-600" style={{ animationDelay: "0.08s" }}>
              Работим изцяло онлайн. Обадете се, пишете ни или изпратете запитване — Поли ще ви отговори лично.
            </p>

            <ul className="hero-enter mt-9 divide-y divide-brand-dark/10 border-y border-brand-dark/10" style={{ animationDelay: "0.14s" }}>
              {CHANNELS.map(({ icon: Icon, label, value, href, external }) => (
                <li key={label}>
                  <a
                    href={href}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="group flex min-h-[4.5rem] items-center gap-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-brand-goldDeep shadow-[0_2px_8px_-2px_rgba(15,23,42,0.15)] transition-colors group-hover:bg-brand-dark group-hover:text-brand-gold">
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] text-slate-500">{label}</span>
                      <span className="block truncate text-[17px] font-semibold text-brand-dark">{value}</span>
                    </span>
                    <ArrowUpRight size={18} className="shrink-0 text-slate-400 transition-[color,transform] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-dark" aria-hidden="true" />
                    {external && <span className="sr-only">(отваря се в нов прозорец)</span>}
                  </a>
                </li>
              ))}
              <li className="flex min-h-[4.5rem] items-center gap-4 py-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-brand-goldDeep shadow-[0_2px_8px_-2px_rgba(15,23,42,0.15)]">
                  <Clock size={19} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-[13px] text-slate-500">Работно време</span>
                  <span className="block text-[17px] font-semibold text-brand-dark">{COMPANY_INFO.workHours}</span>
                </span>
              </li>
            </ul>

            <div className="hero-enter mt-8 flex items-center gap-4" style={{ animationDelay: "0.2s" }}>
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-sm">
                <Image
                  src="/guides/poly-10.jpg"
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                  style={{ objectPosition: "100% 50%", transform: "scale(1.6)", transformOrigin: "52% 58%" }}
                />
              </div>
              <p className="text-[15px] leading-snug text-slate-600">
                Отговаря ви лично <span className="font-semibold text-brand-dark">Поли</span>, основател на Beliva и водач на групите.
              </p>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <a
                href={COMPANY_INFO.socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Beliva VIP Tour във Facebook (отваря се в нов прозорец)"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-dark/15 text-brand-dark transition-colors hover:border-brand-dark hover:bg-brand-dark hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
              >
                <Facebook size={18} aria-hidden="true" />
              </a>
              <a
                href={COMPANY_INFO.socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Beliva VIP Tour в Instagram (отваря се в нов прозорец)"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-dark/15 text-brand-dark transition-colors hover:border-brand-dark hover:bg-brand-dark hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
              >
                <Instagram size={18} aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div
              className="hero-enter rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.35)] sm:p-8 lg:p-10"
              style={{ animationDelay: "0.12s" }}
            >
              <h2 className="font-serif text-3xl italic leading-tight text-brand-dark">Изпратете запитване</h2>
              <p className="mb-7 mt-2 text-[15px] text-slate-600">Попълнете формата и ще ви се обадим до 24 часа.</p>
              <InquiryForm source="contact_page" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Как протича ── */}
      <section aria-labelledby="steps-heading" className="py-16 lg:py-24">
        <div className="container mx-auto px-6">
          <h2 id="steps-heading" className="font-serif text-3xl italic leading-tight text-brand-dark md:text-4xl">
            Как протича запитването
          </h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4 md:block">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-dark font-serif text-lg italic text-brand-gold" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="md:mt-5">
                  <h3 className="text-[17px] font-semibold text-brand-dark">{step.title}</h3>
                  <p className="mt-1.5 max-w-xs text-[15px] leading-relaxed text-slate-600">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Данни за фирмата — доверие: лицензирана туристическа агенция ── */}
      <section aria-labelledby="company-heading" className="border-t border-slate-100 pb-20 pt-12">
        <div className="container mx-auto px-6">
          <h2 id="company-heading" className="flex items-center gap-2 text-[15px] font-semibold text-brand-dark">
            <ShieldCheck size={18} className="text-brand-goldDeep" aria-hidden="true" />
            Лицензирана туристическа агенция
          </h2>
          <dl className="mt-5 grid gap-x-10 gap-y-4 text-[15px] sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-[13px] text-slate-500">Фирма</dt>
              <dd className="font-semibold text-brand-dark">{COMPANY_INFO.legalName}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-slate-500">ЕИК</dt>
              <dd className="font-semibold text-brand-dark">{COMPANY_INFO.eik}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-slate-500">Лиценз</dt>
              <dd className="font-semibold text-brand-dark">{COMPANY_INFO.license}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-slate-500">Офис</dt>
              <dd className="font-semibold text-brand-dark">{COMPANY_INFO.address}</dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
