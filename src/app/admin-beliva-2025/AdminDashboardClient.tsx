"use client";

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { 
  collection, onSnapshot, query, orderBy, deleteDoc, doc, 
  updateDoc, addDoc, serverTimestamp, where, getDocs, setDoc 
} from 'firebase/firestore';
import { 
  LayoutDashboard, Image as ImageIcon, Map, Archive, BookOpen, Star, Inbox, Users, LogOut, 
  Menu, X, Edit2, Copy, Trash2, CheckCircle2, FileText, UserCheck, Search, PhoneIncoming, BadgePercent, Save, Calendar, User, Mail, Phone, Globe, History, Plus, Settings, ChevronRight,
  XCircle, TrendingUp, AlertTriangle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { logoutAction } from '@/app/actions/auth';
import MediaLibrary from '@/components/MediaLibrary'; 
import DashboardCharts from '@/components/DashboardCharts'; 
import TourForm from '@/components/admin/TourForm'; 
import BlogForm from '@/components/admin/BlogForm'; 
import { performAutoMaintenance, slugify, normalizeUrl } from '@/lib/admin-helpers';
import { formatPrice } from '@/lib/formatPrice';
import { IClient } from '@/types';

import ClientsTab from '@/components/admin/ClientsTab';
import ReservationsTab from '@/components/admin/ReservationsTab';
import GroupsTab from '@/components/admin/GroupsTab';
import ClientDetailModal from '@/components/admin/ClientDetailModal';
import SettingsTab from '@/components/admin/SettingsTab';
import MarketingAnalytics from '@/components/admin/MarketingAnalytics';
import CountryMultiSelect from '@/components/admin/CountryMultiSelect';

// Редизайн на Търсачката
const SearchBar = ({ value, onChange, placeholder }: any) => (
  <div className="relative mb-8 group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="text-gray-400 group-focus-within:text-brand-gold transition-colors" size={20} />
      </div>
      <input 
        className="w-full pl-12 pr-4 py-5 rounded-[2rem] border-0 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)] focus:ring-2 focus:ring-brand-gold/20 outline-none text-brand-dark placeholder-gray-400 transition-all font-medium"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
  </div>
);

export default function AdminDashboardClient() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [allTours, setAllTours] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [departures, setDepartures] = useState<any[]>([]);
  // За реалните графики в таблото (приходи/статус/пътници по група) — виж коментара в
  // DashboardCharts.tsx за пълното обяснение защо тези три графики вече не четат bookings/departures.
  const [groups, setGroups] = useState<any[]>([]);

  const [globalSelectedClient, setGlobalSelectedClient] = useState<any>(null);
  // За навигация "Клиенти → Групи" — когато кликнеш пътуване в историята на клиент, трябва да се
  // отвори точно тази група в Групи таба (не просто alert "скоро"). GroupsTab чете това и само
  // отваря съответната група, след което го изчиства обратно на null, за да не се отваря пак при всяко re-render.
  const [pendingGroupOpenId, setPendingGroupOpenId] = useState<string | null>(null);

  const [archivedSubTab, setArchivedSubTab] = useState('drafts'); // 'drafts' или 'archived'
  const [reviewsSubTab, setReviewsSubTab] = useState('auto'); // 'auto' или 'manual'
  const [searchReview, setSearchReview] = useState('');

  const [selectedClient, setSelectedClient] = useState<IClient | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // Търсачка за добавяне на пътуване
  const [tripSearchCountry, setTripSearchCountry] = useState('');
  const [tripSearchMonth, setTripSearchMonth] = useState('');
  
  // За таб "Минали групи"
  const [groupTourId, setGroupTourId] = useState('');
  const [groupDate, setGroupDate] = useState('');

  // За таб "Ревюта"
  const [reviewOperatorFilter, setReviewOperatorFilter] = useState('');
  
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchInquiry, setSearchInquiry] = useState('');
  const [searchTour, setSearchTour] = useState('');
  const [searchBlog, setSearchBlog] = useState('');

  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>({ name: '', startDate: '', endDate: '', label: 'ПРОМОЦИЯ', bgColor: '#dc2626', textColor: '#ffffff', effect: 'none' });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false);
  const [isEditInquiryModalOpen, setIsEditInquiryModalOpen] = useState(false);
  const [isAddTripModalOpen, setIsAddTripModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null); 

  const [manualInquiry, setManualInquiry] = useState({ clientName: '', clientPhone: '', clientEmail: '', tourTitle: '', tourDate: '', tourId: '' });
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', vipDiscount: 0, initialTourId: '', initialTourTitle: '', initialDate: '' });
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [editingInquiry, setEditingInquiry] = useState<any>(null);
  const [selectedCustomerForTrip, setSelectedCustomerForTrip] = useState<any>(null);
  
  const [newTrip, setNewTrip] = useState({ tourId: '', tourTitle: '', date: '', tourOperator: '' });

  const router = useRouter();

  const [autoProcessStatus, setAutoProcessStatus] = useState('');
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [automationCountries, setAutomationCountries] = useState<string[]>([]);
  const [automationCountryInput, setAutomationCountryInput] = useState('');
  const [automationLimit, setAutomationLimit] = useState<number | null>(3); // Ограничава броя турове на пускане; null = без лимит
  // Ако е зададена (ISO формат, напр. "2027-01-01") — турове, чиито всичкки скрейпнати дати са преди тази
  // стойност, се прескачат цялостно (не стигат до AI-format, не се записват). Не влияе на турове без
  // общо никакви скрейпнати дати (те си минават, както и досега — датите се добавят ръчно при одобрение тогава).
  const [automationMinDate, setAutomationMinDate] = useState<string>('');
  // Колко нови тура е намерил последният "Провери за нови" за всяка държава отделно (групирано по
  // countryMatched от data.newLinks) — undefined означава "още не е проверена", не 0.
  const [scoutResults, setScoutResults] = useState<Record<string, number>>({});

  // Зареждаме запазените държави и минималната дата от localStorage при отваряне
  useEffect(() => {
    try {
      const saved = localStorage.getItem('automationCountries');
      if (saved) setAutomationCountries(JSON.parse(saved));
      const savedMinDate = localStorage.getItem('automationMinDate');
      if (savedMinDate) setAutomationMinDate(savedMinDate);
    } catch {}
  }, []);

  // Запазваме при всяка промяна
  useEffect(() => {
    try {
      localStorage.setItem('automationCountries', JSON.stringify(automationCountries));
    } catch {}
  }, [automationCountries]);

  useEffect(() => {
    try {
      localStorage.setItem('automationMinDate', automationMinDate);
    } catch {}
  }, [automationMinDate]);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
        if (user) {
            onSnapshot(query(collection(db, "tours"), orderBy("createdAt", "desc")), (snap) => {
                const fetchedTours = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setAllTours(fetchedTours);
            
                const today = new Date().toISOString().split('T')[0];

                fetchedTours.forEach(async (tour: any) => {
                    let allDates = [...(tour.dates || [])];
                    if (tour.date && !allDates.includes(tour.date)) allDates.push(tour.date);

                    // 1. ЗАПАЗВАМЕ ВСИЧКИ ДАТИ В ИСТОРИЯТА (за да можеш да ги избираш винаги)
                    let historical = [...(tour.historicalDates || [])];
                    allDates.forEach(d => { if (!historical.includes(d)) historical.push(d); });
                
                    if (tour.status === 'public') {
                        if (allDates.length > 0) {
                            const futureDates = allDates.filter((dateStr: string) => {
                                const parts = dateStr.split('-');
                                const normDate = parts[0].length === 2 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dateStr;
                                return normDate >= today;
                            });
                        
                            if (futureDates.length !== allDates.length) {
                                if (futureDates.length === 0) {
                                    // Архивираме публичните дати, НО пазим историческите
                                    await updateDoc(doc(db, "tours", tour.id), { status: 'archived', dates: [], date: '', historicalDates: historical });
                                } else {
                                    futureDates.sort((a, b) => {
                                        const nA = a.split('-')[0].length === 2 ? a.split('-').reverse().join('-') : a;
                                        const nB = b.split('-')[0].length === 2 ? b.split('-').reverse().join('-') : b;
                                        return nA.localeCompare(nB);
                                    });
                                    await updateDoc(doc(db, "tours", tour.id), { dates: futureDates, date: futureDates[0], historicalDates: historical });
                                }
                            } else if (historical.length !== (tour.historicalDates?.length || 0)) {
                                // Ако има нови дати за историята, но няма за триене
                                await updateDoc(doc(db, "tours", tour.id), { historicalDates: historical });
                            }
                        }
                    }
                });
            });
            const silent = (name: string) => (err: any) => console.warn(`[${name}] snapshot denied:`, err.code);
            onSnapshot(query(collection(db, "reviews"),     orderBy("createdAt", "desc")), (snap) => setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() }))),     silent("reviews"));
            onSnapshot(query(collection(db, "posts"),       orderBy("createdAt", "desc")), (snap) => setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))),        silent("posts"));
            onSnapshot(query(collection(db, "inquiries"),   orderBy("createdAt", "desc")), (snap) => setInquiries(snap.docs.map(d => ({ id: d.id, ...d.data() }))),    silent("inquiries"));
            onSnapshot(query(collection(db, "subscribers"), orderBy("createdAt", "desc")), (snap) => setSubscribers(snap.docs.map(d => ({ id: d.id, ...d.data() }))),  silent("subscribers"));
            onSnapshot(query(collection(db, "customers"),   orderBy("createdAt", "desc")), (snap) => setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() }))),    silent("customers"));
            onSnapshot(query(collection(db, "campaigns")),                                 (snap) => setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() }))),    silent("campaigns"));
            onSnapshot(query(collection(db, "bookings"),    orderBy("createdAt", "desc")), (snap) => setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() }))),     silent("bookings"));
            onSnapshot(query(collection(db, "departures")),                                (snap) => setDepartures(snap.docs.map(d => ({ id: d.id, ...d.data() }))),   silent("departures"));
            onSnapshot(query(collection(db, "groups")),                                     (snap) => setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }))),       silent("groups"));
            setLoading(false);
        }
    });
    return () => unsubAuth();
  }, []);

  // --- ACTIONS ---

  // 👈 ФИКСИРАНО: Добавена функция за копиране на екскурзия
  const handleCopyTour = async (tour: any) => {
    try {
        const { id, ...tourData } = tour;
        await addDoc(collection(db, "tours"), {
            ...tourData,
            title: `${tourData.title} (Копие)`,
            status: 'draft',
            createdAt: serverTimestamp()
        });
        alert("Екскурзията е копирана успешно в чернови!");
    } catch (e) {
        console.error("Грешка при копиране:", e);
    }
  };

  const handleStatusUpdate = async (inq: any, newStatus: string) => {
    try {
        // 1. Обновяваме статуса на запитването
        await updateDoc(doc(db, "inquiries", inq.id), { status: newStatus });
        
        // 2. Логика при статус 'paid'
        if (newStatus === 'paid') {
            const customersRef = collection(db, "customers");
            let existingCustomer: any = null;
            let existingCustomerId = null;

            // А) Търсим първо по ИМЕЙЛ (по-точен идентификатор)
            if (inq.clientEmail) {
                const qEmail = query(customersRef, where("email", "==", inq.clientEmail));
                const snapEmail = await getDocs(qEmail);
                if (!snapEmail.empty) {
                    existingCustomerId = snapEmail.docs[0].id;
                    existingCustomer = snapEmail.docs[0].data();
                }
            }

            // Б) Ако не намерим по имейл, търсим по ТЕЛЕФОН
            if (!existingCustomer && inq.clientPhone) {
                const qPhone = query(customersRef, where("phone", "==", inq.clientPhone));
                const snapPhone = await getDocs(qPhone);
                if (!snapPhone.empty) {
                    existingCustomerId = snapPhone.docs[0].id;
                    existingCustomer = snapPhone.docs[0].data();
                }
            }

            // Подготвяме данните за пътуването (твоята логика)
            const originalTour = allTours.find(t => t.id === inq.tourId);
            const tourOperator = originalTour?.operator || "Неизвестен";
            const tripData = {
                tourTitle: inq.tourTitle || "Екскурзия",
                date: inq.tourDate || "Не е избрана",
                tourOperator: tourOperator,
                addedAt: new Date().toISOString(),
                feedbackStatus: 'pending'
            };

            // В) АКО ИМА ТАКЪВ КЛИЕНТ -> ПИТАМЕ АДМИНА
            if (existingCustomer) {
                const confirmMatch = window.confirm(
                    `ВНИМАНИЕ: Открихме съществуващ клиент!\n\n` +
                    `Име: ${existingCustomer.name || existingCustomer.firstName + ' ' + existingCustomer.lastName}\n` +
                    `Имейл: ${existingCustomer.email}\n` +
                    `Телефон: ${existingCustomer.phone}\n\n` +
                    `Това същият човек ли е? Да добавя ли пътуването към неговия профил?\n` +
                    `(Ако избереш "Отказ", ще бъде създаден нов клиентски профил)`
                );

                if (confirmMatch) {
                    // Админът потвърди -> Обновяваме стария клиент
                    await updateDoc(doc(db, "customers", existingCustomerId as string), {
                        tripHistory: [...(existingCustomer.tripHistory || []), tripData],
                        totalTrips: (existingCustomer.totalTrips ?? 0) + 1,
                        updatedAt: serverTimestamp()
                    });
                    alert(`Пътуването беше добавено към профила на ${existingCustomer.name || 'клиента'}!`);
                    return; // ПРЕКРАТЯВАМЕ, за да не създаваме нов
                }
            }

            // Г) АКО НЯМА ТАКЪВ КЛИЕНТ (или Админът цъкна "Отказ") -> СЪЗДАВАМЕ НОВ
            
            // Разделяне на името на firstName и lastName за новия картон
            const nameParts = inq.clientName ? inq.clientName.split(' ') : [];
            const firstName = nameParts[0] || 'Неизвестно';
            const lastName = nameParts.slice(1).join(' ') || '';

            await addDoc(customersRef, {
                // Запазваме и старите полета за съвместимост с твоя код, и новите за CRM картона
                name: inq.clientName || '',
                firstName: firstName,
                lastName: lastName,
                email: inq.clientEmail || "",
                phone: inq.clientPhone || "",
                totalTrips: 1, // старото поле
                tripsCount: 1, // новото поле
                tripHistory: [tripData],
                vipDiscount: 0,
                discountFlag: false,
                createdAt: serverTimestamp()
            });
            
            alert('Успешно създаден нов клиентски профил за тази резервация!');
        }
    } catch (e) { 
        console.error("Грешка при промяна на статус:", e); 
        alert("Възникна грешка при обновяване на статуса.");
    }
  };

  const handleUpdateInquiry = async (e: React.FormEvent) => { e.preventDefault(); await updateDoc(doc(db, "inquiries", editingInquiry.id), editingInquiry); setIsEditInquiryModalOpen(false); };
  const handleUpdateCustomer = async (e: React.FormEvent) => { e.preventDefault(); await updateDoc(doc(db, "customers", editingCustomer.id), editingCustomer); setIsEditCustomerModalOpen(false); };
  const handleAddManualTrip = async (e: React.FormEvent) => {
      e.preventDefault();
      const tripId = Date.now().toString(); // Уникално ID на самото пътуване
      const updatedHistory = [...(selectedCustomerForTrip.tripHistory || []), { 
          ...newTrip, 
          tripId: tripId, 
          addedAt: new Date().toISOString(),
          feedbackStatus: 'pending' // Статус на ревюто
      }];
      await updateDoc(doc(db, "customers", selectedCustomerForTrip.id), { tripHistory: updatedHistory, totalTrips: updatedHistory.length });
      setIsAddTripModalOpen(false); 
      setNewTrip({ tourId: '', tourTitle: '', date: '', tourOperator: '' });
  };
  const handleSaveManualInquiry = async (e: React.FormEvent) => { e.preventDefault(); await addDoc(collection(db, "inquiries"), { ...manualInquiry, status: 'new', createdAt: serverTimestamp() }); setIsManualModalOpen(false); };
  const handleSaveNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const history = [];
    if (newCustomer.initialTourTitle) history.push({ tourTitle: newCustomer.initialTourTitle, date: newCustomer.initialDate || "Не е избрана", addedAt: new Date().toISOString() });
    await addDoc(collection(db, "customers"), { name: newCustomer.name, phone: newCustomer.phone, email: newCustomer.email, vipDiscount: newCustomer.vipDiscount, totalTrips: history.length, tripHistory: history, createdAt: serverTimestamp() });
    setIsAddCustomerModalOpen(false); setNewCustomer({ name: '', phone: '', email: '', vipDiscount: 0, initialTourId: '', initialTourTitle: '', initialDate: '' });
  };

  const handleLogout = async () => { await signOut(auth); await logoutAction(); router.push('/'); };
  const openModal = (item: any = null) => { setEditingItem(item); setIsModalOpen(true); };

  // Модално показва избор при триене на тур, който има оригинален линк (дошъл от автоматизацията) —
  // постоянно (блокира линка завинаги) или за повторно скейпване (само трие документа, без блокиране,
  // така че следващото сканиране да го намери пак и AI-format-не от нула). Турове без оригинален
  // линк (ръчно създадени) нямат тази дилема — трият се просто, както досега.
  const [deleteChoiceTour, setDeleteChoiceTour] = useState<any>(null);

  const handleDeleteTourClick = (tour: any) => {
    const url = tour.originalUrl || tour.externalSourceLink;
    if (url) {
      setDeleteChoiceTour(tour);
    } else if (confirm('Изтриване завинаги?')) {
      deleteDoc(doc(db, "tours", tour.id));
    }
  };

  const handleDeletePermanently = async (tour: any) => {
    try {
      const url = tour.originalUrl || tour.externalSourceLink;
      if (url) {
        const normalized = normalizeUrl(url);
        await setDoc(doc(db, "ignoredTourUrls", encodeURIComponent(normalized)), {
          url,
          rejectedTitle: tour.title || '',
          rejectedAt: serverTimestamp()
        });
      }
      await deleteDoc(doc(db, "tours", tour.id));
    } catch (e) {
      console.error("Грешка при постоянно триене:", e);
      alert("Грешка при изтриване.");
    } finally {
      setDeleteChoiceTour(null);
    }
  };

  const handleDeleteForRescrape = async (tour: any) => {
    try {
      // Само трием документа — НЕ добавяме в ignoredTourUrls, за да може следващото сканиране да го намери пак.
      await deleteDoc(doc(db, "tours", tour.id));
    } catch (e) {
      console.error("Грешка при триене за повторно скейпване:", e);
      alert("Грешка при изтриване.");
    } finally {
      setDeleteChoiceTour(null);
    }
  };

  // Отваря групата, към която принадлежи дадено пътуване (от tripHistory на клиент) — вика се от ClientDetailModal.
  // Съвпада със същата (tourId + date) query, която ReservationsTab.tsx ползва за да намери/създаде групата,
  // така че да съвпада точно с правилната група, не просто първата със този tourId (ако турът е тръгвал няколко пъти).
  const handleOpenGroup = (tourId: string, date?: string) => {
    const match = groups.find(g => g.tourId === tourId && (!date || g.startDate === date));
    if (!match) {
      alert('Не намерихме група за това пътуване — възможно е била създадена преди въвеждането на тази функционалност.');
      return;
    }
    setActiveTab('groups');
    setPendingGroupOpenId(match.id);
  };

  // Филтри
  const filteredCustomers = customers.filter(c => c.name?.toLowerCase().includes(searchCustomer.toLowerCase()) || c.phone?.includes(searchCustomer));
  const filteredInquiries = inquiries.filter(i => i.clientName?.toLowerCase().includes(searchInquiry.toLowerCase()) || i.tourTitle?.toLowerCase().includes(searchInquiry.toLowerCase()));
  const filteredTours = allTours
    .filter((t: any) => t.title?.toLowerCase().includes(searchTour.toLowerCase()))
    .filter((t: any) => {
        if (activeTab === 'tours') return t.status === 'public';
        if (activeTab === 'archived') {
            if (archivedSubTab === 'drafts') return t.status === 'draft';
            if (archivedSubTab === 'archived') return t.status === 'archived';
            if (archivedSubTab === 'pending') return t.status === 'pending';
        }
        return false;
    });

  const stats = {
    activeTours: allTours.filter((t: any) => t.status === 'public').length,
    newInquiries: inquiries.filter((i: any) => i.status === 'new').length,
    totalCustomers: customers.length,
    totalSubscribers: subscribers.length,
  };

  // Брой наши турове по държава (всички статуси — public/pending/archived/draft — това е общото инвентарно
  // бройнико, за да знае Админът дали вече има достатъчно за тази държава, преди да скенира още).
  const ourCountsByCountry = allTours.reduce((acc: Record<string, number>, t: any) => {
    const countries: string[] = Array.isArray(t.country) ? t.country : [t.country].filter(Boolean);
    countries.forEach(c => { if (c) acc[c] = (acc[c] || 0) + 1; });
    return acc;
  }, {});

  const handleSaveCampaign = async (e: React.FormEvent) => {
      e.preventDefault();
      if (editingCampaign.id) {
          // 1. Обновяваме самата кампания
          await updateDoc(doc(db, "campaigns", editingCampaign.id), editingCampaign);
          
          // 2. ⚡ МАГИЯТА: Автоматично обновяваме всички екскурзии, които използват тази кампания!
          const q = query(collection(db, "tours"), where("campaignId", "==", editingCampaign.id));
          const snap = await getDocs(q);
          snap.forEach(async (d) => {
              await updateDoc(doc(db, "tours", d.id), {
                  promoStart: editingCampaign.startDate,
                  promoEnd: editingCampaign.endDate,
                  promoLabel: editingCampaign.label,
                  promoBgColor: editingCampaign.bgColor,
                  promoTextColor: editingCampaign.textColor,
                  promoEffect: editingCampaign.effect
              });
          });
      } else {
          await addDoc(collection(db, "campaigns"), { ...editingCampaign, createdAt: serverTimestamp() });
      }
      setIsCampaignModalOpen(false);
  };

  const inputClass = "w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/5 transition-all text-brand-dark font-medium placeholder:text-gray-300 shadow-sm";
  const labelClass = "text-[10px] font-black uppercase text-gray-400 tracking-[0.15em] ml-2 mb-2 block";

// ==========================================
  // АВТОМАТИЧНА МАШИНА ЗА ЕКСКУРЗИИ
  // ==========================================
  // Помощна функция — извлича препоръчаното изчакване от съобщение за OpenAI rate limit
  // (напр. "Please try again in 17.87s"), в милисекунди + малък буфер за сигурност.
  // Ако не успеем да parse-нем точното число, връщаме разумен fallback от 20 секунди.
  const parseRetryDelayMs = (errorMsg: string): number => {
    const match = errorMsg?.match(/try again in ([\d.]+)s/i);
    if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 1500;
    return 20000;
  };

  // Конвертира дата от различни формати (BG: DD.MM.YYYY, ISO: YYYY-MM-DD) към чист ISO стринг — споделена
  // между ранната проверка за automationMinDate и финалното записване във tourDoc по-долу.
  const toISO = (d: string): string => {
    const s = String(d).trim();
    let m = s.match(/^(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    m = s.match(/^(\d{1,2})[-.\/](\d{1,2})[-.\/](\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return '';
  };

  const runTourAutomation = async () => {
    if (automationCountries.length === 0) {
      alert('Първо добави поне една държава за сканиране.');
      return;
    }
    if (!confirm(`Започваме сканиране на 2mko за: ${automationCountries.join(', ')}. Това може да отнеме няколко минути. Продължаваме ли?`)) return;
    
    setIsAutoProcessing(true);
    setAutoProcessStatus('Разузнавачът търси нови линкове...');

    try {
      // 1. Скаутът търси нови екскурзии в ИЗБРАНИТЕ от теб държави
      const scoutRes = await fetch('/api/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countries: automationCountries })
      });
      const scoutData = await scoutRes.json();

      if (!scoutData.newLinks || scoutData.newLinks.length === 0) {
        setAutoProcessStatus('Няма нови екскурзии за тези държави.');
        setTimeout(() => setAutoProcessStatus(''), 3000);
        setIsAutoProcessing(false);
        return;
      }

      // Ограничаваме броя турове, ако е зададен automationLimit (за безопасен тест)
      const allLinks = scoutData.newLinks;

      // 2. Взимаме всички снимки от библиотеката веднъж, за да не правим заявки за всяка екскурзия
      const mediaSnap = await getDocs(collection(db, "media"));
      const allMedia = mediaSnap.docs.map(doc => doc.data());

      // 3. Обработваме всяка нова екскурзия ЕДНА ПО ЕДНА, докато достигнем automationLimit РЕАЛНО ОБРАБОТЕНИ (минали датовия филтър) турове
      let successCount = 0;
      let attemptedCount = 0; // турове, минали датовия филтър (независимо от успех на AI-format/запис) — това брои към лимита.
      // ФИКС ЗА ДУБЛИРАНИ ID-та: allTours е снимка ОТПРЕДИ старта и НЕ вижда току-що записаните в същия цикъл турове.
      // Затова пазим генерираните в ТОЗИ цикъл ID-та тук и ги броим заедно с тези от базата.
      const generatedIdsThisRun = new Set<string>();
      for (let i = 0; i < allLinks.length; i++) {
        if (automationLimit && attemptedCount >= automationLimit) break;
        const linkObj = allLinks[i];
        setAutoProcessStatus(`Проверка ${i + 1} от ${allLinks.length}: ${linkObj.title}...`);

        try {
          // А) Извличаме суровия текст
          const scrapeRes = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: linkObj.url })
          });
          const scrapedData = await scrapeRes.json();

          // ФИЛТЪР ПО НАЧАЛНА ДАТА: ако Viktor е задал automationMinDate и този тур ИМА скрейпнати дати,
          // но ВСИЧКИ са преди тази стойност — прескачаме този тур цялостно (без AI-format, без запис
          // в базата) — спестява и време, и OpenAI токени за нещо, което ведното ще се отхвърли. Турове
          // БЕЗ общо никакви скрейпнати дати (custom/on-request турове) НЕ се филтрират — няма с какво да ги сравним.
          if (automationMinDate && scrapedData.dates && scrapedData.dates.length > 0) {
            const isoDatesForFilter = scrapedData.dates.map(toISO).filter(Boolean);
            const hasQualifyingDate = isoDatesForFilter.some((d: string) => d >= automationMinDate);
            if (isoDatesForFilter.length > 0 && !hasQualifyingDate) {
              console.log(`[ФИЛТЪР ДАТА] Прескачен "${linkObj.title}" — всичкки дати (${isoDatesForFilter.join(', ')}) са преди ${automationMinDate}`);
              // Важно: този линк НЕ влиза в ignoredTourUrls — прескачаме го САМО за ТОЗИ пусна, ако
              // вдигне добави нови дати на 2mko след януари, следващото сканиране трябва да го намери пак.
              continue;
            }
          }

          // От тук нататък реално обработваме този тур — брои се към automationLimit оттук нататък, независимо от изхода (успех/грешка).
          attemptedCount++;
          setAutoProcessStatus(`Обработка ${attemptedCount}${automationLimit ? `/${automationLimit}` : ''}: ${linkObj.title}...`);

          // Б) Пращаме на GPT-4o за пренаписване — с автоматичен retry, ако ударим на OpenAI rate limit (големи
          // много-дестинационни турове като този могат лесно да изчерпат 30 000 токена/минута в едно
          // единствено извикване). OpenAI само ни казва точно колко да изчакаме в самото съобщение за грешка.
          setAutoProcessStatus(`GPT-4o пише текст за: ${linkObj.countryMatched}...`);
          let aiData: any;
          let aiAttempts = 0;
          const maxAiAttempts = 2; // до 2 повторни опита след първоначалния, при rate limit
          while (true) {
            const aiRes = await fetch('/api/ai-format-tour', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ scrapedData })
            });
            aiData = await aiRes.json();
            if (aiData.success) break;

            const isRateLimit = typeof aiData.error === 'string' && aiData.error.toLowerCase().includes('rate limit');
            if (isRateLimit && aiAttempts < maxAiAttempts) {
              const waitMs = parseRetryDelayMs(aiData.error);
              aiAttempts++;
              setAutoProcessStatus(`OpenAI лимит достигнат — изчакваме ${Math.ceil(waitMs / 1000)}с преди повторен опит (${aiAttempts}/${maxAiAttempts})...`);
              await new Promise(resolve => setTimeout(resolve, waitMs));
              continue;
            }
            // ВАЖНО: преди тук хвърляхме винаги generic "AI грешка" — реалната причина (от aiData.error,
            // връщана от сървъра) се губеше, затова всяка грешка (permission, JSON parse, rate limit...)
            // изглежда еднакво в конзолата, налагайки диагностиката всеки път.
            throw new Error(aiData.error || "AI грешка (няма подробности от сървъра)");
          }

          let finalTour = aiData.tour;

          // ФАЛБЕК: ако AI не върне country (празен масив ␸ли липсва), използваме държавата,
          // която САМИЯТ ти вече избра в панела (linkObj.countryMatched) — това е надежден източник.
          // Без това цялата логика за избор на снимки по-долу се прескача, защото работи с finalTour.country
          if (!finalTour.country || !Array.isArray(finalTour.country) || finalTour.country.length === 0) {
            finalTour.country = linkObj.countryMatched ? [linkObj.countryMatched] : [];
          } else if (linkObj.countryMatched && !finalTour.country.some((c: string) => c.toLowerCase() === linkObj.countryMatched.toLowerCase())) {
            // AI е намерило други/допълнителни държави — добавяме и избраната, ако липсва
            finalTour.country = [linkObj.countryMatched, ...finalTour.country];
          }

          // В) Умният Арт Директор: Избира снимки
          // Правила:
          // - Hero: снимка с име "<Държава> hero" (напр. "Япония hero")
          // - Галерия: 6 СЛУЧАЙНИ снимки; при няколко държави — поравно от всяка;
          //   ако за някоя държава няма снимки, квотата й се прехвърля към държавите със снимки
          // - Ако няма НИКАКВИ снимки — не слагаме нищо (img и gallery остават празни)
          const shuffle = (arr: any[]) => [...arr].sort(() => Math.random() - 0.5);

          let heroImg = '';
          let selectedImages: any[] = [];

          if (finalTour.country && Array.isArray(finalTour.country) && finalTour.country.length > 0) {
            // Винаги проверяваме ПЪРВО избраната в панела държава (linkObj.countryMatched) — тя е най-надеждната,
            // тъй като ти лично я избра в автоматизацията; AI може да е добавило други държави след
            const countrySearchOrder = [
              linkObj.countryMatched,
              ...finalTour.country.filter((c: string) => c?.toLowerCase() !== linkObj.countryMatched?.toLowerCase())
            ].filter(Boolean);

            // 1. HERO: събираме ВСИЧКИ съвпадащи hero снимки за държавата и избираме СЛУЧАЙНА —
            // така различните турове за същата държава получават различни главни снимки
            for (const c of countrySearchOrder) {
              const cLower = c.toLowerCase();
              const heroCandidates = allMedia.filter(m => {
                if (!m.name) return false;
                const n = m.name.toLowerCase();
                return n.includes(cLower) && n.includes('hero');
              });
              if (heroCandidates.length > 0) {
                heroImg = heroCandidates[Math.floor(Math.random() * heroCandidates.length)].url;
                break;
              }
            }

            // 2. ГАЛЕРИЯ: групираме наличните снимки по държава (без hero снимките), също по-гъвкаво съвпадане
            const mediaByCountry: Record<string, any[]> = {};
            countrySearchOrder.forEach((c: string) => {
              const cLower = c.toLowerCase();
              const matched = allMedia.filter(m => {
                if (!m.name) return false;
                const n = m.name.toLowerCase();
                return n.includes(cLower) && !n.includes('hero');
              });
              if (matched.length > 0) mediaByCountry[c] = shuffle(matched);
            });

            const countriesWithImages = Object.keys(mediaByCountry);

            if (countriesWithImages.length > 0) {
              // Разпределяме квотата от 6 снимки между държавите СЪС снимки
              // Първи пас: поравно; втори пас: остатъкът отива където има още налични
              const target = 6;
              const picked: any[] = [];
              const pools = countriesWithImages.map(c => [...mediaByCountry[c]]);

              // Round-robin: взимаме по 1 от всяка държава докато стигнем 6 или свършат
              let poolIdx = 0;
              let emptyRounds = 0;
              while (picked.length < target && emptyRounds < pools.length) {
                const pool = pools[poolIdx % pools.length];
                if (pool.length > 0) {
                  const media = pool.shift();
                  picked.push({ url: media.url, alt: media.name });
                  emptyRounds = 0;
                } else {
                  emptyRounds++;
                }
                poolIdx++;
              }

              selectedImages = shuffle(picked); // разбъркваме финалния ред
            }
          }

          // ВАЖНО: сайтът (TourClient) чете 'galleryWithCaptions' с ключ 'caption' — не 'gallery' с 'alt'!
          finalTour.galleryWithCaptions = selectedImages.map((s: any) => ({ url: s.url, caption: s.alt || '' }));
          finalTour.images = selectedImages.map((s: any) => s.url).join(', '); // legacy поле за съвместимост
          if (heroImg) finalTour.img = heroImg;
          // Ако няма hero снимка, но има галерия — първата от галерията става главна
          else if (selectedImages.length > 0) finalTour.img = selectedImages[0].url;
          // Ако няма никакви снимки — img остава празно (не слагаме нищо)

          // ДЕБАГ в конзолата — помага веднага дали снимките са намерени или защо не
          console.log(`[СНИМКИ] ${finalTour.title}: country=${JSON.stringify(finalTour.country)}, hero=${heroImg ? ('✓ ' + heroImg) : '✗'}, галерия=${selectedImages.length} снимки`);
          if (!heroImg || selectedImages.length === 0) {
            // Ако нещо липсва, показваме ВСИЧКИ имена в библиотеката, за да се види точно как са кръстени
            console.log(`[СНИМКИ] Всички имена в библиотеката (${allMedia.length}): ${allMedia.map((m: any) => m.name).join(', ')}`);
          }

          // Г) КОНВЕРСИЯ: AI формат → формат на сайта
          // AI връща масиви (includes/excludes/docs/info), сайтът очаква стрингове с нови редове
          const joinArr = (arr: any) => Array.isArray(arr) ? arr.join('\n') : (arr || '');

          // Генерираме tourId: countrySlug-MM-YYYY-N
          const firstCountry = Array.isArray(finalTour.country) ? finalTour.country[0] : finalTour.country;
          const countrySlug = slugify(firstCountry || 'tour') || 'tour';
          // MM-YYYY в ID-то = месец/година на ОТПЪТУВАНЕТО, НЕ на импорта!
          // Източници по приоритет: 1) първата скрейпната дата, 2) датата от заглавието на Ден 1, 3) днешна дата (fallback)
          const now = new Date();
          let mm = String(now.getMonth() + 1).padStart(2, '0');
          let yyyy = String(now.getFullYear());
          const firstDateStr = String((scrapedData.dates && scrapedData.dates[0]) || '');
          let dm;
          if ((dm = firstDateStr.match(/^(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})/))) {
            // ISO: YYYY-MM-DD
            yyyy = dm[1]; mm = dm[2].padStart(2, '0');
          } else if ((dm = firstDateStr.match(/^(\d{1,2})[-.\/](\d{1,2})[-.\/](\d{4})/))) {
            // BG: DD.MM.YYYY
            mm = dm[2].padStart(2, '0'); yyyy = dm[3];
          } else {
            // Пробваме от заглавието на Ден 1 (формат "DD.MM.YY Заглавие")
            const day1Title = String(finalTour.program?.[0]?.title || '');
            const tm = day1Title.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
            if (tm) { mm = tm[2].padStart(2, '0'); yyyy = tm[3].length === 2 ? '20' + tm[3] : tm[3]; }
          }
          const idPrefix = `${countrySlug}-${mm}-${yyyy}`;
          const existingIds = new Set<string>(
            allTours.filter((t: any) => t.tourId?.startsWith(idPrefix)).map((t: any) => t.tourId)
          );
          // Слагаме и ID-тата, генерирани по-рано в СЪЩИЯ цикъл (allTours не ги вижда още)
          generatedIdsThisRun.forEach(id => { if (id.startsWith(idPrefix)) existingIds.add(id); });
          // Търсим първия свободен номер (гарантирано уникален, дори при дупки в номерацията)
          let counter = existingIds.size + 1;
          while (existingIds.has(`${idPrefix}-${counter}`)) counter++;
          const genTourId = `${idPrefix}-${counter}`;
          generatedIdsThisRun.add(genTourId);

          const tourDoc: any = {
            title: finalTour.title || linkObj.title,
            intro: finalTour.intro || '',
            country: finalTour.country || [linkObj.countryMatched],
            continent: '', // попълва се ръчно при одобрение — но полето трябва да СЪЩЕСТВУВА (where(undefined) гърми в SimilarTours)
            price: finalTour.price || '',
            duration: finalTour.days ? String(finalTour.days) : '',
            durationDays: finalTour.days ? String(finalTour.days) : '', // TourForm и сайтът четат 'Дни' от това поле!
            nights: finalTour.nights ? String(finalTour.nights) : '',
            route: finalTour.route || '',
            // ВАЖНО: сайтът (TourTabs) и TourForm четат поле 'itinerary' с ключ 'content' —
            // AI връща 'program' с 'description', затова мапваме тук.
            // Също почистваме евентуален префикс "1 ДЕН – 28.08.2026" от описанието (дублира заглавието)
            itinerary: (finalTour.program || []).map((p: any, idx: number) => {
              let content = p.description || p.content || '';
              // Махаме водещ "N ден" / "N-ти ДЕН" + евентуална дата от началото на текста
              content = content.replace(/^\s*\d{1,2}\s*(?:-?\s*(?:ви|ри|ти|ми|ва))?\s*ден\s*[–\-—]?\s*(?:\d{2}\.\d{2}\.\d{4})?\s*[–\-—:]?\s*/i, '');
              return {
                day: p.day || idx + 1,
                title: p.title || `Ден ${p.day || idx + 1}`,
                content
              };
            }),
            included: joinArr(finalTour.includes),
            notIncluded: joinArr(finalTour.excludes),
            documents: joinArr(finalTour.docs),
            generalInfo: joinArr(finalTour.info),
            img: finalTour.img || '',
            galleryWithCaptions: finalTour.galleryWithCaptions || [],
            images: finalTour.images || '',
            tourId: genTourId,
            slug: genTourId,
            operator: '2МКО',
            date: '', // датите се добавят ръчно при одобрение (или от scraped dates ако има)
            dates: [],
            categories: [],
            originalUrl: linkObj.url, // ЗА ДЕДУПЛИКАЦИЯ — за да не го теглим пак утре
            externalSourceLink: linkObj.url, // СЪЩОТО, НО за "Провери с бот" полето в TourForm — за да е предпопълнено при редактиране
            status: 'pending', // СТАТУС ЧАКАЩА!
            createdAt: serverTimestamp()
          };

          // Ако scrape-ът е намерил дати — НОРМАЛИЗИРАМЕ ги към ISO (YYYY-MM-DD)!
          // Скрейпърът ги връща като "27.11.2026" (с точки), а целият сайт филтрира/сортира по ISO —
          // без конверсия турът се брои "без валидни дати" и НЕ се показва на началната страница!
          if (scrapedData.dates && scrapedData.dates.length > 0) {
            const isoDates = scrapedData.dates.map(toISO).filter(Boolean);
            if (isoDates.length > 0) {
              tourDoc.dates = isoDates;
              tourDoc.date = isoDates[0];
            }
          }

          // Д) Записваме във Firebase като PENDING!
          setAutoProcessStatus(`Записване на ${tourDoc.title} в базата...`);
          await addDoc(collection(db, "tours"), tourDoc);

          successCount++;
        } catch (err) {
          console.error("Грешка при обработка на", linkObj.url, err);
          // Продължаваме със следващата, ако тази гръмне
        }

        // Малка пауза между всеки тур (дори и след успех) — намалява шанса да ударим на OpenAI rate limit
        // при следващите турове в цикъла, особено ако някои от тях са големи/много-дестинационни. Ако този конкретен
        // линк беше прескочен от датовия филтър (НЕ стигна до OpenAI), паузата е много по-кратка —
        // няма смисъл да чакаме пълните 3с само за да проверим следващия кандидат.
        if (i < allLinks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, reachedProcessing ? 3000 : 400));
        }
      }

      setAutoProcessStatus(`Готово! Успешно автоматизирахме ${successCount} екскурзии${automationLimit ? ` (ограничено до ${automationLimit})` : ''}.`);
      setTimeout(() => setAutoProcessStatus(''), 5000);
      
      // onSnapshot listener-ът автоматично ще покаже новите турове — не трябва ръчно опресняване

    } catch (err) {
      console.error(err);
      setAutoProcessStatus('Грешка в автоматизацията.');
      setTimeout(() => setAutoProcessStatus(''), 3000);
    }
    
    setIsAutoProcessing(false);
  };


  return (
    <div className="flex min-h-screen bg-[#fcfaf7] text-left">
      
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-brand-dark text-white p-8 shadow-2xl flex flex-col justify-between lg:sticky lg:top-0 lg:h-screen overflow-y-auto transform transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div>
            <div className="flex justify-between items-center mb-10">
                <span className="text-2xl font-serif italic font-bold text-brand-gold drop-shadow-sm">Beliva CRM</span>
                <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden"><X size={24}/></button>
            </div>
            <nav className="space-y-2">
                {[
                    { id: 'dashboard', label: 'Табло', icon: LayoutDashboard },
                    { id: 'marketing', label: 'Маркетинг', icon: TrendingUp },
                    { id: 'bookings', label: 'Резервации', icon: Inbox },
                    { id: 'customers', label: 'Клиенти', icon: UserCheck },
                    { id: 'tours', label: 'Оферти', icon: Map },
                    { id: 'groups', label: 'Групи', icon: Users },
                    { id: 'archived', label: 'Архив', icon: Archive },
                    { id: 'media', label: 'Галерия', icon: ImageIcon },
                    { id: 'promotions', label: 'Промоции', icon: BadgePercent },
                    { id: 'blog', label: 'Блог', icon: BookOpen },
                    { id: 'reviews', label: 'Ревюта', icon: Star },
                    { id: 'subscribers', label: 'Абонати', icon: Users },
                    { id: 'settings', label: 'Настройки', icon: Settings}
                    
                ].map(item => (
                    <button key={item.id} onClick={() => {setActiveTab(item.id); setIsSidebarOpen(false)}} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-brand-gold text-brand-dark font-bold shadow-lg shadow-brand-gold/10' : 'text-gray-400 hover:text-white'}`}>
                        <item.icon size={20}/> {item.label}
                    </button>
                ))}
            </nav>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-4 px-6 py-4 text-red-400 hover:text-red-300 mt-10 font-bold uppercase text-[10px] tracking-widest"><LogOut size={18} /> Изход</button>
      </aside>
      
      <main className="flex-grow p-4 md:p-8 lg:p-12 w-full overflow-hidden">
        <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-10 gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-white rounded-xl shadow-sm border"><Menu size={24} /></button>
              <h1 className="text-3xl font-serif italic text-brand-dark">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
            </div>
            <div className="flex gap-3">
                {activeTab === 'customers' && (
                    <button onClick={() => setIsAddCustomerModalOpen(true)} className="bg-brand-dark text-white px-8 py-4 rounded-2xl font-bold uppercase text-[10px] flex items-center gap-2 shadow-xl hover:bg-brand-gold transition-all active:scale-95">
                        <UserCheck size={16}/> Добави Клиент
                    </button>
                )}
                {activeTab === 'bookings' && (
                    <button onClick={() => setIsManualModalOpen(true)} className="bg-brand-gold text-brand-dark px-8 py-4 rounded-2xl font-bold uppercase text-[10px] flex items-center gap-2 shadow-xl hover:bg-brand-dark hover:text-white transition-all active:scale-95">
                        <PhoneIncoming size={16}/> Телефонно запитване
                    </button>
                )}
                {(activeTab === 'tours' || activeTab === 'blog') && (
                    <button onClick={() => openModal()} className="bg-brand-dark text-white px-8 py-4 rounded-2xl font-bold uppercase text-[10px] shadow-xl hover:bg-brand-gold transition-all active:scale-95">
                        + Добави {activeTab === 'blog' ? 'Статия' : 'Екскурзия'}
                    </button>
                )}
            </div>
        </header>
        {/* ТАБ ПРОМОЦИИ */}
        {activeTab === 'promotions' && (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center bg-white p-8 rounded-[3rem] shadow-sm">
                    <div>
                        <h2 className="text-2xl font-serif italic text-brand-dark">Маркетинг Кампании</h2>
                        <p className="text-gray-400 text-sm mt-1">Управлявайте глобалните разпродажби (напр. Black Friday)</p>
                    </div>
                    <button onClick={() => { setEditingCampaign({ name: '', startDate: '', endDate: '', label: 'ПРОМО', bgColor: '#dc2626', textColor: '#ffffff', effect: 'none' }); setIsCampaignModalOpen(true); }} className="bg-brand-dark text-white px-8 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-brand-gold transition-all shadow-lg">+ Нова Кампания</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaigns.map(camp => {
                        const isActive = new Date() >= new Date(camp.startDate) && new Date() <= new Date(camp.endDate);
                        return (
                        <div key={camp.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border relative">
                            <div className="absolute top-6 right-6">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                    {isActive ? 'Активна' : 'Неактивна'}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-brand-dark mb-4">{camp.name}</h3>
                            <div className="space-y-2 text-xs text-gray-500 font-medium mb-6">
                                <p>От: {new Date(camp.startDate).toLocaleString('bg-BG')}</p>
                                <p>До: {new Date(camp.endDate).toLocaleString('bg-BG')}</p>
                            </div>
                            
                            {/* ПРЕВЮ В СПИСЪКА */}
                            <div className="bg-gray-50 p-4 rounded-2xl flex justify-center mb-6">
                                <span className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest effect-${camp.effect} relative`} style={{ backgroundColor: camp.bgColor, color: camp.textColor }}>
                                    {camp.label}
                                </span>
                            </div>

                            <div className="flex gap-2">
                                <ActionBtn icon={Edit2} color="text-blue-500 bg-blue-50 w-full" onClick={() => { setEditingCampaign(camp); setIsCampaignModalOpen(true); }} />
                                <ActionBtn icon={Trash2} color="text-red-500 bg-red-50 w-full" onClick={async () => await deleteDoc(doc(db, "campaigns", camp.id))} />
                            </div>
                        </div>
                    )})}
                </div>
            </div>
        )}

        {/* TABS CONTENT */}
        {activeTab === 'dashboard' && <div className="space-y-8 animate-in fade-in duration-500"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><StatCard icon={Inbox} color="emerald" count={stats.newInquiries} label="Нови Запитвания" highlight /><StatCard icon={UserCheck} color="blue" count={stats.totalCustomers} label="Клиенти (CRM)" /><StatCard icon={Map} color="orange" count={stats.activeTours} label="Активни Оферти" /><StatCard icon={Users} color="purple" count={stats.totalSubscribers} label="Абонати" /></div><DashboardCharts
                    inquiries={inquiries}
                    tours={allTours}
                    clients={customers}
                    groups={groups}
                    subscribers={subscribers}
                  /></div>}

        {activeTab === 'customers' && (
            <ClientsTab onAddClient={() => setIsAddCustomerModalOpen(true)} onOpenGroup={handleOpenGroup} />
        )}

        {activeTab === 'bookings' && (
            <ReservationsTab allTours={allTours} allCampaigns={campaigns} customers={customers} />
        )}

        {activeTab === 'marketing' && <MarketingAnalytics />}

        {/* Останалите табове */}
        {/* ТАБ: АКТИВНИ ОФЕРТИ */}
        {activeTab === 'tours' && (
            <div className="space-y-6 animate-in fade-in">
                <SearchBar value={searchTour} onChange={setSearchTour} placeholder="Търси активна оферта..." />
                <div className="space-y-4">
                    {filteredTours.map((tour: any) => (
                        <div key={tour.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-brand-gold/5 flex flex-col md:flex-row items-center gap-6 hover:shadow-xl transition-all">
                            {tour.img ? (
                                <img src={tour.img} className="w-24 h-24 rounded-2xl object-cover shadow-sm shrink-0" alt="" />
                            ) : (
                                <div className="w-24 h-24 rounded-2xl bg-brand-dark/5 border border-brand-gold/15 shrink-0 flex items-center justify-center">
                                    <span className="text-brand-gold/30 text-3xl font-serif italic">{(tour.title || '?').charAt(0)}</span>
                                </div>
                            )}
                            <div className="flex-grow">
                                <h3 className="font-bold text-brand-dark leading-tight">{tour.title}</h3>
                                <p className="text-xs text-gray-400 mt-1">{Array.isArray(tour.country) ? tour.country.join(', ') : tour.country} • {formatPrice(tour.price)}</p>
                            </div>
                            <div className="flex gap-2">
                                <ActionBtn icon={Edit2} color="text-blue-500 bg-blue-50" onClick={() => openModal(tour)} />
                                <ActionBtn icon={Copy} color="text-purple-500 bg-purple-50" onClick={() => handleCopyTour(tour)} />
                                <ActionBtn icon={Archive} color="text-orange-500 bg-orange-50" onClick={async () => await updateDoc(doc(db, "tours", tour.id), { status: 'archived' })} />
                                <ActionBtn icon={Trash2} color="text-red-500 bg-red-50" onClick={() => handleDeleteTourClick(tour)} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'settings' && <SettingsTab />}

        {/* ТАБ: АРХИВ И ЧЕРНОВИ (С ПОД-ТАБОВЕ) */}
        {activeTab === 'archived' && (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex flex-wrap gap-2 bg-white rounded-2xl p-2 shadow-sm border border-gray-100 w-fit mb-4">
                    <button onClick={() => setArchivedSubTab('pending')} className={`px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${archivedSubTab === 'pending' ? 'bg-brand-gold text-brand-dark shadow-lg' : 'text-gray-400 hover:text-brand-dark hover:bg-gray-50'}`}>
                        Чакащи одобрение ({allTours.filter((t: any) => t.status === 'pending').length})
                    </button>
                    <button onClick={() => setArchivedSubTab('drafts')} className={`px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${archivedSubTab === 'drafts' ? 'bg-brand-dark text-white shadow-lg' : 'text-gray-400 hover:text-brand-dark hover:bg-gray-50'}`}>Чакащи промени (Чернови/XML)</button>
                    <button onClick={() => setArchivedSubTab('archived')} className={`px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${archivedSubTab === 'archived' ? 'bg-brand-dark text-white shadow-lg' : 'text-gray-400 hover:text-brand-dark hover:bg-gray-50'}`}>Архивирани (Стари)</button>
                </div>

                {/* АВТОМАТИЗАЦИЯ — панел видим само в "Чакащи одобрение" */}
                {archivedSubTab === 'pending' && (
                  <div className="bg-brand-dark rounded-[2.5rem] p-8 shadow-xl space-y-5">
                    <div>
                      <h3 className="text-brand-gold font-serif italic text-xl mb-1">Автоматична машина за екскурзии</h3>
                      <p className="text-white/50 text-xs">Добави държави една по една и натисни Старт. Новите турове се появяват тук за одобрение.</p>
                    </div>

                    {/* Избрани държави — търсачка срещу реалните имена на държави (WORLD_COUNTRIES), вместо свободен текст — намалява
                    риска да не съвпадне с това, което /api/scout реално търси. Запазва и показва колко тура вече имаме,
                    и колко нови намери последната проверка, директно във чипа на всяка държава. */}
                    <CountryMultiSelect
                      variant="dark"
                      label="Избрани държави за скениране"
                      selected={automationCountries}
                      setSelected={setAutomationCountries}
                      renderExtra={(c) => {
                        const ourCount = ourCountsByCountry[c] || 0;
                        const newCount = scoutResults[c];
                        return (
                          <span className="text-white/40 font-normal text-[11px]">
                            (Имаме: <span className="text-white/70 font-bold">{ourCount}</span>
                            {' · '}
                            Нови: {newCount === undefined
                              ? <span className="text-white/40 italic">?</span>
                              : <span className={newCount > 0 ? 'text-emerald-400 font-bold' : 'text-white/40'}>{newCount}</span>})
                          </span>
                        );
                      }}
                    />

                    {/* Минимална дата на отпътуване — турове с ВСИЧКИ дати преди това се прескачат цялостно, без AI-format,
                    спестявайки време/токени за нещо, което веднага ще се отхвърли. Празно поле = без филтър. */}
                    <div className="flex items-center gap-3">
                      <label className="text-white/40 text-[10px] font-black uppercase tracking-widest shrink-0">Само турове с дата от:</label>
                      <input
                        type="date"
                        value={automationMinDate}
                        onChange={e => setAutomationMinDate(e.target.value)}
                        disabled={isAutoProcessing}
                        className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-gold transition-colors disabled:opacity-40"
                      />
                      {automationMinDate && (
                        <button onClick={() => setAutomationMinDate('')} className="text-white/40 hover:text-white text-xs font-bold">Махни</button>
                      )}
                    </div>

                    {/* Провери за нови / Стартирай сканиране */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={async () => {
                          if (automationCountries.length === 0) { alert('Добави поне една държава.'); return; }
                          setIsAutoProcessing(true);
                          setAutoProcessStatus('Проверка за нови екскурзии...');
                          try {
                            const res = await fetch('/api/scout', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ countries: automationCountries })
                            });
                            const data = await res.json();
                            const count = data.totalNewFound || 0;
                            // Групираме data.newLinks по countryMatched, за да покажем отделна бройка във всеки чип държава,
                            // не само общата бройка за всички. Инициализираме всяка проверена държава на 0 първо (дори
                            // ако няма newLinks за нея), така че "?" да се смени на "0", не да остане неопределено.
                            const freshCounts: Record<string, number> = Object.fromEntries(automationCountries.map(c => [c, 0]));
                            (data.newLinks || []).forEach((l: any) => {
                              if (l.countryMatched) freshCounts[l.countryMatched] = (freshCounts[l.countryMatched] || 0) + 1;
                            });
                            setScoutResults(prev => ({ ...prev, ...freshCounts }));
                            setAutoProcessStatus(count > 0
                              ? `Намерени ${count} нови екскурзии! Натисни "Стартирай сканиране" за да ги обработиш.`
                              : 'Няма нови екскурзии за избраните държави.');
                            setTimeout(() => setAutoProcessStatus(''), 8000);
                          } catch {
                            setAutoProcessStatus('Грешка при проверката.');
                            setTimeout(() => setAutoProcessStatus(''), 3000);
                          }
                          setIsAutoProcessing(false);
                        }}
                        disabled={isAutoProcessing || automationCountries.length === 0}
                        className="bg-white/10 border border-brand-gold/40 text-brand-gold px-6 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-brand-gold/20 transition-all disabled:opacity-40"
                      >
                        Провери за нови
                      </button>
                      <button
                        onClick={runTourAutomation}
                        disabled={isAutoProcessing || automationCountries.length === 0}
                        className="bg-brand-gold text-brand-dark px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                      >
                        {isAutoProcessing ? 'Работи...' : 'Стартирай сканиране'}
                      </button>
                    </div>

                    {/* Лимит на туровете за пускане — безопасен начин за тестване */}
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Лимит на турове на пускане:</span>
                      <div className="flex gap-2">
                        {[3, 5, 10].map(n => (
                          <button
                            key={n}
                            onClick={() => setAutomationLimit(n)}
                            disabled={isAutoProcessing}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${automationLimit === n ? 'bg-brand-gold text-brand-dark' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                          >
                            {n}
                          </button>
                        ))}
                        <button
                          onClick={() => setAutomationLimit(null)}
                          disabled={isAutoProcessing}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${automationLimit === null ? 'bg-red-500/80 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                        >
                          Без лимит
                        </button>
                      </div>
                    </div>

                    {/* Статус */}
                    {autoProcessStatus && (
                      <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-2xl px-5 py-4 text-brand-gold text-sm font-medium flex items-center gap-3">
                        {isAutoProcessing && <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-brand-gold shrink-0" />}
                        {autoProcessStatus}
                      </div>
                    )}
                  </div>
                )}
                
                <SearchBar value={searchTour} onChange={setSearchTour} placeholder="Търси екскурзия..." />
                
                <div className="space-y-4">
                    {filteredTours.length === 0 && <p className="text-gray-400 p-8 bg-white rounded-[2rem] text-center font-medium">Няма намерени екскурзии в тази секция.</p>}
                    {filteredTours.map((tour: any) => (
                        <div key={tour.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-brand-gold/5 flex flex-col md:flex-row items-center gap-6 hover:shadow-xl transition-all opacity-80 hover:opacity-100">
                            <img src={tour.img || '/placeholder.jpg'} className="w-24 h-24 rounded-2xl object-cover shadow-sm grayscale" alt="" />
                            <div className="flex-grow">
                                <h3 className="font-bold text-brand-dark leading-tight flex items-center gap-2">
                                    {tour.title}
                                    {tour.source === 'peakview' && <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-md text-[9px] uppercase">PeakView</span>}
                                </h3>
                                <p className="text-xs text-gray-400 mt-1">{Array.isArray(tour.country) ? tour.country.join(', ') : tour.country} • {formatPrice(tour.price)}</p>
                            </div>
                            <div className="flex gap-2">
                                <ActionBtn icon={Edit2} color="text-blue-500 bg-blue-50" onClick={() => openModal(tour)} />
                                <ActionBtn icon={CheckCircle2} color="text-emerald-600 bg-emerald-50" onClick={async () => await updateDoc(doc(db, "tours", tour.id), { status: 'public' })} />
                                <ActionBtn
                                    icon={Trash2}
                                    color="text-red-500 bg-red-50"
                                    onClick={() => handleDeleteTourClick(tour)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
        {activeTab === 'media' && <div className="h-[80vh] rounded-[3rem] overflow-hidden border shadow-sm"><MediaLibrary /></div>}
        {activeTab === 'blog' && <><SearchBar value={searchBlog} onChange={setSearchBlog} placeholder="Търси статия..." /><div className="space-y-4 animate-in fade-in">{posts.filter(p => p.title?.toLowerCase().includes(searchBlog.toLowerCase())).map(post => (<div key={post.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-brand-gold/5 flex items-center gap-6 hover:shadow-md transition-shadow"><img src={post.coverImg || post.img} className="w-20 h-20 rounded-2xl object-cover" alt="" /><div className="flex-grow"><h3 className="font-bold text-brand-dark">{post.title}</h3></div><div className="flex gap-2"><ActionBtn icon={Edit2} color="text-blue-500 bg-blue-50" onClick={() => openModal(post)} /><ActionBtn icon={Trash2} color="text-red-500 bg-red-50" onClick={async () => { if(confirm('Изтриване?')) await deleteDoc(doc(db, "posts", post.id)) }} /></div></div>))}</div></>}
        {activeTab === 'subscribers' && <div className="bg-white rounded-[3rem] shadow-xl overflow-hidden border-0"><div className="p-10 bg-gray-50 flex justify-between items-center border-b"><h3 className="text-2xl font-serif italic text-brand-dark">Абонати на бюлетина</h3><button onClick={() => { const csv = subscribers.map(s => s.email).join('\n'); navigator.clipboard.writeText(csv); alert('Копирано!'); }} className="bg-brand-gold text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-dark transition-all shadow-lg shadow-brand-gold/20">Експортирай списъка</button></div><table className="w-full text-left text-sm"><thead className="bg-white text-[10px] uppercase font-black text-gray-400 border-b tracking-widest"><tr><th className="p-10">Имейл Адрес</th><th className="p-10">Дата на записване</th><th className="p-10 text-right">Действие</th></tr></thead><tbody className="divide-y divide-gray-50">{subscribers.map((sub: any) => (<tr key={sub.id} className="hover:bg-gray-50/50 transition-colors"><td className="p-10 font-bold text-brand-dark">{sub.email}</td><td className="p-10 text-gray-400">{sub.createdAt?.seconds ? new Date(sub.createdAt.seconds * 1000).toLocaleDateString('bg-BG') : 'Сега'}</td><td className="p-10 text-right"><button onClick={async () => await deleteDoc(doc(db, "subscribers", sub.id))} className="text-red-400 p-3 bg-red-50 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button></td></tr>))}</tbody></table></div>}
        {activeTab === 'groups' && (
          <GroupsTab
            allTours={allTours}
            pendingGroupOpenId={pendingGroupOpenId}
            onPendingGroupOpened={() => setPendingGroupOpenId(null)}
            onOpenClient={(clientId: string, fallbackName?: string) => {
              let client = customers.find(c => c.id === clientId);
              // Fallback за вече съществуващи групи, създадени преди поправката на ReservationsTab.tsx — те все още имат
              // буквалния placeholder customerId: "new" записан, вместо реално ID — търсим по име като резервен вариант.
              if (!client && fallbackName) {
                client = customers.find(c =>
                  c.name === fallbackName ||
                  `${c.firstName || ''} ${c.lastName || ''}`.trim() === fallbackName
                );
              }
              if (client) {
                setGlobalSelectedClient(client);
              } else {
                alert(`Не намерихме клиентски картон за "${fallbackName || clientId}" — възможно е бил изтрит или името не съвпада точно.`);
              }
          }} />
        )}

        {/* ТАБ: РЕВЮТА (РАЗДЕЛЕНИ И С ПРАВА ЗА ПУБЛИКУВАНЕ) */}
        {/* ТАБ: РЕВЮТА */}
        {activeTab === 'reviews' && (
            <div className="space-y-8 animate-in fade-in">
                
                {/* HEAD & EXPORT */}
                <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[3rem] shadow-sm gap-4">
                    <div>
                        <h2 className="text-2xl font-serif italic text-brand-dark">Отзиви от клиенти</h2>
                        <p className="text-sm text-gray-400 mt-1">Управление на обратната връзка и публикациите на сайта.</p>
                    </div>
                    {reviewsSubTab === 'auto' && (
                        <div className="flex gap-4 w-full md:w-auto">
                            <select className={inputClass} style={{padding: '1rem', borderRadius: '1rem'}} value={reviewOperatorFilter} onChange={e => setReviewOperatorFilter(e.target.value)}>
                                <option value="">Всички туроператори</option>
                                {Array.from(new Set(reviews.filter(r => r.tourId).map(r => r.tourOperator).filter(Boolean))).map((op: any) => <option key={op} value={op}>{op}</option>)}
                            </select>
                            <a 
                                href={`mailto:?subject=Отзиви за ${reviewOperatorFilter || 'всички'}&body=Здравейте, изпращаме ви списък с отзиви.%0D%0A%0D%0A${reviews.filter(r => r.tourId && (reviewOperatorFilter ? r.tourOperator === reviewOperatorFilter : true)).map(r => `Екскурзия: ${r.tourTitle} (${r.tourDate})%0D%0AКлиент: ${r.customerName}%0D%0AОценка: ${r.rating}/5%0D%0AКоментар: ${r.comment}%0D%0A-------------------`).join('%0D%0A')}`}
                                className="bg-brand-gold text-white px-6 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-brand-dark transition-all flex items-center justify-center shrink-0"
                            >
                                Експорт
                            </a>
                        </div>
                    )}
                </div>

                {/* SUB-TABS ЗА РЕВЮТА */}
                <div className="flex flex-wrap gap-2 bg-white rounded-2xl p-2 shadow-sm border border-gray-100 w-fit">
                    <button onClick={() => setReviewsSubTab('auto')} className={`px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${reviewsSubTab === 'auto' ? 'bg-brand-gold text-white shadow-lg shadow-brand-gold/20' : 'text-gray-400 hover:text-brand-dark hover:bg-gray-50'}`}>От конкретни пътувания</button>
                    <button onClick={() => setReviewsSubTab('manual')} className={`px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${reviewsSubTab === 'manual' ? 'bg-brand-gold text-white shadow-lg shadow-brand-gold/20' : 'text-gray-400 hover:text-brand-dark hover:bg-gray-50'}`}>Общи (За сайта)</button>
                </div>

                <SearchBar value={searchReview} onChange={setSearchReview} placeholder="Търси отзив по име на клиент..." />

                {/* СЕКЦИЯ 1: ОТЗИВИ ОТ ПЪТУВАНИЯ */}
                {reviewsSubTab === 'auto' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                        {reviews
                            .filter((r: any) => r.tourId && (reviewOperatorFilter ? r.tourOperator === reviewOperatorFilter : true))
                            .filter((r: any) => !searchReview || r.customerName?.toLowerCase().includes(searchReview.toLowerCase()))
                            .map((r: any) => (
                            <div key={r.id} className="bg-white p-8 rounded-[3rem] border border-gray-50 shadow-sm relative flex flex-col transition-all hover:shadow-lg">
                                {/* ... (Старият код за единично ревю си остава същият) ... */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-brand-gold rounded-full flex items-center justify-center text-white font-bold shadow-lg">{r.customerName?.charAt(0) || 'K'}</div>
                                        <div>
                                            <p className="font-bold text-brand-dark leading-tight">{r.customerName}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{r.tourTitle} • {r.tourDate}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold uppercase tracking-widest">{r.tourOperator || 'Общо'}</span>
                                </div>
                                
                                <div className="flex gap-1 mb-3 text-brand-gold">
                                    {[1,2,3,4,5].map(star => <Star key={star} size={14} fill={star <= r.rating ? 'currentColor' : 'none'} />)}
                                </div>
                                
                                <p className="text-gray-500 italic leading-relaxed text-sm bg-gray-50 p-4 rounded-2xl flex-grow">"{r.comment || r.text}"</p>
                                
                                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3">
                                    <div className="flex items-center gap-2 text-xs">
                                        {r.consentToPublish ? (
                                            <span className="text-emerald-600 flex items-center gap-1 font-bold"><CheckCircle2 size={14}/> Съгласен за публикация</span>
                                        ) : (
                                            <span className="text-red-400 flex items-center gap-1 font-medium"><XCircle size={14}/> Без съгласие (само за вътрешно ползване)</span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center gap-2">
                                        <button disabled={!r.consentToPublish} onClick={async () => await updateDoc(doc(db, "reviews", r.id), { isPublished: !r.isPublished })} className={`flex-grow py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${!r.consentToPublish ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : r.isPublished ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                                            {r.isPublished ? 'Свали от сайта' : '🌍 Одобри за Сайта'}
                                        </button>
                                        <button onClick={async () => await deleteDoc(doc(db, "reviews", r.id))} className="text-red-400 p-3 bg-red-50 hover:bg-red-500 hover:text-white rounded-xl transition-all"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* СЕКЦИЯ 2: ОБЩИ ОТЗИВИ */}
                {reviewsSubTab === 'manual' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                        {reviews
                            .filter((r: any) => !r.tourId)
                            .filter((r: any) => !searchReview || r.name?.toLowerCase().includes(searchReview.toLowerCase()))
                            .map((r: any) => (
                            <div key={r.id} className="bg-white p-8 rounded-[3rem] border border-gray-50 flex justify-between gap-6 shadow-sm">
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold text-xs uppercase">{r.name?.charAt(0) || 'K'}</div>
                                        <p className="font-bold text-brand-dark">{r.name}</p>
                                    </div>
                                    <p className="text-gray-500 italic leading-relaxed text-sm">"{r.text}"</p>
                                </div>
                                <button onClick={async () => await deleteDoc(doc(db, "reviews", r.id))} className="text-red-400 shrink-0 p-3 h-fit bg-red-50 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 size={18}/></button>
                            </div>
                        ))}
                    </div>
                )}

            </div>
        )}
      </main>

      {/* --- ALL MODALS (REDESIGNED) --- */}

      {/* 1. Edit Customer Modal */}
      {isEditCustomerModalOpen && editingCustomer && (
        <ModalWrapper onClose={() => setIsEditCustomerModalOpen(false)}>
            <ModalHeader icon={Settings} color="bg-blue-50 text-blue-600" title="Досие на Клиент" subtitle="Редактиране на основни данни" />
            <form onSubmit={handleUpdateCustomer} className="space-y-6">
                <div><label className={labelClass}>Пълно Име</label><input className={inputClass} required value={editingCustomer.name} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-6">
                    <div><label className={labelClass}>Телефон</label><input className={inputClass} required value={editingCustomer.phone} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} /></div>
                    <div><label className={labelClass}>VIP Отстъпка %</label><input type="number" className={inputClass} value={editingCustomer.vipDiscount} onChange={e => setEditingCustomer({...editingCustomer, vipDiscount: parseInt(e.target.value) || 0})} /></div>
                </div>
                <div><label className={labelClass}>Имейл Адрес</label><input className={inputClass} value={editingCustomer.email} onChange={e => setEditingCustomer({...editingCustomer, email: e.target.value})} /></div>
                <button type="submit" className="w-full bg-brand-dark text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-all shadow-2xl mt-4">Запази промените</button>
            </form>
        </ModalWrapper>
      )}

      {/* 2. Add New Customer Modal */}
      {isAddCustomerModalOpen && (
        <ModalWrapper onClose={() => setIsAddCustomerModalOpen(false)}>
            <ModalHeader icon={UserCheck} color="bg-emerald-50 text-emerald-600" title="Нов Клиент" subtitle="Директно вписване в CRM" />
            <form onSubmit={handleSaveNewCustomer} className="space-y-6">
                <input className={inputClass} required placeholder="Име и Фамилия *" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-6">
                    <input className={inputClass} required placeholder="Телефон *" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
                    <input type="number" className={inputClass} placeholder="Начална Отстъпка %" value={newCustomer.vipDiscount} onChange={e => setNewCustomer({...newCustomer, vipDiscount: parseInt(e.target.value) || 0})} />
                </div>
                <input className={inputClass} placeholder="Имейл адрес (по избор)" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} />
                <div className="pt-8 border-t border-gray-50">
                    <label className={labelClass}>Първо пътуване</label>
                    <select className={inputClass} onChange={e => {
                        const tour = allTours.find(t => t.id === e.target.value);
                        setNewCustomer({...newCustomer, initialTourId: e.target.value, initialTourTitle: tour?.title || '', initialDate: ''});
                    }}>
                        <option value="">-- Избери екскурзия (по избор) --</option>
                        {allTours.filter(t => t.status === 'public').map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                    {newCustomer.initialTourId && (
                        <select className={`${inputClass} mt-4 bg-brand-gold/5 border-brand-gold/10`} value={newCustomer.initialDate} onChange={e => setNewCustomer({...newCustomer, initialDate: e.target.value})}>
                            <option value="">-- Избери дата --</option>
                            {allTours.find(t => t.id === newCustomer.initialTourId)?.dates?.map((d: string) => <option key={d} value={d}>{d.split('-').reverse().join('.')}</option>)}
                        </select>
                    )}
                </div>
                <button type="submit" className="w-full bg-brand-dark text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-all shadow-xl">ЗАПИСИ В CRM</button>
            </form>
        </ModalWrapper>
      )}

      {/* 3. Edit Inquiry Modal */}
      {isEditInquiryModalOpen && editingInquiry && (
          <ModalWrapper onClose={() => setIsEditInquiryModalOpen(false)}>
              <ModalHeader icon={Edit2} color="bg-blue-50 text-blue-600" title="Корекция на запитване" subtitle={`Клиент: ${editingInquiry.clientName}`} />
              <form onSubmit={handleUpdateInquiry} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                      <div><label className={labelClass}>Име</label><input className={inputClass} required value={editingInquiry.clientName} onChange={e => setEditingInquiry({...editingInquiry, clientName: e.target.value})} /></div>
                      <div><label className={labelClass}>Телефон</label><input className={inputClass} required value={editingInquiry.clientPhone} onChange={e => setEditingInquiry({...editingInquiry, clientPhone: e.target.value})} /></div>
                  </div>
                  <div className="pt-8 border-t border-gray-50 space-y-6">
                    <div>
                        <label className={labelClass}>Екскурзия</label>
                        <select className={inputClass} value={editingInquiry.tourId} onChange={e => {
                            const t = allTours.find(x => x.id === e.target.value);
                            setEditingInquiry({...editingInquiry, tourTitle: t?.title || 'Общо запитване', tourId: e.target.value, tourDate: ''});
                        }}>
                            <option value="general">Общо запитване</option>
                            {allTours.filter(t => t.status === 'public').map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                        </select>
                    </div>
                    {editingInquiry.tourId !== 'general' && (
                        <select className={inputClass} value={editingInquiry.tourDate} onChange={e => setEditingInquiry({...editingInquiry, tourDate: e.target.value})}>
                            <option value="">-- Избери дата --</option>
                            {allTours.find(t => t.id === editingInquiry.tourId)?.dates?.map((d: string) => <option key={d} value={d}>{d.split('-').reverse().join('.')}</option>)}
                        </select>
                    )}
                  </div>
                  <button type="submit" className="w-full bg-brand-dark text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-all shadow-xl">Запази Промените</button>
              </form>
          </ModalWrapper>
      )}

      {/* МОДАЛ ЗА КАМПАНИЯ */}
      {isCampaignModalOpen && (
        <ModalWrapper onClose={() => setIsCampaignModalOpen(false)}>
            <ModalHeader icon={BadgePercent} color="bg-red-50 text-red-600" title="Промо Кампания" subtitle="Настройки и Визуализация" />
            <form onSubmit={handleSaveCampaign} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* ЛЯВО: ФОРМА */}
                <div className="space-y-6">
                    <div><label className={labelClass}>Име на кампанията</label><input className={inputClass} required placeholder="пр. Black Friday 2025" value={editingCampaign.name} onChange={e => setEditingCampaign({...editingCampaign, name: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelClass}>Начало</label><input type="datetime-local" className={inputClass} required value={editingCampaign.startDate} onChange={e => setEditingCampaign({...editingCampaign, startDate: e.target.value})} /></div>
                        <div><label className={labelClass}>Край</label><input type="datetime-local" className={inputClass} required value={editingCampaign.endDate} onChange={e => setEditingCampaign({...editingCampaign, endDate: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div><label className={labelClass}>Текст на етикета</label><input className={inputClass} required value={editingCampaign.label} onChange={e => setEditingCampaign({...editingCampaign, label: e.target.value})} /></div>
                        <div>
                            <label className={labelClass}>Специален Ефект</label>
                            <select className={inputClass} value={editingCampaign.effect} onChange={e => setEditingCampaign({...editingCampaign, effect: e.target.value})}>
                                <option value="none">Без ефект</option><option value="fire">🔥 Горящ</option><option value="hearts">❤️ Сърца</option><option value="shimmer">✨ Отблясък</option>
                                <option value="neon">🚨 Неон</option><option value="pulse">💓 Пулсиращ</option><option value="glow">🌟 Светещ</option><option value="bounce">🧲 Подскачащ</option>
                                <option value="shake">⚠️ Вибриращ</option><option value="scale">🔍 Увеличаващ</option><option value="party">🎉 Празничен</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelClass}>Цвят Фон</label><input type="color" className="w-full h-12 rounded-xl cursor-pointer" value={editingCampaign.bgColor} onChange={e => setEditingCampaign({...editingCampaign, bgColor: e.target.value})} /></div>
                        <div><label className={labelClass}>Цвят Текст</label><input type="color" className="w-full h-12 rounded-xl cursor-pointer" value={editingCampaign.textColor} onChange={e => setEditingCampaign({...editingCampaign, textColor: e.target.value})} /></div>
                    </div>
                </div>

                {/* ДЯСНО: LIVE PREVIEW */}
                <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-dashed border-gray-300 flex flex-col items-center justify-center">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-6">Как ще изглежда в сайта:</p>
                    <div className="w-64 bg-white rounded-[2rem] overflow-hidden shadow-2xl relative transform scale-110">
                        <img src="/hero/dubai.webp" alt="Preview" className="w-full h-40 object-cover" />
                        <div className="absolute top-4 left-4 z-10">
                            <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg effect-${editingCampaign.effect} relative`} style={{ backgroundColor: editingCampaign.bgColor, color: editingCampaign.textColor }}>
                                {editingCampaign.label}
                            </span>
                        </div>
                        <div className="p-5">
                            <p className="font-bold text-brand-dark leading-tight">Примерна Оферта</p>
                            <p className="text-gray-400 line-through text-sm mt-3">2500 €</p>
                            <p className="text-red-600 font-bold text-xl leading-none">2000 €</p>
                        </div>
                    </div>
                </div>

                <div className="col-span-full pt-6">
                    <button type="submit" className="w-full bg-brand-dark text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-all shadow-xl">ЗАПАЗИ КАМПАНИЯТА</button>
                </div>
            </form>
        </ModalWrapper>
      )}

      {/* 4. Add Trip Modal (ADVANCED) */}
      {isAddTripModalOpen && selectedCustomerForTrip && (
          <ModalWrapper onClose={() => setIsAddTripModalOpen(false)}>
              <ModalHeader icon={History} color="bg-brand-gold text-white shadow-brand-gold/20" title="Добави пътуване" subtitle={`Към досието на ${selectedCustomerForTrip.name}`} />
              <form onSubmit={handleAddManualTrip} className="space-y-6">
                  
                  {/* Търсачка за екскурзия */}
                  <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div>
                          <label className={labelClass}>Търси по държава</label>
                          <input className={inputClass} placeholder="пр. Япония" value={tripSearchCountry} onChange={e => setTripSearchCountry(e.target.value)} />
                      </div>
                      <div>
                          <label className={labelClass}>Месец (число)</label>
                          <input type="number" min="1" max="12" className={inputClass} placeholder="пр. 5 за Май" value={tripSearchMonth} onChange={e => setTripSearchMonth(e.target.value)} />
                      </div>
                  </div>

                  <div>
                      <label className={labelClass}>Избери Екскурзия (Вкл. Архивирани)</label>
                      <select className={inputClass} required onChange={e => {
                           const tour = allTours.find(t => t.id === e.target.value);
                           setNewTrip({...newTrip, tourId: e.target.value, tourTitle: tour?.title || '', date: '', tourOperator: tour?.operator || 'Неизвестен'});
                      }}>
                          <option value="">-- Избери от списъка --</option>
                          {allTours.filter(t => {
                              // Търсачка по държава — country може да е стринг (ръчни турове) ИЛИ масив (скрейпнати) — .toLowerCase() върху масив гърми!
                              if (tripSearchCountry) {
                                const countryStr = Array.isArray(t.country) ? t.country.join(' ') : (t.country || '');
                                if (!countryStr.toLowerCase().includes(tripSearchCountry.toLowerCase())) return false;
                              }
                              
                              // ⚠️ ВАЖНО: Тук сме премахнали проверката за status === 'public', 
                              // за да показва АБСОЛЮТНО ВСИЧКИ екскурзии (и активни, и архивни).
                              // Махаме само черновите (draft), защото те не са реални пътувания.
                              if (t.status === 'draft') return false;

                              return true; 
                          }).map(t => (
                              <option key={t.id} value={t.id}>
                                  {t.title} {t.status === 'archived' ? '(В Архив)' : ''}
                              </option>
                          ))}
                      </select>
                  </div>
                  {newTrip.tourId && (
                      <div className="animate-in slide-in-from-top-4 duration-300 space-y-6">
                        <div>
                            <label className={labelClass}>Историческа Дата на пътуване</label>
                            <select className={inputClass} required value={newTrip.date} onChange={e => setNewTrip({...newTrip, date: e.target.value})}>
                                <option value="">-- Избери дата --</option>
                                {/* ⚡ Първо се опитваме да вземем ВСИЧКИ дати от историята */}
                                {allTours.find(t => t.id === newTrip.tourId)?.historicalDates?.map((d: string) => (
                                    <option key={d} value={d}>{d.split('-').reverse().join('.')}</option>
                                ))}
                                {/* Ако няма исторически (напр. стара екскурзия преди ъпдейта), взимаме обикновените дати */}
                                {!(allTours.find(t => t.id === newTrip.tourId)?.historicalDates?.length) && 
                                    allTours.find(t => t.id === newTrip.tourId)?.dates?.map((d: string) => (
                                        <option key={d} value={d}>{d.split('-').reverse().join('.')}</option>
                                    ))
                                }
                            </select>
                         </div>
                         <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                             <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Оператор (автоматично):</p>
                             <p className="font-bold text-brand-dark">{newTrip.tourOperator}</p>
                         </div>
                      </div>
                  )}
                  <button type="submit" className="w-full bg-brand-dark text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-all shadow-2xl disabled:opacity-50 mt-4" disabled={!newTrip.date}>ЗАПИШИ В ИСТОРИЯТА</button>
              </form>
          </ModalWrapper>
      )}

      {/* 5. Phone Inquiry Modal (Manual) */}
      {isManualModalOpen && (
        <ModalWrapper onClose={() => setIsManualModalOpen(false)}>
            <ModalHeader icon={PhoneIncoming} color="bg-brand-gold/10 text-brand-gold" title="Запис от телефон" subtitle="Ръчно въвеждане на запитване" />
            <form onSubmit={handleSaveManualInquiry} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <input className={inputClass} required placeholder="Име *" value={manualInquiry.clientName} onChange={e => setManualInquiry({...manualInquiry, clientName: e.target.value})} />
                    <input className={inputClass} required placeholder="Телефон *" value={manualInquiry.clientPhone} onChange={e => setManualInquiry({...manualInquiry, clientPhone: e.target.value})} />
                </div>
                <div className="pt-8 border-t border-gray-50 space-y-6">
                    <select className={inputClass} onChange={e => { 
                        const t = allTours.find(x => x.id === e.target.value); 
                        setManualInquiry({...manualInquiry, tourTitle: t?.title || 'Общо запитване', tourId: e.target.value, tourDate: ''}); 
                    }}>
                        <option value="">-- Избери оферта --</option>
                        {allTours.filter(t => t.status === 'public').map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                    {manualInquiry.tourId && (
                        <select className={inputClass} value={manualInquiry.tourDate} onChange={e => setManualInquiry({...manualInquiry, tourDate: e.target.value})}>
                            <option value="">-- Избери дата --</option>
                            {allTours.find(t => t.id === manualInquiry.tourId)?.dates?.map((d: string) => <option key={d} value={d}>{d.split('-').reverse().join('.')}</option>)}
                        </select>
                    )}
                </div>
                <button type="submit" className="w-full bg-brand-dark text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-all shadow-xl">ЗАПАЗИ В РЕЗЕРВАЦИИ</button>
            </form>
        </ModalWrapper>
      )}

      {/* Main Forms (Tours/Blog) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto flex items-start md:items-center justify-center p-4 md:p-6 bg-brand-dark/95 backdrop-blur-sm">
           <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-[4rem] relative shadow-2xl border border-white/10 animate-in zoom-in duration-300 my-6 md:my-auto overflow-hidden flex flex-col">
              <button onClick={() => {setIsModalOpen(false); setEditingItem(null)}} className="absolute top-6 right-6 p-3 bg-gray-50 text-gray-400 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-90 z-50"><X size={24}/></button>
              <div className="flex-1 overflow-y-auto p-12">
                {(activeTab === 'tours' || activeTab === 'archived') && <TourForm initialData={editingItem} onClose={() => setIsModalOpen(false)} allTours={allTours} allCampaigns={campaigns} />}
                {activeTab === 'blog' && <BlogForm initialData={editingItem} onClose={() => setIsModalOpen(false)} availableCountries={Array.from(new Set(allTours.map((t: any) => t.country))).sort()} />}
              </div>
           </div>
        </div>
      )}
      {globalSelectedClient && (
        <ClientDetailModal 
            client={globalSelectedClient} 
            onClose={() => setGlobalSelectedClient(null)} 
            onUpdate={(updated) => {
                setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
                setGlobalSelectedClient(updated);
            }}
            onOpenGroup={handleOpenGroup}
        />
        )}

      {/* МОДАЛ: ИЗБОР ПРИ ТРИЕНЕ НА ТУР С ОРИГИНАЛЕН ЛИНК */}
      {deleteChoiceTour && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-brand-dark/95 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in duration-200">
                <h3 className="font-serif italic text-2xl text-brand-dark mb-2">Как да изтрия?</h3>
                <p className="text-sm text-gray-400 mb-8">„{deleteChoiceTour.title}“ има оригинален линк от автоматизацията — избери как да постъпиш.</p>
                <div className="space-y-3">
                    <button
                        onClick={() => handleDeletePermanently(deleteChoiceTour)}
                        className="w-full bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-600 transition-all shadow-lg"
                    >
                        Триене за постоянно
                    </button>
                    <p className="text-[10px] text-gray-400 text-center -mt-1">Линкът се блокира завинаги — никога повече няма да се предложи от сканиране</p>
                    <button
                        onClick={() => handleDeleteForRescrape(deleteChoiceTour)}
                        className="w-full bg-brand-gold text-brand-dark py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-brand-dark hover:text-white transition-all shadow-lg mt-2"
                    >
                        Триене за повторно скейпване
                    </button>
                    <p className="text-[10px] text-gray-400 text-center -mt-1">Следващото сканиране ще го намери пак и ще мине през AI-format от нула</p>
                    <button
                        onClick={() => setDeleteChoiceTour(null)}
                        className="w-full text-gray-400 hover:text-brand-dark py-3 font-bold text-xs uppercase tracking-widest transition-all mt-2"
                    >
                        Отказ
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

// ПРЕМИУМ КОМПОНЕНТИ ЗА МОДАЛИТЕ
const ModalWrapper = ({ children, onClose }: any) => (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-brand-dark/95 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[3.5rem] p-12 relative shadow-[0_30px_80px_rgba(0,0,0,0.4)] border border-brand-gold/10 animate-in zoom-in duration-300">
            <button onClick={onClose} className="absolute top-10 right-10 p-2 bg-gray-50 text-gray-300 rounded-full hover:bg-red-50 hover:text-red-500 transition-all active:scale-90"><X size={24}/></button>
            {children}
        </div>
    </div>
);

const ModalHeader = ({ icon: Icon, color, title, subtitle }: any) => (
    <div className="flex items-center gap-5 mb-10 border-b border-gray-50 pb-8">
        <div className={`p-5 ${color} rounded-[1.5rem] shadow-sm`}><Icon size={32} /></div>
        <div>
            <h2 className="text-3xl font-serif italic text-brand-dark">{title}</h2>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.25em] mt-1">{subtitle}</p>
        </div>
    </div>
);

const StatCard = ({ icon: Icon, color, count, label, highlight }: any) => {
    const colorClasses: any = { blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600', purple: 'bg-purple-50 text-purple-600', orange: 'bg-orange-50 text-orange-600' };
    return (
    <div className={`bg-white p-10 rounded-[3rem] shadow-sm border-0 transition-all duration-500 hover:shadow-xl ${highlight && count > 0 ? 'ring-2 ring-emerald-500/20' : ''}`}>
        <div className="flex items-center justify-between mb-6">
            <div className={`p-4 rounded-[1.5rem] ${colorClasses[color]} shadow-lg shadow-black/5`}><Icon size={28}/></div>
            <span className="text-5xl font-black text-brand-dark tracking-tighter">{count}</span>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-300">{label}</p>
    </div>
)};

const ActionBtn = ({ icon: Icon, color, onClick }: any) => (
    <button onClick={onClick} className={`p-3 rounded-2xl transition-all hover:scale-110 active:scale-95 shadow-sm ${color}`}><Icon size={20}/></button>
);