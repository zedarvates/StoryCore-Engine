"""
Super Resolution Engine - AI-powered upscaling with detail preservation.

This module provides intelligent super-resolution upscaling for video frames
with quality assessment, detail preservation, and performance optimization.
"""

import asyncio
import logging
import hashlib
import time
import math
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum

from .ai_enhancement_engine import (
    VideoFrame, EnhancedFrame, EnhancementMetadata, EnhancementType,
    QualityLevel, PerformanceMode
)
from .model_manager import ModelManager, ModelLoadResult


class UpscaleFactor(Enum):
    """Supported upscaling factors."""
    X2 = 2
    X4 = 4
    X8 = 8


class UpscaleQuality(Enum):
    """Quality levels for upscaling operations."""
    FAST = "fast"              # Fast processing, lower quality
    BALANCED = "balanced"      # Balanced quality and speed
    HIGH_QUALITY = "high_quality"  # High quality, slower processing


class TraditionalMethod(Enum):
    """Traditional upscaling methods for comparison."""
    NEAREST_NEIGHBOR = "nearest_neighbor"
    BILINEAR = "bilinear"
    BICUBIC = "bicubic"
    LANCZOS = "lanczos"


@dataclass
class UpscaleConfig:
    """Configuration for super-resolution upscaling."""
    factor: UpscaleFactor
    quality: UpscaleQuality = UpscaleQuality.BALANCED
    preserve_details: bool = True
    enhance_sharpness: bool = True
    denoise: bool = False
    performance_mode: PerformanceMode = PerformanceMode.BALANCED
    
    def __post_init__(self):
        """Validate configuration parameters."""
        if not isinstance(self.factor, UpscaleFactor):
            raise ValueError(f"Invalid upscale factor: {self.factor}")


@dataclass
class QualityMetrics:
    """Quality assessment metrics for upscaled content."""
    psnr: float  # Peak Signal-to-Noise Ratio
    ssim: float  # Structural Similarity Index
    detail_preservation_score: float
    edge_preservation_score: float
    texture_quality_score: float
    overall_quality_score: float
    
    def to_dict(self) -> Dict[str, float]:
        """Convert to dictionary for serialization."""
        return {
            'psnr': self.psnr,
            'ssim': self.ssim,
            'detail_preservation': self.detail_preservation_score,
            'edge_preservation': self.edge_preservation_score,
            'texture_quality': self.texture_quality_score,
            'overall_quality': self.overall_quality_score
        }


@dataclass
class ComparisonResult:
    """Result of comparison with traditional upscaling methods."""
    ai_quality: QualityMetrics
    traditional_results: Dict[TraditionalMethod, QualityMetrics]
    improvement_percentage: float
    best_traditional_method: TraditionalMethod
    recommendation: str
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'ai_quality': self.ai_quality.to_dict(),
            'traditional_results': {
                method.value: metrics.to_dict()
                for method, metrics in self.traditional_results.items()
            },
            'improvement_percentage': self.improvement_percentage,
            'best_traditional_method': self.best_traditional_method.value,
            'recommendation': self.recommendation
        }


@dataclass
class UpscaledFrame:
    """Result of super-resolution upscaling operation."""
    original_frame: VideoFrame
    upscaled_data: bytes
    upscale_config: UpscaleConfig
    processing_time_ms: float
    quality_metrics: QualityMetrics
    comparison_result: Optional[ComparisonResult] = None
    fallback_used: bool = False
    error_message: Optional[str] = None
    
    def to_enhanced_frame(self) -> EnhancedFrame:
        """Convert to EnhancedFrame for compatibility."""
        metadata = EnhancementMetadata(
            enhancement_type=EnhancementType.SUPER_RESOLUTION,
            model_id=f"super_resolution_{self.upscale_config.factor.value}x",
            model_version="2.0.0",
            parameters={
                'upscale_factor': self.upscale_config.factor.value,
                'quality': self.upscale_config.quality.value,
                'preserve_details': self.upscale_config.preserve_details
            },
            processing_time_ms=self.processing_time_ms,
            quality_score=self.quality_metrics.overall_quality_score,
            confidence_score=self.quality_metrics.detail_preservation_score,
            gpu_used=True,
            cache_hit=False
        )
        
        return EnhancedFrame(
            original_frame=self.original_frame,
            enhanced_data=self.upscaled_data,
            enhancement_metadata=metadata,
            processing_time=self.processing_time_ms,
            quality_score=self.quality_metrics.overall_quality_score,
            confidence_score=self.quality_metrics.detail_preservation_score
        )


class SuperResolutionEngine:
    """
    AI-powered super-resolution engine with detail preservation.
    
    Provides intelligent upscaling for video frames with quality assessment,
    comparison with traditional methods, and performance optimization.
    """
    
    def __init__(self, model_manager: ModelManager):
        """
        Initialize Super Resolution Engine.
        
        Args:
            model_manager: Model manager for loading and managing AI models
        """
        self.model_manager = model_manager
        self.logger = logging.getLogger(__name__)
        
        # Supported upscale factors
        self.supported_factors = [UpscaleFactor.X2, UpscaleFactor.X4, UpscaleFactor.X8]
        
        # Performance tracking
        self.processing_stats = {
            'total_frames': 0,
            'successful_upscales': 0,
            'failed_upscales': 0,
            'fallback_used': 0,
            'total_processing_time': 0.0,
            'average_quality_score': 0.0,
            'average_detail_preservation': 0.0,
            'by_factor': {
                2: {'count': 0, 'avg_time': 0.0, 'avg_quality': 0.0},
                4: {'count': 0, 'avg_time': 0.0, 'avg_quality': 0.0},
                8: {'count': 0, 'avg_time': 0.0, 'avg_quality': 0.0}
            }
        }
        
        self.logger.info("Super Resolution Engine initialized")
    
    async def upscale_frame(self, frame: VideoFrame, config: UpscaleConfig,
                           compare_traditional: bool = False) -> UpscaledFrame:
        """
        Upscale a single video frame using AI super-resolution.
        
        Args:
            frame: Video frame to upscale
            config: Upscaling configuration
            compare_traditional: Whether to compare with traditional methods
            
        Returns:
            Upscaled frame with quality metrics
        """
        start_time = time.time()
        
        try:
            # Validate upscale factor
            if config.factor not in self.supported_factors:
                raise ValueError(f"Unsupported upscale factor: {config.factor}")
            
            # Load super-resolution model
            model_id = f"super_resolution_{config.factor.value}x_v2"
            model_result = await self.model_manager.load_model(
                model_id,
                device="auto"
            )
            
            if not model_result.success:
                # Fallback to traditional method
                return await self._fallback_to_traditional(
                    frame, config,
                    f"Model loading failed: {model_result.error_message}"
                )
            
            # Apply AI super-resolution
            upscaled_data, quality_metrics = await self._apply_super_resolution(
                frame, config, model_result.model
            )
            
            # Compare with traditional methods if requested
            comparison_result = None
            if compare_traditional:
                comparison_result = await self._compare_with_traditional(
                    frame, upscaled_data, config, quality_metrics
                )
            
            # Calculate processing time
            processing_time = (time.time() - start_time) * 1000
            
            # Update statistics
            self._update_stats(config.factor.value, processing_time, quality_metrics)
            
            # Create upscaled frame result
            upscaled_frame = UpscaledFrame(
                original_frame=frame,
                upscaled_data=upscaled_data,
                upscale_config=config,
                processing_time_ms=processing_time,
                quality_metrics=quality_metrics,
                comparison_result=comparison_result,
                fallback_used=False
            )
            
            self.logger.debug(
                f"Successfully upscaled frame {frame.frame_id} by {config.factor.value}x "
                f"in {processing_time:.2f}ms"
            )
            return upscaled_frame
        
        except Exception as e:
            self.processing_stats['failed_upscales'] += 1
            self.logger.error(f"Super-resolution failed for frame {frame.frame_id}: {e}")
            return await self._fallback_to_traditional(frame, config, str(e))
    
    async def upscale_sequence(self, frames: List[VideoFrame],
                              config: UpscaleConfig) -> List[UpscaledFrame]:
        """
        Upscale a sequence of frames with temporal consistency.
        
        Args:
            frames: List of video frames to upscale
            config: Upscaling configuration
            
        Returns:
            List of upscaled frames
        """
        if not frames:
            return []
        
        self.logger.info(
            f"Upscaling sequence of {len(frames)} frames by {config.factor.value}x"
        )
        
        upscaled_frames = []
        
        for i, frame in enumerate(frames):
            # Upscale frame
            upscaled_frame = await self.upscale_frame(frame, config)
            upscaled_frames.append(upscaled_frame)
            
            # Log progress
            if (i + 1) % 10 == 0:
                self.logger.info(f"Upscaled {i + 1}/{len(frames)} frames")
        
        self.logger.info(
            f"Completed upscaling sequence: {len(upscaled_frames)}/{len(frames)} frames successful"
        )
        return upscaled_frames
    
    def estimate_processing_time(self, frame_size: Tuple[int, int],
                                factor: UpscaleFactor,
                                quality: UpscaleQuality = UpscaleQuality.BALANCED) -> float:
        """
        Estimate processing time for upscaling operation.
        
        Args:
            frame_size: (width, height) of input frame
            factor: Upscale factor
            quality: Quality level
            
        Returns:
            Estimated processing time in milliseconds
        """
        width, height = frame_size
        input_pixels = width * height
        output_pixels = input_pixels * (factor.value ** 2)
        
        # Base time per megapixel (milliseconds)
        base_time_per_mp = {
            UpscaleQuality.FAST: 50.0,
            UpscaleQuality.BALANCED: 150.0,
            UpscaleQuality.HIGH_QUALITY: 300.0
        }
        
        # Calculate base time
        input_mp = input_pixels / 1_000_000
        base_time = base_time_per_mp[quality] * input_mp
        
        # Factor complexity multiplier
        factor_multiplier = {
            UpscaleFactor.X2: 1.0,
            UpscaleFactor.X4: 1.5,
            UpscaleFactor.X8: 2.0
        }
        
        estimated_time = base_time * factor_multiplier[factor]
        
        return estimated_time
    
    async def _apply_super_resolution(self, frame: VideoFrame, config: UpscaleConfig,
                                     model: Any) -> Tuple[bytes, QualityMetrics]:
        """
        Apply AI super-resolution using loaded model.
        
        Args:
            frame: Video frame to upscale
            config: Upscaling configuration
            model: Loaded super-resolution model
            
        Returns:
            Tuple of (upscaled_data, quality_metrics)
        """
        # Simulate super-resolution processing
        # In real implementation, this would use the actual AI model
        
        # Simulate processing time based on quality level
        processing_delays = {
            UpscaleQuality.FAST: 0.05,
            UpscaleQuality.BALANCED: 0.15,
            UpscaleQuality.HIGH_QUALITY: 0.3
        }
        await asyncio.sleep(processing_delays.get(config.quality, 0.15))
        
        # Simulate upscaled data (in real implementation, would be actual upscaled image)
        # Output size should be factor^2 times larger
        output_size = len(frame.data) * (config.factor.value ** 2)
        upscaled_data = frame.data * config.factor.value  # Placeholder
        
        # Calculate quality metrics
        quality_metrics = self._calculate_quality_metrics(
            frame, upscaled_data, config
        )
        
        return upscaled_data, quality_metrics
    
    def _calculate_quality_metrics(self, original_frame: VideoFrame,
                                   upscaled_data: bytes,
                                   config: UpscaleConfig) -> QualityMetrics:
        """
        Calculate quality metrics for upscaled content.
        
        Args:
            original_frame: Original video frame
            upscaled_data: Upscaled frame data
            config: Upscaling configuration
            
        Returns:
            Quality metrics
        """
        # Simulate quality metric calculations
        # In real implementation, would use actual image quality assessment
        
        # Base quality scores
        base_psnr = 35.0 + (config.factor.value * 2.0)
        base_ssim = 0.90 - (config.factor.value * 0.05)
        
        # Adjust based on quality level
        quality_multipliers = {
            UpscaleQuality.FAST: 0.85,
            UpscaleQuality.BALANCED: 1.0,
            UpscaleQuality.HIGH_QUALITY: 1.15
        }
        multiplier = quality_multipliers[config.quality]
        
        # Calculate metrics
        psnr = base_psnr * multiplier
        ssim = min(1.0, base_ssim * multiplier)
        
        # Detail preservation (higher for preserve_details=True)
        detail_preservation = 0.85 if config.preserve_details else 0.70
        detail_preservation *= multiplier
        
        # Edge preservation (affected by upscale factor)
        edge_preservation = 0.90 - (config.factor.value * 0.05)
        edge_preservation *= multiplier
        
        # Texture quality (affected by sharpness enhancement)
        texture_quality = 0.88 if config.enhance_sharpness else 0.80
        texture_quality *= multiplier
        
        # Overall quality score (weighted average)
        overall_quality = (
            ssim * 0.3 +
            detail_preservation * 0.3 +
            edge_preservation * 0.2 +
            texture_quality * 0.2
        )
        
        return QualityMetrics(
            psnr=min(50.0, psnr),
            ssim=min(1.0, ssim),
            detail_preservation_score=min(1.0, detail_preservation),
            edge_preservation_score=min(1.0, edge_preservation),
            texture_quality_score=min(1.0, texture_quality),
            overall_quality_score=min(1.0, overall_quality)
        )
    
    async def _compare_with_traditional(self, original_frame: VideoFrame,
                                       ai_upscaled_data: bytes,
                                       config: UpscaleConfig,
                                       ai_quality: QualityMetrics) -> ComparisonResult:
        """
        Compare AI upscaling with traditional methods.
        
        Args:
            original_frame: Original video frame
            ai_upscaled_data: AI-upscaled frame data
            config: Upscaling configuration
            ai_quality: Quality metrics for AI upscaling
            
        Returns:
            Comparison result with traditional methods
        """
        # Simulate traditional upscaling methods
        traditional_results = {}
        
        for method in TraditionalMethod:
            # Simulate traditional upscaling
            traditional_quality = self._simulate_traditional_upscaling(
                original_frame, config.factor, method
            )
            traditional_results[method] = traditional_quality
        
        # Find best traditional method
        best_method = max(
            traditional_results.items(),
            key=lambda x: x[1].overall_quality_score
        )[0]
        best_quality = traditional_results[best_method]
        
        # Calculate improvement percentage
        improvement = (
            (ai_quality.overall_quality_score - best_quality.overall_quality_score) /
            best_quality.overall_quality_score * 100
        )
        
        # Generate recommendation
        if improvement > 20:
            recommendation = "AI super-resolution provides significant quality improvement. Recommended."
        elif improvement > 10:
            recommendation = "AI super-resolution provides moderate quality improvement. Recommended for quality-critical content."
        elif improvement > 0:
            recommendation = "AI super-resolution provides slight quality improvement. Consider traditional methods for faster processing."
        else:
            recommendation = f"Traditional {best_method.value} method may be sufficient. AI super-resolution provides minimal improvement."
        
        return ComparisonResult(
            ai_quality=ai_quality,
            traditional_results=traditional_results,
            improvement_percentage=improvement,
            best_traditional_method=best_method,
            recommendation=recommendation
        )
    
    def _simulate_traditional_upscaling(self, frame: VideoFrame,
                                       factor: UpscaleFactor,
                                       method: TraditionalMethod) -> QualityMetrics:
        """
        Simulate traditional upscaling method for comparison.
        
        Args:
            frame: Original video frame
            factor: Upscale factor
            method: Traditional upscaling method
            
        Returns:
            Quality metrics for traditional method
        """
        # Simulate quality scores for different traditional methods
        method_quality = {
            TraditionalMethod.NEAREST_NEIGHBOR: {
                'psnr': 25.0,
                'ssim': 0.70,
                'detail': 0.60,
                'edge': 0.65,
                'texture': 0.55
            },
            TraditionalMethod.BILINEAR: {
                'psnr': 28.0,
                'ssim': 0.75,
                'detail': 0.68,
                'edge': 0.72,
                'texture': 0.65
            },
            TraditionalMethod.BICUBIC: {
                'psnr': 30.0,
                'ssim': 0.80,
                'detail': 0.75,
                'edge': 0.78,
                'texture': 0.72
            },
            TraditionalMethod.LANCZOS: {
                'psnr': 32.0,
                'ssim': 0.82,
                'detail': 0.78,
                'edge': 0.80,
                'texture': 0.75
            }
        }
        
        base_scores = method_quality[method]
        
        # Adjust for upscale factor (quality degrades with higher factors)
        factor_penalty = (factor.value - 2) * 0.05
        
        psnr = base_scores['psnr'] - (factor_penalty * 10)
        ssim = max(0.5, base_scores['ssim'] - factor_penalty)
        detail = max(0.5, base_scores['detail'] - factor_penalty)
        edge = max(0.5, base_scores['edge'] - factor_penalty)
        texture = max(0.5, base_scores['texture'] - factor_penalty)
        
        overall = (ssim * 0.3 + detail * 0.3 + edge * 0.2 + texture * 0.2)
        
        return QualityMetrics(
            psnr=psnr,
            ssim=ssim,
            detail_preservation_score=detail,
            edge_preservation_score=edge,
            texture_quality_score=texture,
            overall_quality_score=overall
        )
    
    async def _fallback_to_traditional(self, frame: VideoFrame, config: UpscaleConfig,
                                      error_message: str) -> UpscaledFrame:
        """
        Graceful fallback to traditional upscaling method.
        
        Args:
            frame: Original video frame
            config: Upscaling configuration
            error_message: Error message describing failure
            
        Returns:
            Upscaled frame using traditional method
        """
        self.processing_stats['fallback_used'] += 1
        self.logger.warning(f"Using fallback for frame {frame.frame_id}: {error_message}")
        
        # Use best traditional method (Lanczos)
        traditional_quality = self._simulate_traditional_upscaling(
            frame, config.factor, TraditionalMethod.LANCZOS
        )
        
        # Simulate traditional upscaling
        upscaled_data = frame.data * config.factor.value  # Placeholder
        
        return UpscaledFrame(
            original_frame=frame,
            upscaled_data=upscaled_data,
            upscale_config=config,
            processing_time_ms=50.0,  # Fast traditional method
            quality_metrics=traditional_quality,
            fallback_used=True,
            error_message=error_message
        )
    
    def _update_stats(self, factor: int, processing_time: float,
                     quality_metrics: QualityMetrics):
        """Update processing statistics."""
        self.processing_stats['total_frames'] += 1
        self.processing_stats['successful_upscales'] += 1
        self.processing_stats['total_processing_time'] += processing_time
        
        # Update factor-specific stats
        factor_stats = self.processing_stats['by_factor'][factor]
        factor_stats['count'] += 1
        
        # Update running averages
        count = factor_stats['count']
        factor_stats['avg_time'] = (
            (factor_stats['avg_time'] * (count - 1) + processing_time) / count
        )
        factor_stats['avg_quality'] = (
            (factor_stats['avg_quality'] * (count - 1) + quality_metrics.overall_quality_score) / count
        )
    
    def get_processing_stats(self) -> Dict[str, Any]:
        """Get processing statistics."""
        stats = self.processing_stats.copy()
        
        # Calculate derived metrics
        if stats['total_frames'] > 0:
            stats['success_rate'] = stats['successful_upscales'] / stats['total_frames']
            stats['fallback_rate'] = stats['fallback_used'] / stats['total_frames']
            stats['average_processing_time'] = stats['total_processing_time'] / stats['total_frames']
        else:
            stats['success_rate'] = 0.0
            stats['fallback_rate'] = 0.0
            stats['average_processing_time'] = 0.0
        
        return stats
    
    def get_supported_factors(self) -> List[UpscaleFactor]:
        """Get list of supported upscale factors."""
        return self.supported_factors.copy()
    
    def reset_stats(self):
        """Reset processing statistics."""
        self.processing_stats = {
            'total_frames': 0,
            'successful_upscales': 0,
            'failed_upscales': 0,
            'fallback_used': 0,
            'total_processing_time': 0.0,
            'average_quality_score': 0.0,
            'average_detail_preservation': 0.0,
            'by_factor': {
                2: {'count': 0, 'avg_time': 0.0, 'avg_quality': 0.0},
                4: {'count': 0, 'avg_time': 0.0, 'avg_quality': 0.0},
                8: {'count': 0, 'avg_time': 0.0, 'avg_quality': 0.0}
            }
        }
        self.logger.info("Processing statistics reset")
