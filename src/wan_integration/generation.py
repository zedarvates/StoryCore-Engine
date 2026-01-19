"""
Generation Methods Module for Wan Video Integration
"""

import asyncio
import logging
import tempfile
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from PIL import Image

from .models import InpaintingMask, DualImageGuidance, CompositeLayer
from .enums import AlphaChannelMode

logger = logging.getLogger(__name__)


class WanVideoGenerationMixin:
    """Mixin class for video generation methods"""

    async def generate_video_with_inpainting(
        self,
        prompt: str,
        video_frames: List[Image.Image],
        mask: InpaintingMask,
        use_multi_stage: bool = True,
        timeout: Optional[float] = None
    ) -> List[Image.Image]:
        """
        Generate video with inpainting (NON-BLOCKING with timeout)

        Args:
            prompt: Text prompt for inpainting
            video_frames: Input video frames
            mask: Inpainting mask
            use_multi_stage: Use multi-stage processing
            timeout: Operation timeout in seconds (uses default if None)

        Returns:
            Inpainted video frames

        Raises:
            asyncio.TimeoutError: If operation times out
            asyncio.CancelledError: If operation is cancelled
        """
        # Check circuit breaker
        if not self._check_circuit_breaker():
            raise RuntimeError("Circuit breaker is OPEN, cannot generate video")

        try:
            async def _generate():
                if not self.model_loaded:
                    await self.load_models()

                logger.info("Generating video with inpainting")
                logger.info(f"Prompt: {prompt[:100]}...")
                logger.info(f"Input frames: {len(video_frames)}")
                logger.info(f"Multi-stage: {use_multi_stage}")

                # Check for cancellation
                self._check_cancellation()

                # Save input images temporarily for ComfyUI
                temp_dir = Path(tempfile.mkdtemp())
                try:
                    # Save start image (first frame)
                    start_image_path = temp_dir / "start_image.png"
                    video_frames[0].save(start_image_path)

                    # Save end image (last frame)
                    end_image_path = temp_dir / "end_image.png"
                    video_frames[-1].save(end_image_path)

                    # Save mask
                    mask_path = temp_dir / "inpainting_mask.png"
                    mask.mask_image.save(mask_path)

                    # Execute ComfyUI workflow
                    workflow_inputs = {
                        "start_image": str(start_image_path),
                        "end_image": str(end_image_path),
                        "mask": str(mask_path),
                        "prompt": prompt
                    }

                    workflow_result = await self._execute_comfyui_workflow(
                        "workflows/workflow_wan_video_inpainting.json",
                        workflow_inputs,
                        "inpainting_workflow",
                        timeout
                    )

                    result_frames = workflow_result["video_frames"]
                    self.generation_stats['inpainting_count'] += 1
                    self.generation_stats['total_frames'] += len(result_frames)

                finally:
                    # Clean up temporary files
                    shutil.rmtree(temp_dir, ignore_errors=True)

                logger.info("Video inpainting complete")
                return result_frames

            result = await self._with_timeout(_generate(), timeout, "generate_video_with_inpainting")
            self._record_success()
            return result

        except Exception as e:
            self._record_failure()
            logger.error(f"Error in video inpainting: {e}")
            raise

    async def generate_video_with_alpha(
        self,
        prompt: str,
        width: Optional[int] = None,
        height: Optional[int] = None,
        num_frames: Optional[int] = None,
        alpha_mode: AlphaChannelMode = AlphaChannelMode.THRESHOLD,
        timeout: Optional[float] = None
    ) -> Tuple[List[Image.Image], List[Image.Image]]:
        """
        Generate video with alpha channel (NON-BLOCKING with timeout)

        Args:
            prompt: Text prompt for generation
            width: Video width (uses config default if None)
            height: Video height (uses config default if None)
            num_frames: Number of frames (uses config default if None)
            alpha_mode: Alpha generation mode
            timeout: Operation timeout in seconds (uses default if None)

        Returns:
            Tuple of (RGB frames, alpha masks)

        Raises:
            asyncio.TimeoutError: If operation times out
            asyncio.CancelledError: If operation is cancelled
        """
        # Check circuit breaker
        if not self._check_circuit_breaker():
            raise RuntimeError("Circuit breaker is OPEN, cannot generate video")

        try:
            async def _generate():
                if not self.model_loaded:
                    await self.load_models()

                width_val = width or self.config.width
                height_val = height or self.config.height
                num_frames_val = num_frames or self.config.num_frames

                logger.info("Generating video with alpha channel")
                logger.info(f"Prompt: {prompt[:100]}...")
                logger.info(f"Resolution: {width_val}x{height_val}, Frames: {num_frames_val}")
                logger.info(f"Alpha mode: {alpha_mode.value}")

                # Check for cancellation
                self._check_cancellation()

                # Mock video generation
                if Image:
                    rgb_frames = [
                        Image.new('RGB', (width_val, height_val), (128, 128, 128))
                        for _ in range(num_frames_val)
                    ]
                else:
                    rgb_frames = [None] * num_frames_val

                # Check for cancellation before alpha generation
                self._check_cancellation()

                # Save input images temporarily for ComfyUI
                temp_dir = Path(tempfile.mkdtemp())
                try:
                    # Save start image (first frame)
                    start_image_path = temp_dir / "start_image.png"
                    rgb_frames[0].save(start_image_path)

                    # Save end image (last frame)
                    end_image_path = temp_dir / "end_image.png"
                    rgb_frames[-1].save(end_image_path)

                    # Save mask (create a default mask for alpha generation)
                    mask_path = temp_dir / "inpainting_mask.png"
                    # Create a mask image (white = process, black = keep original)
                    mask_img = Image.new('L', (width_val, height_val), 255)
                    mask_img.save(mask_path)

                    # Execute ComfyUI workflow for alpha inpainting
                    workflow_inputs = {
                        "start_image": str(start_image_path),
                        "end_image": str(end_image_path),
                        "mask": str(mask_path),
                        "prompt": prompt,
                        "alpha_mode": alpha_mode.value
                    }

                    workflow_result = await self._execute_comfyui_workflow(
                        "workflows/workflow_wan_video_alpha_inpainting.json",
                        workflow_inputs,
                        "alpha_inpainting_workflow",
                        timeout
                    )

                    # For alpha workflow, we get RGBA frames directly
                    rgba_frames = workflow_result["video_frames"]
                    rgb_frames = [frame.convert('RGB') if hasattr(frame, 'convert') else frame for frame in rgba_frames]
                    alpha_masks = [frame.split()[-1] if hasattr(frame, 'split') else None for frame in rgba_frames]

                    self.generation_stats['alpha_generation_count'] += 1
                    self.generation_stats['total_frames'] += len(rgb_frames)

                finally:
                    # Clean up temporary files
                    shutil.rmtree(temp_dir, ignore_errors=True)

                logger.info("Video with alpha generation complete")
                return rgb_frames, alpha_masks

            result = await self._with_timeout(_generate(), timeout, "generate_video_with_alpha")
            self._record_success()
            return result

        except Exception as e:
            self._record_failure()
            logger.error(f"Error in alpha video generation: {e}")
            raise

    async def generate_with_dual_guidance(
        self,
        prompt: str,
        guidance: DualImageGuidance,
        width: Optional[int] = None,
        height: Optional[int] = None,
        num_frames: Optional[int] = None,
        timeout: Optional[float] = None
    ) -> List[Image.Image]:
        """
        Generate video with dual image guidance (NON-BLOCKING with timeout)

        Args:
            prompt: Text prompt for generation
            guidance: Dual image guidance configuration
            width: Video width (uses config default if None)
            height: Video height (uses config default if None)
            num_frames: Number of frames (uses config default if None)
            timeout: Operation timeout in seconds (uses default if None)

        Returns:
            Generated video frames

        Raises:
            asyncio.TimeoutError: If operation times out
            asyncio.CancelledError: If operation is cancelled
        """
        # Check circuit breaker
        if not self._check_circuit_breaker():
            raise RuntimeError("Circuit breaker is OPEN, cannot generate video")

        try:
            async def _generate():
                if not self.model_loaded:
                    await self.load_models()

                width_val = width or self.config.width
                height_val = height or self.config.height
                num_frames_val = num_frames or self.config.num_frames

                logger.info("Generating video with dual guidance")
                logger.info(f"Prompt: {prompt[:100]}...")
                logger.info(f"Resolution: {width_val}x{height_val}, Frames: {num_frames_val}")

                # Check for cancellation
                self._check_cancellation()

                # Prepare guidance
                prepared_guidance = self.guidance_system.prepare_guidance(guidance)

                # Check for cancellation before generation
                self._check_cancellation()

                # Save guidance images temporarily for ComfyUI
                temp_dir = Path(tempfile.mkdtemp())
                try:
                    # Save guidance images
                    guidance_image_1_path = temp_dir / "guidance_image_1.png"
                    guidance.reference_image.save(guidance_image_1_path)

                    guidance_image_2_path = temp_dir / "guidance_image_2.png"
                    if guidance.style_image:
                        guidance.style_image.save(guidance_image_2_path)
                    else:
                        # Duplicate reference image if no style image
                        guidance.reference_image.save(guidance_image_2_path)

                    # Execute ComfyUI workflow for dual guidance
                    workflow_inputs = {
                        "guidance_image_1": str(guidance_image_1_path),
                        "guidance_image_2": str(guidance_image_2_path),
                        "prompt": prompt,
                        "reference_strength": guidance.reference_strength,
                        "style_strength": guidance.style_strength,
                        "blend_mode": guidance.blend_mode
                    }

                    workflow_result = await self._execute_comfyui_workflow(
                        "workflows/workflow_wan_video_dual_guidance.json",
                        workflow_inputs,
                        "dual_guidance_workflow",
                        timeout
                    )

                    video_frames = workflow_result["video_frames"]
                    self.generation_stats['total_frames'] += len(video_frames)

                finally:
                    # Clean up temporary files
                    shutil.rmtree(temp_dir, ignore_errors=True)

                logger.info("Video with dual guidance generation complete")
                return video_frames

            result = await self._with_timeout(_generate(), timeout, "generate_with_dual_guidance")
            self._record_success()
            return result

        except Exception as e:
            self._record_failure()
            logger.error(f"Error in dual guidance generation: {e}")
            raise

    async def composite_videos(
        self,
        layers: List[CompositeLayer],
        background_color: Tuple[int, int, int, int] = (0, 0, 0, 0),
        timeout: Optional[float] = None
    ) -> List[Image.Image]:
        """
        Composite multiple video layers (NON-BLOCKING with timeout)

        Args:
            layers: List of composite layers
            background_color: Background color (RGBA)
            timeout: Operation timeout in seconds (uses default if None)

        Returns:
            Composited video frames

        Raises:
            asyncio.TimeoutError: If operation times out
            asyncio.CancelledError: If operation is cancelled
        """
        # Check circuit breaker
        if not self._check_circuit_breaker():
            raise RuntimeError("Circuit breaker is OPEN, cannot composite videos")

        try:
            async def _composite():
                logger.info("Compositing video layers")

                # Check for cancellation
                self._check_cancellation()

                result_frames = self.compositing_pipeline.composite_layers(
                    layers, background_color
                )

                self.generation_stats['compositing_count'] += 1
                self.generation_stats['total_frames'] += len(result_frames)

                logger.info("Video compositing complete")
                return result_frames

            result = await self._with_timeout(_composite(), timeout, "composite_videos")
            self._record_success()
            return result

        except Exception as e:
            self._record_failure()
            logger.error(f"Error in video compositing: {e}")
            raise

    async def create_transparent_video(
        self,
        prompt: str,
        alpha_mode: AlphaChannelMode = AlphaChannelMode.THRESHOLD,
        width: Optional[int] = None,
        height: Optional[int] = None,
        num_frames: Optional[int] = None,
        timeout: Optional[float] = None
    ) -> List[Image.Image]:
        """
        Create video with transparent background (NON-BLOCKING with timeout)

        Args:
            prompt: Text prompt for generation
            alpha_mode: Alpha generation mode
            width: Video width (uses config default if None)
            height: Video height (uses config default if None)
            num_frames: Number of frames (uses config default if None)
            timeout: Operation timeout in seconds (uses default if None)

        Returns:
            RGBA video frames with transparency

        Raises:
            asyncio.TimeoutError: If operation times out
            asyncio.CancelledError: If operation is cancelled
        """
        # Check circuit breaker
        if not self._check_circuit_breaker():
            raise RuntimeError("Circuit breaker is OPEN, cannot create transparent video")

        try:
            async def _create():
                logger.info("Creating transparent video")

                # Check for cancellation
                self._check_cancellation()

                # Generate video with alpha
                rgb_frames, alpha_masks = await self.generate_video_with_alpha(
                    prompt, width, height, num_frames, alpha_mode, timeout
                )

                # Check for cancellation before applying alpha
                self._check_cancellation()

                # Apply alpha to frames
                rgba_frames = self.alpha_generator.apply_alpha_to_frames(
                    rgb_frames, alpha_masks
                )

                logger.info("Transparent video creation complete")
                return rgba_frames

            result = await self._with_timeout(_create(), timeout, "create_transparent_video")
            self._record_success()
            return result

        except Exception as e:
            self._record_failure()
            logger.error(f"Error creating transparent video: {e}")
            raise