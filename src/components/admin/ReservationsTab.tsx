"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, getDoc, updateDoc, doc, deleteDoc, where, addDoc, serverTimestamp } from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import {
  Search, Trash2, Calendar, Phone, Mail, Edit, X, FileText, CheckCircle, AlertTriangle,
  DollarSign, Tag, Link2, Users, Send, Copy, Clock, MessageSquare, Percent, Building2, RefreshCw
} from 'lucide-react';

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

  // Под-табове: "Запитване" (преди попълнени checkout данни) и "Резервации" (клиентът вече е попълнил данните си).
  const [subTab, setSubTab] = useState<'inquiry' | 'reservations'>('inquiry');

  const [editingInq, setEditingInq] = useState<any>(null);
  const [editForm, setEditForm] = useState({ tourId: '', tourTitle: '', tourDate: '', notes: '', clientEmail: '' });
  const [paymentModalData, setPaymentModalData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [viewingTravelers, setViewingTravelers] = useState<{ inquiry: any; travelers: any[] | null } | null>(null);

  // Модал за писане/изпращане на имейл (кореспонденция) — журнал, не двупосочна нишка.
  const [emailModalData, setEmailModalData] = useState<{ inquiry: any; subject: string; body: string } | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Модал за преглед на журнала с изпратени имейли за конкретно запитване.
  const [viewingEmailLog, setViewingEmailLog] = useState<any | null>(null);

  // Списъкът с турооператори (име+имейл) — за да знаем къде да изпратим данните на пътниците.
  const [operators, setOperators] = useState<{ name: string; email: string }[]>([]);
  useEffect(() => {
    getDoc(doc(db, "settings", "operators")).then(snap => {
      if (snap.exists() && Array.isArray(snap.data().list)) {
        const raw = snap.data().list;
        setOperators(raw.map((o: any) => typeof o === 'string' ? { name: o, email: '' } : o));
      }
    }).catch(() => {});
  }, []);

  // Избрани запитвания (в Резервации таба) за групово изпращане на турооператора.
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

  // Търсене + разделяне по под-табове. Търсенето работи в рамките на текущия под-таб.
  const searchFiltered = inquiries.filter(inq => {
    const term = searchQuery.toLowerCase();
    return (
      inq.clientName?.toLowerCase().includes(term) ||
      inq.clientEmail?.toLowerCase().includes(term) ||
      inq.clientPhone?.includes(term) ||
      inq.tourTitle?.toLowerCase().includes(term) ||
      inq.notes?.toLowerCase().includes(term) ||
      inq.message?.toLowerCase().includes(term)
    );
  });
  // "Запитване" — всичко, за което клиентът ОЩЕ не е попълнил checkout данните си.
  const inquiryTabItems = searchFiltered.filter(i => !i.checkoutCompletedAt);
  // "Резервации" — клиентът вече е попълнил данните си (готово за преглед/потвърждение на плащане).
  const reservationsTabItems = searchFiltered.filter(i => i.checkoutCompletedAt);

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
    const regularPrice = parsePrice(tour?.discountPrice || tour?.price);
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
        alert('„Платено“ се отбелязва от подтаб „Резервации“, след като клиентът попълни данните си.');
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
          tourPromoPrice: parsePrice(tour?.discountPrice),
          notes: getOwnNotes(inq)
        });
      } catch (error) {
        console.error("Грешка:", error);
      }
    } else {
      try {
        await updateDoc(doc(db, "inquiries", inq.id), { status: newStatus });
        setInquiries(prev => prev.map(item => item.id === inq.id ? { ...item, status: newStatus } : item));
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
      await updateDoc(doc(db, "inquiries", inquiry.id), { status: 'paid', notes });
      setInquiries(prev => prev.map(item => item.id === inquiry.id ? { ...item, status: 'paid', notes } : item));

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

    if (confirm(confirmMessage)) {
      try {
        await deleteDoc(doc(db, "inquiries", id));
        setInquiries(prev => prev.filter(i => i.id !== id));
      } catch (error) { console.error(error); }
    }
  };

  // Генерира сигурен токен и го записва — вече с 14 дни валидност (преди 7), плюс избор как да стигне
  // до клиента: директно по имейл (изисква EmailJS template) или копиране за ръчно пращане (Viber и др.).
  const handleGenerateCheckoutLink = async (inq: any, method: 'email' | 'copy') => {
    const token = crypto.randomUUID();
    const expiryMs = Date.now() + 14 * 24 * 60 * 60 * 1000; // 14 дни

    try {
      await updateDoc(doc(db, "inquiries", inq.id), {
        checkoutToken: token,
        checkoutTokenExpiry: expiryMs,
        checkoutCompletedAt: null,
      });

      const link = `${window.location.origin}/checkout/${token}`;
      const subject = 'Относно вашето запитване';
      const body = `Здравейте ${inq.clientName || ''},\n\nЗа да завършим резервацията Ви за "${inq.tourTitle}", моля попълнете данните на пътниците на следния линк:\n\n${link}\n\nЛинкът е валиден 14 дни.\n`;

      let updatedInq = { ...inq, checkoutToken: token, checkoutTokenExpiry: expiryMs, checkoutCompletedAt: null };

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

        const logEntry = { subject, body, sentAt: new Date().toISOString() };
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
      await updateDoc(doc(db, "inquiries", inq.id), {
        checkoutToken: token,
        checkoutTokenExpiry: expiryMs,
        checkoutReopened: true,
      });
      const updatedInq = { ...inq, checkoutToken: token, checkoutTokenExpiry: expiryMs, checkoutReopened: true };
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
        subject: 'Корекция на данните за вашата резервация',
        body: `Здравейте ${inq.clientName || ''},\n\nПри проверка на данните за "${inq.tourTitle}" се оказа, че е нужно да ги попълните отново (например поради неточност или нечетлива снимка на паспорта).\n\nМоля, попълнете ги през този линк:\n${link}\n\nЛинкът е валиден 14 дни.\n\nБлагодарим Ви!\nBeliva VIP Tour`,
      });
    } catch (error) {
      console.error('Грешка при линк за корекция:', error);
      alert('Грешка при генериране на линка за корекция.');
    }
  };

  const handleViewTravelers = async (inq: any) => {
    setViewingTravelers({ inquiry: inq, travelers: null });
    try {
      const res = await fetch('/api/admin/decrypt-travelers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ travelers: inq.travelers || [] })
      });
      const data = await res.json();
      if (data.success) {
        setViewingTravelers({ inquiry: inq, travelers: data.travelers });
      } else {
        alert(data.error || 'Грешка при извличане на данните.');
        setViewingTravelers(null);
      }
    } catch (error) {
      console.error("Грешка при декриптиране:", error);
      alert('Грешка при връзка със сървъра.');
      setViewingTravelers(null);
    }
  };

  // Изпраща свободен имейл (кореспонденция) към клиента и го добавя в журнала на запитването —
  // еднопосочно, само това, което НИЕ сме изпратили, не отговорите на клиента.
  const handleSendCorrespondence = async () => {
    if (!emailModalData) return;
    if (!emailModalData.inquiry.clientEmail) {
      alert('Този клиент няма въведен имейл.');
      return;
    }
    setIsSendingEmail(true);
    try {
      await emailjs.send(SERVICE_ID, CLIENT_TEMPLATE_ID, {
        to_email: emailModalData.inquiry.clientEmail,
        subject: emailModalData.subject,
        preheader: derivePreheader(emailModalData.body),
        // Същията причина като при checkout линка по-горе — виж коментара там.
        message: emailModalData.body.replace(/\n/g, '<br>'),
      }, PUBLIC_KEY);

      const logEntry = { subject: emailModalData.subject, body: emailModalData.body, sentAt: new Date().toISOString() };
      const updatedLog = [...(emailModalData.inquiry.emailLog || []), logEntry];
      await updateDoc(doc(db, "inquiries", emailModalData.inquiry.id), { emailLog: updatedLog });
      setInquiries(prev => prev.map(item => item.id === emailModalData.inquiry.id ? { ...item, emailLog: updatedLog } : item));

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

      const sentAt = new Date().toISOString();
      for (const inq of operatorSendModalData.inquiries) {
        await updateDoc(doc(db, "inquiries", inq.id), {
          operatorDataSentAt: sentAt,
          operatorViewToken: operatorSendModalData.token,
          operatorViewTokenExpiry: operatorSendModalData.expiryMs,
        });
      }
      setInquiries(prev => prev.map(item =>
        operatorSendModalData.inquiries.some(i => i.id === item.id)
          ? { ...item, operatorDataSentAt: sentAt, operatorViewToken: operatorSendModalData.token, operatorViewTokenExpiry: operatorSendModalData.expiryMs }
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

  // Прост ръчен превключвател — договорът се генерира и изпраща от турооператора извън системата —
  // тук само маркираме в CRM-а че статусът е актуален.
  const handleToggleContractSent = async (inq: any) => {
    const newValue = inq.contractSentAt ? null : new Date().toISOString();
    try {
      await updateDoc(doc(db, "inquiries", inq.id), { contractSentAt: newValue });
      setInquiries(prev => prev.map(item => item.id === inq.id ? { ...item, contractSentAt: newValue } : item));
    } catch (e) { console.error(e); }
  };

  // Извлича кратък превю текст (за известията/inbox списъка) от свободен текст — махаме нови
  // редове/излишни интервали и съкращаваме до ~95 символа — сладката точка за болшинството клиенти.
  const derivePreheader = (text: string, maxLen = 95) => {
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length > maxLen ? clean.slice(0, maxLen - 1) + '…' : clean;
  };

  const openEditModal = (inq: any) => {
    setEditingInq(inq);
    setEditForm({
      tourId: inq.tourId || '',
      tourTitle: inq.tourTitle || '',
      tourDate: inq.tourDate || 'Не е потвърдена',
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
    const payload = { ...editForm, clientEmail };
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "inquiries", editingInq.id), payload);
      setInquiries(prev => prev.map(item => item.id === editingInq.id ? { ...item, ...payload } : item));
      setEditingInq(null);
    } catch (error) { console.error(error); } finally { setIsSaving(false); }
  };

  const statusColors: any = {
    new: 'bg-blue-100 text-blue-700',
    processing: 'bg-yellow-100 text-yellow-700',
    paid: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700'
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500 font-medium">Зареждане на запитвания...</div>;

  const activeItems = subTab === 'inquiry' ? inquiryTabItems : reservationsTabItems;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ПОД-ТАБОВЕ */}
      <div className="flex gap-2 bg-white rounded-2xl p-2 shadow-sm border border-gray-100 w-fit">
        <button
          onClick={() => setSubTab('inquiry')}
          className={`px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${subTab === 'inquiry' ? 'bg-brand-gold text-brand-dark shadow-lg' : 'text-gray-400 hover:text-brand-dark hover:bg-gray-50'}`}
        >
          Запитване ({inquiryTabItems.length})
        </button>
        <button
          onClick={() => setSubTab('reservations')}
          className={`px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${subTab === 'reservations' ? 'bg-brand-gold text-brand-dark shadow-lg' : 'text-gray-400 hover:text-brand-dark hover:bg-gray-50'}`}
        >
          Резервации ({reservationsTabItems.length})
        </button>
      </div>

      {/* HEADER: Търсачка */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Търси по име, телефон или бележки..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-gold/20 outline-none font-medium"
          />
        </div>
      </div>

      {/* BULK АКЦИЯ БАР — видим само в Резервации, когато има избрани */}
      {subTab === 'reservations' && selectedForOperator.size > 0 && (
        <div className="bg-brand-dark text-white p-5 rounded-2xl flex items-center justify-between animate-in fade-in">
          <span className="text-sm font-bold">{selectedForOperator.size} избрани</span>
          <div className="flex gap-3">
            <button
              onClick={() => handleOpenOperatorSend(reservationsTabItems.filter(i => selectedForOperator.has(i.id)))}
              className="bg-brand-gold text-brand-dark px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-white transition-all"
            >
              Изпрати на турооператора
            </button>
            <button onClick={() => setSelectedForOperator(new Set())} className="text-white/60 hover:text-white text-xs font-bold">Откажи</button>
          </div>
        </div>
      )}

      {/* ТАБЛИЦА */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {subTab === 'reservations' && (
                  <th className="p-5 w-10">
                    <input
                      type="checkbox"
                      checked={reservationsTabItems.length > 0 && selectedForOperator.size === reservationsTabItems.length}
                      onChange={(e) => setSelectedForOperator(e.target.checked ? new Set(reservationsTabItems.map(i => i.id)) : new Set())}
                    />
                  </th>
                )}
                <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-widest">Клиент & Контакти</th>
                <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-widest">Запитване & Цена</th>
                <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-widest">Бележки</th>
                <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-widest">Статус</th>
                <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-widest text-right">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activeItems.length === 0 && (
                <tr><td colSpan={subTab === 'reservations' ? 6 : 5} className="p-10 text-center text-gray-400 italic">
                  {subTab === 'inquiry' ? 'Няма активни запитвания.' : 'Все още никой не е попълнил checkout данните си.'}
                </td></tr>
              )}
              {activeItems.map(inq => {
                const { matchedCustomer, otherInquiries } = getContactContext(inq);
                const { hasDiscount, regularPrice, finalPrice, discountPercentage } = getDiscountInfo(inq);
                return (
                  <tr key={inq.id} className="hover:bg-gray-50/50 transition-colors">
                    {subTab === 'reservations' && (
                      <td className="p-5">
                        <input
                          type="checkbox"
                          checked={selectedForOperator.has(inq.id)}
                          onChange={(e) => {
                            const next = new Set(selectedForOperator);
                            if (e.target.checked) next.add(inq.id); else next.delete(inq.id);
                            setSelectedForOperator(next);
                          }}
                        />
                      </td>
                    )}
                    <td className="p-5">
                      <div className="font-bold text-gray-800">{inq.clientName || 'Непознат'}</div>
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Phone size={12}/> {inq.clientPhone}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-1"><Mail size={12}/> {inq.clientEmail}</div>
                      {matchedCustomer && (
                        <div className="mt-2 inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-lg">
                          🔁 Връщащ се клиент · {matchedCustomer.tripHistory?.length || matchedCustomer.tripsCount || 0} пътувания
                        </div>
                      )}
                      {otherInquiries.length > 0 && (
                        <div className="mt-1 inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-lg">
                          ⚠️ {otherInquiries.length} друг{otherInquiries.length > 1 ? 'и' : 'о'} активн{otherInquiries.length > 1 ? 'и' : 'о'} запитван{otherInquiries.length > 1 ? 'ия' : 'е'}
                        </div>
                      )}
                      {inq.checkoutReopened ? (
                        <div className="mt-1 inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-lg">
                          ⏳ Чака корекция от клиента
                        </div>
                      ) : inq.checkoutRevisions > 0 ? (
                        <div className="mt-1 inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-lg">
                          ✏️ Данните са коригирани от клиента
                        </div>
                      ) : null}
                      {inq.emailLog && inq.emailLog.length > 0 && (
                        <button
                          onClick={() => setViewingEmailLog(inq)}
                          className="mt-1 flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-brand-gold transition-colors"
                        >
                          <MessageSquare size={11} /> {inq.emailLog.length} изпратен{inq.emailLog.length > 1 ? 'и' : ''} имейл{inq.emailLog.length > 1 ? 'а' : ''}
                        </button>
                      )}
                    </td>
                    <td className="p-5">
                      <span className="font-bold text-sm text-brand-dark block">{inq.tourTitle || 'Общо запитване'}</span>
                      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mt-1 mb-2">
                        <Calendar size={14} className="text-brand-gold" />
                        {inq.tourDate || 'Не е уточнена'}
                      </div>
                      {/* Цена с отразена лична отстъпка на клиента, ако има такава — видимо тук, не чак при плащане. */}
                      {regularPrice > 0 && (
                        <div className="flex items-center gap-2 text-xs mb-2">
                          {hasDiscount ? (
                            <>
                              <span className="text-gray-400 line-through">{regularPrice} €</span>
                              <span className="text-emerald-600 font-black">{finalPrice} €</span>
                              <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5"><Percent size={9}/>{discountPercentage}</span>
                            </>
                          ) : (
                            <span className="text-gray-500 font-bold">{regularPrice} €</span>
                          )}
                        </div>
                      )}
                      {inq.message && (
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mt-2 max-w-xs">
                          <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest block mb-1">Съобщение:</span>
                          <p className="text-xs text-gray-600 italic line-clamp-3">{inq.message}</p>
                        </div>
                      )}
                    </td>
                    <td className="p-5">
                      {getOwnNotes(inq) ? (
                        <p className="text-xs text-gray-500 line-clamp-3 bg-yellow-50/50 p-3 rounded-xl border border-yellow-100 max-w-xs">
                          {getOwnNotes(inq)}
                        </p>
                      ) : (
                        <span className="text-xs text-gray-300 italic">Няма въведени бележки</span>
                      )}
                    </td>
                    <td className="p-5">
                      <select
                        value={inq.status || 'new'}
                        onChange={(e) => handleStatusChangeClick(inq, e.target.value)}
                        className={`text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-2.5 border-none outline-none cursor-pointer shadow-sm transition-all ${statusColors[inq.status] || statusColors.new}`}
                      >
                        <option value="new">🆕 Ново</option>
                        <option value="processing">⚙️ В процес</option>
                        {(subTab === 'reservations' || inq.status === 'paid') && <option value="paid">✅ Платено</option>}
                        <option value="cancelled">❌ Отказано</option>
                      </select>
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex justify-end gap-2">
                        {subTab === 'reservations' && inq.status === 'paid' && (
                          <button
                            onClick={() => handleOpenOperatorSend([inq])}
                            title={inq.operatorDataSentAt ? `Данните са изпратени на ${new Date(inq.operatorDataSentAt).toLocaleDateString('bg-BG')} — натисни за повторно изпращане` : "Изпрати данните на турооператора"}
                            className={`p-2.5 rounded-xl transition-all ${inq.operatorDataSentAt ? 'text-emerald-500 hover:text-white hover:bg-emerald-500' : 'text-blue-400 hover:text-white hover:bg-blue-500'}`}
                          >
                            <Building2 size={18} />
                          </button>
                        )}
                        {subTab === 'reservations' && inq.status === 'paid' && (
                          <button
                            onClick={() => handleToggleContractSent(inq)}
                            title={inq.contractSentAt ? `Договор изпратен на ${new Date(inq.contractSentAt).toLocaleDateString('bg-BG')} — натисни за да върнеш статуса` : "Маркирай договор изпратен"}
                            className={`p-2.5 rounded-xl transition-all ${inq.contractSentAt ? 'text-emerald-500 hover:text-white hover:bg-emerald-500' : 'text-gray-300 hover:text-white hover:bg-gray-400'}`}
                          >
                            <FileText size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => setEmailModalData({ inquiry: inq, subject: 'Относно вашето запитване', body: '' })}
                          title="Изпрати имейл (кореспонденция)"
                          className="p-2.5 text-purple-400 hover:text-white hover:bg-purple-500 rounded-xl transition-all"
                        >
                          <Send size={18} />
                        </button>
                        {subTab === 'reservations' && inq.checkoutCompletedAt && inq.status !== 'cancelled' && (
                          <>
                            <button
                              onClick={() => handleRequestCorrection(inq, 'email')}
                              title="Поискай корекция на данните — нов линк по имейл (резервацията остава тук)"
                              className="p-2.5 text-amber-500 hover:text-white hover:bg-amber-500 rounded-xl transition-all"
                            >
                              <RefreshCw size={18} />
                            </button>
                            <button
                              onClick={() => handleRequestCorrection(inq, 'copy')}
                              title="Копирай линк за корекция на данните (за Viber/WhatsApp)"
                              className="p-2.5 text-gray-400 hover:text-white hover:bg-gray-500 rounded-xl transition-all"
                            >
                              <Copy size={18} />
                            </button>
                          </>
                        )}
                        {inq.checkoutCompletedAt && (
                          <button
                            onClick={() => handleViewTravelers(inq)}
                            title="Виж данните на пътниците"
                            className="p-2.5 text-emerald-500 hover:text-white hover:bg-emerald-500 rounded-xl transition-all"
                          >
                            <Users size={18} />
                          </button>
                        )}
                        {/* Линкът за данни е само за „Запитване“. В „Резервации“ клиентът вече е попълнил данните си, а нов линк ги нулира (checkoutCompletedAt) и връща резервацията обратно. */}
                        {!inq.checkoutCompletedAt && inq.tourId && inq.tourDate && inq.tourDate !== 'Не е потвърдена' && inq.status !== 'paid' && inq.status !== 'cancelled' && (
                          <>
                            <button
                              onClick={() => handleGenerateCheckoutLink(inq, 'email')}
                              title="Изпрати линк за данни по имейл"
                              className="p-2.5 text-brand-gold hover:text-white hover:bg-brand-gold rounded-xl transition-all"
                            >
                              <Link2 size={18} />
                            </button>
                            <button
                              onClick={() => handleGenerateCheckoutLink(inq, 'copy')}
                              title="Копирай линка (за Viber/WhatsApp)"
                              className="p-2.5 text-gray-400 hover:text-white hover:bg-gray-500 rounded-xl transition-all"
                            >
                              <Copy size={18} />
                            </button>
                          </>
                        )}
                        <button onClick={() => openEditModal(inq)} className="p-2.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit size={18} /></button>
                        <button onClick={() => handleDelete(inq.id)} className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* МОДАЛ: РЕДАКЦИЯ НА ЗАПИТВАНЕ */}
      {editingInq && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-dark/90 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-serif italic text-xl text-brand-dark">Редактиране на запитване</h3>
              <button onClick={() => setEditingInq(null)} className="p-2 text-gray-300 hover:text-red-500"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
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
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2 mb-2 block">Екскурзия</label>
                <select
                  value={editForm.tourId}
                  onChange={e => {
                    const t = allTours.find(x => x.id === e.target.value);
                    setEditForm({...editForm, tourId: e.target.value, tourTitle: t?.title || 'Общо запитване', tourDate: 'Не е потвърдена'});
                  }}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium outline-none focus:bg-white focus:border-brand-gold"
                >
                  <option value="">-- Общо запитване --</option>
                  {allTours.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2 mb-2 block">Дата на пътуване</label>
                {editForm.tourId ? (
                  <select value={editForm.tourDate} onChange={e => setEditForm({...editForm, tourDate: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium outline-none focus:bg-white focus:border-brand-gold">
                    <option value="Не е потвърдена">Не е потвърдена</option>
                    {allTours.find(t => t.id === editForm.tourId)?.dates?.map((d: any) => {
                      const dateStr = typeof d === 'string' ? d : `${d.startDate} - ${d.endDate}`;
                      return <option key={dateStr} value={dateStr}>{dateStr}</option>;
                    })}
                  </select>
                ) : (
                  <input type="text" value={editForm.tourDate} onChange={e => setEditForm({...editForm, tourDate: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium outline-none" placeholder="напр. Май 2026" />
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

      {/* МОДАЛ: ПРЕГЛЕД НА ПОПЪЛНЕНИ ОТ КЛИЕНТА ДАННИ НА ПЪТНИЦИТЕ */}
      {viewingTravelers && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-brand-dark/90 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 shrink-0">
              <div>
                <h3 className="font-serif italic text-xl text-brand-dark">Данни на пътниците</h3>
                <p className="text-xs text-gray-400 mt-1">{viewingTravelers.inquiry.tourTitle}</p>
              </div>
              <button onClick={() => setViewingTravelers(null)} className="p-2 text-gray-300 hover:text-red-500"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-4 overflow-y-auto">
              {viewingTravelers.travelers === null ? (
                <p className="text-center text-gray-400 py-8">Декриптиране...</p>
              ) : viewingTravelers.travelers.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Клиентът още не е попълнил данни.</p>
              ) : (
                viewingTravelers.travelers.map((t: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Пътник {idx + 1}</p>
                    <p className="font-bold text-brand-dark text-sm mb-2">{t.latinName}</p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div><span className="text-gray-400 block">ЕГН</span><span className="font-mono font-bold text-brand-dark">{t.egn}</span></div>
                      <div><span className="text-gray-400 block">Паспорт</span><span className="font-mono font-bold text-brand-dark">{t.passportNumber}</span></div>
                      <div className="col-span-2"><span className="text-gray-400 block">Валидност на паспорта</span><span className="font-bold text-brand-dark">{t.passportValidity}</span></div>
                      {t.passportPhoto && (
                        <div className="col-span-2">
                          <span className="text-gray-400 block mb-1">Снимка на паспорта</span>
                          <a href={`/api/admin/passport-photo?path=${encodeURIComponent(t.passportPhoto)}`} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`/api/admin/passport-photo?path=${encodeURIComponent(t.passportPhoto)}`} alt={`Паспорт на пътник ${idx + 1}`} className="h-32 w-auto rounded-xl border border-gray-200 object-cover" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
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
                <p className="text-xs text-gray-400 mt-1">До: {emailModalData.inquiry.clientEmail || 'няма въведен имейл'}</p>
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

      {/* МОДАЛ: ЖУРНАЛ НА ИЗПРАТЕНИТЕ ИМЕЙЛИ */}
      {viewingEmailLog && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-brand-dark/90 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 shrink-0">
              <div>
                <h3 className="font-serif italic text-xl text-brand-dark">Изпратени имейли</h3>
                <p className="text-xs text-gray-400 mt-1">{viewingEmailLog.clientName}</p>
              </div>
              <button onClick={() => setViewingEmailLog(null)} className="p-2 text-gray-300 hover:text-red-500"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-4 overflow-y-auto">
              {(viewingEmailLog.emailLog || []).slice().reverse().map((entry: any, idx: number) => (
                <div key={idx} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-brand-dark text-sm">{entry.subject}</p>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock size={10}/> {new Date(entry.sentAt).toLocaleString('bg-BG')}</span>
                  </div>
                  <p className="text-xs text-gray-500 whitespace-pre-wrap">{entry.body}</p>
                </div>
              ))}
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
