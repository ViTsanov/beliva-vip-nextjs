import { ITour } from "@/types";

export default function TourSchema({ tour }: { tour: ITour }) {
  // Извличаме само числата от цената (напр. от "от 2500 лв." става "2500")
  const numericPrice = tour.price ? tour.price.replace(/[^0-9]/g, '') : "0";

  const schema = {
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

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}