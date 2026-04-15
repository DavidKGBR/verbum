"""
🎙️ Fase 5C — Áudio Aramaico (Proxy Árabe)

Gera MP3 para as palavras da Peshitta usando Google Cloud TTS com voz Árabe
(ar-XA-Chirp3-HD-Orus) como proxy fonético Semítico.

Fundamentação linguística:
  Árabe e Aramaico Siríaco são línguas Semíticas irmãs. Compartilham:
  - Consoantes faríngeas/guturais (ح خ ع غ)
  - Padrões de raiz trilateral
  - Entonação prosódica Semítica
  O proxy não é autentico, mas é fonéticamente mais próximo que qualquer
  outro TTS disponível. Qualidade prevista: 65-70% de acurácia fonética.

Entrada usada: transliteração latina (ex: "Abwoon", "d'bwashmaya")
  — a voz Árabe tenta ler texto latino com sotaque árabe, produzindo
  um resultado Semítico razoável.

Arquivos salvos em: data/audio/aramaic/{passage_id}/{verse_number}_{position:02d}.mp3
URL servida em:     /audio/aramaic/{passage_id}/{verse_number}_{position:02d}.mp3
DB atualizado:      aramaic_verses.audio_url

NOTA: Áudio proxy temporário — ver VERBUM_PLAN.md §"Pesquisa de Áudio Aramaico"
      para roadmap de substituição por gravações autênticas.

Uso:
    python -m src.extract.aramaic_audio_gen              # tudo
    python -m src.extract.aramaic_audio_gen --passage lords_prayer
    python -m src.extract.aramaic_audio_gen --limit 10   # teste
    python -m src.extract.aramaic_audio_gen --force      # regenera
"""

from __future__ import annotations

import io
import logging
import sys
import time
from pathlib import Path

import duckdb

# UTF-8 no stdout — necessário no Windows (cp1252 não suporta caracteres especiais)
if sys.stdout and hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
if sys.stderr and hasattr(sys.stderr, "buffer"):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

logger = logging.getLogger(__name__)

# ── Configuração de voz ───────────────────────────────────────────────────────
# Árabe Chirp3-HD como proxy fonético para Aramaico Siríaco.
# ar-XA = Árabe multi-regional (neutro, sem dialeto específico).
VOICE_LANGUAGE_CODE = "ar-XA"
VOICE_NAME          = "ar-XA-Chirp3-HD-Orus"   # masculino, neutro
SPEAKING_RATE       = 0.75    # mais devagar — favorece aprendizado
SAMPLE_RATE         = 22050

AUDIO_DIR  = Path("data/audio")
DB_PATH    = "data/analytics/bible.duckdb"
RATE_DELAY = 0.05  # 50ms entre requests


def _audio_path(passage_id: str, verse_number: int, word_position: int) -> Path:
    """Caminho local do arquivo MP3 para uma palavra."""
    return AUDIO_DIR / "aramaic" / passage_id / f"{verse_number}_{word_position:02d}.mp3"


def _audio_url(passage_id: str, verse_number: int, word_position: int) -> str:
    """URL relativa servida pelo FastAPI /audio."""
    return f"/audio/aramaic/{passage_id}/{verse_number}_{word_position:02d}.mp3"


def generate_word(
    transliteration: str,
    out_path: Path,
    *,
    force: bool = False,
) -> bool:
    """
    Gera MP3 para uma palavra usando TTS Árabe.
    Retorna True se gerou, False se pulou ou falhou.
    """
    if out_path.exists() and not force:
        return False  # já existe

    from google.cloud import texttospeech  # type: ignore[attr-defined]

    out_path.parent.mkdir(parents=True, exist_ok=True)

    text = transliteration.strip() or "—"

    client = texttospeech.TextToSpeechClient()
    synthesis_input = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(
        language_code=VOICE_LANGUAGE_CODE,
        name=VOICE_NAME,
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
        speaking_rate=SPEAKING_RATE,
        pitch=0.0,
        sample_rate_hertz=SAMPLE_RATE,
    )

    try:
        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config,
        )
        out_path.write_bytes(response.audio_content)
        return True
    except Exception as e:
        logger.error(f"TTS falhou para '{text}': {e}")
        return False


def generate_all(
    *,
    passage_id: str | None = None,
    limit: int | None = None,
    force: bool = False,
    db_path: str = DB_PATH,
) -> dict[str, int]:
    """
    Gera áudio para todas as palavras aramaicas no DuckDB.

    Atualiza aramaic_verses.audio_url após cada geração bem-sucedida.
    """
    try:
        from rich.console import Console
        from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, MofNCompleteColumn
        rich_available = True
    except ImportError:
        rich_available = False

    conn = duckdb.connect(db_path)

    # Carrega palavras ainda sem áudio (ou todas se --force)
    passage_filter = f"AND passage_id = '{passage_id}'" if passage_id else ""
    audio_filter   = "" if force else "AND (audio_url IS NULL OR audio_url = '')"
    limit_clause   = f"LIMIT {limit}" if limit else ""

    rows = conn.execute(f"""
        SELECT passage_id, verse_ref, verse_number, word_position,
               script, transliteration
        FROM   aramaic_verses
        WHERE  1=1
               {passage_filter}
               {audio_filter}
        ORDER  BY passage_id, verse_number, word_position
        {limit_clause}
    """).fetchall()

    if not rows:
        print("Nenhuma palavra aramaica pendente de audio.")
        conn.close()
        return {"generated": 0, "skipped": 0, "failed": 0}

    print(f"Gerando audio para {len(rows)} palavras aramaicas ({VOICE_NAME})...")
    print(f"Proxy: Arabe Chirp3-HD como aproximacao fonetica Semitica.")

    stats = {"generated": 0, "skipped": 0, "failed": 0}

    def _process(rows_list: list) -> None:
        for pid, vref, vnum, wpos, script, translit in rows_list:
            out_path = _audio_path(pid, vnum, wpos)
            label = translit or script or f"v{vnum}w{wpos}"

            generated = generate_word(translit or script, out_path, force=force)

            if generated:
                stats["generated"] += 1
                url = _audio_url(pid, vnum, wpos)
                conn.execute(
                    """
                    UPDATE aramaic_verses
                    SET    audio_url = ?
                    WHERE  passage_id     = ?
                      AND  verse_number   = ?
                      AND  word_position  = ?
                    """,
                    [url, pid, vnum, wpos],
                )
            else:
                if out_path.exists():
                    stats["skipped"] += 1
                else:
                    stats["failed"] += 1

            time.sleep(RATE_DELAY)

    if rich_available:
        from rich.console import Console
        from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, MofNCompleteColumn
        console = Console(highlight=False)
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            MofNCompleteColumn(),
            console=console,
        ) as progress:
            task = progress.add_task("Sintetizando Aramaico...", total=len(rows))
            for row in rows:
                pid, vref, vnum, wpos, script, translit = row
                progress.update(task, description=f"[cyan]{translit or script}[/cyan]")
                out_path = _audio_path(pid, vnum, wpos)
                generated = generate_word(translit or script, out_path, force=force)
                if generated:
                    stats["generated"] += 1
                    url = _audio_url(pid, vnum, wpos)
                    conn.execute(
                        "UPDATE aramaic_verses SET audio_url = ? "
                        "WHERE passage_id=? AND verse_number=? AND word_position=?",
                        [url, pid, vnum, wpos],
                    )
                else:
                    (stats["skipped"] if out_path.exists() else stats["failed"]).__class__  # noop
                    if out_path.exists():
                        stats["skipped"] += 1
                    else:
                        stats["failed"] += 1
                progress.advance(task)
                time.sleep(RATE_DELAY)
    else:
        _process(rows)

    conn.close()

    total_chars = sum(len((t or s or "").strip()) for _, _, _, _, s, t in rows)
    cost_usd = (total_chars / 1_000_000) * 16
    print(f"Concluido: {stats['generated']} gerados | "
          f"{stats['skipped']} pulados | {stats['failed']} falhas")
    print(f"Custo estimado: ~${cost_usd:.3f} USD ({total_chars} caracteres)")
    print("LEMBRETE: audio proxy Arabe — ver VERBUM_PLAN.md para roadmap de substituicao.")
    return stats


# ── Entry point CLI ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser(
        description="Gerador de audio aramaico (proxy Arabe Chirp3-HD)"
    )
    parser.add_argument("--passage", default=None, help="Filtra por passage_id")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--force", action="store_true", help="Regenera existentes")
    parser.add_argument("--db", default=DB_PATH)
    args = parser.parse_args()

    generate_all(
        passage_id=args.passage,
        limit=args.limit,
        force=args.force,
        db_path=args.db,
    )
