"""
Audio API Category Handler

This module implements all audio production endpoints including voice generation,
music generation, effects, mixing, synchronization, and analysis.
"""

import logging
from pathlib import Path
from typing import Dict, Any, Optional
import time
import os

from ..base_handler import BaseAPIHandler
from ..models import APIResponse, RequestContext, ErrorCodes
from ..config import APIConfig
from .audio_models import (
    VoiceGenerationRequest,
    VoiceGenerationResult,
    MusicGenerationRequest,
    MusicGenerationResult,
    AudioEffectRequest,
    AudioEffectResult,
    AudioTrack,
    AudioMixRequest,
    AudioMixResult,
    AudioSyncRequest,
    AudioSyncResult,
    AudioQualityMetrics,
    AudioAnalysisResult,
)


logger = logging.getLogger(__name__)


class AudioCategoryHandler(BaseAPIHandler):
    """
    Handler for audio production API endpoints.
    
    Implements 6 endpoints:
    - storycore.audio.voice.generate: Generate speech from text
    - storycore.audio.music.generate: Generate background music
    - storycore.audio.effects.add: Apply audio effects
    - storycore.audio.mix: Mix multiple audio tracks
    - storycore.audio.sync: Synchronize audio with video
    - storycore.audio.analyze: Analyze audio quality
    """
    
    def __init__(self, config: APIConfig):
        """Initialize the audio category handler."""
        super().__init__(config)
        self.audio_engine = None
        self._initialize_audio_engine()
    
    def _initialize_audio_engine(self) -> None:
        """Initialize audio generation engine if available."""
        try:
            from comfyui_audio_engine import ComfyUIAudioEngine
            self.audio_engine = ComfyUIAudioEngine(
                comfyui_url="http://127.0.0.1:8188",
                mock_mode=True  # Default to mock mode for safety
            )
            logger.info("Audio engine initialized successfully")
        except ImportError:
            logger.warning("ComfyUI audio engine not available, using mock mode")
            self.audio_engine = None
    
    def voice_generate(
        self,
        params: Dict[str, Any],
        context: RequestContext,
    ) -> APIResponse:
        """
        Generate speech from text.
        
        Endpoint: storycore.audio.voice.generate
        
        Args:
            params: Request parameters including text, voice_id, voice_parameters
            context: Request context
            
        Returns:
            API response with voice generation result or task ID
        """
        self.log_request("storycore.audio.voice.generate", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["text"], context
            )
            if error_response:
                return error_response
            
            # Extract parameters
            text = params["text"]
            voice_id = params.get("voice_id")
            voice_parameters = params.get("voice_parameters", {})
            output_format = params.get("output_format", "wav")
            sample_rate = params.get("sample_rate", 44100)
            
            # Validate text length
            if len(text) > 10000:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message="Text exceeds maximum length of 10,000 characters",
                    context=context,
                    details={"text_length": len(text), "max_length": 10000},
                    remediation="Reduce text length or split into multiple requests",
                )
            
            # This is a long-running operation, should be async
            # For now, we'll simulate the generation
            start_time = time.time()
            
            # Mock voice generation
            output_path = f"assets/audio/voice_{int(time.time())}.{output_format}"
            duration = len(text.split()) * 0.5  # Rough estimate: 0.5s per word
            
            result = VoiceGenerationResult(
                audio_path=output_path,
                text=text,
                voice_id=voice_id,
                duration_seconds=duration,
                sample_rate=sample_rate,
                format=output_format,
                file_size_bytes=int(duration * sample_rate * 2),  # Rough estimate
                generation_time_ms=(time.time() - start_time) * 1000,
                metadata={
                    "voice_parameters": voice_parameters,
                    "word_count": len(text.split()),
                }
            )
            
            response_data = {
                "audio_path": result.audio_path,
                "text": result.text,
                "voice_id": result.voice_id,
                "duration_seconds": result.duration_seconds,
                "sample_rate": result.sample_rate,
                "format": result.format,
                "file_size_bytes": result.file_size_bytes,
                "generation_time_ms": result.generation_time_ms,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.audio.voice.generate", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def music_generate(
        self,
        params: Dict[str, Any],
        context: RequestContext,
    ) -> APIResponse:
        """
        Generate background music.
        
        Endpoint: storycore.audio.music.generate
        
        Args:
            params: Request parameters including mood, duration, genre, tempo
            context: Request context
            
        Returns:
            API response with music generation result or task ID
        """
        self.log_request("storycore.audio.music.generate", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["mood", "duration_seconds"], context
            )
            if error_response:
                return error_response
            
            # Extract parameters
            mood = params["mood"]
            duration_seconds = params["duration_seconds"]
            genre = params.get("genre")
            tempo = params.get("tempo")
            key = params.get("key")
            instruments = params.get("instruments", [])
            output_format = params.get("output_format", "wav")
            sample_rate = params.get("sample_rate", 44100)
            
            # Validate duration
            if duration_seconds <= 0 or duration_seconds > 600:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message="Duration must be between 0 and 600 seconds",
                    context=context,
                    details={"duration_seconds": duration_seconds},
                    remediation="Provide a duration between 0 and 600 seconds",
                )
            
            # This is a long-running operation, should be async
            start_time = time.time()
            
            # Mock music generation
            output_path = f"assets/audio/music_{mood}_{int(time.time())}.{output_format}"
            
            result = MusicGenerationResult(
                audio_path=output_path,
                mood=mood,
                duration_seconds=duration_seconds,
                genre=genre,
                tempo=tempo,
                key=key,
                sample_rate=sample_rate,
                format=output_format,
                file_size_bytes=int(duration_seconds * sample_rate * 2),
                generation_time_ms=(time.time() - start_time) * 1000,
                metadata={
                    "instruments": instruments,
                }
            )
            
            response_data = {
                "audio_path": result.audio_path,
                "mood": result.mood,
                "duration_seconds": result.duration_seconds,
                "genre": result.genre,
                "tempo": result.tempo,
                "key": result.key,
                "sample_rate": result.sample_rate,
                "format": result.format,
                "file_size_bytes": result.file_size_bytes,
                "generation_time_ms": result.generation_time_ms,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.audio.music.generate", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def effects_add(
        self,
        params: Dict[str, Any],
        context: RequestContext,
    ) -> APIResponse:
        """
        Apply audio effects.
        
        Endpoint: storycore.audio.effects.add
        
        Args:
            params: Request parameters including audio_path, effect_type, effect_parameters
            context: Request context
            
        Returns:
            API response with effect application result
        """
        self.log_request("storycore.audio.effects.add", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["audio_path", "effect_type"], context
            )
            if error_response:
                return error_response
            
            # Extract parameters
            audio_path = params["audio_path"]
            effect_type = params["effect_type"]
            effect_parameters = params.get("effect_parameters", {})
            output_path = params.get("output_path")
            
            # Validate audio file exists
            if not Path(audio_path).exists():
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Audio file not found: {audio_path}",
                    context=context,
                    details={"audio_path": audio_path},
                    remediation="Provide a valid audio file path",
                )
            
            # Validate effect type
            valid_effects = ["reverb", "echo", "fade_in", "fade_out", "normalize", "compress", "eq"]
            if effect_type not in valid_effects:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid effect type: {effect_type}",
                    context=context,
                    details={"effect_type": effect_type, "valid_effects": valid_effects},
                    remediation=f"Use one of: {', '.join(valid_effects)}",
                )
            
            start_time = time.time()
            
            # Generate output path if not provided
            if not output_path:
                path_obj = Path(audio_path)
                output_path = str(path_obj.parent / f"{path_obj.stem}_{effect_type}{path_obj.suffix}")
            
            # Mock effect application
            result = AudioEffectResult(
                audio_path=output_path,
                original_path=audio_path,
                effect_type=effect_type,
                effect_parameters=effect_parameters,
                duration_seconds=10.0,  # Mock duration
                processing_time_ms=(time.time() - start_time) * 1000,
                metadata={}
            )
            
            response_data = {
                "audio_path": result.audio_path,
                "original_path": result.original_path,
                "effect_type": result.effect_type,
                "effect_parameters": result.effect_parameters,
                "duration_seconds": result.duration_seconds,
                "processing_time_ms": result.processing_time_ms,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.audio.effects.add", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def mix(
        self,
        params: Dict[str, Any],
        context: RequestContext,
    ) -> APIResponse:
        """
        Mix multiple audio tracks.
        
        Endpoint: storycore.audio.mix
        
        Args:
            params: Request parameters including tracks, output_path
            context: Request context
            
        Returns:
            API response with mixing result
        """
        self.log_request("storycore.audio.mix", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["tracks", "output_path"], context
            )
            if error_response:
                return error_response
            
            # Extract parameters
            tracks_data = params["tracks"]
            output_path = params["output_path"]
            output_format = params.get("output_format", "wav")
            sample_rate = params.get("sample_rate", 44100)
            normalize = params.get("normalize", True)
            
            # Validate tracks
            if not tracks_data or len(tracks_data) == 0:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message="At least one track is required",
                    context=context,
                    remediation="Provide one or more audio tracks to mix",
                )
            
            # Validate each track
            for i, track_data in enumerate(tracks_data):
                if "path" not in track_data or "name" not in track_data:
                    return self.create_error_response(
                        error_code=ErrorCodes.VALIDATION_ERROR,
                        message=f"Track {i} missing required fields (path, name)",
                        context=context,
                        details={"track_index": i, "track_data": track_data},
                        remediation="Each track must have 'path' and 'name' fields",
                    )
                
                # Check if file exists
                if not Path(track_data["path"]).exists():
                    return self.create_error_response(
                        error_code=ErrorCodes.NOT_FOUND,
                        message=f"Track {i} audio file not found: {track_data['path']}",
                        context=context,
                        details={"track_index": i, "path": track_data["path"]},
                        remediation="Provide valid audio file paths for all tracks",
                    )
            
            start_time = time.time()
            
            # Mock mixing
            max_duration = max(
                track_data.get("start_time_seconds", 0.0) + 10.0  # Mock 10s per track
                for track_data in tracks_data
            )
            
            result = AudioMixResult(
                audio_path=output_path,
                track_count=len(tracks_data),
                duration_seconds=max_duration,
                sample_rate=sample_rate,
                format=output_format,
                file_size_bytes=int(max_duration * sample_rate * 2),
                processing_time_ms=(time.time() - start_time) * 1000,
                peak_level=-3.0,  # Mock peak level in dB
                rms_level=-18.0,  # Mock RMS level in dB
                metadata={
                    "normalized": normalize,
                    "track_names": [t["name"] for t in tracks_data],
                }
            )
            
            response_data = {
                "audio_path": result.audio_path,
                "track_count": result.track_count,
                "duration_seconds": result.duration_seconds,
                "sample_rate": result.sample_rate,
                "format": result.format,
                "file_size_bytes": result.file_size_bytes,
                "processing_time_ms": result.processing_time_ms,
                "peak_level": result.peak_level,
                "rms_level": result.rms_level,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.audio.mix", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def sync(
        self,
        params: Dict[str, Any],
        context: RequestContext,
    ) -> APIResponse:
        """
        Synchronize audio with video.
        
        Endpoint: storycore.audio.sync
        
        Args:
            params: Request parameters including audio_path, video_path, output_path
            context: Request context
            
        Returns:
            API response with synchronization result
        """
        self.log_request("storycore.audio.sync", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["audio_path", "video_path", "output_path"], context
            )
            if error_response:
                return error_response
            
            # Extract parameters
            audio_path = params["audio_path"]
            video_path = params["video_path"]
            output_path = params["output_path"]
            sync_method = params.get("sync_method", "auto")
            offset_seconds = params.get("offset_seconds", 0.0)
            trim_audio = params.get("trim_audio", True)
            
            # Validate files exist
            if not Path(audio_path).exists():
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Audio file not found: {audio_path}",
                    context=context,
                    details={"audio_path": audio_path},
                    remediation="Provide a valid audio file path",
                )
            
            if not Path(video_path).exists():
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Video file not found: {video_path}",
                    context=context,
                    details={"video_path": video_path},
                    remediation="Provide a valid video file path",
                )
            
            # Validate sync method
            valid_methods = ["auto", "manual", "timecode"]
            if sync_method not in valid_methods:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid sync method: {sync_method}",
                    context=context,
                    details={"sync_method": sync_method, "valid_methods": valid_methods},
                    remediation=f"Use one of: {', '.join(valid_methods)}",
                )
            
            start_time = time.time()
            
            # Mock synchronization
            audio_duration = 27.0  # Mock duration
            video_duration = 27.0  # Mock duration
            
            result = AudioSyncResult(
                output_path=output_path,
                audio_path=audio_path,
                video_path=video_path,
                sync_offset_seconds=offset_seconds,
                audio_duration_seconds=audio_duration,
                video_duration_seconds=video_duration,
                sync_quality_score=0.95,  # Mock quality score
                processing_time_ms=(time.time() - start_time) * 1000,
                metadata={
                    "sync_method": sync_method,
                    "trim_audio": trim_audio,
                }
            )
            
            response_data = {
                "output_path": result.output_path,
                "audio_path": result.audio_path,
                "video_path": result.video_path,
                "sync_offset_seconds": result.sync_offset_seconds,
                "audio_duration_seconds": result.audio_duration_seconds,
                "video_duration_seconds": result.video_duration_seconds,
                "sync_quality_score": result.sync_quality_score,
                "processing_time_ms": result.processing_time_ms,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.audio.sync", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def analyze(
        self,
        params: Dict[str, Any],
        context: RequestContext,
    ) -> APIResponse:
        """
        Analyze audio quality.
        
        Endpoint: storycore.audio.analyze
        
        Args:
            params: Request parameters including audio_path
            context: Request context
            
        Returns:
            API response with audio analysis result
        """
        self.log_request("storycore.audio.analyze", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["audio_path"], context
            )
            if error_response:
                return error_response
            
            # Extract parameters
            audio_path = params["audio_path"]
            
            # Validate file exists
            if not Path(audio_path).exists():
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Audio file not found: {audio_path}",
                    context=context,
                    details={"audio_path": audio_path},
                    remediation="Provide a valid audio file path",
                )
            
            start_time = time.time()
            
            # Mock audio analysis
            metrics = AudioQualityMetrics(
                audio_path=audio_path,
                duration_seconds=27.0,
                sample_rate=44100,
                bit_depth=16,
                channels=2,
                format="wav",
                file_size_bytes=2376000,
                peak_level=-3.2,
                rms_level=-18.5,
                dynamic_range=15.3,
                signal_to_noise_ratio=45.2,
                frequency_range={"min": 20.0, "max": 20000.0, "dominant": 1200.0},
                spectral_centroid=1500.0,
                clipping_detected=False,
                silence_detected=False,
                noise_level=-60.0,
                clarity_score=0.85,
                quality_score=0.88,
                analysis_time_ms=(time.time() - start_time) * 1000,
                metadata={}
            )
            
            # Generate recommendations
            recommendations = []
            issues = []
            
            if metrics.peak_level > -1.0:
                issues.append({
                    "type": "peak_level_high",
                    "severity": "warning",
                    "description": "Peak level is very high, may cause clipping",
                })
                recommendations.append("Consider reducing overall volume to prevent clipping")
            
            if metrics.dynamic_range < 10.0:
                issues.append({
                    "type": "low_dynamic_range",
                    "severity": "info",
                    "description": "Dynamic range is low, audio may sound compressed",
                })
                recommendations.append("Consider using less compression or normalization")
            
            if metrics.clarity_score < 0.7:
                recommendations.append("Audio clarity could be improved with EQ adjustments")
            
            if not recommendations:
                recommendations.append("Audio quality is good, no major issues detected")
            
            result = AudioAnalysisResult(
                metrics=metrics,
                recommendations=recommendations,
                issues=issues,
                metadata={}
            )
            
            response_data = {
                "metrics": {
                    "audio_path": metrics.audio_path,
                    "duration_seconds": metrics.duration_seconds,
                    "sample_rate": metrics.sample_rate,
                    "bit_depth": metrics.bit_depth,
                    "channels": metrics.channels,
                    "format": metrics.format,
                    "file_size_bytes": metrics.file_size_bytes,
                    "peak_level": metrics.peak_level,
                    "rms_level": metrics.rms_level,
                    "dynamic_range": metrics.dynamic_range,
                    "signal_to_noise_ratio": metrics.signal_to_noise_ratio,
                    "frequency_range": metrics.frequency_range,
                    "spectral_centroid": metrics.spectral_centroid,
                    "clipping_detected": metrics.clipping_detected,
                    "silence_detected": metrics.silence_detected,
                    "noise_level": metrics.noise_level,
                    "clarity_score": metrics.clarity_score,
                    "quality_score": metrics.quality_score,
                    "analysis_time_ms": metrics.analysis_time_ms,
                },
                "recommendations": result.recommendations,
                "issues": result.issues,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.audio.analyze", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)
