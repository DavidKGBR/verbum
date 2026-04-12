# 🕊️ Bible Data Pipeline v2.0 — Plano de Expansão
## De pipeline de dados para plataforma de analytics bíblica com IA

> **Objetivo:** Criar o projeto open-source mais completo de engenharia de dados
> aplicada ao texto bíblico — multi-idioma, com IA generativa, e visualizações
> no nível do famoso arc diagram de Chris Harrison.

---

## 📋 Sumário Executivo

### O que já temos (v1.0) ✅
- Pipeline ETL: Bible API → Clean → Enrich → DuckDB
- Análise de sentimento (TextBlob)
- Dashboard Streamlit básico (5 páginas)
- Testes, CI/CD, Docker
- Suporte a GCP (GCS + BigQuery)

### O que queremos (v2.0) 🚀
1. **Multi-idioma** — 5+ traduções da Bíblia (EN, PT-BR, ES, FR, DE...)
2. **Cross-references** — 63.000+ referências cruzadas entre versículos
3. **Gemini API** — Explicações de trechos, comparação de traduções, contexto teológico
4. **Visualizações épicas** — Arc diagram, network graphs, heatmaps interativos
5. **API REST** — FastAPI para servir dados e insights via API
6. **Frontend React** — Dashboard moderno substituindo Streamlit

---

## 🏗️ Arquitetura v2.0

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Bible Data Pipeline v2.0                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────┐                                                     │
│  │   SOURCES     │                                                     │
│  │               │                                                     │
│  │ • Bible APIs  │──┐                                                  │
│  │   (multi-lang)│  │                                                  │
│  │ • Cross-refs  │  │   ┌──────────────┐   ┌──────────────────────┐   │
│  │   (TSK/CREF)  │  ├──▶│  TRANSFORM   │──▶│       LOAD           │   │
│  │ • Strongs     │  │   │              │   │                      │   │
│  │   (léxicos)   │──┘   │ Clean/Valid  │   │ DuckDB (local)       │   │
│  └───────────────┘      │ NLP Enrich   │   │ BigQuery (prod)      │   │
│                         │ Gemini AI    │   │ Parquet (data lake)  │   │
│                         │ Cross-ref    │   │                      │   │
│                         │  mapping     │   └──────────┬───────────┘   │
│                         └──────────────┘              │               │
│                                                       ▼               │
│                              ┌─────────────────────────────────┐      │
│                              │         SERVE & VISUALIZE       │      │
│                              │                                 │      │
│                              │  FastAPI  ◄──►  React Frontend  │      │
│                              │  (REST)         (D3.js / Three) │      │
│                              │                                 │      │
│                              │  Gemini   ◄──►  AI Insights     │      │
│                              │  (gen AI)       (explanations)  │      │
│                              └─────────────────────────────────┘      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Estrutura de Diretórios v2.0

```
bible-data-pipeline/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint + Test + Build
│       └── deploy.yml                # Deploy GCP (opcional)
│
├── src/
│   ├── extract/                      # ── FASE 1: EXTRAÇÃO ──
│   │   ├── bible_api.py              # [EXISTENTE] bible-api.com (EN/KJV)
│   │   ├── bible_sources.py          # [NOVO] Multi-source fetcher
│   │   ├── crossref_extractor.py     # [NOVO] Treasury of Scripture Knowledge
│   │   ├── strongs_extractor.py      # [NOVO] Léxicos hebraico/grego
│   │   └── translations.py           # [NOVO] Mapeamento de APIs por idioma
│   │
│   ├── transform/                    # ── FASE 2: TRANSFORMAÇÃO ──
│   │   ├── cleaning.py               # [EXISTENTE] Limpeza e validação
│   │   ├── enrichment.py             # [EXISTENTE] Métricas + sentimento
│   │   ├── crossref_mapper.py        # [NOVO] Mapear referências cruzadas
│   │   ├── multilang_aligner.py      # [NOVO] Alinhar versículos multi-idioma
│   │   ├── topic_modeling.py         # [NOVO] Tópicos por livro/capítulo
│   │   └── text_features.py          # [NOVO] Features avançadas (TF-IDF, etc)
│   │
│   ├── ai/                           # ── FASE 3: IA GENERATIVA ──
│   │   ├── gemini_client.py          # [NOVO] Cliente Gemini com retry/cache
│   │   ├── passage_explainer.py      # [NOVO] Explicação de trechos
│   │   ├── translation_comparator.py # [NOVO] Comparação entre traduções
│   │   ├── theological_context.py    # [NOVO] Contexto histórico/teológico
│   │   └── prompts/                  # [NOVO] Templates de prompts
│   │       ├── explain_passage.txt
│   │       ├── compare_translations.txt
│   │       └── historical_context.txt
│   │
│   ├── load/                         # ── FASE 4: CARGA ──
│   │   ├── duckdb_loader.py          # [EXISTENTE] + novas tabelas
│   │   ├── gcs_loader.py             # [EXISTENTE]
│   │   └── parquet_writer.py         # [NOVO] Export Parquet particionado
│   │
│   ├── api/                          # ── FASE 5: API REST ──
│   │   ├── main.py                   # [NOVO] FastAPI app
│   │   ├── routers/
│   │   │   ├── verses.py             # [NOVO] CRUD versículos
│   │   │   ├── crossrefs.py          # [NOVO] Referências cruzadas
│   │   │   ├── analytics.py          # [NOVO] Endpoints analíticos
│   │   │   ├── ai_insights.py        # [NOVO] Endpoints Gemini
│   │   │   └── search.py             # [NOVO] Full-text search
│   │   ├── schemas.py                # [NOVO] Pydantic response models
│   │   └── dependencies.py           # [NOVO] DB connections, auth
│   │
│   ├── models/
│   │   └── schemas.py                # [EXPANDIR] Novos modelos
│   ├── config.py                     # [EXPANDIR] Novas configs
│   ├── pipeline.py                   # [EXPANDIR] Novas fases
│   └── cli.py                        # [EXPANDIR] Novos comandos
│
├── frontend/                         # ── FASE 6: FRONTEND REACT ──
│   ├── package.json
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ArcDiagram/           # Visualização de cross-refs
│   │   │   │   ├── ArcDiagram.tsx
│   │   │   │   ├── useArcData.ts
│   │   │   │   └── arcUtils.ts
│   │   │   ├── SentimentHeatmap/     # Heatmap de sentimento
│   │   │   ├── BookExplorer/         # Explorador de livros
│   │   │   ├── TranslationCompare/   # Comparação lado-a-lado
│   │   │   ├── AIInsights/           # Chat com Gemini sobre trechos
│   │   │   ├── NetworkGraph/         # Grafo de relações
│   │   │   └── common/              # Componentes compartilhados
│   │   ├── hooks/
│   │   ├── services/                 # API client
│   │   └── styles/
│   └── vite.config.ts
│
├── dashboard/
│   └── app.py                        # [MANTER] Streamlit como fallback
│
├── data/
│   ├── raw/                          # JSON por livro por idioma
│   ├── crossrefs/                    # [NOVO] Referências cruzadas
│   ├── lexicons/                     # [NOVO] Strongs/léxicos
│   ├── processed/                    # CSVs enriquecidos
│   ├── analytics/                    # DuckDB + agregações
│   └── ai_cache/                     # [NOVO] Cache de respostas Gemini
│
├── tests/
│   ├── test_extract.py
│   ├── test_transform.py
│   ├── test_load.py
│   ├── test_crossrefs.py             # [NOVO]
│   ├── test_multilang.py             # [NOVO]
│   ├── test_gemini.py                # [NOVO]
│   └── test_api.py                   # [NOVO]
│
├── docs/
│   ├── ARCHITECTURE.md               # Diagrama detalhado
│   ├── DATA_MODEL.md                 # Schema do banco
│   ├── API_REFERENCE.md              # Docs da API REST
│   ├── GEMINI_INTEGRATION.md         # Como funciona a IA
│   └── CONTRIBUTING.md               # Guia de contribuição
│
├── scripts/
│   ├── seed_crossrefs.py             # [NOVO] Popular cross-refs
│   ├── benchmark.py                  # [NOVO] Benchmark de performance
│   └── generate_sample_data.py       # [NOVO] Dados de exemplo
│
├── infra/                            # [NOVO] Infraestrutura
│   ├── terraform/                    # GCP com Terraform
│   │   ├── main.tf
│   │   ├── bigquery.tf
│   │   ├── cloud_run.tf
│   │   └── variables.tf
│   └── docker/
│       ├── Dockerfile.pipeline
│       ├── Dockerfile.api
│       └── Dockerfile.frontend
│
├── docker-compose.yml                # [EXPANDIR] API + Frontend + DB
├── Makefile                          # [EXPANDIR] Novos comandos
├── pyproject.toml                    # [EXPANDIR] Novas deps
└── README.md                         # [REESCREVER] Épico v2
```

---

## 🔄 Fases de Implementação (Sprints)

### Sprint 1: Multi-Idioma (Prioridade Alta) 🌍
**Objetivo:** Suportar 5+ traduções alinhadas versículo a versículo.

#### 1.1 Fontes de dados por idioma

| Idioma | Tradução | Fonte/API | Licença |
|--------|----------|-----------|---------|
| EN | KJV (King James) | bible-api.com | Domínio público |
| EN | ASV (American Standard) | bible-api.com | Domínio público |
| PT-BR | ARA (Almeida Rev. Atualizada) | abibliadigital.com.br | Verificar |
| PT-BR | NVI (Nova Versão Internacional) | abibliadigital.com.br | Verificar |
| ES | RVR (Reina-Valera) | bible-api.com ?translation=rva | Domínio público |
| FR | LSG (Louis Segond) | Buscar API pública | Domínio público |
| DE | LUTH (Luther) | Buscar API pública | Domínio público |
| LA | Vulgata (Latim) | Sacred-texts | Domínio público |
| GR | Original grego (NT) | Strongs + interlinear | Domínio público |
| HE | Original hebraico (AT) | Strongs + interlinear | Domínio público |

#### 1.2 Schema multi-idioma (DuckDB)

```sql
-- Tabela principal: versículos por tradução
CREATE TABLE verses (
    verse_id        VARCHAR NOT NULL,  -- 'GEN.1.1'
    book_id         VARCHAR NOT NULL,
    chapter         INTEGER NOT NULL,
    verse           INTEGER NOT NULL,
    translation_id  VARCHAR NOT NULL,  -- 'KJV', 'NVI', 'RVR'
    language        VARCHAR NOT NULL,  -- 'en', 'pt-br', 'es'
    text            VARCHAR NOT NULL,
    -- métricas
    word_count      INTEGER,
    sentiment_polarity    DOUBLE,
    sentiment_label       VARCHAR,
    -- metadata
    book_name       VARCHAR,
    testament       VARCHAR,
    category        VARCHAR,
    book_position   INTEGER,
    PRIMARY KEY (verse_id, translation_id)
);

-- Tabela de traduções disponíveis
CREATE TABLE translations (
    translation_id  VARCHAR PRIMARY KEY,
    language        VARCHAR NOT NULL,
    name            VARCHAR NOT NULL,
    full_name       VARCHAR,
    year            INTEGER,
    license         VARCHAR,
    source_api      VARCHAR
);

-- Alinhamento multi-idioma (mesma referência, múltiplas traduções)
CREATE VIEW v_parallel_verses AS
SELECT
    v1.verse_id,
    v1.book_name,
    v1.chapter,
    v1.verse,
    v1.text AS text_en,
    v2.text AS text_pt,
    v3.text AS text_es,
    v1.sentiment_polarity AS sentiment_en,
    v2.sentiment_polarity AS sentiment_pt
FROM verses v1
LEFT JOIN verses v2 ON v1.verse_id = v2.verse_id AND v2.translation_id = 'NVI'
LEFT JOIN verses v3 ON v1.verse_id = v3.verse_id AND v3.translation_id = 'RVR'
WHERE v1.translation_id = 'KJV';
```

#### 1.3 Tarefas para o Claude Code

```markdown
- [ ] Criar `src/extract/translations.py` — Registry de APIs/fontes por tradução
- [ ] Criar `src/extract/bible_sources.py` — Fetcher genérico multi-source
      - Cada source implementa interface: fetch_book(book_id) → list[RawVerse]
      - Retry, rate limit, cache — reutilizar padrões do bible_api.py
- [ ] Criar `src/transform/multilang_aligner.py`
      - Alinhar versículos por verse_id (livro.capítulo.versículo)
      - Detectar versículos faltantes em traduções específicas
      - Gerar relatório de cobertura por tradução
- [ ] Expandir schemas.py com Translation model
- [ ] Expandir DuckDB loader com tabela de traduções
- [ ] Adicionar testes: test_multilang.py
- [ ] CLI: `bible-pipeline run --translations KJV,NVI,RVR`
```

---

### Sprint 2: Referências Cruzadas (Cross-References) 🔗
**Objetivo:** Mapear as ~63.000 referências cruzadas e preparar dados para o arc diagram.

#### 2.1 Fonte de dados
O **Treasury of Scripture Knowledge (TSK)** é a base de dados mais completa de
cross-references bíblicas. Está em domínio público.

**Fontes possíveis:**
- OpenBible.info cross-references (CSV, ~340.000 pares)
- TSK em formato XML/JSON (github.com/scrollmapper/bible_databases)
- bible_databases SQLite (github.com/scrollmapper)

#### 2.2 Schema cross-references

```sql
CREATE TABLE cross_references (
    id              INTEGER PRIMARY KEY,
    source_verse_id VARCHAR NOT NULL,  -- 'GEN.1.1'
    target_verse_id VARCHAR NOT NULL,  -- 'JHN.1.1'
    source_book_id  VARCHAR NOT NULL,
    target_book_id  VARCHAR NOT NULL,
    source_position INTEGER NOT NULL,  -- posição canônica do livro (1-66)
    target_position INTEGER NOT NULL,
    reference_type  VARCHAR,           -- 'direct', 'thematic', 'prophetic'
    confidence      DOUBLE DEFAULT 1.0,
    -- para o arc diagram
    arc_distance    INTEGER GENERATED ALWAYS AS (ABS(target_position - source_position))
);

-- View: distribuição de arcos
CREATE VIEW v_crossref_arcs AS
SELECT
    source_book_id,
    target_book_id,
    source_position,
    target_position,
    COUNT(*) AS connection_count,
    AVG(arc_distance) AS avg_distance
FROM cross_references
GROUP BY source_book_id, target_book_id, source_position, target_position;

-- View: livros mais conectados
CREATE VIEW v_most_connected_books AS
SELECT
    book_id,
    book_name,
    outgoing + incoming AS total_connections,
    outgoing,
    incoming
FROM (
    SELECT
        b.book_id,
        b.book_name,
        COUNT(DISTINCT cr_out.id) AS outgoing,
        COUNT(DISTINCT cr_in.id) AS incoming
    FROM book_stats b
    LEFT JOIN cross_references cr_out ON b.book_id = cr_out.source_book_id
    LEFT JOIN cross_references cr_in ON b.book_id = cr_in.target_book_id
    GROUP BY b.book_id, b.book_name
);
```

#### 2.3 Dados para o Arc Diagram (formato de saída)

```json
// Endpoint: GET /api/crossrefs/arcs?book=PSA&min_connections=3
{
  "books": [
    {"id": "GEN", "name": "Genesis", "position": 1, "chapters": 50, "verse_count": 1533},
    // ... 66 livros
  ],
  "arcs": [
    {
      "source": {"book": "GEN", "chapter": 1, "verse": 1, "position": 0.0},
      "target": {"book": "JHN", "chapter": 1, "verse": 1, "position": 0.65},
      "weight": 5,
      "type": "thematic"
    },
    // ... milhares de arcos
  ],
  "metadata": {
    "total_arcs": 63779,
    "filtered_arcs": 1234,
    "color_scheme": "by_distance"  // ou "by_book", "by_testament"
  }
}
```

#### 2.4 Tarefas para o Claude Code

```markdown
- [ ] Criar `src/extract/crossref_extractor.py`
      - Download TSK/OpenBible cross-references
      - Parse CSV/XML → modelo CrossReference
      - Normalizar verse IDs para formato consistente
- [ ] Criar `src/transform/crossref_mapper.py`
      - Mapear verse IDs para posições canônicas
      - Calcular distância dos arcos
      - Classificar tipo de referência (direta, temática, profética)
      - Gerar dados agregados para visualização
- [ ] Expandir DuckDB loader com tabelas de cross-refs
- [ ] Endpoint API: GET /api/crossrefs/arcs (com filtros)
- [ ] Testes: test_crossrefs.py
```

---

### Sprint 3: Gemini API Integration 🤖
**Objetivo:** Usar IA generativa para enriquecer a experiência com explicações e comparações.

#### 3.1 Casos de uso do Gemini

| Feature | Input | Output | Cache? |
|---------|-------|--------|--------|
| **Explicar trecho** | Versículo(s) + contexto | Explicação em linguagem simples | Sim (por verse_id) |
| **Comparar traduções** | Mesmo versículo em N idiomas | Análise de diferenças | Sim (por verse_id + langs) |
| **Contexto histórico** | Livro + capítulo | Contexto cultural/histórico | Sim (por book+chapter) |
| **Conexões temáticas** | Versículo | Temas e versículos relacionados | Sim |
| **Resumo de capítulo** | Capítulo inteiro | Resumo + pontos-chave | Sim |

#### 3.2 Arquitetura do cliente Gemini

```python
# src/ai/gemini_client.py — Design do cliente

class GeminiClient:
    """
    Cliente Gemini com:
    - Rate limiting (RPM do free tier)
    - Cache em disco (evitar chamadas repetidas)
    - Retry com backoff exponencial
    - Batch processing
    - Fallback gracioso (se API falhar, retornar "não disponível")
    """

    def __init__(self, api_key: str, cache_dir: Path):
        self.model = "gemini-2.0-flash"  # Bom custo-benefício
        self.cache = DiskCache(cache_dir)  # JSON por chave
        self.rate_limiter = RateLimiter(rpm=15)  # Free tier

    async def explain_passage(
        self,
        verses: list[Verse],
        language: str = "pt-br",
        style: str = "simple",  # "simple", "academic", "devotional"
    ) -> PassageExplanation:
        """Explica um trecho bíblico."""
        ...

    async def compare_translations(
        self,
        verse_id: str,
        translations: dict[str, str],  # {"KJV": "...", "NVI": "..."}
    ) -> TranslationComparison:
        """Compara diferenças entre traduções."""
        ...

    async def get_historical_context(
        self,
        book_id: str,
        chapter: int,
    ) -> HistoricalContext:
        """Contexto histórico e cultural."""
        ...
```

#### 3.3 Sistema de cache

```
data/ai_cache/
├── explanations/
│   ├── GEN.1.1_pt-br_simple.json
│   ├── GEN.1.1_en_academic.json
│   └── PSA.23.1_pt-br_devotional.json
├── comparisons/
│   ├── GEN.1.1_KJV_NVI_RVR.json
│   └── JHN.3.16_KJV_NVI.json
└── context/
    ├── GEN_1.json
    └── PSA_23.json
```

**Regra de cache:** Só chamar Gemini se não existir cache.
Free tier = ~15 RPM → processar em batch offline, não on-demand.

#### 3.4 Templates de prompts

```markdown
# prompts/explain_passage.txt

Você é um estudioso bíblico que explica textos de forma {style}.

Dado o seguinte trecho bíblico ({translation}):

{reference}: "{text}"

Contexto do livro: {book_name} ({testament}), categoria: {category}

Forneça:
1. **Explicação** — O que esse trecho significa (3-5 frases)
2. **Contexto** — Quem escreveu, para quem, quando (~2 frases)
3. **Palavras-chave** — 3-5 termos importantes no original (hebraico/grego)
4. **Aplicação** — Relevância atemporal (~2 frases)

Responda em {language}. Formato JSON.
```

```markdown
# prompts/compare_translations.txt

Compare as seguintes traduções de {reference}:

{translations_formatted}

Analise:
1. **Diferenças principais** — Onde as traduções divergem?
2. **Nuances** — Que nuances cada tradução captura?
3. **Original** — Qual é mais fiel ao {original_language}?
4. **Recomendação** — Qual tradução transmite melhor a ideia central?

Responda em {language}. Formato JSON.
```

#### 3.5 Tarefas para o Claude Code

```markdown
- [ ] Criar `src/ai/gemini_client.py`
      - google-generativeai SDK
      - Rate limiter (token bucket)
      - Disk cache (JSON files)
      - Async com retry
- [ ] Criar `src/ai/passage_explainer.py`
- [ ] Criar `src/ai/translation_comparator.py`
- [ ] Criar `src/ai/theological_context.py`
- [ ] Criar templates em `src/ai/prompts/`
- [ ] Criar modelos Pydantic para responses da IA
- [ ] Script de batch: `scripts/batch_explain.py`
      - Processar N versículos mais populares offline
      - Salvar cache para uso no dashboard
- [ ] Testes com mock: test_gemini.py
- [ ] CLI: `bible-pipeline explain "John 3:16" --lang pt-br`
- [ ] CLI: `bible-pipeline compare "Gen 1:1" --translations KJV,NVI`
```

---

### Sprint 4: API REST (FastAPI) 🌐
**Objetivo:** Servir dados e insights via API REST para o frontend.

#### 4.1 Endpoints planejados

```yaml
# ── Versículos ──────────────────────────────────────
GET  /api/v1/verses/{verse_id}
     ?translations=KJV,NVI,RVR
     # Retorna versículo em múltiplas traduções

GET  /api/v1/verses/search
     ?q=love&translation=KJV&book=JHN&limit=50
     # Full-text search com filtros

GET  /api/v1/books
     # Lista todos os 66 livros com stats

GET  /api/v1/books/{book_id}/chapters/{chapter}
     ?translation=KJV
     # Capítulo inteiro com métricas

# ── Referências Cruzadas ────────────────────────────
GET  /api/v1/crossrefs/arcs
     ?source_book=PSA&min_weight=3&color_by=testament
     # Dados para arc diagram (otimizado para D3)

GET  /api/v1/crossrefs/{verse_id}
     # Cross-refs de um versículo específico

GET  /api/v1/crossrefs/network
     ?books=GEN,PSA,JHN&depth=2
     # Dados para network graph

# ── Analytics ───────────────────────────────────────
GET  /api/v1/analytics/sentiment
     ?group_by=book&testament=Old Testament
     # Dados de sentimento agregados

GET  /api/v1/analytics/heatmap
     ?metric=sentiment&resolution=chapter
     # Dados para heatmap

GET  /api/v1/analytics/wordcount
     ?group_by=category
     # Estatísticas de palavras

# ── AI Insights (Gemini) ───────────────────────────
POST /api/v1/ai/explain
     body: { "verse_id": "JHN.3.16", "language": "pt-br", "style": "simple" }
     # Explicação de trecho (cache-first)

POST /api/v1/ai/compare
     body: { "verse_id": "GEN.1.1", "translations": ["KJV", "NVI", "RVR"] }
     # Comparação de traduções

POST /api/v1/ai/context
     body: { "book_id": "PSA", "chapter": 23 }
     # Contexto histórico
```

#### 4.2 Tarefas para o Claude Code

```markdown
- [ ] Criar `src/api/main.py` — FastAPI app com CORS, docs, health check
- [ ] Criar routers: verses, crossrefs, analytics, ai_insights, search
- [ ] Criar `src/api/schemas.py` — Response models Pydantic
- [ ] Criar `src/api/dependencies.py` — DB connection pool, Gemini client
- [ ] Full-text search com DuckDB FTS extension
- [ ] Pagination padrão (cursor-based)
- [ ] Rate limiting nos endpoints de IA
- [ ] Dockerfile.api
- [ ] Testes: test_api.py com TestClient
- [ ] OpenAPI docs automáticas (/docs)
```

---

### Sprint 5: Frontend React + Visualizações 🎨
**Objetivo:** Dashboard moderno com o arc diagram e visualizações interativas.

#### 5.1 Páginas do frontend

| Página | Descrição | Lib Principal |
|--------|-----------|---------------|
| **Home** | Overview com KPIs, mini-arcs | Recharts |
| **Arc Diagram** | Visualização de cross-refs estilo Chris Harrison | D3.js |
| **Book Explorer** | Deep-dive por livro com sentimento | Recharts + D3 |
| **Parallel View** | Versículos lado-a-lado multi-idioma | Custom grid |
| **Sentiment Journey** | Sentimento ao longo de toda a Bíblia | D3.js area chart |
| **AI Explorer** | Chat/explain com Gemini sobre trechos | Custom + API |
| **Network Graph** | Grafo de relações entre livros | D3 force layout |
| **Search** | Busca full-text com highlights | Custom |

#### 5.2 Arc Diagram — Especificação técnica

```
Inspiração: Chris Harrison Bible Cross-References Visualization

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    ╭──────────────────╮                         │
│                ╭───┤                  ├───╮                     │
│            ╭───┤   │    Arcos SVG     │   ├───╮                │
│        ╭───┤   │   │   (D3.js)       │   │   ├───╮            │
│    ╭───┤   │   │   │                 │   │   │   ├───╮        │
│  ──┴───┴───┴───┴───┴─────────────────┴───┴───┴───┴───┴──      │
│  GEN EXO ... PSA ... ISA ... MAT ... JHN ... ROM ... REV       │
│  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬      │
│  │← Antigo Testamento →│         │← Novo Testamento →│        │
│                                                                 │
│  [Filtro por livro ▾]  [Cor: distância ▾]  [Min. conexões: 3]  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Interações:
- Hover em livro → destaca arcos conectados (fade outros para 5% opacidade)
- Click em livro → painel lateral com cross-refs detalhadas
- Slider → filtrar por mínimo de conexões
- Dropdown cor → por distância, testamento, categoria, sentimento
- Zoom → canvas zoomável
- Barra inferior → largura proporcional ao nº de versículos do livro
```

**Implementação D3.js:**

```typescript
// Conceito do ArcDiagram.tsx

interface ArcData {
  source: { book: string; position: number };  // 0.0 a 1.0 (normalizado)
  target: { book: string; position: number };
  weight: number;
  type: string;
}

// Os arcos são semicírculos SVG:
// Para cada par (source, target):
//   - x1 = source.position * width
//   - x2 = target.position * width
//   - raio = |x2 - x1| / 2
//   - path = `M ${x1},baseline A ${radius},${radius} 0 0,1 ${x2},baseline`
//
// Cor baseada na distância do arco (color scale viridis ou custom)
// Opacidade baseada no weight (mais conexões = mais visível)
// Performance: Canvas para >10k arcos, SVG para filtrados
```

#### 5.3 Paleta de cores sugerida

```css
:root {
  /* Inspiração: tons terrosos + celestiais — remetendo a manuscritos antigos */
  --color-parchment:    #F5F0E8;
  --color-ink:          #2C1810;
  --color-gold:         #B8860B;
  --color-old-testament:#4A7C59;  /* Verde — crescimento, criação */
  --color-new-testament:#6B4C9A; /* Roxo — realeza, redenção */
  --color-law:          #2E5090;
  --color-history:      #8B6914;
  --color-poetry:       #9B2335;
  --color-prophets:     #5C4033;
  --color-gospels:      #C5A55A;
  --color-epistles:     #4682B4;
  --color-apocalyptic:  #8B0000;
}
```

#### 5.4 Tarefas para o Claude Code

```markdown
- [ ] Setup React + Vite + TypeScript + Tailwind
- [ ] Layout principal: sidebar navigation + main content
- [ ] Componente ArcDiagram com D3.js
      - Performance: Canvas para rendering, SVG overlay para interação
      - Filtros: livro, min conexões, esquema de cor
      - Hover/click interactions
      - Responsivo (mobile: scroll horizontal)
- [ ] Componente SentimentHeatmap
      - 66 colunas (livros) × N linhas (capítulos)
      - Cor: gradiente verde→vermelho por sentimento
- [ ] Componente TranslationCompare
      - Side-by-side com diff highlighting
      - Integração com endpoint de AI compare
- [ ] Componente AIExplorer
      - Input: referência bíblica
      - Output: explicação Gemini com loading state
- [ ] Componente NetworkGraph
      - D3 force-directed layout
      - Nós = livros, arestas = cross-refs
      - Tamanho do nó = nº de versículos
- [ ] API client service (axios/fetch)
- [ ] Dark mode (manuscrito antigo → fundo escuro)
- [ ] Deploy: Dockerfile.frontend + nginx
```

---

### Sprint 6: Infraestrutura & Deploy ☁️
**Objetivo:** Tudo rodando em GCP com Terraform.

#### 6.1 Arquitetura GCP

```
                    ┌──────────────┐
                    │  Cloud Run   │──── Frontend React
                    │  (frontend)  │     (nginx + static)
                    └──────┬───────┘
                           │
┌──────────────┐   ┌──────▼───────┐   ┌──────────────┐
│  Cloud       │   │  Cloud Run   │   │  BigQuery    │
│  Scheduler   │──▶│  (API)       │──▶│  (analytics) │
│  (cron ETL)  │   │  FastAPI     │   │              │
└──────────────┘   └──────┬───────┘   └──────────────┘
                          │
                   ┌──────▼───────┐   ┌──────────────┐
                   │  Cloud       │   │  Secret      │
                   │  Storage     │   │  Manager     │
                   │  (data lake) │   │  (API keys)  │
                   └──────────────┘   └──────────────┘
```

#### 6.2 Tarefas para o Claude Code

```markdown
- [ ] Terraform modules: GCS, BigQuery, Cloud Run, Scheduler
- [ ] Dockerfiles otimizados (multi-stage, non-root)
- [ ] GitHub Actions deploy workflow
- [ ] Secret Manager para Gemini API key
- [ ] Cloud Scheduler para re-run semanal do pipeline
- [ ] CDN para assets do frontend
```

---

## 📊 Modelo de Dados Completo (v2.0)

```
┌─────────────┐     ┌───────────────┐     ┌──────────────┐
│ translations │     │    verses     │     │  book_stats  │
│─────────────│     │───────────────│     │──────────────│
│ translation_id│◄───│ translation_id│     │ book_id (PK) │
│ language     │     │ verse_id (PK) │────▶│ book_name    │
│ name         │     │ book_id       │     │ testament    │
│ year         │     │ chapter       │     │ total_verses │
│ license      │     │ verse         │     │ avg_sentiment│
└─────────────┘     │ text          │     └──────────────┘
                    │ word_count    │
                    │ sentiment_*   │     ┌──────────────┐
                    │ book_position │     │chapter_stats │
                    └───────┬───────┘     │──────────────│
                            │             │ book_id (PK) │
                    ┌───────▼───────┐     │ chapter (PK) │
                    │cross_references│     │ avg_sentiment│
                    │───────────────│     └──────────────┘
                    │ id (PK)      │
                    │ source_verse  │     ┌──────────────┐
                    │ target_verse  │     │  ai_cache    │
                    │ ref_type      │     │──────────────│
                    │ arc_distance  │     │ cache_key    │
                    └───────────────┘     │ prompt_type  │
                                          │ response     │
                                          │ created_at   │
                                          └──────────────┘
```

---

## 🎯 Prioridade de Execução

| Ordem | Sprint | Impacto | Complexidade | Estimativa |
|-------|--------|---------|-------------|------------|
| 1 | Multi-Idioma | 🔥🔥🔥 | Média | 3-4 dias |
| 2 | Cross-References | 🔥🔥🔥 | Média-Alta | 3-4 dias |
| 3 | API REST (FastAPI) | 🔥🔥🔥 | Média | 2-3 dias |
| 4 | Gemini Integration | 🔥🔥 | Média | 2-3 dias |
| 5 | Frontend + Arc Diagram | 🔥🔥🔥 | Alta | 5-7 dias |
| 6 | Infra/Deploy | 🔥 | Média | 2-3 dias |

**Total estimado: ~3-4 semanas com Claude Code dedicado**

---

## 📝 Notas para o Claude Code

### Padrões a seguir
- **Sempre** usar Pydantic para validação de dados
- **Sempre** implementar retry com backoff exponencial para APIs
- **Sempre** cachear respostas de APIs externas (JSON em disco)
- **Sempre** escrever testes para cada módulo novo
- **Sempre** documentar docstrings (Google style)
- **Nunca** commitar API keys (usar .env + Secret Manager)
- **Nunca** fazer requests sem rate limiting
- **Nunca** ignorar erros silenciosamente (log + fallback gracioso)

### Comandos úteis do Make (adicionar)
```makefile
run-multilang:  python -m src.cli run --translations KJV,NVI,RVR
run-crossrefs:  python -m src.cli crossrefs --source openbible
run-explain:    python -m src.cli explain "John 3:16" --lang pt-br
api:            uvicorn src.api.main:app --reload --port 8000
frontend:       cd frontend && npm run dev
```

### Referências técnicas
- OpenBible cross-references: https://www.openbible.info/labs/cross-references/
- Bible databases (SQLite): https://github.com/scrollmapper/bible_databases
- A Bíblia Digital API (PT-BR): https://www.abibliadigital.com.br/
- Gemini API: https://ai.google.dev/
- D3.js arc diagram: https://d3-graph-gallery.com/arc
- Chris Harrison visualization: https://www.chrisharrison.net/index.php/Visualizations/BibleViz

---

*Documento criado como roadmap para implementação com Claude Code.*
*Projeto de fé + engenharia de dados + IA. Para a glória de Deus.* 🕊️
