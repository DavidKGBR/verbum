"""
🚀 Pipeline Orchestrator
Main entry point that coordinates Extract → Transform → Load.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

import pandas as pd
from rich.console import Console
from rich.table import Table

from src.config import PipelineConfig
from src.extract.bible_api import BibleExtractor
from src.extract.bible_sources import create_source
from src.extract.crossref_extractor import CrossRefExtractor
from src.extract.translations import get_translation
from src.load.duckdb_loader import DuckDBLoader
from src.load.gcs_loader import GCSLoader
from src.models.schemas import PipelineMetrics, RawVerse
from src.transform.cleaning import clean_verses, verses_to_dataframe
from src.transform.crossref_mapper import crossrefs_to_dataframe, transform_crossrefs
from src.transform.enrichment import compute_book_stats, compute_chapter_stats, enrich_dataframe
from src.transform.multilang_aligner import compute_coverage_report

logger = logging.getLogger(__name__)
console = Console()


class BiblePipeline:
    """
    End-to-end ETL pipeline for Biblical text analytics.

    Phases:
        1. EXTRACT  — Fetch from Bible API(s) (or load from cache)
        2. TRANSFORM — Clean, validate, enrich with NLP features
        3. LOAD     — Store in DuckDB (+ optional GCP upload)
    """

    def __init__(self, config: PipelineConfig | None = None) -> None:
        self.config = config or PipelineConfig()
        self.metrics = PipelineMetrics(
            run_id=str(uuid.uuid4())[:8],
            started_at=datetime.now(timezone.utc),
        )

    def run(
        self,
        books: list[str] | None = None,
        translations: list[str] | None = None,
        use_cache: bool = True,
        skip_gcp: bool = False,
        skip_crossrefs: bool = False,
    ) -> PipelineMetrics:
        """
        Execute the full ETL pipeline.

        Args:
            books: Optional list of book IDs to process (None = all 66 books).
            translations: List of translation IDs to process (default: ["kjv"]).
            use_cache: If True, try to load from local cache before fetching API.
            skip_gcp: If True, skip GCP upload even if configured.
            skip_crossrefs: If True, skip cross-reference extraction.

        Returns:
            PipelineMetrics with run statistics.
        """
        if translations is None:
            translations = self.config.extract.translations

        console.rule("[bold blue]🕊️  Bible Data Pipeline[/bold blue]")
        console.print(f"Run ID: [cyan]{self.metrics.run_id}[/cyan]")
        console.print(f"Translations: [cyan]{', '.join(t.upper() for t in translations)}[/cyan]")
        console.print()

        try:
            # ── Phase 1: EXTRACT ──────────────────────────────────────────
            console.rule("[yellow]📥 Phase 1: EXTRACT[/yellow]")
            raw_verses = self._extract(
                books=books,
                translations=translations,
                use_cache=use_cache,
            )
            self.metrics.total_verses_extracted = len(raw_verses)
            self.metrics.translations_processed = translations
            console.print(f"  Extracted: [green]{len(raw_verses)}[/green] verses\n")

            # ── Phase 2: TRANSFORM ────────────────────────────────────────
            console.rule("[yellow]🔄 Phase 2: TRANSFORM[/yellow]")
            enriched_df, book_stats_df, chapter_stats_df = self._transform(raw_verses)
            self.metrics.total_verses_transformed = len(enriched_df)
            self.metrics.total_books = enriched_df["book_id"].nunique()
            self.metrics.total_chapters = enriched_df.groupby(["book_id", "chapter"]).ngroups
            console.print(f"  Transformed: [green]{len(enriched_df)}[/green] verses")

            # Coverage report for multi-translation runs
            if len(translations) > 1 and "verse_id" in enriched_df.columns:
                coverage = compute_coverage_report(
                    enriched_df, reference_translation=translations[0]
                )
                if not coverage.empty:
                    console.print("  📊 Translation coverage:")
                    for _, row in coverage.iterrows():
                        console.print(
                            f"    {row['translation_id'].upper()}: "
                            f"{row['total_verses']:,} verses, "
                            f"{row['coverage_pct']}% coverage"
                        )
            console.print()

            # ── Phase 3: CROSS-REFERENCES (optional) ─────────────────────
            crossref_df = None
            if not skip_crossrefs:
                console.rule("[yellow]🔗 Phase 3: CROSS-REFERENCES[/yellow]")
                crossref_df = self._extract_crossrefs(use_cache=use_cache)
                if crossref_df is not None:
                    self.metrics.total_crossrefs_loaded = len(crossref_df)
                    console.print(f"  Cross-references: [green]{len(crossref_df):,}[/green]\n")

            # ── Phase 4: LOAD ─────────────────────────────────────────────
            console.rule("[yellow]📤 Phase 4: LOAD[/yellow]")
            loaded = self._load(
                enriched_df,
                book_stats_df,
                chapter_stats_df,
                crossref_df=crossref_df,
                translations=translations,
                skip_gcp=skip_gcp,
            )
            self.metrics.total_verses_loaded = loaded

            # Save processed CSV for easy access
            enriched_df.to_csv(self.config.processed_data_dir / "verses_enriched.csv", index=False)
            book_stats_df.to_csv(self.config.analytics_data_dir / "book_stats.csv", index=False)
            chapter_stats_df.to_csv(
                self.config.analytics_data_dir / "chapter_stats.csv", index=False
            )
            console.print(f"  Loaded: [green]{loaded}[/green] verses\n")

            # ── Summary ───────────────────────────────────────────────────
            self.metrics.status = "success"
            self.metrics.completed_at = datetime.now(timezone.utc)
            self._print_summary()

        except Exception as e:
            self.metrics.status = "failed"
            self.metrics.errors.append(str(e))
            self.metrics.completed_at = datetime.now(timezone.utc)
            console.print(f"\n[red bold]❌ Pipeline failed:[/red bold] {e}")
            logger.exception("Pipeline execution failed")
            raise

        return self.metrics

    def _extract(
        self,
        books: list[str] | None = None,
        translations: list[str] | None = None,
        use_cache: bool = True,
    ) -> list[RawVerse]:
        """Extract phase: fetch from API(s) or load from cache."""
        if translations is None:
            translations = ["kjv"]

        all_verses: list[RawVerse] = []

        from src.models.schemas import BOOK_CATALOG

        target_book_ids = set(b["id"] for b in BOOK_CATALOG)
        if books:
            target_book_ids = set(books) & target_book_ids

        for translation_id in translations:
            cache_dir = self.config.raw_data_dir / translation_id

            # Try cache first
            if use_cache and cache_dir.exists() and any(cache_dir.glob("*.json")):
                console.print(f"  📂 Loading [cyan]{translation_id.upper()}[/cyan] from cache...")
                source = create_source(translation_id, self.config.extract)
                verses = source.load_from_cache(cache_dir)
                source.close()

                if verses:
                    if books:
                        verses = [v for v in verses if v.book_id in books]
                    cached_book_ids = {v.book_id for v in verses}
                    missing_books = target_book_ids - cached_book_ids

                    # Fetch missing books from API
                    if missing_books:
                        console.print(
                            f"  🌐 Fetching {len(missing_books)} missing books "
                            f"for [cyan]{translation_id.upper()}[/cyan]..."
                        )
                        source = create_source(translation_id, self.config.extract)
                        try:
                            extra = source.fetch_all(
                                output_dir=cache_dir,
                                books=sorted(missing_books),
                            )
                            verses.extend(extra)
                        finally:
                            source.close()

                    all_verses.extend(verses)
                    continue

            # Also check legacy flat cache (data/raw/*.json) for KJV backward compat
            if (
                use_cache
                and translation_id == "kjv"
                and self.config.raw_data_dir.exists()
                and any(self.config.raw_data_dir.glob("*.json"))
                and not cache_dir.exists()
            ):
                console.print("  📂 Loading [cyan]KJV[/cyan] from legacy cache...")
                legacy = BibleExtractor(self.config.extract)
                verses = legacy.load_from_cache(self.config.raw_data_dir)
                legacy.close()
                if verses:
                    if books:
                        verses = [v for v in verses if v.book_id in books]
                    all_verses.extend(verses)
                    continue

            # Fetch from API
            console.print(f"  🌐 Fetching [cyan]{translation_id.upper()}[/cyan] from API...")
            source = create_source(translation_id, self.config.extract)
            try:
                verses = source.fetch_all(output_dir=cache_dir, books=books)
                all_verses.extend(verses)
            finally:
                source.close()

        return all_verses

    def _transform(
        self, raw_verses: list[RawVerse]
    ) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """Transform phase: clean, enrich, aggregate."""
        # Clean
        cleaned = clean_verses(raw_verses)

        # Convert to DataFrame
        df = verses_to_dataframe(cleaned)

        # Enrich with NLP features
        enriched_df = enrich_dataframe(df)

        # Compute aggregations
        book_stats = compute_book_stats(enriched_df)
        chapter_stats = compute_chapter_stats(enriched_df)

        return enriched_df, book_stats, chapter_stats

    def _extract_crossrefs(self, use_cache: bool = True) -> pd.DataFrame | None:
        """Extract and transform cross-references from OpenBible.info."""
        cache_dir = self.config.raw_data_dir.parent / "crossrefs"

        extractor = CrossRefExtractor(cache_dir=cache_dir if use_cache else None)
        raw_refs = extractor.fetch_all()

        if not raw_refs:
            logger.warning("No cross-references extracted")
            return None

        enriched_refs, stats = transform_crossrefs(raw_refs)
        console.print(
            f"  📊 {stats.total_refs:,} refs, "
            f"{stats.unique_book_pairs} book pairs, "
            f"avg distance: {stats.avg_arc_distance:.1f}"
        )

        return crossrefs_to_dataframe(enriched_refs)

    def _load(
        self,
        enriched_df: pd.DataFrame,
        book_stats_df: pd.DataFrame,
        chapter_stats_df: pd.DataFrame,
        crossref_df: pd.DataFrame | None = None,
        translations: list[str] | None = None,
        skip_gcp: bool = False,
    ) -> int:
        """Load phase: DuckDB + optional GCP."""
        # DuckDB (always)
        with DuckDBLoader(self.config.load) as loader:
            loader.create_schema()

            # Load translation metadata
            translation_dicts = []
            for tid in translations or ["kjv"]:
                t = get_translation(tid)
                translation_dicts.append(t.model_dump())
            loader.load_translations(translation_dicts)

            count = loader.load_verses(enriched_df, translation_ids=translations)
            loader.load_book_stats(book_stats_df, translation_ids=translations)
            loader.load_chapter_stats(chapter_stats_df, translation_ids=translations)

            # Load cross-references
            if crossref_df is not None and not crossref_df.empty:
                loader.load_cross_references(crossref_df)

            # Log pipeline run
            loader.log_pipeline_run(
                run_id=self.metrics.run_id,
                started_at=str(self.metrics.started_at),
                completed_at=str(datetime.now(timezone.utc)),
                status="success",
                total_verses=count,
                duration_seconds=0,
                translations=",".join(translations or []),
            )

        # GCP (optional)
        if self.config.load.use_gcp and not skip_gcp:
            try:
                gcs = GCSLoader(self.config.load)
                if gcs.is_available:
                    console.print("  ☁️  Uploading to GCP...")
                    gcs.upload_to_gcs(enriched_df, "processed/verses_enriched.parquet")
                    gcs.upload_to_gcs(book_stats_df, "analytics/book_stats.parquet")
                    gcs.load_to_bigquery(enriched_df, "verses")
                    gcs.load_to_bigquery(book_stats_df, "book_stats")
            except Exception as e:
                logger.warning(f"GCP upload failed (non-fatal): {e}")
                self.metrics.errors.append(f"GCP: {e}")

        return count

    def _print_summary(self) -> None:
        """Print a beautiful pipeline run summary."""
        console.print()
        console.rule("[bold green]✅ Pipeline Complete[/bold green]")

        table = Table(title="📊 Run Summary", show_header=False, padding=(0, 2))
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="green")

        table.add_row("Run ID", self.metrics.run_id)
        table.add_row("Status", f"[bold green]{self.metrics.status}[/bold green]")
        table.add_row(
            "Translations",
            ", ".join(t.upper() for t in self.metrics.translations_processed),
        )
        table.add_row("Books processed", str(self.metrics.total_books))
        table.add_row("Chapters", str(self.metrics.total_chapters))
        table.add_row("Verses extracted", f"{self.metrics.total_verses_extracted:,}")
        table.add_row("Verses loaded", f"{self.metrics.total_verses_loaded:,}")
        if self.metrics.total_crossrefs_loaded > 0:
            table.add_row("Cross-references", f"{self.metrics.total_crossrefs_loaded:,}")
        table.add_row(
            "Duration",
            f"{self.metrics.duration_seconds:.1f}s" if self.metrics.duration_seconds else "N/A",
        )
        table.add_row(
            "Success rate",
            f"{self.metrics.success_rate * 100:.1f}%",
        )

        if self.metrics.errors:
            table.add_row("Warnings", str(len(self.metrics.errors)))

        console.print(table)
