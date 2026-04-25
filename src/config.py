"""
⚙️ Pipeline Configuration
Central configuration using environment variables with sensible defaults.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Project root
ROOT_DIR = Path(__file__).parent.parent
DATA_DIR = ROOT_DIR / "data"


@dataclass
class ExtractConfig:
    """Configuration for the Extract phase."""

    api_base_url: str = "https://bible-api.com"
    translation: str = "kjv"
    translations: list[str] = field(default_factory=lambda: ["kjv"])
    request_timeout: int = 30
    max_retries: int = 3
    retry_delay: float = 1.0
    batch_size: int = 5  # chapters per batch
    rate_limit_delay: float = 0.25  # seconds between requests
    abiblia_digital_token: str = field(
        default_factory=lambda: os.getenv("ABIBLIA_DIGITAL_TOKEN", "")
    )
    abiblia_digital_base_url: str = "https://www.abibliadigital.com.br/api"


@dataclass
class TransformConfig:
    """Configuration for the Transform phase."""

    min_word_count: int = 0
    sentiment_language: str = "en"


@dataclass
class LoadConfig:
    """Configuration for the Load phase."""

    # DuckDB (local)
    duckdb_path: str = str(DATA_DIR / "analytics" / "bible.duckdb")

    # GCP (optional)
    gcp_project_id: str = os.getenv("GCP_PROJECT_ID", "")
    gcp_bucket_name: str = os.getenv("GCP_BUCKET_NAME", "")
    bigquery_dataset: str = os.getenv("BQ_DATASET", "bible_analytics")
    use_gcp: bool = os.getenv("USE_GCP", "false").lower() == "true"


@dataclass
class PipelineConfig:
    """Master pipeline configuration."""

    extract: ExtractConfig = field(default_factory=ExtractConfig)
    transform: TransformConfig = field(default_factory=TransformConfig)
    load: LoadConfig = field(default_factory=LoadConfig)

    # Paths
    raw_data_dir: Path = DATA_DIR / "raw"
    processed_data_dir: Path = DATA_DIR / "processed"
    analytics_data_dir: Path = DATA_DIR / "analytics"

    # Pipeline
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    parallel_workers: int = int(os.getenv("PARALLEL_WORKERS", "4"))

    def __post_init__(self) -> None:
        """Ensure all data directories exist."""
        for d in [self.raw_data_dir, self.processed_data_dir, self.analytics_data_dir]:
            d.mkdir(parents=True, exist_ok=True)
