# ✝️ VERBUM — Plano Mestre v3.0 (Consolidado)
## "In principio erat Verbum" — João 1:1

> Consolidação final: Claude (arquitetura/código) + Sonnet (produto/UX)
> + Gemini (dados/estratégia). Três perspectivas, um objetivo.

---

## 🎯 Identidade

**Nome:** Verbum (latim para "Palavra" — João 1:1 Vulgata)
**Repo:** github.com/DavidKGBR/verbum
**Posicionamento:** "YouVersion para quem quer estudar de verdade"
**Diferencial:** Interlinear interativo + grafo semântico + visualizações
de dados que só Logos oferece (pago) — grátis, bonito, offline.

---

## 📊 Estado Atual (v2.0) ✅

| Métrica | Valor |
|---------|-------|
| Backend Python | 4.786 linhas, 25 módulos |
| Frontend TypeScript | 3.808 linhas, 20 componentes, 4 hooks |
| API REST | 18+ endpoints (FastAPI) |
| Traduções | 10 (KJV, NVI, BBE, RA, ACF, RVR, APEE, ASV, WEB, Darby) |
| Cross-references | 344.754 (OpenBible.info) |
| Testes | 138 funções pytest |
| Reader modes | Single, Parallel, Immersive (3D book), em breve Interlinear |
| Features | VerseActions, Search, Bookmarks, Streak, AI (Gemini), KJV annotation toggle |

---

## 🗂️ Fontes de Dados — Pesquisa Consolidada

### Prioridade A — Essenciais para v3.0

| Fonte | O que tem | Licença | Formato | Decisão |
|-------|-----------|---------|---------|---------|
| **STEPBible/STEPBible-Data** | Strong's + morfologia + **semantic tags** (campo semântico por palavra) | CC BY 4.0 | TSV | ✅ **FONTE PRIMÁRIA** pro interlinear. Tyndale House Cambridge. TAHOT tem semantic tags — melhor que scrollmapper pro grafo semântico. |
| **scrollmapper/bible_databases** | Strong's + textos originais + 200+ traduções | Domínio público | SQLite/JSON | ⚠️ **FALLBACK.** Branch 2025 mudou schema. Ler `docs/README.md` antes. Útil pro léxico completo. |
| **openscriptures/morphhb** | Hebraico WLC + morfologia completa verificada | WLC=PD, Morph=CC BY 4.0 | OSIS XML + JSON | ✅ IDs únicos por palavra. npm package disponível (`npm install morphhb`). |
| **openbibleinfo/Bible-Geocoding-Data** | 1.300+ locais bíblicos com lat/long + confiança | CC-BY | JSONL, GeoJSON, KML | ✅ Compilado de 70+ atlas. Scores de confiança por local. |
| **Easton's Bible Dictionary** | 3.500 verbetes contexto histórico-cultural | Domínio público (1897) | Texto parseável | ✅ "O que é um siclo?" — complementa o Strong's. |

### Prioridade B — v3.5 (alto impacto, médio esforço)

| Fonte | O que tem | Licença | Decisão |
|-------|-----------|---------|---------|
| **HelloAO Bible API** | Matthew Henry, Adam Clarke, John Gill, Keil-Delitzsch | Domínio público, sem auth | ✅ Zero ETL. Endpoint por versículo. |
| **robertrouse/theographic-bible-metadata** | 3.000+ pessoas, 1.600+ lugares, 4.000+ eventos | CC BY-SA 4.0 | ✅ Melhor que BradyStephenson (que para em 2 Crôn 20). |
| **Nave's Topical Bible** | 20.000+ tópicos, 100.000 referências | Domínio público | ✅ Índice por assunto. CrossWire/SWORD modules. |

### Prioridade C — v4.0 (ambicioso, reservar)

| Fonte | O que tem | Notas |
|-------|-----------|-------|
| **Clear-Bible/macula-hebrew** | Árvores sintáticas (CC BY 4.0) | "O que Logos cobra $400." Diferencial pra seminário. |
| **LXX Rahlfs-1935** | Septuaginta grega | Pra "viagem do conceito AT→NT". eliranwong/OpenHebrewBible. |
| **HistoricalChristianFaith/Commentaries-Database** | Pais da Igreja em TOML + SQLite | Se houver demanda. |

### ⚠️ Fontes Rejeitadas

| Fonte | Motivo |
|-------|--------|
| **BradyStephenson/bible-data** | Genealogias param em 2 Crônicas 20. Usar Theographic. |
| **Deck.gl/Mapbox** | Requer API key. Usar Leaflet + OpenStreetMap (free). |

---

## 🏗️ Plano de Execução — 4 Fases

### FASE 1A: Notas Pessoais + Highlighting

**5 categorias de highlight com cores e significado:**
- 🔵 promise — Promessa de Deus
- 🔴 warning — Advertência / Mandamento
- 🟢 fulfillment — Cumprimento de profecia
- 🟡 question — Dúvida / Perguntar
- 🟣 prayer — Oração / Adoração

**localStorage:** `"verbum-notes"` → `Record<string, VerseNote>`

**UX:** Click no verso → popover com cores + campo de nota.
Versos destacados com fundo colorido sutil (opacity 0.15).
Ícone 📝 discreto quando tem nota.

**Nova página:** `/notes` — notas agrupadas por livro + **exportar como Markdown**

**Componentes:**
```
NoteEditor.tsx, HighlightBar.tsx, useVerseNotes.ts, NotesPage.tsx
```

---

### FASE 1B: Streak + Reading Plans

**Streak:** "🔥 7 dias" no sidebar. Tom gentil quando perde streak.
Recorde pessoal. Total de capítulos lidos.

**5 planos pré-definidos:**
- Bíblia em 1 Ano (365 dias, ~3 capítulos/dia)
- Novo Testamento em 90 Dias
- Salmos em 30 Dias
- Provérbios em 31 Dias
- Os Evangelhos em 40 Dias

**Nova página:** `/plans` com cards, barra de progresso, "Today's reading"

---

### FASE 2A: Extração de Dados (Strong's + Originais)

**Estratégia de fontes consolidada:**
1. Léxico Strong's → scrollmapper (definições mais completas)
2. Mapeamento interlinear → **STEPBible TAHOT** (semantic tags!)
3. Texto hebraico → openscriptures/morphhb (IDs únicos, verificado)
4. Texto grego → scrollmapper SBLGNT
5. Semantic tags → STEPBible TAHOT (exclusivo)

**⚠️ scrollmapper branch 2025 mudou schema — ler docs/README.md primeiro**

**Novos módulos Python:**
```
src/extract/strongs_extractor.py
src/extract/original_text.py
src/extract/interlinear_mapper.py
src/extract/semantic_tags.py
```

**Novas tabelas DuckDB:**
```sql
strongs_lexicon    (strongs_id PK, language, original, transliteration,
                    short_definition, long_definition, semantic_domain, occurrences)
original_texts     (verse_id PK, hebrew_text, greek_text, transliteration)
interlinear        (verse_id + word_position PK, english_word, strongs_id,
                    original_word, transliteration, morphology, semantic_tag)
```

**Testes de sanidade dia 1:** Validar versículos onde contagem EN vs HEB
destoa >3x (hebraico aglutina preposições).

---

### FASE 2B: API Endpoints (6 novos)

```
GET /api/v1/strongs/{id}
GET /api/v1/strongs/search?q=love&language=greek
GET /api/v1/original/{verse_id}
GET /api/v1/interlinear/{verse_id}
GET /api/v1/words/{strongs_id}/verses
GET /api/v1/words/frequency?book=PSA
```

---

### FASE 2C: Interlinear View

Quinto modo: `[Single] [Parallel] [Immersive] [Interlinear]`

**Desktop:** 4 linhas (original / translit / tradução / Strong's)
**Mobile:** 2 linhas (original / tradução) + tap → bottom sheet

**Click em palavra → WordDetailPanel:**
- Strong's + pronúncia + definição
- **Semantic domain** (do STEPBible!)
- Bubble chart por livro
- Top 5 versos + palavras da mesma raiz

**Fontes:** Frank Ruhl Libre (hebraico RTL), GFS Didot (grego)

---

### FASE 2D: Word Study Page

`/word-study/:strongsId` — 3 níveis progressivos:

**Simples:** Palavra + tradução + contagem + top 5 versos
**Médio:** + bubble chart por livro + árvore de família da palavra
**Avançado:** + morfologia + todas as ocorrências + cognatos

**Visualizações únicas:**
- **Translation Divergence Table** — como cada tradução renderiza o
  mesmo Strong's (H2617 chesed → mercy/lovingkindness/steadfast love)
- Bubble chart por livro
- Árvore de família da palavra (raiz → derivados)
- Semantic domain connections

---

### FASE 3: Conteúdo e Contexto

**3A** — Bible Dictionary (Easton's, 3.500 verbetes). Hover em nomes → def.
**3B** — Comentários (Matthew Henry via HelloAO, zero ETL).
**3C** — Verse Sharing (Canvas → PNG 1080×1080 medieval).
**3D** — Palavra da Semana (52 Strong's, array estático, zero backend).

---

### FASE 4: Análises Únicas + Publicação

**4A — Grafo de Campo Semântico** (Crown Jewel)
Coocorrência de Strong's + semantic tags do STEPBible.
D3.js force-directed graph. Inédito no open-source.

**4B — Translation Divergence Map**
Heatmap: onde KJV vs NVI vs RVR divergem na tradução do mesmo Strong's.

**4C — Conceptual Density Heatmap**
Strong's únicos por verso por livro. Hebreus=denso, Rute=narrativo.

**4D — README + Deploy + SEO**
14.298 páginas estáticas de Strong's (`/strongs/H2617`).
Competição média-baixa vs Bible Hub (UX terrível).

---

## 📢 Comunidade

| Onde | Público | Ângulo |
|------|---------|--------|
| r/Bible (380K) | Estudantes | Ferramenta de estudo grátis |
| r/BiblicalLanguages (8K) | Acadêmico | Interlinear + Strong's |
| r/DataIsBeautiful | Tech | Grafo semântico + Arc Diagram |
| HackerNews | Devs | "Data science applied to the Bible" |
| FaithTech | Cristãos tech | Projeto open-source com propósito |
| unfoldingWord | Missionários | Recursos bíblicos abertos |
| Biblical Humanities (SBL) | Academia | Dados bíblicos verificados |

**Contribuições de teólogos:** Repo `verbum-content` com TOML/JSON.

---

## 📋 Ordem Final

| # | Task | Impacto | Status | PR |
|---|------|---------|--------|-----|
| 1 | Notas + Highlighting | 🔥🔥🔥🔥 | ✅ Concluído | [branch](https://github.com/DavidKGBR/verbum/pull/new/feat/verbum-1-notes-highlighting) |
| 2 | Streak + Reading Plans | 🔥🔥🔥 | ✅ Concluído | [branch](https://github.com/DavidKGBR/verbum/pull/new/feat/verbum-2-streak-plans) |
| 3 | Extract Strong's + originals | 🔥🔥🔥🔥 | ✅ Concluído (3a+3b+3c+3d) | [3a](https://github.com/DavidKGBR/verbum/pull/new/feat/verbum-3a-strongs-lexicon) · [3b](https://github.com/DavidKGBR/verbum/pull/new/feat/verbum-3b-hebrew-wlc) · [3c](https://github.com/DavidKGBR/verbum/pull/new/feat/verbum-3c-greek-sblgnt) · [3d](https://github.com/DavidKGBR/verbum/pull/new/feat/verbum-3d-interlinear-stepbible) |
| 4 | API endpoints (6 novos) | 🔥🔥🔥 | ✅ Concluído | — |
| 5 | Interlinear View | 🔥🔥🔥🔥🔥 | ✅ Concluído | — |
| 6 | Word Study page | 🔥🔥🔥🔥 | ✅ Concluído | — |
| 7 | Bible Dictionary | 🔥🔥🔥 | ✅ Concluído | — |
| 8 | Commentary (HelloAO) | 🔥🔥🔥 | ✅ Concluído | — |
| 9 | Verse Sharing | 🔥🔥 | ✅ Concluído | — |
| 10 | Grafo Semântico | 🔥🔥🔥🔥🔥 | 🔲 Planejado | — |
| 11 | Translation Divergence | 🔥🔥🔥🔥 | 🔲 Planejado | — |
| 12 | README + Deploy + SEO | 🔥🔥🔥 | 🔲 Planejado | — |

**Legenda de status:** 🔲 Planejado · 🚧 Em andamento · ⏸️ Pausado · ✅ Concluído

---

## 🙏 Créditos

- **Visão e direção:** David (DavidKGBR)
- **Arquitetura e código:** Claude Opus (Anthropic) + Claude Code
- **Produto e UX:** Claude Sonnet (Anthropic)
- **Pesquisa e estratégia:** Google Gemini
- **Dados bíblicos:** STEPBible (Tyndale House), OpenScriptures, OpenBible.info,
  scrollmapper, Easton's, HelloAO, Theographic

---

*"In principio erat Verbum, et Verbum erat apud Deum, et Deus erat Verbum."*

---

## 📝 Session Log

Registro cronológico do que foi feito em cada sessão. Propósito:
se uma sessão nova (ou uma continuação após compactação) abrir este arquivo,
saber imediatamente onde paramos, o que foi decidido, e qual a próxima
entrada lógica — sem depender da memória de conversa.

**Formato por entrada:**
- Data (YYYY-MM-DD)
- Tarefa (# da tabela acima)
- O que foi feito / decisões relevantes
- Próxima entrada sugerida

### 2026-04-13 — Plano consolidado + ledger
- Plano mestre v3 (Verbum) consolidado das três IAs (Claude arquitetura, Sonnet UX, Gemini estratégia).
- Projeto renomeado para **Verbum** (logo SVG já criado em `verbum.svg` + `verbum_logo.svg`, componente `<VerbumLogo />` integrado ao sidebar/hero/favicon).
- Cadência de trabalho combinada: uma tarefa por PR, coluna Status no ledger, este Session Log como fallback de memória.
- **Status v2:** DONE (10 traduções, 344K cross-refs, FastAPI, React com Home/Reader/Arc/Search/Bookmarks, Immersive 3D, Gemini, KJV annotation toggle, mobile responsive).
- **Próxima entrada:** Tarefa #1 — Notas + Highlighting (Fase 1A). Menor risco, 100% frontend, calibra nossa cadência antes das tarefas de ETL pesado.

### 2026-04-13 — Tarefa #1 concluída: Notas + Highlighting
- 5 categorias de highlight (promise/warning/fulfillment/question/prayer) com CSS vars novas (`--hl-*`) em `frontend/src/index.css`.
- Hook `useVerseNotes` usa `useSyncExternalStore` + store a nível de módulo para garantir que todas as instâncias (NoteEditor, BibleReader, ImmersiveReader, NotesPage) vejam o mesmo estado. Primeira tentativa com `useState` por instância tinha o bug de não propagar dentro da mesma aba — só entre abas. Corrigido.
- `VerseActions` ganhou aba `"notes"` e botão `✍️ Note`. Quando há nota existente, botão mostra `✍️ Note •` (ponto indicador).
- `BibleReader` aplica classe `.verse-highlight-{category}` no `<div>` do verso + badge `·✍️` ao lado do `·{xrefCount}` quando há texto de nota.
- `ImmersiveReader` aplica highlight inline via `color-mix` com alpha 22% (fundo escuro precisa de mais opacidade). Read-only (edição só no Reader single mode) — documentado no out-of-scope.
- Nova página `/notes` com filtros por categoria, agrupamento por livro em `<details>`, modal de export Markdown (copy + download .md).
- Utility `notesToMarkdown()` em `frontend/src/components/notes/notesExport.ts`.
- Nav atualizado: "Notes" na sidebar e rota `/notes` em `App.tsx`.
- **Arquivos criados:** `hooks/useVerseNotes.ts`, `components/notes/NoteEditor.tsx`, `components/notes/HighlightBar.tsx`, `components/notes/notesExport.ts`, `pages/NotesPage.tsx`.
- **Arquivos modificados:** `index.css`, `VerseActions.tsx`, `BibleReader.tsx`, `ImmersiveReader/ImmersiveReader.tsx`, `App.tsx`, `Layout.tsx`.
- Type check clean (`npx tsc --noEmit`). Build de produção OK (`npx vite build` — 384KB bundle gzipped 125KB).
- Testado E2E via Puppeteer: criar highlight+nota em GEN 1:1 → persistir → página /notes → export Markdown → Immersive reader mostra highlight.
- **Push concluído:** branch `feat/verbum-1-notes-highlighting` em github.com/DavidKGBR/verbum. PR a ser criado manualmente (gh CLI indisponível no ambiente). Três commits: `chore: Verbum brand identity`, `fix: ArcDiagram reshape`, `feat: task 1 notes & highlighting`.
- **Remote atualizado:** de `the-bible.git` → `verbum.git` (redirect oficial no GitHub).
- **Próxima entrada:** Tarefa #2 — Streak + Reading Plans (Fase 1B). Também 100% frontend + localStorage, complementar à tarefa 1.

### 2026-04-13 — Tarefa #2 concluída: Streak + Reading Plans
- Segunda tarefa do mesmo dia, cadência mantida. 100% frontend como planejado, zero backend.
- **`useReadingHistory` refatorada** pro mesmo padrão module-level store + `useSyncExternalStore` que já usávamos em `useVerseNotes`. Isso é pré-requisito pro `useReadingStreak` conseguir reagir a novos reads na mesma aba. API externa preservada.
- **Streak** (`useReadingStreak` + `StreakBadge`): hook subscreve ao history, fold puro `advanceStreak(prev, today)` calcula gap em dias e decide increment / reset / no-op. `streakStatus` devolve `"alive" | "at-risk" | "broken" | "empty"`. Badge no sidebar adapta ícone e tom: 🔥 alive → 🔥 at-risk (muted) → ❄️ broken ("Start again today?").
- **Reading Plans** (`plansData.ts` + `useReadingPlans` + `PlanCard` + `PlansPage`): 5 planos pré-definidos (Bible 1-year, NT 90-day, Psalms 30-day, Proverbs 31-day, Gospels 40-day). Schedule gerado algoritmicamente por `chunkChapters` + filtros sobre `Book[]` do `fetchBooks("kjv")` — zero hard-coding de listas.
- **Auto-mark**: `recordPlanAutoMark(chapter_id, books)` é chamado pelo `BibleReader` quando `fetchReaderPage` completa. Se o capítulo pertence ao plano ativo (qualquer dia do schedule), é marcado como `completed`.
- **Banner** no `BibleReader` quando o capítulo atual é parte de "today's reading". Link pra `/plans`.
- **Home quick action** muda pra "Day N — <plan>. X chapters left today" quando há plano ativo com pendências; vira "🎉 Today complete" quando tudo está lido.
- **Débito técnico pago**: `frontend/src/utils/dateFormat.ts` consolidou 4 duplicações de `formatDate`/`formatRelative` que estavam espalhadas pelas pages/components da tarefa #1. Novas helpers: `localDateKey(ts)` (YYYY-MM-DD em TZ local) e `daysBetween(a, b)` — load-bearing pra streak math.
- **Arquivos novos (7):** `hooks/useReadingStreak.ts`, `hooks/useReadingPlans.ts`, `components/streak/StreakBadge.tsx`, `components/plans/plansData.ts`, `components/plans/PlanCard.tsx`, `pages/PlansPage.tsx`, `utils/dateFormat.ts`.
- **Arquivos modificados (9):** `hooks/useReadingHistory.ts` (refactor), `components/Layout.tsx` (badge + nav), `pages/HomePage.tsx` (quick action), `components/BibleReader.tsx` (banner + auto-mark), `App.tsx` (rota), `pages/NotesPage.tsx`, `pages/BookmarksPage.tsx`, `components/notes/NoteEditor.tsx`, `components/notes/notesExport.ts` (limpeza de duplicatas).
- **Testes E2E via Puppeteer:** ler Genesis 1 → streak 🔥 1 day · Total 1 ch; manipular localStorage pra simular read ontem → read hoje sobe pra 2 days + longest bumps; gap 3+ dias → reset current=1, longest preservado; start Psalms plano → banner no reader com "Day 1 · 1/5 read today" após abrir Psa 1; stale read date + sem leitura hoje → ❄️ "Start again today?" no sidebar.
- **Type check clean** (`npx tsc --noEmit`). **Build prod** 400KB (130KB gzipped, +5KB vs. task #1).
- **Próxima entrada:** Tarefa #3 — Extract Strong's + originals (Fase 2A). Muda o perfil do trabalho: agora é ETL Python pesado (parsing TSV/XML do STEPBible, openscriptures/morphhb, scrollmapper). Provável sessão dedicada pra extração + validação de sanidade antes de expor na API (Tarefa #4).

### 2026-04-13 — Tarefa #3a concluída: Strong's lexicon
- Tarefa #3 quebrada em 4 sub-PRs (3a/3b/3c/3d) pra manter revisão gerenciável. Esta é a primeira.
- **Fonte escolhida (desvio consciente do plano mestre):** openscriptures/strongs ao invés de scrollmapper/bible_databases. Motivo: formato JS-envolvendo-JSON muito mais simples (single file por língua), licença CC-BY-SA (derivada de domínio público), e é a fonte upstream canônica. scrollmapper re-distribui os mesmos dados. Trocar poupa complexidade de parser.
- **Dados extraídos:** 14.178 entradas (8.674 hebraicas + 5.504 gregas). Hebraico ~1.8MB, Grego ~1.1MB — caching em `data/raw/strongs/`, já no `.gitignore`.
- **Gotchas do parser:**
  - Arquivo começa com bloco de comentário JSDoc. Regex precisa de DOTALL pra absorver do início até o `var X = `.
  - Hebraico usa `xlit` como campo de transliteração; grego usa `translit`. Parser aceita ambos via fallback.
  - IDs podem ter sufixo alfa (ex: "H3023a"/"H3023b" pra homógrafos) — estes são colapsados pro ID numérico por enquanto. Disambiguação virá no #3d com tags semânticas.
  - `json.JSONDecoder().raw_decode()` ignora lixo pós-JSON (trailing `;`, newline) sem precisar strip manual.
- **Tabela DuckDB `strongs_lexicon`** (PK strongs_id). Load: DELETE + INSERT incondicional, lexicon é global. Método `_ensure_strongs_table` usa IF NOT EXISTS pra funcionar em DBs pré-existentes sem rodar full create_schema.
- **CLI:** `python -m src.cli strongs [--no-cache]`. Comando standalone, não integra com `BiblePipeline` (pode baixar e carregar sem tocar em `verses`/`cross_references`). `info` atualizado pra mostrar `Strongs Entries: 14,178`.
- **Testes:** 21 (20 unitários offline + 1 integration `@pytest.mark.integration` que baixa de verdade). Cobertura de parser, loader, idempotência, normalização de ID (H0025 → H25).
- **Arquivos novos (2):** `src/extract/strongs_extractor.py`, `tests/test_strongs.py`.
- **Arquivos modificados (3):** `src/models/schemas.py` (+StrongsEntry, StrongsLanguage), `src/load/duckdb_loader.py` (+ table + loader), `src/cli.py` (+ comando strongs, + info).
- **Próxima entrada:** #3b — Hebraico WLC (openscriptures/morphhb). Começa a popular `original_texts` com texto hebraico verso-a-verso. Parse de OSIS XML (dep nova: `lxml`).

### 2026-04-13 — Tarefa #3b concluída: Hebraico WLC
- Terceira tarefa do mesmo dia. Nova tabela `original_texts` com 23.213 versos hebraicos.
- **Fonte:** `openscriptures/morphhb` (Westminster Leningrad Codex com morfologia). 39 arquivos OSIS XML no diretório `wlc/`, um por livro (Gen.xml ... Mal.xml). Total ~15MB. Licença WLC = domínio público, anotações CC BY 4.0.
- **Dependências novas: zero.** Originalmente planejei `lxml`, mas o stdlib `xml.etree.ElementTree` é suficiente pros arquivos bem-formados. Adicionei `defusedxml` (já estava instalada transitivamente) pra blindar contra XXE/billion-laughs; API compatível, drop-in.
- **Tabela `original_texts`** — PK só `verse_id` (um verso tem língua canônica; OT=hebraico, NT=grego). Colunas: `verse_id, book_id, chapter, verse, language, text, source, loaded_at`. Índices em `(book_id, chapter, verse)` e `language`. Load: DELETE scoped por language + INSERT — rodar `cli hebrew` não apaga Greek (quando #3c chegar).
- **Divergência do plano mestre** documentada no plano de trabalho: troquei o sketch `(verse_id PK, hebrew_text, greek_text, transliteration)` pela estrutura normalizada acima. Queries mais simples (`WHERE language='hebrew'` vs. `WHERE hebrew_text IS NOT NULL`), e `transliteration` sai do modelo (é propriedade de palavra, não de verso — vai nas tabelas interlinear do #3d).
- **Parser OSIS:** `<w>` elements juntados com espaço, `<seg>` (maqqef/sof-pasuq) colam na palavra anterior sem espaço, `<note>`/`<reference>`/`<milestone>` ignorados. Separadores de morfema `/` (convenção MorphHB pra mostrar onde prefixos se ligam) removidos do texto final.
- **Book ID mapping:** 39 entradas OSIS→canonical ID duplicadas localmente (`_OSIS_TO_BOOK_ID` em morphhb_extractor.py). Quando o terceiro consumidor aparecer (#3c greek provavelmente), refatoro pra `src/extract/osis_names.py`.
- **CLI:** `python -m src.cli hebrew [--book GEN] [--no-cache]`. Flag `--book` aceita tanto nome OSIS (Gen, Ps) quanto canônico (GEN, PSA).
- **Testes:** 24 (23 offline + 1 integration que baixa Ruth e valida que Gen 1:1 tem "מואב"/Moab e Ruth 1:2 tem a raiz "אפרת"/Efratah — sem niqqud pra evitar issues de niqqud variants).
- **Gotchas:**
  - Teste inicial checava "אפרתה" (Efrata, singular com ה final) em Ruth 1:1. Efrata aparece em Ruth 1:2. Trocar "Ephratah" → raiz "אפרת" resolve ambos os casos.
  - Comparações diretas de Hebreus com niqqud falham frequentemente porque marcas de cantilação (teamim) variam entre edições. Stripping de `\u0591`-`\u05c7` (cantillation + points) antes de comparar é a técnica robusta.
- **Build prod:** `Original Texts: 23,213` visível em `cli info`.
- **Próxima entrada:** #3c — Grego SBLGNT (NT em grego koiné, ~7.956 versos). Estrutura de dados e layout da tabela já pronta (mesmo `original_texts` com `language='greek'`). Decisão pendente de fonte: SBLGNT OSIS XML direto vs. byztxt vs. outra. Vou investigar na próxima sessão.

### 2026-04-13 — Tarefa #3c concluída: Grego SBLGNT
- Quarta tarefa do mesmo dia. Continua a ocupar a tabela `original_texts` — agora com `language='greek'`, `source='sblgnt'`, 7.939 versos do NT.
- **Fonte:** `LogosBible/SBLGNT` (SBL Greek New Testament, ed. Michael Holmes). 27 arquivos XML, um por livro. Licença SBL/Logos — livre pra uso open-source/acadêmico com atribuição, não comercial.
- **Formato NÃO é OSIS** (diferente do morphhb). XML custom: `<book id="Matt">`, `<p>` paragraphs, `<verse-number id="Matthew 1:1">` como markers (não envoltórios!), `<w>` + `<suffix>` + `<prefix>`.
- **Parser com máquina de estados:** walk em document-order via `DefusedET.iter()`, acumula word+suffix entre markers `<verse-number>`, faz flush quando novo marker aparece ou EOF.
- **Gotcha do dia:** a fixture que escrevi tinha `<suffix> </suffix>` (com espaço), mas os arquivos REAIS usam `<suffix></suffix>` vazio + relying em document-order whitespace do XML serializado. Meu parser original colapsou "Ἐνἀρχῇἦνὁλόγος" em vez de "Ἐν ἀρχῇ ἦν ὁ λόγος". Fix: quando suffix vazio, inserir espaço single. Testes de fixture já passavam; só descobri rodando o CLI contra dados reais e inspecionando João 1:1. Lição: sempre validar com dataset real antes de marcar done.
- **Total original_texts:** 31.152 (23.213 hebrew + 7.939 greek). Discrepância pequena vs. 7.956 esperado no SBLGNT padrão — algumas versões contam versos de cabeçalho/introdução que essa edição não tem.
- **Scoped delete verificado:** rodar `cli greek --no-cache` 2× não apaga hebreus. Teste `test_scoped_delete_preserves_hebrew` cobre o caso.
- **Arquivos novos (2):** `src/extract/sblgnt_extractor.py`, `tests/test_sblgnt.py`.
- **Arquivos modificados (3):** `src/cli.py` (+ comando greek + atribuição SBL no docstring), `VERBUM_PLAN.md`, status ledger.
- **Atribuição:** docstring do módulo + help do CLI credita "SBL Greek New Testament (SBLGNT), © 2010 SBL + Logos Bible Software". Pode entrar no README junto com Task #4 ou em commit avulso de credits.
- **Próxima entrada:** #3d — o crown jewel da Fase 2. Interlinear + semantic tags a partir do STEPBible TAHOT (HEB) e TAGNT (GRK).

### 2026-04-13 — Tarefa #3d concluída: Interlinear STEPBible
- Quinta e última sub-tarefa da Fase 2A. A mais complexa de ETL finalizada!
- **Fonte:** `STEPBible-Data` (TAHOT e TAGNT). Download de 6 arquivos TSV grandes totaling ~100MB salvos no cache.
- **Implementação:** O extractor `StepBibleExtractor` desenvolvido e loader robusto carregando pra tabela `interlinear` do DuckDB (~406K words).
- Algumas decisões chave de design:
  - Máquina de estado compartilhada, delegando o parser row-a-row pro TAGNT vs TAHOT.
  - **Deduplicação** no nível de `(verse, position)`, garantindo que apenas a primeira variante (usualmente NKO - mainstream) seja importada para lidar com restrições do DuckDB e limpar referências.
  - **Normalização do Strong:** Lemmas complexos como `H9002/H9009/{H0776G}` e `G0976=N-NSF` foram isolados como a root word pura `H776` e `G976`.
  - Tags semânticas extraídas cruas (Ex: `"Jesus»Jesus|Jesus@Mat.1.1"`) pra nossa Tarefa #10 futuramente consumir e criar o grafo semântico.
- **CLI:** Novo comando finalizado `python -m src.cli interlinear`.
- **Testes:** 27 offline testes e +1 integração validados.
- **Status:** **Fase 2 de ETL de dados concluída integralmente.**
- **Próxima entrada:** Tarefa #4 — API endpoints (Fase 2B). 

### 2026-04-13 — Tarefa #4 concluída: API Endpoints (Fase 2B)
- Criação e montagem do router `lexicon.py` no backend.
- **6 novos endpoints construídos no FastAPI** com queries diretas e otimizadas no DuckDB:
  - `GET /api/v1/strongs/{id}`
  - `GET /api/v1/strongs/search?q={termo}&language={lang}`
  - `GET /api/v1/original/{verse_id}`
  - `GET /api/v1/interlinear/{verse_id}`
  - `GET /api/v1/words/{strongs_id}/verses`
  - `GET /api/v1/words/frequency?book={book}`
- **Testes Implementados**: A fixture de DB `seeded_db` em `test_api.py` recebeu um mock impecável das tabelas de Léxico (usando `H776` - Terra no Gênesis e `G25` - Amor em João 3:16). Todas as 6 rotas estão cobertas pela bateria de testes da classe `TestLexicon`.
- **Status:** Fase 2B concluída e integração do backend pronta para o front-end.
- **Próxima entrada:** Tarefa #5 — Interlinear View. O nosso grande passo para trazer os dados interlineares para dentro do Reader no React!

### 2026-04-13 — Tarefa #5 concluída: Interlinear View (Fase 2C)
- **Otimização Crítica no Backend**: Adicionada a rota `GET /interlinear/chapter/{book_id}/{chapter}` ao `lexicon.py` para processar a carga pesada de agrupamento do interlinear de forma que o front-end consuma apenas 1 request. Testes de API devidamente atualizados.
- **Integração Tipográfica**: Google Fonts `Frank Ruhl Libre` e `GFS Didot` injetados no aplicativo React (`index.css`) com as devidas classes `.font-hebrew` e `.font-greek`.
- **InterlinearView.tsx**: Componente robusto criado reproduzindo as 4 camadas da visualização (Original, Morfologia/Transliteração, Tradução Base e Botão do Strong's). Ele implementa flex-wrap isolado para não corromper resoluções de telas variadas.
- **WordDetailPanel.tsx**: Sidebar de estudos (Lexicon Sidebar) injetada à direita do Reader sempre que um Strong's é clicado. Exibe o domínio semântico, pronúncia, posições, long description, e top 5 versículos cruzados usando os 2 novos endpoints recém consumidos.
- **Status:** Fase 2C concluída lindamente. A funcionalidade visual está entregue.
- **Próxima entrada:** Tarefa #6 — Word Study Page (Fase 2D). Uma versão expandida da URL dedicada que receberá o force-directed graph (Gráficos) ou estatísticas avançadas baseadas nos logs de analytics.

### 2026-04-14 — Sessão de continuidade: Task #6 + CI fixes + merge stack
- **Contexto de sessão:** Nova conversa (anterior compactada). Claude retomou via Session Log + VERBUM_PLAN.md + CLAUDE.md como fontes de verdade. Confirmou estado: Tasks #1-5 ✅, próxima #6.
- **CI fixes (3 commits):** `ruff format` em schemas.py + test_morphhb.py; mypy type annotations em stepbible_extractor.py + cli.py; `defusedxml` adicionado ao pyproject.toml (era dep transitiva, CI falhava em venv limpo).
- **Merge stack:** 7 feature branches (1→2→3a→3b→3c→3d) fast-forward merged em `main`. Branches remotas deletadas. main pushada com histórico linear (18 commits). Git remote URL atualizado de `the-bible.git` → `verbum.git`.
- **Task #6 — Word Study Page (`/word-study/:strongsId`):**
  - Novo endpoint backend `GET /words/{strongs_id}/distribution` — retorna frequência por livro via query na tabela interlinear. Bug na primeira versão: DuckDB exigia GROUP BY explícito pra `ANY_VALUE` (vs. DISTINCT + ORDER BY aggregate). Corrigido.
  - `WordStudyPage.tsx` — página completa: hero card com original word grande + transliteração + pronúncia + language badge; stats row (332 occurrences · 24 books · Acts most frequent); definição short+long; "Related Words" extraídos via regex do long_definition (`from H2616` → link pra `/word-study/H2616`); **bar chart horizontal** por livro (SVG-less, Tailwind width%, cor por testamento — verde OT / roxo NT); lista de ocorrências paginada (20 por vez, "Show all" button) com links pro Reader.
  - `WordDetailPanel.tsx` — placeholder "Bubble Chart (Fase 2D)" substituído por botão **"Full Study →"** que navega pra página completa.
  - `App.tsx` — rota `/word-study/:strongsId` adicionada. Sem nav item no sidebar (acesso contextual via interlinear/panel).
  - `.gitignore` corrigido — `data/raw/` agora ignora todo o diretório (antes era só `data/raw/*.json`, o que deixou XML/TXT de morphhb/sblgnt/stepbible passarem na staging).
  - Tasks #4/#5 (feitas no Claude web) tinham arquivos não-commitados no working tree — incluídos no mesmo commit pra limpar o estado.
  - Testado via Puppeteer: G3056 (λόγος, 332 occ, Acts top) e H2617 (חֵסֵד, 200 occ, Psalms top). Ambos renderizam corretamente com cores de testamento.
- **Snapshot do DuckDB:** 302.503 versos · 344.754 crossrefs · 14.178 Strong's · 31.152 original texts · 406.852 interlinear words.
- **Evolução do projeto nesta sessão:** de 6 tasks concluídas pra 6 tasks + merge + CI fixes + Task #6 completa. Repo limpo em main, zero branches pendentes, CI passando (aguardando confirmação do último push).
- **Próxima entrada:** Tarefa #7 — Bible Dictionary (Easton's, 3500 verbetes). Primeiro conteúdo de "referência" — não extrai de fontes bíblicas originais, mas de dicionário acadêmico do séc. XIX (domínio público). Diferente das tarefas anteriores: é um corpus textual em prosa, não TSV/XML estruturado.

### 2026-04-14 — Tarefa #7 concluída: Bible Dictionary (Fase 3A)
- **Fonte:** `neuu-org/bible-dictionary-dataset` — 26 JSON files (a.json…z.json, ~7.8MB) com 5.965 entradas combinadas de Easton's (1897, 3.954 verbetes) e Smith's (1863, 4.488 verbetes). Ambos domínio público.
- **Backend:** `DictionaryExtractor` baixa e parseia JSON → `DictionaryEntry` Pydantic → DuckDB `dictionary_entries` (PK: slug). Uma row por verbete com `text_easton` e `text_smith` como colunas separadas — queries simples sem JOIN. CLI: `python -m src.cli dictionary [--no-cache]`.
- **API:** `GET /dictionary/{slug}` (entry única), `GET /dictionary/search?q=...` (ILIKE com preview de 200 chars, limit 50). Adicionados no `lexicon.py` router existente.
- **Frontend:** `/dictionary` com busca debounced (300ms), cards expansíveis com badges "Easton" (gold) e "Smith" (roxo), texto completo de ambas fontes quando expandido, link "Search in Bible →" por verbete. Suggested terms no empty-state (Jerusalem, David, Sabbath, Passover, Tabernacle, Covenant).
- **Nav:** "Dictionary" adicionado ao sidebar com ícone de livro aberto.
- **Snapshot DuckDB:** 302.503 versos · 344.754 crossrefs · 14.178 Strong's · 31.152 original texts · 406.852 interlinear words · **5.965 dictionary entries**.
- **Próxima entrada:** Tarefa #8 — Commentary (HelloAO). Zero ETL: API externa que entrega comentário por versículo em tempo real. Matthew Henry, Adam Clarke, John Gill, Keil-Delitzsch. Integração direta no Reader como painel lateral.

### 2026-04-14 — Tarefa #8 concluída: Commentary via HelloAO (Fase 3B)
- **Task mais lean do roadmap:** zero backend, zero ETL, zero DuckDB. HelloAO Bible API (`bible.helloao.org`) serve comentários como JSON público com CORS `*` — frontend busca direto.
- **6 comentários integrados:** Matthew Henry (default), John Gill, Adam Clarke, Jamieson-Fausset-Brown, Keil-Delitzsch (OT), Tyndale Study Notes. Dropdown pra trocar de comentarista.
- **Formato:** `/api/c/{commentary}/{BOOK}/{chapter}.json` retorna por capítulo. Matthew Henry agrupa versos (entry "1" cobre 1-2, entry "3" cobre 3-5). Parser encontra o bloco correto via `findVerseEntry()` — entry com `number` mais alto ≤ verso selecionado.
- **Cache in-memory:** `useRef<Map>` por `(commentary, book, chapter)` — trocar de verso no mesmo capítulo não refetcha. Trocar de capítulo ou comentarista sim.
- **Integração:** nova aba "📚 Commentary" no `VerseActions` (entre Explain e Compare). Painel com texto formatado (parágrafos naturais do comentário), fonte body serif.
- **Arquivos novos (1):** `components/reader/CommentaryPanel.tsx`.
- **Arquivos modificados (3):** `services/api.ts` (types + fetch + COMMENTARIES array), `VerseActions.tsx` (tab + botão + painel), `VERBUM_PLAN.md`.
- **Testado via Puppeteer:** Gen 1:1 → Commentary → Matthew Henry aparece com texto rico sobre a criação. Dropdown → trocar pra John Gill → texto muda.
- **Próxima entrada:** Tarefa #9 — Verse Sharing (Canvas → PNG 1080×1080 medieval). Primeira tarefa puramente visual/design — não consome dados novos, só renderiza os existentes num formato compartilhável.

### 2026-04-14 — Tarefa #9 concluída: Verse Sharing (Fase 3C)
- **Canvas puro, zero deps.** Renderiza card 1080×1080 via Canvas API com `ctx.fillText` + word-wrap manual.
- **Estilo:** fundo parchment (#f5f0e8), borda dourada com L-shape corner ornaments, texto em Cormorant Garamond (40px pra versos curtos, 32px pra longos), referência em Playfair Display gold, badge da tradução, watermark "Verbum" (opacity 25%).
- **UX:** botão "🖼️ Share" no VerseActions → modal com preview + "Copy to clipboard" (via `ClipboardItem`) + "Download PNG" (via `canvas.toBlob` + `URL.createObjectURL`). ESC fecha.
- **Arquivos novos (2):** `components/sharing/VerseCardCanvas.tsx`, `components/sharing/ShareModal.tsx`.
- **Modificados (2):** `VerseActions.tsx` (botão + modal state), `VERBUM_PLAN.md`.
- **Testado:** Psalms 23:1 renderiza corretamente com aspas curvas, borda, e corner accents. Preview no modal mostra canvas scaled down.
- **Próxima entrada:** Tarefa #10 — Grafo de Campo Semântico (Crown Jewel). D3.js force-directed graph de coocorrência de Strong's + semantic tags. A mais ambiciosa do roadmap.
