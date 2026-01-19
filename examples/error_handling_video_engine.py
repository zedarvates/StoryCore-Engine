#!/usr/bin/env python3
"""
Example: Error handling in video processing workflows with GPU failure recovery,
CPU fallback, and graceful degradation patterns.
"""

import sys
import logging
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any, List, Callable
from dataclasses import dataclass
from enum import Enum

# Add src directory to path for imports
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

from advanced_error_handling import (
    ResilienceManager,
    RetryManager,
    CircuitBreaker,
    FallbackManager,
    RetryConfig,
    RetryStrategy,
    CircuitBreakerConfig,
    FallbackChain,
    ErrorCategory,
    ErrorSeverity
)
from ai_error_handler import (
    AIErrorHandler,
    ErrorHandlerConfig,
    AIError,
    InferenceError,
    ResourceExhaustionError
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VideoProcessingMode(Enum):
    """Video processing modes with different quality/compute requirements"""
    GPU_HIGH_QUALITY = "gpu_high_quality"
    GPU_STANDARD = "gpu_standard"
    CPU_FALLBACK = "cpu_fallback"
    BASIC_FALLBACK = "basic_fallback"

@dataclass
class VideoProcessingResult:
    """Result of video processing attempt"""
    success: bool
    output_path: Optional[Path] = None
    processing_mode: VideoProcessingMode = VideoProcessingMode.GPU_HIGH_QUALITY
    processing_time_seconds: float = 0.0
    errors: List[str] = None
    fallback_used: bool = False
    retry_count: int = 0

    def __post_init__(self):
        if self.errors is None:
            self.errors = []

class VideoEngineErrorHandler:
    """Handles video processing errors with GPU failure recovery and CPU fallback"""

    def __init__(self):
        self.resilience_manager = ResilienceManager()
        self.retry_manager = RetryManager()
        self.fallback_manager = FallbackManager()
        self.ai_error_handler = AIErrorHandler(ErrorHandlerConfig(
            max_retries=3,
            enable_cpu_fallback=True,
            enable_quality_degradation=True
        ))

        # Circuit breaker for GPU operations
        self.gpu_circuit_breaker = self.resilience_manager.create_circuit_breaker(
            "gpu_video_processing",
            CircuitBreakerConfig(
                failure_threshold=3,
                recovery_timeout=300,  # 5 minutes
                name="gpu_video_breaker"
            )
        )

        # Setup fallback chains
        self._setup_fallback_chains()

        # Recovery procedures
        self._setup_recovery_procedures()

    def _setup_fallback_chains(self):
        """Setup fallback chains for different processing modes"""
        self.fallback_chains = {}

        # GPU High Quality -> GPU Standard -> CPU -> Basic
        high_quality_chain = FallbackChain(
            primary_function=self._process_gpu_high_quality,
            fallback_functions=[
                self._process_gpu_standard,
                self._process_cpu_fallback,
                self._process_basic_fallback
            ],
            max_fallback_attempts=3
        )
        self.fallback_chains[VideoProcessingMode.GPU_HIGH_QUALITY] = high_quality_chain

        # GPU Standard -> CPU -> Basic
        standard_chain = FallbackChain(
            primary_function=self._process_gpu_standard,
            fallback_functions=[
                self._process_cpu_fallback,
                self._process_basic_fallback
            ],
            max_fallback_attempts=2
        )
        self.fallback_chains[VideoProcessingMode.GPU_STANDARD] = standard_chain

    def _setup_recovery_procedures(self):
        """Setup recovery procedures for different error types"""
        # GPU memory recovery
        async def gpu_memory_recovery(error_info):
            logger.info("Attempting GPU memory recovery...")
            # Simulate GPU cache clearing
            await asyncio.sleep(0.1)
            return True

        # Network recovery for model downloads
        async def network_recovery(error_info):
            logger.info("Attempting network recovery...")
            await asyncio.sleep(0.2)
            return True

        recovery_manager = self.resilience_manager.recovery_manager
        recovery_manager.register_recovery_procedure(ErrorCategory.GPU, gpu_memory_recovery)
        recovery_manager.register_recovery_procedure(ErrorCategory.NETWORK, network_recovery)

    async def _process_gpu_high_quality(self, video_path: Path, output_path: Path) -> VideoProcessingResult:
        """Process video using high-quality GPU mode"""
        logger.info("Processing video with GPU high quality mode")

        @self.gpu_circuit_breaker
        async def gpu_operation():
            # Simulate GPU processing with potential failure
            if video_path.name == "corrupt_video.mp4":
                raise InferenceError("GPU inference failed: corrupted input", model_id="video_model")
            if video_path.name == "large_video.mp4":
                raise ResourceExhaustionError("GPU memory exhausted", resource="VRAM")

            await asyncio.sleep(0.5)  # Simulate processing time
            return VideoProcessingResult(
                success=True,
                output_path=output_path,
                processing_mode=VideoProcessingMode.GPU_HIGH_QUALITY,
                processing_time_seconds=0.5
            )

        try:
            return await gpu_operation()
        except Exception as e:
            logger.warning(f"GPU high quality processing failed: {e}")
            raise

    async def _process_gpu_standard(self, video_path: Path, output_path: Path) -> VideoProcessingResult:
        """Process video using standard GPU mode"""
        logger.info("Processing video with GPU standard mode")

        @self.gpu_circuit_breaker
        async def gpu_operation():
            await asyncio.sleep(0.3)  # Faster processing
            return VideoProcessingResult(
                success=True,
                output_path=output_path,
                processing_mode=VideoProcessingMode.GPU_STANDARD,
                processing_time_seconds=0.3
            )

        try:
            return await gpu_operation()
        except Exception as e:
            logger.warning(f"GPU standard processing failed: {e}")
            raise

    async def _process_cpu_fallback(self, video_path: Path, output_path: Path) -> VideoProcessingResult:
        """Process video using CPU fallback mode"""
        logger.info("Processing video with CPU fallback mode")
        await asyncio.sleep(2.0)  # Slower but reliable
        return VideoProcessingResult(
            success=True,
            output_path=output_path,
            processing_mode=VideoProcessingMode.CPU_FALLBACK,
            processing_time_seconds=2.0,
            fallback_used=True
        )

    async def _process_basic_fallback(self, video_path: Path, output_path: Path) -> VideoProcessingResult:
        """Process video using basic fallback mode (minimal processing)"""
        logger.info("Processing video with basic fallback mode")
        await asyncio.sleep(0.1)  # Very basic processing
        return VideoProcessingResult(
            success=True,
            output_path=output_path,
            processing_mode=VideoProcessingMode.BASIC_FALLBACK,
            processing_time_seconds=0.1,
            fallback_used=True
        )

    async def process_video_with_resilience(self, video_path: Path, output_path: Path,
                                          preferred_mode: VideoProcessingMode = VideoProcessingMode.GPU_HIGH_QUALITY) -> VideoProcessingResult:
        """
        Process video with comprehensive error handling and fallback strategies

        Args:
            video_path: Path to input video file
            output_path: Path for output video file
            preferred_mode: Preferred processing mode

        Returns:
            VideoProcessingResult with processing outcome
        """
        logger.info(f"Starting resilient video processing for {video_path.name}")

        # Retry configuration for transient failures
        retry_config = RetryConfig(
            max_attempts=2,
            strategy=RetryStrategy.EXPONENTIAL_BACKOFF,
            base_delay=1.0
        )

        try:
            # Execute with fallback chain
            chain = self.fallback_chains.get(preferred_mode, self.fallback_chains[VideoProcessingMode.GPU_HIGH_QUALITY])

            result = await self.retry_manager.retry_async(
                lambda: self.fallback_manager.execute_with_fallback(chain, video_path, output_path),
                retry_config
            )

            logger.info(f"Video processing completed successfully in {result.processing_mode.value} mode")
            return result

        except Exception as e:
            # Comprehensive error handling
            error_info = await self.resilience_manager.handle_error(e, {
                "component": "VideoEngine",
                "operation": "process_video",
                "video_path": str(video_path),
                "preferred_mode": preferred_mode.value
            })

            # Attempt recovery
            recovery_success = await self.resilience_manager.recovery_manager.attempt_recovery(error_info)

            if recovery_success:
                logger.info("Error recovery successful, retrying...")
                try:
                    # Retry once more after recovery
                    result = await self.fallback_manager.execute_with_fallback(chain, video_path, output_path)
                    result.retry_count += 1
                    return result
                except Exception as e2:
                    logger.error(f"Processing failed even after recovery: {e2}")

            # Final fallback: basic processing
            logger.warning("Using emergency basic processing")
            try:
                return await self._process_basic_fallback(video_path, output_path)
            except Exception as e3:
                logger.error(f"Emergency processing failed: {e3}")
                return VideoProcessingResult(
                    success=False,
                    errors=[f"Processing failed: {str(e)}", f"Recovery failed: {str(e3)}"]
                )

    def get_processing_stats(self) -> Dict[str, Any]:
        """Get comprehensive processing statistics"""
        return {
            "circuit_breaker_status": self.gpu_circuit_breaker.get_state(),
            "retry_stats": self.retry_manager.get_retry_stats(),
            "fallback_stats": self.fallback_manager.get_fallback_stats(),
            "recovery_stats": self.resilience_manager.recovery_manager.get_recovery_stats(),
            "resilience_status": self.resilience_manager.get_resilience_status()
        }

async def main():
    """Demonstrate video processing error handling patterns"""
    print("=== Video Engine Error Handling Demo ===\n")

    handler = VideoEngineErrorHandler()

    # Test scenarios
    test_cases = [
        ("normal_video.mp4", "Normal video processing"),
        ("large_video.mp4", "Large video (GPU memory exhaustion)"),
        ("corrupt_video.mp4", "Corrupted video (inference failure)"),
    ]

    for video_file, description in test_cases:
        print(f"Testing: {description}")
        video_path = Path(f"test_videos/{video_file}")
        output_path = Path(f"output/{video_file}")

        try:
            result = await handler.process_video_with_resilience(video_path, output_path)

            if result.success:
                print(f"✅ Success: Mode={result.processing_mode.value}, "
                      f"Time={result.processing_time_seconds:.1f}s, "
                      f"Fallback={result.fallback_used}")
            else:
                print(f"❌ Failed: {', '.join(result.errors)}")

        except Exception as e:
            print(f"❌ Unexpected error: {e}")

        print()

    # Display final statistics
    print("=== Processing Statistics ===")
    stats = handler.get_processing_stats()

    print(f"Circuit Breaker State: {stats['circuit_breaker_status']['state']}")
    print(f"Total Retries: {sum(sum(counts.values()) for counts in stats['retry_stats'].values())}")
    print(f"Fallback Executions: {sum(sum(counts.values()) for counts in stats['fallback_stats'].values())}")
    print(f"Recovery Attempts: {sum(sum(counts.values()) for counts in stats['recovery_stats'].values())}")

if __name__ == "__main__":
    asyncio.run(main())