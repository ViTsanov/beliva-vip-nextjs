"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { PlusCircle, Minus, X } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import FileUpload from '@/components/FileUpload';
import MediaLibrary from '@/components/MediaLibrary';
import { slugify } from '@/lib/admin-helpers';

export default function TourForm({ initialData, onClose, allTours }: any) {
  // 1. ОПРАВЯНЕ НА ГРЕШКАТА С ДУБЛИРАНИТЕ СВОЙСТВА
  const [form, setForm] = useState({
    tourId: '', title: '', price: '', country: '', continent: '', cities: '', landmarks: '', 
    date: '', // Това е дефолтната стойност
    dates: [] as string[], 
    img: '', duration: '', nights: '', route: '', groupStatus: 'active', status: 'public',
    included: '', notIncluded: '', documents: '', pdfUrl: '', generalInfo: '', images: '', categories: [] as string[],
    ...initialData, // Това презаписва горните
    // Ако има initialData, презаписваме датата с правилния формат
    ...(initialData?.date ? { date: initialData.date.split('-').reverse().join('-') } : {})
  });
  
  const [itinerary, setItinerary] = useState<{day: number, title: string, content: string}[]>(
    initialData?.itinerary || [{ day: 1, title: '', content: '' }]
  );
  
  const [tempDate, setTempDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showMedia, setShowMedia] = useState(false);
  const [mediaField, setMediaField] = useState<'img' | 'images'>('img');

  useEffect(() => {
    if (!initialData && form.country && form.dates.length > 0) {
        const countrySlug = slugify(form.country);
        const firstDate = [...form.dates].sort()[0];
        const [year, month] = firstDate.split('-');
        const prefix = `${countrySlug}-${month}-${year}-`;
        
        const existing = allTours.filter((t: any) => t.tourId?.startsWith(prefix));
        const nextNum = existing.length + 1;
        
        setForm((prev: any) => ({ ...prev, tourId: prefix + nextNum }));
    }
  }, [form.country, form.dates, initialData, allTours]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        const sortedDates = [...form.dates].sort();
        const mainDateFormatted = sortedDates[0]?.split('-').reverse().join('-');
        
        const data = { 
            ...form, 
            date: mainDateFormatted, 
            dates: sortedDates, 
            itinerary, 
            updatedAt: serverTimestamp() 
        };

        if (initialData?.id) {
            await updateDoc(doc(db, "tours", initialData.id), data);
        } else {
            await addDoc(collection(db, "tours"), { ...data, createdAt: serverTimestamp() });
        }
        onClose();
    } catch (error) {
        alert("Грешка при запис");
        console.error(error);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleMediaSelect = (url: string) => {
      if (mediaField === 'img') setForm({...form, img: url});
      else setForm({...form, images: form.images ? form.images + ', ' + url : url});
      setShowMedia(false);
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-8">
        <h2 className="text-2xl font-serif italic text-brand-dark">{initialData ? 'Редакция на Екскурзия' : 'Нова Екскурзия'}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <input placeholder="Заглавие" className="admin-input-v3" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                <div className="flex gap-4">
                    <input placeholder="Цена (пр. 1200 €)" className="admin-input-v3" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
                    <select className="admin-input-v3" value={form.groupStatus} onChange={e => setForm({...form, groupStatus: e.target.value})}>
                        <option value="active">Оформяща</option>
                        <option value="confirmed">Потвърдена</option>
                        <option value="last-places">Последни места</option>
                        <option value="sold-out">Изчерпана</option>
                    </select>
                </div>
                
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400">Главна Снимка</label>
                    <div className="flex gap-2">
                        <div className="flex-grow"><ImageUpload value={form.img} onChange={(url) => setForm({...form, img: url})} folder="tours" label="Качи файл" /></div>
                        <button type="button" onClick={() => {setMediaField('img'); setShowMedia(true)}} className="px-4 border-2 border-dashed border-brand-gold text-brand-gold rounded-xl text-xs font-bold uppercase">Галерия</button>
                    </div>
                </div>

                <input placeholder="Държава" className="admin-input-v3" value={form.country} onChange={e => setForm({...form, country: e.target.value})} required />
                
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    <div className="flex gap-2 mb-2">
                        <input type="date" className="admin-input-v3 py-1" value={tempDate} onChange={e => setTempDate(e.target.value)} />
                        <button type="button" onClick={() => {if(tempDate && !form.dates.includes(tempDate)) setForm({...form, dates: [...form.dates, tempDate]})}} className="bg-brand-dark text-white px-4 rounded-xl font-bold">+</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {/* 2. ДОБАВЕН ТИП (d: string) */}
                        {form.dates.map((d: string) => (
                            <span key={d} className="bg-white border px-2 py-1 rounded-md text-xs font-bold flex items-center gap-2">
                                {d} <button type="button" onClick={() => setForm({...form, dates: form.dates.filter((x: string) => x !== d)})} className="text-red-500"><X size={12}/></button>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="space-y-4">
                <textarea placeholder="Включено (всеки нов ред е булет)" className="admin-input-v3 h-32" value={form.included} onChange={e => setForm({...form, included: e.target.value})} />
                <textarea placeholder="Не е включено" className="admin-input-v3 h-32" value={form.notIncluded} onChange={e => setForm({...form, notIncluded: e.target.value})} />
            </div>
        </div>

        <div className="border-t pt-6">
            <h3 className="font-serif italic mb-4">Програма</h3>
            {/* 3. ДОБАВЕНИ ТИПОВЕ (day: any, i: number) */}
            {itinerary.map((day: any, i: number) => (
                <div key={i} className="mb-4 bg-gray-50 p-4 rounded-2xl relative">
                    <button type="button" onClick={() => setItinerary(itinerary.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 text-red-400"><Minus size={16}/></button>
                    <input placeholder={`Ден ${i+1}: Заглавие`} className="admin-input-v3 mb-2 font-bold" value={day.title} onChange={e => {const n = [...itinerary]; n[i].title = e.target.value; setItinerary(n)}} />
                    <textarea placeholder="Описание..." className="admin-input-v3 h-20" value={day.content} onChange={e => {const n = [...itinerary]; n[i].content = e.target.value; setItinerary(n)}} />
                </div>
            ))}
            <button type="button" onClick={() => setItinerary([...itinerary, { day: itinerary.length + 1, title: '', content: '' }])} className="text-brand-gold font-bold text-xs uppercase flex items-center gap-1">+ Добави ден</button>
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full bg-brand-dark text-white py-4 rounded-xl font-bold uppercase tracking-widest">
            {isSubmitting ? 'Записване...' : 'Запази Екскурзия'}
        </button>
    </form>

    {showMedia && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-10">
            <div className="bg-white w-full max-w-4xl h-[80vh] rounded-3xl overflow-hidden relative">
                <button onClick={() => setShowMedia(false)} className="absolute top-4 right-4 z-10 bg-gray-200 p-2 rounded-full"><X/></button>
                <MediaLibrary onSelect={handleMediaSelect} onClose={() => setShowMedia(false)} />
            </div>
        </div>
    )}
    </>
  );
}