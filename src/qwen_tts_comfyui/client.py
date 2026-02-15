#!/usr/bin/env python3
"""
Main client for Qwen TTS ComfyUI integration.

This module provides the main client class for interacting with Qwen TTS
nodes in ComfyUI for voice generation, voice cloning, and model training.
"""

import asyncio
import json
import logging
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import aiohttp

from .config import (
    QwenTTSConfig,
    QwenTTSModelConfig,
    QwenTTSGenerationConfig,
    QwenTTSTrainingConfig,
    get_available_speakers,
)
from .workflows import (
    CustomVoiceWorkflowBuilder,
    VoiceCloneWorkflowBuilder,
    TrainingWorkflowBuilder,
)
from .workflows.custom_voice import get_voice_instruction
from .workflows.voice_clone import get_clone_preset
from .workflows.training import get_training_preset, estimate_training_time
from .handlers import AudioResult, TrainingResult

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class QwenTTSComfyUIClient:
    """
    Main client for Qwen TTS operations via ComfyUI.
    
    This client provides a high-level interface for:
    - Voice generation with built-in speakers
    - Voice generation with custom fine-tuned models
    - Voice cloning from reference audio
    - Model fine-tuning on custom datasets
    
    Example:
        ```python
        from qwen_tts_comfyui import QwenTTSComfyUIClient, QwenTTSConfig
        
        # Initialize client
        config = QwenTTSConfig(comfyui_url="http://127.0.0.1:8188")
        client = QwenTTSComfyUIClient(config)
        
        # Generate voice
        result = await client.generate_voice(
            text="Hello, world!",
            speaker="Ryan"
        )
        
        # Save audio
        if result.success:
            result.save("output.wav")
        ```
    """
    
    def __init__(
        self,
        config: Optional[QwenTTSConfig] = None,
        comfyui_url: Optional[str] = None,
    ):
        """
        Initialize the Qwen TTS ComfyUI client.
        
        Args:
            config: Configuration object (optional)
            comfyui_url: ComfyUI server URL (optional, overrides config)
        """
        self.config = config or QwenTTSConfig()
        if comfyui_url:
            self.config.comfyui_url = comfyui_url
        
        # Initialize workflow builders
        self._custom_voice_builder = CustomVoiceWorkflowBuilder()
        self._voice_clone_builder = VoiceCloneWorkflowBuilder()
        self._training_builder = TrainingWorkflowBuilder()
        
        # HTTP session (created on demand)
        self._session: Optional[aiohttp.ClientSession] = None
        
        # Client ID for ComfyUI
        self._client_id = str(uuid.uuid4())
        
        logger.info(f"QwenTTSComfyUIClient initialized with URL: {self.config.comfyui_url}")
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create HTTP session."""
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=self.config.timeout)
            self._session = aiohttp.ClientSession(timeout=timeout)
        return self._session
    
    async def close(self) -> None:
        """Close the HTTP session."""
        if self._session and not self._session.closed:
            await self._session.close()
    
    async def __aenter__(self) -> "QwenTTSComfyUIClient":
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        await self.close()
    
    async def check_connection(self) -> bool:
        """
        Check if ComfyUI server is accessible.
        
        Returns:
            True if server is accessible
        """
        try:
            session = await self._get_session()
            async with session.get(f"{self.config.comfyui_url}/system_stats") as response:
                return response.status == 200
        except Exception as e:
            logger.error(f"Failed to connect to ComfyUI: {e}")
            return False
    
    async def _queue_prompt(self, workflow: Dict[str, Any]) -> str:
        """
        Queue a workflow for execution.
        
        Args:
            workflow: ComfyUI workflow dictionary
            
        Returns:
            Prompt ID
        """
        session = await self._get_session()
        
        payload = {
            "prompt": workflow,
            "client_id": self._client_id,
        }
        
        async with session.post(
            f"{self.config.comfyui_url}/prompt",
            json=payload
        ) as response:
            if response.status != 200:
                error_text = await response.text()
                raise RuntimeError(f"Failed to queue prompt: {error_text}")
            
            data = await response.json()
            return data.get("prompt_id")
    
    async def _wait_for_completion(
        self,
        prompt_id: str,
        timeout: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Wait for workflow execution to complete.
        
        Args:
            prompt_id: Prompt ID to wait for
            timeout: Timeout in seconds
            
        Returns:
            Output dictionary
        """
        timeout = timeout or self.config.timeout
        session = await self._get_session()
        
        start_time = asyncio.get_event_loop().time()
        
        while True:
            elapsed = asyncio.get_event_loop().time() - start_time
            if elapsed > timeout:
                raise TimeoutError(f"Workflow execution timed out after {timeout}s")
            
            # Check history for completion
            async with session.get(
                f"{self.config.comfyui_url}/history/{prompt_id}"
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    if prompt_id in data:
                        return data[prompt_id]
            
            await asyncio.sleep(0.5)
    
    async def _get_output_audio(self, output: Dict[str, Any], node_id: str) -> Optional[bytes]:
        """
        Get audio output from workflow result.
        
        Args:
            output: Workflow output dictionary
            node_id: Node ID that produced audio
            
        Returns:
            Audio bytes or None
        """
        outputs = output.get("outputs", {})
        node_output = outputs.get(node_id, {})
        
        # Check for audio output
        audio_info = node_output.get("audio")
        if audio_info:
            # Get filename and subfolder
            filename = audio_info.get("filename")
            subfolder = audio_info.get("subfolder", "")
            audio_type = audio_info.get("type", "output")
            
            if filename:
                # Download the audio file
                session = await self._get_session()
                params = {
                    "filename": filename,
                    "subfolder": subfolder,
                    "type": audio_type,
                }
                
                async with session.get(
                    f"{self.config.comfyui_url}/view",
                    params=params
                ) as response:
                    if response.status == 200:
                        return await response.read()
        
        return None
    
    async def generate_voice(
        self,
        text: str,
        speaker: str = "Ryan",
        language: str = "Auto",
        instruct: str = "",
        output_path: Optional[str] = None,
        **kwargs
    ) -> AudioResult:
        """
        Generate voice using built-in speaker.
        
        Args:
            text: Text to convert to speech
            speaker: Speaker name (Ryan, Emily, etc.)
            language: Language for generation
            instruct: Voice instruction for control
            output_path: Optional path to save audio
            **kwargs: Additional generation parameters
            
        Returns:
            AudioResult with generated audio
        """
        try:
            # Build workflow
            workflow = self._custom_voice_builder.build(
                text=text,
                speaker=speaker,
                language=language,
                instruct=instruct,
                model_choice=self.config.model.model_choice,
                device=self.config.model.device,
                precision=self.config.model.precision,
                attention=self.config.model.attention,
                unload_model_after_generate=self.config.unload_model_after_generate,
                max_new_tokens=kwargs.get("max_new_tokens", self.config.generation.max_new_tokens),
                top_p=kwargs.get("top_p", self.config.generation.top_p),
                top_k=kwargs.get("top_k", self.config.generation.top_k),
                temperature=kwargs.get("temperature", self.config.generation.temperature),
                repetition_penalty=kwargs.get("repetition_penalty", self.config.generation.repetition_penalty),
                seed=kwargs.get("seed", self.config.generation.seed),
            )
            
            # Queue and wait
            prompt_id = await self._queue_prompt(workflow)
            result = await self._wait_for_completion(prompt_id)
            
            # Get audio output
            node_id = self._custom_voice_builder.get_output_node_id()
            audio_data = await self._get_output_audio(result, node_id)
            
            # Create result
            audio_result = AudioResult(
                success=audio_data is not None,
                audio_data=audio_data,
                text=text,
                speaker=speaker,
                language=language,
            )
            
            # Save if path provided
            if output_path and audio_result.success:
                audio_result.save(output_path)
            
            return audio_result
            
        except Exception as e:
            logger.error(f"Voice generation failed: {e}")
            return AudioResult(
                success=False,
                error_message=str(e),
                text=text,
                speaker=speaker,
                language=language,
            )
    
    async def generate_custom_voice(
        self,
        text: str,
        custom_model_path: str,
        custom_speaker_name: str,
        language: str = "Auto",
        output_path: Optional[str] = None,
        **kwargs
    ) -> AudioResult:
        """
        Generate voice using custom fine-tuned model.
        
        Args:
            text: Text to convert to speech
            custom_model_path: Path to fine-tuned model checkpoint
            custom_speaker_name: Name of the custom speaker
            language: Language for generation
            output_path: Optional path to save audio
            **kwargs: Additional generation parameters
            
        Returns:
            AudioResult with generated audio
        """
        try:
            # Build workflow with custom model
            workflow = self._custom_voice_builder.build_with_custom_model(
                text=text,
                custom_model_path=custom_model_path,
                custom_speaker_name=custom_speaker_name,
                language=language,
                model_choice=self.config.model.model_choice,
                device=self.config.model.device,
                precision=self.config.model.precision,
                **kwargs
            )
            
            # Queue and wait
            prompt_id = await self._queue_prompt(workflow)
            result = await self._wait_for_completion(prompt_id)
            
            # Get audio output
            node_id = self._custom_voice_builder.get_output_node_id()
            audio_data = await self._get_output_audio(result, node_id)
            
            # Create result
            audio_result = AudioResult(
                success=audio_data is not None,
                audio_data=audio_data,
                text=text,
                speaker=custom_speaker_name,
                language=language,
                metadata={"custom_model_path": custom_model_path}
            )
            
            # Save if path provided
            if output_path and audio_result.success:
                audio_result.save(output_path)
            
            return audio_result
            
        except Exception as e:
            logger.error(f"Custom voice generation failed: {e}")
            return AudioResult(
                success=False,
                error_message=str(e),
                text=text,
                speaker=custom_speaker_name,
                language=language,
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
    ) -> AudioResult:
        """
        Clone voice from reference audio.
        
        Args:
            ref_audio_path: Path to reference audio file
            target_text: Text to generate with cloned voice
            ref_text: Transcription of reference audio (improves quality)
            language: Language for generation
            output_path: Optional path to save audio
            preset: Cloning preset (fast, balanced, quality)
            **kwargs: Additional generation parameters
            
        Returns:
            AudioResult with generated audio
        """
        try:
            # Get preset settings
            preset_config = get_clone_preset(preset)
            preset_config.update(kwargs)
            
            # Build workflow
            workflow = self._voice_clone_builder.build_with_reference_audio(
                target_text=target_text,
                ref_audio_path=ref_audio_path,
                ref_text=ref_text,
                language=language,
                device=self.config.model.device,
                precision=self.config.model.precision,
                **preset_config
            )
            
            # Queue and wait
            prompt_id = await self._queue_prompt(workflow)
            result = await self._wait_for_completion(prompt_id)
            
            # Get audio output
            node_id = self._voice_clone_builder.get_output_node_id()
            audio_data = await self._get_output_audio(result, node_id)
            
            # Create result
            audio_result = AudioResult(
                success=audio_data is not None,
                audio_data=audio_data,
                text=target_text,
                speaker="cloned",
                language=language,
                metadata={
                    "ref_audio_path": ref_audio_path,
                    "preset": preset,
                }
            )
            
            # Save if path provided
            if output_path and audio_result.success:
                audio_result.save(output_path)
            
            return audio_result
            
        except Exception as e:
            logger.error(f"Voice cloning failed: {e}")
            return AudioResult(
                success=False,
                error_message=str(e),
                text=target_text,
                speaker="cloned",
                language=language,
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
        Fine-tune a Qwen TTS model on custom audio dataset.
        
        Args:
            audio_folder: Path to folder containing audio dataset
            output_dir: Directory to save model checkpoints
            speaker_name: Name for the new speaker/voice
            language: Language of the training data
            preset: Training preset (quick, standard, quality, low_vram)
            **kwargs: Additional training parameters
            
        Returns:
            TrainingResult with training information
        """
        try:
            # Get preset settings
            preset_config = get_training_preset(preset)
            preset_config.update(kwargs)
            
            # Build workflow
            workflow = self._training_builder.build_with_model_size(
                audio_folder=audio_folder,
                output_dir=output_dir,
                speaker_name=speaker_name,
                language=language,
                **preset_config
            )
            
            # Queue and wait (training takes longer)
            prompt_id = await self._queue_prompt(workflow)
            
            # Use extended timeout for training
            training_timeout = max(self.config.timeout, 3600)  # At least 1 hour
            result = await self._wait_for_completion(prompt_id, timeout=training_timeout)
            
            # Create result
            training_result = TrainingResult.from_comfyui_output(
                output=result.get("outputs", {}),
                output_dir=output_dir,
                speaker_name=speaker_name,
                num_epochs=preset_config.get("num_epochs", 10),
            )
            
            return training_result
            
        except Exception as e:
            logger.error(f"Model training failed: {e}")
            return TrainingResult(
                success=False,
                error_message=str(e),
                output_dir=output_dir,
                speaker_name=speaker_name,
            )
    
    def get_available_speakers(self) -> List[str]:
        """
        Get list of available built-in speakers.
        
        Returns:
            List of speaker names
        """
        return get_available_speakers()
    
    def get_voice_instruction(self, style: str) -> str:
        """
        Get a predefined voice instruction by style.
        
        Args:
            style: Style name (warm_friendly, professional, etc.)
            
        Returns:
            Voice instruction string
        """
        return get_voice_instruction(style)
    
    def estimate_training_time(
        self,
        num_audio_files: int,
        avg_audio_duration: float,
        preset: str = "standard"
    ) -> Dict[str, Any]:
        """
        Estimate training time for a dataset.
        
        Args:
            num_audio_files: Number of audio files
            avg_audio_duration: Average duration in seconds
            preset: Training preset
            
        Returns:
            Dictionary with time estimates
        """
        return estimate_training_time(num_audio_files, avg_audio_duration, preset)


# Synchronous wrapper for convenience
class QwenTTSComfyUIClientSync:
    """
    Synchronous wrapper for QwenTTSComfyUIClient.
    
    This class provides synchronous methods that wrap the async client.
    Useful for scripts and simple use cases.
    """
    
    def __init__(self, config: Optional[QwenTTSConfig] = None):
        """Initialize with optional config."""
        self._client = QwenTTSComfyUIClient(config)
        self._loop = None
    
    def _get_loop(self):
        """Get or create event loop."""
        if self._loop is None:
            try:
                self._loop = asyncio.get_event_loop()
            except RuntimeError:
                self._loop = asyncio.new_event_loop()
                asyncio.set_event_loop(self._loop)
        return self._loop
    
    def generate_voice(self, *args, **kwargs) -> AudioResult:
        """Synchronous voice generation."""
        loop = self._get_loop()
        return loop.run_until_complete(self._client.generate_voice(*args, **kwargs))
    
    def generate_custom_voice(self, *args, **kwargs) -> AudioResult:
        """Synchronous custom voice generation."""
        loop = self._get_loop()
        return loop.run_until_complete(self._client.generate_custom_voice(*args, **kwargs))
    
    def clone_voice(self, *args, **kwargs) -> AudioResult:
        """Synchronous voice cloning."""
        loop = self._get_loop()
        return loop.run_until_complete(self._client.clone_voice(*args, **kwargs))
    
    def train_model(self, *args, **kwargs) -> TrainingResult:
        """Synchronous model training."""
        loop = self._get_loop()
        return loop.run_until_complete(self._client.train_model(*args, **kwargs))
    
    def close(self):
        """Close the client."""
        loop = self._get_loop()
        loop.run_until_complete(self._client.close())


def create_client(
    comfyui_url: str = "http://127.0.0.1:8188",
    model_choice: str = "1.7B",
    device: str = "cuda",
    precision: str = "bf16",
) -> QwenTTSComfyUIClient:
    """
    Factory function to create a Qwen TTS ComfyUI client.
    
    Args:
        comfyui_url: ComfyUI server URL
        model_choice: Model size (0.6B or 1.7B)
        device: Device for inference
        precision: Numerical precision
        
    Returns:
        Configured QwenTTSComfyUIClient instance
    """
    config = QwenTTSConfig(
        comfyui_url=comfyui_url,
        model=QwenTTSModelConfig(
            model_choice=model_choice,
            device=device,
            precision=precision,
        ),
    )
    return QwenTTSComfyUIClient(config)
