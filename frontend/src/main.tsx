import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import * as Sentry from "@sentry/react";
import { I18nProvider } from "./i18n/i18nContext";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { getConsent, onConsentChange } from "./lib/consent";
import "./index.css";

// ── Sentry (optional, gated by VITE_SENTRY_DSN) ─────────────────────────────
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.05,         // 5% of pageloads get a perf trace
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_VERBUM_RELEASE ?? "verbum-frontend@2.0.0",
    sendDefaultPii: false,           // never capture URLs with PII / cookies
  });
}

// ── GA4 (optional, gated by VITE_GA4_MEASUREMENT_ID + LGPD consent) ─────────
// Loads gtag.js only if (a) the measurement ID is set AND (b) the user
// has explicitly granted analytics consent. Anonymizes IP and disables
// ad personalization signals — Verbum has no ads and shouldn't feed any.
const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;
let ga4Loaded = false;
function bootGA4() {
  if (ga4Loaded || !GA4_ID) return;
  ga4Loaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
  document.head.appendChild(s);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  w.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer.push(arguments);
  };
  w.gtag("js", new Date());
  w.gtag("config", GA4_ID, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
}
if (getConsent() === "granted") {
  bootGA4();
} else {
  // Boot lazily once the user grants consent (banner sets it).
  onConsentChange((status) => {
    if (status === "granted") bootGA4();
  });
}

// Pick the most-protective boundary available: Sentry's wraps + reports;
// our own renders the friendly fallback. They compose cleanly.
const Boundary = SENTRY_DSN
  ? Sentry.withErrorBoundary(App, { fallback: <FallbackUI /> })
  : null;

function FallbackUI() {
  return (
    <ErrorBoundary>
      <div />
    </ErrorBoundary>
  );
}

// react-snap renders static HTML at build time; on first paint we hydrate that
// markup instead of throwing it away. Plain dev/prod (empty #root) falls back
// to createRoot.
const rootEl = document.getElementById("root")!;
const tree = (
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <I18nProvider>
          {Boundary ? (
            <Boundary />
          ) : (
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          )}
        </I18nProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);

if (rootEl.hasChildNodes()) {
  hydrateRoot(rootEl, tree);
} else {
  createRoot(rootEl).render(tree);
}
