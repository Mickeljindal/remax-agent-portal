// Production static server for the React SPA build (dist/).
// KloudBean Node single-process runs this file as the entry point.
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, "dist");

if (!fs.existsSync(DIST)) {
  console.error(
    "[server] dist/ folder not found. Make sure the Build Command 'npm run build' ran before start."
  );
}

// Serve built static assets with long cache for hashed files
app.use(
  express.static(DIST, {
    maxAge: "1h",
    setHeaders: (res, filePath) => {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  })
);

// SPA fallback — send index.html for any non-asset route
app.get("*", (_req, res) => {
  res.sendFile(path.join(DIST, "index.html"));
});

app.listen(PORT, () => {
  console.log(`[server] RE/MAX Agent Portal frontend running on port ${PORT}`);
});
