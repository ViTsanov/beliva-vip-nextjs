"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { PlusCircle, Minus, X, Info, Globe, Tag, Bed, MapPin, FileText, ListChecks } from 'lucide-react';
import MediaLibrary from '@/components/MediaLibrary';
import { slugify } from '@/lib/admin-helpers';

// ПОМОЩЕН КОМПОНЕНТ ЗА СПИСЪЦИ (Тагове)
const TagsInput = ({ tags, setTags, placeholder, label }: any) => {
    const handleKeyDown = (e: any) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = e.target.value.trim();
            if (val && !tags.includes(val)) {
                setTags([...tags, val]);
                e.target.value = '';
            }
        }
    };
    const removeTag = (idx: number) => {
        setTags(tags.filter((_: any, i: number) => i !== idx));
    };

    return (
        <div>
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.15em] ml-2 mb-2 block">{label}</label>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-2 flex flex-wrap gap-2 items-center focus-within:bg-white focus-within:border-brand-gold transition-all">
                {tags.map((tag: string, idx: number) => (
                    <span key={idx} className="bg-brand-dark text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2">
                        {tag} <button type="button" onClick={() => removeTag(idx)} className="text-gray-400 hover:text-white"><X size={12}/></button>
                    </span>
                ))}
                <input 
                    type="text" 
                    placeholder={tags.length === 0 ? placeholder : "Добави още (натисни Enter)..."} 
                    onKeyDown={handleKeyDown}
                    className="flex-grow bg-transparent outline-none min-w-[150px] p-2 text-sm text-brand-dark"
                />
            </div>
            <p className="text-[10px] text-gray-400 mt-1 ml-2">Натисни Enter след всяко въвеждане.</p>
        </div>
    );
};

export default function TourForm({ initialData, onClose, allTours, allCampaigns }: any) {
  const [form, setForm] = useState({
    tourId: '', title: '', price: '', country: '', continent: 'Европа', cities: '', landmarks: '', 
    date: '', dates: [] as string[], img: '', duration: '', nights: '', route: '', 
    groupStatus: 'active', status: 'public',
    
    included: '', notIncluded: '', documents: '', pdfUrl: '', generalInfo: '', intro: '', images: '', categories: [] as string[],
    
    // CRM & АВТОМАТИЗАЦИЯ
    operator: 'Beliva VIP', 
    durationDays: '',      
    
    // ПРОМО ПОЛЕТА
    isPromo: false, 
    discountAmount: '', 
    discountPrice: '', 
    promoLabel: 'ПРОМОЦИЯ',
    promoBgColor: '#dc2626', 
    promoTextColor: '#ffffff', 
    
    ...initialData,
    ...(initialData?.date ? { date: initialData.date.split('-').reverse().join('-') } : {})
  });
  
  const [itinerary, setItinerary] = useState<{day: number, title: string, content: string}[]>(
    initialData?.itinerary || [{ day: 1, title: '', content: '' }]
  );
  
  const [tempDate, setTempDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [mediaField, setMediaField] = useState<'img' | 'images'>('img');

  // АВТОМАТИЧНО ПРЕСМЯТАНЕ НА ОТСТЪПКАТА
  useEffect(() => {
    if (form.isPromo && form.price && form.discountAmount) {
      const numericPrice = parseFloat(form.price.replace(/[^\d.-]/g, ''));
      const numericDiscount = parseFloat(form.discountAmount);
      const currencyMatch = form.price.match(/[^\d.\s,-]+/);
      const currency = currencyMatch ? currencyMatch[0] : '€';

      if (!isNaN(numericPrice) && !isNaN(numericDiscount)) {
        const calculated = numericPrice - numericDiscount;
        setForm((prev: any) => ({ ...prev, discountPrice: `${calculated} ${currency}` }));
      }
    }
  }, [form.price, form.discountAmount, form.isPromo]);

  // ГЕНЕРИРАНЕ НА ID
  useEffect(() => {
    if (!initialData && form.country && form.dates.length > 0) {
        const countrySlug = slugify(form.country);
        const firstDate = [...form.dates].sort()[0];
        const [year, month] = firstDate.split('-');
        const prefix = `${countrySlug}-${month}-${year}-`;
        const existing = allTours.filter((t: any) => t.tourId?.startsWith(prefix));
        setForm((prev: any) => ({ ...prev, tourId: prefix + (existing.length + 1) }));
    }
  }, [form.country, form.dates, initialData, allTours]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        const sortedDates = [...form.dates].sort();
        const mainDateFormatted = sortedDates[0]?.split('-').reverse().join('-');
        const data = { ...form, date: mainDateFormatted, dates: sortedDates, itinerary, updatedAt: serverTimestamp() };
        if (initialData?.id) await updateDoc(doc(db, "tours", initialData.id), data);
        else await addDoc(collection(db, "tours"), { ...data, createdAt: serverTimestamp() });
        onClose();
    } catch (error) { alert("Грешка при запис"); } finally { setIsSubmitting(false); }
  };

  const handleMediaSelect = (url: string) => {
      if (mediaField === 'img') setForm({...form, img: url});
      else setForm({...form, images: form.images ? form.images + ', ' + url : url});
      setShowMedia(false);
  };

  const removeMainImage = () => setForm({...form, img: ''});
  const galleryImages = form.images ? form.images.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  const removeGalleryImage = (indexToRemove: number) => {
      const newImages = galleryImages.filter((_: string, idx: number) => idx !== indexToRemove).join(', ');
      setForm({...form, images: newImages});
  };

  const inputStyle = "w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/5 outline-none transition-all text-brand-dark font-medium";
  const labelStyle = "block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2";

  return (
    <>
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto pb-32 space-y-10 relative pt-4 text-left">
        
        <div className="flex justify-between items-end border-b border-gray-100 pb-8">
            <div>
                <h2 className="text-4xl font-serif italic text-brand-dark">{initialData ? 'Редактиране' : 'Създаване'} на екскурзия</h2>
                <p className="text-gray-400 text-sm mt-2 font-medium">Beliva Admin Content Management • {form.tourId || 'NEW_ID'}</p>
            </div>
        </div>

        {/* СЕКЦИЯ 1: ГЕНЕРАЛНА ИНФОРМАЦИЯ */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center gap-3 mb-4 text-brand-gold">
                <Globe size={20}/> <h3 className="font-bold uppercase tracking-widest text-sm">Обща информация</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <label className={labelStyle}>Заглавие на офертата *</label>
                    <input className={`${inputStyle} text-lg font-bold`} value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                </div>
                <div>
                    <label className={labelStyle}>Туроператор / Партньор *</label>
                    <select className={inputStyle} value={form.operator} onChange={e => setForm({...form, operator: e.target.value})} required>
                        <option value="Beliva VIP">Beliva VIP (Собствена)</option>
                        <option value="Abax">Абакс</option>
                        <option value="Equator">Екватор</option>
                        <option value="Tez Tour">Тез Тур</option>
                        <option value="Emerald">Емералд</option>
                        <option value="Other">Друг</option>
                    </select>
                </div>
                <div>
                    <label className={labelStyle}>Продължителност (дни) *</label>
                    <input type="number" className={inputStyle} value={form.durationDays} onChange={e => setForm({...form, durationDays: e.target.value})} required placeholder="пр. 8" />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* НОВОТО ПОЛЕ ЗА ДЪРЖАВИ (Възможност за повече от една) */}
<TagsInput 
    label="Държави (може и повече от една)" 
    placeholder="пр. Япония" 
    tags={Array.isArray(form.country) ? form.country : (form.country ? [form.country] : [])} 
    setTags={(newTags: string[]) => setForm({...form, country: newTags})} 
/>

{/* НОВО ПОЛЕ ЗА ГРАДОВЕ / ЗАБЕЛЕЖИТЕЛНОСТИ */}
<div className="md:col-span-2">
    <TagsInput 
        label="Посетени градове и Забележителности" 
        placeholder="пр. Токио, Киото, Осака..." 
        tags={form.visitedPlaces || []} 
        setTags={(newTags: string[]) => setForm({...form, visitedPlaces: newTags})} 
    />
</div>
                <div><label className={labelStyle}>Континент *</label><select className={inputStyle} value={form.continent} onChange={e => setForm({...form, continent: e.target.value})} required><option value="Европа">Европа</option><option value="Азия">Азия</option><option value="Африка">Африка</option><option value="Австралия">Австралия</option><option value="Северна Америка">Северна Америка</option><option value="Южна Америка">Южна Америка</option></select></div>
                <div><label className={labelStyle}>Нощувки (текст)</label><input className={inputStyle} placeholder="пр. 7 нощувки" value={form.nights} onChange={e => setForm({...form, nights: e.target.value})} /></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                <div><label className={labelStyle}>Посещавани градове</label><input className={inputStyle} placeholder="пр. Рим, Флоренция, Венеция" value={form.cities} onChange={e => setForm({...form, cities: e.target.value})} /></div>
                <div><label className={labelStyle}>Маршрут (текст)</label><input className={inputStyle} placeholder="пр. София - Рим - София" value={form.route} onChange={e => setForm({...form, route: e.target.value})} /></div>
                <div className="md:col-span-2"><label className={labelStyle}>Основни забележителности</label><input className={inputStyle} placeholder="пр. Колизеум, Ватикана, Пантеон" value={form.landmarks} onChange={e => setForm({...form, landmarks: e.target.value})} /></div>
            </div>
        </div>

        {/* СЕКЦИЯ 2: ЦЕНИ И ПРОМОЦИИ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6 text-brand-gold"><Tag size={20}/> <h3 className="font-bold uppercase tracking-widest text-sm">Цена и Статус</h3></div>
                <div className="space-y-6">
                    <div><label className={labelStyle}>Редовна Цена *</label><input className={`${inputStyle} text-xl font-black text-brand-gold`} value={form.price} onChange={e => setForm({...form, price: e.target.value})} required /></div>
                    <div><label className={labelStyle}>Група</label><select className={inputStyle} value={form.groupStatus} onChange={e => setForm({...form, groupStatus: e.target.value})}><option value="active">🟢 Оформяща се</option><option value="confirmed">🔵 Потвърдена</option><option value="last-places">🟠 Последни места</option><option value="sold-out">🔴 Изчерпана</option></select></div>
                    <div><label className={labelStyle}>Видимост</label><select className={inputStyle} value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="public">👁️ Публична</option><option value="draft">🚫 Скрита</option><option value="archived">📦 В Архив</option></select></div>
                </div>
            </div>

            {/* 👇 НОВАТА СИСТЕМА С КАМПАНИИ 👇 */}
            <div className={`p-8 rounded-[2.5rem] border-2 transition-all ${form.campaignId ? 'bg-red-50/50 border-red-200 shadow-md' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-6 text-red-600"><Tag size={20}/> <h3 className="font-bold uppercase tracking-widest text-sm">Свържи с Кампания</h3></div>
                <div className="space-y-6">
                    <div>
                        <label className={labelStyle}>Избери активна кампания</label>
                        <select className={inputStyle} value={form.campaignId || ''} onChange={e => {
                            const camp = allCampaigns?.find((c: any) => c.id === e.target.value);
                            if (camp) {
                                setForm({...form, campaignId: camp.id, isPromo: true, promoStart: camp.startDate, promoEnd: camp.endDate, promoLabel: camp.label, promoBgColor: camp.bgColor, promoTextColor: camp.textColor, promoEffect: camp.effect});
                            } else {
                                setForm({...form, campaignId: '', isPromo: false});
                            }
                        }}>
                            <option value="">-- Без промоция --</option>
                            {allCampaigns?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {form.campaignId && (
                        <div className="animate-in fade-in zoom-in duration-300">
                            <label className={labelStyle}>Отстъпка за ТАЗИ екскурзия (число в Евро)</label>
                            <input type="number" className={inputStyle} value={form.discountAmount} onChange={e => setForm({...form, discountAmount: e.target.value})} />
                            
                            <div className="bg-red-600 text-white p-6 rounded-2xl text-center shadow-lg mt-4">
                                <p className="text-[10px] uppercase font-black tracking-[0.2em] opacity-80">Нова Промо Цена</p>
                                <p className="text-3xl font-black">{form.discountPrice || '-'}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* СЕКЦИЯ 3: ПОДРОБНИ ТЕКСТОВЕ */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-8">
            <div className="flex items-center gap-3 mb-2 text-brand-gold">
                <FileText size={20}/> <h3 className="font-bold uppercase tracking-widest text-sm">Подробно описание</h3>
            </div>
            
            <div><label className={labelStyle}>Кратко интро (под заглавието в сайта)</label><textarea className={`${inputStyle} h-24`} value={form.intro} onChange={e => setForm({...form, intro: e.target.value})} /></div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-50">
                <div><label className={`${labelStyle} text-emerald-600`}>Цената ВКЛЮЧВА</label><textarea className={`${inputStyle} h-48 border-emerald-100 bg-emerald-50/20`} placeholder="По една точка на нов ред..." value={form.included} onChange={e => setForm({...form, included: e.target.value})} /></div>
                <div><label className={`${labelStyle} text-rose-600`}>Цената НЕ ВКЛЮЧВА</label><textarea className={`${inputStyle} h-48 border-rose-100 bg-rose-50/20`} placeholder="По една точка на нов ред..." value={form.notIncluded} onChange={e => setForm({...form, notIncluded: e.target.value})} /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div><label className={labelStyle}>Необходими документи</label><textarea className={`${inputStyle} h-32`} value={form.documents} onChange={e => setForm({...form, documents: e.target.value})} /></div>
                <div><label className={labelStyle}>Обща информация / Допълнителни условия</label><textarea className={`${inputStyle} h-32`} value={form.generalInfo} onChange={e => setForm({...form, generalInfo: e.target.value})} /></div>
            </div>
        </div>

        {/* СЕКЦИЯ 4: СНИМКИ */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <h3 className="font-bold uppercase tracking-widest text-sm text-brand-gold mb-6">Снимки и Галерия</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <label className={labelStyle}>Главна снимка (Preview) *</label>
                    {form.img ? (
                        <div className="relative group"><img src={form.img} className="h-48 w-full object-cover rounded-3xl shadow-md border" /><button type="button" onClick={removeMainImage} className="absolute top-4 right-4 bg-white/90 text-red-500 p-2 rounded-full shadow-xl hover:bg-red-500 hover:text-white transition-all"><X size={20}/></button></div>
                    ) : (
                        <button type="button" onClick={() => {setMediaField('img'); setShowMedia(true)}} className="w-full py-12 border-2 border-dashed border-gray-200 rounded-3xl text-gray-400 font-bold hover:border-brand-gold hover:text-brand-gold transition-all">+ Избери снимка</button>
                    )}
                 </div>
                 <div className="space-y-4">
                    <label className={labelStyle}>Галерия на екскурзията</label>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                        {galleryImages.map((url: string, idx: number) => (
                            <div key={idx} className="relative group"><img src={url} className="h-20 w-full object-cover rounded-xl border shadow-sm" /><button type="button" onClick={() => removeGalleryImage(idx)} className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full p-1 shadow-md border"><X size={10}/></button></div>
                        ))}
                    </div>
                    <button type="button" onClick={() => {setMediaField('images'); setShowMedia(true)}} className="w-full py-4 border-2 border-gray-200 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-gray-50">+ Добави към галерия</button>
                 </div>
            </div>
        </div>

        {/* СЕКЦИЯ 5: ДАТИ */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <h3 className="font-bold uppercase tracking-widest text-sm text-brand-gold mb-6">Дати на заминаване</h3>
            <div className="flex gap-4 mb-6">
                <input type="date" className={inputStyle} value={tempDate} onChange={e => setTempDate(e.target.value)} />
                <button type="button" onClick={() => {if(tempDate && !form.dates.includes(tempDate)) setForm({...form, dates: [...form.dates, tempDate]})}} className="bg-brand-dark text-white px-8 rounded-2xl font-bold uppercase text-xs hover:bg-brand-gold transition-all">Добави дата</button>
            </div>
            <div className="flex flex-wrap gap-2 p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                {form.dates.length === 0 && <p className="text-gray-400 text-sm font-medium">Няма добавени дати.</p>}
                {form.dates.map((d: string) => (
                    <span key={d} className="bg-white border px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-3 shadow-sm group">
                        {d.split('-').reverse().join('.')}
                        <button type="button" onClick={() => setForm({...form, dates: form.dates.filter((x:string) => x !== d)})} className="text-red-400 hover:text-red-600 transition-colors"><X size={16}/></button>
                    </span>
                ))}
            </div>
        </div>

        {/* СЕКЦИЯ 6: ПРОГРАМА */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <h3 className="font-bold uppercase tracking-widest text-sm text-brand-gold mb-6">Програма по дни</h3>
            <div className="space-y-6">
                {itinerary.map((day: any, i: number) => (
                    <div key={i} className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 relative shadow-inner">
                        <button type="button" onClick={() => setItinerary(itinerary.filter((_, idx) => idx !== i))} className="absolute top-6 right-6 text-red-400 hover:text-red-600 p-2 bg-white rounded-full shadow-sm"><Minus size={20}/></button>
                        <p className="font-black text-brand-gold mb-4 uppercase tracking-[0.2em] text-[10px]">Ден {i+1}</p>
                        <input placeholder="Заглавие на деня (пр. Пристигане и настаняване)" className={`${inputStyle} mb-4 bg-white`} value={day.title} onChange={e => {const n = [...itinerary]; n[i].title = e.target.value; setItinerary(n)}} />
                        <textarea placeholder="Подробно описание на деня..." className={`${inputStyle} h-32 bg-white`} value={day.content} onChange={e => {const n = [...itinerary]; n[i].content = e.target.value; setItinerary(n)}} />
                    </div>
                ))}
                <button type="button" onClick={() => setItinerary([...itinerary, { day: itinerary.length + 1, title: '', content: '' }])} className="w-full py-6 border-2 border-dashed border-brand-gold text-brand-gold rounded-[2rem] font-black uppercase tracking-widest hover:bg-brand-gold hover:text-white transition-all shadow-lg shadow-brand-gold/10">+ Добави следващ ден</button>
            </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t z-50 flex justify-center shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
            <button type="submit" disabled={isSubmitting} className="w-full max-w-5xl bg-brand-dark text-white py-6 rounded-3xl font-black text-xl uppercase tracking-[0.2em] hover:bg-brand-gold transition-all shadow-2xl active:scale-95">
                {isSubmitting ? 'Записване...' : 'Запази Екскурзията'}
            </button>
        </div>
    </form>

    {showMedia && (
        <div className="fixed inset-0 z-[250] bg-brand-dark/95 flex items-center justify-center p-6 backdrop-blur-md">
            <div className="bg-white w-full max-w-6xl h-[85vh] rounded-[4rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in duration-300">
                <div className="p-8 border-b flex justify-between items-center">
                    <h3 className="font-serif italic text-2xl">Медийна Библиотека</h3>
                    <button onClick={() => setShowMedia(false)} className="p-3 bg-gray-50 rounded-full text-red-500 hover:bg-red-50 transition-colors"><X size={24}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-8"><MediaLibrary onSelect={handleMediaSelect} onClose={() => setShowMedia(false)} /></div>
            </div>
        </div>
    )}
    </>
  );
}