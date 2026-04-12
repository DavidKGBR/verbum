<h1 align="center">🕊️ Bible Data Pipeline</h1>

<p align="center">
  <strong>A production-grade data engineering pipeline for Biblical text analytics</strong>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/python-3.10%20|%203.11%20|%203.12-blue?logo=python&logoColor=white" alt="Python"></a>
  <a href="#"><img src="https://img.shields.io/badge/DuckDB-1.1+-yellow?logo=duckdb" alt="DuckDB"></a>
  <a href="#"><img src="https://img.shields.io/badge/Streamlit-dashboard-red?logo=streamlit" alt="Streamlit"></a>
  <a href="#"><img src="https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white" alt="Docker"></a>
  <a href="#"><img src="https://img.shields.io/badge/GCP-optional-4285F4?logo=googlecloud&logoColor=white" alt="GCP"></a>
  <a href="#"><img src="https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=github-actions&logoColor=white" alt="CI/CD"></a>
  <a href="#"><img src="https://img.shields.io/badge/license-MIT-green" alt="License"></a>
</p>

<p align="center">
  <a href="#-architecture">Architecture</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-pipeline-phases">Pipeline</a> •
  <a href="#-dashboard">Dashboard</a> •
  <a href="#-gcp-deployment">GCP</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

## 📖 About

**Bible Data Pipeline** is a complete ETL (Extract, Transform, Load) system that processes the entire Bible (66 books, ~31,000 verses) through a robust data engineering pipeline with NLP enrichment, analytical views, and an interactive dashboard.

Built as a showcase of modern data engineering practices applied to one of the world's most analyzed texts.

### ✨ Features

- **🔄 Full ETL Pipeline** — Extract from REST API → Clean & Validate → Enrich with NLP → Load to DuckDB
- **🧠 NLP Analysis** — Sentiment analysis, text metrics, and statistical features for every verse
- **📊 Interactive Dashboard** — Streamlit-powered analytics with Plotly visualizations
- **🦆 DuckDB Analytics** — Blazing-fast analytical queries with pre-built views
- **☁️ GCP Ready** — Optional deployment to GCS + BigQuery
- **🐳 Dockerized** — Multi-stage Docker build for pipeline and dashboard
- **🧪 Tested** — Comprehensive test suite with pytest + coverage
- **⚡ CI/CD** — GitHub Actions for linting, testing, and Docker builds

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Bible Data Pipeline                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │ EXTRACT  │───▶│  TRANSFORM   │───▶│    LOAD      │              │
│  │          │    │              │    │              │              │
│  │ Bible API│    │ • Cleaning   │    │ • DuckDB     │              │
│  │ (REST)   │    │ • Validation │    │ • GCS        │              │
│  │          │    │ • Enrichment │    │ • BigQuery   │              │
│  │ Cache ◄──│    │ • NLP/Sent.  │    │ • CSV Export │              │
│  │ (JSON)   │    │ • Metrics    │    │              │              │
│  └──────────┘    └──────────────┘    └──────┬───────┘              │
│                                             │                      │
│                                    ┌────────▼────────┐             │
│                                    │   ANALYTICS     │             │
│                                    │                 │             │
│                                    │ • SQL Views     │             │
│                                    │ • Aggregations  │             │
│                                    │ • Dashboard     │             │
│                                    └─────────────────┘             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Extract** | `httpx` | REST API client with retry logic |
| **Validate** | `pydantic` | Data model validation |
| **Transform** | `pandas`, `textblob` | Data processing & NLP |
| **Load** | `duckdb` | Analytical database |
| **Visualize** | `streamlit`, `plotly` | Interactive dashboard |
| **Cloud** | `gcs`, `bigquery` | GCP deployment (optional) |
| **CLI** | `typer`, `rich` | Beautiful command-line interface |
| **Quality** | `pytest`, `ruff`, `mypy` | Testing & linting |
| **Infra** | `docker`, `github actions` | Containerization & CI/CD |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- pip or uv

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/bible-data-pipeline.git
cd bible-data-pipeline

# Install dependencies
pip install -e ".[all]"

# Copy environment file
cp .env.example .env
```

### Run the Pipeline

```bash
# Full pipeline (all 66 books) — takes ~15-20 minutes on first run
make run

# Quick test with a few books
make run-sample

# Or use the CLI directly
python -m src.cli run --books "GEN,PSA,JHN,REV"
```

### Launch the Dashboard

```bash
make dashboard
# Opens at http://localhost:8501
```

### Query the Database

```bash
# Show database summary
make info

# Run custom SQL queries
make query SQL="SELECT book_name, total_verses FROM book_stats ORDER BY total_verses DESC LIMIT 10"

# Or use the CLI
python -m src.cli query "SELECT * FROM v_testament_summary"
```

---

## 🔄 Pipeline Phases

### Phase 1: Extract 📥

Fetches Bible text from [bible-api.com](https://bible-api.com) with:

- Automatic retry with exponential backoff
- Rate limiting to respect API limits
- Local JSON caching (subsequent runs skip the API)
- Configurable book selection

### Phase 2: Transform 🔄

Processes raw text through multiple stages:

1. **Cleaning** — Normalize whitespace, fix encoding, deduplicate
2. **Validation** — Pydantic model validation for every verse
3. **Enrichment** — Add book metadata (testament, category, position)
4. **Text Metrics** — Word count, character count, average word length
5. **Sentiment Analysis** — Polarity, subjectivity, and classification per verse
6. **Aggregation** — Book-level and chapter-level statistics

### Phase 3: Load 📤

Loads enriched data into multiple targets:

- **DuckDB** (default) — Local analytical database with pre-built views
- **CSV Export** — Portable data files for further analysis
- **GCS + BigQuery** (optional) — Cloud deployment for production

### Pre-built Analytical Views

| View | Description |
|------|-------------|
| `v_testament_summary` | Old vs New Testament aggregate stats |
| `v_category_summary` | Stats by book category (Law, Poetry, Gospels...) |
| `v_longest_verses` | Top 50 longest verses by word count |
| `v_most_positive_chapters` | Chapters ranked by average sentiment |
| `v_sentiment_journey` | Sentiment progression across the entire Bible |

---

## 📊 Dashboard

The Streamlit dashboard includes 5 interactive pages:

| Page | Features |
|------|----------|
| **📊 Overview** | KPI cards, testament distribution, word count by book |
| **📖 Book Explorer** | Deep-dive into any book with chapter sentiment charts |
| **💭 Sentiment** | Sentiment journey across all 66 books, extreme verses |
| **🔍 Search** | Full-text verse search with analytics |
| **📈 Comparisons** | Side-by-side book comparisons |

---

## ☁️ GCP Deployment

### Setup

```bash
# Configure environment
export USE_GCP=true
export GCP_PROJECT_ID=your-project-id
export GCP_BUCKET_NAME=your-bucket

# Install GCP dependencies
pip install -e ".[gcp]"

# Authenticate
gcloud auth application-default login

# Run with GCP upload
python -m src.cli run
```

### Architecture on GCP

```
bible-api.com → Cloud Function → GCS (raw/) → Dataflow → BigQuery → Looker Studio
                                  GCS (processed/)
```

---

## 🐳 Docker

```bash
# Build and run everything
docker compose up

# Run pipeline only
docker compose up pipeline

# Run tests in container
docker compose --profile test run --rm tests

# Dashboard only (requires data)
docker compose up dashboard
```

---

## 🧪 Testing

```bash
# Run all tests
make test

# Run with coverage report
make test-all

# Run specific test file
pytest tests/test_transform.py -v

# Run only fast tests
pytest -m "not slow and not integration"
```

---

## 📁 Project Structure

```
bible-data-pipeline/
├── .github/workflows/     # CI/CD pipelines
│   └── ci.yml
├── dashboard/             # Streamlit dashboard
│   └── app.py
├── data/                  # Data directory (gitignored)
│   ├── raw/               # Raw JSON from API
│   ├── processed/         # Cleaned CSVs
│   └── analytics/         # DuckDB + aggregated stats
├── docs/                  # Documentation
├── scripts/               # Utility scripts
├── src/                   # Source code
│   ├── extract/           # API extraction
│   │   └── bible_api.py
│   ├── transform/         # Cleaning & enrichment
│   │   ├── cleaning.py
│   │   └── enrichment.py
│   ├── load/              # Database loaders
│   │   ├── duckdb_loader.py
│   │   └── gcs_loader.py
│   ├── models/            # Pydantic schemas
│   │   └── schemas.py
│   ├── cli.py             # CLI interface
│   ├── config.py          # Configuration
│   └── pipeline.py        # Orchestrator
├── tests/                 # Test suite
│   ├── test_extract.py
│   ├── test_transform.py
│   └── test_load.py
├── .env.example           # Environment template
├── .gitignore
├── .pre-commit-config.yaml
├── docker-compose.yml
├── Dockerfile
├── Makefile
├── pyproject.toml
└── README.md
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Install dev dependencies (`make dev`)
4. Make your changes
5. Run quality checks (`make quality`)
6. Commit (`git commit -m 'feat: add amazing feature'`)
7. Push (`git push origin feature/amazing-feature`)
8. Open a Pull Request

---

## 📊 Sample Insights

Some interesting findings from the pipeline:

- **Longest book:** Psalms (2,461 verses)
- **Shortest book:** 3 John (14 verses)
- **Most positive book category:** Poetry (Psalms, Proverbs, Song of Solomon)
- **Total words:** ~783,000 (KJV)
- **Sentiment journey:** Clear shift from narrative (Old Testament) to epistolary (New Testament)

---

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Bible text data:** [bible-api.com](https://bible-api.com) (KJV — public domain)
- **NLP:** [TextBlob](https://textblob.readthedocs.io/)
- **Database:** [DuckDB](https://duckdb.org/)
- **AI Assistant:** Built with the help of [Claude](https://claude.ai) by Anthropic

---

<p align="center">
  <strong>Built with ❤️ and ☕ for data engineering</strong>
</p>
