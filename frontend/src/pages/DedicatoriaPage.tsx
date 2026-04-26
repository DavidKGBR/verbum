import { useI18n } from "../i18n/i18nContext";

export default function DedicatoriaPage() {
  const { locale } = useI18n();
  const c = CONTENT[locale] ?? CONTENT.pt;

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      {/* Ornament */}
      <div className="flex items-center justify-center gap-4 mb-12 opacity-30">
        <div className="w-16 h-px bg-[var(--color-gold-dark)]" />
        <svg className="w-4 h-4 text-[var(--color-gold-dark)]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61z" />
        </svg>
        <div className="w-16 h-px bg-[var(--color-gold-dark)]" />
      </div>

      {/* Label */}
      <p className="text-[10px] tracking-[0.4em] uppercase opacity-40 mb-10 font-display">
        {c.label}
      </p>

      {/* Main dedication */}
      <p
        className="font-display text-2xl sm:text-3xl leading-relaxed mb-10"
        style={{ color: "var(--color-gold)" }}
      >
        {c.main}
      </p>

      {/* Paragraph */}
      <p className="text-sm leading-loose opacity-70 mb-8 font-body">
        {c.body}
      </p>

      {/* Secondary */}
      {c.secondary && (
        <p className="text-sm leading-loose opacity-50 mb-8 font-body italic">
          {c.secondary}
        </p>
      )}

      {/* Scripture anchor */}
      <blockquote
        className="mt-10 mx-auto max-w-xs text-sm italic leading-relaxed opacity-60 font-body
                   border-l-2 border-[var(--color-gold)]/40 pl-4 text-left"
      >
        {c.verse}
        <footer className="text-[11px] not-italic mt-2 opacity-70">{c.verseRef}</footer>
      </blockquote>

      {/* Closing ornament */}
      <div className="flex items-center justify-center gap-4 mt-16 opacity-20">
        <div className="w-10 h-px bg-[var(--color-gold-dark)]" />
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold-dark)]" />
        <div className="w-10 h-px bg-[var(--color-gold-dark)]" />
      </div>

      <p className="mt-6 text-[11px] opacity-30 tracking-widest font-display">
        Soli Deo Gloria
      </p>
    </div>
  );
}

interface DedicContent {
  label: string;
  main: string;
  body: string;
  secondary?: string;
  verse: string;
  verseRef: string;
}

const CONTENT: Record<string, DedicContent> = {
  pt: {
    label: "Dedicatória",
    main: "Para quem ainda não tem acesso.",
    body:
      "Este projeto nasceu da crença de que nenhuma barreira financeira deveria separar alguém das ferramentas para estudar as Escrituras. Para o pastor do interior sem recursos para softwares acadêmicos. Para o estudante que pesquisa com dados móveis limitados. Para o leitor curioso que nunca ouviu falar de Strong's ou interlinear.",
    secondary:
      "E para minha família, que suportou pacientemente as madrugadas em frente ao monitor.",
    verse:
      "\"No princípio era o Verbo, e o Verbo estava com Deus, e o Verbo era Deus.\"",
    verseRef: "João 1:1",
  },
  en: {
    label: "Dedication",
    main: "For those who still don't have access.",
    body:
      "This project was born from the belief that no financial barrier should separate anyone from the tools to study Scripture. For the pastor in a small town with no budget for academic software. For the student researching on limited mobile data. For the curious reader who has never heard of Strong's numbers or interlinear texts.",
    secondary:
      "And for my family, who patiently endured the late nights in front of the monitor.",
    verse: "\"In the beginning was the Word, and the Word was with God, and the Word was God.\"",
    verseRef: "John 1:1",
  },
  es: {
    label: "Dedicatoria",
    main: "Para quienes aún no tienen acceso.",
    body:
      "Este proyecto nació de la convicción de que ninguna barrera económica debería separar a nadie de las herramientas para estudiar las Escrituras. Para el pastor del interior sin recursos para software académico. Para el estudiante que investiga con datos móviles limitados. Para el lector curioso que nunca oyó hablar de Strong's o de textos interlineales.",
    secondary:
      "Y para mi familia, que soportó con paciencia las madrugadas frente al monitor.",
    verse:
      "\"En el principio era el Verbo, y el Verbo era con Dios, y el Verbo era Dios.\"",
    verseRef: "Juan 1:1",
  },
};
