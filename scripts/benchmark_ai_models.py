"""
AI Model Benchmarking Script

Comprehensive benchmarking of all AI models with:
- Performance metrics (speed, throughput)
- Quality metrics (PSNR, SSIM)
- Resource usage (memory, GPU)
- Comparison reports
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import torch
import numpy as np
from PIL import Image, ImageDraw
import time
import json
from datetime import datetime
from typing import Dict, Any, List
import argparse

from src.models import (
    NeuralStyleTransfer,
    FastStyleTransfer,
    ESRGAN,
    RealESRGAN,
    RIFE,
    FILM,
    ModelQuantizer,
    QuantizationConfig,
    QuantizationType,
    ONNXExporter,
    ONNXExportConfig
)


def calculate_psnr(img1: np.ndarray, img2: np.ndarray) -> float:
    """Calculate PSNR."""
    mse = np.mean((img1.astype(float) - img2.astype(float)) ** 2)
    if mse == 0:
        return float('inf')
    return 20 * np.log10(255.0 / np.sqrt(mse))


def calculate_ssim(img1: np.ndarray, img2: np.ndarray) -> float:
    """Calculate simplified SSIM."""
    if len(img1.shape) == 3:
        img1 = np.mean(img1, axis=2)
    if len(img2.shape) == 3:
        img2 = np.mean(img2, axis=2)
    
    C1 = (0.01 * 255) ** 2
    C2 = (0.03 * 255) ** 2
    
    mu1 = np.mean(img1)
    mu2 = np.mean(img2)
    sigma1_sq = np.var(img1)
    sigma2_sq = np.var(img2)
    sigma12 = np.cov(img1.flatten(), img2.flatten())[0, 1]
    
    numerator = (2 * mu1 * mu2 + C1) * (2 * sigma12 + C2)
    denominator = (mu1**2 + mu2**2 + C1) * (sigma1_sq + sigma2_sq + C2)
    
    return float(np.clip(numerator / denominator, 0, 1))


def create_test_image(size=(512, 512)) -> Image.Image:
    """Create synthetic test image."""
    img = Image.new('RGB', size, color='white')
    draw = ImageDraw.Draw(img)
    
    # Gradient background
    for y in range(size[1]):
        color = int(200 - 100 * y / size[1])
        draw.line([(0, y), (size[0], y)], fill=(color, color + 30, 255 - color))
    
    # Shapes
    for i in range(5):
        x = size[0] // 6 * (i + 1)
        y = size[1] // 2
        r = 30 + i * 5
        color = (255 - i * 40, i * 40, 128)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=color, outline='black', width=2)
    
    return img


class ModelBenchmark:
    """Benchmark AI models."""
    
    def __init__(self, device: str = "auto"):
        """Initialize benchmarker."""
        if device == "auto":
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
        
        print(f"Using device: {self.device}")
        
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "device": self.device,
            "benchmarks": {}
        }
    
    def benchmark_style_transfer(self, test_img: Image.Image, num_runs: int = 3):
        """Benchmark style transfer models."""
        print("\n" + "="*60)
        print("STYLE TRANSFER BENCHMARK")
        print("="*60)
        
        style_img = create_test_image((512, 512))
        
        # Neural Style Transfer
        print("\n1. Neural Style Transfer (VGG19-based)")
        nst = NeuralStyleTransfer(device=self.device, num_steps=100)
        
        times = []
        for i in range(num_runs):
            print(f"  Run {i+1}/{num_runs}...", end=" ")
            start = time.time()
            result = nst.transfer_style(test_img, style_img)
            elapsed = time.time() - start
            times.append(elapsed)
            print(f"{elapsed:.2f}s")
        
        avg_time = np.mean(times)
        std_time = np.std(times)
        
        # Quality metrics
        content_np = np.array(test_img)
        result_np = np.array(result)
        psnr = calculate_psnr(content_np, result_np)
        ssim = calculate_ssim(content_np, result_np)
        
        self.results["benchmarks"]["neural_style_transfer"] = {
            "average_time_seconds": float(avg_time),
            "std_time_seconds": float(std_time),
            "throughput_fps": float(1 / avg_time),
            "psnr_db": float(psnr),
            "ssim": float(ssim),
            "num_runs": num_runs
        }
        
        print(f"\n  Results:")
        print(f"    Average time: {avg_time:.2f}s ± {std_time:.2f}s")
        print(f"    Throughput: {1/avg_time:.2f} FPS")
        print(f"    PSNR: {psnr:.2f} dB")
        print(f"    SSIM: {ssim:.4f}")
        
        # Fast Style Transfer
        print("\n2. Fast Style Transfer (Feed-forward)")
        fast_st = FastStyleTransfer()
        
        times = []
        for i in range(num_runs):
            print(f"  Run {i+1}/{num_runs}...", end=" ")
            start = time.time()
            result = fast_st.transfer_style(test_img, device=self.device)
            elapsed = time.time() - start
            times.append(elapsed)
            print(f"{elapsed:.3f}s")
        
        avg_time = np.mean(times)
        
        self.results["benchmarks"]["fast_style_transfer"] = {
            "average_time_seconds": float(avg_time),
            "throughput_fps": float(1 / avg_time),
            "num_runs": num_runs
        }
        
        print(f"\n  Results:")
        print(f"    Average time: {avg_time*1000:.2f}ms")
        print(f"    Throughput: {1/avg_time:.2f} FPS")
    
    def benchmark_super_resolution(self, low_res_img: Image.Image, num_runs: int = 3):
        """Benchmark super resolution models."""
        print("\n" + "="*60)
        print("SUPER RESOLUTION BENCHMARK")
        print("="*60)
        
        # ESRGAN
        print("\n1. ESRGAN (4x upscaling)")
        esrgan = ESRGAN(scale=4, device=self.device)
        
        times = []
        for i in range(num_runs):
            print(f"  Run {i+1}/{num_runs}...", end=" ")
            start = time.time()
            result = esrgan.upscale(low_res_img, use_tiling=False)
            elapsed = time.time() - start
            times.append(elapsed)
            print(f"{elapsed:.2f}s")
        
        avg_time = np.mean(times)
        
        # Quality vs bicubic
        reference = low_res_img.resize(
            (low_res_img.width * 4, low_res_img.height * 4),
            Image.BICUBIC
        )
        result_np = np.array(result)
        reference_np = np.array(reference)
        psnr = calculate_psnr(reference_np, result_np)
        ssim = calculate_ssim(reference_np, result_np)
        
        self.results["benchmarks"]["esrgan_4x"] = {
            "average_time_seconds": float(avg_time),
            "throughput_fps": float(1 / avg_time),
            "psnr_vs_bicubic_db": float(psnr),
            "ssim_vs_bicubic": float(ssim),
            "input_size": low_res_img.size,
            "output_size": result.size,
            "num_runs": num_runs
        }
        
        print(f"\n  Results:")
        print(f"    Average time: {avg_time:.2f}s")
        print(f"    Input: {low_res_img.size}")
        print(f"    Output: {result.size}")
        print(f"    PSNR vs bicubic: {psnr:.2f} dB")
        print(f"    SSIM vs bicubic: {ssim:.4f}")
        
        # Real-ESRGAN
        print("\n2. Real-ESRGAN (4x upscaling)")
        real_esrgan = RealESRGAN(
            scale=4,
            device=self.device,
            half_precision=(self.device == "cuda")
        )
        
        times = []
        for i in range(num_runs):
            print(f"  Run {i+1}/{num_runs}...", end=" ")
            start = time.time()
            result = real_esrgan.upscale(low_res_img, use_tiling=False)
            elapsed = time.time() - start
            times.append(elapsed)
            print(f"{elapsed:.2f}s")
        
        avg_time = np.mean(times)
        
        self.results["benchmarks"]["real_esrgan_4x"] = {
            "average_time_seconds": float(avg_time),
            "throughput_fps": float(1 / avg_time),
            "half_precision": (self.device == "cuda"),
            "num_runs": num_runs
        }
        
        print(f"\n  Results:")
        print(f"    Average time: {avg_time:.2f}s")
        print(f"    FP16: {self.device == 'cuda'}")
    
    def benchmark_interpolation(self, frame0: Image.Image, frame1: Image.Image, num_runs: int = 3):
        """Benchmark frame interpolation models."""
        print("\n" + "="*60)
        print("FRAME INTERPOLATION BENCHMARK")
        print("="*60)
        
        # RIFE
        print("\n1. RIFE (Real-Time Intermediate Flow)")
        rife = RIFE(device=self.device)
        
        times = []
        for i in range(num_runs):
            print(f"  Run {i+1}/{num_runs}...", end=" ")
            start = time.time()
            result = rife.interpolate(frame0, frame1, num_frames=1)
            elapsed = time.time() - start
            times.append(elapsed)
            print(f"{elapsed:.3f}s")
        
        avg_time = np.mean(times)
        
        # Quality metrics
        frame0_np = np.array(frame0)
        result_np = np.array(result[0])
        psnr = calculate_psnr(frame0_np, result_np)
        ssim = calculate_ssim(frame0_np, result_np)
        
        self.results["benchmarks"]["rife"] = {
            "average_time_seconds": float(avg_time),
            "throughput_fps": float(1 / avg_time),
            "psnr_to_frame0_db": float(psnr),
            "ssim_to_frame0": float(ssim),
            "num_runs": num_runs
        }
        
        print(f"\n  Results:")
        print(f"    Average time: {avg_time*1000:.2f}ms")
        print(f"    Throughput: {1/avg_time:.2f} FPS")
        print(f"    PSNR to frame0: {psnr:.2f} dB")
        print(f"    SSIM to frame0: {ssim:.4f}")
    
    def benchmark_quantization(self, test_img: Image.Image):
        """Benchmark quantized models."""
        print("\n" + "="*60)
        print("QUANTIZATION BENCHMARK")
        print("="*60)
        
        # Create simple model for testing
        model = FastStyleTransfer()
        
        # Dynamic quantization
        print("\n1. Dynamic INT8 Quantization")
        quantizer = ModelQuantizer(
            QuantizationConfig(quantization_type=QuantizationType.DYNAMIC)
        )
        quantized_model = quantizer.quantize(model)
        
        # Benchmark
        test_input = torch.randn(1, 3, 512, 512)
        results = quantizer.benchmark_quantization(
            model,
            quantized_model,
            test_input,
            num_iterations=10
        )
        
        self.results["benchmarks"]["quantization_dynamic"] = results
        
        print(f"\n  Results:")
        print(f"    Size reduction: {results['size_reduction_percent']:.1f}%")
        print(f"    Speedup: {results['speedup']:.2f}x")
        print(f"    Original time: {results['original_time_ms']:.2f}ms")
        print(f"    Quantized time: {results['quantized_time_ms']:.2f}ms")
        
        # FP16 (if CUDA available)
        if self.device == "cuda":
            print("\n2. FP16 Conversion")
            quantizer_fp16 = ModelQuantizer(
                QuantizationConfig(quantization_type=QuantizationType.FP16)
            )
            fp16_model = quantizer_fp16.quantize(model, device="cuda")
            
            test_input_cuda = test_input.cuda()
            results_fp16 = quantizer_fp16.benchmark_quantization(
                model.cuda(),
                fp16_model,
                test_input_cuda,
                num_iterations=10
            )
            
            self.results["benchmarks"]["quantization_fp16"] = results_fp16
            
            print(f"\n  Results:")
            print(f"    Size reduction: {results_fp16['size_reduction_percent']:.1f}%")
            print(f"    Speedup: {results_fp16['speedup']:.2f}x")
    
    def save_results(self, output_path: str):
        """Save benchmark results to JSON."""
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n{'='*60}")
        print(f"Results saved to: {output_path}")
        print(f"{'='*60}")
    
    def print_summary(self):
        """Print benchmark summary."""
        print("\n" + "="*60)
        print("BENCHMARK SUMMARY")
        print("="*60)
        
        for model_name, metrics in self.results["benchmarks"].items():
            print(f"\n{model_name.upper().replace('_', ' ')}:")
            
            if "average_time_seconds" in metrics:
                time_val = metrics["average_time_seconds"]
                if time_val < 1:
                    print(f"  Time: {time_val*1000:.2f}ms")
                else:
                    print(f"  Time: {time_val:.2f}s")
            
            if "throughput_fps" in metrics:
                print(f"  Throughput: {metrics['throughput_fps']:.2f} FPS")
            
            if "psnr_db" in metrics:
                print(f"  PSNR: {metrics['psnr_db']:.2f} dB")
            
            if "ssim" in metrics:
                print(f"  SSIM: {metrics['ssim']:.4f}")
            
            if "size_reduction_percent" in metrics:
                print(f"  Size reduction: {metrics['size_reduction_percent']:.1f}%")
            
            if "speedup" in metrics:
                print(f"  Speedup: {metrics['speedup']:.2f}x")


def main():
    """Main benchmarking function."""
    parser = argparse.ArgumentParser(description="Benchmark AI models")
    parser.add_argument("--device", default="auto", choices=["auto", "cpu", "cuda"],
                       help="Device to use for benchmarking")
    parser.add_argument("--output", default="benchmark_results.json",
                       help="Output file for results")
    parser.add_argument("--runs", type=int, default=3,
                       help="Number of runs per benchmark")
    parser.add_argument("--skip-style", action="store_true",
                       help="Skip style transfer benchmarks")
    parser.add_argument("--skip-sr", action="store_true",
                       help="Skip super resolution benchmarks")
    parser.add_argument("--skip-interp", action="store_true",
                       help="Skip interpolation benchmarks")
    parser.add_argument("--skip-quant", action="store_true",
                       help="Skip quantization benchmarks")
    
    args = parser.parse_args()
    
    print("="*60)
    print("AI MODEL BENCHMARKING")
    print("="*60)
    print(f"Device: {args.device}")
    print(f"Runs per benchmark: {args.runs}")
    print(f"Output: {args.output}")
    
    # Initialize benchmarker
    benchmarker = ModelBenchmark(device=args.device)
    
    # Create test images
    print("\nCreating test images...")
    test_img = create_test_image((512, 512))
    low_res_img = create_test_image((128, 128))
    frame0 = create_test_image((512, 512))
    frame1 = create_test_image((512, 512))
    
    # Run benchmarks
    if not args.skip_style:
        benchmarker.benchmark_style_transfer(test_img, args.runs)
    
    if not args.skip_sr:
        benchmarker.benchmark_super_resolution(low_res_img, args.runs)
    
    if not args.skip_interp:
        benchmarker.benchmark_interpolation(frame0, frame1, args.runs)
    
    if not args.skip_quant:
        benchmarker.benchmark_quantization(test_img)
    
    # Print summary
    benchmarker.print_summary()
    
    # Save results
    benchmarker.save_results(args.output)


if __name__ == "__main__":
    main()
