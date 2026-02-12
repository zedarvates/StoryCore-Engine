"""
ComfyUI Integration Module

Handles integration with ComfyUI backend for image generation,
including availability checking, workflow configuration, and fallback modes.
"""

import asyncio
import aiohttp
import logging
import time
from typing import Optional, List, Callable, Dict, Any
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

from src.end_to_end.data_models import (
    WorldConfig,
    StyleConfig,
    ShotConfig,
    GeneratedImage,
    MasterCoherenceSheet,
    ComfyUIStatus,
    FallbackMode,
    SequencePlan,
    ColorPalette
)

logger = logging.getLogger(__name__)


class ComfyUIIntegration:
    """
    Integration with ComfyUI backend for image generation.
    
    Provides:
    - Backend availability checking
    - Workflow configuration
    - Image generation API calls
    - Fallback mode for unavailable backend
    - Quality validation and retry logic
    """
    
    def __init__(
        self,
        backend_url: str,
        timeout: int = 30,
        max_retries: int = 3,
        fallback_mode: FallbackMode = FallbackMode.PLACEHOLDER
    ):
        """
        Initialize ComfyUI integration.
        
        Args:
            backend_url: URL of ComfyUI backend
            timeout: Request timeout in seconds
            max_retries: Maximum retry attempts for failed generations
            fallback_mode: Mode to use when backend unavailable
        """
        self.backend_url = backend_url.rstrip('/')
        self.timeout = timeout
        self.max_retries = max_retries
        self.fallback_mode = fallback_mode
        self._session: Optional[aiohttp.ClientSession] = None
        
    async def __aenter__(self):
        """Async context manager entry"""
        self._session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self._session:
            await self._session.close()
            
    async def check_availability(self) -> ComfyUIStatus:
        """
        Check if ComfyUI backend is available.
        
        Returns:
            ComfyUIStatus with availability information
        """
        try:
            if not self._session:
                self._session = aiohttp.ClientSession()
                
            async with self._session.get(
                f"{self.backend_url}/system_stats",
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return ComfyUIStatus(
                        available=True,
                        url=self.backend_url,
                        version=data.get('version'),
                        queue_size=data.get('queue_remaining', 0)
                    )
                else:
                    return ComfyUIStatus(
                        available=False,
                        url=self.backend_url,
                        error_message=f"HTTP {response.status}"
                    )
                    
        except asyncio.TimeoutError:
            logger.warning(f"ComfyUI backend timeout at {self.backend_url}")
            return ComfyUIStatus(
                available=False,
                url=self.backend_url,
                error_message="Connection timeout"
            )
        except aiohttp.ClientError as e:
            logger.warning(f"ComfyUI backend connection error: {e}")
            return ComfyUIStatus(
                available=False,
                url=self.backend_url,
                error_message=str(e)
            )
        except Exception as e:
            logger.error(f"Unexpected error checking ComfyUI availability: {e}")
            return ComfyUIStatus(
                available=False,
                url=self.backend_url,
                error_message=f"Unexpected error: {e}"
            )
            
    def _create_workflow_config(
        self,
        shot_config: ShotConfig
    ) -> Dict[str, Any]:
        """
        Create ComfyUI workflow configuration.
        
        Args:
            shot_config: Shot configuration
            
        Returns:
            Workflow configuration dictionary
        """
        return {
            "prompt": {
                "positive": shot_config.prompt,
                "negative": shot_config.negative_prompt
            },
            "size": {
                "width": shot_config.width,
                "height": shot_config.height
            },
            "sampling": {
                "steps": shot_config.steps,
                "cfg_scale": shot_config.cfg_scale,
                "seed": shot_config.seed
            },
            "style": {
                "type": shot_config.style_config.style_type,
                "strength": shot_config.style_config.style_strength
            }
        }
        
    async def _call_generation_api(
        self,
        workflow_config: Dict[str, Any]
    ) -> Optional[bytes]:
        """
        Call ComfyUI generation API.
        
        Args:
            workflow_config: Workflow configuration
            
        Returns:
            Generated image bytes or None if failed
        """
        try:
            if not self._session:
                self._session = aiohttp.ClientSession()
                
            async with self._session.post(
                f"{self.backend_url}/prompt",
                json=workflow_config,
                timeout=aiohttp.ClientTimeout(total=self.timeout * 10)  # Longer timeout for generation
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    prompt_id = result.get('prompt_id')
                    
                    # Poll for completion
                    image_data = await self._poll_for_result(prompt_id)
                    return image_data
                else:
                    logger.error(f"Generation API error: HTTP {response.status}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error calling generation API: {e}")
            return None
            
    async def _poll_for_result(
        self,
        prompt_id: str,
        poll_interval: float = 1.0,
        max_wait: int = 300
    ) -> Optional[bytes]:
        """
        Poll for generation result.
        
        Args:
            prompt_id: Prompt ID to poll
            poll_interval: Polling interval in seconds
            max_wait: Maximum wait time in seconds
            
        Returns:
            Generated image bytes or None if timeout
        """
        start_time = time.time()
        
        while time.time() - start_time < max_wait:
            try:
                async with self._session.get(
                    f"{self.backend_url}/history/{prompt_id}"
                ) as response:
                    if response.status == 200:
                        history = await response.json()
                        
                        if prompt_id in history:
                            outputs = history[prompt_id].get('outputs', {})
                            
                            # Find image output
                            for node_id, node_output in outputs.items():
                                if 'images' in node_output:
                                    image_info = node_output['images'][0]
                                    filename = image_info['filename']
                                    
                                    # Download image
                                    async with self._session.get(
                                        f"{self.backend_url}/view?filename={filename}"
                                    ) as img_response:
                                        if img_response.status == 200:
                                            return await img_response.read()
                                            
            except Exception as e:
                logger.warning(f"Error polling for result: {e}")
                
            await asyncio.sleep(poll_interval)
            
        logger.error(f"Timeout waiting for generation result: {prompt_id}")
        return None
        
    def _create_placeholder_image(
        self,
        shot_config: ShotConfig,
        output_path: Path
    ) -> GeneratedImage:
        """
        Create placeholder image when backend unavailable.
        
        Args:
            shot_config: Shot configuration
            output_path: Path to save placeholder
            
        Returns:
            GeneratedImage with placeholder
        """
        start_time = time.time()
        
        # Create placeholder image
        img = Image.new('RGB', (shot_config.width, shot_config.height), color='#1a1a1a')
        draw = ImageDraw.Draw(img)
        
        # Add text
        text_lines = [
            "PLACEHOLDER",
            f"Shot: {shot_config.shot_id}",
            f"{shot_config.width}x{shot_config.height}",
            "ComfyUI Unavailable"
        ]
        
        # Calculate text position
        y_offset = shot_config.height // 2 - 50
        for line in text_lines:
            # Use default font
            bbox = draw.textbbox((0, 0), line)
            text_width = bbox[2] - bbox[0]
            x = (shot_config.width - text_width) // 2
            draw.text((x, y_offset), line, fill='#666666')
            y_offset += 30
            
        # Save image
        output_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(output_path)
        
        generation_time = time.time() - start_time
        
        return GeneratedImage(
            image_id=f"placeholder_{shot_config.shot_id}",
            shot_id=shot_config.shot_id,
            file_path=output_path,
            width=shot_config.width,
            height=shot_config.height,
            generation_time=generation_time,
            quality_score=0.0,
            metadata={"placeholder": True}
        )
        
    async def generate_master_coherence_sheet(
        self,
        world_config: WorldConfig,
        style_config: StyleConfig,
        output_dir: Path,
        grid_size: int = 3
    ) -> MasterCoherenceSheet:
        """
        Generate master coherence sheet (3x3 grid).
        
        Args:
            world_config: World configuration
            style_config: Style configuration
            output_dir: Output directory for images
            grid_size: Grid size (default 3x3)
            
        Returns:
            MasterCoherenceSheet with generated images
        """
        start_time = time.time()
        
        # Check backend availability
        status = await self.check_availability()
        
        grid_images = []
        total_panels = grid_size * grid_size
        
        for i in range(total_panels):
            panel_id = f"panel_{i+1}"
            
            # Create shot config for panel
            shot_config = ShotConfig(
                shot_id=panel_id,
                prompt=self._create_coherence_prompt(world_config, style_config, i),
                negative_prompt="low quality, blurry, distorted",
                width=512,
                height=512,
                steps=20,
                cfg_scale=7.0,
                seed=42 + i,
                style_config=style_config
            )
            
            output_path = output_dir / f"coherence_{panel_id}.png"
            
            if status.available:
                # Generate with ComfyUI
                image = await self._generate_with_retry(shot_config, output_path)
            else:
                # Use fallback
                logger.warning(f"ComfyUI unavailable, using fallback mode: {self.fallback_mode}")
                if self.fallback_mode == FallbackMode.PLACEHOLDER:
                    image = self._create_placeholder_image(shot_config, output_path)
                elif self.fallback_mode == FallbackMode.ABORT:
                    raise RuntimeError("ComfyUI backend unavailable and fallback mode is ABORT")
                else:  # SKIP
                    continue
                    
            grid_images.append(image)
            
        generation_time = time.time() - start_time
        
        return MasterCoherenceSheet(
            sheet_id=f"coherence_{world_config.world_id}",
            grid_images=grid_images,
            style_config=style_config,
            generation_time=generation_time,
            metadata={
                "world_id": world_config.world_id,
                "backend_available": status.available
            }
        )
        
    def _create_coherence_prompt(
        self,
        world_config: WorldConfig,
        style_config: StyleConfig,
        panel_index: int
    ) -> str:
        """
        Create prompt for coherence sheet panel.
        
        Args:
            world_config: World configuration
            style_config: Style configuration
            panel_index: Panel index in grid
            
        Returns:
            Prompt string
        """
        base_prompt = f"{world_config.genre} style, {world_config.setting}"
        style_prompt = ", ".join(world_config.visual_style)
        lighting_prompt = f"{world_config.lighting_style} lighting"
        atmosphere_prompt = f"{world_config.atmosphere} atmosphere"
        
        # Vary slightly per panel for diversity
        variations = [
            "wide shot",
            "medium shot",
            "close-up",
            "establishing shot",
            "detail shot",
            "atmospheric shot",
            "character focus",
            "environment focus",
            "action shot"
        ]
        
        variation = variations[panel_index % len(variations)]
        
        return f"{base_prompt}, {style_prompt}, {lighting_prompt}, {atmosphere_prompt}, {variation}"
        
    async def generate_shot(
        self,
        shot_config: ShotConfig,
        coherence_sheet: MasterCoherenceSheet,
        output_path: Path
    ) -> GeneratedImage:
        """
        Generate single shot image.
        
        Args:
            shot_config: Shot configuration
            coherence_sheet: Master coherence sheet for style reference
            output_path: Output path for image
            
        Returns:
            GeneratedImage
        """
        # Check backend availability
        status = await self.check_availability()
        
        if status.available:
            return await self._generate_with_retry(shot_config, output_path)
        else:
            logger.warning(f"ComfyUI unavailable for shot {shot_config.shot_id}, using fallback")
            if self.fallback_mode == FallbackMode.PLACEHOLDER:
                return self._create_placeholder_image(shot_config, output_path)
            elif self.fallback_mode == FallbackMode.ABORT:
                raise RuntimeError("ComfyUI backend unavailable and fallback mode is ABORT")
            else:  # SKIP
                raise RuntimeError("Cannot skip individual shot generation")
                
    async def _generate_with_retry(
        self,
        shot_config: ShotConfig,
        output_path: Path
    ) -> GeneratedImage:
        """
        Generate image with retry logic.
        
        Args:
            shot_config: Shot configuration
            output_path: Output path
            
        Returns:
            GeneratedImage
        """
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                start_time = time.time()
                
                # Create workflow config
                workflow_config = self._create_workflow_config(shot_config)
                
                # Call API
                image_data = await self._call_generation_api(workflow_config)
                
                if image_data:
                    # Save image
                    output_path.parent.mkdir(parents=True, exist_ok=True)
                    with open(output_path, 'wb') as f:
                        f.write(image_data)
                        
                    # Load image to get dimensions
                    img = Image.open(output_path)
                    
                    generation_time = time.time() - start_time
                    
                    return GeneratedImage(
                        image_id=f"gen_{shot_config.shot_id}",
                        shot_id=shot_config.shot_id,
                        file_path=output_path,
                        width=img.width,
                        height=img.height,
                        generation_time=generation_time,
                        metadata={
                            "attempt": attempt + 1,
                            "seed": shot_config.seed
                        }
                    )
                else:
                    last_error = "Generation returned no data"
                    
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Generation attempt {attempt + 1} failed: {e}")
                
                if attempt < self.max_retries - 1:
                    # Adjust parameters for retry
                    shot_config.steps = min(shot_config.steps + 5, 50)
                    shot_config.cfg_scale = min(shot_config.cfg_scale + 0.5, 15.0)
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                    
        # All retries failed
        logger.error(f"Failed to generate shot {shot_config.shot_id} after {self.max_retries} attempts")
        raise RuntimeError(f"Generation failed: {last_error}")
        
    async def generate_all_shots(
        self,
        sequence_plan: SequencePlan,
        coherence_sheet: MasterCoherenceSheet,
        output_dir: Path,
        progress_callback: Optional[Callable[[int, int, str], None]] = None
    ) -> List[GeneratedImage]:
        """
        Generate all shots from sequence plan.
        
        Args:
            sequence_plan: Sequence plan with shots
            coherence_sheet: Master coherence sheet
            output_dir: Output directory
            progress_callback: Optional progress callback (current, total, message)
            
        Returns:
            List of GeneratedImage
        """
        all_images = []
        total_shots = sequence_plan.total_shots
        current_shot = 0
        
        for sequence in sequence_plan.sequences:
            for shot in sequence.shots:
                current_shot += 1
                
                if progress_callback:
                    progress_callback(
                        current_shot,
                        total_shots,
                        f"Generating shot {shot.shot_id}"
                    )
                    
                # Create shot config
                shot_config = ShotConfig(
                    shot_id=shot.shot_id,
                    prompt=shot.prompt_modules.base,
                    negative_prompt="low quality, blurry, distorted",
                    width=1920,  # HD resolution
                    height=1080,
                    steps=25,
                    cfg_scale=7.5,
                    seed=hash(shot.shot_id) % (2**31),
                    style_config=coherence_sheet.style_config
                )
                
                output_path = output_dir / f"shot_{shot.shot_id}.png"
                
                try:
                    image = await self.generate_shot(shot_config, coherence_sheet, output_path)
                    all_images.append(image)
                except Exception as e:
                    logger.error(f"Failed to generate shot {shot.shot_id}: {e}")
                    # Continue with other shots
                    
        return all_images
        
    def validate_image_quality(
        self,
        image: GeneratedImage,
        min_quality_score: float = 0.5
    ) -> bool:
        """
        Validate image quality.
        
        Args:
            image: Generated image
            min_quality_score: Minimum acceptable quality score
            
        Returns:
            True if quality is acceptable
        """
        # If it's a placeholder, quality is 0
        if image.metadata.get('placeholder'):
            return False
            
        # Load image and check basic properties
        try:
            img = Image.open(image.file_path)
            
            # Check dimensions
            if img.width < 512 or img.height < 512:
                logger.warning(f"Image {image.image_id} too small: {img.width}x{img.height}")
                return False
                
            # Check if image is not blank
            extrema = img.convert('L').getextrema()
            if extrema[0] == extrema[1]:
                logger.warning(f"Image {image.image_id} is blank")
                return False
                
            # If quality score is set, check it
            if image.quality_score is not None:
                return image.quality_score >= min_quality_score
                
            # Default to True if no quality score
            return True
            
        except Exception as e:
            logger.error(f"Error validating image quality: {e}")
            return False
            
    def get_fallback_mode(self) -> FallbackMode:
        """
        Get current fallback mode configuration.
        
        Returns:
            FallbackMode
        """
        return self.fallback_mode
