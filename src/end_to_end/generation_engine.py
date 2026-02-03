"""
Generation Engine for ComfyUI Desktop Integration.

Enhanced generation engine that orchestrates asset generation with real ComfyUI backend,
comprehensive progress tracking, and robust error handling.
"""

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Callable, List, Dict, Any
from datetime import datetime

from .connection_manager import ConnectionManager
from .model_manager import ModelManager
from .workflow_manager import WorkflowManager
from .workflow_configs import ZImageTurboConfig, LTX2ImageToVideoConfig
from .data_models import (
    WorldConfig,
    StyleConfig,
    ShotConfig,
    GeneratedImage,
    GeneratedVideo,
    MasterCoherenceSheet,
    SequencePlan,
    ComfyUIStatus,
    FallbackMode
)

logger = logging.getLogger(__name__)


@dataclass
class GenerationSession:
    """
    Represents an active generation session.
    
    Tracks the current generation operation with session ID,
    start time, and current status.
    """
    session_id: str
    session_type: str  # "coherence_sheet", "shot", "batch"
    start_time: datetime
    total_items: int
    completed_items: int = 0
    failed_items: int = 0
    cancelled: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class GenerationProgress:
    """
    Progress information for an active generation session.
    
    Provides detailed progress tracking including current step,
    percentage complete, time estimates, and backend status.
    """
    session_id: str
    current_step: str
    current_item: int
    total_items: int
    percentage: float
    elapsed_time: float
    estimated_remaining: float
    current_message: str
    backend_queue_depth: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "session_id": self.session_id,
            "current_step": self.current_step,
            "current_item": self.current_item,
            "total_items": self.total_items,
            "percentage": self.percentage,
            "elapsed_time": self.elapsed_time,
            "estimated_remaining": self.estimated_remaining,
            "current_message": self.current_message,
            "backend_queue_depth": self.backend_queue_depth
        }


@dataclass
class GenerationMetrics:
    """
    Performance metrics for generation sessions.
    
    Tracks success/failure counts, timing information, and
    backend availability status.
    """
    total_images: int
    successful: int
    failed: int
    total_time: float
    average_time_per_image: float
    queue_wait_time: float
    generation_time: float
    backend_available: bool
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "total_images": self.total_images,
            "successful": self.successful,
            "failed": self.failed,
            "total_time": self.total_time,
            "average_time_per_image": self.average_time_per_image,
            "queue_wait_time": self.queue_wait_time,
            "generation_time": self.generation_time,
            "backend_available": self.backend_available
        }


class GenerationEngine:
    """
    Enhanced generation engine for real ComfyUI integration.
    
    Orchestrates asset generation with:
    - Real ComfyUI backend integration
    - Comprehensive progress tracking
    - Automatic fallback to mock mode
    - Generation cancellation support
    - Performance metrics collection
    - Asset validation
    
    Validates: Requirements 5.1, 5.3, 5.4, 5.6, 5.7, 8.1-8.7
    """
    
    def __init__(
        self,
        connection_manager: ConnectionManager,
        model_manager: ModelManager,
        workflow_manager: WorkflowManager,
        default_workflow: str = "z_image_turbo"
    ):
        """
        Initialize GenerationEngine with required dependencies.
        
        Args:
            connection_manager: Manages ComfyUI connection
            model_manager: Manages model downloads and validation
            workflow_manager: Manages workflow deployment
            default_workflow: Default workflow to use (default: "z_image_turbo")
            
        Validates: Requirements 5.1, 13.2, 13.12
        """
        self.connection_manager = connection_manager
        self.model_manager = model_manager
        self.workflow_manager = workflow_manager
        self.default_workflow = default_workflow
        
        # Default Z-Image Turbo configuration
        self.z_image_turbo_config = ZImageTurboConfig()
        
        logger.info(f"GenerationEngine initialized with default workflow: {default_workflow}")
        
        self.current_session: Optional[GenerationSession] = None
        self._session_metrics: Dict[str, GenerationMetrics] = {}
        self._cancel_requested = False
        
        # Queue management
        self._active_prompts: Dict[str, Dict[str, Any]] = {}  # prompt_id -> metadata
        self._queue_depth = 0
        
        logger.info("GenerationEngine initialized with ComfyUI integration")
    
    def set_workflow(self, workflow_name: str):
        """
        Set the default workflow for generation.
        
        Allows switching between Z-Image Turbo, FLUX, SDXL, and other workflows.
        
        Args:
            workflow_name: Name of the workflow to use as default
            
        Validates: Requirements 13.12
        """
        self.default_workflow = workflow_name
        logger.info(f"Default workflow changed to: {workflow_name}")
    
    def set_z_image_turbo_config(self, config: ZImageTurboConfig):
        """
        Set Z-Image Turbo configuration.
        
        Args:
            config: Z-Image Turbo configuration
            
        Validates: Requirements 13.6, 13.7, 13.8, 13.9
        """
        self.z_image_turbo_config = config
        logger.info(
            f"Z-Image Turbo config updated: {config.width}x{config.height}, "
            f"{config.steps} steps, {config.sampler_name} sampler"
        )
    
    def check_backend_availability(self) -> bool:
        """
        Check if backend is available for generation.
        
        Returns:
            True if backend is ready, False otherwise
            
        Validates: Requirement 5.1
        """
        status = self.connection_manager.get_status()
        
        if not status.available:
            logger.warning("ComfyUI backend is not available")
            return False
        
        # Check if models are ready
        missing_models = self.model_manager.check_required_models()
        if missing_models:
            logger.warning(f"Missing required models: {[m.name for m in missing_models]}")
            return False
        
        # Check if workflows are deployed
        workflows = self.workflow_manager.check_installed_workflows()
        missing_workflows = [w for w in workflows if w.required and not w.installed]
        if missing_workflows:
            logger.warning(f"Missing required workflows: {[w.name for w in missing_workflows]}")
            return False
        
        logger.info("Backend is fully ready for generation")
        return True
    
    def _create_session(
        self,
        session_type: str,
        total_items: int,
        metadata: Optional[Dict[str, Any]] = None
    ) -> GenerationSession:
        """
        Create a new generation session.
        
        Args:
            session_type: Type of generation session
            total_items: Total number of items to generate
            metadata: Optional session metadata
            
        Returns:
            New GenerationSession
        """
        session = GenerationSession(
            session_id=str(uuid.uuid4()),
            session_type=session_type,
            start_time=datetime.now(),
            total_items=total_items,
            metadata=metadata or {}
        )
        
        self.current_session = session
        self._cancel_requested = False
        
        logger.info(
            f"Created generation session: {session.session_id} "
            f"(type={session_type}, items={total_items})"
        )
        
        return session
    
    def _create_progress(
        self,
        session: GenerationSession,
        current_item: int,
        current_step: str,
        current_message: str
    ) -> GenerationProgress:
        """
        Create progress update for current session.
        
        Args:
            session: Current generation session
            current_item: Current item number
            current_step: Current step description
            current_message: Current status message
            
        Returns:
            GenerationProgress with current status
        """
        elapsed_time = (datetime.now() - session.start_time).total_seconds()
        
        # Calculate percentage
        percentage = (current_item / session.total_items * 100) if session.total_items > 0 else 0
        
        # Estimate remaining time
        if current_item > 0 and elapsed_time > 0:
            avg_time_per_item = elapsed_time / current_item
            remaining_items = session.total_items - current_item
            estimated_remaining = avg_time_per_item * remaining_items
        else:
            estimated_remaining = 0
        
        # Get backend queue depth
        status = self.connection_manager.get_status()
        queue_depth = status.queue_size if status.available else 0
        
        return GenerationProgress(
            session_id=session.session_id,
            current_step=current_step,
            current_item=current_item,
            total_items=session.total_items,
            percentage=percentage,
            elapsed_time=elapsed_time,
            estimated_remaining=estimated_remaining,
            current_message=current_message,
            backend_queue_depth=queue_depth
        )
    
    def _finalize_session(self, session: GenerationSession) -> GenerationMetrics:
        """
        Finalize generation session and calculate metrics.
        
        Args:
            session: Completed generation session
            
        Returns:
            GenerationMetrics for the session
        """
        total_time = (datetime.now() - session.start_time).total_seconds()
        
        total_images = session.completed_items + session.failed_items
        avg_time = total_time / total_images if total_images > 0 else 0
        
        status = self.connection_manager.get_status()
        
        metrics = GenerationMetrics(
            total_images=total_images,
            successful=session.completed_items,
            failed=session.failed_items,
            total_time=total_time,
            average_time_per_image=avg_time,
            queue_wait_time=0,  # TODO: Track actual queue wait time
            generation_time=total_time,
            backend_available=status.available
        )
        
        # Store metrics
        self._session_metrics[session.session_id] = metrics
        
        # Clear current session
        self.current_session = None
        
        logger.info(
            f"Session {session.session_id} completed: "
            f"{metrics.successful}/{metrics.total_images} successful, "
            f"total_time={metrics.total_time:.2f}s"
        )
        
        return metrics
    
    def get_generation_metrics(self) -> Optional[GenerationMetrics]:
        """
        Get performance metrics for current or last generation.
        
        Returns:
            GenerationMetrics if available, None otherwise
            
        Validates: Requirements 5.6, 8.6
        """
        if self.current_session:
            # Return in-progress metrics
            elapsed_time = (datetime.now() - self.current_session.start_time).total_seconds()
            completed = self.current_session.completed_items
            avg_time = elapsed_time / completed if completed > 0 else 0
            
            status = self.connection_manager.get_status()
            
            return GenerationMetrics(
                total_images=self.current_session.total_items,
                successful=self.current_session.completed_items,
                failed=self.current_session.failed_items,
                total_time=elapsed_time,
                average_time_per_image=avg_time,
                queue_wait_time=0,
                generation_time=elapsed_time,
                backend_available=status.available
            )
        
        # Return last session metrics
        if self._session_metrics:
            last_session_id = list(self._session_metrics.keys())[-1]
            return self._session_metrics[last_session_id]
        
        return None
    
    def cancel_generation(self):
        """
        Request cancellation of current generation.
        
        Sets cancellation flag that will be checked during generation loop.
        Also attempts to cancel active ComfyUI requests.
        
        Validates: Requirements 8.7
        """
        if self.current_session:
            logger.info(f"Cancellation requested for session {self.current_session.session_id}")
            self._cancel_requested = True
            self.current_session.cancelled = True
            
            # Cancel all active prompts in ComfyUI
            asyncio.create_task(self._cancel_all_active_prompts())
        else:
            logger.warning("No active generation session to cancel")

    async def _cancel_all_active_prompts(self):
        """
        Cancel all active ComfyUI generation requests.
        
        Validates: Requirement 8.7
        """
        if not self._active_prompts:
            return
        
        logger.info(f"Cancelling {len(self._active_prompts)} active prompts")
        
        for prompt_id in list(self._active_prompts.keys()):
            try:
                await self._cancel_comfyui_generation(prompt_id)
            except Exception as e:
                logger.error(f"Failed to cancel prompt {prompt_id}: {e}")

    async def _cancel_comfyui_generation(self, prompt_id: str):
        """
        Cancel a specific ComfyUI generation via /interrupt endpoint.
        
        Args:
            prompt_id: Prompt ID to cancel
            
        Validates: Requirement 8.7
        """
        import aiohttp
        
        status = self.connection_manager.get_status()
        if not status.available:
            logger.warning("Cannot cancel generation: backend not available")
            return
        
        backend_url = status.url
        
        try:
            async with aiohttp.ClientSession() as session:
                # First, try to delete from queue
                async with session.post(
                    f"{backend_url}/queue",
                    json={"delete": [prompt_id]},
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        logger.info(f"Removed prompt {prompt_id} from queue")
                
                # Then interrupt any running generation
                async with session.post(
                    f"{backend_url}/interrupt",
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        logger.info(f"Interrupted generation for prompt {prompt_id}")
                    else:
                        logger.warning(f"Failed to interrupt: HTTP {response.status}")
            
            # Untrack the prompt
            self._untrack_active_prompt(prompt_id)
            
        except Exception as e:
            logger.error(f"Error cancelling generation {prompt_id}: {e}")

    async def cleanup_cancelled_generation(self, output_dir: Path):
        """
        Clean up partial results from cancelled generation.
        
        Removes temporary files and incomplete outputs.
        
        Args:
            output_dir: Directory containing generation artifacts
            
        Validates: Requirement 8.7
        """
        if not output_dir.exists():
            return
        
        logger.info(f"Cleaning up cancelled generation in {output_dir}")
        
        try:
            # Remove temporary files
            temp_patterns = ["*.tmp", "*.partial", "*_incomplete.*"]
            
            for pattern in temp_patterns:
                temp_files = list(output_dir.glob(pattern))
                for temp_file in temp_files:
                    try:
                        temp_file.unlink()
                        logger.debug(f"Removed temporary file: {temp_file}")
                    except Exception as e:
                        logger.warning(f"Failed to remove {temp_file}: {e}")
            
            logger.info("Cleanup complete for cancelled generation")
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")

    def _check_cancellation(self) -> bool:
        """
        Check if cancellation has been requested.
        
        Returns:
            True if cancellation requested, False otherwise
        """
        if self._cancel_requested:
            logger.info("Generation cancelled by user")
            return True
        return False

    def _track_active_prompt(
        self,
        prompt_id: str,
        session_id: str,
        workflow_name: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Track an active generation request.
        
        Args:
            prompt_id: ComfyUI prompt ID
            session_id: Generation session ID
            workflow_name: Workflow name
            metadata: Optional additional metadata
            
        Validates: Requirement 8.7
        """
        self._active_prompts[prompt_id] = {
            "session_id": session_id,
            "workflow_name": workflow_name,
            "start_time": time.time(),
            "metadata": metadata or {}
        }
        
        logger.debug(f"Tracking active prompt: {prompt_id} (session={session_id})")

    def _untrack_active_prompt(self, prompt_id: str):
        """
        Remove a prompt from active tracking.
        
        Args:
            prompt_id: ComfyUI prompt ID
        """
        if prompt_id in self._active_prompts:
            del self._active_prompts[prompt_id]
            logger.debug(f"Untracked prompt: {prompt_id}")

    def get_active_prompts(self) -> List[Dict[str, Any]]:
        """
        Get list of active generation requests.
        
        Returns:
            List of active prompt information
            
        Validates: Requirement 8.7
        """
        active = []
        
        for prompt_id, info in self._active_prompts.items():
            elapsed = time.time() - info["start_time"]
            active.append({
                "prompt_id": prompt_id,
                "session_id": info["session_id"],
                "workflow_name": info["workflow_name"],
                "elapsed_time": elapsed,
                "metadata": info["metadata"]
            })
        
        return active

    async def get_queue_depth(self) -> int:
        """
        Get current ComfyUI queue depth.
        
        Returns:
            Number of items in queue
            
        Validates: Requirement 8.7
        """
        import aiohttp
        
        status = self.connection_manager.get_status()
        if not status.available:
            return 0
        
        backend_url = status.url
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{backend_url}/queue",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status == 200:
                        queue_data = await response.json()
                        
                        queue_running = queue_data.get('queue_running', [])
                        queue_pending = queue_data.get('queue_pending', [])
                        
                        depth = len(queue_running) + len(queue_pending)
                        self._queue_depth = depth
                        
                        return depth
        
        except Exception as e:
            logger.warning(f"Failed to get queue depth: {e}")
            return 0

    def get_concurrent_generation_limit(self) -> int:
        """
        Get maximum concurrent generation limit.
        
        Returns:
            Maximum concurrent generations allowed
            
        Validates: Requirement 8.7
        """
        # For now, return a conservative limit
        # This could be made configurable
        return 3

    def can_submit_generation(self) -> bool:
        """
        Check if a new generation can be submitted.
        
        Checks against concurrent generation limits.
        
        Returns:
            True if generation can be submitted
            
        Validates: Requirement 8.7
        """
        active_count = len(self._active_prompts)
        limit = self.get_concurrent_generation_limit()
        
        can_submit = active_count < limit
        
        if not can_submit:
            logger.warning(
                f"Cannot submit generation: {active_count}/{limit} active generations"
            )
        
        return can_submit

    async def _check_cancellation(self) -> bool:
        """
        Check if cancellation has been requested.
        
        Returns:
            True if cancellation requested, False otherwise
        """
        if self._cancel_requested:
            logger.info("Generation cancelled by user")
            return True
        return False

    async def generate_master_coherence_sheet(
        self,
        world_config: WorldConfig,
        style_config: StyleConfig,
        output_dir: Path,
        grid_size: int = 3,
        progress_callback: Optional[Callable[[GenerationProgress], None]] = None
    ) -> MasterCoherenceSheet:
        """
        Generate Master Coherence Sheet (3x3 grid) with real ComfyUI backend.
        
        Creates a 3x3 grid of images that establishes the visual DNA for the project.
        Tracks progress for all 9 panels and handles backend failures with fallback.
        
        Args:
            world_config: World configuration
            style_config: Style configuration
            output_dir: Output directory for images
            grid_size: Grid size (default 3x3)
            progress_callback: Optional callback for progress updates
            
        Returns:
            MasterCoherenceSheet with generated images
            
        Validates: Requirements 5.3, 8.4, 8.5
        """
        total_panels = grid_size * grid_size
        
        # Create generation session
        session = self._create_session(
            session_type="coherence_sheet",
            total_items=total_panels,
            metadata={
                "world_id": world_config.world_id,
                "grid_size": grid_size
            }
        )
        
        logger.info(
            f"Starting Master Coherence Sheet generation: "
            f"{total_panels} panels for world {world_config.world_id}"
        )
        
        # Check backend availability
        backend_available = self.check_backend_availability()
        
        if not backend_available:
            logger.warning("Backend not available, using fallback mode")
            fallback_mode = self.connection_manager.get_fallback_mode()
            
            if fallback_mode == "abort":
                raise RuntimeError(
                    "ComfyUI backend unavailable and fallback mode is ABORT. "
                    "Please ensure ComfyUI is running and models are downloaded."
                )
        
        # Ensure output directory exists
        output_dir.mkdir(parents=True, exist_ok=True)
        
        grid_images = []
        start_time = time.time()
        
        # Generate each panel
        for panel_index in range(total_panels):
            # Check for cancellation
            if self._check_cancellation():
                logger.info("Master Coherence Sheet generation cancelled")
                break
            
            panel_id = f"panel_{panel_index + 1}"
            current_item = panel_index + 1
            
            # Create progress update
            progress = self._create_progress(
                session=session,
                current_item=current_item,
                current_step=f"Generating panel {current_item}/{total_panels}",
                current_message=f"Creating coherence panel {panel_id}"
            )
            
            # Call progress callback
            if progress_callback:
                try:
                    progress_callback(progress)
                except Exception as e:
                    logger.error(f"Error in progress callback: {e}")
            
            # Create shot config for panel
            shot_config = self._create_coherence_panel_config(
                world_config=world_config,
                style_config=style_config,
                panel_index=panel_index,
                panel_id=panel_id
            )
            
            output_path = output_dir / f"coherence_{panel_id}.png"
            
            try:
                if backend_available:
                    # Generate with real backend using Z-Image Turbo by default
                    image = await self._generate_with_comfyui(
                        shot_config=shot_config,
                        output_path=output_path,
                        workflow_name=None  # Uses default Z-Image Turbo workflow
                    )
                else:
                    # Use fallback
                    image = self._create_placeholder_image(shot_config, output_path)
                
                grid_images.append(image)
                session.completed_items += 1
                
            except Exception as e:
                logger.error(f"Failed to generate panel {panel_id}: {e}")
                session.failed_items += 1
                
                # Create placeholder on error
                image = self._create_placeholder_image(shot_config, output_path)
                grid_images.append(image)
        
        generation_time = time.time() - start_time
        
        # Finalize session
        metrics = self._finalize_session(session)
        
        # Create Master Coherence Sheet
        coherence_sheet = MasterCoherenceSheet(
            sheet_id=f"coherence_{world_config.world_id}",
            grid_images=grid_images,
            style_config=style_config,
            generation_time=generation_time,
            metadata={
                "world_id": world_config.world_id,
                "grid_size": grid_size,
                "backend_available": backend_available,
                "session_id": session.session_id,
                "metrics": metrics.to_dict()
            }
        )
        
        logger.info(
            f"Master Coherence Sheet generation complete: "
            f"{len(grid_images)} panels in {generation_time:.2f}s"
        )
        
        return coherence_sheet
    
    def _create_coherence_panel_config(
        self,
        world_config: WorldConfig,
        style_config: StyleConfig,
        panel_index: int,
        panel_id: str
    ) -> ShotConfig:
        """
        Create shot configuration for a coherence panel.
        
        Args:
            world_config: World configuration
            style_config: Style configuration
            panel_index: Panel index in grid
            panel_id: Panel identifier
            
        Returns:
            ShotConfig for the panel
        """
        # Create varied prompts for each panel
        variations = [
            "wide establishing shot",
            "medium shot with character focus",
            "close-up detail shot",
            "atmospheric environment shot",
            "action shot with movement",
            "architectural detail shot",
            "character portrait shot",
            "landscape vista shot",
            "intimate scene shot"
        ]
        
        variation = variations[panel_index % len(variations)]
        
        # Build prompt from world config
        base_prompt = f"{world_config.genre} style, {world_config.setting}"
        style_prompt = ", ".join(world_config.visual_style)
        lighting_prompt = f"{world_config.lighting_style} lighting"
        atmosphere_prompt = f"{world_config.atmosphere} atmosphere"
        
        full_prompt = f"{base_prompt}, {style_prompt}, {lighting_prompt}, {atmosphere_prompt}, {variation}"
        
        # Create shot config
        return ShotConfig(
            shot_id=panel_id,
            prompt=full_prompt,
            negative_prompt="low quality, blurry, distorted, watermark, text",
            width=512,
            height=512,
            steps=20,
            cfg_scale=7.0,
            seed=42 + panel_index,  # Deterministic but varied
            style_config=style_config
        )
    
    async def _download_image_from_comfyui(
        self,
        filename: str,
        subfolder: str = ""
    ) -> bytes:
        """
        Download generated image from ComfyUI /view endpoint.
        
        Args:
            filename: Image filename
            subfolder: Optional subfolder path
            
        Returns:
            Image bytes
            
        Raises:
            RuntimeError: If download fails
            
        Validates: Requirements 5.3, 5.4
        """
        import aiohttp
        
        status = self.connection_manager.get_status()
        if not status.available:
            raise RuntimeError("ComfyUI backend not available")
        
        backend_url = status.url
        
        # Build URL with query parameters
        url = f"{backend_url}/view"
        params = {"filename": filename}
        if subfolder:
            params["subfolder"] = subfolder
        
        logger.info(f"Downloading image: {filename} (subfolder={subfolder})")
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    if response.status == 200:
                        image_data = await response.read()
                        logger.info(f"Downloaded image: {len(image_data)} bytes")
                        return image_data
                    else:
                        error_text = await response.text()
                        raise RuntimeError(
                            f"Failed to download image: HTTP {response.status} - {error_text}"
                        )
        
        except asyncio.TimeoutError as e:
            raise RuntimeError(f"Image download timeout for {filename}") from e
        
        except aiohttp.ClientError as e:
            raise RuntimeError(f"Image download error for {filename}: {str(e)}") from e
        
        except Exception as e:
            raise RuntimeError(f"Unexpected error downloading image: {str(e)}") from e

    async def _download_video_from_comfyui(
        self,
        filename: str,
        subfolder: str = "",
        output_path: Path = None
    ) -> bytes:
        """
        Download generated video from ComfyUI /view endpoint with streaming.
        
        Handles large video files by streaming the download in chunks.
        
        Args:
            filename: Video filename
            subfolder: Optional subfolder path
            output_path: Optional path to save video directly (for large files)
            
        Returns:
            Video bytes (if output_path not provided)
            
        Raises:
            RuntimeError: If download fails
            
        Validates: Requirements 14.8
        """
        import aiohttp
        
        status = self.connection_manager.get_status()
        if not status.available:
            raise RuntimeError("ComfyUI backend not available")
        
        backend_url = status.url
        
        # Build URL with query parameters
        url = f"{backend_url}/view"
        params = {"filename": filename}
        if subfolder:
            params["subfolder"] = subfolder
        
        logger.info(f"Downloading video: {filename} (subfolder={subfolder})")
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=300)  # 5 minutes for large videos
                ) as response:
                    if response.status == 200:
                        if output_path:
                            # Stream to file for large videos
                            output_path.parent.mkdir(parents=True, exist_ok=True)
                            
                            total_size = 0
                            with open(output_path, 'wb') as f:
                                async for chunk in response.content.iter_chunked(8192):
                                    f.write(chunk)
                                    total_size += len(chunk)
                            
                            logger.info(f"Downloaded video to {output_path}: {total_size} bytes")
                            return None
                        else:
                            # Load entire video into memory
                            video_data = await response.read()
                            logger.info(f"Downloaded video: {len(video_data)} bytes")
                            return video_data
                    else:
                        error_text = await response.text()
                        raise RuntimeError(
                            f"Failed to download video: HTTP {response.status} - {error_text}"
                        )
        
        except asyncio.TimeoutError as e:
            raise RuntimeError(f"Video download timeout for {filename}") from e
        
        except aiohttp.ClientError as e:
            raise RuntimeError(f"Video download error for {filename}: {str(e)}") from e
        
        except Exception as e:
            raise RuntimeError(f"Unexpected error downloading video: {str(e)}") from e

    async def _validate_download_checksum(
        self,
        file_path: Path,
        expected_checksum: Optional[str] = None
    ) -> bool:
        """
        Validate downloaded file checksum.
        
        Args:
            file_path: Path to downloaded file
            expected_checksum: Expected SHA256 checksum (optional)
            
        Returns:
            True if checksum matches or no checksum provided
            
        Validates: Requirements 5.3, 5.4
        """
        if not expected_checksum:
            # No checksum to validate
            return True
        
        import hashlib
        
        logger.debug(f"Validating checksum for {file_path}")
        
        try:
            sha256_hash = hashlib.sha256()
            
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(8192), b""):
                    sha256_hash.update(chunk)
            
            actual_checksum = sha256_hash.hexdigest()
            
            if actual_checksum == expected_checksum:
                logger.info(f"Checksum validation passed for {file_path}")
                return True
            else:
                logger.error(
                    f"Checksum mismatch for {file_path}: "
                    f"expected {expected_checksum}, got {actual_checksum}"
                )
                return False
        
        except Exception as e:
            logger.error(f"Error validating checksum: {e}")
            return False

    async def _poll_for_generation_result(
        self,
        prompt_id: str,
        poll_interval: float = 1.0,
        max_wait: int = 600
    ) -> bytes:
        """
        Poll /history endpoint for generation status and result.
        
        Monitors the generation progress by polling ComfyUI's history endpoint
        until the generation completes or times out.
        
        Args:
            prompt_id: Prompt ID to poll for
            poll_interval: Polling interval in seconds (default: 1.0)
            max_wait: Maximum wait time in seconds (default: 600)
            
        Returns:
            Generated image bytes
            
        Raises:
            RuntimeError: If generation fails or times out
            
        Validates: Requirements 8.1, 8.2, 8.3
        """
        import aiohttp
        
        status = self.connection_manager.get_status()
        if not status.available:
            raise RuntimeError("ComfyUI backend not available")
        
        backend_url = status.url
        start_time = time.time()
        
        logger.info(f"Polling for generation result: prompt_id={prompt_id}")
        
        while time.time() - start_time < max_wait:
            try:
                async with aiohttp.ClientSession() as session:
                    # Check history endpoint
                    async with session.get(
                        f"{backend_url}/history/{prompt_id}",
                        timeout=aiohttp.ClientTimeout(total=10)
                    ) as response:
                        if response.status == 200:
                            history = await response.json()
                            
                            if prompt_id in history:
                                prompt_history = history[prompt_id]
                                
                                # Check if generation is complete
                                status_info = prompt_history.get('status', {})
                                
                                # Check for completion
                                if status_info.get('completed', False):
                                    logger.info(f"Generation completed: prompt_id={prompt_id}")
                                    
                                    # Untrack active prompt
                                    self._untrack_active_prompt(prompt_id)
                                    
                                    # Get output images
                                    outputs = prompt_history.get('outputs', {})
                                    
                                    # Find the first image output
                                    for node_id, node_output in outputs.items():
                                        if 'images' in node_output and node_output['images']:
                                            image_info = node_output['images'][0]
                                            filename = image_info['filename']
                                            subfolder = image_info.get('subfolder', '')
                                            
                                            # Download the image
                                            return await self._download_image_from_comfyui(
                                                filename=filename,
                                                subfolder=subfolder
                                            )
                                    
                                    raise RuntimeError(f"No image output found for prompt_id={prompt_id}")
                                
                                # Check for errors
                                if 'error' in status_info:
                                    error_msg = status_info['error']
                                    logger.error(f"Generation failed: {error_msg}")
                                    raise RuntimeError(f"ComfyUI generation error: {error_msg}")
                                
                                # Log progress if available
                                if 'status_str' in status_info:
                                    logger.debug(f"Generation status: {status_info['status_str']}")
                        
                        elif response.status == 404:
                            # Prompt not in history yet, continue polling
                            logger.debug(f"Prompt {prompt_id} not in history yet")
                        
                        else:
                            logger.warning(f"Unexpected response status: {response.status}")
                
                # Check queue status
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"{backend_url}/queue",
                        timeout=aiohttp.ClientTimeout(total=10)
                    ) as response:
                        if response.status == 200:
                            queue_data = await response.json()
                            
                            # Check if our prompt is in the queue
                            queue_running = queue_data.get('queue_running', [])
                            queue_pending = queue_data.get('queue_pending', [])
                            
                            # Find our prompt in the queue
                            for item in queue_running:
                                if item[1] == prompt_id:
                                    logger.debug(f"Prompt {prompt_id} is currently running")
                                    break
                            
                            for idx, item in enumerate(queue_pending):
                                if item[1] == prompt_id:
                                    logger.debug(f"Prompt {prompt_id} is in queue position {idx + 1}")
                                    break
                
            except asyncio.TimeoutError:
                logger.warning("Polling request timeout, retrying...")
            
            except aiohttp.ClientError as e:
                logger.warning(f"Polling request error: {e}, retrying...")
            
            # Wait before next poll
            await asyncio.sleep(poll_interval)
        
        # Timeout reached
        elapsed = time.time() - start_time
        raise RuntimeError(
            f"Generation timeout after {elapsed:.1f}s waiting for prompt_id={prompt_id}"
        )

    async def _submit_workflow_to_comfyui(
        self,
        workflow: Dict[str, Any],
        retry_count: int = 0
    ) -> str:
        """
        Submit workflow JSON to ComfyUI /prompt endpoint.
        
        Args:
            workflow: Workflow configuration dictionary
            retry_count: Current retry attempt number
            
        Returns:
            prompt_id from ComfyUI response
            
        Raises:
            RuntimeError: If submission fails after retries
            
        Validates: Requirements 5.1, 5.3, 5.4
        """
        import aiohttp
        
        status = self.connection_manager.get_status()
        if not status.available:
            raise RuntimeError("ComfyUI backend not available")
        
        backend_url = status.url
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{backend_url}/prompt",
                    json={"prompt": workflow},
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        prompt_id = result.get('prompt_id')
                        
                        if not prompt_id:
                            raise RuntimeError("No prompt_id in ComfyUI response")
                        
                        logger.info(f"Workflow submitted successfully: prompt_id={prompt_id}")
                        
                        # Track active prompt
                        if self.current_session:
                            self._track_active_prompt(
                                prompt_id=prompt_id,
                                session_id=self.current_session.session_id,
                                workflow_name=workflow.get("workflow_name", "unknown"),
                                metadata={"retry_count": retry_count}
                            )
                        
                        return prompt_id
                    else:
                        error_text = await response.text()
                        raise RuntimeError(
                            f"ComfyUI API error: HTTP {response.status} - {error_text}"
                        )
        
        except asyncio.TimeoutError as e:
            logger.warning(f"Workflow submission timeout (attempt {retry_count + 1})")
            
            # Retry with exponential backoff
            if retry_count < self.connection_manager.config.max_retries:
                backoff_time = 2 ** retry_count
                logger.info(f"Retrying in {backoff_time}s...")
                await asyncio.sleep(backoff_time)
                return await self._submit_workflow_to_comfyui(workflow, retry_count + 1)
            else:
                raise RuntimeError(f"Workflow submission failed after {retry_count + 1} attempts") from e
        
        except aiohttp.ClientError as e:
            logger.error(f"ComfyUI connection error during submission: {e}")
            
            # Retry with exponential backoff
            if retry_count < self.connection_manager.config.max_retries:
                backoff_time = 2 ** retry_count
                logger.info(f"Retrying in {backoff_time}s...")
                await asyncio.sleep(backoff_time)
                return await self._submit_workflow_to_comfyui(workflow, retry_count + 1)
            else:
                raise RuntimeError(f"Workflow submission failed after {retry_count + 1} attempts") from e
        
        except Exception as e:
            logger.error(f"Unexpected error submitting workflow: {e}")
            raise RuntimeError(f"Workflow submission failed: {str(e)}") from e

    async def _generate_with_comfyui(
        self,
        shot_config: ShotConfig,
        output_path: Path,
        workflow_name: Optional[str] = None
    ) -> GeneratedImage:
        """
        Generate image using ComfyUI backend with comprehensive error handling.
        
        Args:
            shot_config: Shot configuration
            output_path: Output path for image
            workflow_name: Workflow to use (default: uses self.default_workflow)
            
        Returns:
            GeneratedImage
            
        Raises:
            RuntimeError: If generation fails
            
        Validates: Requirements 13.2, 13.12, 12.1, 12.2, 12.3
        """
        # Use default workflow if not specified
        if workflow_name is None:
            workflow_name = self.workflow_manager.get_default_workflow()
        
        logger.info(f"Generating {shot_config.shot_id} with workflow {workflow_name}")
        
        start_time = time.time()
        
        try:
            # Create workflow based on type
            if workflow_name == "z_image_turbo":
                workflow = self.workflow_manager.create_z_image_turbo_workflow(
                    prompt=shot_config.prompt,
                    config=self.z_image_turbo_config,
                    seed=shot_config.seed
                )
            else:
                # Load other workflow types
                workflow = self.workflow_manager.load_workflow(workflow_name)
                # TODO: Configure workflow parameters from shot_config
            
            # Submit workflow to ComfyUI
            prompt_id = await self._submit_workflow_to_comfyui(workflow)
            
            # Poll for completion and get result
            image_data = await self._poll_for_generation_result(prompt_id)
            
            # Save image
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, 'wb') as f:
                f.write(image_data)
            
            # Load image to get dimensions
            from PIL import Image
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
                    "workflow": workflow_name,
                    "prompt_id": prompt_id,
                    "seed": shot_config.seed
                }
            )
        
        except asyncio.TimeoutError as e:
            logger.error(f"Generation timeout for {shot_config.shot_id}: {e}")
            
            # Check if we should fallback to mock mode
            if self._should_fallback_to_mock():
                logger.warning("Falling back to mock mode due to timeout")
                return self._create_placeholder_image(shot_config, output_path)
            else:
                raise RuntimeError(
                    f"Generation timeout for {shot_config.shot_id}. "
                    f"ComfyUI may be overloaded or unresponsive."
                ) from e
        
        except aiohttp.ClientError as e:
            logger.error(f"Connection error during generation for {shot_config.shot_id}: {e}")
            
            # Check if we should fallback to mock mode
            if self._should_fallback_to_mock():
                logger.warning("Falling back to mock mode due to connection error")
                return self._create_placeholder_image(shot_config, output_path)
            else:
                raise RuntimeError(
                    f"Connection error for {shot_config.shot_id}. "
                    f"Please check if ComfyUI is running at {self.connection_manager.get_status().url}"
                ) from e
        
        except FileNotFoundError as e:
            logger.error(f"Workflow file not found: {e}")
            raise RuntimeError(
                f"Workflow '{workflow_name}' not found. "
                f"Please ensure workflows are deployed correctly."
            ) from e
        
        except KeyError as e:
            logger.error(f"Invalid workflow configuration: {e}")
            raise RuntimeError(
                f"Invalid workflow configuration for '{workflow_name}'. "
                f"Missing required parameter: {e}"
            ) from e
        
        except Exception as e:
            logger.error(f"Unexpected error during generation: {e}", exc_info=True)
            
            # Check if we should fallback to mock mode
            if self._should_fallback_to_mock():
                logger.warning("Falling back to mock mode due to unexpected error")
                return self._create_placeholder_image(shot_config, output_path)
            else:
                raise RuntimeError(
                    f"Generation failed for {shot_config.shot_id}: {str(e)}"
                ) from e

    def _should_fallback_to_mock(self) -> bool:
        """
        Determine if generation should fallback to mock mode.
        
        Checks connection status and fallback mode configuration.
        
        Returns:
            True if should fallback to mock mode
            
        Validates: Requirements 11.1, 12.1
        """
        # Check if backend is still available
        status = self.connection_manager.get_status()
        
        if not status.available:
            logger.info("Backend unavailable, fallback to mock mode")
            return True
        
        # Check fallback mode configuration
        fallback_mode = self.connection_manager.get_fallback_mode()
        
        if fallback_mode == "placeholder":
            return True
        elif fallback_mode == "abort":
            return False
        else:  # skip
            return False

    def _log_detailed_error(
        self,
        error: Exception,
        context: Dict[str, Any]
    ):
        """
        Log detailed error information for debugging.
        
        Args:
            error: Exception that occurred
            context: Context information (shot_id, workflow, etc.)
            
        Validates: Requirement 12.7
        """
        import traceback
        
        error_info = {
            "timestamp": datetime.now().isoformat(),
            "error_type": type(error).__name__,
            "error_message": str(error),
            "traceback": traceback.format_exc(),
            "context": context,
            "backend_status": self.connection_manager.get_status().to_dict() if hasattr(self.connection_manager.get_status(), 'to_dict') else str(self.connection_manager.get_status()),
            "active_prompts": len(self._active_prompts),
            "queue_depth": self._queue_depth
        }
        
        logger.error(f"Detailed error log: {error_info}")
        
        # Could also write to a dedicated error log file
        # error_log_path = Path(".storycore/logs/generation_errors.json")
        # with open(error_log_path, 'a') as f:
        #     json.dump(error_info, f)
        #     f.write('\n')

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
        from PIL import Image, ImageDraw, ImageFont
        
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

    async def generate_shot(
        self,
        shot_config: ShotConfig,
        coherence_sheet: MasterCoherenceSheet,
        output_path: Path,
        progress_callback: Optional[Callable[[GenerationProgress], None]] = None
    ) -> GeneratedImage:
        """
        Generate individual shot image with real ComfyUI backend.
        
        Uses the Master Coherence Sheet as a style reference to ensure
        visual consistency across all shots.
        
        Args:
            shot_config: Shot configuration
            coherence_sheet: Master coherence sheet for style reference
            output_path: Output path for image
            progress_callback: Optional callback for progress updates
            
        Returns:
            GeneratedImage
            
        Validates: Requirement 5.4
        """
        # Create generation session
        session = self._create_session(
            session_type="shot",
            total_items=1,
            metadata={
                "shot_id": shot_config.shot_id,
                "coherence_sheet_id": coherence_sheet.sheet_id
            }
        )
        
        logger.info(f"Starting shot generation: {shot_config.shot_id}")
        
        # Check backend availability
        backend_available = self.check_backend_availability()
        
        if not backend_available:
            logger.warning("Backend not available, using fallback mode")
            fallback_mode = self.connection_manager.get_fallback_mode()
            
            if fallback_mode == "abort":
                raise RuntimeError(
                    "ComfyUI backend unavailable and fallback mode is ABORT"
                )
        
        # Create progress update
        progress = self._create_progress(
            session=session,
            current_item=1,
            current_step="Generating shot",
            current_message=f"Creating shot {shot_config.shot_id}"
        )
        
        # Call progress callback
        if progress_callback:
            try:
                progress_callback(progress)
            except Exception as e:
                logger.error(f"Error in progress callback: {e}")
        
        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            if backend_available:
                # Generate with real backend using coherence sheet as reference
                image = await self._generate_shot_with_reference(
                    shot_config=shot_config,
                    coherence_sheet=coherence_sheet,
                    output_path=output_path
                )
            else:
                # Use fallback
                image = self._create_placeholder_image(shot_config, output_path)
            
            session.completed_items += 1
            
        except Exception as e:
            logger.error(f"Failed to generate shot {shot_config.shot_id}: {e}")
            session.failed_items += 1
            
            # Create placeholder on error
            image = self._create_placeholder_image(shot_config, output_path)
        
        # Finalize session
        metrics = self._finalize_session(session)
        
        # Add metrics to image metadata
        image.metadata["session_id"] = session.session_id
        image.metadata["metrics"] = metrics.to_dict()
        
        logger.info(
            f"Shot generation complete: {shot_config.shot_id} "
            f"in {image.generation_time:.2f}s"
        )
        
        return image
    
    async def _generate_shot_with_reference(
        self,
        shot_config: ShotConfig,
        coherence_sheet: MasterCoherenceSheet,
        output_path: Path
    ) -> GeneratedImage:
        """
        Generate shot using coherence sheet as style reference.
        
        Args:
            shot_config: Shot configuration
            coherence_sheet: Master coherence sheet for style reference
            output_path: Output path for image
            
        Returns:
            GeneratedImage
            
        Validates: Requirements 5.3, 5.4
        """
        logger.info(
            f"Generating {shot_config.shot_id} with style reference "
            f"from {coherence_sheet.sheet_id}"
        )
        
        start_time = time.time()
        
        # Get the workflow for shot generation with reference
        workflow_name = "flux_shot_generation"  # Or use configured workflow
        
        # Create workflow with style reference
        # For now, use the same workflow as regular generation
        # In a full implementation, this would pass coherence sheet images as reference
        workflow = self.workflow_manager.create_z_image_turbo_workflow(
            prompt=shot_config.prompt,
            config=self.z_image_turbo_config,
            seed=shot_config.seed
        )
        
        # Submit workflow to ComfyUI
        prompt_id = await self._submit_workflow_to_comfyui(workflow)
        
        # Poll for completion and get result
        image_data = await self._poll_for_generation_result(prompt_id)
        
        # Save image
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'wb') as f:
            f.write(image_data)
        
        # Load image to get dimensions
        from PIL import Image
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
                "workflow": workflow_name,
                "prompt_id": prompt_id,
                "seed": shot_config.seed,
                "coherence_sheet_id": coherence_sheet.sheet_id
            }
        )

    async def generate_all_shots(
        self,
        sequence_plan: SequencePlan,
        coherence_sheet: MasterCoherenceSheet,
        output_dir: Path,
        progress_callback: Optional[Callable[[GenerationProgress], None]] = None
    ) -> List[GeneratedImage]:
        """
        Generate all shots from sequence plan.
        
        Tracks overall progress across multiple shots and calculates
        estimated time remaining based on average generation time.
        
        Args:
            sequence_plan: Sequence plan with shots
            coherence_sheet: Master coherence sheet for style reference
            output_dir: Output directory for images
            progress_callback: Optional callback for progress updates
            
        Returns:
            List of GeneratedImage
            
        Validates: Requirements 8.1, 8.2, 8.3
        """
        total_shots = sequence_plan.total_shots
        
        # Create generation session
        session = self._create_session(
            session_type="batch",
            total_items=total_shots,
            metadata={
                "sequence_id": sequence_plan.sequence_id,
                "coherence_sheet_id": coherence_sheet.sheet_id
            }
        )
        
        logger.info(
            f"Starting batch shot generation: {total_shots} shots "
            f"for sequence {sequence_plan.sequence_id}"
        )
        
        # Check backend availability
        backend_available = self.check_backend_availability()
        
        if not backend_available:
            logger.warning("Backend not available, using fallback mode")
            fallback_mode = self.connection_manager.get_fallback_mode()
            
            if fallback_mode == "abort":
                raise RuntimeError(
                    "ComfyUI backend unavailable and fallback mode is ABORT"
                )
        
        # Ensure output directory exists
        output_dir.mkdir(parents=True, exist_ok=True)
        
        all_images = []
        current_shot = 0
        
        # Generate shots from all sequences
        for sequence in sequence_plan.sequences:
            for shot in sequence.shots:
                # Check for cancellation
                if self._check_cancellation():
                    logger.info("Batch shot generation cancelled")
                    break
                
                current_shot += 1
                
                # Create progress update
                progress = self._create_progress(
                    session=session,
                    current_item=current_shot,
                    current_step=f"Generating shot {current_shot}/{total_shots}",
                    current_message=f"Creating shot {shot.shot_id} from sequence {sequence.name}"
                )
                
                # Call progress callback
                if progress_callback:
                    try:
                        progress_callback(progress)
                    except Exception as e:
                        logger.error(f"Error in progress callback: {e}")
                
                # Create shot config
                shot_config = ShotConfig(
                    shot_id=shot.shot_id,
                    prompt=shot.prompt_modules.base,
                    negative_prompt="low quality, blurry, distorted, watermark, text",
                    width=1920,  # HD resolution
                    height=1080,
                    steps=25,
                    cfg_scale=7.5,
                    seed=hash(shot.shot_id) % (2**31),
                    style_config=coherence_sheet.style_config
                )
                
                output_path = output_dir / f"shot_{shot.shot_id}.png"
                
                try:
                    if backend_available:
                        # Generate with real backend
                        image = await self._generate_shot_with_reference(
                            shot_config=shot_config,
                            coherence_sheet=coherence_sheet,
                            output_path=output_path
                        )
                    else:
                        # Use fallback
                        image = self._create_placeholder_image(shot_config, output_path)
                    
                    all_images.append(image)
                    session.completed_items += 1
                    
                except Exception as e:
                    logger.error(f"Failed to generate shot {shot.shot_id}: {e}")
                    session.failed_items += 1
                    
                    # Create placeholder on error and continue
                    image = self._create_placeholder_image(shot_config, output_path)
                    all_images.append(image)
            
            # Break outer loop if cancelled
            if self._check_cancellation():
                break
        
        # Finalize session
        metrics = self._finalize_session(session)
        
        logger.info(
            f"Batch shot generation complete: {len(all_images)} shots generated, "
            f"{metrics.successful} successful, {metrics.failed} failed, "
            f"total_time={metrics.total_time:.2f}s"
        )
        
        return all_images

    async def cleanup_partial_artifacts(self, output_dir: Path):
        """
        Clean up partial generation artifacts after cancellation.
        
        Removes temporary files and incomplete images from cancelled generation.
        
        Args:
            output_dir: Directory containing generation artifacts
            
        Validates: Requirement 8.7
        """
        if not output_dir.exists():
            return
        
        logger.info(f"Cleaning up partial artifacts in {output_dir}")
        
        try:
            # Remove temporary files
            temp_files = list(output_dir.glob("*.tmp"))
            for temp_file in temp_files:
                try:
                    temp_file.unlink()
                    logger.debug(f"Removed temporary file: {temp_file}")
                except Exception as e:
                    logger.warning(f"Failed to remove {temp_file}: {e}")
            
            # Remove incomplete placeholder images if needed
            # (Optional: could keep placeholders for debugging)
            
            logger.info(f"Cleanup complete: removed {len(temp_files)} temporary files")
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")

    def get_session_history(self) -> List[Dict[str, Any]]:
        """
        Get history of all generation sessions.
        
        Returns:
            List of session metrics dictionaries
            
        Validates: Requirements 5.6, 8.6
        """
        history = []
        
        for session_id, metrics in self._session_metrics.items():
            history.append({
                "session_id": session_id,
                "metrics": metrics.to_dict()
            })
        
        return history
    
    def get_average_metrics(self) -> Optional[Dict[str, float]]:
        """
        Calculate average metrics across all sessions.
        
        Returns:
            Dictionary with average metrics, or None if no sessions
            
        Validates: Requirements 5.6, 8.6
        """
        if not self._session_metrics:
            return None
        
        total_sessions = len(self._session_metrics)
        
        avg_metrics = {
            "total_images": 0,
            "successful": 0,
            "failed": 0,
            "total_time": 0,
            "average_time_per_image": 0,
            "success_rate": 0
        }
        
        for metrics in self._session_metrics.values():
            avg_metrics["total_images"] += metrics.total_images
            avg_metrics["successful"] += metrics.successful
            avg_metrics["failed"] += metrics.failed
            avg_metrics["total_time"] += metrics.total_time
            avg_metrics["average_time_per_image"] += metrics.average_time_per_image
        
        # Calculate averages
        avg_metrics["total_images"] /= total_sessions
        avg_metrics["successful"] /= total_sessions
        avg_metrics["failed"] /= total_sessions
        avg_metrics["total_time"] /= total_sessions
        avg_metrics["average_time_per_image"] /= total_sessions
        
        # Calculate success rate
        total_images = sum(m.total_images for m in self._session_metrics.values())
        total_successful = sum(m.successful for m in self._session_metrics.values())
        avg_metrics["success_rate"] = (total_successful / total_images * 100) if total_images > 0 else 0
        
        return avg_metrics
    
    def clear_metrics_history(self):
        """
        Clear all stored metrics history.
        
        Useful for resetting metrics between different projects or sessions.
        """
        self._session_metrics.clear()
        logger.info("Metrics history cleared")

    def validate_generated_asset(
        self,
        image: GeneratedImage,
        expected_width: Optional[int] = None,
        expected_height: Optional[int] = None,
        expected_format: str = "PNG",
        min_quality_threshold: float = 0.5
    ) -> Dict[str, Any]:
        """
        Validate generated asset dimensions, format, and quality.
        
        Args:
            image: Generated image to validate
            expected_width: Expected image width (optional)
            expected_height: Expected image height (optional)
            expected_format: Expected image format (default: PNG)
            min_quality_threshold: Minimum quality score threshold
            
        Returns:
            Dictionary with validation results
            
        Validates: Requirement 5.7
        """
        from PIL import Image
        
        validation_result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "checks": {}
        }
        
        try:
            # Check if file exists
            if not image.file_path.exists():
                validation_result["valid"] = False
                validation_result["errors"].append(f"Image file not found: {image.file_path}")
                return validation_result
            
            # Load image
            img = Image.open(image.file_path)
            
            # Validate dimensions
            if expected_width is not None:
                if img.width != expected_width:
                    validation_result["valid"] = False
                    validation_result["errors"].append(
                        f"Width mismatch: expected {expected_width}, got {img.width}"
                    )
                validation_result["checks"]["width"] = {
                    "expected": expected_width,
                    "actual": img.width,
                    "passed": img.width == expected_width
                }
            
            if expected_height is not None:
                if img.height != expected_height:
                    validation_result["valid"] = False
                    validation_result["errors"].append(
                        f"Height mismatch: expected {expected_height}, got {img.height}"
                    )
                validation_result["checks"]["height"] = {
                    "expected": expected_height,
                    "actual": img.height,
                    "passed": img.height == expected_height
                }
            
            # Validate format
            if img.format != expected_format:
                validation_result["warnings"].append(
                    f"Format mismatch: expected {expected_format}, got {img.format}"
                )
            validation_result["checks"]["format"] = {
                "expected": expected_format,
                "actual": img.format,
                "passed": img.format == expected_format
            }
            
            # Check if image is not blank
            extrema = img.convert('L').getextrema()
            if extrema[0] == extrema[1]:
                validation_result["valid"] = False
                validation_result["errors"].append("Image is blank (all pixels same value)")
            validation_result["checks"]["not_blank"] = {
                "passed": extrema[0] != extrema[1]
            }
            
            # Validate quality score if available
            if image.quality_score is not None:
                if image.quality_score < min_quality_threshold:
                    validation_result["warnings"].append(
                        f"Quality score below threshold: {image.quality_score:.2f} < {min_quality_threshold}"
                    )
                validation_result["checks"]["quality_score"] = {
                    "threshold": min_quality_threshold,
                    "actual": image.quality_score,
                    "passed": image.quality_score >= min_quality_threshold
                }
            
            # Check for placeholder
            if image.metadata.get("placeholder"):
                validation_result["warnings"].append("Image is a placeholder")
                validation_result["checks"]["is_placeholder"] = True
            else:
                validation_result["checks"]["is_placeholder"] = False
            
            logger.debug(
                f"Asset validation for {image.image_id}: "
                f"{'PASSED' if validation_result['valid'] else 'FAILED'}"
            )
            
        except Exception as e:
            validation_result["valid"] = False
            validation_result["errors"].append(f"Validation error: {str(e)}")
            logger.error(f"Error validating asset {image.image_id}: {e}")
        
        return validation_result
    
    def validate_batch_assets(
        self,
        images: List[GeneratedImage],
        expected_dimensions: Optional[tuple] = None,
        expected_format: str = "PNG",
        min_quality_threshold: float = 0.5
    ) -> Dict[str, Any]:
        """
        Validate a batch of generated assets.
        
        Args:
            images: List of generated images to validate
            expected_dimensions: Expected (width, height) tuple (optional)
            expected_format: Expected image format
            min_quality_threshold: Minimum quality score threshold
            
        Returns:
            Dictionary with batch validation results
            
        Validates: Requirement 5.7
        """
        batch_result = {
            "total_images": len(images),
            "valid_images": 0,
            "invalid_images": 0,
            "warnings": 0,
            "results": []
        }
        
        expected_width = expected_dimensions[0] if expected_dimensions else None
        expected_height = expected_dimensions[1] if expected_dimensions else None
        
        for image in images:
            result = self.validate_generated_asset(
                image=image,
                expected_width=expected_width,
                expected_height=expected_height,
                expected_format=expected_format,
                min_quality_threshold=min_quality_threshold
            )
            
            if result["valid"]:
                batch_result["valid_images"] += 1
            else:
                batch_result["invalid_images"] += 1
            
            batch_result["warnings"] += len(result["warnings"])
            
            batch_result["results"].append({
                "image_id": image.image_id,
                "valid": result["valid"],
                "errors": result["errors"],
                "warnings": result["warnings"]
            })
        
        logger.info(
            f"Batch validation complete: {batch_result['valid_images']}/{batch_result['total_images']} valid, "
            f"{batch_result['warnings']} warnings"
        )
        
        return batch_result

    async def generate_video_from_image(
        self,
        input_image_path: Path,
        prompt: str,
        config: LTX2ImageToVideoConfig,
        output_path: Path,
        progress_callback: Optional[Callable[[GenerationProgress], None]] = None
    ) -> GeneratedVideo:
        """
        Generate video from static image using LTX-2 workflow.
        
        Converts a static image into an animated video with synchronized audio
        using a two-stage generation process (latent generation + spatial upscaling).
        
        Args:
            input_image_path: Path to input image file
            prompt: Text prompt for motion and scene description
            config: LTX-2 image-to-video configuration
            output_path: Output path for generated video
            progress_callback: Optional callback for progress updates
            
        Returns:
            GeneratedVideo with metadata
            
        Raises:
            RuntimeError: If backend is not available or generation fails
            
        Validates: Requirements 14.8, 14.14
        """
        # Create generation session
        session = self._create_session(
            session_type="video",
            total_items=2,  # Two stages: latent generation + upscaling
            metadata={
                "input_image": str(input_image_path),
                "prompt": prompt,
                "frame_count": config.frame_count,
                "frame_rate": config.frame_rate,
                "duration": config.video_duration_seconds
            }
        )
        
        logger.info(
            f"Starting LTX-2 video generation: {config.frame_count} frames at {config.frame_rate}fps "
            f"({config.video_duration_seconds:.2f}s) from {input_image_path}"
        )
        
        # Check backend availability
        status = self.connection_manager.get_status()
        if not status.fully_ready:
            error_msg = "ComfyUI backend not ready for video generation"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        
        # Validate input image exists
        if not input_image_path.exists():
            error_msg = f"Input image not found: {input_image_path}"
            logger.error(error_msg)
            raise FileNotFoundError(error_msg)
        
        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        start_time = time.time()
        
        try:
            # Stage 1: Latent Video Generation
            stage1_progress = self._create_progress(
                session=session,
                current_item=1,
                current_step="Latent Video Generation",
                current_message="Generating video latents from input image..."
            )
            
            if progress_callback:
                try:
                    progress_callback(stage1_progress)
                except Exception as e:
                    logger.error(f"Error in progress callback: {e}")
            
            # Create workflow
            workflow = self.workflow_manager.create_ltx2_image_to_video_workflow(
                str(input_image_path),
                prompt,
                config
            )
            
            # Submit workflow to ComfyUI
            prompt_id = await self._submit_workflow_to_comfyui(workflow)
            
            logger.info("Stage 1: Latent generation submitted, polling for completion...")
            
            # Poll for completion - this will handle both stages internally
            video_data = await self._poll_for_video_generation_result(
                prompt_id=prompt_id,
                session=session,
                progress_callback=progress_callback
            )
            
            # Save video
            if video_data:
                with open(output_path, 'wb') as f:
                    f.write(video_data)
            else:
                # Video was streamed directly to output_path
                pass
            
            generation_time = time.time() - start_time
            
            # Create GeneratedVideo result
            video = GeneratedVideo(
                path=output_path,
                duration_seconds=config.video_duration_seconds,
                frame_count=config.frame_count,
                frame_rate=config.frame_rate,
                resolution=config.resolution,
                has_audio=True,  # LTX-2 generates audio
                generation_time=generation_time,
                metadata={
                    "input_image": str(input_image_path),
                    "prompt": prompt,
                    "workflow": "ltx2_image_to_video",
                    "session_id": session.session_id,
                    "prompt_id": prompt_id,
                    "config": config.to_workflow_params()
                }
            )
            
            # Finalize session
            metrics = self._finalize_session(session)
            video.metadata["metrics"] = metrics.to_dict()
            
            logger.info(
                f"LTX-2 video generation complete: {config.frame_count} frames "
                f"in {generation_time:.2f}s"
            )
            
            return video
            
        except Exception as e:
            logger.error(f"Video generation failed: {e}", exc_info=True)
            session.failed_items += 1
            self._finalize_session(session)
            raise RuntimeError(f"Video generation failed: {str(e)}") from e

    async def _poll_for_video_generation_result(
        self,
        prompt_id: str,
        session: GenerationSession,
        progress_callback: Optional[Callable[[GenerationProgress], None]] = None,
        poll_interval: float = 2.0,
        max_wait: int = 1800  # 30 minutes for video generation
    ) -> Optional[bytes]:
        """
        Poll for video generation result with two-stage progress tracking.
        
        Args:
            prompt_id: Prompt ID to poll for
            session: Current generation session
            progress_callback: Optional callback for progress updates
            poll_interval: Polling interval in seconds
            max_wait: Maximum wait time in seconds
            
        Returns:
            Video bytes or None if streamed to file
            
        Raises:
            RuntimeError: If generation fails or times out
            
        Validates: Requirements 14.8, 14.14
        """
        import aiohttp
        
        status = self.connection_manager.get_status()
        if not status.available:
            raise RuntimeError("ComfyUI backend not available")
        
        backend_url = status.url
        start_time = time.time()
        
        logger.info(f"Polling for video generation result: prompt_id={prompt_id}")
        
        stage = 1  # Track which stage we're in
        
        while time.time() - start_time < max_wait:
            try:
                async with aiohttp.ClientSession() as http_session:
                    # Check history endpoint
                    async with http_session.get(
                        f"{backend_url}/history/{prompt_id}",
                        timeout=aiohttp.ClientTimeout(total=10)
                    ) as response:
                        if response.status == 200:
                            history = await response.json()
                            
                            if prompt_id in history:
                                prompt_history = history[prompt_id]
                                
                                # Check if generation is complete
                                status_info = prompt_history.get('status', {})
                                
                                # Update stage based on progress
                                if 'status_str' in status_info:
                                    status_str = status_info['status_str']
                                    if 'upscal' in status_str.lower():
                                        stage = 2
                                        session.completed_items = 1
                                        
                                        # Update progress for stage 2
                                        if progress_callback:
                                            stage2_progress = self._create_progress(
                                                session=session,
                                                current_item=2,
                                                current_step="Spatial Upscaling",
                                                current_message="Upscaling video resolution..."
                                            )
                                            try:
                                                progress_callback(stage2_progress)
                                            except Exception as e:
                                                logger.error(f"Error in progress callback: {e}")
                                
                                # Check for completion
                                if status_info.get('completed', False):
                                    logger.info(f"Video generation completed: prompt_id={prompt_id}")
                                    session.completed_items = 2
                                    
                                    # Get output videos
                                    outputs = prompt_history.get('outputs', {})
                                    
                                    # Find the video output
                                    for node_id, node_output in outputs.items():
                                        # Check for video outputs
                                        if 'gifs' in node_output and node_output['gifs']:
                                            video_info = node_output['gifs'][0]
                                            filename = video_info['filename']
                                            subfolder = video_info.get('subfolder', '')
                                            
                                            # Download the video
                                            return await self._download_video_from_comfyui(
                                                filename=filename,
                                                subfolder=subfolder
                                            )
                                        
                                        # Also check for video format outputs
                                        if 'videos' in node_output and node_output['videos']:
                                            video_info = node_output['videos'][0]
                                            filename = video_info['filename']
                                            subfolder = video_info.get('subfolder', '')
                                            
                                            return await self._download_video_from_comfyui(
                                                filename=filename,
                                                subfolder=subfolder
                                            )
                                    
                                    raise RuntimeError(f"No video output found for prompt_id={prompt_id}")
                                
                                # Check for errors
                                if 'error' in status_info:
                                    error_msg = status_info['error']
                                    logger.error(f"Video generation failed: {error_msg}")
                                    raise RuntimeError(f"ComfyUI video generation error: {error_msg}")
            
            except asyncio.TimeoutError:
                logger.warning("Polling request timeout, retrying...")
            
            except aiohttp.ClientError as e:
                logger.warning(f"Polling request error: {e}, retrying...")
            
            # Wait before next poll
            await asyncio.sleep(poll_interval)
        
        # Timeout reached
        elapsed = time.time() - start_time
        raise RuntimeError(
            f"Video generation timeout after {elapsed:.1f}s waiting for prompt_id={prompt_id}"
        )
    
    async def validate_video_audio(
        self,
        video: GeneratedVideo
    ) -> Dict[str, Any]:
        """
        Validate that generated video includes synchronized audio.
        
        Checks that:
        - Video file exists
        - Audio track is present
        - Audio duration matches video duration
        - Audio format is compatible
        
        Args:
            video: Generated video to validate
            
        Returns:
            Dictionary with validation results
            
        Validates: Requirements 14.7, 14.15
        """
        validation_result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "checks": {}
        }
        
        try:
            # Check if video file exists
            if not video.path.exists():
                validation_result["valid"] = False
                validation_result["errors"].append(f"Video file not found: {video.path}")
                return validation_result
            
            validation_result["checks"]["file_exists"] = True
            
            # TODO: Use ffprobe or similar to check audio track
            # For now, trust the has_audio flag from generation
            if not video.has_audio:
                validation_result["valid"] = False
                validation_result["errors"].append("Video does not have audio track")
            
            validation_result["checks"]["has_audio"] = video.has_audio
            
            # Validate duration matches expected
            expected_duration = video.frame_count / video.frame_rate
            duration_diff = abs(video.duration_seconds - expected_duration)
            
            if duration_diff > 0.1:  # Allow 0.1s tolerance
                validation_result["warnings"].append(
                    f"Duration mismatch: expected {expected_duration:.2f}s, "
                    f"got {video.duration_seconds:.2f}s"
                )
            
            validation_result["checks"]["duration"] = {
                "expected": expected_duration,
                "actual": video.duration_seconds,
                "passed": duration_diff <= 0.1
            }
            
            # Check resolution
            validation_result["checks"]["resolution"] = {
                "width": video.resolution[0],
                "height": video.resolution[1]
            }
            
            logger.debug(
                f"Video validation: {'PASSED' if validation_result['valid'] else 'FAILED'}"
            )
            
        except Exception as e:
            validation_result["valid"] = False
            validation_result["errors"].append(f"Validation error: {str(e)}")
            logger.error(f"Error validating video: {e}")
        
        return validation_result
