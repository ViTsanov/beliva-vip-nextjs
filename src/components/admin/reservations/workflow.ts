// Работният процес на запитване → резервация → пътуване. Всичко, което таб „Резервации“ показва и смята,
// идва оттук, за да е еднакво в списъка, в картата на клиента и в „Справки“.
//
// В записа на запитването (колекция inquiries):
//   steps:    { [ключ на стъпка]: { at, by, note? } }  — ръчно отметнатите стъпки
//   payments: [{ id, kind, amount, at, method, to, note, by, createdAt, forwardedAt? }]
//   totalPrice, paxCount — договорената цена за цялата резервация и броят пътници
//   activityLog: [{ type, text, at, by }] — историята (by = служителят, избран в „Кой работи сега?“)
// Старите записи нямат steps/payments — стъпките им се извличат от старите полета (checkoutCompletedAt и т.н.).

export type StepKey =
  | 'received' | 'contacted' | 'operator_asked' | 'operator_confirmed' | 'offer_sent'
  | 'data_link_sent' | 'data_filled' | 'data_to_operator'
  | 'contract_sent' | 'contract_signed_client' | 'contract_signed_operator'
  | 'deposit_paid' | 'fully_paid' | 'travel_docs_sent';

export type StageKey = 'new' | 'offer' | 'contract' | 'payment' | 'upcoming' | 'archive';

// Как се изпълнява стъпката: tick — само отметка; другите отварят съответното действие.
export type StepAction = 'tick' | 'auto' | 'offer_email' | 'data_link' | 'operator_send' | 'payment_deposit' | 'payment_full';

export interface StepDef {
  key: StepKey;
  label: string;        // в списъка със стъпки
  cta: string;          // надпис на бутона „следваща стъпка“
  stage: StageKey;
  action: StepAction;
  hint?: string;
}

export const STEPS: StepDef[] = [
  { key: 'received', label: 'Получено запитване', cta: '', stage: 'new', action: 'auto' },
  { key: 'contacted', label: 'Свързахме се с клиента', cta: 'Свързах се', stage: 'offer', action: 'tick' },
  { key: 'operator_asked', label: 'Питахме туроператора за места', cta: 'Питах за места', stage: 'offer', action: 'tick', hint: 'До 1 работен ден от запитването (договор с 2МКО)' },
  { key: 'operator_confirmed', label: 'Туроператорът потвърди места', cta: 'Има места', stage: 'offer', action: 'tick' },
  { key: 'offer_sent', label: 'Изпратена оферта', cta: 'Изпрати оферта', stage: 'offer', action: 'offer_email', hint: 'С програмата, Общите условия на туроператора и данните му' },
  { key: 'data_link_sent', label: 'Изпратен линк за данните на пътниците', cta: 'Изпрати линк за данни', stage: 'contract', action: 'data_link' },
  { key: 'data_filled', label: 'Клиентът попълни данните', cta: 'Чака данните', stage: 'contract', action: 'auto' },
  { key: 'data_to_operator', label: 'Данните са изпратени на туроператора', cta: 'Изпрати на туроператора', stage: 'contract', action: 'operator_send' },
  { key: 'contract_sent', label: 'Договорът е изпратен на клиента', cta: 'Договор изпратен', stage: 'contract', action: 'tick' },
  { key: 'contract_signed_client', label: 'Клиентът подписа договора', cta: 'Клиентът подписа', stage: 'payment', action: 'tick' },
  { key: 'contract_signed_operator', label: 'Туроператорът подписа договора', cta: 'Туроператорът подписа', stage: 'payment', action: 'tick' },
  { key: 'deposit_paid', label: 'Платено капаро', cta: 'Капаро платено', stage: 'payment', action: 'payment_deposit' },
  { key: 'fully_paid', label: 'Платено изцяло', cta: 'Платено изцяло', stage: 'upcoming', action: 'payment_full' },
  { key: 'travel_docs_sent', label: 'Изпратени документи за пътуването', cta: 'Документи изпратени', stage: 'upcoming', action: 'tick', hint: 'Ваучери, билети, час и място на тръгване' },
];

export const STAGES: { key: StageKey; label: string; empty: string }[] = [
  { key: 'new', label: 'Нови', empty: 'Няма нови запитвания.' },
  { key: 'offer', label: 'Оферта', empty: 'Няма запитвания в етап „Оферта“.' },
  { key: 'contract', label: 'Договор и данни', empty: 'Няма резервации, които чакат данни или договор.' },
  { key: 'payment', label: 'Плащане', empty: 'Няма резервации, които чакат плащане.' },
  { key: 'upcoming', label: 'Предстоящи', empty: 'Няма платени предстоящи пътувания.' },
  { key: 'archive', label: 'Архив', empty: 'Архивът е празен.' },
];

export const PAYMENT_KINDS: Record<string, string> = { deposit: 'Капаро', balance: 'Доплащане', other: 'Друго плащане', refund: 'Връщане на сума' };

export interface Payment {
  id: string;
  kind: 'deposit' | 'balance' | 'other' | 'refund';
  amount: number;
  at: string;             // датата на плащането (ГГГГ-ММ-ДД)
  method: 'bank' | 'cash';
  to: 'operator' | 'agency'; // кой е получил парите
  note?: string;
  by?: string;
  createdAt: string;
  forwardedAt?: string | null; // кога е преведено на туроператора (когато е платено на агенцията)
}

// --- Дати ---

export const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value === 'object' && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

export const formatDateTime = (value: any): string => {
  const d = toDate(value);
  return d ? d.toLocaleString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
};

export const formatDate = (value: any): string => {
  const d = toDate(value);
  return d ? d.toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
};

// „преди 3 ч“ — за последното действие в списъка
export function timeAgo(value: any, now = Date.now()): string {
  const d = toDate(value);
  if (!d) return '';
  const min = Math.round((now - d.getTime()) / 60000);
  if (min < 1) return 'току-що';
  if (min < 60) return `преди ${min} мин`;
  const h = Math.round(min / 60);
  if (h < 24) return `преди ${h} ч`;
  const days = Math.round(h / 24);
  return days === 1 ? 'вчера' : `преди ${days} дни`;
}

// Начална дата на пътуването от tourDate („2026-05-12“, „12.05.2026“, „2026-05-12 - 2026-05-20“)
export function tripStart(inq: any): Date | null {
  const v = String(inq?.tourDate || '');
  const iso = v.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  const bg = v.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (bg) return new Date(+bg[3], +bg[2] - 1, +bg[1]);
  return null;
}

export function tripDays(tour: any): number {
  const n = (v: any) => { const x = parseInt(String(v ?? '').replace(/[^\d]/g, ''), 10); return x > 0 && x < 120 ? x : 0; };
  return n(tour?.durationDays) || n(tour?.duration) || (n(tour?.nights) ? n(tour?.nights) + 1 : 0) || 1;
}

export function tripEnd(inq: any, tour: any): Date | null {
  const start = tripStart(inq);
  return start ? new Date(start.getTime() + tripDays(tour) * 86400000) : null;
}

export const daysUntil = (d: Date | null, now = new Date()) =>
  d ? Math.ceil((d.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000) : null;

// Следващият работен ден след дадена дата (събота и неделя се прескачат) — за сроковете „до 1 работен ден“
export function nextWorkingDay(from: Date): Date {
  const d = new Date(from.getTime());
  do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
  return d;
}

// --- Служител („Кой работи сега?“) ---
// В админ панела има една обща парола, затова името на служителя се избира на компютъра и се помни там.

const STAFF_KEY = 'beliva_staff_name';
const STAFF_LIST_KEY = 'beliva_staff_names';

export function getStaffName(): string {
  try { return localStorage.getItem(STAFF_KEY) || ''; } catch { return ''; }
}

export function getStaffNames(): string[] {
  try { return JSON.parse(localStorage.getItem(STAFF_LIST_KEY) || '[]'); } catch { return []; }
}

export function setStaffName(name: string) {
  try {
    localStorage.setItem(STAFF_KEY, name);
    const list = Array.from(new Set([name, ...getStaffNames()])).filter(Boolean).slice(0, 10);
    localStorage.setItem(STAFF_LIST_KEY, JSON.stringify(list));
  } catch { /* частен режим — името просто няма да се запомни */ }
}

// Нов ред в историята. serverTimestamp() не може да стои в масив, затова часът е от браузъра.
export const activityEntry = (type: string, text: string) => ({ type, text, at: new Date().toISOString(), by: getStaffName() || '' });

// --- Стъпки и етапи ---

export interface StepState { at: any; by?: string; note?: string; auto?: boolean }

const latestAt = (items: any[], pick: (x: any) => any) =>
  items.map(pick).map(toDate).filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0] || null;

export function payments(inq: any): Payment[] {
  return Array.isArray(inq?.payments) ? inq.payments : [];
}

export function paidTotal(inq: any): number {
  return payments(inq).reduce((sum, p) => sum + (p.kind === 'refund' ? -1 : 1) * (Number(p.amount) || 0), 0);
}

// Стъпките, които се правят наново, когато клиентът смени екскурзията или датата (местата и офертата важат
// само за конкретна дата). Старите отметки и имейли остават в историята; тук просто не се броят.
export const STEPS_RESET_ON_CHANGE: StepKey[] = ['operator_asked', 'operator_confirmed', 'offer_sent'];

export function stepState(inq: any, key: StepKey): StepState | null {
  const state = rawStepState(inq, key);
  const resetAt = toDate(inq?.stepResets?.[key]);
  if (state && resetAt && (toDate(state.at)?.getTime() || 0) <= resetAt.getTime()) return null;
  return state;
}

function rawStepState(inq: any, key: StepKey): StepState | null {
  const manual = inq?.steps?.[key];
  if (manual?.at) return manual;
  const log: any[] = Array.isArray(inq?.activityLog) ? inq.activityLog : [];
  const emails: any[] = Array.isArray(inq?.emailLog) ? inq.emailLog : [];
  const auto = (at: any) => (at ? { at, auto: true } : null);
  switch (key) {
    case 'received': return auto(inq.createdAt);
    case 'offer_sent': return auto(latestAt(emails.filter(e => e.kind === 'offer'), e => e.sentAt));
    case 'data_link_sent': return auto(
      latestAt([...emails.filter(e => e.kind === 'checkout_link').map(e => e.sentAt), ...log.filter(e => e.type === 'checkout_link').map(e => e.at)], x => x)
      // Стари записи: линкът е валиден 14 дни, така че е създаден 14 дни преди изтичането му
      || (inq.checkoutToken && inq.checkoutTokenExpiry ? new Date(Number(inq.checkoutTokenExpiry) - 14 * 86400000) : null)
      || inq.checkoutCompletedAt,
    );
    case 'data_filled': return auto(inq.checkoutCompletedAt);
    case 'data_to_operator': return auto(inq.operatorDataSentAt);
    case 'contract_sent': return auto(inq.contractSentAt);
    case 'operator_asked': return auto(latestAt(emails.filter(e => e.kind === 'operator_availability'), e => e.sentAt));
    case 'deposit_paid': {
      const dep = payments(inq).filter(p => p.kind !== 'refund').sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
      return dep ? { at: dep.createdAt, by: dep.by, auto: true } : null;
    }
    case 'fully_paid': return inq.status === 'paid'
      ? auto(latestAt(log.filter(e => e.type === 'status' && /Платено/.test(e.text)), e => e.at) || inq.updatedAt || inq.checkoutCompletedAt || inq.createdAt)
      : null;
    default: return null;
  }
}

export const isDone = (inq: any, key: StepKey) => !!stepState(inq, key);

export function stageOf(inq: any, tour?: any, now = new Date()): StageKey {
  if (inq.status === 'cancelled') return 'archive';
  if (inq.status === 'paid') {
    const end = tripEnd(inq, tour);
    return end && end < now ? 'archive' : 'upcoming';
  }
  const done = (k: StepKey) => isDone(inq, k);
  if (done('deposit_paid') || done('contract_signed_client') || done('contract_signed_operator')) return 'payment';
  if (done('data_link_sent') || done('data_filled') || done('data_to_operator') || done('contract_sent')) return 'contract';
  if (done('contacted') || done('operator_asked') || done('operator_confirmed') || done('offer_sent') || inq.status === 'processing') return 'offer';
  return 'new';
}

// Следващата стъпка — първата неизпълнена СЛЕД най-далечната изпълнена (пропуснатите по-ранни стъпки не
// връщат назад — например оферта по Viber без отметка „Свързах се“). За приключени/отказани няма.
export function nextStep(inq: any, tour?: any): StepDef | null {
  if (stageOf(inq, tour) === 'archive') return null;
  const lastDone = STEPS.reduce((max, s, i) => (isDone(inq, s.key) ? i : max), 0);
  return STEPS.find((s, i) => i > lastDone && !isDone(inq, s.key)) || null;
}

// --- История (най-новото отгоре) ---

export interface TimelineEvent { at: Date; text: string; by?: string; type: string }

export function buildTimeline(inq: any): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const add = (value: any, text: string, type: string, by?: string) => {
    const at = toDate(value);
    if (at) events.push({ at, text, by, type });
  };
  const log: any[] = Array.isArray(inq.activityLog) ? inq.activityLog : [];
  const logged = (type: string) => log.some(e => e.type === type);

  add(inq.createdAt, 'Получено запитване', 'received');
  (inq.emailLog || []).forEach((e: any) => {
    const text = e.kind === 'checkout_link' ? 'Изпратен линк за данните на пътниците (имейл)'
      : e.kind === 'correction' ? 'Поискана корекция на данните (имейл)'
      : e.kind === 'offer' ? `Изпратена оферта: „${e.subject || ''}“`
      : e.kind === 'operator_availability' ? `Запитване за места до туроператора (${e.to || 'имейл'})`
      : `Изпратен имейл: „${e.subject || 'без тема'}“`;
    add(e.sentAt, text, 'email', e.by);
  });
  log.forEach(e => add(e.at, e.text, e.type, e.by));

  if (!logged('checkout')) {
    if (inq.lastCorrectionAt) add(inq.lastCorrectionAt, 'Клиентът изпрати коригирани данни', 'checkout');
    else add(inq.checkoutCompletedAt, 'Клиентът попълни данните на пътниците', 'checkout');
  }
  if (!logged('operator')) add(inq.operatorDataSentAt, 'Данните на пътниците са изпратени на турооператора', 'operator');
  if (!logged('contract')) add(inq.contractSentAt, 'Договорът е отбелязан като изпратен', 'contract');

  return events.sort((a, b) => b.at.getTime() - a.at.getTime());
}

export function lastActivity(inq: any): TimelineEvent | null {
  return buildTimeline(inq)[0] || null;
}

// Чака ли ни повече от 1 работен ден — запитванията в първите етапи, по които никой не е действал.
export function isOverdue(inq: any, tour?: any, now = new Date()): boolean {
  const stage = stageOf(inq, tour, now);
  if (stage !== 'new' && stage !== 'offer') return false;
  const last = lastActivity(inq);
  if (!last) return false;
  const deadline = nextWorkingDay(last.at);
  return now > deadline;
}

// Плащания към агенцията, които още не са преведени на туроператора (договорът с 2МКО: до 1 работен ден)
export const unforwardedPayments = (inq: any) => payments(inq).filter(p => p.to === 'agency' && p.kind !== 'refund' && !p.forwardedAt);

// --- Пари ---

export const parsePrice = (value: any): number => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/\s/g, '').replace(/[^\d.,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

export const euro = (n: number) => `${Math.round(n).toLocaleString('bg-BG')} €`;

export function paxOf(inq: any): number {
  return Number(inq?.paxCount) || (Array.isArray(inq?.travelers) ? inq.travelers.length : 0) || 0;
}

// Договорената цена: записаната totalPrice; за стари платени резервации — сумата от профила на клиента.
export function totalPriceOf(inq: any, customers: any[] = []): number {
  if (Number(inq?.totalPrice) > 0) return Number(inq.totalPrice);
  if (inq?.status === 'paid') return legacyPaid(inq, customers);
  return 0;
}

// Стари записи: при „Платено“ сумата отиваше само в профила на клиента (tripHistory.paidPrice).
export function legacyPaid(inq: any, customers: any[]): number {
  const email = String(inq.clientEmail || '').toLowerCase();
  const phone = inq.clientPhone;
  for (const c of customers) {
    const sameContact = (email && String(c.email || '').toLowerCase() === email) || (phone && c.phone === phone);
    if (!sameContact) continue;
    const trip = (c.tripHistory || []).find((t: any) => t.tourId === inq.tourId && t.date === inq.tourDate);
    if (trip && Number(trip.paidPrice) > 0) return Number(trip.paidPrice);
  }
  return 0;
}

// Колко е платено: от записаните плащания; за стари платени резервации без плащания — цялата сума.
export function paidOf(inq: any, customers: any[] = []): number {
  const sum = paidTotal(inq);
  if (sum > 0) return sum;
  return inq?.status === 'paid' ? totalPriceOf(inq, customers) : 0;
}

// --- Текст за копиране ---

export function contactText(inq: any): string {
  return [inq.clientName, inq.clientPhone, inq.clientEmail && inq.clientEmail !== 'няма имейл' ? inq.clientEmail : ''].filter(Boolean).join('\n');
}

export function travelerText(t: any, idx?: number): string {
  return [
    idx !== undefined ? `Пътник ${idx + 1}: ${t.latinName || ''}` : (t.latinName || ''),
    t.egn ? `ЕГН: ${t.egn}` : '',
    t.passportNumber ? `Паспорт: ${t.passportNumber}` : '',
    t.passportValidity ? `Валиден до: ${t.passportValidity}` : '',
  ].filter(Boolean).join('\n');
}

export function reservationText(inq: any, travelers: any[]): string {
  return [
    `${inq.tourTitle || 'Екскурзия'} — ${inq.tourDate || 'без дата'}`,
    `Контакт: ${[inq.clientName, inq.clientPhone, inq.clientEmail].filter(Boolean).join(', ')}`,
    '',
    ...travelers.map((t, i) => travelerText(t, i) + '\n'),
  ].join('\n').trim();
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
