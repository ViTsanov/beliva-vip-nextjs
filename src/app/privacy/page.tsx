import type { Metadata } from "next";
import { COMPANY_INFO } from "@/lib/companyInfo";

export const metadata: Metadata = {
  title: "Политика за поверителност | Beliva VIP Tour",
  description: "Научете как Beliva VIP Tour събира, съхранява и защитава вашите лични данни съгласно изискванията на GDPR.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#fcf9f2]">
      <div className="container mx-auto px-6 py-32 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-serif italic text-brand-dark mb-10">Политика за поверителност и Бисквитки</h1>
        
        <div className="prose prose-lg text-gray-600 max-w-none">
          <p className="lead font-medium text-xl text-gray-800 mb-8">
            Настоящата Политика за поверителност има за цел да ви информира как <strong>[ИМЕ НА ФИРМАТА]</strong> („Ние“, „Beliva VIP Tour“, „Администраторът“) третира Вашите лични данни и какви са Вашите права съгласно Общия регламент относно защитата на данните (ЕС) 2016/679 (GDPR) и българското законодателство.
          </p>

          <h3 className="text-brand-dark font-serif mt-12 text-2xl border-b border-brand-gold/30 pb-2">1. Данни за Администратора</h3>
          <ul className="list-none space-y-2 mt-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <li><strong>Наименование:</strong> {COMPANY_INFO.legalName}</li>
            <li><strong>ЕИК / БУЛСТАТ:</strong> {COMPANY_INFO.eik}</li>
            <li><strong>Седалище и адрес на управление:</strong> {COMPANY_INFO.address}</li>
            <li><strong>Имейл за връзка:</strong> {COMPANY_INFO.email}</li>
            <li><strong>Телефон:</strong> {COMPANY_INFO.phone} </li>
          </ul>

          <h3 className="text-brand-dark font-serif mt-12 text-2xl border-b border-brand-gold/30 pb-2">2. Какви лични данни събираме?</h3>
          <p className="mt-4">Събираме само онези лични данни, които са абсолютно необходими за предоставянето на нашите услуги:</p>
          <ul className="list-disc pl-6 space-y-2 marker:text-brand-gold">
            <li><strong>Данни за контакт:</strong> Име, фамилия, телефонен номер и имейл адрес (когато правите запитване или резервация).</li>
            <li><strong>Данни за пътуването:</strong> Предпочитания за дестинации, дати, брой пътници и друга информация, която доброволно ни предоставяте в полетата за коментар.</li>
            <li><strong>Технически данни:</strong> IP адрес, вид браузър, данни за устройството и информация за взаимодействието ви със сайта (чрез бисквитки).</li>
          </ul>

          <h3 className="text-brand-dark font-serif mt-12 text-2xl border-b border-brand-gold/30 pb-2">3. Цел и правно основание за обработване</h3>
          <p className="mt-4">Вашите данни се обработват на следните правни основания (чл. 6 от GDPR):</p>
          <ul className="list-disc pl-6 space-y-2 marker:text-brand-gold">
            <li><strong>Преддоговорни отношения и изпълнение на договор:</strong> За да обработим Вашето запитване и да организираме желаното от Вас пътуване.</li>
            <li><strong>Легитимен интерес:</strong> За подобряване на нашите услуги, функционалността на уебсайта и за защита от измами.</li>
            <li><strong>Изрично съгласие:</strong> За използване на аналитични бисквитки или изпращане на маркетингови съобщения (бюлетин), ако сте се абонирали.</li>
            <li><strong>Законово задължение:</strong> За спазване на изискванията на счетоводното и данъчното законодателство на Република България.</li>
          </ul>

          <h3 className="text-brand-dark font-serif mt-12 text-2xl border-b border-brand-gold/30 pb-2">4. На кого предоставяме Вашите данни?</h3>
          <p className="mt-4">
            В качеството си на туристическа агенция-посредник, за да осъществим Вашето пътуване, е <strong>задължително</strong> да предадем необходимата част от Вашите лични данни на съответните туроператори, с които си партнираме. 
          </p>
          <p className="mt-2">
            Освен тях, достъп до данните могат да имат наши доверени партньори (счетоводни кантори, доставчици на IT и хостинг услуги), които са законово или договорно задължени да пазят тяхната конфиденциалност.
          </p>

          <h3 className="text-brand-dark font-serif mt-12 text-2xl border-b border-brand-gold/30 pb-2">5. Срок на съхранение</h3>
          <p className="mt-4">
            Съхраняваме Вашите лични данни само докато е необходимо за изпълнение на целите, за които са събрани. Данни, свързани със счетоводни документи и договори, се съхраняват за законоустановения срок от 10 години. Запитвания, които не са довели до резервация, се изтриват след период от [1 година].
          </p>

          <h3 className="text-brand-dark font-serif mt-12 text-2xl border-b border-brand-gold/30 pb-2">6. Политика за Бисквитки (Cookies)</h3>
          <p className="mt-4">
            Нашият уебсайт използва бисквитки, за да функционира правилно и да подобри Вашето преживяване.
          </p>
          <div className="mt-6 space-y-4">
            <div>
              <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span> Строго необходими бисквитки
              </h4>
              <p className="text-sm mt-1">Необходими за базовото функциониране на сайта (напр. запазване на оферти в "Любими", сесийни данни). Те не могат да бъдат изключени.</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-gold"></span> Аналитични бисквитки
              </h4>
              <p className="text-sm mt-1">Помагат ни да разберем как посетителите използват сайта (напр. Google Analytics). Те събират информация анонимно и се зареждат само с Ваше съгласие.</p>
            </div>
          </div>

          <h3 className="text-brand-dark font-serif mt-12 text-2xl border-b border-brand-gold/30 pb-2">7. Вашите права</h3>
          <p className="mt-4">Съгласно GDPR, Вие разполагате със следните права по отношение на Вашите данни:</p>
          <ul className="list-disc pl-6 space-y-2 marker:text-brand-gold">
            <li>Право на <strong>достъп</strong> до личните Ви данни;</li>
            <li>Право на <strong>коригиране</strong> на неточни или непълни данни;</li>
            <li>Право на <strong>изтриване</strong> („правото да бъдеш забравен“), когато няма законово основание за продължаване на обработката;</li>
            <li>Право на <strong>ограничаване</strong> на обработването и право на <strong>възражение</strong>;</li>
            <li>Право да <strong>оттеглите съгласието си</strong> по всяко време (когато данните се обработват на база съгласие).</li>
          </ul>
          <p className="mt-4 bg-gray-50 p-4 rounded-lg text-sm border border-gray-200">
            За да упражните правата си, моля свържете се с нас на имейл: <strong>office@belivavip.bg</strong>. Ние ще отговорим на Вашето искане безплатно в рамките на 30 дни.
          </p>

          <h3 className="text-brand-dark font-serif mt-12 text-2xl border-b border-brand-gold/30 pb-2">8. Право на жалба</h3>
          <p className="mt-4">
            Ако смятате, че Вашите права са нарушени, имате право да подадете жалба до надзорния орган в България:
          </p>
          <div className="mt-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <p className="font-bold text-gray-800">Комисия за защита на личните данни (КЗЛД)</p>
            <p className="text-sm mt-1"><strong>Адрес:</strong> гр. София 1592, бул. „Проф. Цветан Лазаров” № 2</p>
            <p className="text-sm"><strong>Уебсайт:</strong> <a href="https://www.cpdp.bg" target="_blank" rel="noopener noreferrer" className="text-brand-gold hover:underline">www.cpdp.bg</a></p>
            <p className="text-sm"><strong>Имейл:</strong> kzld@cpdp.bg</p>
          </div>

          <p className="text-sm text-gray-400 mt-12">
            Последна актуализация: {new Date().toLocaleDateString('bg-BG')} г.
          </p>
        </div>
      </div>
    </main>
  );
}