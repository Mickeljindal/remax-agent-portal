// Production server for the RE/MAX Agent Portal.
// Serves the React SPA build (dist/) AND handles file uploads to the server disk,
// all under ONE domain. KloudBean runs this file as the single-process entry point.
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, "dist");

// Where uploaded files are stored on the KloudBean server disk
const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");

// Supabase JWT secret (Project Settings → API → JWT Secret) — verifies the uploader.
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || "";

// Public base URL of this app (e.g. https://agentportal.joinremaxex.com)
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;

const BUCKETS = {
  "course-videos": { folder: "course-videos", maxSize: 2 * 1024 * 1024 * 1024, mimes: ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska"] },
  "precon-documents": { folder: "precon-documents", maxSize: 100 * 1024 * 1024, mimes: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "image/jpeg", "image/png"] },
  "precon-images": { folder: "precon-images", maxSize: 25 * 1024 * 1024, mimes: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
  "property-images": { folder: "property-images", maxSize: 25 * 1024 * 1024, mimes: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
};

for (const b of Object.values(BUCKETS)) {
  fs.mkdirSync(path.join(UPLOAD_ROOT, b.folder), { recursive: true });
}

function verifyToken(req, res, next) {
  if (!SUPABASE_JWT_SECRET) {
    console.warn("[WARN] SUPABASE_JWT_SECRET not set — uploads are UNAUTHENTICATED.");
    return next();
  }
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.user = jwt.verify(token, SUPABASE_JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const cfg = BUCKETS[req.params.bucket];
    if (!cfg) return cb(new Error("Unknown bucket"), "");
    const sub = (req.query.folder || "").toString().replace(/[^a-zA-Z0-9_-]/g, "");
    const dir = path.join(UPLOAD_ROOT, cfg.folder, sub);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const base = path.basename(file.originalname, ext).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    cb(null, `${base}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

function makeUploader(bucket) {
  const cfg = BUCKETS[bucket];
  return multer({
    storage,
    limits: { fileSize: cfg.maxSize },
    fileFilter: (req, file, cb) => {
      if (cfg.mimes.length && !cfg.mimes.includes(file.mimetype)) return cb(new Error(`File type ${file.mimetype} not allowed`));
      cb(null, true);
    },
  }).single("file");
}

// ─── Upload API (same origin as the app) ───
app.post("/api/upload/:bucket", verifyToken, (req, res) => {
  const cfg = BUCKETS[req.params.bucket];
  if (!cfg) return res.status(400).json({ error: "Unknown bucket" });
  makeUploader(req.params.bucket)(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const sub = (req.query.folder || "").toString().replace(/[^a-zA-Z0-9_-]/g, "");
    const relPath = path.join(cfg.folder, sub, req.file.filename).replace(/\\/g, "/");
    res.json({ success: true, url: `${PUBLIC_BASE_URL}/files/${relPath}`, path: relPath, fileName: req.file.originalname, size: req.file.size, mimeType: req.file.mimetype });
  });
});

app.delete("/files/*", verifyToken, (req, res) => {
  const full = path.join(UPLOAD_ROOT, req.params[0]);
  if (!full.startsWith(UPLOAD_ROOT)) return res.status(400).json({ error: "Invalid path" });
  fs.unlink(full, (err) => (err ? res.status(404).json({ error: "Not found" }) : res.json({ success: true })));
});

// ─── Serve uploaded files with video range support ───
app.get("/files/*", (req, res) => {
  const full = path.join(UPLOAD_ROOT, req.params[0]);
  if (!full.startsWith(UPLOAD_ROOT)) return res.status(400).end();
  fs.stat(full, (err, stat) => {
    if (err) return res.status(404).json({ error: "Not found" });
    const ext = path.extname(full).toLowerCase();
    const mime = { ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" }[ext] || "application/octet-stream";
    const range = req.headers.range;
    if (range && mime.startsWith("video")) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      res.writeHead(206, { "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Accept-Ranges": "bytes", "Content-Length": end - start + 1, "Content-Type": mime, "Cache-Control": "public, max-age=3600" });
      fs.createReadStream(full, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { "Content-Length": stat.size, "Content-Type": mime, "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=3600" });
      fs.createReadStream(full).pipe(res);
    }
  });
});

app.get("/health", (_req, res) => res.json({ ok: true, storage: UPLOAD_ROOT }));

// ─── Serve the React SPA build ───
if (!fs.existsSync(DIST)) {
  console.error("[server] dist/ not found. Ensure Build Command 'npm run build' ran before start.");
}
app.use(express.static(DIST, {
  maxAge: "1h",
  setHeaders: (res, filePath) => {
    if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  },
}));

// SPA fallback for everything else (must be last)
app.get("*", (_req, res) => res.sendFile(path.join(DIST, "index.html")));

app.listen(PORT, () => {
  console.log(`[server] RE/MAX Agent Portal running on port ${PORT}`);
  console.log(`[server] Uploads stored in: ${UPLOAD_ROOT}`);
});
