#!/usr/bin/env python3
"""
Qwen TTS ComfyUI Service for Video Editor.

This module provides a TTS service that integrates Qwen TTS via ComfyUI
into the video editor's AI services.

Author: StoryCore Team
Version: 1.0.0
"""

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

# Import the new Qwen TTS ComfyUI client
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from qwen_tts_comfyui import (
    QwenTTSComfyUIClient,
    QwenTTSConfig,
    QwenTTSModelConfig,
    QwenTTSGenerationConfig,
    AudioResult,
    TrainingResult,
)
from qwen_tts_comfyui.workflows.custom_voice import VOICE_INSTRUCTIONS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class QwenTTSVoice:
    """Represents a Qwen TTS voice."""
    id: str
    name: str
    language: str
    gender: str
    description: str
    is_custom: bool = False
    custom_model_path: str = ""


@dataclass
class QwenTTSGenerationResult:
    """Result of Qwen TTS generation."""
    success: bool
    audio_path: Optional[str] = None
    duration: float = 0.0
    sample_rate: int = 24000
    text: str = ""
    voice: str = ""
    error_message: Optional[str] = None
    created_at: datetime = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()


class QwenTTSService:
    """
    TTS Service using Qwen TTS via ComfyUI.
    
    This service provides high-quality text-to-speech using Qwen TTS models
    through ComfyUI, supporting:
    - Built-in speaker voices
    - Custom fine-tuned voices
    - Voice cloning from reference audio
    - Instruction-based voice control
    """
    
    # Built-in speakers from Qwen TTS
    BUILTIN_VOICES = {
        "Ryan": {"language": "en", "gender": "male", "description": "Clear male voice"},
        "Emily": {"language": "en", "gender": "female", "description": "Warm female voice"},
        "Michael": {"language": "en", "gender": "male", "description": "Deep male voice"},
        "Sarah": {"language": "en", "gender": "female", "description": "Professional female voice"},
        "David": {"language": "en", "gender": "male", "description": "Friendly male voice"},
        "Emma": {"language": "en", "gender": "female", "description": "Young female voice"},
        "James": {"language": "en", "gender": "male", "description": "British male voice"},
        "Olivia": {"language": "en", "gender": "female", "description": "Elegant female voice"},
    }
    
    def __init__(
        self,
        comfyui_url: str = "http://127.0.0.1:8188",
        model_choice: str = "1.7B",
        device: str = "cuda",
        precision: str = "bf16",
        timeout: int = 300,
    ):
        """
        Initialize the Qwen TTS service.
        
        Args:
            comfyui_url: URL of the ComfyUI server
            model_choice: Model size (0.6B or 1.7B)
            device: Device for inference (cuda, cpu, auto)
            precision: Numerical precision (fp32, fp16, bf16)
            timeout: Request timeout in seconds
        """
        self.config = QwenTTSConfig(
            comfyui_url=comfyui_url,
            timeout=timeout,
            model=QwenTTSModelConfig(
                model_choice=model_choice,
                device=device,
                precision=precision,
            ),
        )
        self._client: Optional[QwenTTSComfyUIClient] = None
        self._custom_voices: Dict[str, QwenTTSVoice] = {}
        
        logger.info(f"QwenTTSService initialized with ComfyUI at {comfyui_url}")
    
    async def _get_client(self) -> QwenTTSComfyUIClient:
        """Get or create the ComfyUI client."""
        if self._client is None:
            self._client = QwenTTSComfyUIClient(self.config)
        return self._client
    
    async def check_connection(self) -> bool:
        """
        Check if ComfyUI server is accessible.
        
        Returns:
            True if server is accessible
        """
        client = await self._get_client()
        return await client.check_connection()
    
    async def get_available_voices(self) -> List[QwenTTSVoice]:
        """
        Get list of available voices.
        
        Returns:
            List of available voices (built-in + custom)
        """
        voices = []
        
        # Add built-in voices
        for voice_id, voice_info in self.BUILTIN_VOICES.items():
            voices.append(QwenTTSVoice(
                id=voice_id,
                name=voice_id,
                language=voice_info["language"],
                gender=voice_info["gender"],
                description=voice_info["description"],
                is_custom=False,
            ))
        
        # Add custom voices
        for voice_id, voice in self._custom_voices.items():
            voices.append(voice)
        
        return voices
    
    def register_custom_voice(
        self,
        voice_id: str,
        name: str,
        custom_model_path: str,
        custom_speaker_name: str,
        language: str = "auto",
        gender: str = "unknown",
        description: str = "",
    ) -> None:
        """
        Register a custom fine-tuned voice.
        
        Args:
            voice_id: Unique identifier for the voice
            name: Display name
            custom_model_path: Path to the fine-tuned model checkpoint
            custom_speaker_name: Speaker name in the custom model
            language: Language of the voice
            gender: Gender of the voice
            description: Description of the voice
        """
        self._custom_voices[voice_id] = QwenTTSVoice(
            id=voice_id,
            name=name,
            language=language,
            gender=gender,
            description=description,
            is_custom=True,
            custom_model_path=custom_model_path,
        )
        logger.info(f"Registered custom voice: {voice_id}")
    
    def unregister_custom_voice(self, voice_id: str) -> bool:
        """
        Unregister a custom voice.
        
        Args:
            voice_id: Voice ID to unregister
            
        Returns:
            True if voice was unregistered
        """
        if voice_id in self._custom_voices:
            del self._custom_voices[voice_id]
            logger.info(f"Unregistered custom voice: {voice_id}")
            return True
        return False
    
    async def text_to_speech(
        self,
        text: str,
        voice: str = "Ryan",
        language: str = "Auto",
        instruct: str = "",
        output_path: Optional[str] = None,
        **kwargs
    ) -> QwenTTSGenerationResult:
        """
        Convert text to speech.
        
        Args:
            text: Text to convert to speech
            voice: Voice ID (built-in or custom)
            language: Language for generation
            instruct: Voice instruction for control
            output_path: Optional path to save audio
            **kwargs: Additional generation parameters
            
        Returns:
            QwenTTSGenerationResult with audio
        """
        try:
            client = await self._get_client()
            
            # Check if it's a custom voice
            if voice in self._custom_voices:
                custom_voice = self._custom_voices[voice]
                result = await client.generate_custom_voice(
                    text=text,
                    custom_model_path=custom_voice.custom_model_path,
                    custom_speaker_name=custom_voice.name,
                    language=language,
                    output_path=output_path,
                    **kwargs
                )
            else:
                # Use built-in voice
                result = await client.generate_voice(
                    text=text,
                    speaker=voice,
                    language=language,
                    instruct=instruct,
                    output_path=output_path,
                    **kwargs
                )
            
            return QwenTTSGenerationResult(
                success=result.success,
                audio_path=result.audio_path,
                duration=result.duration,
                sample_rate=result.sample_rate,
                text=text,
                voice=voice,
                error_message=result.error_message,
            )
            
        except Exception as e:
            logger.error(f"TTS generation failed: {e}")
            return QwenTTSGenerationResult(
                success=False,
                text=text,
                voice=voice,
                error_message=str(e),
            )
    
    async def clone_voice(
        self,
        ref_audio_path: str,
        target_text: str,
        ref_text: str = "",
        language: str = "Auto",
        output_path: Optional[str] = None,
        preset: str = "balanced",
        **kwargs
    ) -> QwenTTSGenerationResult:
        """
        Clone voice from reference audio.
        
        Args:
            ref_audio_path: Path to reference audio file
            target_text: Text to generate with cloned voice
            ref_text: Transcription of reference audio
            language: Language for generation
            output_path: Optional path to save audio
            preset: Cloning preset (fast, balanced, quality)
            **kwargs: Additional parameters
            
        Returns:
            QwenTTSGenerationResult with audio
        """
        try:
            client = await self._get_client()
            
            result = await client.clone_voice(
                ref_audio_path=ref_audio_path,
                target_text=target_text,
                ref_text=ref_text,
                language=language,
                output_path=output_path,
                preset=preset,
                **kwargs
            )
            
            return QwenTTSGenerationResult(
                success=result.success,
                audio_path=result.audio_path,
                duration=result.duration,
                sample_rate=result.sample_rate,
                text=target_text,
                voice="cloned",
                error_message=result.error_message,
            )
            
        except Exception as e:
            logger.error(f"Voice cloning failed: {e}")
            return QwenTTSGenerationResult(
                success=False,
                text=target_text,
                voice="cloned",
                error_message=str(e),
            )
    
    async def train_model(
        self,
        audio_folder: str,
        output_dir: str,
        speaker_name: str,
        language: str = "English",
        preset: str = "standard",
        **kwargs
    ) -> TrainingResult:
        """
        Fine-tune a Qwen TTS model.
        
        Args:
            audio_folder: Path to audio dataset folder
            output_dir: Directory to save checkpoints
            speaker_name: Name for the new speaker
            language: Language of the training data
            preset: Training preset (quick, standard, quality, low_vram)
            **kwargs: Additional training parameters
            
        Returns:
            TrainingResult with training information
        """
        try:
            client = await self._get_client()
            
            result = await client.train_model(
                audio_folder=audio_folder,
                output_dir=output_dir,
                speaker_name=speaker_name,
                language=language,
                preset=preset,
                **kwargs
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Model training failed: {e}")
            return TrainingResult(
                success=False,
                error_message=str(e),
                speaker_name=speaker_name,
            )
    
    def get_voice_instructions(self) -> Dict[str, str]:
        """
        Get available voice instruction templates.
        
        Returns:
            Dictionary of instruction name -> instruction text
        """
        return VOICE_INSTRUCTIONS.copy()
    
    def estimate_training_time(
        self,
        num_audio_files: int,
        avg_audio_duration: float,
        preset: str = "standard"
    ) -> Dict[str, Any]:
        """
        Estimate training time.
        
        Args:
            num_audio_files: Number of audio files
            avg_audio_duration: Average duration in seconds
            preset: Training preset
            
        Returns:
            Dictionary with time estimates
        """
        client = QwenTTSComfyUIClient(self.config)
        return client.estimate_training_time(num_audio_files, avg_audio_duration, preset)
    
    async def close(self) -> None:
        """Close the service and release resources."""
        if self._client:
            await self._client.close()
            self._client = None


# Factory function
def create_qwen_tts_service(
    comfyui_url: str = "http://127.0.0.1:8188",
    model_choice: str = "1.7B",
    device: str = "cuda",
    precision: str = "bf16",
) -> QwenTTSService:
    """
    Create a Qwen TTS service instance.
    
    Args:
        comfyui_url: URL of the ComfyUI server
        model_choice: Model size (0.6B or 1.7B)
        device: Device for inference
        precision: Numerical precision
        
    Returns:
        Configured QwenTTSService instance
    """
    return QwenTTSService(
        comfyui_url=comfyui_url,
        model_choice=model_choice,
        device=device,
        precision=precision,
    )


# Example usage
async def example_usage():
    """Example of using the Qwen TTS service."""
    # Create service
    service = create_qwen_tts_service()
    
    # Check connection
    if await service.check_connection():
        print("✅ Connected to ComfyUI")
    else:
        print("❌ Failed to connect to ComfyUI")
        return
    
    # List available voices
    voices = await service.get_available_voices()
    print(f"Available voices: {[v.name for v in voices]}")
    
    # Generate speech
    result = await service.text_to_speech(
        text="Hello, this is a test of Qwen TTS.",
        voice="Ryan",
        language="English",
        instruct="Speak with a warm, friendly tone"
    )
    
    if result.success:
        print(f"✅ Generated audio: {result.audio_path}")
        print(f"   Duration: {result.duration:.2f}s")
    else:
        print(f"❌ Generation failed: {result.error_message}")
    
    # Close service
    await service.close()


if __name__ == "__main__":
    asyncio.run(example_usage())
