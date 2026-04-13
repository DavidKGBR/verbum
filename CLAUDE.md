# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Bible Data Pipeline v2 is a full-stack multi-translation Bible analytics app:

- **Pipeline**: Python ETL that pulls 10 translations (KJV, BBE, NVI, RA, ACF, RVR, APEE, ASV, WEB, DARBY) from bible-api.com + abibliadigital.com.br, enriches with TextBlob sentiment, and loads into DuckDB (302K verses + 344K OpenBible cross-references).
- **Backend**: FastAPI serving `/api/v1/*` (books, reader, parallel, search, crossrefs, analytics, AI).
- **Frontend**: React 19 + Vite + Tailwind with five routes — Home, Reader (single/parallel/immersive 3D spread), Arc Diagram (Canvas), Search, Bookmarks. Hooks for bookmarks/history/translator-notes kept in localStorage.
- **AI**: optional Gemini client for per-verse explanations (cached on disk, rate-limited).
- **Legacy**: Streamlit dashboard still at `dashboard/app.py` for notebook-style exploration.
- **Cloud**: GCP deploy (Cloud Run + BigQuery + Secret Manager + Terraform) is the next milestone, not yet started.

## Commands

### Setup
```bash
pip install -e ".[all]"                  # all deps (api + dashboard + gcp + dev)
cd frontend && npm install && cd ..
cp .env.example .env                     # set ABIBLIA_DIGITAL_TOKEN and GEMINI_API_KEY
pre-commit install
```

### Pipeline
```bash
# All 10 translations (cached runs take ~2 min; first fetch is longer)
python -m src.cli run --translations kjv,nvi,bbe,ra,acf,rvr,apee,asv,web,darby

# Single translation, specific books
python -m src.cli run --books "GEN,PSA" --translations kjv

# Legacy shortcuts
make run          # all books, all translations
make run-sample   # GEN, PSA, JHN, REV
make info         # DB summary
make query SQL="..."
```

### Backend (FastAPI)
```bash
# Windows (PYTHONIOENCODING=utf-8 keeps Rich emojis rendering)
PYTHONIOENCODING=utf-8 python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload

# Docs at http://localhost:8000/docs
```

### Frontend (Vite)
```bash
cd frontend
npm run dev             # http://localhost:5173, proxies /api to :8000
npx tsc --noEmit        # types only
npm run build           # production build to frontend/dist
```

### Quality
```bash
make test               # fast tests (excludes @integration + @slow)
make test-all           # full suite with coverage HTML
pytest tests/test_transform.py::TestStripKjvAnnotations -v
make lint               # ruff check
make typecheck          # mypy
make quality            # lint + typecheck + test
```

### Utility scripts
```bash
python scripts/fix_html_entities.py     # retrofit DuckDB rows that still
                                        # have HTML entities from pre-fix cache
```

## Architecture

The pipeline is orchestrated by `BiblePipeline` in `src/pipeline.py` (Extract → Transform → Load). All three phases are translation-aware; loaders and models carry `translation_id` and `language` on every row.

```
src/
  cli.py              # Typer: run, info, sample, query
  pipeline.py         # BiblePipeline orchestrator
  config.py           # Dataclass config with env overrides
  extract/
    bible_sources.py        # BibleSource ABC, BibleApiCom, AbibliaDigital
    translations.py         # TRANSLATION_REGISTRY (10 entries, book abbrev maps)
    crossref_extractor.py   # OpenBible.info parser
    bible_api.py            # legacy v1 client (still used internally)
  transform/
    cleaning.py             # normalize_text (html.unescape, whitespace, smart quotes)
    enrichment.py           # sentiment + metrics + book/chapter aggregates
    kjv_annotations.py      # strip_kjv_annotations — removes {Heb. ...}, keeps {added words}
    multilang_aligner.py    # align verses across translations, coverage report
    crossref_mapper.py
  load/
    duckdb_loader.py        # schema, views, parameterised inserts
    gcs_loader.py           # optional GCS + BigQuery
  api/
    main.py                 # FastAPI app, CORS, router wiring
    dependencies.py         # get_db() per-request DuckDB connection
    routers/
      books.py              # /books, /books/.../chapters, /verses/*, /verses/random
      reader.py             # /reader/page, /reader/parallel (adds text_clean for KJV)
      search.py             # /verses/search
      analytics.py          # /analytics/sentiment, /analytics/translations, /analytics/heatmap
      crossrefs.py          # /crossrefs/arcs, /crossrefs/between, /crossrefs/counts, /crossrefs/{id}, /crossrefs/network
      ai_insights.py        # /ai/explain, /ai/compare (Gemini, cached)
  ai/
    gemini_client.py        # rate-limited, disk-cached client
    passage_explainer.py    # prompts in src/ai/prompts/*.txt
  models/schemas.py         # Pydantic v2 + BOOK_CATALOG (66 books)

frontend/src/
  App.tsx, main.tsx, Layout.tsx
  pages/                    # HomePage, ReaderPage, ArcDiagramPage, SearchPage, BookmarksPage
  components/
    BibleReader.tsx         # single-translation reader + VerseActions + xref badges
    ParallelView.tsx        # two translations side by side (always uses text_clean)
    VerseActions.tsx        # per-verse expander: cross-refs, AI, compare, save, copy
    AIExplanationPanel.tsx  # Gemini panel with EN/PT toggle + session cache
    VerseOfTheDay.tsx, TranslationPreview.tsx
    ArcDiagram/
      ArcDiagram.tsx        # Canvas renderer (semielipses), ResizeObserver responsive
      ArcDetailPanel.tsx    # chapter-grouped cross-refs with "Show more"
      arcUtils.ts
    ImmersiveReader/
      ImmersiveReader.tsx   # 3D book spread, flip animation, F = fullscreen
      DropCap.tsx, OrnateCorner.tsx
    reader/
      kjvAnnotations.ts     # parses {...} into segments + notes
  hooks/
    useArcData.ts           # arc fetch + ArcFilters {sourceBook, targetBook, minConnections, colorBy}
    useBookmarks.ts         # localStorage 'bible-bookmarks'
    useReadingHistory.ts    # localStorage 'bible-reading-history'
    useTranslatorNotes.ts   # per-session toggle
  services/api.ts           # typed fetch wrappers, Base '/api/v1'
```

### Key invariants

- `translation_id` is a first-class dimension everywhere: Pydantic models, DuckDB primary keys, cleaning dedup keys, and API query strings. Don't treat the schema as single-translation.
- DuckDB `verses` PK is `(translation_id, book_id, chapter, verse)`; `book_stats` and `chapter_stats` are grouped per translation.
- `scripts/fix_html_entities.py` exists for retrofitting pre-fix DuckDB rows. `normalize_text()` already runs `html.unescape()` on the way in, so new pipelines are safe.
- KJV alone carries `{...}` translator annotations. Reader endpoints attach a `text_clean` string so the frontend can toggle display without re-fetching.
- Uvicorn `--reload` occasionally fails to pick up router imports on Windows. If `text_clean` or a new route is missing in the response, `taskkill //F //IM python.exe` and restart.

### Data flow

1. **Extract**: `BibleSource` implementations fetch per chapter; JSON cache lives at `data/raw/{translation_id}/{book_id}.json`. Missing books are detected and re-fetched.
2. **Transform**: `clean_verses` (dedup + normalize + html.unescape + validate) → `enrich_dataframe` (book metadata from `BOOK_CATALOG` + TextBlob sentiment + metrics) → `compute_book_stats` and `compute_chapter_stats`.
3. **Load**: `DuckDBLoader` creates schema + views, loads per-translation (scoped DELETE so other translations aren't touched). Cross-references load separately via `crossref_mapper` + `crossref_extractor`.

## Code style

- Python 3.10+ (use `X | Y` unions, not `Optional[X]`).
- Ruff line length 100; isort-clean (`make lint` will flag reorderings).
- Strict mypy (`disallow_untyped_defs = true`); some routers use type: ignore for `fetchone()[0]` because DuckDB's dynamic typing.
- Pydantic v2, FastAPI `Query(..., description=...)` for every param.
- Rich for terminal output; `PYTHONIOENCODING=utf-8` on Windows to avoid charmap crashes.
- React: function components + hooks, no Redux. CSS via Tailwind v4 + CSS custom properties in `frontend/src/index.css`. Strict TypeScript (`noUnusedLocals`, etc.).

## Testing

- `tests/test_transform.py` — normalize + html entities + KJV annotations + enrichment.
- `tests/test_api.py` — FastAPI TestClient with seeded temp DuckDB.
- `tests/test_multilang.py` — source registry + multi-translation behaviours.
- `tests/test_crossrefs.py` — crossref parser + loader.
- `tests/test_load.py`, `tests/test_extract.py`, `tests/test_gemini.py`.

Markers: `@pytest.mark.integration`, `@pytest.mark.slow`.

## When things go wrong

- **Pipeline prints charmap error**: export `PYTHONIOENCODING=utf-8` before the command.
- **Vite proxy 502**: backend is down or on a different port. `curl localhost:8000/health` first.
- **`/ai/explain` 503**: `GEMINI_API_KEY` missing in `.env`. Frontend handles this gracefully.
- **Arc Diagram looks clipped**: ensure `ArcDiagram.tsx` uses `ctx.ellipse` (not `ctx.arc`) so tall arcs flatten — tall `rx` > vertical space is expected.
- **abibliadigital 401**: token expired / malformed. Check `.env` has the single-line JWT.
