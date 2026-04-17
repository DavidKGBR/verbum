import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

/** Known background presets. "parchment" uses the solid flat BG (default). */
export type ShareBackground = "parchment" | "sunrise" | "scroll" | "stars";

interface Props {
  text: string;
  reference: string;
  translation: string;
  background?: ShareBackground;
}

const SIZE = 1080;
const PAD = 80;
const BORDER_INSET = 40;
const CORNER_LEN = 50;

const BG_COLOR = "#f5f0e8";
const GOLD = "#c4a265";
const GOLD_DARK = "#8b7355";
const INK = "#2c1810";

// Asset paths for non-parchment backgrounds (served from public/)
const BG_SRC: Record<Exclude<ShareBackground, "parchment">, string> = {
  sunrise: "/share-bg/sunrise.svg",
  scroll:  "/share-bg/scroll.svg",
  stars:   "/share-bg/stars.svg",
};

// Verbum logo — replaces the text watermark. currentColor is #c4a265 (gold).
const LOGO_SRC = "/verbum-icon.svg";

/** Load an image and resolve once ready. Safe against race conditions because
 *  each call returns a fresh Image instance — caller just awaits the promise. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Renders a 1080×1080 verse card on a `<canvas>`. The parent can call
 * `getCanvas()` via ref to export the image.
 *
 * When `background` is anything other than "parchment", the corresponding
 * SVG is loaded and drawn full-bleed, then a 55%-parchment overlay keeps
 * text contrast readable.
 */
const VerseCardCanvas = forwardRef<HTMLCanvasElement, Props>(
  function VerseCardCanvas({ text, reference, translation, background = "parchment" }, fwdRef) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useImperativeHandle(fwdRef, () => canvasRef.current!);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = SIZE;
      canvas.height = SIZE;

      // Flag so an async race doesn't overwrite a newer render
      let cancelled = false;

      async function paint() {
        if (!ctx) return;

        // ── Background
        if (background === "parchment") {
          ctx.fillStyle = BG_COLOR;
          ctx.fillRect(0, 0, SIZE, SIZE);
        } else {
          // Load the SVG then tint-overlay for legibility.
          try {
            const img = await loadImage(BG_SRC[background]);
            if (cancelled) return;
            ctx.drawImage(img, 0, 0, SIZE, SIZE);
            // Parchment overlay at ~55% so gold/ink stay readable across all bgs.
            ctx.fillStyle = "rgba(245, 240, 232, 0.55)";
            ctx.fillRect(0, 0, SIZE, SIZE);
          } catch {
            // Network/load failure → fall back to parchment
            ctx.fillStyle = BG_COLOR;
            ctx.fillRect(0, 0, SIZE, SIZE);
          }
        }

        // ── Ornamental border
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1.5;
        const b = BORDER_INSET;
        ctx.strokeRect(b, b, SIZE - b * 2, SIZE - b * 2);

        // Corner accents (L-shapes)
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = GOLD;
        drawCorner(ctx, b, b, CORNER_LEN, 1, 1);
        drawCorner(ctx, SIZE - b, b, CORNER_LEN, -1, 1);
        drawCorner(ctx, b, SIZE - b, CORNER_LEN, 1, -1);
        drawCorner(ctx, SIZE - b, SIZE - b, CORNER_LEN, -1, -1);

        // ── Verse text (centered, word-wrapped)
        const maxWidth = SIZE - PAD * 2;
        const fontSize = text.length > 200 ? 32 : text.length > 120 ? 36 : 40;
        const lineHeight = fontSize * 1.65;

        ctx.fillStyle = INK;
        ctx.font = `400 ${fontSize}px "Cormorant Garamond", serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        const lines = wrapText(ctx, `\u201c${text}\u201d`, maxWidth);
        const totalTextHeight = lines.length * lineHeight;

        // Vertical center: push text slightly above true center
        const textStartY = (SIZE - totalTextHeight) / 2 - 40;

        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], SIZE / 2, textStartY + i * lineHeight);
        }

        // ── Reference
        const refY = textStartY + totalTextHeight + 30;
        ctx.font = `600 22px "Playfair Display", serif`;
        ctx.fillStyle = GOLD;
        ctx.fillText(`— ${reference}`, SIZE / 2, refY);

        // ── Translation badge
        ctx.font = `400 14px system-ui, sans-serif`;
        ctx.fillStyle = GOLD_DARK;
        ctx.globalAlpha = 0.5;
        ctx.fillText(translation.toUpperCase(), SIZE / 2, refY + 34);
        ctx.globalAlpha = 1;

        // ── Verbum logo watermark (replaces the old text "Verbum")
        try {
          const logo = await loadImage(LOGO_SRC);
          if (cancelled) return;
          const logoSize = 56;
          const logoX = SIZE - PAD - logoSize;
          const logoY = SIZE - PAD - logoSize + 14;
          ctx.globalAlpha = 0.45;
          ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
          ctx.globalAlpha = 1;
        } catch {
          // Logo failed to load — silent fallback: no watermark
        }
      }

      void paint();

      return () => {
        cancelled = true;
      };
    }, [text, reference, translation, background]);

    return (
      <canvas
        ref={canvasRef}
        className="max-w-full h-auto rounded shadow-lg"
        style={{ imageRendering: "auto" }}
      />
    );
  }
);

export default VerseCardCanvas;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function drawCorner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  dx: number,
  dy: number
) {
  ctx.beginPath();
  ctx.moveTo(x + dx * len, y);
  ctx.lineTo(x, y);
  ctx.lineTo(x, y + dy * len);
  ctx.stroke();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(test);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Cap at ~12 lines to prevent overflow
  return lines.slice(0, 12);
}
