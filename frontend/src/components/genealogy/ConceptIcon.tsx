/**
 * ConceptIcon — renders a dedicated SVG icon per genealogy concept.
 * Replaces the Unicode glyphs in data (♡, ☮, ⚖, 🌬, etc.) which render
 * inconsistently across fonts and platforms.
 */

import type { CSSProperties } from "react";

interface Props {
  id: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

const STROKE = "currentColor";

export default function ConceptIcon({ id, size = 28, className, style }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: STROKE,
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    style,
  };

  switch (id) {
    case "chesed": // love / heart
      return (
        <svg {...common}>
          <path d="M12 20.5s-7-4.3-9-9.2C1.6 7.9 3.9 4.5 7.3 4.5c1.9 0 3.5 1 4.7 2.4 1.2-1.4 2.8-2.4 4.7-2.4 3.4 0 5.7 3.4 4.3 6.8-2 4.9-9 9.2-9 9.2z" />
        </svg>
      );
    case "shalom": // peace
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v18M12 12l-7 5M12 12l7 5" />
        </svg>
      );
    case "emet": // truth / scales
      return (
        <svg {...common}>
          <path d="M12 3v18" />
          <path d="M5 21h14" />
          <path d="M6 6h12" />
          <path d="M6 6l-3 7a4 4 0 0 0 6 0z" />
          <path d="M18 6l-3 7a4 4 0 0 0 6 0z" />
        </svg>
      );
    case "ruach-pneuma": // spirit / wind
      return (
        <svg {...common}>
          <path d="M3 8h11a3 3 0 1 0-3-3" />
          <path d="M3 12h15a3 3 0 1 1-3 3" />
          <path d="M3 16h9a3 3 0 1 1-3 3" />
        </svg>
      );
    case "kabowd-doxa": // glory / star-burst
      return (
        <svg {...common}>
          <path d="M12 2v6M12 16v6M2 12h6M16 12h6" />
          <path d="M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "tsedaqah": // righteousness / flag
      return (
        <svg {...common}>
          <path d="M5 21V3" />
          <path d="M5 4h12l-3 4 3 4H5" />
        </svg>
      );
    case "emunah-pistis": // faith / anchor
      return (
        <svg {...common}>
          <circle cx="12" cy="5" r="2.5" />
          <path d="M12 7.5V21" />
          <path d="M7 12h10" />
          <path d="M4 14a8 8 0 0 0 16 0" />
        </svg>
      );
    case "mashiach-christos": // messiah / cross
      return (
        <svg {...common}>
          <path d="M12 3v18" />
          <path d="M6 9h12" />
        </svg>
      );
    case "dabar-logos": // word / speech bubble with lambda (λ)
      return (
        <svg {...common}>
          <path d="M21 11a8 8 0 0 1-11.4 7.3L3 20l1.7-5.6A8 8 0 1 1 21 11z" />
          <path d="M10 7L15 16" />
          <path d="M12.5 11.5L8.5 16" />
        </svg>
      );
    case "teshuvah-metanoia": // repentance / return
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v4h4" />
        </svg>
      );
    default:
      // Fallback: empty circle so layout stays consistent if a new concept appears.
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}
