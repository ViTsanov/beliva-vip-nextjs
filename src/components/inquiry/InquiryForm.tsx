"use client";

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { sendInquiry, type InquiryInput } from '@/lib/sendInquiry';
import { COMPANY_INFO } from '@/lib/companyInfo';
import {
  MESSAGE_MAX, normalizePhone, validateEmail, validateMessage, validateName, validatePhone,
} from '@/lib/inquiryValidation';
import TourPicker, { type PickerTour, type TourChoice } from '@/components/tours/TourPicker';

interface TourOption extends PickerTour {
  dates: string[];
  slug?: string;
  tourId?: string;
}

interface InquiryFormProps {
  source: InquiryInput['source'];
  // Slug/ID на тура от адреса (/tour/…) или от страницата на тура — щом турът се зареди, се избира автоматично.
  defaultTourSlug?: string;
  // Държава, предварително избрана като дестинация (страницата /destinations/<държава>) — ако няма избран тур.
  defaultCountry?: string;
  // Фокус в първото поле при показване (в прозореца „Запитване“).
  autoFocus?: boolean;
  // Бутон след успешно изпращане — „Затвори“ в прозореца; на страницата е „Изпрати още едно“.
  onDone?: () => void;
}

type ContactField = 'name' | 'phone' | 'email';
type Errors = Partial<Record<ContactField | 'message', string>>;

const VALIDATORS: Record<ContactField, (v: string) => string | undefined> = {
  name: validateName,
  phone: validatePhone,
  email: validateEmail,
};

const toDisplayDate = (iso: string) => iso.split('-').reverse().join('.');

const labelClass = 'mb-1.5 block text-[13px] font-semibold text-brand-dark';
const fieldBase =
  'block w-full rounded-xl border bg-white px-4 text-[15px] text-brand-dark placeholder:text-slate-400 transition-colors focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-dark/15';
const fieldOk = 'border-slate-300';
const fieldError = 'border-red-500 bg-red-50/40';

// Формата е на две стъпки: 1) кой сте (име, телефон, имейл) и 2) за какво пътуване (дестинация/тур, дата, съобщение).
// Всяко поле се проверява, щом го напуснете, и отново при „Напред“/„Изпрати“ — с конкретно съобщение на български.
export default function InquiryForm({ source, defaultTourSlug, defaultCountry, autoFocus, onDone }: InquiryFormProps) {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const nameRef = useRef<HTMLInputElement>(null);
  const step2HeadingRef = useRef<HTMLParagraphElement>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [tours, setTours] = useState<TourOption[]>([]);
  const [toursLoaded, setToursLoaded] = useState(false);
  // Изборът в TourPicker: общо запитване, само дестинация или конкретна екскурзия (по желание с дата).
  const [choice, setChoice] = useState<TourChoice>(defaultCountry ? { kind: 'destination', country: defaultCountry } : { kind: 'general' });
  const [date, setDate] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [sentTo, setSentTo] = useState({ name: '', email: '' });

  useEffect(() => {
    if (autoFocus) nameRef.current?.focus();
  }, [autoFocus]);

  // Публичните турове за избора (само на клиента, след показване на формата).
  useEffect(() => {
    let cancelled = false;
    getDocs(query(collection(db, 'tours'), where('status', '==', 'public')))
      .then(snap => {
        if (cancelled) return;
        const list = snap.docs
          .map(d => {
            const data = d.data();
            return {
              id: d.id,
              title: String(data.title || ''),
              price: data.price ? String(data.price) : undefined,
              dates: Array.isArray(data.dates) ? data.dates.map(String) : [],
              country: data.country,
              img: typeof data.img === 'string' ? data.img : undefined,
              slug: data.slug,
              tourId: data.tourId,
            } as TourOption;
          })
          .filter(t => t.title)
          .sort((a, b) => a.title.localeCompare(b.title, 'bg'));
        setTours(list);
        setToursLoaded(true);
        if (defaultTourSlug) {
          const match = list.find(t => t.slug === defaultTourSlug || t.tourId === defaultTourSlug || t.id === defaultTourSlug);
          if (match) setChoice(prev => (prev.kind !== 'tour' ? { kind: 'tour', tourId: match.id } : prev));
        }
      })
      .catch(err => {
        console.error('Грешка при зареждане на екскурзиите:', err);
        if (!cancelled) setToursLoaded(true);
      });
    return () => { cancelled = true; };
  }, [defaultTourSlug]);

  const selectedTour = choice.kind === 'tour' ? tours.find(t => t.id === choice.tourId) || null : null;
  // Само предстоящите дати на избрания тур, подредени.
  const upcomingDates = useMemo(() => {
    if (!selectedTour) return [];
    const today = new Date().toISOString().slice(0, 10);
    return [...new Set(selectedTour.dates.map(d => d.slice(0, 10)))].filter(d => d >= today).sort();
  }, [selectedTour]);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setForm(f => ({ ...f, [key]: value }));
    // Грешката изчезва веднага щом полето стане вярно (но нова не се показва, докато пишете).
    if (errors[key]) {
      const err = key === 'message' ? validateMessage(value) : VALIDATORS[key as ContactField](value);
      setErrors(er => ({ ...er, [key]: err }));
    }
  };

  // Проверка при напускане на полето — само ако вече е попълвано, за да не „крещи“ при просто минаване.
  const blur = (key: ContactField) => () => {
    if (!form[key].trim()) return;
    setErrors(er => ({ ...er, [key]: VALIDATORS[key](form[key]) }));
  };

  const goToStep2 = () => {
    const next: Errors = {
      name: validateName(form.name),
      phone: validatePhone(form.phone),
      email: validateEmail(form.email),
    };
    setErrors(next);
    const firstError = (['name', 'phone', 'email'] as const).find(k => next[k]);
    if (firstError) {
      document.getElementById(id(firstError))?.focus();
      return;
    }
    setForm(f => ({ ...f, phone: normalizePhone(f.phone.trim()), email: f.email.trim() }));
    setStep(2);
    requestAnimationFrame(() => step2HeadingRef.current?.focus());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      goToStep2();
      return;
    }
    const messageError = validateMessage(form.message);
    if (messageError) {
      setErrors(er => ({ ...er, message: messageError }));
      document.getElementById(id('message'))?.focus();
      return;
    }
    setStatus('sending');
    try {
      await sendInquiry({
        name: form.name.trim(),
        phone: normalizePhone(form.phone.trim()),
        email: form.email.trim(),
        message: form.message,
        tour: selectedTour ? { id: selectedTour.id, title: selectedTour.title, price: selectedTour.price } : null,
        destination: choice.kind === 'destination' ? choice.country : undefined,
        date,
        source,
      });
      setSentTo({ name: form.name.trim().split(/\s+/)[0], email: form.email.trim() });
      setStatus('success');
      setForm({ name: '', phone: '', email: '', message: '' });
      setChoice({ kind: 'general' });
      setDate('');
      setStep(1);
    } catch (err) {
      console.error('Грешка при изпращане на запитването:', err);
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="py-8 text-center" role="status">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={34} aria-hidden="true" />
        </div>
        <p className="font-serif text-2xl italic text-brand-dark">Благодарим, {sentTo.name}!</p>
        <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-slate-600">
          Получихме запитването ви. Ще се свържем с вас до 24 часа, а офертата ще изпратим на <span className="font-semibold text-brand-dark">{sentTo.email}</span>.
        </p>
        <button
          type="button"
          onClick={() => (onDone ? onDone() : setStatus('idle'))}
          className="mt-6 inline-flex h-12 items-center rounded-full bg-brand-dark px-7 text-[15px] font-semibold text-white transition-colors hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
        >
          {onDone ? 'Затвори' : 'Изпрати още едно запитване'}
        </button>
      </div>
    );
  }

  const errorText = (key: keyof Errors) =>
    errors[key] ? (
      <p id={id(`${key}-error`)} className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-snug text-red-600">
        <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        {errors[key]}
      </p>
    ) : null;

  const fieldProps = (key: ContactField) => ({
    id: id(key),
    value: form[key],
    onChange: update(key),
    onBlur: blur(key),
    'aria-invalid': !!errors[key],
    'aria-describedby': errors[key] ? id(`${key}-error`) : undefined,
    className: `${fieldBase} h-12 ${errors[key] ? fieldError : fieldOk}`,
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Напредък: две стъпки — реална последователност */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between gap-3">
          <p
            ref={step2HeadingRef}
            tabIndex={-1}
            className="text-[13px] font-semibold text-brand-dark focus:outline-none"
            aria-live="polite"
          >
            Стъпка {step} от 2 — {step === 1 ? 'Вашите данни' : 'Пътуването'}
          </p>
          {step === 2 && (
            <p className="truncate text-[12px] text-slate-500">{form.name.trim()} · {form.phone}</p>
          )}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5" aria-hidden="true">
          <span className="h-1 rounded-full bg-brand-dark" />
          <span className={`h-1 rounded-full transition-colors ${step === 2 ? 'bg-brand-dark' : 'bg-slate-200'}`} />
        </div>
      </div>

      {step === 1 ? (
        <div className="space-y-5">
          <div>
            <label htmlFor={id('name')} className={labelClass}>Име и фамилия</label>
            <input ref={nameRef} type="text" autoComplete="name" placeholder="Иван Иванов" {...fieldProps('name')} />
            {errorText('name')}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor={id('phone')} className={labelClass}>Телефон</label>
              <input type="tel" inputMode="tel" autoComplete="tel" placeholder="0887 61 61 00" maxLength={18} {...fieldProps('phone')} />
              {errorText('phone')}
            </div>
            <div>
              <label htmlFor={id('email')} className={labelClass}>Имейл</label>
              <input type="email" inputMode="email" autoComplete="email" placeholder="ivan@mail.bg" {...fieldProps('email')} />
              {errorText('email')}
            </div>
          </div>
          <p className="text-[12px] leading-relaxed text-slate-500">
            На имейла ще получите офертата, а по-късно и документите за пътуването.
          </p>
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-dark py-3.5 text-[15px] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-slate-700 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
          >
            Напред
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* От страницата на тур: докато екскурзиите се заредят — кратък надпис, а не целият избор (иначе за миг
              излизаха всички държави, преди да се покаже само този тур) */}
          {defaultTourSlug && !toursLoaded ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-4 text-[14px] text-slate-500" role="status">Зареждане на екскурзията…</p>
          ) : (
            <TourPicker
              simple
              tours={tours}
              value={choice}
              onChange={next => { setChoice(next); setDate(next.kind === 'tour' ? next.date ?? '' : ''); }}
            />
          )}

          {selectedTour && (
            <div>
              <label htmlFor={id('date')} className={labelClass}>Желана дата</label>
              <div className="relative">
                <select
                  id={id('date')}
                  value={date}
                  onChange={e => {
                    setDate(e.target.value);
                    if (choice.kind === 'tour') setChoice({ kind: 'tour', tourId: choice.tourId, ...(/^\d{4}-/.test(e.target.value) ? { date: e.target.value } : {}) });
                  }}
                  className={`${fieldBase} ${fieldOk} h-12 cursor-pointer appearance-none pr-11`}
                >
                  <option value="">Изберете дата</option>
                  <option value="Без точна дата">Още не съм решил(а)</option>
                  {upcomingDates.map(d => <option key={d} value={d}>{toDisplayDate(d)}</option>)}
                </select>
                <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              </div>
            </div>
          )}

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <label htmlFor={id('message')} className="text-[13px] font-semibold text-brand-dark">
                Въпроси или съобщение <span className="font-normal text-slate-500">(по желание)</span>
              </label>
              <span className={`text-[12px] tabular-nums ${form.message.length > MESSAGE_MAX ? 'text-red-600' : 'text-slate-400'}`} aria-live="polite">
                {form.message.length}/{MESSAGE_MAX}
              </span>
            </div>
            <textarea
              id={id('message')}
              rows={4}
              value={form.message}
              onChange={update('message')}
              maxLength={MESSAGE_MAX + 200}
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? id('message-error') : undefined}
              placeholder="Например: колко души пътувате, въпроси за програмата или хотелите"
              className={`${fieldBase} ${errors.message ? fieldError : fieldOk} resize-none py-3 leading-relaxed`}
            />
            {errorText('message')}
          </div>

          {status === 'error' && (
            <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-[14px] text-red-700">
              <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p>
                Не успяхме да изпратим запитването. Опитайте отново или ни се обадете на{' '}
                <a href={`tel:${COMPANY_INFO.phone}`} className="font-semibold underline">{COMPANY_INFO.phone}</a>.
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-300 px-5 py-3.5 text-[15px] font-semibold text-brand-dark transition-colors hover:border-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
            >
              <ArrowLeft size={17} aria-hidden="true" />
              Назад
            </button>
            <button
              type="submit"
              disabled={status === 'sending'}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-dark py-3.5 text-[15px] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-slate-700 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
            >
              {status === 'sending' ? (
                <><Loader2 size={18} className="motion-safe:animate-spin" aria-hidden="true" /> Изпращаме…</>
              ) : (
                'Изпрати запитването'
              )}
            </button>
          </div>
          <p className="text-center text-[12px] leading-relaxed text-slate-500">
            Използваме данните ви само за да отговорим на запитването и да подготвим пътуването.
          </p>
        </div>
      )}
    </form>
  );
}
