"""
🌐 FastAPI Application — Verbum Bible Data Pipeline v1

REST API serving free multilingual biblical study tools — interlinear
analysis, cross-references, semantic threads, emotional landscape.

Built as a partnership between David Lourenço (authorship + purpose) and
Claude Opus 4.7 (execution + computational patience). 31,107 verses
manually labeled in PT-BR, 31,102 in ES, across 22–23 April 2026.

Soli Deo Gloria.
"""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.api.routers import (
    ai_insights,
    analytics,
    audio,
    authors,
    books,
    community,
    compare,
    crossrefs,
    deep_analytics,
    devotional,
    emotional,
    explorer,
    genealogy,
    home,
    intertextuality,
    lexicon,
    open_questions,
    people,
    places,
    reader,
    search,
    semantic,
    special_passages,
    structure,
    threads,
    timeline,
    topics,
)

# ── Sentry (optional, gated by SENTRY_DSN) ────────────────────────────────────
# Initialize BEFORE creating the FastAPI app so the integration captures startup
# errors. No-op when the DSN is missing — keeps local dev free of telemetry.
_SENTRY_DSN = os.getenv("SENTRY_DSN", "").strip()
if _SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration

    sentry_sdk.init(
        dsn=_SENTRY_DSN,
        integrations=[StarletteIntegration(), FastApiIntegration()],
        traces_sample_rate=0.05,    # 5% of requests get a perf trace; cheap on free tier
        profiles_sample_rate=0.0,   # Profiling off — too costly on Cloud Run cold starts
        send_default_pii=False,     # Don't capture IP / cookies / user identifiers
        environment=os.getenv("SENTRY_ENV", "production"),
        release=os.getenv("VERBUM_RELEASE", "verbum-api@2.0.0"),
    )

app = FastAPI(
    title="Bible Data Pipeline API",
    description="REST API for Biblical text analytics",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Order matters: static paths before dynamic path params
app.include_router(search.router, prefix="/api/v1", tags=["Search"])
app.include_router(analytics.router, prefix="/api/v1", tags=["Analytics"])
app.include_router(crossrefs.router, prefix="/api/v1", tags=["Cross-References"])
app.include_router(reader.router, prefix="/api/v1", tags=["Reader"])
app.include_router(ai_insights.router, prefix="/api/v1", tags=["AI Insights"])
app.include_router(books.router, prefix="/api/v1", tags=["Books & Verses"])
app.include_router(lexicon.router, prefix="/api/v1", tags=["Lexicon & Interlinear"])
app.include_router(semantic.router, prefix="/api/v1", tags=["Semantic Graph"])
app.include_router(explorer.router, prefix="/api/v1", tags=["Explorer"])
app.include_router(authors.router, prefix="/api/v1", tags=["Authors"])
app.include_router(people.router, prefix="/api/v1", tags=["People"])
app.include_router(places.router, prefix="/api/v1", tags=["Places"])
app.include_router(timeline.router, prefix="/api/v1", tags=["Timeline"])
app.include_router(compare.router, prefix="/api/v1", tags=["Compare"])
app.include_router(topics.router, prefix="/api/v1", tags=["Topics"])
app.include_router(special_passages.router, prefix="/api/v1", tags=["Special Passages"])
app.include_router(devotional.router, prefix="/api/v1", tags=["Devotional"])
app.include_router(deep_analytics.router, prefix="/api/v1", tags=["Deep Analytics"])
app.include_router(intertextuality.router, prefix="/api/v1", tags=["Intertextuality"])
app.include_router(open_questions.router, prefix="/api/v1", tags=["Open Questions"])
app.include_router(threads.router, prefix="/api/v1", tags=["Semantic Threads"])
app.include_router(structure.router, prefix="/api/v1", tags=["Literary Structure"])
app.include_router(genealogy.router, prefix="/api/v1", tags=["Semantic Genealogy"])
app.include_router(emotional.router, prefix="/api/v1", tags=["Emotional Landscape"])
app.include_router(home.router, prefix="/api/v1", tags=["Home"])
app.include_router(community.router, prefix="/api/v1", tags=["Community Notes"])
app.include_router(audio.router, prefix="/api/v1", tags=["Audio"])


@app.get("/health")
def health_check() -> dict:
    """Health check + cheap DB probe.

    Returns 200 with a verse count when DuckDB is reachable; useful for Cloud
    Run uptime checks and Sentry release verification. The COUNT is fast
    (DuckDB keeps a stats cache), so this stays sub-10ms.
    """
    from src.api.dependencies import get_db

    payload: dict = {
        "status": "ok",
        "version": "2.0.0",
        "release": os.getenv("VERBUM_RELEASE", "verbum-api@2.0.0"),
        "sentry": bool(_SENTRY_DSN),
    }
    try:
        conn = get_db()
        try:
            row = conn.execute("SELECT COUNT(*) FROM verses").fetchone()
            payload["db_verses_count"] = int(row[0]) if row else 0
        finally:
            conn.close()
    except Exception as exc:  # noqa: BLE001 — health check must never raise
        payload["status"] = "degraded"
        payload["db_error"] = str(exc)[:120]
    return payload


# ── Static audio files (Fase 5A — Neural2 pronunciations) ───────────────────
# Mounted AFTER all API routes so /audio/* never conflicts with /api/v1/*.
_AUDIO_DIR = Path("data/audio")
_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/audio", StaticFiles(directory=str(_AUDIO_DIR)), name="audio")
