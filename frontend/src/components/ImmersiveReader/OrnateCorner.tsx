interface Props {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

export default function OrnateCorner({ position }: Props) {
  const transforms: Record<string, string> = {
    "top-left": "",
    "top-right": "scale(-1, 1)",
    "bottom-left": "scale(1, -1)",
    "bottom-right": "scale(-1, -1)",
  };

  const positions: Record<string, string> = {
    "top-left": "top-3 left-3",
    "top-right": "top-3 right-3",
    "bottom-left": "bottom-3 left-3",
    "bottom-right": "bottom-3 right-3",
  };

  return (
    <svg
      className={`absolute ${positions[position]} w-10 h-10 opacity-60 pointer-events-none`}
      viewBox="0 0 100 100"
      fill="none"
      style={{ transform: transforms[position] }}
    >
      <path
        d="M5 5 Q5 50 50 50 Q50 5 95 5"
        stroke="var(--color-gold-dark)"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M5 5 Q25 25 25 50"
        stroke="var(--color-gold-dark)"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M5 5 Q25 5 50 25"
        stroke="var(--color-gold-dark)"
        strokeWidth="1.5"
        fill="none"
      />
      <circle cx="5" cy="5" r="3" fill="var(--color-gold-dark)" />
      <circle cx="25" cy="25" r="1.5" fill="var(--color-gold-dark)" opacity="0.6" />
    </svg>
  );
}
