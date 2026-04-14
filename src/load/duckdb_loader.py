"""
📤 Load Module — DuckDB
Loads enriched data into DuckDB with optimized tables and analytical views.
"""

from __future__ import annotations

import logging
from pathlib import Path

import duckdb
import pandas as pd

from src.config import LoadConfig

logger = logging.getLogger(__name__)


class DuckDBLoader:
    """Loads data into a local DuckDB database with analytical views."""

    def __init__(self, config: LoadConfig | None = None) -> None:
        self.config = config or LoadConfig()
        self.db_path = self.config.duckdb_path
        self._conn: duckdb.DuckDBPyConnection | None = None

    @property
    def conn(self) -> duckdb.DuckDBPyConnection:
        if self._conn is None:
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
            self._conn = duckdb.connect(self.db_path)
        return self._conn

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None

    def __enter__(self) -> DuckDBLoader:
        return self

    def __exit__(self, *args: object) -> None:
        self.close()

    def create_schema(self) -> None:
        """Create the database schema with tables and views."""
        logger.info("🏗️  Creating DuckDB schema...")

        # Drop and recreate to handle schema evolution
        self.conn.execute("DROP TABLE IF EXISTS cross_references;")
        self.conn.execute("DROP TABLE IF EXISTS verses;")
        self.conn.execute("DROP TABLE IF EXISTS book_stats;")
        self.conn.execute("DROP TABLE IF EXISTS chapter_stats;")
        self.conn.execute("DROP TABLE IF EXISTS translations;")
        self.conn.execute("DROP TABLE IF EXISTS strongs_lexicon;")
        self.conn.execute("DROP TABLE IF EXISTS original_texts;")
        self.conn.execute("DROP TABLE IF EXISTS interlinear;")

        self.conn.execute("""
            CREATE TABLE translations (
                translation_id  VARCHAR PRIMARY KEY,
                language        VARCHAR NOT NULL,
                name            VARCHAR NOT NULL,
                full_name       VARCHAR,
                year            INTEGER,
                license         VARCHAR,
                source_api      VARCHAR
            );
        """)

        self.conn.execute("""
            CREATE TABLE verses (
                verse_id        VARCHAR NOT NULL,
                book_id         VARCHAR NOT NULL,
                book_name       VARCHAR NOT NULL,
                chapter         INTEGER NOT NULL,
                verse           INTEGER NOT NULL,
                text            VARCHAR NOT NULL,
                reference       VARCHAR NOT NULL,
                translation_id  VARCHAR NOT NULL,
                language        VARCHAR NOT NULL,
                testament       VARCHAR NOT NULL,
                category        VARCHAR NOT NULL,
                book_position   INTEGER NOT NULL,
                word_count      INTEGER NOT NULL,
                char_count      INTEGER NOT NULL,
                avg_word_length DOUBLE NOT NULL,
                sentiment_polarity    DOUBLE NOT NULL,
                sentiment_subjectivity DOUBLE NOT NULL,
                sentiment_label VARCHAR NOT NULL,
                PRIMARY KEY (translation_id, book_id, chapter, verse)
            );
        """)

        self.conn.execute("""
            CREATE TABLE book_stats (
                translation_id  VARCHAR NOT NULL,
                language        VARCHAR NOT NULL,
                book_id         VARCHAR NOT NULL,
                book_name       VARCHAR NOT NULL,
                testament       VARCHAR NOT NULL,
                category        VARCHAR NOT NULL,
                book_position   INTEGER NOT NULL,
                total_chapters  INTEGER NOT NULL,
                total_verses    INTEGER NOT NULL,
                total_words     BIGINT NOT NULL,
                avg_words_per_verse DOUBLE,
                avg_sentiment   DOUBLE,
                min_sentiment   DOUBLE,
                max_sentiment   DOUBLE,
                positive_verses INTEGER,
                negative_verses INTEGER,
                neutral_verses  INTEGER,
                PRIMARY KEY (translation_id, book_id)
            );
        """)

        self.conn.execute("""
            CREATE TABLE chapter_stats (
                translation_id  VARCHAR NOT NULL,
                language        VARCHAR NOT NULL,
                book_id         VARCHAR NOT NULL,
                book_name       VARCHAR NOT NULL,
                chapter         INTEGER NOT NULL,
                book_position   INTEGER NOT NULL,
                total_verses    INTEGER NOT NULL,
                total_words     BIGINT NOT NULL,
                avg_words_per_verse DOUBLE,
                avg_sentiment   DOUBLE,
                avg_subjectivity DOUBLE,
                PRIMARY KEY (translation_id, book_id, chapter)
            );
        """)

        self.conn.execute("DROP TABLE IF EXISTS pipeline_runs;")
        self.conn.execute("""
            CREATE TABLE pipeline_runs (
                run_id          VARCHAR PRIMARY KEY,
                started_at      TIMESTAMP NOT NULL,
                completed_at    TIMESTAMP,
                status          VARCHAR NOT NULL,
                total_verses    INTEGER,
                duration_seconds DOUBLE,
                translations    VARCHAR
            );
        """)

        self.conn.execute("""
            CREATE TABLE cross_references (
                source_verse_id     VARCHAR NOT NULL,
                target_verse_id     VARCHAR NOT NULL,
                source_book_id      VARCHAR NOT NULL,
                target_book_id      VARCHAR NOT NULL,
                source_book_position INTEGER NOT NULL,
                target_book_position INTEGER NOT NULL,
                votes               INTEGER DEFAULT 1,
                reference_type      VARCHAR DEFAULT 'general',
                arc_distance        INTEGER NOT NULL,
                PRIMARY KEY (source_verse_id, target_verse_id)
            );
        """)

        self._ensure_strongs_table()
        self._ensure_original_texts_table()
        self._ensure_interlinear_table()

        self._create_analytical_views()
        logger.info("✅ Schema created successfully")

    def _create_analytical_views(self) -> None:
        """Create useful analytical views."""
        self.conn.execute("""
            CREATE OR REPLACE VIEW v_testament_summary AS
            SELECT
                translation_id,
                testament,
                COUNT(DISTINCT book_id) AS books,
                COUNT(DISTINCT book_id || ':' || chapter::VARCHAR) AS chapters,
                COUNT(*) AS verses,
                SUM(word_count) AS total_words,
                ROUND(AVG(word_count), 2) AS avg_words_per_verse,
                ROUND(AVG(sentiment_polarity), 4) AS avg_sentiment,
                ROUND(AVG(sentiment_subjectivity), 4) AS avg_subjectivity
            FROM verses
            GROUP BY translation_id, testament;
        """)

        self.conn.execute("""
            CREATE OR REPLACE VIEW v_category_summary AS
            SELECT
                translation_id,
                category,
                testament,
                COUNT(DISTINCT book_id) AS books,
                COUNT(*) AS verses,
                SUM(word_count) AS total_words,
                ROUND(AVG(sentiment_polarity), 4) AS avg_sentiment,
                ROUND(STDDEV(sentiment_polarity), 4) AS sentiment_stddev
            FROM verses
            GROUP BY translation_id, category, testament
            ORDER BY translation_id, testament, category;
        """)

        self.conn.execute("""
            CREATE OR REPLACE VIEW v_longest_verses AS
            SELECT translation_id, reference, text, word_count, book_name, chapter, verse
            FROM verses
            ORDER BY word_count DESC
            LIMIT 50;
        """)

        self.conn.execute("""
            CREATE OR REPLACE VIEW v_most_positive_chapters AS
            SELECT
                translation_id,
                book_name,
                chapter,
                COUNT(*) AS verse_count,
                ROUND(AVG(sentiment_polarity), 4) AS avg_sentiment
            FROM verses
            GROUP BY translation_id, book_name, chapter
            HAVING COUNT(*) >= 5
            ORDER BY avg_sentiment DESC
            LIMIT 30;
        """)

        self.conn.execute("""
            CREATE OR REPLACE VIEW v_sentiment_journey AS
            SELECT
                translation_id,
                book_position,
                book_name,
                chapter,
                ROUND(AVG(sentiment_polarity), 4) AS avg_sentiment,
                COUNT(*) AS verses
            FROM verses
            GROUP BY translation_id, book_position, book_name, chapter
            ORDER BY translation_id, book_position, chapter;
        """)

        self.conn.execute("""
            CREATE OR REPLACE VIEW v_translation_summary AS
            SELECT
                translation_id,
                language,
                COUNT(DISTINCT book_id) AS books,
                COUNT(DISTINCT book_id || ':' || chapter::VARCHAR) AS chapters,
                COUNT(*) AS verses,
                SUM(word_count) AS total_words,
                ROUND(AVG(sentiment_polarity), 4) AS avg_sentiment
            FROM verses
            GROUP BY translation_id, language;
        """)

        self.conn.execute("""
            CREATE OR REPLACE VIEW v_parallel_verses AS
            SELECT
                verse_id, book_name, chapter, verse,
                translation_id, language, text, sentiment_polarity
            FROM verses
            ORDER BY verse_id, translation_id;
        """)

        # ── Cross-reference views ─────────────────────────────────────
        self.conn.execute("""
            CREATE OR REPLACE VIEW v_crossref_arcs AS
            SELECT
                source_book_id,
                target_book_id,
                source_book_position,
                target_book_position,
                COUNT(*) AS connection_count,
                ROUND(AVG(arc_distance), 2) AS avg_distance,
                SUM(votes) AS total_votes
            FROM cross_references
            GROUP BY source_book_id, target_book_id,
                     source_book_position, target_book_position
            ORDER BY connection_count DESC;
        """)

        self.conn.execute("""
            CREATE OR REPLACE VIEW v_most_connected_books AS
            SELECT
                book_id,
                (outgoing + incoming) AS total_connections,
                outgoing,
                incoming
            FROM (
                SELECT
                    book_id,
                    (SELECT COUNT(*) FROM cross_references
                     WHERE source_book_id = book_id) AS outgoing,
                    (SELECT COUNT(*) FROM cross_references
                     WHERE target_book_id = book_id) AS incoming
                FROM (SELECT DISTINCT source_book_id AS book_id FROM cross_references
                      UNION
                      SELECT DISTINCT target_book_id FROM cross_references)
            )
            ORDER BY total_connections DESC;
        """)

    def load_translations(self, translations: list[dict]) -> int:
        """Load translation metadata into the translations table."""
        for t in translations:
            self.conn.execute(
                """
                INSERT OR REPLACE INTO translations
                (translation_id, language, name, full_name, year, license, source_api)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
                [
                    t["translation_id"],
                    t["language"],
                    t["name"],
                    t.get("full_name"),
                    t.get("year"),
                    t.get("license"),
                    t["source_api"],
                ],
            )
        count = self.conn.execute("SELECT COUNT(*) FROM translations").fetchone()[0]  # type: ignore[index]
        logger.info(f"📚 Loaded {count} translations")
        return count

    def load_verses(self, df: pd.DataFrame, translation_ids: list[str] | None = None) -> int:
        """Load enriched verses into the database.

        Args:
            df: DataFrame with enriched verse data.
            translation_ids: If provided, only delete verses for these translations
                before inserting (allows incremental loading).
        """
        logger.info(f"📤 Loading {len(df)} verses into DuckDB...")

        if translation_ids:
            placeholders = ", ".join(["?" for _ in translation_ids])
            self.conn.execute(
                f"DELETE FROM verses WHERE translation_id IN ({placeholders})",
                translation_ids,
            )
        else:
            self.conn.execute("DELETE FROM verses;")

        # Use named columns to avoid column order issues
        self.conn.execute("""
            INSERT INTO verses (
                verse_id, book_id, book_name, chapter, verse, text, reference,
                translation_id, language, testament, category, book_position,
                word_count, char_count, avg_word_length,
                sentiment_polarity, sentiment_subjectivity, sentiment_label
            )
            SELECT
                verse_id, book_id, book_name, chapter, verse, text, reference,
                translation_id, language, testament, category, book_position,
                word_count, char_count, avg_word_length,
                sentiment_polarity, sentiment_subjectivity, sentiment_label
            FROM df
        """)

        count = self.conn.execute("SELECT COUNT(*) FROM verses").fetchone()[0]  # type: ignore[index]
        logger.info(f"✅ Loaded {count} verses into DuckDB")
        return count

    def load_book_stats(self, df: pd.DataFrame, translation_ids: list[str] | None = None) -> int:
        """Load book-level statistics."""
        if translation_ids:
            placeholders = ", ".join(["?" for _ in translation_ids])
            self.conn.execute(
                f"DELETE FROM book_stats WHERE translation_id IN ({placeholders})",
                translation_ids,
            )
        else:
            self.conn.execute("DELETE FROM book_stats;")

        self.conn.execute("""
            INSERT INTO book_stats (
                translation_id, language, book_id, book_name, testament, category,
                book_position, total_chapters, total_verses, total_words,
                avg_words_per_verse, avg_sentiment, min_sentiment, max_sentiment,
                positive_verses, negative_verses, neutral_verses
            )
            SELECT
                translation_id, language, book_id, book_name, testament, category,
                book_position, total_chapters, total_verses, total_words,
                avg_words_per_verse, avg_sentiment, min_sentiment, max_sentiment,
                positive_verses, negative_verses, neutral_verses
            FROM df
        """)
        count = self.conn.execute("SELECT COUNT(*) FROM book_stats").fetchone()[0]  # type: ignore[index]
        logger.info(f"📊 Loaded {count} book stats")
        return count

    def load_chapter_stats(self, df: pd.DataFrame, translation_ids: list[str] | None = None) -> int:
        """Load chapter-level statistics."""
        if translation_ids:
            placeholders = ", ".join(["?" for _ in translation_ids])
            self.conn.execute(
                f"DELETE FROM chapter_stats WHERE translation_id IN ({placeholders})",
                translation_ids,
            )
        else:
            self.conn.execute("DELETE FROM chapter_stats;")

        self.conn.execute("""
            INSERT INTO chapter_stats (
                translation_id, language, book_id, book_name, chapter,
                book_position, total_verses, total_words,
                avg_words_per_verse, avg_sentiment, avg_subjectivity
            )
            SELECT
                translation_id, language, book_id, book_name, chapter,
                book_position, total_verses, total_words,
                avg_words_per_verse, avg_sentiment, avg_subjectivity
            FROM df
        """)
        count = self.conn.execute("SELECT COUNT(*) FROM chapter_stats").fetchone()[0]  # type: ignore[index]
        logger.info(f"📊 Loaded {count} chapter stats")
        return count

    def load_cross_references(self, df: pd.DataFrame) -> int:
        """Load cross-references into the database."""
        if df.empty:
            return 0

        logger.info(f"🔗 Loading {len(df)} cross-references into DuckDB...")
        self.conn.execute("DELETE FROM cross_references;")
        self.conn.execute("""
            INSERT INTO cross_references (
                source_verse_id, target_verse_id,
                source_book_id, target_book_id,
                source_book_position, target_book_position,
                votes, reference_type, arc_distance
            )
            SELECT
                source_verse_id, target_verse_id,
                source_book_id, target_book_id,
                source_book_position, target_book_position,
                votes, reference_type, arc_distance
            FROM df
        """)
        count = self.conn.execute("SELECT COUNT(*) FROM cross_references").fetchone()[0]  # type: ignore[index]
        logger.info(f"✅ Loaded {count} cross-references")
        return count

    def _ensure_strongs_table(self) -> None:
        """Create the Strong's lexicon table if it doesn't already exist.

        Kept idempotent so `load_strongs_entries` works even on pre-existing
        databases that were created before this table was added.
        """
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS strongs_lexicon (
                strongs_id       VARCHAR PRIMARY KEY,
                language         VARCHAR NOT NULL,
                original         VARCHAR NOT NULL,
                transliteration  VARCHAR NOT NULL,
                pronunciation    VARCHAR,
                short_definition VARCHAR NOT NULL,
                long_definition  VARCHAR,
                part_of_speech   VARCHAR,
                loaded_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

    def load_strongs_entries(self, df: pd.DataFrame) -> int:
        """Replace the Strong's lexicon with the given rows.

        The lexicon is global (not scoped per translation), so this is an
        unconditional DELETE + INSERT — same pattern as `load_cross_references`.
        """
        if df.empty:
            return 0

        self._ensure_strongs_table()

        logger.info(f"📖 Loading {len(df)} Strong's entries into DuckDB...")
        self.conn.execute("DELETE FROM strongs_lexicon;")
        self.conn.execute("""
            INSERT INTO strongs_lexicon (
                strongs_id, language, original, transliteration,
                pronunciation, short_definition, long_definition, part_of_speech
            )
            SELECT
                strongs_id, language, original, transliteration,
                pronunciation, short_definition, long_definition, part_of_speech
            FROM df
        """)
        count = self.conn.execute("SELECT COUNT(*) FROM strongs_lexicon").fetchone()[0]  # type: ignore[index]
        logger.info(f"✅ Loaded {count} Strong's entries")
        return count

    def _ensure_original_texts_table(self) -> None:
        """Create the original_texts table if it doesn't exist.

        Separate from `create_schema` so `load_original_texts` works on
        pre-existing databases without rebuilding everything.
        """
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS original_texts (
                verse_id   VARCHAR PRIMARY KEY,
                book_id    VARCHAR NOT NULL,
                chapter    INTEGER NOT NULL,
                verse      INTEGER NOT NULL,
                language   VARCHAR NOT NULL,
                text       VARCHAR NOT NULL,
                source     VARCHAR NOT NULL,
                loaded_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        # Indexes are cheap and help both the browse path and language filters.
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_original_book "
            "ON original_texts(book_id, chapter, verse);"
        )
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_original_language ON original_texts(language);"
        )

    def load_original_texts(self, df: pd.DataFrame, language: str) -> int:
        """Load (or refresh) original-language verses for a given language.

        Uses a scoped DELETE (by `language`) so reloading Hebrew doesn't wipe
        out Greek rows (and vice-versa). Global over translations — the same
        verse_id maps to a canonical original regardless of translation.
        """
        if df.empty:
            return 0

        self._ensure_original_texts_table()

        logger.info(f"📜 Loading {len(df)} {language} verses into DuckDB...")
        self.conn.execute(
            "DELETE FROM original_texts WHERE language = ?;",
            [language],
        )
        self.conn.execute("""
            INSERT INTO original_texts (
                verse_id, book_id, chapter, verse, language, text, source
            )
            SELECT
                verse_id, book_id, chapter, verse, language, text, source
            FROM df
        """)
        count_row = self.conn.execute(
            "SELECT COUNT(*) FROM original_texts WHERE language = ?",
            [language],
        ).fetchone()
        count = count_row[0] if count_row else 0
        logger.info(f"✅ Loaded {count} {language} verses")
        return count

    def _ensure_interlinear_table(self) -> None:
        """Create the interlinear table if missing. Idempotent bootstrap for
        pre-existing databases that predate task #3d."""
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS interlinear (
                verse_id        VARCHAR NOT NULL,
                word_position   INTEGER NOT NULL,
                language        VARCHAR NOT NULL,
                source          VARCHAR NOT NULL,
                original_word   VARCHAR NOT NULL,
                transliteration VARCHAR,
                english         VARCHAR,
                strongs_id      VARCHAR,
                strongs_raw     VARCHAR,
                grammar         VARCHAR,
                lemma           VARCHAR,
                gloss           VARCHAR,
                semantic_tag    VARCHAR,
                loaded_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (verse_id, word_position, source)
            );
        """)
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_interlinear_verse ON interlinear(verse_id);"
        )
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_interlinear_strongs ON interlinear(strongs_id);"
        )
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_interlinear_language ON interlinear(language);"
        )

    def load_interlinear(self, df: pd.DataFrame, source: str) -> int:
        """Replace interlinear rows for a given source ("tagnt" or "tahot").

        Scoped DELETE keeps the two language sources independent — reloading
        TAGNT doesn't wipe out TAHOT and vice versa.
        """
        if df.empty:
            return 0

        self._ensure_interlinear_table()

        logger.info(f"🔤 Loading {len(df)} {source} interlinear words into DuckDB...")
        self.conn.execute(
            "DELETE FROM interlinear WHERE source = ?;",
            [source],
        )
        self.conn.execute("""
            INSERT INTO interlinear (
                verse_id, word_position, language, source, original_word,
                transliteration, english, strongs_id, strongs_raw,
                grammar, lemma, gloss, semantic_tag
            )
            SELECT
                verse_id, word_position, language, source, original_word,
                transliteration, english, strongs_id, strongs_raw,
                grammar, lemma, gloss, semantic_tag
            FROM df
        """)
        count_row = self.conn.execute(
            "SELECT COUNT(*) FROM interlinear WHERE source = ?",
            [source],
        ).fetchone()
        count = count_row[0] if count_row else 0
        logger.info(f"✅ Loaded {count} {source} interlinear words")
        return count

    def log_pipeline_run(
        self,
        run_id: str,
        started_at: str,
        completed_at: str,
        status: str,
        total_verses: int,
        duration_seconds: float,
        translations: str = "",
    ) -> None:
        """Log a pipeline run to the tracking table."""
        self.conn.execute(
            """
            INSERT OR REPLACE INTO pipeline_runs
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            [
                run_id,
                started_at,
                completed_at,
                status,
                total_verses,
                duration_seconds,
                translations,
            ],
        )

    def query(self, sql: str) -> pd.DataFrame:
        """Run an arbitrary SQL query and return results as DataFrame."""
        return self.conn.execute(sql).fetchdf()

    def get_summary(self) -> dict:
        """Get a quick summary of the loaded data."""
        result = {}

        row = self.conn.execute("SELECT COUNT(*) FROM verses").fetchone()
        result["total_verses"] = row[0] if row else 0

        row = self.conn.execute("SELECT COUNT(DISTINCT book_id) FROM verses").fetchone()
        result["total_books"] = row[0] if row else 0

        row = self.conn.execute("SELECT COUNT(DISTINCT translation_id) FROM verses").fetchone()
        result["total_translations"] = row[0] if row else 0

        row = self.conn.execute("SELECT SUM(word_count) FROM verses").fetchone()
        result["total_words"] = row[0] if row else 0

        row = self.conn.execute("SELECT ROUND(AVG(sentiment_polarity), 4) FROM verses").fetchone()
        result["avg_sentiment"] = row[0] if row else 0

        row = self.conn.execute("SELECT COUNT(*) FROM cross_references").fetchone()
        result["total_crossrefs"] = row[0] if row else 0

        # strongs_lexicon may not exist on older DBs — guard with a catch
        try:
            row = self.conn.execute("SELECT COUNT(*) FROM strongs_lexicon").fetchone()
            result["strongs_entries"] = row[0] if row else 0
        except Exception:
            result["strongs_entries"] = 0

        # original_texts is likewise optional
        try:
            row = self.conn.execute("SELECT COUNT(*) FROM original_texts").fetchone()
            result["original_texts"] = row[0] if row else 0
        except Exception:
            result["original_texts"] = 0

        # interlinear is optional too
        try:
            row = self.conn.execute("SELECT COUNT(*) FROM interlinear").fetchone()
            result["interlinear_words"] = row[0] if row else 0
        except Exception:
            result["interlinear_words"] = 0

        return result
