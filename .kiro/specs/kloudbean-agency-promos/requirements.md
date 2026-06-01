# Requirements Document

## Introduction

KloudBean is a managed cloud infrastructure platform (deploy, scale, and manage apps across 7 IaaS providers — AWS, GCP, DigitalOcean, Linode, Vultr, Lightsail, UpCloud) with one-click deploys, managed databases, auto SSL, monitoring, backups, multi-cloud load balancing, CI/CD, and 24/7/365 human support.

This feature delivers a set of **animated promotional explainers** for KloudBean, optimized for two business outcomes:

1. **Lead generation** — drive free-trial sign-ups and demo bookings from developers, founders, and SMBs.
2. **Agency acquisition** — recruit agencies and freelancers into the partner/agency programs (10% lifetime recurring commission; up to $10,000 startup credits; portfolio management; free migrations).

The promos are built as **self-playing, multi-scene, standalone HTML/CSS/JS animations** (no build step, runs in any modern browser), matching the established "v27" reference style. Each promo is screen-recordable and exportable for distribution on YouTube, LinkedIn, X, and short-form vertical platforms (Reels/Shorts/TikTok). All messaging must be factually grounded in researched KloudBean source material.

### Research Source Material (authoritative facts for all copy)

- **Platform**: Managed cloud infrastructure for developers, enterprises, and agencies.
- **Cloud providers (7)**: AWS, Google Cloud, DigitalOcean, Linode/Akamai, Vultr, AWS Lightsail, UpCloud.
- **Capabilities**: One-click deployments, Cloudflare CDN, static/JAMstack apps, managed databases (MySQL, PostgreSQL, MongoDB, Redis — 9+), enterprise security (DDoS, BitNinja, bot blocking, IP whitelisting, WAF), optimized performance (caching, PHP-FPM, HTTP/2), CI/CD + Git, multi-cloud load balancing, real-time monitoring & alerts, managed backups, zero-downtime migrations.
- **Supported apps**: WordPress, Laravel, Next.js, Node.js, PHP, Django, React, NestJS, Python, Flask, Vue.js, n8n (+15 more).
- **Support**: 24/7/365, ~2 min avg response, 100% human experts, 99% CSAT.
- **Trust**: 1,000+ businesses across 30+ countries; 30-day money-back guarantee; UpCloud & BitNinja official partners.
- **Value framing**: "$5,000+/month in additional value included free" (DDoS, backups, caching, migrations, monitoring, SSL).
- **Pricing anchor**: Plans from $8/mo (1GB) scaling to high-core enterprise tiers; transparent, predictable pricing.
- **Partner program**: 10% monthly recurring commission for life, no caps, monthly payouts, real-time dashboard, dedicated partner manager. Example math: $1,000/mo client = $100/mo = $3,600 over 3 yrs; $10,000/mo client = $1,000/mo = $36,000 over 3 yrs.
- **Agency/Startup program**: up to $10,000 hosting credits over 12 months, 3 months free platform access, free migration + onboarding, priority support.
- **Primary CTAs**: "Start Free Trial" (console.kloudbean.com/register), "Book Demo" (calendly.com/kloudbean), "Join Partner Program".

## Requirements

### Requirement 1: Factually Accurate, Research-Grounded Messaging

**User Story:** As KloudBean's marketing owner, I want every claim in the promos to be backed by real product facts, so that the promos are credible and legally safe.

#### Acceptance Criteria

1. WHEN any promo presents a product claim (feature, number, provider, or offer) THEN the claim SHALL match the Research Source Material in this document.
2. WHERE a statistic is shown (e.g., "1,000+ businesses", "2-min response", "10% lifetime commission") THE promo SHALL present it exactly as sourced without exaggeration.
3. IF a fact is not present in the Research Source Material THEN the promo SHALL NOT assert it as a specific claim.
4. WHEN trademarked third-party names appear (WordPress, AWS, etc.) THEN they SHALL be used for identification only and SHALL NOT imply endorsement.

### Requirement 2: Flagship Agency Lead-Gen Explainer

**User Story:** As an agency owner evaluating hosting, I want a compelling explainer that shows how KloudBean helps me serve clients and earn recurring revenue, so that I sign up or join the partner program.

#### Acceptance Criteria

1. WHEN the flagship promo plays THEN it SHALL follow a narrative arc: hook → agency pain → KloudBean solution → agency-specific benefits → partner/commission proof → call to action.
2. THE flagship promo SHALL explicitly communicate the agency value props: client portfolio management, free zero-downtime migrations, white-glove 24/7 human support, predictable resellable pricing, and multi-cloud choice.
3. THE flagship promo SHALL present the partner economics (10% lifetime recurring commission) with at least one concrete earnings example.
4. THE flagship promo SHALL end on a clear primary CTA and the destination URL.
5. THE flagship promo SHALL run for a target duration between 60 and 90 seconds at default playback speed.

### Requirement 3: Short-Form Social Cuts for Lead Gen

**User Story:** As a paid-ads/social manager, I want short, punchy cuts in multiple aspect ratios, so that I can run them as ads and organic posts across platforms.

#### Acceptance Criteria

1. THE feature SHALL produce at least one short-form promo with a target duration of 15–30 seconds.
2. THE short-form promo SHALL lead with the single strongest hook within the first 3 seconds.
3. WHERE platform requirements differ THE feature SHALL provide vertical (9:16), square (1:1), and landscape (16:9) layout variants.
4. WHEN a short-form promo ends THEN it SHALL display a single, unambiguous CTA.
5. THE short-form promo SHALL remain legible without sound (on-screen text conveys the full message).

### Requirement 4: Self-Playing Scene Engine with Playback Controls

**User Story:** As a viewer, I want the promo to play automatically with the ability to control it, so that I can watch, pause, replay, or adjust speed.

#### Acceptance Criteria

1. WHEN a promo loads THEN it SHALL auto-advance through its scenes on a timed sequence.
2. THE promo SHALL provide playback controls for play, pause, previous scene, and next scene.
3. THE promo SHALL provide a speed control offering at least 0.5×, 1×, 1.5×, and 2× rates.
4. THE promo SHALL display current progress (e.g., scene index "n / total" and a time/progress indicator).
5. WHEN the final scene completes THEN the promo SHALL hold on the CTA frame (no abrupt reset) and allow replay.
6. WHILE a promo is playing THE animations SHALL maintain smooth motion (target 60fps) using transform/opacity-based transitions.

### Requirement 5: Brand-Accurate Visual System

**User Story:** As a brand owner, I want the promos to look on-brand, so that they reinforce KloudBean's identity.

#### Acceptance Criteria

1. THE promos SHALL use a centralized, single source of brand tokens (colors, gradients, fonts, spacing) so the palette can be updated in one place.
2. WHERE official brand colors and logo are not yet finalized THE promos SHALL use a documented placeholder palette that is clearly marked for later replacement.
3. THE promos SHALL consistently apply typography hierarchy (display headline, subhead, body, micro-label) across all scenes.
4. THE promos SHALL reference cloud providers and supported app stacks using recognizable labels/icons consistent across promos.

### Requirement 6: Portability and Zero-Build Delivery

**User Story:** As the person deploying these assets, I want each promo to be a standalone file, so that I can open, share, or embed it without a build toolchain.

#### Acceptance Criteria

1. EACH promo SHALL be a single self-contained HTML file (inline CSS/JS) that opens directly in a modern browser with no build step and no server.
2. THE promos SHALL NOT require network access to play (no external runtime CDN dependency required for core playback).
3. WHEN a promo is opened via file:// THEN it SHALL play correctly.
4. THE deliverables SHALL be organized in a dedicated workspace folder with a short README describing each promo, its purpose, duration, and aspect ratio.

### Requirement 7: Recording / Export Readiness

**User Story:** As a content producer, I want the promos sized and timed for clean screen recording, so that I can produce shareable video files.

#### Acceptance Criteria

1. EACH promo SHALL render at a fixed, known canvas size appropriate to its aspect ratio (e.g., 1920×1080 for 16:9, 1080×1920 for 9:16, 1080×1080 for 1:1).
2. THE promo canvas SHALL center within the viewport and SHALL NOT depend on browser chrome for layout.
3. WHERE a "clean" capture is needed THE promo SHALL offer a way to hide the playback controls (e.g., a toggle or auto-hide) for an unobstructed recording.
4. THE timing of each scene SHALL be defined in a single configurable place to allow re-timing without rewriting animations.

### Requirement 8: Accessibility and Legibility

**User Story:** As a viewer with accessibility needs, I want the promos to be legible and considerate, so that the content is usable and comfortable.

#### Acceptance Criteria

1. THE on-screen text SHALL meet a minimum contrast ratio of 4.5:1 against its background for body text.
2. THE promos SHALL avoid rapid flashing that could trigger photosensitive discomfort (no more than 3 flashes per second).
3. WHERE motion is heavy THE promos SHALL respect the `prefers-reduced-motion` setting by reducing or simplifying non-essential animation.
4. THE primary message of each scene SHALL be conveyed by on-screen text, not by motion or color alone.

## Glossary

- **Promo / Explainer**: A self-playing, multi-scene animated HTML presentation that communicates KloudBean's value and drives a conversion action.
- **Flagship promo**: The primary 60–90s agency lead-gen explainer (Requirement 2).
- **Short-form cut**: A 15–30s condensed promo for paid ads and social feeds (Requirement 3).
- **Scene**: A single timed visual "slide" within a promo; promos auto-advance through scenes.
- **Scene engine**: The JS controller that sequences scenes, handles timing, playback, and speed (Requirement 4).
- **Brand tokens**: Centralized CSS variables for colors, gradients, fonts, and spacing (Requirement 5).
- **Aspect ratio variants**: Landscape 16:9 (1920×1080), Square 1:1 (1080×1080), Vertical 9:16 (1080×1920).
- **CTA (Call To Action)**: The conversion prompt — Start Free Trial, Book Demo, or Join Partner Program.
- **Partner program**: KloudBean's referral program paying 10% monthly recurring commission for life.
- **Agency/Startup program**: Program offering up to $10,000 hosting credits + 3 months free platform access.
- **IaaS**: Infrastructure-as-a-Service cloud provider (AWS, GCP, DigitalOcean, Linode, Vultr, Lightsail, UpCloud).
- **Zero-build delivery**: Deliverables run directly in a browser with no compilation or server (Requirement 6).
