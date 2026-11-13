"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, getDoc, updateDoc, doc, deleteDoc, where, addDoc, serverTimestamp, arrayUnion, deleteField } from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import { currentPrice, hasActivePromo } from '@/lib/promo';
import {
  Search, Calendar, Phone, Mail, X, CheckCircle, Pencil, AlertTriangle, DollarSign, Tag, Send, Clock, Percent, ChevronRight, BarChart3,
} from 'lucide-react';
import { normalizeOperators, operatorOfferBlock, type Operator } from '@/lib/operators';
import { COMPANY_INFO } from '@/lib/companyInfo';
import { displayTourDate } from '@/lib/tourDates';
import TourPicker, { type TourChoice } from '@/components/tours/TourPicker';
import StaffPicker from './reservations/StaffPicker';
import CopyButton from './reservations/CopyButton';
import InquiryDrawer, { type DrawerActions } from './reservations/InquiryDrawer';
import PaymentDialog, { type PaymentDraft } from './reservations/PaymentDialog';
import ReservationStats from './reservations/ReservationStats';
import {
  STAGES, STEPS, PAYMENT_KINDS, activityEntry, toDate, formatDateTime, tripStart, stageOf, nextStep, lastActivity,
  timeAgo, isOverdue, unforwardedPayments, paidTotal, paxOf, euro, getStaffName, isDone, STEPS_RESET_ON_CHANGE,
  type StageKey, type StepKey, type StepDef, type Payment,
} from './reservations/workflow';

// Същите EmailJS данни, ползвани навсякъде другаде в проекта (src/lib/sendInquiry.ts).
// CLIENT_TEMPLATE_ID е НОВ, отделен template — трябва да го създадеш в EmailJS с полето „To Email“
// настроено на {{to_email}} (не фиксиран адрес), за да може да изпраща КЪМ произволен клиент, не само
// към твоя собствен имейл. Виж инструкциите след кода.
const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "";
const CLIENT_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_CLIENT_TEMPLATE_ID || "";
// EmailJS free планът позволява само 2 template-а общо — вече са заети от нотификационния (за нови запитвания)
// и CLIENT_TEMPLATE_ID — затова операторските имейли преизползват СЪЩИЯ template, не отделен — той вече е
// достатъчно генеричен ({{to_email}}/{{subject}}/{{{message}}}), за да обслужи и двете цели.
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "";

const STATUS_LABELS: Record<string, string> = { new: 'Ново', processing: 'В процес', paid: 'Платено', cancelled: 'Отказано' };

// Датите, историята, стъпките и етапите живеят в reservations/workflow.ts — общи за списъка, картата и „Справки“.
const FIRST_STAGE: StageKey = 'new';
type TabKey = StageKey | 'stats';

interface ReservationsTabProps {
  allTours: any[];
  allCampaigns: any[];
  customers: any[];
  onSuccess?: () => void;
}

export default function ReservationsTab({ allTours, allCampaigns, customers, onSuccess }: ReservationsTabProps) {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Табове по етапи (виж reservations/workflow.ts → STAGES) плюс „Справки“.
  const [tab, setTab] = useState<TabKey>(FIRST_STAGE);
  // Отворената карта на клиента — пазим id, за да показва винаги актуалния запис след всяко действие.
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft | null>(null);

  const [editingInq, setEditingInq] = useState<any>(null);
  const [editForm, setEditForm] = useState({ tourId: '', tourTitle: '', tourDate: '', destination: '', notes: '', clientEmail: '' });
  const [paymentModalData, setPaymentModalData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Модал за писане/изпращане на имейл. kind отбелязва специалните имейли в журнала ('offer', 'correction',
  // 'operator_availability'…), за да се отметнат стъпките автоматично. to/toLabel — когато не е до клиента.
  const [emailModalData, setEmailModalData] = useState<{ inquiry: any; subject: string; body: string; kind?: string; to?: string; toLabel?: string } | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Турооператорите от Настройки — имейл за данните на пътниците, юридически данни за офертата, комисионна.
  const [operators, setOperators] = useState<Operator[]>([]);
  useEffect(() => {
    getDoc(doc(db, "settings", "operators")).then(snap => {
      if (snap.exists()) setOperators(normalizeOperators(snap.data().list));
    }).catch(() => {});
  }, []);

  // Избрани резервации за групово изпращане на турооператора.
  const [selectedForOperator, setSelectedForOperator] = useState<Set<string>>(new Set());
  // Преглед/потвърждение преди реалното изпращане към турооператора — админът може да прегледа/редактира,
  // преди да натисне реалното "Изпрати".
  const [operatorSendModalData, setOperatorSendModalData] = useState<{ inquiries: any[]; operatorEmail: string; operatorName: string; subject: string; message: string; token: string; expiryMs: number } | null>(null);

  const fetchInquiries = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "inquiries"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInquiries(data);
    } catch (error) {
      console.error("Грешка при извличане на запитвания:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchInquiries(); }, []);

  const tourOf = (inq: any) => allTours.find((t: any) => t.id === inq?.tourId);

  // Търсенето работи в рамките на текущия таб.
  const searchFiltered = inquiries.filter(inq => {
    const term = searchQuery.toLowerCase();
    if (!term) return true;
    return (
      inq.clientName?.toLowerCase().includes(term) ||
      inq.clientEmail?.toLowerCase().includes(term) ||
      inq.clientPhone?.includes(term) ||
      inq.tourTitle?.toLowerCase().includes(term) ||
      inq.notes?.toLowerCase().includes(term) ||
      inq.message?.toLowerCase().includes(term)
    );
  });
  const stageItems = (stage: StageKey) => searchFiltered.filter(inq => stageOf(inq, tourOf(inq)) === stage);

  // ПОМОЩНА ФУНКЦИЯ: Превръща текст като "1250 €" в число 1250
  const parsePrice = (priceStr: any) => {
    if (!priceStr) return 0;
    if (typeof priceStr === 'number') return priceStr;
    const cleaned = priceStr.replace(/[^\d.]/g, '');
    return parseFloat(cleaned) || 0;
  };

  // Собствените бележки на агента към запитването. Старите записи може да съдържат копие на съобщението на
  // клиента (грешка в предишния формуляр за редакция) — такова копие не е бележка и го третираме като празно.
  const getOwnNotes = (inq: any): string => {
    const notes = (inq?.notes || '').trim();
    if (!notes) return '';
    return notes === (inq?.message || '').trim() ? '' : notes;
  };

  // Активните промоции на агенцията (Промоции → кампании, чийто период в момента тече).
  const getActivePromotions = (tour: any) => {
    const now = Date.now();
    const options: { id: string; name: string; percent: number; includedInTour: boolean }[] = allCampaigns
      .filter(c => {
        const start = new Date(c.startDate).getTime();
        const end = new Date(c.endDate).getTime();
        return !isNaN(start) && !isNaN(end) && now >= start && now <= end;
      })
      .map(c => ({
        id: c.id,
        name: c.name,
        percent: Number(c.discountPercent) || 0,
        // Ако турът е вързан към същата кампания, промо цената вече е в каталожната цена — не я броим втори път.
        includedInTour: !!tour?.campaignId && c.id === tour.campaignId,
      }));
    // Тур с промо етикет без кампания в списъка — запазваме старото поведение (етикетът се записва като промоция).
    if (tour?.promoLabel && !options.some(o => o.includedInTour)) {
      options.push({ id: 'tour-promo', name: tour.promoLabel, percent: 0, includedInTour: true });
    }
    return options;
  };

  // Крайна цена = каталожна цена минус % от промоцията, минус личната отстъпка на клиента (ако има).
  const calcPaidPrice = (base: number, promoPercent: number, personalPercent: number) => {
    if (!base) return 0;
    return Math.round(base * (1 - (promoPercent || 0) / 100) * (1 - (personalPercent || 0) / 100));
  };

  // Сравнява две запитвания/клиенти по email ИЛИ телефон (не изисква и двете).
  const sameContact = (email1?: string, phone1?: string, email2?: string, phone2?: string) => {
    if (email1 && email2 && email1.toLowerCase() === email2.toLowerCase()) return true;
    if (phone1 && phone2 && phone1 === phone2) return true;
    return false;
  };

  const getContactContext = (inq: any) => {
    const matchedCustomer = customers.find(c => sameContact(inq.clientEmail, inq.clientPhone, c.email, c.phone));
    const otherInquiries = inquiries.filter(other =>
      other.id !== inq.id && sameContact(inq.clientEmail, inq.clientPhone, other.clientEmail, other.clientPhone)
    );
    return { matchedCustomer, otherInquiries };
  };

  // Изчислява редовна цена срещу цена с лична (лоялна) отстъпка на клиента — видимо на ниво "Запитване",
  // не чак при потвърждение на плащане. Ако турът има активна промо цена (discountPrice), тя се ползва
  // като база, а личната отстъпка се прилага ДОПЪЛНИТЕЛНО върху нея (двете се комбинират, не се избира
  // само едната) — разумен подразбиращ се избор, ако искаш друго поведение, кажи ми.
  const getDiscountInfo = (inq: any) => {
    const { matchedCustomer } = getContactContext(inq);
    const tour = allTours.find(t => t.id === inq.tourId);
    const regularPrice = parsePrice(tour ? currentPrice(tour) : '');
    const discountPercentage = matchedCustomer?.discountFlag ? Number(matchedCustomer.discountPercentage || 0) : 0;
    const finalPrice = discountPercentage > 0
      ? Math.round(regularPrice * (1 - discountPercentage / 100))
      : regularPrice;
    return { hasDiscount: discountPercentage > 0, regularPrice, finalPrice, discountPercentage, tour };
  };

  const handleStatusChangeClick = async (inq: any, newStatus: string) => {
    if (newStatus === 'paid') {
      // „Платено“ (и създаването на клиент) става само от подтаб „Резервации“ — след като клиентът е попълнил данните си.
      if (!inq.checkoutCompletedAt) {
        alert('„Платено изцяло“ става възможно, след като клиентът попълни данните на пътниците.');
        return;
      }
      try {
        const customersRef = collection(db, "customers");
        let existingCustomer: any = null;
        let existingCustomerId = null;

        if (inq.clientEmail) {
          const qEmail = query(customersRef, where("email", "==", inq.clientEmail));
          const snapEmail = await getDocs(qEmail);
          if (!snapEmail.empty) {
            existingCustomerId = snapEmail.docs[0].id;
            existingCustomer = snapEmail.docs[0].data();
          }
        }
        if (!existingCustomer && inq.clientPhone) {
          const qPhone = query(customersRef, where("phone", "==", inq.clientPhone));
          const snapPhone = await getDocs(qPhone);
          if (!snapPhone.empty) {
            existingCustomerId = snapPhone.docs[0].id;
            existingCustomer = snapPhone.docs[0].data();
          }
        }

        const { tour, regularPrice, discountPercentage } = getDiscountInfo(inq);
        const promoOptions = getActivePromotions(tour);
        // Ако турът има собствена промоция (вече в цената му), тя е избрана по подразбиране; иначе — без промоция.
        const preselected = promoOptions.find(o => o.includedInTour);
        const promoId = preselected?.id || '';
        const promoPercent = 0; // промоцията на тура вече е в каталожната цена

        setPaymentModalData({
          inquiry: inq,
          existingCustomer,
          existingCustomerId,
          tour,
          promoOptions,
          promoId,
          promoPercent,
          personalPercent: discountPercentage,
          paidPrice: calcPaidPrice(regularPrice, promoPercent, discountPercentage),
          basePrice: regularPrice,
          // И двете цени на тура — редовната и промо цената (ако турът има такава), за да се виждат едновременно.
          listPrice: parsePrice(tour?.price),
          tourPromoPrice: hasActivePromo(tour) ? parsePrice(tour?.discountPrice) : 0,
          notes: getOwnNotes(inq)
        });
      } catch (error) {
        console.error("Грешка:", error);
      }
    } else {
      try {
        const entry = activityEntry('status', `Статус: ${STATUS_LABELS[newStatus] || newStatus}`);
        await updateDoc(doc(db, "inquiries", inq.id), { status: newStatus, activityLog: arrayUnion(entry) });
        setInquiries(prev => prev.map(item => item.id === inq.id ? { ...item, status: newStatus, activityLog: [...(item.activityLog || []), entry] } : item));
      } catch (e) { console.error(e); }
    }
  };

  const handleConfirmPayment = async () => {
    if (!paymentModalData) return;
    setIsSaving(true);
    try {
      const { inquiry, existingCustomer, existingCustomerId, tour, paidPrice, basePrice, promoOptions, promoId, promoPercent, personalPercent } = paymentModalData;
      const notes = (paymentModalData.notes || '').trim();

      // Име на промоцията за профила на клиента: избраната кампания (+ % ако е добавена отстъпка) и/или лична отстъпка.
      const selectedPromo = (promoOptions || []).find((o: any) => o.id === promoId);
      let promoName = selectedPromo ? selectedPromo.name : '';
      if (selectedPromo && !selectedPromo.includedInTour && Number(promoPercent) > 0) promoName += ` (−${Number(promoPercent)}%)`;
      if (Number(personalPercent) > 0) {
        promoName = promoName ? `${promoName} + лична отстъпка ${personalPercent}%` : `Лична отстъпка ${personalPercent}%`;
      }

      // Бележката отива в профила на клиента заедно с пътуването, за което е била.
      const tripLabel = `${inquiry.tourTitle || 'Екскурзия'}${inquiry.tourDate && inquiry.tourDate !== 'Не е потвърдена' ? ` (${inquiry.tourDate})` : ''}`;
      const noteEntry = notes ? `${tripLabel}: ${notes}` : '';

      // Свежо четене на запитването, ПРЕДИ да построим tripData — ReservationsTab зарежда запитванията
      // само веднъж при отваряне (не следи Firestore в реално време), затова локалното копие може вече
      // да е остаряло спрямо реално попълнените checkout данни.
      let freshTravelers = inquiry.travelers || [];
      try {
        const freshSnap = await getDoc(doc(db, "inquiries", inquiry.id));
        if (freshSnap.exists() && freshSnap.data().travelers) {
          freshTravelers = freshSnap.data().travelers;
        }
      } catch (e) {
        console.error("Грешка при свежото четене (продължаваме с локалното копие):", e);
      }

      const tripData = {
        tourId: inquiry.tourId || "",
        tourSlug: tour?.slug || inquiry.tourId || "",
        tourTitle: inquiry.tourTitle || "Екскурзия",
        date: inquiry.tourDate || "Не е избрана",
        tourOperator: tour?.operator || "Неизвестен",
        paidPrice: Number(paidPrice),
        basePrice: Number(basePrice),
        promoName: promoName,
        promoId: promoId || '',
        promoPercent: Number(promoPercent) || 0,
        notes,
        addedAt: new Date().toISOString(),
        feedbackStatus: 'pending',
        travelers: freshTravelers
      };

      const customersRef = collection(db, "customers");
      let finalCustomerId = existingCustomerId;

      // Паспортните данни на първия пътник (обикновено самият клиент) отиват и в профила — вече криптирани,
      // точно във формата, в който ги пази и „Данни по паспорт“ в картона. Само ако профилът още няма такива.
      const mainTraveler = Array.isArray(freshTravelers) && freshTravelers.length > 0 ? freshTravelers[0] : null;
      const passportFields = mainTraveler ? {
        latinName: mainTraveler.latinName || '',
        egn: mainTraveler.egn || '',
        passportNumber: mainTraveler.passportNumber || '',
        passportValidity: mainTraveler.passportValidity || '',
        passportPhoto: mainTraveler.passportPhoto || '',
      } : {};

      if (existingCustomer) {
        const updatedHistory = [...(existingCustomer.tripHistory || []), tripData];
        const newCount = updatedHistory.length;
        // Новата бележка се долепя към старите (преди това се губеше, ако клиентът още нямаше бележки).
        const updatedNotes = noteEntry
          ? (existingCustomer.notes ? existingCustomer.notes + '\n---\n' + noteEntry : noteEntry)
          : (existingCustomer.notes || '');

        await updateDoc(doc(db, "customers", existingCustomerId as string), {
          tripHistory: updatedHistory,
          totalTrips: newCount,
          tripsCount: newCount,
          notes: updatedNotes,
          // Имейл, въведен в запитването, се добавя към профила, ако клиентът още няма такъв.
          ...(!existingCustomer.email && inquiry.clientEmail ? { email: inquiry.clientEmail } : {}),
          ...(!existingCustomer.egn && !existingCustomer.passportNumber ? passportFields : {}),
          updatedAt: serverTimestamp()
        });
      } else {
        const nameParts = inquiry.clientName ? inquiry.clientName.split(' ') : [];
        const newCustomerRef = await addDoc(customersRef, {
          name: inquiry.clientName || '',
          firstName: nameParts[0] || 'Неизвестно',
          lastName: nameParts.slice(1).join(' ') || '',
          email: inquiry.clientEmail || "",
          phone: inquiry.clientPhone || "",
          totalTrips: 1,
          tripsCount: 1,
          tripHistory: [tripData],
          vipDiscount: 0,
          discountFlag: false,
          notes: noteEntry,
          ...passportFields,
          createdAt: serverTimestamp()
        });
        finalCustomerId = newCustomerRef.id;
      }

      // Групата за заминаването е допълнителна — ако нещо гръмне тук, клиентът вече е записан и не
      // връщаме цялата операция назад; само предупреждаваме.
      let groupWarning = '';
      try {
        if (inquiry.tourId && inquiry.tourDate) {
          const groupsRef = collection(db, "groups");
          const qGroup = query(groupsRef, where("tourId", "==", inquiry.tourId), where("startDate", "==", inquiry.tourDate));
          const groupSnap = await getDocs(qGroup);

          const touristInfo = {
            customerId: finalCustomerId || "unknown",
            name: inquiry.clientName || '',
            paidPrice: Number(paidPrice),
            addedAt: new Date().toISOString()
          };

          if (!groupSnap.empty) {
            const groupDoc = groupSnap.docs[0];
            await updateDoc(doc(db, "groups", groupDoc.id), {
              tourists: [...(groupDoc.data().tourists || []), touristInfo]
            });
          } else {
            await addDoc(groupsRef, {
              tourId: inquiry.tourId,
              tourTitle: inquiry.tourTitle || '',
              startDate: inquiry.tourDate,
              tourOperator: tour?.operator || "Неизвестен",
              tourists: [touristInfo],
              createdAt: serverTimestamp()
            });
          }
        } else {
          groupWarning = '\n\nВнимание: запитването няма избрана екскурзия/дата, затова не е добавено в група за заминаване.';
        }
      } catch (groupError) {
        console.error('Грешка при добавяне в група:', groupError);
        groupWarning = '\n\nВнимание: клиентът е записан, но не успях да го добавя в групата за заминаване.';
      }

      // Статусът „Платено“ се записва ЧАК СЕГА — след като клиентският профил е записан. Преди това ставаше
      // първо, така че при грешка по-нататък запитването оставаше „Платено“ без клиент и не можеше да се опита пак.
      const paidEntry = activityEntry('status', `Статус: Платено (${Number(paidPrice)} €)`);
      // Договорената цена и остатъкът влизат и в самото запитване — от тях смятат картата и „Справки“.
      // Записаните досега плащания (капаро) не се дублират: добавя се само разликата до пълната сума.
      const total = Number(paidPrice) || 0;
      const alreadyPaid = paidTotal(inquiry);
      const remainder = Math.max(0, total - alreadyPaid);
      const finalPayment: Payment | null = remainder > 0 ? {
        id: crypto.randomUUID(), kind: alreadyPaid > 0 ? 'balance' : 'other', amount: remainder,
        at: new Date().toISOString().slice(0, 10), method: 'bank', to: 'operator',
        note: 'при „Платено изцяло“', by: getStaffName(), createdAt: new Date().toISOString(), forwardedAt: null,
      } : null;
      const newPayments = finalPayment ? [...(inquiry.payments || []), finalPayment] : (inquiry.payments || []);
      const paidUpdate = {
        status: 'paid', notes, totalPrice: total, payments: newPayments,
        paxCount: paxOf(inquiry) || freshTravelers.length || null,
        'steps.fully_paid': { at: paidEntry.at, by: paidEntry.by },
      };
      await updateDoc(doc(db, "inquiries", inquiry.id), { ...paidUpdate, activityLog: arrayUnion(paidEntry) });
      setInquiries(prev => prev.map(item => item.id === inquiry.id ? {
        ...item, status: 'paid', notes, totalPrice: total, payments: newPayments, paxCount: paidUpdate.paxCount,
        steps: { ...(item.steps || {}), fully_paid: { at: paidEntry.at, by: paidEntry.by } },
        activityLog: [...(item.activityLog || []), paidEntry],
      } : item));

      setPaymentModalData(null);
      const customerName = existingCustomer ? (existingCustomer.name || `${existingCustomer.firstName || ''} ${existingCustomer.lastName || ''}`.trim() || 'клиента') : (inquiry.clientName || 'клиента');
      alert(
        (existingCustomer
          ? `Пътуването е добавено към профила на ${customerName}.`
          : `Създаден е нов клиент: ${customerName}. Виж го в таб „Клиенти“.`) + groupWarning
      );
    } catch (e) {
      console.error(e);
      // Показваме реалната причина, за да се вижда какво точно не е наред (права, липсващо поле и т.н.).
      alert(`Грешка при запис — резервацията НЕ е отбелязана като платена.\n\n${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const inq = inquiries.find(i => i.id === id);
    const hasUnsavedTravelerData = inq?.checkoutCompletedAt && inq.status !== 'paid';
    const confirmMessage = hasUnsavedTravelerData
      ? "⚠️ ВНИМАНИЕ: Клиентът вече е попълнил данните си през checkout линка (ЕГН/паспорт), но запитването още не е маркирано като платено.\n\nАко го изтриеш СЕГА, тези данни ЩЕ СЕ ЗАГУБЯТ БЕЗВЪЗВРАТНО.\n\nСигурни ли сте?"
      : "Сигурни ли сте, че искате да изтриете това запитване?";

    if (!confirm(confirmMessage)) return false;
    try {
      await deleteDoc(doc(db, "inquiries", id));
      setInquiries(prev => prev.filter(i => i.id !== id));
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  // Генерира сигурен токен и го записва — вече с 14 дни валидност (преди 7), плюс избор как да стигне
  // до клиента: директно по имейл (изисква EmailJS template) или копиране за ръчно пращане (Viber и др.).
  const handleGenerateCheckoutLink = async (inq: any, method: 'email' | 'copy') => {
    const token = crypto.randomUUID();
    const expiryMs = Date.now() + 14 * 24 * 60 * 60 * 1000; // 14 дни

    try {
      // По имейл историята се води от emailLog (по-долу); при копиране — тук, защото имейл няма.
      const copyEntry = method === 'copy' ? activityEntry('checkout_link', 'Създаден линк за данните на пътниците (копиран за Viber/WhatsApp)') : null;
      await updateDoc(doc(db, "inquiries", inq.id), {
        checkoutToken: token,
        checkoutTokenExpiry: expiryMs,
        checkoutCompletedAt: null,
        ...(copyEntry ? { activityLog: arrayUnion(copyEntry) } : {}),
      });

      const link = `${window.location.origin}/checkout/${token}`;
      const subject = 'Относно вашето запитване';
      const body = `Здравейте ${inq.clientName || ''},\n\nЗа да завършим резервацията Ви за "${inq.tourTitle}", моля попълнете данните на пътниците на следния линк:\n\n${link}\n\nЛинкът е валиден 14 дни.\n`;

      let updatedInq = {
        ...inq, checkoutToken: token, checkoutTokenExpiry: expiryMs, checkoutCompletedAt: null,
        ...(copyEntry ? { activityLog: [...(inq.activityLog || []), copyEntry] } : {}),
      };

      if (method === 'email') {
        if (!inq.clientEmail) {
          alert('Този клиент няма въведен имейл в запитването — избери "Копирай линка" вместо това.');
          return;
        }
        await emailjs.send(SERVICE_ID, CLIENT_TEMPLATE_ID, {
          to_email: inq.clientEmail,
          subject,
          // Предназначен за превю (известия на телефона + inbox списъка) — най-важното в първите 40-50 символа,
          // тъй като мобилните клиенти показват най-малко текст.
          preheader: 'Важно за вашата резервация. Моля, попълнете данните на пътниците - линкът е валиден 14 дни',
          message: body.replace(/\n/g, '<br>'),
        }, PUBLIC_KEY);

        const logEntry = { subject, body, kind: 'checkout_link', sentAt: new Date().toISOString(), by: getStaffName() };
        const updatedLog = [...(inq.emailLog || []), logEntry];
        await updateDoc(doc(db, "inquiries", inq.id), { emailLog: updatedLog });
        updatedInq = { ...updatedInq, emailLog: updatedLog };

        alert(`Линкът е изпратен на ${inq.clientEmail}!`);
      } else {
        await navigator.clipboard.writeText(link);
        alert(`Линкът е копиран в clipboard-а!\n\n${link}\n\nВалиден е 14 дни. Изпратете го през Viber/WhatsApp.`);
      }

      setInquiries(prev => prev.map(item => item.id === inq.id ? updatedInq : item));
    } catch (error) {
      console.error("Грешка при генериране на checkout линк:", error);
      alert("Грешка при генериране на линка. Проверете конзолата за детайли (най-често: EmailJS template не е конфигуриран).");
    }
  };

  // Повторен линк за попълване, когато клиентът е сгрешил данните си. За разлика от handleGenerateCheckoutLink,
  // НЕ нулира checkoutCompletedAt — резервацията си остава в „Резервации“ (с видим статус „Чака корекция“),
  // а старите данни се пазят, докато клиентът не изпрати коригираните. Новият линк е валиден 14 дни.
  const handleRequestCorrection = async (inq: any, method: 'email' | 'copy') => {
    const token = crypto.randomUUID();
    const expiryMs = Date.now() + 14 * 24 * 60 * 60 * 1000;
    try {
      // По имейл историята се записва, когато имейлът реално тръгне (kind 'correction' в emailLog).
      const copyEntry = method === 'copy' ? activityEntry('correction', 'Поискана корекция на данните (линкът е копиран за Viber/WhatsApp)') : null;
      await updateDoc(doc(db, "inquiries", inq.id), {
        checkoutToken: token,
        checkoutTokenExpiry: expiryMs,
        checkoutReopened: true,
        ...(copyEntry ? { activityLog: arrayUnion(copyEntry) } : {}),
      });
      const updatedInq = {
        ...inq, checkoutToken: token, checkoutTokenExpiry: expiryMs, checkoutReopened: true,
        ...(copyEntry ? { activityLog: [...(inq.activityLog || []), copyEntry] } : {}),
      };
      setInquiries(prev => prev.map(item => item.id === inq.id ? updatedInq : item));

      const link = `${window.location.origin}/checkout/${token}`;
      if (method === 'copy') {
        await navigator.clipboard.writeText(link);
        alert(`Линкът за корекция е копиран!\n\n${link}\n\nВалиден е 14 дни. Изпратете го през Viber/WhatsApp. Резервацията остава в „Резервации“.`);
        return;
      }
      if (!inq.clientEmail) {
        alert('Този клиент няма въведен имейл. Добавете го от редакцията на запитването или изберете „Копирай линка“.');
        return;
      }
      // Отваряме готовия имейл за преглед — админът може да допише какво точно да се поправи, преди да го изпрати.
      setEmailModalData({
        inquiry: updatedInq,
        kind: 'correction',
        subject: 'Корекция на данните за вашата резервация',
        body: `Здравейте ${inq.clientName || ''},\n\nПри проверка на данните за "${inq.tourTitle}" се оказа, че е нужно да ги попълните отново (например поради неточност или нечетлива снимка на паспорта).\n\nМоля, попълнете ги през този линк:\n${link}\n\nЛинкът е валиден 14 дни.\n\nБлагодарим Ви!\nBeliva VIP Tour`,
      });
    } catch (error) {
      console.error('Грешка при линк за корекция:', error);
      alert('Грешка при генериране на линка за корекция.');
    }
  };

  // Изпраща имейл (до клиента или — с to — до туроператора) и го добавя в журнала на запитването.
  // Еднопосочно: пазим само това, което НИЕ сме изпратили, не отговорите.
  const handleSendCorrespondence = async () => {
    if (!emailModalData) return;
    const to = emailModalData.to || emailModalData.inquiry.clientEmail;
    if (!to || to === 'няма имейл') {
      alert('Няма въведен имейл.');
      return;
    }
    setIsSendingEmail(true);
    try {
      await emailjs.send(SERVICE_ID, CLIENT_TEMPLATE_ID, {
        to_email: to,
        subject: emailModalData.subject,
        preheader: derivePreheader(emailModalData.body),
        // Същата причина като при checkout линка по-горе — виж коментара там.
        message: emailModalData.body.replace(/\n/g, '<br>'),
      }, PUBLIC_KEY);

      const logEntry = {
        subject: emailModalData.subject, body: emailModalData.body,
        ...(emailModalData.kind ? { kind: emailModalData.kind } : {}),
        ...(emailModalData.to ? { to: emailModalData.to } : {}),
        sentAt: new Date().toISOString(),
        by: getStaffName(),
      };
      // arrayUnion — за да не се загубят имейли, добавени междувременно (локалното копие може да е старо)
      await updateDoc(doc(db, "inquiries", emailModalData.inquiry.id), { emailLog: arrayUnion(logEntry) });
      setInquiries(prev => prev.map(item => item.id === emailModalData.inquiry.id ? { ...item, emailLog: [...(item.emailLog || []), logEntry] } : item));

      setEmailModalData(null);
      alert('Имейлът е изпратен успешно!');
    } catch (error) {
      console.error("Грешка при изпращане на имейл:", error);
      alert('Грешка при изпращането — провери EmailJS конфигурацията в конзолата.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Намира имейла на оператора по името му във тура (което е записано във tour.operator).
  const getOperatorFor = (inq: any) => {
    const tour = allTours.find((t: any) => t.id === inq.tourId);
    const opName = tour?.operator;
    const op = operators.find(o => o.name === opName);
    return { tour, operatorName: opName, operatorEmail: op?.email || '' };
  };

  // Отваря preview/потвърждение модал за изпращане на данните на пътниците към турооператора — работи и за едно запитване,
  // и за няколко (групово от чекбоксовете). ВСИЧКИ избрани запитвания трябва да са за СЪЩИЯ
  // тур (същия оператор) — иначе няма смисъл в един имейл да изпратим към повече от един оператор.
  const handleOpenOperatorSend = async (inqs: any[]) => {
    if (inqs.length === 0) return;

    const contexts = inqs.map(inq => ({ inq, ...getOperatorFor(inq) }));
    const uniqueOperatorNames = new Set(contexts.map(c => c.operatorName));

    if (uniqueOperatorNames.size > 1) {
      alert('Избраните запитвания са за различни турооператори. Избери само запитвания за един и същ тур.');
      return;
    }

    const { operatorName, operatorEmail } = contexts[0];
    if (!operatorEmail) {
      alert(`Оператор "${operatorName || 'Неизвестен'}" няма зададен имейл в Настройки → Турооператори. Добави го там първо.`);
      return;
    }

    const token = crypto.randomUUID();
    const expiryMs = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 дни
    const link = `${window.location.origin}/operator-view/${token}`;
    const tourTitle = contexts[0].inq.tourTitle;
    const externalLink = contexts[0].tour?.externalSourceLink;

    // ВАЖНО за сигурност: вместо да вложим декриптирани ЕГН/паспорт данни директно в тялото
    // на имейла (което пътува през обикновени, не криптиран пощенски канали), генерираме
    // сигурен, времево ограничен линк към /operator-view/[token] — същият модел като checkoutToken за
    // клиентския флоу. Самият имейл НЕ съдържа чувствителните данни — те се декриптират само на
    // самата страница, сървърно.
    let messageBody = `Здравейте,<br><br>Прилагаме линк към данните на пътниците за резервация(и) за "${tourTitle}" (Име в сайта на Beliva VIP tour)`;
    if (externalLink) messageBody += ` <br><a href="${externalLink}">оригинална обява </a> (линк към Вашия уебсайт)`;
    messageBody += `:<br>Вижте данните от следния линк: <br><br><a href="${link}">${link}</a><br><br>Линкът е валиден 7 дни.<br><br>`;

    setOperatorSendModalData({
      inquiries: inqs,
      operatorEmail,
      operatorName: operatorName || 'Неизвестен',
      subject: 'Резервация',
      message: messageBody,
      token,
      expiryMs,
    });
  };

  // Реалното изпращане към оператора — след като админът е прегледал/потвърдил в модала. Записва
  // токена върху ВСИЧКИ избрани запитвания (същия токен на всички) — същият модел като checkoutToken.
  const handleSendToOperator = async () => {
    if (!operatorSendModalData) return;
    setIsSaving(true);
    try {
      await emailjs.send(SERVICE_ID, CLIENT_TEMPLATE_ID, {
        to_email: operatorSendModalData.operatorEmail,
        subject: operatorSendModalData.subject,
        preheader: 'Линк към данните на пътниците — валиден 7 дни',
        message: operatorSendModalData.message,
      }, PUBLIC_KEY);

      const operatorEntry = activityEntry('operator', `Данните на пътниците са изпратени на ${operatorSendModalData.operatorName} (${operatorSendModalData.operatorEmail})`);
      const sentAt = operatorEntry.at;
      for (const inq of operatorSendModalData.inquiries) {
        await updateDoc(doc(db, "inquiries", inq.id), {
          operatorDataSentAt: sentAt,
          operatorViewToken: operatorSendModalData.token,
          operatorViewTokenExpiry: operatorSendModalData.expiryMs,
          activityLog: arrayUnion(operatorEntry),
        });
      }
      setInquiries(prev => prev.map(item =>
        operatorSendModalData.inquiries.some(i => i.id === item.id)
          ? { ...item, operatorDataSentAt: sentAt, operatorViewToken: operatorSendModalData.token, operatorViewTokenExpiry: operatorSendModalData.expiryMs, activityLog: [...(item.activityLog || []), operatorEntry] }
          : item
      ));

      setSelectedForOperator(new Set());
      setOperatorSendModalData(null);
      alert(`Линкът е изпратен на ${operatorSendModalData.operatorEmail}!`);
    } catch (error) {
      console.error('Грешка при изпращане към оператора:', error);
      alert('Грешка при изпращането.');
    } finally {
      setIsSaving(false);
    }
  };

  // Извлича кратък превю текст (за известията/inbox списъка) от свободен текст — махаме нови
  // редове/излишни интервали и съкращаваме до ~95 символа — сладката точка за болшинството клиенти.
  const derivePreheader = (text: string, maxLen = 95) => {
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length > maxLen ? clean.slice(0, maxLen - 1) + '…' : clean;
  };

  // TourPicker ⇄ полетата на запитването (същото като в AdminDashboardClient → „Корекция на запитване“).
  const editTourChoice = (f: typeof editForm): TourChoice =>
    f.tourId && allTours.some(t => t.id === f.tourId)
      ? { kind: 'tour', tourId: f.tourId, ...(/^\d{4}-\d{2}-\d{2}/.test(f.tourDate || '') ? { date: f.tourDate } : {}) }
      : f.destination ? { kind: 'destination', country: f.destination } : { kind: 'general' };
  const editFieldsFromChoice = (c: TourChoice) => {
    if (c.kind === 'tour') {
      const t = allTours.find(x => x.id === c.tourId);
      return { tourId: c.tourId, tourTitle: t?.title || 'Общо запитване', destination: '', tourDate: c.date || 'Не е потвърдена' };
    }
    if (c.kind === 'destination') return { tourId: 'general', tourTitle: `Дестинация: ${c.country}`, destination: c.country, tourDate: 'Не е потвърдена' };
    return { tourId: 'general', tourTitle: 'Общо запитване', destination: '', tourDate: 'Не е потвърдена' };
  };

  const openEditModal = (inq: any) => {
    setEditingInq(inq);
    setEditForm({
      tourId: inq.tourId || '',
      tourTitle: inq.tourTitle || '',
      tourDate: inq.tourDate || 'Не е потвърдена',
      destination: inq.destination || '',
      // Само собствените бележки — съобщението на клиента се показва отделно и не се копира тук.
      notes: getOwnNotes(inq),
      clientEmail: inq.clientEmail || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingInq) return;
    const clientEmail = editForm.clientEmail.trim();
    if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      alert('Въведеният имейл не изглежда валиден.');
      return;
    }
    const payload = { ...editForm, clientEmail, tourDate: editForm.tourDate.trim() || 'Не е потвърдена' };
    const inq = fresh(editingInq);
    const oldDate = inq.tourDate || 'Не е потвърдена';
    const tourChanged = payload.tourId !== (inq.tourId || '') || payload.tourTitle !== (inq.tourTitle || '');
    const dateChanged = payload.tourDate !== oldDate;
    const showDate = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? displayTourDate(d) : d);
    // Смяната на екскурзия/дата се записва в историята с „от → на“, за да се вижда какво е искал клиентът.
    const changed = [
      tourChanged && `екскурзия „${inq.tourTitle || 'Общо запитване'}“ → „${payload.tourTitle || 'Общо запитване'}“`,
      dateChanged && `дата ${showDate(oldDate)} → ${showDate(payload.tourDate)}`,
      payload.clientEmail !== (inq.clientEmail || '') && 'имейл',
      payload.notes !== getOwnNotes(inq) && 'бележки',
    ].filter(Boolean);
    const entry = changed.length > 0 ? activityEntry('edit', `${tourChanged || dateChanged ? 'Смяна' : 'Редакция'}: ${changed.join('; ')}`) : null;

    // Местата и офертата важат за конкретна дата — при смяна предлагаме да се направят наново.
    let resets: Record<string, string> = {};
    if ((tourChanged || dateChanged) && STEPS_RESET_ON_CHANGE.some(k => isDone(inq, k))) {
      const labels = STEPS.filter(s => STEPS_RESET_ON_CHANGE.includes(s.key) && isDone(inq, s.key)).map(s => `• ${s.label}`).join('\n');
      if (confirm(`Сменяш ${tourChanged ? 'екскурзията' : 'датата'}. Тези стъпки са за старата и трябва да се направят наново:\n\n${labels}\n\nДа ги махна ли? (Остават в историята.)`)) {
        const now = new Date().toISOString();
        resets = Object.fromEntries(STEPS_RESET_ON_CHANGE.map(k => [k, now]));
      }
    }
    if ((tourChanged || dateChanged) && isDone(inq, 'data_to_operator')) {
      alert('Данните на пътниците вече са изпратени на туроператора — уведоми го за промяната.');
    }
    if (tourChanged && Number(inq.totalPrice) > 0) {
      alert('Провери договорената цена в „Плащания“ — тя е за старата екскурзия.');
    }

    const resetFields = Object.fromEntries(Object.entries(resets).map(([k, v]) => [`stepResets.${k}`, v]));
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "inquiries", inq.id), { ...payload, ...resetFields, ...(entry ? { activityLog: arrayUnion(entry) } : {}) });
      setInquiries(prev => prev.map(item => item.id === inq.id
        ? {
          ...item, ...payload,
          ...(Object.keys(resets).length ? { stepResets: { ...(item.stepResets || {}), ...resets } } : {}),
          ...(entry ? { activityLog: [...(item.activityLog || []), entry] } : {}),
        }
        : item));
      setEditingInq(null);
    } catch (error) {
      console.error(error);
      alert('Промяната не се записа. Опитай пак.');
    } finally { setIsSaving(false); }
  };

  // ================= РАБОТЕН ПРОЦЕС: стъпки, бележки, плащания =================

  // Записва промяна в базата и в локалния списък наведнъж (картата и списъкът се обновяват веднага).
  const patchInquiry = async (inq: any, data: Record<string, any>, local: (item: any) => Record<string, any>, entry?: ReturnType<typeof activityEntry>) => {
    await updateDoc(doc(db, "inquiries", inq.id), { ...data, ...(entry ? { activityLog: arrayUnion(entry) } : {}) });
    setInquiries(prev => prev.map(item => item.id === inq.id
      ? { ...item, ...local(item), ...(entry ? { activityLog: [...(item.activityLog || []), entry] } : {}) }
      : item));
  };
  const fresh = (inq: any) => inquiries.find(i => i.id === inq.id) || inq;
  // Първото действие по ново запитване го прави „В процес“ (броячът „Нови запитвания“ на таблото разчита на статуса).
  const statusBump = (inq: any) => ((inq.status || 'new') === 'new' ? { status: 'processing' } : {});

  const toggleStep = async (inq: any, key: StepKey, done: boolean) => {
    const step = STEPS.find(s => s.key === key);
    if (!step) return;
    const entry = activityEntry('step', done ? step.label : `Махната отметка: ${step.label}`);
    const value = { at: entry.at, by: entry.by };
    const bump = done ? statusBump(inq) : {};
    try {
      await patchInquiry(inq, { [`steps.${key}`]: done ? value : deleteField(), ...bump }, item => {
        const steps = { ...(item.steps || {}) };
        if (done) steps[key] = value; else delete steps[key];
        return { steps, ...bump };
      }, entry);
    } catch (e) {
      console.error(e);
      alert('Стъпката не се записа. Опитай пак.');
    }
  };

  const addNote = async (inq: any, text: string) => {
    const entry = activityEntry('note', text);
    try { await patchInquiry(inq, {}, () => ({}), entry); } catch (e) { console.error(e); alert('Бележката не се записа.'); }
  };

  const openPayment = (inq: any, kind: Payment['kind']) => {
    const tour = tourOf(inq);
    const unit = parsePrice(tour ? currentPrice(tour) : '');
    setPaymentDraft({ inquiry: fresh(inq), kind, suggestedTotal: unit ? unit * Math.max(1, paxOf(inq)) : 0 });
  };

  const savePayment = async (data: Omit<Payment, 'id' | 'createdAt' | 'by'>, totalPrice: number) => {
    if (!paymentDraft) return;
    const inq = fresh(paymentDraft.inquiry);
    const payment: Payment = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString(), by: getStaffName() };
    const list = [...(inq.payments || []), payment];
    const entry = activityEntry('payment', `${PAYMENT_KINDS[payment.kind]}: ${payment.kind === 'refund' ? '−' : ''}${euro(payment.amount)} (${payment.to === 'agency' ? 'към агенцията' : 'към туроператора'})`);
    const extra = { ...(totalPrice ? { totalPrice } : {}), ...statusBump(inq) };
    try {
      await patchInquiry(inq, { payments: list, ...extra }, () => ({ payments: list, ...extra }), entry);
      setPaymentDraft(null);
    } catch (e) {
      console.error(e);
      alert('Плащането не се записа. Опитай пак.');
    }
  };

  const markForwarded = async (inq: any, paymentId: string) => {
    const cur = fresh(inq);
    const p = (cur.payments || []).find((x: Payment) => x.id === paymentId);
    const list = (cur.payments || []).map((x: Payment) => (x.id === paymentId ? { ...x, forwardedAt: new Date().toISOString() } : x));
    const entry = activityEntry('payment', `Преведено на туроператора: ${euro(p?.amount || 0)}`);
    try { await patchInquiry(cur, { payments: list }, () => ({ payments: list }), entry); } catch (e) { console.error(e); alert('Не се записа.'); }
  };

  const removePayment = async (inq: any, paymentId: string) => {
    const cur = fresh(inq);
    const p = (cur.payments || []).find((x: Payment) => x.id === paymentId);
    if (!p || !confirm(`Да изтрия ли плащането ${PAYMENT_KINDS[p.kind].toLowerCase()} ${euro(p.amount)}?`)) return;
    const list = (cur.payments || []).filter((x: Payment) => x.id !== paymentId);
    const entry = activityEntry('payment', `Изтрито плащане: ${PAYMENT_KINDS[p.kind]} ${euro(p.amount)}`);
    try { await patchInquiry(cur, { payments: list }, () => ({ payments: list }), entry); } catch (e) { console.error(e); alert('Не се записа.'); }
  };

  const saveFinance = async (inq: any, { totalPrice, paxCount }: { totalPrice: number; paxCount: number }) => {
    const entry = activityEntry('edit', `Цена/пътници: ${totalPrice ? euro(totalPrice) : '—'}, ${paxCount || '—'} души`);
    const data = { totalPrice: totalPrice || null, paxCount: paxCount || null };
    try { await patchInquiry(inq, data, () => data, entry); } catch (e) { console.error(e); alert('Не се записа.'); }
  };

  const operatorFor = (inq: any) => {
    const name = tourOf(inq)?.operator;
    return operators.find(o => o.name === name);
  };

  const pdfUrlFor = (tour: any) => {
    if (!tour) return '';
    if (tour.pdfUrl) return tour.pdfUrl;
    const slug = tour.tourId || tour.slug || tour.id;
    return `${window.location.origin}/tour/${encodeURIComponent(slug)}/programa.pdf`;
  };

  const signature = () => `${getStaffName() ? `${getStaffName()}\n` : ''}Beliva VIP Tour\n${COMPANY_INFO.phone} · ${COMPANY_INFO.email}`;

  // Офертата съдържа задължителната преддоговорна информация: данните на туроператора и на агенцията (чл. 82, ал. 1 ЗТ).
  const openOffer = (inq: any) => {
    const tour = tourOf(inq);
    const op = operatorFor(inq);
    const price = tour ? currentPrice(tour) : '';
    const pdf = pdfUrlFor(tour);
    const agency = [
      `Туристическа агенция (посредник): ${COMPANY_INFO.legalName}, ЕИК ${COMPANY_INFO.eik}`,
      `Удостоверение за регистрация № ${COMPANY_INFO.license}`,
      `Седалище и адрес: ${COMPANY_INFO.registeredAddress || COMPANY_INFO.address}`,
      `Телефон: ${COMPANY_INFO.phone} · Имейл: ${COMPANY_INFO.email}`,
    ].join('\n');
    setEmailModalData({
      inquiry: inq,
      kind: 'offer',
      subject: `Оферта: ${inq.tourTitle || 'екскурзия'}${inq.tourDate && inq.tourDate !== 'Не е потвърдена' ? ` — ${inq.tourDate}` : ''}`,
      body: [
        `Здравейте, ${inq.clientName || ''},`,
        '',
        `Благодарим за интереса към „${inq.tourTitle || ''}“${inq.tourDate ? ` с дата ${inq.tourDate}` : ''}. Има свободни места.`,
        '',
        `Цена: ${price || '[попълни]'} на човек${tour?.singleSupplement ? ` (доплащане за единична стая: ${tour.singleSupplement})` : ''}.`,
        `Капаро: ${tour?.deposit || '[попълни — обикновено 50% при самолетни и 30% при автобусни екскурзии, до 3 работни дни след подписване]'}. Остатъкът — [попълни срок].`,
        pdf ? `Пълна програма (PDF): ${pdf}` : '',
        '',
        operatorOfferBlock(op, tour?.operator),
        '',
        agency,
        '',
        'Стандартният формуляр за информация по Директива (ЕС) 2015/2302 е в Общите условия на туроператора. Договорът влиза в сила след подписването му и плащането на капарото.',
        '',
        'Ако желаете да резервирате, отговорете на този имейл и ще Ви изпратим линк за данните на пътниците.',
        '',
        'Поздрави,',
        signature(),
      ].filter(line => line !== null).join('\n'),
    });
  };

  // Питане за свободни места — без лични данни на клиента (само екскурзия, дата, брой).
  const askOperator = (inq: any) => {
    const op = operatorFor(inq);
    if (!op?.email) { alert('Туроператорът няма имейл в Настройки → Турооператори.'); return; }
    const tour = tourOf(inq);
    setEmailModalData({
      inquiry: inq,
      kind: 'operator_availability',
      to: op.email,
      toLabel: op.legalName || op.name,
      subject: `Запитване за места: ${inq.tourTitle || ''} — ${inq.tourDate || ''}`,
      body: [
        'Здравейте,',
        '',
        `Имате ли свободни места за „${inq.tourTitle || ''}“ с дата ${inq.tourDate || '[дата]'} за ${paxOf(inq) || '[брой]'} души?`,
        tour?.externalSourceLink ? `Програмата при вас: ${tour.externalSourceLink}` : '',
        '',
        'Моля, потвърдете наличността.',
        '',
        'Поздрави,',
        signature(),
      ].join('\n'),
    });
  };

  const sendProgram = (inq: any) => {
    const pdf = pdfUrlFor(tourOf(inq));
    setEmailModalData({
      inquiry: inq,
      kind: 'program',
      subject: `Програма: ${inq.tourTitle || 'екскурзия'}`,
      body: `Здравейте, ${inq.clientName || ''},\n\nИзпращаме Ви пълната програма на „${inq.tourTitle || ''}“:\n${pdf}\n\nАко имате въпроси, пишете ни или ни се обадете.\n\nПоздрави,\n${signature()}`,
    });
  };

  // Една стъпка от процеса: отметка или съответното действие (имейл, линк, плащане…).
  const runStep = (inq: any, step: StepDef) => {
    const email = inq.clientEmail && inq.clientEmail !== 'няма имейл';
    switch (step.action) {
      case 'tick': toggleStep(inq, step.key, true); break;
      case 'offer_email':
        if (!email) { if (confirm('Клиентът няма имейл. Да отбележа ли офертата като изпратена (по телефон/Viber)?')) toggleStep(inq, step.key, true); }
        else openOffer(inq);
        break;
      case 'data_link':
        if (!inq.tourId || !inq.tourDate || inq.tourDate === 'Не е потвърдена' || inq.tourDate === 'Не е избрана') {
          alert('Първо избери екскурзия и дата (бутон „Редактирай“ в картата).');
          setDrawerId(inq.id);
        } else handleGenerateCheckoutLink(inq, email ? 'email' : 'copy');
        break;
      case 'operator_send':
        if (!inq.checkoutCompletedAt) alert('Клиентът още не е попълнил данните на пътниците.');
        else handleOpenOperatorSend([inq]);
        break;
      case 'payment_deposit': openPayment(inq, 'deposit'); break;
      case 'payment_full': handleStatusChangeClick(inq, 'paid'); break;
      default: setDrawerId(inq.id);
    }
  };

  const drawerActions = (inq: any): DrawerActions => ({
    toggleStep: (key, done) => toggleStep(inq, key, done),
    addNote: text => addNote(inq, text),
    openPayment: kind => openPayment(inq, kind),
    markForwarded: id => markForwarded(inq, id),
    removePayment: id => removePayment(inq, id),
    saveFinance: data => saveFinance(inq, data),
    runStep: step => runStep(inq, step),
    emailClient: () => setEmailModalData({ inquiry: inq, subject: 'Относно вашето запитване', body: `Здравейте, ${inq.clientName || ''},\n\n\n\nПоздрави,\n${signature()}` }),
    sendOffer: () => openOffer(inq),
    askOperator: () => askOperator(inq),
    dataLink: method => handleGenerateCheckoutLink(inq, method),
    correction: method => handleRequestCorrection(inq, method),
    sendToOperator: () => handleOpenOperatorSend([inq]),
    sendProgram: () => sendProgram(inq),
    cancel: () => { if (confirm('Да отбележа ли запитването като отказано? Ще отиде в „Архив“.')) handleStatusChangeClick(inq, 'cancelled'); },
    restore: () => handleStatusChangeClick(inq, 'processing'),
    edit: () => openEditModal(inq),
    remove: async () => { if (await handleDelete(inq.id)) setDrawerId(null); },
  });

  if (isLoading) return <div className="p-8 text-center text-gray-500 font-medium">Зареждане на запитвания...</div>;

  const counts = Object.fromEntries(STAGES.map(s => [s.key, stageItems(s.key).length])) as Record<StageKey, number>;
  const byTripDate = (a: any, b: any) => ((tripStart(a)?.getTime() ?? 9e15) - (tripStart(b)?.getTime() ?? 9e15));
  const byNewest = (a: any, b: any) => ((toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));
  const activeItems = tab === 'stats' ? [] : stageItems(tab).sort(tab === 'new' || tab === 'offer' || tab === 'archive' ? byNewest : byTripDate);
  const selectable = tab === 'contract' || tab === 'payment' || tab === 'upcoming';
  const overdueCount = searchFiltered.filter(inq => isOverdue(inq, tourOf(inq))).length;
  const drawerInq = drawerId ? inquiries.find(i => i.id === drawerId) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ТАБОВЕ ПО ЕТАПИ + кой работи */}
      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex flex-wrap gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100" aria-label="Етапи на запитванията">
          {STAGES.map(s => (
            <button
              key={s.key}
              onClick={() => { setTab(s.key); setSelectedForOperator(new Set()); }}
              aria-current={tab === s.key ? 'page' : undefined}
              className={`px-4 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${tab === s.key ? 'bg-brand-gold text-brand-dark shadow' : 'text-gray-500 hover:text-brand-dark hover:bg-gray-50'}`}
            >
              {s.label} <span className={tab === s.key ? 'text-brand-dark/70' : 'text-gray-400'}>{counts[s.key]}</span>
            </button>
          ))}
          <button
            onClick={() => setTab('stats')}
            aria-current={tab === 'stats' ? 'page' : undefined}
            className={`px-4 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all inline-flex items-center gap-1.5 ${tab === 'stats' ? 'bg-brand-dark text-white shadow' : 'text-gray-500 hover:text-brand-dark hover:bg-gray-50'}`}
          >
            <BarChart3 size={13} /> Справки
          </button>
        </nav>
        <div className="ml-auto"><StaffPicker /></div>
      </div>

      {tab === 'stats' ? (
        <ReservationStats inquiries={inquiries} tours={allTours} customers={customers} operators={operators} onOpen={inq => setDrawerId(inq.id)} />
      ) : (
        <>
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Търси по име, телефон, екскурзия или бележки..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Търсене"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-gold/20 outline-none font-medium"
              />
            </div>
            {overdueCount > 0 && (
              <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-center gap-2">
                <AlertTriangle size={14} /> {overdueCount} {overdueCount === 1 ? 'запитване чака' : 'запитвания чакат'} действие повече от 1 работен ден
              </p>
            )}
          </div>

          {selectable && selectedForOperator.size > 0 && (
            <div className="bg-brand-dark text-white p-5 rounded-2xl flex items-center justify-between animate-in fade-in">
              <span className="text-sm font-bold">{selectedForOperator.size} избрани</span>
              <div className="flex gap-3">
                <button
                  onClick={() => handleOpenOperatorSend(activeItems.filter(i => selectedForOperator.has(i.id) && i.checkoutCompletedAt))}
                  className="bg-brand-gold text-brand-dark px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-white transition-all"
                >
                  Изпрати данните на турооператора
                </button>
                <button onClick={() => setSelectedForOperator(new Set())} className="text-white/60 hover:text-white text-xs font-bold">Откажи</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {selectable && (
                      <th className="p-5 w-10">
                        <input
                          type="checkbox"
                          aria-label="Избери всички"
                          checked={activeItems.length > 0 && selectedForOperator.size === activeItems.length}
                          onChange={(e) => setSelectedForOperator(e.target.checked ? new Set(activeItems.map(i => i.id)) : new Set())}
                        />
                      </th>
                    )}
                    <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-widest">Клиент</th>
                    <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-widest">Екскурзия</th>
                    <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-widest">Последно</th>
                    <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-widest text-right">Следваща стъпка</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activeItems.length === 0 && (
                    <tr><td colSpan={selectable ? 5 : 4} className="p-10 text-center text-gray-400 italic">{STAGES.find(s => s.key === tab)?.empty}</td></tr>
                  )}
                  {activeItems.map(inq => {
                    const tour = tourOf(inq);
                    const { matchedCustomer, otherInquiries } = getContactContext(inq);
                    const { hasDiscount, regularPrice, finalPrice, discountPercentage } = getDiscountInfo(inq);
                    const last = lastActivity(inq);
                    const next = nextStep(inq, tour);
                    const overdue = isOverdue(inq, tour);
                    const paid = paidTotal(inq);
                    const total = Number(inq.totalPrice) || 0;
                    const unforwarded = unforwardedPayments(inq).length;
                    const email = inq.clientEmail && inq.clientEmail !== 'няма имейл' ? inq.clientEmail : '';
                    return (
                      <tr key={inq.id} className={`transition-colors ${overdue ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-gray-50/50'}`}>
                        {selectable && (
                          <td className="p-5">
                            <input
                              type="checkbox"
                              aria-label={`Избери ${inq.clientName || 'запитването'}`}
                              disabled={!inq.checkoutCompletedAt}
                              checked={selectedForOperator.has(inq.id)}
                              onChange={(e) => {
                                const nextSet = new Set(selectedForOperator);
                                if (e.target.checked) nextSet.add(inq.id); else nextSet.delete(inq.id);
                                setSelectedForOperator(nextSet);
                              }}
                            />
                          </td>
                        )}
                        <td className="p-5 align-top">
                          <button onClick={() => setDrawerId(inq.id)} className="font-bold text-gray-800 hover:text-brand-gold text-left">{inq.clientName || 'Непознат'}</button>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Phone size={12} className="text-gray-400" /> {inq.clientPhone}<CopyButton text={inq.clientPhone || ''} label="Копирай телефона" /></div>
                          {email && <div className="text-xs text-gray-500 flex items-center gap-1 break-all"><Mail size={12} className="text-gray-400 shrink-0" /> {email}<CopyButton text={email} label="Копирай имейла" /></div>}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {matchedCustomer && <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-lg">🔁 {matchedCustomer.tripHistory?.length || matchedCustomer.tripsCount || 0} пътувания</span>}
                            {otherInquiries.length > 0 && <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-lg">⚠️ още {otherInquiries.length} запитв.</span>}
                            {inq.checkoutReopened && <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-lg">⏳ чака корекция</span>}
                            {inq.status === 'cancelled' && <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-lg">Отказано</span>}
                          </div>
                        </td>
                        <td className="p-5 align-top">
                          <span className="font-bold text-sm text-brand-dark block max-w-xs">{inq.tourTitle || 'Общо запитване'}</span>
                          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mt-1"><Calendar size={13} className="text-brand-gold" /> {inq.tourDate || 'Не е уточнена'}{paxOf(inq) ? ` · ${paxOf(inq)} души` : ''}</div>
                          {inq.status !== 'paid' && inq.status !== 'cancelled' && (
                            <button onClick={() => openEditModal(inq)} className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 underline underline-offset-2 hover:text-brand-gold">
                              <Pencil size={11} /> Смени екскурзия / дата
                            </button>
                          )}
                          {total > 0 || paid > 0 ? (
                            <p className="text-xs mt-1.5"><span className="font-black text-emerald-700">{euro(paid)}</span><span className="text-gray-400"> / {total ? euro(total) : '—'} платено</span></p>
                          ) : regularPrice > 0 && (
                            <div className="flex items-center gap-2 text-xs mt-1.5">
                              {hasDiscount ? (
                                <>
                                  <span className="text-gray-400 line-through">{regularPrice} €</span>
                                  <span className="text-emerald-600 font-black">{finalPrice} €</span>
                                  <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5"><Percent size={9}/>{discountPercentage}</span>
                                </>
                              ) : <span className="text-gray-500 font-bold">{regularPrice} € / човек</span>}
                            </div>
                          )}
                          {unforwarded > 0 && <p className="text-[11px] font-bold text-amber-700 mt-1">Чака превод на туроператора</p>}
                        </td>
                        <td className="p-5 align-top max-w-[240px]">
                          {last && (
                            <>
                              <p className="text-xs text-gray-700 font-semibold leading-snug line-clamp-2">{last.text}</p>
                              <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5" title={formatDateTime(last.at)}><Clock size={10} /> {timeAgo(last.at)}{last.by ? ` · ${last.by}` : ''}</p>
                            </>
                          )}
                        </td>
                        <td className="p-5 align-top text-right">
                          <div className="flex justify-end items-center gap-2">
                            {next && next.action !== 'auto' ? (
                              <button
                                onClick={() => runStep(inq, next)}
                                className="px-4 py-2.5 rounded-xl bg-brand-gold text-brand-dark text-[11px] font-black hover:bg-brand-dark hover:text-white transition-colors whitespace-nowrap"
                              >
                                {next.cta}
                              </button>
                            ) : next ? (
                              <span className="text-[11px] font-bold text-gray-400 whitespace-nowrap">{next.cta}</span>
                            ) : null}
                            <button onClick={() => setDrawerId(inq.id)} aria-label={`Отвори ${inq.clientName || 'запитването'}`} className="inline-flex items-center gap-0.5 px-3 py-2.5 rounded-xl border border-gray-200 text-[11px] font-bold text-brand-dark hover:border-brand-gold">
                              Отвори <ChevronRight size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {drawerInq && (
        <InquiryDrawer
          inq={drawerInq}
          tour={tourOf(drawerInq)}
          operator={operatorFor(drawerInq)}
          pdfUrl={pdfUrlFor(tourOf(drawerInq))}
          actions={drawerActions(drawerInq)}
          onClose={() => setDrawerId(null)}
        />
      )}

      {paymentDraft && <PaymentDialog draft={paymentDraft} onClose={() => setPaymentDraft(null)} onSave={savePayment} />}

      {/* МОДАЛ: РЕДАКЦИЯ НА ЗАПИТВАНЕ */}
      {editingInq && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-brand-dark/90 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="font-serif italic text-xl text-brand-dark">Промяна на запитването</h3>
                <p className="text-xs text-gray-400 mt-1">{editingInq.clientName} · сега: {editingInq.tourTitle || 'Общо запитване'}, {editingInq.tourDate || 'без дата'}</p>
              </div>
              <button onClick={() => setEditingInq(null)} aria-label="Затвори" className="p-2 text-gray-300 hover:text-red-500"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto max-h-[85vh]">
              {editingInq?.message && (
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">Съобщение от клиента</label>
                  <p className="text-sm text-gray-700 italic">{editingInq.message}</p>
                </div>
              )}
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2 mb-2 block">Имейл на клиента</label>
                <input
                  type="email"
                  value={editForm.clientEmail}
                  onChange={e => setEditForm({...editForm, clientEmail: e.target.value})}
                  placeholder="имейл (по избор)"
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium outline-none focus:bg-white focus:border-brand-gold"
                />
                <p className="text-[11px] text-gray-400 mt-2 ml-2">Може да се смени, докато човекът още не е клиент. При „Платено“ имейлът отива в профила му.</p>
              </div>
              {/* Екскурзия и дата — същият избор като в запитването на сайта и в другите прозорци на админа:
                  дестинации, търсене, всички дати на тура като бутони (вкл. архивирани турове и минали дати). */}
              <div className="space-y-3">
                <TourPicker
                  label="Екскурзия и дата"
                  tours={allTours.filter(t => t.status !== 'draft')}
                  value={editTourChoice(editForm)}
                  onChange={c => setEditForm({ ...editForm, ...editFieldsFromChoice(c) })}
                  showMonthFilter
                />
                {editForm.tourId && editForm.tourId !== 'general' && (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 ml-1">
                    <span>Избрана дата: <strong className="text-brand-dark">{/^\d{4}-\d{2}-\d{2}$/.test(editForm.tourDate) ? displayTourDate(editForm.tourDate) : (editForm.tourDate || 'не е избрана')}</strong></span>
                    <label className="inline-flex items-center gap-2">
                      или друга дата:
                      <input
                        type="date"
                        value={/^\d{4}-\d{2}-\d{2}$/.test(editForm.tourDate) ? editForm.tourDate : ''}
                        onChange={e => setEditForm({ ...editForm, tourDate: e.target.value || 'Не е потвърдена' })}
                        className="p-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-brand-gold"
                      />
                    </label>
                  </div>
                )}
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2 mb-2 block">Бележки (отиват в профила на клиента, ако стане клиент)</label>
                <textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} className="w-full h-32 p-4 bg-yellow-50/50 border border-yellow-100 rounded-2xl text-sm outline-none resize-none" placeholder="Интересува се от..." />
              </div>
              <button onClick={handleSaveEdit} disabled={isSaving} className="w-full bg-brand-dark text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-all shadow-xl">{isSaving ? 'Запазване...' : 'Запази промените'}</button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛ: ПОТВЪРЖДЕНИЕ НА ПЛАЩАНЕ */}
      {paymentModalData && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-brand-dark/95 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-[3.5rem] w-full max-w-lg shadow-[0_30px_80px_rgba(0,0,0,0.4)] overflow-hidden animate-in zoom-in-95">
            <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-emerald-500 text-white">
              <h3 className="font-serif italic text-2xl flex items-center gap-3"><CheckCircle size={28} /> Финализиране</h3>
              <button onClick={() => setPaymentModalData(null)} className="p-2 hover:bg-white/20 rounded-full transition-all"><X size={24} /></button>
            </div>
            <div className="p-10 space-y-8">
              {paymentModalData.existingCustomer ? (
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2rem]">
                  <h4 className="flex items-center gap-2 font-black text-blue-900 text-[10px] uppercase tracking-widest mb-3">
                    <AlertTriangle size={16} className="text-blue-500" /> Открит съществуващ клиент!
                  </h4>
                  <p className="text-sm font-bold text-blue-900">{paymentModalData.existingCustomer.name || paymentModalData.existingCustomer.firstName + ' ' + paymentModalData.existingCustomer.lastName}</p>
                  <p className="text-xs text-blue-600 mt-1">{paymentModalData.existingCustomer.phone} • {paymentModalData.existingCustomer.email}</p>
                  {paymentModalData.existingCustomer.discountFlag && (
                    <p className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1">
                      <Percent size={12} /> Има лична отстъпка от {paymentModalData.existingCustomer.discountPercentage}% — вече е включена по-долу.
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] flex items-center gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-500"><CheckCircle size={24} /></div>
                  <div>
                    <h4 className="font-black text-emerald-900 text-[10px] uppercase tracking-widest">Нов клиент</h4>
                    <p className="text-sm font-bold text-emerald-800">{paymentModalData.inquiry.clientName}</p>
                  </div>
                </div>
              )}

              <div className="space-y-6 pt-2 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Цена на тура</label>
                    <div className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm space-y-1">
                      {paymentModalData.tourPromoPrice > 0 && paymentModalData.listPrice > paymentModalData.tourPromoPrice ? (
                        <>
                          <p className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase text-gray-400">Редовна</span>
                            <span className="font-bold text-gray-400 line-through">{paymentModalData.listPrice} €</span>
                          </p>
                          <p className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase text-red-500">Промо</span>
                            <span className="font-black text-red-600">{paymentModalData.tourPromoPrice} €</span>
                          </p>
                        </>
                      ) : (
                        <p className="font-bold text-gray-500">
                          {paymentModalData.basePrice > 0 ? `${paymentModalData.basePrice} €` : 'Не е зададена'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-2 mb-2 block">Платена сума *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                      <input
                        type="number"
                        value={paymentModalData.paidPrice}
                        onChange={(e) => setPaymentModalData((prev: any) => ({...prev, paidPrice: e.target.value}))}
                        className="w-full pl-12 pr-4 py-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-lg font-black text-emerald-900 focus:ring-4 focus:ring-emerald-500/10 outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 flex items-center gap-1">
                    <Tag size={12} /> Промоция
                  </label>
                  <select
                    value={paymentModalData.promoId}
                    onChange={(e) => {
                      const opt = (paymentModalData.promoOptions || []).find((o: any) => o.id === e.target.value);
                      const percent = opt && !opt.includedInTour ? opt.percent : 0;
                      setPaymentModalData((prev: any) => ({
                        ...prev,
                        promoId: e.target.value,
                        promoPercent: percent,
                        paidPrice: prev.basePrice > 0 ? calcPaidPrice(prev.basePrice, percent, prev.personalPercent) : prev.paidPrice,
                      }));
                    }}
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-brand-dark outline-none focus:bg-white focus:border-brand-gold"
                  >
                    <option value="">Без промоция</option>
                    {(paymentModalData.promoOptions || []).map((o: any) => (
                      <option key={o.id} value={o.id}>
                        {o.name}{o.includedInTour ? ' (вече в цената на тура)' : o.percent > 0 ? ` (−${o.percent}%)` : ''}
                      </option>
                    ))}
                  </select>
                  {(paymentModalData.promoOptions || []).length === 0 && (
                    <p className="text-[11px] text-gray-400 mt-2 ml-2">В момента няма активни промоции. Добавят се от таб „Промоции“.</p>
                  )}
                  {(() => {
                    const opt = (paymentModalData.promoOptions || []).find((o: any) => o.id === paymentModalData.promoId);
                    if (!opt || opt.includedInTour) return null;
                    return (
                      <div className="mt-3 flex items-center gap-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Отстъпка %</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={paymentModalData.promoPercent}
                          onChange={(e) => {
                            const percent = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                            setPaymentModalData((prev: any) => ({
                              ...prev,
                              promoPercent: percent,
                              paidPrice: prev.basePrice > 0 ? calcPaidPrice(prev.basePrice, percent, prev.personalPercent) : prev.paidPrice,
                            }));
                          }}
                          className="w-24 p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-black text-brand-dark outline-none focus:bg-white focus:border-brand-gold"
                        />
                        {paymentModalData.basePrice > 0 && Number(paymentModalData.promoPercent) > 0 && (
                          <span className="text-xs text-emerald-600 font-bold">
                            −{Math.round(paymentModalData.basePrice * Number(paymentModalData.promoPercent) / 100)} €
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  {paymentModalData.personalPercent > 0 && (
                    <p className="text-[11px] text-emerald-600 font-bold mt-2 ml-2">
                      + лична отстъпка на клиента {paymentModalData.personalPercent}% (включена в сумата)
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Бележка към профила на клиента</label>
                  <textarea
                    value={paymentModalData.notes}
                    onChange={(e) => setPaymentModalData((prev: any) => ({...prev, notes: e.target.value}))}
                    placeholder={`Ще се запише в профила заедно с пътуването „${paymentModalData.inquiry.tourTitle || 'Екскурзия'}“`}
                    className="w-full h-24 p-4 bg-yellow-50/50 border border-yellow-100 rounded-2xl text-sm outline-none resize-none focus:bg-white focus:border-brand-gold"
                  />
                </div>
              </div>

              <button
                onClick={handleConfirmPayment}
                disabled={isSaving}
                className="w-full bg-emerald-500 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-2xl shadow-emerald-500/20 disabled:opacity-50"
              >
                {isSaving ? 'Записване...' : 'Потвърди и създай резервация'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛ: НАПИШИ И ИЗПРАТИ ИМЕЙЛ (КОРЕСПОНДЕНЦИЯ) */}
      {emailModalData && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-brand-dark/90 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="font-serif italic text-xl text-brand-dark">Изпрати имейл</h3>
                <p className="text-xs text-gray-400 mt-1">До: {emailModalData.to ? `${emailModalData.toLabel || ''} (${emailModalData.to})` : (emailModalData.inquiry.clientEmail || 'няма въведен имейл')}</p>
              </div>
              <button onClick={() => setEmailModalData(null)} className="p-2 text-gray-300 hover:text-red-500"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-4">
              <input
                type="text"
                placeholder="Тема на имейла"
                value={emailModalData.subject}
                onChange={e => setEmailModalData(prev => prev ? { ...prev, subject: e.target.value } : prev)}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-brand-gold"
              />
              <textarea
                placeholder="Съдържание на имейла..."
                value={emailModalData.body}
                onChange={e => setEmailModalData(prev => prev ? { ...prev, body: e.target.value } : prev)}
                className="w-full h-48 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:border-brand-gold resize-none"
              />
              <button
                onClick={handleSendCorrespondence}
                disabled={isSendingEmail || !emailModalData.subject.trim() || !emailModalData.body.trim()}
                className="w-full bg-brand-dark text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSendingEmail ? 'Изпращане...' : <><Send size={16}/> Изпрати</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛ: PREVIEW/ПОТВЪРЖДЕНИЕ ЗА ИЗПРАЩАНЕ НА ДАННИТЕ КЪМ ТУРООПЕРАТОРА */}
      {operatorSendModalData && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-brand-dark/90 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 shrink-0">
              <div>
                <h3 className="font-serif italic text-xl text-brand-dark">Изпрати на турооператора</h3>
                <p className="text-xs text-gray-400 mt-1">До: {operatorSendModalData.operatorName} ({operatorSendModalData.operatorEmail})</p>
              </div>
              <button onClick={() => setOperatorSendModalData(null)} className="p-2 text-gray-300 hover:text-red-500"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-4 overflow-y-auto">
              <input
                type="text"
                value={operatorSendModalData.subject}
                onChange={e => setOperatorSendModalData(prev => prev ? { ...prev, subject: e.target.value } : prev)}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-brand-gold"
              />
              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={e => {
                  // e.currentTarget може да е null, ако blur-ът стреля точно в момента, в който елементът се демонтира
                  // (напр. клик върху X бутона за затваряне, която сваля модала в един и същи render цикъл) —
                  // без тази проверка гръмва с "Cannot read properties of null".
                  const html = e.currentTarget?.innerHTML;
                  if (html === undefined) return;
                  setOperatorSendModalData(prev => prev ? { ...prev, message: html } : prev);
                }}
                dangerouslySetInnerHTML={{ __html: operatorSendModalData.message }}
                className="w-full min-h-[240px] p-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:bg-white focus:border-brand-gold leading-relaxed"
              />
              <p className="text-[10px] text-gray-400">Можеш да редактираш текста директно тук преди изпращане.</p>
              <button
                onClick={handleSendToOperator}
                disabled={isSaving}
                className="w-full bg-brand-dark text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? 'Изпращане...' : <><Send size={16}/> Изпрати на турооператора</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
