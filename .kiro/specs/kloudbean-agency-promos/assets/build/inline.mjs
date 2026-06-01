#!/usr/bin/env node
/* =============================================================================
   KloudBean Promo — Single-file inliner
   -----------------------------------------------------------------------------
   Inlines linked shared/*.css and shared/*.js into a promo HTML so the result
   is a fully self-contained file (Requirement 6.1) that runs from file:// with
   no network and no build step.

   Usage:
     node build/inline.mjs promos/flagship-agency-16x9.html
     node build/inline.mjs promos/flagship-agency-16x9.html dist/flagship.html
     node build/inline.mjs --all            # inline every promo into ./dist

   Output defaults to ./dist/<original-name>.html
   ============================================================================= */

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, ".."); // assets/
const PROMOS_DIR = path.join(ROOT, "promos");
const DIST_DIR = path.join(ROOT, "dist");

function fail(msg) {
  console.error("✖ " + msg);
  process.exit(1);
}

async function inlineOne(promoRelPath, outPath) {
  const promoPath = path.resolve(ROOT, promoRelPath);
  if (!existsSync(promoPath)) fail(`Promo not found: ${promoPath}`);

  let html = await readFile(promoPath, "utf8");
  const promoDir = path.dirname(promoPath);

  // 1) Inline <link rel="stylesheet" href="...">
  const linkRe = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  const linkMatches = [...html.matchAll(linkRe)];
  for (const m of linkMatches) {
    const href = m[1];
    if (/^https?:\/\//i.test(href)) continue; // leave remote (none expected)
    const cssPath = path.resolve(promoDir, href);
    if (!existsSync(cssPath)) fail(`Referenced CSS missing: ${cssPath}`);
    const css = await readFile(cssPath, "utf8");
    html = html.replace(m[0], `<style>\n/* inlined: ${href} */\n${css}\n</style>`);
  }

  // 2) Inline <script src="..."></script>
  const scriptRe = /<script[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi;
  const scriptMatches = [...html.matchAll(scriptRe)];
  for (const m of scriptMatches) {
    const src = m[1];
    if (/^https?:\/\//i.test(src)) continue;
    const jsPath = path.resolve(promoDir, src);
    if (!existsSync(jsPath)) fail(`Referenced JS missing: ${jsPath}`);
    const js = await readFile(jsPath, "utf8");
    html = html.replace(m[0], `<script>\n/* inlined: ${src} */\n${js}\n</script>`);
  }

  if (!outPath) {
    outPath = path.join(DIST_DIR, path.basename(promoPath));
  }
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, html, "utf8");
  console.log(`✓ Inlined → ${path.relative(ROOT, outPath)}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    fail("Usage: node build/inline.mjs <promo.html> [out.html]  |  --all");
  }

  if (args[0] === "--all") {
    const files = (await readdir(PROMOS_DIR)).filter((f) => f.endsWith(".html"));
    if (files.length === 0) fail("No promos found in " + PROMOS_DIR);
    for (const f of files) {
      await inlineOne(path.join("promos", f));
    }
    console.log(`\nDone. ${files.length} promo(s) inlined into ./dist`);
    return;
  }

  await inlineOne(args[0], args[1] ? path.resolve(args[1]) : null);
}

main().catch((e) => fail(e.message));
