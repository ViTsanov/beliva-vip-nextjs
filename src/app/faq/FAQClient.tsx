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
      title: "Резервации и Анулации",
      items: [
        {
          question: "Как мога да направя резервация за екскурзия?",
          answer: "Можете да заявите Вашата резервация директно през нашата онлайн платформа, чрез WhatsApp бутона за бърза връзка или като ни изпратите запитване на office@belivavip.bg. Нашият екип ще се свърже с Вас, за да уточни детайлите и да подготви Вашия договор за организирано пътуване."
        },
        {
          question: "Какъв е размерът на депозита?",
          answer: "Стандартният депозит обикновено е в размер на 30% от общата стойност на пътуването, освен ако в условията на конкретния Туроператор не е посочено друго. Остатъкът от сумата се заплаща съгласно условията в договора, най-често до 30 дни преди датата на отпътуване."
        },
        {
          question: "Какви методи на плащане приемате?",
          answer: "Приемаме плащания изключително по банков път (в Евро или Лева) с цел максимална сигурност и прозрачност. Банковите ни детайли са посочени във всеки договор и проформа фактура, които ще получите от нас."
        },
        {
          question: "Какво се случва, ако се наложи да анулирам пътуването си?",
          answer: "Като туристически агент, ние прилагаме условията за анулация на съответния Туроператор, организатор на програмата. Евентуалните неустойки зависят от това колко дни преди отпътуването се прави отказът. Силно препоръчваме сключването на застраховка „Отмяна на пътуване“, която възстановява удържаните суми при неочаквани здравословни и други основателни причини."
        }
      ]
    },
    {
      title: "Застраховки и Документи",
      items: [
        {
          question: "Какви документи са ми необходими за пътуването?",
          answer: "За пътувания в рамките на ЕС е необходима валидна лична карта. За екзотични дестинации извън ЕС се изисква международен паспорт с валидност минимум 6 месеца от датата на връщане. Ние ще Ви информираме своевременно за всякакви визови или специфични здравни изисквания."
        },
        {
          question: "Имам ли включена медицинска застраховка?",
          answer: "Да, всички пакетни програми, организирани от нашите партньори (Туроператори), включват базова медицинска застраховка с покритие за спешни случаи в чужбина. При желание от Ваша страна, покритието може да бъде увеличено срещу допълнително доплащане."
        }
      ]
    },
    {
      title: "Нашето VIP Обслужване",
      items: [
        {
          question: "Защо да избера Beliva VIP Tour вместо да резервирам директно при организатора?",
          answer: "Резервирайки чрез нас, Вие получавате личен VIP консултант без абсолютно никакво оскъпяване (цените ни са идентични с тези на организатора). Ние познаваме пазара отвътре, филтрираме стотици оферти и Ви предпазваме от скрити такси или некачествени програми, като защитаваме Вашите интереси през цялото пътуване."
        },
        {
          question: "Каква точно е ролята на Beliva VIP Tour?",
          answer: "Ние сме лицензиран Туристически агент. Нашата роля е на доверен посредник и консултант. Ние управляваме Вашата резервация, оформяме документите и водим цялата комуникация с Туроператора-организатор, за да си спестите време, нерви и усилия."
        },
        {
          question: "Мога ли да променя детайли по вече резервирана екскурзия?",
          answer: "Промени в имената на пътуващите, датите или услугите често са възможни, но зависят стриктно от тарифите на авиокомпаниите и Общите условия на Туроператора. Свържете се с нас максимално бързо, за да съдействаме и да минимизираме евентуални такси за промяна."
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

        <div className="mt-20 p-10 bg-brand-dark rounded-[3rem] text-white text-center shadow-2xl border border-brand-gold/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <h3 className="text-2xl font-serif italic mb-4 relative z-10">Все още имате въпроси?</h3>
          <p className="text-gray-400 text-sm mb-8 relative z-10">Нашите консултанти са на Ваше разположение за персонално съдействие.</p>
          
          <div className="flex flex-col md:flex-row gap-4 justify-center relative z-10">
            <Link 
              href="/contacts" 
              className="inline-block bg-brand-gold text-brand-dark px-10 py-4 rounded-2xl font-bold uppercase text-[12px] tracking-widest hover:bg-white transition-all shadow-lg"
            >
              Свържете се с нас
            </Link>

            <a 
              href="https://wa.me/359887616100" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block bg-white/10 text-white border border-white/20 px-10 py-4 rounded-2xl font-bold uppercase text-[12px] tracking-widest hover:bg-white/20 transition-all shadow-md"
            >
              Пишете ни по WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}