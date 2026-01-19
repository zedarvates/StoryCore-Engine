#!/usr/bin/env python3
"""
Example: Error handling in image generation/processing with circuit breaker patterns
for model failures and fallback chains for different image engines.
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
    CircuitBreaker,
    FallbackManager,
    RetryManager,
    CircuitBreakerConfig,
    FallbackChain,
    RetryConfig,
    RetryStrategy,
    ErrorCategory
)
from ai_error_handler import (
    AIErrorHandler,
    ErrorHandlerConfig,
    AIError,
    ModelLoadingError,
    InferenceError,
    ResourceExhaustionError,
    FallbackStrategy
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ImageEngine(Enum):
    """Available image generation/processing engines"""
    STABLE_DIFFUSION_XL = "stable_diffusion_xl"
    DALL_E = "dall_e"
    MIDJOURNEY = "midjourney"
    FLUX = "flux"
    BASIC_PROCESSOR = "basic_processor"

@dataclass
class ImageGenerationRequest:
    """Request for image generation"""
    prompt: str
    width: int = 1024
    height: int = 1024
    style: str = "realistic"
    quality: str = "high"

@dataclass
class ImageProcessingResult:
    """Result of image processing attempt"""
    success: bool
    image_path: Optional[Path] = None
    engine_used: ImageEngine = ImageEngine.STABLE_DIFFUSION_XL
    processing_time_seconds: float = 0.0
    quality_degraded: bool = False
    errors: List[str] = None
    circuit_breaker_tripped: bool = False

    def __post_init__(self):
        if self.errors is None:
            self.errors = []

class ImageEngineErrorHandler:
    """Handles image processing errors with circuit breakers and fallback chains"""

    def __init__(self):
        self.resilience_manager = ResilienceManager()
        self.ai_error_handler = AIErrorHandler(ErrorHandlerConfig(
            max_retries=3,
            enable_cpu_fallback=True,
            enable_quality_degradation=True,
            enable_cached_fallback=True
        ))

        # Circuit breakers for different engines
        self.circuit_breakers = self._setup_circuit_breakers()

        # Fallback manager for engine chains
        self.fallback_manager = FallbackManager()

        # Setup engine fallback chains
        self._setup_engine_chains()

        # Register fallback handlers
        self._register_fallback_handlers()

    def _setup_circuit_breakers(self) -> Dict[ImageEngine, CircuitBreaker]:
        """Setup circuit breakers for each image engine"""
        breakers = {}

        # Stable Diffusion XL - High threshold, quick recovery
        breakers[ImageEngine.STABLE_DIFFUSION_XL] = self.resilience_manager.create_circuit_breaker(
            "sdxl_engine",
            CircuitBreakerConfig(
                failure_threshold=5,
                recovery_timeout=60,
                name="sdxl_breaker"
            )
        )

        # DALL-E - External API, longer recovery
        breakers[ImageEngine.DALL_E] = self.resilience_manager.create_circuit_breaker(
            "dall_e_engine",
            CircuitBreakerConfig(
                failure_threshold=3,
                recovery_timeout=300,  # 5 minutes
                name="dall_e_breaker"
            )
        )

        # Midjourney - External service, conservative
        breakers[ImageEngine.MIDJOURNEY] = self.resilience_manager.create_circuit_breaker(
            "midjourney_engine",
            CircuitBreakerConfig(
                failure_threshold=2,
                recovery_timeout=600,  # 10 minutes
                name="midjourney_breaker"
            )
        )

        # Flux - Newer model, medium threshold
        breakers[ImageEngine.FLUX] = self.resilience_manager.create_circuit_breaker(
            "flux_engine",
            CircuitBreakerConfig(
                failure_threshold=4,
                recovery_timeout=120,
                name="flux_breaker"
            )
        )

        return breakers

    def _setup_engine_chains(self):
        """Setup fallback chains for different quality levels"""
        self.engine_chains = {}

        # High quality chain: SDXL -> DALL-E -> Flux -> Basic
        high_quality_chain = FallbackChain(
            primary_function=self._generate_sdxl,
            fallback_functions=[
                self._generate_dall_e,
                self._generate_flux,
                self._generate_basic
            ],
            max_fallback_attempts=3
        )
        self.engine_chains["high"] = high_quality_chain

        # Standard quality chain: SDXL -> Flux -> Basic
        standard_chain = FallbackChain(
            primary_function=self._generate_sdxl,
            fallback_functions=[
                self._generate_flux,
                self._generate_basic
            ],
            max_fallback_attempts=2
        )
        self.engine_chains["standard"] = standard_chain

        # Fast chain: Flux -> Basic
        fast_chain = FallbackChain(
            primary_function=self._generate_flux,
            fallback_functions=[self._generate_basic],
            max_fallback_attempts=1
        )
        self.engine_chains["fast"] = fast_chain

    def _register_fallback_handlers(self):
        """Register fallback strategies with AI error handler"""
        # Quality degradation fallback
        async def quality_degradation_fallback(error, context):
            if isinstance(error, ResourceExhaustionError):
                logger.info("Applying quality degradation fallback")
                # Reduce dimensions for retry
                if 'request' in context:
                    request = context['request']
                    request.width = max(512, request.width // 2)
                    request.height = max(512, request.height // 2)
                    request.quality = "medium"
                return True
            return False

        # Model switching fallback
        async def model_switching_fallback(error, context):
            if isinstance(error, ModelLoadingError):
                logger.info("Applying model switching fallback")
                return True
            return False

        self.ai_error_handler.register_fallback_handler(FallbackStrategy.QUALITY_DEGRADATION, quality_degradation_fallback)
        self.ai_error_handler.register_fallback_handler(FallbackStrategy.MODEL_SWITCHING, model_switching_fallback)

    async def _generate_sdxl(self, request: ImageGenerationRequest) -> ImageProcessingResult:
        """Generate image using Stable Diffusion XL"""
        logger.info(f"Generating image with SDXL: {request.prompt[:50]}...")

        breaker = self.circuit_breakers[ImageEngine.STABLE_DIFFUSION_XL]

        @breaker
        async def sdxl_operation():
            # Simulate SDXL processing with potential failures
            if "complex" in request.prompt.lower():
                raise ResourceExhaustionError("SDXL GPU memory exhausted for complex prompt", resource="VRAM")
            if "forbidden" in request.prompt.lower():
                raise InferenceError("SDXL content policy violation", model_id="sdxl-1.0")

            await asyncio.sleep(1.5)  # Simulate processing time
            output_path = Path(f"output/sdxl_{hash(request.prompt)}.png")
            return ImageProcessingResult(
                success=True,
                image_path=output_path,
                engine_used=ImageEngine.STABLE_DIFFUSION_XL,
                processing_time_seconds=1.5
            )

        try:
            return await sdxl_operation()
        except Exception as e:
            logger.warning(f"SDXL generation failed: {e}")
            raise

    async def _generate_dall_e(self, request: ImageGenerationRequest) -> ImageProcessingResult:
        """Generate image using DALL-E"""
        logger.info(f"Generating image with DALL-E: {request.prompt[:50]}...")

        breaker = self.circuit_breakers[ImageEngine.DALL_E]

        @breaker
        async def dalle_operation():
            # Simulate API call with potential network issues
            if "network" in request.prompt.lower():
                raise AIError("DALL-E API network timeout", category=ErrorCategory.NETWORK)

            await asyncio.sleep(2.0)  # API calls are slower
            output_path = Path(f"output/dalle_{hash(request.prompt)}.png")
            return ImageProcessingResult(
                success=True,
                image_path=output_path,
                engine_used=ImageEngine.DALL_E,
                processing_time_seconds=2.0
            )

        try:
            return await dalle_operation()
        except Exception as e:
            logger.warning(f"DALL-E generation failed: {e}")
            raise

    async def _generate_flux(self, request: ImageGenerationRequest) -> ImageProcessingResult:
        """Generate image using Flux model"""
        logger.info(f"Generating image with Flux: {request.prompt[:50]}...")

        breaker = self.circuit_breakers[ImageEngine.FLUX]

        @breaker
        async def flux_operation():
            await asyncio.sleep(1.0)  # Faster than SDXL
            output_path = Path(f"output/flux_{hash(request.prompt)}.png")
            return ImageProcessingResult(
                success=True,
                image_path=output_path,
                engine_used=ImageEngine.FLUX,
                processing_time_seconds=1.0
            )

        try:
            return await flux_operation()
        except Exception as e:
            logger.warning(f"Flux generation failed: {e}")
            raise

    async def _generate_basic(self, request: ImageGenerationRequest) -> ImageProcessingResult:
        """Generate basic placeholder image"""
        logger.info(f"Generating basic image: {request.prompt[:50]}...")

        await asyncio.sleep(0.2)  # Very fast basic processing
        output_path = Path(f"output/basic_{hash(request.prompt)}.png")
        return ImageProcessingResult(
            success=True,
            image_path=output_path,
            engine_used=ImageEngine.BASIC_PROCESSOR,
            processing_time_seconds=0.2,
            quality_degraded=True
        )

    async def generate_image_with_resilience(self, request: ImageGenerationRequest,
                                           quality_preference: str = "high") -> ImageProcessingResult:
        """
        Generate image with comprehensive error handling and fallback strategies

        Args:
            request: Image generation request
            quality_preference: Quality level ("high", "standard", "fast")

        Returns:
            ImageProcessingResult with generation outcome
        """
        logger.info(f"Starting resilient image generation: {request.prompt[:50]}...")

        # Select appropriate fallback chain
        chain = self.engine_chains.get(quality_preference, self.engine_chains["high"])

        # Retry configuration
        retry_config = RetryConfig(
            max_attempts=2,
            strategy=RetryStrategy.EXPONENTIAL_BACKOFF,
            base_delay=1.0
        )

        try:
            # Execute with fallback chain and retry
            result = await self.fallback_manager.execute_with_fallback(chain, request)

            # Apply AI-specific error handling if needed
            if not result.success and result.errors:
                ai_result = await self.ai_error_handler.handle_error(
                    AIError("Image generation failed", category=ErrorCategory.AI),
                    {"request": request, "quality_preference": quality_preference}
                )
                if ai_result.success:
                    # Retry with fallback strategy applied
                    result = await self.fallback_manager.execute_with_fallback(chain, request)

            logger.info(f"Image generation completed with {result.engine_used.value}")
            return result

        except Exception as e:
            # Comprehensive error handling
            error_info = await self.resilience_manager.handle_error(e, {
                "component": "ImageEngine",
                "operation": "generate_image",
                "prompt_length": len(request.prompt),
                "quality_preference": quality_preference
            })

            # Check if any circuit breakers are tripped
            tripped_breakers = []
            for engine, breaker in self.circuit_breakers.items():
                state = breaker.get_state()
                if state["state"] == "OPEN":
                    tripped_breakers.append(engine.value)

            if tripped_breakers:
                logger.warning(f"Circuit breakers tripped for: {', '.join(tripped_breakers)}")

            # Return result with error information
            return ImageProcessingResult(
                success=False,
                errors=[str(e)],
                circuit_breaker_tripped=bool(tripped_breakers)
            )

    def get_engine_stats(self) -> Dict[str, Any]:
        """Get comprehensive engine statistics"""
        stats = {
            "circuit_breakers": {},
            "fallback_stats": self.fallback_manager.get_fallback_stats(),
            "resilience_status": self.resilience_manager.get_resilience_status()
        }

        for engine, breaker in self.circuit_breakers.items():
            stats["circuit_breakers"][engine.value] = breaker.get_state()

        return stats

async def main():
    """Demonstrate image engine error handling patterns"""
    print("=== Image Engine Error Handling Demo ===\n")

    handler = ImageEngineErrorHandler()

    # Test scenarios
    test_requests = [
        (ImageGenerationRequest("A beautiful sunset over mountains"), "Normal generation"),
        (ImageGenerationRequest("A complex detailed cityscape at night with many buildings and lights"), "Complex prompt (resource exhaustion)"),
        (ImageGenerationRequest("Forbidden content that violates policy"), "Policy violation"),
        (ImageGenerationRequest("A simple geometric pattern"), "Simple fast generation"),
    ]

    for request, description in test_requests:
        print(f"Testing: {description}")
        print(f"  Prompt: {request.prompt}")

        try:
            result = await handler.generate_image_with_resilience(request, "high")

            if result.success:
                print(f"✅ Success: Engine={result.engine_used.value}, "
                      f"Time={result.processing_time_seconds:.1f}s, "
                      f"Degraded={result.quality_degraded}")
            else:
                print(f"❌ Failed: {', '.join(result.errors)}")
                if result.circuit_breaker_tripped:
                    print("   ⚠️  Circuit breaker tripped")

        except Exception as e:
            print(f"❌ Unexpected error: {e}")

        print()

    # Display final statistics
    print("=== Engine Statistics ===")
    stats = handler.get_engine_stats()

    print("Circuit Breaker States:")
    for engine, state in stats["circuit_breakers"].items():
        print(f"  {engine}: {state['state']} (failures: {state['failure_count']})")

    print(f"Fallback Executions: {sum(sum(counts.values()) for counts in stats['fallback_stats'].values())}")

if __name__ == "__main__":
    asyncio.run(main())