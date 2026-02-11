import { ITour } from "@/types";

export default function TourSchema({ tour }: { tour: ITour }) {
  // Извличаме само цифрите от цената за Google
  const numericPrice = parseFloat(tour.price.replace(/[^0-9.]/g, '')) || 0;
  
  // Определяме наличността
  const availability = tour.groupStatus === 'sold-out' 
    ? "https://schema.org/SoldOut" 
    : "https://schema.org/InStock";

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product", // Google предпочита Product за туристически пакети с цена
    "name": tour.title,
    "description": `Ексклузивна екскурзия до ${tour.country}. ${tour.duration || ''}. ${tour.intro || ''}`,
    "image": [tour.img],
    "brand": {
      "@type": "Brand",
      "name": "Beliva VIP Tour"
    },
    "offers": {
      "@type": "Offer",
      "url": `https://belivavip.bg/tour/${tour.tourId || tour.id}`, // Смени с твоя домейн
      "priceCurrency": "EUR", // Или EUR, ако е в евро
      "price": numericPrice,
      "availability": availability,
      "validFrom": tour.date // Дата на екскурзията
    },
    "countryOfOrigin": {
        "@type": "Country",
        "name": tour.country
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}