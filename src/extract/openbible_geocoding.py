"""
🗺️ Extract — OpenBible Geocoding Data

Downloads the ancient.jsonl file from openbibleinfo/Bible-Geocoding-Data
and produces a mapping of place names → (latitude, longitude, confidence).

This data is used to enrich the `biblical_places` table created by the
Theographic extractor with high-quality coordinates compiled from 70+ atlases.

License: CC-BY
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

BASE_RAW = "https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/master/data"


class GeocodingRecord:
    """A single geocoded biblical place with coordinates and confidence."""

    __slots__ = ("name", "friendly_id", "place_type", "latitude", "longitude", "confidence")

    def __init__(
        self,
        name: str,
        friendly_id: str,
        place_type: str | None,
        latitude: float,
        longitude: float,
        confidence: float,
    ) -> None:
        self.name = name
        self.friendly_id = friendly_id
        self.place_type = place_type
        self.latitude = latitude
        self.longitude = longitude
        self.confidence = confidence


class OpenBibleGeoExtractor:
    """Download + parse OpenBible ancient.jsonl into geocoding records."""

    def __init__(self, cache_dir: Path | None = None, timeout: float = 120.0) -> None:
        self.cache_dir = cache_dir or Path("data/raw/geocoding")
        self.timeout = timeout

    def extract(self, use_cache: bool = True) -> list[GeocodingRecord]:
        """Return geocoded places with their best-resolution coordinates.

        Each ancient place may have multiple possible identifications and
        resolutions. We pick the resolution with the highest
        `best_path_score` and normalise the score to [0, 1] range
        (dividing by 1000, capped at 1.0).
        """
        raw = self._fetch("ancient.jsonl", use_cache)
        if not raw:
            return []

        records: list[GeocodingRecord] = []
        for line_no, line in enumerate(raw.splitlines(), 1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                logger.warning("Skipping malformed JSON at line %d", line_no)
                continue

            friendly_id = obj.get("friendly_id", "").strip()
            if not friendly_id:
                continue

            # Use the article + id as a display name
            article = obj.get("preceding_article", "")
            name = f"{article} {friendly_id}".strip() if article else friendly_id
            place_type = obj.get("type")

            # Find best resolution (highest score).
            # Resolutions are nested inside identifications[].resolutions[]
            best_res = None
            best_score = -1.0
            for ident in obj.get("identifications", []):
                for res in ident.get("resolutions", []):
                    score = res.get("best_path_score", 0) or 0
                    lonlat = res.get("lonlat")
                    if lonlat and score > best_score:
                        best_score = score
                        best_res = res

            if not best_res:
                continue

            lonlat = best_res.get("lonlat", "")
            if not lonlat or "," not in lonlat:
                continue

            try:
                lon_str, lat_str = lonlat.split(",", 1)
                lon = float(lon_str.strip())
                lat = float(lat_str.strip())
            except (ValueError, TypeError):
                logger.debug("Bad lonlat for %s: %s", friendly_id, lonlat)
                continue

            # Normalise score: OpenBible uses ~0-1000 range, 500+ = high
            confidence = min(best_score / 1000.0, 1.0)

            records.append(
                GeocodingRecord(
                    name=name,
                    friendly_id=friendly_id,
                    place_type=place_type,
                    latitude=lat,
                    longitude=lon,
                    confidence=confidence,
                )
            )

        logger.info("Extracted %d geocoded places", len(records))
        return records

    def _fetch(self, filename: str, use_cache: bool) -> str:
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        cache_path = self.cache_dir / filename
        if use_cache and cache_path.exists():
            logger.debug("Using cached %s", cache_path)
            return cache_path.read_text(encoding="utf-8")

        url = f"{BASE_RAW}/{filename}"
        logger.info("Downloading %s", url)
        with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
            resp = client.get(url)
            resp.raise_for_status()
            content = resp.text

        cache_path.write_text(content, encoding="utf-8")
        return content
