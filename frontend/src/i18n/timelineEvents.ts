/**
 * timelineEvents.ts — translations for biblical timeline events.
 *
 * Three layers:
 *   1. `ERA_KEYS` — i18n keys for the six canonical eras (Patriarchs, Exodus
 *      & Conquest, Monarchy, Exile & Return, Intertestamental, New Testament).
 *   2. `SPECIFIC_EVENTS` — top ~120 canonical narrative events keyed by the
 *      Airtable `rec*` event_id (Creation, The Fall, Exodus, Jesus' Passion,
 *      Paul's missionary journeys, etc.). Covers everything the default
 *      timeline view (top 60 by sort_key) renders, plus a healthy buffer.
 *   3. `PATTERN_TEMPLATES` — "Birth of X" / "Death of X" / "Lifetime of X" /
 *      "Reign of X" translations that compose with `personName(slug, locale)`
 *      so we don't duplicate 164 per-person entries for lifetime events.
 *
 * Fallback: anything that can't be resolved falls back to the original EN
 * title from the API.
 */

import type { Locale } from "./i18nContext";
import { PERSONS, personName } from "./personNames";

// ─── Era translations ────────────────────────────────────────────────────────

export const ERA_KEYS: Record<string, { pt: string; es: string; en?: string }> = {
  patriarchs: { pt: "Patriarcas", es: "Patriarcas", en: "Patriarchs" },
  exodus: { pt: "Êxodo e Conquista", es: "Éxodo y Conquista", en: "Exodus & Conquest" },
  "exodus & conquest": { pt: "Êxodo e Conquista", es: "Éxodo y Conquista", en: "Exodus & Conquest" },
  monarchy: { pt: "Monarquia", es: "Monarquía", en: "Monarchy" },
  exile: { pt: "Exílio e Retorno", es: "Exilio y Retorno", en: "Exile & Return" },
  "exile & return": { pt: "Exílio e Retorno", es: "Exilio y Retorno", en: "Exile & Return" },
  intertestamental: { pt: "Intertestamentário", es: "Intertestamentario", en: "Intertestamental" },
  nt: { pt: "Novo Testamento", es: "Nuevo Testamento", en: "New Testament" },
  "new testament": { pt: "Novo Testamento", es: "Nuevo Testamento", en: "New Testament" },
};

export function eraName(eraId: string | null | undefined, locale: Locale, fallback?: string): string {
  if (!eraId) return fallback ?? "";
  const key = eraId.trim().toLowerCase();
  const entry = ERA_KEYS[key];
  if (!entry) return fallback ?? eraId;
  if (locale === "en") return entry.en ?? fallback ?? eraId;
  if (locale === "pt") return entry.pt;
  if (locale === "es") return entry.es;
  return fallback ?? eraId;
}

// ─── Specific event translations (keyed by event_id) ─────────────────────────

const SPECIFIC_EVENTS: Record<string, { pt: string; es: string }> = {
  // Patriarchs / Primeval
  recOIPcFaPCjMpQ6w: { pt: "Criação de todas as coisas", es: "Creación de todas las cosas" },
  recTU3ZxG7zQ61N9d: { pt: "Criação de Adão e Eva", es: "Creación de Adán y Eva" },
  recj3SioaPwrDtpGT: { pt: "A Queda", es: "La Caída" },
  recrEQsBlZOgXbLiB: { pt: "Caim mata Abel", es: "Caín mata a Abel" },
  recl4Bcpg9yzJsEqI: { pt: "Deus amaldiçoa Caim", es: "Dios maldice a Caín" },
  recg9ZkB8FoyQTH8v: { pt: "Enoque é arrebatado", es: "Enoc es arrebatado" },
  rec1n3lFKpydGhoQL: { pt: "Deus decide destruir tudo o que tem vida", es: "Dios decide destruir toda criatura viviente" },
  recZcXNIkXx2zXaW3: { pt: "Deus instrui Noé a construir a arca", es: "Dios instruye a Noé a construir el arca" },
  recmLyx1yqtuANkqd: { pt: "O Grande Dilúvio começa", es: "El Gran Diluvio comienza" },
  recwQJTWTmTkUMHHp: { pt: "O Grande Dilúvio", es: "El Gran Diluvio" },
  recMNRtVxdTnlGYoJ: { pt: "As águas cobrem a terra", es: "Las aguas cubren la tierra" },
  rec1P4d8N4XdXzH2l: { pt: "O dilúvio diminui", es: "El diluvio disminuye" },
  recnAzV0utz4k20eC: { pt: "Saída da Arca", es: "Salida del Arca" },
  recUsWq7FcQB7vaMa: { pt: "Deus faz aliança com Noé", es: "Dios hace un pacto con Noé" },
  recgz06wNQlsq6kOc: { pt: "Noé se embriaga e Canaã é amaldiçoado", es: "Noé se embriaga y Canaán es maldecido" },
  recy4o2BxavybTuX6: { pt: "Torre de Babel", es: "Torre de Babel" },
  rechJv1ksZ00ye38i: { pt: "Abraão entra em Canaã", es: "Abraham entra en Canaán" },
  rec2pnFsObyEoOfGQ: { pt: "Aliança Abraâmica", es: "Pacto Abrahámico" },
  recbqTND1uSdqNjOx: { pt: "Abraão vai ao Egito", es: "Abraham va a Egipto" },
  recc78JIsfuTy7cNu: { pt: "Peregrinação em Canaã e Egito", es: "Peregrinaje en Canaán y Egipto" },
  recG5DZ6bn0BDuYH9: { pt: "Abraão e Ló se separam", es: "Abraham y Lot se separan" },
  recITDSS0o4dApwQg: { pt: "Sodoma destruída", es: "Sodoma destruida" },
  recSDGDMwUBAMUgur: { pt: "Isaque se casa com Rebeca", es: "Isaac se casa con Rebeca" },
  recmnGiHVM3Hylr7r: { pt: "O reino de Nimrode começa", es: "El reino de Nimrod comienza" },
  recueVlIF65sLlqSO: { pt: "Raquel morre ao dar à luz Benjamim", es: "Raquel muere dando a luz a Benjamín" },
  recNE3SvBrPoTRiMS: { pt: "José é vendido ao Egito", es: "José es vendido a Egipto" },
  recqKt1B6fiiSKrK6: { pt: "José é aprisionado", es: "José es encarcelado" },
  recD7RqjeIpsJAoBc: { pt: "José é promovido no Egito", es: "José es promovido en Egipto" },
  recZlsev4ThVh4o6I: { pt: "7 anos de fartura", es: "7 años de abundancia" },
  rec85BvWuap3CDiMT: { pt: "7 anos de fome", es: "7 años de hambre" },
  rec1ryOcznIUObhW7: { pt: "Irmãos de José vão ao Egito", es: "Hermanos de José van a Egipto" },
  rec2Vbu9LcbJesuS0: { pt: "Irmãos de José retornam ao Egito", es: "Hermanos de José regresan a Egipto" },
  recMNT9RB1RJiLlYW: { pt: "A provação de Jó", es: "La prueba de Job" },

  // Exodus / Conquest
  recwofVaBASTvL8lL: { pt: "Moisés foge do Faraó", es: "Moisés huye del Faraón" },
  recjkmUO88wihv8Ci: { pt: "Êxodo do Egito", es: "Éxodo de Egipto" },
  recr71Fz4NHTnGLJ2: { pt: "Peregrinação no deserto", es: "Peregrinaje en el desierto" },
  reca8LvAmFPl1tmnN: { pt: "Os Dez Mandamentos são dados", es: "Los Diez Mandamientos son dados" },
  recvA947nCyo8kadV: { pt: "Tabernáculo construído", es: "Tabernáculo construido" },
  recSF4lyBebGjJEXI: { pt: "Travessia do Jordão rumo a Canaã", es: "Cruce del Jordán hacia Canaán" },
  rec0t3McGWoyd6kTB: { pt: "Guerra com os cananeus", es: "Guerra con los cananeos" },
  rec91XeIAmvH5rhav: { pt: "Divisão da terra", es: "División de la tierra" },

  // Judges
  rectQ4Vg6XbpTyR92: { pt: "Juizado de Jair", es: "Juicio de Jair" },
  recEpl6nDyA0TWVdW: { pt: "Subjugação por Cusã-Risataim", es: "Subyugación por Cusán-Risataim" },
  recUvk5tT0xGxR71o: { pt: "Libertação por Otniel", es: "Liberación por Otoniel" },
  recG0Smwr0v3S7ShM: { pt: "Subjugação por Eglom", es: "Subyugación por Eglón" },
  recxl5FkotW1u50nA: { pt: "Libertação por Eúde", es: "Liberación por Aod" },
  rec07gtJgfa7skhaQ: { pt: "Subjugação por Jabim", es: "Subyugación por Jabín" },
  recoroJg305CLphtu: { pt: "Libertação por Baraque e Débora", es: "Liberación por Barac y Débora" },
  recNAaoS2dLaYGVgh: { pt: "Subjugação por Midiã", es: "Subyugación por Madián" },
  recD6xiJWvESO0Wea: { pt: "Libertação por Gideão", es: "Liberación por Gedeón" },
  recNLSBgKYUyByJwa: { pt: "Usurpação por Abimeleque", es: "Usurpación por Abimelec" },
  recWw6t8usixUbFOU: { pt: "Juizado de Tola", es: "Juicio de Tola" },
  rec7nesNMNffYRe3F: { pt: "Opressão por Amom e Filístia", es: "Opresión por Amón y Filistea" },
  rec3z1OqSDMH0rR7y: { pt: "Juizado de Eli", es: "Juicio de Elí" },
  recAfJj3Pv6wRG2nj: { pt: "Libertação por Jefté", es: "Liberación por Jefté" },
  reczOHadpTVOuiidp: { pt: "Juizado de Ibsã", es: "Juicio de Ibzán" },
  recSRPo1LlWZ7tNaO: { pt: "Domínio dos filisteus", es: "Dominio filisteo" },
  recGFZbQIjuGwXtTy: { pt: "Juizado de Elom", es: "Juicio de Elón" },
  recoKV71uxsJeHTWW: { pt: "Juizado de Abdom", es: "Juicio de Abdón" },
  rec24EmrBZzGvOD2U: { pt: "Juizado de Sansão", es: "Juicio de Sansón" },
  reccUeZb53JJ02Lv9: { pt: "Sansão destrói o Templo de Dagom", es: "Sansón destruye el Templo de Dagón" },

  // United Kingdom
  rec3uYdP5Fca5BJfX: { pt: "Reino Unido", es: "Reino Unido" },
  rec9JB5FY6jMOyEY3: { pt: "Davi mata Golias", es: "David mata a Goliat" },
  recYlpu8OdsUJoG8g: { pt: "Construção do Templo de Salomão", es: "Construcción del Templo de Salomón" },

  // Divided / Prophets
  rec5W0YtPdi4yrvaY: { pt: "Reino do Sul (Judá)", es: "Reino del Sur (Judá)" },
  rec3R4qyFlVjCRORt: { pt: "Reino do Norte (Israel)", es: "Reino del Norte (Israel)" },
  recRiyMlpGQNCIZvm: { pt: "Profecias de Elias", es: "Profecías de Elías" },
  recD1Gv4SKNFG3zPa: { pt: "Elias é trasladado", es: "Elías es trasladado" },
  recCh323mcqdG01EW: { pt: "Profecias de Eliseu", es: "Profecías de Eliseo" },
  recKICyY8GrWaYCq3: { pt: "Profecias de Jonas", es: "Profecías de Jonás" },
  rec6VtctTK9zZ5UxZ: { pt: "Profecias de Joel", es: "Profecías de Joel" },
  rec0MJooZFfHsxW1N: { pt: "Profecias de Amós", es: "Profecías de Amós" },
  recekTocE5mIkvDEk: { pt: "Profecias de Oseias", es: "Profecías de Oseas" },
  recQ1bj3p4Lj5MYY6: { pt: "Profecias de Isaías", es: "Profecías de Isaías" },
  recOQgYeMRMqQbIMe: { pt: "Profecias de Miqueias", es: "Profecías de Miqueas" },
  recylsxpZLWlxVtrU: { pt: "Profecias de Naum", es: "Profecías de Nahúm" },
  rec5pDuWtEaOK7ehk: { pt: "Profecias de Jeremias", es: "Profecías de Jeremías" },
  recUkdsuAuRono8LY: { pt: "Profecias de Sofonias", es: "Profecías de Sofonías" },
  rece1avzrB0YDK1Ln: { pt: "Profecias de Habacuque", es: "Profecías de Habacuc" },
  rec3iJVpZspQM64qQ: { pt: "Profecias de Daniel", es: "Profecías de Daniel" },
  recGUuZfUbylFAytG: { pt: "Profecias de Ezequiel", es: "Profecías de Ezequiel" },
  recdiXqPQiDIBRI0Q: { pt: "Profecias de Obadias", es: "Profecías de Abdías" },
  recQPoA7fH3wJi7v2: { pt: "Profecias de Ageu", es: "Profecías de Hageo" },
  recebNaZjPvbOqk4r: { pt: "Profecias de Zacarias", es: "Profecías de Zacarías" },
  recpSNqfLiST1KQqq: { pt: "Profecias de Malaquias", es: "Profecías de Malaquías" },

  // New Testament — Nativity / Childhood
  recRd6H7B5gBuTYT9: { pt: "Desposório de Maria", es: "Desposorio de María" },
  recOtonfrqZVuz2iF: { pt: "O nascimento de João é predito", es: "El nacimiento de Juan es predicho" },
  recchK9PHoqttFTdX: { pt: "Um anjo fala a José em sonho", es: "Un ángel habla a José en un sueño" },
  rec2xII53pVseJCB6: { pt: "A Anunciação", es: "La Anunciación" },
  recsMmYHDdduT021e: { pt: "Maria visita Isabel", es: "María visita a Isabel" },
  rec2fX249sj1mmGFr: { pt: "Os magos visitam Herodes", es: "Los magos visitan a Herodes" },
  recVRh2awW5WGpXK4: { pt: "Os magos visitam Jesus", es: "Los magos visitan a Jesús" },
  recHWkX7SvgnBZiuD: { pt: "José e Maria fogem para o Egito", es: "José y María huyen a Egipto" },
  rec78vW2GDruKkctf: { pt: "Herodes mata os meninos", es: "Herodes mata a los niños" },
  recQdRNODeVwWG5Qx: { pt: "José e Maria voltam do Egito", es: "José y María regresan de Egipto" },
  rec40p7ak4u60WdPB: { pt: "José e Maria retornam a Nazaré", es: "José y María regresan a Nazaret" },
  recVUI3XqN3CdNF1k: { pt: "Circuncisão de Jesus", es: "Circuncisión de Jesús" },
  recISCjAW413V6T1j: { pt: "Apresentação de Jesus no Templo", es: "Presentación de Jesús en el Templo" },
  recHiT0IbNNmDry0s: { pt: "Infância de Jesus", es: "Infancia de Jesús" },
  rec8FDMhG6menTpse: { pt: "Jesus ainda menino no Templo", es: "Jesús aún niño en el Templo" },
  rec8aq3QrGCer9RqY: { pt: "Crescimento de Jesus", es: "Crecimiento de Jesús" },

  // NT — Ministry (key events only)
  recW9F8RuUqf5HZkd: { pt: "João Batista inicia seu ministério", es: "Juan el Bautista inicia su ministerio" },
  rec8LSQHQdcYfC9La: { pt: "João batiza Jesus", es: "Juan bautiza a Jesús" },
  rec7GKv3V8PLB1Wk1: { pt: "Tentação de Jesus", es: "Tentación de Jesús" },
  recamPG0iyTXyCMRx: { pt: "Água em vinho", es: "Agua en vino" },
  recajWYSuk71jMpgi: { pt: "Primeira Páscoa e Purificação do Templo", es: "Primera Pascua y Purificación del Templo" },
  recqe4jV2tmZC9XuG: { pt: "Jesus e Nicodemos", es: "Jesús y Nicodemo" },
  recZVzEsSsBBuv6XX: { pt: "A Samaritana", es: "La Samaritana" },
  rec5EydSXHdbLbzk1: { pt: "Sermão do Monte", es: "Sermón del Monte" },
  recSpTfIckUAeEOLd: { pt: "Escolha dos apóstolos", es: "Elección de los apóstoles" },
  rec8AUk5qsGus2shA: { pt: "Multiplicação dos cinco pães", es: "Multiplicación de los cinco panes" },
  recQ8WbFKwtwzK9Xm: { pt: "Jesus anda sobre as águas", es: "Jesús camina sobre las aguas" },
  reccrRGqDRLWjCHog: { pt: "Multiplicação dos sete pães", es: "Multiplicación de los siete panes" },
  recBuPmgXN9v9X6WI: { pt: "Confissão de Pedro: \"Sobre esta pedra\"", es: "Confesión de Pedro: \"Sobre esta roca\"" },
  recbbehq3RkfnSmCE: { pt: "A Transfiguração", es: "La Transfiguración" },
  recm9poq0bKg2RuU5: { pt: "Parábola do Bom Samaritano", es: "Parábola del Buen Samaritano" },
  reco0PVfMeFcQrURu: { pt: "O Pai Nosso é ensinado", es: "El Padre Nuestro es enseñado" },
  recMCgwIq1sw9Q779: { pt: "Sermão do Pão da Vida", es: "Sermón del Pan de Vida" },
  recZcjp3TlQQqapTX: { pt: "Festa dos Tabernáculos", es: "Fiesta de los Tabernáculos" },
  recWT2eiDCOXEAbGB: { pt: "Mulher flagrada em adultério", es: "Mujer sorprendida en adulterio" },
  recs2ESnv8JHoLJNs: { pt: "Ensino do Bom Pastor", es: "Enseñanza del Buen Pastor" },
  reclZp6jMKWzYmop9: { pt: "Ressurreição de Lázaro", es: "Resurrección de Lázaro" },

  // NT — Passion Week
  recBsshyiGaHc6bgC: { pt: "Entrada Triunfal", es: "Entrada Triunfal" },
  recmXmhZt51doQu7o: { pt: "Semana Santa", es: "Semana Santa" },
  rece7YQZcZkN73mF8: { pt: "Purificação do Templo", es: "Purificación del Templo" },
  recN1gyMPKbPPQIMa: { pt: "Discurso do Monte das Oliveiras", es: "Discurso del Monte de los Olivos" },
  rec3IGuoFfX4wwc0u: { pt: "Judas planeja a traição", es: "Judas planea la traición" },
  recehyRQPiIuEscz4: { pt: "A Última Ceia", es: "La Última Cena" },
  recNQ0XuoN4rfJR3o: { pt: "Oração e traição no Getsêmani", es: "Oración y traición en Getsemaní" },
  recP6WhPl8eV4tavO: { pt: "Julgamentos judaicos", es: "Juicios judíos" },
  recvsq3X87BSBcInj: { pt: "Suicídio de Judas", es: "Suicidio de Judas" },
  recUlD55WynUKdHAo: { pt: "Julgamentos romanos", es: "Juicios romanos" },
  rec7pLeyxV0yEdrcl: { pt: "Levando a cruz ao Gólgota", es: "Llevando la cruz al Gólgota" },
  rechX4p94qqiHLqLx: { pt: "Crucificação e sepultamento", es: "Crucifixión y sepultura" },
  recwQXXtK8ZbnYuIJ: { pt: "Ressurreição e ascensão", es: "Resurrección y ascensión" },
  recvfB75N6vrQwhWW: { pt: "O Espírito Santo é prometido", es: "El Espíritu Santo es prometido" },
  rec06pcAZBChUBKxF: { pt: "Jesus ascende ao Céu", es: "Jesús asciende al Cielo" },

  // Acts
  reczDqE366xgbgv2C: { pt: "Matias substitui Judas", es: "Matías reemplaza a Judas" },
  recIu7xhASS4Ufyfd: { pt: "O Espírito Santo vem", es: "El Espíritu Santo viene" },
  recQoK9KFveLh556S: { pt: "Pedro prega em Pentecostes", es: "Pedro predica en Pentecostés" },
  recVrh6Nbm3PruADf: { pt: "A igreja cresce", es: "La iglesia crece" },
  recLnDbrahKzEue0K: { pt: "Coxo é curado", es: "Cojo es sanado" },
  rech8qvzNnkDTqCi3: { pt: "Julgamento de Pedro e João", es: "Juicio de Pedro y Juan" },
  rec5Y0EXegwQ5m9mX: { pt: "Os crentes compartilham tudo", es: "Los creyentes comparten todo" },
  recnjhZVhcbtc7WL0: { pt: "Ananias e Safira mentem a Deus", es: "Ananías y Safira mienten a Dios" },
  recCcRDJtUxaIqXnD: { pt: "Apóstolos presos e julgados", es: "Apóstoles arrestados y juzgados" },
  recXUpfeHouc4qLEl: { pt: "Sete escolhidos para servir", es: "Siete escogidos para servir" },
  reclAFi4IpJvlWCDp: { pt: "Estêvão é apreendido", es: "Esteban es detenido" },
  recNZVX1qwBc7F9AU: { pt: "Estêvão fala ao Sinédrio", es: "Esteban habla al Sanedrín" },
  recgcZKRVZDvMUMOa: { pt: "Estêvão é apedrejado", es: "Esteban es apedreado" },
  recVjdJplfI1wSxYk: { pt: "Saulo persegue a igreja", es: "Saulo persigue a la iglesia" },
  recP6mZs3oSlZdrT0: { pt: "Filipe prega na Samaria", es: "Felipe predica en Samaria" },
  recvI0SgATGCasGsV: { pt: "Conversão do eunuco etíope", es: "Conversión del eunuco etíope" },
  recCz7opcoITkiZiq: { pt: "Conversão de Saulo", es: "Conversión de Saulo" },
  reczeOH6wbjkZHP1w: { pt: "Saulo proclama Jesus", es: "Saulo proclama a Jesús" },
  rec4fFrtrUuDVkTNK: { pt: "Pedro encontra Cornélio", es: "Pedro se encuentra con Cornelio" },
  recn2U67FPmywxqcb: { pt: "Discípulos chamados cristãos pela primeira vez", es: "Discípulos llamados cristianos por primera vez" },
  recCCk6aW2ZbOCRTd: { pt: "Herodes mata Tiago", es: "Herodes mata a Jacobo" },
  recDiHn0k1yUMCdjc: { pt: "Herodes aprisiona Pedro", es: "Herodes encarcela a Pedro" },
  recMhkv38hrlSmT3K: { pt: "Um anjo liberta Pedro da prisão", es: "Un ángel libera a Pedro de la prisión" },
  recTAdkQX4sglPtLl: { pt: "Herodes morre", es: "Herodes muere" },

  // Acts — Paul's journeys
  recJl6YAS1kSQ6t8W: { pt: "Início da primeira viagem missionária", es: "Inicio del primer viaje misionero" },
  recUWXmZlrKxIx99u: { pt: "Primeira Viagem Missionária", es: "Primer Viaje Misionero" },
  recwmsQ1HEDGztu9O: { pt: "Concílio de Jerusalém", es: "Concilio de Jerusalén" },
  reciR4wcxOAcLxak0: { pt: "Segunda Viagem Missionária", es: "Segundo Viaje Misionero" },
  recW2x0namY3sL2iX: { pt: "Paulo e Barnabé se separam", es: "Pablo y Bernabé se separan" },
  recinOtqH81aspLoO: { pt: "Timóteo se junta a Paulo e Silas", es: "Timoteo se une a Pablo y Silas" },
  recmIpAsHFs5pOzZ6: { pt: "Chamado à Macedônia", es: "Llamado a Macedonia" },
  reczE4p2AzSrs4ppP: { pt: "Conversão de Lídia", es: "Conversión de Lidia" },
  recVY5whVRxmh37rH: { pt: "Paulo e Silas aprisionados", es: "Pablo y Silas encarcelados" },
  rec611BDzVM1WOUa5: { pt: "Paulo e Silas libertados", es: "Pablo y Silas liberados" },
  recrnXnFkh9CGTgkn: { pt: "Tumulto em Tessalônica", es: "Alboroto en Tesalónica" },
  reclKAhjHwMnSyOB2: { pt: "Paulo prega em Atenas", es: "Pablo predica en Atenas" },
  rec4bAiAcAOo9mPwO: { pt: "Terceira Viagem Missionária", es: "Tercer Viaje Misionero" },
  recl2rPfuRl5ZYiYP: { pt: "Tumulto em Éfeso", es: "Alboroto en Éfeso" },
  recuV2kc7FiAUIuBQ: { pt: "Paulo é preso no Templo", es: "Pablo es arrestado en el Templo" },
  recjSyWPVWxolQ2r4: { pt: "Paulo apela a César", es: "Pablo apela al César" },
  recAIElabptRPkpxz: { pt: "Viagem de Paulo a Roma", es: "Viaje de Pablo a Roma" },
  recXiU82RVp1vo67a: { pt: "Paulo naufraga numa tempestade", es: "Pablo naufraga en una tormenta" },
  recXUXZhzA47ZRt5F: { pt: "Paulo fica em Malta", es: "Pablo permanece en Malta" },
  recuZhS7z4CatBOO0: { pt: "Paulo chega a Roma", es: "Pablo llega a Roma" },
  recGrIgOxWnxVl8h0: { pt: "Primeira prisão romana de Paulo", es: "Primer encarcelamiento romano de Pablo" },

  // NT — Jesus' Galilean ministry (detail)
  recThval8jPdpjMQd: { pt: "Jesus deixa a Judeia em direção à Galileia", es: "Jesús sale de Judea hacia Galilea" },
  recokV9koCd9sHkZo: { pt: "Jesus visita a Galileia", es: "Jesús visita Galilea" },
  recfKYBkGyK1iVyQ7: { pt: "Jesus em Cafarnaum", es: "Jesús en Capernaum" },
  recYIGeTJrnJFAHyB: { pt: "Pescadores de homens", es: "Pescadores de hombres" },
  reczf8H4EoM3gfimU: { pt: "Cura da sogra de Pedro e outros", es: "Sanidad de la suegra de Pedro y otros" },
  recbsEPvWlO2Ajcfo: { pt: "João Batista aprisionado", es: "Juan el Bautista encarcelado" },
  recVzgELtu6c6u0JJ: { pt: "O endemoninhado", es: "El endemoniado" },
  recDZ5yPUfsW2mQCB: { pt: "Jesus rejeitado em Nazaré", es: "Jesús rechazado en Nazaret" },
  rec51NMfUoy8EBm5D: { pt: "O testemunho de João", es: "El testimonio de Juan" },
  rec2rWYKV739WLO4b: { pt: "Primeiros discípulos reunidos", es: "Primeros discípulos reunidos" },
  recBwb7o0eXRqj1Oa: { pt: "Visitando Cafarnaum", es: "Visitando Capernaum" },
  recj0lpW2pEiRfASU: { pt: "João Batista testemunha", es: "Juan el Bautista da testimonio" },
  recrx5gqQTez5Oz5h: { pt: "Cura do leproso", es: "Sanidad del leproso" },
  rec6mNLyG5AVN4X1b: { pt: "Cura do servo do centurião", es: "Sanidad del siervo del centurión" },
  recY3vd5gVnwqoRV1: { pt: "Endemoninhados gadarenos", es: "Endemoniados gadarenos" },
  rec9Ni8NXcob4ou2m: { pt: "Cura do paralítico", es: "Sanidad del paralítico" },
  recbiDrbxO70fDsta: { pt: "Jesus chama Mateus", es: "Jesús llama a Mateo" },
  recbt0ME8XMDoNbVc: { pt: "Questão sobre o jejum", es: "Pregunta sobre el ayuno" },
  rec4P9y8WdotpjMm9: { pt: "Parábola dos odres", es: "Parábola de los odres" },
  recMTSIklCghjlACt: { pt: "Milagres em Cafarnaum", es: "Milagros en Capernaum" },
  recdgE4vWpwc2fVpK: { pt: "Mensagem de Jesus sobre João Batista", es: "Mensaje de Jesús sobre Juan el Bautista" },
  recYaZ1gwefzzNB1V: { pt: "Ai de Corazim e Betsaida", es: "Ay de Corazín y Betsaida" },
  recDFt0ANS33dAxri: { pt: "Espigas no sábado", es: "Espigas en el día de reposo" },
  reciGxBNHjPZwHKvO: { pt: "Cura da mão ressequida", es: "Sanidad de la mano seca" },
  recpYSwD914PD9tHU: { pt: "Cura de multidões", es: "Sanidad de multitudes" },
  recqkOAX88FDIN0ee: { pt: "Endemoninhado cego e mudo e discurso seguinte", es: "Endemoniado ciego y mudo y discurso siguiente" },
  rec7WzLFXKdweuzOD: { pt: "Parábolas à beira-mar e milagre", es: "Parábolas junto al mar y milagro" },
  rechbRJbRUie1YGOk: { pt: "1ª jornada de Jesus pela Galileia", es: "1er recorrido de Jesús por Galilea" },
  recsTeovHSah64TzF: { pt: "Filho da viúva ressuscitado", es: "Hijo de la viuda resucitado" },
  recXZv0xfad7smkqB: { pt: "Ungida por uma mulher pecadora", es: "Ungida por una mujer pecadora" },
  recgL37NW080FcKh8: { pt: "2ª jornada de Jesus pela Galileia", es: "2do recorrido de Jesús por Galilea" },
  recGpBzggp7LyILNR: { pt: "Cura no tanque de Betesda", es: "Sanidad en el estanque de Betesda" },
  rec6tRRdOlOUY9UNN: { pt: "3ª jornada pela Galileia", es: "3er recorrido por Galilea" },
  recnCLTHvWRdrFwVY: { pt: "2ª rejeição em Nazaré", es: "2do rechazo en Nazaret" },
  rec5E1T7Mq1psBubn: { pt: "João decapitado", es: "Juan decapitado" },
  recXbkZXIXcuKVF6d: { pt: "Curas em Genesaré", es: "Sanidades en Genesaret" },
  recah9fwlW8Xyk4gn: { pt: "Discurso sobre mandamentos e tradição", es: "Discurso sobre mandamientos y tradición" },
  rec7Xd0T6QiyeeChg: { pt: "Cura da filha da cananeia", es: "Sanidad de la hija de la cananea" },
  rec4eZvHbmI1QToIw: { pt: "Predição da morte e ressurreição", es: "Predicción de la muerte y resurrección" },
  recXhKGCw4B1CjXQB: { pt: "Cura de um menino com demônio", es: "Sanidad de un muchacho con demonio" },
  recyFfX2l12rwEkqk: { pt: "Segunda predição da morte e ressurreição", es: "Segunda predicción de la muerte y resurrección" },
  recvkY2icLy3QDClR: { pt: "Moeda do tributo na boca do peixe", es: "Moneda del tributo en la boca del pez" },
  recIZ6XquF0X7jaNE: { pt: "Ensinos sobre humildade, tentação e reconciliação", es: "Enseñanzas sobre humildad, tentación y reconciliación" },
  rechQpDJIE2FCEYTU: { pt: "Cura de uma multidão junto ao Mar de Galileia", es: "Sanidad de una multitud junto al Mar de Galilea" },
  recqtoV4JQiYCmkZN: { pt: "Discurso com fariseus e saduceus", es: "Discurso con fariseos y saduceos" },
  rec1QOmEc6elW8boO: { pt: "Cura de um cego em Betsaida", es: "Sanidad de un ciego en Betsaida" },
  recO855E9csJLnyFO: { pt: "Samaritanos rejeitam Jesus", es: "Samaritanos rechazan a Jesús" },
  rec5EAcIz2rHZRN8q: { pt: "Envio dos 70", es: "Envío de los 70" },
  recycS0pNycJe2Xet: { pt: "Jesus encontra Marta e Maria", es: "Jesús visita a Marta y María" },
  recrSSo7ihKbdos1g: { pt: "Ais e parábolas com fariseus", es: "Ayes y parábolas con fariseos" },
  receThtYDpzQmFpc1: { pt: "Cura da mulher com enfermidade de 18 anos", es: "Sanidad de la mujer con enfermedad de 18 años" },
  recoUkvcVV6nR1G2D: { pt: "Ensino do grão de mostarda e do fermento", es: "Enseñanza del grano de mostaza y la levadura" },
  recD6VSiTfaITZLz4: { pt: "Luz do mundo / Discurso do Eu Sou", es: "Luz del mundo / Discurso del Yo Soy" },
  recxURN2uAbTe7CGr: { pt: "Cura do cego", es: "Sanidad del ciego" },
  recs1VxMp6PJ11GLW: { pt: "Festa da Dedicação", es: "Fiesta de la Dedicación" },
  recR3zid90odgmB6g: { pt: "Jesus ensina na Pereia", es: "Jesús enseña en Perea" },
  recN2veKNMtB7HzFi: { pt: "Cura do cego Bartimeu", es: "Sanidad del ciego Bartimeo" },
  recOZxrWd00qyF4Ej: { pt: "Debates no templo", es: "Debates en el templo" },
  recym9Dfibw7KdshX: { pt: "Conspiração do Sinédrio", es: "Conspiración del Sanedrín" },
  recotN6XCwPBF0OzT: { pt: "Figueira amaldiçoada", es: "Higuera maldecida" },
  recYOqX5Qe2a0FHvw: { pt: "Ensino pela figueira", es: "Enseñanza por la higuera" },
  recTplXPehmPfFUiG: { pt: "Cura dos leprosos", es: "Sanidad de los leprosos" },
  recrwlbTDWOETPpei: { pt: "Discurso sobre o Reino e outras parábolas", es: "Discurso sobre el Reino y otras parábolas" },
  reccSs8loWRLm8LAb: { pt: "Zaqueu convertido e parábola das minas", es: "Zaqueo convertido y parábola de las minas" },
  rec70ZLu9pdrEWXR9: { pt: "Ensino e cura na Pereia a caminho de Jerusalém", es: "Enseñanza y sanidad en Perea camino a Jerusalén" },
  recZhxqZJmXuGMdvd: { pt: "Principais sacerdotes conspiram contra Jesus", es: "Principales sacerdotes conspiran contra Jesús" },
  recMIEeRCAf7IGRwc: { pt: "Jesus retira-se para Efraim", es: "Jesús se retira a Efraín" },
  recrB2eWea9OCFtOz: { pt: "Maria unge Jesus", es: "María unge a Jesús" },
  recu6M6co9Iaw0Ow5: { pt: "Discurso do cenáculo", es: "Discurso del aposento alto" },

  // Acts (detail)
  reciu7dT92C4dTrfl: { pt: "Pedro prega no Pórtico de Salomão", es: "Pedro predica en el Pórtico de Salomón" },
  recNQxwdQFjZidQTP: { pt: "Os crentes oram com ousadia", es: "Los creyentes oran con denuedo" },
  rectkWZqlKG1cfOQT: { pt: "Apóstolos operam sinais e prodígios no Pórtico de Salomão", es: "Los apóstoles obran señales y prodigios en el Pórtico de Salomón" },
  rec1qE6wAe0XINRoV: { pt: "Gamaliel aconselha o conselho e os apóstolos são libertados", es: "Gamaliel aconseja al consejo y los apóstoles son liberados" },
  recxH9n2Xk1PM6DvB: { pt: "Pedro cura Eneias e Dorcas", es: "Pedro sana a Eneas y Dorcas" },
  recCef9mlyuV3XWd3: { pt: "Pedro prega aos gentios em Cesareia", es: "Pedro predica a los gentiles en Cesarea" },
  recNnOBWct1TV6CUZ: { pt: "Pedro defende a salvação dos gentios", es: "Pedro defiende la salvación de los gentiles" },
  recJeAtSLg0KP2loe: { pt: "Barnabé e Saulo vão a Chipre", es: "Bernabé y Saulo van a Chipre" },
  recGlchVqaW39mkY0: { pt: "Missão a Antioquia da Pisídia", es: "Misión a Antioquía de Pisidia" },
  receeGDZ90DJxYxnX: { pt: "Missão a Icônio", es: "Misión a Iconio" },
  recrre0r2IHdN3Y7Z: { pt: "Missão a Listra e Derbe", es: "Misión a Listra y Derbe" },
  reckt5soySSqCZnoa: { pt: "Retorno a Antioquia da Síria", es: "Regreso a Antioquía de Siria" },
  recsnRcoxqD4pQGHp: { pt: "Início da segunda viagem missionária", es: "Inicio del segundo viaje misionero" },
  recayBHkzCbMe6dnD: { pt: "Missão à Frígia, Galácia e Ásia", es: "Misión a Frigia, Galacia y Asia" },
  rec1Olk9cxeWoT5Jl: { pt: "Paulo expulsa demônio de uma adivinha", es: "Pablo expulsa un demonio de una adivina" },
  recX4DzqXgIe0R2T4: { pt: "Carcereiro de Filipos convertido", es: "Carcelero de Filipos convertido" },
  recF289Cj0XMYVOmr: { pt: "Missão a Bereia", es: "Misión a Berea" },
  recZLqdKx9mrT0bCv: { pt: "Missão a Corinto; 1 e 2 Tessalonicenses escritas", es: "Misión a Corinto; 1 y 2 Tesalonicenses escritas" },
  reco0fEiYQ6hKFYc5: { pt: "Paulo escreve Gálatas", es: "Pablo escribe Gálatas" },
  recxAgEs5O3piUpAG: { pt: "Retorno da segunda viagem missionária", es: "Regreso del segundo viaje misionero" },
  receG7A0Y0VjWPff1: { pt: "Início da terceira viagem missionária", es: "Inicio del tercer viaje misionero" },
  rec2buqN0Q38Yuqme: { pt: "Missão a Éfeso; 1 Coríntios escrita", es: "Misión a Éfeso; 1 Corintios escrita" },
  recGXoNtdiKu28Wff: { pt: "Missão à Macedônia e Grécia", es: "Misión a Macedonia y Grecia" },
  recCiHwYp3CSqFWrK: { pt: "Êutico ressuscitado", es: "Eutico resucitado" },
  recbGb0Cb2yIRqmle: { pt: "Viagem a Mileto", es: "Viaje a Mileto" },
  recwlxgjUu5AwPX9D: { pt: "Paulo fala aos anciãos de Éfeso", es: "Pablo habla a los ancianos de Éfeso" },
  recxOoLkd6wFyKysC: { pt: "Viagem de Mileto a Jerusalém", es: "Viaje de Mileto a Jerusalén" },
  recYE6hOLCtnqejur: { pt: "Paulo visita os anciãos em Jerusalém", es: "Pablo visita a los ancianos en Jerusalén" },
  recR2Yyty10Qn41wQ: { pt: "Paulo dá seu testemunho", es: "Pablo da su testimonio" },
  rec9DRZs8DbQy0fv5: { pt: "Paulo perante o conselho", es: "Pablo ante el consejo" },
  rectG8MR4Z2zb8mwZ: { pt: "Conspiração para matar Paulo", es: "Conspiración para matar a Pablo" },
  recODnfv69EyvRMvA: { pt: "Paulo enviado a Félix", es: "Pablo enviado a Félix" },
  recZZnST3yj4b1akY: { pt: "Agripa e Berenice encontram Festo", es: "Agripa y Berenice se presentan ante Festo" },
  recltAvLmGRfERhYp: { pt: "Paulo perante Agripa", es: "Pablo ante Agripa" },
  recJWNH2OCuUoOz6e: { pt: "Início da viagem a Roma", es: "Inicio del viaje a Roma" },
};

// ─── Pattern templates (Birth / Death / Lifetime / Reign of X) ───────────────

type PatternKind = "birth" | "death" | "lifetime" | "reign";

const PATTERN_TEMPLATES: Record<PatternKind, { pt: string; es: string }> = {
  birth: { pt: "Nascimento de {name}", es: "Nacimiento de {name}" },
  death: { pt: "Morte de {name}", es: "Muerte de {name}" },
  lifetime: { pt: "Vida de {name}", es: "Vida de {name}" },
  reign: { pt: "Reinado de {name}", es: "Reinado de {name}" },
};

function matchPattern(title: string): { kind: PatternKind; subject: string } | null {
  if (title.startsWith("Birth of ")) return { kind: "birth", subject: title.slice(9) };
  if (title.startsWith("Death of ")) return { kind: "death", subject: title.slice(9) };
  if (title.startsWith("Lifetime of ")) return { kind: "lifetime", subject: title.slice(12) };
  if (title.startsWith("Reign of ")) return { kind: "reign", subject: title.slice(9) };
  return null;
}

/**
 * Given a person name (EN from API), try to find a slug that translates it.
 * This is a best-effort reverse-lookup for pattern titles that carry only the
 * EN name (not the slug). For the common biblical figures it hits; for the
 * long tail it returns the name unchanged, which is still an acceptable
 * pattern template like "Nascimento de Mehetabel".
 */
/**
 * Reverse lookup: English subject name (as it appears in event titles like
 * "Birth of Abraham") → slug. We keep this small and hand-curated for the
 * patterns that actually fire (~164 lifetime/birth/death/reign events, most
 * of which hit the same ~80 people).
 */
const ENGLISH_SUBJECT_TO_SLUG: Record<string, string> = {
  Adam: "adam_78",
  Noah: "noah_2210",
  Shem: "shem_2613",
  Abraham: "abraham_58",
  Sarah: "sarah_2473",
  Isaac: "isaac_616",
  Rebekah: "rebekah_2401",
  Jacob: "israel_682",
  Rachel: "rachel_2386",
  Leah: "leah_1813",
  Joseph: "joseph_1710",
  Benjamin: "benjamin_463",
  Judah: "judah_1751",
  Levi: "levi_1820",
  Simeon: "simeon_2741",
  Reuben: "reuben_2429",
  Moses: "moses_2108",
  Aaron: "aaron_1",
  Joshua: "joshua_1727",
  Caleb: "caleb_537",
  Samuel: "samuel_2469",
  Saul: "saul_2478",
  David: "david_994",
  Jonathan: "jonathan_1692",
  Solomon: "solomon_2762",
  Rehoboam: "rehoboam_2412",
  Jeroboam: "jeroboam_872",
  Ahab: "ahab_113",
  Jezebel: "jezebel_1605",
  Jehu: "jehu_817",
  Asa: "asa_318",
  Jehoshaphat: "jehoshaphat_808",
  Hezekiah: "hezekiah_1512",
  Manasseh: "manasseh_1930",
  Josiah: "josiah_1730",
  Zedekiah: "zedekiah_1950",
  Elijah: "elijah_1131",
  Elisha: "elisha_1153",
  Isaiah: "isaiah_617",
  Jeremiah: "jeremiah_853",
  Daniel: "daniel_975",
  Ezekiel: "ezekiel_1340", // not in PERSONS yet but pattern will gracefully fall through
  Jonah: "jonah_1689",
  Ezra: "ezra_1245",
  Nehemiah: "nehemiah_2200",
  Esther: "esther_1343",
  Job: "job_1639",
  Ruth: "ruth_2450",
  Boaz: "boaz_519",
  Naomi: "naomi_2147",
  "Jesus Christ": "jesus_905",
  Jesus: "jesus_905",
  Mary: "mary_1938",
  John: "john_1676",
  Paul: "paul_2479",
  Peter: "peter_2745",
  Barnabas: "barnabas_1722",
  Timothy: "timotheus_2863",
  Timotheus: "timotheus_2863",
};

function tryTranslateSubject(subject: string, locale: Locale): string {
  if (locale === "en") return subject;
  const head = subject.split(" (")[0].trim();
  const slug = ENGLISH_SUBJECT_TO_SLUG[head];
  if (!slug) return subject;
  const entry = PERSONS[slug];
  if (!entry) return subject;
  return locale === "pt" ? entry.pt : entry.es;
}

// ─── Public helper ───────────────────────────────────────────────────────────

/**
 * Translate an event title to the active locale.
 *
 * Resolution order:
 *   1. Exact match in SPECIFIC_EVENTS (by event_id)
 *   2. Pattern match (Birth/Death/Lifetime/Reign of X) → templated
 *   3. Fallback to the original English title
 */
export function eventTitle(
  eventId: string | null | undefined,
  rawTitle: string,
  locale: Locale,
): string {
  if (locale === "en") return rawTitle;

  if (eventId) {
    const specific = SPECIFIC_EVENTS[eventId];
    if (specific) {
      return locale === "pt" ? specific.pt : specific.es;
    }
  }

  const patt = matchPattern(rawTitle);
  if (patt) {
    const template = PATTERN_TEMPLATES[patt.kind];
    const name = tryTranslateSubject(patt.subject, locale);
    const localized = locale === "pt" ? template.pt : template.es;
    return localized.replace("{name}", name);
  }

  return rawTitle;
}

/**
 * Translate a list of participant slugs into a comma-joined string.
 * Re-exports personNamesJoin for ergonomics — TimelinePage needs it right here.
 */
export function eventParticipants(
  slugs: string[] | undefined | null,
  locale: Locale,
): string {
  if (!slugs || slugs.length === 0) return "";
  // personName derives "god_1324" -> "God" when no curated entry exists.
  return slugs.map((s) => personName(s, locale)).join(", ");
}

export { SPECIFIC_EVENTS, PATTERN_TEMPLATES };
