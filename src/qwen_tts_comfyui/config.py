#!/usr/bin/env python3
"""
Configuration classes for Qwen TTS ComfyUI integration.

This module defines dataclasses for configuring the Qwen TTS client,
model settings, generation parameters, and training options.
"""

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Any
import json


class QwenTTSModelChoice(str, Enum):
    """Available Qwen TTS model sizes."""
    SMALL = "0.6B"
    LARGE = "1.7B"


class QwenTTSDevice(str, Enum):
    """Available device options for inference."""
    CPU = "cpu"
    CUDA = "cuda"
    AUTO = "auto"


class QwenTTSPrecision(str, Enum):
    """Available precision options for inference."""
    FP32 = "fp32"
    FP16 = "fp16"
    BF16 = "bf16"


class QwenTTSAttention(str, Enum):
    """Available attention implementations."""
    AUTO = "auto"
    SDPA = "sdpa"
    FLASH = "flash"
    EAGER = "eager"


class QwenTTSLanguage(str, Enum):
    """Supported languages for Qwen TTS."""
    AUTO = "Auto"
    CHINESE = "Chinese"
    ENGLISH = "English"
    JAPANESE = "Japanese"
    KOREAN = "Korean"
    FRENCH = "French"
    GERMAN = "German"
    SPANISH = "Spanish"


@dataclass
class QwenTTSModelConfig:
    """
    Configuration for Qwen TTS model settings.
    
    Attributes:
        model_choice: Model size (0.6B or 1.7B)
        device: Device for inference (cpu, cuda, auto)
        precision: Numerical precision (fp32, fp16, bf16)
        attention: Attention implementation (auto, sdpa, flash, eager)
    """
    model_choice: str = "1.7B"
    device: str = "cuda"
    precision: str = "bf16"
    attention: str = "auto"
    
    def __post_init__(self):
        """Validate configuration values."""
        valid_choices = [e.value for e in QwenTTSModelChoice]
        if self.model_choice not in valid_choices:
            raise ValueError(f"model_choice must be one of {valid_choices}, got {self.model_choice}")
        
        valid_devices = [e.value for e in QwenTTSDevice]
        if self.device not in valid_devices:
            raise ValueError(f"device must be one of {valid_devices}, got {self.device}")
        
        valid_precisions = [e.value for e in QwenTTSPrecision]
        if self.precision not in valid_precisions:
            raise ValueError(f"precision must be one of {valid_precisions}, got {self.precision}")
        
        valid_attentions = [e.value for e in QwenTTSAttention]
        if self.attention not in valid_attentions:
            raise ValueError(f"attention must be one of {valid_attentions}, got {self.attention}")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "model_choice": self.model_choice,
            "device": self.device,
            "precision": self.precision,
            "attention": self.attention,
        }


@dataclass
class QwenTTSGenerationConfig:
    """
    Configuration for text-to-speech generation parameters.
    
    Attributes:
        max_new_tokens: Maximum number of tokens to generate
        top_p: Top-p (nucleus) sampling parameter
        top_k: Top-k sampling parameter
        temperature: Sampling temperature
        repetition_penalty: Repetition penalty factor
        seed: Random seed (0 for random)
    """
    max_new_tokens: int = 2048
    top_p: float = 0.8
    top_k: int = 20
    temperature: float = 1.0
    repetition_penalty: float = 1.05
    seed: int = 0
    
    def __post_init__(self):
        """Validate configuration values."""
        if self.max_new_tokens < 1:
            raise ValueError(f"max_new_tokens must be positive, got {self.max_new_tokens}")
        if not 0.0 <= self.top_p <= 1.0:
            raise ValueError(f"top_p must be between 0 and 1, got {self.top_p}")
        if self.top_k < 0:
            raise ValueError(f"top_k must be non-negative, got {self.top_k}")
        if self.temperature <= 0:
            raise ValueError(f"temperature must be positive, got {self.temperature}")
        if self.repetition_penalty < 1.0:
            raise ValueError(f"repetition_penalty must be >= 1.0, got {self.repetition_penalty}")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "max_new_tokens": self.max_new_tokens,
            "top_p": self.top_p,
            "top_k": self.top_k,
            "temperature": self.temperature,
            "repetition_penalty": self.repetition_penalty,
            "seed": self.seed,
        }


@dataclass
class QwenTTSTrainingConfig:
    """
    Configuration for Qwen TTS model fine-tuning.
    
    Attributes:
        init_model: Base model to fine-tune from
        tokenizer: Tokenizer to use
        audio_folder: Path to audio dataset folder
        output_dir: Directory to save fine-tuned model
        speaker_name: Name for the new speaker/voice
        test_text: Sample text for testing during training
        language: Language of the training data
        learning_rate: Learning rate for training
        num_epochs: Number of training epochs
        batch_size: Batch size for training
        gradient_accumulation_steps: Gradient accumulation steps
        validate_every: Validation frequency (epochs)
    """
    init_model: str = "Qwen/Qwen3-TTS-12Hz-1.7B-Base"
    tokenizer: str = "Qwen/Qwen3-TTS-Tokenizer-12Hz"
    audio_folder: str = ""
    output_dir: str = ""
    speaker_name: str = "custom_speaker"
    test_text: str = "Hello, this is a test of my new voice."
    language: str = "English"
    learning_rate: float = 0.00002
    num_epochs: int = 10
    batch_size: int = 1
    gradient_accumulation_steps: int = 4
    validate_every: int = 2
    
    def __post_init__(self):
        """Validate configuration values."""
        if self.learning_rate <= 0:
            raise ValueError(f"learning_rate must be positive, got {self.learning_rate}")
        if self.num_epochs < 1:
            raise ValueError(f"num_epochs must be at least 1, got {self.num_epochs}")
        if self.batch_size < 1:
            raise ValueError(f"batch_size must be at least 1, got {self.batch_size}")
        if self.gradient_accumulation_steps < 1:
            raise ValueError(f"gradient_accumulation_steps must be at least 1, got {self.gradient_accumulation_steps}")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "init_model": self.init_model,
            "tokenizer": self.tokenizer,
            "audio_folder": self.audio_folder,
            "output_dir": self.output_dir,
            "speaker_name": self.speaker_name,
            "test_text": self.test_text,
            "language": self.language,
            "learning_rate": self.learning_rate,
            "num_epochs": self.num_epochs,
            "batch_size": self.batch_size,
            "gradient_accumulation_steps": self.gradient_accumulation_steps,
            "validate_every": self.validate_every,
        }


@dataclass
class QwenTTSVoiceCloneConfig:
    """
    Configuration for voice cloning operations.
    
    Attributes:
        ref_audio: Path to reference audio file or audio data
        ref_text: Transcription of the reference audio
        target_text: Text to generate with cloned voice
        x_vector_only: Whether to use only x-vector for cloning
        custom_model_path: Path to custom fine-tuned model (optional)
    """
    ref_audio: Optional[str] = None
    ref_text: str = ""
    target_text: str = ""
    x_vector_only: bool = False
    custom_model_path: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "ref_audio": self.ref_audio,
            "ref_text": self.ref_text,
            "target_text": self.target_text,
            "x_vector_only": self.x_vector_only,
            "custom_model_path": self.custom_model_path,
        }


@dataclass
class QwenTTSConfig:
    """
    Main configuration class for Qwen TTS ComfyUI client.
    
    This class combines all configuration aspects for the Qwen TTS client,
    including connection settings, model configuration, and generation defaults.
    
    Attributes:
        comfyui_url: URL of the ComfyUI server
        timeout: Request timeout in seconds
        model: Model configuration
        generation: Default generation configuration
        unload_model_after_generate: Whether to unload model after generation
    """
    comfyui_url: str = "http://127.0.0.1:8188"
    timeout: int = 300
    model: QwenTTSModelConfig = field(default_factory=QwenTTSModelConfig)
    generation: QwenTTSGenerationConfig = field(default_factory=QwenTTSGenerationConfig)
    unload_model_after_generate: bool = True
    
    def __post_init__(self):
        """Validate and convert nested configs."""
        if isinstance(self.model, dict):
            self.model = QwenTTSModelConfig(**self.model)
        if isinstance(self.generation, dict):
            self.generation = QwenTTSGenerationConfig(**self.generation)
    
    @classmethod
    def from_file(cls, config_path: str) -> "QwenTTSConfig":
        """
        Load configuration from a JSON file.
        
        Args:
            config_path: Path to the configuration file
            
        Returns:
            QwenTTSConfig instance
        """
        with open(config_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return cls(**data)
    
    def to_file(self, config_path: str) -> None:
        """
        Save configuration to a JSON file.
        
        Args:
            config_path: Path to save the configuration file
        """
        data = {
            "comfyui_url": self.comfyui_url,
            "timeout": self.timeout,
            "model": self.model.to_dict(),
            "generation": self.generation.to_dict(),
            "unload_model_after_generate": self.unload_model_after_generate,
        }
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "comfyui_url": self.comfyui_url,
            "timeout": self.timeout,
            "model": self.model.to_dict(),
            "generation": self.generation.to_dict(),
            "unload_model_after_generate": self.unload_model_after_generate,
        }


# Built-in speakers available in Qwen TTS
BUILTIN_SPEAKERS = [
    "Ryan",
    "Emily",
    "Michael",
    "Sarah",
    "David",
    "Emma",
    "James",
    "Olivia",
    "William",
    "Sophia",
]


def get_available_speakers() -> List[str]:
    """
    Get list of available built-in speakers.
    
    Returns:
        List of speaker names
    """
    return BUILTIN_SPEAKERS.copy()
