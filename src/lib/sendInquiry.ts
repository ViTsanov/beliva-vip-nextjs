import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import { db } from '@/lib/firebase';

// Едно място за изпращане на запитване (страницата „Контакти“ и прозорецът „Запитване“ в менюто):
// 1) запис в Firestore „inquiries“ — същите полета като досега, за да ги чете CRM-ът;
// 2) имейл известие до офиса през EmailJS;
// 3) проследяване на лийд (GA4 generate_lead + Meta Pixel Lead), ако са заредени.

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '';
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || '';
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '';

export interface InquiryInput {
  name: string;
  phone: string;
  email: string;
  message: string;
  tour: { id: string; title: string; price?: string } | null; // null = без конкретна екскурзия
  destination?: string; // държава, ако клиентът е избрал само дестинация (без конкретна екскурзия)
  date: string; // ISO дата, „Без точна дата“ или празно
  source: 'contact_page' | 'navbar_modal' | 'tour_page';
}

export async function sendInquiry({ name, phone, email, message, tour, destination, date, source }: InquiryInput) {
  // Заглавието в CRM-а: турът, „Дестинация: …“ или „Общо запитване“.
  const tourTitle = tour?.title || (destination ? `Дестинация: ${destination}` : 'Общо запитване');

  await addDoc(collection(db, 'inquiries'), {
    tourId: tour?.id || 'general-contact',
    tourTitle,
    tourDate: date || 'Не е избрана',
    basePrice: tour?.price || 'По запитване',
    clientName: name.trim(),
    clientEmail: email.trim().toLowerCase() || 'няма имейл',
    clientPhone: phone.trim(),
    message: message.trim(),
    type: tour ? 'tour_inquiry' : destination ? 'destination_inquiry' : 'general_contact',
    ...(destination && !tour ? { destination } : {}),
    status: 'new',
    createdAt: serverTimestamp(),
    isRead: false,
    source,
  });

  // Запитването вече е записано — ако известието по имейл не мине, клиентът НЕ трябва да вижда грешка
  // (иначе праща отново и в CRM-а се появяват дубликати). Само го логваме.
  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        name: 'Beliva VIP Admin',
        time: new Date().toLocaleString('bg-BG'),
        tour_title: tourTitle,
        tour_price: tour?.price || 'По запитване',
        selected_date: date || 'Не е посочена',
        user_name: name.trim(),
        user_phone: phone.trim(),
        user_email: email.trim(),
        user_message: message.trim(),
      },
      PUBLIC_KEY,
    );
  } catch (err) {
    console.error('Имейл известието за запитването не беше изпратено:', err);
  }

  // gtag/fbq може да липсват (отказани бисквитки или още незаредени скриптове) — тогава просто прескачаме.
  const w = window as unknown as {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  };
  w.gtag?.('event', 'generate_lead', {
    lead_type: tour ? 'tour_inquiry' : destination ? 'destination_inquiry' : 'general_contact',
    tour_title: tourTitle,
    source,
  });
  w.fbq?.('track', 'Lead', { content_name: tourTitle });
}
