// Custom prerenderer for static SEO routes.
//
// react-snap is abandoned and ships an ancient Puppeteer that can't parse
// optional chaining. This script uses modern Puppeteer + a tiny static file
// server to render listed routes to dist/<route>/index.html, ready for
// Firebase Hosting.

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "../dist");

const ROUTES = [
  "/",
  "/about",
  "/privacy",
  "/blog",
  "/blog/why-verbum-exists",
  "/blog/sentiment-labels-pt-es",
  "/blog/interlinear-strongs-explained",
  "/blog/built-with-claude",
  "/blog/twelve-translations",
];

const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, BASE);
    const filePath = mapPath(url.pathname);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        // SPA fallback for unknown routes
        fs.readFile(path.join(DIST, "index.html"), (e2, html) => {
          if (e2) {
            res.statusCode = 404;
            res.end("not found");
            return;
          }
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(html);
        });
        return;
      }
      res.setHeader("Content-Type", MIME[path.extname(filePath)] ?? "application/octet-stream");
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

function mapPath(urlPath) {
  // Direct hit on a file under dist
  let target = path.join(DIST, urlPath);
  if (urlPath.endsWith("/")) target = path.join(target, "index.html");
  return target;
}

async function prerender() {
  if (!fs.existsSync(DIST)) {
    console.error(`[prerender] dist/ not found at ${DIST}; run vite build first.`);
    process.exit(1);
  }

  const server = await startServer();
  console.log(`[prerender] static server listening on ${BASE}`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  let success = 0;
  let failed = 0;

  for (const route of ROUTES) {
    const page = await browser.newPage();
    page.on("pageerror", (err) => {
      console.warn(`[prerender] pageerror at ${route}: ${err.message}`);
    });

    try {
      const url = `${BASE}${route}`;
      await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
      // Give Helmet a tick to flush head changes after hydration.
      await page.evaluate(() => new Promise((r) => setTimeout(r, 200)));

      // Helmet appends to <head>, but the static <title> + default <meta>s
      // in index.html stay around. Dedupe per key, keeping the LAST match
      // (Helmet's, which is the one that reflects route state).
      let html = await page.content();
      html = dedupeHeadTags(html);

      const target =
        route === "/"
          ? path.join(DIST, "index.html")
          : path.join(DIST, route, "index.html");
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, html, "utf8");

      console.log(`[prerender] ✓ ${route} -> ${path.relative(DIST, target)}`);
      success++;
    } catch (err) {
      console.error(`[prerender] ✗ ${route}: ${err.message}`);
      failed++;
    } finally {
      await page.close();
    }
  }

  await browser.close();
  await new Promise((r) => server.close(r));
  console.log(`[prerender] done — ${success} ok, ${failed} failed`);

  if (failed > 0) process.exit(1);
}

function dedupeHeadTags(html) {
  const headMatch = html.match(/<head>([\s\S]*?)<\/head>/i);
  if (!headMatch) return html;
  let head = headMatch[1];

  // Collect all dedupable tags with their positions, then keep the LAST
  // occurrence of each key. Tags managed by react-helmet-async (Helmet emits
  // them after index.html's static head) win; the original index.html title /
  // og:* / canonical get stripped.
  const positions = [];

  // <title>...</title>
  for (const m of head.matchAll(/<title[^>]*>[\s\S]*?<\/title>/gi)) {
    positions.push({ start: m.index, end: m.index + m[0].length, raw: m[0], key: "title" });
  }
  // self-closing <meta ...>
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const t = m[0];
    const name = /\bname\s*=\s*"([^"]+)"/i.exec(t)?.[1];
    const prop = /\bproperty\s*=\s*"([^"]+)"/i.exec(t)?.[1];
    let key = null;
    if (name) key = `meta:name:${name}`;
    else if (prop) key = `meta:property:${prop}`;
    if (key) {
      positions.push({ start: m.index, end: m.index + t.length, raw: t, key });
    }
  }
  // <link rel="canonical" ...>
  for (const m of head.matchAll(/<link\b[^>]*>/gi)) {
    const t = m[0];
    const rel = /\brel\s*=\s*"([^"]+)"/i.exec(t)?.[1];
    if (rel && rel.toLowerCase() === "canonical") {
      positions.push({ start: m.index, end: m.index + t.length, raw: t, key: "link:canonical" });
    }
  }

  positions.sort((a, b) => a.start - b.start);

  // Helmet treats <title> specially (mutates the element directly, so it
  // ends up FIRST in DOM), but inserts NEW <meta>/<link> elements after the
  // static defaults (so Helmet's are LAST). Pick winner accordingly.
  const byKey = new Map();
  for (const p of positions) {
    if (p.key === "title") {
      // First occurrence wins
      if (!byKey.has(p.key)) byKey.set(p.key, p);
    } else {
      // Last occurrence wins
      byKey.set(p.key, p);
    }
  }
  const keepSet = new Set([...byKey.values()]);

  // Rebuild head: emit each char unless it's inside a tag we're dropping
  let out = "";
  let cursor = 0;
  for (const p of positions) {
    out += head.slice(cursor, p.start);
    if (keepSet.has(p)) out += p.raw;
    cursor = p.end;
  }
  out += head.slice(cursor);

  return html.replace(headMatch[0], `<head>${out}</head>`);
}

prerender().catch((err) => {
  console.error("[prerender] fatal:", err);
  process.exit(1);
});
