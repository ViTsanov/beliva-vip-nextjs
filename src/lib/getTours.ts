import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function getTours() {
  try {
    // Дърпаме всички екскурзии
    const q = query(collection(db, "tours"));
    const snapshot = await getDocs(q);
    
    // ТУК Е МАГИЯТА: Превръщаме всичко в обикновен текст/JSON
    const tours = snapshot.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        tourId: data.tourId || doc.id,
        title: data.title || "Без заглавие",
        img: data.img || "",
        price: data.price ? String(data.price) : "По запитване",
        country: data.country || "",
        date: data.date || "",
        duration: data.duration || "",
        
        // ВАЖНО: Конвертираме датите, за да не гърми Next.js
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null,
        dates: Array.isArray(data.dates) 
          ? data.dates.map((d: any) => d.toDate ? d.toDate().toISOString() : d) 
          : [],
      };
    });

    return tours;

  } catch (error) {
    console.error("Грешка при теглене на екскурзии:", error);
    return [];
  }
}