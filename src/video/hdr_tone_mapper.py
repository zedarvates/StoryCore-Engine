"""
HDR Tone Mapping Module

This module provides HDR to SDR tone mapping, exposure correction, and dynamic
range compression for video frames.

Author: AI Enhancement Team
Date: 2026-01-14
"""

from dataclasses import dataclass
from typing import List, Tuple, Optional, Dict, Any
from enum import Enum
import numpy as np
from PIL import Image


class ToneMappingMethod(Enum):
    """Available tone mapping methods."""
    REINHARD = "reinhard"
    DRAGO = "drago"
    MANTIUK = "mantiuk"
    FILMIC = "filmic"
    ACES = "aces"
    ADAPTIVE = "adaptive"


class HDRStandard(Enum):
    """HDR standards."""
    HDR10 = "hdr10"
    DOLBY_VISION = "dolby_vision"
    HLG = "hlg"
    SDR = "sdr"


@dataclass
class DynamicRangeAnalysis:
    """Results of dynamic range analysis."""
    min_luminance: float  # Minimum luminance (cd/m²)
    max_luminance: float  # Maximum luminance (cd/m²)
    avg_luminance: float  # Average luminance (cd/m²)
    dynamic_range: float  # Dynamic range in stops
    is_hdr: bool  # Whether content is HDR
    clipped_highlights: float  # Percentage of clipped highlights
    clipped_shadows: float  # Percentage of clipped shadows
    
    def __str__(self) -> str:
        return (f"DynamicRangeAnalysis(range={self.dynamic_range:.1f} stops, "
                f"HDR={self.is_hdr}, avg_lum={self.avg_luminance:.1f} cd/m²)")


@dataclass
class ToneMappingResult:
    """Results of tone mapping operation."""
    mapped_frame: np.ndarray
    method_used: ToneMappingMethod
    compression_ratio: float  # Dynamic range compression ratio
    quality_score: float  # Overall quality score (0.0 to 1.0)
    processing_time: float  # Time in seconds
    
    def __str__(self) -> str:
        return (f"ToneMappingResult(method={self.method_used.value}, "
                f"compression={self.compression_ratio:.2f}x, "
                f"quality={self.quality_score:.3f}, "
                f"time={self.processing_time:.3f}s)")


class HDRToneMapper:
    """
    HDR tone mapping engine.
    
    This class provides comprehensive tone mapping capabilities for converting
    HDR content to SDR displays, including multiple tone mapping operators,
    exposure correction, and dynamic range compression.
    
    Example:
        >>> mapper = HDRToneMapper()
        >>> hdr_frame = np.array(Image.open("hdr_frame.jpg"))
        >>> 
        >>> # Analyze dynamic range
        >>> analysis = mapper.analyze_dynamic_range(hdr_frame)
        >>> print(f"Dynamic range: {analysis.dynamic_range:.1f} stops")
        >>> 
        >>> # Tone map to SDR
        >>> result = mapper.tone_map(hdr_frame, ToneMappingMethod.ACES)
        >>> sdr_frame = Image.fromarray(result.mapped_frame)
        >>> sdr_frame.save("sdr_frame.jpg")
        >>> 
        >>> # Adjust exposure
        >>> result = mapper.adjust_exposure(hdr_frame, exposure_compensation=1.5)
        >>> 
        >>> # Batch tone map video
        >>> frames = [np.array(Image.open(f"frame_{i}.jpg")) for i in range(10)]
        >>> sdr_frames = mapper.tone_map_sequence(frames, ToneMappingMethod.FILMIC)
    """
    
    def __init__(self,
                 target_standard: HDRStandard = HDRStandard.SDR,
                 preserve_colors: bool = True,
                 adaptive_local: bool = True):
        """
        Initialize the HDR tone mapper.
        
        Args:
            target_standard: Target display standard
            preserve_colors: Preserve color appearance during mapping
            adaptive_local: Use local adaptation for better detail
        """
        self.target_standard = target_standard
        self.preserve_colors = preserve_colors
        self.adaptive_local = adaptive_local
        self._mapping_history: List[float] = []
        
    def analyze_dynamic_range(self, frame: np.ndarray) -> DynamicRangeAnalysis:
        """
        Analyze dynamic range characteristics of a frame.
        
        Args:
            frame: Input frame as numpy array (H, W, 3)
            
        Returns:
            DynamicRangeAnalysis object with dynamic range characteristics
        """
        # Calculate luminance
        luminance = self._calculate_luminance(frame)
        
        # Calculate statistics
        min_lum = np.min(luminance)
        max_lum = np.max(luminance)
        avg_lum = np.mean(luminance)
        
        # Calculate dynamic range in stops
        if min_lum > 0:
            dynamic_range = np.log2(max_lum / min_lum)
        else:
            dynamic_range = np.log2(max_lum / 0.01)
        
        # Determine if HDR (>10 stops typically indicates HDR)
        is_hdr = dynamic_range > 10.0
        
        # Calculate clipping
        clipped_highlights = np.sum(luminance >= 254) / luminance.size
        clipped_shadows = np.sum(luminance <= 1) / luminance.size
        
        return DynamicRangeAnalysis(
            min_luminance=float(min_lum),
            max_luminance=float(max_lum),
            avg_luminance=float(avg_lum),
            dynamic_range=float(dynamic_range),
            is_hdr=is_hdr,
            clipped_highlights=float(clipped_highlights),
            clipped_shadows=float(clipped_shadows)
        )
    
    def tone_map(self,
                frame: np.ndarray,
                method: ToneMappingMethod = ToneMappingMethod.ADAPTIVE,
                gamma: float = 2.2) -> ToneMappingResult:
        """
        Tone map HDR frame to SDR.
        
        Args:
            frame: Input HDR frame as numpy array (H, W, 3)
            method: Tone mapping method to use
            gamma: Gamma correction value
            
        Returns:
            ToneMappingResult with mapped frame and metrics
        """
        import time
        start_time = time.time()
        
        # Analyze dynamic range
        analysis = self.analyze_dynamic_range(frame)
        
        # Select method if adaptive
        if method == ToneMappingMethod.ADAPTIVE:
            method = self._select_method(analysis)
        
        # Apply tone mapping
        if method == ToneMappingMethod.REINHARD:
            mapped = self._reinhard_tone_map(frame, gamma)
        elif method == ToneMappingMethod.DRAGO:
            mapped = self._drago_tone_map(frame, gamma)
        elif method == ToneMappingMethod.MANTIUK:
            mapped = self._mantiuk_tone_map(frame, gamma)
        elif method == ToneMappingMethod.FILMIC:
            mapped = self._filmic_tone_map(frame, gamma)
        elif method == ToneMappingMethod.ACES:
            mapped = self._aces_tone_map(frame, gamma)
        else:
            mapped = self._adaptive_tone_map(frame, gamma)
        
        # Calculate metrics
        compression_ratio = self._calculate_compression_ratio(frame, mapped)
        quality_score = self._calculate_quality_score(mapped)
        
        processing_time = time.time() - start_time
        
        # Update history
        self._mapping_history.append(compression_ratio)
        if len(self._mapping_history) > 30:
            self._mapping_history.pop(0)
        
        return ToneMappingResult(
            mapped_frame=mapped,
            method_used=method,
            compression_ratio=compression_ratio,
            quality_score=quality_score,
            processing_time=processing_time
        )
    
    def adjust_exposure(self,
                       frame: np.ndarray,
                       exposure_compensation: float = 0.0,
                       auto_expose: bool = False) -> np.ndarray:
        """
        Adjust exposure of a frame.
        
        Args:
            frame: Input frame as numpy array (H, W, 3)
            exposure_compensation: Exposure adjustment in stops (-3.0 to 3.0)
            auto_expose: Automatically determine optimal exposure
            
        Returns:
            Exposure-adjusted frame
        """
        if auto_expose:
            # Calculate optimal exposure
            luminance = self._calculate_luminance(frame)
            target_avg = 128  # Target middle gray
            current_avg = np.mean(luminance)
            exposure_compensation = np.log2(target_avg / (current_avg + 1e-10))
            exposure_compensation = np.clip(exposure_compensation, -3.0, 3.0)
        
        # Apply exposure adjustment
        factor = 2.0 ** exposure_compensation
        adjusted = frame.astype(np.float32) * factor
        
        return np.clip(adjusted, 0, 255).astype(np.uint8)
    
    def compress_dynamic_range(self,
                              frame: np.ndarray,
                              target_stops: float = 8.0) -> np.ndarray:
        """
        Compress dynamic range to target number of stops.
        
        Args:
            frame: Input frame as numpy array (H, W, 3)
            target_stops: Target dynamic range in stops
            
        Returns:
            Compressed frame
        """
        # Analyze current dynamic range
        analysis = self.analyze_dynamic_range(frame)
        
        if analysis.dynamic_range <= target_stops:
            return frame  # Already within target
        
        # Calculate compression factor
        compression = target_stops / analysis.dynamic_range
        
        # Apply compression using logarithmic mapping
        luminance = self._calculate_luminance(frame)
        compressed_lum = self._compress_luminance(luminance, compression)
        
        # Reconstruct RGB
        compressed = self._reconstruct_rgb(frame, luminance, compressed_lum)
        
        return compressed
    
    def tone_map_sequence(self,
                         frames: List[np.ndarray],
                         method: ToneMappingMethod = ToneMappingMethod.ADAPTIVE,
                         smooth_transitions: bool = True) -> List[np.ndarray]:
        """
        Tone map a sequence of frames with temporal consistency.
        
        Args:
            frames: List of HDR frames as numpy arrays
            method: Tone mapping method to use
            smooth_transitions: Smooth exposure transitions between frames
            
        Returns:
            List of tone-mapped SDR frames
        """
        if not frames:
            return []
        
        mapped_frames = []
        prev_exposure = 0.0
        
        for i, frame in enumerate(frames):
            # Tone map current frame
            result = self.tone_map(frame, method)
            mapped = result.mapped_frame
            
            # Smooth transitions
            if smooth_transitions and i > 0:
                # Calculate exposure difference
                curr_exposure = self._estimate_exposure(frame)
                exposure_diff = curr_exposure - prev_exposure
                
                # Limit sudden exposure changes
                if abs(exposure_diff) > 0.5:
                    adjustment = np.sign(exposure_diff) * 0.5
                    mapped = self.adjust_exposure(mapped, adjustment)
                
                prev_exposure = curr_exposure
            else:
                prev_exposure = self._estimate_exposure(frame)
            
            mapped_frames.append(mapped)
        
        return mapped_frames
    
    def _calculate_luminance(self, frame: np.ndarray) -> np.ndarray:
        """Calculate luminance from RGB."""
        # Rec. 709 luminance coefficients
        luminance = (0.2126 * frame[:, :, 0] +
                    0.7152 * frame[:, :, 1] +
                    0.0722 * frame[:, :, 2])
        return luminance
    
    def _select_method(self, analysis: DynamicRangeAnalysis) -> ToneMappingMethod:
        """Select appropriate tone mapping method based on analysis."""
        if analysis.dynamic_range < 8:
            return ToneMappingMethod.REINHARD
        elif analysis.dynamic_range < 12:
            return ToneMappingMethod.FILMIC
        else:
            return ToneMappingMethod.ACES
    
    def _reinhard_tone_map(self, frame: np.ndarray, gamma: float) -> np.ndarray:
        """Apply Reinhard tone mapping operator."""
        # Convert to float
        img = frame.astype(np.float32) / 255.0
        
        # Calculate luminance
        lum = self._calculate_luminance(frame) / 255.0
        
        # Reinhard operator: L_out = L_in / (1 + L_in)
        lum_mapped = lum / (1.0 + lum)
        
        # Reconstruct RGB
        scale = lum_mapped / (lum + 1e-10)
        mapped = img * scale[:, :, np.newaxis]
        
        # Apply gamma correction
        mapped = np.power(mapped, 1.0 / gamma)
        
        return (mapped * 255).astype(np.uint8)
    
    def _drago_tone_map(self, frame: np.ndarray, gamma: float) -> np.ndarray:
        """Apply Drago tone mapping operator."""
        # Simplified Drago operator
        img = frame.astype(np.float32) / 255.0
        lum = self._calculate_luminance(frame) / 255.0
        
        # Logarithmic compression
        lum_max = np.max(lum)
        bias = 0.85
        lum_mapped = np.log10(1 + lum * bias) / np.log10(1 + lum_max * bias)
        
        # Reconstruct RGB
        scale = lum_mapped / (lum + 1e-10)
        mapped = img * scale[:, :, np.newaxis]
        
        # Apply gamma correction
        mapped = np.power(mapped, 1.0 / gamma)
        
        return (mapped * 255).astype(np.uint8)
    
    def _mantiuk_tone_map(self, frame: np.ndarray, gamma: float) -> np.ndarray:
        """Apply Mantiuk tone mapping operator."""
        # Simplified Mantiuk operator
        # In production, use proper contrast processing
        return self._drago_tone_map(frame, gamma)
    
    def _filmic_tone_map(self, frame: np.ndarray, gamma: float) -> np.ndarray:
        """Apply filmic tone mapping (Uncharted 2 style)."""
        img = frame.astype(np.float32) / 255.0
        
        # Filmic curve parameters
        A = 0.15  # Shoulder strength
        B = 0.50  # Linear strength
        C = 0.10  # Linear angle
        D = 0.20  # Toe strength
        E = 0.02  # Toe numerator
        F = 0.30  # Toe denominator
        
        def filmic_curve(x):
            return ((x * (A * x + C * B) + D * E) / 
                   (x * (A * x + B) + D * F)) - E / F
        
        # Apply curve
        exposure_bias = 2.0
        mapped = filmic_curve(img * exposure_bias)
        white_scale = 1.0 / filmic_curve(np.array([11.2]))[0]
        mapped = mapped * white_scale
        
        # Apply gamma correction
        mapped = np.power(np.clip(mapped, 0, 1), 1.0 / gamma)
        
        return (mapped * 255).astype(np.uint8)
    
    def _aces_tone_map(self, frame: np.ndarray, gamma: float) -> np.ndarray:
        """Apply ACES filmic tone mapping."""
        img = frame.astype(np.float32) / 255.0
        
        # ACES approximation
        a = 2.51
        b = 0.03
        c = 2.43
        d = 0.59
        e = 0.14
        
        mapped = (img * (a * img + b)) / (img * (c * img + d) + e)
        mapped = np.clip(mapped, 0, 1)
        
        # Apply gamma correction
        mapped = np.power(mapped, 1.0 / gamma)
        
        return (mapped * 255).astype(np.uint8)
    
    def _adaptive_tone_map(self, frame: np.ndarray, gamma: float) -> np.ndarray:
        """Apply adaptive tone mapping based on content."""
        analysis = self.analyze_dynamic_range(frame)
        
        if analysis.dynamic_range < 8:
            return self._reinhard_tone_map(frame, gamma)
        elif analysis.dynamic_range < 12:
            return self._filmic_tone_map(frame, gamma)
        else:
            return self._aces_tone_map(frame, gamma)
    
    def _compress_luminance(self, luminance: np.ndarray, 
                           compression: float) -> np.ndarray:
        """Compress luminance values."""
        # Logarithmic compression
        compressed = np.power(luminance / 255.0, compression) * 255.0
        return compressed
    
    def _reconstruct_rgb(self, original: np.ndarray, 
                        original_lum: np.ndarray,
                        target_lum: np.ndarray) -> np.ndarray:
        """Reconstruct RGB from modified luminance."""
        # Calculate scale factor
        scale = target_lum / (original_lum + 1e-10)
        
        # Apply to each channel
        reconstructed = original.astype(np.float32) * scale[:, :, np.newaxis]
        
        return np.clip(reconstructed, 0, 255).astype(np.uint8)
    
    def _calculate_compression_ratio(self, original: np.ndarray, 
                                    mapped: np.ndarray) -> float:
        """Calculate dynamic range compression ratio."""
        orig_analysis = self.analyze_dynamic_range(original)
        mapped_analysis = self.analyze_dynamic_range(mapped)
        
        if mapped_analysis.dynamic_range == 0:
            return 1.0
        
        ratio = orig_analysis.dynamic_range / mapped_analysis.dynamic_range
        return ratio
    
    def _calculate_quality_score(self, frame: np.ndarray) -> float:
        """Calculate overall quality score."""
        # Check for clipping
        clipped_pixels = np.sum((frame == 0) | (frame == 255))
        total_pixels = frame.size
        clipping_ratio = clipped_pixels / total_pixels
        
        # Check contrast
        luminance = self._calculate_luminance(frame)
        contrast = np.std(luminance) / 128.0
        
        # Quality score
        quality = (1.0 - clipping_ratio) * min(contrast, 1.0)
        return quality
    
    def _estimate_exposure(self, frame: np.ndarray) -> float:
        """Estimate exposure level of frame."""
        luminance = self._calculate_luminance(frame)
        avg_lum = np.mean(luminance)
        
        # Exposure in stops relative to middle gray (128)
        exposure = np.log2(avg_lum / 128.0)
        return exposure
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get tone mapping statistics."""
        if not self._mapping_history:
            return {}
        
        return {
            'avg_compression_ratio': np.mean(self._mapping_history),
            'max_compression_ratio': np.max(self._mapping_history),
            'min_compression_ratio': np.min(self._mapping_history),
            'frames_processed': len(self._mapping_history)
        }
