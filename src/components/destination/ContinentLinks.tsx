"use client";

import { glideToElement } from '@/lib/smoothScroll';
import ContinentShape from '@/components/destination/ContinentShape';

export interface ContinentTile {
  id: string;
  name: string;
  countries: number;
  bg: string;
  ink: string;
  shape: string;
}

// Плочките „Азия“, „Африка“… в началото на /destinations — всяка в цвета на своя континент, със силуета му.
// Натискане → плавно превъртане до континента.
export default function ContinentLinks({ continents }: { continents: ContinentTile[] }) {
  return (
    // На телефон (2 колони) последната плочка при нечетен брой заема целия ред
    <ul aria-label="Континенти" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 [&>li:last-child:nth-child(odd)]:col-span-2 sm:[&>li:last-child:nth-child(odd)]:col-span-1">
      {continents.map((c) => (
        <li key={c.id}>
          <a
            href={`#${c.id}`}
            onClick={(e) => {
              e.preventDefault();
              glideToElement(document.getElementById(c.id));
            }}
            style={{ backgroundColor: c.bg }}
            className="group flex h-full min-h-[132px] flex-col justify-between gap-3 rounded-3xl p-4 transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-brand-gold sm:p-5"
          >
            <ContinentShape src={c.shape} color={c.ink} className="h-14 w-14 transition-transform duration-300 group-hover:scale-110" />
            <span>
              <span className="block text-[17px] font-semibold leading-tight text-brand-dark">{c.name}</span>
              <span className="mt-0.5 block text-sm text-slate-700">
                {c.countries} {c.countries === 1 ? 'държава' : 'държави'}
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
