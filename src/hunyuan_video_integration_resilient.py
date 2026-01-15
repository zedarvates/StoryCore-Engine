"""
Resilient HunyuanVideo Integration with Error Handling

This module wraps the HunyuanVideo integration with comprehensive error handling
and resilience features from the Error Handling and Resilience System.

Features:
- Automatic retry with exponential backoff
- Circuit breaker pattern to prevent cascading failures
- Fallback chains for graceful degradation
- Error analytics and reporting
- Recovery procedures
- Performance monitoring

Author: Kiro AI Assistant
Date: January 14, 2026
"""

import asyncio
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
from PIL import Image

# Import base integration
from hunyuan_video_integration import (
    HunyuanVideoIntegration,
    VideoGenerationRequest,
    VideoGenerationResult,
    HunyuanWorkflowType,
    FrameSequence
)

# Import error handling system
from error_handling_resilience import (
    ErrorHandlingSystem,
    CircuitBreakerConfig,
    RetryConfig,
    ErrorCategory,
    ErrorSeverity,
    ErrorInfo
)

# Import configuration
from advanced_workflow_config import HunyuanVideoConfig
from advanced_model_manager import AdvancedModelManager

logger = logging.getLogger(__name__)


class ResilientHunyuanVideoIntegration:
    """
    Resilient wrapper for HunyuanVideo integration with comprehensive error handling
    
    Features:
    - Automatic retry for transient failures
    - Circuit breaker prevents cascading failures
    - Fallback chains for graceful degradation
    - Error analytics and monitoring
    - Recovery procedures
    """
    
    def __init__(self, config: HunyuanVideoConfig,
                 model_manager: Optional[AdvancedModelManager] = None,
                 error_system: Optional[ErrorHandlingSystem] = None):
        """
        Initialize resilient integration
        
        Args:
            config: HunyuanVideo configuration
            model_manager: Model manager instance
            error_system: Error handling system (creates new if None)
        """
        self.config = config
        self.model_manager = model_manager
        
        # Initialize base integration
        self.base_integration = HunyuanVideoIntegration(config, model_manager)
        
        # Initialize error handling system
        self.error_system = error_system or ErrorHandlingSystem()
        
        # Configure circuit breakers
        self.t2v_circuit = self.error_system.get_circuit_breaker(
            'hunyuan_t2v',
            CircuitBreakerConfig(
                failure_threshold=3,
                success_threshold=2,
                timeout=120.0  # 2 minutes
            )
        )
        
        self.i2v_circuit = self.error_system.get_circuit_breaker(
            'hunyuan_i2v',
            CircuitBreakerConfig(
                failure_threshold=3,
                success_threshold=2,
                timeout=120.0
            )
        )
        
        self.upscale_circuit = self.error_system.get_circuit_breaker(
            'hunyuan_upscale',
            CircuitBreakerConfig(
                failure_threshold=5,
                success_threshold=2,
                timeout=60.0  # 1 minute
            )
        )
        
        # Configure fallback chains
        self._setup_fallback_chains()
        
        # Statistics
        self.generation_stats = {
            't2v_attempts': 0,
            't2v_successes': 0,
            't2v_failures': 0,
            'i2v_attempts': 0,
            'i2v_successes': 0,
            'i2v_failures': 0,
            'fallback_uses': 0,
            'recovery_attempts': 0,
            'recovery_successes': 0
        }
        
        logger.info("Resilient HunyuanVideo Integration initialized")
    
    def _setup_fallback_chains(self):
        """Setup fallback chains for different workflows"""
        # T2V fallback chain
        t2v_chain = self.error_system.get_fallback_chain('hunyuan_t2v')
        t2v_chain.add_fallback(self._generate_t2v_primary)
        t2v_chain.add_fallback(self._generate_t2v_reduced_quality)
        t2v_chain.add_fallback(self._generate_t2v_minimal)
        
        # I2V fallback chain
        i2v_chain = self.error_system.get_fallback_chain('hunyuan_i2v')
        i2v_chain.add_fallback(self._generate_i2v_primary)
        i2v_chain.add_fallback(self._generate_i2v_reduced_quality)
        i2v_chain.add_fallback(self._generate_i2v_minimal)
        
        logger.info("Fallback chains configured")
    
    async def generate_video(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        """
        Generate video with full resilience features
        
        Args:
            request: Video generation request
            
        Returns:
            Video generation result
        """
        workflow_type = request.workflow_type
        
        # Select appropriate circuit breaker
        if workflow_type == HunyuanWorkflowType.TEXT_TO_VIDEO:
            circuit_name = 'hunyuan_t2v'
            self.generation_stats['t2v_attempts'] += 1
        elif workflow_type == HunyuanWorkflowType.IMAGE_TO_VIDEO:
            circuit_name = 'hunyuan_i2v'
            self.generation_stats['i2v_attempts'] += 1
        else:
            circuit_name = None
        
        try:
            # Execute with resilience
            result = await self.error_system.execute_with_resilience(
                self._generate_video_internal,
                request,
                circuit_breaker_name=circuit_name,
                enable_retry=True
            )
            
            # Record success
            if workflow_type == HunyuanWorkflowType.TEXT_TO_VIDEO:
                self.generation_stats['t2v_successes'] += 1
            elif workflow_type == HunyuanWorkflowType.IMAGE_TO_VIDEO:
                self.generation_stats['i2v_successes'] += 1
            
            return result
            
        except Exception as e:
            logger.error(f"Video generation failed after all resilience attempts: {e}")
            
            # Record failure
            if workflow_type == HunyuanWorkflowType.TEXT_TO_VIDEO:
                self.generation_stats['t2v_failures'] += 1
            elif workflow_type == HunyuanWorkflowType.IMAGE_TO_VIDEO:
                self.generation_stats['i2v_failures'] += 1
            
            # Try fallback chain
            return await self._execute_fallback_chain(request)
    
    async def _generate_video_internal(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        """Internal video generation with base integration"""
        return await self.base_integration.generate_video(request)
    
    async def _execute_fallback_chain(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        """Execute fallback chain for failed generation"""
        self.generation_stats['fallback_uses'] += 1
        
        workflow_type = request.workflow_type
        
        if workflow_type == HunyuanWorkflowType.TEXT_TO_VIDEO:
            chain_name = 'hunyuan_t2v'
        elif workflow_type == HunyuanWorkflowType.IMAGE_TO_VIDEO:
            chain_name = 'hunyuan_i2v'
        else:
            # No fallback for other types
            return VideoGenerationResult(
                success=False,
                error_message="No fallback available for this workflow type"
            )
        
        try:
            fallback_chain = self.error_system.get_fallback_chain(chain_name)
            result = await fallback_chain.execute(request)
            
            # Add warning about fallback usage
            result.warnings.append(f"Generated using fallback chain: {chain_name}")
            
            return result
            
        except Exception as e:
            logger.error(f"All fallbacks exhausted: {e}")
            return VideoGenerationResult(
                success=False,
                error_message=f"All generation attempts failed: {str(e)}"
            )
    
    # Fallback implementations
    
    async def _generate_t2v_primary(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        """Primary T2V generation (full quality)"""
        return await self.base_integration.generate_video(request)
    
    async def _generate_t2v_reduced_quality(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        """T2V generation with reduced quality settings"""
        logger.warning("Using reduced quality T2V generation")
        
        # Adjust parameters for degraded mode
        adjusted_request = VideoGenerationRequest(
            workflow_type=request.workflow_type,
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            seed=request.seed,
            width=request.width,
            height=request.height,
            num_frames=max(61, request.num_frames // 2),  # Reduce frames
            fps=request.fps,
            steps=max(20, request.steps // 2),  # Reduce steps
            cfg_scale=request.cfg_scale,
            sampler=request.sampler,
            scheduler=request.scheduler,
            enable_upscaling=False,  # Disable upscaling
            enable_caching=request.enable_caching
        )
        
        result = await self.base_integration.generate_video(adjusted_request)
        result.warnings.append("Generated with reduced quality settings")
        return result
    
    async def _generate_t2v_minimal(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        """T2V generation with minimal settings (last resort)"""
        logger.warning("Using minimal quality T2V generation")
        
        # Minimal parameters
        adjusted_request = VideoGenerationRequest(
            workflow_type=request.workflow_type,
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            seed=request.seed,
            width=min(512, request.width),  # Reduce resolution
            height=min(384, request.height),
            num_frames=min(31, request.num_frames),  # Minimal frames
            fps=request.fps,
            steps=15,  # Minimal steps
            cfg_scale=request.cfg_scale,
            sampler=request.sampler,
            scheduler=request.scheduler,
            enable_upscaling=False,
            enable_caching=request.enable_caching
        )
        
        result = await self.base_integration.generate_video(adjusted_request)
        result.warnings.append("Generated with minimal quality settings (fallback)")
        return result
    
    async def _generate_i2v_primary(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        """Primary I2V generation (full quality)"""
        return await self.base_integration.generate_video(request)
    
    async def _generate_i2v_reduced_quality(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        """I2V generation with reduced quality settings"""
        logger.warning("Using reduced quality I2V generation")
        
        adjusted_request = VideoGenerationRequest(
            workflow_type=request.workflow_type,
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            seed=request.seed,
            conditioning_image=request.conditioning_image,
            width=request.width,
            height=request.height,
            num_frames=max(61, request.num_frames // 2),
            fps=request.fps,
            steps=max(20, request.steps // 2),
            cfg_scale=request.cfg_scale,
            sampler=request.sampler,
            scheduler=request.scheduler,
            enable_upscaling=False,
            enable_caching=request.enable_caching
        )
        
        result = await self.base_integration.generate_video(adjusted_request)
        result.warnings.append("Generated with reduced quality settings")
        return result
    
    async def _generate_i2v_minimal(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        """I2V generation with minimal settings (last resort)"""
        logger.warning("Using minimal quality I2V generation")
        
        adjusted_request = VideoGenerationRequest(
            workflow_type=request.workflow_type,
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            seed=request.seed,
            conditioning_image=request.conditioning_image,
            width=min(512, request.width),
            height=min(384, request.height),
            num_frames=min(31, request.num_frames),
            fps=request.fps,
            steps=15,
            cfg_scale=request.cfg_scale,
            sampler=request.sampler,
            scheduler=request.scheduler,
            enable_upscaling=False,
            enable_caching=request.enable_caching
        )
        
        result = await self.base_integration.generate_video(adjusted_request)
        result.warnings.append("Generated with minimal quality settings (fallback)")
        return result
    
    async def upscale_video(self, frames: List[Image.Image], 
                           upscale_factor: float = 1.5) -> List[Image.Image]:
        """
        Upscale video frames with resilience
        
        Args:
            frames: Input frames
            upscale_factor: Upscaling factor
            
        Returns:
            Upscaled frames
        """
        try:
            # Execute with circuit breaker and retry
            result = await self.error_system.execute_with_resilience(
                self.base_integration.upscaler.upscale_frames,
                frames,
                upscale_factor,
                circuit_breaker_name='hunyuan_upscale',
                enable_retry=True
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Upscaling failed: {e}")
            # Return original frames as fallback
            logger.warning("Returning original frames (upscaling failed)")
            return frames
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get system health status"""
        return {
            'circuit_breakers': {
                't2v': self.t2v_circuit.get_state(),
                'i2v': self.i2v_circuit.get_state(),
                'upscale': self.upscale_circuit.get_state()
            },
            'generation_stats': self.generation_stats.copy(),
            'error_system_health': self.error_system.get_system_health(),
            'degradation_level': self.error_system.graceful_degradation.current_level
        }
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get generation statistics"""
        stats = self.generation_stats.copy()
        
        # Calculate success rates
        if stats['t2v_attempts'] > 0:
            stats['t2v_success_rate'] = stats['t2v_successes'] / stats['t2v_attempts']
        else:
            stats['t2v_success_rate'] = 0.0
        
        if stats['i2v_attempts'] > 0:
            stats['i2v_success_rate'] = stats['i2v_successes'] / stats['i2v_attempts']
        else:
            stats['i2v_success_rate'] = 0.0
        
        if stats['recovery_attempts'] > 0:
            stats['recovery_success_rate'] = stats['recovery_successes'] / stats['recovery_attempts']
        else:
            stats['recovery_success_rate'] = 0.0
        
        return stats
    
    async def cleanup(self):
        """Cleanup resources"""
        await self.base_integration.cleanup()
        logger.info("Resilient HunyuanVideo Integration cleaned up")


# Convenience functions

async def generate_video_resilient(
    prompt: str,
    workflow_type: HunyuanWorkflowType = HunyuanWorkflowType.TEXT_TO_VIDEO,
    conditioning_image: Optional[Image.Image] = None,
    width: int = 720,
    height: int = 480,
    num_frames: int = 121,
    config: Optional[HunyuanVideoConfig] = None
) -> VideoGenerationResult:
    """
    Convenience function for resilient video generation
    
    Args:
        prompt: Text prompt
        workflow_type: Type of workflow
        conditioning_image: Conditioning image (for I2V)
        width: Video width
        height: Video height
        num_frames: Number of frames
        config: Configuration (uses default if None)
        
    Returns:
        Video generation result
    """
    if config is None:
        config = HunyuanVideoConfig(
            width=width,
            height=height,
            num_frames=num_frames
        )
    
    integration = ResilientHunyuanVideoIntegration(config)
    
    request = VideoGenerationRequest(
        workflow_type=workflow_type,
        prompt=prompt,
        conditioning_image=conditioning_image,
        width=width,
        height=height,
        num_frames=num_frames
    )
    
    try:
        result = await integration.generate_video(request)
        return result
    finally:
        await integration.cleanup()


# Example usage
if __name__ == "__main__":
    async def main():
        # Create configuration
        config = HunyuanVideoConfig(
            width=720,
            height=480,
            num_frames=121
        )
        
        # Create resilient integration
        integration = ResilientHunyuanVideoIntegration(config)
        
        # Generate video with resilience
        request = VideoGenerationRequest(
            workflow_type=HunyuanWorkflowType.TEXT_TO_VIDEO,
            prompt="A beautiful sunset over mountains",
            steps=50,
            enable_upscaling=True
        )
        
        result = await integration.generate_video(request)
        
        if result.success:
            print(f"Generated {result.num_frames} frames")
            print(f"Quality score: {result.quality_score:.2f}")
            print(f"Warnings: {result.warnings}")
        else:
            print(f"Generation failed: {result.error_message}")
        
        # Check system health
        health = integration.get_system_health()
        print(f"System health: {health}")
        
        # Get statistics
        stats = integration.get_statistics()
        print(f"Statistics: {stats}")
        
        # Cleanup
        await integration.cleanup()
    
    asyncio.run(main())
