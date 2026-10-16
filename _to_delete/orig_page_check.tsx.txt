import { getAdminDb } from '@/lib/firebaseAdmin';
import CheckoutForm from './CheckoutForm';
import Link from 'next/link';

// Публична страница — достъпна БЕЗ логин, само с валиден токен в URL-а. Сървърен компонент, за да
// валидираме токена и извлечем данните ПРЕДИ изобщо да покажем каквото и да е на клиента (никога не
// разчитаме на клиентски JS за проверка на достъпа).
//
// Ползваме Firebase Admin SDK (getAdminDb) за четенето — не обичайния клиентски SDK, ползван навсякъде
// другаде в сайта — защото анонимен посетител тук не може да мине през нормалните Firestore правила
// (изискват логнат админ). Сигурността идва от самата проверка на токена по-долу, не от Firestore rules.

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

export default async function CheckoutPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let inquiry: any = null;
  let errorTitle = '';
  let errorMessage = '';

  try {
    const db = getAdminDb();
    const snap = await db.collection('inquiries').where('checkoutToken', '==', token).limit(1).get();

    if (snap.empty) {
      errorTitle = 'Линкът не е валиден';
      errorMessage = 'Провери дали си копирал целия линк, или се свържи с агенцията за нов.';
    } else {
      const doc = snap.docs[0];
      const data = doc.data();

      if (!data.checkoutTokenExpiry || Date.now() > data.checkoutTokenExpiry) {
        errorTitle = 'Линкът е изтекъл';
        errorMessage = 'Валидността му е 7 дни. Свържи се с агенцията за нов линк.';
      } else if (data.checkoutCompletedAt) {
        errorTitle = 'Данните вече са изпратени';
        errorMessage = 'Благодарим! Нашият екип вече обработва информацията, която си предоставил.';
      } else {
        inquiry = { id: doc.id, ...data };
      }
    }
  } catch (error) {
    console.error('[checkout page]', error);
    errorTitle = 'Възникна грешка';
    errorMessage = 'Моля, опитайте отново по-късно, или се свържете с агенцията.';
  }

  // Сървърни компоненти могат да предават на Клиентски компоненти САМО чисти, сериализируеми данни — а Firebase
  // Admin SDK връща Firestore Timestamp-ите (напр. createdAt) като клас-инстанции, не обикновени
  // обекти — това чупи границата. JSON round-trip ги превръща в чисти, плоски обекти
  // (Timestamp класът има вграден toJSON(), който JSON.stringify автоматично използва).
  if (inquiry) {
    inquiry = JSON.parse(JSON.stringify(inquiry));
  }

  if (!inquiry) {
    return <ErrorScreen title={errorTitle} message={errorMessage} />;
  }

  // Данни за банков превод — от Settings (settings/payment), не твърдо закодирани в кода, за да можеш
  // да ги смениш сам без да пипаш код. Ако още не са зададени, показваме placeholder текст, който казва
  // на клиента да изчака свързване от агенцията вместо грешни/празни данни.
  let paymentInfo = { iban: '', accountHolder: '', bankName: '' };
  try {
    const db = getAdminDb();
    const paymentSnap = await db.collection('settings').doc('payment').get();
    if (paymentSnap.exists) {
      paymentInfo = { ...paymentInfo, ...paymentSnap.data() };
    }
  } catch (error) {
    console.error('[checkout page — payment info]', error);
  }

  return <CheckoutForm inquiry={inquiry} token={token} paymentInfo={paymentInfo} />;
}
