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
- Pre-con worksheet (`PreConWorksheetForm.tsx` → `/api/submit-precon-worksheet` in
  `server.js` → `AdminWorksheets.tsx`): emails admin + agent copies (with ID image),
  saves the row to `precon_worksheets`, and now also writes the client ID image to
  disk under `uploads/precon-documents/worksheets/` and stores `id_attachment_url`
  so admins can view it inline in the admin dashboard. Needs migration
  `20260624140000_worksheet_attachment_url.sql` applied + server redeploy.
  SECURITY: ID images are now stored in PRIVATE storage (`private-uploads/`,
  env `PRIVATE_UPLOAD_DIR`), NOT under the public `/files/*` route. `id_attachment_url`
  holds a relative private path. The admin dashboard fetches the image via the
  admin-only `GET /api/worksheet-id/:id` endpoint (token sent, shown as object URL).
  Migration `20260624140000` already applied to the live DB.
- Server env loading needed care — `.env` at root and `server/.env`.
- Event → room booking conflict: `events.room_id` (migration `20260624150000`, applied
  to live DB) links an event to a `meeting_rooms` row. `AdminEvents.tsx` has optional
  Office + Room pickers. `OfficeBooking.tsx` fetches active events with a `room_id` for
  the selected day (`fetchRoomEvents` / `eventForSlot`) and blocks those hourly slots
  (amber "Event" label). Events with no `end_date` block a single 1-hour slot.
  NOTE: admins now manage meeting rooms in `AdminOffices.tsx` (`/admin/offices`) — each
  office card lists its rooms with add/edit/delete + active toggle (meeting_rooms CRUD).
  Default seeded rooms: Mississauga (Boardroom A, Meeting Room B, Virtual Room),
  Brampton (Conference Room, Huddle Room, Virtual Room).
- Course video "refused to connect": YouTube/Vimeo watch/share URLs can't be iframed.
  `src/lib/videoEmbed.ts` `toEmbedUrl()` converts watch/youtu.be/shorts/live/vimeo
  links to the provider `/embed/` form; used by `VideoPlayer.tsx` getEmbedUrl. Admins
  can paste any normal YouTube link now. Non-video URLs pass through unchanged.
  YouTube videos now track watch time automatically via the IFrame API
  (`loadYouTubeIframeApi`/`getYouTubeId` + YT branch in `VideoPlayer.tsx`,
  global typings in `src/types/youtube.d.ts`); auto-completes at ~90% watched.
  Vimeo/other embeds still complete manually. Direct uploads track natively.
- Promo reel: `docs/reel/reel.html` (vertical 1080x1920 HTML animation) +
  `scripts/render-reel.mjs` (puppeteer-core + ffmpeg → `docs/Agent-Portal-Reel.mp4`).
  Goal: a splashy 20-30s recruitment promo for social media to attract agents to
  RE/MAX Excellence ("when you join, you get tools that make your life easier").
  FIRST version used dense desktop screenshots scaled into a vertical frame — the
  user rejected it as unreadable, no clear message, no attraction. SECOND version was
  a typography-led redesign with purpose-drawn vector UI mockups (no screenshots).
  CURRENT version adds REAL PHOTOGRAPHY: 8 Unsplash photos in `docs/reel/img/`
  (home1, home2, interior1, agent_woman, agent_man, skyline, keys, handshake) used as
  Ken-Burns backgrounds behind the vector UI mock cards. `handshake.jpg` backs the
  outro. All 8 are referenced + preloaded in `reel.html`. Latest render: ~685 frames,
  ~22.8s, ~22 MB MP4. The render script proactively recycles Chrome every ~150 frames
  (headless crashes after ~600 screenshots) and retries dropped frames. Needs Chrome
  at /Applications + ffmpeg + puppeteer-core.
  NOTE: `scripts/` is gitignored, so render-reel.mjs / deck-to-pdf.mjs changes are NOT
  committed — only `docs/reel/reel.html`, `docs/reel/img/*.jpg`, and
  `docs/Agent-Portal-Reel.mp4` get committed.
  GOTCHA: terminal output buffers can be STALE after a render — verify the MP4's
  on-disk mtime is newer than the newest input image rather than trusting buffered logs.
  PENDING with user: the CTA site `joinremaxex.com` is a placeholder — confirm the
  real website/handle/phone; optionally add background music.

## CRM expansion (PLAN + PITCH ONLY — not built)

- Client wants to grow the portal into agent CRM features (inspired by novacrm.ai).
  Explicitly NOT building it yet — only a plan + a pitch deck to sell the idea.
- `docs/CRM_EXPANSION_PLAN.md` — why add CRM, NovaCRM reference, tailored feature set,
  fit with the existing React/Supabase/Express stack, ~8 proposed `crm_*` tables,
  5 delivery phases, risks.
- `docs/CRM-Pitch-Deck.html` — 12-slide deck matching `docs/agent-portal-deck.html`
  style, with drawn UI mockups (kanban pipeline, contact timeline, AI chat+draft,
  analytics dashboard). Rendered to `docs/CRM-Pitch-Deck.pdf` via the (gitignored)
  `scripts/deck-to-pdf.mjs` (now parameterized to take an input HTML + output PDF).

## Conventions

- Match existing shadcn/ui + Tailwind patterns; do not introduce new UI libs.
- Keep changes scoped; prefer DB-driven/admin-editable values over hardcoding.
- Run `npm run build` / `npm run lint` after changes to verify.

## Working agreement with the user

- **THE USER TRUSTS ME 100% — DO NOT ASK FOR PERMISSION/CONFIRMATION ON EACH STEP.**
  Do not stop to ask "should I proceed?", "want me to commit?", "is this okay?".
  Just do the whole task end-to-end: edit code, run `npm run build`, run migrations
  (`node scripts/run-migration.mjs <file>` — it has the DB connection built in),
  commit, and push to `main`. Report the result AFTER it's done, not before.
- "Please do everything yourself" — full autonomous execution is the default. Only
  pause for genuinely destructive/irreversible production actions (dropping data,
  deleting accounts, force-pushing, wiping the live DB). Local code edits, builds,
  commits, pushes to main, and applying additive migrations are all pre-approved.
- The user works on `main` directly — commit and push straight to `main`.
- After every code change: `npm run build` to verify, then commit + push to main.
- Keep explanations SIMPLE and SHORT — the user has said responses get "over complex."
  Plain language, no jargon walls.
- Migrations are applied to the live DB by me via the run-migration script. The user
  still redeploys the server/site themselves (we have no hosting access).
- Repo: https://github.com/Mickeljindal/remax-agent-portal.git
