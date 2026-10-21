// src/lib/pdf/renderTourPdf.tsx
//
// Тур (от базата или от формата в админ панела) → PDF файл. Ползва се от:
//   - /tour/<id>/programa.pdf     — публичният PDF на страницата на тура (от записаните данни)
//   - /api/admin/tour-pdf         — „Преглед на PDF“ в админ панела (от незаписаните данни във формата)

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { renderToBuffer } from '@react-pdf/renderer';
import type { ITour } from '@/types';
import { splitListText } from '@/lib/listItems';
import { formatPrice } from '@/lib/formatPrice';
import { normalizeTourDates, displayTourDate } from '@/lib/tourDates';
import { isOperatorHotlink } from '@/lib/operatorImageDomains';
import { TourProgramPdf, type PdfTourData } from './TourProgramPdf';

const SITE_URL = 'https://belivavip.bg';

// Текстовете може да съдържат HTML от стари записи (<p>, <br>, &nbsp;) — за PDF-а остава само текстът
function plainText(value: unknown): string {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\r\n?/g, '\n')
    .trim();
}

const paragraphs = (value: unknown) => plainText(value).split(/\n+/).map(p => p.trim()).filter(Boolean);

// Описанието на деня често започва с „3 ДЕН –“ или „ДЕН 3 –“ (дублира номера, който PDF-ът вече показва).
// Датата след него остава — тя е полезна.
const DAY_PREFIX = /^\s*(?:\d{1,2}\s*(?:-?\s*(?:ви|ри|ти|ми|ва))?\s*ден(?![а-яА-Я])|ден\s*\d{1,2})\s*[–\-—:]?\s*/i;

function photoUrl(img: string): string | null {
  if (!img || isOperatorHotlink(img)) return null;
  if (img.startsWith('http')) return img;
  if (img.startsWith('/')) return img; // снимка от public/
  return null;
}

// Снимката се свежда до ~1200px JPEG (@react-pdf чете само JPEG/PNG, а библиотеката ни е в WebP)
async function loadPhoto(img: string): Promise<Buffer | null> {
  const src = photoUrl(img);
  if (!src) return null;
  try {
    let input: Buffer;
    if (src.startsWith('/')) {
      input = await readFile(path.join(process.cwd(), 'public', src));
    } else {
      const res = await fetch(src, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      input = Buffer.from(await res.arrayBuffer());
    }
    return await sharp(input).rotate().resize({ width: 1200, height: 540, fit: 'cover' }).jpeg({ quality: 74, mozjpeg: true }).toBuffer();
  } catch (error) {
    console.error('[tour-pdf] снимката не се зареди:', src, error);
    return null;
  }
}

let logoCache: Buffer | null = null;
async function loadLogo(): Promise<Buffer | null> {
  if (logoCache) return logoCache;
  try {
    const raw = await readFile(path.join(process.cwd(), 'public', 'beliva_logo.png'));
    logoCache = await sharp(raw).resize(160, 160).png().toBuffer();
    return logoCache;
  } catch {
    return null;
  }
}

// Само тези полета на тура се ползват за PDF-а — формата в админ панела подава същите.
export type PdfSourceTour = Pick<ITour,
  'title' | 'country' | 'route' | 'durationDays' | 'nights' | 'price' | 'isPromo' | 'discountPrice' | 'dates' | 'date' |
  'intro' | 'itinerary' | 'included' | 'notIncluded' | 'excluded' | 'documents' | 'generalInfo' | 'flightInfo' | 'img'
> & { tourId?: string; slug?: string; id?: string };

export function toPdfData(tour: PdfSourceTour, todayIso = new Date().toISOString().slice(0, 10)): Omit<PdfTourData, 'photo' | 'logo'> {
  const countries = Array.isArray(tour.country) ? tour.country : String(tour.country || '').split(',');
  const days = Number(String(tour.durationDays ?? '').replace(/[^\d]/g, '')) || tour.itinerary?.length || 0;
  const nights = Number(String(tour.nights ?? '').replace(/[^\d]/g, '')) || 0;

  const basePrice = formatPrice(tour.price);
  const promo = !!(tour.isPromo && tour.discountPrice);
  const priceLabel = (p: string) => (!p || /запитване/i.test(p) ? 'По запитване' : p);

  // Само предстоящите дати — минали дати в документа за записване само объркват
  const dates = normalizeTourDates([...(tour.dates || []), tour.date])
    .filter(d => d >= todayIso)
    .map(displayTourDate);

  const slug = tour.slug || tour.tourId || tour.id || '';

  return {
    title: plainText(tour.title),
    kicker: countries.map(c => c.trim()).filter(Boolean).join(' · '),
    route: plainText(tour.route),
    duration: [days ? `${days} ${days === 1 ? 'ден' : 'дни'}` : '', nights ? `${nights} ${nights === 1 ? 'нощувка' : 'нощувки'}` : ''].filter(Boolean).join(' / '),
    price: priceLabel(promo ? formatPrice(tour.discountPrice) : basePrice),
    oldPrice: promo && basePrice ? basePrice : undefined,
    dates,
    intro: plainText(tour.intro),
    days: (tour.itinerary || []).map((d, i) => {
      const title = plainText(d.title);
      return {
        day: Number(d.day) || i + 1,
        // „Ден 3“ без друго е само номерът, който PDF-ът вече показва
        title: /^ден\s*\d+$/i.test(title) ? '' : title,
        paragraphs: paragraphs(d.content || d.desc).map((p, idx) => (idx === 0 ? p.replace(DAY_PREFIX, '') : p)).filter(Boolean),
      };
    }).filter(d => d.title || d.paragraphs.length),
    flights: paragraphs(tour.flightInfo),
    included: splitListText(tour.included),
    excluded: splitListText(tour.notIncluded || tour.excluded),
    documents: splitListText(tour.documents),
    info: paragraphs(tour.generalInfo),
    pageUrl: slug ? `${SITE_URL}/tour/${encodeURIComponent(slug)}` : SITE_URL,
    generatedOn: displayTourDate(todayIso),
  };
}

export async function renderTourPdf(tour: PdfSourceTour): Promise<Buffer> {
  const [photo, logo] = await Promise.all([loadPhoto(tour.img || ''), loadLogo()]);
  return renderToBuffer(<TourProgramPdf tour={{ ...toPdfData(tour), photo, logo }} />);
}

// Име на файла при изтегляне: „Beliva-peru-s-martin.pdf“
export const pdfFileName = (tour: PdfSourceTour) =>
  `Beliva-${(tour.slug || tour.tourId || tour.id || 'programa').replace(/[^\w-]+/g, '-')}.pdf`;
