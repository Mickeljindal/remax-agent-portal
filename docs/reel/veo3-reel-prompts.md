# Veo 3 Reel Prompts — Vertical 9:16, Portal Included (IG / TikTok)

Copy-paste, scene-by-scene prompts for **Veo 3 / Veo 3.1**, built for a **25-second
vertical (9:16)** promo that shows the **real RE/MAX Excellence portal**.

## The honest setup (read once)

- Veo **cannot draw your real portal from a text prompt** — it invents fake UI. To get
  the real product on screen you use **image-to-video**: upload a real screenshot as the
  starting frame; Veo adds motion outward from it.
- Screenshots + text **warp under heavy motion**. So portal scenes use **minimal motion
  only** (a slow 3–5% push-in). Anything more and the UI text melts.
- For **guaranteed-crisp UI** and the client's "fast scroll top→bottom," do that motion
  in the **editor (CapCut)** on the real screenshot — not in Veo. Each portal scene below
  gives you **(A) the reliable editor method** and **(B) an optional pure-Veo I2V prompt**.

## Settings to pick in Veo (Flow / Gemini / Vertex)

- Aspect ratio: **9:16** (Veo 3.1 native vertical / "ingredients to video" portrait mode)
- Resolution: **1080p** · Frame rate: 24fps · Clip length: **8s** (trim in edit)
- Generate each scene as its own clip, then assemble + trim to 25s in CapCut.

## Prep: export clean screenshots

Use high-res, current screenshots from `docs/reel/shots/`:
`full.png, dashboard.png, courses.png, listings.png, commission.png, offices.png,
assets.png` (or `library.png`), `support.png`. Re-run `node scripts/capture-reel-shots.mjs`
first so they show the latest UI (new Support cards, booking options, etc.).

---

## 25-second scene plan (vertical)

| # | Time | Scene | Veo mode | Portal? |
|---|------|-------|----------|---------|
| 1 | 0–3s | Brand hook | Text-to-video | logo added in edit |
| 2 | 3–7s | Laptop opens → portal + scroll | Veo (open) + real screen (scroll) | ✅ |
| 3 | 7–11s | Training + calendar | Real screen (I2V optional) | ✅ |
| 4 | 11–16s | Pre-con grid + search + commission | Real screen (I2V optional) | ✅ |
| 5 | 16–19s | Meeting-room booking | Real screen (I2V optional) | ✅ |
| 6 | 19–22s | Office library | Real screen (I2V optional) | ✅ |
| 7 | 22–25s | AI support + CTA outro | Real screen → Veo outro | ✅ |

---

## SCENE 1 — Brand hook (0–3s) · pure Veo text-to-video

**Veo prompt:**
> Vertical 9:16 cinematic shot. A sleek modern glass condominium tower in a Canadian
> downtown at golden hour, sunlight glinting across the windows, a few soft clouds
> drifting. Camera: slow smooth push-in from a low angle, shallow depth of field.
> Style: premium real-estate brand film, warm cinematic grade, photorealistic. Audio:
> soft ambient city hum. Duration 8s, 1080p.
> **Negative:** text, logos, on-screen graphics, user interface, people, watermarks.

**Edit:** trim to ~3s · overlay `img/logo.png` (fade + scale in) · caption **"When you
join RE/MAX Excellence."**

---

## SCENE 2 — Laptop opens → the portal (3–7s)

**Part A — Veo text-to-video (the open):**
> Vertical 9:16. A person's hands open a silver laptop on a bright wooden desk in a
> modern real-estate office; the lid lifts smoothly toward camera; the screen stays
> dark. Camera: slow over-the-shoulder push-in, shallow depth of field. Style: clean,
> warm, photorealistic corporate promo. Audio: soft click and quiet office ambience.
> Duration 8s, 1080p.
> **Negative:** any on-screen interface, text, logos, warping, extra people.

**Part B — the portal appears (pick one):**
- **(A) Editor method — recommended:** at ~1.5s hard-cut to real `full.png` shown inside
  a simple browser-window frame; in CapCut keyframe a **fast top→bottom scroll** (this is
  the client's exact ask and stays perfectly crisp).
- **(B) Pure-Veo I2V — optional**, input image = `dashboard.png`:
  > Vertical 9:16. Animate this exact interface with a very slow, subtle push-in only.
  > The interface must stay identical and perfectly readable — do not add, remove, move,
  > or redraw any element or text. Camera: gentle 3% zoom-in, no pan, no scroll. 8s, 1080p.
  > **Negative:** warped text, distorted letters, changing UI, extra buttons, flicker,
  > moving cursor, new windows.

**Caption:** "One portal. Everything at your fingertips."

---

## SCENE 3 — Training + calendar (7–11s) · portal

**(A) Editor:** slow push-in / gentle pan across `courses.png` (training) then
`dashboard.png` (calendar); pulse a red highlight box on training progress and the
calendar.

**(B) Veo I2V** — input = `courses.png`:
> Vertical 9:16. Subtle slow push-in on this exact training dashboard. UI stays identical
> and fully readable; no changes to any text, number, or layout. Camera: gentle zoom-in
> only. 8s, 1080p.
> **Negative:** warped text, altered UI, flicker, new elements, distorted numbers.

**Caption:** "Stay ahead — training + your calendar."

---

## SCENE 4 — Pre-construction (11–16s) · portal (hero moment)

Two beats. **(A) Editor recommended:** show `listings.png` (six-project grid) with a
gentle zoom, a quick light-streak whoosh, then `commission.png` (pre-con commission
calculator) with a number "count-up" animation on the result.

**(B) Veo I2V** — run twice, input = `listings.png`, then `commission.png`:
> Vertical 9:16. Very slow push-in on this exact screen. Interface stays identical and
> readable; change nothing. Gentle zoom only, no pan. 8s, 1080p.
> **Negative:** warped or distorted text, altered layout, new UI, flicker.

**Optional Veo transition clip (text-to-video):**
> Vertical 9:16. Fast smooth light-streak whoosh, deep blue to white, motion blur,
> energetic. 4s, 1080p. **Negative:** text, logos.

**Caption:** "Every pre-con project — search + commission in seconds."

---

## SCENE 5 — Meeting-room booking (16–19s) · portal

**(A) Editor:** gentle pan over `offices.png`; highlight a selected time slot.
**(B) Veo I2V** — input = `offices.png`: same minimal-push-in prompt + negatives as Scene 3.

**Caption:** "Book a meeting room in a few clicks."

---

## SCENE 6 — Office library (19–22s) · portal

**(A) Editor:** center `assets.png` (or `library.png`); sequential pop-highlights on
Schedules → Deal sheets → Deposit info.
**(B) Veo I2V** — input = `assets.png`: same minimal-push-in prompt + negatives.

**Caption:** "Your whole office library, in one place."

---

## SCENE 7 — AI support + CTA outro (22–25s)

**Portal beat (editor):** show `support.png` chat; animate one question typing in and a
reply appearing (CapCut text/type-on). ~1.5s.

**Outro — Veo text-to-video:**
> Vertical 9:16. Elegant deep-blue to warm-red brand gradient with soft light rays and
> slow floating particles, premium end-card mood. Camera: slow upward drift. Audio: soft
> uplifting swell. 8s, 1080p.
> **Negative:** text, logos, UI.

**Edit:** dissolve from the chat to the outro · add `img/logo.png` + text **"RE/MAX
Excellence — Join our team · joinremaxex.com."**

**Caption:** "Any question — just ask."

---

## Assemble in CapCut (or DaVinci / Premiere)

1. Drop clips in order 1→7 on a 9:16 (1080×1920) timeline; trim each to its target length
   to total ~25s.
2. Mute Veo's generated audio on portal scenes (keep ambience only where it helps).
3. Add the **voiceover** (below) and a **music bed** (licensed, or reuse
   `scripts/generate-reel-music.mjs`).
4. Add the **captions** per scene — bold, high contrast, inside safe margins (keep clear
   of TikTok/IG UI top and bottom).
5. Export: H.264 MP4, 1080×1920, 24–30fps, ~10 Mbps.

**Voiceover (~25s):**
> When you join RE/MAX Excellence, you unlock one powerful portal — everything at your
> fingertips. Stay ahead with training and your calendar. Browse every pre-construction
> project, search in a tap, and run your commission in seconds. Book a meeting room in
> clicks. Your whole office library — schedules, deal sheets, deposit info — in one
> place. And any question, just ask the AI assistant. RE/MAX Excellence — everything you
> need, one login.

---

## The clever bit — getting the portal in *well*

- **Best readability:** don't render the portal in Veo at all — composite the real
  screenshot in CapCut over Veo b-roll and add the motion (scroll/pan/zoom) there. Pixel-
  perfect UI, zero warping.
- **Most "AI-native":** Veo image-to-video on the screenshot with a **locked 3% push-in**
  and the strong negative list above. Review each clip; if any text shimmers, reduce
  motion or fall back to the editor method for that scene.
- **Screen replacement (advanced):** Veo b-roll of a laptop/phone with a blank screen,
  then track + composite the real screenshot onto the screen (After Effects + Mocha,
  DaVinci Fusion, or CapCut corner-pin).

---

### Sources (Veo capabilities)
Veo 3 / 3.1 clip lengths (4/6/8s), 9:16 & 16:9 support, 1080p, and image-to-video are per
Google's [Vertex AI Veo docs](https://cloud.google.com/vertex-ai/generative-ai/docs/models/veo/3-0-generate-preview)
and the [Veo 3.1 vertical/ingredients update](https://blog.google/innovation-and-ai/technology/developers-tools/veo-3-1-gemini-api/).
Content was rephrased for compliance with licensing restrictions.
