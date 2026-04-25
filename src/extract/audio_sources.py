"""
🎙️ Fase 5A — Google Cloud TTS Neural2 — Geração de pronúncias bíblicas

Gera áudio MP3 para todas as entradas do léxico de Strong's usando
Google Cloud Text-to-Speech Neural2 (vozes neurais de alta qualidade).

Hebraico : he-IL-Neural2-A  (70ms de latência, pronúncia moderna israelense)
Grego    : el-GR-Neural2-A  (grego moderno — Koiné acadêmico virá na Camada 2)

Custo estimado: ~$3 USD para todo o léxico (14.870 entradas × avg 12 chars).
Arquivos salvos em data/audio/{language}/{strongs_id}.mp3
Se GCS_BUCKET_NAME configurado, sobe automaticamente para o bucket.

Uso:
    python -m src.extract.audio_sources                    # tudo
    python -m src.extract.audio_sources --language hebrew  # só hebraico
    python -m src.extract.audio_sources --limit 50         # teste com 50
    python -m src.extract.audio_sources --force            # regenera existentes
"""

from __future__ import annotations

import io
import logging
import os
import sys
import time
from pathlib import Path

import duckdb

logger = logging.getLogger(__name__)


def _force_utf8_stdio() -> None:
    """Reconfigura stdout/stderr para UTF-8 (Windows cp1252 não suporta emojis).

    Só deve ser chamado quando este módulo roda como script (CLI entry).
    Chamar em import-time quebra a captura de stdout/stderr do pytest
    (ValueError: I/O operation on closed file no teardown).
    """
    if sys.stdout and hasattr(sys.stdout, "buffer"):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    if sys.stderr and hasattr(sys.stderr, "buffer"):
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")


# ── Configuração de vozes Chirp3-HD ──────────────────────────────────────────
# Chirp3-HD é a geração mais recente do Google TTS — supera Neural2 e WaveNet.
# Neural2 não existe para he-IL nem el-GR; Chirp3-HD é a melhor opção disponível.
# Vozes masculinas (gender=1) selecionadas — adequadas para léxico bíblico.

VOICE_CONFIG: dict[str, dict[str, str]] = {
    "hebrew": {
        "language_code": "he-IL",
        "name": "he-IL-Chirp3-HD-Orus",
        "note": "Hebraico moderno israelense (Chirp3-HD — geração mais recente)",
    },
    "greek": {
        "language_code": "el-GR",
        "name": "el-GR-Chirp3-HD-Orus",
        "note": "Grego moderno (Chirp3-HD — geração mais recente)",
    },
}

# ── Overrides fonéticos (Hebraico) ────────────────────────────────────────────
# A voz Chirp3-HD israelense é treinada na convenção judaica de NÃO pronunciar
# o Tetragrama: ao ver יְהֹוָה (ketib YHWH com niqqud do Adonai) o modelo elide
# os heh e devolve algo como "iavô". Para uso pedagógico cristão/acadêmico
# queremos a leitura literal "Ye-ho-vah". Quebramos o padrão litúrgico
# substituindo vav→bet (mantém som "v") e shewa→segol (força "ye" inicial).
#
# Adicione novos verbetes aqui se notar o mesmo problema. Após editar:
#   1. delete os MP3s afetados em data/audio/hebrew/
#   2. rode `python -m src.extract.audio_sources --language hebrew`
HEBREW_TTS_OVERRIDES: dict[str, str] = {
    "H3068": "יֶהוֹבַה",  # Yᵉhôvâh — patach (ַ) em vez de qamatz: força "va" claro
    "H3069": "יֶהוֹבִה",  # Yᵉhôvih — variante com hireq
    # H430 — ʼĕlôhîym. A grafia canônica אֱלֹהִים faz o Chirp3-HD colapsar em
    # algo como "alerrim". Tentativa 1 (vav-holam explícito "אֱלוֹהִים") também
    # saiu errado. Tentativa 2 — remover todo o niqqud: hebraico moderno
    # israelense é normalmente escrito sem vogais, e nesse modo o Chirp3-HD
    # cai na heurística nativa do speaker, que pronuncia "elohim" como
    # qualquer israelense faria no dia-a-dia (eh-lo-HEEM, tônica no "him").
    # ✅ CONFIRMADO 17/abr/2026 — David escutou e aprovou.
    # Padrão pra futuros overrides de palavras comuns: comece sem niqqud.
    "H430": "אלוהים",
}

AUDIO_DIR = Path("data/audio")
RATE_LIMIT_DELAY = 0.05  # 50ms entre requests — bem abaixo do limite da API


# ── Funções de geração ────────────────────────────────────────────────────────


def _get_tts_client() -> object:
    """Retorna cliente Google Cloud TTS. Levanta ImportError se não instalado."""
    try:
        from google.cloud import texttospeech  # type: ignore[attr-defined]

        return texttospeech.TextToSpeechClient()
    except ImportError as e:
        raise ImportError("Google Cloud TTS não instalado. Execute: pip install -e '.[gcp]'") from e


def _get_gcs_bucket() -> object | None:
    """Retorna bucket GCS se configurado, None caso contrário."""
    bucket_name = os.getenv("GCS_BUCKET_NAME") or os.getenv("GCP_BUCKET_NAME", "")
    if not bucket_name:
        return None
    try:
        from google.cloud import storage  # type: ignore[attr-defined]

        client = storage.Client()
        return client.bucket(bucket_name)
    except Exception as e:
        logger.warning(f"GCS não disponível: {e}")
        return None


def generate_single(
    strongs_id: str,
    language: str,
    original: str,
    transliteration: str,
    *,
    force: bool = False,
) -> Path | None:
    """
    Gera MP3 para uma entrada do Strong's.

    A palavra original (com niqqud / acentos gregos) é enviada para o TTS.
    Se a voz não reconhecer o script, usa a transliteração como fallback.
    Retorna o Path do arquivo gerado, ou None em caso de erro.
    """
    if language not in VOICE_CONFIG:
        logger.warning(f"Linguagem não suportada: {language} ({strongs_id})")
        return None

    out_dir = AUDIO_DIR / language
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{strongs_id}.mp3"

    if out_path.exists() and not force:
        return out_path  # já gerado — pula

    from google.cloud import texttospeech  # type: ignore[attr-defined]

    client = _get_tts_client()
    cfg = VOICE_CONFIG[language]

    # Texto a sintetizar: override fonético > original > transliteração
    if language == "hebrew" and strongs_id in HEBREW_TTS_OVERRIDES:
        text = HEBREW_TTS_OVERRIDES[strongs_id]
    elif original and original.strip():
        text = original.strip()
    else:
        text = transliteration

    synthesis_input = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(
        language_code=cfg["language_code"],
        name=cfg["name"],
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
        speaking_rate=0.80,  # Um pouco mais devagar — melhor para aprendizado
        pitch=0.0,
        sample_rate_hertz=22050,
    )

    try:
        response = client.synthesize_speech(  # type: ignore[attr-defined]
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config,
        )
        out_path.write_bytes(response.audio_content)
        return out_path
    except Exception as e:
        logger.error(f"TTS falhou para {strongs_id} ({text!r}): {e}")
        return None


def generate_all(
    db_path: str,
    *,
    language: str | None = None,
    limit: int | None = None,
    force: bool = False,
    upload_gcs: bool = True,
) -> dict[str, int]:
    """
    Gera MP3 para todas as entradas do strongs_lexicon no DuckDB.

    Args:
        db_path:    Caminho para o arquivo bible.duckdb
        language:   Filtra por "hebrew" ou "greek" (None = ambos)
        limit:      Limita número de entradas (None = tudo)
        force:      Regenera arquivos já existentes
        upload_gcs: Faz upload para GCS se configurado

    Returns:
        Dict com contadores: generated, skipped, failed, uploaded
    """
    from rich.console import Console
    from rich.progress import BarColumn, MofNCompleteColumn, Progress, SpinnerColumn, TextColumn

    console = Console(highlight=False)
    conn = duckdb.connect(db_path, read_only=True)

    # Carrega entradas do DuckDB
    lang_filter = f"WHERE language = '{language}'" if language else ""
    limit_clause = f"LIMIT {limit}" if limit else ""
    rows = conn.execute(
        f"SELECT strongs_id, language, original, transliteration "
        f"FROM strongs_lexicon {lang_filter} ORDER BY strongs_id {limit_clause}"
    ).fetchall()
    conn.close()

    bucket = _get_gcs_bucket() if upload_gcs else None
    if bucket:
        console.print("[green]☁️  GCS bucket configurado — áudios serão sincronizados[/green]")
    else:
        console.print(
            "[yellow]⚠️  GCS_BUCKET_NAME não configurado — salvando apenas localmente[/yellow]"
        )

    label = language or "hebraico + grego"
    console.print(f"[bold]🎙️  Gerando áudio para {len(rows)} entradas ({label})...[/bold]")

    stats = {"generated": 0, "skipped": 0, "failed": 0, "uploaded": 0}

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        MofNCompleteColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Sintetizando...", total=len(rows))

        for strongs_id, lang, original, transliteration in rows:
            progress.update(task, description=f"[cyan]{strongs_id}[/cyan]")

            out_path = generate_single(strongs_id, lang, original, transliteration, force=force)

            if out_path is None:
                stats["failed"] += 1
            elif out_path.stat().st_size < 100 and not force:
                # Arquivo existia, foi pulado
                stats["skipped"] += 1
            else:
                stats["generated"] += 1
                # Upload para GCS
                if bucket and out_path.exists():
                    try:
                        blob_name = f"audio/{lang}/{strongs_id}.mp3"
                        blob = bucket.blob(blob_name)  # type: ignore[attr-defined]
                        blob.upload_from_filename(str(out_path), content_type="audio/mpeg")
                        blob.make_public()
                        stats["uploaded"] += 1
                    except Exception as e:
                        logger.warning(f"GCS upload falhou para {strongs_id}: {e}")

            progress.advance(task)
            time.sleep(RATE_LIMIT_DELAY)

    console.print(
        f"\n[bold green]✅ Concluído:[/bold green] "
        f"{stats['generated']} gerados · "
        f"{stats['skipped']} pulados · "
        f"{stats['failed']} falhas · "
        f"{stats['uploaded']} enviados ao GCS"
    )

    # Estimativa de custo
    total_chars = sum(
        len((orig or trans).strip()) for _, _, orig, trans in rows if stats["generated"] > 0
    )
    cost_usd = (total_chars / 1_000_000) * 16  # $16 por 1M chars (Neural2)
    console.print(
        f"[dim]💰 Custo estimado: ~${cost_usd:.2f} USD ({total_chars:,} caracteres)[/dim]"
    )

    return stats


# ── URL pública de um áudio ───────────────────────────────────────────────────


def audio_url(strongs_id: str, language: str, base_url: str = "") -> str | None:
    """
    Retorna a URL pública do áudio para um Strong's ID.

    Prioridade:
    1. GCS público (se GCS_BUCKET_NAME e GCS_BASE_URL configurados)
    2. FastAPI local (/audio/{language}/{strongs_id}.mp3)
    3. None se o arquivo local também não existir
    """
    gcs_base = os.getenv("GCS_AUDIO_BASE_URL", "")
    if gcs_base:
        return f"{gcs_base.rstrip('/')}/audio/{language}/{strongs_id}.mp3"

    local_path = AUDIO_DIR / language / f"{strongs_id}.mp3"
    if local_path.exists():
        api_base = base_url or os.getenv("API_BASE_URL", "http://localhost:8000")
        return f"{api_base}/audio/{language}/{strongs_id}.mp3"

    return None


# ── Entry point CLI ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    _force_utf8_stdio()
    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser(description="Gerador de pronúncias bíblicas Neural2")
    parser.add_argument("--language", choices=["hebrew", "greek"], default=None)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--no-gcs", action="store_true")
    parser.add_argument("--db", default="data/analytics/bible.duckdb")
    args = parser.parse_args()

    generate_all(
        db_path=args.db,
        language=args.language,
        limit=args.limit,
        force=args.force,
        upload_gcs=not args.no_gcs,
    )
