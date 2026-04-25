/**
 * PresetIcon — line-art SVG icons for Semantic Explorer presets and similar
 * domain-data cards.
 *
 * Replaces the emoji icons used in earlier versions (❤️📜✨🙏🌅📖🕊️⚖️) with
 * design-system-aligned outline icons. Style: 24×24 viewBox, stroke-based,
 * stroke-width 1.5, currentColor — inherits the parent's `text-` color so the
 * icon adapts to the gold/ink palette automatically.
 *
 * Add new icons by extending the `ICONS` map. Unknown names render the
 * `default` placeholder (a small dot inside a circle) instead of throwing —
 * the UI degrades gracefully if a JSON references a non-existent icon.
 */

import type { ReactElement } from "react";

interface IconProps {
  className?: string;
  "aria-hidden"?: boolean;
}

type IconRenderer = (props: IconProps) => ReactElement;

const baseSvgProps = (props: IconProps) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": props["aria-hidden"] ?? true,
  className: props.className ?? "w-6 h-6",
});

const ICONS: Record<string, IconRenderer> = {
  heart: (props) => (
    <svg {...baseSvgProps(props)}>
      <path d="M12 21s-7-4.5-9.5-9C0.8 8.5 2.5 4 6.5 4c2 0 3.5 1.2 5.5 3.5C13.5 5.2 15 4 17.5 4 21.5 4 23.2 8.5 21.5 12c-2.5 4.5-9.5 9-9.5 9z" />
    </svg>
  ),
  scroll: (props) => (
    <svg {...baseSvgProps(props)}>
      <path d="M5 4h11a3 3 0 013 3v10a3 3 0 01-3 3H7" />
      <path d="M5 4a2 2 0 00-2 2v12a2 2 0 002 2" />
      <path d="M19 7a3 3 0 003-3" />
      <path d="M8 9h7M8 13h7" />
    </svg>
  ),
  sparkles: (props) => (
    <svg {...baseSvgProps(props)}>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M19 14l.7 2.1L22 17l-2.3.7-.7 2.1-.7-2.1L16 17l2.3-.9.7-2.1z" />
      <path d="M5 16l.6 1.7L7 18.5l-1.4.5L5 21l-.6-2-1.4-.5L4.4 17.7 5 16z" />
    </svg>
  ),
  "praying-hands": (props) => (
    <svg {...baseSvgProps(props)}>
      <path d="M9 21V11l-2-3a2 2 0 010-2.5l1-1.2a1.5 1.5 0 012.4.4L12 9" />
      <path d="M15 21V11l2-3a2 2 0 000-2.5l-1-1.2a1.5 1.5 0 00-2.4.4L12 9" />
      <path d="M12 9v12" />
      <path d="M7 21h10" />
    </svg>
  ),
  sunrise: (props) => (
    <svg {...baseSvgProps(props)}>
      <path d="M5 18h14" />
      <path d="M12 9v.01M12 4v3" />
      <path d="M5.5 10.5l1.5 1.5M18.5 10.5L17 12" />
      <path d="M3 14h2M19 14h2" />
      <path d="M8 18a4 4 0 018 0" />
      <path d="M2 21h20" />
    </svg>
  ),
  "book-open": (props) => (
    <svg {...baseSvgProps(props)}>
      <path d="M3 5.5A1.5 1.5 0 014.5 4H10a2 2 0 012 2v13a1 1 0 00-1-1H4.5A1.5 1.5 0 013 16.5v-11z" />
      <path d="M21 5.5A1.5 1.5 0 0019.5 4H14a2 2 0 00-2 2v13a1 1 0 011-1h6.5a1.5 1.5 0 001.5-1.5v-11z" />
    </svg>
  ),
  dove: (props) => (
    <svg {...baseSvgProps(props)}>
      <path d="M3 14c0-3 2-5 5-5 1 0 2 .3 3 1l3-3 4 1-1 4-3 3v3h-3l-2 3c-3 0-6-2-6-6z" />
      <path d="M14 8l1.5-2" />
      <path d="M16 6l1-3" />
    </svg>
  ),
  scales: (props) => (
    <svg {...baseSvgProps(props)}>
      <path d="M12 4v16" />
      <path d="M8 20h8" />
      <path d="M5 7h14" />
      <path d="M9 7l-3 6a3 3 0 006 0L9 7z" />
      <path d="M15 7l-3 6a3 3 0 006 0L15 7z" />
    </svg>
  ),
};

interface PresetIconProps {
  /** Icon name from the icon map (e.g. "heart", "scroll"). */
  name: string;
  /** Optional Tailwind classes; defaults to "w-6 h-6". */
  className?: string;
}

/**
 * Renders a line-art SVG icon by semantic name.
 * Returns a small placeholder if `name` is not in the registry.
 */
export default function PresetIcon({ name, className }: PresetIconProps) {
  const renderer = ICONS[name];
  if (!renderer) {
    // Graceful fallback — small dotted circle, no crash
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden
        className={className ?? "w-6 h-6 opacity-40"}
      >
        <circle cx="12" cy="12" r="9" strokeDasharray="2 3" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    );
  }
  return renderer({ className });
}
