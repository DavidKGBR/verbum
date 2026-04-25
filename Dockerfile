# ─── Bible Data Pipeline ──────────────────────────────────────────────────────
# Multi-stage build for production ETL pipeline
# ──────────────────────────────────────────────────────────────────────────────

FROM python:3.12-slim AS base

LABEL maintainer="Your Name <your@email.com>"
LABEL description="Bible Data Pipeline — Production ETL for Biblical text analytics"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# ─── Dependencies stage ──────────────────────────────────────────────────────

FROM base AS deps

COPY pyproject.toml .
RUN pip install --no-cache-dir ".[all]" && \
    python -c "import nltk; nltk.download('punkt_tab', quiet=True)" 2>/dev/null || true

# ─── Production stage ─────────────────────────────────────────────────────────

FROM deps AS production

COPY src/ src/
COPY legacy/dashboard/ dashboard/
COPY scripts/ scripts/

# Create data directories
RUN mkdir -p data/raw data/processed data/analytics

# Non-root user for security
RUN groupadd -r pipeline && useradd -r -g pipeline -d /app pipeline
RUN chown -R pipeline:pipeline /app
USER pipeline

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import src; print('healthy')" || exit 1

ENTRYPOINT ["python", "-m", "src.cli"]
CMD ["run"]

# ─── Dashboard stage ──────────────────────────────────────────────────────────

FROM deps AS dashboard

COPY src/ src/
COPY legacy/dashboard/ dashboard/

RUN mkdir -p data/raw data/processed data/analytics

EXPOSE 8501

ENTRYPOINT ["streamlit", "run", "dashboard/app.py", \
            "--server.port=8501", \
            "--server.address=0.0.0.0", \
            "--server.headless=true"]

# ─── API stage (Cloud Run target — MUST be last) ─────────────────────────────
#
# `gcloud builds submit --tag` doesn't accept --target, so it tags whatever
# the FINAL stage produces. Keep `api` last so the deploy script tags the
# right image without needing a cloudbuild.yaml.

FROM deps AS api

# Source code
COPY src/ src/

# Data baked into image:
#   - DuckDB analytics (~270 MB) — primary read store
#   - Audio MP3s (~119 MB)        — TTS for interlinear (Strong's HE+GR)
#   - Static JSONs (~512 KB)      — devotional plans, special passages, etc.
# AI cache (data/ai_cache/) is created at runtime and ephemeral per instance.
# That's acceptable for v1 because Pydantic Literal whitelists make the
# prompt space finite — same (verse, lang, style, tx) hits cache fast.
COPY data/analytics/bible.duckdb data/analytics/bible.duckdb
COPY data/audio/ data/audio/
COPY data/static/ data/static/

# Cloud Run injects PORT (default 8080). Bind to 0.0.0.0.
ENV PORT=8080 \
    PYTHONIOENCODING=utf-8

EXPOSE 8080

# Use exec form so SIGTERM reaches uvicorn cleanly (graceful shutdown).
# `--workers 1` is intentional: Cloud Run fronts requests with a single
# instance and handles concurrency at its layer; multi-worker doubles
# memory for a 270MB DuckDB file with no upside.
CMD exec uvicorn src.api.main:app --host 0.0.0.0 --port ${PORT} --workers 1
