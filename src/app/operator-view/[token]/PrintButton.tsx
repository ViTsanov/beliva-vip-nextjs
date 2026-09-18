"use client";

// Малък клиентски бутон за печат — самата страница е Server Component (заради Admin SDK четенето
// и декриптирането), но window.print() изисква браузърен контекст, затова е отделен малък компонент.
export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-brand-dark text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-brand-gold hover:text-brand-dark transition-all print:hidden"
    >
      Разпечатай / Запази като PDF
    </button>
  );
}
