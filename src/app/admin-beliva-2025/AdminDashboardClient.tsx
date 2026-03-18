"use client";

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { 
  collection, onSnapshot, query, orderBy, deleteDoc, doc, 
  updateDoc, addDoc, serverTimestamp, where, getDocs 
} from 'firebase/firestore';
import { 
  LayoutDashboard, Image as ImageIcon, Map, Archive, BookOpen, Star, Inbox, Users, LogOut, 
  Menu, X, Edit2, Copy, Trash2, CheckCircle2, FileText, UserCheck, Search, PhoneIncoming, BadgePercent, Save, Calendar, User, Mail, Phone, Globe, History, Plus, Settings, ChevronRight,
  XCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { logoutAction } from '@/app/actions/auth';
import MediaLibrary from '@/components/MediaLibrary'; 
import DashboardCharts from '@/components/DashboardCharts'; 
import TourForm from '@/components/admin/TourForm'; 
import BlogForm from '@/components/admin/BlogForm'; 
import { performAutoMaintenance, slugify } from '@/lib/admin-helpers';
import { IClient } from '@/types';

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
            onSnapshot(query(collection(db, "reviews"), orderBy("createdAt", "desc")), (snap) => setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            onSnapshot(query(collection(db, "posts"), orderBy("createdAt", "desc")), (snap) => setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            onSnapshot(query(collection(db, "inquiries"), orderBy("createdAt", "desc")), (snap) => setInquiries(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            onSnapshot(query(collection(db, "subscribers"), orderBy("createdAt", "desc")), (snap) => setSubscribers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            onSnapshot(query(collection(db, "customers"), orderBy("createdAt", "desc")), (snap) => setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            onSnapshot(query(collection(db, "campaigns")), (snap) => setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
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
        await updateDoc(doc(db, "inquiries", inq.id), { status: newStatus });
        
        if (newStatus === 'paid') {
            const customersRef = collection(db, "customers");
            let q = query(customersRef, where("phone", "==", inq.clientPhone));
            let snap = await getDocs(q);

            const originalTour = allTours.find(t => t.id === inq.tourId);
            const tourOperator = originalTour?.operator || "Неизвестен";

            const tripData = {
                tourTitle: inq.tourTitle || "Екскурзия",
                date: inq.tourDate || "Не е избрана",
                tourOperator: tourOperator,
                addedAt: new Date().toISOString(),
                feedbackStatus: 'pending'
            };

            if (snap.empty) {
                await addDoc(customersRef, {
                    name: inq.clientName,
                    email: inq.clientEmail || "",
                    phone: inq.clientPhone,
                    totalTrips: 1,
                    tripHistory: [tripData],
                    vipDiscount: 0,
                    createdAt: serverTimestamp()
                });
            } else {
                const custDoc = snap.docs[0];
                await updateDoc(doc(db, "customers", custDoc.id), {
                    tripHistory: [...(custDoc.data().tripHistory || []), tripData],
                    totalTrips: (custDoc.data().totalTrips ?? 0) + 1
                });
            }
        }
    } catch (e) { console.error(e); }
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
        }
        return false;
    });

  const stats = {
    activeTours: allTours.filter((t: any) => t.status === 'public').length,
    newInquiries: inquiries.filter((i: any) => i.status === 'new').length,
    totalCustomers: customers.length,
    totalSubscribers: subscribers.length,
  };

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
                    { id: 'bookings', label: 'Резервации', icon: Inbox },
                    { id: 'customers', label: 'Клиенти (CRM)', icon: UserCheck },
                    { id: 'tours', label: 'Оферти', icon: Map },
                    { id: 'groups', label: 'Минали Групи', icon: Users },
                    { id: 'archived', label: 'Архив', icon: Archive },
                    { id: 'media', label: 'Галерия', icon: ImageIcon },
                    { id: 'promotions', label: 'Промо Кампании', icon: BadgePercent },
                    { id: 'blog', label: 'Блог', icon: BookOpen },
                    { id: 'reviews', label: 'Ревюта', icon: Star },
                    { id: 'subscribers', label: 'Абонати', icon: Users },
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
        {activeTab === 'dashboard' && <div className="space-y-8 animate-in fade-in duration-500"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><StatCard icon={Inbox} color="emerald" count={stats.newInquiries} label="Нови Запитвания" highlight /><StatCard icon={UserCheck} color="blue" count={stats.totalCustomers} label="Клиенти (CRM)" /><StatCard icon={Map} color="orange" count={stats.activeTours} label="Активни Оферти" /><StatCard icon={Users} color="purple" count={stats.totalSubscribers} label="Абонати" /></div><DashboardCharts inquiries={inquiries} tours={allTours} /></div>}

        {activeTab === 'customers' && (
            <>
                <SearchBar value={searchCustomer} onChange={setSearchCustomer} placeholder="Търси в клиентската база..." />
                <div className="grid grid-cols-1 gap-4">
                    {filteredCustomers.map(c => (
                        <div key={c.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-brand-gold/5 flex flex-col md:flex-row justify-between items-center gap-6 hover:shadow-xl hover:-translate-y-1 transition-all">
                            <div className="flex-grow">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-2xl font-bold text-brand-dark">{c.name}</h3>
                                    <button onClick={() => { setEditingCustomer(c); setIsEditCustomerModalOpen(true); }} className="p-2 bg-blue-50 text-blue-500 rounded-full hover:bg-blue-500 hover:text-white transition-all"><Edit2 size={14}/></button>
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-400 font-medium mb-4">
                                    <span className="flex items-center gap-1.5"><Phone size={14} className="text-brand-gold"/> {c.phone}</span>
                                    <span className="flex items-center gap-1.5"><Mail size={14} className="text-brand-gold"/> {c.email || 'Няма имейл'}</span>
                                    {c.vipDiscount > 0 && <span className="bg-brand-gold/10 text-brand-gold px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-gold/20">VIP -{c.vipDiscount}%</span>}
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {c.tripHistory?.map((t: any, i: number) => (
                                        <span key={i} className="bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl text-[9px] font-bold text-gray-400 uppercase flex items-center gap-2">
                                            <span className="text-brand-gold">{t.tourOperator}</span> 
                                            <span className="text-gray-200">|</span> 
                                            {t.tourTitle} ({t.date})
                                        </span>
                                    ))}
                                    <button onClick={() => { setSelectedCustomerForTrip(c); setIsAddTripModalOpen(true); }} className="px-4 py-2 rounded-2xl text-[10px] font-black uppercase bg-brand-gold text-white shadow-lg shadow-brand-gold/20 hover:bg-brand-dark transition-all flex items-center gap-2">+ Добави пътуване</button>
                                </div>
                            </div>
                            <div className="flex items-center gap-8 pl-8 border-l border-gray-100">
                                <div className="text-center min-w-[80px]">
                                    <p className="text-4xl font-black text-brand-dark leading-none">{c.totalTrips ?? 0}</p>
                                    <p className="text-[10px] font-black uppercase text-gray-400 mt-2 tracking-widest">пътувания</p>
                                </div>
                                <button onClick={async () => { if(confirm('Изтриване?')) await deleteDoc(doc(db, "customers", c.id)) }} className="p-4 text-red-400 bg-red-50 rounded-[1.5rem] hover:bg-red-500 hover:text-white transition-all"><Trash2 size={24}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        )}

        {activeTab === 'bookings' && (
            <>
                <SearchBar value={searchInquiry} onChange={setSearchInquiry} placeholder="Търси в резервации..." />
                <div className="space-y-6">
                    {filteredInquiries.map(inq => (
                        <div key={inq.id} className={`bg-white p-8 rounded-[3.5rem] border-0 shadow-[0_15px_40px_rgba(0,0,0,0.03)] transition-all relative overflow-hidden ${inq.status === 'paid' ? 'ring-2 ring-emerald-500/20' : inq.status === 'contacted' ? 'ring-2 ring-blue-500/20' : ''}`}>
                            {inq.status === 'paid' && <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none"><CheckCircle2 size={120} className="text-emerald-500"/></div>}
                            
                            <div className="flex flex-col md:flex-row justify-between gap-10">
                                <div className="flex-grow">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-4 bg-brand-dark text-brand-gold rounded-[1.5rem] shadow-xl"><User size={24}/></div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-2xl font-bold text-brand-dark">{inq.clientName}</h3>
                                                <button onClick={() => { setEditingInquiry(inq); setIsEditInquiryModalOpen(true); }} className="p-2 bg-gray-50 text-gray-400 rounded-full hover:bg-brand-gold hover:text-white transition-all"><Edit2 size={14}/></button>
                                            </div>
                                            <p className="text-sm text-gray-400 font-medium uppercase tracking-widest mt-1">{inq.clientPhone} • {inq.clientEmail}</p>
                                        </div>
                                    </div>
                                    <div className="inline-flex flex-col p-6 bg-[#faf9f6] rounded-[2rem] border border-gray-100 min-w-[300px]">
                                        <div className="flex items-center gap-2 mb-2 text-brand-gold">
                                            <Globe size={16}/>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Избрана Екскурзия</span>
                                        </div>
                                        <p className="text-xl font-bold text-brand-dark">{inq.tourTitle || "Общо запитване"}</p>
                                        <div className="flex items-center gap-2 mt-3 text-gray-400">
                                            <Calendar size={14}/>
                                            <p className="text-sm font-bold uppercase tracking-widest">{inq.tourDate || "Дата не е избрана"}</p>
                                        </div>
                                    </div>
                                    {inq.message && <p className="mt-6 text-gray-500 italic text-sm border-l-4 border-brand-gold/20 pl-6 py-2">"{inq.message}"</p>}
                                </div>

                                <div className="flex flex-col items-end gap-4 min-w-[240px] pt-4">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mr-4">Статус на обработка</label>
                                    <select 
                                        value={inq.status || 'new'} 
                                        onChange={(e) => handleStatusUpdate(inq, e.target.value)}
                                        className={`w-full p-5 rounded-[2rem] text-xs font-black uppercase tracking-[0.15em] border-0 outline-none cursor-pointer shadow-lg transition-all
                                            ${inq.status === 'paid' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 
                                            inq.status === 'deposit' ? 'bg-amber-500 text-white shadow-amber-500/20' : 
                                            inq.status === 'contacted' ? 'bg-blue-500 text-white shadow-blue-500/20' : 
                                            inq.status === 'cancelled' ? 'bg-red-500 text-white shadow-red-500/20' :
                                            'bg-white text-brand-dark'}`}
                                    >
                                        <option value="new">🆕 Ново запитване</option>
                                        <option value="contacted">📞 Свързах се</option>
                                        <option value="deposit">💰 Платено Капаро</option>
                                        <option value="paid">✅ ПЛАТЕНО (Към CRM)</option>
                                        <option value="cancelled">❌ Анулирано</option>
                                    </select>
                                    <div className="flex gap-2 w-full mt-4">
                                        <button className="flex-grow flex items-center justify-center gap-2 p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition-all font-bold text-[10px] uppercase tracking-widest"><FileText size={16}/> Договор</button>
                                        <button onClick={async () => { if(confirm('Изтриване?')) await deleteDoc(doc(db, "inquiries", inq.id)) }} className="p-4 text-red-400 bg-red-50 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        )}

        {/* Останалите табове */}
        {/* ТАБ: АКТИВНИ ОФЕРТИ */}
        {activeTab === 'tours' && (
            <div className="space-y-6 animate-in fade-in">
                <SearchBar value={searchTour} onChange={setSearchTour} placeholder="Търси активна оферта..." />
                <div className="space-y-4">
                    {filteredTours.map((tour: any) => (
                        <div key={tour.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-brand-gold/5 flex flex-col md:flex-row items-center gap-6 hover:shadow-xl transition-all">
                            <img src={tour.img} className="w-24 h-24 rounded-2xl object-cover shadow-sm" alt="" />
                            <div className="flex-grow">
                                <h3 className="font-bold text-brand-dark leading-tight">{tour.title}</h3>
                                <p className="text-xs text-gray-400 mt-1">{tour.country} • {tour.price}</p>
                            </div>
                            <div className="flex gap-2">
                                <ActionBtn icon={Edit2} color="text-blue-500 bg-blue-50" onClick={() => openModal(tour)} />
                                <ActionBtn icon={Copy} color="text-purple-500 bg-purple-50" onClick={() => handleCopyTour(tour)} />
                                <ActionBtn icon={Archive} color="text-orange-500 bg-orange-50" onClick={async () => await updateDoc(doc(db, "tours", tour.id), { status: 'archived' })} />
                                <ActionBtn icon={Trash2} color="text-red-500 bg-red-50" onClick={async () => { if(confirm('Изтриване?')) await deleteDoc(doc(db, "tours", tour.id)) }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* ТАБ: АРХИВ И ЧЕРНОВИ (С ПОД-ТАБОВЕ) */}
        {activeTab === 'archived' && (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex flex-wrap gap-2 bg-white rounded-2xl p-2 shadow-sm border border-gray-100 w-fit mb-4">
                    <button onClick={() => setArchivedSubTab('drafts')} className={`px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${archivedSubTab === 'drafts' ? 'bg-brand-dark text-white shadow-lg' : 'text-gray-400 hover:text-brand-dark hover:bg-gray-50'}`}>Чакащи промени (Чернови/XML)</button>
                    <button onClick={() => setArchivedSubTab('archived')} className={`px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${archivedSubTab === 'archived' ? 'bg-brand-dark text-white shadow-lg' : 'text-gray-400 hover:text-brand-dark hover:bg-gray-50'}`}>Архивирани (Стари)</button>
                </div>
                
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
                                <p className="text-xs text-gray-400 mt-1">{tour.country} • {tour.price}</p>
                            </div>
                            <div className="flex gap-2">
                                <ActionBtn icon={Edit2} color="text-blue-500 bg-blue-50" onClick={() => openModal(tour)} />
                                <ActionBtn icon={CheckCircle2} color="text-emerald-600 bg-emerald-50" onClick={async () => await updateDoc(doc(db, "tours", tour.id), { status: 'public' })} />
                                <ActionBtn icon={Trash2} color="text-red-500 bg-red-50" onClick={async () => { if(confirm('Изтриване завинаги?')) await deleteDoc(doc(db, "tours", tour.id)) }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
        {activeTab === 'media' && <div className="h-[80vh] rounded-[3rem] overflow-hidden border shadow-sm"><MediaLibrary /></div>}
        {activeTab === 'blog' && <><SearchBar value={searchBlog} onChange={setSearchBlog} placeholder="Търси статия..." /><div className="space-y-4 animate-in fade-in">{posts.filter(p => p.title?.toLowerCase().includes(searchBlog.toLowerCase())).map(post => (<div key={post.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-brand-gold/5 flex items-center gap-6 hover:shadow-md transition-shadow"><img src={post.coverImg || post.img} className="w-20 h-20 rounded-2xl object-cover" alt="" /><div className="flex-grow"><h3 className="font-bold text-brand-dark">{post.title}</h3></div><div className="flex gap-2"><ActionBtn icon={Edit2} color="text-blue-500 bg-blue-50" onClick={() => openModal(post)} /><ActionBtn icon={Trash2} color="text-red-500 bg-red-50" onClick={async () => { if(confirm('Изтриване?')) await deleteDoc(doc(db, "posts", post.id)) }} /></div></div>))}</div></>}
        {activeTab === 'subscribers' && <div className="bg-white rounded-[3rem] shadow-xl overflow-hidden border-0"><div className="p-10 bg-gray-50 flex justify-between items-center border-b"><h3 className="text-2xl font-serif italic text-brand-dark">Абонати на бюлетина</h3><button onClick={() => { const csv = subscribers.map(s => s.email).join('\n'); navigator.clipboard.writeText(csv); alert('Копирано!'); }} className="bg-brand-gold text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-dark transition-all shadow-lg shadow-brand-gold/20">Експортирай списъка</button></div><table className="w-full text-left text-sm"><thead className="bg-white text-[10px] uppercase font-black text-gray-400 border-b tracking-widest"><tr><th className="p-10">Имейл Адрес</th><th className="p-10">Дата на записване</th><th className="p-10 text-right">Действие</th></tr></thead><tbody className="divide-y divide-gray-50">{subscribers.map((sub: any) => (<tr key={sub.id} className="hover:bg-gray-50/50 transition-colors"><td className="p-10 font-bold text-brand-dark">{sub.email}</td><td className="p-10 text-gray-400">{sub.createdAt?.seconds ? new Date(sub.createdAt.seconds * 1000).toLocaleDateString('bg-BG') : 'Сега'}</td><td className="p-10 text-right"><button onClick={async () => await deleteDoc(doc(db, "subscribers", sub.id))} className="text-red-400 p-3 bg-red-50 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button></td></tr>))}</tbody></table></div>}
        {/* ТАБ: МИНАЛИ ГРУПИ */}
        {activeTab === 'groups' && (
            <div className="space-y-8 animate-in fade-in">
                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-brand-gold/10">
                    <h2 className="text-2xl font-serif italic text-brand-dark mb-6">Справка: Пътували клиенти</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={labelClass}>Избери Екскурзия</label>
                            <select className={inputClass} value={groupTourId} onChange={e => {setGroupTourId(e.target.value); setGroupDate('');}}>
                                <option value="">-- Всички екскурзии --</option>
                                {allTours.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                            </select>
                        </div>
                        {groupTourId && (
                            <div>
                                <label className={labelClass}>Конкретна дата</label>
                                <select className={inputClass} value={groupDate} onChange={e => setGroupDate(e.target.value)}>
                                    <option value="">-- Избери дата (Задължително) --</option>
                                    {allTours.find(t => t.id === groupTourId)?.historicalDates?.map((d: string) => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {groupTourId && groupDate && (
                    <div className="bg-white p-8 rounded-[3rem] shadow-sm">
                        <h3 className="font-bold text-xl text-brand-dark mb-6">Списък с клиенти:</h3>
                        <div className="space-y-3">
                            {customers.filter(c => c.tripHistory?.some((t:any) => t.tourId === groupTourId && t.date === groupDate)).length === 0 && <p className="text-gray-400">Няма намерени клиенти за тази дата.</p>}
                            {groupTourId && groupDate && (
                    <div className="bg-white p-8 rounded-[3rem] shadow-sm">
                        <h3 className="font-bold text-xl text-brand-dark mb-6">Списък с клиенти:</h3>
                        <div className="space-y-4">
                            {customers.filter(c => c.tripHistory?.some((t:any) => t.tourId === groupTourId && t.date === groupDate)).length === 0 && <p className="text-gray-400">Няма намерени клиенти за тази дата.</p>}
                            {customers.filter(c => c.tripHistory?.some((t:any) => t.tourId === groupTourId && t.date === groupDate)).map(c => {
                                // Намираме конкретното пътуване, за да му вземем уникалното ID
                                const specificTrip = c.tripHistory.find((t:any) => t.tourId === groupTourId && t.date === groupDate);
                                const feedbackLink = `https://belivavip.bg/feedback/${specificTrip.tripId}`;
                                
                                // Генерираме текста за имейла
                                const subject = encodeURIComponent(`Очакваме вашия отзив за ${specificTrip.tourTitle}`);
                                const body = encodeURIComponent(`Здравейте ${c.name},\n\nНадяваме се, че сте си прекарали страхотно на екскурзията до ${specificTrip.tourTitle}!\n\nЩе се радваме да отделите минутка и да споделите вашите впечатления тук:\n${feedbackLink}\n\nПоздрави,\nЕкипът на Beliva VIP Tour`);
                                
                                // Специален линк за директно отваряне на GMAIL в браузъра
                                const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${c.email}&su=${subject}&body=${body}`;

                                return (
                                <div key={c.id} className="p-5 bg-gray-50 rounded-[2rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-gray-100 hover:shadow-md transition-all">
                                    <div>
                                        <p className="font-bold text-brand-dark flex items-center gap-2 text-lg">
                                            {c.name}
                                            {specificTrip.feedbackStatus === 'completed' && <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[9px] uppercase tracking-widest font-black">Оставил отзив</span>}
                                        </p>
                                        <p className="text-xs text-gray-500 font-medium mt-1">{c.phone} • {c.email || 'Няма имейл'}</p>
                                    </div>
                                    <div className="flex gap-3 items-center w-full md:w-auto">
                                        {/* Ако клиентът все още не е оставил отзив, показваме бутона за имейл */}
                                        {specificTrip.feedbackStatus !== 'completed' && (
                                            c.email ? (
                                                <a href={gmailLink} target="_blank" rel="noopener noreferrer" className="flex-grow md:flex-grow-0 text-center bg-brand-dark text-white px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-gold transition-all shadow-lg">
                                                    📩 Прати през Gmail
                                                </a>
                                            ) : (
                                                <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest bg-red-50 px-4 py-3 rounded-xl">Няма Имейл</span>
                                            )
                                        )}
                                        <button onClick={() => { setEditingCustomer(c); setIsEditCustomerModalOpen(true); }} className="text-brand-gold text-xs font-bold uppercase hover:underline p-2">Профил</button>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>
                )}
                        </div>
                    </div>
                )}
            </div>
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
                              // Търсачка по държава
                              if (tripSearchCountry && !t.country.toLowerCase().includes(tripSearchCountry.toLowerCase())) return false;
                              
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-dark/95 backdrop-blur-sm">
           <div className="bg-white w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-[4rem] p-12 relative shadow-2xl border border-white/10 animate-in zoom-in duration-300">
              <button onClick={() => {setIsModalOpen(false); setEditingItem(null)}} className="absolute top-8 right-8 p-3 bg-gray-50 text-gray-400 rounded-full hover:bg-red-50 hover:text-white transition-all shadow-lg active:scale-90 z-50"><X size={24}/></button>
              {(activeTab === 'tours' || activeTab === 'archived') && <TourForm initialData={editingItem} onClose={() => setIsModalOpen(false)} allTours={allTours} allCampaigns={campaigns} />}
              {activeTab === 'blog' && <BlogForm initialData={editingItem} onClose={() => setIsModalOpen(false)} availableCountries={Array.from(new Set(allTours.map((t: any) => t.country))).sort()} />}
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