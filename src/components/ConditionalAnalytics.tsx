"use client";

import { useState, useEffect } from 'react';
import { GoogleAnalytics } from '@next/third-parties/google';

const GA_ID = "G-FXLJBHSJ6K";
export const COOKIE_CONSENT_KEY = 'beliva_cookie_consent';
export const COOKIE_CONSENT_EVENT = 'beliva-cookie-consent-changed';

// Зарежда Google Analytics САМО ако потребителят реално е избрал "Приемам всички" в CookieConsent.
// Преди тази промяна GA се зареждаше безусловно за всеки посетител, независимо от избора му —
// в разрез с GDPR/ePrivacy изискването за предварително съгласие ПРЕДИ да се задават аналитични бисквитки,
// и в директно противоречие с текста на самата ни Политика за поверителност.
export default function ConditionalAnalytics() {
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);

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

  if (!analyticsAllowed) return null;
  return <GoogleAnalytics gaId={GA_ID} />;
}
