import { useRef, useState, useEffect } from "react";
import VerseCardCanvas from "./VerseCardCanvas";

interface Props {
  text: string;
  reference: string;
  translation: string;
  onClose: () => void;
}

export default function ShareModal({
  text,
  reference,
  translation,
  onClose,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `verbum-${reference.replace(/\s+/g, "-").toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }, "image/png");
  }

  async function copyToClipboard() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) return;
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — fallback to download
      downloadPng();
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg shadow-2xl max-w-lg w-full flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="font-display font-bold text-lg">Share Verse</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded hover:bg-gray-100 focus:outline-none
                       focus:ring-2 focus:ring-[var(--color-gold)]/50"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Canvas preview (scaled to fit modal) */}
        <div className="p-5 flex justify-center bg-[var(--color-parchment)]/30">
          <VerseCardCanvas
            ref={canvasRef}
            text={text}
            reference={reference}
            translation={translation}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
          <button
            onClick={copyToClipboard}
            className="text-xs px-3 py-1.5 rounded border hover:bg-gray-100 transition"
          >
            {copied ? "✅ Copied!" : "📋 Copy to clipboard"}
          </button>
          <button
            onClick={downloadPng}
            className="text-xs px-3 py-1.5 rounded bg-[var(--color-gold)]
                       text-white hover:opacity-90 transition"
          >
            Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}
