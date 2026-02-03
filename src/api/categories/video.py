"""
Video Processing API Category Handler

This module implements all non-generative video processing endpoints including
video assembly, transitions, effects, rendering, and preview generation.
"""

import logging
import time
from pathlib import Path
from typing import Dict, Any, Optional, List

from ..base_handler import BaseAPIHandler
from ..models import APIResponse, RequestContext, ErrorCodes
from ..config import APIConfig
from ..router import APIRouter

from .video_models import (
    VideoShot,
    VideoAssembleRequest,
    VideoAssembleResult,
    VideoTransition,
    TransitionAddRequest,
    TransitionAddResult,
    VideoEffect,
    EffectsApplyRequest,
    EffectsApplyResult,
    VideoRenderRequest,
    VideoRenderResult,
    VideoPreviewRequest,
    VideoPreviewResult,
)


logger = logging.getLogger(__name__)


class VideoCategoryHandler(BaseAPIHandler):
    """
    Handler for Video Processing API category.
    
    Implements 5 endpoints:
    - storycore.video.assemble: Combine shots into video sequence
    - storycore.video.transition.add: Insert transition between shots
    - storycore.video.effects.apply: Apply video effects
    - storycore.video.render: Render final video file
    - storycore.video.preview: Generate low-resolution preview
    """
    
    def __init__(self, config: APIConfig, router: APIRouter):
        """Initialize the video category handler."""
        super().__init__(config)
        self.router = router
        
        # Try to initialize video processing engine if available
        self.video_engine = None
        self._initialize_video_engine()
        
        # Register all endpoints
        self.register_endpoints()
        
        logger.info("Initialized VideoCategoryHandler with 5 endpoints")
    
    def _initialize_video_engine(self) -> None:
        """Initialize video processing engine if available."""
        try:
            from video_processing_engine import VideoProcessingEngine
            self.video_engine = VideoProcessingEngine()
            logger.info("Video processing engine initialized successfully")
        except ImportError:
            logger.warning("VideoProcessingEngine not available, using mock mode")
            self.video_engine = None
    
    def register_endpoints(self) -> None:
        """Register all video processing endpoints with the router."""
        
        # Video assembly endpoint (async)
        self.router.register_endpoint(
            path="storycore.video.assemble",
            method="POST",
            handler=self.assemble,
            description="Assemble shots into video sequence",
            async_capable=True,
        )
        
        # Transition endpoint
        self.router.register_endpoint(
            path="storycore.video.transition.add",
            method="POST",
            handler=self.transition_add,
            description="Insert transition between shots",
            async_capable=False,
        )
        
        # Effects endpoint
        self.router.register_endpoint(
            path="storycore.video.effects.apply",
            method="POST",
            handler=self.effects_apply,
            description="Apply video effects",
            async_capable=False,
        )
        
        # Render endpoint (async)
        self.router.register_endpoint(
            path="storycore.video.render",
            method="POST",
            handler=self.render,
            description="Render final video file",
            async_capable=True,
        )
        
        # Preview endpoint
        self.router.register_endpoint(
            path="storycore.video.preview",
            method="POST",
            handler=self.preview,
            description="Generate low-resolution preview",
            async_capable=False,
        )
    
    # Helper methods
    
    def _validate_video_path(self, video_path: str, context: RequestContext) -> Optional[APIResponse]:
        """Validate that video file exists."""
        if not Path(video_path).exists():
            return self.create_error_response(
                error_code=ErrorCodes.NOT_FOUND,
                message=f"Video file not found: {video_path}",
                context=context,
                details={"video_path": video_path},
                remediation="Provide a valid video file path",
            )
        return None
    
    def _validate_resolution(self, resolution: str, context: RequestContext) -> Optional[APIResponse]:
        """Validate resolution format."""
        try:
            parts = resolution.split('x')
            if len(parts) != 2:
                raise ValueError("Invalid format")
            width, height = int(parts[0]), int(parts[1])
            if width <= 0 or height <= 0:
                raise ValueError("Invalid dimensions")
        except (ValueError, IndexError):
            return self.create_error_response(
                error_code=ErrorCodes.VALIDATION_ERROR,
                message=f"Invalid resolution format: {resolution}",
                context=context,
                details={"resolution": resolution},
                remediation="Use format 'WIDTHxHEIGHT' (e.g., '1920x1080')",
            )
        return None
    
    def _parse_resolution(self, resolution: str) -> tuple[int, int]:
        """Parse resolution string to width and height."""
        parts = resolution.split('x')
        return int(parts[0]), int(parts[1])
    
    def _calculate_file_size(self, duration: float, resolution: str, bitrate: str = "5M") -> int:
        """Estimate file size based on duration, resolution, and bitrate."""
        # Parse bitrate (e.g., "5M" -> 5000000 bits/second)
        if bitrate.endswith('M'):
            bitrate_bps = int(bitrate[:-1]) * 1_000_000
        elif bitrate.endswith('K'):
            bitrate_bps = int(bitrate[:-1]) * 1_000
        else:
            bitrate_bps = int(bitrate)
        
        # Calculate file size in bytes
        file_size = int((bitrate_bps / 8) * duration)
        return file_size
    
    # Video processing endpoints
    
    def assemble(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Assemble shots into video sequence.
        
        Endpoint: storycore.video.assemble
        Requirements: 10.1
        """
        self.log_request("storycore.video.assemble", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["project_name", "shots", "output_path"], context
            )
            if error_response:
                return error_response
            
            # Extract parameters
            project_name = params["project_name"]
            shots_data = params["shots"]
            output_path = params["output_path"]
            output_format = params.get("output_format", "mp4")
            resolution = params.get("resolution", "1920x1080")
            framerate = params.get("framerate", 30)
            codec = params.get("codec", "h264")
            metadata = params.get("metadata", {})
            
            # Validate shots
            if not shots_data or len(shots_data) == 0:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message="At least one shot is required",
                    context=context,
                    remediation="Provide one or more video shots to assemble",
                )
            
            # Validate resolution
            error_response = self._validate_resolution(resolution, context)
            if error_response:
                return error_response
            
            # Validate framerate
            if framerate <= 0 or framerate > 120:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid framerate: {framerate}",
                    context=context,
                    details={"framerate": framerate},
                    remediation="Provide a framerate between 1 and 120",
                )
            
            # Validate each shot
            for i, shot_data in enumerate(shots_data):
                if "shot_id" not in shot_data or "video_path" not in shot_data:
                    return self.create_error_response(
                        error_code=ErrorCodes.VALIDATION_ERROR,
                        message=f"Shot {i} missing required fields (shot_id, video_path)",
                        context=context,
                        details={"shot_index": i, "shot_data": shot_data},
                        remediation="Each shot must have 'shot_id' and 'video_path' fields",
                    )
                
                # Check if video file exists
                video_path = shot_data["video_path"]
                if not Path(video_path).exists():
                    return self.create_error_response(
                        error_code=ErrorCodes.NOT_FOUND,
                        message=f"Shot {i} video file not found: {video_path}",
                        context=context,
                        details={"shot_index": i, "video_path": video_path},
                        remediation="Provide valid video file paths for all shots",
                    )
            
            start_time = time.time()
            
            # Mock video assembly
            # In real implementation, this would use video processing engine
            total_duration = 0.0
            for shot_data in shots_data:
                duration = shot_data.get("duration_seconds")
                if duration:
                    total_duration += duration
                else:
                    # Estimate 3 seconds per shot if not specified
                    total_duration += 3.0
            
            # Calculate file size
            file_size = self._calculate_file_size(total_duration, resolution, "5M")
            
            result = VideoAssembleResult(
                video_path=output_path,
                project_name=project_name,
                total_shots=len(shots_data),
                duration_seconds=total_duration,
                resolution=resolution,
                framerate=framerate,
                format=output_format,
                file_size_bytes=file_size,
                processing_time_ms=(time.time() - start_time) * 1000,
                metadata=metadata,
            )
            
            response_data = {
                "video_path": result.video_path,
                "project_name": result.project_name,
                "total_shots": result.total_shots,
                "duration_seconds": result.duration_seconds,
                "resolution": result.resolution,
                "framerate": result.framerate,
                "format": result.format,
                "file_size_bytes": result.file_size_bytes,
                "processing_time_ms": result.processing_time_ms,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.video.assemble", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def transition_add(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Insert transition between shots.
        
        Endpoint: storycore.video.transition.add
        Requirements: 10.2
        """
        self.log_request("storycore.video.transition.add", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["video_path", "shot_index", "transition_type"], context
            )
            if error_response:
                return error_response
            
            # Extract parameters
            video_path = params["video_path"]
            shot_index = params["shot_index"]
            transition_type = params["transition_type"]
            transition_duration = params.get("transition_duration_seconds", 0.5)
            transition_parameters = params.get("transition_parameters", {})
            output_path = params.get("output_path")
            metadata = params.get("metadata", {})
            
            # Validate video file exists
            error_response = self._validate_video_path(video_path, context)
            if error_response:
                return error_response
            
            # Validate transition type
            valid_transitions = ["fade", "dissolve", "wipe", "cut", "slide", "zoom"]
            if transition_type not in valid_transitions:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid transition type: {transition_type}",
                    context=context,
                    details={"transition_type": transition_type, "valid_transitions": valid_transitions},
                    remediation=f"Use one of: {', '.join(valid_transitions)}",
                )
            
            # Validate shot index
            if shot_index < 0:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid shot index: {shot_index}",
                    context=context,
                    details={"shot_index": shot_index},
                    remediation="Provide a non-negative shot index",
                )
            
            # Validate transition duration
            if transition_duration <= 0 or transition_duration > 5.0:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid transition duration: {transition_duration}",
                    context=context,
                    details={"transition_duration_seconds": transition_duration},
                    remediation="Provide a duration between 0 and 5 seconds",
                )
            
            start_time = time.time()
            
            # Generate output path if not provided
            if not output_path:
                path_obj = Path(video_path)
                output_path = str(path_obj.parent / f"{path_obj.stem}_transition{path_obj.suffix}")
            
            # Mock transition addition
            # In real implementation, this would use video processing engine
            total_duration = 27.0 + transition_duration  # Mock: original + transition
            
            result = TransitionAddResult(
                video_path=output_path,
                original_path=video_path,
                shot_index=shot_index,
                transition_type=transition_type,
                transition_duration_seconds=transition_duration,
                total_duration_seconds=total_duration,
                processing_time_ms=(time.time() - start_time) * 1000,
                metadata=metadata,
            )
            
            response_data = {
                "video_path": result.video_path,
                "original_path": result.original_path,
                "shot_index": result.shot_index,
                "transition_type": result.transition_type,
                "transition_duration_seconds": result.transition_duration_seconds,
                "total_duration_seconds": result.total_duration_seconds,
                "processing_time_ms": result.processing_time_ms,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.video.transition.add", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def effects_apply(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Apply video effects.
        
        Endpoint: storycore.video.effects.apply
        Requirements: 10.3
        """
        self.log_request("storycore.video.effects.apply", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["video_path", "effects"], context
            )
            if error_response:
                return error_response
            
            # Extract parameters
            video_path = params["video_path"]
            effects_data = params["effects"]
            output_path = params.get("output_path")
            metadata = params.get("metadata", {})
            
            # Validate video file exists
            error_response = self._validate_video_path(video_path, context)
            if error_response:
                return error_response
            
            # Validate effects
            if not effects_data or len(effects_data) == 0:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message="At least one effect is required",
                    context=context,
                    remediation="Provide one or more video effects to apply",
                )
            
            # Validate each effect
            valid_effect_types = [
                "color_grade", "blur", "sharpen", "stabilize", "speed", 
                "reverse", "brightness", "contrast", "saturation", "vignette"
            ]
            
            for i, effect_data in enumerate(effects_data):
                if "effect_type" not in effect_data:
                    return self.create_error_response(
                        error_code=ErrorCodes.VALIDATION_ERROR,
                        message=f"Effect {i} missing required field 'effect_type'",
                        context=context,
                        details={"effect_index": i, "effect_data": effect_data},
                        remediation="Each effect must have 'effect_type' field",
                    )
                
                effect_type = effect_data["effect_type"]
                if effect_type not in valid_effect_types:
                    return self.create_error_response(
                        error_code=ErrorCodes.VALIDATION_ERROR,
                        message=f"Invalid effect type: {effect_type}",
                        context=context,
                        details={"effect_type": effect_type, "valid_effect_types": valid_effect_types},
                        remediation=f"Use one of: {', '.join(valid_effect_types)}",
                    )
            
            start_time = time.time()
            
            # Generate output path if not provided
            if not output_path:
                path_obj = Path(video_path)
                output_path = str(path_obj.parent / f"{path_obj.stem}_effects{path_obj.suffix}")
            
            # Mock effects application
            # In real implementation, this would use video processing engine
            duration = 27.0  # Mock duration
            
            result = EffectsApplyResult(
                video_path=output_path,
                original_path=video_path,
                effects_applied=len(effects_data),
                duration_seconds=duration,
                processing_time_ms=(time.time() - start_time) * 1000,
                metadata=metadata,
            )
            
            response_data = {
                "video_path": result.video_path,
                "original_path": result.original_path,
                "effects_applied": result.effects_applied,
                "duration_seconds": result.duration_seconds,
                "processing_time_ms": result.processing_time_ms,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.video.effects.apply", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def render(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Render final video file.
        
        Endpoint: storycore.video.render
        Requirements: 10.4
        """
        self.log_request("storycore.video.render", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["project_name", "video_path", "output_path"], context
            )
            if error_response:
                return error_response
            
            # Extract parameters
            project_name = params["project_name"]
            video_path = params["video_path"]
            output_path = params["output_path"]
            output_format = params.get("output_format", "mp4")
            resolution = params.get("resolution", "1920x1080")
            framerate = params.get("framerate", 30)
            codec = params.get("codec", "h264")
            bitrate = params.get("bitrate", "5M")
            quality = params.get("quality", "high")
            audio_codec = params.get("audio_codec", "aac")
            audio_bitrate = params.get("audio_bitrate", "192K")
            metadata = params.get("metadata", {})
            
            # Validate video file exists
            error_response = self._validate_video_path(video_path, context)
            if error_response:
                return error_response
            
            # Validate resolution
            error_response = self._validate_resolution(resolution, context)
            if error_response:
                return error_response
            
            # Validate framerate
            if framerate <= 0 or framerate > 120:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid framerate: {framerate}",
                    context=context,
                    details={"framerate": framerate},
                    remediation="Provide a framerate between 1 and 120",
                )
            
            # Validate quality
            valid_qualities = ["low", "medium", "high", "ultra"]
            if quality not in valid_qualities:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid quality: {quality}",
                    context=context,
                    details={"quality": quality, "valid_qualities": valid_qualities},
                    remediation=f"Use one of: {', '.join(valid_qualities)}",
                )
            
            start_time = time.time()
            
            # Mock video rendering
            # In real implementation, this would use video processing engine
            duration = 27.0  # Mock duration
            file_size = self._calculate_file_size(duration, resolution, bitrate)
            
            # Quality score based on quality setting
            quality_scores = {"low": 0.6, "medium": 0.75, "high": 0.9, "ultra": 0.95}
            quality_score = quality_scores.get(quality, 0.9)
            
            result = VideoRenderResult(
                video_path=output_path,
                project_name=project_name,
                duration_seconds=duration,
                resolution=resolution,
                framerate=framerate,
                format=output_format,
                codec=codec,
                bitrate=bitrate,
                file_size_bytes=file_size,
                rendering_time_ms=(time.time() - start_time) * 1000,
                quality_score=quality_score,
                metadata=metadata,
            )
            
            response_data = {
                "video_path": result.video_path,
                "project_name": result.project_name,
                "duration_seconds": result.duration_seconds,
                "resolution": result.resolution,
                "framerate": result.framerate,
                "format": result.format,
                "codec": result.codec,
                "bitrate": result.bitrate,
                "file_size_bytes": result.file_size_bytes,
                "rendering_time_ms": result.rendering_time_ms,
                "quality_score": result.quality_score,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.video.render", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def preview(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Generate low-resolution preview.
        
        Endpoint: storycore.video.preview
        Requirements: 10.5
        """
        self.log_request("storycore.video.preview", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["video_path"], context
            )
            if error_response:
                return error_response
            
            # Extract parameters
            video_path = params["video_path"]
            output_path = params.get("output_path")
            resolution = params.get("resolution", "640x360")
            framerate = params.get("framerate", 15)
            quality = params.get("quality", "low")
            max_duration_seconds = params.get("max_duration_seconds")
            metadata = params.get("metadata", {})
            
            # Validate video file exists
            error_response = self._validate_video_path(video_path, context)
            if error_response:
                return error_response
            
            # Validate resolution
            error_response = self._validate_resolution(resolution, context)
            if error_response:
                return error_response
            
            # Validate framerate
            if framerate <= 0 or framerate > 60:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid framerate: {framerate}",
                    context=context,
                    details={"framerate": framerate},
                    remediation="Provide a framerate between 1 and 60 for preview",
                )
            
            start_time = time.time()
            
            # Generate output path if not provided
            if not output_path:
                path_obj = Path(video_path)
                output_path = str(path_obj.parent / f"{path_obj.stem}_preview{path_obj.suffix}")
            
            # Mock preview generation
            # In real implementation, this would use video processing engine
            duration = 27.0  # Mock duration
            if max_duration_seconds and duration > max_duration_seconds:
                duration = max_duration_seconds
            
            # Calculate file sizes
            original_size = self._calculate_file_size(27.0, "1920x1080", "5M")
            preview_size = self._calculate_file_size(duration, resolution, "1M")
            compression_ratio = original_size / preview_size if preview_size > 0 else 1.0
            
            result = VideoPreviewResult(
                preview_path=output_path,
                original_path=video_path,
                duration_seconds=duration,
                resolution=resolution,
                framerate=framerate,
                file_size_bytes=preview_size,
                compression_ratio=compression_ratio,
                generation_time_ms=(time.time() - start_time) * 1000,
                metadata=metadata,
            )
            
            response_data = {
                "preview_path": result.preview_path,
                "original_path": result.original_path,
                "duration_seconds": result.duration_seconds,
                "resolution": result.resolution,
                "framerate": result.framerate,
                "file_size_bytes": result.file_size_bytes,
                "compression_ratio": result.compression_ratio,
                "generation_time_ms": result.generation_time_ms,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.video.preview", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)
