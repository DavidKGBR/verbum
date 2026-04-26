// Notify IndexNow (Bing + Yandex) that our pages have changed.
//
// IndexNow is a free protocol that lets us push URL updates instead of
// waiting for crawlers to discover them. Bing acts as the public hub and
// shares the signal with Yandex/Naver. Google does NOT support IndexNow
// and still requires Search Console for freshness.
//
// Usage:
//     node scripts/indexnow-ping.mjs
//
// Reads dist/sitemap.xml, extracts URLs, POSTs them. Idempotent — run after
// every deploy or selectively when content changes. Quota: ~10k URLs/day,
// well above what we'll ever need.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOST = "verbum-app-bible.web.app";
const KEY = "59f84e8f0a182bb7de3fb819f609d8fb";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

function readUrls() {
  const sitemapPath = path.resolve(__dirname, "../dist/sitemap.xml");
  if (!fs.existsSync(sitemapPath)) {
    console.error(`[indexnow] dist/sitemap.xml not found — run \`npm run build\` first.`);
    process.exit(1);
  }
  const xml = fs.readFileSync(sitemapPath, "utf8");
  // Extract <loc>...</loc> entries
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

async function ping() {
  const urlList = readUrls();
  if (urlList.length === 0) {
    console.warn("[indexnow] no URLs found in sitemap; nothing to ping.");
    return;
  }

  const body = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });

  // 200/202 = accepted; 422 = key file mismatch; 429 = throttled
  if (res.status === 200 || res.status === 202) {
    console.log(`[indexnow] ✓ submitted ${urlList.length} URLs to ${ENDPOINT}`);
  } else {
    const text = await res.text().catch(() => "");
    console.error(
      `[indexnow] ✗ HTTP ${res.status} — ${text || "(empty body)"}\n` +
        `[indexnow] verify https://${HOST}/${KEY}.txt is reachable and returns the key.`,
    );
    process.exit(1);
  }
}

ping().catch((err) => {
  console.error("[indexnow] fatal:", err.message ?? err);
  process.exit(1);
});
