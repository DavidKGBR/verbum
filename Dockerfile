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
COPY dashboard/ dashboard/
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
COPY dashboard/ dashboard/

RUN mkdir -p data/raw data/processed data/analytics

EXPOSE 8501

ENTRYPOINT ["streamlit", "run", "dashboard/app.py", \
            "--server.port=8501", \
            "--server.address=0.0.0.0", \
            "--server.headless=true"]
