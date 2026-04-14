"""
🌐 FastAPI Application
REST API for Bible Data Pipeline analytics.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routers import (
    ai_insights,
    analytics,
    books,
    crossrefs,
    lexicon,
    reader,
    search,
    semantic,
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


@app.get("/health")
def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "version": "2.0.0"}
