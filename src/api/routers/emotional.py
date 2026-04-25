"""
Emotional Landscape Router
Per-verse sentiment series, emotional peaks, and book-level profiles.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from src.api.dependencies import get_db

router = APIRouter()

TRANSLATION_LANG = {
    "nvi": "pt", "ra": "pt", "acf": "pt",
    "rvr": "es", "apee": "es",
}


@router.get("/emotional/landscape")
def get_emotional_landscape(
    book: str = Query(..., description="Book ID (e.g. PSA, JHN)"),
    translation: str = Query("kjv", description="Translation ID"),
) -> dict:
    """Get per-verse sentiment polarity for the entire book — for area/line charts."""
    conn = get_db()
    try:
        book_upper = book.upper()
        lang = TRANSLATION_LANG.get(translation)

        if lang:
            df = conn.execute(
                """
                SELECT
                    v.verse_id,
                    v.chapter,
                    v.verse,
                    ROUND(COALESCE(m.polarity, v.sentiment_polarity), 4) AS polarity,
                    COALESCE(m.label, v.sentiment_label) AS label
                FROM verses v
                LEFT JOIN verses_sentiment_multilang m
                    ON m.verse_id = v.verse_id AND m.lang = ?
                WHERE v.book_id = ? AND v.translation_id = ?
                ORDER BY v.chapter, v.verse
                """,
                [lang, book_upper, translation],
            ).fetchdf()
        else:
            df = conn.execute(
                """
                SELECT
                    verse_id, chapter, verse,
                    ROUND(sentiment_polarity, 4) AS polarity,
                    sentiment_label AS label
                FROM verses
                WHERE book_id = ? AND translation_id = ?
                ORDER BY chapter, verse
                """,
                [book_upper, translation],
            ).fetchdf()

        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data for {book_upper}/{translation}")

        return {
            "book_id": book_upper,
            "translation": translation,
            "total_verses": len(df),
            "series": df.to_dict(orient="records"),
        }
    finally:
        conn.close()


@router.get("/emotional/peaks")
def get_emotional_peaks(
    book: str = Query(..., description="Book ID"),
    emotion: str = Query("positive", description="Filter: positive, negative, or neutral"),
    translation: str = Query("kjv", description="Translation ID"),
    limit: int = Query(20, ge=1, le=100, description="Max results"),
) -> dict:
    """Get the most emotionally intense verses in a book."""
    conn = get_db()
    try:
        book_upper = book.upper()
        order = "DESC" if emotion == "positive" else "ASC"
        lang = TRANSLATION_LANG.get(translation)

        where_label = ""
        if emotion in ("positive", "negative", "neutral"):
            label_expr = "COALESCE(m.label, v.sentiment_label)" if lang else "sentiment_label"
            where_label = f"AND {label_expr} = ?"

        params: list[object] = []
        if lang:
            params.append(lang)
        params.extend([book_upper, translation])
        if where_label:
            params.append(emotion)
        params.append(limit)

        if lang:
            polarity_col = "COALESCE(m.polarity, v.sentiment_polarity)"
            df = conn.execute(
                f"""
                SELECT
                    v.verse_id,
                    v.reference,
                    v.chapter,
                    v.verse,
                    v.text,
                    ROUND({polarity_col}, 4) AS polarity,
                    COALESCE(m.label, v.sentiment_label) AS label
                FROM verses v
                LEFT JOIN verses_sentiment_multilang m
                    ON m.verse_id = v.verse_id AND m.lang = ?
                WHERE v.book_id = ? AND v.translation_id = ?
                {where_label}
                ORDER BY {polarity_col} {order}
                LIMIT ?
                """,
                params,
            ).fetchdf()
        else:
            df = conn.execute(
                f"""
                SELECT
                    verse_id, reference, chapter, verse, text,
                    ROUND(sentiment_polarity, 4) AS polarity,
                    sentiment_label AS label
                FROM verses
                WHERE book_id = ? AND translation_id = ?
                {where_label}
                ORDER BY sentiment_polarity {order}
                LIMIT ?
                """,
                params,
            ).fetchdf()

        return {
            "book_id": book_upper,
            "emotion": emotion,
            "translation": translation,
            "results": df.to_dict(orient="records"),
        }
    finally:
        conn.close()


@router.get("/emotional/arc/{book_id}")
def get_book_arc(
    book_id: str,
    translation: str = Query("kjv", description="Translation ID"),
) -> dict:
    """Book-level emotional arc: per-chapter aggregates + derived KPIs.

    KPIs include direction, peak, valley, volatility, and turn points.
    """
    conn = get_db()
    try:
        book_upper = book_id.upper()
        lang = TRANSLATION_LANG.get(translation)
        polarity_col = (
            "COALESCE(m.polarity, v.sentiment_polarity)" if lang else "v.sentiment_polarity"
        )
        label_col = (
            "COALESCE(m.label, v.sentiment_label)" if lang else "v.sentiment_label"
        )
        join_clause = (
            "LEFT JOIN verses_sentiment_multilang m "
            "ON m.verse_id = v.verse_id AND m.lang = ?"
            if lang
            else ""
        )

        params: list[object] = []
        if lang:
            params.append(lang)
        params.extend([book_upper, translation])

        chapter_df = conn.execute(
            f"""
            SELECT
                v.chapter AS chapter,
                COUNT(*) AS verse_count,
                ROUND(AVG({polarity_col}), 4) AS avg_polarity,
                ROUND(MIN({polarity_col}), 4) AS min_polarity,
                ROUND(MAX({polarity_col}), 4) AS max_polarity,
                ROUND(COALESCE(STDDEV({polarity_col}), 0), 4) AS stddev_polarity
            FROM verses v
            {join_clause}
            WHERE v.book_id = ? AND v.translation_id = ?
            GROUP BY v.chapter
            ORDER BY v.chapter
            """,
            params,
        ).fetchdf()

        if chapter_df.empty:
            raise HTTPException(
                status_code=404, detail=f"No data for {book_upper}/{translation}"
            )

        # Overall label counts + stddev
        params2: list[object] = []
        if lang:
            params2.append(lang)
        params2.extend([book_upper, translation])
        overall_row = conn.execute(
            f"""
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN {label_col} = 'positive' THEN 1 ELSE 0 END) AS positive,
                SUM(CASE WHEN {label_col} = 'negative' THEN 1 ELSE 0 END) AS negative,
                SUM(CASE WHEN {label_col} = 'neutral' THEN 1 ELSE 0 END) AS neutral,
                ROUND(COALESCE(STDDEV({polarity_col}), 0), 4) AS volatility
            FROM verses v
            {join_clause}
            WHERE v.book_id = ? AND v.translation_id = ?
            """,
            params2,
        ).fetchone()

        total = int(overall_row[0] or 0)
        positive = int(overall_row[1] or 0)
        negative = int(overall_row[2] or 0)
        neutral = int(overall_row[3] or 0)
        volatility = float(overall_row[4] or 0.0)

        def _peak_verse(order: str) -> dict | None:
            params3: list[object] = []
            if lang:
                params3.append(lang)
            params3.extend([book_upper, translation])
            row = conn.execute(
                f"""
                SELECT
                    v.verse_id,
                    v.reference,
                    v.chapter,
                    v.verse,
                    v.text,
                    ROUND({polarity_col}, 4) AS polarity
                FROM verses v
                {join_clause}
                WHERE v.book_id = ? AND v.translation_id = ?
                ORDER BY {polarity_col} {order}, v.chapter, v.verse
                LIMIT 1
                """,
                params3,
            ).fetchone()
            if row is None:
                return None
            return {
                "verse_id": row[0],
                "reference": row[1],
                "chapter": int(row[2]),
                "verse": int(row[3]),
                "text": row[4],
                "polarity": float(row[5]),
            }

        peak = _peak_verse("DESC")
        valley = _peak_verse("ASC")

        series = [
            {
                "chapter": int(r.chapter),
                "avg_polarity": float(r.avg_polarity),
                "verse_count": int(r.verse_count),
                "min_polarity": float(r.min_polarity),
                "max_polarity": float(r.max_polarity),
                "stddev_polarity": float(r.stddev_polarity),
            }
            for r in chapter_df.itertuples(index=False)
        ]

        n = len(series)
        avgs = [s["avg_polarity"] for s in series]
        q = max(1, n // 4)
        first_q = sum(avgs[:q]) / q
        last_q = sum(avgs[-q:]) / q
        arc_delta = round(last_q - first_q, 4)

        # U-shape / inverted-U detection
        mid_start = n // 4
        mid_end = n - (n // 4) if n >= 4 else n
        mid_slice = avgs[mid_start:mid_end] if mid_end > mid_start else avgs
        mid_avg = sum(mid_slice) / len(mid_slice) if mid_slice else 0.0
        edges_avg = (first_q + last_q) / 2

        if n >= 4 and edges_avg - mid_avg > 0.3 and first_q > 0 and last_q > 0 and mid_avg < 0:
            arc_direction = "u_shape"
        elif n >= 4 and mid_avg - edges_avg > 0.3 and first_q < 0 and last_q < 0 and mid_avg > 0:
            arc_direction = "inverted_u"
        elif arc_delta > 0.3:
            arc_direction = "ascending"
        elif arc_delta < -0.3:
            arc_direction = "descending"
        else:
            arc_direction = "stable"

        turn_points = []
        for i in range(1, n):
            delta = round(avgs[i] - avgs[i - 1], 4)
            if delta > 0.4:
                turn_points.append(
                    {"chapter": series[i]["chapter"], "delta": delta, "direction": "upward"}
                )
            elif delta < -0.4:
                turn_points.append(
                    {"chapter": series[i]["chapter"], "delta": delta, "direction": "downward"}
                )

        denom = max(total, 1)
        kpis = {
            "arc_direction": arc_direction,
            "arc_delta": arc_delta,
            "peak": peak,
            "valley": valley,
            "volatility": round(volatility, 4),
            "positive_pct": round(positive * 100 / denom, 2),
            "negative_pct": round(negative * 100 / denom, 2),
            "neutral_pct": round(neutral * 100 / denom, 2),
            "turn_points": turn_points,
        }

        return {
            "book_id": book_upper,
            "translation": translation,
            "lang": lang or "en",
            "chapter_count": n,
            "kpis": kpis,
            "series": series,
        }
    finally:
        conn.close()


@router.get("/emotional/book-profiles")
def get_book_profiles(
    translation: str = Query("kjv", description="Translation ID"),
) -> dict:
    """Aggregated sentiment stats per book."""
    conn = get_db()
    try:
        df = conn.execute(
            """
            SELECT
                book_id,
                book_name,
                testament,
                ROUND(AVG(sentiment_polarity), 4) AS avg_polarity,
                ROUND(MIN(sentiment_polarity), 4) AS min_polarity,
                ROUND(MAX(sentiment_polarity), 4) AS max_polarity,
                SUM(CASE WHEN sentiment_label = 'positive' THEN 1 ELSE 0 END) AS positive,
                SUM(CASE WHEN sentiment_label = 'negative' THEN 1 ELSE 0 END) AS negative,
                SUM(CASE WHEN sentiment_label = 'neutral' THEN 1 ELSE 0 END) AS neutral,
                COUNT(*) AS verse_count
            FROM verses
            WHERE translation_id = ?
            GROUP BY book_id, book_name, testament
            ORDER BY MIN(book_position)
            """,
            [translation],
        ).fetchdf()

        return {"translation": translation, "profiles": df.to_dict(orient="records")}
    finally:
        conn.close()
