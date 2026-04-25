# Verbum i18n Style Guide

Authoritative reference for translation decisions, terminology, and tone across the three locale files:

- `en.json` — source of truth
- `pt.json` — Brazilian Portuguese (PT-BR); user is native speaker
- `es.json` — neutral Latin-American / international Spanish

All three files must stay at **identical key count and key set**. Parity is enforced by the check in the roadmap:

```bash
python -c "import json; a=json.load(open('frontend/src/i18n/en.json')); b=json.load(open('frontend/src/i18n/pt.json')); c=json.load(open('frontend/src/i18n/es.json')); assert set(a)==set(b)==set(c)"
```

---

## 1. Key structure

- Flat key names, dot-separated namespace (`people.events.title`, not nested objects). Matches how `t("...")` is called.
- Namespace per page / component cluster. New feature → new namespace.
- Shared chrome lives under `common.*` and `nav.*`.
- Keep keys **English-derived and stable**: `people.alsoKnownAs` stays even if the label was reworded. Rename a key only when the semantic meaning changes.

Alphabetical within a namespace is *preferred* but not strictly enforced — grouping related keys together (singular above plural, aria after visible label) wins over strict alpha.

---

## 2. Tone and register

### English
- Sentence-case for most copy, Title Case for page titles, section headers, and button labels that act as titles ("Save", "Share Verse", "Full Study").
- No Oxford comma unless meaning breaks.
- Ellipsis `…` (U+2026) inside loaders (`"Loading..."` uses `...` historically; keep both shapes — do not reformat on sight).
- Arrows: prefer `→` (U+2192) on links that navigate away and `↓` on expanders. Don't replace with `->`.

### Portuguese (PT-BR)
- **Register: "você" + imperativo afirmativo** ("Abra o Leitor", "Salve este versículo"). Never "tu". Avoid formal "o senhor / a senhora".
- **Buttons and calls to action** use the infinitive: "Salvar", "Copiar", "Excluir", "Iniciar plano". Not "Salve", not "Salvar!".
- **Page headers** use title case adapted to PT capitalization rules — Bíblia / Versículo / Escritura stay capitalized when they refer to the Bible specifically; "palavra" lowercase unless it's John 1:1 ("Verbo" / "Palavra").
- **"Nota / Anotação"**: this app uses `notes.*` for the user's own notes and `notes.editor.label: "Nota"` for the inline label. The landing page `notes.title` says "Anotações" (more natural for PT-BR when it's the feature name). Keep the distinction — don't collapse to one word.
- Accented characters always encoded as UTF-8 characters (`ç`, `ã`, `é`), never as HTML entities.

### Spanish (ES)
- **Register: "tú" + imperativo** ("Abre el Lector", "Guarda este versículo"). No "vos", no "usted". Neutral LATAM usage.
- **Buttons and CTAs** use the infinitive: "Guardar", "Copiar", "Eliminar", "Iniciar plan".
- **Inverted punctuation is required**: `¿...?` and `¡...!` — both open and close marks. Opening mark has bit more weight than English counterparts; never drop it.
- **Number formatting**: use `.` as thousands separator (1.800, 4.673, 191.787) — matches RAE / most LATAM conventions. Do *not* use `,` for thousands. Consistent with PT.

---

## 3. Interpolation

The runtime uses chained `String.prototype.replace`:

```tsx
t("people.events.title").replace("{count}", String(events.length))
```

Rules:
- Placeholders are `{name}`, `{n}`, `{total}`, `{book}` — always lowercase, no spaces.
- The same placeholder name is consistent across languages — do not rename `{count}` to `{n}` only in one locale.
- When a string takes multiple placeholders, chain the replacements. Don't reach for a template engine.
- **No format specifiers** (`{n:integer}`). Do the formatting in TS before passing.

### Pluralization

There's no plural library. Handle plurals one of two ways:

1. **Two separate keys**, picked with a ternary in the component. Preferred when plural and singular read naturally different:
   ```
   "topics.found":          "{n} topics found"
   "topics.foundSingular":  "{n} topic found"
   ```
   Component:
   ```tsx
   (n === 1 ? t("topics.foundSingular") : t("topics.found")).replace("{n}", String(n))
   ```

2. **Neutral phrasing** that works for both counts — when the singular case is rare or visually trivial. Example: `people.results` is always plural; the "1 result" edge case is fine.

Do **not** attempt to pluralize with a suffix (no `book{s}` tricks in the template string). The current codebase has zero of these — keep it that way.

---

## 4. Terminology reference

| Domain | English | Portuguese | Spanish | Notes |
|---|---|---|---|---|
| Testament | Old Testament | Antigo Testamento | Antiguo Testamento | Abbreviate as OT/AT/AT in axis labels. |
| Testament | New Testament | Novo Testamento | Nuevo Testamento | NT/NT/NT. |
| BC / AD | BC / AD | a.C. / d.C. | a.C. / d.C. | Lowercase in PT/ES; spaces optional but omitted in this codebase. |
| Bible translation | translation | tradução | traducción | Abbreviation `trans.` only in English; PT/ES spell it out or use `trad.` |
| Verse | verse / verses | versículo / versículos | versículo / versículos | Not "verso" in PT (verso = poem line); always "versículo". |
| Chapter | chapter | capítulo | capítulo | `ch` / `cap` / `cap` as abbreviations. |
| Book | book | livro | libro | |
| Word (Strong's) | word | palavra | palabra | |
| Cross-reference | cross-reference / cross-refs | referência cruzada / refs. cruzadas | referencia cruzada / refs. cruzadas | |
| Concordance entry | entry | entrada | entrada | |
| Semantic thread | thread | fio | hilo | |
| Topic (Nave's) | topic | tópico | tema | Nave's is translated as "Índice Topical de Nave" in PT/ES. |
| Bookmark | bookmark | favorito | marcador | Note intentional divergence: PT uses "favorito" (same as browser bookmarks), ES uses "marcador". Don't cross these. |
| Highlight | highlight | destaque | resaltado | |
| Note (user) | note | anotação (feature) / nota (inline) | nota | See §2 for the PT dual-usage. |
| AI / model | AI | IA | IA | `GEMINI_API_KEY` stays literal in all three. |
| Backend / cache | backend / cache | backend / cache | backend / caché | Technical jargon stays — don't try to translate "backend". |
| Strong's number | Strong's ID | ID de Strong | ID de Strong | Possessive stays on the proper noun. |

### Script / original-language labels

These labels refer to *original biblical languages*, not UI languages. They must always use the user's reading locale:

| English | Portuguese | Spanish |
|---|---|---|
| Hebrew | Hebraico | Hebreo |
| Greek | Grego | Griego |
| Aramaic | Aramaico | Arameo |
| Koine Greek | Grego Koiné | Griego Koiné |
| Syriac Aramaic | Aramaico Siríaco | Arameo Siríaco |
| Masoretic Text | Texto Massorético | Texto Masorético |

These appear in `passageWord.source.*`, `specialPassage.layer.*`, `graph.legendHebrew`, `lexicon.header`, etc. — always via `t()`, never hardcoded in a component. The original "Aramaico / Grego showing in EN output" bug on `SpecialPassagePage` was caused by hardcoded PT strings in `PassageWordPanel.tsx` and `MultiLayerView.tsx`; both are now keyed through `t()`.

### Language names in the language-switcher

The `<LOCALES>` list in `frontend/src/i18n/i18nContext.tsx` intentionally keeps each language labeled in its own script:

- EN → "English"
- PT → "Português"
- ES → "Español"

Don't "translate" these — each user sees their own language label plus the others in their native forms, which is standard UX.

---

## 5. Characters and glyphs

- Arrows: `→` (right), `↓` (down), `↑` (up), `←` (left). Use them for affordance, never for decoration.
- Em dash `—` (U+2014) for interjections in EN/PT/ES. Don't substitute `--` or `- -`.
- Ellipsis: ASCII `...` is used for loaders (historical consistency); `…` (U+2026) is fine inside prose. Don't mass-convert.
- Star: `★` (saved/active) and `☆` (unsaved) for bookmarks.
- Separator in meta lines: `·` (U+00B7) — never the bullet `•` and never `•` with trailing space.
- Percent: no space in EN (`50%`), space-preceded in French-style ES is *not* the convention here — keep `99 %` only where it already appears (deliberate in `places.subtitle` for readability with `1.800+`); default to `50%`.

---

## 6. Anti-patterns already corrected

These were caught in the Phase 5 review — avoid reintroducing:

| Bug | Fix | Where |
|---|---|---|
| PT strings "Aramaico / Grego / Peshitta — Aramaico Siríaco" leaked into EN output | Moved to `specialPassage.layer.*` and `passageWord.source.*` keys | `PassageWordPanel.tsx`, `MultiLayerView.tsx` |
| "Powered by Gemini" was English inside PT and ES copy | Changed to "Com tecnologia Gemini" / "Con tecnología Gemini" | `ai.poweredBy` |
| `plans.allDone` in ES missing opening `¡` | "¡Todo leído!" | `plans.allDone` |
| `home.shuffleVerse` in ES translated literally as "Cambiar" (= "change"), losing "shuffle/randomize" intent | "Aleatorio" | `home.shuffleVerse` |
| `places.alsoCalled` in PT ("também chamado") and ES ("también llamado") assumed masculine singular while `{names}` is a comma list | Rewritten as gender/number-neutral "também conhecido como" / "también conocido como" | `places.alsoCalled` |
| `people.subtitle` in ES used `3,000+` while the rest of the file used `.` for thousands | Normalised to `3.000+` | `people.subtitle` |
| `divergence.subtitle` repeated "traduções renderizam" (Anglicism) in PT and "traducciones traducen" (redundant) in ES | Reworded to "apresentam" / "presentan" | `divergence.subtitle` |
| Variable shadowing: `map((t) => …)` inside a component that uses the `t()` function from `useI18n()` | Rename loop vars to `tid`, `tag`, `th`, `tabKey` | Any component using `useI18n()` |

---

## 7. Verification ritual

Per phase, and before merging any i18n change:

1. **TypeScript types are clean:**
   ```bash
   cd frontend && npx tsc --noEmit
   ```
2. **Locale key parity — identical sets across the three files:**
   ```bash
   python -c "import json; a=json.load(open('frontend/src/i18n/en.json')); b=json.load(open('frontend/src/i18n/pt.json')); c=json.load(open('frontend/src/i18n/es.json')); d={'missing in pt':sorted(set(a)-set(b)),'missing in es':sorted(set(a)-set(c)),'extra in pt':sorted(set(b)-set(a)),'extra in es':sorted(set(c)-set(a))}; import sys; [sys.exit('FAIL '+k) for k,v in d.items() if v]; print(f'OK en={len(a)} pt={len(b)} es={len(c)}')"
   ```
3. **Smoke:** open the page you changed in the browser, toggle EN → PT → ES, verify visually — the language switcher writes to `localStorage['bible-locale']` so reloads survive.

---

## 8. Open deferred items

These are *known* minor gaps. Not bugs, but noted so they don't get forgotten:

- `reader.spread` vs `reader.page` — in EN these are two distinct modes (two-page spread vs single page). PT/ES collapse both to "Página". Low-impact because the pager context already disambiguates, but a future pass could split into `reader.spread: "Folha" / "Hoja"` for clarity.
- `search.trySearchingFor` in ES (`"Prueba buscar"`) — grammatically the RAE form would be `"Prueba a buscar"`; left as-is because the elliptical LATAM form reads better as a chip-row heading.
- Plural forms for `crossrefs.count` / `compare.columnMeta` — single plural keys (no singular fallback). The `1` case is visually fine but could be split if a pedantic pass is requested.

---

*Last updated:* Phase 5 of the i18n roadmap — 620+ key quality review.
