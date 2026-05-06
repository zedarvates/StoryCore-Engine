import pytest
import json
import sys
from pathlib import Path
from unittest.mock import patch

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from music_lyrics_service import (
    MusicLyricsService,
    LyricsGenerationRequest,
    MusicStyleRequest,
)
from llm_api import LLMResponse


class TestMusicLyricsService:
    @pytest.fixture
    def service(self):
        return MusicLyricsService()

    @pytest.mark.asyncio
    async def test_generate_lyrics_success(self, service):
        mock_data = {
            "lyrics": "Verse 1: Hello world\nChorus: This is a test",
            "structure": {"bpm_guess": 120, "energy_level": "high", "key": "C Major"},
        }
        mock_response = LLMResponse(
            text=json.dumps(mock_data),
            model="gpt-4",
            provider="openai",
            usage={"total_tokens": 100},
            latency_ms=500,
        )

        with patch("music_lyrics_service.generate_text", return_value=mock_response):
            request = LyricsGenerationRequest(
                theme="Testing", style="pop", mood=["happy"], length="short"
            )
            response = await service.generate_lyrics(request)

            assert response.lyrics == mock_data["lyrics"]
            assert response.structure["bpm_guess"] == 120
            assert response.raw_llm_response == json.dumps(mock_data)

    @pytest.mark.asyncio
    async def test_generate_music_style_success(self, service):
        mock_data = {
            "suno_prompt": "pop, happy, 120bpm",
            "udio_prompt": "A happy pop song at 120bpm",
            "technical_specs": {"bpm": 120, "key": "C Major", "energy": "high"},
        }
        mock_response = LLMResponse(
            text=json.dumps(mock_data),
            model="gpt-4",
            provider="openai",
            usage={"total_tokens": 100},
            latency_ms=500,
        )

        with patch("music_lyrics_service.generate_text", return_value=mock_response):
            request = MusicStyleRequest(
                prompt="A happy song", style="pop", mood=["happy"]
            )
            response = await service.generate_music_style(request)

            assert response.suno_prompt == mock_data["suno_prompt"]
            assert response.udio_prompt == mock_data["udio_prompt"]
            assert response.technical_specs["bpm"] == 120

    @pytest.mark.asyncio
    async def test_generate_lyrics_json_fallback(self, service):
        # Test when LLM returns non-JSON text
        mock_response = LLMResponse(
            text="This is not JSON lyrics",
            model="gpt-4",
            provider="openai",
            usage={"total_tokens": 100},
            latency_ms=500,
        )

        with patch("music_lyrics_service.generate_text", return_value=mock_response):
            request = LyricsGenerationRequest(
                theme="Testing", style="pop", mood=["happy"], length="short"
            )
            response = await service.generate_lyrics(request)

            assert response.lyrics == "This is not JSON lyrics"
            assert "error" in response.structure
