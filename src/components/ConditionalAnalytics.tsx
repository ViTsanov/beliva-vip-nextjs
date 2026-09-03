"use client";

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { GoogleAnalytics } from '@next/third-parties/google';

const GA_ID = "G-FXLJBHSJ6K";
const META_PIXEL_ID = "1386237656096832";
export const COOKIE_CONSENT_KEY = 'beliva_cookie_consent';
export const COOKIE_CONSENT_EVENT = 'beliva-cookie-consent-changed';

// Зарежда Google Analytics САМО ако потребителят реално е избрал "Приемам всички" в CookieConsent.
// Преди тази промяна GA се зареждаше безусловно за всеки посетител, независимо от избора му —
// в разрез с GDPR/ePrivacy изискването за предварително съгласие ПРЕДИ да се задават аналитични бисквитки,
// и в директно противоречие с текста на самата ни Политика за поверителност.
export default function ConditionalAnalytics() {
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);
  const pathname = usePathname();
  const isFirstPathname = useRef(true);

  useEffect(() => {
    // При зареждане: проверяваме дали вече има запазен избор от предишно посещение
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent === 'all') setAnalyticsAllowed(true);

    // Слушаме за промяна на избора В РЕАЛНО ВРЕМЕ (напр. клик на "Приемам всички" в банера) —
    // без нужда потребителят да презарежда страницата, за да заработи проследяването.
    const handleConsentChange = () => {
      const updated = localStorage.getItem(COOKIE_CONSENT_KEY);
      setAnalyticsAllowed(updated === 'all');
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);
  }, []);

  // При всяка SPA навигация (смяна на pathname) пращаме нов PageView към Meta Pixel —
  // без това ретаргетинг аудиториите ("всички посетили сайта") ще виждат само първата страница.
  // Първият pathname го прескачаме, защото базовият PageView вече се изпраща вътре в самия Pixel скрипт при първото зареждане.
  useEffect(() => {
    if (isFirstPathname.current) {
      isFirstPathname.current = false;
      return;
    }
    if (analyticsAllowed && typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'PageView');
    }
  }, [pathname, analyticsAllowed]);

  if (!analyticsAllowed) return null;

  return (
    <>
      <GoogleAnalytics gaId={GA_ID} />

      {/* Meta Pixel — зарежда се само след изрично "Приемам всички" в CookieConsent, аналогично на GA4 */}
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        <img
          height={1}
          width={1}
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
