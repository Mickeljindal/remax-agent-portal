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
  THIRD version added REAL PHOTOGRAPHY: 8 Unsplash photos in `docs/reel/img/`
  (home1, home2, interior1, agent_woman, agent_man, skyline, keys, handshake) used as
  Ken-Burns backgrounds behind the vector UI mock cards. `handshake.jpg` backs the
  outro. All 8 are referenced + preloaded in `reel.html`.
  CURRENT version is an After Effects–style cinematic redesign: camera push-in/out
  with motion blur, line-by-line masked headline reveals, 3D card tilt settle
  (rotateX/Y + perspective), light-sweep sheen across cards, parallax Ken-Burns
  backgrounds, overshoot pops (easeOutBack), CTA heartbeat pulse, ghost scene numbers.
  Adds a reusable RE/MAX balloon SVG icon (red/white/blue bands clipped to a balloon
  `<symbol id="balloon">`, reused via `<use>` in brand bar, intro, outro) and the REAL
  logo at `docs/reel/img/logo.png` (copied from `src/assets/remax-excellence-logo.png`)
  shown on the intro (clip-wipe reveal) and outro. Timing: INTRO 3.6s, 6 feature scenes
  @ 2.9s, OUTRO 4.2s (~25s total). Latest render: 756 frames @30fps, ~20 MB MP4.
  The render script proactively recycles Chrome every ~150 frames (headless crashes
  after ~600 screenshots) and retries dropped frames. Needs Chrome at /Applications +
  ffmpeg + puppeteer-core.
  MUSIC: the reel now has a background music bed. `scripts/generate-reel-music.mjs`
  (gitignored) synthesizes an ORIGINAL, royalty-free uplifting track from pure math
  (no samples → zero licensing risk): C-major I–V–vi–IV pad + sub-bass + building
  arpeggio + soft 76bpm kick + shimmer + a noise riser into the outro, with fade
  in/out, matched to the reel duration. `render-reel.mjs` now generates this WAV and
  ffmpeg muxes it as an AAC 192k track during stitching (the WAV is a temp artifact,
  deleted after; only the muxed MP4 ships). To swap in a real licensed track instead,
  replace the music step / mux any MP3 over the video. Current MP4 ~21 MB, has audio.
  NOTE: `scripts/` is gitignored, so render-reel.mjs / deck-to-pdf.mjs /
  generate-reel-music.mjs changes are NOT committed — only `docs/reel/reel.html`,
  `docs/reel/img/*.jpg`, `docs/reel/img/logo.png`, and `docs/Agent-Portal-Reel.mp4`
  get committed.
  GOTCHA: terminal output buffers can be STALE after a render — verify the MP4's
  on-disk mtime is newer than the newest input image rather than trusting buffered logs.
  PENDING with user: the CTA site `joinremaxex.com` is still a placeholder — confirm
  the real website/handle/phone so it can be swapped in and re-rendered.
  VOICEOVER: `docs/reel/reel-voiceover-script.md` now holds a v2 storyboard — a REAL
  screen-recording walkthrough concept (7 scenes: brand → dashboard scroll → training+
  calendar → pre-con grid+search+commission calc → meeting-room booking → office library
  tabs → AI chat), ~38s, opening line provided by the user. This SUPERSEDES the old
  vector-mock script; the current MP4 does NOT match it yet and would need rebuilding
  from real portal screen captures (capture-screenshots.mjs / screen recording).

  WALKTHROUGH REEL (IN PROGRESS — the user's real ask): the user gave a full 7-scene
  VISUAL storyboard and wants the actual VIDEO rebuilt from the REAL portal product,
  not vector mockups. Pipeline built:
  - `/preview` route (`src/pages/ClientPreview.tsx`) renders the real portal with demo
    data, NO auth — covers every scene: `#dashboard` (calendar+training),
    `#listings`/PreConSection (pre-con grid + search), CommissionCalculator,
    `#offices` (RoomBooking), `#support` (SupportChat, tawk.to), `#assets` (library).
  - `scripts/capture-reel-shots.mjs` (GITIGNORED) captures hi-res (scale 2) PNGs of
    each section from `/preview` → `docs/reel/shots/`. Run:
    `REEL_BASE=http://localhost:8081 node scripts/capture-reel-shots.mjs`.
    NOTE dev server moved to port 8081 (8080 was stale). Captured: dashboard, courses,
    listings, commission, offices, support, assets, full (full-page for the scroll).
    GAP: standalone library is empty in demo (Schedule B / deal sheets / deposit info
    live INSIDE project detail sheets) — Scene 6 currently reuses `assets.png`.
  - `docs/reel/walkthrough.html` (NEW, UNCOMMITTED) — a 1920×1080 LANDSCAPE walkthrough
    (distinct from the vertical `reel.html`). Animates the real screenshots inside a
    laptop/browser frame: intro (balloon+logo clip-wipe), brand bar, scene kickers,
    laptop-open, top→bottom scroll (Scene 2), ken-burns pan per section, red highlight
    boxes, per-scene captions, progress bar. 8 segments, ~38.4s. Same render contract
    as reel.html (`window.__duration`, `window.__ready`, `window.renderFrame(t)`).
  - `scripts/render-reel.mjs` is now PARAMETERIZED via env: `REEL_HTML`, `REEL_OUT`,
    `REEL_W`, `REEL_H` (defaults still produce the vertical reel). Render walkthrough:
    `REEL_HTML=docs/reel/walkthrough.html REEL_OUT=docs/Agent-Portal-Walkthrough.mp4 \
     REEL_W=1920 REEL_H=1080 node scripts/render-reel.mjs` (also generates+muxes the
    music bed at the walkthrough duration).
  - `scripts/check-walkthrough.mjs` (GITIGNORED) extracts sanity frames to /tmp/wt/.
  - STATUS: RENDERED + COMMITTED. `docs/Agent-Portal-Walkthrough.mp4` is on disk
    (1920×1080, h264 + aac, ~38.4s, ~14.4 MB, both video+audio streams verified via
    ffprobe) and committed alongside `docs/reel/walkthrough.html` and
    `docs/reel/shots/*.png` (incl. `library.png` now captured for Scene 6). Both reels
    ship: vertical `Agent-Portal-Reel.mp4` + landscape `Agent-Portal-Walkthrough.mp4`.
    OPEN ITEMS: (a) Scene 6 office-library docs (Schedule B / deal sheets / deposit
    info) live inside project detail sheets — `library.png` is the closest standalone
    capture. (b) CTA `joinremaxex.com` still a placeholder pending the real
    site/handle/phone before any final re-render.

## CRM expansion (PLAN + PITCH ONLY — not built)

- Client wants to grow the portal into agent CRM features (inspired by novacrm.ai).
  Explicitly NOT building it yet — only a plan + a pitch deck to sell the idea.
- NovaCRM.ai feature understanding (researched, paraphrased): its pillars are
  **"Avon AI"** (chat that generates flyers / just-sold reports / property
  comparisons), **agentic AI** (classify + score leads via semantic search, draft
  emails, summarize calls, advance the pipeline), **lead-generation pages**
  (landing / IDX squeeze pages), **email marketing** with engagement analytics,
  **proposals + document e-signing**, and pipeline/reporting dashboards. The earlier
  draft MISSED lead-capture pages, the AI marketing studio, e-sign, and campaign
  analytics — these were added in the rebuild.
- `docs/CRM_EXPANSION_PLAN.md` — why add CRM, NovaCRM benchmark, tailored feature set
  (now incl. §3.1 lead capture/generation pages, §3.4 AI marketing studio, §3.7 email
  campaigns + analytics, §3.8 proposals & e-sign), fit with the React/Supabase/Express
  stack, ~11 proposed `crm_*` tables (added crm_capture_pages, crm_campaigns,
  crm_documents), 5 delivery phases, risks.
- `docs/CRM-Pitch-Deck.html` — 15-slide deck matching `docs/agent-portal-deck.html`
  style. Slides: cover, the gap, NovaCRM benchmark (cited), vision, 12-feature grid,
  + UI mockups for lead-capture pages, kanban pipeline, contact timeline, AI marketing
  studio (Avon-style), agentic AI assistant, follow-up/comms engine, analytics
  dashboard, architecture, roadmap, close. Mockups use the reel photos via
  `reel/img/*.jpg` (deck lives in `docs/`, so paths are `reel/img/...`). Rendered to
  `docs/CRM-Pitch-Deck.pdf` (15 pages) via the (gitignored) `scripts/deck-to-pdf.mjs`
  (parameterized: input HTML + output PDF).

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
- NOTE on the "Accept / Run" approval popups: those come from Kiro's **Supervised
  mode**, NOT from me asking. The user should switch to **Autopilot mode** (toggle at
  the bottom of the chat input) to remove them. I cannot change that setting myself.
  Regardless of mode, my behavior is: act first, report after — never ask per step.
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
