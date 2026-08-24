import type { Metadata } from "next";
import { COMPANY_INFO } from "@/lib/companyInfo";

export const metadata: Metadata = {
  title: "Общи условия | Beliva VIP Tour",
  description: "Официални общи условия за ползване на услугите и уебсайта на туристическа агенция Beliva VIP Tour.",
};

export default function TermsPage() {
  return (
    <main className="bg-[#fcf9f2] min-h-screen py-32 px-6">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-16 rounded-[3rem] shadow-sm text-left border border-brand-gold/10">
        
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px w-10 bg-brand-gold"></div>
          <span className="text-brand-gold text-[10px] font-black uppercase tracking-[0.3em]">Легална информация</span>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-serif italic mb-12 text-brand-dark">Общи условия</h1>
        
        <div className="prose prose-lg text-gray-600 max-w-none">
          <p className="lead font-medium text-xl text-gray-800 mb-8">
            Настоящите Общи условия уреждат взаимоотношенията между <strong>{COMPANY_INFO.legalName}</strong> (оперираща под търговската марка Beliva VIP Tour) и потребителите на туристически услуги, предлагани чрез този уебсайт.
          </p>

          <section className="mb-10">
            <h2 className="text-2xl font-serif text-brand-dark mb-4 border-b border-brand-gold/30 pb-2">1. Данни за Агента</h2>
            <ul className="list-none space-y-2 bg-gray-50 p-6 rounded-xl border border-gray-100">
              <li><strong>Наименование:</strong> {COMPANY_INFO.legalName}</li>
              <li><strong>ЕИК:</strong> {COMPANY_INFO.eik}</li>
              <li><strong>Седалище и адрес на управление:</strong> {COMPANY_INFO.address}</li>
              <li><strong>Удостоверение за регистрация като Туристически агент:</strong> № {COMPANY_INFO.license}</li>
              <li><strong>Имейл:</strong> {COMPANY_INFO.email}</li>
              <li><strong>Телефон:</strong> {COMPANY_INFO.phone}</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-serif text-brand-dark mb-4 border-b border-brand-gold/30 pb-2">2. Предмет и Роля на агента</h2>
            <p>
              „Beliva VIP Tour“ извършва дейност като <strong>Туристически агент</strong> по смисъла на Закона за туризма (ЗТ). Ние действаме изключително като <strong>посредник</strong> между Потребителя (клиента) и съответния лицензиран Туроператор (организатор на пътуването).
            </p>
            <p className="mt-4">
              Всички договори за организирано туристическо пътуване (туристически пакети) се сключват от името и за сметка на съответния Туроператор. Условията на пътуването, анулациите и отговорностите се определят от Общите условия на конкретния Туроператор, които се предоставят на Потребителя преди сключване на договора.
            </p>
            <p className="mt-4">
              В съответствие с изискванията на Закона за туризма, преди сключване на договор ще ви информираме кой е конкретният Туроператор-организатор на вашето пътуване и ще ви предоставим данните за неговата гаранция за защита при неплатежоспособност (застраховател или гаранционен фонд), вкл. нейните координати, заедно с офертата/договора за конкретното пътуване. Ние, в качеството си на туристически агент, не разполагаме с отделна собствена гаранция за неплатежоспособност, тъй като такава е законово задължение на съответния Туроператор-организатор.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-serif text-brand-dark mb-4 border-b border-brand-gold/30 pb-2">3. Резервации и Сключване на договор</h2>
            <ul className="list-disc pl-6 space-y-2 marker:text-brand-gold">
              <li>Резервация може да бъде направена чрез изпращане на запитване през уебсайта, по имейл или телефон.</li>
              <li>След потвърждение на наличността от страна на Туроператора, Потребителят получава договор за организирано пътуване.</li>
              <li>Договорът влиза в сила след двустранното му подписване (физически или електронно) и заплащане на изискуемия депозит по посочената банкова сметка.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-serif text-brand-dark mb-4 border-b border-brand-gold/30 pb-2">4. Цени и Плащания</h2>
            <p>
              Обявените на уебсайта цени са информативни. Крайната и точна цена се фиксира в договора за организирано пътуване към момента на резервацията.
            </p>
            <p className="mt-4">
              Плащанията се извършват по банков път в сроковете, посочени в договора. При неспазване на сроковете за плащане на депозит или доплащане, резервацията може да бъде анулирана автоматично с произтичащите от това неустойки.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-serif text-brand-dark mb-4 border-b border-brand-gold/30 pb-2">5. Анулации и Неустойки</h2>
            <p>
              Тъй като „Beliva VIP Tour“ действа като агент, условията за анулация, промени по резервацията и размера на дължимите неустойки се определят изцяло от Общите условия на организатора (Туроператора) за съответната програма.
            </p>
            <p className="mt-4 font-bold text-brand-dark">
              Силно препоръчваме на всички наши клиенти сключването на застраховка „Отмяна на пътуване“, която може да възстанови удържаните неустойки при възникване на основателни причини (напр. заболяване).
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-serif text-brand-dark mb-4 border-b border-brand-gold/30 pb-2">6. Отговорности</h2>
            <p>
              Като туристически агент, „Beliva VIP Tour“ <strong>не носи отговорност</strong> за:
            </p>
            <ul className="list-disc pl-6 space-y-2 marker:text-brand-gold">
              <li>Неизпълнение или неточно изпълнение на туристическия пакет от страна на Туроператора.</li>
              <li>Промени в разписания на полети, анулирани полети или закъснения, причинени от авиокомпании.</li>
              <li>Отказ на гранични власти да допуснат Потребителя на територията на съответната държава поради нередовни документи (напр. паспорт с изтичаща валидност, липса на виза).</li>
            </ul>
            <p className="mt-4">
              Отговорността за съхранение на лични документи, пари и ценности по време на пътуването е изцяло на Потребителя.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-serif text-brand-dark mb-4 border-b border-brand-gold/30 pb-2">7. Рекламации и Спорове</h2>
            <p>
              В случай на неточно изпълнение на услугите по време на пътуването, Потребителят е длъжен незабавно да уведоми представителя на Туроператора на място (екскурзовод, местен агент), за да се предприемат мерки. 
            </p>
            <p className="mt-4">
              Официални рекламации се подават в писмен вид към съответния Туроператор чрез нас в сроковете, посочени в Закона за туризма и конкретния договор за пътуване.
            </p>
          </section>

          <div className="pt-10 border-t border-gray-100 mt-16">
            <p className="text-sm italic text-gray-400">
              Последна актуализация: Юли 2026 г.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}