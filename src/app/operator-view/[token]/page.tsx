import { getAdminDb } from '@/lib/firebaseAdmin';
import { decryptField } from '@/lib/encryption';
import PrintButton from './PrintButton';
import Link from 'next/link';

// Публична страница (без логин), достъпна САМО с валиден токен в URL-а — вижда се от турооператора.
// Заменя предишния подход (данни директно в тялото на имейла) с по-сигурен: имейлът съдържа само линк,
// а самите ЕГН/паспорт данни се декриптират ЕДИНСТВЕНО тук, сървърно, при отваряне на страницата.
//
// Токенът живее директно върху засегнатите inquiries документи (operatorViewToken/operatorViewTokenExpiry) —
// същия модел като checkoutToken за клиентския checkout флоу, не отделна колекция.

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark p-6">
      <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full text-center shadow-2xl">
        <h1 className="font-serif italic text-2xl text-brand-dark mb-4">{title}</h1>
        <p className="text-gray-500 text-sm mb-8">{message}</p>
        <Link href="/" className="text-brand-gold font-bold text-xs uppercase tracking-widest">Към сайта</Link>
      </div>
    </div>
  );
}

export default async function OperatorViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getAdminDb();

  let inquiries: any[] = [];
  let errorTitle = '';
  let errorMessage = '';

  try {
    const snap = await db.collection('inquiries').where('operatorViewToken', '==', token).get();

    if (snap.empty) {
      errorTitle = 'Линкът не е валиден';
      errorMessage = 'Провери дали си копирал целия линк, или се свържи с агенцията за нов.';
    } else {
      const docs: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const first = docs[0];

      // Това е Server Component, изпълняван веднъж на заявка, не клиентски рендер, който се преизпълнява
      // непредвидимо — правилото е написано за клиентска чистота, не за това. Проверката за "изтекъл
      // ли е токена" трябва да е с актуалното време на заявката.
      // eslint-disable-next-line react-hooks/purity
      if (!first.operatorViewTokenExpiry || Date.now() > first.operatorViewTokenExpiry) {
        errorTitle = 'Линкът е изтекъл';
        errorMessage = 'Валидността му е 7 дни. Свържи се с агенцията за нов линк.';
      } else {
        inquiries = docs;
        // Маркираме кога операторът реално е отворил страницата — вижда се в admin панела, полезно да
        // знаеш дали данните реално са стигнали, не само дали имейлът е изпратен.
        const viewedAt = new Date().toISOString();
        await Promise.all(
          docs
            .filter(d => !d.operatorViewedAt)
            .map(d => db.collection('inquiries').doc(d.id).update({ operatorViewedAt: viewedAt }))
        );
      }
    }
  } catch (error) {
    console.error('[operator-view page]', error);
    errorTitle = 'Възникна грешка';
    errorMessage = 'Моля, свържете се с агенцията директно.';
  }

  if (inquiries.length === 0) {
    return <ErrorScreen title={errorTitle} message={errorMessage} />;
  }

  // За всяко запитване, изтегляме тура (за цена по каталог + оригинален линк) и декриптираме пътниците.
  const entries = await Promise.all(inquiries.map(async (inq) => {
    let tour: any = null;
    if (inq.tourId) {
      const tourSnap = await db.collection('tours').doc(inq.tourId).get();
      if (tourSnap.exists) tour = tourSnap.data();
    }
    const travelers = (inq.travelers || []).map((t: any) => ({
      latinName: t.latinName || '',
      egn: t.egn ? decryptField(t.egn) : '',
      passportNumber: t.passportNumber ? decryptField(t.passportNumber) : '',
      passportValidity: t.passportValidity || '',
    }));
    return { inquiry: inq, tour, travelers };
  }));

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8 print:hidden">
          <div>
            <p className="text-[10px] font-black uppercase text-brand-gold tracking-[0.2em]">Beliva VIP Tour</p>
            <h1 className="font-serif italic text-2xl text-brand-dark mt-1">Данни за резервация</h1>
          </div>
          <PrintButton />
        </div>

        <div className="space-y-6">
          {entries.map(({ inquiry, tour, travelers }, idx) => {
            const priceMatch = tour?.price ? String(tour.price).match(/[\d.]+/) : null;
            const regularPrice = priceMatch ? parseFloat(priceMatch[0]) : 0;

            return (
              <div key={inquiry.id} className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 print:shadow-none print:border-b print:rounded-none">
                <h2 className="font-serif italic text-xl text-brand-dark mb-1">{inquiry.tourTitle}</h2>
                <p className="text-sm text-gray-400 mb-1">{inquiry.tourDate}</p>
                {tour?.externalSourceLink && (
                  <a href={tour.externalSourceLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 underline break-all">
                    {tour.externalSourceLink}
                  </a>
                )}
                <p className="text-xs text-gray-500 mt-3 mb-6">
                  Контактен клиент: <span className="font-bold text-brand-dark">{inquiry.clientName}</span> ({inquiry.clientPhone || '—'}, {inquiry.clientEmail || '—'})
                </p>

                <div className="space-y-3">
                  {travelers.map((t: any, i: number) => (
                    <div key={i} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Пътник {i + 1}</p>
                      <p className="font-bold text-brand-dark text-sm mb-2">{t.latinName}</p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div><span className="text-gray-400 block">ЕГН</span><span className="font-mono font-bold text-brand-dark">{t.egn}</span></div>
                        <div><span className="text-gray-400 block">Паспорт</span><span className="font-mono font-bold text-brand-dark">{t.passportNumber}</span></div>
                        <div className="col-span-2"><span className="text-gray-400 block">Валидност на паспорта</span><span className="font-bold text-brand-dark">{t.passportValidity}</span></div>
                      </div>
                    </div>
                  ))}
                </div>

                {regularPrice > 0 && (
                  <p className="text-xs text-gray-500 mt-6 pt-6 border-t border-gray-100">
                    Цена по каталог на пътник: <span className="font-bold text-brand-dark">{regularPrice} €</span> × {travelers.length} = <span className="font-bold text-brand-dark">{regularPrice * travelers.length} €</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8 print:mt-4">
          Beliva VIP Tour · Луксозни пътувания по света
        </p>
      </div>
    </div>
  );
}
