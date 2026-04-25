"""
📖 Lexicon & Interlinear Router
Endpoints for Strong's entries, original texts, and interlinear data.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request

from src.api.dependencies import get_db
from src.extract.audio_sources import audio_url as resolve_audio_url

router = APIRouter()


@router.get("/strongs/search")
def search_strongs(
    q: str = Query(
        ...,
        min_length=2,
        description="Search text in definitions, transliterations, or original word",
    ),
    language: str | None = Query(None, description="Optional filter by language (hebrew or greek)"),
    limit: int = Query(50, ge=1, le=200, description="Max results"),
) -> dict:
    """Search Strong's lexicon."""
    conn = get_db()
    try:
        params: list = [f"%{q}%", f"%{q}%", f"%{q}%", q]
        lang_filter = ""
        if language:
            lang_filter = "AND language = ?"
            params.append(language.lower())

        params.append(limit)

        df = conn.execute(
            f"""
            SELECT * FROM strongs_lexicon
            WHERE (
                short_definition ILIKE ? OR
                long_definition ILIKE ? OR
                transliteration ILIKE ? OR
                original = ?
            )
            {lang_filter}
            ORDER BY strongs_id
            LIMIT ?
            """,
            params,
        ).fetchdf()

        return {
            "query": q,
            "language": language,
            "total_results": len(df),
            "results": df.to_dict(orient="records"),
        }
    finally:
        conn.close()


@router.get("/strongs/{strongs_id}")
def get_strongs(
    strongs_id: str,
    request: Request,
    lang: str | None = Query(
        None,
        description="Target language for definitions: 'pt' or 'es'. "
                    "Falls back to English when translation unavailable.",
    ),
) -> dict:
    """Get a specific Strong's entry by ID (e.g., H776, G976).

    If `lang` is provided and a translation exists in `strongs_lexicon_multilang`,
    the `short_definition` and `long_definition` fields are replaced with the
    translated versions. The response includes `is_translated: bool` to let the
    frontend display a "translation in progress" indicator when false.
    """
    conn = get_db()
    try:
        df = conn.execute(
            "SELECT * FROM strongs_lexicon WHERE strongs_id = ?",
            [strongs_id.upper()],
        ).fetchdf()
        if df.empty:
            raise HTTPException(status_code=404, detail="Strong's ID not found")
        entry = df.to_dict(orient="records")[0]

        # Multilingual overlay (R3.6)
        is_translated = False
        if lang and lang.lower() in ("pt", "es"):
            target_lang = lang.lower()
            ml_row = conn.execute(
                """
                SELECT short_definition, long_definition
                FROM strongs_lexicon_multilang
                WHERE strongs_id = ? AND lang = ?
                  AND short_definition IS NOT NULL
                """,
                [strongs_id.upper(), target_lang],
            ).fetchone()
            if ml_row:
                entry["short_definition"] = ml_row[0]
                if ml_row[1]:
                    entry["long_definition"] = ml_row[1]
                is_translated = True

        entry["is_translated"] = is_translated

        # Attach audio URL if the MP3 was already generated (Fase 5A)
        sid = strongs_id.upper()
        src_lang = entry.get("language", "")
        base = str(request.base_url).rstrip("/")
        entry["audio_url"] = resolve_audio_url(sid, src_lang, base_url=base)

        return entry
    finally:
        conn.close()


@router.get("/original/{verse_id}")
def get_original(verse_id: str) -> dict:
    """Get original texts (Hebrew/Greek) for a specific verse_id."""
    conn = get_db()
    try:
        df = conn.execute(
            "SELECT * FROM original_texts WHERE verse_id = ?", [verse_id.upper()]
        ).fetchdf()
        if df.empty:
            raise HTTPException(status_code=404, detail="Original text not found for this verse")

        return {"verse_id": verse_id.upper(), "texts": df.to_dict(orient="records")}
    finally:
        conn.close()


@router.get("/interlinear/{verse_id}")
def get_interlinear(verse_id: str) -> dict:
    """Get interlinear data for a specific verse_id, ordered by word position."""
    conn = get_db()
    try:
        df = conn.execute(
            "SELECT * FROM interlinear WHERE verse_id = ? ORDER BY word_position ASC",
            [verse_id.upper()],
        ).fetchdf()

        if df.empty:
            raise HTTPException(status_code=404, detail="Interlinear data not found for this verse")

        return {"verse_id": verse_id.upper(), "words": df.to_dict(orient="records")}
    finally:
        conn.close()


@router.get("/interlinear/chapter/{book_id}/{chapter}")
def get_interlinear_chapter(book_id: str, chapter: int) -> dict:
    """Get interlinear data for an entire chapter, ordered by verse and word position."""
    conn = get_db()
    try:
        verse_like = f"{book_id.upper()}.{chapter}.%"
        df = conn.execute(
            "SELECT * FROM interlinear WHERE verse_id LIKE ? ORDER BY verse_id, word_position ASC",
            [verse_like],
        ).fetchdf()

        if df.empty:
            raise HTTPException(
                status_code=404, detail="Interlinear data not found for this chapter"
            )

        return {
            "book_id": book_id.upper(),
            "chapter": chapter,
            "total_words": len(df),
            "words": df.to_dict(orient="records"),
        }
    finally:
        conn.close()


@router.get("/words/{strongs_id}/verses")
def get_verses_by_strongs(
    strongs_id: str,
    limit: int = Query(100, ge=1, le=500, description="Max results"),
) -> dict:
    """Find verses that use a specific Strong's ID."""
    conn = get_db()
    try:
        # We join interlinear with verses to get both the word occurrence and the English text.
        # We use a subquery/distinct to avoid duplicates if a word appears twice in the same verse.
        df = conn.execute(
            """
            SELECT DISTINCT
               v.verse_id, v.book_id, v.chapter, v.verse,
               v.reference, v.text as verse_text, v.book_position
            FROM interlinear i
            JOIN verses v ON i.verse_id = v.verse_id AND v.translation_id = 'kjv'
            WHERE i.strongs_id = ?
            ORDER BY v.book_position, v.chapter, v.verse
            LIMIT ?
            """,
            [strongs_id.upper(), limit],
        ).fetchdf()

        return {
            "strongs_id": strongs_id.upper(),
            "total_results": len(df),
            "verses": df.to_dict(orient="records"),
        }
    finally:
        conn.close()


@router.get("/words/frequency")
def get_words_frequency(
    book: str = Query(..., description="Book ID (e.g., PSA, JHN)"),
    chapter: int | None = Query(None, description="Optional chapter filter"),
    limit: int = Query(50, ge=1, le=200, description="Max results"),
) -> dict:
    """Get frequency of words used in a specific book (or chapter)."""
    conn = get_db()
    try:
        verse_prefix = f"{book.upper()}.{chapter}." if chapter else f"{book.upper()}."
        verse_like = f"{verse_prefix}%"

        df = conn.execute(
            """
            SELECT
                strongs_id,
                original_word,
                transliteration,
                ANY_VALUE(lemma) as lemma,
                ANY_VALUE(gloss) as gloss,
                COUNT(*) as frequency
            FROM interlinear
            WHERE verse_id LIKE ? AND strongs_id IS NOT NULL
            GROUP BY strongs_id, original_word, transliteration
            ORDER BY frequency DESC
            LIMIT ?
            """,
            [verse_like, limit],
        ).fetchdf()

        return {
            "book": book.upper(),
            "chapter": chapter,
            "results": df.to_dict(orient="records"),
        }
    finally:
        conn.close()


@router.get("/words/{strongs_id}/journey")
def get_word_journey(
    strongs_id: str,
) -> dict:
    """Get a word's usage journey across biblical eras — how meaning shifts over time.

    Groups occurrences by biblical era (Pentateuch, History, Poetry, Prophets,
    Gospels, Epistles, Apocalyptic) and shows representative glosses per era.
    """
    conn = get_db()
    try:
        sid = strongs_id.upper()
        df = conn.execute(
            """
            SELECT
                SPLIT_PART(i.verse_id, '.', 1) AS book_id,
                i.gloss,
                i.semantic_tag,
                COUNT(*) AS freq,
                ANY_VALUE(v.book_name) AS book_name,
                ANY_VALUE(v.book_position) AS book_position,
                ANY_VALUE(bs.testament) AS testament,
                ANY_VALUE(bs.category) AS category
            FROM interlinear i
            LEFT JOIN verses v ON i.verse_id = v.verse_id AND v.translation_id = 'kjv'
            LEFT JOIN book_stats bs ON v.book_id = bs.book_id AND bs.translation_id = 'kjv'
            WHERE i.strongs_id = ?
            GROUP BY SPLIT_PART(i.verse_id, '.', 1), i.gloss, i.semantic_tag
            ORDER BY ANY_VALUE(v.book_position), freq DESC
            """,
            [sid],
        ).fetchdf()

        if df.empty:
            raise HTTPException(status_code=404, detail=f"No occurrences found for {sid}")

        # Map categories to eras
        era_map: dict[str, str] = {
            "Law": "Pentateuch",
            "History": "History",
            "Poetry": "Poetry",
            "Major Prophets": "Prophets",
            "Minor Prophets": "Prophets",
            "Gospels": "Gospels",
            "Acts": "Epistles",
            "Pauline Epistles": "Epistles",
            "General Epistles": "Epistles",
            "Apocalyptic": "Apocalyptic",
        }

        era_order = [
            "Pentateuch",
            "History",
            "Poetry",
            "Prophets",
            "Gospels",
            "Epistles",
            "Apocalyptic",
        ]

        # Aggregate by era
        eras: dict[str, dict] = {}
        for _, row in df.iterrows():
            cat = row.get("category") or ""
            era = era_map.get(cat, cat or "Unknown")
            if era not in eras:
                eras[era] = {
                    "era": era,
                    "total_occurrences": 0,
                    "books": {},
                    "glosses": {},
                    "semantic_tags": {},
                }
            bucket = eras[era]
            freq = int(row["freq"])
            bucket["total_occurrences"] += freq

            bid = row["book_id"]
            bucket["books"][bid] = bucket["books"].get(bid, 0) + freq

            gloss = row.get("gloss") or ""
            if gloss:
                bucket["glosses"][gloss] = bucket["glosses"].get(gloss, 0) + freq

            tag = row.get("semantic_tag") or ""
            if tag:
                bucket["semantic_tags"][tag] = bucket["semantic_tags"].get(tag, 0) + freq

        # Format output in era order
        journey = []
        for era_name in era_order:
            if era_name not in eras:
                continue
            b = eras[era_name]
            top_glosses = sorted(b["glosses"].items(), key=lambda x: -x[1])[:5]
            top_tags = sorted(b["semantic_tags"].items(), key=lambda x: -x[1])[:3]
            journey.append(
                {
                    "era": era_name,
                    "total_occurrences": b["total_occurrences"],
                    "book_count": len(b["books"]),
                    "top_books": sorted(
                        [{"book_id": k, "count": v} for k, v in b["books"].items()],
                        key=lambda x: -x["count"],
                    )[:5],
                    "top_glosses": [{"gloss": g, "count": c} for g, c in top_glosses],
                    "top_semantic_tags": [{"tag": t, "count": c} for t, c in top_tags],
                }
            )

        return {
            "strongs_id": sid,
            "total_eras": len(journey),
            "total_occurrences": sum(e["total_occurrences"] for e in journey),
            "journey": journey,
        }
    finally:
        conn.close()


@router.get("/words/{strongs_id}/distribution")
def get_word_distribution(
    strongs_id: str,
) -> dict:
    """Get how a Strong's word is distributed across all Bible books.

    Returns per-book frequency — useful for the Word Study page's bar chart.
    """
    conn = get_db()
    try:
        sid = strongs_id.upper()
        df = conn.execute(
            """
            SELECT
                SPLIT_PART(verse_id, '.', 1) AS book_id,
                COUNT(*) AS frequency
            FROM interlinear
            WHERE strongs_id = ?
            GROUP BY 1
            ORDER BY frequency DESC
            """,
            [sid],
        ).fetchdf()

        if df.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No occurrences found for {sid}",
            )

        # Enrich with book names from book_stats (or BOOK_CATALOG).
        # Use a simple map from the verses table so we don't need to import
        # schemas — just grab distinct book_name per book_id.
        names_df = conn.execute(
            "SELECT book_id, ANY_VALUE(book_name) AS book_name, "
            "ANY_VALUE(testament) AS testament "
            "FROM book_stats "
            "GROUP BY book_id "
            "ORDER BY MIN(book_position)"
        ).fetchdf()
        name_map: dict[str, tuple[str, str]] = {}
        for _, r in names_df.iterrows():
            name_map[r["book_id"]] = (r["book_name"], r["testament"])

        distribution = []
        total = 0
        for _, row in df.iterrows():
            bid = row["book_id"]
            freq = int(row["frequency"])
            total += freq
            bname, testament = name_map.get(bid, (bid, ""))
            distribution.append(
                {
                    "book_id": bid,
                    "book_name": bname,
                    "testament": testament,
                    "frequency": freq,
                }
            )

        return {
            "strongs_id": sid,
            "total_occurrences": total,
            "distribution": distribution,
        }
    finally:
        conn.close()


# ─── Bible Dictionary ────────────────────────────────────────────────────────


@router.get("/dictionary/search")
def search_dictionary(
    q: str = Query(..., min_length=2, description="Search term"),
    limit: int = Query(50, ge=1, le=200, description="Max results"),
    lang: str | None = Query(
        None,
        description="Target language for the preview: 'pt' or 'es'. "
                    "Falls back to English when translation unavailable.",
    ),
) -> dict:
    """Search the Bible dictionary (Easton's + Smith's) by name.

    When `lang` is provided, searches both the English name and the
    localized name in `dictionary_entries_multilang`. Translated preview
    snippets and localized names are overlaid when available.
    """
    accent_from = "àáâãäåèéêëìíîïòóôõöùúûüñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÑÇ"
    accent_to = "aaaaaaeeeeiiiiooooouuuuncAAAAAAEEEEIIIIOOOOOUUUUNC"

    conn = get_db()
    try:
        target = lang.lower() if lang and lang.lower() in ("pt", "es") else None

        if target:
            df = conn.execute(
                f"""
                SELECT DISTINCT e.slug, e.name, e.source,
                       e.text_easton, e.text_smith,
                       LEFT(COALESCE(e.text_easton, e.text_smith, ''), 200) AS preview
                FROM dictionary_entries e
                LEFT JOIN dictionary_entries_multilang m
                    ON m.slug = e.slug AND m.lang = ?
                WHERE e.name ILIKE ?
                   OR translate(lower(m.name), '{accent_from}', '{accent_to}')
                      ILIKE translate(lower(?), '{accent_from}', '{accent_to}')
                ORDER BY LENGTH(e.name), e.name
                LIMIT ?
                """,
                [target, f"%{q}%", f"%{q}%", limit],
            ).fetchdf()
        else:
            df = conn.execute(
                """
                SELECT slug, name, source, text_easton, text_smith,
                       LEFT(COALESCE(text_easton, text_smith, ''), 200) AS preview
                FROM dictionary_entries
                WHERE name ILIKE ?
                ORDER BY LENGTH(name), name
                LIMIT ?
                """,
                [f"%{q}%", limit],
            ).fetchdf()

        records = df.to_dict(orient="records")

        if target and records:
            slugs = [r["slug"] for r in records]
            placeholders = ",".join("?" * len(slugs))
            ml_rows = conn.execute(
                f"""
                SELECT slug, name, text_easton, text_smith
                FROM dictionary_entries_multilang
                WHERE lang = ? AND slug IN ({placeholders})
                """,
                [target, *slugs],
            ).fetchall()
            ml_map = {
                row[0]: {"name": row[1], "text_easton": row[2], "text_smith": row[3]}
                for row in ml_rows
            }
            for r in records:
                ml = ml_map.get(r["slug"])
                any_translated = False
                if ml:
                    if ml["name"]:
                        r["name"] = ml["name"]
                    if r.get("text_easton") and ml["text_easton"]:
                        r["text_easton"] = ml["text_easton"]
                        any_translated = True
                    if r.get("text_smith") and ml["text_smith"]:
                        r["text_smith"] = ml["text_smith"]
                        any_translated = True
                if any_translated:
                    r["preview"] = (r.get("text_easton") or r.get("text_smith") or "")[:200]
                r["is_translated"] = any_translated

        return {"query": q, "total_results": len(records), "results": records}
    finally:
        conn.close()


@router.get("/dictionary/{slug}")
def get_dictionary_entry(
    slug: str,
    lang: str | None = Query(
        None,
        description="Target language: 'pt' or 'es'. Falls back to English "
                    "for whichever source body (Easton/Smith) lacks translation.",
    ),
) -> dict:
    """Get a specific dictionary entry by slug.

    Mirrors the Strong's `?lang=` pattern: if a translation exists in
    `dictionary_entries_multilang`, the response has `text_easton` /
    `text_smith` replaced by the translated bodies. Per-source fallback —
    a slug may have a translated Easton body but no translated Smith body
    (or vice versa); the missing side falls back to the English original.
    The response includes `is_translated: bool` so the frontend can flag
    entries still awaiting translation.
    """
    conn = get_db()
    try:
        df = conn.execute(
            "SELECT * FROM dictionary_entries WHERE slug = ?",
            [slug.lower()],
        ).fetchdf()
        if df.empty:
            raise HTTPException(status_code=404, detail=f"Dictionary entry '{slug}' not found")
        entry = df.to_dict(orient="records")[0]

        is_translated = False
        if lang and lang.lower() in ("pt", "es"):
            target = lang.lower()
            ml_row = conn.execute(
                """
                SELECT name, text_easton, text_smith
                FROM dictionary_entries_multilang
                WHERE slug = ? AND lang = ?
                """,
                [slug.lower(), target],
            ).fetchone()
            if ml_row:
                localized_name = ml_row[0]
                translated_easton = ml_row[1]
                translated_smith = ml_row[2]
                if localized_name:
                    entry["name"] = localized_name
                has_any_translation = False
                if entry.get("text_easton") and translated_easton:
                    entry["text_easton"] = translated_easton
                    has_any_translation = True
                if entry.get("text_smith") and translated_smith:
                    entry["text_smith"] = translated_smith
                    has_any_translation = True
                is_translated = has_any_translation

        entry["is_translated"] = is_translated
        return entry
    finally:
        conn.close()
