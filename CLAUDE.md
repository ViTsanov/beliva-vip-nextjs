# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
```

No test suite is configured. Verify changes by running the dev server and checking the browser.

## Stack

- **Next.js 16** App Router with React 19 and TypeScript
- **Tailwind CSS v3** (PostCSS via `@tailwindcss/postcss`)
- **Firebase** — Firestore (data), Auth (admin session), Storage (images), Cloud Functions (`us-central1` region, used for AI chat)
- **Framer Motion** — animations throughout; always respect `useReducedMotion()`
- **Language**: UI copy and code comments are in Bulgarian (Cyrillic). Keep new comments in Bulgarian unless the file is already mixed.

## Architecture

### Data flow

All tour and blog data lives in **Firestore**. The primary data layer is `src/services/tourService.ts`:
- `normalizeTour()` adapts raw Firestore `DocumentData` to the strict `ITour` type — normalizing `included`/`excluded`/`gallery` from string or array, converting Timestamps to ISO strings. **Always pass raw Firestore docs through this function.**
- Firestore queries always use explicit `orderBy` to prevent React hydration mismatches between SSR and client re-fetches.

### Types

All domain types are in `src/types/index.ts`: `ITour`, `IPost`, `IClient`, `IBooking`, `IDeparture`. `ITour` supports dual-source tours (own + PeakView via `source` / `peakViewId`). Promo fields (`isPromo`, `discountPrice`, `promoLabel`, etc.) are optional.

### Firebase singleton

`src/lib/firebase.ts` exports `db`, `auth`, `storage`, `functions`. It uses the singleton pattern (`getApps().length > 0 ? getApp() : initializeApp()`). Always import from here, never re-initialize.

### Admin panel

Protected by `src/middleware.ts` — checks for `admin_session` cookie. Route prefix: `/admin-beliva-2025`. Login page: `/login-vip`. The admin panel is a full CRM/ERP: clients (`IClient`), bookings (`IBooking`), departures (`IDeparture`).

### AI features

- **Chat widget** (`src/components/AIChatWidget.tsx`): calls `sendMessageToAI()` from `src/lib/aiService.ts`, which invokes Firebase Cloud Function `chatWithAI` with message history and optional tour context.
- **AI tour formatting** (`src/app/api/ai-format-tour/route.ts`): server-side Claude/AI API call to reformat scraped tour data.

### Scraping pipeline (admin use)

- `/api/scrape` — scrapes a single tour URL (currently optimized for `2mko.com`) using Cheerio. Handles windows-1251 encoding fallback for Cyrillic pages.
- `/api/scout` — bulk-scrapes a tour operator's listing page, deduplicates against existing Firestore tours via normalized URL, and returns new URLs to import.

### Company constants

`src/lib/companyInfo.ts` exports `COMPANY_INFO` with contact info, social links, license number, and legal name. Use this instead of hardcoding company data.

### Key environment variables

All Firebase keys are `NEXT_PUBLIC_FIREBASE_*`. The Claude/AI API key is consumed server-side in `/api/ai-format-tour`.

## Page structure

| Path | Notes |
|------|-------|
| `/` | Home — hero, featured tours, testimonials |
| `/tour/[id]` | Tour detail — uses `tourId` slug as `[id]` |
| `/destinations/[country]` | Filtered tour list by country |
| `/blog`, `/blog/[id]` | Blog posts from Firestore |
| `/favorites` | Client-side only (localStorage) |
| `/reviews` | Public reviews |
| `/admin-beliva-2025` | CRM dashboard (cookie-gated) |
| `/feedback/[tripId]` | Post-trip feedback form |

## Conventions

- **Server Components by default** — add `"use client"` only when hooks/interactivity are needed. Many pages export a static Server Component that imports a `*Client.tsx` sibling for the interactive parts.
- **Image domains** — allowed external image hosts are declared in `src/lib/operatorImageDomains.ts`. Add new operator domains there, not in `next.config`.
- **Price formatting** — use `src/lib/formatPrice.ts`. Default price string is `"По запитване"` (on inquiry).
- **`motion-safe:` prefix** — use Tailwind's `motion-safe:` variant or `useReducedMotion()` for any animation that bounces, spins, or pulses.
- **Accessibility** — ARIA labels in Bulgarian. Icon-only interactive elements need `aria-label`. Use `<article>` for tour cards (not `<Link>` wrappers containing buttons).
