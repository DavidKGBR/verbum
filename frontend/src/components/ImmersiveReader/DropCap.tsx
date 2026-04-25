interface Props {
  letter: string;
}

export default function DropCap({ letter }: Props) {
  return (
    <span
      className="float-left font-display text-[64px] leading-[0.9] mr-2 mt-1"
      style={{
        color: "var(--color-gold-dark)",
        textShadow: "1px 2px 0 rgba(196, 162, 101, 0.25)",
      }}
    >
      {letter}
    </span>
  );
}
