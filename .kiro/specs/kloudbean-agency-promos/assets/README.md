# KloudBean Animated Promos

Self-playing, multi-scene animated explainers for KloudBean, built for **lead generation** and **agency acquisition**. Each promo is a standalone HTML file — no build step, no server, runs in any modern browser, and is easy to screen-record for YouTube, LinkedIn, X, and short-form vertical platforms.

## What's here

```
assets/
├── shared/
│   ├── brand.css      # all colors/fonts/spacing (PLACEHOLDER palette — swap for official brand)
│   ├── engine.css     # stage sizing, scene transitions, controls, accessibility
│   └── engine.js      # SceneEngine: timing, playback, speed, progress, hold-on-end
├── promos/
│   ├── flagship-agency-16x9.html   # Flagship agency lead-gen explainer (~75s, 16:9)
│   ├── social-leadgen-9x16.html    # Short cut, vertical (Reels/Shorts/TikTok), ~23s
│   ├── social-leadgen-1x1.html     # Short cut, square (feed), ~23s
│   └── social-leadgen-16x9.html    # Short cut, landscape (YouTube/X), ~23s
└── build/
    ├── inline.mjs     # inline shared CSS/JS → single self-contained file
    └── smoke.mjs      # static checks (timeline ↔ scenes, CTA URL present)
```

## Promo catalog

| File | Purpose | Aspect | Canvas | ~Duration | Primary CTA |
|------|---------|--------|--------|-----------|-------------|
| `flagship-agency-16x9.html` | Full agency lead-gen story: pain → platform → agency value → 10% lifetime commission → trust → CTA | 16:9 | 1920×1080 | ~75s | Start Free Trial / Join Partner Program |
| `social-leadgen-9x16.html` | Punchy hook + money line + single CTA | 9:16 | 1080×1920 | ~23s | Start Free Trial |
| `social-leadgen-1x1.html` | Same cut for square feeds | 1:1 | 1080×1080 | ~23s | Start Free Trial |
| `social-leadgen-16x9.html` | Same cut for landscape feeds | 16:9 | 1920×1080 | ~23s | Start Free Trial |

## How to play

Open any file in `promos/` directly in a browser (double-click, or `file://`). It autoplays.

Controls (bottom bar) and keyboard:

- **Space** — play / pause
- **← / →** — previous / next scene
- **C** — toggle clean-capture mode (hides controls for recording)
- **R** — replay from the start
- Speed buttons: **0.5× / 1× / 1.5× / 2×**

The promo **holds on the final CTA frame** when it finishes (no abrupt loop). Press **R** to replay.

## How to record a clean video

1. Open the promo and resize the browser window to roughly match the aspect ratio (the canvas auto-scales and centers; black letterbox bars fill the rest).
2. Press **C** to hide the controls.
3. Press **R** to restart, and start your screen recorder (e.g., macOS `⇧⌘5`, or OBS) capturing the stage area.
4. Let it play through to the CTA hold; stop recording.

For pixel-exact capture, set the browser/recorder region to the canvas size (1920×1080, 1080×1080, or 1080×1920).

## Single-file export (optional)

Produces a fully self-contained HTML (inlined CSS/JS) for easy sharing/embedding:

```bash
# one promo
node build/inline.mjs promos/flagship-agency-16x9.html

# all promos → ./dist
node build/inline.mjs --all
```

## Smoke check (optional)

```bash
node build/smoke.mjs
```

Verifies each promo has a `TIMELINE`, that every timeline id has a matching `[data-scene]`, and that a CTA URL is present.

## Rebranding

All visual tokens live in `shared/brand.css`. The current palette is a **clearly marked placeholder**. To apply official KloudBean branding:

1. Replace the hex values under "PLACEHOLDER PALETTE" with official brand colors.
2. Swap the inline `☁` logo mark in each promo's `.kb-logo` for the official logo (SVG/PNG).
3. Optionally self-host the brand font and reference it in `--kb-font-display` / `--kb-font-body` (keep a system fallback so promos stay offline-capable).

No other files need to change — every promo inherits from `brand.css`.

## Editing content & timing

- **Timing**: each promo has a single `TIMELINE` array near the bottom. Change a scene's `duration` (seconds at 1×) or reorder entries — no animation rewrites needed.
- **Copy**: edit the text inside the matching `<section data-scene="...">` block.
- **New scene**: add a `<section class="kb-scene" data-scene="myid">…</section>` and a `{ id:"myid", duration:N, label:"…" }` entry to `TIMELINE`.

---

## Fact-audit checklist (Requirement 1)

Every on-screen claim must match the researched source material. Reviewer signs off before publishing.

| Claim shown in promos | Source (kloudbean.com / support KB) | Verified |
|-----------------------|-------------------------------------|:--------:|
| Managed cloud infrastructure for developers, enterprises & agencies | support.kloudbean.com/docs/intro | ☐ |
| 7 cloud providers: AWS, Google Cloud, DigitalOcean, Linode/Akamai, Vultr, AWS Lightsail, UpCloud | Homepage + Distributors/Partners | ☐ |
| One-click deploys, auto SSL, managed databases, monitoring, backups, load balancing, CI/CD | Homepage features + KB intro | ☐ |
| Supported stacks: WordPress, Laravel, Next.js, Node.js, PHP, Django, React, NestJS, Python, Vue.js, n8n (+15 more) | Supported applications | ☐ |
| Enterprise security: DDoS, BitNinja, WAF, bot protection, IP whitelisting | Homepage + pricing security list | ☐ |
| 24/7/365 support, ~2 min avg response, 100% human | Homepage support section | ☐ |
| 1,000+ businesses in 30+ countries | Homepage "Trusted by" banner | ☐ |
| 30-day money-back guarantee | Pricing page | ☐ |
| $5,000+/month in additional value included free | Homepage + pricing "$5000+" table | ☐ |
| Partner program: 10% monthly recurring commission for life, no caps, monthly payouts, real-time dashboard | Enterprise Partnership Program | ☐ |
| Commission example: $1,000/mo client → $100/mo → $3,600 over 3 yrs | Enterprise Partnership "Commission Structure & Examples" | ☐ |
| CTA URLs: console.kloudbean.com (trial), kloudbean.com | Homepage CTAs | ☐ |
| Third-party trademarks used for identification only | Homepage trademark disclaimer | ☐ |

> Note: figures are presented exactly as published. If KloudBean updates any number (pricing, response time, customer count), update the relevant scene and re-check this table.
