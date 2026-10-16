// Проверки за полетата на запитването — съобщенията са на български и казват какво точно да се поправи.
// Всяка функция връща текста на грешката или undefined, ако полето е наред.

export const MESSAGE_MAX = 1000;

export function validateName(raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return 'Моля, въведете вашето име.';
  if (!/^[\p{L}\s.'’-]+$/u.test(v)) return 'Името може да съдържа само букви, интервали и тире.';
  if (v.replace(/[^\p{L}]/gu, '').length < 2) return 'Името трябва да е поне 2 букви.';
  if (v.length > 80) return 'Името е твърде дълго — до 80 знака.';
  return undefined;
}

// Телефонът се пази като 10 цифри, започващи с 0. „+359 887…“ и „00359 887…“ се превръщат в „0887…“.
export function normalizePhone(raw: string): string {
  let v = raw.replace(/[\s\-().\/]/g, '');
  if (v.startsWith('+359')) v = '0' + v.slice(4);
  else if (v.startsWith('00359')) v = '0' + v.slice(5);
  return v;
}

export function validatePhone(raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return 'Моля, въведете телефон, на който да ви се обадим.';
  const n = normalizePhone(v);
  if (/[^\d]/.test(n)) return 'Телефонът може да съдържа само цифри (и „+359“ в началото).';
  if (!n.startsWith('0')) return 'Телефонът трябва да започва с 0 или с +359.';
  if (n.length < 10) return `Телефонът трябва да е 10 цифри — въведени са ${n.length}. Пример: 0887 61 61 00.`;
  if (n.length > 10) return `Телефонът трябва да е 10 цифри — въведени са ${n.length}. Пример: 0887 61 61 00.`;
  return undefined;
}

export function validateEmail(raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return 'Моля, въведете имейл — на него ще получите офертата и документите.';
  if (/\s/.test(v)) return 'Имейлът не може да съдържа интервали.';
  if (/[Ѐ-ӿ]/.test(v)) return 'Имейлът трябва да е на латиница, например ivan@mail.bg.';
  if (!v.includes('@')) return 'Имейлът трябва да съдържа знака „@“, например ivan@mail.bg.';
  const [local, domain, ...rest] = v.split('@');
  if (rest.length > 0) return 'Имейлът може да съдържа само един знак „@“.';
  if (!local) return 'Липсва частта преди „@“, например ivan@mail.bg.';
  if (!domain || !domain.includes('.')) return 'След „@“ трябва да има домейн с точка, например mail.bg или gmail.com.';
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return 'Домейнът след „@“ изглежда грешен, например mail.bg или gmail.com.';
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-zA-Z]{2,}$/.test(v)) return 'Невалиден имейл адрес. Пример: ivan@mail.bg.';
  return undefined;
}

export function validateMessage(raw: string): string | undefined {
  if (raw.length > MESSAGE_MAX) return `Съобщението е твърде дълго — до ${MESSAGE_MAX} знака.`;
  return undefined;
}
