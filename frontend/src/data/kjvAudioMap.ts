// LibriVox KJV recordings on Archive.org — CORS-open, public domain.
// Each entry: archiveId (archive.org identifier) + prefix (filename before _{ch}) + pad (zero-pad chapter).
// URL pattern: https://archive.org/download/{archiveId}/{prefix}_{ch}_kjv.mp3

export type KjvAudioEntry = {
  archiveId: string;
  prefix: string;
  pad: boolean; // true → chapter "01", false → "1"
};

// book_id (uppercase) → audio entry
export const KJV_AUDIO_MAP: Record<string, KjvAudioEntry> = {
  // ── Old Testament ──────────────────────────────────────────────
  GEN: { archiveId: "kjv_genesis_librivox",                           prefix: "genesis",          pad: true  },
  EXO: { archiveId: "kjv_exodus_librivox",                            prefix: "exodus",           pad: true  },
  LEV: { archiveId: "kjv_leviticus_librivox",                         prefix: "leviticus",        pad: true  },
  NUM: { archiveId: "numbers_kjv_1108_librivox",                      prefix: "numbers",          pad: true  },
  DEU: { archiveId: "deuteronomy_kjv_1110_librivox",                  prefix: "deuteronomy",      pad: true  },
  JOS: { archiveId: "bible_kjv_joshua_jc_librivox",                   prefix: "joshua",           pad: true  },
  JDG: { archiveId: "bible_judges_kjv_jc_librivox",                   prefix: "judges",           pad: true  },
  RUT: { archiveId: "biblekjv_8ruth_dr_1502_librivox",                prefix: "ruth",             pad: true  },
  "1SA": { archiveId: "bible_1samuel_kjv_0903_librivox",              prefix: "1samuel",          pad: true  },
  "2SA": { archiveId: "bible_2samuel_kjv_jc_librivox",                prefix: "2samuel",          pad: true  },
  "1KI": { archiveId: "bible_kjv_11_1king_0909_librivox",             prefix: "1kings",           pad: true  },
  "2KI": { archiveId: "bible_kjv_2kings_jc_librivox",                 prefix: "2kings",           pad: true  },
  "1CH": { archiveId: "bible_kjv_14_1chronicles_jc_librivox",         prefix: "1chronicles",      pad: true  },
  "2CH": { archiveId: "2chronicleskjv_1403_librivox",                 prefix: "2chronicles",      pad: true  },
  EZR: { archiveId: "ezra_kjv_sw_librivox",                           prefix: "ezra",             pad: true  },
  NEH: { archiveId: "nehemiah_kjv_1110_librivox",                     prefix: "nehemiah",         pad: true  },
  EST: { archiveId: "bible_kjv_17_esther_dr_1502_librivox",           prefix: "esther",           pad: true  },
  JOB: { archiveId: "bible_kjv_18_job_version_2_1507_librivox",       prefix: "job",              pad: true  },
  PSA: { archiveId: "bible_kjv_19_psalms_1207_librivox",              prefix: "psalms",           pad: true  },
  PRO: { archiveId: "proverbs_kjv_1210_librivox",                     prefix: "proverbs",         pad: true  },
  ECC: { archiveId: "ecclesiastes_kjv_1007_librivox",                 prefix: "ecclesiastes",     pad: false },
  SNG: { archiveId: "songofsolomon_kjv_1009_librivox",                prefix: "songofsolomon",    pad: false },
  ISA: { archiveId: "isaiah_kjv_1107_librivox",                       prefix: "isaiah",           pad: true  },
  JER: { archiveId: "jeremiah_kjv_1201_librivox",                     prefix: "jeremiah",         pad: true  },
  LAM: { archiveId: "bible_kjv_25_lamentations_mp_0909_librivox",     prefix: "lamentations",     pad: false },
  EZK: { archiveId: "ezekiel_kjv_jr_librivox",                        prefix: "ezekiel",          pad: true  },
  DAN: { archiveId: "daniel_kjv_1112_librivox",                       prefix: "daniel",           pad: true  },
  HOS: { archiveId: "hosea_kjv_librivox",                             prefix: "hosea",            pad: false },
  JOL: { archiveId: "joel_kjv_ss_librivox",                           prefix: "joel",             pad: false },
  AMO: { archiveId: "amos_kjv_librivox",                              prefix: "amos",             pad: false },
  OBA: { archiveId: "obadiah_kjv_librivox",                           prefix: "obadiah",          pad: false },
  JON: { archiveId: "jonah_kjv_librivox",                             prefix: "jonah",            pad: false },
  MIC: { archiveId: "micah_kjv_librivox",                             prefix: "micah",            pad: false },
  NAM: { archiveId: "nahum_kjv_librivox",                             prefix: "nahum",            pad: false },
  HAB: { archiveId: "habakkuk_kjv_librivox",                          prefix: "habakkuk",         pad: false },
  ZEP: { archiveId: "zephaniah_kjv_librivox",                         prefix: "zephaniah",        pad: false },
  HAG: { archiveId: "haggai_kjv_librivox",                            prefix: "haggai",           pad: false },
  ZEC: { archiveId: "zechariah_kjv_librivox",                         prefix: "zechariah",        pad: false },
  MAL: { archiveId: "malachi_kjv_librivox",                           prefix: "malachi",          pad: false },

  // ── New Testament ──────────────────────────────────────────────
  MAT: { archiveId: "matthew_kjv_mp_librivox",                        prefix: "matthew",          pad: true  },
  MRK: { archiveId: "mark_kjv_sw_librivox",                           prefix: "mark",             pad: true  },
  LUK: { archiveId: "bible_kjv_nt_03_luke_0812_librivox",             prefix: "luke",             pad: true  },
  JHN: { archiveId: "biblent04_john_kjv_librivox",                    prefix: "john",             pad: true  },
  ACT: { archiveId: "acts_kjv_1112_librivox",                         prefix: "acts",             pad: true  },
  ROM: { archiveId: "romans_kjv_1112_librivox",                       prefix: "romans",           pad: true  },
  "1CO": { archiveId: "1corinthians_kjv_1103_librivox",               prefix: "1corinthians",     pad: true  },
  "2CO": { archiveId: "2corinthians_kjv_1105_librivox",               prefix: "2corinthians",     pad: true  },
  GAL: { archiveId: "galatians_kjv_1412_librivox",                    prefix: "galatians",        pad: false },
  EPH: { archiveId: "ephesians_kjv_nt_librivox",                      prefix: "ephesians",        pad: false },
  PHP: { archiveId: "philippians_kjv_vm_librivox",                    prefix: "philippians",      pad: false },
  COL: { archiveId: "colossians_kjv_librivox",                        prefix: "colossians",       pad: false },
  "1TH": { archiveId: "bible_1thessalonians_kjv_1010_librivox",       prefix: "1thessalonians",   pad: false },
  "2TH": { archiveId: "bible_2thessalonians_kjv_1011_librivox",       prefix: "2thessalonians",   pad: false },
  "1TI": { archiveId: "bible_1timothy_kjv_1007_librivox",             prefix: "1timothy",         pad: false },
  "2TI": { archiveId: "bible_2timothy_kjv_1009_librivox",             prefix: "2timothy",         pad: false },
  TIT: { archiveId: "bible_titus_kjv_1007_librivox",                  prefix: "titus",            pad: false },
  PHM: { archiveId: "bible_philemon_kjv_1007_librivox",               prefix: "philemon",         pad: false },
  HEB: { archiveId: "hebrews_kjv_1111_librivox",                      prefix: "hebrews",          pad: true  },
  JAS: { archiveId: "james_kjv_librivox",                             prefix: "james",            pad: false },
  "1PE": { archiveId: "1peter_kjv_librivox",                          prefix: "1peter",           pad: false },
  "2PE": { archiveId: "2peter_kjv_librivox",                          prefix: "2peter",           pad: false },
  "1JN": { archiveId: "1John_kjv_librivox",                           prefix: "1john",            pad: false },
  "2JN": { archiveId: "2john_kjv_librivox",                           prefix: "2john",            pad: false },
  "3JN": { archiveId: "3john_kjv_librivox",                           prefix: "3john",            pad: false },
  JUD: { archiveId: "jude_kjv_librivox",                              prefix: "jude",             pad: false },
  REV: { archiveId: "revelation_mp_librivox",                         prefix: "revelation",       pad: true  },
};

const BASE = "https://archive.org/download";

export function kjvChapterUrl(bookId: string, chapter: number): string | null {
  const entry = KJV_AUDIO_MAP[bookId.toUpperCase()];
  if (!entry) return null;
  const ch = entry.pad ? String(chapter).padStart(2, "0") : String(chapter);
  return `${BASE}/${entry.archiveId}/${entry.prefix}_${ch}_kjv.mp3`;
}
