"""
☁️ Load Module — Google Cloud Platform
Uploads data to GCS and loads into BigQuery.
Requires: pip install bible-data-pipeline[gcp]
"""

from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

from src.config import LoadConfig

logger = logging.getLogger(__name__)


class GCSLoader:
    """Loads data to Google Cloud Storage and BigQuery."""

    def __init__(self, config: LoadConfig | None = None) -> None:
        self.config = config or LoadConfig()

        if not self.config.use_gcp:
            logger.warning("GCP is disabled. Set USE_GCP=true to enable.")
            return

        try:
            from google.cloud import bigquery, storage

            self.storage_client = storage.Client(project=self.config.gcp_project_id)
            self.bq_client = bigquery.Client(project=self.config.gcp_project_id)
            self.bucket = self.storage_client.bucket(self.config.gcp_bucket_name)
            self._available = True
        except ImportError:
            logger.error("GCP libraries not installed. Run: pip install bible-data-pipeline[gcp]")
            self._available = False
        except Exception as e:
            logger.error(f"GCP initialization failed: {e}")
            self._available = False

    @property
    def is_available(self) -> bool:
        return self._available and self.config.use_gcp

    def upload_to_gcs(
        self,
        df: pd.DataFrame,
        destination_blob: str,
        file_format: str = "parquet",
    ) -> str:
        """
        Upload DataFrame to GCS as Parquet or CSV.

        Args:
            df: DataFrame to upload.
            destination_blob: GCS blob path (e.g., 'raw/verses.parquet').
            file_format: 'parquet' or 'csv'.

        Returns:
            GCS URI (gs://bucket/path).
        """
        if not self.is_available:
            raise RuntimeError("GCP is not configured")

        tmp_path = Path(f"/tmp/{destination_blob.replace('/', '_')}")

        if file_format == "parquet":
            df.to_parquet(tmp_path, index=False, engine="pyarrow")
        else:
            df.to_csv(tmp_path, index=False)

        blob = self.bucket.blob(destination_blob)
        blob.upload_from_filename(str(tmp_path))
        tmp_path.unlink(missing_ok=True)

        gcs_uri = f"gs://{self.config.gcp_bucket_name}/{destination_blob}"
        logger.info(f"☁️  Uploaded to {gcs_uri}")
        return gcs_uri

    def load_to_bigquery(
        self,
        df: pd.DataFrame,
        table_name: str,
        write_disposition: str = "WRITE_TRUNCATE",
    ) -> int:
        """
        Load DataFrame into BigQuery.

        Args:
            df: DataFrame to load.
            table_name: Target table name (within the configured dataset).
            write_disposition: 'WRITE_TRUNCATE', 'WRITE_APPEND', or 'WRITE_EMPTY'.

        Returns:
            Number of rows loaded.
        """
        if not self.is_available:
            raise RuntimeError("GCP is not configured")

        from google.cloud import bigquery

        table_ref = f"{self.config.gcp_project_id}.{self.config.bigquery_dataset}.{table_name}"

        job_config = bigquery.LoadJobConfig(
            write_disposition=write_disposition,
            autodetect=True,
        )

        job = self.bq_client.load_table_from_dataframe(df, table_ref, job_config=job_config)
        job.result()  # Wait for completion

        table = self.bq_client.get_table(table_ref)
        logger.info(f"☁️  Loaded {table.num_rows} rows into {table_ref}")
        return table.num_rows

    def upload_raw_json(self, data_dir: Path) -> list[str]:
        """Upload all raw JSON files to GCS."""
        if not self.is_available:
            raise RuntimeError("GCP is not configured")

        uploaded: list[str] = []
        for json_file in data_dir.glob("*.json"):
            blob_path = f"raw/{json_file.name}"
            blob = self.bucket.blob(blob_path)
            blob.upload_from_filename(str(json_file))
            uploaded.append(f"gs://{self.config.gcp_bucket_name}/{blob_path}")

        logger.info(f"☁️  Uploaded {len(uploaded)} raw files to GCS")
        return uploaded
