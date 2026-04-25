"""
🧪 Tests — Gemini AI Integration (Sprint 4)
"""

import json
from unittest.mock import MagicMock, patch

import pytest

from src.ai.gemini_client import GeminiClient
from src.ai.passage_explainer import PassageExplainer

# ─── GeminiClient Tests ──────────────────────────────────────────────────────


class TestGeminiClient:
    def test_requires_api_key(self):
        with patch.dict("os.environ", {"GEMINI_API_KEY": ""}, clear=False):
            with pytest.raises(ValueError, match="API key required"):
                GeminiClient(api_key="")

    @patch("src.ai.gemini_client.genai")
    def test_cache_round_trip(self, mock_genai, tmp_path):
        client = GeminiClient(api_key="test-key", cache_dir=tmp_path)

        # Mock API response
        mock_response = MagicMock()
        mock_response.text = '{"explanation": "test"}'
        client.model.generate_content = MagicMock(return_value=mock_response)

        # First call — hits API
        result = client.generate("test prompt", cache_key="test_key.json")
        assert result == '{"explanation": "test"}'
        client.model.generate_content.assert_called_once()

        # Second call — hits cache
        client.model.generate_content.reset_mock()
        result2 = client.generate("test prompt", cache_key="test_key.json")
        assert result2 == '{"explanation": "test"}'
        client.model.generate_content.assert_not_called()

    @patch("src.ai.gemini_client.genai")
    def test_generate_json_strips_markdown(self, mock_genai, tmp_path):
        client = GeminiClient(api_key="test-key", cache_dir=tmp_path)

        mock_response = MagicMock()
        mock_response.text = '```json\n{"key": "value"}\n```'
        client.model.generate_content = MagicMock(return_value=mock_response)

        result = client.generate_json("test")
        assert result == {"key": "value"}

    @patch("src.ai.gemini_client.genai")
    def test_generate_json_handles_parse_error(self, mock_genai, tmp_path):
        client = GeminiClient(api_key="test-key", cache_dir=tmp_path)

        mock_response = MagicMock()
        mock_response.text = "not valid json"
        client.model.generate_content = MagicMock(return_value=mock_response)

        result = client.generate_json("test")
        assert "raw_response" in result
        assert "parse_error" in result


# ─── PassageExplainer Tests ───────────────────────────────────────────────────


class TestPassageExplainer:
    @patch("src.ai.gemini_client.genai")
    def test_explain_returns_enriched_result(self, mock_genai, tmp_path):
        client = GeminiClient(api_key="test-key", cache_dir=tmp_path)

        mock_response = MagicMock()
        mock_response.text = json.dumps(
            {
                "explanation": "God created everything.",
                "context": "Written by Moses.",
                "key_words": ["bereshit", "bara", "elohim"],
                "application": "God is the creator.",
            }
        )
        client.model.generate_content = MagicMock(return_value=mock_response)

        explainer = PassageExplainer(client)
        result = explainer.explain(
            verse_id="GEN.1.1",
            text="In the beginning God created the heaven and the earth.",
            reference="Genesis 1:1",
            book_name="Genesis",
            testament="Old Testament",
            category="Law",
        )

        assert result["verse_id"] == "GEN.1.1"
        assert result["translation"] == "kjv"
        assert "explanation" in result

    @patch("src.ai.gemini_client.genai")
    def test_compare_translations(self, mock_genai, tmp_path):
        client = GeminiClient(api_key="test-key", cache_dir=tmp_path)

        mock_response = MagicMock()
        mock_response.text = json.dumps(
            {
                "differences": "KJV uses archaic English.",
                "nuances": "NVI captures modern tone.",
                "original": "KJV is closest to Hebrew.",
                "recommendation": "NVI for readability.",
            }
        )
        client.model.generate_content = MagicMock(return_value=mock_response)

        explainer = PassageExplainer(client)
        result = explainer.compare_translations(
            verse_id="GEN.1.1",
            translations={
                "kjv": "In the beginning God created the heaven and the earth.",
                "nvi": "No principio Deus criou os ceus e a terra.",
            },
            reference="Genesis 1:1",
        )

        assert result["verse_id"] == "GEN.1.1"
        assert "kjv" in result["translations_compared"]
        assert "nvi" in result["translations_compared"]
        assert "differences" in result
