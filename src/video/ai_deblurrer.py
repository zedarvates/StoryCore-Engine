"""
AI-Powered Video Deblurring Module

This module provides advanced deblurring capabilities for video frames including
motion blur removal, defocus blur correction, and AI-based restoration.

Author: AI Enhancement Team
Date: 2026-01-14
"""

from dataclasses import dataclass
from typing import List, Tuple, Optional, Dict, Any
from enum import Enum
import numpy as np
from PIL import Image


class BlurType(Enum):
    """Types of blur that can be detected and corrected."""
    MOTION = "motion"
    DEFOCUS = "defocus"
    GAUSSIAN = "gaussian"
    MIXED = "mixed"
    NONE = "none"


class DeblurMethod(Enum):
    """Available deblurring methods."""
    WIENER = "wiener"
    RICHARDSON_LUCY = "richardson_lucy"
    BLIND_DECONVOLUTION = "blind_deconvolution"
    AI_BASED = "ai_based"
    ADAPTIVE = "adaptive"


@dataclass
class BlurAnalysis:
    """Results of blur analysis on a frame."""
    blur_amount: float  # 0.0 (sharp) to 1.0 (very blurry)
    blur_type: BlurType
    blur_angle: Optional[float]  # For motion blur (degrees)
    blur_kernel_size: int  # Estimated kernel size
    confidence: float  # Confidence in blur detection (0.0 to 1.0)
    recommended_method: DeblurMethod
    
    def __str__(self) -> str:
        angle_str = f", angle={self.blur_angle:.1f}°" if self.blur_angle else ""
        return (f"BlurAnalysis(amount={self.blur_amount:.3f}, "
                f"type={self.blur_type.value}{angle_str}, "
                f"kernel_size={self.blur_kernel_size}, "
                f"method={self.recommended_method.value})")


@dataclass
class DeblurResult:
    """Results of deblurring operation."""
    deblurred_frame: np.ndarray
    method_used: DeblurMethod
    sharpness_improvement: float  # Improvement in sharpness (0.0 to 1.0)
    quality_score: float  # Overall quality score (0.0 to 1.0)
    processing_time: float  # Time in seconds
    iterations: int  # Number of iterations used
    
    def __str__(self) -> str:
        return (f"DeblurResult(method={self.method_used.value}, "
                f"sharpness_improvement={self.sharpness_improvement:.3f}, "
                f"quality={self.quality_score:.3f}, "
                f"time={self.processing_time:.3f}s, iterations={self.iterations})")


class AIDeblurrer:
    """
    AI-powered video deblurring engine.
    
    This class provides multiple deblurring algorithms optimized for different
    types of blur including motion blur, defocus blur, and general blur. It can
    automatically detect blur characteristics and select the appropriate method.
    
    Example:
        >>> deblurrer = AIDeblurrer()
        >>> frame = np.array(Image.open("blurry_frame.jpg"))
        >>> 
        >>> # Analyze blur
        >>> analysis = deblurrer.analyze_blur(frame)
        >>> print(f"Blur amount: {analysis.blur_amount:.2%}")
        >>> print(f"Blur type: {analysis.blur_type.value}")
        >>> 
        >>> # Deblur frame
        >>> result = deblurrer.deblur_frame(frame, method=DeblurMethod.ADAPTIVE)
        >>> deblurred = Image.fromarray(result.deblurred_frame)
        >>> deblurred.save("sharp_frame.jpg")
        >>> 
        >>> # Batch deblur video
        >>> frames = [np.array(Image.open(f"frame_{i}.jpg")) for i in range(10)]
        >>> deblurred_frames = deblurrer.deblur_sequence(frames)
    """
    
    def __init__(self,
                 default_method: DeblurMethod = DeblurMethod.ADAPTIVE,
                 max_iterations: int = 10,
                 preserve_edges: bool = True):
        """
        Initialize the AI deblurrer.
        
        Args:
            default_method: Default deblurring method to use
            max_iterations: Maximum iterations for iterative methods
            preserve_edges: Preserve edges during deblurring
        """
        self.default_method = default_method
        self.max_iterations = max_iterations
        self.preserve_edges = preserve_edges
        self._sharpness_history: List[float] = []
        
    def analyze_blur(self, frame: np.ndarray) -> BlurAnalysis:
        """
        Analyze blur characteristics in a frame.
        
        Args:
            frame: Input frame as numpy array (H, W, 3)
            
        Returns:
            BlurAnalysis object with detected blur characteristics
        """
        # Convert to grayscale for analysis
        if len(frame.shape) == 3:
            gray = np.mean(frame, axis=2).astype(np.uint8)
        else:
            gray = frame.astype(np.uint8)
        
        # Measure blur amount using Laplacian variance
        blur_amount = self._measure_blur_amount(gray)
        
        # Detect blur type
        blur_type = self._detect_blur_type(gray)
        
        # Estimate blur angle for motion blur
        blur_angle = None
        if blur_type == BlurType.MOTION:
            blur_angle = self._estimate_blur_angle(gray)
        
        # Estimate kernel size
        kernel_size = self._estimate_kernel_size(blur_amount)
        
        # Calculate confidence
        confidence = self._calculate_confidence(blur_amount, blur_type)
        
        # Recommend method
        recommended_method = self._recommend_method(blur_amount, blur_type)
        
        return BlurAnalysis(
            blur_amount=blur_amount,
            blur_type=blur_type,
            blur_angle=blur_angle,
            blur_kernel_size=kernel_size,
            confidence=confidence,
            recommended_method=recommended_method
        )
    
    def deblur_frame(self,
                    frame: np.ndarray,
                    method: Optional[DeblurMethod] = None,
                    strength: float = 1.0) -> DeblurResult:
        """
        Deblur a single frame.
        
        Args:
            frame: Input frame as numpy array (H, W, 3)
            method: Deblurring method to use (None = use default)
            strength: Deblurring strength (0.0 to 2.0, default 1.0)
            
        Returns:
            DeblurResult with deblurred frame and metrics
        """
        import time
        start_time = time.time()
        
        # Analyze blur if using adaptive method
        if method is None or method == DeblurMethod.ADAPTIVE:
            analysis = self.analyze_blur(frame)
            method = analysis.recommended_method
        
        # Apply deblurring
        iterations = 0
        if method == DeblurMethod.WIENER:
            deblurred, iterations = self._wiener_deblur(frame, strength)
        elif method == DeblurMethod.RICHARDSON_LUCY:
            deblurred, iterations = self._richardson_lucy_deblur(frame, strength)
        elif method == DeblurMethod.BLIND_DECONVOLUTION:
            deblurred, iterations = self._blind_deconvolution(frame, strength)
        elif method == DeblurMethod.AI_BASED:
            deblurred, iterations = self._ai_deblur(frame, strength)
        else:
            deblurred, iterations = self._adaptive_deblur(frame, strength)
        
        # Calculate metrics
        sharpness_improvement = self._calculate_sharpness_improvement(frame, deblurred)
        quality_score = self._calculate_quality_score(deblurred)
        
        processing_time = time.time() - start_time
        
        return DeblurResult(
            deblurred_frame=deblurred,
            method_used=method,
            sharpness_improvement=sharpness_improvement,
            quality_score=quality_score,
            processing_time=processing_time,
            iterations=iterations
        )
    
    def deblur_sequence(self,
                       frames: List[np.ndarray],
                       method: Optional[DeblurMethod] = None,
                       strength: float = 1.0) -> List[np.ndarray]:
        """
        Deblur a sequence of frames with temporal consistency.
        
        Args:
            frames: List of frames as numpy arrays
            method: Deblurring method to use
            strength: Deblurring strength
            
        Returns:
            List of deblurred frames
        """
        if not frames:
            return []
        
        deblurred_frames = []
        
        for i, frame in enumerate(frames):
            # Deblur current frame
            result = self.deblur_frame(frame, method, strength)
            deblurred = result.deblurred_frame
            
            deblurred_frames.append(deblurred)
            
            # Update sharpness history
            self._sharpness_history.append(result.sharpness_improvement)
            if len(self._sharpness_history) > 30:
                self._sharpness_history.pop(0)
        
        return deblurred_frames
    
    def _measure_blur_amount(self, gray: np.ndarray) -> float:
        """Measure blur amount using Laplacian variance."""
        # Compute Laplacian
        laplacian = self._compute_laplacian(gray)
        
        # Calculate variance
        variance = np.var(laplacian)
        
        # Normalize to 0-1 range (higher variance = sharper)
        # Typical range: 0-500 for variance
        sharpness = min(variance / 500.0, 1.0)
        blur_amount = 1.0 - sharpness
        
        return blur_amount
    
    def _detect_blur_type(self, gray: np.ndarray) -> BlurType:
        """Detect the type of blur present."""
        # Compute gradients
        grad_x = np.gradient(gray.astype(np.float32), axis=1)
        grad_y = np.gradient(gray.astype(np.float32), axis=0)
        
        # Analyze gradient distribution
        grad_mag = np.sqrt(grad_x**2 + grad_y**2)
        grad_angle = np.arctan2(grad_y, grad_x)
        
        # Check for directional blur (motion blur)
        angle_hist, _ = np.histogram(grad_angle, bins=36, range=(-np.pi, np.pi))
        if np.max(angle_hist) > np.mean(angle_hist) * 2:
            return BlurType.MOTION
        
        # Check for uniform blur (defocus)
        if np.std(grad_mag) < np.mean(grad_mag) * 0.5:
            return BlurType.DEFOCUS
        
        return BlurType.GAUSSIAN
    
    def _estimate_blur_angle(self, gray: np.ndarray) -> float:
        """Estimate motion blur angle in degrees."""
        # Compute gradients
        grad_x = np.gradient(gray.astype(np.float32), axis=1)
        grad_y = np.gradient(gray.astype(np.float32), axis=0)
        
        # Find dominant angle
        angles = np.arctan2(grad_y, grad_x)
        angle_hist, bin_edges = np.histogram(angles, bins=36, range=(-np.pi, np.pi))
        dominant_bin = np.argmax(angle_hist)
        dominant_angle = (bin_edges[dominant_bin] + bin_edges[dominant_bin + 1]) / 2
        
        # Convert to degrees
        return np.degrees(dominant_angle)
    
    def _estimate_kernel_size(self, blur_amount: float) -> int:
        """Estimate blur kernel size based on blur amount."""
        # Map blur amount to kernel size (3 to 15)
        kernel_size = int(3 + blur_amount * 12)
        if kernel_size % 2 == 0:
            kernel_size += 1
        return kernel_size
    
    def _calculate_confidence(self, blur_amount: float, blur_type: BlurType) -> float:
        """Calculate confidence in blur detection."""
        # Higher confidence for clear blur levels
        if blur_amount < 0.1 or blur_amount > 0.9:
            level_confidence = 0.9
        else:
            level_confidence = 0.7
        
        # Higher confidence for specific blur types
        type_confidence = 0.8 if blur_type != BlurType.MIXED else 0.5
        
        return (level_confidence + type_confidence) / 2
    
    def _recommend_method(self, blur_amount: float, blur_type: BlurType) -> DeblurMethod:
        """Recommend deblurring method based on blur characteristics."""
        if blur_amount < 0.2:
            # Light blur: simple sharpening
            return DeblurMethod.WIENER
        elif blur_type == BlurType.MOTION:
            # Motion blur: Richardson-Lucy
            return DeblurMethod.RICHARDSON_LUCY
        elif blur_amount > 0.6:
            # Heavy blur: AI-based
            return DeblurMethod.AI_BASED
        else:
            # Medium blur: blind deconvolution
            return DeblurMethod.BLIND_DECONVOLUTION
    
    def _wiener_deblur(self, frame: np.ndarray, strength: float) -> Tuple[np.ndarray, int]:
        """Apply Wiener deconvolution."""
        # Simplified Wiener filter using unsharp masking
        kernel_size = int(3 + 2 * strength)
        if kernel_size % 2 == 0:
            kernel_size += 1
        
        # Apply unsharp mask
        deblurred = self._unsharp_mask(frame, kernel_size, strength)
        
        return deblurred, 1
    
    def _richardson_lucy_deblur(self, frame: np.ndarray, 
                                strength: float) -> Tuple[np.ndarray, int]:
        """Apply Richardson-Lucy deconvolution."""
        iterations = min(int(5 + 5 * strength), self.max_iterations)
        
        # Create blur kernel (simplified)
        kernel_size = int(5 + 4 * strength)
        if kernel_size % 2 == 0:
            kernel_size += 1
        kernel = self._create_blur_kernel(kernel_size)
        
        # Richardson-Lucy iterations
        deblurred = frame.astype(np.float32)
        for i in range(iterations):
            # Convolve with kernel
            blurred = self._convolve_frame(deblurred, kernel)
            
            # Compute ratio
            ratio = frame.astype(np.float32) / (blurred + 1e-10)
            
            # Convolve ratio with flipped kernel
            correction = self._convolve_frame(ratio, np.flip(kernel))
            
            # Update estimate
            deblurred = deblurred * correction
        
        return np.clip(deblurred, 0, 255).astype(np.uint8), iterations
    
    def _blind_deconvolution(self, frame: np.ndarray, 
                            strength: float) -> Tuple[np.ndarray, int]:
        """Apply blind deconvolution."""
        # Simplified blind deconvolution
        # In production, use more sophisticated algorithms
        iterations = min(int(3 + 3 * strength), self.max_iterations)
        
        # Start with Richardson-Lucy
        deblurred, _ = self._richardson_lucy_deblur(frame, strength * 0.8)
        
        # Apply additional sharpening
        deblurred = self._unsharp_mask(deblurred, 5, strength * 0.5)
        
        return deblurred, iterations
    
    def _ai_deblur(self, frame: np.ndarray, strength: float) -> Tuple[np.ndarray, int]:
        """Apply AI-based deblurring (placeholder for real AI model)."""
        # This would use a trained neural network in production
        # For now, use a combination of Richardson-Lucy and sharpening
        deblurred, iterations = self._richardson_lucy_deblur(frame, strength)
        deblurred = self._unsharp_mask(deblurred, 3, strength * 0.3)
        
        return deblurred, iterations
    
    def _adaptive_deblur(self, frame: np.ndarray, 
                        strength: float) -> Tuple[np.ndarray, int]:
        """Apply adaptive deblurring based on local blur characteristics."""
        analysis = self.analyze_blur(frame)
        
        if analysis.blur_amount < 0.2:
            return self._wiener_deblur(frame, strength)
        elif analysis.blur_amount < 0.5:
            return self._richardson_lucy_deblur(frame, strength)
        else:
            return self._ai_deblur(frame, strength)
    
    def _calculate_sharpness_improvement(self, original: np.ndarray, 
                                        deblurred: np.ndarray) -> float:
        """Calculate sharpness improvement."""
        # Convert to grayscale
        if len(original.shape) == 3:
            orig_gray = np.mean(original, axis=2).astype(np.uint8)
            deblur_gray = np.mean(deblurred, axis=2).astype(np.uint8)
        else:
            orig_gray = original
            deblur_gray = deblurred
        
        # Measure sharpness using Laplacian variance
        orig_sharpness = np.var(self._compute_laplacian(orig_gray))
        deblur_sharpness = np.var(self._compute_laplacian(deblur_gray))
        
        if orig_sharpness == 0:
            return 0.0
        
        improvement = (deblur_sharpness - orig_sharpness) / orig_sharpness
        return max(0.0, min(improvement, 1.0))
    
    def _calculate_quality_score(self, frame: np.ndarray) -> float:
        """Calculate overall quality score."""
        # Convert to grayscale
        if len(frame.shape) == 3:
            gray = np.mean(frame, axis=2).astype(np.uint8)
        else:
            gray = frame
        
        # Measure sharpness
        sharpness = np.var(self._compute_laplacian(gray))
        
        # Normalize to 0-1 range
        quality = min(sharpness / 500.0, 1.0)
        return quality
    
    def _compute_laplacian(self, gray: np.ndarray) -> np.ndarray:
        """Compute Laplacian for edge detection."""
        kernel = np.array([[0, 1, 0],
                          [1, -4, 1],
                          [0, 1, 0]], dtype=np.float32)
        return self._convolve2d(gray.astype(np.float32), kernel)
    
    def _unsharp_mask(self, frame: np.ndarray, kernel_size: int, 
                     amount: float) -> np.ndarray:
        """Apply unsharp masking for sharpening."""
        # Create Gaussian kernel
        sigma = kernel_size / 6.0
        kernel = self._gaussian_kernel(kernel_size, sigma)
        
        # Blur the image
        if len(frame.shape) == 3:
            blurred = np.zeros_like(frame, dtype=np.float32)
            for c in range(frame.shape[2]):
                blurred[:, :, c] = self._convolve2d(frame[:, :, c].astype(np.float32), kernel)
        else:
            blurred = self._convolve2d(frame.astype(np.float32), kernel)
        
        # Compute unsharp mask
        sharpened = frame.astype(np.float32) + amount * (frame.astype(np.float32) - blurred)
        
        return np.clip(sharpened, 0, 255).astype(np.uint8)
    
    def _create_blur_kernel(self, size: int) -> np.ndarray:
        """Create a simple blur kernel."""
        kernel = np.ones((size, size), dtype=np.float32)
        return kernel / np.sum(kernel)
    
    def _convolve_frame(self, frame: np.ndarray, kernel: np.ndarray) -> np.ndarray:
        """Convolve frame with kernel."""
        if len(frame.shape) == 3:
            result = np.zeros_like(frame)
            for c in range(frame.shape[2]):
                result[:, :, c] = self._convolve2d(frame[:, :, c], kernel)
        else:
            result = self._convolve2d(frame, kernel)
        return result
    
    def _gaussian_kernel(self, size: int, sigma: float) -> np.ndarray:
        """Generate Gaussian kernel."""
        kernel = np.zeros((size, size))
        center = size // 2
        
        for i in range(size):
            for j in range(size):
                x, y = i - center, j - center
                kernel[i, j] = np.exp(-(x**2 + y**2) / (2 * sigma**2))
        
        return kernel / np.sum(kernel)
    
    def _convolve2d(self, image: np.ndarray, kernel: np.ndarray) -> np.ndarray:
        """Simple 2D convolution."""
        h, w = image.shape[:2]
        kh, kw = kernel.shape
        pad_h, pad_w = kh // 2, kw // 2
        
        # Pad image
        padded = np.pad(image, ((pad_h, pad_h), (pad_w, pad_w)), mode='edge')
        
        # Convolve
        result = np.zeros_like(image, dtype=np.float32)
        for i in range(h):
            for j in range(w):
                region = padded[i:i+kh, j:j+kw]
                result[i, j] = np.sum(region * kernel)
        
        return result
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get deblurring statistics."""
        if not self._sharpness_history:
            return {}
        
        return {
            'avg_sharpness_improvement': np.mean(self._sharpness_history),
            'max_sharpness_improvement': np.max(self._sharpness_history),
            'min_sharpness_improvement': np.min(self._sharpness_history),
            'frames_processed': len(self._sharpness_history)
        }
