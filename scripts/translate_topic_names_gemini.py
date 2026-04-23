"""
translate_topic_names_gemini.py — Batch-translate Nave's topic names to PT/ES via Gemini.

Reads untranslated topics from topics_multilang, sends batches of ~200 to Gemini,
parses the TSV response, and upserts into topics_multilang.

Usage:
    PYTHONIOENCODING=utf-8 python scripts/translate_topic_names_gemini.py [--batch-size 200] [--dry-run]
"""

import argparse
import json
import os
import re
import time
from pathlib import Path

import duckdb
from google import genai

DB_PATH = "data/analytics/bible.duckdb"
BATCH_SIZE = 200
MODEL = "gemini-2.5-flash"

SYSTEM_PROMPT = """\
You are a biblical studies translator specializing in Nave's Topical Bible.
You will receive a list of topic names (mostly biblical proper names) in UPPERCASE English.

For each name, provide:
1. The Portuguese (PT-BR) equivalent as used in standard Portuguese Bibles (Almeida Revista e Atualizada, NVI)
2. The Spanish (ES-LATAM) equivalent as used in standard Spanish Bibles (Reina-Valera, NVI)

Rules:
- Keep names UPPERCASE to match Nave's convention
- For proper names that are identical across languages (e.g., ABIGAIL), repeat them
- For well-known biblical names, use the consecrated form (MOSES→MOISÉS, DAVID→DAVI in PT / DAVID in ES)
- For obscure names with no established translation, keep the English form
- For place names, use the standard Portuguese/Spanish form (BABYLON→BABILÔNIA/BABILONIA)
- For compound entries like "ABEL-BETH-MAACHAH", translate if a standard form exists, otherwise keep English
- Output ONLY a TSV with columns: name_en\tname_pt\tname_es (no header, no extra text)
"""


def get_untranslated(conn) -> list[tuple[str, str]]:
    return conn.execute("""
        SELECT t.topic_id, t.name
        FROM topics t
        LEFT JOIN topics_multilang m ON t.topic_id = m.topic_id AND m.lang = 'pt'
        WHERE m.topic_id IS NULL
        ORDER BY t.name
    """).fetchall()


def translate_batch(client, names: list[str]) -> dict[str, tuple[str, str]]:
    prompt = "Translate these Nave's topic names to PT-BR and ES-LATAM.\n"
    prompt += "Output TSV: name_en\\tname_pt\\tname_es\n\n"
    prompt += "\n".join(names)

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config={"system_instruction": SYSTEM_PROMPT},
    )
    text = response.text.strip()

    results = {}
    for line in text.split("\n"):
        line = line.strip()
        if not line or line.startswith("name_en"):
            continue
        parts = line.split("\t")
        if len(parts) >= 3:
            en, pt, es = parts[0].strip(), parts[1].strip(), parts[2].strip()
            if en and pt and es:
                results[en] = (pt, es)
    return results


def upsert_translations(conn, topic_map: dict[str, str], translations: dict[str, tuple[str, str]]):
    """topic_map: name_en -> topic_id, translations: name_en -> (pt, es)"""
    rows_pt = []
    rows_es = []
    for name_en, (pt, es) in translations.items():
        tid = topic_map.get(name_en)
        if not tid:
            continue
        rows_pt.append((tid, "pt", pt, 0.85))
        rows_es.append((tid, "es", es, 0.85))

    all_rows = rows_pt + rows_es
    if all_rows:
        conn.executemany(
            """INSERT INTO topics_multilang (topic_id, lang, name, confidence)
               VALUES (?, ?, ?, ?)
               ON CONFLICT (topic_id, lang) DO UPDATE SET
                 name = EXCLUDED.name,
                 confidence = EXCLUDED.confidence,
                 labeled_at = CURRENT_TIMESTAMP""",
            all_rows,
        )
    return len(rows_pt)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--max-batches", type=int, default=0, help="0 = all")
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY") or Path(".env").read_text().split("GEMINI_API_KEY=")[1].split("\n")[0].strip()
    client = genai.Client(api_key=api_key)

    conn = duckdb.connect(DB_PATH)
    untranslated = get_untranslated(conn)
    print(f"Untranslated topics: {len(untranslated)}")

    if not untranslated:
        print("Nothing to translate!")
        return

    topic_map = {name: str(tid) for tid, name in untranslated}
    names = [name for _, name in untranslated]

    total_translated = 0
    batch_count = 0
    for i in range(0, len(names), args.batch_size):
        batch = names[i : i + args.batch_size]
        batch_count += 1
        print(f"\nBatch {batch_count}: {len(batch)} names ({i+1}-{i+len(batch)} of {len(names)})")

        if args.dry_run:
            print(f"  [dry-run] Would send: {batch[:3]}...")
            continue

        try:
            translations = translate_batch(client, batch)
            print(f"  Parsed {len(translations)} translations from response")

            n = upsert_translations(conn, topic_map, translations)
            total_translated += n
            print(f"  Upserted {n} PT + {n} ES rows (total so far: {total_translated})")

            unmatched = set(batch) - set(translations.keys())
            if unmatched:
                print(f"  Unmatched: {len(unmatched)} — {list(unmatched)[:5]}...")

        except Exception as e:
            print(f"  ERROR: {e}")
            time.sleep(5)
            continue

        if args.max_batches and batch_count >= args.max_batches:
            print(f"\nStopped after {args.max_batches} batches.")
            break

        time.sleep(2)

    # Final count
    total = conn.execute("SELECT COUNT(*) FROM topics_multilang WHERE lang = 'pt'").fetchone()[0]
    print(f"\nDone. Total PT translations in topics_multilang: {total}/4673")
    conn.close()


if __name__ == "__main__":
    main()
