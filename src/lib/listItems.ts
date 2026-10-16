// Превръща текста на „Цената включва / не включва“ в отделни точки за показване.
//
// Скрейпнатите и ръчно въведените турове пазят списъка като текст „по една точка на нов ред“ (TourForm).
// Преди се делеше само по запетаи — така цял списък без запетаи ставаше ЕДНА точка (всичко в едно каре),
// а точка със запетая („Нощувки в хотели 4*, закуски“) се разцепваше на две.
//
// Правила:
// - нови редове винаги делят;
// - в рамките на ред делят и булетите (•, ●, ▪, ◦, ·) и точката и запетаята (;) — някои оператори пишат
//   всичко на един ред;
// - запетая дели САМО ако целият текст е един ред без други разделители (стари ръчни записи „а, б, в“);
// - премахваме водещи знаци за списък („- “, „* “, „✓ “, „1. “) и празните редове.
// Приема и масив — ако някой елемент съдържа нови редове/булети, и той се разделя.

const LEADING_MARK = /^\s*(?:[-–—*✓✔✕✗+]|\d{1,2}[.)])\s+/;

export function splitListText(data?: string | string[] | null): string[] {
  if (!data) return [];
  const chunks = Array.isArray(data) ? data.map(String) : [String(data)];

  const items = chunks.flatMap(chunk => {
    const text = chunk.replace(/\r\n?/g, '\n').trim();
    if (!text) return [];
    const hasLineBreaks = text.includes('\n');
    const hasBullets = /[•●▪◦·]/.test(text);
    const hasSemicolons = text.includes(';');

    // Стар формат: един ред, разделен само със запетаи.
    if (!Array.isArray(data) && !hasLineBreaks && !hasBullets && !hasSemicolons && text.includes(',')) {
      return text.split(',');
    }
    return text
      .split('\n')
      .flatMap(line => line.split(/[•●▪◦·]/))
      .flatMap(line => line.split(';'));
  });

  return items
    .map(item => item.replace(LEADING_MARK, '').trim())
    .filter(item => item.length > 1);
}
