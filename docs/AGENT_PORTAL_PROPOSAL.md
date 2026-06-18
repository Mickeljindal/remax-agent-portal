# Real Estate Agent Portal — Product & Feature Proposal

A complete, white-label agent enablement platform for real estate brokerages.
One secure portal where your agents access training, pre-construction inventory,
documents, calculators, vendors, support, and office bookings — fully branded to
your brokerage and controlled end-to-end by your admin team.

---

## 1. Executive Summary

This is a production-ready web platform that gives a brokerage a single, branded
hub for its agents. It replaces scattered Google Drives, WhatsApp groups, PDF
email chains, and spreadsheets with one organized, permission-controlled portal.

Every label, section title, image, document, email, and the order of the page is
controlled by a non-technical admin from a built-in admin panel — no developer
required for day-to-day operation.

**Who it's for:** real estate brokerages, teams, and franchises that want to
onboard, train, equip, and support their agents from one place.

**Key outcomes:**
- Faster agent onboarding and consistent training
- A single source of truth for listings, forms, and marketing assets
- Less admin overhead — agents self-serve; admins manage from one panel
- A professional, fully branded experience that reinforces the brokerage brand

---

## 2. Platform Highlights

- **Fully white-label** — your logo, colors, name, and domain. No third-party
  branding shown to agents or clients.
- **Admin-controlled everything** — section titles, ordering, images, documents,
  emails, and content are all editable from the admin panel.
- **Role-based access** — agents vs. admins, with an approval step so only
  invited/approved people get in.
- **Email + in-app notifications** — granular admin control over who gets what.
- **Responsive** — works on desktop, tablet, and mobile.
- **Light & dark mode.**
- **Self-hosted option** — runs on a single server; your data stays in your
  own database.

---

## 3. Feature Catalog

### 3.1 Authentication & Access Control
- Email + password login (with show/hide password).
- Self-registration with full name, email, phone number, and password.
- **Admin approval workflow** — new sign-ups are inactive until an admin
  activates them, so access is controlled.
- Forgot-password / reset-password via branded email.
- Roles: **Agent** and **Admin**, with admins able to promote/demote and reset
  passwords.
- "Client demo" preview mode for showcasing the portal without real credentials.

### 3.2 Agent Dashboard
- Personalized welcome banner with the agent's profile.
- At-a-glance **calendar** and **training progress** summary.
- **Admin-reorderable sections** — the admin chooses the order in which sections
  appear for every agent (drag-priority ordering).
- **Admin-editable section titles & subtitles** — rename any heading inline or
  from a dedicated admin page.
- Sticky top navigation that jumps to each section.

### 3.3 Training & Courses (LMS)
- Create courses with categories, descriptions, thumbnails, and mandatory flags.
- Add **video modules** (uploaded to your server or embedded from YouTube/Vimeo)
  and **quiz modules**.
- **Video upload with live progress bar** (percentage, MB/s, file size).
- **Watch-time tracking** and course completion detection.
- **Completion certificates** issued automatically.
- **Course assignments** — assign specific training to specific agents.
- **Course analytics** — watch time, completions, and per-agent stats for admins.
- Reminders for incomplete courses.

### 3.4 Pre-Construction Listings
- Project listings with developer, location, price range, status, property type,
  city, gallery images, and description.
- **Search & filter** by city, property type, sales status, and keywords.
- **Admin-controlled pagination** — set how many listings show before "Show more."
- **Admin-controlled grid density** — 3 or 4 cards per row.
- **Co-op commission display** with per-listing show/hide and a global
  "hide in front of clients" toggle.
- **Click-to-call phone numbers** per listing (with admin show/hide).
- Bookmarks/favorites per agent.
- **Social sharing** — generate shareable listing links for WhatsApp, Facebook,
  LinkedIn, X, email, and copy-link.
- Rich listing detail view with image gallery.
- "Move-in ready" and "Coming soon" status handling.

### 3.5 Pre-Construction Worksheet Submission
- Structured digital worksheet for client registrations (project, model, floor,
  exposure, parking/locker, choices, purchasers, co-operating broker details).
- **Client ID image attachment** (JPG/PNG).
- On submit, **emails the admin and the agent** with the details and attachment.
- Submissions are stored and viewable in an admin inbox.

### 3.6 Document Libraries
- **Pre-con document library** — shared brokerage forms (showing instructions,
  clauses, schedule B, deal sheets, etc.) with upload or external-link support.
- **Buyer presentation kit** — templates and talking points for buyer meetings.
- Each document can be an uploaded file or a linked resource, with download/open
  actions for agents.

### 3.7 Built-in Calculators
- **HST & commission payout calculator** (net-of-HST base).
- **Co-op commission estimate** calculator.
- Titles and helper text are admin-editable.

### 3.8 Approved Vendors Directory
- Brokerage-approved trades and services (mortgage, legal, staging, photography,
  etc.) with contact details, fully brand-styled.

### 3.9 Support Center
- **Ticket-based support chat** between agents and admins with real-time messaging.
- **Admin-managed support categories** (e.g. Marketing, Tech, Vendors, Billing,
  Training) — add, rename, reorder, or hide.
- Priority levels and status workflow (open → in-progress → resolved → closed).
- **Admin support inbox** with search, status filter, and category filter.
- Email + in-app notification on replies.

### 3.10 Office Locations & Room Booking
- Multiple office locations with address, phone, map, and hours.
- Meeting-room booking on an hourly time-slot grid (per day/week).
- **Per-office email routing** — each office's booking inquiries go to a
  designated inbox (e.g. front desk per location).
- Booking confirmations to the agent; cancellations supported.
- Virtual room support (Zoom/Teams).

### 3.11 Property Management (Resale/MLS Listings)
- Manage traditional resale/lease listings (price, beds/baths, sqft, MLS #,
  status, photos) and assign them to specific agents.

### 3.12 Events & Announcements
- Create events, notify agents, and track RSVPs.
- Announcements feed on the dashboard.

### 3.13 Reminders & Notifications
- **In-app notification bell** (real-time) for each agent.
- **Admin-scheduled reminders** (courses, pre-con follow-ups, vendors, custom).
- **Email notifications via your verified email domain.**
- **Granular admin notification control center** — toggle every use case:
  - Agent: booking confirmation, course assigned, course completed (certificate),
    course reminder, account activated, support reply, event reminders.
  - Admin: new sign-up, course completed, worksheet submitted, room booking,
    new support ticket.
  - Broadcast to all agents: new course, new listing, new event.
  - Reminder timing (e.g. 24h + 1h before meetings) and incomplete-course nudges.

### 3.14 Calendar
- Dashboard calendar showing events and reminders; admins can add entries.

### 3.15 Profiles
- Agents manage their name, contact email, phone, and avatar (image upload).

### 3.16 In-Portal Help / Assistant
- Built-in "where do I find…" assistant and documentation for both agents and
  admins (keyword-based, offline — no external AI dependency or cost).

---

## 4. Admin Control Panel

A single admin panel gives non-technical staff full control:

- **Agent management** — activate/deactivate, reset passwords, grant/remove admin,
  delete, search.
- **Content management** — listings, projects, cities, courses, modules, vendors,
  documents, buyer kit, properties, events.
- **Appearance** — rename every section title/subtitle, reorder sections, set
  listing grid density and pagination, manage admin card titles.
- **Communications** — full email & notification control center, per-office
  booking emails, support categories.
- **Submissions** — worksheet inbox, support inbox, course analytics.
- **Upload guidance** — every image upload shows recommended dimensions, accepted
  formats, and size limits so content stays consistent.

Editable labels and ordering are stored in the database, so changes apply
instantly for all agents without a redeploy.

---

## 5. Technology & Architecture

- **Frontend:** React + TypeScript + Vite, Tailwind CSS, shadcn/ui components.
- **Backend/Database:** Supabase (PostgreSQL) with Row-Level Security, Auth, and
  real-time subscriptions.
- **Application server:** A single Node.js (Express) process that serves the app
  and handles file uploads, registration, password reset, email, and worksheet
  submission — so the whole product deploys as one application.
- **Email delivery:** Resend (or any SMTP-compatible provider) using the client's
  own verified sending domain.
- **File storage:** Uploaded videos, PDFs, and images are stored on the
  application server's disk (no per-file cloud storage fees), with video
  streaming support.
- **Hosting:** Deployable to any Node host (e.g. a managed Node platform or VPS).
  Single-domain setup — app + API + uploads all under one URL.

**Security & data ownership:**
- Role-based access enforced at the database level (RLS).
- The brokerage owns its database and content.
- Token-validated uploads and admin-only operations via a privileged server key.

---

## 6. Branding & White-Labeling

- Replace logo, colors, portal name, and domain.
- Branded transactional emails (welcome, reset password, confirmations) with no
  third-party branding visible.
- The platform is delivered as the brokerage's own product to its agents.

---

## 7. What's Included in a Deployment

1. Full source code deployment for one brokerage.
2. Database setup and migrations.
3. Branding configuration (logo, colors, name, domain).
4. Email domain connection (sender + templates).
5. Initial admin account and a short admin walkthrough.
6. Seeded starter content (offices, document placeholders, categories).

---

## 8. Suggested Packaging (customize to your pricing)

> The tiers below are a starting framework — adjust names and pricing to your
> market. They are not built into the software.

- **Starter** — Core portal: auth + approval, dashboard, listings, documents,
  vendors, calculators, profiles.
- **Professional** — Starter + Training/LMS with certificates, support center,
  office booking, worksheets, notifications.
- **Enterprise** — Professional + property management, events/RSVPs, full
  notification control center, broadcast emails, advanced branding, and
  priority support.

Recurring options: hosting + maintenance retainer, content-loading service,
and per-feature customizations.

---

## 9. Implementation Timeline (typical)

| Phase | Work | Typical duration |
|------|------|------------------|
| 1 | Branding, domain, email setup | 2–3 days |
| 2 | Data + content loading (listings, docs, offices, courses) | 3–5 days |
| 3 | Admin training + UAT | 2–3 days |
| 4 | Go-live + handover | 1 day |

Timelines depend on how much content the client provides up front.

---

## 10. Why This Platform

- **Built for real estate workflows**, not a generic intranet.
- **Admin-first** — your client's team runs it without developers.
- **One codebase, many brokerages** — fast to deploy and brand for each new client.
- **No vendor lock-in on data** — the client owns the database and content.
- **Cost-efficient** — files on the app server, free in-portal help assistant,
  and a single-process deployment keep running costs low.

---

*This document is a generic capability overview suitable for sharing with
prospective clients. Branding, pricing, and scope can be tailored per engagement.*
