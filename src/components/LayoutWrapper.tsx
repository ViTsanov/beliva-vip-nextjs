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
    // Това ще се изпълнява всеки път, когато 'pathname' се промени.
    // Ако адресът сочи секция (напр. /#poli от търсачката) — отиваме при нея, а не най-горе.
    // #tours-grid си има собствено плавно скролване в ToursGrid.
    const hash = decodeURIComponent(window.location.hash.slice(1));
    const target = hash && hash !== 'tours-grid' ? document.getElementById(hash) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname]); // 👈 Добавихме 'pathname' като зависимост

  // Списък с пътища, където НЕ искаме навигация и футър. "/checkout" е добавен — тази страница е изцяло
  // самостоятелна (клиентът попълва данни и плаща, навигацията би била само разсейваща вниманието).
  const isHidden = pathname.startsWith("/login-vip") || pathname.startsWith("/admin-beliva-2025") || pathname.startsWith("/checkout") || pathname.startsWith("/operator-view");

  if (isHidden) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen"> {/* Добавяме min-h-screen за стабилност */}
        {children}
      </main>
      {/* На началната страница footer-ът се слага върху фона на CTA секцията (brand-mist) —
          така тъмните закръглени ъгли (rounded-t-[3rem]) изглеждат като продължение на нея.
          На останалите страници нямаме CTA секция, затова фонът е прозрачен/кремав. */}
      {pathname === '/' ? (
        <div className="bg-brand-mist">
          <Footer />
        </div>
      ) : (
        <Footer />
      )}
      <CookieConsent />
      <ScrollToTop />
    </>
  );
}