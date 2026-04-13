<h1 align="center">🕊️ Bible Data Pipeline</h1>

<p align="center">
  <strong>Multi-translation Bible analytics — ETL pipeline, cross-reference graph, REST API, React reader, and Gemini explanations.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.10%20|%203.11%20|%203.12-blue?logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/DuckDB-1.1+-yellow?logo=duckdb" alt="DuckDB">
  <img src="https://img.shields.io/badge/Gemini-AI-8E75B2?logo=google&logoColor=white" alt="Gemini">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

<p align="center">
  <a href="#-what-you-get">What you get</a> •
  <a href="#-quick-start">Quick start</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-api">API</a> •
  <a href="#-deployment">Deployment</a>
</p>

---

## 📖 What you get

A production-style data pipeline + reader app built around the Bible:

- **302,503 verses** across **10 translations** in **5 languages** (English: KJV, BBE, ASV, WEB, DARBY · Portuguese: NVI, RA, ACF · Spanish: RVR · French: APEE)
- **344,754 cross-references** (OpenBible.info) visualised as an interactive arc diagram à la Chris Harrison
- **NLP enrichment** — TextBlob sentiment per verse, per-chapter and per-book stats
- **FastAPI REST** with 20+ endpoints for books, verses, search, analytics, cross-refs, AI
- **React 19 / Vite frontend** with five surfaces: Home, Reader (single · parallel · immersive 3D book spread), Arc Diagram, Search, Bookmarks
- **Google Gemini explanations** — per-verse "AI Explain" panel with cached responses in EN or PT-BR
- **DuckDB** for analytics (blazing queries, pre-built views)
- **Streamlit dashboard** (legacy, still works) for data scientists who prefer notebooks over web UIs

---

## 🚀 Quick start

### 1. Install

```bash
git clone https://github.com/DavidKGBR/the-bible.git
cd the-bible
pip install -e ".[all]"
cd frontend && npm install && cd ..
cp .env.example .env          # fill in ABIBLIA_DIGITAL_TOKEN, GEMINI_API_KEY (optional)
```

### 2. Run the pipeline

```bash
# All 10 translations + cross-refs (cached runs take ~2 min)
python -m src.cli run --translations kjv,nvi,bbe,ra,acf,rvr,apee,asv,web,darby

# One translation, specific books
python -m src.cli run --books "GEN,PSA,JHN" --translations kjv

# See what got loaded
python -m src.cli info
```

### 3. Start the services

```bash
# Backend (FastAPI) — http://localhost:8000 · docs at /docs
python -m uvicorn src.api.main:app --reload

# Frontend (Vite) — http://localhost:5173
cd frontend && npm run dev

# Or the legacy Streamlit dashboard
make dashboard                # http://localhost:8501
```

---

## 🏗️ Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   EXTRACT   │───▶│  TRANSFORM   │───▶│    LOAD     │───▶│    SERVE     │
├─────────────┤    ├──────────────┤    ├─────────────┤    ├──────────────┤
│ bible-api   │    │  Clean +     │    │  DuckDB     │    │  FastAPI     │
│ abibliadig. │    │  HTML decode │    │  10 tables  │    │  20+ routes  │
│ OpenBible   │    │  TextBlob    │    │  views +    │    │              │
│ JSON cache  │    │  sentiment   │    │  344K refs  │    │  React SPA   │
│ per trans.  │    │  dedup       │    │             │    │  + Gemini    │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
```

### Tech stack

| Layer | Stack |
|-------|-------|
| **Extract** | `httpx`, per-translation JSON cache (`data/raw/{trans}/`) |
| **Transform** | `pandas`, `textblob`, `html.unescape`, KJV annotation stripper |
| **Load** | `duckdb` (analytical views, book/chapter stats), CSV exports |
| **API** | `fastapi`, `pydantic v2`, `typer` CLI |
| **Frontend** | `react 19`, `vite 6`, `typescript`, `tailwind v4`, `d3`, `react-router` |
| **AI** | `google-generativeai` (Gemini 2.0 Flash), disk cache with rate limiting |
| **Infra** | `docker`, `github actions`, `ruff`, `mypy`, `pytest` |
| **Cloud** | `google-cloud-storage`, `google-cloud-bigquery` (optional) |

### Source layout

```
src/
  cli.py              # Typer: run, info, sample, query
  pipeline.py         # BiblePipeline orchestrator (extract → transform → load)
  config.py           # Dataclass config + env overrides
  extract/
    bible_sources.py  # BibleSource ABC + BibleApiCom + AbibliaDigital impls
    translations.py   # TRANSLATION_REGISTRY: 10 translations
    crossref_extractor.py   # OpenBible.info cross-refs loader
  transform/
    cleaning.py       # normalize_text, dedup, validate
    enrichment.py     # metrics + sentiment + aggregates
    kjv_annotations.py  # strip {added words} and {Heb. marginal notes}
    multilang_aligner.py  # align verses across translations
  load/
    duckdb_loader.py  # schema, views, parameterised INSERTs
    gcs_loader.py     # optional GCS + BigQuery
  api/
    main.py           # FastAPI app
    routers/          # books, reader, crossrefs, analytics, search, ai_insights
  ai/
    gemini_client.py  # rate-limited + cached client
    passage_explainer.py  # explain + compare prompts
  models/
    schemas.py        # Pydantic: RawVerse, EnrichedVerse, Translation, etc.
frontend/src/
  pages/              # HomePage, ReaderPage, ArcDiagramPage, SearchPage, BookmarksPage
  components/         # BibleReader, ParallelView, ImmersiveReader/, ArcDiagram/,
                      # VerseActions, AIExplanationPanel, VerseOfTheDay, ...
  hooks/              # useArcData, useBookmarks, useReadingHistory,
                      # useTranslatorNotes
  services/api.ts     # typed wrapper around /api/v1
```

---

## 🔌 API

Full OpenAPI docs at `http://localhost:8000/docs`. Highlights:

```
GET  /api/v1/books                          # list all books (per translation)
GET  /api/v1/books/{book}/chapters/{ch}     # chapter with verse data
GET  /api/v1/reader/page?book=GEN&chapter=1&translation=kjv
                                            # chapter reader view (adds text_clean)
GET  /api/v1/reader/parallel?book=JHN&chapter=3&left=kjv&right=nvi
                                            # two-translation spread
GET  /api/v1/verses/search?q=love&translation=kjv
GET  /api/v1/verses/{verse_id}              # verse in one or more translations
GET  /api/v1/verses/{verse_id}/translations?translations=kjv,nvi,rvr
GET  /api/v1/verses/random?translation=kjv  # verse of the day
GET  /api/v1/crossrefs/arcs?source_book=GEN&target_book=REV
                                            # aggregated book-to-book arcs
GET  /api/v1/crossrefs/between?source_book=ISA&target_book=JER
                                            # detailed pairs between two books
GET  /api/v1/crossrefs/{verse_id}           # incoming + outgoing refs
GET  /api/v1/crossrefs/counts?book=GEN&chapter=1
                                            # per-verse ref counts for badges
GET  /api/v1/analytics/sentiment?group_by=book|testament|category
GET  /api/v1/analytics/translations         # per-translation stats
POST /api/v1/ai/explain                     # Gemini explanation (cached)
POST /api/v1/ai/compare                     # Gemini translation comparison
```

---

## 🎨 Frontend surfaces

| Route | Features |
|-------|----------|
| `/` | Hero with live stats · quick actions · Verse of the Day · John 3:16 in 6 translations · translations table |
| `/reader` | Three modes: **Single** (verse actions inline — cross-refs, Gemini, bookmark, copy, compare) · **Parallel** (two translations stacked on mobile, spread on desktop) · **Immersive** (3D book spread with spine, drop cap, ornate corners, page-flip, fullscreen `F` key) |
| `/arc-diagram` | 344K cross-refs rendered on canvas at 60fps · source + target filters · click arc or pick a pair → grouped detail panel |
| `/search` | Keyword pills · popular verses · highlighted matches · sentiment icon badges |
| `/bookmarks` | localStorage, per-device · seeded with John 3:16 / Psalm 23:1 / Philippians 4:13 when empty |

Responsive (hamburger drawer on `<md`), accessible (focus rings, ESC to close panels, keyboard nav in arc rows and verse actions).

---

## 📊 Dashboard (legacy)

The original Streamlit dashboard is still available for exploratory analytics:

```bash
make dashboard      # http://localhost:8501
```

Five pages: Overview, Book Explorer, Sentiment Analysis, Verse Search, Comparisons.

---

## ☁️ Deployment

Local dev is the current focus. GCP deploy (Cloud Run + Artifact Registry + BigQuery + Secret Manager + Terraform) is the next milestone — see [docs/](docs/) for the sketch when ready.

```bash
# Optional — upload DuckDB contents to BigQuery + GCS
export USE_GCP=true
export GCP_PROJECT_ID=your-project
export GCP_BUCKET_NAME=your-bucket
pip install -e ".[gcp]"
gcloud auth application-default login
python -m src.cli run
```

### Docker

```bash
docker compose up              # pipeline + dashboard
docker compose up pipeline     # pipeline only
docker compose --profile test run --rm tests
```

---

## 🧪 Testing & quality

```bash
make test            # fast tests (no @slow, no @integration)
make test-all        # full suite with coverage HTML
make lint            # ruff check
make typecheck       # mypy
make quality         # lint + typecheck + test
```

Frontend: `cd frontend && npx tsc --noEmit` for types; no component tests yet.

138 pytest cases covering cleaning, enrichment, loader, API routes, KJV annotations, and multi-language behaviour.

---

## 🛠️ Utility scripts

```bash
python scripts/fix_html_entities.py       # one-shot retrofit of DuckDB rows
                                          # with legacy HTML entities
```

---

## 🤝 Contributing

1. Fork, branch (`git checkout -b feature/something`).
2. `make quality` locally.
3. Commit with Conventional style (`feat:`, `polish:`, `fix:`).
4. PR against `main`.

---

## 📜 License

MIT — see [LICENSE](LICENSE).

## 🙏 Credits

- **Bible text**: [bible-api.com](https://bible-api.com), [abibliadigital.com.br](https://www.abibliadigital.com.br) (public domain translations)
- **Cross-references**: [OpenBible.info](https://www.openbible.info/labs/cross-references/)
- **NLP**: [TextBlob](https://textblob.readthedocs.io/)
- **Analytical DB**: [DuckDB](https://duckdb.org/)
- **AI**: [Google Gemini](https://ai.google.dev/)
- **Inspiration**: Chris Harrison's visualizations of the Bible

<p align="center"><strong>Built one sprint at a time with ❤️ and ☕</strong></p>
