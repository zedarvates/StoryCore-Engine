"""
Core Wan Video Integration Module
"""

import asyncio
import logging
import time
from typing import Any, Dict, Optional

try:
    from ..advanced_workflow_config import WanVideoConfig
    from ..advanced_model_manager import AdvancedModelManager
    from ..comfyui_integration_manager import ComfyUIIntegrationManager
    from ..comfy_client import ComfyUIClient
except ImportError:
    from advanced_workflow_config import WanVideoConfig
    from advanced_model_manager import AdvancedModelManager
    from comfyui_integration_manager import ComfyUIIntegrationManager
    from comfy_client import ComfyUIClient

from .inpainting import VideoInpaintingProcessor
from .alpha import AlphaChannelGenerator
from .lora import LoRAAdapter
from .guidance import DualImageGuidanceSystem
from .compositing import CompositingPipeline
from .workflows import WanVideoWorkflowsMixin
from .generation import WanVideoGenerationMixin
from .info import WanVideoInfoMixin

logger = logging.getLogger(__name__)


class WanVideoIntegration(WanVideoWorkflowsMixin, WanVideoGenerationMixin, WanVideoInfoMixin):
    """
    Main integration class for Wan Video 2.2 workflows

    Provides:
    - Video inpainting with multi-stage processing
    - Alpha channel generation and transparent backgrounds
    - LoRA-accelerated inference
    - Dual image guidance system
    - Video compositing pipeline

    NON-BLOCKING DESIGN:
    - All operations use async/await patterns
    - Timeout mechanisms prevent hanging
    - Circuit breaker prevents cascading failures
    - State machine ensures no infinite loops
    - Progress tracking with cancellation support
    """

    def __init__(
        self,
        config: WanVideoConfig,
        model_manager: Optional[AdvancedModelManager] = None,
        timeout_seconds: float = 300.0,
        enable_circuit_breaker: bool = True,
        comfyui_base_url: str = "http://127.0.0.1:8188"
    ):
        """
        Initialize Wan Video integration

        Args:
            config: Wan Video configuration
            model_manager: Optional model manager for model loading
            timeout_seconds: Default timeout for operations (default: 5 minutes)
            enable_circuit_breaker: Enable circuit breaker pattern
            comfyui_base_url: ComfyUI server URL
        """
        self.config = config
        self.model_manager = model_manager
        self.timeout_seconds = timeout_seconds

        # Initialize ComfyUI integration
        self.comfyui_manager = ComfyUIIntegrationManager(
            base_url=comfyui_base_url,
            workflow_path=None  # Will be set per operation
        )
        self.comfyui_initialized = False

        # Initialize subsystems (kept for compatibility but will be replaced by ComfyUI calls)
        self.inpainting_processor = VideoInpaintingProcessor(config)
        self.alpha_generator = AlphaChannelGenerator(config)
        self.lora_adapter = LoRAAdapter(config)
        self.guidance_system = DualImageGuidanceSystem(config)
        self.compositing_pipeline = CompositingPipeline(config)

        # Model state
        self.model_loaded = False
        self.models: Dict[str, Any] = {}

        # Non-blocking state management
        self._operation_in_progress = False
        self._cancellation_requested = False
        self._current_operation: Optional[str] = None

        # Circuit breaker for resilience
        self._circuit_breaker_enabled = enable_circuit_breaker
        self._failure_count = 0
        self._max_failures = 5
        self._circuit_open = False
        self._last_failure_time: Optional[float] = None
        self._circuit_reset_timeout = 60.0  # seconds

        # Performance tracking
        self.generation_stats = {
            'inpainting_count': 0,
            'alpha_generation_count': 0,
            'compositing_count': 0,
            'total_frames': 0,
            'total_time': 0.0,
            'timeouts': 0,
            'failures': 0,
            'cancellations': 0
        }

        logger.info("WanVideoIntegration initialized (NON-BLOCKING MODE)")
        logger.info(f"Config: {config.width}x{config.height}, {config.num_frames} frames")
        logger.info(f"Timeout: {timeout_seconds}s, Circuit breaker: {enable_circuit_breaker}")
        logger.info(f"ComfyUI URL: {comfyui_base_url}")

    def _check_circuit_breaker(self) -> bool:
        """
        Check if circuit breaker allows operation

        Returns:
            True if operation allowed, False if circuit is open
        """
        if not self._circuit_breaker_enabled:
            return True

        # Check if circuit is open
        if self._circuit_open:
            # Check if timeout has passed
            if self._last_failure_time:
                elapsed = time.time() - self._last_failure_time
                if elapsed >= self._circuit_reset_timeout:
                    logger.info("Circuit breaker timeout passed, attempting reset")
                    self._circuit_open = False
                    self._failure_count = 0
                    return True

            logger.warning("Circuit breaker is OPEN, rejecting operation")
            return False

        return True

    def _record_success(self):
        """Record successful operation for circuit breaker"""
        if self._circuit_breaker_enabled:
            self._failure_count = max(0, self._failure_count - 1)
            if self._failure_count == 0:
                self._circuit_open = False

    def _record_failure(self):
        """Record failed operation for circuit breaker"""
        if self._circuit_breaker_enabled:
            self._failure_count += 1
            self._last_failure_time = time.time()

            if self._failure_count >= self._max_failures:
                logger.error(f"Circuit breaker OPENED after {self._failure_count} failures")
                self._circuit_open = True

            self.generation_stats['failures'] += 1

    def request_cancellation(self):
        """Request cancellation of current operation"""
        self._cancellation_requested = True
        logger.warning("Cancellation requested for current operation")

    def _check_cancellation(self):
        """Check if cancellation was requested"""
        if self._cancellation_requested:
            self._cancellation_requested = False
            self.generation_stats['cancellations'] += 1
            raise asyncio.CancelledError("Operation cancelled by user request")

    async def _with_timeout(self, coro, timeout: Optional[float] = None,
                           operation_name: str = "operation"):
        """
        Execute coroutine with timeout

        Args:
            coro: Coroutine to execute
            timeout: Timeout in seconds (uses default if None)
            operation_name: Name of operation for logging

        Returns:
            Result of coroutine

        Raises:
            asyncio.TimeoutError: If operation times out
        """
        timeout = timeout or self.timeout_seconds

        try:
            self._current_operation = operation_name
            result = await asyncio.wait_for(coro, timeout=timeout)
            self._current_operation = None
            return result
        except asyncio.TimeoutError:
            self._current_operation = None
            self.generation_stats['timeouts'] += 1
            logger.error(f"Operation '{operation_name}' timed out after {timeout}s")
            raise

    async def cleanup(self):
        """Cleanup resources (NON-BLOCKING)"""
        logger.info("Cleaning up Wan Video integration")

        # Cancel any ongoing operations
        if self._operation_in_progress:
            self.request_cancellation()
            await asyncio.sleep(0.1)  # Give time for cancellation

        # Reset state
        self._operation_in_progress = False
        self._cancellation_requested = False
        self._current_operation = None

        # Unload models if model manager is available
        if self.model_manager:
            try:
                # Note: These would be actual model names in production
                pass
            except Exception as e:
                logger.warning(f"Error unloading models: {e}")

        self.model_loaded = False
        self.models = {}

        logger.info("Wan Video integration cleaned up")