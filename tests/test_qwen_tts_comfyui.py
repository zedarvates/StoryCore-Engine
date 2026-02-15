#!/usr/bin/env python3
"""
Unit tests for Qwen TTS ComfyUI integration.

This module contains tests for the Qwen TTS ComfyUI client,
workflow builders, and result handlers.
"""

import json
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from pathlib import Path

# Import the module components
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from qwen_tts_comfyui.config import (
    QwenTTSConfig,
    QwenTTSModelConfig,
    QwenTTSGenerationConfig,
    QwenTTSTrainingConfig,
    QwenTTSModelChoice,
    QwenTTSDevice,
    QwenTTSPrecision,
    get_available_speakers,
)
from qwen_tts_comfyui.workflows import (
    CustomVoiceWorkflowBuilder,
    VoiceCloneWorkflowBuilder,
    TrainingWorkflowBuilder,
)
from qwen_tts_comfyui.workflows.custom_voice import get_voice_instruction, VOICE_INSTRUCTIONS
from qwen_tts_comfyui.workflows.voice_clone import get_clone_preset, CLONE_PRESETS
from qwen_tts_comfyui.workflows.training import get_training_preset, TRAINING_PRESETS, estimate_training_time
from qwen_tts_comfyui.handlers import AudioResult, TrainingResult
from qwen_tts_comfyui.client import QwenTTSComfyUIClient, create_client


class TestQwenTTSModelConfig:
    """Tests for QwenTTSModelConfig."""
    
    def test_default_values(self):
        """Test default configuration values."""
        config = QwenTTSModelConfig()
        assert config.model_choice == "1.7B"
        assert config.device == "cuda"
        assert config.precision == "bf16"
        assert config.attention == "auto"
    
    def test_custom_values(self):
        """Test custom configuration values."""
        config = QwenTTSModelConfig(
            model_choice="0.6B",
            device="cpu",
            precision="fp32",
            attention="sdpa"
        )
        assert config.model_choice == "0.6B"
        assert config.device == "cpu"
        assert config.precision == "fp32"
        assert config.attention == "sdpa"
    
    def test_invalid_model_choice(self):
        """Test that invalid model choice raises error."""
        with pytest.raises(ValueError):
            QwenTTSModelConfig(model_choice="invalid")
    
    def test_invalid_device(self):
        """Test that invalid device raises error."""
        with pytest.raises(ValueError):
            QwenTTSModelConfig(device="invalid")
    
    def test_to_dict(self):
        """Test conversion to dictionary."""
        config = QwenTTSModelConfig()
        d = config.to_dict()
        assert "model_choice" in d
        assert "device" in d
        assert "precision" in d
        assert "attention" in d


class TestQwenTTSGenerationConfig:
    """Tests for QwenTTSGenerationConfig."""
    
    def test_default_values(self):
        """Test default generation values."""
        config = QwenTTSGenerationConfig()
        assert config.max_new_tokens == 2048
        assert config.top_p == 0.8
        assert config.top_k == 20
        assert config.temperature == 1.0
        assert config.repetition_penalty == 1.05
        assert config.seed == 0
    
    def test_validation(self):
        """Test parameter validation."""
        # Invalid top_p
        with pytest.raises(ValueError):
            QwenTTSGenerationConfig(top_p=1.5)
        
        # Invalid temperature
        with pytest.raises(ValueError):
            QwenTTSGenerationConfig(temperature=0)
        
        # Invalid repetition_penalty
        with pytest.raises(ValueError):
            QwenTTSGenerationConfig(repetition_penalty=0.5)


class TestQwenTTSTrainingConfig:
    """Tests for QwenTTSTrainingConfig."""
    
    def test_default_values(self):
        """Test default training values."""
        config = QwenTTSTrainingConfig()
        assert config.learning_rate == 0.00002
        assert config.num_epochs == 10
        assert config.batch_size == 1
    
    def test_validation(self):
        """Test training parameter validation."""
        with pytest.raises(ValueError):
            QwenTTSTrainingConfig(learning_rate=0)
        
        with pytest.raises(ValueError):
            QwenTTSTrainingConfig(num_epochs=0)


class TestQwenTTSConfig:
    """Tests for main QwenTTSConfig."""
    
    def test_default_values(self):
        """Test default main config values."""
        config = QwenTTSConfig()
        assert config.comfyui_url == "http://127.0.0.1:8188"
        assert config.timeout == 300
        assert isinstance(config.model, QwenTTSModelConfig)
        assert isinstance(config.generation, QwenTTSGenerationConfig)
    
    def test_nested_config_from_dict(self):
        """Test creating nested configs from dict."""
        config = QwenTTSConfig(
            model={"model_choice": "0.6B"},
            generation={"temperature": 0.8}
        )
        assert config.model.model_choice == "0.6B"
        assert config.generation.temperature == 0.8
    
    def test_to_dict(self):
        """Test conversion to dictionary."""
        config = QwenTTSConfig()
        d = config.to_dict()
        assert "comfyui_url" in d
        assert "model" in d
        assert "generation" in d


class TestCustomVoiceWorkflowBuilder:
    """Tests for CustomVoiceWorkflowBuilder."""
    
    def test_build_basic_workflow(self):
        """Test building a basic voice generation workflow."""
        builder = CustomVoiceWorkflowBuilder()
        workflow = builder.build(
            text="Hello, world!",
            speaker="Ryan"
        )
        
        assert "1" in workflow
        assert workflow["1"]["class_type"] == "FB_Qwen3TTSCustomVoice"
        assert workflow["1"]["inputs"]["text"] == "Hello, world!"
        assert workflow["1"]["inputs"]["speaker"] == "Ryan"
    
    def test_build_with_custom_model(self):
        """Test building workflow with custom model."""
        builder = CustomVoiceWorkflowBuilder()
        workflow = builder.build_with_custom_model(
            text="Test text",
            custom_model_path="/path/to/model",
            custom_speaker_name="custom_voice"
        )
        
        assert workflow["1"]["inputs"]["custom_model_path"] == "/path/to/model"
        assert workflow["1"]["inputs"]["custom_speaker_name"] == "custom_voice"
    
    def test_build_with_instruct(self):
        """Test building workflow with voice instruction."""
        builder = CustomVoiceWorkflowBuilder()
        workflow = builder.build_with_instruct(
            text="Test text",
            instruct="Speak slowly",
            speaker="Emily"
        )
        
        assert workflow["1"]["inputs"]["instruct"] == "Speak slowly"
        assert workflow["1"]["inputs"]["speaker"] == "Emily"
    
    def test_missing_text_raises_error(self):
        """Test that missing text raises validation error."""
        builder = CustomVoiceWorkflowBuilder()
        with pytest.raises(ValueError):
            builder.build(text="")


class TestVoiceCloneWorkflowBuilder:
    """Tests for VoiceCloneWorkflowBuilder."""
    
    def test_build_basic_workflow(self):
        """Test building a basic voice cloning workflow."""
        builder = VoiceCloneWorkflowBuilder()
        workflow = builder.build(
            target_text="Hello, cloned voice!",
            ref_audio="reference.wav"
        )
        
        assert "1" in workflow
        assert workflow["1"]["class_type"] == "FB_Qwen3TTSVoiceClone"
        assert workflow["1"]["inputs"]["target_text"] == "Hello, cloned voice!"
        assert workflow["1"]["inputs"]["ref_audio"] == "reference.wav"
    
    def test_build_with_reference_audio(self):
        """Test building with reference audio file."""
        builder = VoiceCloneWorkflowBuilder()
        workflow = builder.build_with_reference_audio(
            target_text="Test",
            ref_audio_path="ref.wav",
            ref_text="Reference text"
        )
        
        assert workflow["1"]["inputs"]["ref_audio"] == "ref.wav"
        assert workflow["1"]["inputs"]["ref_text"] == "Reference text"
    
    def test_build_quick_clone(self):
        """Test quick clone mode."""
        builder = VoiceCloneWorkflowBuilder()
        workflow = builder.build_quick_clone(
            target_text="Test",
            ref_audio_path="ref.wav"
        )
        
        assert workflow["1"]["inputs"]["x_vector_only"] is True


class TestTrainingWorkflowBuilder:
    """Tests for TrainingWorkflowBuilder."""
    
    def test_build_basic_workflow(self):
        """Test building a basic training workflow."""
        builder = TrainingWorkflowBuilder()
        workflow = builder.build(
            audio_folder="/path/to/audio",
            output_dir="/path/to/output",
            speaker_name="new_speaker"
        )
        
        assert "1" in workflow
        assert workflow["1"]["class_type"] == "FB_Qwen3TTSTrain"
        assert workflow["1"]["inputs"]["audio_folder"] == "/path/to/audio"
        assert workflow["1"]["inputs"]["speaker_name"] == "new_speaker"
    
    def test_build_with_model_size(self):
        """Test building with model size selection."""
        builder = TrainingWorkflowBuilder()
        workflow = builder.build_with_model_size(
            audio_folder="/audio",
            output_dir="/output",
            speaker_name="speaker",
            model_size="0.6B"
        )
        
        assert "0.6B" in workflow["1"]["inputs"]["init_model"]
    
    def test_missing_required_params(self):
        """Test that missing required params raises error."""
        builder = TrainingWorkflowBuilder()
        with pytest.raises(ValueError):
            builder.build(audio_folder="", output_dir="/out", speaker_name="test")


class TestAudioResult:
    """Tests for AudioResult."""
    
    def test_successful_result(self):
        """Test creating a successful result."""
        result = AudioResult(
            success=True,
            audio_data=b"fake_audio",
            duration=5.0,
            text="Hello",
            speaker="Ryan"
        )
        
        assert result.success is True
        assert result.audio_data == b"fake_audio"
        assert result.duration == 5.0
    
    def test_failed_result(self):
        """Test creating a failed result."""
        result = AudioResult(
            success=False,
            error_message="Generation failed"
        )
        
        assert result.success is False
        assert result.error_message == "Generation failed"
    
    def test_get_info(self):
        """Test getting result info."""
        result = AudioResult(
            success=True,
            duration=3.5,
            speaker="Emily"
        )
        
        info = result.get_info()
        assert info["success"] is True
        assert info["duration"] == 3.5
        assert info["speaker"] == "Emily"


class TestTrainingResult:
    """Tests for TrainingResult."""
    
    def test_successful_result(self):
        """Test creating a successful training result."""
        result = TrainingResult(
            success=True,
            checkpoint_path="/path/to/checkpoint",
            speaker_name="new_voice",
            num_epochs=10
        )
        
        assert result.success is True
        assert result.checkpoint_path == "/path/to/checkpoint"
    
    def test_get_latest_checkpoint(self):
        """Test getting latest checkpoint."""
        result = TrainingResult(
            success=True,
            checkpoints=["/ckpt/epoch-1", "/ckpt/epoch-2"]
        )
        
        latest = result.get_latest_checkpoint()
        assert latest == "/ckpt/epoch-2"


class TestPresetsAndInstructions:
    """Tests for presets and voice instructions."""
    
    def test_get_voice_instruction(self):
        """Test getting voice instruction by style."""
        instruct = get_voice_instruction("warm_friendly")
        assert "warm" in instruct.lower()
        
        # Unknown style returns empty string
        assert get_voice_instruction("unknown") == ""
    
    def test_get_clone_preset(self):
        """Test getting clone preset."""
        preset = get_clone_preset("fast")
        assert preset["x_vector_only"] is True
        
        preset = get_clone_preset("balanced")
        assert "description" in preset
    
    def test_get_training_preset(self):
        """Test getting training preset."""
        preset = get_training_preset("quick")
        assert preset["num_epochs"] == 5
        
        preset = get_training_preset("quality")
        assert preset["num_epochs"] == 20
    
    def test_estimate_training_time(self):
        """Test training time estimation."""
        estimate = estimate_training_time(
            num_audio_files=100,
            avg_audio_duration=10.0,
            preset="standard"
        )
        
        assert "estimated_seconds" in estimate
        assert "estimated_minutes" in estimate
        assert estimate["estimated_seconds"] > 0


class TestQwenTTSComfyUIClient:
    """Tests for QwenTTSComfyUIClient."""
    
    def test_initialization(self):
        """Test client initialization."""
        client = QwenTTSComfyUIClient()
        assert client.config is not None
        assert client.config.comfyui_url == "http://127.0.0.1:8188"
    
    def test_initialization_with_config(self):
        """Test client initialization with custom config."""
        config = QwenTTSConfig(
            comfyui_url="http://localhost:8189",
            model=QwenTTSModelConfig(model_choice="0.6B")
        )
        client = QwenTTSComfyUIClient(config)
        
        assert client.config.comfyui_url == "http://localhost:8189"
        assert client.config.model.model_choice == "0.6B"
    
    def test_get_available_speakers(self):
        """Test getting available speakers."""
        client = QwenTTSComfyUIClient()
        speakers = client.get_available_speakers()
        
        assert isinstance(speakers, list)
        assert "Ryan" in speakers
        assert "Emily" in speakers
    
    def test_get_voice_instruction(self):
        """Test getting voice instruction through client."""
        client = QwenTTSComfyUIClient()
        instruct = client.get_voice_instruction("professional")
        
        assert "professional" in instruct.lower()
    
    @pytest.mark.asyncio
    async def test_check_connection_mock(self):
        """Test connection check with mocked response."""
        client = QwenTTSComfyUIClient()
        
        with patch.object(client, '_get_session') as mock_session:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.__aenter__ = AsyncMock(return_value=mock_response)
            mock_response.__aexit__ = AsyncMock(return_value=None)
            
            mock_session_obj = AsyncMock()
            mock_session_obj.get.return_value = mock_response
            mock_session.return_value = mock_session_obj
            
            result = await client.check_connection()
            assert result is True
    
    def test_create_client_factory(self):
        """Test client factory function."""
        client = create_client(
            comfyui_url="http://test:8188",
            model_choice="0.6B",
            device="cpu"
        )
        
        assert client.config.comfyui_url == "http://test:8188"
        assert client.config.model.model_choice == "0.6B"
        assert client.config.model.device == "cpu"


class TestGetAvailableSpeakers:
    """Tests for get_available_speakers function."""
    
    def test_returns_list(self):
        """Test that function returns a list."""
        speakers = get_available_speakers()
        assert isinstance(speakers, list)
    
    def test_contains_expected_speakers(self):
        """Test that list contains expected speakers."""
        speakers = get_available_speakers()
        expected = ["Ryan", "Emily", "Michael", "Sarah"]
        for speaker in expected:
            assert speaker in speakers


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
