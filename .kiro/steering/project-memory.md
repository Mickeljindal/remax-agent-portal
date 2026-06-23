# Project Memory — RE/MAX Excellence Agent Portal

> Always-included steering file. This is the durable memory of the project so context
> survives across sessions and IDE updates. Keep it current as the project evolves.

## What this project is

A web portal for RE/MAX Excellence real-estate agents. It centralizes resources for
agents: courses/training, property + pre-construction listings, marketing assets,
vendors, support tickets/booking, office info, and an admin control center.

There is also a **separate, unrelated spec** in `.kiro/specs/kloudbean-agency-promos`
for animated standalone HTML promo videos for "KloudBean" (a cloud hosting platform).
Do not confuse the two — the promos are marketing deliverables, the portal is the app.

## Tech stack

- **Frontend**: React 18 + TypeScript + Vite, React Router v6, TanStack Query.
- **UI**: shadcn/ui (Radix primitives) + Tailwind CSS, lucide-react icons, sonner toasts.
- **Forms**: react-hook-form + zod.
- **Calendar**: FullCalendar (training/events, incl. recurring + monthly-by-weekday).
- **Backend**: Express server (`server.js` + `server/index.js`) handling agent
  registration, password reset, email sending, and file uploads (multer).
- **Database/Auth**: Supabase (Postgres). Migrations live in `supabase/migrations/`.
  Helper SQL also in `RUN_THIS_IN_SUPABASE.sql` and `SETUP_DATABASE.sql`.
- **Email**: DB-driven, admin-controllable notification settings ("Email Settings"
  / notification control center). Support tickets route by category to emails.

## Key scripts

- `npm run dev` — Vite dev server (user runs manually; do not launch long-running).
- `npm run build` — production build.
- `npm run lint` — ESLint.
- `npm test` / `npm run test:watch` — Vitest.
- `npm start` — runs the Node server (`server.js`).
- `scripts/` has utilities: create-admin, list-accounts, run-migration,
  sync-auth-emails, capture-screenshots, render-reel, deck-to-pdf.

## Auth model

- Switched from RECO-number login to **email + password** login (agents have a phone
  number field). `reco_number` is nullable — guard against nulls in admin pages.

## Admin capabilities (built so far)

- Editable section/card titles across dashboard and inner pages.
- Section reordering across all parts; listing grid column control.
- Admin-managed `precon_statuses` drive the agent Sales status filter.
- Editable calculator names; per-office booking emails; support categories.
- Course thumbnail size hint; course modules incl. Listing Presentation Kit,
  Agent Success Kit, and PDF modules.
- Email Settings = full notification control center; all emails DB-driven.

## Known gotchas / past fixes

- Empty `SelectItem` value crashes Radix Select — never use "" as an item value
  (caused Property Management add/edit dialog crash).
- Nullable `reco_number` caused blank admin page crash — always null-check.
- Invisible status/tag badges in Admin Listings were a styling bug (fixed).
- Pre-con listing cards (`PreConSection.tsx`): status badge color now comes from
  `precon_statuses.color` (admin-set) via `statusBadgeClass` + `STATUS_TINT`, with a
  keyword fallback. Earlier it used a hardcoded name map so custom statuses
  ("Now Selling", "Move-In Ready") rendered gray. The card's city·type line now shows
  the real `property_type` (custom types included) instead of forcing the literal
  "Mixed"/"—"; the line is hidden when both city and type are empty.
- Tailwind JIT purges dynamic `bg-${color}` classes — always use full literal class
  strings in color maps (see STATUS_TINT, AdminListings SOLID_BADGE).
- Server env loading needed care — `.env` at root and `server/.env`.

## Conventions

- Match existing shadcn/ui + Tailwind patterns; do not introduce new UI libs.
- Keep changes scoped; prefer DB-driven/admin-editable values over hardcoding.
- Run `npm run build` / `npm run lint` after changes to verify.

## Working agreement with the user

- The user trusts me to proceed on local, reversible changes without stopping to
  ask for permission on each step. Act autonomously; only pause for genuinely
  destructive or high-risk actions (data loss, production, auth/security changes).
