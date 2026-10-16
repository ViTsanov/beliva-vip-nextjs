// Съдържанието на страница „За нас“ на едно място — текстове, снимки и видеа се сменят оттук,
// без да се пипат компонентите в src/components/about/.

export interface AboutPhoto {
  src: string;
  alt: string;
  place: string;
  // CSS object-position: "X% Y%" (X: 0% = ляво, 100% = дясно | Y: 0% = горе, 100% = долу)
  pos?: string;
}

// ── ГЕРОЙ ──
// heroVideo: по желание — кратко видео без звук зад заглавието (mp4, до ~3 MB, 10–20 сек, хоризонтално).
// Празно = показва се снимката. При „намалено движение“ видеото не тръгва само и остава снимката.
export const HERO = {
  photo: { src: '/guides/poly-9.jpg', alt: 'Поли с разперени ръце пред Мачу Пикчу, Перу', place: 'Мачу Пикчу, Перу', pos: 'center 45%' } as AboutPhoto,
  video: '',
};

export const STATS = [
  { value: 15, prefix: '', suffix: '+', label: 'Години опит' },
  { value: 60, prefix: '', suffix: '+', label: 'Дестинации' },
  { value: 150, prefix: '', suffix: '+', label: 'Водени групи' },
  { value: 4.9, prefix: '★ ', suffix: '', label: 'Средна оценка', decimals: 1 },
];

// ── ГЛАВИТЕ НА ИСТОРИЯТА ── всяка глава има своя снимка; на широк екран снимката стои закрепена вляво
// и се сменя, докато се чете текстът вдясно.
export const CHAPTERS: { id: string; kicker: string; title: string; photo: AboutPhoto }[] = [
  {
    id: 'puteshestvenichkata',
    kicker: 'Пътешественичката',
    title: 'Паулина Алексиева, позната като Поли',
    photo: { src: '/guides/poly.jpg', alt: 'Паулина Алексиева — основател на Beliva VIP Tour, на Мачу Пикчу', place: 'Мачу Пикчу, Перу', pos: '62% 40%' },
  },
  {
    id: 'beliva',
    kicker: 'Beliva VIP Tour',
    title: 'Същите турове, но с лично присъствие',
    photo: { src: '/guides/poly-5.jpg', alt: 'Поли пред Тадж Махал, Индия', place: 'Тадж Махал, Индия', pos: '65% 55%' },
  },
  {
    id: 'priyateli',
    kicker: 'Пътуващите',
    title: 'Приятели, не клиенти',
    photo: { src: '/guides/poly-1.jpg', alt: 'Поли с колело в солената пустиня Уюни, Боливия, по залез', place: 'Салар де Уюни, Боливия', pos: 'center 45%' },
  },
];

export const VISITED = ['Япония', 'Австралия', 'Перу', 'Китай', 'Южна Африка', 'Индия', 'ОАЕ', 'Боливия', 'Сингапур', 'Камбоджа'];

export const QUOTE_PHOTO: AboutPhoto = { src: '/guides/poly-10.jpg', alt: 'Поли в Камбоджа', place: 'Ангкор Ват, Камбоджа', pos: '80% 60%' };

// ── ВИДЕА ──
// Как се добавя видео:
//  1. Сложи файла в public/videos/poli/ (mp4, H.264, вертикално 9:16 като в TikTok/Reels, до ~15 MB).
//  2. По желание — корица (jpg) до него със същото име; без корица се показва първият кадър.
//  3. Добави ред тук, напр.:
//     { src: '/videos/poli/peru.mp4', poster: '/videos/poli/peru.jpg', title: 'Изгрев над Мачу Пикчу', place: 'Перу' },
// Докато списъкът е празен, на живия сайт секцията не се показва; в режим на разработка се виждат празни рамки.
export const VIDEOS: { src: string; poster?: string; title: string; place: string }[] = [];

// ── ДНЕВНИК ОТ ПЪТЯ ── лентата със снимки, която се влачи
export const DIARY: AboutPhoto[] = [
  { src: '/guides/poly-2.jpg', pos: 'center 30%', alt: 'Поли на АТВ сафари в пустинята на Дубай', place: 'Дубай, ОАЕ' },
  { src: '/guides/poly-4.jpg', pos: 'center 42%', alt: 'Поли с кенгуру в Австралия', place: 'Австралия' },
  { src: '/guides/poly-7.jpg', pos: 'center 58%', alt: 'Поли на Великата китайска стена', place: 'Китай' },
  { src: '/guides/poly-8.jpg', pos: 'center 55%', alt: 'Поли на Великденски остров, пред статуите моаи', place: 'Великденски остров' },
  { src: '/guides/poly-3.jpg', pos: 'center 55%', alt: 'Поли в Сингапур', place: 'Сингапур' },
  { src: '/guides/poly-6.jpg', pos: '70% 60%', alt: 'Поли на бял пясъчен плаж с тюркоазено море', place: 'Карибите' },
];
