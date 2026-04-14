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
from src.extract.morphhb_extractor import MorphHbExtractor
from src.extract.strongs_extractor import StrongsExtractor
from src.load.duckdb_loader import DuckDBLoader
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
