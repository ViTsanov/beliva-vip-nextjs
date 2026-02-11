"use client";

import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import Link from 'next/link';

interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem = ({ question, answer }: FAQItemProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-brand-gold/10 last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex justify-between items-center text-left hover:text-brand-gold transition-colors group"
      >
        <span className="text-lg font-bold text-brand-dark group-hover:text-brand-gold transition-colors pr-8">
          {question}
        </span>
        <div className="text-brand-gold shrink-0">
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>
      <div className={`overflow-hidden transition-all duration-500 ${isOpen ? 'max-h-[500px] pb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
        <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
          {answer}
        </p>
      </div>
    </div>
  );
};

export default function FAQClient() {
  const categories = [
    {
      title: "Резервации и Плащания",
      items: [
        {
          question: "Как мога да направя резервация за екскурзия?",
          answer: "Можете да заявите Вашата резервация директно през нашата онлайн платформа, чрез WhatsApp бутона за бърза връзка или като ни изпратите запитване на office@belivavip.bg. Нашият екип ще се свърже с Вас, за да уточни детайлите и да подготви Вашия договор."
        },
        {
          question: "Какъв е размерът на депозита?",
          answer: "Стандартният депозит е в размер на 30% от общата стойност на пътуването, освен ако в описанието на конкретната програма не е посочено друго. Остатъкът от сумата се заплаща съгласно условията в договора, обикновено до 30 дни преди датата на отпътуване."
        },
        {
          question: "Какви методи на плащане приемате?",
          answer: "Приемаме плащания по банков път (в Евро или Лева) и чрез дебитни/кредитни карти. За Ваше улеснение, банковите ни детайли са посочени във всяка проформа фактура."
        }
      ]
    },
    {
      title: "Документи и Сигурност",
      items: [
        {
          question: "Какви документи са ми необходими за пътуването?",
          answer: "За пътувания в ЕС е необходима валидна лична карта. За екзотични дестинации извън ЕС се изисква международен паспорт с валидност минимум 6 месеца от датата на връщане. Ние ще Ви информираме своевременно, ако за Вашата дестинация е необходима виза или специфични здравни изисквания."
        },
        {
          question: "Имам ли застраховка?",
          answer: "Като туристически агент, ние работим само с лицензирани туроператори, които притежават задължителна застраховка 'Отговорност на туроператора'. Силно препоръчваме на нашите клиенти да сключат и индивидуална застраховка 'Отмяна на пътуване', която покрива рискове в случай на невъзможност за пътуване."
        }
      ]
    },
    {
      title: "Организация на пътуването",
      items: [
        {
          question: "Каква е ролята на Beliva VIP Tour като туристически агент?",
          answer: "Beliva VIP Tour действа като Ваш персонален консултант и посредник. Ние филтрираме стотици оферти, за да Ви предложим само най-качествените програми на пазара. Ние управляваме Вашата резервация, документите и комуникацията с туроператора-организатор, за да си спестите време и усилия."
        },
        {
          question: "Мога ли да променя детайли по вече резервирана екскурзия?",
          answer: "Промени в имената, датите или услугите са възможни, но зависят от условията на конкретния туроператор и авиокомпания. Моля, свържете се с нас възможно най-скоро, за да проверим условията за Вашата конкретна резервация."
        }
      ]
    }
  ];

  // Schema.org JSON за Google
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": categories.flatMap(cat => cat.items.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    })))
  };

  return (
    <div className="bg-[#fcfaf7] min-h-screen py-24 px-6 text-left">
      
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-12">
          <div className="p-3 bg-brand-gold/10 rounded-2xl text-brand-gold">
            <HelpCircle size={32} />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-serif italic text-brand-dark">Често задавани въпроси</h1>
            <p className="text-gray-400 text-sm mt-2 uppercase tracking-widest font-medium">Всичко, което трябва да знаете за Вашето преживяване</p>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-16">
          {categories.map((cat, idx) => (
            <div key={idx}>
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-brand-gold mb-8 border-l-2 border-brand-gold pl-4">
                {cat.title}
              </h2>
              <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-brand-gold/5">
                {cat.items.map((faq, fIdx) => (
                  <FAQItem key={fIdx} question={faq.question} answer={faq.answer} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 p-10 bg-brand-dark rounded-[3rem] text-white text-center shadow-2xl">
          <h3 className="text-2xl font-serif italic mb-4">Все още имате въпроси?</h3>
          <p className="text-gray-400 text-sm mb-8">Нашите консултанти са на Ваше разположение 24/7 за съдействие.</p>
          
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link 
              href="/contacts" 
              className="inline-block bg-brand-gold text-brand-dark px-10 py-4 rounded-2xl font-bold uppercase text-[16px] tracking-widest hover:bg-white transition-all"
            >
              Свържете се с нас
            </Link>

            <a 
              href="https://wa.me/359887616100" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block bg-white/10 text-white border border-white/20 px-10 py-4 rounded-2xl font-bold uppercase text-[16px] tracking-widest hover:bg-white/20 transition-all"
            >
              Пишете ни по WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}