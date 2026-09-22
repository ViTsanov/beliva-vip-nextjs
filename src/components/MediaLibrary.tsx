"use client";

import React, { useState, useEffect } from 'react';
import { storage, db, auth } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { Upload, Trash2, Search, X, Check, Loader2, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { convertToWebP } from '@/lib/utils/imageConverter';

// Дефинираме глобалните обекти за Google Picker
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface MediaLibraryProps {
  onSelect?: (url: string) => void;
  onClose?: () => void;
}

export default function MediaLibrary({ onSelect, onClose }: MediaLibraryProps) {
  const [images, setImages] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Добавихме 'drive' като опция за табовете
  const [uploadMode, setUploadMode] = useState<'file' | 'url' | 'drive'>('file');
  
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [customName, setCustomName] = useState('');

  // Състояния за Google Drive Picker
  const [pickerReady, setPickerReady] = useState(false);

  // Масово преобработване на вече качени снимки, които са по-големи от нужното (от преди convertToWebP
  // да почне да смалява при ново качване). Вика първия опит (canvas в браузъра) гръмна със CORS
  // грешка — Firebase Storage download URL-ите не изпращат Access-Control-Allow-Origin по дефаулт.
  // Сега викаме сървърния route (/api/admin/optimize-media), който чете чрез Admin SDK — напълно
  // заобикаля проблема. Викаме на партиди, за да не рискуваме timeout на едно голямо извикване.
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeStatus, setOptimizeStatus] = useState('');
  const [optimizeResults, setOptimizeResults] = useState<{ processed: number; skipped: number; failed: number } | null>(null);

  // Следи кои конкретни снимки се оптимизират в даден момент — за да покажем spinner САМО върху
  // тази конкретна картинка, не върху цялата библиотека като при масовото оптимизиране.
  const [optimizingIds, setOptimizingIds] = useState<Set<string>>(new Set());

  const handleOptimizeSingleImage = async (img: any) => {
    setOptimizingIds(prev => new Set(prev).add(img.id));
    try {
      const res = await fetch('/api/admin/optimize-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId: img.id })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Грешка при оптимизация.');
      } else if (data.result === 'skipped') {
        alert(`"${img.name}" вече е достатъчно малка — няма нужда от смаляване.`);
      } else if (data.result === 'processed') {
        alert(`"${img.name}" е смалена успешно!`);
      } else {
        alert(`Грешка при оптимизиране на "${img.name}": ${data.error || 'няма повече детайли от сървъра'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Грешка при връзка със сървъра.');
    } finally {
      setOptimizingIds(prev => {
        const next = new Set(prev);
        next.delete(img.id);
        return next;
      });
    }
  };

  const handleOptimizeOldImages = async () => {
    if (!confirm('Това ще прегледа всички директно качени снимки (не Drive/линк) и ще смали тези над 2000px. Може да отнеме няколко минути при много снимки. Продължаваме ли?')) return;
    setIsOptimizing(true);
    setOptimizeResults(null);

    let totalProcessed = 0, totalSkipped = 0, totalFailed = 0;
    let skipIds: string[] = [];
    let round = 1;

    try {
      while (true) {
        setOptimizeStatus(`Обработвам партида ${round}...`);
        const res = await fetch('/api/admin/optimize-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skipIds })
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Грешка на сървъра');
        }

        totalProcessed += data.processed;
        totalSkipped += data.skipped;
        totalFailed += data.failed;
        skipIds = [...skipIds, ...data.processedIds];

        setOptimizeStatus(`Партида ${round}: смалени ${totalProcessed}, остават ~${data.remaining}...`);

        if (data.done) break;
        round++;
      }

      setOptimizeStatus('');
      setOptimizeResults({ processed: totalProcessed, skipped: totalSkipped, failed: totalFailed });
    } catch (e) {
      console.error(e);
      alert('Грешка при масовото оптимизиране.');
      setOptimizeStatus('');
    } finally {
      setIsOptimizing(false);
    }
  };

  // 1. Зареждане на Firebase снимки — чакаме Firebase Auth сесията реално да се възстанови (onAuthStateChanged), преди да
  // стреляме onSnapshot към "media" колекцията — без това, ако заявката тръгне преди auth.currentUser да се
  // попълни, request.auth е null за Firestore правилата — резултат: "Missing or insufficient permissions".
  useEffect(() => {
    let unsubSnapshot: (() => void) | undefined;
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const q = query(collection(db, "media"), orderBy("createdAt", "desc"));
        unsubSnapshot = onSnapshot(q, (snap) => {
          setImages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
      }
    });
    return () => {
      unsubAuth();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  // 2. Зареждане на скриптовете за Google Drive Picker
  useEffect(() => {
    const loadScript = (src: string) => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve(true);
        document.body.appendChild(script);
      });
    };

    Promise.all([
      loadScript('https://apis.google.com/js/api.js'),
      loadScript('https://accounts.google.com/gsi/client')
    ]).then(() => {
      if (window.gapi) {
        window.gapi.load('picker', () => setPickerReady(true));
      }
    });
  }, []);

  // --------------------------------------------------------
  // ЛОГИКА ЗА СТАНДАРТНО КАЧВАНЕ (ФАЙЛ И ЛИНК)
  // --------------------------------------------------------
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

  // --------------------------------------------------------
  // ЛОГИКА ЗА GOOGLE DRIVE PICKER
  // --------------------------------------------------------
  const handleOpenDrivePicker = () => {
    if (!pickerReady) return alert("Google API все още се зарежда...");

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (response: any) => {
        if (response.access_token) {
          createPicker(response.access_token);
        }
      }
    });
    client.requestAccessToken();
  };

  const createPicker = (token: string) => {
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
    view.setMimeTypes('image/png,image/jpeg,image/jpg,image/webp');
    view.setIncludeFolders(true);

    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(process.env.NEXT_PUBLIC_GOOGLE_API_KEY)
      .setCallback(pickerCallback)
      .build();
    picker.setVisible(true);
  };

  const pickerCallback = async (data: any) => {
    if (data.action === window.google.picker.Action.PICKED) {
      setUploading(true);
      try {
        const file = data.docs[0];
        const fileId = file.id;
        const fileName = file.name;
        
        // Магическият линк с коригиран синтаксис (добавен '$')
        const driveUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;

        await addDoc(collection(db, "media"), {
          name: fileName, // Взимаме името директно от файла в Drive
          url: driveUrl,
          path: 'google_drive', // Специален път, за да не го търси Firebase Storage при триене
          driveId: fileId,
          createdAt: serverTimestamp()
        });

        // Връщаме се на първия таб след успешно добавяне (по желание)
        setUploadMode('file');
        
      } catch (error) {
        console.error("Грешка при запазване:", error);
        alert("Грешка при запазване на връзката към файла.");
      } finally {
        setUploading(false);
      }
    }
  };

  // --------------------------------------------------------
  // ЛОГИКА ЗА ИЗТРИВАНЕ
  // --------------------------------------------------------
  const handleDelete = async (id: string, path: string, url: string) => {
    try {
      // ПРЕДИ да трием проверяваме дали някоя екскурзия вече използва тази снимка (hero или галерия) —
      // иначе турът остава със счупена (404) снимка в сайта.
      const toursSnap = await getDocs(collection(db, "tours"));
      const usedByTours: string[] = [];
      toursSnap.forEach(d => {
        const t: any = d.data();
        const inGallery = Array.isArray(t.galleryWithCaptions) && t.galleryWithCaptions.some((g: any) => g?.url === url);
        const inImagesStr = typeof t.images === 'string' && t.images.includes(url);
        if (t.img === url || inGallery || inImagesStr) {
          usedByTours.push(t.title || d.id);
        }
      });

      if (usedByTours.length > 0) {
        const proceed = confirm(
          `⚠️ Тази снимка се използва в ${usedByTours.length} екскурзи${usedByTours.length === 1 ? 'я' : 'и'}:\n\n${usedByTours.join('\n')}\n\nАко я изтриеш, снимката ще изчезне от тези екскурзии!\n\nНаистина ли искаш да продължиш?`
        );
        if (!proceed) return;
      } else {
        if (!confirm("Сигурни ли сте?")) return;
      }

      // Трием от Storage само ако реално е качен там
      if (path && path !== 'external' && path !== 'google_drive') {
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
        
        {/* ЛЯВА ЧАСТ: СПИСЪК СЪС СНИМКИ */}
        <div className="flex-grow p-6 overflow-y-auto bg-white">
            {/* Масово преобработване на вече качени големи снимки (от преди convertToWebP да почне да смалява) */}
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-bold text-amber-800">Стари снимки могат да са по-големи от нужното и да забавят зареждането на сайта.</p>
                  <p className="text-[10px] text-amber-600 mt-0.5">Смалява всички директно качени снимки над 2000px и обновява всички турове, които ги използват.</p>
                </div>
                <button
                  onClick={handleOptimizeOldImages}
                  disabled={isOptimizing}
                  className="bg-amber-500 text-white px-5 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-amber-600 transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
                >
                  {isOptimizing ? <Loader2 size={14} className="animate-spin" /> : null}
                  {isOptimizing ? 'Работи...' : 'Оптимизирай стари снимки'}
                </button>
              </div>
              {optimizeStatus && (
                <p className="text-[11px] text-amber-700 mt-3 font-medium">{optimizeStatus}</p>
              )}
              {optimizeResults && (
                <p className="text-[11px] text-emerald-700 mt-3 font-bold">
                  Готово! Смалени: {optimizeResults.processed} · Вече добри: {optimizeResults.skipped} · Грешки: {optimizeResults.failed}
                </p>
              )}
            </div>

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
                        {/* Използваме стандартен <img> таг, който заобикаля Next.js рестрикциите! */}
                        <img 
                            src={img.url} 
                            alt={img.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer" 
                        />
                        
                        {img.path === 'external' && (
                            <div className="absolute top-2 left-2 bg-black/50 text-white p-1 rounded-full text-[8px] px-2 backdrop-blur-sm">LINK</div>
                        )}
                        {img.path === 'google_drive' && (
                            <div className="absolute top-2 left-2 bg-blue-600/80 text-white p-1 rounded-full text-[8px] px-2 backdrop-blur-sm">DRIVE</div>
                        )}

                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center text-white p-2 text-center">
                            <span className="text-xs font-bold mb-2 line-clamp-2">{img.name}</span>
                            <div className="flex gap-2">
                                {onSelect && (
                                    <button onClick={() => onSelect(img.url)} className="bg-brand-gold p-2 rounded-full hover:scale-110 text-brand-dark" title="Избери">
                                        <Check size={16} />
                                    </button>
                                )}
                                {img.path && img.path !== 'external' && img.path !== 'google_drive' && (
                                    <button
                                        onClick={() => handleOptimizeSingleImage(img)}
                                        disabled={optimizingIds.has(img.id)}
                                        className="bg-amber-500 p-2 rounded-full hover:scale-110 disabled:opacity-50 disabled:hover:scale-100"
                                        title="Оптимизирай тази снимка (смали, ако е над 2000px)"
                                    >
                                        {optimizingIds.has(img.id) ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                                    </button>
                                )}
                                <button onClick={() => handleDelete(img.id, img.path, img.url)} className="bg-red-500 p-2 rounded-full hover:scale-110" title="Изтрий">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {filteredImages.length === 0 && <div className="text-center py-20 text-gray-400">Няма намерени снимки.</div>}
        </div>

        {/* ДЯСНА ЧАСТ: ДОБАВЯНЕ НА НОВИ */}
        <div className="w-full md:w-80 bg-gray-50 p-6 border-l border-gray-100 shrink-0 overflow-y-auto">
            <h4 className="font-bold text-sm uppercase text-gray-500 mb-4">Добави нова</h4>
            
            {/* ТАБОВЕ ЗА ИЗБОР НА МЕТОД */}
            <div className="flex bg-gray-200 p-1 rounded-xl mb-6">
                <button onClick={() => setUploadMode('file')} className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${uploadMode === 'file' ? 'bg-white shadow text-brand-dark' : 'text-gray-500'}`}>Файл</button>
                <button onClick={() => setUploadMode('url')} className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${uploadMode === 'url' ? 'bg-white shadow text-brand-dark' : 'text-gray-500'}`}>Линк</button>
                <button onClick={() => setUploadMode('drive')} className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${uploadMode === 'drive' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Drive</button>
            </div>

            {/* ПОКАЗВАМЕ РАЗЛИЧНИ ФОРМИ СПОРЕД ИЗБРАНИЯ ТАБ */}
            {uploadMode === 'drive' ? (
                <div className="text-center py-8 space-y-4">
                  <div className="bg-blue-50 text-blue-600 p-4 rounded-xl text-xs text-left mb-4">
                    Изберете снимки директно от вашия Google Drive. Снимките не заемат място в сървъра.
                  </div>
                  <button 
                    onClick={handleOpenDrivePicker}
                    disabled={!pickerReady || uploading}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-bold transition-all disabled:opacity-50 text-sm"
                  >
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
                    {uploading ? 'Обработка...' : 'Отвори Drive'}
                  </button>
                </div>
            ) : (
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
            )}
        </div>

      </div>
    </div>
  );
}