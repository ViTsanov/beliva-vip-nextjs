import { ITour } from "@/types";

interface TourReview {
  rating: number;
  comment: string;
  customerName: string;
}

export default function TourSchema({ tour, reviews = [] }: { tour: ITour; reviews?: TourReview[] }) {
  // Извличаме само числата от цената (напр. от "от 2500 лв." става "2500")
  const numericPrice = tour.price ? tour.price.replace(/[^0-9]/g, '') : "0";

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product", // Използваме Product, защото Google най-добре визуализира цени за него
    "name": `${tour.title} | Екскурзия до ${tour.country}`,
    "image": tour.img,
    "description": tour.intro ? tour.intro.replace(/<[^>]*>?/gm, '').substring(0, 160) : `Резервирайте незабравимо пътуване до ${tour.country}.`,
    "brand": {
      "@type": "Brand",
      "name": "Beliva VIP Tour"
    },
    "offers": {
      "@type": "Offer",
      "url": `https://belivavip.bg/tour/${tour.slug || tour.tourId || tour.id}`,
      "priceCurrency": "EUR", // Смени на EUR, ако цените ви са в евро
      "price": numericPrice,
      "availability": "https://schema.org/InStock",
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

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}