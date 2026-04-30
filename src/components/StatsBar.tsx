import { ITour } from "@/types";
import { Star, Globe, Users, ShieldCheck } from "lucide-react";

interface StatsBarProps {
  tours: ITour[];
  averageRating?: string;
}

export default function StatsBar({ tours, averageRating = "4.9" }: StatsBarProps) {
  // Compute unique countries from live tour data
  const uniqueCountries = new Set<string>();
  tours.forEach(tour => {
    const countries = Array.isArray(tour.country)
      ? tour.country
      : (typeof tour.country === "string" ? tour.country.split(",").map(c => c.trim()) : []);
    countries.forEach(c => { if (c) uniqueCountries.add(c); });
  });
  const countryCount = uniqueCountries.size;

  const stats = [
    {
      icon: Globe,
      value: `${countryCount}+`,
      label: "дестинации",
      sublabel: "из целия свят",
    },
    {
      icon: Users,
      value: "Стотици",
      label: "водени групи",
      sublabel: "от Поли лично",
    },
    {
      icon: ShieldCheck,
      value: "15+",
      label: "години опит",
      sublabel: "в туризма",
    },
    {
      icon: Star,
      value: averageRating,
      label: "средна оценка",
      sublabel: "от клиенти",
    },
  ];

  return (
    <section className="bg-brand-dark relative z-20">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/8">
          {stats.map(({ icon: Icon, value, label, sublabel }, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center py-10 px-4 text-center group hover:bg-white/4 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center mb-4 group-hover:bg-brand-gold/20 transition-colors">
                <Icon size={18} className="text-brand-gold" />
              </div>
              <div className="text-3xl md:text-4xl font-serif font-bold text-white leading-none mb-1">
                {value}
              </div>
              <div className="text-[11px] font-black uppercase tracking-widest text-brand-gold/80 mt-1">
                {label}
              </div>
              <div className="text-[10px] text-white/35 font-medium mt-0.5">
                {sublabel}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
