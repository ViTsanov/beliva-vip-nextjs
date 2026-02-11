// src/lib/admin-helpers.ts
import { db } from "./firebase";
import { updateDoc, doc } from "firebase/firestore";

// Slugify функция
export const slugify = (text: string) => {
  if (!text) return '';
  const map: { [key: string]: string } = { 'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sht', 'ъ': 'a', 'ь': 'y', 'ю': 'yu', 'я': 'ya', ' ': '-', '_': '-' };
  let slug = text.toLowerCase().split('').map(char => map[char] || char).join('');
  return slug.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
};

// Функция за почистване на стари дати (Maintenance)
export const performAutoMaintenance = async (tours: any[]) => {
    const today = new Date().toISOString().split('T')[0];
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(new Date().getMonth() + 3);
    const threeMonthsStr = threeMonthsLater.toISOString().split('T')[0];

    for (const tour of tours) {
        if (tour.status === 'archived') continue;
        let hasChanges = false;
        let newDates = [...(tour.dates || [])].sort();
        let newStatus = tour.status;
        let newCategories = [...(tour.categories || [])];
        let newMainDate = tour.date;

        // Махаме стари дати
        const validDates = newDates.filter(d => d >= today);
        if (validDates.length !== newDates.length) {
            newDates = validDates;
            hasChanges = true;
        }

        // Ако няма дати -> Архив
        if (newDates.length === 0) {
            if (newStatus !== 'archived') {
                newStatus = 'archived';
                hasChanges = true;
            }
        } else {
            // Обновяваме главната дата
            const upcomingDateISO = newDates[0];
            const upcomingDateDisplay = upcomingDateISO.split('-').reverse().join('-');
            if (newMainDate !== upcomingDateDisplay) {
                newMainDate = upcomingDateDisplay;
                hasChanges = true;
            }
            // Last Minute етикет
            if (upcomingDateISO >= today && upcomingDateISO <= threeMonthsStr) {
                if (!newCategories.includes('Last Minute')) {
                    newCategories.push('Last Minute');
                    hasChanges = true;
                }
            }
        }

        if (hasChanges) {
            try {
                await updateDoc(doc(db, "tours", tour.id), {
                    dates: newDates, status: newStatus, date: newMainDate, categories: newCategories
                });
            } catch (e) { console.error("Maintenance Error:", e); }
        }
    }
};

// Парсване на HTML към секции за блога
export const parseHtmlToSections = (html: string) => {
    if (typeof window === 'undefined') return [{ id: Date.now(), text: '', image: '' }]; // SSR защита
    if (!html) return [{ id: Date.now(), text: '', image: '' }];

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const elements = Array.from(doc.body.children);
    
    const hasStructure = elements.some(el => el.classList.contains('blog-text') || el.classList.contains('blog-image'));
    if (!hasStructure && html.trim() !== '') {
        return [{ id: Date.now(), text: html, image: '' }];
    }

    const sections: any[] = [];
    let currentSection: any | null = null;

    elements.forEach((el) => {
        if (el.classList.contains('blog-text')) {
            if (currentSection) sections.push(currentSection);
            currentSection = { id: Date.now() + Math.random(), text: el.innerHTML, image: '' };
        } else if (el.classList.contains('blog-image')) {
            const img = el.querySelector('img');
            const imgSrc = img ? img.getAttribute('src') || '' : '';
            if (currentSection) {
                currentSection.image = imgSrc;
                sections.push(currentSection);
                currentSection = null;
            } else {
                sections.push({ id: Date.now() + Math.random(), text: '', image: imgSrc });
            }
        }
    });

    if (currentSection) sections.push(currentSection);
    return sections.length > 0 ? sections : [{ id: Date.now(), text: '', image: '' }];
};