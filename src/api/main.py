"""
🌐 FastAPI Application
REST API for Bible Data Pipeline analytics.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.api.routers import (
    ai_insights,
    analytics,
    authors,
    books,
    community,
    compare,
    crossrefs,
    deep_analytics,
    devotional,
    emotional,
    explorer,
    home,
    intertextuality,
    lexicon,
    open_questions,
    people,
    places,
    reader,
    search,
    semantic,
    structure,
    threads,
    timeline,
    topics,
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
app.include_router(devotional.router, prefix="/api/v1", tags=["Devotional"])
app.include_router(deep_analytics.router, prefix="/api/v1", tags=["Deep Analytics"])
app.include_router(intertextuality.router, prefix="/api/v1", tags=["Intertextuality"])
app.include_router(open_questions.router, prefix="/api/v1", tags=["Open Questions"])
app.include_router(threads.router, prefix="/api/v1", tags=["Semantic Threads"])
app.include_router(structure.router, prefix="/api/v1", tags=["Literary Structure"])
app.include_router(emotional.router, prefix="/api/v1", tags=["Emotional Landscape"])
app.include_router(home.router, prefix="/api/v1", tags=["Home"])
app.include_router(community.router, prefix="/api/v1", tags=["Community Notes"])


@app.get("/health")
def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "version": "2.0.0"}


# ── Static audio files (Fase 5A — Neural2 pronunciations) ───────────────────
# Mounted AFTER all API routes so /audio/* never conflicts with /api/v1/*.
_AUDIO_DIR = Path("data/audio")
_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/audio", StaticFiles(directory=str(_AUDIO_DIR)), name="audio")
