# Deployment Guide — KloudBean

This portal has **3 parts**, all of which can run on KloudBean:

1. **Frontend** — React app (static build)
2. **Upload server** — Node.js app that stores videos/files on the server disk (`/server`)
3. **Database + Auth** — Supabase (Cloud now, or self-hosted on KloudBean)

```
┌──────────────────────── KloudBean Server ────────────────────────┐
│                                                                   │
│  Frontend (React build)        Upload Server (Node.js)            │
│  portal.yourdomain.com   ───►  files.yourdomain.com               │
│         │                              │                          │
│         └──────────────┬───────────────┘                          │
│                        ▼                                          │
│                   Supabase (DB + Auth + Edge Functions)           │
│                   (Supabase Cloud OR self-hosted on KloudBean)    │
└───────────────────────────────────────────────────────────────────┘
```

---

## STEP 1 — Deploy the Upload Server (Node.js)

This stores course videos, listing PDFs, and images on the KloudBean disk.

1. KloudBean Console → **Applications → Add Application → Node.js**
2. Connect your Git repo, set **App Directory** to `server`
3. Runtime config:
   - Install command: `npm install`
   - Start command: `node index.js`
   - Node version: 20.x
4. Environment variables:
   ```
   PORT=<assigned by KloudBean>
   UPLOAD_DIR=/home/admin/portal-uploads
   PUBLIC_BASE_URL=https://files.yourdomain.com
   SUPABASE_JWT_SECRET=<Supabase → Project Settings → API → JWT Secret>
   ALLOWED_ORIGINS=https://portal.yourdomain.com
   ```
5. Add domain `files.yourdomain.com` + install SSL
6. **Pull & Deploy**, then verify `https://files.yourdomain.com/health` returns `{"ok":true}`

---

## STEP 2 — Database (Supabase)

You're currently on Supabase Cloud (`yqonfzflbabzjvztbffn`). Two options:

**Option A — keep Supabase Cloud (simplest).** Nothing to do; it's already set up with all tables.

**Option B — self-host Supabase on KloudBean (full data ownership).**
1. KloudBean → Add Application → **Supabase** (one-click)
2. After it provisions, copy the new API URL + anon key + service key + JWT secret
3. Run all SQL migrations against it (the `RUN_THIS_IN_SUPABASE.sql` file)
4. Update the frontend `.env` and upload server env to point at the new instance

Either way, make sure all migrations in `supabase/migrations/` have been applied.

---

## STEP 3 — Deploy Edge Functions (for email)

Email (worksheets, notifications, reminders) runs through Supabase Edge Functions + Resend.

```sh
# Install Supabase CLI, then:
supabase link --project-ref <your-project-ref>
supabase functions deploy send-notification
supabase functions deploy create-agent-profile
supabase functions deploy admin-reset-password
supabase functions deploy submit-precon-worksheet

# Set secrets
supabase secrets set RESEND_API_KEY=re_your_key_here
supabase secrets set NOTIFICATION_FROM_EMAIL=noreply@yourdomain.com
supabase secrets set PRECON_WORKSHEET_ADMIN_EMAIL=admin@yourdomain.com
supabase secrets set PRECON_WORKSHEET_FROM_EMAIL=noreply@yourdomain.com
supabase secrets set PORTAL_NAME="RE/MAX Excellence Portal"
```

In Resend: verify your sending domain so emails deliver.

---

## STEP 4 — Deploy the Frontend

1. KloudBean → Add Application → **React / Node.js** (same server is fine)
2. Connect the Git repo (root directory)
3. Runtime config:
   - Install command: `npm install`
   - Build command: `npm run build`
   - Start command: `npm run start`  (serves the `dist/` folder)
   - Node version: 20.x
4. Environment variables:
   ```
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
   VITE_PORTAL_SHOWCASE=false
   VITE_UPLOAD_SERVER_URL=https://files.yourdomain.com
   ```
5. Add domain `portal.yourdomain.com` + install SSL
6. **Pull & Deploy**

---

## STEP 5 — Create the First Admin

After deploy, sign up through the portal, then in Supabase SQL editor:

```sql
SELECT id, user_id, full_name, reco_number FROM agents;

INSERT INTO user_roles (user_id, role) VALUES ('<your-user-id>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE agents SET is_active = true WHERE user_id = '<your-user-id>';
```

---

## Post-Deploy Checklist

- [ ] Upload server `/health` returns ok
- [ ] Frontend loads at portal domain with SSL
- [ ] All migrations applied
- [ ] Edge functions deployed + Resend key set
- [ ] First admin created
- [ ] Test: admin uploads a course video → agent watches it
- [ ] Test: agent submits a worksheet → both get email
- [ ] Test: admin creates an event → agents get notified

---

## Environment Variable Reference

**Frontend `.env`**
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_PORTAL_SHOWCASE=false
VITE_UPLOAD_SERVER_URL
```

**Upload server `server/.env`**
```
PORT
UPLOAD_DIR
PUBLIC_BASE_URL
SUPABASE_JWT_SECRET
ALLOWED_ORIGINS
```

**Supabase secrets (edge functions)**
```
RESEND_API_KEY
NOTIFICATION_FROM_EMAIL
PRECON_WORKSHEET_ADMIN_EMAIL
PRECON_WORKSHEET_FROM_EMAIL
PORTAL_NAME
```
