"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CookieConsent from "./CookieConsent";
import ScrollToTop from "./ScrollToTop";
export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // 1. ЛОГИКА ЗА СКРОЛВАНЕ ПРИ ВСЯКА СМЯНА НА ПЪТЯ
  useEffect(() => {
    // Това ще се изпълнява всеки път, когато 'pathname' се промени
    window.scrollTo(0, 0);
  }, [pathname]); // 👈 Добавихме 'pathname' като зависимост

  // Списък с пътища, където НЕ искаме навигация и футър
  const isHidden = pathname.startsWith("/login-vip") || pathname.startsWith("/admin-beliva-2025");

  if (isHidden) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen"> {/* Добавяме min-h-screen за стабилност */}
        {children}
      </main>
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </>
  );
}