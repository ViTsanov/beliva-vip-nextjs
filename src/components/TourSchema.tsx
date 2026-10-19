import { ITour } from "@/types";
import JsonLd from "@/components/JsonLd";
import { isOperatorHotlink } from "@/lib/operatorImageDomains";
import { normalizeTourDates, toISODate } from "@/lib/tourDates";

interface TourReview {
  rating: number;
  comment: string;
  customerName: string;
}

const SITE_URL = "https://belivavip.bg";

// Наличност според статуса на групата (Google показва „Изчерпано“ / „Ограничена наличност“ в резултатите)
const AVAILABILITY: Record<string, string> = {
  "sold-out": "https://schema.org/SoldOut",
  "last-places": "https://schema.org/LimitedAvailability",
};

export default function TourSchema({ tour, reviews = [] }: { tour: ITour; reviews?: TourReview[] }) {
  const country = Array.isArray(tour.country) ? tour.country.join(", ") : tour.country;
  // Промо цената е тази, която клиентът реално плаща. Само цифрите: „5 661 €“ → „5661“.
  const numericPrice = String(tour.discountPrice || tour.price || "").replace(/[^0-9]/g, "") || "0";

  // Цената важи до последната предстояща дата (или до края на промоцията, ако е по-рано)
  const today = new Date().toISOString().split("T")[0];
  const lastDate = normalizeTourDates([...(tour.dates || []), tour.date]).filter(d => d >= today).pop();
  const promoEnd = tour.discountPrice ? toISODate(tour.promoEnd) : null;
  const priceValidUntil = [lastDate, promoEnd].filter((d): d is string => !!d).sort()[0];

  // Снимка само от нашия сайт/хранилище — чужди сайтове на туроператори не се ползват за Google
  const image = tour.img && !isOperatorHotlink(tour.img)
    ? (tour.img.startsWith("http") ? tour.img : `${SITE_URL}${tour.img}`)
    : undefined;

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product", // Използваме Product, защото Google най-добре визуализира цени за него
    "name": tour.title,
    ...(image && { "image": image }),
    "description": tour.intro ? tour.intro.replace(/<[^>]*>?/gm, '').substring(0, 160) : `Резервирайте незабравимо пътуване до ${country}.`,
    "brand": {
      "@type": "Brand",
      "name": "Beliva VIP Tour"
    },
    "offers": {
      "@type": "Offer",
      "url": `${SITE_URL}/tour/${tour.slug || tour.tourId || tour.id}`,
      "priceCurrency": "EUR",
      "price": numericPrice,
      ...(priceValidUntil && { "priceValidUntil": priceValidUntil }),
      "availability": AVAILABILITY[tour.groupStatus] || "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": "Beliva VIP Tour"
      }
    }
  };

  // aggregateRating/review — само ако има реални публикувани отзиви за ТОЧНО този тур. Google изрично
  // забранява фалшиви/измислени рейтинги в structured data — ако няма отзиви, полетата просто
  // отсъстват от схемата за този тур — не ги измисляме.
  if (reviews.length > 0) {
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": avgRating.toFixed(1),
      "reviewCount": reviews.length,
      "bestRating": "5",
      "worstRating": "1",
    };
    schema.review = reviews.map(r => ({
      "@type": "Review",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": r.rating,
        "bestRating": "5",
        "worstRating": "1",
      },
      "author": {
        "@type": "Person",
        "name": r.customerName,
      },
      "reviewBody": r.comment,
    }));
  }

  return <JsonLd data={schema} />;
}
