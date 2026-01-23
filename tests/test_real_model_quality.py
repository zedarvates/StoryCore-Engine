"""
Test Real AI Model Quality - Task 18.3

This test validates real AI models with actual images and measures quality metrics:
- PSNR (Peak Signal-to-Noise Ratio)
- SSIM (Structural Similarity Index)
- Performance benchmarks
- Visual quality assessment
"""

import pytest
import torch
import torch.nn as nn
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import tempfile
import shutil
import time
from typing import Dict, Any, Tuple

from src.models import (
    NeuralStyleTransfer,
    FastStyleTransfer,
    ESRGAN,
    RealESRGAN,
    RIFE,
    FILM,
    ModelQuantizer,
    QuantizationConfig,
    QuantizationType
)


def calculate_psnr(img1: np.ndarray, img2: np.ndarray) -> float:
    """
    Calculate PSNR between two images.
    
    Args:
        img1: First image (H, W, C)
        img2: Second image (H, W, C)
    
    Returns:
        PSNR value in dB
    """
    mse = np.mean((img1.astype(float) - img2.astype(float)) ** 2)
    if mse == 0:
        return float('inf')
    
    max_pixel = 255.0
    psnr = 20 * np.log10(max_pixel / np.sqrt(mse))
    return psnr


def calculate_ssim(img1: np.ndarray, img2: np.ndarray) -> float:
    """
    Calculate SSIM between two images (simplified version).
    
    Args:
        img1: First image (H, W, C)
        img2: Second image (H, W, C)
    
    Returns:
        SSIM value (0-1)
    """
    # Convert to grayscale for simplicity
    if len(img1.shape) == 3:
        img1 = np.mean(img1, axis=2)
    if len(img2.shape) == 3:
        img2 = np.mean(img2, axis=2)
    
    # Constants
    C1 = (0.01 * 255) ** 2
    C2 = (0.03 * 255) ** 2
    
    # Calculate means
    mu1 = np.mean(img1)
    mu2 = np.mean(img2)
    
    # Calculate variances and covariance
    sigma1_sq = np.var(img1)
    sigma2_sq = np.var(img2)
    sigma12 = np.cov(img1.flatten(), img2.flatten())[0, 1]
    
    # Calculate SSIM
    numerator = (2 * mu1 * mu2 + C1) * (2 * sigma12 + C2)
    denominator = (mu1**2 + mu2**2 + C1) * (sigma1_sq + sigma2_sq + C2)
    
    ssim = numerator / denominator
    return float(np.clip(ssim, 0, 1))


class TestImageGenerator:
    """Generate synthetic test images with various characteristics."""
    
    @staticmethod
    def create_gradient_image(size: Tuple[int, int] = (512, 512)) -> Image.Image:
        """Create gradient test image."""
        img = Image.new('RGB', size)
        draw = ImageDraw.Draw(img)
        
        for y in range(size[1]):
            color = int(255 * y / size[1])
            draw.line([(0, y), (size[0], y)], fill=(color, color, color))
        
        return img
    
    @staticmethod
    def create_pattern_image(size: Tuple[int, int] = (512, 512)) -> Image.Image:
        """Create pattern test image with geometric shapes."""
        img = Image.new('RGB', size, color='white')
        draw = ImageDraw.Draw(img)
        
        # Draw circles
        for i in range(5):
            x = size[0] // 6 * (i + 1)
            y = size[1] // 2
            r = 30 + i * 10
            color = (255 - i * 50, i * 50, 128)
            draw.ellipse([x-r, y-r, x+r, y+r], fill=color, outline='black')
        
        # Draw rectangles
        for i in range(4):
            x1 = size[0] // 5 * i + 20
            y1 = size[1] // 4
            x2 = x1 + 60
            y2 = y1 + 80
            color = (i * 60, 255 - i * 60, 128)
            draw.rectangle([x1, y1, x2, y2], fill=color, outline='black')
        
        return img
    
    @staticmethod
    def create_text_image(size: Tuple[int, int] = (512, 512)) -> Image.Image:
        """Create test image with text."""
        img = Image.new('RGB', size, color='white')
        draw = ImageDraw.Draw(img)
        
        # Draw text at different sizes
        texts = [
            ("AI Model", 50, 100),
            ("Quality Test", 50, 200),
            ("PSNR & SSIM", 50, 300),
            ("Benchmark", 50, 400)
        ]
        
        for text, x, y in texts:
            draw.text((x, y), text, fill='black')
        
        return img
    
    @staticmethod
    def create_natural_image(size: Tuple[int, int] = (512, 512)) -> Image.Image:
        """Create natural-looking test image."""
        img = Image.new('RGB', size)
        draw = ImageDraw.Draw(img)
        
        # Sky gradient
        for y in range(size[1] // 2):
            color = int(135 + 120 * y / (size[1] // 2))
            draw.line([(0, y), (size[0], y)], fill=(color, color, 255))
        
        # Ground
        for y in range(size[1] // 2, size[1]):
            color = int(100 - 50 * (y - size[1] // 2) / (size[1] // 2))
            draw.line([(0, y), (size[0], y)], fill=(color, 150, color))
        
        # Sun
        sun_x, sun_y = size[0] - 100, 100
        draw.ellipse([sun_x-40, sun_y-40, sun_x+40, sun_y+40], 
                     fill=(255, 255, 0), outline=(255, 200, 0))
        
        # Trees (triangles)
        for i in range(5):
            x = 100 + i * 100
            y = size[1] // 2 + 50
            points = [(x, y), (x-30, y+80), (x+30, y+80)]
            draw.polygon(points, fill=(0, 128, 0), outline=(0, 100, 0))
        
        return img
    
    @staticmethod
    def create_low_res_image(size: Tuple[int, int] = (128, 128)) -> Image.Image:
        """Create low resolution image for super resolution testing."""
        img = TestImageGenerator.create_pattern_image(size)
        # Add slight blur to simulate low quality
        img = img.filter(ImageFilter.GaussianBlur(radius=1))
        return img


@pytest.fixture
def test_images(tmp_path):
    """Create test images."""
    generator = TestImageGenerator()
    
    images = {
        'gradient': generator.create_gradient_image((512, 512)),
        'pattern': generator.create_pattern_image((512, 512)),
        'text': generator.create_text_image((512, 512)),
        'natural': generator.create_natural_image((512, 512)),
        'low_res': generator.create_low_res_image((128, 128))
    }
    
    # Save images
    image_dir = tmp_path / "test_images"
    image_dir.mkdir()
    
    for name, img in images.items():
        img.save(image_dir / f"{name}.png")
    
    return image_dir, images


class TestStyleTransferQuality:
    """Test style transfer model quality."""
    
    def test_neural_style_transfer_quality(self, test_images):
        """Test Neural Style Transfer quality metrics."""
        image_dir, images = test_images
        
        # Initialize model
        nst = NeuralStyleTransfer(device="cpu", num_steps=50)  # Reduced steps for testing
        
        content_img = images['natural']
        style_img = images['pattern']
        
        # Apply style transfer
        start_time = time.time()
        result = nst.transfer_style(content_img, style_img)
        processing_time = time.time() - start_time
        
        # Convert to numpy for metrics
        content_np = np.array(content_img)
        result_np = np.array(result)
        
        # Calculate metrics
        psnr = calculate_psnr(content_np, result_np)
        ssim = calculate_ssim(content_np, result_np)
        
        print(f"\nNeural Style Transfer Results:")
        print(f"  Processing time: {processing_time:.2f}s")
        print(f"  PSNR: {psnr:.2f} dB")
        print(f"  SSIM: {ssim:.4f}")
        print(f"  Output size: {result.size}")
        
        # Assertions
        assert result.size == content_img.size
        assert processing_time < 60  # Should complete in reasonable time
        # PSNR should be reasonable (style transfer changes image significantly)
        assert 10 < psnr < 40
        # SSIM should show some similarity
        assert 0.3 < ssim < 0.9
    
    def test_fast_style_transfer_performance(self, test_images):
        """Test Fast Style Transfer performance."""
        image_dir, images = test_images
        
        # Initialize model
        model = FastStyleTransfer()
        
        content_img = images['natural']
        
        # Benchmark multiple runs
        times = []
        for _ in range(5):
            start_time = time.time()
            result = model.transfer_style(content_img, device="cpu")
            times.append(time.time() - start_time)
        
        avg_time = np.mean(times)
        std_time = np.std(times)
        
        print(f"\nFast Style Transfer Performance:")
        print(f"  Average time: {avg_time*1000:.2f}ms")
        print(f"  Std dev: {std_time*1000:.2f}ms")
        print(f"  Throughput: {1/avg_time:.2f} FPS")
        
        # Fast style transfer should be much faster
        assert avg_time < 5.0  # Should be fast on CPU
        assert result.size == content_img.size


class TestSuperResolutionQuality:
    """Test super resolution model quality."""
    
    def test_esrgan_quality_metrics(self, test_images):
        """Test ESRGAN quality with PSNR/SSIM."""
        image_dir, images = test_images
        
        # Initialize model
        esrgan = ESRGAN(scale=4, device="cpu")
        
        low_res = images['low_res']
        
        # Upscale
        start_time = time.time()
        high_res = esrgan.upscale(low_res, use_tiling=False)
        processing_time = time.time() - start_time
        
        # Create reference (bicubic upscale)
        reference = low_res.resize(
            (low_res.width * 4, low_res.height * 4),
            Image.BICUBIC
        )
        
        # Convert to numpy
        high_res_np = np.array(high_res)
        reference_np = np.array(reference)
        
        # Calculate metrics
        psnr = calculate_psnr(reference_np, high_res_np)
        ssim = calculate_ssim(reference_np, high_res_np)
        
        print(f"\nESRGAN Super Resolution Results:")
        print(f"  Input size: {low_res.size}")
        print(f"  Output size: {high_res.size}")
        print(f"  Processing time: {processing_time:.2f}s")
        print(f"  PSNR vs bicubic: {psnr:.2f} dB")
        print(f"  SSIM vs bicubic: {ssim:.4f}")
        
        # Assertions
        assert high_res.size == (low_res.width * 4, low_res.height * 4)
        assert processing_time < 30
        # ESRGAN should be similar to bicubic (different approach)
        assert psnr > 15
        assert ssim > 0.5
    
    def test_real_esrgan_vs_esrgan(self, test_images):
        """Compare Real-ESRGAN vs ESRGAN."""
        image_dir, images = test_images
        
        low_res = images['low_res']
        
        # Test both models
        esrgan = ESRGAN(scale=4, device="cpu")
        real_esrgan = RealESRGAN(scale=4, device="cpu", half_precision=False)
        
        # Upscale with both
        start_esrgan = time.time()
        result_esrgan = esrgan.upscale(low_res)
        time_esrgan = time.time() - start_esrgan
        
        start_real = time.time()
        result_real = real_esrgan.upscale(low_res)
        time_real = time.time() - start_real
        
        print(f"\nESRGAN vs Real-ESRGAN Comparison:")
        print(f"  ESRGAN time: {time_esrgan:.2f}s")
        print(f"  Real-ESRGAN time: {time_real:.2f}s")
        print(f"  Speedup: {time_esrgan/time_real:.2f}x")
        
        # Both should produce same size output
        assert result_esrgan.size == result_real.size
    
    def test_super_resolution_scales(self, test_images):
        """Test different upscaling factors."""
        image_dir, images = test_images
        
        low_res = images['low_res']
        esrgan = ESRGAN(device="cpu")
        
        scales = [2, 4]
        results = {}
        
        for scale in scales:
            esrgan.scale = scale
            start_time = time.time()
            result = esrgan.upscale(low_res)
            processing_time = time.time() - start_time
            
            expected_size = (low_res.width * scale, low_res.height * scale)
            
            results[scale] = {
                'size': result.size,
                'time': processing_time,
                'expected': expected_size
            }
            
            print(f"\nScale {scale}x:")
            print(f"  Output size: {result.size}")
            print(f"  Expected: {expected_size}")
            print(f"  Processing time: {processing_time:.2f}s")
            
            assert result.size == expected_size


class TestInterpolationQuality:
    """Test frame interpolation model quality."""
    
    def test_rife_interpolation_quality(self, test_images):
        """Test RIFE interpolation quality."""
        image_dir, images = test_images
        
        # Create two frames with slight difference
        frame0 = images['natural']
        frame1 = images['natural'].copy()
        # Shift frame1 slightly to simulate motion
        frame1 = frame1.transform(
            frame1.size,
            Image.AFFINE,
            (1, 0, 10, 0, 1, 0)  # Shift 10 pixels right
        )
        
        # Initialize RIFE
        rife = RIFE(device="cpu")
        
        # Interpolate
        start_time = time.time()
        interpolated = rife.interpolate(frame0, frame1, num_frames=1)
        processing_time = time.time() - start_time
        
        result = interpolated[0]
        
        # Convert to numpy
        frame0_np = np.array(frame0)
        frame1_np = np.array(frame1)
        result_np = np.array(result)
        
        # Calculate metrics (interpolated should be between frame0 and frame1)
        psnr_to_frame0 = calculate_psnr(frame0_np, result_np)
        psnr_to_frame1 = calculate_psnr(frame1_np, result_np)
        ssim_to_frame0 = calculate_ssim(frame0_np, result_np)
        ssim_to_frame1 = calculate_ssim(frame1_np, result_np)
        
        print(f"\nRIFE Interpolation Results:")
        print(f"  Processing time: {processing_time:.2f}s")
        print(f"  PSNR to frame0: {psnr_to_frame0:.2f} dB")
        print(f"  PSNR to frame1: {psnr_to_frame1:.2f} dB")
        print(f"  SSIM to frame0: {ssim_to_frame0:.4f}")
        print(f"  SSIM to frame1: {ssim_to_frame1:.4f}")
        
        # Assertions
        assert result.size == frame0.size
        assert processing_time < 10
        # Interpolated frame should be similar to both input frames
        assert psnr_to_frame0 > 20
        assert psnr_to_frame1 > 20
        assert ssim_to_frame0 > 0.7
        assert ssim_to_frame1 > 0.7
    
    def test_rife_sequence_interpolation(self, test_images):
        """Test RIFE sequence interpolation."""
        image_dir, images = test_images
        
        # Create sequence of 3 frames
        frames = [
            images['natural'],
            images['pattern'],
            images['gradient']
        ]
        
        rife = RIFE(device="cpu")
        
        # Interpolate sequence (double frame rate)
        start_time = time.time()
        interpolated_sequence = rife.interpolate_sequence(frames, multiplier=2)
        processing_time = time.time() - start_time
        
        print(f"\nRIFE Sequence Interpolation:")
        print(f"  Input frames: {len(frames)}")
        print(f"  Output frames: {len(interpolated_sequence)}")
        print(f"  Processing time: {processing_time:.2f}s")
        print(f"  Time per frame: {processing_time/len(interpolated_sequence):.2f}s")
        
        # Should have doubled the frame count
        expected_count = len(frames) * 2 - 1
        assert len(interpolated_sequence) == expected_count


class TestQuantizedModelQuality:
    """Test quality of quantized models."""
    
    def test_quantized_style_transfer_quality(self, test_images):
        """Test quantized style transfer maintains quality."""
        image_dir, images = test_images
        
        # Original model
        original_model = FastStyleTransfer()
        
        # Quantized model
        quantizer = ModelQuantizer(
            QuantizationConfig(quantization_type=QuantizationType.DYNAMIC)
        )
        quantized_model = quantizer.quantize(original_model)
        
        content_img = images['natural']
        
        # Process with both models
        result_original = original_model.transfer_style(content_img, device="cpu")
        result_quantized = quantized_model.transfer_style(content_img, device="cpu")
        
        # Convert to numpy
        original_np = np.array(result_original)
        quantized_np = np.array(result_quantized)
        
        # Calculate metrics
        psnr = calculate_psnr(original_np, quantized_np)
        ssim = calculate_ssim(original_np, quantized_np)
        
        print(f"\nQuantized Model Quality:")
        print(f"  PSNR: {psnr:.2f} dB")
        print(f"  SSIM: {ssim:.4f}")
        
        # Quantized should be very similar to original
        assert psnr > 30  # High PSNR indicates minimal difference
        assert ssim > 0.95  # High SSIM indicates structural similarity


class TestModelBenchmarks:
    """Comprehensive model benchmarks."""
    
    def test_complete_pipeline_benchmark(self, test_images):
        """Benchmark complete AI enhancement pipeline."""
        image_dir, images = test_images
        
        test_img = images['natural']
        low_res_img = images['low_res']
        
        results = {}
        
        # 1. Style Transfer
        nst = NeuralStyleTransfer(device="cpu", num_steps=50)
        start = time.time()
        _ = nst.transfer_style(test_img, images['pattern'])
        results['style_transfer'] = time.time() - start
        
        # 2. Super Resolution
        esrgan = ESRGAN(scale=4, device="cpu")
        start = time.time()
        _ = esrgan.upscale(low_res_img)
        results['super_resolution'] = time.time() - start
        
        # 3. Interpolation
        rife = RIFE(device="cpu")
        start = time.time()
        _ = rife.interpolate(test_img, images['pattern'], num_frames=1)
        results['interpolation'] = time.time() - start
        
        print(f"\nComplete Pipeline Benchmark:")
        print(f"  Style Transfer: {results['style_transfer']:.2f}s")
        print(f"  Super Resolution: {results['super_resolution']:.2f}s")
        print(f"  Interpolation: {results['interpolation']:.2f}s")
        print(f"  Total: {sum(results.values()):.2f}s")
        
        # All should complete in reasonable time
        assert all(t < 60 for t in results.values())


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
