# Sprint Plan: Legal & Security Risk Reduction — beliva-next

**Dates:** 2026-08-12 — 2026-08-19 (1 week) | **Team:** Viktor (solo), a few hours/week (evenings/weekends)
**Sprint Goal:** Close the most visible, provable legal and security exposures on the live site — the ones that would be the first thing a regulator, competitor, or plaintiff's lawyer would point to — not "100% legal" in one week, which isn't realistic solo at this pace. Full closure needs 2-3 more sprints (see Backlog).

> Not legal advice. I'm flagging code-verifiable issues (things I can see in the repo) and well-established Bulgarian/EU requirements. Get a Bulgarian attorney to review the Terms & Privacy pages before or right after this sprint — several items below are blocked on information only you have.

## Capacity

| Person | Available this sprint | Allocation | Notes |
|--------|---------------|------------|-------|
| Viktor | ~6h (evenings/weekends) | ~5h committed, ~1h buffer | Solo — no reviewer, no second pair of eyes. Test the admin-login change carefully; it's the one item that can lock you out of your own admin panel. |
| **Total** | **~6h** | **~5h (83%)** | Slightly over the usual 70-80% guideline given how few true P0s there are — trim the auth fix scope if it runs long (see Risks). |

## Sprint Backlog

| Priority | Item | Estimate | Why it's P0 | Dependencies |
|----------|------|----------|--------------|--------------|
| P0 | Replace placeholder text in `/terms` and `/privacy` with real company data (`COMPANY_INFO`) | 0.75h | Your live Terms page currently shows `[ТВОЯТА ФИРМА ЕООД/ООД]`, `[123456789]`, `[РК-01-XXXX]` instead of real data — a public legal document that misrepresents your own identity. Direct exposure under ЗЕТ (E-Commerce Act) Art. 4/4a trader-identification rules and Tourism Act license-disclosure requirements. Privacy page has the same issue in the intro paragraph and retention period. | None — EIK (`205787579`) and license (`РК-01-8061`) already exist in `companyInfo.ts`, just not wired into these two pages. |
| P0 | Gate Google Analytics behind actual cookie consent | 1.25h | `<GoogleAnalytics>` in `layout.tsx` loads unconditionally for every visitor. The cookie banner asks for consent but nothing in the code actually blocks the analytics script when someone declines — a concrete, easily-provable GDPR/ePrivacy violation that Bulgaria's КЗЛД actively fines for. | None |
| P0 | Legal-copy pass: add 3 missing disclosures | 1h | (1) Right-of-withdrawal exemption for travel bookings — Bulgarian consumer law exempts date-specific travel/accommodation services from the standard 14-day withdrawal right, but you still have to *say so*, or a customer can reasonably assume it applies. (2) AI chat disclosure — tell users they're talking to an AI assistant (EU AI Act Art. 50 transparency duty). (3) International transfer note in Privacy Policy — you send data to OpenAI (US) and Google/Firebase; GDPR requires disclosing this. | None — all three are text additions to existing pages/components. |
| P0 (stretch risk) | Fix admin login: verify a real Firebase credential server-side before issuing the `admin_session` cookie | 2h | From last week's architecture review: `createSession()` currently sets the admin cookie for *any* caller, without checking that a real login happened. Your admin panel holds client PII including IBANs — an actual breach here is a GDPR Art. 32/33 problem (mandatory breach notification, real fine exposure), not just a bug. | None, but test thoroughly — this is the one change that can break your own login. |
| P1 (do if P0 finishes early) | Auth-gate `/api/scrape`, `/api/scout`, `/api/ai-format-tour` | ~1h | Reuses the verification helper built for the admin-login fix, so it's cheap once that's done. Closes the SSRF/cost-abuse hole flagged in the architecture review. | Admin session fix above |

**Planned load:** ~5h committed (P0) + up to 1h stretch (P1) against ~6h available.

## Explicitly Out of Scope This Sprint (Backlog)

- **Operator liability insurance & registered correspondence address disclosure** — blocked. You skipped this in the intake form; I can't invent an insurer, policy number, or address. Send me those and it's a 15-minute fix to add them to Terms/Privacy/Footer.
- **Firestore/Storage security rules into version control** — bigger task, needs its own sprint slot.
- **Newsletter/contact-form explicit marketing-consent checkbox** — currently the footer newsletter signup writes straight to Firestore with no separate opt-in for marketing use.
- **Accessibility (WCAG) pass** — the EU Accessibility Act's June 2025 e-commerce deadline almost certainly doesn't bind you: it exempts micro-enterprises (<10 employees, <€2M revenue), which this looks like. Worth a light pass eventually for genuine UX reasons, not urgent for legal risk.
- **Attorney review of Terms & Privacy Policy** — strongly recommended once the placeholder fixes above ship. Not something I can substitute for.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| ~6h/week solo capacity vs. ~15-20h of real P0+P1 legal/security work identified overall | "100% legal" won't happen in one sprint | This sprint targets the highest-exposure items only; treat it as sprint 1 of 2-3, not the whole project |
| Admin-auth fix is the largest, riskiest item and could overrun 2h | Either it slips to next sprint, or it's rushed and breaks login | If it's not comfortably done with time to test by day 5, stop and ship the legal-copy fixes only — don't deploy a half-tested auth change |
| Address/insurance disclosure blocked on info only Viktor has | Terms/Privacy stay incomplete even after this sprint | Flagged explicitly above — send the info whenever, it's a fast follow-up |
| No second reviewer (solo project) | Legal text errors ship unchecked | Get a lawyer's eyes on `/terms` and `/privacy` after this sprint, before this becomes "final" |

## Definition of Done

- [ ] `/terms` and `/privacy` show real company name, EIK, and license number — no bracketed placeholder text remains
- [ ] Analytics script only loads after explicit "accept all" (or equivalent) consent, verified in an incognito browser test
- [ ] Right-of-withdrawal, AI-disclosure, and data-transfer clauses are live on the site
- [ ] Admin login tested end-to-end after the auth fix (successful login, failed login, and — importantly — that you can still get in)
- [ ] Changes committed and deployed

## Key Dates

| Date | Event |
|------|-------|
| 2026-08-12 | Sprint start |
| 2026-08-15 | Mid-sprint check-in — confirm legal-copy fixes shipped, gauge whether auth fix is on track |
| 2026-08-19 | Sprint end |
| 2026-08-19 | Retro — decide sprint 2 scope (Firestore rules, API auth-gating, insurance/address once you send the info) |
