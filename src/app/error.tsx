"use client"; // error компонентите в Next.js винаги трябва да са клиентски

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Тук в бъдеще можем да свържем система за следене на грешки (като Sentry),
    // но засега просто ги принтираме в конзолата за нас (админите)
    console.error("Глобална грешка в сайта:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-light px-6">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 text-center shadow-xl border border-brand-gold/10 relative overflow-hidden">
        
        {/* Декорация */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-brand-gold/50 rounded-b-full"></div>
        
        {/* Иконка */}
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
          <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-50"></div>
          <AlertTriangle size={36} className="text-red-500 relative z-10" />
        </div>

        {/* Текст */}
        <h1 className="text-3xl font-serif font-bold text-brand-dark mb-4">
          Възникна проблем
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Не успяхме да заредим тази страница. Може би връзката е прекъснала или има временно претоварване на системата.
        </p>

        {/* Бутони */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full flex items-center justify-center gap-2 bg-brand-gold hover:bg-[#c5a35d] text-white py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-lg shadow-brand-gold/20"
          >
            <RefreshCcw size={16} />
            Опитай отново
          </button>
          
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-brand-dark py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all border border-gray-200"
          >
            <Home size={16} />
            Към началната страница
          </Link>
        </div>
      </div>
    </div>
  );
}