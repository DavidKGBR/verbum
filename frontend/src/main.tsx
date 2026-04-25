import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import * as Sentry from "@sentry/react";
import { I18nProvider } from "./i18n/i18nContext";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
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

// ── GA4 (optional, gated by VITE_GA4_MEASUREMENT_ID) ─────────────────────────
// Loads gtag.js only if the measurement ID is set. Anonymizes IP and disables
// ad personalization signals — Verbum has no ads and shouldn't feed any.
const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;
if (GA4_ID) {
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

const root = createRoot(document.getElementById("root")!);

if (Boundary) {
  root.render(
    <StrictMode>
      <BrowserRouter>
        <I18nProvider>
          <Boundary />
        </I18nProvider>
      </BrowserRouter>
    </StrictMode>,
  );
} else {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <I18nProvider>
            <App />
          </I18nProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>,
  );
}
