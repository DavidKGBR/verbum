import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    // MDX must run before React so the JSX it emits is transformed.
    {
      enforce: "pre",
      ...mdx({
        remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
        providerImportSource: "@mdx-js/react",
      }),
    },
    react({ include: /\.(jsx|tsx|mdx)$/ }),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["verbum-icon.svg", "apple-touch-icon.png", "og-default.png"],
      manifest: {
        name: "Verbum - Bible Study App",
        short_name: "Verbum",
        description:
          "Free open-source Bible study app. 12 translations, 344K cross-references, interlinear Greek/Hebrew, AI analysis. No paywall, no ads.",
        theme_color: "#2c1810",
        background_color: "#f5f0e8",
        display: "standalone",
        start_url: "/",
        scope: "/",
        lang: "en",
        orientation: "portrait-primary",
        categories: ["education", "lifestyle"],
        icons: [
          {
            src: "/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        shortcuts: [
          {
            name: "Reader",
            short_name: "Reader",
            url: "/reader",
            icons: [{ src: "/pwa-192.png", sizes: "192x192" }],
          },
          {
            name: "Search",
            short_name: "Search",
            url: "/search",
            icons: [{ src: "/pwa-192.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        // Cache shell + static assets aggressively; API calls stay network-first
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            // Google Fonts — cache-first, long TTL
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // API calls — network-first, fallback to cache for offline
            urlPattern: /^https?:\/\/.*\/api\/v1\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 10,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8000",
      "/health": "http://localhost:8000",
      "/audio": "http://localhost:8000",
    },
  },
});
