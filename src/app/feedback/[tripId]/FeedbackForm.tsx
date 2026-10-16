"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, CheckCircle2, HeartHandshake, Loader2 } from 'lucide-react';
import { submitReview } from './actions';

interface FeedbackFormProps {
  token: string;
  firstName: string;
  tourTitle: string;
}

export default function FeedbackForm({ token, firstName, tourTitle }: FeedbackFormProps) {
  const [rating, setRating] = useState(5);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  // Съгласието за публикуване е изрично — отметката НЕ е предварително сложена (изискване на GDPR).
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await submitReview(token, { rating, comment, consent });
    setSubmitting(false);
    if (result.success) setSubmitted(true);
    else setError(result.error || 'Възникна грешка. Моля, опитайте отново.');
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcf9f2] text-center p-6">
        <div className="bg-white p-12 rounded-[4rem] shadow-2xl max-w-lg w-full border border-brand-gold/10">
          <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <HeartHandshake size={40} />
          </div>
          <h1 className="text-4xl font-serif italic text-brand-dark mb-4">Благодарим Ви!</h1>
          <p className="text-gray-500 leading-relaxed mb-8">
            Вашият отзив е безценен за нас. Радваме се, че бяхте част от пътешествието
            {tourTitle ? <> „<span className="font-bold text-brand-dark">{tourTitle}</span>“</> : null}.
          </p>
          <Link href="/" className="inline-block text-[10px] font-black uppercase tracking-widest bg-brand-dark text-white px-10 py-5 rounded-3xl hover:bg-brand-gold hover:text-brand-dark transition-all shadow-xl">
            Разгледайте нови оферти
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcf9f2] flex items-center justify-center p-4 sm:p-6 py-20">
      <div className="max-w-2xl w-full">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Image src="/beliva_logo.png" alt="Beliva VIP Tour" width={150} height={60} className="drop-shadow-md" />
          </Link>
        </div>

        <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border border-white/50">
          <h1 className="text-3xl md:text-4xl font-serif italic text-brand-dark mb-2">
            Здравейте{firstName ? `, ${firstName}` : ''}!
          </h1>
          <p className="text-gray-500 mb-10">
            Как премина пътуването Ви{tourTitle ? <> до <span className="font-bold text-brand-dark">{tourTitle}</span></> : null}?
          </p>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">Вашата оценка</p>
              <div className="flex gap-2" role="radiogroup" aria-label="Оценка">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={rating === star}
                    aria-label={`${star} от 5`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(null)}
                    className="p-1 transition-transform hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold rounded-lg"
                  >
                    <Star
                      size={40}
                      className={`transition-colors duration-300 ${star <= (hoveredStar ?? rating) ? 'fill-brand-gold text-brand-gold drop-shadow-md' : 'text-gray-300'}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="feedback-comment" className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-4 mb-2 block">
                Вашите впечатления (по желание)
              </label>
              <textarea
                id="feedback-comment"
                rows={5}
                maxLength={3000}
                placeholder="Разкажете ни кое Ви хареса най-много и какво можем да подобрим..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="w-full bg-gray-50 p-6 rounded-[2rem] border border-gray-100 focus:bg-white focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 outline-none resize-none transition-all"
              />
            </div>

            <label className="flex items-start gap-4 p-4 bg-brand-gold/5 rounded-2xl cursor-pointer group">
              <div className="relative flex items-center justify-center mt-1">
                <input type="checkbox" className="sr-only peer" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-brand-gold ${consent ? 'bg-brand-gold border-brand-gold' : 'border-gray-300 group-hover:border-brand-gold'}`}>
                  {consent && <CheckCircle2 size={14} className="text-white" />}
                </div>
              </div>
              <span className="text-sm text-gray-600 font-medium leading-relaxed select-none">
                Съгласявам се, при преценка на екипа, моят отзив да бъде публикуван в уебсайта на Beliva VIP Tour.
              </span>
            </label>

            {error && <p className="text-red-500 text-sm text-center bg-red-50 py-3 rounded-xl">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-dark text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-all shadow-[0_10px_30px_rgba(0,0,0,0.15)] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Изпрати отзив'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
