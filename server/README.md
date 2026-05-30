# RE/MAX Portal Upload Server

A lightweight Node.js + Express server that stores uploaded files (course videos, listing PDFs, images) on the **KloudBean server disk** — NOT in Supabase. Supabase only stores the database record (the file URL).

## What it does

- Accepts file uploads with real progress tracking (frontend uses XHR upload events)
- Stores files on the server's local disk under `UPLOAD_DIR`
- Serves files back with **HTTP range support** (so videos can stream/seek)
- Verifies the uploader's Supabase JWT before accepting uploads
- Supports buckets: `course-videos`, `precon-documents`, `precon-images`, `property-images`

## Local development

```sh
cd server
npm install
cp .env.example .env   # edit values
npm run dev
```

Server runs on `http://localhost:4000`. The frontend points at it via `VITE_UPLOAD_SERVER_URL`.

## Deploy on KloudBean

1. In KloudBean, create a **Node.js application** (can be on the same server as the frontend)
2. Connect this `server/` directory via Git (or set App Directory to `server`)
3. Configure:
   - **Install command:** `npm install`
   - **Start command:** `node index.js`
   - **Node version:** 20.x
4. Set environment variables (Runtime Configuration → Environment Variables):
   ```
   PORT=<assigned by KloudBean>
   UPLOAD_DIR=/home/admin/portal-uploads
   PUBLIC_BASE_URL=https://files.yourdomain.com
   SUPABASE_JWT_SECRET=<from Supabase Project Settings → API → JWT Secret>
   ALLOWED_ORIGINS=https://portal.yourdomain.com
   ```
5. Add a custom domain (e.g. `files.yourdomain.com`) + SSL
6. **Pull & Deploy**

Then set `VITE_UPLOAD_SERVER_URL=https://files.yourdomain.com` in the frontend `.env` and rebuild.

## Storage location

Files persist on the KloudBean server disk at `UPLOAD_DIR`. Make sure that path is on a volume with enough space for your video library. Back it up with KloudBean's backup tools.

## Endpoints

- `POST /upload/:bucket?folder=<sub>` — upload a file (field name `file`)
- `GET /files/<path>` — stream/download a file (range-enabled for video)
- `DELETE /files/<path>` — delete a file (admin token required)
- `GET /health` — health check
