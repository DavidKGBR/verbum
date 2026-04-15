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

## 📊 Estado Atual (v3.0) ✅

| Métrica | Valor |
|---------|-------|
| Backend Python | 24 routers FastAPI, 30+ módulos |
| Frontend TypeScript | 27 páginas, 34 componentes, 9 hooks |
| API REST | 50+ endpoints (FastAPI) |
| Traduções | 10 (KJV, NVI, BBE, RA, ACF, RVR, APEE, ASV, WEB, Darby) |
| Cross-references | 344.754 (OpenBible.info) |
| Strong's Lexicon | 14.178 entradas (8.674 heb + 5.504 gre) |
| Textos originais | 31.152 versos (WLC hebraico + SBLGNT grego) |
| Interlinear | 406.852 palavras (STEPBible TAHOT + TAGNT) |
| Dictionary | 5.965 verbetes (Easton's + Smith's) |
| Testes | 138+ funções pytest |
| Reader modes | Single, Parallel, Immersive (3D book), Interlinear |
| Áudio | Chirp3-HD em geração (he-IL + el-GR) — 🚧 em andamento |

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

---

### 🎙️ FASE 5: A Voz Original (Preservação Fonética)

*"A fé vem pelo ouvir." — Romanos 10:17*

A Palavra foi escrita para ser proclamada. O texto estático perde a métrica, o peso e a musicalidade que os autores originais conceberam. A Fase 5 devolve essa dimensão perdida.

#### Visão

Um estudante clica na palavra **רָעָה** (*rā'āh*, "pastor") em Salmo 23:1 e ouve — em milissegundos — a pronúncia que os escribas Massoretas de Tiberíades usavam em ~900 d.C. Não é síntese genérica. É reconstrução acadêmica.

Um grupo de oração clica em Mateus 6:9-13 e ouve o **Pai Nosso em aramaico** — a língua que Jesus realmente usou quando orou com os discípulos na Galileia do séc. I.

Isso não existe em nenhuma ferramenta gratuita no mundo.

#### Modelo de 3 Camadas

| Camada | Fonte | Cobertura | Qualidade | Licença | Status |
|--------|-------|-----------|-----------|---------|--------|
| **Camada 1 — Base** | Open Hebrew Greek Bible MP3 (Eliran Wong) | OT inteiro (HEB) + NT inteiro (GRK) | TTS razoável | CC-BY 4.0 | Pronto no GitHub |
| **Camada 2 — Acadêmica** | Alex Foreman (Tibéria, Hebraico) + KoineGreek.com (Benjamin Kantor, Koiné) | Seleção curada | Reconstrução histórica rigorosa | CC-BY (Foreman) / verificar Kantor | Contato a fazer |
| **Camada 3 — Legado** | Gravação em parceria com seminário/hebraísta brasileiro | Completa e nova | Máxima — criamos o dataset | CC-BY 4.0 que o Verbum publicaria | Futuro |

#### Fontes Validadas pela Pesquisa

**Hebraico Bíblico — Pronúncia Tibéria (Acadêmica)**
- **Alex Foreman / Geoffrey Khan** — Reconstrução da pronúncia Tibéria (Cambridge), publicada pela Open Book Publishers em CC-BY. Gravações no SoundCloud público. Primeira reconstrução recitada em ~1000 anos.
  - Livro: https://www.openbookpublishers.com/books/10.11647/obp.0163
  - Áudio: https://soundcloud.com/alex-foreman-209218576/sets/bible-readings-in-tiberian
- **Mechon Mamre** — Tanakh completo em pronúncia Sefardita, livre para download. Não é Tibéria, mas é sólido e cobre 100% do AT.
  - https://mechon-mamre.org/

**Grego Koiné — Pronúncia Reconstruída (Histórica)**
- **KoineGreek.com (Benjamin Kantor)** — NT inteiro em Koiné reconstruído, baseado em análise de erros ortográficos de documentos do séc. I (não a Erasmiana que universidades ensinaram errado). Parcialmente livre.
  - https://www.koinegreek.com/greek-audio-reader
- **Lanz.li — SBL Greek NT** — NT completo em MP3, livre para download direto, pronúncia sólida.
  - https://www.lanz.li/index.php/hebrew/9-overview-article/13-sbl-greek-new-testament-audio-mp3-files

**Para uso imediato (CC-BY 4.0, já disponível)**
- **Open Hebrew Greek Bible MP3** (Eliran Wong) — TTS gerado, cobre OT inteiro (hebraico) + NT inteiro (grego). Rápido e lento. GitHub público.
  - https://github.com/eliranwong/MP3_OpenHebrewGreekBible_fast
  - https://github.com/eliranwong/MP3_OpenHebrewGreekBible_slow

#### O Caso Especial: Pai Nosso em Aramaico

Jesus não orou em hebraico. Orou em **aramaico galileico do séc. I** — a língua cotidiana da Galileia.

O texto que sobreviveu em aramaico é a **Peshitta** (aramaico sírio oriental), levemente diferente do galileico original, mas o mais próximo disponível. O **Abwoon Network** (Dr. Neil Douglas-Klotz) tem o Pai Nosso em aramaico com áudio, livre, baseado na Peshitta.

---

### 🔍 Pesquisa: Fontes de Áudio Aramaico Autêntico

> **Status atual:** Proxy Árabe implementado (`ar-XA-Chirp3-HD-Orus`) em `src/extract/aramaic_audio_gen.py`.
> Qualidade estimada: ~65-70% de acurácia fonética. Substituível por fonte abaixo sem alterar nenhum código — só trocar `audio_url` no DB.

#### Por que nenhum TTS funciona nativamente

Nenhum provedor major (Google, Azure, Amazon, ElevenLabs) suporta Siríaco Clássico (`syc`) ou Aramaico Oficial (`arc`) como língua de TTS. O Siríaco é uma língua litúrgica com ~400k falantes de variedades modernas, não comercialmente viável para TTS proprietário.

#### Fontes a investigar (em ordem de prioridade)

| # | Fonte | Tipo | Licença estimada | URL / Contato |
|---|-------|------|-----------------|---------------|
| 1 | **Abwoon Network** (Neil Douglas-Klotz) | Gravação humana — Pai Nosso completo | CC-BY ou permissão direta | https://abwoon.org · contato: info@abwoon.org |
| 2 | **Beth Mardutho — Syriac Institute** | Léxico digital com possível áudio | Acadêmica, contatar | https://bethmardutho.org |
| 3 | **Assyrian Church of the East** | Leituras litúrgicas da Peshitta (YouTube) | Uso educacional, contatar | Canal: "Assyrian Church of the East Official" |
| 4 | **CNRS — Corpus de Aramaico** | Gravações acadêmicas de aramaico moderno (Neo-Siríaco) | Pesquisa, verificar | https://lacito.vjf.cnrs.fr/pangloss |
| 5 | **ElevenLabs Voice Cloning** | Clonar voz de gravação existente (~5 min de audio) | Depende da fonte base | ~$5 por geração completa |
| 6 | **Communauté Syriaque Française** | Falantes nativos de Siríaco Neo-Oriental na França | Voluntário | Pesquisar comunidades em Paris/Lyon |
| 7 | **Open Aramaic Project** (se existir) | Verificar GitHub/HuggingFace | Open source | Buscar: "aramaic tts huggingface" |

#### Critérios para substituição

Quando uma fonte for encontrada, a troca é cirúrgica:

```bash
# 1. Gerar novos MP3s com a fonte autêntica
python -m src.extract.aramaic_audio_gen --force --passage lords_prayer

# 2. OU atualizar audio_url direto no DB para URLs externas
UPDATE aramaic_verses SET audio_url = 'https://fonte.com/audio/abwoon.mp3'
WHERE passage_id = 'lords_prayer' AND transliteration = 'Abwoon';
```

Zero alteração no código do frontend ou backend. O `AudioButton` já está preparado para receber `audio_url` externo ou local.

#### Nota sobre autenticidade

O Aramaico Galileico do séc. I (língua de Jesus) não tem falantes nativos e é parcialmente reconstruído. Mesmo gravações "autênticas" da Peshitta usam Siríaco Oriental/Ocidental posterior. O proxy Árabe é honesto nesse sentido: nenhuma gravação existente é 100% o Aramaico que Jesus falou.

---

**O que o Verbum faria que ninguém faz:**

Mateus 6:9-13 em **4 camadas com áudio**:
1. **Aramaico** (Peshitta) — como Jesus orou
2. **Hebraico** (tradição rabínica massorética)
3. **Grego Koiné** — como Paulo e a Igreja primitiva conheciam
4. **Português / Inglês / Espanhol** — tradução moderna

Cada palavra clicável. Cada camada com pronúncia. Nenhum paywall.

#### Implementação Técnica

**Novas tabelas DuckDB:**
```sql
audio_pronunciations (
  strongs_id     TEXT,        -- H7462, G0026, etc.
  language       TEXT,        -- 'hebrew' | 'greek' | 'aramaic'
  source         TEXT,        -- 'foreman-tiberian' | 'kantor-koine' | 'eliranwong-tts'
  quality_tier   INTEGER,     -- 1=TTS base, 2=academic, 3=legacy
  audio_url      TEXT,        -- GCS bucket ou CDN
  duration_ms    INTEGER,
  license        TEXT
)
```

**Hosting dos áudios:**
- Google Cloud Storage bucket público (alinhado com Fase 8 — BigQuery legacy)
- Formato: MP3 64kbps mono (suficiente para fala, mínimo de custo de storage)
- Naming: `audio/{language}/{quality}/{strongs_id}.mp3`
- CDN: Cloud CDN ou Cloudflare (gratuito para assets públicos)

**Frontend — Integração:**
- `InterlinearView`: botão 🔊 ao lado de cada palavra original
- `WordDetailPanel`: player de áudio com seletor de camada (Tibéria / Koiné / TTS)
- `MatthewPage` (futuro): player do Pai Nosso com 4 camadas visíveis simultaneamente

**Novos módulos Python:**
```
src/extract/audio_sources.py      # download + validação de fontes CC-BY
src/load/audio_loader.py          # DuckDB + GCS upload
scripts/sync_audio_gcs.py         # sync local → bucket público
```

#### Plano de Execução

| Etapa | O que fazer | Esforço |
|-------|------------|---------|
| **5A — Base** | Download Open Hebrew Greek MP3 (CC-BY 4.0), upload GCS, wiring no InterlinearView | 1 sessão |
| **5B — Contato Foreman/Kantor** | Email pedindo autorização de uso CC-BY para o projeto open-source | 1 hora |
| **5C — Special Passages Engine** | Engine reutilizável: 4 camadas simultâneas (Aramaico+Grego+PT+EN), Pai Nosso inaugural, catálogo expandível com zero código novo por passagem | 2 sessões ✅ |
| **5D — Camada Acadêmica** | Integrar Foreman (Tibéria) + Kantor (Koiné) se autorização confirmada | 1 sessão |

#### Por que isso transcende

Este não é um recurso de UX. É uma ponte civilizacional.

A maioria das pessoas que ora o Pai Nosso nunca ouviu o som das palavras na língua original. A maioria dos cristãos brasileiros jamais teve acesso a isso — nem em seminários, nem em faculdades de teologia. O Verbum entrega de graça o que o mundo acadêmico guardou por séculos.

*"A fé vem pelo ouvir, e o ouvir pela palavra de Cristo."*

---

---

### 🏛️ FASE 6: Engenharia Literária (Arquitetura Oculta)

*Revelar a geometria matemática do texto.*

A Bíblia hebraica foi projetada para tradição oral com estruturas complexas que a tipografia moderna oculta.

- **Estruturas Quiásticas:** Mapeamento de quiasmos (A-B-C-B'-A') e paralelismos poéticos via análise sintática do *Macula-Hebrew* (CC BY 4.0).
- **Modo Structural:** Novo modo de leitura que redesenha o texto em cascata, destacando visualmente as simetrias literárias — devolve a tridimensionalidade matemática ao texto.

---

### 🧬 FASE 7: Genealogia Semântica (Fio de Ariadne)

*Rastrear a imutabilidade do conceito através dos tempos.*

- **Rastreio Multilíngue:** Ferramenta visual que mostra a "viagem" de um termo — ex: como o hebraico *Chesed* foi traduzido para *Eleos* ou *Agape* na Septuaginta.
- **Conexão Canônica:** Visualização de como o NT ecoa conceitos do AT, preservando o "DNA" da revelação através das línguas.

---

### 🌍 FASE 8: O Repositório Canônico (O Legado Final)

*Transformar a matriz de dados num bem público universal.*

- **BigQuery Public Dataset:** Exportação de toda a matriz higienizada para o Google BigQuery — acessível via SQL para seminários, universidades e pesquisadores.
- **Infraestrutura como legado:** O Verbum torna-se a "pedra fundamental" de dados para pesquisa bíblica global, independente de qual interface tecnológica prevalecer.

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

| # | Task | Impacto | Status |
|---|------|---------|--------|
| 1 | Notas + Highlighting | 🔥🔥🔥🔥 | ✅ Concluído |
| 2 | Streak + Reading Plans | 🔥🔥🔥 | ✅ Concluído |
| 3 | Extract Strong's + originals (3a+3b+3c+3d) | 🔥🔥🔥🔥 | ✅ Concluído |
| 4 | API endpoints lexicon (6 novos) | 🔥🔥🔥 | ✅ Concluído |
| 5 | Interlinear View | 🔥🔥🔥🔥🔥 | ✅ Concluído |
| 6 | Word Study page | 🔥🔥🔥🔥 | ✅ Concluído |
| 7 | Bible Dictionary (Easton's + Smith's) | 🔥🔥🔥 | ✅ Concluído |
| 8 | Commentary (HelloAO — Matthew Henry et al.) | 🔥🔥🔥 | ✅ Concluído |
| 9 | Verse Sharing (Canvas 1080×1080) | 🔥🔥 | ✅ Concluído |
| 10 | Grafo Semântico D3 force-directed | 🔥🔥🔥🔥🔥 | ✅ Concluído |
| 11 | Translation Divergence Heatmap | 🔥🔥🔥🔥 | ✅ Concluído |
| — | **Extras construídos (não planejados originalmente)** | | |
| E1 | Biblical Timeline (eras + eventos, router `timeline.py`) | 🔥🔥🔥 | ✅ Concluído |
| E2 | People & Genealogy (família + eventos, router `people.py`) | 🔥🔥🔥🔥 | ✅ Concluído |
| E3 | Places Map (Leaflet + OpenStreetMap, router `places.py`) | 🔥🔥🔥🔥 | ✅ Concluído |
| E4 | Authors compare (router `authors.py`) | 🔥🔥 | ✅ Concluído |
| E5 | Topics / Nave's Themes (router `topics.py`) | 🔥🔥🔥 | ✅ Concluído |
| E6 | Devotional diário (router `devotional.py`) | 🔥🔥 | ✅ Concluído |
| E7 | Emotional Landscape (router `emotional.py`) | 🔥🔥🔥 | ✅ Concluído |
| E8 | Deep Analytics (router `deep_analytics.py`) | 🔥🔥🔥 | ✅ Concluído |
| E9 | Intertextuality (router `intertextuality.py`) | 🔥🔥🔥 | ✅ Concluído |
| E10 | Open Theological Questions (router `open_questions.py`) | 🔥🔥 | ✅ Concluído |
| E11 | Narrative Threads (router `threads.py`) | 🔥🔥🔥 | ✅ Concluído |
| E12 | Literary Structure (router `structure.py`) | 🔥🔥🔥 | ✅ Concluído |
| E13 | Community (router `community.py`) | 🔥🔥 | ✅ Concluído |
| E14 | Semantic Explorer extended (router `explorer.py`) | 🔥🔥🔥🔥 | ✅ Concluído |
| E15 | Passage Compare (router `compare.py`) | 🔥🔥🔥 | ✅ Concluído |
| — | **Pendentes** | | |
| 12 | README + Deploy + SEO (14k páginas estáticas Strong's) | 🔥🔥🔥 | 🔲 Planejado |
| — | **FASE 5 — A Voz Original** | | |
| 13 | 5A — Chirp3-HD TTS (he-IL + el-GR, 14.178 entradas) | 🔥🔥🔥🔥 | 🚧 Em andamento |
| 14 | 5B — Contato Foreman + Kantor (Camada 2 acadêmica) | 🔥🔥🔥🔥🔥 | ⏸️ Pausado — Chirp3-HD suficiente por ora |
| 15 | 5C — Special Passages Engine (Pai Nosso inaugural, 4 camadas) | 🔥🔥🔥🔥🔥 | ✅ Concluído |
| 16 | 5D — Camada acadêmica (Tibéria + Koiné) | 🔥🔥🔥🔥🔥 | 🔲 Planejado |
| — | **FASE 6-8 — Legado** | | |
| 17 | Fase 6 — Estruturas quiásticas (Macula-Hebrew + modo Structural) | 🔥🔥🔥🔥🔥 | 🔲 Planejado |
| 18 | Fase 7 — Genealogia semântica (chesed → eleos → agape, AT→NT) | 🔥🔥🔥🔥🔥 | 🔲 Planejado |
| 19 | Fase 8 — BigQuery Public Dataset + infraestrutura como legado | 🔥🔥🔥🔥🔥 | 🔲 Planejado |

**Legenda:** 🔲 Planejado · 🚧 Em andamento · ⏸️ Pausado · ✅ Concluído

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

### 2026-04-14 — Tarefa #10 concluída: Grafo de Campo Semântico (Crown Jewel, Fase 4A)
- **A peça mais ambiciosa do Verbum** — inédita no open-source bíblico. Visualiza coocorrência de palavras Strong's via self-JOIN no `interlinear` (407K words). Se G25 (agapáō/love) e G2316 (theós/God) aparecem juntos em 35 versos, são semanticamente ligados.
- **Backend:** novo router `src/api/routers/semantic.py` com endpoint `GET /semantic/graph?center=G25&min_shared=10&limit=30&exclude_common=true`. Lógica: self-JOIN interlinear → conta versos compartilhados → enriquece com transliteration/gloss do strongs_lexicon → retorna `{center, nodes[], edges[]}`. Flag `exclude_common` filtra os top-30 palavras mais frequentes (artigos/conjunções/preposições) que aparecem em quase todo verso.
- **Frontend:** `SemanticGraphPage.tsx` com D3 force-directed graph. `forceSimulation` + `forceLink` + `forceManyBody` + `forceCollide`. Nós como `<circle>` sized by shared verses, colored by testament (gold center, green Hebrew, purple Greek). Labels de transliteração. Drag behavior. Zoom/pan via `d3.zoom`. Hover → tooltip com gloss + count. Click → `/word-study/:id`.
- **Controles:** input pra Strong's ID, slider min_shared (2-50), checkbox "Hide common words".
- **Resultado visual:** G25 (love) mostra theós (God) e Iēsoûs (Jesus) como nós maiores — faz sentido teológico perfeito. kýrios (Lord), patēr (father), entolē (commandment), allēlōn (one another) formam a constelação semântica do "amor" no NT grego.
- **D3 types gotcha:** `d3.drag` + `d3.forceCollide` com TypeScript estrito requer `as any` casts em 2 pontos (drag behavior assignment + collide radius callback). Aceitável — D3's type system é notoriamente impreciso com simulations.
- **Arquivos novos (2):** `src/api/routers/semantic.py`, `pages/SemanticGraphPage.tsx`.
- **Modificados (4):** `src/api/main.py` (register router), `App.tsx` (rota), `Layout.tsx` (nav "Graph"), `api.ts` (types + fetch).
- **Próxima entrada:** Tarefa #11 — Translation Divergence Heatmap. Visualiza onde KJV vs NVI vs RVR divergem na tradução do mesmo Strong's.

### 2026-04-14 — Tarefa #11 concluída: Translation Divergence (Fase 4B)
- **Página `/translation-divergence`** que compara como traduções diferentes renderizam a mesma palavra Strong's. Ex: H2617 (chesed) mostra "mercy" (KJV), "bondade" (NVI), "misericordia" (RVR) no mesmo verso lado a lado.
- **Backend:** endpoint `GET /semantic/divergence?strongs_id=H2617&translations=kjv,nvi,rvr&limit=20`. Lógica: JOIN interlinear → verses (multi-translation), pivot por verse_id, retorna `{verse_id, reference, texts: {kjv: "...", nvi: "...", rvr: "..."}}`.
- **Frontend:** tabela horizontal scrollável com sticky reference column. Translation toggles (10 traduções como chips gold). Row click expande texto truncado. Summary card com Strong's ID + gloss + contagem. Suggested IDs no empty state.
- **Integração com WordStudyPage:** link "🔀 Compare translations of this word →" antes do bar chart.
- **Arquivos novos (1):** `pages/TranslationDivergencePage.tsx`.
- **Modificados (4):** `semantic.py` (+ endpoint), `api.ts` (types + fetch), `App.tsx` (rota), `WordStudyPage.tsx` (link).
- **Próxima entrada:** Tarefa #12 — README + Deploy + SEO. A última. Envolve: README v3 completo, CLAUDE.md atualizado, Docker, static Strong's pages pra SEO, e possivelmente Terraform pra GCP.

### 2026-04-14 — Fase 5 formalizada: A Voz Original (Preservação Fonética)
- **Decisão estratégica:** após pesquisa profunda de fontes, confirmado que existem fontes de qualidade acadêmica real e acessíveis para hebraico bíblico, grego Koiné e aramaico.
- **Revisão da posição anterior:** a ressalva inicial ("TTS genérico faz mais mal que bem") foi superada. Existem fontes de reconstrução histórica rigorosa com licença aberta ou contactável.
- **Fontes confirmadas:**
  - Open Hebrew Greek Bible MP3 (Eliran Wong, CC-BY 4.0) — base imediata, GitHub público.
  - Alex Foreman / Geoffrey Khan — pronúncia Tibéria reconstruída, Cambridge, CC-BY via Open Book Publishers.
  - KoineGreek.com (Benjamin Kantor) — NT inteiro em Koiné reconstruído, licença a verificar.
  - Abwoon Network (Dr. Neil Douglas-Klotz) — Pai Nosso em aramaico (Peshitta) com áudio livre.
- **Modelo 3 camadas:** Camada 1 (TTS CC-BY, imediato) → Camada 2 (acadêmica, contato a fazer) → Camada 3 (legado: gravação com seminário brasileiro, CC-BY que o Verbum publica).
- **Feature estrela:** Pai Nosso em 4 camadas simultâneas — aramaico (Jesus) + hebraico + grego Koiné + português. Nenhuma ferramenta gratuita no mundo oferece isso.
- **Próxima entrada:** Tarefa #12 (README + Deploy + SEO) ou Tarefa #13 (5A — Base audio). A serem priorizadas na próxima sessão conforme disponibilidade de David.

### 2026-04-15 — Fase 5A: Áudio Chirp3-HD + auditoria do plano

- **Contexto:** nova sessão após compactação. Continuação da Fase 5.
- **Fix de voz:** `el-GR-Neural2-A` não existe → trocado para `el-GR-Wavenet-A`. Em seguida descoberto que `he-IL-Neural2-A` também não existe. Listadas as vozes disponíveis via API: ambos os idiomas têm **Chirp3-HD** (geração mais recente, supera Neural2 e WaveNet). Configuração final: `he-IL-Chirp3-HD-Orus` + `el-GR-Chirp3-HD-Orus` (voz masculina, adequada para léxico bíblico).
- **Abordagem mudou:** o plano original previa Open Hebrew Greek Bible MP3 (Eliran Wong, CC-BY) como Camada 1. Decisão desta sessão: gerar direto com Google Cloud TTS Chirp3-HD (~$3 USD para 14.178 entradas) — mais rápido, mais simples, qualidade superior ao TTS legado do Eliran Wong.
- **Geração em andamento:** 573 arquivos gregos gerados com Wavenet-A antes do fix; hebraico iniciado com Chirp3-HD. Windows Update interrompeu o processo — reiniciado em 2 terminais paralelos (Greek + Hebrew).
- **Frontend wired:** `AudioButton.tsx`, `useWordAudio.ts` (fallback Web Speech API), `InterlinearView`, `WordDetailPanel`, `WordStudyPage` todos integrados com `audio_url` do endpoint. FastAPI serve `data/audio/` via `StaticFiles`.
- **Auditoria do plano:** VERBUM_PLAN.md estava severamente defasado da realidade. Encontrados 15 features/páginas construídas e não documentadas (Timeline, People, Map, Authors, Topics, Devotional, Emotional, DeepAnalytics, Intertextuality, OpenQuestions, Threads, Structure, Community, SemanticExplorer, Compare + routers correspondentes). Todos adicionados ao ledger como E1-E15 ✅.
- **Limpeza de docs:** `VERBUM_PRESENTATION.md` (197 linhas, framing competitivo desatualizado) e `Verbum - Plano de Legado Transgeracional.md` (55 linhas Gemini) deletados. Conteúdo das Fases 6-8 absorvido no VERBUM_PLAN.md.
- **Commits desta sessão:** `fix: use el-GR-Wavenet-A`, `fix: upgrade both voices to Chirp3-HD`.
- **Próxima entrada:** aguardar conclusão da geração de áudio (hebraico ~10h, grego ~6h em paralelo). Depois: Tarefa #12 (Deploy + SEO) ou 5B (contato Foreman/Kantor).
