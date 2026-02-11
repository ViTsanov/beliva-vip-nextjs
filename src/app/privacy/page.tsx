import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Политика за поверителност | Beliva VIP Tour",
  description: "Научете как Beliva VIP Tour съхранява и използва вашите данни.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#fcf9f2]">
      <div className="container mx-auto px-6 py-32 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-serif italic text-brand-dark mb-10">Политика за поверителност и Бисквитки</h1>
        
        <div className="prose prose-lg text-gray-600">
          <p className="lead font-medium text-xl text-gray-800 mb-8">
            В Beliva VIP Tour ценим вашата поверителност. Тази политика обяснява как събираме, използваме и защитаваме вашата лична информация.
          </p>

          <h3 className="text-brand-dark font-serif mt-12 text-2xl">1. Какви данни събираме?</h3>
          <p>
            Ние събираме данни, които вие доброволно ни предоставяте чрез формата за контакт или запитване за екскурзия:
          </p>
          <ul className="list-disc pl-6 space-y-2 marker:text-brand-gold">
            <li>Име и Фамилия</li>
            <li>Имейл адрес и Телефонен номер</li>
            <li>Предпочитания за пътуване</li>
          </ul>

          <h3 className="text-brand-dark font-serif mt-12 text-2xl">2. Политика за Бисквитки (Cookies)</h3>
          <p>
            Нашият уебсайт използва бисквитки, за да подобри вашето преживяване.
          </p>
          
          <h4 className="font-bold text-gray-800 mt-6 text-lg">Задължителни бисквитки</h4>
          <p>
            Тези бисквитки са необходими за функционирането на сайта (например, за да запазите оферти в "Любими"). Те не съхраняват лична информация.
          </p>

          <h4 className="font-bold text-gray-800 mt-6 text-lg">Аналитични бисквитки</h4>
          <p>
            Използваме ги, за да разберем как посетителите взаимодействат със сайта (напр. кои страници са най-посещавани). Вие можете да откажете тези бисквитки чрез банера за съгласие.
          </p>

          <h3 className="text-brand-dark font-serif mt-12 text-2xl">3. Вашите права</h3>
          <p>
            Съгласно GDPR вие имате право да поискате достъп до вашите данни, корекция или изтриване ("правото да бъдеш забравен"). Можете да се свържете с нас на office@belivavip.bg за всякакви въпроси.
          </p>
        </div>
      </div>
    </main>
  );
}