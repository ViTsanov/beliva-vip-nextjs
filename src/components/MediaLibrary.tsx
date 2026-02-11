"use client";

import React, { useState, useEffect } from 'react';
import { storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Upload, Trash2, Search, X, Check, Loader2, Link as LinkIcon} from 'lucide-react';
import { convertToWebP } from '@/lib/utils/imageConverter';

interface MediaLibraryProps {
  onSelect?: (url: string) => void;
  onClose?: () => void;
}

export default function MediaLibrary({ onSelect, onClose }: MediaLibraryProps) {
  const [images, setImages] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    const q = query(collection(db, "media"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setImages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName) return alert("Моля, напишете име за снимката!");
    if (uploadMode === 'file' && !file) return alert("Моля, изберете файл!");
    if (uploadMode === 'url' && !externalUrl) return alert("Моля, поставете линк!");

    setUploading(true);

    try {
      let finalUrl = '';
      let storagePath = 'external';

      if (uploadMode === 'file' && file) {
          const { blob, fileName } = await convertToWebP(file);
          const storageRef = ref(storage, `library/${Date.now()}-${fileName}`);
          await uploadBytes(storageRef, blob);
          finalUrl = await getDownloadURL(storageRef);
          storagePath = storageRef.fullPath;
      } 
      else if (uploadMode === 'url') {
          finalUrl = externalUrl;
      }

      await addDoc(collection(db, "media"), {
        name: customName,
        url: finalUrl,
        path: storagePath,
        createdAt: serverTimestamp()
      });

      setFile(null);
      setExternalUrl('');
      setCustomName('');
      
    } catch (err) {
      console.error(err);
      alert("Грешка при добавяне");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, path: string) => {
    if (!confirm("Сигурни ли сте?")) return;
    try {
      if (path && path !== 'external') {
          const imgRef = ref(storage, path);
          await deleteObject(imgRef).catch(() => console.log("File missing in storage"));
      }
      await deleteDoc(doc(db, "media", id));
    } catch (err) {
      alert("Грешка при триене");
    }
  };

  const filteredImages = images.filter(img => 
    img.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-[2rem] h-full flex flex-col border border-brand-gold/10 overflow-hidden shadow-xl">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h3 className="font-serif font-bold text-xl text-brand-dark">
            {onSelect ? 'Избери Снимка' : 'Медийна Библиотека'}
        </h3>
        {onClose && <button onClick={onClose}><X className="text-gray-400 hover:text-red-500"/></button>}
      </div>

      <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
        
        {/* ЛЯВА ЧАСТ: СПИСЪК */}
        <div className="flex-grow p-6 overflow-y-auto bg-white">
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                <input 
                    type="text" 
                    placeholder="Търси по име..." 
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-brand-gold/20"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredImages.map(img => (
                    <div key={img.id} className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden border hover:border-brand-gold transition-all">
                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                        
                        {img.path === 'external' && (
                            <div className="absolute top-2 left-2 bg-black/50 text-white p-1 rounded-full text-[8px] px-2 backdrop-blur-sm">LINK</div>
                        )}

                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center text-white p-2 text-center">
                            <span className="text-xs font-bold mb-2 line-clamp-2">{img.name}</span>
                            <div className="flex gap-2">
                                {onSelect && (
                                    <button onClick={() => onSelect(img.url)} className="bg-brand-gold p-2 rounded-full hover:scale-110 text-brand-dark" title="Избери">
                                        <Check size={16} />
                                    </button>
                                )}
                                <button onClick={() => handleDelete(img.id, img.path)} className="bg-red-500 p-2 rounded-full hover:scale-110" title="Изтрий">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {filteredImages.length === 0 && <div className="text-center py-20 text-gray-400">Няма намерени снимки.</div>}
        </div>

        {/* ДЯСНА ЧАСТ: ДОБАВЯНЕ */}
        <div className="w-full md:w-80 bg-gray-50 p-6 border-l border-gray-100 shrink-0 overflow-y-auto">
            <h4 className="font-bold text-sm uppercase text-gray-500 mb-4">Добави нова</h4>
            
            <div className="flex bg-gray-200 p-1 rounded-xl mb-6">
                <button onClick={() => setUploadMode('file')} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${uploadMode === 'file' ? 'bg-white shadow text-brand-dark' : 'text-gray-500'}`}>Файл</button>
                <button onClick={() => setUploadMode('url')} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${uploadMode === 'url' ? 'bg-white shadow text-brand-dark' : 'text-gray-500'}`}>Линк</button>
            </div>

            <form onSubmit={handleAddImage} className="space-y-4">
                {uploadMode === 'file' ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-white hover:border-brand-gold transition-colors relative h-32 flex flex-col items-center justify-center">
                        <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                        {file ? <div className="text-brand-dark font-bold text-xs truncate max-w-full px-2">{file.name}</div> : <div className="text-gray-400 text-xs"><Upload className="mx-auto mb-2"/>Натисни за избор</div>}
                    </div>
                ) : (
                    <div>
                        <label className="text-[10px] font-bold uppercase text-gray-400">URL</label>
                        <div className="relative">
                            <input type="text" placeholder="https://..." value={externalUrl} onChange={e => setExternalUrl(e.target.value)} className="w-full p-3 pl-10 rounded-xl border border-gray-200 mt-1 text-sm outline-none focus:border-brand-gold"/>
                            <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 mt-0.5"/>
                        </div>
                    </div>
                )}

                <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400">Име</label>
                    <input type="text" placeholder="Напр. 'Плаж Бали'" value={customName} onChange={e => setCustomName(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 mt-1 text-sm outline-none focus:border-brand-gold" />
                </div>

                <button type="submit" disabled={uploading || (!file && !externalUrl) || !customName} className="w-full bg-brand-dark text-white py-3 rounded-xl font-bold uppercase text-xs hover:bg-brand-gold hover:text-brand-dark transition-all disabled:opacity-50 flex justify-center items-center gap-2">
                    {uploading ? <Loader2 className="animate-spin" size={16}/> : (uploadMode === 'file' ? <Upload size={16}/> : <Check size={16}/>)}
                    {uploading ? 'Обработка...' : 'Запиши'}
                </button>
            </form>
        </div>

      </div>
    </div>
  );
}