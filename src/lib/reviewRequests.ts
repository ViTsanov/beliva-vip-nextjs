import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import emailjs from '@emailjs/browser';

// Запитвания за отзив след пътуване (админ панел — клиентска страна).
//
// Как работи: за всеки турист от група се създава документ reviewRequests/{token} (token = случаен UUID),
// изпраща се имейл с личен линк /feedback/{token}, а в самата група при туриста се отбелязва кога е поискан
// отзивът. Публичната страница чете и записва САМО през сървъра (Admin SDK), по токена — клиентът не вижда
// нищо друго от базата.

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '';
const CLIENT_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_CLIENT_TEMPLATE_ID || '';
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '';

export const REVIEW_DELAY_DAYS = 2;            // бутонът става активен 2 дни след връщането
export const RECENT_RETURN_WINDOW_DAYS = 60;   // „наскоро върнали се“ за списъка в таблото
export const REVIEW_LINK_VALID_DAYS = 60;

// Вади датите от текст: „2026-11-03“, „03.11.2026“ или период „2026-11-03 - 2026-11-12“.
export function extractDates(value: unknown): Date[] {
  if (typeof value !== 'string') return [];
  const out: Date[] = [];
  const re = /(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})\.(\d{1,2})\.(\d{4})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value))) {
    const [y, mo, d] = m[1] ? [+m[1], +m[2], +m[3]] : [+m[6], +m[5], +m[4]];
    const dt = new Date(y, mo - 1, d);
    if (!isNaN(dt.getTime())) out.push(dt);
  }
  return out;
}

// Продължителност на тура в дни (durationDays → нощувки + 1 → „N дни“ в текста).
export function getTourDurationDays(tour: any): number | null {
  const days = parseInt(String(tour?.durationDays ?? '').replace(/\D/g, ''), 10);
  if (days > 0) return days;
  const nights = parseInt(String(tour?.nights ?? '').replace(/\D/g, ''), 10);
  if (nights > 0) return nights + 1;
  const m = String(tour?.duration ?? '').match(/(\d+)\s*(дни|ден)/i);
  return m ? +m[1] : null;
}

// Дата на връщане на групата: ръчно зададена (Логистика) → края на периода в датата → начало + продължителност.
export function getGroupReturnDate(group: any, tour?: any): Date | null {
  const explicit = extractDates(group?.returnDate)[0];
  if (explicit) return explicit;
  const dates = extractDates(group?.startDate);
  if (dates.length >= 2) return dates[dates.length - 1];
  if (dates.length === 1) {
    const days = getTourDurationDays(tour);
    if (days) {
      const r = new Date(dates[0]);
      r.setDate(r.getDate() + days - 1);
      return r;
    }
  }
  return null;
}

export function reviewAvailableFrom(returnDate: Date): Date {
  const d = new Date(returnDate);
  d.setDate(d.getDate() + REVIEW_DELAY_DAYS);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const formatDateBg = (d: Date) => d.toLocaleDateString('bg-BG');

// Изпраща запитване за отзив на един турист от група. Връща имейла, на който е изпратено.
export async function sendReviewRequest(groupId: string, touristIndex: number): Promise<{ email: string; requestedAt: string; token: string }> {
  const groupSnap = await getDoc(doc(db, 'groups', groupId));
  if (!groupSnap.exists()) throw new Error('Групата не е намерена.');
  const group: any = { id: groupSnap.id, ...groupSnap.data() };
  const tourists: any[] = Array.isArray(group.tourists) ? [...group.tourists] : [];
  const tourist = tourists[touristIndex];
  if (!tourist) throw new Error('Туристът не е намерен в групата.');
  if (!tourist.customerId || tourist.customerId === 'unknown') throw new Error('Туристът няма клиентски профил.');

  const customerSnap = await getDoc(doc(db, 'customers', tourist.customerId));
  const customer: any = customerSnap.exists() ? customerSnap.data() : null;
  const email = (customer?.email || '').trim();
  if (!email) throw new Error('Клиентът няма имейл в профила си. Добавете го от „Клиенти“.');

  const token = crypto.randomUUID();
  const customerName = tourist.name || customer?.name || `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim();
  await setDoc(doc(db, 'reviewRequests', token), {
    groupId,
    touristIndex,
    customerId: tourist.customerId,
    customerName,
    tourId: group.tourId || '',
    tourTitle: group.tourTitle || '',
    tourDate: group.startDate || '',
    tourOperator: group.tourOperator || '',
    status: 'sent',
    expiresAt: Date.now() + REVIEW_LINK_VALID_DAYS * 24 * 60 * 60 * 1000,
    createdAt: serverTimestamp(),
  });

  const link = `${window.location.origin}/feedback/${token}`;
  const firstName = (customerName || '').split(' ')[0];
  const body =
    `Здравейте${firstName ? ` ${firstName}` : ''},\n\n` +
    `Благодарим Ви, че пътувахте с Beliva VIP Tour до "${group.tourTitle}"! Надяваме се да сте се прибрали с много хубави спомени.\n\n` +
    `Ще се радваме, ако споделите впечатленията си — отнема по-малко от минута и ни помага да ставаме по-добри:\n${link}\n\n` +
    `Благодарим Ви!\nЕкипът на Beliva VIP Tour`;

  try {
    await emailjs.send(SERVICE_ID, CLIENT_TEMPLATE_ID, {
      to_email: email,
      subject: 'Как мина пътуването Ви?',
      preheader: 'Споделете впечатленията си — отнема по-малко от минута',
      message: body.replace(/\n/g, '<br>'),
    }, PUBLIC_KEY);
  } catch (e) {
    await updateDoc(doc(db, 'reviewRequests', token), { status: 'email_failed' }).catch(() => {});
    console.error('[sendReviewRequest] EmailJS', e);
    throw new Error('Имейлът не можа да бъде изпратен (провери EmailJS настройките).');
  }

  const requestedAt = new Date().toISOString();
  tourists[touristIndex] = { ...tourist, reviewRequestedAt: requestedAt, reviewToken: token };
  await updateDoc(doc(db, 'groups', groupId), { tourists });
  return { email, requestedAt, token };
}
