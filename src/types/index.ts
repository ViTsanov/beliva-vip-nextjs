export interface ITour {
  id: string;
  tourId?: string;
  peakViewId?: string; // 👈 Уникално ID от PeakView
  source?: string;     // 👈 Източник (напр. 'peakview' или 'own')
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

  continentSlug?: string;      // Въпросителната значи, че е незадължително
  countrySlugs?: string[];     // Масив от стрингове на латиница
  categorySlugs?: string[];    // Масив от стрингове на латиница

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
  relatedCountry?: string | string[];
  createdAt?: any; 
  readTime?: number;
  gallery?: string;
  externalSourceLink?: string;
}

// ==========================================
// CRM & ERP ТИПОВЕ ЗА АДМИН ПАНЕЛА
// ==========================================

// 1. КЛИЕНТ (Client)
export interface IClient {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  discountFlag: boolean;       // Има ли право на отстъпка за лоялност
  discountPercentage?: number; // Напр. 5%
  tripsCount: number;          // Брой реализирани пътувания
  notes?: string;              // Вътрешни бележки за агента

  // НОВО: Опционална банкова сметка
  iban?: string;
  
  // Данни за пътуване (попълват се при резервация)
  latinName?: string;          // Имена по паспорт
  egn?: string;                // За застраховки
  passportNumber?: string;
  passportValidity?: string;

  createdAt: any;
  updatedAt?: any;
}

// 2. РЕЗЕРВАЦИЯ (Booking)
export type BookingStatus = 'new_inquiry' | 'offer_sent' | 'deposit_paid' | 'fully_paid' | 'completed' | 'cancelled';

export interface IBooking {
  id?: string;
  bookingNumber: string;       // Напр. RES-20260407-001
  clientId: string;            // Връзка с IClient
  tourId: string;              // Връзка с ITour
  tourDate: string;            // Конкретната дата на пътуване
  
  status: BookingStatus;
  
  // Финанси (всичко е в Евро)
  totalPrice: number;
  paidAmount: number;
  
  // Пътници и Настаняване
  paxCount: number;            // Брой пътуващи
  roomType: 'double' | 'single' | 'triple' | 'other';
  passengersInfo?: string;     // Текст с имената на другите пътуващи, ако не са главният клиент
  
  notes?: string;
  createdAt: any;
  updatedAt?: any;
}

// 3. КОНКРЕТНО ЗАМИНАВАНЕ / ГРУПА (Departure)
// Този обект обединява всички резервации за дадена дата
export interface IDeparture {
  id?: string;                 // Обикновено tourId + date (напр. yuar-07-04-2026)
  tourId: string;
  date: string;
  
  status: 'gathering' | 'confirmed' | 'departed' | 'completed' | 'cancelled';
  
  guideName?: string;          // Кой ще води групата (напр. Поли)
  totalCapacity: number;       // Напр. 20 човека
  currentBooked: number;       // Колко са записани до момента (сумира paxCount от резервациите)
  
  notes?: string;
}