export interface ITour {
  id: string;
  tourId?: string;
  title: string;
  price: string;
  operator?: string;
  durationDays?: string | number;
// 👇 ПРОМОЦИИ 👇
  isPromo?: boolean;
  discountAmount?: string | number; // Колко пари е отстъпката
  discountPrice?: string; // Крайната сметната цена
  promoLabel?: string;
  promoBgColor?: string; // Цвят на фона
  promoTextColor?: string; // Цвят на текста
  campaignId?: string;
  promoStart?: string;
  promoEnd?: string;
  promoEffect?: string;
  historicalDates?: string[];
  // 👆 --------- 👆
  img: string;
  images?: string[] | string; 
  gallery?: string[];
  country: string | string[];
  visitedPlaces?: string[];
  continent: string;
  status: string;
  groupStatus: 'active' | 'confirmed' | 'last-places' | 'sold-out';
  date: string;
  dates?: string[];
  duration?: string;
  nights?: string | number;
  route?: string; // 👈 Добавено
  generalInfo?: string; // 👈 Добавено
  intro?: string;
  // Програмата може да е в поле 'program' или 'itinerary'
  program?: { day: number; title: string; desc: string; content?: string }[];
  itinerary?: { day: number; title: string; desc: string; content?: string }[]; // 👈 Добавено, уеднаквен тип
  
  // Тези полета може да са стринг или масив от стрингове
  included?: string | string[]; 
  notIncluded?: string | string[];
  excluded?: string[]; // Понякога е excluded, понякога notIncluded
  
  documents?: string | string[]; // 👈 Добавено
  pdfUrl?: string;
  notes?: string;
  categories?: string[];
  slug?: string;
}

export interface IPost {
  id: string;
  slug?: string;
  title: string;
  img: string; // 👈 Добавено (беше само coverImg)
  coverImg?: string;
  excerpt?: string;
  content?: string;
  author?: string;
  relatedCountry?: string;
  createdAt?: any; 
  readTime?: number;
  gallery?: string;
}