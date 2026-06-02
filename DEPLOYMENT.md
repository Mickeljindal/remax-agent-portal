# Deployment Guide — KloudBean

The portal runs as **one single-process Node app** on KloudBean. `server.js`
serves the React build **and** handles all backend work (file uploads, agent
registration, admin password reset, email notifications, pre-con worksheets).

The only external service is **Supabase** (database + auth). There are **no
Supabase Edge Functions to deploy** — that logic now lives in `server.js`, so a
plain `git push` + KloudBean "Pull & Deploy" ships the whole backend.

```
┌──────────────────── KloudBean (single Node app) ─────────────────┐
│                                                                   │
│   server.js                                                       │
│   ├─ serves dist/ (React app)                                     │
│   ├─ /api/upload/:bucket   → stores videos/PDFs/images on disk    │
│   ├─ /api/register-agent   → creates auth user + agent profile    │
│   ├─ /api/admin-reset-password                                    │
│   ├─ /api/send-notification → Resend email                        │
│   └─ /api/submit-precon-worksheet → Resend email + DB             │
│                          │                                        │
│                          ▼                                        │
│                  Supabase (DB + Auth)                             │
└───────────────────────────────────────────────────────────────────┘
```

All on one domain: `agentportal.joinremaxex.com`.

---

## KloudBean app configuration

1. KloudBean Console → **Applications → Add Application → Node.js** (single process)
2. Connect the Git repo (root directory — **not** `/server`)
3. Runtime config:
   - Install command: `npm install`
   - Build command: `npm run build`
   - Start command: `npm start`  (runs `node server.js`)
   - Node version: 22.x
4. Add domain `agentportal.joinremaxex.com` + install SSL
5. **Pull & Deploy**, then verify `https://agentportal.joinremaxex.com/health`
   returns `{"ok":true}`

---

## Environment variables (set these in KloudBean)

```
# Frontend (baked into the build — must be present at BUILD time)
VITE_SUPABASE_URL=https://yqonfzflbabzjvztbffn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
VITE_PORTAL_SHOWCASE=false
VITE_UPLOAD_SERVER_URL=            # leave empty — same domain

# Backend / server.js (kept private, NOT prefixed with VITE_)
SUPABASE_URL=https://yqonfzflbabzjvztbffn.supabase.co
SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role secret>   # REQUIRED
PUBLIC_BASE_URL=https://agentportal.joinremaxex.com
UPLOAD_DIR=/home/<kloudbean-user>/portal-uploads  # persistent disk path

# Email (Resend) — sender must use your Resend-verified domain
RESEND_API_KEY=re_xxxxxxxxxxxxx
NOTIFICATION_FROM_EMAIL=noreply@joinremaxex.com
PRECON_WORKSHEET_FROM_EMAIL=noreply@joinremaxex.com
PRECON_WORKSHEET_ADMIN_EMAIL=admin@joinremaxex.com
PORTAL_NAME=RE/MAX Excellence Portal
```

> **Important:** `SUPABASE_SERVICE_ROLE_KEY` is mandatory. Without it, agent
> registration, admin password reset, and email all return a 503 "not
> configured" error. Find it in Supabase → Project Settings → API →
> `service_role` secret.

> Set `UPLOAD_DIR` to a path on persistent storage so uploaded videos/files
> survive redeploys. If omitted, files are stored under the app's `uploads/`
> folder (wiped on each fresh clone).

---

## Database (Supabase)

The project uses Supabase Cloud (`yqonfzflbabzjvztbffn`). Make sure every
migration in `supabase/migrations/` has been applied. Migrations can be run
directly with `scripts/run-migration.mjs` (uses the DB password) or pasted into
the Supabase SQL editor.

Email is configured via **Resend** — verify your sending domain there so mail
delivers, and use that verified domain in the `*_FROM_EMAIL` vars above.

---

## Create the first admin

After deploy, register through the portal, then in the Supabase SQL editor:

```sql
SELECT id, user_id, full_name, reco_number FROM agents;

INSERT INTO user_roles (user_id, role) VALUES ('<your-user-id>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE agents SET is_active = true WHERE user_id = '<your-user-id>';
```

The admin panel lives at **`/admin`** (sign in as an admin user to access it).

---

## Post-deploy checklist

- [ ] `/health` returns ok
- [ ] App loads at the portal domain with SSL
- [ ] All migrations applied
- [ ] `SUPABASE_SERVICE_ROLE_KEY` + Resend vars set in KloudBean
- [ ] First admin created
- [ ] Test: register a new agent → can log in immediately (pending activation)
- [ ] Test: admin uploads a course video → agent watches it
- [ ] Test: agent submits a worksheet → both admin and agent get email
- [ ] Test: admin creates an event/reminder → agents get notified
