"""
Advanced Video Processing Module

This module provides advanced video processing capabilities including:
- Scene detection and analysis
- Optical flow computation
- Temporal consistency enforcement
- Motion compensation
- Frame rate conversion
- Video quality enhancement

Author: AI Enhancement Team
Date: 2026-01-14
"""

# Phase 1: Temporal Consistency & Scene Detection
from .scene_detector import SceneDetector, Scene, SceneChange
from .optical_flow_analyzer import OpticalFlowAnalyzer, FlowField, MotionVector
from .temporal_consistency import TemporalConsistencyEnforcer, ConsistencyMetrics
from .motion_compensator import MotionCompensator, CompensationResult

# Phase 2: Advanced Interpolation
from .multi_frame_interpolator import MultiFrameInterpolator, InterpolationResult
from .frame_rate_converter import FrameRateConverter, FrameRateConversionResult

# Phase 3: Video Quality Enhancement
from .ai_denoiser import AIDenoiser, NoiseAnalysis, DenoiseResult, NoiseType, DenoiseMethod
from .ai_deblurrer import AIDeblurrer, BlurAnalysis, DeblurResult, BlurType, DeblurMethod
from .color_grading_ai import ColorGradingAI, ColorAnalysis, ColorGradingResult, ColorGradingStyle
from .hdr_tone_mapper import HDRToneMapper, DynamicRangeAnalysis, ToneMappingResult, ToneMappingMethod, HDRStandard

__all__ = [
    # Scene Detection
    'SceneDetector',
    'Scene',
    'SceneChange',
    
    # Optical Flow
    'OpticalFlowAnalyzer',
    'FlowField',
    'MotionVector',
    
    # Temporal Consistency
    'TemporalConsistencyEnforcer',
    'ConsistencyMetrics',
    
    # Motion Compensation
    'MotionCompensator',
    'CompensationResult',
    
    # Multi-Frame Interpolation
    'MultiFrameInterpolator',
    'InterpolationResult',
    
    # Frame Rate Conversion
    'FrameRateConverter',
    'FrameRateConversionResult',
    
    # AI Denoising
    'AIDenoiser',
    'NoiseAnalysis',
    'DenoiseResult',
    'NoiseType',
    'DenoiseMethod',
    
    # AI Deblurring
    'AIDeblurrer',
    'BlurAnalysis',
    'DeblurResult',
    'BlurType',
    'DeblurMethod',
    
    # Color Grading
    'ColorGradingAI',
    'ColorAnalysis',
    'ColorGradingResult',
    'ColorGradingStyle',
    
    # HDR Tone Mapping
    'HDRToneMapper',
    'DynamicRangeAnalysis',
    'ToneMappingResult',
    'ToneMappingMethod',
    'HDRStandard',
]

__version__ = '1.0.0'
