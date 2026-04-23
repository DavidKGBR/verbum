import type { Locale } from "./i18nContext";

interface TribeEntry {
  en: string;
  pt: string;
  es: string;
}

const TRIBE_MAP: Record<string, TribeEntry> = {
  reciI2noa29XOlF3E: { en: "Judah", pt: "Judá", es: "Judá" },
  recuYvXjZsXumRLPL: { en: "Levi", pt: "Levi", es: "Leví" },
  rechHR2dYztVvgNWa: { en: "Patriarchs", pt: "Patriarcas", es: "Patriarcas" },
  rec4hpOWgtnNNXWSJ: { en: "Ephraim / Joseph", pt: "Efraim / José", es: "Efraín / José" },
  recDMQg1nEIjMnZ58: { en: "Benjamin", pt: "Benjamim", es: "Benjamín" },
  recDbqwwwM8CIHQ7b: { en: "Asher", pt: "Aser", es: "Aser" },
  recad5Sz0E9gKbWYe: { en: "Issachar", pt: "Issacar", es: "Isacar" },
  recvnLGddvfa6P9fU: { en: "Simeon", pt: "Simeão", es: "Simeón" },
  recDquhyNAst5bTvn: { en: "Apostles", pt: "Apóstolos", es: "Apóstoles" },
  recwaeE7xPtLQrgEJ: { en: "Reuben", pt: "Rúben", es: "Rubén" },
  reczbTTVKjfGyCOJS: { en: "Cainites", pt: "Cainitas", es: "Cainitas" },
  recLFeuBGwEeYYFWm: { en: "Gad", pt: "Gade", es: "Gad" },
  recvLnTX1XqhvGBx8: { en: "Naphtali", pt: "Naftali", es: "Neftalí" },
  recIkGAnMRfAU1jgS: { en: "Zebulun", pt: "Zebulom", es: "Zabulón" },
  recMcWETuGovYX3t8: { en: "Dan", pt: "Dã", es: "Dan" },
  recBC0I2HaciTQbaa: { en: "Apostles", pt: "Apóstolos", es: "Apóstoles" },
};

export function tribeName(tribeId: string, locale: Locale): string | null {
  const entry = TRIBE_MAP[tribeId];
  if (!entry) return null;
  return entry[locale] || entry.en;
}

export function allTribes(locale: Locale): { id: string; name: string; count?: number }[] {
  return Object.entries(TRIBE_MAP).map(([id, entry]) => ({
    id,
    name: entry[locale] || entry.en,
  }));
}
