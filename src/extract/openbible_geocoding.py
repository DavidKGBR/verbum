"""
🗺️ Extract — OpenBible Geocoding Data

Downloads ancient.jsonl, image.jsonl, and modern.jsonl from
openbibleinfo/Bible-Geocoding-Data and produces:
  • geocoding records (place → lat/lon/confidence)
  • image records  (place → Wikimedia Commons photos with attribution)

License: CC-BY
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
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


@dataclass
class ImageRecord:
    """A Wikimedia Commons image linked to a biblical place."""

    image_id: str
    place_name: str          # ancient place name (matched to biblical_places)
    file_url: str
    thumbnail_pattern: str   # URL with ####px placeholder
    license: str
    author: str
    credit: str
    credit_url: str
    description: str
    width: int
    height: int
    placeholder_colors: str = ""
    crop_file: str = ""


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

    # ── Image extraction ────────────────────────────────────────────────

    def extract_modern_mapping(self, use_cache: bool = True) -> dict[str, list[str]]:
        """Build modern_id → list[ancient_place_name] from modern.jsonl.

        This is the bridge between image.jsonl (keyed by modern_id) and
        our biblical_places table (keyed by ancient place name).
        """
        raw = self._fetch("modern.jsonl", use_cache)
        if not raw:
            return {}

        mapping: dict[str, list[str]] = {}
        for line in raw.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue

            mid = obj.get("id", "")
            if not mid:
                continue

            for _aid, ainfo in obj.get("ancient_associations", {}).items():
                aname = ainfo.get("name", "").strip()
                if aname:
                    mapping.setdefault(mid, []).append(aname)

        logger.info(
            "Modern mapping: %d modern IDs → %d ancient links",
            len(mapping),
            sum(len(v) for v in mapping.values()),
        )
        return mapping

    def extract_images(self, use_cache: bool = True) -> list[ImageRecord]:
        """Parse image.jsonl and resolve to ancient place names.

        Returns one ImageRecord per (image, ancient_place) pair.
        """
        modern_map = self.extract_modern_mapping(use_cache)

        raw = self._fetch("image.jsonl", use_cache)
        if not raw:
            return []

        records: list[ImageRecord] = []
        for line in raw.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue

            image_id = obj.get("id", "")
            file_url = obj.get("file_url", "")
            thumb_pattern = obj.get("thumbnail_url_pattern", "")
            lic = obj.get("license", "")
            author = obj.get("author", "")
            credit = obj.get("credit", "")
            credit_url = obj.get("credit_url", "")
            width = obj.get("width", 0)
            height = obj.get("height", 0)

            if not image_id or not file_url:
                continue

            descriptions = obj.get("descriptions", {})
            thumbnails = obj.get("thumbnails", {})

            # Each modern_id in descriptions links this image to places
            seen_places: set[str] = set()
            for mid, desc_text in descriptions.items():
                # Strip HTML tags from description
                clean_desc = re.sub(r"<[^>]+>", "", desc_text) if desc_text else ""

                # Resolve modern_id → ancient place names
                ancient_names = modern_map.get(mid, [])
                if not ancient_names:
                    continue

                thumb_info = thumbnails.get(mid, {})
                crop_file = thumb_info.get("file", "")
                placeholder = thumb_info.get("placeholder", "")

                for place_name in ancient_names:
                    key = place_name.lower()
                    if key in seen_places:
                        continue
                    seen_places.add(key)

                    records.append(
                        ImageRecord(
                            image_id=image_id,
                            place_name=place_name,
                            file_url=file_url,
                            thumbnail_pattern=thumb_pattern,
                            license=lic,
                            author=author,
                            credit=credit,
                            credit_url=credit_url,
                            description=clean_desc,
                            width=width,
                            height=height,
                            placeholder_colors=placeholder,
                            crop_file=crop_file,
                        )
                    )

        unique_places = len({r.place_name.lower() for r in records})
        logger.info(
            "Extracted %d image records for %d unique places",
            len(records),
            unique_places,
        )
        return records

    # ── Helpers ───────────────────────────────────────────────────────

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
