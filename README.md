# RE/MAX Excellence — Agent Portal

An internal agent portal for RE/MAX Excellence Canada: training courses, pre-construction listings, vendor directory, office room booking, support chat, calendars, and admin tools.

## Tech Stack

- **Frontend:** React + TypeScript + Vite, Tailwind CSS, shadcn/ui
- **Database & Auth:** Supabase (PostgreSQL)
- **File storage:** Node.js upload server (stores videos/documents on the host server disk) — see `/server`
- **Email:** Resend (via Supabase Edge Functions)

## Local Development

Requires Node.js 20+.

```sh
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env   # then fill in your values

# 3. Start the frontend
npm run dev

# 4. (separate terminal) Start the upload server
cd server
npm install
npm run dev
```

The app runs at `http://localhost:8080`. The upload server runs at `http://localhost:4000`.

## Environment Variables

Frontend (`.env`):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_PORTAL_SHOWCASE=false
VITE_UPLOAD_SERVER_URL=https://files.yourdomain.com
```

## Project Structure

```
src/              Frontend application
  components/     UI + dashboard + admin components
  pages/          Routes (agent dashboard + admin pages)
  hooks/          Data hooks
  config/         Help content, showcase flags
  integrations/   Supabase client + types
server/           Node.js file upload server (deploy on host)
supabase/         Database migrations + edge functions
```

## Deployment

See `DEPLOYMENT.md` for full hosting instructions.

## Build

```sh
npm run build      # outputs to dist/
npm run start      # serves the production build
```
