"""
🌐 FastAPI Application
REST API for Bible Data Pipeline analytics.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routers import analytics, books, crossrefs, search

app = FastAPI(
    title="Bible Data Pipeline API",
    description="REST API for Biblical text analytics — multi-translation, NLP sentiment, cross-references",
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
app.include_router(books.router, prefix="/api/v1", tags=["Books & Verses"])


@app.get("/health")
def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "version": "2.0.0"}
