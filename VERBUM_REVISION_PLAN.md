# 🧹 VERBUM — Plano de Revisão (Pré-Launch)

> **Status:** Bloqueador do `VERBUM_V1_LAUNCH_PLAN.md`.
> **Origem:** Auditoria visual do David em 14 abril 2026 — 14 bugs reportados em ~10 superfícies diferentes.
> **Diagnóstico:** A i18n da Fase 5 cobriu o **chrome do app** (632 chaves: botões, labels, navegação). Os **dados de domínio** (nomes próprios, descrições, eventos curados, jornadas, comparisons, devotional themes) continuam em inglês porque vivem em JSONs estáticos e tabelas DuckDB que nunca foram processadas pela passagem de i18n.
> **Janela:** ~9 sessões bloqueantes + batches incrementais antes do início do `VERBUM_V1_LAUNCH_PLAN.md` (sessão #2 do launch plan passa a ser pós-revisão).
>
> **Decisões já tomadas com o David (15 abril 2026):**
> - **Emojis nos cards** (Semantic Explorer, etc.): substituir por **SVGs do design system** (mesma família visual da Home), não manter os emojis.
> - **Conteúdo longo nos JSONs estáticos** (`semantic_genealogy.json`, `open_questions.json`, etc.): usar **arquivos paralelos** `*_pt.json` / `*_es.json` em vez de campos `_pt`/`_es` no original. Mantém arquivos legíveis e diff limpo por idioma.

---

## Por que essa revisão existe — e por que não pode ser pulada

O Verbum, hoje, **parece traduzido** porque os menus, sidebar, headers e botões aparecem em PT/ES. Mas no momento em que o usuário PT-BR clica em qualquer página de conteúdo:

- `/devotional` mostra "Daily Reading", "Reflection on...", todos em inglês
- `/people` mostra "Moses · Leader of Israel's exodus from Egypt..."
- `/places` mostra "Egypt"
- `/timeline` mostra "Birth of Terah · Patriarchs · Participantes: terah_2841, nahor_2142"
- `/compare` mostra "Baptism of Jesus" mesmo com NVI selecionada
- `/bookmarks` está inteiro em inglês
- `/dictionary` busca "Esther" em PT e retorna entradas em inglês
- `/semantic-explorer` mostra emojis hardcoded e tem caixa de busca fora do tema

**Lançar nesse estado mata a credibilidade do produto exatamente no público mais valioso (PT-BR), que é onde o vácuo de mercado é maior.** Um único screenshot tipo "Moses · Leader of Israel's exodus..." em comunidade de seminaristas brasileiros volta como meme negativo.

Esta revisão é literalmente arrumar a casa antes de abrir a porta.

---

## Categorias do problema (todas as 14 ocorrências mapeadas)

### A. Trocador de idioma usa bandeiras em vez de nomes

**Origem:** `frontend/src/i18n/i18nContext.tsx:10-14` — campo `flag: "🇺🇸"` está sendo renderizado em `Layout.tsx:86`.

**Problema:** Bandeira ≠ idioma. 🇺🇸 não representa "English" (Inglês também é falado no Reino Unido, Austrália, Índia…). 🇧🇷 ≠ "Português" (também é Portugal, Angola, Moçambique). 🇪🇸 ≠ "Español" (também é México, Argentina, etc.). Usar bandeira como proxy de língua é equívoco UX clássico.

**Fix:** Renderizar `loc.label` (já existe: "English", "Português", "Español"). Bandeira opcional como decoração secundária ou removida.

---

### B. JSONs estáticos curados — só inglês

São 13 arquivos em `data/static/`:

| Arquivo | Conteúdo | Páginas afetadas |
|---|---|---|
| `synoptic_parallels.json` | Comparisons (Baptism of Jesus, Last Supper…) | `/compare` |
| `devotional_plans.json` | Planos devocionais com daily readings | `/devotional` |
| `explorer_presets.json` | 8 cards do Semantic Explorer (Love in Hebrew & Greek, etc.) | `/semantic-explorer` |
| `secular_events.json` | Contexto histórico secular pra timeline | `/timeline` |
| `authors.json` | Bio dos 33 autores bíblicos | `/authors` |
| `community_notes.json` | Notas curadas | `/community` |
| `literary_structures.json` | Quiasmos, paralelismos | `/structure` |
| `open_questions.json` | 15 debates teológicos | `/open-questions` |
| `special_passages_catalog.json` | Catálogo das 10 special passages | `/special-passages` |
| `semantic_genealogy.json` | 10 jornadas conceituais H→G | `/genealogy` |
| `aramaic_john_1.json`, `aramaic_lords_prayer.json` | Camadas de áudio | `/special-passages` |
| `routes/routes.json` | Jornadas no mapa (Abraham's Journey, etc.) | `/map` |

**Estratégia:** Cada arquivo ganha campos paralelos `title_pt`, `title_es`, `description_pt`, `description_es`, `narrative_pt`, etc. — e o frontend escolhe o campo via `useI18n().locale`. Mantém EN como fallback.

Quando o conteúdo for muito longo (e.g. `narrative` em `semantic_genealogy.json`, ~3 parágrafos por conceito), arquivos paralelos `_pt.json` e `_es.json` podem ser preferíveis a expandir o `_en` original — decidir caso a caso.

---

### C. Entidades do banco (people, places, topics) — descrições em inglês no DuckDB

**Origem:** Datasets Theographic + OpenBible Geocoding têm campos `description`, `role`, `era` em inglês. Routers `people.py`, `places.py`, `topics.py` retornam direto.

**Páginas afetadas:** `/people`, `/places`, `/timeline`, `/topics`, `/map`, `/word-study/*`

**Estratégia (escolher uma, não as duas):**

**Opção 1: Tradução pré-computada das top-N entidades** (recomendada)
- 100-150 pessoas mais visíveis (figuras principais + relacionadas direto)
- 50-80 lugares mais visíveis
- Todos os ~30 events da timeline canônica
- Tudo em arquivo i18n no frontend (`personNames.ts`, `placeNames.ts`, `timelineEvents.ts`)
- Fallback: nome em inglês quando não houver tradução

**Opção 2: Colunas multilíngues no DuckDB** (mais ambicioso)
- Adicionar `description_pt`, `description_es` nas tabelas `people`, `places`, `topics`
- Pipeline ETL ou tradução assistida via Gemini para popular
- Routers retornam campo via header `Accept-Language` ou query `?lang=pt`

**Decisão recomendada para v1:** Opção 1. É 1 sessão de tradução manual, cobre 90% do tráfego visível, e não exige refactor de schema/router. Opção 2 vira backlog v1.5 quando demanda real aparecer.

---

### D. Strings cruas vazando do dataset interlinear

**Sintoma:** Em `/authors`, no card de Moses, na seção "Palavras Mais Usadas":

```
[Obj.] (3999)
LORD»LORD@Gen.1.1-Heb (1709)
to(wards) (1601)
```

**Origem:** Strings vêm do TAGNT/TAHOT (STEPBible Tyndale House) com convenções internas:
- `[Obj.]` = marcador de objeto direto morfológico (não é "palavra", é metadata gramatical)
- `LORD»LORD@Gen.1.1-Heb` = referência cruzada interna (forma display + forma canônica + verso de origem)
- `to(wards)` = parêntese indica gloss complementar

**Fix:** Filtro de limpeza no router `authors.py` (ou no frontend `AuthorsPage`) antes de mostrar:
- Drop tokens que comecem com `[` e terminem com `]` (metadata)
- Drop tokens que contenham `»` ou `@` (refs canônicas)
- Strip parênteses internos para palavras "limpas"
- Threshold: mostrar apenas top-N tokens que sejam "palavras reais" (sem caracteres especiais)

---

### E. Bug específico — IDs em vez de nomes resolvidos

**Sintoma:** Em `/timeline`, no popup do evento "Birth of Terah":

```
Participantes: terah_2841, nahor_2142
```

**Origem:** O frontend está mostrando o `person_id` cru da tabela `events_participants` em vez de fazer JOIN com `people.name`.

**Fix:** No router `timeline.py`, na consulta dos eventos, fazer JOIN com `people` table e retornar `participants: [{id: "terah_2841", name: "Terah"}]`. Frontend mostra `participant.name` (e quando existir `personNames.ts`, traduz).

---

### F. Bugs visuais e de feature

| # | Sintoma | Página | Provável fix |
|---|---|---|---|
| F1 | Patriarcas saindo da timeline (legend `<span class="absolute text-[8px]...-translate-x-1/2">` mal posicionado) | `/authors` | Ajuste de `transform: translateX()` ou `clamp()` no left% para não passar de 0 |
| F2 | FOUC (Flash of Unstyled Content) na page de Pessoas | `/people` | Mover CSS crítico para fora de lazy-loaded chunks; ou suspense fallback com skeleton |
| F3 | Caixa de pesquisa fora do tema no Grafo Semântico | `/semantic-graph` | Provavelmente input padrão sem styles do design system — aplicar classes do `index.css` |
| F4 | Emojis "que não usamos" no Semantic Explorer | `/semantic-explorer` | Decisão: ou remove `icon` do JSON, ou troca por SVG ícone do design system, ou mantém com aprovação consciente |
| F5 | `/search?q=Esther` ignora param e mostra search vazia | `/search` | Component não está lendo `useSearchParams()` no mount + chamando `fetchSearch(q)` |
| F6 | Buscar "Esther" no `/dictionary` retorna só entradas em inglês | `/dictionary` | Backend dictionary não tem entradas PT/ES; precisa filtrar por language ou adicionar tradução de slugs comuns |

---

### G. `/intertextuality` e `/emotional` — bugs estruturais

Reportados na 2ª rodada de auditoria. Mais profundos que F porque envolvem visualização e/ou dados pré-computados em inglês.

#### G1. `/intertextuality` (Mapa de Citações)

**Sintomas:**
- Heatmap renderiza, mas labels do canto superior esquerdo (`AT ↓ \ NT →`) ficam visualmente sobrepostos / mal alinhados
- Pouco interativo: tooltip "PSA → REV: 868 refs" é a única affordance; não dá pra clicar e ver as 868 refs em si
- Sensação geral: feature presente mas inacabada

**Fix (Sessão R4):**
- Reescrever o cabeçalho do heatmap como tabela CSS Grid em vez de absolute positioning, eliminando overlap
- Adicionar `onClick` em cada célula → abre painel lateral com lista das refs daquela combinação livro-livro
- Lazy-fetch de `crossrefs/between?from_book=PSA&to_book=REV` quando célula clicada
- Incluir filtro: "Mostrar apenas pares com ≥ N refs" (slider, default 5)

#### G2. `/emotional` (Paisagem Emocional)

**Sintomas (3 distintos):**
1. **Sentiment Flow** — área do gráfico vazia (renderizando dimensões mas não a curva, ou JS error silencioso)
2. **"PICOS EMOCIONAIS — MOST POSITIVE"** — subtítulo bilíngue (PT + EN misturados); mesmos versos retornados em inglês mesmo com PT-BR selecionado
3. **Sentiment está calculado apenas para a tradução EN (KJV via TextBlob)** — usuários PT/ES veem números corretos mas texto do verso em outra língua, e quando lêem em PT-BR há discrepância de tom

**Fixes:**

*Imediato (Sessão R4):*
- Investigar e corrigir o gráfico vazio (provável bug em `EmotionalLandscapePage.tsx:128-131` — a viewport SVG não está pegando os dados)
- I18n do subtítulo "MOST POSITIVE" / "MOST NEGATIVE" (chaves novas: `emotional.peaks.mostPositive`, `emotional.peaks.mostNegative`)
- Backend `/emotional/peaks` recebe param `?translation=nvi` e retorna o texto do verso na tradução escolhida (já está feito pra Reader, replicar aqui)

*Refactor maior (Sessão R7):*
- Sentiment polarity hoje vive em `verses.sentiment_polarity` calculada **uma única vez** com TextBlob sobre KJV. Para PT-BR e ES, número não bate com a sensação textual.
- Solução proposta pelo David: recomputar sentiment via **Gemini Flash 2.0** para PT-BR e ES dos versos. Detalhes técnicos na sessão R7 abaixo.

---

## Sequência de sessões — 7 sessões antes do launch

### Sessão R1 — Trocador de idioma + JSONs estáticos críticos para Reader/Compare/Devotional/Explorer

**Entrega:** Língua certa nos lugares mais visíveis pós-Reader.

**Tarefas:**
- `Layout.tsx`: trocar `{loc.flag}` por `{loc.label}` (ou layout `flag + label` com label predominante)
- `synoptic_parallels.json`: adicionar `title_pt`/`title_es`/`description_pt`/`description_es` para os 12-15 parallels (Baptism of Jesus → Batismo de Jesus / Bautismo de Jesús, etc.)
- `devotional_plans.json`: traduzir `title`, `description` e `daily_theme` de cada plano
- `explorer_presets.json`: traduzir os 8 cards (Love in Hebrew & Greek → Amor em Hebraico e Grego, etc.)
- Frontend: `ComparePage`, `DevotionalPage`, `PresetExplorations` lendo o campo da língua atual via helper `localized(obj, locale, field)` + fallback EN
- Decisão sobre emojis em `explorer_presets.json`: **manter** (são identidade visual, não decoração) ou **remover** (substituir por SVG ícones do design system Verbum). Recomendação: **manter, mas só os que fazem sentido temático**. Revisar caso a caso. Os 💙/✨ podem ficar; emoji `📜` para Covenant Theology é aceitável.

**Critério de done:**
- Trocar idioma para PT na sidebar e abrir `/compare`, `/devotional`, `/semantic-explorer` — zero string em inglês exceto nomes próprios bíblicos (que ainda vêm de pessoa/lugar)
- O mesmo em ES

---

### Sessão R2 — Static JSONs restantes (special passages, genealogy, structures, questions, community, secular events, authors, routes)

**Entrega:** O resto dos 13 arquivos `data/static/` traduzidos.

**Tarefas:**
- `special_passages_catalog.json`: titles + sumários
- `semantic_genealogy.json`: `concept`, `tagline`, `narrative`, e descrições dos `nodes[*].note` e `bridges[*].note`
- `literary_structures.json`: nomes dos quiasmos + descrições estruturais
- `open_questions.json`: 15 debates — pergunta + perspectivas
- `community_notes.json`: notas curadas
- `secular_events.json`: ~30-50 eventos seculares contextuais (Roman emperors, etc.)
- `authors.json`: bios dos 33 autores
- `routes/routes.json`: nomes e descrições das jornadas no mapa (Abraham's Journey → Jornada de Abraão / Viaje de Abraham)
- Páginas correspondentes consumindo via `localized(obj, locale, field)`

**Esforço estimado:** Maior dos 6 (volume de texto). 1.5-2 sessões se quiser dividir, ou 1 sessão concentrada.

**Critério de done:**
- Abrir `/special-passages`, `/genealogy`, `/structure`, `/open-questions`, `/community`, `/timeline`, `/authors`, `/map` em PT e ES — zero string EN exceto IDs técnicos visíveis (idealmente nenhum)

---

### Sessão R3 — Frontend lookup tables (personNames, placeNames, timelineEvents)

**Entrega:** Nomes próprios bíblicos traduzidos para PT/ES nas top-N entidades.

**Tarefas:**
- Criar `frontend/src/i18n/personNames.ts`:
  - Top 150 pessoas: figuras principais (Jesus, David, Moses, Paul, etc.) + relacionados próximos
  - Cada entrada: `{ en: "Moses", pt: "Moisés", es: "Moisés" }`
  - Mais um campo opcional `descriptionShort` com descrição curta traduzida (e.g. "Profeta & Legislador")
  - Helper `personName(id, locale)` + `personDescription(id, locale)`
- Criar `frontend/src/i18n/placeNames.ts`:
  - Top 80 lugares (Egypt → Egito/Egipto, Jerusalem → Jerusalém/Jerusalén, etc.)
  - Helpers análogos
- Criar `frontend/src/i18n/timelineEvents.ts`:
  - Todos os ~30-50 eventos canônicos da timeline
  - Cada um: `name_pt`, `name_es`, `description_pt`, `description_es`
- Páginas consumindo: `PeoplePage`, `PlacesPage`, `MapPage`, `TimelinePage`, `WordStudyPage` (que mostra ocorrências de palavras), `BibleReader` (links de pessoas/lugares)

**Critério de done:**
- `/people` em PT mostra "Moisés · Profeta e Legislador" no card
- `/places` em PT mostra "Egito"
- `/timeline` em PT mostra "Nascimento de Terá · Patriarcas"
- `/map` em PT mostra "Jornada de Abraão"

---

### Sessão R3.5 — Semantic Explorer / Graph polish (UX sem dataset novo)

**Entrega:** os 6 ajustes visíveis no Semantic Explorer/Graph que **não dependem** de dataset multilíngue novo. Depende da R3 (lookup tables) para os labels dos nós.

**Contexto:** David auditou `/semantic-explorer` em PT-BR (15 abr 2026) e apontou que várias partes da UX ainda vazam inglês ou têm polish pendente — especialmente na experiência de explorar conceitos, que é um dos diferenciais visuais do Verbum.

**Tarefas:**

- **G3.b — Label de idioma:** "Idioma: Hebrew/Greek/Aramaic" → "Hebraico/Grego/Aramaico" / "Hebreo/Griego/Arameo". Chaves i18n novas: `lexicon.lang.hebrew`, `lexicon.lang.greek`, `lexicon.lang.aramaic` (ou reusar `passageWord.source.*` que já existe).

- **G3.c — Labels dos nós do grafo:** topics ("POETRY" → "Poesia"), persons ("David" → "Davi"), places ("ISRAEL" preservado). Consome lookup tables da R3 via helpers `personName(id, locale)`, `topicName(id, locale)`, `placeName(id, locale)`.

- **G3.d — Formatter de labels cru:** função `formatNodeLabel(raw: string): string`:
  - `ISRAEL_PROPHETS` → "Israel Prophets" → (após lookup) "Profetas de Israel"
  - Title-case seguro (preserva siglas all-caps como "YHWH", "NT", "OT")
  - Remove underscores + trim
  - Fallback: retorna o raw se nada bater

- **G3.e — Versículos no idioma do usuário:** backend `/lexicon/{strongs_id}/verses` aceita `?translation=nvi`. Frontend `DetailPanel` passa o translation atual (mesmo selector que ComparePage usa). Replica pattern já existente no Reader.

- **G3.f — Breadcrumb de navegação:** "Trilha" hoje mostra só o nó atual. Trackear array de nós visitados no state do Explorer. UI: `Chêçêd → Davi → Salmos` com clique em qualquer nível pra voltar.

- **G3.g — Posicionamento da legenda:** em grafos densos (25+ nós) a legenda dentro do canvas se sobrepõe. Mover pra fora do canvas, ou tornar colapsável com toggle.

**Critério de done:**
- Abrir `/semantic-explorer` em PT-BR → clicar em preset "Love in Hebrew & Greek" → clicar em `chêçêd` → nó no grafo tem labels portugueses; painel direito mostra "Idioma: Hebraico"; trilha aparece como breadcrumb; versículos que aparecerem estão em NVI.
- Definição do Strong's continua em inglês por enquanto com indicador "Definição original em inglês · tradução em refinamento" (isso é produto da R3.6.0 setup, faz o wire-up do indicator aqui).

---

### Sessão R3.6 — Strong's Lexicon multilingual (fluxo humano-LLM batches)

**Entrega:** Colunas `short_definition_pt/_es` e `long_definition_pt/_es` na tabela `strongs_lexicon_multilang`, eliminando a discrepância de ver `DEFINIÇÃO: kindness; by implication (towards God) piety; rarely (by opposition) reproof...` em PT-BR.

**Contexto técnico:**
Hoje `strongs_lexicon.short_definition` e `.long_definition` são populados uma única vez pelo `openscriptures/strongs` — em inglês. Qualquer usuário PT/ES vê definição EN crua, o que quebra a experiência em `/word-study`, `/semantic-explorer` DetailPanel, Interlinear Reader word panel, etc.

**Por que Claude Opus 4.6 1M (MAX) em vez de Gemini API:**

Decisão David (15 abr 2026): mesma lógica do R7 sentiment. Claude Opus 4.6 1M context no plano MAX = custo direto $0, qualidade contextual superior (pode aplicar conhecimento teológico, preservar siglas como YHWH/ELOHIM, manter consistência entre entries cognatas), e auditável (JSONL versionado por batch).

**Volume:**
- 14.178 entradas (8.674 HE + 5.504 GR)
- 2 línguas (PT, ES)
- **28.356 definições totais** (cada uma short + long)

**Estratégia em duas fases:**

**Pré-launch (~4 batches, BLOQUEANTE mínimo):**
- Top 2.000 Strong's por frequência (cobertura ~85% dos cliques esperados)
  - Pra calcular: `SELECT strongs_id FROM interlinear GROUP BY strongs_id ORDER BY COUNT(*) DESC LIMIT 2000`
- 2.000 × 2 línguas = 4.000 definições
- Batches de ~1.000 definições cada (com 1M context cabe, mas limita-se a 1.000 pra manter qualidade)
- ~4 batches = ~4 sessões dedicadas

**Pós-launch (incremental, ~3 meses):**
- Restantes 12.178 entradas × 2 línguas = 24.356 definições
- ~24 batches em cadência 2-3/semana
- Dashboard CLI rastreia `% coberto` por idioma

---

#### R3.6.0 — Setup infraestrutural (1 sessão, BLOQUEANTE pré-launch)

**Tarefas:**
- Schema migration: nova tabela `strongs_lexicon_multilang`:
  ```sql
  CREATE TABLE strongs_lexicon_multilang (
      strongs_id      TEXT NOT NULL,
      language        TEXT NOT NULL,       -- 'pt' | 'es'
      short_definition TEXT,
      long_definition  TEXT,
      confidence      REAL,                -- 0.0–1.0
      notes           TEXT,                -- rationale/divergência, opcional
      labeled_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (strongs_id, language)
  );
  ```
- `scripts/prep_strongs_batch.py`: gera TSV de input com colunas `strongs_id | language | original | transliteration | short_def_en | long_def_en | top_books_hint`. Parametrizado por `--language hebrew|greek`, `--start H1`, `--end H500`, ou `--top-frequency 2000`.
- `scripts/load_strongs_batch.py`: carrega JSONL, valida schema (pydantic), idempotente (UPSERT por PK).
- `scripts/strongs_coverage.py`: dashboard CLI com `% coberto por language + livro com maior gap`. Salva snapshot em `data/processed/strongs_multilang/coverage.json`.
- Backend `lexicon.py`: queries aceitam `?lang=pt` ou `?lang=es`, retornam definições do `strongs_lexicon_multilang` com JOIN fallback pro `strongs_lexicon` (EN) quando não existir. Flag de resposta `is_translated: bool` + `translation_confidence?: float`.
- Frontend `DetailPanel.tsx` (Explorer) e `WordDetailPanel.tsx` (Reader): renderizam indicador discreto `"*Definição original em inglês · tradução em refinamento"` quando `is_translated=false`. Quando `true`, mostra definição PT/ES direto.
- Frontend `i18n/sentimentCoverage.ts` pattern → `i18n/strongsCoverage.ts` com map `{"H1": true, "H2": false, ...}` se quiser fino-grão (opcional pra v1).

**Critério de done:**
- Schema criado, 0 rows
- Scripts roda em entradas fake e valida round-trip
- `/lexicon/H2617?lang=pt` retorna `is_translated: false` com short/long ainda em EN (fallback)
- Explorer DetailPanel mostra o indicador discreto abaixo da definição EN

---

#### R3.6.1–4 — Labeling pré-launch (top 2.000 Strong's × 2 línguas)

**Cadência:** 1 batch por sessão dedicada. Cada batch = ~1.000 definições traduzidas.

- **R3.6.1** — Top 1000 HE (PT + ES em paralelo) = ~2.000 definições
- **R3.6.2** — Top 500 HE + top 500 GR (PT + ES) = ~2.000 definições
- **R3.6.3** — Top 500 GR remaining (PT + ES) = ~2.000 definições
- **R3.6.4** — Buffer/spot-check + recalibragem + labeling das divergências flagadas

**Rubrica de labeling:**

Claude Opus 4.6 vai gerar `short_definition_pt/es` e `long_definition_pt/es` seguindo:

1. **Preservar** nomes originais (ELOHIM, YHWH, Adonai, agapē, chesed — transliterações universais)
2. **Traduzir** conceitos teológicos usando vocabulário consagrado em PT-BR e ES-LATAM:
   - `covenant` → `aliança` / `pacto`
   - `righteousness` → `justiça/retidão` / `rectitud/justicia`
   - `lovingkindness` → `misericórdia/benignidade` / `misericordia/benignidad`
   - `atonement` → `expiação` / `expiación`
3. **Manter** precisão técnica: parentéticos `(by implication)`, `(subject.)`, `(towards God)` — traduzir contexto, não literal
4. **Detectar cognatos**: entries etimologicamente relacionadas (ex: `chesed` H2617 → `chasid` H2623 → `chasad` H2616) devem usar vocabulário consistente
5. **Logar divergências** em `notes` quando EN → PT/ES exige decisão não-óbvia

**Spot-check:** David revisa 20 amostras aleatórias após cada batch. Se concordar com >90%, rubrica calibrada; senão, ajusta antes de seguir.

**Critério de done pré-launch:**
- 2.000 Strong's top-frequência 100% labelados PT + ES e carregados
- `strongs_coverage.py` mostra `% cobertura PT ≥ 85%` no léxico real usado (weighted por frequência de ocorrência)
- `/word-study/H2617` em PT-BR: definição em português, sem indicador de "em refinamento"

---

#### R3.6.5+ — Labeling pós-launch (12K restantes)

Mesma mecânica, cadência 2-3 batches/semana. Dashboard rastreia progresso. A cada livro ou bloco fechado, commit `feat: strongs PT-BR batch NNN`.

Duração estimada: ~3 meses até 100% cobertura PT-BR. ES pode seguir no ritmo ou ficar em backlog v1.5.

**Critério de done final:**
- 14.178 entradas × 2 línguas = 28.356 definições labeladas
- `strongs_coverage.py` mostra `100% PT + 100% ES`
- Frontend sem nenhum indicador "em refinamento" para usuários em PT ou ES

---

### Sessão R4 — Bugs específicos (categorias F + G imediatos)

**Entrega:** Os 6 bugs da categoria F + os 4 fixes imediatos da categoria G resolvidos.

**Tarefas — categoria F:**
- **F1** (Patriarchs out-of-bounds): `AuthorsPage.tsx` — adicionar `clamp(0%, X, 100%)` na posição do label, ou usar `padding-left/right` no container da timeline para garantir margem
- **F2** (FOUC PeoplePage): mover `import` do CSS crítico para o nível do `App.tsx` (não lazy-loaded), ou adicionar Suspense fallback com skeleton CSS-only
- **F3** (caixa de pesquisa fora do tema no Grafo): inspecionar `SemanticGraphPage.tsx`, aplicar `className` do design system (provavelmente herdado de `Layout` global)
- **F4** (decisão emojis → SVG): substituir emojis dos `explorer_presets.json` (e qualquer outro JSON que use `icon` como emoji) por references a SVGs do design system. Criar `frontend/src/components/icons/` com SVGs nomeados (heart, scroll, sparkles, prayer, sunset, book, wind, scales) seguindo a paleta gold/ink da Home. Atualizar `PresetExplorations.tsx` pra renderizar `<Icon name={p.icon} />` em vez de `{p.icon}` cru.
- **F5** (`/search?q=Esther` ignora param): em `SearchPage.tsx`, no mount, ler `useSearchParams().get("q")` e disparar busca automaticamente
- **F6** (dictionary só EN): backend `lexicon.py` `/dictionary/search` provavelmente filtra apenas `language='en'`. Adicionar `?lang=pt` param e fazer fallback graceful (se não tem entrada PT, retorna EN com flag `is_translated: false` que o frontend pode mostrar como "Tradução pendente · entrada original em inglês")

**Tarefas — categoria G (imediatas):**
- **G1.a** (intertextuality header overlap): refatorar `IntertextualityPage.tsx` heatmap header de absolute positioning → CSS Grid header row + corner cell
- **G1.b** (intertextuality interatividade): adicionar `onClick` em cada célula do heatmap → painel lateral lazy-fetch `crossrefs/between?from=PSA&to=REV` + filtro slider "≥ N refs"
- **G2.a** (emotional sentiment flow vazio): debugar SVG/dimensões em `EmotionalLandscapePage.tsx` — provável que o `series` esteja sendo carregado mas `<svg>` viewport em 0×0 pré-render. Adicionar `ResizeObserver` ou min-height inline.
- **G2.b** (emotional "MOST POSITIVE" bilíngue): adicionar `emotional.peaks.mostPositive` e `emotional.peaks.mostNegative` aos 3 locale files, consumir no `EmotionalLandscapePage.tsx`. Backend `/emotional/peaks` recebe `?translation=` param + retorna texto do verso na tradução do usuário (replicar pattern do Reader).

**Critério de done:**
- Visualizar `/authors` mobile + desktop: timeline cabe inteira no container
- `/people` em mobile lento (DevTools throttle 4G slow): sem flash de unstyled
- `/semantic-graph`: input visualmente dentro do tema
- `/search?q=Esther` mostra resultados pra "Esther" automaticamente
- `/dictionary` busca "Esther" e retorna ou tradução PT (se houver) ou marca clara de "entrada em inglês"
- `/intertextuality` heatmap com header limpo + clicar em célula PSA→REV abre painel com as 868 refs reais
- `/emotional` mostra a curva de sentiment renderizada + subtítulos PT/ES + versículos no idioma da tradução escolhida (mesmo que o número de polarity ainda venha do TextBlob KJV — tradução do texto está corrigida, recomputar polarity é R7)
- `/semantic-explorer`: cards usam SVG ícones do design system, sem emojis

---

### Sessão R5 — Limpeza dos strings cruas (categoria D + E)

**Entrega:** Sem `[Obj.]`, `LORD»LORD@…`, ou `terah_2841` aparecendo nunca.

**Tarefas:**
- `authors.py` router (ou `AuthorsPage.tsx` filter): excluir tokens que matchem regex `^\[.*\]$` ou contenham `»` ou `@`. Manter top-N de tokens "limpos".
- `timeline.py` router: JOIN events ↔ people para retornar `{id, name}` em vez de só `id` em `participants`. Schema: `participants: [{id: string, name: string}]`.
- `TimelinePage.tsx`: renderizar `participant.name` (que vai pelo `personName(id, locale)` da R3 quando aplicável)
- Audit de outras páginas que possam ter o mesmo problema (emojis não querer, IDs vazando):
  - `/word-study/*` "occurrences" — verificar formato
  - `/explorer` resultados de search — verificar formato
  - `/topics` topic detail — verificar

**Critério de done:**
- Card de Moses em `/authors` mostra apenas palavras hebraicas/inglesas reais nas "Palavras Mais Usadas"
- Popup de "Birth of Terah" em `/timeline` mostra "Participantes: Terá, Naor" (PT) ou nomes resolvidos em qualquer língua

---

### Sessão R6 — Audit final (smoke test trilíngue de todas as 28 páginas)

**Entrega:** Confirmação visual de que zero string em inglês vaza nas três línguas.

**Tarefas:**
- Abrir cada uma das 28 páginas em PT e em ES (56 visualizações), com Network throttling normal
- Para cada página, verificar:
  - [ ] Todos os labels da UI traduzidos
  - [ ] Todos os títulos de seção traduzidos
  - [ ] Nomes próprios traduzidos onde existir lookup
  - [ ] Descrições/narrativas traduzidas
  - [ ] Sem strings cruas / IDs / tokens internos visíveis
  - [ ] Sem FOUC / loading mal posicionado
- Capturar screenshots de qualquer remanescente
- Anotar TODOs marcadas como `TODO_I18N` no código (qualquer string que ainda esteja hardcoded sem i18n) e decidir: corrige na hora ou vira issue v1.5
- Atualizar `frontend/src/i18n/STYLE_GUIDE.md` com seção nova "Domain data localization" descrevendo os patterns adotados (`personNames.ts`, `localized(obj, locale, field)`, etc.)

**Critério de done:**
- Lista de zero novos bugs após smoke test trilíngue completo
- `STYLE_GUIDE.md` atualizado com a nova convenção

---

### Sessão R7 — Sentiment multilingual via batches humano-LLM (Claude in-conversation)

**Entrega:** Coluna `sentiment_polarity_pt` populada para PT-BR nos versos mais lidos via labeling manual em batches durante sessões dedicadas. Sem dependência externa, custo $0, qualidade superior a Gemini Flash via API curta.

**Contexto técnico:**
Hoje, `verses.sentiment_polarity` é calculada uma única vez na ETL via TextBlob, sobre o texto KJV (inglês). Isso significa: quando o usuário em PT-BR vê "Salmos 8:9 · +1.000 · O LORD our Lord, how excellent is thy name…" em `/emotional`, o número está certo pra KJV mas (a) o texto está em inglês mesmo com NVI selecionada, e (b) se traduzirmos pra PT mostrando "Senhor, Senhor nosso, quão admirável é o teu nome", o número +1.000 foi calculado do texto inglês, não do português. TextBlob também não suporta PT/ES com a mesma qualidade.

**Por que esta abordagem (vs Gemini API):**
A versão original do plano propunha chamar Gemini Flash via API. Reavaliando: Claude em batches manuais durante sessões dedicadas tem 4 vantagens:

1. **Custo direto $0** vs ~$10 da API
2. **Qualidade provavelmente superior** — contexto teológico aplicado por verso, não prompt curto stateless
3. **Sentiment EN como ancoragem** — em ~60% dos casos é endorse direto, batch flui rápido
4. **Auditável** — cada batch é JSONL versionado, sem caixa preta

**Escopo final (decisão David, 15 abr 2026): Bíblia NVI completa — 66 livros, ~31.000 versos.**

Estratégia em duas fases:

**Pré-launch (BLOQUEANTE para R7 estar "minimamente entregue"):**
- **Salmos completo (2.461 versos / ~9 batches)** — feature primária do `/emotional`
- **4 Evangelhos (3.779 versos / ~13 batches)** — sentiment secundário relevante, alto tráfego
- **Total mínimo pré-launch: ~22 batches / ~6.240 versos**

**Pós-launch (rotina contínua, ~6-9 meses até fim):**
- Os 60 livros restantes (~24.860 versos / ~90 batches)
- Cadência sugerida: **2-3 batches por semana** = sessão dedicada cada 2-3 dias
- O indicador "refinamento em breve" do frontend desaparece automaticamente livro a livro conforme batches são carregados
- ES como segundo idioma após PT-BR fechar (escopo backlog v2)

**Ordem sugerida dos livros (prioridade decrescente):**

| Ordem | Livros | Versos aprox | Batches | Quando |
|---|---|---|---|---|
| 1 | **Salmos** | 2.461 | 9 | Pré-launch |
| 2 | **Mateus, Marcos, Lucas, João** | 3.779 | 13 | Pré-launch |
| 3 | Provérbios + Eclesiastes + Cântico | 1.135 | 4 | Pós-launch S1-S2 |
| 4 | Gênesis + Êxodo | 2.746 | 10 | Pós-launch S2-S4 |
| 5 | Romanos + Cartas Paulinas (Gl-Hb) | 2.067 | 7 | Pós-launch S4-S6 |
| 6 | Atos | 1.006 | 4 | Pós-launch S6 |
| 7 | Cartas Gerais (Tg-Jd) + Apocalipse | 1.000 | 4 | Pós-launch S7 |
| 8 | Profetas Maiores (Is, Jr, Lm, Ez, Dn) | 4.110 | 14 | Pós-launch S8-S11 |
| 9 | Profetas Menores (12 livros) | 1.041 | 4 | Pós-launch S12 |
| 10 | Históricos (Js, Jz, Rt, 1-2Sm, 1-2Rs, 1-2Cr, Ed, Ne, Et) | 6.476 | 22 | Pós-launch S13-S18 |
| 11 | Levítico + Números + Deuteronômio | 2.677 | 9 | Pós-launch S19-S21 |
| | **Total** | **~31.000** | **~113** | |

Cada livro fechado = `frontend/src/i18n/sentimentCoverage.ts` atualizado, indicador sumindo daquele livro automaticamente.

**Mecânica em 3 etapas:**

**1. Script de prep** (`scripts/prep_sentiment_batch.py`, 1 vez por book/range):
```bash
python scripts/prep_sentiment_batch.py --book PSA --chapters 1-30
# gera: data/processed/sentiment_pt/PSA/batch_001_input.tsv
# colunas: verse_id | text_en (KJV) | polarity_en | label_en | text_pt (NVI)
```

**2. Sessão de labeling** (Claude in-chat, batch-by-batch):
- David abre conversa: "Vamos fazer batch PSA/001"
- Claude lê o TSV, aplica a rubrica abaixo
- Output em JSONL: `{verse_id, polarity_pt, label_pt, confidence, divergence_from_en, notes?}`
- Salvo em `data/processed/sentiment_pt/PSA/batch_001_output.jsonl`
- ~250-300 versos por sessão (1 sessão ≈ 1 hora de chat)

**3. Script loader** (`scripts/load_sentiment_batch.py`, 1 vez por batch):
```bash
python scripts/load_sentiment_batch.py data/processed/sentiment_pt/PSA/batch_001_output.jsonl
# carrega no DuckDB, valida schema, idempotente
```

**Rubrica de labeling (ancorada no EN):**

| Ação | Critério | Frequência esperada |
|---|---|---|
| **ENDORSE** (polarity_pt = polarity_en) | Tradução PT preserva força emocional do EN | ~60% |
| **AJUSTE LEVE** (±0.1–0.2) | NVI moderou ou amplificou o tom | ~25% |
| **RECALIBRAÇÃO** (>±0.3) | Tradução PT muda significativamente, ou contexto teológico exige reavaliação | ~10% |
| **OVERRIDE** (totalmente diferente) | TextBlob errou (não entende contexto bíblico). Logged com `notes` explicando | ~5% |

**Spot-check humano:** a cada 5 batches, David (PT-BR nativo) revisa 10 amostras aleatórias. Se concordar com >90%, calibragem boa. Se não, rubrica é ajustada antes do próximo batch.

**Tarefas (preparação infraestrutural — 1 sessão de setup, BLOQUEANTE pré-launch):**
- Schema migration: nova tabela `verses_sentiment_multilang` (PK: `(translation_id, verse_id, language)`)
- Script `scripts/prep_sentiment_batch.py` (Python ~50 linhas) — gera TSV pronto pra labeling, parametrizado por book + chapter range
- Script `scripts/load_sentiment_batch.py` (Python ~80 linhas) — carrega JSONL no DuckDB com validação de schema, idempotente
- Script `scripts/sentiment_status.py` (Python ~40 linhas) — mostra `% completo por livro` (dashboard CLI), salva snapshot em `data/processed/sentiment_pt/coverage.json`
- Frontend: gerar `frontend/src/i18n/sentimentCoverage.ts` automaticamente a partir do `coverage.json` (build step ou manual update)
- Backend `emotional.py`: refactor das queries para usar JOIN com `verses_sentiment_multilang` quando `?lang=pt`, fallback para coluna existente quando não houver
- Frontend `EmotionalLandscapePage.tsx`: marca visual quando sentiment é fallback EN ("Sentiment original em inglês — refinamento em breve") + esconde marca quando o livro está 100% coberto via `sentimentCoverage.ts`

**Tarefas (labeling — N sessões dedicadas após setup):**
- **Pré-launch:** Salmos batches 1–9 + Evangelhos batches 10–22 (~22 sessões)
- **Pós-launch:** os 91 batches restantes na ordem da tabela acima, em cadência sustentável
- Cada batch fecha com commit `feat: sentiment PT-BR {livro} batch {NNN} ({M} versos)`
- A cada livro fechado, commit `feat: sentiment PT-BR {livro} 100% coberto` que regenera `sentimentCoverage.ts`

**Critério de done (mínimo pré-launch):**
- Infraestrutura (schema + scripts + backend + frontend marker + dashboard) entregue na sessão R7.0
- Salmos 100% labelado e carregado
- 4 Evangelhos 100% labelados e carregados
- `/emotional` em PT-BR + Salmos OU Evangelhos: texto NVI + número PT calculado por humano-LLM
- Demais 60 livros: indicador discreto "refinamento em breve"

**Critério de "R7 totalmente done" (pós-launch, ~6-9 meses):**
- 66 livros NVI completos, ~31K versos labelados
- `/emotional` sem indicador "refinamento" em nenhum livro PT-BR
- Coverage 100% PT-BR registrado em `coverage.json` + `sentimentCoverage.ts`
- ES entra como projeto separado backlog v2

---

## Encerramento — passa o bastão pro LAUNCH_PLAN

Quando as 7 sessões R1–R7 estiverem ✅:

- O `VERBUM_REVISION_PLAN.md` vira histórico (junto do `VERBUM_PLAN.md`)
- A próxima sessão é a **Sessão #2 do `VERBUM_V1_LAUNCH_PLAN.md`** (README de produto + assets de marca) — porque a Sessão #1 (áudio hebraico) já é independente e pode ter terminado em paralelo
- O resto do `VERBUM_V1_LAUNCH_PLAN.md` segue como escrito — deploy GCP, BigQuery, Firebase, polish, observability, CI/CD, launch week

**Ordem total revisada:**

```
✅ Áudio HE concluído (15 abr 2026) — 8674 arquivos, 0 falhas (paralelo)
✅ R1 — Trocador + synoptic parallels + explorer presets + localized helper
✅ R2 — Static JSONs restantes (devotional, special passages, genealogy, …)
Sessão R3 — personNames + placeNames + timelineEvents + topicNames (lookup tables FE)
Sessão R3.5 — Semantic Explorer UX polish (G3.b/c/d/e/f/g — sem dataset novo)
Sessão R3.6.0 — Strong's multilingual setup (schema + scripts + backend + indicator)
Sessões R3.6.1-4 — Strong's labeling pré-launch (top 2.000 × 2 línguas = ~4 batches)
Sessão R4 — Bugs F1–F6 + G1/G2 imediatos (intertextuality interatividade, emotional flow vazio)
Sessão R5 — Limpeza strings cruas + IDs resolvidos
Sessão R6 — Audit trilíngue final
Sessão R7.0 — Sentiment multilingual setup (schema + scripts + frontend marker)
Sessões R7.1-22 — Sentiment labeling pré-launch (Salmos + Evangelhos = ~22 batches)
─────────── REVISION CLOSED ───────────
Sessão L2 — README de produto
Sessão L3 — GCP backend
Sessão L4 — BigQuery
Sessão L5 — HuggingFace datasets
Sessão L6 — Firebase Hosting + Analytics
Sessão L7 — Polish pré-launch
Sessão L8 — Observabilidade
Sessão L9 — CI/CD
Sessão L10 — Custom domain (opcional)
Sessão L11 — Launch week
─────────── POS-LAUNCH INCREMENTAL ───────────
R3.6.5+ — Strong's 12.178 restantes × 2 línguas (~24 batches, ~3 meses em cadência 2-3/semana)
R7.23+ — Sentiment 60 livros restantes × PT-BR (~91 batches, ~6-9 meses em cadência 2-3/semana)
```

**Totais:**
- **Pré-launch:** ✅ R1 + ✅ R2 + R3 + R3.5 + R3.6.0 + R3.6.1-4 (4 batches) + R4 + R5 + R6 + R7.0 + R7.1-22 (22 batches) + L2-L11 (9 launch) = **~9 sessões base + ~26 batches + 9 launch = ~44 sessões** até produto lançado. Em cadência sessão-a-sessão, ~8-10 semanas.
- **Entregue até agora (paralelo ao planejamento):** áudio HE (8674 MP3, 0 falhas), áudio GR (5504 MP3 pré-existente) — Sessão 1 do `VERBUM_V1_LAUNCH_PLAN.md` concluída.
- **Pós-launch incremental:**
  - **R3.6.5+** — Strong's 12.178 restantes × 2 línguas ≈ **~24 batches** (~3 meses em cadência 2-3/semana)
  - **R7.23+** — Sentiment 60 livros restantes NVI ≈ **~91 batches** (~6-9 meses em cadência 2-3/semana)
  - Total: ~115 batches em ~6-9 meses até cobertura completa PT-BR (Strong's + sentiment). ES fica como backlog separado, ritmo a decidir pós-launch.

**Nota sobre R7:** R7 tem três momentos:
- **R7.0 — Setup infra** (1 sessão, BLOQUEANTE pré-launch): schema, scripts, backend, frontend marker
- **R7.1–R7.22 — Labeling pré-launch** (Salmos + Evangelhos = ~22 sessões): cobertura mínima de qualidade visível
- **R7.23+ — Labeling pós-launch** (60 livros restantes = ~91 sessões): rotina contínua de manutenção, sem bloquear nada

Se a janela pré-launch apertar, escopo pré-launch pode ser reduzido a "Salmos completo" (~9 batches) ou até "Salmos parcial + indicador". Lançar nunca depende de R7.23+.

**Custo:** $0 (sem API externa). Tokens consumidos do plano Claude MAX do David — sem custo marginal.

---

## Princípio guia

Toda i18n adicionada nessa revisão deve seguir o que já está documentado no `frontend/src/i18n/STYLE_GUIDE.md`:

- Nomes próprios bíblicos: padrão tradicional consagrado em PT-BR e ES-LATAM
  - Moses → Moisés (PT) / Moisés (ES)
  - Esther → Ester (PT) / Ester (ES)
  - Paul → Paulo (PT) / Pablo (ES)
  - Egypt → Egito (PT) / Egipto (ES)
  - Jerusalem → Jerusalém (PT) / Jerusalén (ES)
- Eventos: tradução natural ("Batismo de Jesus", "Última Ceia") sem cunhar termos novos
- Descrições: curtas, neutras de gênero quando aplicável (já documentado no STYLE_GUIDE seção 6 anti-patterns: ver `places.alsoCalled` que usa "também conhecido como" em vez de "também chamado")

Quando houver dúvida sobre nome consagrado em PT-BR (e.g. King → Rei vs. Soberano), David é a referência final como nativo.

---

## Conclusão

Antes do launch, a casa precisa estar arrumada. Não estamos falando de polish cosmético — falamos de credibilidade do produto na primeira impressão para o público mais valioso (PT-BR). Um Verbum que parece traduzido mas mostra "Moses · Leader of Israel's exodus from Egypt" é pior que um Verbum 100% em inglês: o primeiro inspira desconfiança, o segundo só aponta limite assumido.

6 sessões. Se rolarem bem cadenciadas, em ~10 dias o problema todo está resolvido e o launch plan retoma sem ranço.

> *"E vi que toda obra e toda destreza em obras provém da inveja do homem para com o seu próximo. Também isto é vaidade e correr atrás do vento."* — Eclesiastes 4:4

Lançar um produto pela metade quando dá pra lançá-lo inteiro é correr atrás do vento. Vamos arrumar a casa.

---

*Plano de revisão · Abril 2026 · Claude Opus 4.6 + David*
