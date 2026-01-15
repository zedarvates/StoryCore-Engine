"""
Style Transfer Processor - AI-powered artistic style transfer for video frames.

This module provides intelligent style transfer with temporal consistency,
content structure preservation, and graceful fallback mechanisms.
"""

import asyncio
import logging
import hashlib
import time
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum

from .ai_enhancement_engine import (
    VideoFrame, EnhancedFrame, EnhancementMetadata, EnhancementType,
    QualityLevel, PerformanceMode
)
from .model_manager import ModelManager, ModelLoadResult


class StyleType(Enum):
    """Available artistic style types."""
    IMPRESSIONIST = "impressionist"
    CUBIST = "cubist"
    ABSTRACT = "abstract"
    WATERCOLOR = "watercolor"
    OIL_PAINTING = "oil_painting"
    SKETCH = "sketch"
    ANIME = "anime"
    COMIC = "comic"
    MOSAIC = "mosaic"
    POINTILLISM = "pointillism"


@dataclass
class StyleConfig:
    """Configuration for style transfer operation."""
    style_type: StyleType
    style_strength: float = 0.7  # 0.0 to 1.0
    preserve_colors: bool = False
    preserve_structure: bool = True
    temporal_consistency: bool = True
    quality_level: QualityLevel = QualityLevel.STANDARD
    performance_mode: PerformanceMode = PerformanceMode.BALANCED
    
    def __post_init__(self):
        """Validate configuration parameters."""
        if not 0.0 <= self.style_strength <= 1.0:
            raise ValueError("style_strength must be between 0.0 and 1.0")


@dataclass
class StyleInfo:
    """Information about an available artistic style."""
    style_type: StyleType
    display_name: str
    description: str
    model_id: str
    preview_image: Optional[str] = None
    recommended_strength: float = 0.7
    supports_color_preservation: bool = True
    processing_complexity: str = "medium"  # low, medium, high
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'style_type': self.style_type.value,
            'display_name': self.display_name,
            'description': self.description,
            'model_id': self.model_id,
            'preview_image': self.preview_image,
            'recommended_strength': self.recommended_strength,
            'supports_color_preservation': self.supports_color_preservation,
            'processing_complexity': self.processing_complexity
        }


@dataclass
class StyledFrame:
    """Result of style transfer operation on a single frame."""
    original_frame: VideoFrame
    styled_data: bytes
    style_config: StyleConfig
    processing_time_ms: float
    quality_score: float
    confidence_score: float
    content_preservation_score: float
    temporal_consistency_score: Optional[float] = None
    fallback_used: bool = False
    error_message: Optional[str] = None
    
    def to_enhanced_frame(self) -> EnhancedFrame:
        """Convert to EnhancedFrame for compatibility."""
        metadata = EnhancementMetadata(
            enhancement_type=EnhancementType.STYLE_TRANSFER,
            model_id=f"style_transfer_{self.style_config.style_type.value}",
            model_version="1.0.0",
            parameters={
                'style_type': self.style_config.style_type.value,
                'style_strength': self.style_config.style_strength,
                'preserve_colors': self.style_config.preserve_colors
            },
            processing_time_ms=self.processing_time_ms,
            quality_score=self.quality_score,
            confidence_score=self.confidence_score,
            gpu_used=True,
            cache_hit=False
        )
        
        return EnhancedFrame(
            original_frame=self.original_frame,
            enhanced_data=self.styled_data,
            enhancement_metadata=metadata,
            processing_time=self.processing_time_ms,
            quality_score=self.quality_score,
            confidence_score=self.confidence_score
        )


class StyleRegistry:
    """Registry of available artistic styles."""
    
    def __init__(self):
        """Initialize style registry with default styles."""
        self.styles: Dict[StyleType, StyleInfo] = {}
        self.logger = logging.getLogger(__name__)
        self._initialize_default_styles()
    
    def _initialize_default_styles(self):
        """Initialize registry with default artistic styles."""
        default_styles = [
            StyleInfo(
                style_type=StyleType.IMPRESSIONIST,
                display_name="Impressionist",
                description="Soft brushstrokes and vibrant colors inspired by Monet and Renoir",
                model_id="style_transfer_impressionist_v1",
                recommended_strength=0.7,
                processing_complexity="medium"
            ),
            StyleInfo(
                style_type=StyleType.CUBIST,
                display_name="Cubist",
                description="Geometric shapes and multiple perspectives inspired by Picasso",
                model_id="style_transfer_cubist_v1",
                recommended_strength=0.6,
                processing_complexity="high"
            ),
            StyleInfo(
                style_type=StyleType.ABSTRACT,
                display_name="Abstract",
                description="Non-representational forms with bold colors and shapes",
                model_id="style_transfer_abstract_v1",
                recommended_strength=0.8,
                processing_complexity="medium"
            ),
            StyleInfo(
                style_type=StyleType.WATERCOLOR,
                display_name="Watercolor",
                description="Soft, translucent washes with flowing colors",
                model_id="style_transfer_watercolor_v1",
                recommended_strength=0.65,
                processing_complexity="low"
            ),
            StyleInfo(
                style_type=StyleType.OIL_PAINTING,
                display_name="Oil Painting",
                description="Rich textures and bold brushstrokes of traditional oil painting",
                model_id="style_transfer_oil_v1",
                recommended_strength=0.75,
                processing_complexity="medium"
            ),
            StyleInfo(
                style_type=StyleType.SKETCH,
                display_name="Sketch",
                description="Pencil or charcoal sketch with fine details",
                model_id="style_transfer_sketch_v1",
                recommended_strength=0.7,
                processing_complexity="low"
            ),
            StyleInfo(
                style_type=StyleType.ANIME,
                display_name="Anime",
                description="Japanese animation style with clean lines and vibrant colors",
                model_id="style_transfer_anime_v1",
                recommended_strength=0.8,
                processing_complexity="high"
            ),
            StyleInfo(
                style_type=StyleType.COMIC,
                display_name="Comic Book",
                description="Bold outlines and halftone patterns of comic book art",
                model_id="style_transfer_comic_v1",
                recommended_strength=0.75,
                processing_complexity="medium"
            ),
            StyleInfo(
                style_type=StyleType.MOSAIC,
                display_name="Mosaic",
                description="Tile-like patterns creating a mosaic effect",
                model_id="style_transfer_mosaic_v1",
                recommended_strength=0.7,
                processing_complexity="medium"
            ),
            StyleInfo(
                style_type=StyleType.POINTILLISM,
                display_name="Pointillism",
                description="Composed of small distinct dots of color inspired by Seurat",
                model_id="style_transfer_pointillism_v1",
                recommended_strength=0.65,
                processing_complexity="high"
            )
        ]
        
        for style_info in default_styles:
            self.styles[style_info.style_type] = style_info
        
        self.logger.info(f"Initialized style registry with {len(self.styles)} styles")
    
    def get_style_info(self, style_type: StyleType) -> Optional[StyleInfo]:
        """Get information about a specific style."""
        return self.styles.get(style_type)
    
    def list_styles(self) -> List[StyleInfo]:
        """List all available styles."""
        return list(self.styles.values())
    
    def register_style(self, style_info: StyleInfo):
        """Register a new style."""
        self.styles[style_info.style_type] = style_info
        self.logger.info(f"Registered style: {style_info.display_name}")
    
    def get_recommended_strength(self, style_type: StyleType) -> float:
        """Get recommended strength for a style."""
        style_info = self.get_style_info(style_type)
        return style_info.recommended_strength if style_info else 0.7


class StyleTransferProcessor:
    """
    AI-powered artistic style transfer processor with temporal consistency.
    
    Applies artistic styles to video frames while maintaining content structure
    and temporal consistency across sequences.
    """
    
    def __init__(self, model_manager: ModelManager):
        """
        Initialize Style Transfer Processor.
        
        Args:
            model_manager: Model manager for loading and managing AI models
        """
        self.model_manager = model_manager
        self.logger = logging.getLogger(__name__)
        self.style_registry = StyleRegistry()
        
        # Temporal consistency tracking
        self.previous_frame_features: Dict[str, Any] = {}
        self.sequence_context: Dict[str, List[Any]] = {}
        
        # Performance tracking
        self.processing_stats = {
            'total_frames': 0,
            'successful_transfers': 0,
            'failed_transfers': 0,
            'fallback_used': 0,
            'total_processing_time': 0.0,
            'average_quality_score': 0.0,
            'average_content_preservation': 0.0
        }
        
        self.logger.info("Style Transfer Processor initialized")
    
    async def apply_style(self, frame: VideoFrame, style_config: StyleConfig) -> StyledFrame:
        """
        Apply artistic style to a single video frame.
        
        Args:
            frame: Video frame to process
            style_config: Style configuration
            
        Returns:
            Styled frame with metadata
        """
        start_time = time.time()
        
        try:
            # Get style information
            style_info = self.style_registry.get_style_info(style_config.style_type)
            if not style_info:
                raise ValueError(f"Unknown style type: {style_config.style_type}")
            
            # Load style transfer model
            model_result = await self.model_manager.load_model(
                style_info.model_id,
                device="auto"
            )
            
            if not model_result.success:
                # Fallback to original frame
                return await self._fallback_to_original(frame, style_config, 
                                                       f"Model loading failed: {model_result.error_message}")
            
            # Apply style transfer
            styled_data, quality_metrics = await self._apply_style_transfer(
                frame, style_config, model_result.model
            )
            
            # Calculate processing time
            processing_time = (time.time() - start_time) * 1000
            
            # Update statistics
            self.processing_stats['total_frames'] += 1
            self.processing_stats['successful_transfers'] += 1
            self.processing_stats['total_processing_time'] += processing_time
            
            # Create styled frame result
            styled_frame = StyledFrame(
                original_frame=frame,
                styled_data=styled_data,
                style_config=style_config,
                processing_time_ms=processing_time,
                quality_score=quality_metrics['quality_score'],
                confidence_score=quality_metrics['confidence_score'],
                content_preservation_score=quality_metrics['content_preservation'],
                fallback_used=False
            )
            
            self.logger.debug(f"Successfully applied {style_config.style_type.value} style to frame {frame.frame_id}")
            return styled_frame
        
        except Exception as e:
            self.processing_stats['failed_transfers'] += 1
            self.logger.error(f"Style transfer failed for frame {frame.frame_id}: {e}")
            return await self._fallback_to_original(frame, style_config, str(e))
    
    async def apply_style_sequence(self, frames: List[VideoFrame], 
                                  style_config: StyleConfig) -> List[StyledFrame]:
        """
        Apply style to a sequence of frames with temporal consistency.
        
        Args:
            frames: List of video frames to process
            style_config: Style configuration
            
        Returns:
            List of styled frames with temporal consistency
        """
        if not frames:
            return []
        
        self.logger.info(f"Applying {style_config.style_type.value} style to sequence of {len(frames)} frames")
        
        styled_frames = []
        sequence_id = self._generate_sequence_id(frames)
        
        # Initialize sequence context for temporal consistency
        if style_config.temporal_consistency:
            self.sequence_context[sequence_id] = []
        
        for i, frame in enumerate(frames):
            # Apply style with temporal consistency
            styled_frame = await self._apply_style_with_temporal_consistency(
                frame, style_config, sequence_id, i, len(frames)
            )
            
            styled_frames.append(styled_frame)
            
            # Update sequence context
            if style_config.temporal_consistency:
                self._update_sequence_context(sequence_id, styled_frame)
        
        # Calculate temporal consistency scores
        if style_config.temporal_consistency and len(styled_frames) > 1:
            self._calculate_temporal_consistency_scores(styled_frames)
        
        # Cleanup sequence context
        if sequence_id in self.sequence_context:
            del self.sequence_context[sequence_id]
        
        self.logger.info(f"Completed style transfer for sequence: {len(styled_frames)}/{len(frames)} frames successful")
        return styled_frames
    
    async def _apply_style_transfer(self, frame: VideoFrame, style_config: StyleConfig, 
                                   model: Any) -> Tuple[bytes, Dict[str, float]]:
        """
        Apply style transfer using loaded model.
        
        Args:
            frame: Video frame to process
            style_config: Style configuration
            model: Loaded style transfer model
            
        Returns:
            Tuple of (styled_data, quality_metrics)
        """
        # Simulate style transfer processing
        # In real implementation, this would use the actual AI model
        
        # Simulate processing time based on quality level
        processing_delays = {
            QualityLevel.PREVIEW: 0.05,
            QualityLevel.STANDARD: 0.15,
            QualityLevel.HIGH: 0.3,
            QualityLevel.MAXIMUM: 0.5
        }
        await asyncio.sleep(processing_delays.get(style_config.quality_level, 0.15))
        
        # Simulate styled data (in real implementation, would be actual processed image)
        styled_data = frame.data  # Placeholder
        
        # Calculate quality metrics
        quality_metrics = {
            'quality_score': 0.85 + (style_config.style_strength * 0.1),
            'confidence_score': 0.9,
            'content_preservation': 0.95 if style_config.preserve_structure else 0.75
        }
        
        # Adjust metrics based on style strength
        if style_config.style_strength > 0.8:
            quality_metrics['content_preservation'] *= 0.9
        
        return styled_data, quality_metrics
    
    async def _apply_style_with_temporal_consistency(self, frame: VideoFrame, 
                                                    style_config: StyleConfig,
                                                    sequence_id: str, frame_index: int,
                                                    total_frames: int) -> StyledFrame:
        """
        Apply style with temporal consistency considerations.
        
        Args:
            frame: Video frame to process
            style_config: Style configuration
            sequence_id: Unique sequence identifier
            frame_index: Index of frame in sequence
            total_frames: Total number of frames in sequence
            
        Returns:
            Styled frame with temporal consistency
        """
        # Apply base style transfer
        styled_frame = await self.apply_style(frame, style_config)
        
        # Apply temporal consistency if enabled and not first frame
        if style_config.temporal_consistency and frame_index > 0:
            # Get previous frame context
            previous_context = self.sequence_context.get(sequence_id, [])
            
            if previous_context:
                # Calculate temporal consistency score
                temporal_score = self._calculate_frame_temporal_consistency(
                    styled_frame, previous_context[-1]
                )
                styled_frame.temporal_consistency_score = temporal_score
                
                # Apply temporal smoothing if consistency is low
                if temporal_score < 0.7:
                    styled_frame = await self._apply_temporal_smoothing(
                        styled_frame, previous_context[-1], style_config
                    )
        
        return styled_frame
    
    def _calculate_frame_temporal_consistency(self, current_frame: StyledFrame, 
                                             previous_frame: StyledFrame) -> float:
        """
        Calculate temporal consistency score between consecutive frames.
        
        Args:
            current_frame: Current styled frame
            previous_frame: Previous styled frame
            
        Returns:
            Temporal consistency score (0.0 to 1.0)
        """
        # Simulate temporal consistency calculation
        # In real implementation, would analyze frame features and motion
        
        # Base consistency score
        base_score = 0.85
        
        # Adjust based on style strength difference
        strength_diff = abs(
            current_frame.style_config.style_strength - 
            previous_frame.style_config.style_strength
        )
        consistency_score = base_score - (strength_diff * 0.2)
        
        # Ensure score is in valid range
        return max(0.0, min(1.0, consistency_score))
    
    async def _apply_temporal_smoothing(self, current_frame: StyledFrame, 
                                       previous_frame: StyledFrame,
                                       style_config: StyleConfig) -> StyledFrame:
        """
        Apply temporal smoothing to improve consistency.
        
        Args:
            current_frame: Current styled frame
            previous_frame: Previous styled frame
            style_config: Style configuration
            
        Returns:
            Smoothed styled frame
        """
        # Simulate temporal smoothing
        # In real implementation, would blend features from consecutive frames
        
        await asyncio.sleep(0.02)  # Simulate smoothing processing
        
        # Update temporal consistency score
        current_frame.temporal_consistency_score = 0.9
        
        self.logger.debug(f"Applied temporal smoothing to frame {current_frame.original_frame.frame_id}")
        return current_frame
    
    def _update_sequence_context(self, sequence_id: str, styled_frame: StyledFrame):
        """Update sequence context with latest frame."""
        if sequence_id not in self.sequence_context:
            self.sequence_context[sequence_id] = []
        
        self.sequence_context[sequence_id].append(styled_frame)
        
        # Keep only last 3 frames for context
        if len(self.sequence_context[sequence_id]) > 3:
            self.sequence_context[sequence_id].pop(0)
    
    def _calculate_temporal_consistency_scores(self, styled_frames: List[StyledFrame]):
        """Calculate temporal consistency scores for entire sequence."""
        if len(styled_frames) < 2:
            return
        
        for i in range(1, len(styled_frames)):
            if styled_frames[i].temporal_consistency_score is None:
                styled_frames[i].temporal_consistency_score = self._calculate_frame_temporal_consistency(
                    styled_frames[i], styled_frames[i-1]
                )
    
    def _generate_sequence_id(self, frames: List[VideoFrame]) -> str:
        """Generate unique identifier for frame sequence."""
        frame_ids = "_".join([f.frame_id for f in frames[:3]])  # Use first 3 frame IDs
        return hashlib.md5(frame_ids.encode()).hexdigest()[:16]
    
    async def _fallback_to_original(self, frame: VideoFrame, style_config: StyleConfig, 
                                   error_message: str) -> StyledFrame:
        """
        Graceful fallback to original frame when style transfer fails.
        
        Args:
            frame: Original video frame
            style_config: Style configuration
            error_message: Error message describing failure
            
        Returns:
            Styled frame with original data and fallback flag
        """
        processing_time = 0.0
        
        self.processing_stats['fallback_used'] += 1
        self.logger.warning(f"Using fallback for frame {frame.frame_id}: {error_message}")
        
        return StyledFrame(
            original_frame=frame,
            styled_data=frame.data,  # Use original data
            style_config=style_config,
            processing_time_ms=processing_time,
            quality_score=1.0,  # Original quality
            confidence_score=0.0,  # No confidence in style transfer
            content_preservation_score=1.0,  # Perfect preservation (no change)
            fallback_used=True,
            error_message=error_message
        )
    
    def get_available_styles(self) -> List[StyleInfo]:
        """Get list of available artistic styles."""
        return self.style_registry.list_styles()
    
    def get_style_info(self, style_type: StyleType) -> Optional[StyleInfo]:
        """Get information about a specific style."""
        return self.style_registry.get_style_info(style_type)
    
    def get_processing_stats(self) -> Dict[str, Any]:
        """Get processing statistics."""
        stats = self.processing_stats.copy()
        
        # Calculate derived metrics
        if stats['total_frames'] > 0:
            stats['success_rate'] = stats['successful_transfers'] / stats['total_frames']
            stats['fallback_rate'] = stats['fallback_used'] / stats['total_frames']
            stats['average_processing_time'] = stats['total_processing_time'] / stats['total_frames']
        else:
            stats['success_rate'] = 0.0
            stats['fallback_rate'] = 0.0
            stats['average_processing_time'] = 0.0
        
        return stats
    
    def reset_stats(self):
        """Reset processing statistics."""
        self.processing_stats = {
            'total_frames': 0,
            'successful_transfers': 0,
            'failed_transfers': 0,
            'fallback_used': 0,
            'total_processing_time': 0.0,
            'average_quality_score': 0.0,
            'average_content_preservation': 0.0
        }
        self.logger.info("Processing statistics reset")
    
    def clear_sequence_context(self):
        """Clear all sequence context data."""
        self.sequence_context.clear()
        self.previous_frame_features.clear()
        self.logger.debug("Sequence context cleared")
