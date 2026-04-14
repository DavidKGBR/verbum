"""
🖼️ Extract — Wikidata Place Images via SPARQL

Queries Wikidata for biblical places that are missing images in our DB,
fetching P18 (image) and converting Wikimedia Commons filenames into
thumbnail URL patterns compatible with the existing place_images table.

Complements the OpenBible image.jsonl source — this fills gaps for major
places like Babylon, Bethlehem, Jericho that OpenBible didn't cover.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
import urllib.parse
from dataclasses import dataclass
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"

USER_AGENT = "VerbumBiblePipeline/1.0 (https://github.com/verbum; contact@verbum.dev)"

# How many place names per SPARQL query (VALUES clause limit)
BATCH_SIZE = 40

# Delay between SPARQL batches to respect rate limits
BATCH_DELAY = 2.0

# Delay between Commons API calls for metadata
COMMONS_DELAY = 0.5

# Max images to keep per place from Wikidata (less is more — quality over quantity)
MAX_IMAGES_PER_PLACE = 3


@dataclass
class WikidataImageRecord:
    """A Wikimedia Commons image resolved from Wikidata P18."""

    image_id: str  # wikidata entity ID (e.g. Q5684)
    place_name: str  # the biblical place name we searched for
    file_url: str  # full-res Commons URL
    thumbnail_pattern: str  # URL with ####px placeholder
    license: str
    credit: str
    credit_url: str
    description: str
    width: int
    height: int


class WikidataImageExtractor:
    """Fetch place images from Wikidata SPARQL + Commons API."""

    def __init__(
        self,
        cache_dir: Path | None = None,
        timeout: float = 60.0,
    ) -> None:
        self.cache_dir = cache_dir or Path("data/raw/wikidata")
        self.timeout = timeout

    def extract_for_places(
        self,
        place_names: list[str],
        use_cache: bool = True,
    ) -> list[WikidataImageRecord]:
        """Query Wikidata for images of the given place names.

        Args:
            place_names: List of biblical place names to search.
            use_cache: If True, use cached SPARQL results from disk.

        Returns:
            List of WikidataImageRecord, one per (place, image) pair.
        """
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        cache_path = self.cache_dir / "wikidata_images_cache.json"

        if use_cache and cache_path.exists():
            logger.info("Using cached Wikidata results from %s", cache_path)
            cached = json.loads(cache_path.read_text(encoding="utf-8"))
            return [WikidataImageRecord(**r) for r in cached]

        # Clean up place names — skip ones that are clearly not queryable
        queryable = self._filter_queryable(place_names)
        logger.info(
            "Querying Wikidata for %d places (%d skipped as non-queryable)",
            len(queryable),
            len(place_names) - len(queryable),
        )

        # Build alias map: search_name → [original_names]
        # This lets us search Wikidata with simplified names (no parentheses)
        # but map results back to all original biblical_places names.
        alias_map = self._build_alias_map(queryable)
        search_names = list(alias_map.keys())

        # Phase 1: SPARQL queries in batches
        raw_results = self._batch_sparql(search_names)

        # Expand results: one search hit → multiple original names
        sparql_results: list[dict] = []
        for r in raw_results:
            searched = r["place_name"]
            originals = alias_map.get(searched, [searched])
            for orig in originals:
                sparql_results.append({**r, "place_name": orig})

        logger.info("SPARQL returned %d image matches", len(sparql_results))

        # Phase 1b: Retry misses with known alternate names
        found_names = {r["place_name"].lower() for r in sparql_results}
        alternates = self._get_alternate_queries(queryable, found_names)
        if alternates:
            logger.info("Retrying %d places with alternate names...", len(alternates))
            alt_alias = {alt: orig for orig, alt in alternates}
            alt_results = self._batch_sparql(list(alt_alias.keys()))
            for r in alt_results:
                r["place_name"] = alt_alias.get(r["place_name"], r["place_name"])
            sparql_results.extend(alt_results)
            logger.info("Alternates added %d more matches", len(alt_results))

        # Phase 2: Get metadata from Commons API for each unique filename
        unique_files: dict[str, dict] = {}
        for r in sparql_results:
            fname = r["filename"]
            if fname not in unique_files:
                unique_files[fname] = r

        logger.info("Fetching Commons metadata for %d unique images...", len(unique_files))
        metadata = self._batch_commons_metadata(list(unique_files.keys()))

        # Phase 3: Build final records
        records = self._build_records(sparql_results, metadata)

        # Cache results
        from dataclasses import asdict

        cache_path.write_text(
            json.dumps([asdict(r) for r in records], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        logger.info(
            "Extracted %d Wikidata image records for %d unique places",
            len(records),
            len({r.place_name.lower() for r in records}),
        )
        return records

    def _filter_queryable(self, names: list[str]) -> list[str]:
        """Skip names that won't produce useful Wikidata results."""
        skip_patterns = {
            "holy place",
            "most holy",
            "gate of",
            "tower",
            "pool",
            "plain",
            "place",
            "field",
            "rock",
            "forest",
            "highway",
            "south",
            "north",
            "east",
            "throne",
            "willows",
            "pillars",
            "rocks",
            "prison gate",
            "straight gate",
            "skull",
            "destruction",
            "judgment",
            "there",
        }
        result = []
        for name in names:
            lower = name.lower().strip()
            # Skip very short names, generic concepts, and "the X" variants of landmarks
            if len(lower) < 3:
                continue
            if lower in skip_patterns:
                continue
            if lower.startswith("the ") and len(lower) < 12:
                continue
            # Skip names with numbers (like "Succoth 1", "Beer 1")
            if any(c.isdigit() for c in name):
                continue
            # Skip possessives (like "Jerusalem's", "Egypt's")
            if name.endswith("'s"):
                continue
            result.append(name)
        return result

    def _build_alias_map(self, names: list[str]) -> dict[str, list[str]]:
        """Build search_name → [original_names] map.

        Simplifies names with parentheses for better Wikidata matching:
        - "Bethel (of Palestine)" → search "Bethel", map back to original
        - "Bethel (of Judah)" → also search "Bethel", both originals get images
        """
        import re

        alias: dict[str, list[str]] = {}
        for name in names:
            # Strip parenthetical disambiguations
            simplified = re.sub(r"\s*\([^)]+\)\s*", "", name).strip()
            search_key = simplified if simplified and simplified != name else name
            alias.setdefault(search_key, []).append(name)
        return alias

    def _get_alternate_queries(
        self, original_names: list[str], found: set[str]
    ) -> list[tuple[str, str]]:
        """Generate (original_name, alternate_query) for places not yet found.

        Known biblical name variants that differ from Wikidata labels.
        """
        # Manual mapping: our biblical name → Wikidata label
        known_alternates: dict[str, str] = {
            "Sinai": "Mount Sinai",
            "Red Sea": "Red Sea",
            "Horeb": "Mount Horeb",
            "Carmel": "Mount Carmel",
            "Tabor": "Mount Tabor",
            "Hermon": "Mount Hermon",
            "Olivet": "Mount of Olives",
            "Gilboa": "Mount Gilboa",
            "Cush": "Kingdom of Kush",
            "Seir": "Mount Seir",
            "Saron": "Sharon plain",
            "Arabia": "Arabian Peninsula",
            "Goshen": "Land of Goshen",
            "Eden": "Garden of Eden",
            "Kadesh": "Kadesh-barnea",
            "Tarshish": "Tartessos",
            "Ur of the Chaldees": "Ur",
            "Zarephath": "Sarepta",
            "Phenicia": "Phoenicia",
            "Lydda": "Lod",
            "Bethsaida": "Bethsaida",
            "Melita": "Malta",
            "Antipatris": "Antipatris",
            "Azotus": "Ashdod",
            "Beth-shean": "Beit She'an",
            # Additional high-verse-count places
            "Gibeah": "Tell el-Ful",
            "Hamath": "Hama",
            "Jezreel": "Tel Jezreel",
            "Beth-shemesh": "Beth Shemesh",
            "Libnah": "Tel Burna",
            "Keilah": "Khirbet Qila",
            "Rabbah": "Amman",
            "Hazor": "Tel Hazor",
            "Zobah": "Aram-Zobah",
            "Succoth": "Tell Deir Alla",
            "Ai": "Et-Tell",
            "Gath": "Tell es-Safi",
            "Antioch": "Antioch",
        }

        result: list[tuple[str, str]] = []
        for name in original_names:
            if name.lower() in found:
                continue
            alt = known_alternates.get(name)
            if alt:
                result.append((name, alt))
        return result

    def _batch_sparql(self, names: list[str]) -> list[dict]:
        """Run SPARQL queries in batches, return raw results."""
        all_results: list[dict] = []
        batches = [names[i : i + BATCH_SIZE] for i in range(0, len(names), BATCH_SIZE)]

        for batch_idx, batch in enumerate(batches):
            if batch_idx > 0:
                time.sleep(BATCH_DELAY)

            logger.debug(
                "SPARQL batch %d/%d (%d names)",
                batch_idx + 1,
                len(batches),
                len(batch),
            )

            results = self._query_sparql(batch)
            all_results.extend(results)

        return all_results

    def _query_sparql(self, names: list[str]) -> list[dict]:
        """Execute a single SPARQL query for a batch of place names.

        Requires P625 (coordinate location) to filter out non-geographic
        entities (people, albums, schools, etc.) that share the same name.
        """
        # Build VALUES clause with English labels
        values = " ".join(f'"{self._escape_sparql(n)}"@en' for n in names)

        # P625 = coordinate location — fast and reliable geographic filter
        query = f"""
        SELECT ?name ?item ?image ?itemDescription WHERE {{
          VALUES ?name {{ {values} }}
          ?item rdfs:label ?name .
          ?item wdt:P18 ?image .
          ?item wdt:P625 ?coords .
          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en" . }}
        }}
        """

        try:
            with httpx.Client(
                timeout=self.timeout,
                follow_redirects=True,
                headers={"User-Agent": USER_AGENT},
            ) as client:
                resp = client.get(
                    WIKIDATA_SPARQL,
                    params={"query": query, "format": "json"},
                )
                resp.raise_for_status()
                data = resp.json()
        except (httpx.HTTPStatusError, httpx.TimeoutException, json.JSONDecodeError) as exc:
            logger.warning("SPARQL query failed: %s", exc)
            return []

        # Collect all candidates grouped by (place_name, entity_id)
        candidates: dict[str, dict[str, list[dict]]] = {}  # name → {entity → [rows]}

        for binding in data.get("results", {}).get("bindings", []):
            place_name = binding.get("name", {}).get("value", "")
            image_url = binding.get("image", {}).get("value", "")
            entity_uri = binding.get("item", {}).get("value", "")
            description = binding.get("itemDescription", {}).get("value", "")

            if not place_name or not image_url:
                continue

            entity_id = entity_uri.rsplit("/", 1)[-1] if entity_uri else ""

            filename = self._extract_filename(image_url)
            if not filename:
                continue

            ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
            if ext not in ("jpg", "jpeg", "png", "tif", "tiff"):
                continue

            candidates.setdefault(place_name, {}).setdefault(entity_id, []).append(
                {
                    "place_name": place_name,
                    "entity_id": entity_id,
                    "filename": filename,
                    "image_url": image_url,
                    "description": description,
                }
            )

        # For each place, pick the BEST entity (most likely the biblical one)
        # then take up to MAX_IMAGES_PER_PLACE images from it.
        # Skip entirely if the best entity scores negative (clearly wrong match).
        results: list[dict] = []
        for place_name, entities in candidates.items():
            scored = {
                eid: self._score_entity(eid, rows[0].get("description", ""))
                for eid, rows in entities.items()
            }
            best_entity = max(scored, key=scored.get)  # type: ignore[arg-type]
            best_score = scored[best_entity]

            if best_score < 0:
                logger.debug(
                    "Skipping %s — best entity %s scored %d (likely wrong match)",
                    place_name,
                    best_entity,
                    best_score,
                )
                continue

            for row in entities[best_entity][:MAX_IMAGES_PER_PLACE]:
                results.append(row)

        return results

    @staticmethod
    def _score_entity(entity_id: str, description: str) -> int:
        """Score a Wikidata entity for biblical relevance.

        Higher = more likely the ancient/biblical place we want.
        Lower entity IDs (Q5684 vs Q1750870) tend to be more notable.
        """
        score = 0
        desc = description.lower()

        # Strong positive signals: ancient, biblical, archaeological
        for kw in (
            "ancient",
            "biblical",
            "archaeolog",
            "ruins",
            "tell ",
            "tel ",
            "historical",
            "holy",
            "kingdom",
            "empire",
            "israel",
            "jordan",
            "iraq",
            "egypt",
            "turkey",
            "levant",
            "mesopotamia",
            "canaan",
            "palestine",
            "bible",
            "testament",
        ):
            if kw in desc:
                score += 10

        # Negative signals: modern places, unrelated countries/states
        for kw in (
            "united states",
            "usa",
            # US states
            "alaska",
            "arizona",
            "arkansas",
            "california",
            "colorado",
            "connecticut",
            "florida",
            "georgia",
            "illinois",
            "iowa",
            "kansas",
            "kentucky",
            "louisiana",
            "maryland",
            "massachusetts",
            "michigan",
            "minnesota",
            "mississippi",
            "missouri",
            "montana",
            "nebraska",
            "nevada",
            "new hampshire",
            "new jersey",
            "new mexico",
            "new york",
            "north carolina",
            "north dakota",
            "ohio",
            "oklahoma",
            "oregon",
            "pennsylvania",
            "rhode island",
            "south carolina",
            "south dakota",
            "tennessee",
            "texas",
            "utah",
            "vermont",
            "virginia",
            "washington",
            "wisconsin",
            # Other modern countries far from the biblical world
            "czech",
            "canada",
            "australia",
            "germany",
            "england",
            "france",
            "spain",
            "portugal",
            "brazil",
            "china",
            "japan",
            "india",
            "russia",
            "new zealand",
            "south africa",
            "philippines",
            "slovenia",
            "croatia",
            "poland",
            "norway",
            "sweden",
            "denmark",
            "finland",
            "mexico",
            "argentina",
            "colombia",
            "indonesia",
            # Administrative/modern entity types
            "township",
            "village in",
            "town in",
            "hamlet in",
            "suburb",
            "census",
            "county",
            "municipality",
            "commune",
            "civil parish",
            "department",
            "département",
            "french",
            "portuguese",
            "brazilian",
            # Clearly non-geographic
            "crater",
            "lunar",
            "asteroid",
            "moon",
            "ship",
            "vessel",
            "railway",
            "district of",
            "state of",
            "province of",
        ):
            if kw in desc:
                score -= 15

        # Prefer lower entity IDs (more notable entities get lower numbers)
        try:
            qnum = int(entity_id.lstrip("Q"))
            if qnum < 100_000:
                score += 5
            elif qnum > 1_000_000:
                score -= 3
        except (ValueError, AttributeError):
            pass

        return score

    def _batch_commons_metadata(self, filenames: list[str]) -> dict[str, dict]:
        """Fetch license/credit metadata from Commons API for each file.

        Returns dict of filename → metadata.
        """
        metadata: dict[str, dict] = {}
        # Process in batches of 50 (API limit for titles)
        for i in range(0, len(filenames), 50):
            batch = filenames[i : i + 50]
            if i > 0:
                time.sleep(COMMONS_DELAY)

            titles = "|".join(f"File:{f}" for f in batch)
            try:
                with httpx.Client(
                    timeout=30.0,
                    follow_redirects=True,
                    headers={"User-Agent": USER_AGENT},
                ) as client:
                    resp = client.get(
                        COMMONS_API,
                        params={
                            "action": "query",
                            "titles": titles,
                            "prop": "imageinfo",
                            "iiprop": "extmetadata|size|url",
                            "format": "json",
                        },
                    )
                    resp.raise_for_status()
                    data = resp.json()
            except (httpx.HTTPStatusError, httpx.TimeoutException) as exc:
                logger.warning("Commons API batch failed: %s", exc)
                continue

            pages = data.get("query", {}).get("pages", {})
            for page in pages.values():
                title = page.get("title", "").removeprefix("File:")
                info_list = page.get("imageinfo", [])
                if not info_list:
                    continue
                info = info_list[0]
                ext = info.get("extmetadata", {})

                metadata[title] = {
                    "license": ext.get("LicenseShortName", {}).get("value", "CC"),
                    "credit": ext.get("Artist", {}).get("value", ""),
                    "credit_url": ext.get("LicenseUrl", {}).get("value", ""),
                    "description": ext.get("ImageDescription", {}).get("value", ""),
                    "width": info.get("width", 0),
                    "height": info.get("height", 0),
                    "url": info.get("url", ""),
                }

        return metadata

    def _build_records(
        self,
        sparql_results: list[dict],
        metadata: dict[str, dict],
    ) -> list[WikidataImageRecord]:
        """Combine SPARQL results with Commons metadata into final records."""
        import re

        records: list[WikidataImageRecord] = []

        for r in sparql_results:
            filename = r["filename"]
            meta = metadata.get(filename, {})
            entity_id = r["entity_id"]

            # Build file_url from Commons
            file_url = meta.get("url", "")
            if not file_url:
                encoded = urllib.parse.quote(filename.replace(" ", "_"))
                file_url = f"https://commons.wikimedia.org/wiki/Special:FilePath/{encoded}"

            # Build thumbnail pattern
            thumb_pattern = self._build_thumbnail_pattern(filename, meta.get("url", ""))

            # Clean credit HTML
            credit_raw = meta.get("credit", "")
            credit_clean = re.sub(r"<[^>]+>", "", credit_raw).strip()[:200] if credit_raw else ""

            # Clean description HTML
            desc_raw = meta.get("description", "") or r.get("description", "")
            desc_clean = re.sub(r"<[^>]+>", "", desc_raw).strip()[:500] if desc_raw else ""

            records.append(
                WikidataImageRecord(
                    image_id=f"wd-{entity_id}",
                    place_name=r["place_name"],
                    file_url=file_url,
                    thumbnail_pattern=thumb_pattern,
                    license=meta.get("license", "CC"),
                    credit=credit_clean or "Wikimedia Commons",
                    credit_url=meta.get("credit_url", "")
                    or f"https://commons.wikimedia.org/wiki/File:{urllib.parse.quote(filename)}",
                    description=desc_clean,
                    width=meta.get("width", 0),
                    height=meta.get("height", 0),
                )
            )

        return records

    def _build_thumbnail_pattern(self, filename: str, full_url: str) -> str:
        """Build a ####px thumbnail URL pattern from a Commons filename.

        Wikimedia Commons thumbnail URLs follow this structure:
        https://upload.wikimedia.org/wikipedia/commons/thumb/{a}/{ab}/{filename}/####px-{filename}

        Where {a}/{ab} is the MD5 hash prefix of the filename.
        """
        safe_name = filename.replace(" ", "_")
        md5 = hashlib.md5(safe_name.encode("utf-8")).hexdigest()  # noqa: S324
        a, ab = md5[0], md5[:2]

        encoded = urllib.parse.quote(safe_name)

        # For the thumbnail suffix, use the original extension
        thumb_name = encoded
        # SVG and TIFF get converted to PNG in thumbnails
        lower = safe_name.lower()
        if lower.endswith(".svg"):
            thumb_name += ".png"
        elif lower.endswith((".tif", ".tiff")):
            thumb_name += ".jpg"

        return (
            f"https://upload.wikimedia.org/wikipedia/commons/thumb/"
            f"{a}/{ab}/{encoded}/####px-{thumb_name}"
        )

    def _extract_filename(self, image_url: str) -> str:
        """Extract the filename from a Wikimedia Special:FilePath URL."""
        # URL like: http://commons.wikimedia.org/wiki/Special:FilePath/Babylon_relief.jpg
        if "Special:FilePath/" in image_url:
            raw = image_url.split("Special:FilePath/", 1)[1]
            return urllib.parse.unquote(raw).replace("_", " ")
        # Direct upload URL
        if "upload.wikimedia.org" in image_url:
            return urllib.parse.unquote(image_url.rsplit("/", 1)[-1]).replace("_", " ")
        return ""

    @staticmethod
    def _escape_sparql(s: str) -> str:
        """Escape special characters for SPARQL string literal."""
        return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
