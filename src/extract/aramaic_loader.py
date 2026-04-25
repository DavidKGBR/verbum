"""
📜 Aramaic Loader — Popula aramaic_verses com o Pai Nosso (Peshitta)

Lê data/static/aramaic_lords_prayer.json e carrega no DuckDB.
Idempotente — pode ser re-executado sem duplicar dados.

Uso:
    python -m src.extract.aramaic_loader
    python -m src.extract.aramaic_loader --db data/analytics/bible.duckdb
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)

STATIC_DIR = Path("data/static")
DEFAULT_DB = "data/analytics/bible.duckdb"


def load_passage(json_path: Path, db_path: str = DEFAULT_DB) -> int:
    """Lê um JSON de passagem aramaica e carrega no DuckDB."""
    from src.load.duckdb_loader import DuckDBLoader

    data = json.loads(json_path.read_text(encoding="utf-8"))
    passage_id: str = data["passage_id"]
    source: str = data.get("source", "peshitta")

    rows: list[dict[str, object]] = []
    for verse in data["verses"]:
        for word in verse["words"]:
            rows.append(
                {
                    "passage_id": passage_id,
                    "verse_ref": verse["verse_ref"],
                    "verse_number": verse["verse_number"],
                    "word_position": word["word_position"],
                    "script": word["script"],
                    "transliteration": word.get("transliteration"),
                    # `gloss` is the EN source of truth; `_pt`/`_es` are
                    # parallel localizations. Older JSON files that only had
                    # `gloss` (in PT) should be migrated during R2.a; this
                    # loader treats missing _pt/_es as null without failing.
                    "gloss": word.get("gloss"),
                    "gloss_pt": word.get("gloss_pt"),
                    "gloss_es": word.get("gloss_es"),
                    "audio_url": word.get("audio_url"),
                    "source": source,
                }
            )

    df = pd.DataFrame(rows)
    with DuckDBLoader() as loader:
        loader.config.duckdb_path = db_path
        loader._conn = None  # reset so it connects to the right DB
        count = loader.load_aramaic_verses(df, passage_id)
    return count


def load_all(db_path: str = DEFAULT_DB) -> None:
    """Carrega todos os JSONs de passagens aramaicas em data/static/."""
    static_dir = STATIC_DIR
    json_files = list(static_dir.glob("aramaic_*.json"))
    if not json_files:
        logger.warning("Nenhum arquivo aramaic_*.json encontrado em data/static/")
        return

    total = 0
    for f in json_files:
        logger.info(f"Carregando {f.name}...")
        count = load_passage(f, db_path)
        total += count

    print(f"OK: {total} palavras aramaicas carregadas de {len(json_files)} passagens.")


if __name__ == "__main__":
    import argparse

    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser(description="Carrega passagens aramaicas no DuckDB")
    parser.add_argument("--db", default=DEFAULT_DB)
    args = parser.parse_args()

    load_all(db_path=args.db)
