#!/usr/bin/env python3
"""
Audio result handler for Qwen TTS operations.

This module provides classes for handling audio output from
Qwen TTS workflow executions.
"""

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional
import base64
import tempfile
import wave
import struct


@dataclass
class AudioResult:
    """
    Result of a TTS audio generation operation.
    
    This class encapsulates the audio output from Qwen TTS workflows,
    providing convenient access to audio data and metadata.
    
    Attributes:
        success: Whether the generation was successful
        audio_path: Path to the generated audio file (if saved)
        audio_data: Raw audio data bytes (if in-memory)
        sample_rate: Audio sample rate in Hz
        duration: Audio duration in seconds
        text: The text that was converted to speech
        speaker: Speaker name used for generation
        language: Language of the generated audio
        metadata: Additional metadata about the generation
        error_message: Error message if generation failed
        created_at: Timestamp when the result was created
    """
    success: bool = True
    audio_path: Optional[str] = None
    audio_data: Optional[bytes] = None
    sample_rate: int = 24000
    duration: float = 0.0
    text: str = ""
    speaker: str = ""
    language: str = "Auto"
    metadata: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    
    @classmethod
    def from_comfyui_output(
        cls,
        output: Dict[str, Any],
        text: str = "",
        speaker: str = "",
        language: str = "Auto"
    ) -> "AudioResult":
        """
        Create an AudioResult from ComfyUI workflow output.
        
        Args:
            output: ComfyUI workflow output dictionary
            text: The text that was converted to speech
            speaker: Speaker name used
            language: Language used
            
        Returns:
            AudioResult instance
        """
        try:
            # ComfyUI audio output format
            # Typically: {"audio": {"sample_rate": N, "waveform": [...]}}
            audio_info = output.get("audio", output)
            
            if isinstance(audio_info, dict):
                sample_rate = audio_info.get("sample_rate", 24000)
                waveform = audio_info.get("waveform", [])
                
                # Convert waveform to bytes
                if waveform:
                    audio_data = cls._waveform_to_bytes(waveform, sample_rate)
                    duration = len(waveform) / sample_rate
                else:
                    audio_data = None
                    duration = 0.0
            else:
                # Assume it's already audio data
                audio_data = audio_info if isinstance(audio_info, bytes) else None
                sample_rate = 24000
                duration = 0.0
            
            return cls(
                success=True,
                audio_data=audio_data,
                sample_rate=sample_rate,
                duration=duration,
                text=text,
                speaker=speaker,
                language=language,
                metadata={"raw_output": output}
            )
        except Exception as e:
            return cls(
                success=False,
                error_message=str(e),
                text=text,
                speaker=speaker,
                language=language
            )
    
    @staticmethod
    def _waveform_to_bytes(waveform: list, sample_rate: int) -> bytes:
        """
        Convert waveform samples to WAV bytes.
        
        Args:
            waveform: List of audio samples
            sample_rate: Sample rate in Hz
            
        Returns:
            WAV file as bytes
        """
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            with wave.open(tmp.name, 'wb') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(sample_rate)
                
                # Convert float samples to 16-bit integers
                for sample in waveform:
                    # Clamp and convert to 16-bit
                    sample = max(-1.0, min(1.0, sample))
                    int_sample = int(sample * 32767)
                    wav_file.writeframes(struct.pack('<h', int_sample))
            
            with open(tmp.name, 'rb') as f:
                return f.read()
    
    def save(self, output_path: str) -> bool:
        """
        Save the audio to a file.
        
        Args:
            output_path: Path to save the audio file
            
        Returns:
            True if saved successfully
        """
        if not self.success or (not self.audio_data and not self.audio_path):
            return False
        
        try:
            output_dir = Path(output_path).parent
            if output_dir and not output_dir.exists():
                output_dir.mkdir(parents=True, exist_ok=True)
            
            if self.audio_data:
                with open(output_path, 'wb') as f:
                    f.write(self.audio_data)
            elif self.audio_path and self.audio_path != output_path:
                # Copy from existing path
                import shutil
                shutil.copy(self.audio_path, output_path)
            
            self.audio_path = output_path
            return True
        except Exception as e:
            self.error_message = f"Failed to save audio: {e}"
            return False
    
    def get_base64(self) -> Optional[str]:
        """
        Get the audio data as a base64 encoded string.
        
        Returns:
            Base64 encoded audio string or None
        """
        if self.audio_data:
            return base64.b64encode(self.audio_data).decode('utf-8')
        elif self.audio_path:
            with open(self.audio_path, 'rb') as f:
                return base64.b64encode(f.read()).decode('utf-8')
        return None
    
    def get_info(self) -> Dict[str, Any]:
        """
        Get information about the audio.
        
        Returns:
            Dictionary with audio information
        """
        return {
            "success": self.success,
            "audio_path": self.audio_path,
            "sample_rate": self.sample_rate,
            "duration": self.duration,
            "text": self.text,
            "speaker": self.speaker,
            "language": self.language,
            "has_data": self.audio_data is not None,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
    
    def __repr__(self) -> str:
        """String representation."""
        status = "success" if self.success else "failed"
        duration_str = f"{self.duration:.2f}s" if self.duration > 0 else "unknown duration"
        return f"AudioResult({status}, {duration_str}, speaker='{self.speaker}')"


@dataclass
class AudioGenerationRequest:
    """
    Request for audio generation.
    
    Attributes:
        text: Text to convert to speech
        speaker: Speaker name
        language: Language for generation
        instruct: Voice instruction
        custom_model_path: Path to custom model
        custom_speaker_name: Custom speaker name
        seed: Random seed
        max_new_tokens: Maximum tokens
        top_p: Top-p sampling
        top_k: Top-k sampling
        temperature: Sampling temperature
        repetition_penalty: Repetition penalty
    """
    text: str
    speaker: str = "Ryan"
    language: str = "Auto"
    instruct: str = ""
    custom_model_path: str = ""
    custom_speaker_name: str = ""
    seed: int = 0
    max_new_tokens: int = 2048
    top_p: float = 0.8
    top_k: int = 20
    temperature: float = 1.0
    repetition_penalty: float = 1.05
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "text": self.text,
            "speaker": self.speaker,
            "language": self.language,
            "instruct": self.instruct,
            "custom_model_path": self.custom_model_path,
            "custom_speaker_name": self.custom_speaker_name,
            "seed": self.seed,
            "max_new_tokens": self.max_new_tokens,
            "top_p": self.top_p,
            "top_k": self.top_k,
            "temperature": self.temperature,
            "repetition_penalty": self.repetition_penalty,
        }
