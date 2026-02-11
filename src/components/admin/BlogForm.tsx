"use client";
import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { PlusCircle, ArrowUp, ArrowDown, Trash2, Image as ImageIcon, X } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import MediaLibrary from '@/components/MediaLibrary';
import { parseHtmlToSections, slugify } from '@/lib/admin-helpers';

// Зареждаме Quill само в браузъра (SSR: false)
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';

export default function BlogForm({ initialData, onClose, availableCountries }: any) {
  const [form, setForm] = useState({
    title: '', slug: '', coverImg: '', excerpt: '', relatedCountry: '', gallery: '',
    ...initialData
  });

  const [sections, setSections] = useState(initialData ? parseHtmlToSections(initialData.content) : [{ id: Date.now(), text: '', image: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showMedia, setShowMedia] = useState(false);
  const [mediaContext, setMediaContext] = useState<{ type: 'cover' | 'section', index?: number }>({ type: 'cover' });

  const handleMediaSelect = (url: string) => {
      if (mediaContext.type === 'cover') {
          // ТУК Е ПРОМЯНАТА: (prev: any)
          setForm((prev: any) => ({ ...prev, coverImg: url }));
      } else if (mediaContext.type === 'section' && mediaContext.index !== undefined) {
          const newSections = [...sections];
          newSections[mediaContext.index].image = url;
          setSections(newSections);
      }
      setShowMedia(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
          const slug = slugify(form.title);
          
          let contentHtml = '';
          sections.forEach((sec: any) => {
              if (sec.text && sec.text !== '<p><br></p>') contentHtml += `<div class="blog-text mb-6">${sec.text}</div>`;
              if (sec.image) contentHtml += `<div class="blog-image mb-8"><img src="${sec.image}" alt="Blog" class="w-full rounded-2xl shadow-md" /></div>`;
          });

          const data = { ...form, slug, content: contentHtml, updatedAt: serverTimestamp() };
          
          if (initialData?.id) await updateDoc(doc(db, "posts", initialData.id), data);
          else await addDoc(collection(db, "posts"), { ...data, createdAt: serverTimestamp() });
          
          onClose();
      } catch (err) { console.error(err); alert("Грешка!"); } 
      finally { setIsSubmitting(false); }
  };

  const quillModules = useMemo(() => ({
    toolbar: [[{ 'header': [2, 3, false] }], ['bold', 'italic', 'underline', 'link'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], ['clean']],
  }), []);

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
        <h2 className="text-2xl font-serif italic text-brand-dark">{initialData ? 'Редакция на Статия' : 'Нова Статия'}</h2>
        
        <input placeholder="Заглавие" className="admin-input-v3 text-lg font-bold" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
        
        <div className="flex gap-4 items-end">
            <div className="flex-grow">
                <ImageUpload label="Корица" value={form.coverImg} onChange={(url) => setForm({...form, coverImg: url})} folder="blog" />
            </div>
            <button type="button" onClick={() => {setMediaContext({type: 'cover'}); setShowMedia(true)}} className="mb-1 px-4 py-3 border-2 border-dashed border-brand-gold text-brand-gold rounded-xl font-bold uppercase text-xs">Галерия</button>
        </div>

        <select className="admin-input-v3" value={form.relatedCountry} onChange={e => setForm({...form, relatedCountry: e.target.value})}>
            <option value="">-- Без връзка с държава --</option>
            {(availableCountries || []).map((c: string) => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="border-t pt-4">
            <label className="text-xs font-black uppercase text-brand-gold mb-4 block">Съдържание</label>
            {sections.map((sec: any, i: number) => (
                <div key={sec.id} className="bg-gray-50 p-4 rounded-2xl mb-4 border relative group">
                    <div className="absolute top-2 right-2 flex gap-1 opacity-50 group-hover:opacity-100">
                        <button type="button" onClick={() => {
                            const n = [...sections];
                            if(i>0) { [n[i], n[i-1]] = [n[i-1], n[i]]; setSections(n); }
                        }}><ArrowUp size={16}/></button>
                        <button type="button" onClick={() => {
                             const n = [...sections];
                             n.splice(i, 1);
                             setSections(n);
                        }} className="text-red-500"><Trash2 size={16}/></button>
                    </div>
                    
                    <div className="bg-white rounded-xl overflow-hidden mb-2">
                        <ReactQuill theme="snow" value={sec.text} onChange={(val: string) => {const n = [...sections]; n[i].text = val; setSections(n)}} modules={quillModules} />
                    </div>

                    <div className="flex items-center gap-2">
                        {sec.image && <img src={sec.image} className="h-10 w-10 rounded-md object-cover" />}
                        <button type="button" onClick={() => {setMediaContext({type: 'section', index: i}); setShowMedia(true)}} className="text-xs font-bold uppercase bg-brand-dark text-white px-3 py-2 rounded-lg flex gap-1">
                            <ImageIcon size={14}/> {sec.image ? 'Смени' : 'Добави снимка'}
                        </button>
                    </div>
                </div>
            ))}
            <button type="button" onClick={() => setSections([...sections, { id: Date.now(), text: '', image: '' }])} className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 font-bold uppercase rounded-xl hover:border-brand-gold hover:text-brand-gold">
                <PlusCircle size={20} className="inline mr-2"/> Добави Секция
            </button>
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full bg-brand-dark text-white py-4 rounded-xl font-black uppercase tracking-widest">
            {isSubmitting ? 'Записване...' : 'Запази Статия'}
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