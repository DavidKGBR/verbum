"""
🤖 Gemini AI Client
Client for Google Gemini with rate limiting, disk cache, and retry logic.
"""

from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path

import google.generativeai as genai

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "gemini-2.0-flash"
DEFAULT_RPM = 15  # Free tier rate limit


class GeminiClient:
    """Google Gemini client with caching and rate limiting."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str = DEFAULT_MODEL,
        cache_dir: Path | None = None,
        rpm: int = DEFAULT_RPM,
    ) -> None:
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        if not self.api_key:
            raise ValueError("Gemini API key required. Set GEMINI_API_KEY env var or pass api_key.")

        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(model)
        self.cache_dir = cache_dir
        self._min_interval = 60.0 / rpm
        self._last_request: float = 0

        if self.cache_dir:
            self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _rate_limit(self) -> None:
        """Enforce rate limiting between requests."""
        elapsed = time.time() - self._last_request
        if elapsed < self._min_interval:
            time.sleep(self._min_interval - elapsed)

    def _cache_key(self, prefix: str, *parts: str) -> str:
        """Build a cache filename from parts."""
        safe = "_".join(p.replace(".", "-").replace(" ", "_") for p in parts)
        return f"{prefix}_{safe}.json"

    def _load_cache(self, key: str) -> dict | None:
        """Load a cached response."""
        if not self.cache_dir:
            return None
        cache_file = self.cache_dir / key
        if not cache_file.exists():
            return None
        try:
            return json.loads(cache_file.read_text(encoding="utf-8"))
        except Exception:
            return None

    def _save_cache(self, key: str, data: dict) -> None:
        """Save a response to cache."""
        if not self.cache_dir:
            return
        cache_file = self.cache_dir / key
        cache_file.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def generate(self, prompt: str, cache_key: str | None = None) -> str:
        """Send a prompt to Gemini and return the text response.

        Args:
            prompt: The prompt text.
            cache_key: Optional cache key. If provided, checks cache first.

        Returns:
            The generated text response.
        """
        # Check cache
        if cache_key:
            cached = self._load_cache(cache_key)
            if cached:
                logger.debug(f"Cache hit: {cache_key}")
                return cached["response"]

        # Rate limit and call API
        self._rate_limit()
        try:
            response = self.model.generate_content(prompt)
            self._last_request = time.time()
            text = response.text

            # Cache the response
            if cache_key:
                self._save_cache(cache_key, {"prompt": prompt, "response": text})

            return text

        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise

    def generate_json(self, prompt: str, cache_key: str | None = None) -> dict:
        """Send a prompt and parse the response as JSON.

        The prompt should instruct Gemini to return JSON format.
        """
        text = self.generate(prompt, cache_key=cache_key)

        # Strip markdown code blocks if present
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse Gemini response as JSON: {e}")
            return {"raw_response": text, "parse_error": str(e)}
