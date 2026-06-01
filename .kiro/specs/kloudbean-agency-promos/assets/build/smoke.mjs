#!/usr/bin/env node
/* =============================================================================
   KloudBean Promo — Smoke check
   -----------------------------------------------------------------------------
   Static guard rails (Node only, no install). For each promo HTML it asserts:
     1. Contains a TIMELINE definition.
     2. Every TIMELINE id has a matching [data-scene="id"] element.
     3. Contains at least one CTA URL string (kloudbean.com).
     4. References the shared engine.js and brand.css.

   Usage:  node build/smoke.mjs
   Exit code is non-zero if any check fails.
   ============================================================================= */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PROMOS_DIR = path.join(ROOT, "promos");

let failures = 0;
let checks = 0;

function check(cond, label, file) {
  checks++;
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.log(`  ✖ ${label}  [${file}]`);
  }
}

function extractTimelineIds(html) {
  // Grab the TIMELINE array text and pull each id: "..."
  const start = html.indexOf("TIMELINE");
  if (start === -1) return null;
  const open = html.indexOf("[", start);
  const close = html.indexOf("]", open);
  if (open === -1 || close === -1) return null;
  const block = html.slice(open, close + 1);
  const ids = [...block.matchAll(/id:\s*["']([^"']+)["']/g)].map((m) => m[1]);
  return ids;
}

async function smokeOne(file) {
  const html = await readFile(path.join(PROMOS_DIR, file), "utf8");
  console.log(`\n${file}`);

  const ids = extractTimelineIds(html);
  check(ids !== null && ids.length > 0, "TIMELINE present with scenes", file);

  if (ids) {
    let allMatched = true;
    for (const id of ids) {
      const has = html.includes(`data-scene="${id}"`);
      if (!has) {
        allMatched = false;
        console.log(`     · missing [data-scene="${id}"]`);
      }
    }
    check(allMatched, `All ${ids.length} timeline ids have a [data-scene] element`, file);
  }

  check(/kloudbean\.com/i.test(html), "Contains a CTA URL (kloudbean.com)", file);
  check(/shared\/engine\.js/.test(html), "References shared/engine.js", file);
  check(/shared\/brand\.css/.test(html), "References shared/brand.css", file);
}

async function main() {
  const files = (await readdir(PROMOS_DIR)).filter((f) => f.endsWith(".html"));
  if (files.length === 0) {
    console.error("No promos found in " + PROMOS_DIR);
    process.exit(1);
  }
  for (const f of files) await smokeOne(f);

  console.log(`\n${"-".repeat(48)}`);
  console.log(`${checks - failures}/${checks} checks passed across ${files.length} promo(s).`);
  if (failures > 0) {
    console.error(`✖ ${failures} check(s) FAILED.`);
    process.exit(1);
  }
  console.log("✓ All smoke checks passed.");
}

main().catch((e) => { console.error(e); process.exit(1); });
