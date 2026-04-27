"""
Download and extract USFX translation files from eBible.org.

Usage:
    python scripts/download_usfx_translations.py
"""

from __future__ import annotations

import io
import zipfile
from pathlib import Path

import httpx
from rich.console import Console

console = Console()

DOWNLOADS = {
    "arb-vd":     "https://ebible.org/Scriptures/arb-vd_usfx.zip",       # Arabic Van Dyke (public domain)
    "cmn-cu89t":  "https://ebible.org/Scriptures/cmn-cu89t_usfx.zip",    # Chinese Union Version Traditional
    "cmn-cu89s":  "https://ebible.org/Scriptures/cmn-cu89s_usfx.zip",    # Chinese Union Version Simplified
}

OUT_DIR = Path("data/raw/usfx")


def download(translation_id: str, url: str) -> None:
    dest = OUT_DIR / f"{translation_id}.xml"
    if dest.exists():
        console.print(f"[yellow]⏭  {translation_id} already exists, skipping[/yellow]")
        return

    console.print(f"[cyan]⬇  Downloading {translation_id}...[/cyan]  {url}")
    r = httpx.get(url, follow_redirects=True, timeout=60)
    r.raise_for_status()

    with zipfile.ZipFile(io.BytesIO(r.content)) as z:
        # Find the .xml file (not the metadata file)
        xml_files = [n for n in z.namelist() if n.endswith(".xml") and "metadata" not in n.lower()]
        if not xml_files:
            raise ValueError(f"No XML found in ZIP for {translation_id}: {z.namelist()}")
        xml_name = xml_files[0]
        content = z.read(xml_name)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(content)
    console.print(f"[green]✓  {translation_id} → {dest}  ({len(content) / 1024:.0f} KB)[/green]")


def main() -> None:
    console.print("[bold]Downloading eBible.org USFX translations[/bold]\n")
    for tid, url in DOWNLOADS.items():
        try:
            download(tid, url)
        except Exception as e:
            console.print(f"[red]✗  {tid}: {e}[/red]")
    console.print("\nDone. Run the pipeline with:")
    console.print("  python -m src.cli run --translations arb-vd,cmn-cu89t,cmn-cu89s")


if __name__ == "__main__":
    main()
