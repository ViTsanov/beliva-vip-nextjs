"use client";

import { useState } from 'react';
import { Plus, Trash2, CheckCircle2, Loader2, Camera, ImagePlus } from 'lucide-react';
import { submitCheckoutData } from './actions';

interface Traveler {
  latinName: string;
  egn: string;
  passportNumber: string;
  passportValidity: string;
  // Снимка на паспорта (по избор): избраният файл, превю за екрана и път в Storage, след като е качена.
  photoFile: File | null;
  photoPreview: string;
  photoPath: string;
}

const EMPTY_TRAVELER: Traveler = {
  latinName: '', egn: '', passportNumber: '', passportValidity: '',
  photoFile: null, photoPreview: '', photoPath: '',
};

// Свива снимката преди качване: най-дългата страна до 1800px, JPEG. Телефонните снимки са по 3–8 MB, а за
// четим паспорт са достатъчни ~0.5 MB. Презаписването през canvas маха и EXIF данните (напр. GPS позиция).
async function compressImage(file: File): Promise<Blob> {
  const MAX_SIDE = 1800;
  let source: CanvasImageSource;
  let width: number;
  let height: number;
  try {
    const bitmap = await createImageBitmap(file);
    source = bitmap; width = bitmap.width; height = bitmap.height;
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Снимката не може да бъде прочетена. Опитайте с друга (JPG или PNG).'));
        el.src = url;
      });
      source = img; width = img.naturalWidth; height = img.naturalHeight;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Снимката не може да бъде обработена на това устройство.');
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Снимката не може да бъде обработена.'))), 'image/jpeg', 0.82);
  });
}

async function uploadPassportPhoto(token: string, blob: Blob): Promise<string> {
  const fd = new FormData();
  fd.append('token', token);
  fd.append('file', new File([blob], 'passport.jpg', { type: 'image/jpeg' }));
  const res = await fetch('/api/checkout/upload-passport', { method: 'POST', body: fd });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error || 'Снимката не можа да бъде качена.');
  return json.path as string;
}

interface CheckoutFormProps {
  inquiry: any;
  token: string;
  paymentInfo: { iban: string; accountHolder: string; bankName: string };
}

export default function CheckoutForm({ inquiry, token, paymentInfo }: CheckoutFormProps) {
  // Стартираме с ЕДИН пътник (самия клиент) — бутонът "Добави пътник" позволява семейни/групови
  // резервации, без администраторът да трябва предварително да знае/задава брой пътници при създаване
  // на линка.
  // При корекция (админът е поискал данните отново) предварително попълваме името и валидността от предишния опит.
  const isCorrection = !!inquiry.isCorrection;
  const [travelers, setTravelers] = useState<Traveler[]>(
    isCorrection && Array.isArray(inquiry.prefill) && inquiry.prefill.length > 0
      ? inquiry.prefill.map((p: any) => ({ ...EMPTY_TRAVELER, latinName: p.latinName || '', passportValidity: p.passportValidity || '' }))
      : [{ ...EMPTY_TRAVELER }]
  );
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const updateTraveler = (idx: number, field: keyof Traveler, value: string) => {
    setTravelers(prev => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));
  };

  const addTraveler = () => setTravelers(prev => [...prev, { ...EMPTY_TRAVELER }]);
  const removeTraveler = (idx: number) => {
    const preview = travelers[idx]?.photoPreview;
    if (preview) URL.revokeObjectURL(preview);
    setTravelers(prev => prev.filter((_, i) => i !== idx));
  };

  const pickPhoto = (idx: number, file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Моля, изберете снимка (JPG или PNG).');
      return;
    }
    setError('');
    const old = travelers[idx]?.photoPreview;
    if (old) URL.revokeObjectURL(old);
    const preview = URL.createObjectURL(file);
    setTravelers(prev => prev.map((t, i) => (i === idx ? { ...t, photoFile: file, photoPreview: preview, photoPath: '' } : t)));
  };

  const removePhoto = (idx: number) => {
    const old = travelers[idx]?.photoPreview;
    if (old) URL.revokeObjectURL(old);
    setTravelers(prev => prev.map((t, i) => (i === idx ? { ...t, photoFile: null, photoPreview: '', photoPath: '' } : t)));
  };

  const handleSubmit = async () => {
    setError('');

    for (let i = 0; i < travelers.length; i++) {
      const t = travelers[i];
      if (!t.latinName.trim() || !t.egn.trim() || !t.passportNumber.trim() || !t.passportValidity.trim()) {
        setError(`Моля, попълни всички полета за пътник ${i + 1}.`);
        return;
      }
    }
    if (!agreedToTerms) {
      setError('Моля, съгласи се с общите условия, за да продължиш.');
      return;
    }

    setSubmitting(true);

    // 1) Качваме снимките (ако има) — една по една, свити. Вече качена снимка не се качва втори път.
    const photoPaths: string[] = travelers.map(t => t.photoPath);
    if (travelers.some(t => t.photoFile && !t.photoPath)) {
      setUploadingPhotos(true);
      try {
        for (let i = 0; i < travelers.length; i++) {
          const t = travelers[i];
          if (t.photoFile && !t.photoPath) {
            const blob = await compressImage(t.photoFile);
            const path = await uploadPassportPhoto(token, blob);
            photoPaths[i] = path;
            setTravelers(prev => prev.map((x, j) => (j === i ? { ...x, photoPath: path } : x)));
          }
        }
      } catch (e) {
        setUploadingPhotos(false);
        setSubmitting(false);
        setError(e instanceof Error ? e.message : 'Снимката не можа да бъде качена. Опитайте отново.');
        return;
      }
      setUploadingPhotos(false);
    }

    // 2) Изпращаме данните (само чист текст — файловете вече са качени).
    const result = await submitCheckoutData(
      token,
      travelers.map((t, i) => ({
        latinName: t.latinName,
        egn: t.egn,
        passportNumber: t.passportNumber,
        passportValidity: t.passportValidity,
        passportPhoto: photoPaths[i] || '',
      }))
    );
    setSubmitting(false);

    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error || 'Възникна грешка. Опитай отново.');
    }
  };

  // ЕКРАН СЛЕД УСПЕШНО ИЗПРАЩАНЕ — показва инструкциите за банков превод
  if (submitted && isCorrection) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center p-6">
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 max-w-lg w-full shadow-2xl text-center animate-in zoom-in-95">
          <CheckCircle2 className="mx-auto text-emerald-500 mb-6" size={56} />
          <h1 className="font-serif italic text-2xl text-brand-dark mb-3">Данните са обновени!</h1>
          <p className="text-gray-500 text-sm">
            Благодарим! Получихме коригираните данни и екипът ни ще продължи с резервацията ти.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center p-6">
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 max-w-lg w-full shadow-2xl text-center animate-in zoom-in-95">
          <CheckCircle2 className="mx-auto text-emerald-500 mb-6" size={56} />
          <h1 className="font-serif italic text-2xl text-brand-dark mb-3">Данните са изпратени успешно!</h1>
          <p className="text-gray-500 text-sm mb-8">
            Остава последна стъпка — плащане на капаро по банков път. Ето детайлите:
          </p>
          <div className="bg-gray-50 rounded-2xl p-6 text-left space-y-4 mb-8">
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">IBAN</p>
              <p className="font-mono font-bold text-brand-dark text-sm mt-1">
                {paymentInfo.iban || 'Ще получиш банковите детайли от нашия екип'}
              </p>
            </div>
            {paymentInfo.accountHolder && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Титуляр</p>
                <p className="font-bold text-brand-dark text-sm mt-1">{paymentInfo.accountHolder}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Основание за превод</p>
              <p className="font-bold text-brand-dark text-sm mt-1">
                {inquiry.tourTitle} — {inquiry.clientName}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            След превода нашият екип ще потвърди резервацията ти лично.
          </p>
        </div>
      </div>
    );
  }

  // ОСНОВНАТА ФОРМА
  return (
    <div className="min-h-screen bg-brand-dark py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl">
          <div className="mb-8 pb-8 border-b border-gray-100">
            <p className="text-[10px] font-black uppercase text-brand-gold tracking-[0.2em] mb-2">Beliva VIP Tour</p>
            <h1 className="font-serif italic text-2xl text-brand-dark">{inquiry.tourTitle}</h1>
            <p className="text-gray-400 text-sm mt-1">{inquiry.tourDate}</p>
          </div>

          {isCorrection && (
            <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-2xl p-4">
              Агенцията поиска данните да бъдат попълнени отново. Името и валидността са попълнени от предишния път —
              провери ги и въведи пак ЕГН и номер на паспорт (от съображения за сигурност не ги показваме).
            </div>
          )}
          <p className="text-sm text-gray-500 mb-6">
            Попълни данните по паспорт на всеки пътуващ. Ако резервираш за повече хора (напр. цялото семейство),
            добави всеки един отделно с бутона по-долу.
          </p>

          <div className="space-y-5">
            {travelers.map((traveler, idx) => (
              <div key={idx} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-brand-dark text-sm">Пътник {idx + 1}</h3>
                  {travelers.length > 1 && (
                    <button
                      onClick={() => removeTraveler(idx)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                      title="Премахни този пътник"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Име по паспорт (на латиница)"
                    value={traveler.latinName}
                    onChange={e => updateTraveler(idx, 'latinName', e.target.value)}
                    className="sm:col-span-2 p-3.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-gold transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="ЕГН"
                    value={traveler.egn}
                    onChange={e => updateTraveler(idx, 'egn', e.target.value)}
                    className="p-3.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-gold transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Номер на паспорт"
                    value={traveler.passportNumber}
                    onChange={e => updateTraveler(idx, 'passportNumber', e.target.value)}
                    className="p-3.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-gold transition-colors"
                  />
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1 mb-1.5 block">
                      Валидност на паспорта
                    </label>
                    <input
                      type="date"
                      value={traveler.passportValidity}
                      onChange={e => updateTraveler(idx, 'passportValidity', e.target.value)}
                      className="w-full p-3.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-gold transition-colors"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1 mb-1.5 block">
                      Снимка на паспорта (по избор)
                    </label>
                    {traveler.photoPreview ? (
                      <div className="flex items-center gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={traveler.photoPreview} alt={`Снимка на паспорт на пътник ${idx + 1}`} className="h-24 w-32 object-cover rounded-xl border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors"
                        >
                          Премахни снимката
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <label className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-bold text-brand-dark cursor-pointer hover:border-brand-gold transition-colors">
                          <Camera size={16} /> Заснеми
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { pickPhoto(idx, e.target.files?.[0]); e.target.value = ''; }} />
                        </label>
                        <label className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-bold text-brand-dark cursor-pointer hover:border-brand-gold transition-colors">
                          <ImagePlus size={16} /> Избери от галерията
                          <input type="file" accept="image/*" className="hidden" onChange={e => { pickPhoto(idx, e.target.files?.[0]); e.target.value = ''; }} />
                        </label>
                      </div>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1.5 ml-1">
                      Страницата с твоята снимка и данни. Снимката се съхранява криптирана и се вижда само от екипа на агенцията.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addTraveler}
            className="w-full mt-5 py-3.5 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-brand-gold hover:text-brand-gold transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Добави пътник
          </button>

          <label className="flex items-start gap-3 mt-8 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={e => setAgreedToTerms(e.target.checked)}
              className="mt-1"
            />
            <span className="text-xs text-gray-500">
              Съгласявам се данните ми да бъдат обработени с цел организиране на пътуването, съгласно
              общите условия на Beliva VIP Tour.
            </span>
          </label>

          {error && (
            <p className="text-red-500 text-sm mt-4 text-center bg-red-50 py-3 rounded-xl">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full mt-6 bg-brand-gold text-brand-dark py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> {uploadingPhotos ? 'Качване на снимките...' : 'Изпращане...'}
              </>
            ) : (
              'Изпрати данните'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
