"""
⌨️ CLI Interface
Command-line interface using Typer for the Bible Data Pipeline.
"""

from __future__ import annotations

import logging
import sys

import pandas as pd
import typer
from rich.console import Console
from rich.logging import RichHandler

from src.config import PipelineConfig
from src.extract.dictionary_extractor import DictionaryExtractor
from src.extract.morphhb_extractor import MorphHbExtractor
from src.extract.naves_extractor import NavesExtractor
from src.extract.openbible_geocoding import OpenBibleGeoExtractor
from src.extract.sblgnt_extractor import SblgntExtractor
from src.extract.stepbible_extractor import StepBibleExtractor
from src.extract.strongs_extractor import StrongsExtractor
from src.extract.theographic_extractor import TheographicExtractor
from src.load.duckdb_loader import DuckDBLoader
from src.models.schemas import InterlinearWord
from src.pipeline import BiblePipeline

app = typer.Typer(
    name="bible-pipeline",
    help="🕊️ Bible Data Pipeline — ETL for Biblical text analytics",
    add_completion=False,
    rich_markup_mode="rich",
)
console = Console()


def setup_logging(level: str = "INFO") -> None:
    """Configure rich logging."""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format="%(message)s",
        datefmt="[%X]",
        handlers=[RichHandler(rich_tracebacks=True, markup=True)],
    )


@app.command()
def run(
    books: str | None = typer.Option(
        None,
        "--books",
        "-b",
        help="Comma-separated book IDs to process (e.g., 'GEN,EXO,PSA'). Default: all.",
    ),
    translations: str | None = typer.Option(
        None,
        "--translations",
        "-t",
        help="Comma-separated translation IDs (e.g., 'kjv,asv,rva'). Default: kjv.",
    ),
    no_cache: bool = typer.Option(
        False,
        "--no-cache",
        help="Force re-extraction from API (ignore local cache).",
    ),
    skip_gcp: bool = typer.Option(
        False,
        "--skip-gcp",
        help="Skip GCP upload even if configured.",
    ),
    skip_crossrefs: bool = typer.Option(
        False,
        "--skip-crossrefs",
        help="Skip cross-reference extraction from OpenBible.info.",
    ),
    log_level: str = typer.Option(
        "INFO",
        "--log-level",
        "-l",
        help="Logging level: DEBUG, INFO, WARNING, ERROR.",
    ),
) -> None:
    """🚀 Run the full ETL pipeline."""
    setup_logging(log_level)

    book_list = [b.strip().upper() for b in books.split(",")] if books else None
    translation_list = (
        [t.strip().lower() for t in translations.split(",")] if translations else ["kjv"]
    )

    config = PipelineConfig()
    config.extract.translations = translation_list
    pipeline = BiblePipeline(config)

    try:
        metrics = pipeline.run(
            books=book_list,
            translations=translation_list,
            use_cache=not no_cache,
            skip_gcp=skip_gcp,
            skip_crossrefs=skip_crossrefs,
        )
        sys.exit(0 if metrics.status == "success" else 1)
    except Exception:
        sys.exit(1)


@app.command()
def query(
    sql: str = typer.Argument(..., help="SQL query to execute against the database."),
) -> None:
    """🔍 Run a SQL query against the DuckDB database."""
    setup_logging("WARNING")

    config = PipelineConfig()
    with DuckDBLoader(config.load) as loader:
        try:
            result = loader.query(sql)
            console.print(result.to_string(index=False))
        except Exception as e:
            console.print(f"[red]Query error:[/red] {e}")
            sys.exit(1)


@app.command()
def info() -> None:
    """📊 Show database summary and statistics."""
    setup_logging("WARNING")

    config = PipelineConfig()
    with DuckDBLoader(config.load) as loader:
        try:
            summary = loader.get_summary()
            console.print("\n[bold]📊 Database Summary[/bold]\n")
            for key, value in summary.items():
                label = key.replace("_", " ").title()
                console.print(
                    f"  {label}: [cyan]{value:,}[/cyan]"
                    if isinstance(value, int)
                    else f"  {label}: [cyan]{value}[/cyan]"
                )
        except Exception as e:
            console.print(
                "[yellow]Database not initialized.[/yellow] Run `bible-pipeline run` first."
            )
            console.print(f"  Error: {e}")


@app.command()
def strongs(
    cache: bool = typer.Option(
        True,
        "--cache/--no-cache",
        help="Use cached raw file from data/raw/strongs/ if present.",
    ),
    log_level: str = typer.Option("INFO", "--log-level", "-l", help="Logging level"),
) -> None:
    """📖 Extract and load Strong's Hebrew + Greek lexicon (~14.3K entries)."""
    setup_logging(log_level)

    console.print("[bold]📖 Strong's lexicon[/bold]\n")
    extractor = StrongsExtractor()
    entries = extractor.extract(use_cache=cache)

    if not entries:
        console.print("[red]No entries extracted.[/red]")
        raise typer.Exit(code=1)

    # Build a DataFrame for bulk insert — shape matches strongs_lexicon columns.
    df = pd.DataFrame(
        [
            {
                "strongs_id": e.strongs_id,
                "language": e.language.value,
                "original": e.original,
                "transliteration": e.transliteration,
                "pronunciation": e.pronunciation,
                "short_definition": e.short_definition,
                "long_definition": e.long_definition,
                "part_of_speech": e.part_of_speech,
            }
            for e in entries
        ]
    )

    config = PipelineConfig()
    with DuckDBLoader(config.load) as loader:
        count = loader.load_strongs_entries(df)

    hebrew = sum(1 for e in entries if e.language.value == "hebrew")
    greek = sum(1 for e in entries if e.language.value == "greek")
    console.print(
        f"\n[green]✓[/green] Loaded [bold]{count:,}[/bold] Strong's entries "
        f"([cyan]{hebrew:,}[/cyan] Hebrew · [cyan]{greek:,}[/cyan] Greek)"
    )


@app.command()
def hebrew(
    book: str | None = typer.Option(
        None,
        "--book",
        "-b",
        help="Load only one book (OSIS name or canonical ID). Default: all 39 OT books.",
    ),
    cache: bool = typer.Option(
        True,
        "--cache/--no-cache",
        help="Use cached XML in data/raw/morphhb/ if present.",
    ),
    log_level: str = typer.Option("INFO", "--log-level", "-l", help="Logging level"),
) -> None:
    """📜 Extract and load the Hebrew OT (Westminster Leningrad Codex via MorphHB)."""
    setup_logging(log_level)

    console.print("[bold]📜 Hebrew OT (MorphHB · Westminster Leningrad Codex)[/bold]\n")
    extractor = MorphHbExtractor()
    books_arg = [book] if book else None
    try:
        verses = extractor.extract(books=books_arg, use_cache=cache)
    except ValueError as e:
        console.print(f"[red]✗[/red] {e}")
        raise typer.Exit(code=1) from e

    if not verses:
        console.print("[yellow]No verses extracted.[/yellow]")
        raise typer.Exit(code=1)

    df = pd.DataFrame(
        [
            {
                "verse_id": v.verse_id,
                "book_id": v.book_id,
                "chapter": v.chapter,
                "verse": v.verse,
                "language": v.language.value,
                "text": v.text,
                "source": v.source,
            }
            for v in verses
        ]
    )

    config = PipelineConfig()
    with DuckDBLoader(config.load) as loader:
        count = loader.load_original_texts(df, language="hebrew")

    books_loaded = sorted({v.book_id for v in verses})
    console.print(
        f"\n[green]✓[/green] Loaded [bold]{count:,}[/bold] Hebrew verses "
        f"across [cyan]{len(books_loaded)}[/cyan] book"
        f"{'s' if len(books_loaded) != 1 else ''}."
    )


@app.command()
def greek(
    book: str | None = typer.Option(
        None,
        "--book",
        "-b",
        help="Load only one book (SBLGNT name or canonical ID). Default: all 27 NT books.",
    ),
    cache: bool = typer.Option(
        True,
        "--cache/--no-cache",
        help="Use cached XML in data/raw/sblgnt/ if present.",
    ),
    log_level: str = typer.Option("INFO", "--log-level", "-l", help="Logging level"),
) -> None:
    """✝️ Extract and load the Greek NT (SBL Greek New Testament).

    SBLGNT © 2010 Society of Biblical Literature & Logos Bible Software.
    Free for personal, academic, and open-source use with attribution.
    """
    setup_logging(log_level)

    console.print("[bold]✝️  Greek NT (SBLGNT)[/bold]\n")
    extractor = SblgntExtractor()
    books_arg = [book] if book else None
    try:
        verses = extractor.extract(books=books_arg, use_cache=cache)
    except ValueError as e:
        console.print(f"[red]✗[/red] {e}")
        raise typer.Exit(code=1) from e

    if not verses:
        console.print("[yellow]No verses extracted.[/yellow]")
        raise typer.Exit(code=1)

    df = pd.DataFrame(
        [
            {
                "verse_id": v.verse_id,
                "book_id": v.book_id,
                "chapter": v.chapter,
                "verse": v.verse,
                "language": v.language.value,
                "text": v.text,
                "source": v.source,
            }
            for v in verses
        ]
    )

    config = PipelineConfig()
    with DuckDBLoader(config.load) as loader:
        count = loader.load_original_texts(df, language="greek")

    books_loaded = sorted({v.book_id for v in verses})
    console.print(
        f"\n[green]✓[/green] Loaded [bold]{count:,}[/bold] Greek verses "
        f"across [cyan]{len(books_loaded)}[/cyan] book"
        f"{'s' if len(books_loaded) != 1 else ''}."
    )


@app.command()
def interlinear(
    language: str = typer.Option(
        "both",
        "--language",
        "-L",
        help="Which side to load: greek (TAGNT) | hebrew (TAHOT) | both.",
    ),
    cache: bool = typer.Option(
        True,
        "--cache/--no-cache",
        help="Use cached TSVs in data/raw/stepbible/ if present.",
    ),
    log_level: str = typer.Option("INFO", "--log-level", "-l", help="Logging level"),
) -> None:
    """🔤 Extract and load STEPBible interlinear (Strong's + morphology + semantic tags).

    Data created by www.STEPBible.org based on work at Tyndale House Cambridge
    (CC BY 4.0). Covers every word of the OT (TAHOT) and NT (TAGNT) with
    disambiguated Strong's, grammar codes, lemma + gloss, and semantic tags
    that identify individuals ("David»David|David@Rut.4.17") and concepts.
    """
    setup_logging(log_level)

    language = language.lower().strip()
    if language not in {"greek", "hebrew", "both"}:
        console.print(f"[red]✗[/red] --language must be greek | hebrew | both (got {language!r})")
        raise typer.Exit(code=1)

    console.print("[bold]🔤 Interlinear (STEPBible TAHOT + TAGNT)[/bold]\n")
    extractor = StepBibleExtractor()
    config = PipelineConfig()

    def _to_df(words: list[InterlinearWord]) -> pd.DataFrame:
        return pd.DataFrame(
            [
                {
                    "verse_id": w.verse_id,
                    "word_position": w.word_position,
                    "language": w.language.value,
                    "source": w.source,
                    "original_word": w.original_word,
                    "transliteration": w.transliteration,
                    "english": w.english,
                    "strongs_id": w.strongs_id,
                    "strongs_raw": w.strongs_raw,
                    "grammar": w.grammar,
                    "lemma": w.lemma,
                    "gloss": w.gloss,
                    "semantic_tag": w.semantic_tag,
                }
                for w in words
            ]
        )

    total = 0
    with DuckDBLoader(config.load) as loader:
        if language in {"greek", "both"}:
            words = extractor.extract_tagnt(use_cache=cache)
            if words:
                count = loader.load_interlinear(_to_df(words), source="tagnt")
                total += count
                console.print(
                    f"[green]✓[/green] Loaded [bold]{count:,}[/bold] Greek interlinear words "
                    f"(TAGNT, {len({w.verse_id.split('.')[0] for w in words})} books)"
                )
        if language in {"hebrew", "both"}:
            words = extractor.extract_tahot(use_cache=cache)
            if words:
                count = loader.load_interlinear(_to_df(words), source="tahot")
                total += count
                console.print(
                    f"[green]✓[/green] Loaded [bold]{count:,}[/bold] Hebrew interlinear words "
                    f"(TAHOT, {len({w.verse_id.split('.')[0] for w in words})} books)"
                )

    console.print(f"\n[green]✓ Total: [bold]{total:,}[/bold] interlinear words.[/green]")


@app.command()
def dictionary(
    cache: bool = typer.Option(True, "--cache/--no-cache", help="Use cached JSON files."),
    log_level: str = typer.Option("INFO", "--log-level", "-l", help="Logging level"),
) -> None:
    """📖 Extract and load Bible Dictionary (Easton's + Smith's, ~6K entries)."""
    setup_logging(log_level)

    console.print("[bold]📖 Bible Dictionary (Easton's + Smith's)[/bold]\n")
    extractor = DictionaryExtractor()
    entries = extractor.extract(use_cache=cache)

    if not entries:
        console.print("[red]No entries extracted.[/red]")
        raise typer.Exit(code=1)

    df = pd.DataFrame([e.model_dump() for e in entries])

    config = PipelineConfig()
    with DuckDBLoader(config.load) as loader:
        count = loader.load_dictionary(df)

    eas = sum(1 for e in entries if "EAS" in e.source)
    smi = sum(1 for e in entries if "SMI" in e.source)
    console.print(
        f"\n[green]✓[/green] Loaded [bold]{count:,}[/bold] dictionary entries "
        f"([cyan]{eas:,}[/cyan] Easton · [cyan]{smi:,}[/cyan] Smith)"
    )


@app.command()
def theographic(
    cache: bool = typer.Option(True, "--cache/--no-cache", help="Use cached JSON files."),
    log_level: str = typer.Option("INFO", "--log-level", "-l", help="Logging level"),
) -> None:
    """🌍 Extract and load Theographic Bible metadata (people, places, events, family)."""
    setup_logging(log_level)

    console.print("[bold]🌍 Theographic Bible Metadata[/bold]\n")
    extractor = TheographicExtractor()

    # Extract in order: people first (builds ID→slug map), then places, events, family
    people = extractor.extract_people(use_cache=cache)
    places = extractor.extract_places(use_cache=cache)
    events = extractor.extract_events(use_cache=cache)
    relations = extractor.extract_family_relations(use_cache=cache)

    config = PipelineConfig()
    with DuckDBLoader(config.load) as loader:
        if people:
            df_people = pd.DataFrame([p.model_dump() for p in people])
            count_p = loader.load_biblical_people(df_people)
            console.print(f"[green]\u2713[/green] Loaded [bold]{count_p:,}[/bold] people")

        if places:
            df_places = pd.DataFrame([p.model_dump() for p in places])
            count_pl = loader.load_biblical_places(df_places)
            console.print(f"[green]\u2713[/green] Loaded [bold]{count_pl:,}[/bold] places")

        if events:
            df_events = pd.DataFrame([e.model_dump() for e in events])
            count_e = loader.load_biblical_events(df_events)
            console.print(f"[green]\u2713[/green] Loaded [bold]{count_e:,}[/bold] events")

        if relations:
            df_rels = pd.DataFrame([r.model_dump() for r in relations])
            count_r = loader.load_family_relations(df_rels)
            console.print(f"[green]\u2713[/green] Loaded [bold]{count_r:,}[/bold] family relations")

    console.print("\n[green]\u2713 Theographic extraction complete.[/green]")


@app.command()
def geocoding(
    cache: bool = typer.Option(True, "--cache/--no-cache", help="Use cached JSONL file."),
    log_level: str = typer.Option("INFO", "--log-level", "-l", help="Logging level"),
) -> None:
    """🗺️ Enrich biblical places with OpenBible Geocoding coordinates.

    Downloads ancient.jsonl from openbibleinfo/Bible-Geocoding-Data (CC-BY)
    and merges lat/long + confidence into the biblical_places table.
    Run `theographic` first to populate the base place records.
    """
    setup_logging(log_level)

    console.print("[bold]🗺️  OpenBible Geocoding[/bold]\n")
    extractor = OpenBibleGeoExtractor()
    records = extractor.extract(use_cache=cache)

    if not records:
        console.print("[red]No geocoding records extracted.[/red]")
        raise typer.Exit(code=1)

    df = pd.DataFrame(
        [
            {
                "name": r.name,
                "latitude": r.latitude,
                "longitude": r.longitude,
                "geo_confidence": r.confidence,
                "place_type": r.place_type,
            }
            for r in records
        ]
    )

    config = PipelineConfig()
    with DuckDBLoader(config.load) as loader:
        total_with_coords = loader.enrich_places_geocoding(df)

    console.print(
        f"\n[green]\u2713[/green] [bold]{total_with_coords:,}[/bold] places now have coordinates "
        f"(from {len(records):,} OpenBible geocoding records)"
    )


@app.command()
def images(
    cache: bool = typer.Option(True, "--cache/--no-cache", help="Use cached JSONL files."),
    log_level: str = typer.Option("INFO", "--log-level", "-l", help="Logging level"),
) -> None:
    """🖼️ Load Wikimedia Commons images for biblical places.

    Downloads image.jsonl + modern.jsonl from openbibleinfo/Bible-Geocoding-Data
    (CC-BY) and links 2,400+ place photos to the biblical_places table.
    Run `theographic` first to populate the base place records.
    """
    from dataclasses import asdict

    setup_logging(log_level)

    console.print("[bold]🖼️  Place Images from OpenBible[/bold]\n")
    extractor = OpenBibleGeoExtractor()
    records = extractor.extract_images(use_cache=cache)

    if not records:
        console.print("[red]No image records extracted.[/red]")
        raise typer.Exit(code=1)

    console.print(f"  Extracted [bold]{len(records):,}[/bold] image–place pairs")

    df = pd.DataFrame([asdict(r) for r in records])

    config = PipelineConfig()
    with DuckDBLoader(config.load) as loader:
        count = loader.load_place_images(df)

    console.print(
        f"\n[green]\u2713[/green] [bold]{count:,}[/bold] images loaded "
        f"for biblical places"
    )


@app.command()
def naves(
    cache: bool = typer.Option(True, "--cache/--no-cache", help="Use cached ZIP/txt files."),
    log_level: str = typer.Option("INFO", "--log-level", "-l", help="Logging level"),
) -> None:
    """📚 Extract and load Nave's Topical Bible (~4.7K topics, ~215K verse links)."""
    setup_logging(log_level)

    console.print("[bold]📚 Nave's Topical Bible[/bold]\n")
    extractor = NavesExtractor()
    topics, topic_verses = extractor.extract(use_cache=cache)

    if not topics:
        console.print("[red]No topics extracted.[/red]")
        raise typer.Exit(code=1)

    df_topics = pd.DataFrame(
        [
            {
                "topic_id": t.topic_key,
                "name": t.name,
                "slug": t.slug,
                "verse_count": t.verse_count,
            }
            for t in topics
        ]
    )

    df_verses = pd.DataFrame(
        [
            {
                "topic_id": tv.topic_key,
                "verse_id": tv.verse_id,
                "sort_order": tv.sort_order,
            }
            for tv in topic_verses
        ]
    )

    config = PipelineConfig()
    with DuckDBLoader(config.load) as loader:
        count_t = loader.load_topics(df_topics)
        console.print(f"[green]\u2713[/green] Loaded [bold]{count_t:,}[/bold] topics")

        count_v = loader.load_topic_verses(df_verses)
        console.print(f"[green]\u2713[/green] Loaded [bold]{count_v:,}[/bold] topic-verse links")

    console.print("\n[green]\u2713 Nave's extraction complete.[/green]")


@app.command()
def sample(
    book: str = typer.Option("PSA", "--book", "-b", help="Book ID (e.g., PSA, GEN, JHN)."),
    chapter: int = typer.Option(23, "--chapter", "-c", help="Chapter number."),
    translation: str = typer.Option(
        "kjv", "--translation", "-t", help="Translation ID (e.g., kjv, asv, nvi)."
    ),
) -> None:
    """📖 Show sample verses from a book and chapter."""
    setup_logging("WARNING")

    config = PipelineConfig()
    with DuckDBLoader(config.load) as loader:
        try:
            df = loader.query(f"""
                SELECT reference, translation_id, text,
                       word_count, sentiment_label, sentiment_polarity
                FROM verses
                WHERE book_id = '{book.upper()}'
                  AND chapter = {chapter}
                  AND translation_id = '{translation.lower()}'
                ORDER BY verse
                LIMIT 20
            """)
            if df.empty:
                console.print(
                    f"[yellow]No data found for {book} {chapter} ({translation})[/yellow]"
                )
            else:
                console.print(
                    f"\n[bold]📖 {book.upper()} Chapter {chapter} ({translation.upper()})[/bold]\n"
                )
                console.print(df.to_string(index=False))
        except Exception as e:
            console.print(f"[red]Error:[/red] {e}")


if __name__ == "__main__":
    app()
