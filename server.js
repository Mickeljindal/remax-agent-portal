// Production server for the RE/MAX Agent Portal.
// Serves the React SPA build (dist/) AND handles file uploads to the server disk,
// all under ONE domain. KloudBean runs this file as the single-process entry point.
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, "dist");

// Parse JSON bodies for the API endpoints (large limit for base64 ID attachments).
// Multipart uploads (multer) are unaffected since this only parses application/json.
app.use(express.json({ limit: "30mb" }));

// Where uploaded files are stored on the KloudBean server disk
const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");

// Supabase project URL + anon key — used to validate the uploader's token
// by asking Supabase who the user is (works with any JWT signing method).
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

// Service role key — required for admin operations (create users, reset passwords,
// write rows bypassing RLS). Set this in the KloudBean environment variables.
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Email + portal config (used by the notification / worksheet endpoints).
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const NOTIFICATION_FROM_EMAIL = process.env.NOTIFICATION_FROM_EMAIL || "onboarding@resend.dev";
const PRECON_WORKSHEET_FROM_EMAIL = process.env.PRECON_WORKSHEET_FROM_EMAIL || NOTIFICATION_FROM_EMAIL;
const PRECON_WORKSHEET_ADMIN_EMAIL = process.env.PRECON_WORKSHEET_ADMIN_EMAIL || "";
const PORTAL_NAME = process.env.PORTAL_NAME || "RE/MAX Excellence Portal";

// Service-role Supabase client (admin). Null if the key isn't configured.
const adminClient =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

if (!adminClient) {
  console.warn(
    "[WARN] SUPABASE_SERVICE_ROLE_KEY not set — agent registration, password reset, and email APIs are disabled."
  );
}

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

async function verifyToken(req, res, next) {
  // If Supabase isn't configured, allow (dev mode) — flag in logs.
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("[WARN] SUPABASE_URL / anon key not set — uploads are UNAUTHENTICATED.");
    return next();
  }
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    // Ask Supabase to validate the token and return the user.
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    });
    if (!r.ok) return res.status(401).json({ error: "Invalid or expired session" });
    req.user = await r.json();
    next();
  } catch (e) {
    console.error("Auth check failed:", e);
    return res.status(401).json({ error: "Auth check failed" });
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

// ─────────────────────────────────────────────────────────────────────────
//  Account / notification API (ported from Supabase edge functions so the
//  whole backend runs in this single KloudBean process — no edge deploy step).
// ─────────────────────────────────────────────────────────────────────────

// Resolve the caller's Supabase user from their bearer token (validates via the
// Supabase Auth API so it works regardless of the JWT signing method).
async function getCallingUser(req) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function isAdminUser(userId) {
  if (!adminClient || !userId) return false;
  const { data } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");
  return !!(data && data.length);
}

function buildHtmlEmail(subject, body, portalName) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb;">
  <div style="background:#003DA5;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:20px;">${portalName}</h1>
  </div>
  <div style="background:white;padding:30px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
    <h2 style="color:#1f2937;margin-top:0;">${subject}</h2>
    <div style="color:#4b5563;line-height:1.6;">${String(body || "").replace(/\n/g, "<br>")}</div>
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:20px;">
    This is an automated message from ${portalName}. Please do not reply directly.
  </p>
</body></html>`;
}

async function sendResendEmail({ from, to, subject, html, attachments }) {
  if (!RESEND_API_KEY) {
    console.log(`[NO RESEND KEY] Would email ${to}: ${subject}`);
    return { ok: true, skipped: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from, to: [to], subject, html, ...(attachments ? { attachments } : {}) }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: text };
  }
  return { ok: true };
}

// ─── Agent registration (replaces create-agent-profile edge function) ───
app.post("/api/register-agent", async (req, res) => {
  if (!adminClient) return res.status(503).json({ error: "Registration is not configured on the server." });
  try {
    const { recoNumber, fullName, email, password } = req.body || {};
    if (!recoNumber?.trim() || !password) {
      return res.status(400).json({ error: "RECO number and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const loginEmail = `${recoNumber.toLowerCase().replace(/\s+/g, "")}@agent.portal`;

    // Create the auth user with email auto-confirmed (no confirmation email needed).
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: loginEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || null,
        reco_number: recoNumber,
        contact_email: email || null,
      },
    });

    if (createErr) {
      const msg = (createErr.message || "").toLowerCase();
      if (msg.includes("already") || createErr.code === "email_exists") {
        return res.status(400).json({ error: "This RECO number is already registered. Please log in instead." });
      }
      return res.status(400).json({ error: createErr.message });
    }

    const userId = created.user?.id;
    if (!userId) return res.status(400).json({ error: "Failed to create user." });

    // Create the agent profile (inactive — requires admin activation).
    const { error: insertError } = await adminClient.from("agents").insert({
      user_id: userId,
      reco_number: recoNumber,
      full_name: fullName || null,
      email: email || null,
      is_active: false,
    });
    if (insertError) {
      await adminClient.auth.admin.deleteUser(userId); // roll back
      if (insertError.message?.includes("duplicate") || insertError.code === "23505") {
        return res.status(400).json({ error: "This RECO number is already registered. Please log in instead." });
      }
      return res.status(400).json({ error: `Failed to create profile: ${insertError.message}` });
    }

    // Assign the 'agent' role.
    await adminClient.from("user_roles").insert({ user_id: userId, role: "agent" });

    // Notify admins (in-app), best-effort.
    try {
      const { data: adminRoles } = await adminClient.from("user_roles").select("user_id").eq("role", "admin");
      for (const r of adminRoles || []) {
        const { data: adminAgent } = await adminClient.from("agents").select("id").eq("user_id", r.user_id).maybeSingle();
        if (adminAgent) {
          await adminClient.from("in_app_notifications").insert({
            agent_id: adminAgent.id,
            title: `New agent signup: ${fullName || recoNumber}`,
            body: `RECO ${recoNumber} is pending activation.`,
            type: "system",
            link: "/admin",
          });
        }
      }
    } catch { /* ignore */ }

    res.json({ success: true, message: "Account created. Pending admin activation." });
  } catch (e) {
    console.error("register-agent error:", e);
    res.status(400).json({ error: e.message || "Registration failed." });
  }
});

// ─── Admin reset password (replaces admin-reset-password edge function) ───
app.post("/api/admin-reset-password", async (req, res) => {
  if (!adminClient) return res.status(503).json({ error: "Password reset is not configured on the server." });
  try {
    const caller = await getCallingUser(req);
    if (!caller?.id) return res.status(401).json({ error: "Unauthorized." });
    if (!(await isAdminUser(caller.id))) return res.status(403).json({ error: "Admin access required." });

    const { targetUserId, newPassword } = req.body || {};
    if (!targetUserId || !newPassword) return res.status(400).json({ error: "Missing targetUserId or newPassword." });
    if (newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });

    const { error } = await adminClient.auth.admin.updateUserById(targetUserId, { password: newPassword });
    if (error) return res.status(400).json({ error: `Failed to update password: ${error.message}` });

    res.json({ success: true, message: "Password reset successfully" });
  } catch (e) {
    console.error("admin-reset-password error:", e);
    res.status(400).json({ error: e.message || "Password reset failed." });
  }
});

// ─── Send notification email (replaces send-notification edge function) ───
app.post("/api/send-notification", async (req, res) => {
  if (!adminClient) return res.status(503).json({ error: "Notifications are not configured on the server." });
  try {
    const {
      type, recipientEmail, recipientName, recipientAgentId,
      subject, body, metadata, notifyAdmins, adminSubject, adminBody,
    } = req.body || {};

    if (!recipientEmail || !subject) return res.status(400).json({ error: "recipientEmail and subject are required." });

    // Log the notification.
    let notifId = null;
    const { data: notifRecord } = await adminClient
      .from("email_notifications")
      .insert({
        recipient_email: recipientEmail,
        recipient_name: recipientName || null,
        recipient_agent_id: recipientAgentId || null,
        notification_type: type,
        subject,
        body: body || "",
        metadata: metadata || {},
        status: "pending",
      })
      .select("id")
      .maybeSingle();
    notifId = notifRecord?.id || null;

    const result = await sendResendEmail({
      from: `${PORTAL_NAME} <${NOTIFICATION_FROM_EMAIL}>`,
      to: recipientEmail,
      subject,
      html: buildHtmlEmail(subject, body, PORTAL_NAME),
    });

    if (notifId) {
      if (result.ok) {
        await adminClient.from("email_notifications").update({
          status: "sent", sent_at: new Date().toISOString(),
          error_message: result.skipped ? "No RESEND_API_KEY — logged only" : null,
        }).eq("id", notifId);
      } else {
        await adminClient.from("email_notifications").update({
          status: "failed", error_message: result.error,
        }).eq("id", notifId);
      }
    }

    // Notify admins too, if requested.
    if (notifyAdmins) {
      const { data: adminRoles } = await adminClient.from("user_roles").select("user_id").eq("role", "admin");
      const adminUserIds = (adminRoles || []).map((r) => r.user_id);
      if (adminUserIds.length) {
        const { data: adminAgents } = await adminClient
          .from("agents").select("email, full_name, user_id").in("user_id", adminUserIds);
        for (const admin of adminAgents || []) {
          if (!admin.email) continue;
          const aSubject = adminSubject || `[Admin] ${subject}`;
          const aBody = adminBody || body;
          await adminClient.from("email_notifications").insert({
            recipient_email: admin.email,
            recipient_name: admin.full_name,
            notification_type: type,
            subject: aSubject,
            body: aBody || "",
            metadata: metadata || {},
            status: "pending",
          });
          await sendResendEmail({
            from: `${PORTAL_NAME} <${NOTIFICATION_FROM_EMAIL}>`,
            to: admin.email,
            subject: aSubject,
            html: buildHtmlEmail(aSubject, aBody, PORTAL_NAME),
          });
        }
      }
    }

    res.json({ success: true, emailSent: result.ok, notificationId: notifId });
  } catch (e) {
    console.error("send-notification error:", e);
    res.status(400).json({ error: e.message || "Failed to send notification." });
  }
});

// ─── Pre-con worksheet submission (replaces submit-precon-worksheet edge function) ───
app.post("/api/submit-precon-worksheet", async (req, res) => {
  if (!adminClient) return res.status(503).json({ error: "Worksheet submission is not configured on the server." });
  try {
    const caller = await getCallingUser(req);
    if (!caller?.id) return res.status(401).json({ error: "Unauthorized." });

    if (!RESEND_API_KEY) return res.status(400).json({ error: "Email is not configured (missing RESEND_API_KEY)." });
    if (!PRECON_WORKSHEET_ADMIN_EMAIL) return res.status(400).json({ error: "Admin email is not configured." });

    const payload = req.body || {};
    if (!payload.projectName?.trim()) return res.status(400).json({ error: "Project name is required." });
    if (!payload.cooperatingBroker?.brokerageName?.trim()) return res.status(400).json({ error: "Brokerage name is required." });
    if (!payload.idAttachment?.contentBase64) return res.status(400).json({ error: "Client ID attachment is required." });

    const mime = payload.idAttachment.mimeType;
    if (mime !== "image/jpeg" && mime !== "image/png") {
      return res.status(400).json({ error: "Attachment must be JPG or PNG." });
    }

    const purchaser1 = (payload.purchasers && payload.purchasers[0]) || {};
    const subject = `Pre-Con Worksheet: ${payload.projectName}`;
    const agentEmail = payload.cooperatingBroker.agentEmail || caller.email;
    if (!agentEmail) return res.status(400).json({ error: "Agent email missing." });

    const row = (label, value) => {
      const v = value == null || value === "" ? "-" : String(value);
      return `<tr><td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:600;">${label}</td><td style="padding:6px 10px;border:1px solid #e5e7eb;">${v}</td></tr>`;
    };

    const html = `
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#0f172a;">
        <h2 style="margin-bottom:8px;">Pre-Con Worksheet Submission</h2>
        <p style="margin-top:0;">Project: <strong>${payload.projectName}</strong></p>
        <table style="border-collapse:collapse;width:100%;max-width:900px;margin-top:8px;">
          ${row("Project", payload.projectName)}
          ${row("Model", payload.modelName)}
          ${row("Floor type", payload.floorType)}
          ${row("Direction / exposure", payload.directionExposure)}
          ${row("Need parking", payload.needParking ? "Yes" : "No")}
          ${row("Need locker", payload.needLocker ? "Yes" : "No")}
          ${row("Choices", (payload.choices || []).join(", "))}
          ${row("Date", payload.date)}
          ${row("Brokerage", payload.cooperatingBroker.brokerageName)}
          ${row("Agent name", payload.cooperatingBroker.agentName)}
          ${row("Agent email", payload.cooperatingBroker.agentEmail)}
          ${row("Office phone", payload.cooperatingBroker.officePhone)}
          ${row("Cell phone", payload.cooperatingBroker.cellPhone)}
          ${row("RECO #", payload.cooperatingBroker.recoNumber)}
          ${row("Purchaser 1", `${purchaser1.firstName || ""} ${purchaser1.lastName || ""}`.trim())}
          ${row("Purchaser 1 Email", purchaser1.email)}
          ${row("Additional comments", payload.additionalComments)}
        </table>
        <p style="margin-top:12px;">Client ID image is attached to this email.</p>
      </div>`;

    const attachments = [{
      filename: payload.idAttachment.filename || "client-id.png",
      content: payload.idAttachment.contentBase64,
    }];

    const adminSend = await sendResendEmail({
      from: PRECON_WORKSHEET_FROM_EMAIL, to: PRECON_WORKSHEET_ADMIN_EMAIL,
      subject: `${subject} (Admin Copy)`, html, attachments,
    });
    if (!adminSend.ok) return res.status(400).json({ error: `Email send failed: ${adminSend.error}` });

    await sendResendEmail({
      from: PRECON_WORKSHEET_FROM_EMAIL, to: agentEmail,
      subject: `${subject} (Agent Copy)`, html, attachments,
    });

    // Persist submission so it shows in the admin portal (best-effort).
    try {
      await adminClient.from("precon_worksheets").insert({
        agent_id: payload.metadata?.agentId || null,
        project_name: payload.projectName,
        model_name: payload.modelName || null,
        floor_type: payload.floorType || null,
        direction_exposure: payload.directionExposure || null,
        choices: payload.choices || [],
        need_parking: !!payload.needParking,
        need_locker: !!payload.needLocker,
        worksheet_date: payload.date || null,
        additional_comments: payload.additionalComments || null,
        brokerage_name: payload.cooperatingBroker.brokerageName,
        broker_agent_name: payload.cooperatingBroker.agentName || null,
        broker_agent_email: payload.cooperatingBroker.agentEmail || null,
        broker_office_phone: payload.cooperatingBroker.officePhone || null,
        broker_cell_phone: payload.cooperatingBroker.cellPhone || null,
        broker_reco_number: payload.cooperatingBroker.recoNumber || null,
        purchasers: payload.purchasers || [],
        id_attachment_filename: payload.idAttachment.filename || null,
        status: "submitted",
        email_sent: true,
      });

      if (payload.metadata?.agentId) {
        const { data: adminRoles } = await adminClient.from("user_roles").select("user_id").eq("role", "admin");
        for (const r of adminRoles || []) {
          const { data: adminAgent } = await adminClient.from("agents").select("id").eq("user_id", r.user_id).maybeSingle();
          if (adminAgent) {
            await adminClient.from("in_app_notifications").insert({
              agent_id: adminAgent.id,
              title: `New Pre-Con Worksheet: ${payload.projectName}`,
              body: `Submitted by ${payload.cooperatingBroker.agentName || "an agent"}`,
              type: "info",
              link: "/admin/worksheets",
            });
          }
        }
      }
    } catch (dbError) {
      console.error("Failed to persist worksheet:", dbError);
    }

    res.json({ success: true });
  } catch (e) {
    console.error("submit-precon-worksheet error:", e);
    res.status(400).json({ error: e.message || "Worksheet submission failed." });
  }
});

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
