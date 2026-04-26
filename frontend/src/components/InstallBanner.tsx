import { useState, useEffect } from "react";
import { useI18n } from "../i18n/i18nContext";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "verbum-install-dismissed";

function isIOS() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isInStandaloneMode() {
  return (
    "standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true
  );
}

export default function InstallBanner() {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Never show if already installed or user dismissed before
    if (isInStandaloneMode()) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    if (isIOS()) {
      // Show iOS instructions after a short delay so it doesn't feel jarring
      const t = setTimeout(() => {
        setShowIOSHint(true);
        setVisible(true);
      }, 4000);
      return () => clearTimeout(t);
    }

    // Android / Chrome — intercept native prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  };

  if (!visible) return null;

  return (
    <div
      role="banner"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 md:bottom-4 md:left-auto md:right-4 md:max-w-sm"
    >
      <div
        className="rounded-xl shadow-2xl border border-[var(--color-gold)]/30
                   bg-[var(--color-ink)] text-[var(--color-parchment)] p-4 flex gap-3 items-start"
      >
        {/* Verbum logo mark */}
        <div className="shrink-0 w-10 h-10 rounded-lg bg-[var(--color-gold)]/10 flex items-center justify-center">
          <img src="/pwa-192.png" alt="" className="w-8 h-8 rounded" aria-hidden />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-gold)]">
            {t("install.title")}
          </p>

          {showIOSHint ? (
            <p className="text-xs opacity-70 mt-1 leading-relaxed">
              {t("install.iosHint")}
              {/* Inline share icon */}
              <svg className="inline w-3.5 h-3.5 mx-0.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {t("install.iosHint2")}
            </p>
          ) : (
            <p className="text-xs opacity-70 mt-1">{t("install.androidHint")}</p>
          )}

          {!showIOSHint && (
            <button
              onClick={install}
              className="mt-2 px-3 py-1.5 rounded text-xs font-semibold
                         bg-[var(--color-gold)] text-[var(--color-ink)]
                         hover:brightness-110 active:scale-95 transition"
            >
              {t("install.cta")}
            </button>
          )}
        </div>

        <button
          onClick={dismiss}
          aria-label={t("install.dismiss")}
          className="shrink-0 p-1 -mr-1 -mt-1 rounded hover:bg-white/10 transition"
        >
          <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
