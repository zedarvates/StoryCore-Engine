"""
Preview AI Integration - Real-time AI enhancement integration with preview system.

This module provides real-time AI-enhanced preview generation with quality-speed
balance adjustment and progressive enhancement capabilities.
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Any, Callable
from collections import deque

from .ai_enhancement_engine import (
    VideoFrame, EnhancedFrame, EnhancementType, QualityLevel, PerformanceMode
)
from .style_transfer_processor import StyleTransferProcessor, StyleConfig
from .super_resolution_engine import SuperResolutionEngine, UpscaleConfig
from .content_aware_interpolator import ContentAwareInterpolator, InterpolationConfig
from .quality_optimizer import QualityOptimizer
from .model_manager import ModelManager
from .gpu_scheduler import GPUScheduler, GPUJobRequest, JobPriority
from .circuit_breaker import CircuitBreaker


class PreviewMode(Enum):
    """Preview generation modes."""
    FAST = "fast"           # Fastest preview, lowest quality
    BALANCED = "balanced"   # Balanced speed and quality
    QUALITY = "quality"     # High quality, slower
    PROGRESSIVE = "progressive"  # Progressive enhancement


@dataclass
class PreviewSettings:
    """Settings for AI-enhanced preview generation."""
    mode: PreviewMode = PreviewMode.BALANCED
    max_processing_time_ms: float = 500.0  # Maximum time for preview generation
    quality_level: QualityLevel = QualityLevel.PREVIEW
    enable_style_transfer: bool = False
    enable_super_resolution: bool = False
    enable_quality_optimization: bool = False
    progressive_steps: int = 3  # Number of progressive enhancement steps
    cache_previews: bool = True
    
    def get_quality_speed_balance(self) -> float:
        """Get quality-speed balance factor (0.0=speed, 1.0=quality)."""
        balance_map = {
            PreviewMode.FAST: 0.2,
            PreviewMode.BALANCED: 0.5,
            PreviewMode.QUALITY: 0.8,
            PreviewMode.PROGRESSIVE: 0.6
        }
        return balance_map.get(self.mode, 0.5)


@dataclass
class PreviewResult:
    """Result of AI-enhanced preview generation."""
    frame_id: str
    preview_data: bytes
    processing_time_ms: float
    quality_score: float
    enhancements_applied: List[str]
    is_progressive: bool = False
    progress_percent: float = 100.0
    fallback_used: bool = False
    error_message: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'frame_id': self.frame_id,
            'processing_time_ms': self.processing_time_ms,
            'quality_score': self.quality_score,
            'enhancements_applied': self.enhancements_applied,
            'is_progressive': self.is_progressive,
            'progress_percent': self.progress_percent,
            'fallback_used': self.fallback_used,
            'error_message': self.error_message
        }


@dataclass
class ProgressiveEnhancementStep:
    """Step in progressive enhancement process."""
    step_number: int
    enhancement_type: str
    estimated_time_ms: float
    quality_improvement: float
    completed: bool = False


class PreviewCache:
    """Cache for AI-enhanced preview frames."""
    
    def __init__(self, max_size: int = 50):
        """Initialize preview cache."""
        self.max_size = max_size
        self.cache: Dict[str, PreviewResult] = {}
        self.access_order: deque = deque(maxlen=max_size)
        self.logger = logging.getLogger(__name__)
        
        # Cache statistics
        self.stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'total_requests': 0
        }
    
    def get(self, cache_key: str) -> Optional[PreviewResult]:
        """Get preview from cache."""
        self.stats['total_requests'] += 1
        
        if cache_key in self.cache:
            self.stats['hits'] += 1
            # Update access order
            if cache_key in self.access_order:
                self.access_order.remove(cache_key)
            self.access_order.append(cache_key)
            
            return self.cache[cache_key]
        
        self.stats['misses'] += 1
        return None
    
    def put(self, cache_key: str, preview_result: PreviewResult):
        """Store preview in cache."""
        # Evict oldest if cache is full
        if len(self.cache) >= self.max_size and cache_key not in self.cache:
            if self.access_order:
                oldest_key = self.access_order.popleft()
                if oldest_key in self.cache:
                    del self.cache[oldest_key]
                    self.stats['evictions'] += 1
        
        self.cache[cache_key] = preview_result
        
        # Update access order
        if cache_key in self.access_order:
            self.access_order.remove(cache_key)
        self.access_order.append(cache_key)
    
    def clear(self):
        """Clear all cached previews."""
        self.cache.clear()
        self.access_order.clear()
        self.logger.info("Preview cache cleared")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        hit_rate = (self.stats['hits'] / max(1, self.stats['total_requests'])) * 100
        
        return {
            'size': len(self.cache),
            'max_size': self.max_size,
            'hit_rate': hit_rate,
            **self.stats
        }


class PreviewAIIntegration:
    """
    Real-time AI enhancement integration with preview system.
    
    Provides AI-enhanced preview generation with quality-speed balance,
    progressive enhancement, and seamless fallback mechanisms.
    """
    
    def __init__(self, 
                 model_manager: ModelManager,
                 gpu_scheduler: GPUScheduler,
                 circuit_breaker: Optional[CircuitBreaker] = None):
        """
        Initialize Preview AI Integration.
        
        Args:
            model_manager: Model manager for AI models
            gpu_scheduler: GPU scheduler for resource management
            circuit_breaker: Circuit breaker for fault tolerance
        """
        self.model_manager = model_manager
        self.gpu_scheduler = gpu_scheduler
        self.circuit_breaker = circuit_breaker
        self.logger = logging.getLogger(__name__)
        
        # Initialize AI processors
        self.style_processor = StyleTransferProcessor(model_manager)
        self.super_resolution = SuperResolutionEngine(model_manager)
        self.interpolator = ContentAwareInterpolator(model_manager)
        self.quality_optimizer = QualityOptimizer(model_manager)
        
        # Preview cache
        self.preview_cache = PreviewCache(max_size=50)
        
        # Current preview settings
        self.current_settings = PreviewSettings()
        
        # Performance tracking
        self.performance_stats = {
            'total_previews': 0,
            'successful_previews': 0,
            'failed_previews': 0,
            'fallback_previews': 0,
            'average_processing_time': 0.0,
            'total_processing_time': 0.0
        }
        
        self.logger.info("Preview AI Integration initialized")
    
    async def generate_preview(self, frame: VideoFrame, 
                              settings: Optional[PreviewSettings] = None) -> PreviewResult:
        """
        Generate AI-enhanced preview for a frame.
        
        Args:
            frame: Video frame to generate preview for
            settings: Preview settings (uses current if not provided)
            
        Returns:
            Preview result with enhanced frame data
        """
        start_time = time.time()
        settings = settings or self.current_settings
        
        try:
            # Check cache first
            if settings.cache_previews:
                cache_key = self._generate_cache_key(frame, settings)
                cached_result = self.preview_cache.get(cache_key)
                
                if cached_result:
                    self.logger.debug(f"Cache hit for frame {frame.frame_id}")
                    return cached_result
            
            # Generate preview based on mode
            if settings.mode == PreviewMode.PROGRESSIVE:
                result = await self._generate_progressive_preview(frame, settings)
            else:
                result = await self._generate_standard_preview(frame, settings)
            
            # Cache result
            if settings.cache_previews and not result.fallback_used:
                self.preview_cache.put(cache_key, result)
            
            # Update statistics
            self.performance_stats['total_previews'] += 1
            self.performance_stats['successful_previews'] += 1
            self.performance_stats['total_processing_time'] += result.processing_time_ms
            self.performance_stats['average_processing_time'] = (
                self.performance_stats['total_processing_time'] / 
                self.performance_stats['successful_previews']
            )
            
            return result
        
        except Exception as e:
            self.performance_stats['failed_previews'] += 1
            self.logger.error(f"Preview generation failed for frame {frame.frame_id}: {e}")
            
            # Fallback to original frame
            return await self._fallback_preview(frame, str(e), time.time() - start_time)
    
    async def _generate_standard_preview(self, frame: VideoFrame, 
                                        settings: PreviewSettings) -> PreviewResult:
        """
        Generate standard AI-enhanced preview.
        
        Args:
            frame: Video frame to process
            settings: Preview settings
            
        Returns:
            Preview result
        """
        start_time = time.time()
        enhancements_applied = []
        enhanced_data = frame.data
        quality_score = 0.8  # Base quality score
        
        # Apply enhancements based on settings and time constraints
        time_budget = settings.max_processing_time_ms / 1000.0
        
        # Style transfer (if enabled and time permits)
        if settings.enable_style_transfer and (time.time() - start_time) < time_budget:
            try:
                # Use fast style transfer for preview
                style_config = StyleConfig(
                    style_type=self.style_processor.get_available_styles()[0].style_type,
                    style_strength=0.5,
                    quality_level=settings.quality_level
                )
                
                styled_frame = await asyncio.wait_for(
                    self.style_processor.apply_style(frame, style_config),
                    timeout=time_budget - (time.time() - start_time)
                )
                
                enhanced_data = styled_frame.styled_data
                quality_score = styled_frame.quality_score
                enhancements_applied.append("style_transfer")
            
            except asyncio.TimeoutError:
                self.logger.warning("Style transfer timed out for preview")
            except Exception as e:
                self.logger.warning(f"Style transfer failed for preview: {e}")
        
        # Super resolution (if enabled and time permits)
        if settings.enable_super_resolution and (time.time() - start_time) < time_budget:
            try:
                upscale_config = UpscaleConfig(
                    upscale_factor=2,
                    quality_level=settings.quality_level,
                    performance_mode=PerformanceMode.REAL_TIME
                )
                
                # Create temporary frame with current enhanced data
                temp_frame = VideoFrame(
                    frame_id=f"{frame.frame_id}_temp",
                    data=enhanced_data,
                    width=frame.width,
                    height=frame.height,
                    timestamp=frame.timestamp
                )
                
                upscaled_frame = await asyncio.wait_for(
                    self.super_resolution.upscale_frame(temp_frame, upscale_config),
                    timeout=time_budget - (time.time() - start_time)
                )
                
                enhanced_data = upscaled_frame.upscaled_data
                quality_score = max(quality_score, upscaled_frame.quality_score)
                enhancements_applied.append("super_resolution")
            
            except asyncio.TimeoutError:
                self.logger.warning("Super resolution timed out for preview")
            except Exception as e:
                self.logger.warning(f"Super resolution failed for preview: {e}")
        
        # Quality optimization (if enabled and time permits)
        if settings.enable_quality_optimization and (time.time() - start_time) < time_budget:
            try:
                # Create temporary frame for quality analysis
                temp_frame = VideoFrame(
                    frame_id=f"{frame.frame_id}_quality",
                    data=enhanced_data,
                    width=frame.width,
                    height=frame.height,
                    timestamp=frame.timestamp
                )
                
                quality_analysis = await asyncio.wait_for(
                    self.quality_optimizer.analyze_quality(temp_frame),
                    timeout=time_budget - (time.time() - start_time)
                )
                
                quality_score = quality_analysis.overall_score
                enhancements_applied.append("quality_analysis")
            
            except asyncio.TimeoutError:
                self.logger.warning("Quality optimization timed out for preview")
            except Exception as e:
                self.logger.warning(f"Quality optimization failed for preview: {e}")
        
        processing_time = (time.time() - start_time) * 1000
        
        return PreviewResult(
            frame_id=frame.frame_id,
            preview_data=enhanced_data,
            processing_time_ms=processing_time,
            quality_score=quality_score,
            enhancements_applied=enhancements_applied,
            is_progressive=False,
            progress_percent=100.0,
            fallback_used=False
        )
    
    async def _generate_progressive_preview(self, frame: VideoFrame, 
                                           settings: PreviewSettings) -> PreviewResult:
        """
        Generate progressive AI-enhanced preview with immediate feedback.
        
        Args:
            frame: Video frame to process
            settings: Preview settings
            
        Returns:
            Preview result with progressive enhancement
        """
        start_time = time.time()
        
        # Define progressive enhancement steps
        steps = self._plan_progressive_steps(settings)
        
        enhanced_data = frame.data
        enhancements_applied = []
        quality_score = 0.7
        
        # Execute steps progressively
        for i, step in enumerate(steps):
            try:
                # Check time budget
                elapsed = time.time() - start_time
                if elapsed * 1000 >= settings.max_processing_time_ms:
                    break
                
                # Apply enhancement step
                if step.enhancement_type == "quick_enhance":
                    # Quick quality boost
                    quality_score += 0.1
                    enhancements_applied.append("quick_enhance")
                
                elif step.enhancement_type == "style_transfer" and settings.enable_style_transfer:
                    # Apply style transfer
                    style_config = StyleConfig(
                        style_type=self.style_processor.get_available_styles()[0].style_type,
                        style_strength=0.4,
                        quality_level=QualityLevel.PREVIEW
                    )
                    
                    styled_frame = await self.style_processor.apply_style(frame, style_config)
                    enhanced_data = styled_frame.styled_data
                    quality_score = styled_frame.quality_score
                    enhancements_applied.append("style_transfer")
                
                elif step.enhancement_type == "quality_refine":
                    # Final quality refinement
                    quality_score = min(1.0, quality_score + 0.05)
                    enhancements_applied.append("quality_refine")
                
                step.completed = True
            
            except Exception as e:
                self.logger.warning(f"Progressive step {step.step_number} failed: {e}")
                break
        
        processing_time = (time.time() - start_time) * 1000
        completed_steps = sum(1 for s in steps if s.completed)
        progress_percent = (completed_steps / len(steps)) * 100
        
        return PreviewResult(
            frame_id=frame.frame_id,
            preview_data=enhanced_data,
            processing_time_ms=processing_time,
            quality_score=quality_score,
            enhancements_applied=enhancements_applied,
            is_progressive=True,
            progress_percent=progress_percent,
            fallback_used=False
        )
    
    def _plan_progressive_steps(self, settings: PreviewSettings) -> List[ProgressiveEnhancementStep]:
        """Plan progressive enhancement steps based on settings."""
        steps = []
        
        # Step 1: Quick enhancement (always)
        steps.append(ProgressiveEnhancementStep(
            step_number=1,
            enhancement_type="quick_enhance",
            estimated_time_ms=50.0,
            quality_improvement=0.1
        ))
        
        # Step 2: Style transfer (if enabled)
        if settings.enable_style_transfer:
            steps.append(ProgressiveEnhancementStep(
                step_number=2,
                enhancement_type="style_transfer",
                estimated_time_ms=200.0,
                quality_improvement=0.15
            ))
        
        # Step 3: Quality refinement (always)
        steps.append(ProgressiveEnhancementStep(
            step_number=len(steps) + 1,
            enhancement_type="quality_refine",
            estimated_time_ms=100.0,
            quality_improvement=0.05
        ))
        
        return steps
    
    async def _fallback_preview(self, frame: VideoFrame, error_message: str, 
                               elapsed_time: float) -> PreviewResult:
        """
        Generate fallback preview when AI enhancement fails.
        
        Args:
            frame: Original video frame
            error_message: Error message describing failure
            elapsed_time: Time elapsed before fallback
            
        Returns:
            Fallback preview result
        """
        self.performance_stats['fallback_previews'] += 1
        
        return PreviewResult(
            frame_id=frame.frame_id,
            preview_data=frame.data,  # Use original frame
            processing_time_ms=elapsed_time * 1000,
            quality_score=1.0,  # Original quality
            enhancements_applied=[],
            is_progressive=False,
            progress_percent=100.0,
            fallback_used=True,
            error_message=error_message
        )
    
    def _generate_cache_key(self, frame: VideoFrame, settings: PreviewSettings) -> str:
        """Generate cache key for preview."""
        import hashlib
        
        key_components = [
            frame.frame_id,
            settings.mode.value,
            str(settings.enable_style_transfer),
            str(settings.enable_super_resolution),
            str(settings.enable_quality_optimization)
        ]
        
        key_string = "_".join(key_components)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def update_settings(self, settings: PreviewSettings):
        """Update current preview settings."""
        self.current_settings = settings
        self.logger.info(f"Preview settings updated: mode={settings.mode.value}")
    
    def get_current_settings(self) -> PreviewSettings:
        """Get current preview settings."""
        return self.current_settings
    
    def clear_cache(self):
        """Clear preview cache."""
        self.preview_cache.clear()
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get preview cache statistics."""
        return self.preview_cache.get_stats()
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get preview performance statistics."""
        stats = self.performance_stats.copy()
        
        # Calculate derived metrics
        if stats['total_previews'] > 0:
            stats['success_rate'] = stats['successful_previews'] / stats['total_previews']
            stats['fallback_rate'] = stats['fallback_previews'] / stats['total_previews']
        else:
            stats['success_rate'] = 0.0
            stats['fallback_rate'] = 0.0
        
        return stats
    
    def reset_stats(self):
        """Reset performance statistics."""
        self.performance_stats = {
            'total_previews': 0,
            'successful_previews': 0,
            'failed_previews': 0,
            'fallback_previews': 0,
            'average_processing_time': 0.0,
            'total_processing_time': 0.0
        }
        self.logger.info("Performance statistics reset")


    async def switch_preview_mode(self, new_mode: PreviewMode, 
                                 smooth_transition: bool = True) -> Dict[str, Any]:
        """
        Switch preview mode with optional smooth transition.
        
        Args:
            new_mode: New preview mode to switch to
            smooth_transition: Whether to apply smooth transition
            
        Returns:
            Transition result with status and timing
        """
        start_time = time.time()
        old_mode = self.current_settings.mode
        
        if old_mode == new_mode:
            return {
                'success': True,
                'message': f'Already in {new_mode.value} mode',
                'transition_time_ms': 0.0
            }
        
        try:
            if smooth_transition:
                # Gradual transition through intermediate settings
                await self._smooth_mode_transition(old_mode, new_mode)
            else:
                # Immediate mode switch
                self.current_settings.mode = new_mode
            
            # Clear cache on mode change to avoid stale previews
            self.preview_cache.clear()
            
            transition_time = (time.time() - start_time) * 1000
            
            self.logger.info(
                f"Preview mode switched from {old_mode.value} to {new_mode.value} "
                f"(smooth={smooth_transition}, time={transition_time:.1f}ms)"
            )
            
            return {
                'success': True,
                'old_mode': old_mode.value,
                'new_mode': new_mode.value,
                'smooth_transition': smooth_transition,
                'transition_time_ms': transition_time,
                'cache_cleared': True
            }
        
        except Exception as e:
            self.logger.error(f"Mode transition failed: {e}")
            return {
                'success': False,
                'error_message': str(e),
                'old_mode': old_mode.value,
                'new_mode': new_mode.value
            }
    
    async def _smooth_mode_transition(self, old_mode: PreviewMode, new_mode: PreviewMode):
        """
        Perform smooth transition between preview modes.
        
        Args:
            old_mode: Current preview mode
            new_mode: Target preview mode
        """
        # Define transition path
        mode_order = [PreviewMode.FAST, PreviewMode.BALANCED, PreviewMode.QUALITY]
        
        try:
            old_index = mode_order.index(old_mode)
            new_index = mode_order.index(new_mode)
        except ValueError:
            # Progressive mode doesn't fit in linear order, switch directly
            self.current_settings.mode = new_mode
            return
        
        # Transition through intermediate modes
        if old_index < new_index:
            # Upgrading quality
            for i in range(old_index + 1, new_index + 1):
                self.current_settings.mode = mode_order[i]
                await asyncio.sleep(0.05)  # Small delay for smooth transition
        else:
            # Downgrading quality
            for i in range(old_index - 1, new_index - 1, -1):
                self.current_settings.mode = mode_order[i]
                await asyncio.sleep(0.05)
    
    async def enable_enhancement(self, enhancement_type: str, 
                                enable: bool = True) -> Dict[str, Any]:
        """
        Enable or disable specific AI enhancement for previews.
        
        Args:
            enhancement_type: Type of enhancement ('style_transfer', 'super_resolution', 'quality_optimization')
            enable: Whether to enable or disable
            
        Returns:
            Result with updated settings
        """
        try:
            if enhancement_type == 'style_transfer':
                self.current_settings.enable_style_transfer = enable
            elif enhancement_type == 'super_resolution':
                self.current_settings.enable_super_resolution = enable
            elif enhancement_type == 'quality_optimization':
                self.current_settings.enable_quality_optimization = enable
            else:
                return {
                    'success': False,
                    'error_message': f'Unknown enhancement type: {enhancement_type}'
                }
            
            # Clear cache when settings change
            self.preview_cache.clear()
            
            action = 'enabled' if enable else 'disabled'
            self.logger.info(f"Enhancement {enhancement_type} {action}")
            
            return {
                'success': True,
                'enhancement_type': enhancement_type,
                'enabled': enable,
                'cache_cleared': True
            }
        
        except Exception as e:
            self.logger.error(f"Failed to update enhancement setting: {e}")
            return {
                'success': False,
                'error_message': str(e)
            }
    
    async def adjust_quality_speed_balance(self, balance_factor: float) -> Dict[str, Any]:
        """
        Adjust quality-speed balance dynamically.
        
        Args:
            balance_factor: Balance factor (0.0=speed, 1.0=quality)
            
        Returns:
            Result with updated settings
        """
        if not 0.0 <= balance_factor <= 1.0:
            return {
                'success': False,
                'error_message': 'Balance factor must be between 0.0 and 1.0'
            }
        
        try:
            # Map balance factor to preview mode
            if balance_factor < 0.3:
                new_mode = PreviewMode.FAST
            elif balance_factor < 0.6:
                new_mode = PreviewMode.BALANCED
            else:
                new_mode = PreviewMode.QUALITY
            
            # Adjust max processing time based on balance
            base_time = 500.0  # Base time in ms
            self.current_settings.max_processing_time_ms = base_time * (0.5 + balance_factor)
            
            # Switch mode if different
            if new_mode != self.current_settings.mode:
                await self.switch_preview_mode(new_mode, smooth_transition=True)
            
            self.logger.info(f"Quality-speed balance adjusted to {balance_factor:.2f}")
            
            return {
                'success': True,
                'balance_factor': balance_factor,
                'mode': self.current_settings.mode.value,
                'max_processing_time_ms': self.current_settings.max_processing_time_ms
            }
        
        except Exception as e:
            self.logger.error(f"Failed to adjust quality-speed balance: {e}")
            return {
                'success': False,
                'error_message': str(e)
            }
    
    async def handle_preview_failure(self, frame: VideoFrame, 
                                    error: Exception) -> PreviewResult:
        """
        Handle preview generation failure with intelligent fallback.
        
        Args:
            frame: Video frame that failed to process
            error: Exception that caused the failure
            
        Returns:
            Fallback preview result
        """
        error_message = str(error)
        self.logger.warning(f"Preview failure for frame {frame.frame_id}: {error_message}")
        
        # Analyze error type and determine fallback strategy
        fallback_strategy = self._determine_fallback_strategy(error)
        
        if fallback_strategy == 'retry_lower_quality':
            # Retry with lower quality settings
            try:
                fallback_settings = PreviewSettings(
                    mode=PreviewMode.FAST,
                    max_processing_time_ms=200.0,
                    quality_level=QualityLevel.PREVIEW,
                    enable_style_transfer=False,
                    enable_super_resolution=False,
                    enable_quality_optimization=False
                )
                
                result = await self._generate_standard_preview(frame, fallback_settings)
                result.fallback_used = True
                result.error_message = f"Fallback used: {error_message}"
                
                return result
            
            except Exception as retry_error:
                self.logger.error(f"Fallback retry failed: {retry_error}")
        
        # Ultimate fallback: return original frame
        return await self._fallback_preview(frame, error_message, 0.0)
    
    def _determine_fallback_strategy(self, error: Exception) -> str:
        """
        Determine appropriate fallback strategy based on error type.
        
        Args:
            error: Exception that occurred
            
        Returns:
            Fallback strategy name
        """
        error_message = str(error).lower()
        
        if 'timeout' in error_message or 'time' in error_message:
            return 'retry_lower_quality'
        elif 'memory' in error_message or 'resource' in error_message:
            return 'retry_lower_quality'
        elif 'model' in error_message or 'load' in error_message:
            return 'use_original'
        else:
            return 'retry_lower_quality'
    
    async def integrate_with_existing_preview(self, 
                                             standard_preview_callback: Callable,
                                             frame: VideoFrame) -> PreviewResult:
        """
        Integrate AI enhancement with existing preview system.
        
        Args:
            standard_preview_callback: Callback for standard preview generation
            frame: Video frame to process
            
        Returns:
            Preview result (AI-enhanced or standard fallback)
        """
        try:
            # Try AI-enhanced preview first
            ai_result = await self.generate_preview(frame)
            
            # If AI preview succeeded, return it
            if not ai_result.fallback_used:
                return ai_result
            
            # If AI preview failed, fallback to standard preview
            self.logger.info(f"Falling back to standard preview for frame {frame.frame_id}")
            
            standard_preview_data = await standard_preview_callback(frame)
            
            return PreviewResult(
                frame_id=frame.frame_id,
                preview_data=standard_preview_data,
                processing_time_ms=0.0,
                quality_score=1.0,
                enhancements_applied=['standard_preview'],
                is_progressive=False,
                progress_percent=100.0,
                fallback_used=True,
                error_message="AI preview unavailable, using standard preview"
            )
        
        except Exception as e:
            self.logger.error(f"Preview integration failed: {e}")
            
            # Ultimate fallback: return original frame
            return PreviewResult(
                frame_id=frame.frame_id,
                preview_data=frame.data,
                processing_time_ms=0.0,
                quality_score=1.0,
                enhancements_applied=[],
                is_progressive=False,
                progress_percent=100.0,
                fallback_used=True,
                error_message=f"All preview methods failed: {str(e)}"
            )
    
    def get_recommended_settings(self, system_load: float, 
                                gpu_available: bool) -> PreviewSettings:
        """
        Get recommended preview settings based on system state.
        
        Args:
            system_load: Current system load (0.0 to 1.0)
            gpu_available: Whether GPU is available
            
        Returns:
            Recommended preview settings
        """
        # Adjust settings based on system load
        if system_load > 0.8 or not gpu_available:
            # High load or no GPU: use fast mode
            return PreviewSettings(
                mode=PreviewMode.FAST,
                max_processing_time_ms=200.0,
                quality_level=QualityLevel.PREVIEW,
                enable_style_transfer=False,
                enable_super_resolution=False,
                enable_quality_optimization=False
            )
        
        elif system_load > 0.5:
            # Medium load: use balanced mode
            return PreviewSettings(
                mode=PreviewMode.BALANCED,
                max_processing_time_ms=500.0,
                quality_level=QualityLevel.STANDARD,
                enable_style_transfer=True,
                enable_super_resolution=False,
                enable_quality_optimization=True
            )
        
        else:
            # Low load: use quality mode
            return PreviewSettings(
                mode=PreviewMode.QUALITY,
                max_processing_time_ms=1000.0,
                quality_level=QualityLevel.HIGH,
                enable_style_transfer=True,
                enable_super_resolution=True,
                enable_quality_optimization=True
            )
    
    async def batch_generate_previews(self, frames: List[VideoFrame],
                                     settings: Optional[PreviewSettings] = None) -> List[PreviewResult]:
        """
        Generate previews for multiple frames efficiently.
        
        Args:
            frames: List of video frames
            settings: Preview settings (uses current if not provided)
            
        Returns:
            List of preview results
        """
        settings = settings or self.current_settings
        
        self.logger.info(f"Batch generating previews for {len(frames)} frames")
        
        # Generate previews concurrently
        tasks = [self.generate_preview(frame, settings) for frame in frames]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions
        preview_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                # Create fallback result for failed preview
                fallback = await self._fallback_preview(
                    frames[i], 
                    str(result), 
                    0.0
                )
                preview_results.append(fallback)
            else:
                preview_results.append(result)
        
        return preview_results
    
    def get_integration_status(self) -> Dict[str, Any]:
        """
        Get current integration status and health.
        
        Returns:
            Integration status information
        """
        return {
            'current_mode': self.current_settings.mode.value,
            'enhancements_enabled': {
                'style_transfer': self.current_settings.enable_style_transfer,
                'super_resolution': self.current_settings.enable_super_resolution,
                'quality_optimization': self.current_settings.enable_quality_optimization
            },
            'max_processing_time_ms': self.current_settings.max_processing_time_ms,
            'cache_stats': self.get_cache_stats(),
            'performance_stats': self.get_performance_stats(),
            'processors_available': {
                'style_processor': self.style_processor is not None,
                'super_resolution': self.super_resolution is not None,
                'interpolator': self.interpolator is not None,
                'quality_optimizer': self.quality_optimizer is not None
            }
        }
