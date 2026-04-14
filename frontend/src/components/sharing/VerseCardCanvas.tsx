import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

interface Props {
  text: string;
  reference: string;
  translation: string;
}

const SIZE = 1080;
const PAD = 80;
const BORDER_INSET = 40;
const CORNER_LEN = 50;

const BG_COLOR = "#f5f0e8";
const GOLD = "#c4a265";
const GOLD_DARK = "#8b7355";
const INK = "#2c1810";

/**
 * Renders a 1080×1080 verse card on a `<canvas>`. The parent can call
 * `getCanvas()` via ref to export the image.
 */
const VerseCardCanvas = forwardRef<HTMLCanvasElement, Props>(
  function VerseCardCanvas({ text, reference, translation }, fwdRef) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useImperativeHandle(fwdRef, () => canvasRef.current!);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = SIZE;
      canvas.height = SIZE;

      // ── Background
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, SIZE, SIZE);

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

      // ── Watermark
      ctx.font = `600 13px "Playfair Display", serif`;
      ctx.fillStyle = GOLD_DARK;
      ctx.globalAlpha = 0.25;
      ctx.textAlign = "right";
      ctx.fillText("Verbum", SIZE - PAD, SIZE - PAD + 10);
      ctx.globalAlpha = 1;
    }, [text, reference, translation]);

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
