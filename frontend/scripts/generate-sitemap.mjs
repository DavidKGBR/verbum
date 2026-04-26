// Generate frontend/public/sitemap.xml at build time.
//
// SEO discovery surface: high-priority static pages (Home, About, Privacy,
// Blog index/posts) get priority 0.9-1.0, the dynamic data-viz routes get
// 0.6-0.7. Dynamic param routes (/word-study/:strongs, /genealogy/:concept)
// are intentionally excluded — they expand to millions of URLs and overwhelm
// the crawl budget. Crawlers find them organically through internal links.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_URL = "https://verbum-app-bible.web.app";
const TODAY = new Date().toISOString().split("T")[0];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "src/blog/posts");
const PUBLIC_DIR = path.join(ROOT, "public");

// Static / high-SEO-value pages
const PAGES = [
  { path: "/",           changefreq: "daily",   priority: 1.0 },
  { path: "/about",      changefreq: "monthly", priority: 0.9 },
  { path: "/blog",       changefreq: "weekly",  priority: 0.9 },
  { path: "/reader",     changefreq: "weekly",  priority: 0.8 },
  { path: "/search",     changefreq: "weekly",  priority: 0.7 },
  { path: "/dictionary", changefreq: "weekly",  priority: 0.7 },
  { path: "/map",        changefreq: "monthly", priority: 0.7 },
  { path: "/timeline",   changefreq: "monthly", priority: 0.7 },
  { path: "/emotional",  changefreq: "monthly", priority: 0.7 },
  { path: "/topics",     changefreq: "monthly", priority: 0.7 },
  { path: "/people",     changefreq: "monthly", priority: 0.7 },
  { path: "/places",     changefreq: "monthly", priority: 0.7 },
  { path: "/authors",    changefreq: "monthly", priority: 0.7 },
  { path: "/compare",    changefreq: "monthly", priority: 0.6 },
  { path: "/connections", changefreq: "monthly", priority: 0.6 },
  { path: "/concepts",   changefreq: "monthly", priority: 0.6 },
  { path: "/structure",  changefreq: "monthly", priority: 0.6 },
  { path: "/devotional", changefreq: "monthly", priority: 0.6 },
  { path: "/community",  changefreq: "monthly", priority: 0.5 },
  { path: "/open-questions", changefreq: "monthly", priority: 0.5 },
  { path: "/deep-analytics", changefreq: "monthly", priority: 0.5 },
  { path: "/special-passages", changefreq: "monthly", priority: 0.5 },
  { path: "/translation-divergence", changefreq: "monthly", priority: 0.5 },
  { path: "/plans",      changefreq: "monthly", priority: 0.4 },
  { path: "/privacy",    changefreq: "yearly",  priority: 0.3 },
];

// Pull blog post slugs from frontmatter
function readBlogSlugs() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => {
      const content = fs.readFileSync(path.join(POSTS_DIR, f), "utf8");
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (!match) return null;
      const slugMatch = match[1].match(/^slug:\s*(\S+)/m);
      const dateMatch = match[1].match(/^date:\s*(\S+)/m);
      return slugMatch
        ? { slug: slugMatch[1], date: dateMatch?.[1] ?? TODAY }
        : null;
    })
    .filter(Boolean);
}

const blogPages = readBlogSlugs().map(({ slug, date }) => ({
  path: `/blog/${slug}`,
  lastmod: date,
  changefreq: "monthly",
  priority: 0.8,
}));

const allPages = [...PAGES, ...blogPages];

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  allPages
    .map(
      (p) =>
        `  <url>\n` +
        `    <loc>${SITE_URL}${p.path}</loc>\n` +
        `    <lastmod>${p.lastmod ?? TODAY}</lastmod>\n` +
        `    <changefreq>${p.changefreq}</changefreq>\n` +
        `    <priority>${p.priority.toFixed(1)}</priority>\n` +
        `  </url>`,
    )
    .join("\n") +
  `\n</urlset>\n`;

fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.writeFileSync(path.join(PUBLIC_DIR, "sitemap.xml"), xml, "utf8");
console.log(
  `[sitemap] wrote ${allPages.length} URLs to public/sitemap.xml (${blogPages.length} blog posts)`,
);
