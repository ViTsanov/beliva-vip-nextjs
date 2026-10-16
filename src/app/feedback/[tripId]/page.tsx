import type { Metadata } from 'next';
import Link from 'next/link';
import { getAdminDb } from '@/lib/firebaseAdmin';
import FeedbackForm from './FeedbackForm';

// Личен линк за отзив след пътуване: /feedback/{token}. Токенът е документ в reviewRequests, създаден от
// админ панела (Групи → Изпрати запитване за отзив / Табло). Четем го на сървъра с Admin SDK — клиентът
// няма достъп до базата и не вижда нищо освен името си и името на екскурзията.
// (Папката се казва [tripId] по исторически причини; стойността е токенът на запитването.)

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Вашият отзив',
  robots: { index: false, follow: false },
};

const isExpired = (expiresAt?: number) => !!expiresAt && Date.now() > expiresAt;

function MessageScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcf9f2] text-center p-6">
      <div className="bg-white p-12 rounded-[3rem] shadow-xl max-w-md w-full">
        <h1 className="text-2xl font-serif italic text-brand-dark mb-4">{title}</h1>
        <p className="text-gray-500 mb-8">{message}</p>
        <Link href="/" className="inline-block text-[10px] font-black uppercase tracking-widest bg-brand-gold text-white px-8 py-4 rounded-2xl hover:bg-brand-dark transition-all">
          Към началната страница
        </Link>
      </div>
    </div>
  );
}

export default async function FeedbackPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId: token } = await params;

  if (!/^[A-Za-z0-9-]{20,64}$/.test(token || '')) {
    return <MessageScreen title="Невалиден линк" message="Този линк за отзив не е валиден." />;
  }

  let data: any = null;
  try {
    const snap = await getAdminDb().collection('reviewRequests').doc(token).get();
    data = snap.exists ? snap.data() : null;
  } catch (error) {
    console.error('[feedback page]', error);
    return <MessageScreen title="Възникна грешка" message="Моля, опитайте отново по-късно." />;
  }

  if (!data) return <MessageScreen title="Невалиден линк" message="Този линк за отзив не е валиден." />;
  if (data.status === 'completed') {
    return <MessageScreen title="Благодарим Ви!" message="Вече получихме Вашия отзив. Радваме се, че пътувахте с нас!" />;
  }
  if (isExpired(data.expiresAt)) {
    return <MessageScreen title="Линкът е изтекъл" message="Ако искате да споделите впечатленията си, пишете ни — ще се радваме." />;
  }

  return (
    <FeedbackForm
      token={token}
      firstName={String(data.customerName || '').split(' ')[0]}
      tourTitle={data.tourTitle || ''}
    />
  );
}
