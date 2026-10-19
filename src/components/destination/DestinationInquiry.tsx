"use client";

import { useEffect, useState, type ReactNode } from 'react';
import InquiryDialog from '@/components/inquiry/InquiryDialog';

// Един прозорец „Запитване“ за цялата страница на държавата. Бутоните (в героя, на всяка оферта, в „Защо с
// Beliva“) само пращат събитие — така страницата остава сървърна, а клиентски са само самите бутони.
const EVENT = 'destination:inquiry';

export function DestinationInquiryHost({ country }: { country: string }) {
  const [open, setOpen] = useState(false);
  const [tourSlug, setTourSlug] = useState<string | undefined>();

  useEffect(() => {
    const onOpen = (e: Event) => {
      setTourSlug((e as CustomEvent<{ tourSlug?: string }>).detail?.tourSlug);
      setOpen(true);
    };
    window.addEventListener(EVENT, onOpen);
    return () => window.removeEventListener(EVENT, onOpen);
  }, []);

  return (
    <InquiryDialog
      // key: нов тур → формата започва отначало с него
      key={tourSlug || 'general'}
      open={open}
      onClose={() => setOpen(false)}
      defaultTourSlug={tourSlug}
      defaultCountry={country}
      source="destination_page"
    />
  );
}

export function openDestinationInquiry(tourSlug?: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { tourSlug } }));
}

export function InquiryButton({ className, children, tourSlug }: { className: string; children: ReactNode; tourSlug?: string }) {
  return (
    <button type="button" className={className} onClick={() => openDestinationInquiry(tourSlug)}>
      {children}
    </button>
  );
}
