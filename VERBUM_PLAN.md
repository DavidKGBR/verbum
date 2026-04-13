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
| 1 | Notas + Highlighting | 🔥🔥🔥🔥 | ✅ Concluído | _local_ |
| 2 | Streak + Reading Plans | 🔥🔥🔥 | 🔲 Planejado | — |
| 3 | Extract Strong's + originals | 🔥🔥🔥🔥 | 🔲 Planejado | — |
| 4 | API endpoints (6 novos) | 🔥🔥🔥 | 🔲 Planejado | — |
| 5 | Interlinear View | 🔥🔥🔥🔥🔥 | 🔲 Planejado | — |
| 6 | Word Study page | 🔥🔥🔥🔥 | 🔲 Planejado | — |
| 7 | Bible Dictionary | 🔥🔥🔥 | 🔲 Planejado | — |
| 8 | Commentary (HelloAO) | 🔥🔥🔥 | 🔲 Planejado | — |
| 9 | Verse Sharing | 🔥🔥 | 🔲 Planejado | — |
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
- **Pendente antes do PR:** commit + push. Usuário pode querer revisar visualmente primeiro.
- **Próxima entrada:** Tarefa #2 — Streak + Reading Plans (Fase 1B). Também 100% frontend + localStorage, complementar à tarefa 1.
