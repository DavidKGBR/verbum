"""
Audio chapter proxy — Bible Brain (Faith Comes By Hearing) API.

GET /audio/chapter?translation=kjv&book=GEN&chapter=1
  → returns {"url": "<signed-mp3-url>", "expires_in": 172800}

GET /audio/status
  → shows which translations have audio configured

Requires BIBLE_BRAIN_API_KEY in .env (free registration at https://4.dbt.io).
Fileset IDs can be discovered via GET /audio/filesets?translation=kjv.
"""

from __future__ import annotations

import os
import time
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

_API_KEY = os.getenv("BIBLE_BRAIN_API_KEY", "").strip()
_BASE = "https://4.dbt.io/api"

# Translation abbreviation → Bible Brain fileset IDs (audio_drama or audio)
# Format: [drama_fileset_id, plain_fileset_id]  — drama preferred, plain fallback
# IDs verified via https://4.dbt.io/api/bibles?abbr=KJV&v=4
_FILESETS: dict[str, list[str]] = {
    "kjv":   ["ENGKJVO2DA", "ENGKJVN2DA"],  # KJV dramatized + plain
    "web":   ["ENGWEBO2DA", "ENGWEBN2DA"],  # World English Bible
    "asv":   ["ENGASVO2DA", "ENGASVN2DA"],  # American Standard
    "nvi":   ["PORNTMN2DA", "PORNTMN1DA"],  # NVI Portuguese
    "ra":    ["PORBBN2DA",  "PORBBN1DA"],   # Reina-Almeida (RA)
    "acf":   ["PORACFN2DA", "PORACFN1DA"],  # ACF Portuguese
    "rvr":   ["SPARVR2DA",  "SPARVR1DA"],   # RVR Spanish
}

# In-memory URL cache: (fileset_id, book, chapter) → (url, expires_at)
_cache: dict[tuple[str, str, int], tuple[str, float]] = {}

_CLIENT: httpx.AsyncClient | None = None


def _client() -> httpx.AsyncClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = httpx.AsyncClient(timeout=10.0)
    return _CLIENT


async def _fetch_chapter_url(fileset_id: str, book: str, chapter: int) -> str | None:
    """Call Bible Brain API and return the first MP3 URL for a chapter."""
    cache_key = (fileset_id, book.upper(), chapter)
    now = time.time()
    if cache_key in _cache:
        url, exp = _cache[cache_key]
        if now < exp - 300:  # 5-min buffer before expiry
            return url

    params = {"key": _API_KEY, "v": "4"}
    endpoint = f"{_BASE}/bibles/filesets/{fileset_id}/{book.upper()}/{chapter}"
    resp = await _client().get(endpoint, params=params)
    if resp.status_code != 200:
        return None

    data: dict[str, Any] = resp.json()
    items: list[dict] = data.get("data", [])
    if not items:
        return None

    url: str = items[0].get("path", "")
    if not url:
        return None

    # Cache for 47h (Bible Brain signed URLs expire at 48h)
    _cache[cache_key] = (url, now + 47 * 3600)
    return url


@router.get("/audio/chapter")
async def chapter_audio(
    translation: str = Query(..., description="Translation code, e.g. kjv, nvi, rvr"),
    book: str = Query(..., description="USFM book ID, e.g. GEN, MAT, REV"),
    chapter: int = Query(..., ge=1, description="Chapter number"),
) -> dict:
    """Return a streamable MP3 URL for a Bible chapter."""
    if not _API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Audio unavailable: BIBLE_BRAIN_API_KEY not configured. "
                   "Register at https://4.dbt.io for a free key.",
        )

    fileset_ids = _FILESETS.get(translation.lower())
    if not fileset_ids:
        raise HTTPException(
            status_code=404,
            detail=f"No audio configured for translation '{translation}'. "
                   f"Available: {', '.join(_FILESETS)}",
        )

    for fid in fileset_ids:
        url = await _fetch_chapter_url(fid, book, chapter)
        if url:
            return {"url": url, "fileset_id": fid, "expires_in": 47 * 3600}

    raise HTTPException(
        status_code=404,
        detail=f"Audio not found for {translation.upper()} {book} {chapter}.",
    )


@router.get("/audio/status")
async def audio_status() -> dict:
    """Show audio configuration status."""
    return {
        "key_configured": bool(_API_KEY),
        "available_translations": list(_FILESETS.keys()),
        "cached_entries": len(_cache),
        "register_url": "https://4.dbt.io",
    }


@router.get("/audio/filesets")
async def list_filesets(
    translation: str = Query(..., description="Translation abbreviation, e.g. kjv"),
) -> dict:
    """Discover Bible Brain fileset IDs for a translation (for setup/debugging)."""
    if not _API_KEY:
        raise HTTPException(status_code=503, detail="BIBLE_BRAIN_API_KEY not set.")

    resp = await _client().get(
        f"{_BASE}/bibles",
        params={"key": _API_KEY, "v": "4", "abbr": translation.upper(), "media": "audio"},
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Bible Brain API error.")

    data = resp.json().get("data", [])
    return {
        "translation": translation,
        "filesets": [
            {
                "fileset_id": fs.get("id"),
                "type": fs.get("type"),
                "size": fs.get("size"),
                "language": fs.get("language"),
            }
            for bible in data
            for fs in bible.get("filesets", {}).get("audio", [])
        ],
    }
