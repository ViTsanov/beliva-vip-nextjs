"use client";

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  LayoutDashboard, Image as ImageIcon, Map, Archive, BookOpen, Star, Inbox, Users, LogOut, 
  Menu, X, Edit2, Copy, Trash2, CheckCircle2, Eye, EyeOff
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Компоненти (Ще трябва да ги преместиш/създадеш, ако ги нямаш)
import MediaLibrary from '@/components/MediaLibrary'; 
import DashboardCharts from '@/components/DashboardCharts'; 
import TourForm from '@/components/admin/TourForm'; // 👇 НОВА ФОРМА
import BlogForm from '@/components/admin/BlogForm'; // 👇 НОВА ФОРМА
import { performAutoMaintenance, slugify } from '@/lib/admin-helpers';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [allTours, setAllTours] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [maintenanceDone, setMaintenanceDone] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null); // Пазим целия обект за редакция

  const router = useRouter();

  // --- DATA FETCHING ---
  useEffect(() => {
    const unsubTours = onSnapshot(query(collection(db, "tours"), orderBy("createdAt", "desc")), (snap) => setAllTours(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubReviews = onSnapshot(query(collection(db, "reviews"), orderBy("createdAt", "desc")), (snap) => setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubPosts = onSnapshot(query(collection(db, "posts"), orderBy("createdAt", "desc")), (snap) => setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubInquiries = onSnapshot(query(collection(db, "inquiries"), orderBy("createdAt", "desc")), (snap) => setInquiries(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubSubscribers = onSnapshot(query(collection(db, "subscribers"), orderBy("createdAt", "desc")), (snap) => setSubscribers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    return () => { unsubTours(); unsubReviews(); unsubPosts(); unsubInquiries(); unsubSubscribers(); };
  }, []);

  // Auto Maintenance
  useEffect(() => { 
    if (allTours.length > 0 && !maintenanceDone) { 
        performAutoMaintenance(allTours); 
        setMaintenanceDone(true); 
    } 
  }, [allTours, maintenanceDone]);

  // Actions
  const handleLogout = async () => { await signOut(auth); router.push('/'); };
  
  const handleCopyTour = async (tour: any) => {
    const { id, ...data } = tour; 
    const countrySlug = slugify(data.country);
    // Генериране на ново ID (опростено)
    const newTourId = `${countrySlug}-${Date.now()}`; 

    await addDoc(collection(db, "tours"), {
      ...data, tourId: newTourId, title: `${data.title} (Копие)`, status: 'archived', createdAt: serverTimestamp()
    });
    alert('Копирано в Архив!');
  };

  const openModal = (item: any = null) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  // Stats
  const stats = {
    activeTours: allTours.filter((t: any) => t.status === 'public').length,
    newInquiries: inquiries.filter((i: any) => i.status === 'new').length,
    totalSubscribers: subscribers.length,
    totalPosts: posts.length,
  };

  const filteredTours = allTours.filter((t: any) => activeTab === 'archived' ? t.status === 'archived' : t.status !== 'archived');

  return (
    <div className="flex min-h-screen bg-[#fcfaf7] text-left">
      
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-brand-dark text-white p-8 shadow-2xl flex flex-col justify-between transform transition-transform duration-300 lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         <div>
            <div className="flex justify-between items-center mb-10">
                <span className="text-2xl font-serif italic font-bold text-brand-gold">Beliva Admin</span>
                <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden"><X size={24}/></button>
            </div>
            <nav className="space-y-2">
                {[
                    { id: 'dashboard', label: 'Табло', icon: LayoutDashboard },
                    { id: 'media', label: 'Галерия', icon: ImageIcon },
                    { id: 'tours', label: 'Оферти', icon: Map },
                    { id: 'archived', label: 'Архив', icon: Archive },
                    { id: 'blog', label: 'Блог', icon: BookOpen },
                    { id: 'reviews', label: 'Ревюта', icon: Star },
                    { id: 'inquiries', label: 'Запитвания', icon: Inbox },
                    { id: 'subscribers', label: 'Абонати', icon: Users },
                ].map(item => (
                    <button key={item.id} onClick={() => {setActiveTab(item.id); setIsSidebarOpen(false)}} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-colors ${activeTab === item.id ? 'bg-brand-gold text-brand-dark font-bold' : 'text-gray-400 hover:text-white'}`}>
                        <item.icon size={20}/> {item.label}
                    </button>
                ))}
            </nav>
         </div>
         <button onClick={handleLogout} className="flex items-center gap-4 px-6 py-4 text-red-400 hover:text-red-300"><LogOut size={20} /> Изход</button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-grow p-4 md:p-8 lg:p-12 w-full overflow-hidden">
        <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-10 gap-4">
           <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-white rounded-xl shadow-sm border"><Menu size={24} /></button>
              <h1 className="text-2xl md:text-3xl font-serif italic text-brand-dark uppercase tracking-widest">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h1>
           </div>
           {(activeTab === 'tours' || activeTab === 'blog') && (
              <button onClick={() => openModal()} className="bg-brand-dark text-white px-8 py-4 rounded-2xl font-bold uppercase text-xs shadow-lg">
                  + Добави {activeTab === 'blog' ? 'Статия' : 'Екскурзия'}
              </button>
           )}
        </header>

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
           <div className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   <StatCard icon={Map} color="blue" count={stats.activeTours} label="Активни Оферти" />
                   <StatCard icon={Inbox} color="emerald" count={stats.newInquiries} label="Нови Запитвания" highlight />
                   <StatCard icon={Users} color="purple" count={stats.totalSubscribers} label="Абонати" />
                   <StatCard icon={BookOpen} color="orange" count={stats.totalPosts} label="Статии" />
               </div>
               <DashboardCharts inquiries={inquiries} tours={allTours} />
           </div>
        )}

        {/* MEDIA */}
        {activeTab === 'media' && <div className="h-[80vh]"><MediaLibrary /></div>}

        {/* TOURS LIST */}
        {(activeTab === 'tours' || activeTab === 'archived') && (
            <div className="space-y-4">
                {filteredTours.map((tour: any) => (
                    <div key={tour.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-brand-gold/5 flex flex-col md:flex-row items-center gap-6">
                        <img src={tour.img} className="w-full md:w-24 h-40 md:h-24 rounded-2xl object-cover bg-gray-100" alt="" />
                        <div className="flex-grow w-full">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-bold text-brand-dark">{tour.title}</h3>
                                <StatusBadge status={tour.groupStatus} />
                            </div>
                            <p className="text-xs text-gray-400">ID: {tour.tourId} • {tour.country}</p>
                        </div>
                        <div className="flex gap-2">
                            <ActionBtn icon={Edit2} color="text-blue-500" onClick={() => openModal(tour)} />
                            <ActionBtn icon={Copy} color="text-purple-500" onClick={() => handleCopyTour(tour)} />
                            <ActionBtn 
                                icon={tour.status === 'archived' ? CheckCircle2 : Archive} 
                                color={tour.status === 'archived' ? 'text-green-500' : 'text-orange-500'} 
                                onClick={async () => await updateDoc(doc(db, "tours", tour.id), { status: tour.status === 'archived' ? 'public' : 'archived' })} 
                            />
                            <ActionBtn icon={Trash2} color="text-red-500" onClick={async () => { if(confirm('Изтриване?')) await deleteDoc(doc(db, "tours", tour.id)) }} />
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* BLOG LIST */}
        {activeTab === 'blog' && (
            <div className="space-y-4">
                {posts.map(post => (
                    <div key={post.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-brand-gold/5 flex items-center gap-6">
                         <img src={post.coverImg} className="w-20 h-20 rounded-2xl object-cover" alt="" />
                         <div className="flex-grow">
                             <h3 className="font-bold text-brand-dark">{post.title}</h3>
                         </div>
                         <div className="flex gap-2">
                             <ActionBtn icon={Edit2} color="text-blue-500" onClick={() => openModal(post)} />
                             <ActionBtn icon={Trash2} color="text-red-500" onClick={async () => { if(confirm('Изтриване?')) await deleteDoc(doc(db, "posts", post.id)) }} />
                         </div>
                    </div>
                ))}
            </div>
        )}
        
        {/* INQUIRIES LIST (Опростена версия за пример) */}
        {activeTab === 'inquiries' && (
             <div className="bg-white rounded-[2rem] shadow p-6">
                 {inquiries.map(inq => (
                     <div key={inq.id} className="p-4 border-b flex justify-between items-center">
                         <div>
                             <p className="font-bold">{inq.clientName} <span className="text-gray-400 text-xs font-normal">({inq.clientEmail})</span></p>
                             <p className="text-xs text-brand-gold">Относно: {inq.tourTitle}</p>
                         </div>
                         <div className="flex gap-2">
                            <select 
                                value={inq.status || 'new'} 
                                onChange={async (e) => await updateDoc(doc(db, "inquiries", inq.id), { status: e.target.value })}
                                className="text-xs border rounded p-1"
                            >
                                <option value="new">Ново</option>
                                <option value="contacted">Свързано</option>
                            </select>
                            <button onClick={async () => await deleteDoc(doc(db, "inquiries", inq.id))} className="text-red-500"><Trash2 size={16}/></button>
                         </div>
                     </div>
                 ))}
             </div>
        )}

        {/* --- СЕКЦИЯ АБОНАТИ --- */}
        {activeTab === 'subscribers' && (
             <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-brand-gold/5">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="font-bold text-lg text-brand-dark">Списък с имейли</h3>
                        <p className="text-xs text-gray-500">Общо: {subscribers.length}</p>
                    </div>
                    
                    <button 
                        onClick={() => {
                        // 1. Създаваме заглавен ред за Brevo
                            const header = "EMAIL,DATE_ADDED";
        
                            // 2. Форматираме всеки ред: email, YYYY-MM-DD
                            const rows = subscribers.map(s => {
                                const date = s.createdAt?.seconds 
                                ? new Date(s.createdAt.seconds * 1000).toISOString().split('T')[0] // Формат 2023-12-31
                                : new Date().toISOString().split('T')[0];
                                return `${s.email},${date}`;
                            });

                             // 3. Слепваме всичко
                            const csv = [header, ...rows].join('\n');
        
                            navigator.clipboard.writeText(csv);
                            alert('Списъкът е копиран във формат за Brevo (Email + Дата)!');
                            }}
                        className="bg-brand-gold text-white px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-brand-dark transition-colors"
                        >
                        Копирай за Brevo
                    </button>
                </div>

                {subscribers.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">Няма записани абонати.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white text-[10px] uppercase font-black text-gray-400 border-b">
                                <tr>
                                    <th className="p-4">Имейл</th>
                                    <th className="p-4">Дата</th>
                                    <th className="p-4 text-right">Действие</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {subscribers.map((sub: any) => (
                                    <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-bold text-brand-dark">{sub.email}</td>
                                        <td className="p-4 text-gray-500">
                                            {/* Защита, ако датата още не е записана от сървъра */}
                                            {sub.createdAt?.seconds 
                                                ? new Date(sub.createdAt.seconds * 1000).toLocaleDateString('bg-BG') 
                                                : 'Сега'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={async () => { 
                                                    if(confirm('Изтриване на този абонат?')) await deleteDoc(doc(db, "subscribers", sub.id)) 
                                                }} 
                                                className="text-red-400 hover:text-red-600 bg-red-50 p-2 rounded-lg"
                                                title="Изтрий"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
             </div>
        )}

        {/* --- СЕКЦИЯ РЕВЮТА (Ако искаш да я имаш и нея работеща) --- */}
        {activeTab === 'reviews' && (
             <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-brand-gold/5 p-6">
                 <h3 className="font-bold text-lg text-brand-dark mb-4">Клиентски отзиви</h3>
                 {reviews.length === 0 ? (
                     <div className="text-gray-400 text-center py-10">Няма добавени отзиви.</div>
                 ) : (
                     <div className="space-y-4">
                         {reviews.map((r: any) => (
                             <div key={r.id} className="border border-gray-100 p-4 rounded-xl flex justify-between items-start">
                                 <div>
                                     <p className="font-bold text-brand-dark">{r.name}</p>
                                     <p className="text-sm text-gray-600 italic">"{r.text}"</p>
                                 </div>
                                 <button onClick={async () => await deleteDoc(doc(db, "reviews", r.id))} className="text-red-400"><Trash2 size={16}/></button>
                             </div>
                         ))}
                     </div>
                 )}
                 {/* Тук може да добавиш форма за добавяне на ревюта по-късно */}
                 <p className="text-xs text-gray-400 mt-4 text-center">За да добавиш ревюта, трябва да създадем форма за тях.</p>
             </div>
        )}

      </main>

      {/* MODALS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-dark/95 backdrop-blur-sm">
           <div className="bg-white w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-[3rem] p-6 md:p-12 relative shadow-2xl">
              <button onClick={() => {setIsModalOpen(false); setEditingItem(null)}} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full"><X size={24}/></button>
              
              {(activeTab === 'tours' || activeTab === 'archived') && (
                  <TourForm 
                      initialData={editingItem} 
                      onClose={() => {setIsModalOpen(false); setEditingItem(null)}} 
                      allTours={allTours}
                  />
              )}

              {activeTab === 'blog' && (
                  <BlogForm 
                      initialData={editingItem}
                      onClose={() => {setIsModalOpen(false); setEditingItem(null)}} 
                      availableCountries={Array.from(new Set(allTours.map((t: any) => t.country))).sort()}
                  />
              )}
           </div>
        </div>
      )}
    </div>
  );
}

// Helper Components за по-чист код
const StatCard = ({ icon: Icon, color, count, label, highlight }: any) => (
    <div className={`bg-white p-8 rounded-[2rem] shadow-sm border ${highlight && count > 0 ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-brand-gold/5'}`}>
        <div className="flex items-center justify-between mb-4">
            <div className={`bg-${color}-50 p-3 rounded-full text-${color}-600`}><Icon size={24}/></div>
            <span className="text-3xl font-black text-brand-dark">{count}</span>
        </div>
        <p className="text-xs font-bold uppercase text-gray-400">{label}</p>
    </div>
);

const ActionBtn = ({ icon: Icon, color, onClick }: any) => (
    <button onClick={onClick} className={`p-2 rounded-lg hover:bg-gray-100 ${color}`}><Icon size={18}/></button>
);

const StatusBadge = ({ status }: { status: string }) => {
    const colors: any = { 'confirmed': 'bg-emerald-100 text-emerald-700', 'last-places': 'bg-amber-100 text-amber-700', 'sold-out': 'bg-rose-100 text-rose-700' };
    return <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
};