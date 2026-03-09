"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { X } from 'lucide-react';
import MediaLibrary from '@/components/MediaLibrary';

// ПОМОЩЕН КОМПОНЕНТ ЗА СПИСЪЦИ (Тагове) - СЪЩИЯТ КАТО В TourForm
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

const WORLD_COUNTRIES = [
  "Австралия", "Австрия", "Азербайджан", "Албания", "Алжир", "Ангола", "Андора", "Антигуа и Барбуда", "Аржентина", "Армения", "Афганистан",
  "Бангладеш", "Барбадос", "Бахамски острови", "Бахрейн", "Беларус", "Белгия", "Белиз", "Бенин", "Боливия", "Босна и Херцеговина", "Ботсвана", "Бразилия", "Бруней", "Буркина Фасо", "Бурунди", "България", "Бутан",
  "Вануату", "Ватикан", "Великобритания", "Венецуела", "Виетнам",
  "Габон", "Гамбия", "Гана", "Гвиана", "Гватемала", "Гвинея", "Гвинея-Бисау", "Германия", "Гренада", "Грузия", "Гърция",
  "Дания", "Джибути", "Доминика", "Доминиканска република",
  "Египет", "Еквадор", "Екваториална Гвинея", "Ел Салвадор", "Еритрея", "Есватини", "Естония", "Етиопия",
  "Замбия", "Зимбабве",
  "Израел", "Източен Тимор", "Индия", "Индонезия", "Ирак", "Иран", "Ирландия", "Исландия", "Испания", "Италия",
  "Йемен", "Йордания",
  "Кабо Верде", "Казахстан", "Камбоджа", "Камерун", "Канада", "Катар", "Кения", "Кипър", "Киргизстан", "Кирибати", "Китай", "Колумбия", "Коморски острови", "ДР Конго", "Република Конго", "Косово", "Коста Рика", "Кот д'Ивоар", "Куба", "Кувейт",
  "Лаос", "Латвия", "Лесото", "Либерия", "Либия", "Ливан", "Литва", "Лихтенщайн", "Люксембург",
  "Мавритания", "Мавриций", "Мадагаскар", "Малави", "Малайзия", "Малдиви", "Мали", "Малта", "Мароко", "Маршалови острови", "Мексико", "Мианмар", "Микронезия", "Мозамбик", "Молдова", "Монако", "Монголия",
  "Намибия", "Науру", "Непал", "Нигер", "Нигерия", "Нидерландия", "Никарагуа", "Нова Зеландия", "Норвегия",
  "ОАЕ", "Оман",
  "Пакистан", "Палау", "Палестина", "Панама", "Папуа Нова Гвинея", "Парагвай", "Перу", "Полша", "Португалия",
  "Руанда", "Румъния", "Русия",
  "САЩ", "Самоа", "Сан Марино", "Сао Томе и Принсипи", "Саудитска Арабия", "Северна Корея", "Северна Македония", "Сейнт Винсент и Гренадини", "Сейнт Китс и Невис", "Сейнт Лусия", "Сейшели", "Сенегал", "Сингапур", "Сирия", "Словакия", "Словения", "Сомалия", "Судан", "Суринам", "Сърбия",
  "Таджикистан", "Тайван", "Тайланд", "Танзания", "Того", "Тонга", "Тринидад и Тобаго", "Тувалу", "Тунис", "Туркменистан", "Турция",
  "Уганда", "Узбекистан", "Украйна", "Унгария", "Уругвай",
  "Фиджи", "Филипини", "Финландия", "Франция",
  "Хаити", "Хондурас", "Хърватия",
  "Централноафриканска република",
  "Чад", "Черна гора", "Чехия", "Чили",
  "Швейцария", "Швеция", "Шри Ланка",
  "Южен Судан", "Южна Африка", "Южна Корея",
  "Ямайка", "Япония"
];

// НОВ КОМПОНЕНТ ЗА ДЪРЖАВИ С ТЪРСАЧКА
const CountryMultiSelect = ({ selected, setSelected, label }: any) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    // Филтрираме държавите, които съвпадат с търсенето и още не са избрани
    const filtered = WORLD_COUNTRIES.filter(c => 
        c.toLowerCase().includes(search.toLowerCase()) && !selected.includes(c)
    );

    const addCountry = (c: string) => {
        setSelected([...selected, c]);
        setSearch('');
        setIsOpen(false);
    };

    const removeCountry = (idx: number) => {
        setSelected(selected.filter((_: any, i: number) => i !== idx));
    };

    return (
        <div className="relative">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.15em] ml-2 mb-2 block">{label}</label>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-2 flex flex-wrap gap-2 items-center focus-within:bg-white focus-within:border-brand-gold transition-all relative z-10">
                {selected.map((tag: string, idx: number) => (
                    <span key={idx} className="bg-brand-dark text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2">
                        {tag} <button type="button" onClick={() => removeCountry(idx)} className="text-gray-400 hover:text-white"><X size={12}/></button>
                    </span>
                ))}
                <input 
                    type="text" 
                    value={search}
                    onChange={e => { setSearch(e.target.value); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)} // Изчакваме клика
                    placeholder={selected.length === 0 ? "Търси държава..." : "Добави още..."} 
                    className="flex-grow bg-transparent outline-none min-w-[150px] p-2 text-sm text-brand-dark"
                />
            </div>
            
            {/* ПАДАЩО МЕНЮ С РЕЗУЛТАТИ */}
            {isOpen && filtered.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 shadow-xl rounded-2xl max-h-48 overflow-y-auto">
                    {filtered.map(c => (
                        <button 
                            key={c}
                            type="button"
                            onClick={() => addCountry(c)}
                            className="w-full text-left px-4 py-3 hover:bg-brand-gold/10 text-sm text-brand-dark font-medium border-b border-gray-50 last:border-0 transition-colors"
                        >
                            {c}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function BlogForm({ initialData, onClose }: any) {
  const [form, setForm] = useState({
    title: '',
    slug: '',
    img: '',
    coverImg: '',
    excerpt: '',
    content: '',
    author: 'Beliva VIP',
    readTime: '',
    
    // 👇 НОВИ И ОБНОВЕНИ ПОЛЕТА 👇
    relatedCountry: [] as string[], // Вече е масив
    continent: '', // Добавяме и континент за общи статии
    
    ...initialData
  });

  // За да поддържаме старите записи, които са били стринг
  useEffect(() => {
    if (initialData?.relatedCountry && typeof initialData.relatedCountry === 'string') {
        setForm((prev : any) => ({
            ...prev,
            relatedCountry: initialData.relatedCountry.split(',').map((c: string) => c.trim()).filter(Boolean)
        }));
    }
  }, [initialData]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [mediaField, setMediaField] = useState<'img' | 'coverImg'>('img');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const postSlug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const dataToSave = { ...form, slug: postSlug, updatedAt: serverTimestamp() };

      if (initialData?.id) {
        await updateDoc(doc(db, "posts", initialData.id), dataToSave);
      } else {
        await addDoc(collection(db, "posts"), { ...dataToSave, createdAt: serverTimestamp() });
      }
      onClose();
    } catch (error) {
      console.error(error);
      alert("Грешка при запазване на статията.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMediaSelect = (url: string) => {
    setForm({ ...form, [mediaField]: url });
    setShowMedia(false);
  };

  const inputClass = "w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/5 outline-none transition-all text-brand-dark font-medium";
  const labelClass = "block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2";

  return (
    <>
      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto pb-32 space-y-10 relative pt-4 text-left">
        <div className="flex justify-between items-end border-b border-gray-100 pb-8">
            <div>
                <h2 className="text-4xl font-serif italic text-brand-dark">{initialData ? 'Редактиране' : 'Нова'} Статия</h2>
                <p className="text-gray-400 text-sm mt-2 font-medium">Блог и Пътеводители</p>
            </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                  <label className={labelClass}>Заглавие</label>
                  <input className={inputClass} value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
              </div>
              
              {/* 👇 НОВИЯТ БЛОК ЗА ДЪРЖАВИ И КОНТИНЕНТИ 👇 */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <CountryMultiSelect 
                    label="Избери Свързани Държави (с търсачка)" 
                    selected={form.relatedCountry} 
                    setSelected={(newTags: string[]) => setForm({...form, relatedCountry: newTags})} 
                />
                  <div>
                      <label className={labelClass}>Или Континент (за общи статии)</label>
                      <select className={inputClass} value={form.continent} onChange={e => setForm({...form, continent: e.target.value})}>
                          <option value="">-- Избери континент (Опционално) --</option>
                          <option value="Европа">Европа</option>
                          <option value="Азия">Азия</option>
                          <option value="Африка">Африка</option>
                          <option value="Австралия">Австралия</option>
                          <option value="Северна Америка">Северна Америка</option>
                          <option value="Южна Америка">Южна Америка</option>
                      </select>
                  </div>
              </div>
              {/* 👆 ------------------------------------------ 👆 */}

              <div>
                  <label className={labelClass}>Автор</label>
                  <input className={inputClass} value={form.author} onChange={e => setForm({...form, author: e.target.value})} />
              </div>
              <div>
                  <label className={labelClass}>Време за четене (мин)</label>
                  <input type="number" className={inputClass} value={form.readTime} onChange={e => setForm({...form, readTime: e.target.value})} />
              </div>
          </div>
          
          <div>
              <label className={labelClass}>Кратко резюме (Excerpt)</label>
              <textarea className={`${inputClass} h-24`} value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <label className={labelClass}>Пълно съдържание (HTML/Текст)</label>
            <textarea className={`${inputClass} h-96 font-mono text-sm`} value={form.content} onChange={e => setForm({...form, content: e.target.value})} />
            <p className="text-xs text-gray-400 mt-2">Можете да използвате HTML тагове за форматиране (напр. &lt;h3&gt;, &lt;p&gt;, &lt;b&gt;).</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className={labelClass}>Малка снимка (Карта)</label>
            {form.img ? (
                <div className="relative"><img src={form.img} className="h-40 w-full object-cover rounded-2xl" /><button type="button" onClick={() => setForm({...form, img: ''})} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full"><X size={16}/></button></div>
            ) : (
                <button type="button" onClick={() => {setMediaField('img'); setShowMedia(true);}} className="w-full h-40 border-2 border-dashed rounded-2xl text-gray-400 hover:border-brand-gold">+ Избери снимка</button>
            )}
          </div>
          <div>
            <label className={labelClass}>Голяма снимка (Cover)</label>
            {form.coverImg ? (
                <div className="relative"><img src={form.coverImg} className="h-40 w-full object-cover rounded-2xl" /><button type="button" onClick={() => setForm({...form, coverImg: ''})} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full"><X size={16}/></button></div>
            ) : (
                <button type="button" onClick={() => {setMediaField('coverImg'); setShowMedia(true);}} className="w-full h-40 border-2 border-dashed rounded-2xl text-gray-400 hover:border-brand-gold">+ Избери снимка</button>
            )}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t z-50 flex justify-center shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
            <button type="submit" disabled={isSubmitting} className="w-full max-w-5xl bg-brand-dark text-white py-6 rounded-3xl font-black text-xl uppercase tracking-[0.2em] hover:bg-brand-gold transition-all shadow-2xl active:scale-95">
                {isSubmitting ? 'Запазване...' : 'Запази Статията'}
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