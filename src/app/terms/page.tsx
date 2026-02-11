import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Общи условия | Beliva VIP Tour",
  description: "Общи условия за ползване на услугите на Beliva VIP Tour.",
};

export default function TermsPage() {
  return (
    <div className="bg-[#fcfaf7] min-h-screen py-24 px-6">
      <div className="max-w-4xl mx-auto bg-white p-12 rounded-[3rem] shadow-sm text-left border border-brand-gold/5">
        <h1 className="text-4xl font-serif italic mb-10 text-brand-dark">Общи условия</h1>
        
        <div className="space-y-8 text-gray-600 leading-relaxed text-lg">
          <section>
            <h2 className="text-xl font-bold text-brand-dark mb-3 uppercase tracking-wider">1. Предмет</h2>
            <p>Настоящите общи условия уреждат отношенията между „Белива ВИП“ ЕООД, в качеството си на Туристически агент, и крайните потребители на предлаганите услуги.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-brand-dark mb-3 uppercase tracking-wider">2. Роля на агента</h2>
            <p>„Белива ВИП“ действа като посредник между Потребителя и лицензирани Туроператори. Всички договори за пакетни пътувания се сключват при условията на съответния организатор (Туроператор).</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-brand-dark mb-3 uppercase tracking-wider">3. Резервации и Плащания</h2>
            <p>Резервацията се счита за валидна след подписване на договор за пътуване и заплащане на депозит, съгласно изискванията на конкретната програма.</p>
          </section>
          
          <div className="pt-10 border-t border-gray-100">
            <p className="text-sm italic text-gray-400">Последна актуализация: Януари 2026 г.</p>
          </div>
        </div>
      </div>
    </div>
  );
}