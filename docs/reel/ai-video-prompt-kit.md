# Agent Portal Promo — AI Video Prompt Kit (25s, 7 scenes)

This is a ready-to-use kit to build the client's promo reel using an AI video maker
(Runway, Kling, Google Veo 3, Sora, Pika, or Luma) **combined with real screenshots**
of the portal. It follows the client's exact storyboard and their "up to 25 seconds"
note.

---

## Read this first — the one rule that saves you

**Do not ask AI to generate the actual portal screens.** AI video tools invent fake,
garbled, off-brand UI if you prompt "a dashboard with training and calendar." That
looks cheap and misrepresents the product.

Use each tool for what it's good at:

- **AI video** → cinematic *b-roll* only: city skyline, a real estate office, an agent
  smiling at a laptop, hands on a keyboard, abstract tech light streaks, a laptop
  opening. This is the "wrapper" that makes the reel feel premium.
- **Your real screenshots / screen recordings** → every moment where the actual
  product is on screen. These come from the portal itself (see "Capturing real
  screens" at the bottom — a script already exists).

The professional result = **AI b-roll + real screens composited together.** Three ways
to combine them are in the "How to blend screenshots into AI" section.

Aspect ratio: render **9:16 (1080×1920)** for Instagram/TikTok/Facebook Reels. If it's
mainly for the website/LinkedIn/YouTube, use **16:9 (1920×1080)** — the desktop UI
reads better in landscape. All prompts below work for either; just set the tool's
aspect ratio.

---

## The 25-second timeline (client's 7 scenes)

| # | Time | On screen | Source |
|---|------|-----------|--------|
| 1 | 0.0–3.0s | Brand hook / "when you join RE/MAX Excellence" | AI b-roll + logo |
| 2 | 3.0–7.0s | Laptop opens → full dashboard, fast scroll top→bottom | AI b-roll → real `full.png` |
| 3 | 7.0–11.0s | Training + calendar | real `courses.png` / `dashboard.png` |
| 4 | 11.0–16.0s | Pre-construction: 6-project grid, search, commission calc | real `listings.png` + `commission.png` |
| 5 | 16.0–19.0s | Meeting-room booking | real `offices.png` |
| 6 | 19.0–22.0s | Office library: schedules, deal sheets, deposit info | real `assets.png` / `library.png` |
| 7 | 22.0–25.0s | AI chat box for support + closing CTA | real `support.png` + logo outro |

---

## Voiceover (tight, ~25s at a natural pace)

> When you join RE/MAX Excellence, you unlock one powerful portal — everything at your
> fingertips. Stay ahead with training and your calendar. Browse every pre-construction
> project, search in a tap, and run your commission in seconds. Book a meeting room in
> clicks. Your whole office library — schedules, deal sheets, deposit info — in one
> place. And any question, just ask the AI assistant. RE/MAX Excellence — everything you
> need, one login.

Generate this with a natural TTS voice (ElevenLabs, or your video tool's built-in
voice). Direction: warm, confident, proud — a top agent showing a teammate around.

---

## Scene-by-scene AI prompts + compositing

Each scene has: **[AI PROMPT]** (paste into the video tool), **[SCREEN]** (the real
asset to show), **[HOW TO COMBINE]**, and the **[CAPTION]** to overlay.

### Scene 1 — Brand hook (0–3s)
- **[AI PROMPT]** "Cinematic slow aerial push toward a modern glass office tower at
  golden hour, warm sunlight, soft lens flare, shallow depth of field, premium real
  estate mood, gentle forward camera motion, photorealistic, no text, no logos, no user
  interface. 3 seconds, 9:16."
- **[SCREEN]** none — this is pure b-roll.
- **[HOW TO COMBINE]** Overlay the RE/MAX Excellence logo (fade/scale in) on top of the
  b-roll in your editor. Logo file: `docs/reel/img/logo.png`.
- **[CAPTION]** "When you join RE/MAX Excellence"

### Scene 2 — Laptop opens → the portal (3–7s)
- **[AI PROMPT]** "Close-up of a silver laptop on a clean desk in a bright modern
  office; the lid smoothly opens toward the camera; soft morning light, shallow depth of
  field, photorealistic; the screen stays dark/blank (no interface shown). Slow push-in.
  4 seconds, 9:16, no text."
- **[SCREEN]** `docs/reel/shots/full.png` — a full-page screenshot; animate a fast,
  smooth scroll top→bottom.
- **[HOW TO COMBINE]** Cut from the AI laptop-opening at ~1.5s to the real screen. Best
  method: **screen replacement** — track the laptop's screen rectangle and composite
  `full.png` onto it (see technique C below). Simpler method: hard-cut to the real
  screenshot filling the frame (inside a browser-window mockup) and animate the scroll.
- **[CAPTION]** "One portal. Everything at your fingertips."

### Scene 3 — Training + calendar (7–11s)
- **[AI PROMPT]** (optional side b-roll, only if you want a split/transition) "Abstract
  soft-blue gradient background with slow-floating light particles and a faint calendar
  grid motif, elegant, minimal, no text. 4 seconds, 9:16." Use only as a background
  behind the screenshot, not as the UI.
- **[SCREEN]** `courses.png` (training) and/or `dashboard.png` (calendar). Slow push-in
  / gentle pan.
- **[HOW TO COMBINE]** Place the screenshot in a browser/laptop mockup frame centered on
  the b-roll background. Add a subtle red highlight box around the training progress and
  the calendar.
- **[CAPTION]** "Stay ahead — training + your calendar"

### Scene 4 — Pre-construction (11–16s, the hero moment)
- **[AI PROMPT]** (transition sting only) "Fast, smooth light-streak whoosh transition,
  deep blue to white, motion blur, energetic, 1 second, no text." Use between the grid
  and the calculator.
- **[SCREEN]** `listings.png` (6-project grid) → briefly show the search bar in use →
  `commission.png` (pre-con commission calculator).
- **[HOW TO COMBINE]** Screenshots front and center. Keyframe a gentle zoom on the
  project grid, then a quick whoosh to the calculator. Animate a numbers "count-up" on
  the commission result if you can (CapCut/AE text) for a satisfying beat.
- **[CAPTION]** "Every pre-con project — search + commission in seconds"

### Scene 5 — Meeting-room booking (16–19s)
- **[AI PROMPT]** (optional bg) "Minimal modern boardroom, empty, soft daylight, slow
  dolly, photorealistic, out of focus, no text." Background only.
- **[SCREEN]** `offices.png` — booking view. Gentle pan over the time slots.
- **[HOW TO COMBINE]** Screenshot in mockup frame over the blurred boardroom b-roll;
  highlight a selected time slot.
- **[CAPTION]** "Book a meeting room in a few clicks"

### Scene 6 — Office library (19–22s)
- **[SCREEN]** `assets.png` / `library.png` — schedules, deal sheets, deposit info.
- **[HOW TO COMBINE]** Screenshot centered; quick sequential highlight of 2–3 cards
  (Schedules → Deal sheets → Deposit info) with small pop animations.
- **[CAPTION]** "Your whole office library, in one place"

### Scene 7 — AI support + CTA outro (22–25s)
- **[AI PROMPT]** (outro bg) "Elegant deep-blue to red brand gradient with soft light
  rays and slow-floating particles, premium, minimal, no text. 3 seconds, 9:16."
- **[SCREEN]** `support.png` — the AI chat box; animate one question appearing and a
  reply.
- **[HOW TO COMBINE]** Show the chat for ~1.5s, then dissolve to the outro b-roll with
  the logo + CTA text.
- **[CAPTION]** "Any question — just ask." → then "RE/MAX Excellence — Join our team ·
  joinremaxex.com"

---

## How to blend your screenshots into AI (three techniques)

**A) Intercut (easiest, looks great).** Use AI clips for Scene 1, the laptop-open in
Scene 2, transitions, and the outro. Use real screenshots (in a browser/laptop mockup)
for Scenes 2–7 product moments. Cut between them on the beat. Do this in **CapCut**
(free, fast), **DaVinci Resolve** (free, pro), or **Premiere**. This is the recommended
path.

**B) Image-to-video on a real screenshot (AI adds motion).** Most AI tools have an
"image to video" mode. Upload a real screenshot as the **first frame** and prompt:
"Very subtle slow zoom-in, camera stays still, interface stays exactly the same, do not
add or change any elements, no new text." This gives gentle life to a static screen.
⚠️ Keep motion minimal — bigger motions make the tool hallucinate/warp the UI. Great for
a 2–3s push-in on the dashboard or listings.

**C) Screen replacement (most cinematic, advanced).** Take an AI b-roll of a laptop/phone
with a blank screen, then track the screen area and composite your real screenshot onto
it. Tools: After Effects + Mocha (planar track), DaVinci Fusion, or CapCut's overlay +
corner-pin keyframes. Use this for the "laptop opens and the portal appears" moment.

---

## Recommended toolchain

- **AI b-roll:** Google Veo 3 or Kling 2.x (best motion realism right now), or Runway
  Gen-4 / Sora / Pika / Luma. Generate 3–5 short clips from the prompts above.
- **Voiceover:** ElevenLabs (natural TTS) or your tool's built-in voice.
- **Editing/compositing:** CapCut (fastest) or DaVinci Resolve (free, more control).
- **Music:** licensed track from Epidemic Sound / Artlist, OR reuse the original
  royalty-free bed this repo already generates (`scripts/generate-reel-music.mjs`).
- **Captions:** add on-screen text per scene (bold, high-contrast, safe margins).

Export: H.264 MP4, 30fps, 1080×1920 (reels) or 1920×1080 (landscape), ~8–12 Mbps.

---

## The fastest path (skip AI entirely if you're short on time)

The repo already renders a real-screenshot walkthrough that matches these 7 scenes. To
ship a clean 25s version today, you don't need any AI tool:

1. (Optional) Recapture fresh screens: `node scripts/capture-reel-shots.mjs`
2. Render the walkthrough to MP4:
   `REEL_HTML=docs/reel/walkthrough.html REEL_W=1920 REEL_H=1080 REEL_OUT=docs/Agent-Portal-Walkthrough.mp4 node scripts/render-reel.mjs`
   (needs Google Chrome + ffmpeg + puppeteer-core installed locally)

The walkthrough timeline currently runs ~38s; trimming it to the 25s beats above is a
small edit to the `S = [...]` timeline array in `docs/reel/walkthrough.html`.

Use the AI kit above when you want a more cinematic, social-first cut with real b-roll
around the real product.

---

## Capturing real screens

`scripts/capture-reel-shots.mjs` logs into the portal and saves screenshots to
`docs/reel/shots/`. Re-run it after UI changes so the promo shows the current product.
Existing shots: dashboard, courses, listings, commission, offices, assets/library,
support, full.
