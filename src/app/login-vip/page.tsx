"use client";

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { createSession } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Логваме се през твоя Firebase Authentication
      await signInWithEmailAndPassword(auth, email, password);
      
      // 2. Създаваме сървърна сесия (бисквитка)
      await createSession();
      
      // 3. Пренасочваме към админа
      router.push('/admin-beliva-2025');
      router.refresh();
    } catch (err: any) {
      setError('Грешен имейл или парола.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-6">
      <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl w-full max-w-md">
        <div className="w-20 h-20 bg-brand-gold/10 text-brand-gold rounded-full flex items-center justify-center mx-auto mb-8 text-4xl">
          <Lock size={40} />
        </div>
        <h1 className="text-3xl font-serif font-bold text-brand-dark text-center mb-6">Админ Достъп</h1>

        <form onSubmit={handleLogin} className="space-y-5">
          <input 
            type="email" 
            placeholder="Имейл" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-brand-gold/20"
          />
          <input 
            type="password" 
            placeholder="Парола" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-brand-gold/20"
          />
          <button 
            disabled={loading}
            className="w-full bg-brand-gold text-white font-bold py-4 rounded-2xl hover:bg-brand-dark transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : "ВЛЕЗ"}
          </button>
          {error && <p className="text-red-500 text-center font-bold text-sm mt-4">{error}</p>}
        </form>
      </div>
    </div>
  );
}