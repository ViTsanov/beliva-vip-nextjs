"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CookieConsent from "./CookieConsent";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // 1. ЛОГИКА ЗА СКРОЛВАНЕ ПРИ РЕФРЕШ
  useEffect(() => {
    // Тази функция се изпълнява само веднъж - когато компонентът се "монтира".
    // Това се случва при първо влизане или при REFRESH на страницата.
    // При навигация с Link или router.push, този компонент не се презарежда,
    // затова тази логика не пречи на бутона "Назад".
    
    // Казваме на браузъра да не възстановява автоматично скрола при рефреш
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    
    // Скролваме най-горе
    window.scrollTo(0, 0);

    // Възстановяваме настройката за 'auto', за да може бутонът "Назад" да работи нормално
    return () => {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
    };
  }, []); 

  // Списък с пътища, където НЕ искаме навигация и футър (Админ и Логин)
  const isHidden = pathname.startsWith("/login-vip") || pathname.startsWith("/admin-beliva-2025");

  if (isHidden) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      {children}
      <Footer />
      <CookieConsent />
    </>
  );
}