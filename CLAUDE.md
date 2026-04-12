# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bible Data Pipeline is a Python ETL system that processes the entire Bible (66 books, ~31K verses) through Extract (bible-api.com REST API) -> Transform (cleaning, NLP sentiment analysis via TextBlob) -> Load (DuckDB + optional GCP). Includes a Streamlit analytics dashboard.

## Commands

### Setup
```bash
pip install -e ".[all]"      # Install all deps (dev + dashboard + gcp)
pre-commit install            # Set up git hooks
```

### Run Pipeline
```bash
make run                      # Full pipeline (all 66 books)
make run-sample               # Quick run: GEN, PSA, JHN, REV only
python -m src.cli run --books "GEN,EXO"  # Specific books
```

### Quality
```bash
make test                     # Fast tests (excludes integration/slow)
make test-all                 # All tests with coverage + HTML report
pytest tests/test_transform.py -v              # Single test file
pytest tests/test_transform.py::test_name -v   # Single test
make lint                     # ruff check src/ tests/
make format                   # ruff format + fix
make typecheck                # mypy src/ --ignore-missing-imports
make quality                  # lint + typecheck + test
```

### Other
```bash
make info                     # Database summary stats
make query SQL="SELECT ..."   # Ad-hoc SQL against DuckDB
make dashboard                # Launch Streamlit dashboard
make clean                    # Remove generated data and caches
```

## Architecture

The pipeline follows a strict ETL pattern with three phases orchestrated by `BiblePipeline` in `src/pipeline.py`:

```
src/
  cli.py              # Typer CLI: run, query, info, sample commands
  config.py           # Dataclass-based config with env var overrides
  pipeline.py         # Orchestrator: Extract -> Transform -> Load
  extract/
    bible_api.py      # BibleExtractor: REST client with retry, rate limiting, JSON caching
  transform/
    cleaning.py       # normalize_text, remove_duplicates, validate_verses, clean_verses
    enrichment.py     # Text metrics, TextBlob sentiment, book/chapter aggregations
  load/
    duckdb_loader.py  # DuckDBLoader: schema creation, table loading, analytical views
    gcs_loader.py     # GCSLoader: optional GCS + BigQuery upload
  models/
    schemas.py        # Pydantic models (RawVerse, EnrichedVerse, PipelineMetrics, etc.)
                      # BOOK_CATALOG: all 66 books with metadata (testament, category, position)
```

**Data flow:** `BibleExtractor` fetches from bible-api.com per chapter (with local JSON cache in `data/raw/`). `clean_verses()` normalizes and deduplicates. `enrich_dataframe()` adds book metadata from `BOOK_CATALOG`, computes word/char counts, and runs TextBlob sentiment. Results load into DuckDB tables (`verses`, `book_stats`, `chapter_stats`, `pipeline_runs`) with pre-built analytical views. CSVs are also exported to `data/processed/` and `data/analytics/`.

**Loaders use context managers** (`__enter__`/`__exit__`) for resource management. GCP integration is optional and controlled by `USE_GCP` env var.

**Dashboard** (`dashboard/app.py`): Streamlit app with 5 pages (Overview, Book Explorer, Sentiment Analysis, Verse Search, Comparisons) reading from DuckDB.

## Code Style

- Python 3.10+ (uses `X | Y` union syntax, not `Optional[X]`)
- Ruff linter with line length 100
- Strict mypy: `disallow_untyped_defs = true`
- Pydantic v2 for data validation
- Rich for terminal output formatting
- Test markers: `@pytest.mark.integration`, `@pytest.mark.slow`
