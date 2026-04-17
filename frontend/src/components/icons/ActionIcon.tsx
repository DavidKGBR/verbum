/**
 * ActionIcon — line-art SVG icons for per-verse action buttons
 * (cross-refs, explain, commentary, compare, note, save, copy, share).
 *
 * Replaces emoji (🔗🤖📚🔀✍️☆📋🖼️) that mixed with the parchment/gold
 * palette inconsistently and rendered differently per OS. Style is
 * identical to PresetIcon: 24×24 viewBox, stroke 1.75, currentColor.
 *
 * Each stateful action (save / saved, note / note-with, copy / copied)
 * has a "full" variant — consumers switch name based on state.
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
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": props["aria-hidden"] ?? true,
  className: props.className ?? "w-4 h-4",
});

const ICONS: Record<string, IconRenderer> = {
  // 🔗  Cross-references — two interlocked chain links
  link: (props) => (
    <svg {...baseSvgProps(props)}>
      <path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1 1" />
      <path d="M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1-1" />
    </svg>
  ),

  // 🤖  AI explain — sparkles (same silhouette as PresetIcon.sparkles, tuned smaller)
  sparkles: (props) => (
    <svg {...baseSvgProps(props)}>
      <path d="M12 4l1.3 3.7L17 9l-3.7 1.3L12 14l-1.3-3.7L7 9l3.7-1.3L12 4z" />
      <path d="M18 14.5l.7 1.9L20.5 17l-1.8.6L18 19.5l-.7-1.9L15.5 17l1.8-.6.7-1.9z" />
      <path d="M5 16.5l.55 1.5L7 18.6l-1.45.55L5 20.5l-.55-1.35L3 18.6l1.45-.6L5 16.5z" />
    </svg>
  ),

  // 📚  Commentary — open book
  book: (props) => (
    <svg {...baseSvgProps(props)}>
      <path d="M3 5.5A1.5 1.5 0 014.5 4H10a2 2 0 012 2v13a1 1 0 00-1-1H4.5A1.5 1.5 0 013 16.5v-11z" />
      <path d="M21 5.5A1.5 1.5 0 0019.5 4H14a2 2 0 00-2 2v13a1 1 0 011-1h6.5a1.5 1.5 0 001.5-1.5v-11z" />
    </svg>
  ),

  // 🔀  Compare — two opposing arrows (transform / switch)
  compare: (props) => (
    <svg {...baseSvgProps(props)}>
      <path d="M3 7h13l-3-3" />
      <path d="M3 7l3 3" />
      <path d="M21 17H8l3-3" />
      <path d="M21 17l-3 3" />
    </svg>
  ),

  // ✍️  Note (empty) — pencil
  pencil: (props) => (
    <svg {...baseSvgProps(props)}>
      <path d="M15.5 4.5l4 4L8 20H4v-4L15.5 4.5z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  ),

  // ✍️ filled — pencil with a small dot indicating note attached
  "pencil-filled": (props) => (
    <svg {...baseSvgProps(props)}>
      <path d="M15.5 4.5l4 4L8 20H4v-4L15.5 4.5z" />
      <path d="M13.5 6.5l4 4" />
      <circle cx="19" cy="5" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  ),

  // ☆  Save (empty star)
  star: (props) => (
    <svg {...baseSvgProps(props)}>
      <path d="M12 3.8l2.6 5.3 5.8.85-4.2 4.1 1 5.8L12 17.1 6.8 19.85l1-5.8L3.6 9.95l5.8-.85L12 3.8z" />
    </svg>
  ),

  // ★  Saved (filled star)
  "star-filled": (props) => (
    <svg {...baseSvgProps(props)}>
      <path
        d="M12 3.8l2.6 5.3 5.8.85-4.2 4.1 1 5.8L12 17.1 6.8 19.85l1-5.8L3.6 9.95l5.8-.85L12 3.8z"
        fill="currentColor"
      />
    </svg>
  ),

  // 📋  Copy — clipboard with page
  clipboard: (props) => (
    <svg {...baseSvgProps(props)}>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 4v-.5A1.5 1.5 0 0110.5 2h3A1.5 1.5 0 0115 3.5V4" />
    </svg>
  ),

  // ✅  Copied (checkmark)
  check: (props) => (
    <svg {...baseSvgProps(props)}>
      <path d="M4 12.5l5 5 11-12" />
    </svg>
  ),

  // 🖼️  Share — arrow out of a card
  share: (props) => (
    <svg {...baseSvgProps(props)}>
      <path d="M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6" />
      <path d="M12 3v13" />
      <path d="M8 7l4-4 4 4" />
    </svg>
  ),
};

interface ActionIconProps {
  /** Icon name from the registry. Unknown names render a small dot placeholder. */
  name: string;
  /** Optional Tailwind sizing/color classes. Defaults to "w-4 h-4". */
  className?: string;
}

export default function ActionIcon({ name, className }: ActionIconProps) {
  const renderer = ICONS[name];
  if (!renderer) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden
        className={className ?? "w-4 h-4 opacity-40"}
      >
        <circle cx="12" cy="12" r="9" strokeDasharray="2 3" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    );
  }
  return renderer({ className });
}
