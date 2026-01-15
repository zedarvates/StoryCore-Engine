"""
Quality Optimizer - Automatic quality assessment and enhancement suggestions.

This module provides multi-dimensional quality analysis, enhancement recommendations,
and automatic quality optimization while preserving artistic intent.
"""

import asyncio
import logging
import time
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum

from .ai_enhancement_engine import (
    VideoFrame, EnhancedFrame, EnhancementMetadata,
    QualityLevel, PerformanceMode, EnhancementType as SystemEnhancementType
)
from .model_manager import ModelManager, ModelLoadResult


class QualityDimension(Enum):
    """Quality dimensions for assessment."""
    SHARPNESS = "sharpness"
    COLOR_ACCURACY = "color_accuracy"
    NOISE_LEVEL = "noise_level"
    CONTRAST = "contrast"
    BRIGHTNESS = "brightness"
    SATURATION = "saturation"
    DETAIL_PRESERVATION = "detail_preservation"
    ARTIFACT_PRESENCE = "artifact_presence"


class QualityEnhancementType(Enum):
    """Types of quality enhancements (specific to quality optimization)."""
    SHARPEN = "sharpen"
    DENOISE = "denoise"
    COLOR_CORRECTION = "color_correction"
    CONTRAST_ADJUSTMENT = "contrast_adjustment"
    BRIGHTNESS_ADJUSTMENT = "brightness_adjustment"
    DETAIL_ENHANCEMENT = "detail_enhancement"
    ARTIFACT_REMOVAL = "artifact_removal"


@dataclass
class QualityMetric:
    """Quality metric for a specific dimension."""
    dimension: QualityDimension
    score: float  # 0.0 to 1.0
    threshold: float = 0.7
    is_acceptable: bool = field(init=False)
    severity: str = field(init=False)  # low, medium, high, critical
    
    def __post_init__(self):
        """Calculate derived fields."""
        self.is_acceptable = self.score >= self.threshold
        
        if self.score >= 0.9:
            self.severity = "low"
        elif self.score >= 0.7:
            self.severity = "medium"
        elif self.score >= 0.5:
            self.severity = "high"
        else:
            self.severity = "critical"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'dimension': self.dimension.value,
            'score': self.score,
            'threshold': self.threshold,
            'is_acceptable': self.is_acceptable,
            'severity': self.severity
        }


@dataclass
class QualityAnalysis:
    """Comprehensive quality analysis result."""
    frame_id: str
    overall_score: float
    metrics: Dict[QualityDimension, QualityMetric]
    issues_detected: List[str]
    analysis_time_ms: float
    artistic_intent_preserved: bool = True
    
    def get_failing_dimensions(self) -> List[QualityDimension]:
        """Get list of dimensions that fail quality threshold."""
        return [
            dim for dim, metric in self.metrics.items()
            if not metric.is_acceptable
        ]
    
    def get_critical_issues(self) -> List[QualityMetric]:
        """Get metrics with critical severity."""
        return [
            metric for metric in self.metrics.values()
            if metric.severity == "critical"
        ]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'frame_id': self.frame_id,
            'overall_score': self.overall_score,
            'metrics': {dim.value: metric.to_dict() for dim, metric in self.metrics.items()},
            'issues_detected': self.issues_detected,
            'analysis_time_ms': self.analysis_time_ms,
            'artistic_intent_preserved': self.artistic_intent_preserved
        }


@dataclass
class EnhancementSuggestion:
    """Suggestion for quality enhancement."""
    enhancement_type: QualityEnhancementType
    target_dimension: QualityDimension
    confidence_score: float  # 0.0 to 1.0
    priority: int  # 1 (highest) to 5 (lowest)
    parameters: Dict[str, Any]
    expected_improvement: float  # Expected score improvement
    description: str
    warnings: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'enhancement_type': self.enhancement_type.value,
            'target_dimension': self.target_dimension.value,
            'confidence_score': self.confidence_score,
            'priority': self.priority,
            'parameters': self.parameters,
            'expected_improvement': self.expected_improvement,
            'description': self.description,
            'warnings': self.warnings
        }


@dataclass
class EnhancementResult:
    """Result of applying quality enhancement."""
    original_frame: VideoFrame
    enhanced_data: bytes
    enhancements_applied: List[QualityEnhancementType]
    quality_before: QualityAnalysis
    quality_after: QualityAnalysis
    processing_time_ms: float
    success: bool
    error_message: Optional[str] = None
    
    def get_improvement(self) -> float:
        """Calculate overall quality improvement."""
        return self.quality_after.overall_score - self.quality_before.overall_score
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'frame_id': self.original_frame.frame_id,
            'enhancements_applied': [e.value for e in self.enhancements_applied],
            'quality_before': self.quality_before.to_dict(),
            'quality_after': self.quality_after.to_dict(),
            'improvement': self.get_improvement(),
            'processing_time_ms': self.processing_time_ms,
            'success': self.success,
            'error_message': self.error_message
        }


class QualityAssessor:
    """Assesses video frame quality across multiple dimensions."""
    
    def __init__(self):
        """Initialize quality assessor."""
        self.logger = logging.getLogger(__name__)
        
        # Quality thresholds for each dimension
        self.thresholds = {
            QualityDimension.SHARPNESS: 0.7,
            QualityDimension.COLOR_ACCURACY: 0.75,
            QualityDimension.NOISE_LEVEL: 0.8,
            QualityDimension.CONTRAST: 0.7,
            QualityDimension.BRIGHTNESS: 0.75,
            QualityDimension.SATURATION: 0.7,
            QualityDimension.DETAIL_PRESERVATION: 0.8,
            QualityDimension.ARTIFACT_PRESENCE: 0.85
        }
    
    async def assess_quality(self, frame: VideoFrame) -> QualityAnalysis:
        """
        Assess frame quality across all dimensions.
        
        Args:
            frame: Video frame to assess
            
        Returns:
            Comprehensive quality analysis
        """
        start_time = time.time()
        
        # Assess each quality dimension
        metrics = {}
        issues = []
        
        # Sharpness assessment
        sharpness_score = await self._assess_sharpness(frame)
        metrics[QualityDimension.SHARPNESS] = QualityMetric(
            dimension=QualityDimension.SHARPNESS,
            score=sharpness_score,
            threshold=self.thresholds[QualityDimension.SHARPNESS]
        )
        if not metrics[QualityDimension.SHARPNESS].is_acceptable:
            issues.append(f"Low sharpness detected (score: {sharpness_score:.2f})")
        
        # Color accuracy assessment
        color_score = await self._assess_color_accuracy(frame)
        metrics[QualityDimension.COLOR_ACCURACY] = QualityMetric(
            dimension=QualityDimension.COLOR_ACCURACY,
            score=color_score,
            threshold=self.thresholds[QualityDimension.COLOR_ACCURACY]
        )
        if not metrics[QualityDimension.COLOR_ACCURACY].is_acceptable:
            issues.append(f"Color accuracy issues detected (score: {color_score:.2f})")
        
        # Noise level assessment
        noise_score = await self._assess_noise_level(frame)
        metrics[QualityDimension.NOISE_LEVEL] = QualityMetric(
            dimension=QualityDimension.NOISE_LEVEL,
            score=noise_score,
            threshold=self.thresholds[QualityDimension.NOISE_LEVEL]
        )
        if not metrics[QualityDimension.NOISE_LEVEL].is_acceptable:
            issues.append(f"High noise level detected (score: {noise_score:.2f})")
        
        # Contrast assessment
        contrast_score = await self._assess_contrast(frame)
        metrics[QualityDimension.CONTRAST] = QualityMetric(
            dimension=QualityDimension.CONTRAST,
            score=contrast_score,
            threshold=self.thresholds[QualityDimension.CONTRAST]
        )
        if not metrics[QualityDimension.CONTRAST].is_acceptable:
            issues.append(f"Poor contrast detected (score: {contrast_score:.2f})")
        
        # Brightness assessment
        brightness_score = await self._assess_brightness(frame)
        metrics[QualityDimension.BRIGHTNESS] = QualityMetric(
            dimension=QualityDimension.BRIGHTNESS,
            score=brightness_score,
            threshold=self.thresholds[QualityDimension.BRIGHTNESS]
        )
        if not metrics[QualityDimension.BRIGHTNESS].is_acceptable:
            issues.append(f"Brightness issues detected (score: {brightness_score:.2f})")
        
        # Saturation assessment
        saturation_score = await self._assess_saturation(frame)
        metrics[QualityDimension.SATURATION] = QualityMetric(
            dimension=QualityDimension.SATURATION,
            score=saturation_score,
            threshold=self.thresholds[QualityDimension.SATURATION]
        )
        if not metrics[QualityDimension.SATURATION].is_acceptable:
            issues.append(f"Saturation issues detected (score: {saturation_score:.2f})")
        
        # Detail preservation assessment
        detail_score = await self._assess_detail_preservation(frame)
        metrics[QualityDimension.DETAIL_PRESERVATION] = QualityMetric(
            dimension=QualityDimension.DETAIL_PRESERVATION,
            score=detail_score,
            threshold=self.thresholds[QualityDimension.DETAIL_PRESERVATION]
        )
        if not metrics[QualityDimension.DETAIL_PRESERVATION].is_acceptable:
            issues.append(f"Detail loss detected (score: {detail_score:.2f})")
        
        # Artifact presence assessment
        artifact_score = await self._assess_artifacts(frame)
        metrics[QualityDimension.ARTIFACT_PRESENCE] = QualityMetric(
            dimension=QualityDimension.ARTIFACT_PRESENCE,
            score=artifact_score,
            threshold=self.thresholds[QualityDimension.ARTIFACT_PRESENCE]
        )
        if not metrics[QualityDimension.ARTIFACT_PRESENCE].is_acceptable:
            issues.append(f"Artifacts detected (score: {artifact_score:.2f})")
        
        # Calculate overall score (weighted average)
        weights = {
            QualityDimension.SHARPNESS: 0.15,
            QualityDimension.COLOR_ACCURACY: 0.15,
            QualityDimension.NOISE_LEVEL: 0.15,
            QualityDimension.CONTRAST: 0.10,
            QualityDimension.BRIGHTNESS: 0.10,
            QualityDimension.SATURATION: 0.10,
            QualityDimension.DETAIL_PRESERVATION: 0.15,
            QualityDimension.ARTIFACT_PRESENCE: 0.10
        }
        
        overall_score = sum(
            metrics[dim].score * weights[dim]
            for dim in QualityDimension
        )
        
        analysis_time = (time.time() - start_time) * 1000
        
        return QualityAnalysis(
            frame_id=frame.frame_id,
            overall_score=overall_score,
            metrics=metrics,
            issues_detected=issues,
            analysis_time_ms=analysis_time,
            artistic_intent_preserved=True
        )
    
    async def _assess_sharpness(self, frame: VideoFrame) -> float:
        """Assess frame sharpness using Laplacian variance."""
        # Simulate sharpness assessment
        await asyncio.sleep(0.01)
        
        # In real implementation, would calculate Laplacian variance
        # Simulated score based on frame properties
        base_score = 0.75
        variance = 0.1
        
        import random
        return max(0.0, min(1.0, base_score + random.uniform(-variance, variance)))
    
    async def _assess_color_accuracy(self, frame: VideoFrame) -> float:
        """Assess color accuracy and balance."""
        await asyncio.sleep(0.01)
        
        # Simulate color accuracy assessment
        # In real implementation, would analyze color histograms and balance
        base_score = 0.80
        variance = 0.1
        
        import random
        return max(0.0, min(1.0, base_score + random.uniform(-variance, variance)))
    
    async def _assess_noise_level(self, frame: VideoFrame) -> float:
        """Assess noise level in frame."""
        await asyncio.sleep(0.01)
        
        # Simulate noise assessment
        # In real implementation, would analyze pixel variance and patterns
        base_score = 0.85
        variance = 0.1
        
        import random
        return max(0.0, min(1.0, base_score + random.uniform(-variance, variance)))
    
    async def _assess_contrast(self, frame: VideoFrame) -> float:
        """Assess contrast levels."""
        await asyncio.sleep(0.01)
        
        # Simulate contrast assessment
        base_score = 0.78
        variance = 0.1
        
        import random
        return max(0.0, min(1.0, base_score + random.uniform(-variance, variance)))
    
    async def _assess_brightness(self, frame: VideoFrame) -> float:
        """Assess brightness levels."""
        await asyncio.sleep(0.01)
        
        # Simulate brightness assessment
        base_score = 0.82
        variance = 0.1
        
        import random
        return max(0.0, min(1.0, base_score + random.uniform(-variance, variance)))
    
    async def _assess_saturation(self, frame: VideoFrame) -> float:
        """Assess color saturation."""
        await asyncio.sleep(0.01)
        
        # Simulate saturation assessment
        base_score = 0.77
        variance = 0.1
        
        import random
        return max(0.0, min(1.0, base_score + random.uniform(-variance, variance)))
    
    async def _assess_detail_preservation(self, frame: VideoFrame) -> float:
        """Assess detail preservation."""
        await asyncio.sleep(0.01)
        
        # Simulate detail preservation assessment
        base_score = 0.83
        variance = 0.1
        
        import random
        return max(0.0, min(1.0, base_score + random.uniform(-variance, variance)))
    
    async def _assess_artifacts(self, frame: VideoFrame) -> float:
        """Assess presence of compression or processing artifacts."""
        await asyncio.sleep(0.01)
        
        # Simulate artifact detection
        # Higher score means fewer artifacts
        base_score = 0.88
        variance = 0.1
        
        import random
        return max(0.0, min(1.0, base_score + random.uniform(-variance, variance)))


class QualityOptimizer:
    """
    Automatic quality assessment and enhancement optimizer.
    
    Provides multi-dimensional quality analysis, intelligent enhancement
    recommendations, and automatic quality improvements while preserving
    artistic intent.
    """
    
    def __init__(self, model_manager: ModelManager):
        """
        Initialize Quality Optimizer.
        
        Args:
            model_manager: Model manager for loading quality assessment models
        """
        self.model_manager = model_manager
        self.logger = logging.getLogger(__name__)
        self.quality_assessor = QualityAssessor()
        
        # Performance tracking
        self.optimization_stats = {
            'total_analyses': 0,
            'total_enhancements': 0,
            'successful_enhancements': 0,
            'failed_enhancements': 0,
            'total_improvement': 0.0,
            'average_improvement': 0.0
        }
        
        self.logger.info("Quality Optimizer initialized")
    
    async def analyze_quality(self, frame: VideoFrame) -> QualityAnalysis:
        """
        Analyze frame quality across multiple dimensions.
        
        Args:
            frame: Video frame to analyze
            
        Returns:
            Comprehensive quality analysis
        """
        self.optimization_stats['total_analyses'] += 1
        
        # Perform quality assessment
        analysis = await self.quality_assessor.assess_quality(frame)
        
        self.logger.debug(
            f"Quality analysis for frame {frame.frame_id}: "
            f"overall={analysis.overall_score:.2f}, "
            f"issues={len(analysis.issues_detected)}"
        )
        
        return analysis
    
    async def suggest_enhancements(self, quality_analysis: QualityAnalysis) -> List[EnhancementSuggestion]:
        """
        Generate enhancement suggestions based on quality analysis.
        
        Args:
            quality_analysis: Quality analysis result
            
        Returns:
            List of enhancement suggestions with confidence scores
        """
        suggestions = []
        
        # Analyze each failing dimension and generate suggestions
        failing_dimensions = quality_analysis.get_failing_dimensions()
        
        for dimension in failing_dimensions:
            metric = quality_analysis.metrics[dimension]
            
            # Generate appropriate enhancement suggestion
            if dimension == QualityDimension.SHARPNESS:
                suggestions.append(self._suggest_sharpening(metric))
            
            elif dimension == QualityDimension.NOISE_LEVEL:
                suggestions.append(self._suggest_denoising(metric))
            
            elif dimension == QualityDimension.COLOR_ACCURACY:
                suggestions.append(self._suggest_color_correction(metric))
            
            elif dimension == QualityDimension.CONTRAST:
                suggestions.append(self._suggest_contrast_adjustment(metric))
            
            elif dimension == QualityDimension.BRIGHTNESS:
                suggestions.append(self._suggest_brightness_adjustment(metric))
            
            elif dimension == QualityDimension.DETAIL_PRESERVATION:
                suggestions.append(self._suggest_detail_enhancement(metric))
            
            elif dimension == QualityDimension.ARTIFACT_PRESENCE:
                suggestions.append(self._suggest_artifact_removal(metric))
        
        # Sort suggestions by priority
        suggestions.sort(key=lambda s: s.priority)
        
        self.logger.info(
            f"Generated {len(suggestions)} enhancement suggestions for frame {quality_analysis.frame_id}"
        )
        
        return suggestions
    
    def _suggest_sharpening(self, metric: QualityMetric) -> EnhancementSuggestion:
        """Generate sharpening enhancement suggestion."""
        # Calculate enhancement strength based on score deficit
        score_deficit = metric.threshold - metric.score
        strength = min(1.0, score_deficit * 2.0)
        
        return EnhancementSuggestion(
            enhancement_type=QualityEnhancementType.SHARPEN,
            target_dimension=QualityDimension.SHARPNESS,
            confidence_score=0.85,
            priority=1 if metric.severity == "critical" else 2,
            parameters={'strength': strength, 'radius': 1.0},
            expected_improvement=score_deficit * 0.7,
            description=f"Apply sharpening to improve clarity (strength: {strength:.2f})",
            warnings=["May enhance noise if present"] if metric.score < 0.5 else []
        )
    
    def _suggest_denoising(self, metric: QualityMetric) -> EnhancementSuggestion:
        """Generate denoising enhancement suggestion."""
        score_deficit = metric.threshold - metric.score
        strength = min(1.0, score_deficit * 1.5)
        
        return EnhancementSuggestion(
            enhancement_type=QualityEnhancementType.DENOISE,
            target_dimension=QualityDimension.NOISE_LEVEL,
            confidence_score=0.90,
            priority=1 if metric.severity == "critical" else 2,
            parameters={'strength': strength, 'preserve_detail': True},
            expected_improvement=score_deficit * 0.8,
            description=f"Apply noise reduction (strength: {strength:.2f})",
            warnings=["May reduce fine details"] if strength > 0.7 else []
        )
    
    def _suggest_color_correction(self, metric: QualityMetric) -> EnhancementSuggestion:
        """Generate color correction enhancement suggestion."""
        score_deficit = metric.threshold - metric.score
        
        return EnhancementSuggestion(
            enhancement_type=QualityEnhancementType.COLOR_CORRECTION,
            target_dimension=QualityDimension.COLOR_ACCURACY,
            confidence_score=0.80,
            priority=2,
            parameters={'auto_balance': True, 'preserve_skin_tones': True},
            expected_improvement=score_deficit * 0.6,
            description="Apply automatic color correction and white balance",
            warnings=["May alter artistic color grading"]
        )
    
    def _suggest_contrast_adjustment(self, metric: QualityMetric) -> EnhancementSuggestion:
        """Generate contrast adjustment suggestion."""
        score_deficit = metric.threshold - metric.score
        adjustment = score_deficit * 0.5
        
        return EnhancementSuggestion(
            enhancement_type=QualityEnhancementType.CONTRAST_ADJUSTMENT,
            target_dimension=QualityDimension.CONTRAST,
            confidence_score=0.85,
            priority=2,
            parameters={'adjustment': adjustment, 'adaptive': True},
            expected_improvement=score_deficit * 0.7,
            description=f"Adjust contrast (adjustment: {adjustment:.2f})",
            warnings=[]
        )
    
    def _suggest_brightness_adjustment(self, metric: QualityMetric) -> EnhancementSuggestion:
        """Generate brightness adjustment suggestion."""
        score_deficit = metric.threshold - metric.score
        adjustment = score_deficit * 0.4
        
        return EnhancementSuggestion(
            enhancement_type=QualityEnhancementType.BRIGHTNESS_ADJUSTMENT,
            target_dimension=QualityDimension.BRIGHTNESS,
            confidence_score=0.85,
            priority=3,
            parameters={'adjustment': adjustment, 'preserve_highlights': True},
            expected_improvement=score_deficit * 0.6,
            description=f"Adjust brightness (adjustment: {adjustment:.2f})",
            warnings=[]
        )
    
    def _suggest_detail_enhancement(self, metric: QualityMetric) -> EnhancementSuggestion:
        """Generate detail enhancement suggestion."""
        score_deficit = metric.threshold - metric.score
        strength = min(1.0, score_deficit * 1.8)
        
        return EnhancementSuggestion(
            enhancement_type=QualityEnhancementType.DETAIL_ENHANCEMENT,
            target_dimension=QualityDimension.DETAIL_PRESERVATION,
            confidence_score=0.75,
            priority=2,
            parameters={'strength': strength, 'preserve_smooth_areas': True},
            expected_improvement=score_deficit * 0.5,
            description=f"Enhance fine details (strength: {strength:.2f})",
            warnings=["May enhance noise in smooth areas"]
        )
    
    def _suggest_artifact_removal(self, metric: QualityMetric) -> EnhancementSuggestion:
        """Generate artifact removal suggestion."""
        score_deficit = metric.threshold - metric.score
        strength = min(1.0, score_deficit * 2.0)
        
        return EnhancementSuggestion(
            enhancement_type=QualityEnhancementType.ARTIFACT_REMOVAL,
            target_dimension=QualityDimension.ARTIFACT_PRESENCE,
            confidence_score=0.70,
            priority=1 if metric.severity == "critical" else 3,
            parameters={'strength': strength, 'type': 'compression'},
            expected_improvement=score_deficit * 0.6,
            description=f"Remove compression artifacts (strength: {strength:.2f})",
            warnings=["May reduce overall sharpness"]
        )
    
    async def apply_auto_enhancement(self, frame: VideoFrame, 
                                    suggestions: List[EnhancementSuggestion]) -> EnhancementResult:
        """
        Apply automatic quality enhancements based on suggestions.
        
        Args:
            frame: Video frame to enhance
            suggestions: List of enhancement suggestions to apply
            
        Returns:
            Enhancement result with before/after quality analysis
        """
        start_time = time.time()
        
        try:
            # Get quality before enhancement
            quality_before = await self.analyze_quality(frame)
            
            # Apply enhancements in priority order
            enhanced_data = frame.data
            enhancements_applied = []
            
            for suggestion in suggestions:
                # Apply enhancement
                enhanced_data = await self._apply_enhancement(
                    enhanced_data, suggestion
                )
                enhancements_applied.append(suggestion.enhancement_type)
            
            # Create enhanced frame for quality assessment
            enhanced_frame = VideoFrame(
                frame_id=f"{frame.frame_id}_enhanced",
                data=enhanced_data,
                width=frame.width,
                height=frame.height,
                timestamp=frame.timestamp
            )
            
            # Get quality after enhancement
            quality_after = await self.analyze_quality(enhanced_frame)
            
            processing_time = (time.time() - start_time) * 1000
            
            # Update statistics
            self.optimization_stats['total_enhancements'] += 1
            self.optimization_stats['successful_enhancements'] += 1
            
            improvement = quality_after.overall_score - quality_before.overall_score
            self.optimization_stats['total_improvement'] += improvement
            self.optimization_stats['average_improvement'] = (
                self.optimization_stats['total_improvement'] / 
                self.optimization_stats['successful_enhancements']
            )
            
            result = EnhancementResult(
                original_frame=frame,
                enhanced_data=enhanced_data,
                enhancements_applied=enhancements_applied,
                quality_before=quality_before,
                quality_after=quality_after,
                processing_time_ms=processing_time,
                success=True
            )
            
            self.logger.info(
                f"Auto-enhancement completed for frame {frame.frame_id}: "
                f"improvement={improvement:.3f}, time={processing_time:.1f}ms"
            )
            
            return result
        
        except Exception as e:
            self.optimization_stats['failed_enhancements'] += 1
            self.logger.error(f"Auto-enhancement failed for frame {frame.frame_id}: {e}")
            
            # Return result with error
            processing_time = (time.time() - start_time) * 1000
            quality_before = await self.analyze_quality(frame)
            
            return EnhancementResult(
                original_frame=frame,
                enhanced_data=frame.data,
                enhancements_applied=[],
                quality_before=quality_before,
                quality_after=quality_before,
                processing_time_ms=processing_time,
                success=False,
                error_message=str(e)
            )
    
    async def _apply_enhancement(self, frame_data: bytes, 
                                suggestion: EnhancementSuggestion) -> bytes:
        """
        Apply a specific enhancement to frame data.
        
        Args:
            frame_data: Frame data to enhance
            suggestion: Enhancement suggestion with parameters
            
        Returns:
            Enhanced frame data
        """
        # Simulate enhancement processing
        # In real implementation, would apply actual image processing
        
        processing_delays = {
            QualityEnhancementType.SHARPEN: 0.02,
            QualityEnhancementType.DENOISE: 0.05,
            QualityEnhancementType.COLOR_CORRECTION: 0.03,
            QualityEnhancementType.CONTRAST_ADJUSTMENT: 0.02,
            QualityEnhancementType.BRIGHTNESS_ADJUSTMENT: 0.02,
            QualityEnhancementType.DETAIL_ENHANCEMENT: 0.04,
            QualityEnhancementType.ARTIFACT_REMOVAL: 0.06
        }
        
        delay = processing_delays.get(suggestion.enhancement_type, 0.03)
        await asyncio.sleep(delay)
        
        # Return enhanced data (placeholder - in real implementation would be processed)
        return frame_data
    
    def get_optimization_stats(self) -> Dict[str, Any]:
        """Get optimization statistics."""
        return self.optimization_stats.copy()
    
    def reset_stats(self):
        """Reset optimization statistics."""
        self.optimization_stats = {
            'total_analyses': 0,
            'total_enhancements': 0,
            'successful_enhancements': 0,
            'failed_enhancements': 0,
            'total_improvement': 0.0,
            'average_improvement': 0.0
        }
        self.logger.info("Optimization statistics reset")

    async def preview_enhancement(self, frame: VideoFrame, 
                                 suggestion: EnhancementSuggestion) -> Dict[str, Any]:
        """
        Preview a single enhancement without applying it permanently.
        
        Args:
            frame: Video frame to preview enhancement on
            suggestion: Enhancement suggestion to preview
            
        Returns:
            Preview result with enhanced data and metrics
        """
        start_time = time.time()
        
        try:
            # Get quality before enhancement
            quality_before = await self.analyze_quality(frame)
            
            # Apply single enhancement
            enhanced_data = await self._apply_enhancement(frame.data, suggestion)
            
            # Create enhanced frame for quality assessment
            enhanced_frame = VideoFrame(
                frame_id=f"{frame.frame_id}_preview",
                data=enhanced_data,
                width=frame.width,
                height=frame.height,
                timestamp=frame.timestamp
            )
            
            # Get quality after enhancement
            quality_after = await self.analyze_quality(enhanced_frame)
            
            processing_time = (time.time() - start_time) * 1000
            improvement = quality_after.overall_score - quality_before.overall_score
            
            return {
                'success': True,
                'enhanced_data': enhanced_data,
                'quality_before': quality_before.to_dict(),
                'quality_after': quality_after.to_dict(),
                'improvement': improvement,
                'processing_time_ms': processing_time,
                'enhancement_type': suggestion.enhancement_type.value,
                'parameters': suggestion.parameters
            }
        
        except Exception as e:
            self.logger.error(f"Preview enhancement failed: {e}")
            return {
                'success': False,
                'error_message': str(e),
                'processing_time_ms': (time.time() - start_time) * 1000
            }
    
    async def apply_selective_enhancements(self, frame: VideoFrame, 
                                          selected_suggestions: List[EnhancementSuggestion]) -> EnhancementResult:
        """
        Apply only selected enhancements with user control.
        
        Args:
            frame: Video frame to enhance
            selected_suggestions: User-selected enhancement suggestions
            
        Returns:
            Enhancement result with applied enhancements
        """
        if not selected_suggestions:
            self.logger.warning("No enhancements selected for application")
            quality_analysis = await self.analyze_quality(frame)
            
            return EnhancementResult(
                original_frame=frame,
                enhanced_data=frame.data,
                enhancements_applied=[],
                quality_before=quality_analysis,
                quality_after=quality_analysis,
                processing_time_ms=0.0,
                success=True
            )
        
        # Apply selected enhancements
        return await self.apply_auto_enhancement(frame, selected_suggestions)
    
    async def get_enhancement_feedback(self, result: EnhancementResult) -> Dict[str, Any]:
        """
        Provide detailed feedback for enhancement results.
        
        Args:
            result: Enhancement result to analyze
            
        Returns:
            Detailed feedback with success metrics and recommendations
        """
        feedback = {
            'success': result.success,
            'overall_improvement': result.get_improvement(),
            'enhancements_applied': [e.value for e in result.enhancements_applied],
            'processing_time_ms': result.processing_time_ms
        }
        
        if result.success:
            # Analyze improvement by dimension
            dimension_improvements = {}
            for dimension in QualityDimension:
                before_score = result.quality_before.metrics[dimension].score
                after_score = result.quality_after.metrics[dimension].score
                improvement = after_score - before_score
                
                dimension_improvements[dimension.value] = {
                    'before': before_score,
                    'after': after_score,
                    'improvement': improvement,
                    'improved': improvement > 0
                }
            
            feedback['dimension_improvements'] = dimension_improvements
            
            # Check if all issues were resolved
            before_issues = len(result.quality_before.issues_detected)
            after_issues = len(result.quality_after.issues_detected)
            
            feedback['issues_resolved'] = before_issues - after_issues
            feedback['remaining_issues'] = result.quality_after.issues_detected
            
            # Provide success message
            if result.get_improvement() > 0.1:
                feedback['message'] = "Significant quality improvement achieved"
            elif result.get_improvement() > 0.05:
                feedback['message'] = "Moderate quality improvement achieved"
            elif result.get_improvement() > 0:
                feedback['message'] = "Minor quality improvement achieved"
            else:
                feedback['message'] = "No significant improvement detected"
                feedback['recommendations'] = self._get_alternative_recommendations(result)
        
        else:
            # Enhancement failed
            feedback['error_message'] = result.error_message
            feedback['recommendations'] = self._get_failure_recommendations(result)
        
        return feedback
    
    def _get_alternative_recommendations(self, result: EnhancementResult) -> List[str]:
        """
        Get alternative recommendations when enhancements don't improve quality.
        
        Args:
            result: Enhancement result that didn't improve quality
            
        Returns:
            List of alternative recommendations
        """
        recommendations = []
        
        # Check which dimensions still have issues
        failing_dimensions = result.quality_after.get_failing_dimensions()
        
        if QualityDimension.SHARPNESS in failing_dimensions:
            recommendations.append(
                "Try increasing sharpening strength or using super-resolution enhancement"
            )
        
        if QualityDimension.NOISE_LEVEL in failing_dimensions:
            recommendations.append(
                "Consider using stronger noise reduction or AI-powered denoising"
            )
        
        if QualityDimension.COLOR_ACCURACY in failing_dimensions:
            recommendations.append(
                "Manual color grading may be needed for optimal color accuracy"
            )
        
        if QualityDimension.DETAIL_PRESERVATION in failing_dimensions:
            recommendations.append(
                "Source content may have insufficient detail. Consider using higher quality source material"
            )
        
        if QualityDimension.ARTIFACT_PRESENCE in failing_dimensions:
            recommendations.append(
                "Artifacts may require manual cleanup or re-encoding from higher quality source"
            )
        
        # General recommendations
        if not recommendations:
            recommendations.append(
                "Content may already be at optimal quality for the source material"
            )
            recommendations.append(
                "Consider adjusting enhancement parameters or trying different enhancement combinations"
            )
        
        return recommendations
    
    def _get_failure_recommendations(self, result: EnhancementResult) -> List[str]:
        """
        Get recommendations when enhancement fails.
        
        Args:
            result: Failed enhancement result
            
        Returns:
            List of recommendations to resolve the failure
        """
        recommendations = []
        
        error_msg = result.error_message or ""
        
        if "memory" in error_msg.lower():
            recommendations.append("Reduce enhancement strength or process in smaller batches")
            recommendations.append("Close other applications to free up system memory")
        
        elif "timeout" in error_msg.lower():
            recommendations.append("Reduce quality level or use faster enhancement modes")
            recommendations.append("Process fewer enhancements simultaneously")
        
        elif "model" in error_msg.lower():
            recommendations.append("Ensure AI models are properly installed and accessible")
            recommendations.append("Try reloading the quality assessment models")
        
        else:
            recommendations.append("Check system resources and try again")
            recommendations.append("Reduce enhancement complexity or quality settings")
            recommendations.append("Contact support if the issue persists")
        
        return recommendations
    
    async def suggest_alternative_approaches(self, frame: VideoFrame, 
                                           failed_suggestions: List[EnhancementSuggestion]) -> List[EnhancementSuggestion]:
        """
        Suggest alternative enhancement approaches when initial suggestions fail.
        
        Args:
            frame: Video frame that needs enhancement
            failed_suggestions: Suggestions that failed or didn't improve quality
            
        Returns:
            List of alternative enhancement suggestions
        """
        # Analyze quality to understand what's needed
        quality_analysis = await self.analyze_quality(frame)
        
        alternative_suggestions = []
        failed_types = {s.enhancement_type for s in failed_suggestions}
        
        # For each failing dimension, suggest alternatives
        for dimension in quality_analysis.get_failing_dimensions():
            metric = quality_analysis.metrics[dimension]
            
            # Suggest alternatives based on what already failed
            if dimension == QualityDimension.SHARPNESS:
                if QualityEnhancementType.SHARPEN not in failed_types:
                    alternative_suggestions.append(self._suggest_sharpening(metric))
                else:
                    # Suggest detail enhancement as alternative
                    alternative_suggestions.append(
                        EnhancementSuggestion(
                            enhancement_type=QualityEnhancementType.DETAIL_ENHANCEMENT,
                            target_dimension=dimension,
                            confidence_score=0.70,
                            priority=2,
                            parameters={'strength': 0.6, 'preserve_smooth_areas': True},
                            expected_improvement=0.1,
                            description="Try detail enhancement as alternative to sharpening",
                            warnings=["May not be as effective as super-resolution"]
                        )
                    )
            
            elif dimension == QualityDimension.NOISE_LEVEL:
                if QualityEnhancementType.DENOISE not in failed_types:
                    alternative_suggestions.append(self._suggest_denoising(metric))
                else:
                    # Suggest artifact removal as alternative
                    alternative_suggestions.append(
                        EnhancementSuggestion(
                            enhancement_type=QualityEnhancementType.ARTIFACT_REMOVAL,
                            target_dimension=dimension,
                            confidence_score=0.65,
                            priority=3,
                            parameters={'strength': 0.5, 'type': 'noise'},
                            expected_improvement=0.08,
                            description="Try artifact removal to reduce noise",
                            warnings=["May reduce overall sharpness"]
                        )
                    )
            
            elif dimension == QualityDimension.COLOR_ACCURACY:
                if QualityEnhancementType.COLOR_CORRECTION not in failed_types:
                    alternative_suggestions.append(self._suggest_color_correction(metric))
            
            elif dimension == QualityDimension.CONTRAST:
                if QualityEnhancementType.CONTRAST_ADJUSTMENT not in failed_types:
                    alternative_suggestions.append(self._suggest_contrast_adjustment(metric))
            
            elif dimension == QualityDimension.BRIGHTNESS:
                if QualityEnhancementType.BRIGHTNESS_ADJUSTMENT not in failed_types:
                    alternative_suggestions.append(self._suggest_brightness_adjustment(metric))
        
        # If no alternatives found, suggest reducing enhancement strength
        if not alternative_suggestions:
            for suggestion in failed_suggestions:
                # Create modified version with reduced strength
                modified_params = suggestion.parameters.copy()
                if 'strength' in modified_params:
                    modified_params['strength'] *= 0.7
                
                alternative_suggestions.append(
                    EnhancementSuggestion(
                        enhancement_type=suggestion.enhancement_type,
                        target_dimension=suggestion.target_dimension,
                        confidence_score=suggestion.confidence_score * 0.8,
                        priority=suggestion.priority + 1,
                        parameters=modified_params,
                        expected_improvement=suggestion.expected_improvement * 0.6,
                        description=f"Retry {suggestion.enhancement_type.value} with reduced strength",
                        warnings=["Lower strength may produce subtle results"]
                    )
                )
        
        self.logger.info(f"Generated {len(alternative_suggestions)} alternative enhancement suggestions")
        return alternative_suggestions
    
    async def batch_analyze_quality(self, frames: List[VideoFrame]) -> List[QualityAnalysis]:
        """
        Analyze quality for multiple frames efficiently.
        
        Args:
            frames: List of video frames to analyze
            
        Returns:
            List of quality analyses
        """
        self.logger.info(f"Batch analyzing quality for {len(frames)} frames")
        
        # Analyze frames concurrently for better performance
        tasks = [self.analyze_quality(frame) for frame in frames]
        analyses = await asyncio.gather(*tasks)
        
        return analyses
    
    async def batch_suggest_enhancements(self, analyses: List[QualityAnalysis]) -> Dict[str, List[EnhancementSuggestion]]:
        """
        Generate enhancement suggestions for multiple quality analyses.
        
        Args:
            analyses: List of quality analyses
            
        Returns:
            Dictionary mapping frame IDs to enhancement suggestions
        """
        self.logger.info(f"Batch generating enhancement suggestions for {len(analyses)} analyses")
        
        suggestions_map = {}
        
        for analysis in analyses:
            suggestions = await self.suggest_enhancements(analysis)
            suggestions_map[analysis.frame_id] = suggestions
        
        return suggestions_map
    
    def get_enhancement_summary(self, results: List[EnhancementResult]) -> Dict[str, Any]:
        """
        Get summary statistics for multiple enhancement results.
        
        Args:
            results: List of enhancement results
            
        Returns:
            Summary statistics
        """
        if not results:
            return {
                'total_frames': 0,
                'successful_enhancements': 0,
                'failed_enhancements': 0,
                'average_improvement': 0.0,
                'total_processing_time_ms': 0.0
            }
        
        successful = [r for r in results if r.success]
        failed = [r for r in results if not r.success]
        
        total_improvement = sum(r.get_improvement() for r in successful)
        avg_improvement = total_improvement / len(successful) if successful else 0.0
        
        total_time = sum(r.processing_time_ms for r in results)
        
        # Count enhancement types used
        enhancement_counts = {}
        for result in successful:
            for enhancement_type in result.enhancements_applied:
                enhancement_counts[enhancement_type.value] = enhancement_counts.get(enhancement_type.value, 0) + 1
        
        return {
            'total_frames': len(results),
            'successful_enhancements': len(successful),
            'failed_enhancements': len(failed),
            'success_rate': len(successful) / len(results),
            'average_improvement': avg_improvement,
            'total_improvement': total_improvement,
            'total_processing_time_ms': total_time,
            'average_processing_time_ms': total_time / len(results),
            'enhancement_counts': enhancement_counts,
            'best_improvement': max((r.get_improvement() for r in successful), default=0.0),
            'worst_improvement': min((r.get_improvement() for r in successful), default=0.0)
        }
