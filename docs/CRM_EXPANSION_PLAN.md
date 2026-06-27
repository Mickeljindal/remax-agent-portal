# RE/MAX Excellence Agent Portal — CRM Expansion Plan

> A staged plan to add a full real-estate CRM (lead-to-close + AI assistant) to the
> existing Agent Portal, in the spirit of NovaCRM.ai but native to our platform,
> white-labeled, and admin-controlled. This is a **plan + pitch**, not built yet.

---

## 1. Why add a CRM

Today the portal equips agents (training, listings, tools, support). It does **not**
help them manage their own clients. Agents still juggle leads in spreadsheets,
phone contacts, and sticky notes. Most deals are lost to slow or missed follow-up.

A built-in CRM closes that gap and makes the portal the agent's daily home base:
capture a lead, nurture it automatically, move it down a pipeline, and close — all in
the same branded app they already log into.

**Business value for the brokerage**
- Stickier platform — agents open it every day, not just for training.
- Brokerage-level visibility into pipeline health and agent activity.
- A genuine recruiting differentiator ("we give you a free AI CRM").
- New revenue tier — CRM as a premium add-on package.

---

## 2. What NovaCRM does (our reference benchmark)

NovaCRM.ai is an AI-first real-estate CRM. Studying its public product material, its
pillars are (paraphrased; content rephrased for compliance):

- **Avon AI** — a branded AI assistant that, through a chat interface, generates
  marketing collateral on the fly: property flyers, "just sold" reports, and
  property comparisons.
- **Agentic AI** — autonomous agents that classify and score leads (semantic search),
  compose emails, summarize calls, and advance the pipeline with minimal manual work.
- **Lead generation** — built-in landing pages and IDX "squeeze" pages so agents
  capture leads directly into the CRM, plus the usual web-inquiry capture.
- **Contacts, pipelines & deal tracking** — a single record per person and a visual
  pipeline, with documented interactions and secure, role-based workflows.
- **Email marketing** — tailored campaigns, professional templates, and engagement
  analytics (opens, clicks, replies).
- **Proposals & document e-signing** — send and get documents signed inside the CRM.
- **Reporting & dashboards** — pipeline health, speed-to-lead, and team analytics.

Sources: [NovaCRM.ai](https://novacrm.ai/), [NovaCRM (innovaas)](https://novacrm.innovaas.co/),
[NOVACRM reviews — Slashdot](https://features.slashdot.org/software/p/NOVA-CRM/),
[NovaCRM agentic intelligence](https://app.riphere.com/),
[HubSpot — AI CRMs for real estate](https://blog.hubspot.com/sales/ai-crm-real-estate).
*Content was rephrased for compliance with licensing restrictions.*

We adopt this proven shape — **especially the Avon-style AI marketing studio, the
lead-capture pages, and e-signing**, which our current portal does not have — and
tailor it to the pre-construction + resale workflows the brokerage already runs
(worksheets, listings, commission calculators, DB-driven email).

---

## 3. Proposed feature set (tailored to RE/MAX Excellence)

### 3.1 Lead capture & generation  *(NovaCRM parity — new to our portal)*
- Public **lead-capture pages** per listing / pre-con project: a branded landing page
  with a capture form that drops the lead straight into the CRM (extends the existing
  pre-con worksheet idea into a reusable, agent-shareable page).
- IDX/"squeeze" style sign-up for property alerts and saved searches.
- Web inquiry + worksheet auto-capture; QR codes for open houses.
- Every captured lead is owned by the sharing agent and timestamped for speed-to-lead.

### 3.2 Contacts & Leads
- Unified contact record: buyer/seller/investor, source, tags, budget, preferred areas.
- Activity timeline: calls, emails, texts, notes, showings, worksheet submissions.
- Duplicate detection and merge.

### 3.3 Pipeline (Deals)
- Visual kanban: New Lead → Contacted → Nurturing → Showing → Offer → Closed.
- Stages admin-editable (same pattern as `precon_statuses`).
- Each deal links to a contact and optionally a listing / pre-con project.
- Expected close date, value, and commission estimate (reuse existing calculators).

### 3.4 AI marketing studio  *(NovaCRM's "Avon AI" — new to our portal)*
- A chat interface that generates collateral from a listing or pre-con project in
  seconds: **property flyers, "just listed / just sold" posts, and side-by-side
  property comparisons** — using the listing data and images the portal already holds.
- One-click export to PDF/image, on RE/MAX Excellence brand.
- Implemented via an LLM + templated render behind our server (keys server-side).

### 3.5 Agentic AI assistant
- Classify and **score incoming leads** (who to call first) from their profile + activity.
- Draft follow-up emails/texts in the agent's voice from the contact's history.
- Summarize a long note or call log into next steps.
- Suggest the next best action; optionally auto-advance a deal (with agent approval).

### 3.6 Smart follow-up & automation
- Reminder tasks ("call back in 3 days") with due-date nudges.
- Drip sequences: templated email/SMS steps triggered by stage or time.
- "Speed-to-lead" alert: notify the agent the moment a new lead lands.

### 3.7 Email campaigns & communication  *(extends our existing email infra)*
- Bulk/segmented **email campaigns** with professional templates and **engagement
  analytics** (opens, clicks, replies) — built on the portal's DB-driven email system.
- Email send/receive logged to the timeline (inbound parse).
- Optional SMS via Twilio; click-to-call logging; optional power-dialer integration.

### 3.8 Proposals & document e-signing  *(NovaCRM parity — new to our portal)*
- Send buyer-rep agreements, worksheets, and offers for **e-signature** inside the CRM.
- Status tracking (sent / viewed / signed) on the contact timeline.
- Reuses the existing private upload/storage infra for signed documents.

### 3.9 Calendar & tasks
- Reuse FullCalendar: showings, follow-ups, and closings on the agent calendar.
- Task list with priorities and overdue highlighting.

### 3.10 Dashboards & reporting
- Agent: pipeline value, conversion rate, tasks due, leads needing attention.
- Admin/broker: team pipeline, source ROI, response times, leaderboard.

### 3.11 Admin controls (consistent with the portal)
- Editable stages, sources, tags, templates, capture pages, and automation rules.
- Per-agent data isolation via row-level security; brokerage roll-up for admins.
- Toggle the whole CRM module on/off per package.

---

## 4. How it fits the current architecture

The CRM reuses what we already run — no new stack:

| Concern        | Reuse from portal                                              |
|----------------|----------------------------------------------------------------|
| Frontend       | React + TS + shadcn/ui + Tailwind; new `/crm` routes & section |
| Data/Auth      | Supabase Postgres + RLS (per-agent ownership)                  |
| Server         | Existing Express `server.js` for email, AI proxy, webhooks     |
| Email          | DB-driven email settings + Resend domain already configured    |
| Calendar       | FullCalendar already in the app                                |
| Calculators    | Existing commission/HST calc feeds deal value                  |

### Proposed data model (new tables)
- `crm_contacts` — person record (owner_id, name, email, phone, type, source, tags…).
- `crm_deals` — pipeline card (contact_id, stage_id, value, close_date, listing_id…).
- `crm_stages` — admin-editable pipeline stages (name, order, color).
- `crm_activities` — timeline events (deal_id/contact_id, type, body, created_by).
- `crm_tasks` — follow-ups (due_at, status, assignee).
- `crm_templates` — email/SMS templates.
- `crm_automations` — trigger → action rules.
- `crm_messages` — sent/received email/SMS log.
- `crm_capture_pages` — agent lead-capture/landing pages (slug, listing_id, fields…).
- `crm_campaigns` — bulk email campaigns + per-recipient engagement (opens, clicks).
- `crm_documents` — proposals/agreements sent for e-signature (status, signed_url).

All scoped by `owner_id` with RLS so agents only see their own book; admins get a
brokerage view. (Note: tighten the existing `INSERT WITH CHECK (true)` policies as
part of this work — see code analysis.)

---

## 5. Delivery phases

**Phase 1 — Foundation (CRM MVP)**
Contacts, deals kanban, activity timeline, manual tasks, worksheet→contact capture.
Outcome: agents can run their book inside the portal.

**Phase 2 — Lead capture & follow-up engine**
Lead-capture/landing pages, templates, drip sequences, reminders, speed-to-lead
alerts, email logging.
Outcome: new leads flow in and no follow-up falls through the cracks.

**Phase 3 — AI assistant & marketing studio**
Avon-style AI marketing studio (flyers, just-sold, comparisons), lead scoring,
email/text drafting, call/note summaries, next-best-action.
Outcome: the "NovaCRM" wow factor — collateral and follow-up in one click.

**Phase 4 — Campaigns, comms & e-signing**
Email campaigns with engagement analytics, SMS (Twilio)/dialer, inbound email
parsing, proposals & document e-signature.
Outcome: full two-way communication and paperwork close-out in the portal.

**Phase 5 — Analytics & brokerage roll-up**
Agent + broker dashboards, source ROI, leaderboards, exports.
Outcome: data-driven coaching and recruiting proof.

*(Exact timeline and pricing to be scoped per package — this document is the vision
and roadmap to align with the client before any build.)*

---

## 6. Risks & considerations
- **AI cost**: LLM calls are usage-priced; cap per-agent usage or tier it.
- **Compliance**: CASL/TCPA for email + SMS — include consent capture and unsubscribe.
- **Data privacy**: client PII lives in the brokerage's own database (no third-party lock-in).
- **Scope creep**: ship Phase 1 first; treat AI as a fast-follow, not a blocker.
- **Security debt**: close the permissive RLS policies before storing real client data.

---

## 7. The ask
Approve the vision and Phase 1 scope so we can produce a detailed build estimate.
The accompanying pitch deck (`docs/CRM-Pitch-Deck.html`) is the client-facing version
of this plan with UI mockups.
