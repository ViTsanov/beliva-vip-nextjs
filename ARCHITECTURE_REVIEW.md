# Beliva VIP Tour (beliva-next) — Architecture Review

**Status:** Informational review (no single decision pending)
**Date:** 2026-08-12
**Reviewer:** Claude (engineering:architecture)
**Scope:** Full repo at `beliva-next/` — public site, admin CRM, API routes, Cloud Functions

## Context

Beliva VIP Tour is a Next.js 16 (App Router) travel-agency site with an embedded admin/CRM panel. It's a solo-developer project (one contributor, ~58 commits) deployed on Firebase App Hosting, backed by Firestore/Auth/Storage, with two Firebase Cloud Functions (an OpenAI-powered chat assistant and an OG-image proxy) and a handful of Next.js API routes that scrape a competitor site and reformat scraped content via OpenAI.

## Current Architecture

- **Frontend/SSR:** Next.js 16 App Router, React 19, Tailwind. Public pages (`/`, `/destinations`, `/tour/[id]`, `/blog`, etc.) are server components that call Firestore **directly via the client SDK** (`src/lib/firebase.ts`) at request time — there is no Admin SDK usage anywhere in `src/`, only inside `functions/`.
- **Data layer:** `src/services/tourService.ts` is the only real service abstraction (tour reads + a `normalizeTour()` adapter that patches around inconsistent Firestore document shapes). Everything else — 9 admin components, blog, clients, groups, reservations, settings — talks to Firestore directly, inline in the component.
- **Admin/CRM:** Single route `/admin-beliva-2025`, gated by an `admin_session` cookie set by a server action (`src/app/actions/auth.ts`). Real authentication is Firebase Auth (`signInWithEmailAndPassword`) on the login page.
- **API routes (Next.js):** `ai-format-tour` (calls OpenAI `gpt-4o` directly with the raw `OPENAI_API_KEY`), `bot-meta` (serves hand-built HTML/OG tags to social-media crawlers), `scrape` and `scout` (server-side `cheerio` scraping of a competitor site, 2mko.com, to find and parse new tour offers).
- **Cloud Functions (separate deploy, `functions/`):** `chatWithAI` (callable, OpenAI `gpt-4o-mini`, pulls live tour catalog + company info from Firestore for context), `proxyOgImage` (HTTP, fetches and re-serves tour images with a spoofed browser UA so Facebook's scraper can read them).
- **Middleware:** UA-sniffs for known bot strings and rewrites `/tour/*` and `/blog/*` requests to `/api/bot-meta` — a workaround so social crawlers see proper OG tags.
- **No tests, no CI/CD pipeline, no Firestore security rules file in the repo** (rules are presumably managed only in the Firebase console).

## Findings

| Severity | Area | Issue | Recommendation |
|---|---|---|---|
| **Critical** | Admin auth | `createSession()` sets the `admin_session` cookie unconditionally when called — it never verifies a Firebase ID token server-side. The login page *happens* to only call it after a successful `signInWithEmailAndPassword`, but the server action itself trusts any caller. Anyone who can invoke that server action directly gets an admin cookie without ever authenticating. | Verify a Firebase ID token (or session cookie via Admin SDK `verifySessionCookie`) inside `createSession()` before setting the cookie. Don't rely on "the UI only calls this after login." |
| **High** | Unauthenticated API routes | `/api/scrape` fetches **any arbitrary URL** the caller supplies, server-side, with no auth and no allow-list — a textbook SSRF primitive. `/api/scout` and `/api/ai-format-tour` are similarly open and each triggers real cost (scraping load, OpenAI `gpt-4o` calls) with no auth or rate limiting. | Gate all three behind the admin session check (verify the cookie server-side, same fix as above), add a domain allow-list to `/api/scrape`, and rate-limit. |
| **High** | Security rules not in source control | Firestore rules aren't checked into the repo, so there's no code review, diff history, or rollback for the only enforcement layer protecting writes (since the app never uses the Admin SDK, Firestore rules are the *entire* authorization boundary for tours/clients/reservations). | Pull `firestore.rules` into the repo and deploy it via `firebase deploy` as part of the normal flow, so changes are reviewable. |
| **Medium** | God component | `AdminDashboardClient.tsx` is 1,381 lines — tabs, state, and Firestore calls for the whole CRM in one file. `TourForm.tsx` (705 lines) and `ReservationsTab.tsx` (485 lines) are heading the same way. | Split by tab/domain (already named `ClientsTab`, `GroupsTab`, etc. — push more state and logic down into them) and extract a shared Firestore hook per entity. |
| **Medium** | No data-access layer for admin | Firestore queries are written inline in ~9 components. A schema change (e.g. renaming a `tours` field) means hunting through every admin file instead of one service. | Extend the `tourService.ts` pattern to `clientService.ts`, `groupService.ts`, `reservationService.ts`. |
| **Medium** | Schema drift | `normalizeTour()` exists specifically to reconcile inconsistent field names (`included` vs `notIncluded`/`excluded`, `images` vs `gallery`) accumulated over time. `ITour` in `types/index.ts` has multiple overlapping optional fields for the same concept. | Worth a one-time data migration to a single canonical shape, now, before more variants accumulate — the adapter pattern is a reasonable stopgap but debt is compounding. |
| **Medium** | No tests, no CI | The app handles bookings and client PII (`IClient.iban` — bank account numbers) with zero automated tests or CI gate. Any change ships straight to production. | At minimum, add a CI step that runs `next build` + `eslint` on PRs; consider a smoke test for the booking/reservation write path given it touches financial data. |
| **Low** | Inconsistent secret handling | `OPENAI_API_KEY` is used two different ways: properly scoped as a Firebase Functions secret for `chatWithAI`, but read straight from `process.env` in the public, unauthenticated `/api/ai-format-tour` route. Same secret, two very different exposure levels. | Once that route is auth-gated (see above), this resolves itself — but worth normalizing secret access to one pattern. |
| **Low** | No caching/ISR on Firestore-backed pages | `/`, `/destinations/[country]`, `/tour/[id]` all hit Firestore live on every request (no `revalidate` export seen) via the client SDK from the server, with `minInstances: 1` / `maxInstances: 10` app hosting config. | Consider ISR (`export const revalidate = ...`) for tour/destination pages — content changes only when the admin edits it, not per-request. |

## What's working well

The public-facing SEO/social-sharing setup (middleware bot detection → `bot-meta` route → `proxyOgImage` function) is a well-thought-out, if unusual, three-piece solution to a real problem (Next.js SSR meta tags not always being picked up by Facebook/WhatsApp/Telegram scrapers). The `normalizeTour()` adapter is a pragmatic way to keep the frontend typed and stable while the underlying data is messy. For a single developer shipping a full booking + CRM + AI-assistant product, the scope-to-complexity ratio is reasonable.

## Action Items

1. [ ] Fix `createSession()` to verify a real Firebase credential before issuing the admin cookie (Critical — do this first).
2. [ ] Auth-gate `/api/scrape`, `/api/scout`, `/api/ai-format-tour`; add a URL allow-list to `/api/scrape`.
3. [ ] Check Firestore/Storage security rules into the repo as `firestore.rules` / `storage.rules`.
4. [ ] Break up `AdminDashboardClient.tsx` and extract per-entity Firestore services.
5. [ ] Add a basic CI check (build + lint) on pushes/PRs.
6. [ ] Plan a canonical schema for `ITour` and retire the dual-field adapter once migrated.
7. [ ] Add `revalidate` to Firestore-backed public pages to cut redundant reads.
