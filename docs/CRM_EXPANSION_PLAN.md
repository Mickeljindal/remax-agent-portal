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

## 2. What NovaCRM-style products do (our reference)

Modern AI real-estate CRMs converge on the same core (paraphrased from public
product descriptions; content rephrased for compliance):

- Contact & lead management with a single timeline per person.
- Visual sales pipeline (drag deals between stages).
- AI lead scoring and prioritization (who to call first).
- Automated, multi-channel follow-up (email + SMS sequences).
- An AI assistant that drafts emails, summarizes calls, and creates marketing
  collateral (flyers, "just sold" reports, property comparisons).
- Calendar/email sync and speed-to-lead dashboards.
- Reporting and analytics.

Sources: [NovaCRM.ai](https://novacrm.ai/), [NovaCRM (innovaas)](https://novacrm.innovaas.co/),
[HubSpot — AI CRMs for real estate](https://blog.hubspot.com/sales/ai-crm-real-estate).
*Content was rephrased for compliance with licensing restrictions.*

We adopt this proven shape and tailor it to our portal and to pre-construction +
resale workflows the brokerage already runs.

---

## 3. Proposed feature set (tailored to RE/MAX Excellence)

### 3.1 Contacts & Leads
- Unified contact record: buyer/seller/investor, source, tags, budget, preferred areas.
- Activity timeline: calls, emails, texts, notes, showings, worksheet submissions.
- Auto-capture: a new pre-con **worksheet** or website inquiry creates/links a contact.
- Duplicate detection and merge.

### 3.2 Pipeline (Deals)
- Visual kanban: New Lead → Contacted → Nurturing → Showing → Offer → Closed.
- Stages admin-editable (same pattern as `precon_statuses`).
- Each deal links to a contact and optionally a listing / pre-con project.
- Expected close date, value, and commission estimate (reuse existing calculators).

### 3.3 Smart follow-up & automation
- Reminder tasks ("call back in 3 days") with due-date nudges.
- Drip sequences: templated email/SMS steps triggered by stage or time.
- "Speed-to-lead" alert: notify the agent the moment a new lead lands.

### 3.4 AI assistant (the NovaCRM-style hook)
- Draft a follow-up email/text in the agent's voice from the contact's history.
- Summarize a long note or call log into next steps.
- Generate a one-page property flyer or "just listed / just sold" post from a listing.
- Suggest the next best action and rank today's hottest leads (AI lead score).
- Implemented via an LLM API (e.g., OpenAI) behind our server, keys server-side.

### 3.5 Communication
- Email send/receive logged to the timeline (via the existing email infra + inbound parse).
- Optional SMS via Twilio.
- Click-to-call logging; templates library.

### 3.6 Calendar & tasks
- Reuse FullCalendar: showings, follow-ups, and closings on the agent calendar.
- Task list with priorities and overdue highlighting.

### 3.7 Dashboards & reporting
- Agent: pipeline value, conversion rate, tasks due, leads needing attention.
- Admin/broker: team pipeline, source ROI, response times, leaderboard.

### 3.8 Admin controls (consistent with the portal)
- Editable stages, sources, tags, templates, and automation rules.
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

All scoped by `owner_id` with RLS so agents only see their own book; admins get a
brokerage view. (Note: tighten the existing `INSERT WITH CHECK (true)` policies as
part of this work — see code analysis.)

---

## 5. Delivery phases

**Phase 1 — Foundation (CRM MVP)**
Contacts, deals kanban, activity timeline, manual tasks, worksheet→contact capture.
Outcome: agents can run their book inside the portal.

**Phase 2 — Follow-up engine**
Templates, drip sequences, reminders, speed-to-lead alerts, email logging.
Outcome: no lead falls through the cracks.

**Phase 3 — AI assistant**
Email/text drafting, note/call summaries, AI lead scoring, next-best-action.
Outcome: the "NovaCRM" wow factor.

**Phase 4 — Marketing & comms**
Flyer / just-sold generator, SMS (Twilio), inbound email parsing.
Outcome: marketing collateral and 2-way messaging in one place.

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
