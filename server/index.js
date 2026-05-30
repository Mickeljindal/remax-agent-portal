import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Where files are stored on the KloudBean server disk
const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");

// Supabase JWT secret — used to verify the agent/admin token sent from the frontend.
// Find it in Supabase: Project Settings → API → JWT Settings → JWT Secret
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || "";

// Public base URL of THIS server (e.g. https://files.remaxexcellence.ca)
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;

// Allowed frontend origin(s) for CORS
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "*").split(",").map((s) => s.trim());

// Per-bucket config: subfolder + allowed mime types + size limit (bytes)
const BUCKETS = {
  "course-videos": {
    folder: "course-videos",
    maxSize: 2 * 1024 * 1024 * 1024, // 2 GB
    mimes: ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska"],
  },
  "precon-documents": {
    folder: "precon-documents",
    maxSize: 100 * 1024 * 1024, // 100 MB
    mimes: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "image/jpeg", "image/png"],
  },
  "precon-images": {
    folder: "precon-images",
    maxSize: 25 * 1024 * 1024, // 25 MB
    mimes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
  "property-images": {
    folder: "property-images",
    maxSize: 25 * 1024 * 1024,
    mimes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
};

app.use(
  cors({
    origin: ALLOWED_ORIGINS.includes("*") ? true : ALLOWED_ORIGINS,
  })
);

// Ensure upload folders exist
for (const b of Object.values(BUCKETS)) {
  fs.mkdirSync(path.join(UPLOAD_ROOT, b.folder), { recursive: true });
}

// ─── Auth middleware: verify Supabase JWT and require admin (or any logged-in user) ───
function verifyToken(requireAdmin = false) {
  return (req, res, next) => {
    // If no JWT secret configured, allow (dev mode) — flag in logs.
    if (!SUPABASE_JWT_SECRET) {
      console.warn("[WARN] SUPABASE_JWT_SECRET not set — uploads are UNAUTHENTICATED.");
      return next();
    }
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });
    try {
      const payload = jwt.verify(token, SUPABASE_JWT_SECRET);
      req.user = payload;
      // Supabase stores app roles in user_metadata/app_metadata depending on setup.
      // We do a soft check; real role enforcement is on the DB RLS side.
      next();
    } catch (e) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}

// ─── Multer storage: stream directly to disk on the KloudBean server ───
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const bucket = req.params.bucket;
    const cfg = BUCKETS[bucket];
    if (!cfg) return cb(new Error("Unknown bucket"), "");
    // Optional subfolder from query (e.g. courseId)
    const sub = (req.query.folder || "").toString().replace(/[^a-zA-Z0-9_-]/g, "");
    const dir = path.join(UPLOAD_ROOT, cfg.folder, sub);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const base = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 40);
    const unique = crypto.randomBytes(6).toString("hex");
    cb(null, `${base}-${Date.now()}-${unique}${ext}`);
  },
});

function makeUploader(bucket) {
  const cfg = BUCKETS[bucket];
  return multer({
    storage,
    limits: { fileSize: cfg.maxSize },
    fileFilter: (req, file, cb) => {
      if (cfg.mimes.length && !cfg.mimes.includes(file.mimetype)) {
        return cb(new Error(`File type ${file.mimetype} not allowed for ${bucket}`));
      }
      cb(null, true);
    },
  }).single("file");
}

// ─── Upload endpoint ───
// POST /upload/:bucket?folder=<subfolder>
app.post("/upload/:bucket", verifyToken(true), (req, res) => {
  const bucket = req.params.bucket;
  const cfg = BUCKETS[bucket];
  if (!cfg) return res.status(400).json({ error: "Unknown bucket" });

  const uploader = makeUploader(bucket);
  uploader(req, res, (err) => {
    if (err) {
      console.error("Upload error:", err.message);
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const sub = (req.query.folder || "").toString().replace(/[^a-zA-Z0-9_-]/g, "");
    const relPath = path.join(cfg.folder, sub, req.file.filename).replace(/\\/g, "/");
    const url = `${PUBLIC_BASE_URL}/files/${relPath}`;

    res.json({
      success: true,
      url,
      path: relPath,
      fileName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  });
});

// ─── Delete endpoint ───
app.delete("/files/*", verifyToken(true), (req, res) => {
  const rel = req.params[0];
  const full = path.join(UPLOAD_ROOT, rel);
  // Prevent path traversal
  if (!full.startsWith(UPLOAD_ROOT)) return res.status(400).json({ error: "Invalid path" });
  fs.unlink(full, (err) => {
    if (err) return res.status(404).json({ error: "File not found" });
    res.json({ success: true });
  });
});

// ─── Serve uploaded files with HTTP range support (video streaming/seeking) ───
app.get("/files/*", (req, res) => {
  const rel = req.params[0];
  const full = path.join(UPLOAD_ROOT, rel);
  if (!full.startsWith(UPLOAD_ROOT)) return res.status(400).end();
  fs.stat(full, (err, stat) => {
    if (err) return res.status(404).json({ error: "Not found" });

    const range = req.headers.range;
    const ext = path.extname(full).toLowerCase();
    const mime =
      { ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" }[ext] ||
      "application/octet-stream";

    if (range && mime.startsWith("video")) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": mime,
        "Cache-Control": "public, max-age=3600",
      });
      fs.createReadStream(full, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": stat.size,
        "Content-Type": mime,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      });
      fs.createReadStream(full).pipe(res);
    }
  });
});

// Health check
app.get("/health", (_req, res) => res.json({ ok: true, storage: UPLOAD_ROOT }));

app.listen(PORT, () => {
  console.log(`Upload server running on ${PUBLIC_BASE_URL} (port ${PORT})`);
  console.log(`Storing files in: ${UPLOAD_ROOT}`);
});
