"""
🌍 Extract — Theographic Bible Metadata

Downloads people, places, events, and relationship data from the
theographic-bible-metadata repository (robertrouse/theographic-bible-metadata).
CC BY-SA 4.0 license.

Produces structured records for ~3,000 people, ~1,600 places, ~4,000 events,
and family relations linking people together (father, mother, spouse, etc.).
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

import httpx

from src.models.theographic import (
    BiblicalEvent,
    BiblicalPerson,
    BiblicalPlace,
    FamilyRelation,
)

logger = logging.getLogger(__name__)

BASE_RAW = "https://raw.githubusercontent.com/robertrouse/theographic-bible-metadata/master/json"

# Map Theographic OSIS-style book names to our canonical 3-letter IDs.
_OSIS_TO_BOOK_ID: dict[str, str] = {
    "Gen": "GEN",
    "Exod": "EXO",
    "Lev": "LEV",
    "Num": "NUM",
    "Deut": "DEU",
    "Josh": "JOS",
    "Judg": "JDG",
    "Ruth": "RUT",
    "1Sam": "1SA",
    "2Sam": "2SA",
    "1Kgs": "1KI",
    "2Kgs": "2KI",
    "1Chr": "1CH",
    "2Chr": "2CH",
    "Ezra": "EZR",
    "Neh": "NEH",
    "Esth": "EST",
    "Job": "JOB",
    "Ps": "PSA",
    "Prov": "PRO",
    "Eccl": "ECC",
    "Song": "SNG",
    "Isa": "ISA",
    "Jer": "JER",
    "Lam": "LAM",
    "Ezek": "EZK",
    "Dan": "DAN",
    "Hos": "HOS",
    "Joel": "JOL",
    "Amos": "AMO",
    "Obad": "OBA",
    "Jonah": "JON",
    "Mic": "MIC",
    "Nah": "NAM",
    "Hab": "HAB",
    "Zeph": "ZEP",
    "Hag": "HAG",
    "Zech": "ZEC",
    "Mal": "MAL",
    "Matt": "MAT",
    "Mark": "MRK",
    "Luke": "LUK",
    "John": "JHN",
    "Acts": "ACT",
    "Rom": "ROM",
    "1Cor": "1CO",
    "2Cor": "2CO",
    "Gal": "GAL",
    "Eph": "EPH",
    "Phil": "PHP",
    "Col": "COL",
    "1Thess": "1TH",
    "2Thess": "2TH",
    "1Tim": "1TI",
    "2Tim": "2TI",
    "Titus": "TIT",
    "Phlm": "PHM",
    "Heb": "HEB",
    "Jas": "JAS",
    "1Pet": "1PE",
    "2Pet": "2PE",
    "1John": "1JN",
    "2John": "2JN",
    "3John": "3JN",
    "Jude": "JUD",
    "Rev": "REV",
}

# ── Era classification by estimated year ─────────────────────────────────────

_ERA_RANGES: list[tuple[int, int, str]] = [
    (-4000, -2000, "Patriarchs"),
    (-2000, -1400, "Patriarchs"),
    (-1400, -1050, "Exodus & Conquest"),
    (-1050, -586, "Monarchy"),
    (-586, -400, "Exile & Return"),
    (-400, -5, "Intertestamental"),
    (-5, 100, "New Testament"),
]


def _year_to_era(year: int | None) -> str | None:
    if year is None:
        return None
    for lo, hi, era in _ERA_RANGES:
        if lo <= year < hi:
            return era
    return "Patriarchs" if year < -4000 else "New Testament"


def _parse_iso_year(raw: str | int | float | None) -> int | None:
    """Parse Theographic's ISO-8601 astronomical year string to an int.

    Examples: "-001400-01-01" → -1400, "0033-01-01" → 33
    Also handles raw integers/floats that the JSON already decoded.
    """
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return int(raw)
    if not isinstance(raw, str) or not raw.strip():
        return None
    m = re.match(r"^(-?\d+)", raw.strip())
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            return None
    return None


def _convert_osis_ref(osis: str) -> str | None:
    """Convert 'Gen.1.1' → 'GEN.1.1' using our canonical IDs."""
    parts = osis.split(".")
    if len(parts) != 3:
        return None
    book_id = _OSIS_TO_BOOK_ID.get(parts[0])
    if not book_id:
        return None
    return f"{book_id}.{parts[1]}.{parts[2]}"


def _ids_to_json(lst: list | None) -> str | None:
    """Convert a list of Airtable record IDs to a JSON string."""
    if not lst:
        return None
    return json.dumps(lst)


class TheographicExtractor:
    """Download + parse the theographic-bible-metadata JSON files."""

    def __init__(self, cache_dir: Path | None = None, timeout: float = 120.0) -> None:
        self.cache_dir = cache_dir or Path("data/raw/theographic")
        self.timeout = timeout
        # Lookup maps built during extraction (record ID → slug)
        self._person_id_to_slug: dict[str, str] = {}
        self._place_id_to_slug: dict[str, str] = {}

    # ── Public API ───────────────────────────────────────────────────────

    def extract_people(self, use_cache: bool = True) -> list[BiblicalPerson]:
        raw = self._fetch("people.json", use_cache)
        if not raw:
            return []
        records = json.loads(raw)
        people: list[BiblicalPerson] = []
        for rec in records:
            fields = rec.get("fields", rec)
            record_id = rec.get("id", "")
            slug = fields.get("personLookup", "").strip()
            name = fields.get("displayTitle", fields.get("name", "")).strip()
            if not slug or not name:
                continue

            self._person_id_to_slug[record_id] = slug

            # Parse verse refs to extract book IDs
            verse_refs = fields.get("verses", [])
            books = set()
            for vid in verse_refs:
                if isinstance(vid, str) and "." in vid:
                    parts = vid.split(".")
                    bid = _OSIS_TO_BOOK_ID.get(parts[0], parts[0])
                    books.add(bid)

            birth = _parse_iso_year(fields.get("birthYear"))
            death = _parse_iso_year(fields.get("deathYear"))
            min_year = _parse_iso_year(fields.get("minYear"))
            max_year = _parse_iso_year(fields.get("maxYear"))

            also_called = fields.get("alsoCalled")
            occupations = fields.get("occupations")

            people.append(
                BiblicalPerson(
                    person_id=record_id,
                    slug=slug,
                    name=name,
                    gender=fields.get("gender"),
                    birth_year=birth,
                    death_year=death,
                    description=fields.get("dictionaryText", "")[:2000] or None,
                    also_called=json.dumps(also_called) if also_called else None,
                    tribe=(
                        fields.get("memberOf", [None])[0]
                        if isinstance(fields.get("memberOf"), list)
                        else None
                    ),
                    occupation=(", ".join(occupations) if isinstance(occupations, list) else None),
                    books_mentioned=(json.dumps(sorted(books)) if books else None),
                    verse_count=fields.get("verseCount", 0) or 0,
                    min_year=min_year,
                    max_year=max_year,
                )
            )

        logger.info("Extracted %d biblical people", len(people))
        return people

    def extract_places(self, use_cache: bool = True) -> list[BiblicalPlace]:
        raw = self._fetch("places.json", use_cache)
        if not raw:
            return []
        records = json.loads(raw)
        places: list[BiblicalPlace] = []
        for rec in records:
            fields = rec.get("fields", rec)
            record_id = rec.get("id", "")
            slug = fields.get("placeLookup", "").strip()
            name = fields.get("displayTitle", fields.get("kjvName", "")).strip()
            if not slug or not name:
                continue

            self._place_id_to_slug[record_id] = slug

            lat_raw = fields.get("latitude")
            lon_raw = fields.get("longitude")
            lat = float(lat_raw) if lat_raw else None
            lon = float(lon_raw) if lon_raw else None

            also_called_raw = fields.get("alsoCalled")

            places.append(
                BiblicalPlace(
                    place_id=record_id,
                    slug=slug,
                    name=name,
                    latitude=lat,
                    longitude=lon,
                    geo_confidence=None,
                    place_type=fields.get("featureType"),
                    description=None,
                    also_called=(json.dumps(also_called_raw) if also_called_raw else None),
                    verse_count=fields.get("verseCount", 0) or 0,
                )
            )

        logger.info("Extracted %d biblical places", len(places))
        return places

    def extract_events(self, use_cache: bool = True) -> list[BiblicalEvent]:
        raw = self._fetch("events.json", use_cache)
        if not raw:
            return []
        records = json.loads(raw)
        events: list[BiblicalEvent] = []
        for rec in records:
            fields = rec.get("fields", rec)
            record_id = rec.get("id", "")
            title = fields.get("title", "").strip()
            if not title:
                continue

            start_year = _parse_iso_year(fields.get("startDate"))
            sort_key_raw = fields.get("sortKey")
            sort_key = float(sort_key_raw) if sort_key_raw else None
            era = _year_to_era(start_year)

            # Convert participant / location record IDs to slugs
            participant_ids = fields.get("participants", [])
            location_ids = fields.get("locations", [])
            verse_refs_raw = fields.get("verses", [])

            # Map to slugs where possible
            participant_slugs = [self._person_id_to_slug.get(pid, pid) for pid in participant_ids]
            location_slugs = [self._place_id_to_slug.get(lid, lid) for lid in location_ids]

            # Convert verse OSIS refs to our format
            verse_refs = []
            for vref in verse_refs_raw:
                if isinstance(vref, str) and "." in vref:
                    converted = _convert_osis_ref(vref)
                    if converted:
                        verse_refs.append(converted)

            events.append(
                BiblicalEvent(
                    event_id=record_id,
                    title=title,
                    description=None,
                    start_year=start_year,
                    sort_key=sort_key,
                    duration=fields.get("duration"),
                    era=era,
                    participants=(json.dumps(participant_slugs) if participant_slugs else None),
                    locations=(json.dumps(location_slugs) if location_slugs else None),
                    verse_refs=(json.dumps(verse_refs) if verse_refs else None),
                )
            )

        logger.info("Extracted %d biblical events", len(events))
        return events

    def extract_family_relations(self, use_cache: bool = True) -> list[FamilyRelation]:
        """Extract family relations from the people JSON.

        Must be called AFTER extract_people so that _person_id_to_slug is
        populated.
        """
        raw = self._fetch("people.json", use_cache)
        if not raw:
            return []
        records = json.loads(raw)
        relations: list[FamilyRelation] = []
        seen: set[tuple[str, str, str]] = set()

        relation_fields = {
            "father": "father",
            "mother": "mother",
            "partners": "spouse",
            "children": "child",
            "siblings": "sibling",
            "halfSiblingsSameFather": "half_sibling",
            "halfSiblingsSameMother": "half_sibling",
        }

        for rec in records:
            fields = rec.get("fields", rec)
            record_id = rec.get("id", "")
            person_slug = self._person_id_to_slug.get(record_id)
            if not person_slug:
                continue

            for field_name, rel_type in relation_fields.items():
                related_ids = fields.get(field_name, [])
                if not isinstance(related_ids, list):
                    continue
                for related_id in related_ids:
                    related_slug = self._person_id_to_slug.get(related_id) or related_id
                    if not related_slug:
                        continue
                    key = (person_slug, related_slug, rel_type)
                    if key not in seen:
                        seen.add(key)
                        relations.append(
                            FamilyRelation(
                                person_id=person_slug,
                                related_person_id=related_slug,
                                relation_type=rel_type,
                            )
                        )

        logger.info("Extracted %d family relations", len(relations))
        return relations

    # ── Private helpers ──────────────────────────────────────────────────

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
