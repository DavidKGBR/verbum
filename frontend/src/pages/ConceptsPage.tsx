import { useSearchParams } from "react-router-dom";
import ThreadsPage from "./ThreadsPage";
import GenealogyPage from "./GenealogyPage";
import { useI18n } from "../i18n/i18nContext";

const TABS = ["threads", "genealogy"] as const;
type Tab = (typeof TABS)[number];

function isTab(v: string | null): v is Tab {
  return v != null && (TABS as readonly string[]).includes(v);
}

export default function ConceptsPage() {
  const [params, setParams] = useSearchParams();
  const { t } = useI18n();
  const raw = params.get("tab");
  const active: Tab = isTab(raw) ? raw : "threads";

  const setTab = (tab: Tab) => {
    const next = new URLSearchParams(params);
    next.set("tab", tab);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label={t("nav.concepts")} className="flex gap-1 border-b border-white/10">
        {TABS.map((tab) => {
          const selected = active === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
                selected
                  ? "border-[var(--color-gold)] text-[var(--color-gold)]"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              {t(`concepts.tab.${tab}`)}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">
        {active === "threads" && <ThreadsPage />}
        {active === "genealogy" && <GenealogyPage />}
      </div>
    </div>
  );
}
