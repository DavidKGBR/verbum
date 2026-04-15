import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import BibleReader from "../components/BibleReader";
import ParallelView from "../components/ParallelView";
import ImmersiveReader from "../components/ImmersiveReader/ImmersiveReader";
import InterlinearView from "../components/reader/InterlinearView";
import StructuralView from "../components/structure/StructuralView";
import { useI18n } from "../i18n/i18nContext";

type Mode = "single" | "parallel" | "immersive" | "interlinear" | "structural";

const MODE_KEYS: { key: Mode; i18nKey: string }[] = [
  { key: "single",      i18nKey: "reader.single" },
  { key: "parallel",    i18nKey: "reader.parallel" },
  { key: "immersive",   i18nKey: "reader.immersive" },
  { key: "interlinear", i18nKey: "reader.interlinear" },
  { key: "structural",  i18nKey: "reader.structural" },
];

export default function ReaderPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();

  // URL params: ?mode=structural&book=MAT&chapter=6
  const urlMode = searchParams.get("mode") as Mode | null;
  const urlBook = searchParams.get("book") ?? "MAT";
  const urlChapter = parseInt(searchParams.get("chapter") ?? "1", 10);

  const [mode, setMode] = useState<Mode>(
    urlMode && MODE_KEYS.some((m) => m.key === urlMode) ? urlMode : "single"
  );

  return (
    <div>
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <h2 className="page-title text-2xl">{t("reader.title")}</h2>
        <div className="flex rounded overflow-hidden border">
          {MODE_KEYS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-4 py-1.5 text-sm transition ${
                mode === m.key
                  ? "bg-[var(--color-ink)] text-[var(--color-parchment)]"
                  : "bg-white hover:bg-gray-50"
              }`}
              title={
                m.key === "structural"
                  ? "Visualize quiasmos e paralelismos literários"
                  : undefined
              }
            >
              {t(m.i18nKey)}
            </button>
          ))}
        </div>
      </div>

      {mode === "single"      && <BibleReader />}
      {mode === "parallel"    && <ParallelView />}
      {mode === "immersive"   && <ImmersiveReader />}
      {mode === "interlinear" && <InterlinearView />}
      {mode === "structural"  && (
        <StructuralView
          book={urlBook}
          chapter={urlChapter}
          translation="kjv"
        />
      )}
    </div>
  );
}
