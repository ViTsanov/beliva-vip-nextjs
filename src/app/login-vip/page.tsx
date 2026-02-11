"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Успешен вход -> отиваме в админ панела
      router.push("/admin-beliva-2025");
    } catch (err: any) {
      console.error(err);
      setError("Грешен имейл или парола.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        
        {/* Декорация */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand-gold/10 text-brand-gold rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3">
                <Lock size={32} />
            </div>
            <h1 className="text-2xl font-serif font-bold text-brand-dark">Admin Access</h1>
            <p className="text-gray-400 text-sm">Вход само за служители на Beliva VIP</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 relative z-10">
            <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block pl-2">Email</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                        type="email" 
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-brand-dark focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all font-medium"
                        placeholder="admin@beliva.bg"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
            </div>

            <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block pl-2">Парола</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                        type="password" 
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-brand-dark focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all font-medium"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-500 text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-brand-dark text-white py-4 rounded-xl font-bold uppercase text-xs tracking-[0.2em] hover:bg-brand-gold hover:text-brand-dark transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {loading ? 'Влизане...' : <>Вход <ArrowRight size={16} /></>}
            </button>
        </form>

      </div>
    </div>
  );
}