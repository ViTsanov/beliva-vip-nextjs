"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Star, CheckCircle2, HeartHandshake, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function FeedbackPage() {
    const params = useParams();
    const tripId = params.tripId as string;

    const [loading, setLoading] = useState(true);
    const [customer, setCustomer] = useState<any>(null);
    const [trip, setTrip] = useState<any>(null);

    // Стейт за формата
    const [rating, setRating] = useState(5);
    const [hoveredStar, setHoveredStar] = useState<number | null>(null);
    const [comment, setComment] = useState('');
    const [consent, setConsent] = useState(true); // GDPR Съгласие
    
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchTripData = async () => {
            if (!tripId) return;
            try {
                // Търсим клиента, който съдържа този tripId в историята си
                const snap = await getDocs(collection(db, "customers"));
                let foundCust = null;
                let foundTr = null;

                snap.forEach(d => {
                    const data = d.data();
                    const t = data.tripHistory?.find((x: any) => x.tripId === tripId);
                    if (t) {
                        foundCust = { id: d.id, ...data };
                        foundTr = t;
                    }
                });

                if (foundCust && foundTr) {
                    setCustomer(foundCust);
                    setTrip(foundTr);
                }
            } catch(e) {
                console.error("Грешка при зареждане на отзива:", e);
            } finally {
                setLoading(false);
            }
        }
        fetchTripData();
    }, [tripId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // 1. Записваме ревюто в базата данни
            await addDoc(collection(db, "reviews"), {
                tourId: trip.tourId,
                tourTitle: trip.tourTitle,
                tourDate: trip.date,
                tourOperator: trip.tourOperator || 'Неизвестен',
                customerName: customer.name,
                customerId: customer.id,
                rating,
                comment,
                consentToPublish: consent, // 👈 ТУК ПАЗИМ СЪГЛАСИЕТО!
                isPublished: false, // Админът решава дали да го качи
                createdAt: serverTimestamp()
            });

            // 2. Обновяваме статуса в профила на клиента
            const updatedHistory = customer.tripHistory.map((t: any) =>
                t.tripId === tripId ? { ...t, feedbackStatus: 'completed' } : t
            );
            await updateDoc(doc(db, "customers", customer.id), { tripHistory: updatedHistory });

            setSubmitted(true);
        } catch(e) {
            console.error(e);
            alert("Възникна грешка. Моля опитайте отново.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#fcf9f2]"><Loader2 className="animate-spin text-brand-gold" size={40} /></div>;

    if (!customer || !trip) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcf9f2] text-center p-6">
                <div className="bg-white p-12 rounded-[3rem] shadow-xl max-w-md w-full">
                    <h1 className="text-2xl font-serif italic text-brand-dark mb-4">Невалиден линк</h1>
                    <p className="text-gray-500 mb-8">Този линк за отзив е невалиден или вече е използван.</p>
                    <Link href="/" className="text-[10px] font-black uppercase tracking-widest bg-brand-gold text-white px-8 py-4 rounded-2xl hover:bg-brand-dark transition-all">Към началната страница</Link>
                </div>
            </div>
        );
    }

    if (trip.feedbackStatus === 'completed' || submitted) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcf9f2] text-center p-6">
                <div className="bg-white p-12 rounded-[4rem] shadow-2xl max-w-lg w-full transform transition-all duration-700 hover:-translate-y-2 border border-brand-gold/10">
                    <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <HeartHandshake size={40} />
                    </div>
                    <h1 className="text-4xl font-serif italic text-brand-dark mb-4">Благодарим Ви!</h1>
                    <p className="text-gray-500 leading-relaxed mb-8">
                        Вашият отзив е безценен за нас. Радваме се, че бяхте част от пътешествието до <span className="font-bold text-brand-dark">{trip.tourTitle}</span>!
                    </p>
                    <Link href="/" className="inline-block text-[10px] font-black uppercase tracking-widest bg-brand-dark text-white px-10 py-5 rounded-3xl hover:bg-brand-gold hover:text-brand-dark transition-all shadow-lg hover:shadow-brand-gold/30">
                        Разгледайте нови оферти
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fcf9f2] flex items-center justify-center p-4 sm:p-6 py-20">
            <div className="max-w-2xl w-full">
                
                {/* ЛОГО */}
                <div className="flex justify-center mb-8">
                    <Link href="/">
                        <Image src="/beliva_logo.png" alt="Beliva Logo" width={150} height={60} className="drop-shadow-md" />
                    </Link>
                </div>

                <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border border-white/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                        <Star size={150} />
                    </div>

                    <div className="relative z-10">
                        <h1 className="text-3xl md:text-4xl font-serif italic text-brand-dark mb-2">Здравейте, {customer.name.split(' ')[0]}!</h1>
                        <p className="text-gray-500 mb-10">Как премина пътуването Ви до <span className="font-bold text-brand-dark">{trip.tourTitle}</span>?</p>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            
                            {/* ЗВЕЗДИ */}
                            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100">
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">Вашата оценка</p>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoveredStar(star)}
                                            onMouseLeave={() => setHoveredStar(null)}
                                            className="p-1 transition-transform hover:scale-125 focus:outline-none"
                                        >
                                            <Star 
                                                size={40} 
                                                className={`transition-colors duration-300 ${star <= (hoveredStar ?? rating) ? 'fill-brand-gold text-brand-gold drop-shadow-md' : 'text-gray-300'}`} 
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* КОМЕНТАР */}
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-4 mb-2 block">Вашите впечатления (по желание)</label>
                                <textarea 
                                    rows={5}
                                    placeholder="Разкажете ни кое ви хареса най-много и какво можем да подобрим..."
                                    value={comment}
                                    onChange={e => setComment(e.target.value)}
                                    className="w-full bg-gray-50 p-6 rounded-[2rem] border border-gray-100 focus:bg-white focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 outline-none resize-none transition-all text-brand-dark font-medium"
                                />
                            </div>

                            {/* GDPR СЪГЛАСИЕ (Отметката) */}
                            <label className="flex items-start gap-4 p-4 bg-brand-gold/5 rounded-2xl cursor-pointer group">
                                <div className="relative flex items-center justify-center mt-1">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only"
                                        checked={consent}
                                        onChange={(e) => setConsent(e.target.checked)}
                                    />
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${consent ? 'bg-brand-gold border-brand-gold' : 'border-gray-300 group-hover:border-brand-gold'}`}>
                                        {consent && <CheckCircle2 size={14} className="text-white" />}
                                    </div>
                                </div>
                                <span className="text-sm text-gray-600 font-medium leading-relaxed select-none">
                                    Съгласявам се, при преценка на екипа, моят отзив да бъде публикуван в уебсайта на Beliva VIP Tour.
                                </span>
                            </label>

                            <button 
                                type="submit" 
                                disabled={submitting}
                                className="w-full bg-brand-dark text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-all shadow-[0_10px_30px_rgba(0,0,0,0.15)] flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={18} /> : 'ИЗПРАТИ ОТЗИВ'}
                            </button>

                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}