"""
Test Model Optimization - Quantization, ONNX, TensorRT

This test validates the model optimization pipeline:
- Quantization (Dynamic, Static, FP16)
- ONNX export and verification
- TensorRT optimization (if available)
"""

import pytest
import torch
import torch.nn as nn
import numpy as np
from pathlib import Path
import tempfile
import shutil

from src.models import (
    ModelQuantizer,
    QuantizationConfig,
    QuantizationType,
    ONNXExporter,
    ONNXExportConfig,
    TensorRTOptimizer,
    TensorRTConfig,
    quantize_style_transfer_model,
    quantize_super_resolution_model,
    export_style_transfer_to_onnx,
    export_super_resolution_to_onnx
)


# Simple test model
class SimpleConvNet(nn.Module):
    """Simple CNN for testing."""
    
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(3, 16, 3, padding=1)
        self.bn1 = nn.BatchNorm2d(16)
        self.relu1 = nn.ReLU()
        self.conv2 = nn.Conv2d(16, 32, 3, padding=1)
        self.bn2 = nn.BatchNorm2d(32)
        self.relu2 = nn.ReLU()
        self.conv3 = nn.Conv2d(32, 3, 3, padding=1)
    
    def forward(self, x):
        x = self.relu1(self.bn1(self.conv1(x)))
        x = self.relu2(self.bn2(self.conv2(x)))
        x = self.conv3(x)
        return x


@pytest.fixture
def test_model():
    """Create test model."""
    model = SimpleConvNet()
    model.eval()
    return model


@pytest.fixture
def test_input():
    """Create test input."""
    return torch.randn(1, 3, 64, 64)


@pytest.fixture
def temp_dir():
    """Create temporary directory."""
    temp_path = tempfile.mkdtemp()
    yield temp_path
    shutil.rmtree(temp_path)


class TestModelQuantizer:
    """Test model quantization."""
    
    def test_dynamic_quantization(self, test_model, test_input):
        """Test dynamic quantization."""
        config = QuantizationConfig(
            quantization_type=QuantizationType.DYNAMIC,
            quantize_linear=True,
            quantize_conv=True
        )
        
        quantizer = ModelQuantizer(config)
        quantized_model = quantizer.quantize(test_model)
        
        # Test inference
        with torch.no_grad():
            output = quantized_model(test_input)
        
        assert output.shape == test_input.shape
        assert not torch.isnan(output).any()
    
    def test_fp16_conversion(self, test_model, test_input):
        """Test FP16 conversion."""
        if not torch.cuda.is_available():
            pytest.skip("CUDA not available")
        
        config = QuantizationConfig(
            quantization_type=QuantizationType.FP16
        )
        
        quantizer = ModelQuantizer(config)
        fp16_model = quantizer.quantize(test_model, device="cuda")
        
        # Test inference
        test_input_cuda = test_input.cuda().half()
        with torch.no_grad():
            output = fp16_model(test_input_cuda)
        
        assert output.dtype == torch.float16
        assert output.shape == test_input.shape
    
    def test_quantization_benchmark(self, test_model, test_input):
        """Test quantization benchmarking."""
        config = QuantizationConfig(
            quantization_type=QuantizationType.DYNAMIC
        )
        
        quantizer = ModelQuantizer(config)
        quantized_model = quantizer.quantize(test_model)
        
        results = quantizer.benchmark_quantization(
            test_model,
            quantized_model,
            test_input,
            num_iterations=10
        )
        
        assert "original_size_mb" in results
        assert "quantized_size_mb" in results
        assert "size_reduction_percent" in results
        assert "speedup" in results
        
        # Quantized model should be smaller
        assert results["quantized_size_mb"] < results["original_size_mb"]
        assert results["size_reduction_percent"] > 0
    
    def test_save_load_quantized(self, test_model, test_input, temp_dir):
        """Test saving and loading quantized model."""
        config = QuantizationConfig(
            quantization_type=QuantizationType.DYNAMIC
        )
        
        quantizer = ModelQuantizer(config)
        quantized_model = quantizer.quantize(test_model)
        
        # Save
        save_path = Path(temp_dir) / "quantized_model.pth"
        quantizer.save_quantized_model(quantized_model, str(save_path))
        
        assert save_path.exists()
        
        # Load
        loaded_model = quantizer.load_quantized_model(
            SimpleConvNet,
            str(save_path)
        )
        
        # Test inference
        with torch.no_grad():
            output = loaded_model(test_input)
        
        assert output.shape == test_input.shape
    
    def test_convenience_functions(self, test_model):
        """Test convenience quantization functions."""
        # Style transfer quantization
        quantized_st = quantize_style_transfer_model(
            test_model,
            quantization_type="dynamic"
        )
        assert quantized_st is not None
        
        # Super resolution quantization (FP16)
        if torch.cuda.is_available():
            quantized_sr = quantize_super_resolution_model(
                test_model,
                quantization_type="fp16",
                device="cuda"
            )
            assert quantized_sr is not None


class TestONNXExporter:
    """Test ONNX export."""
    
    def test_basic_export(self, test_model, test_input, temp_dir):
        """Test basic ONNX export."""
        export_path = Path(temp_dir) / "model.onnx"
        
        exporter = ONNXExporter()
        metadata = exporter.export(
            test_model,
            test_input,
            str(export_path)
        )
        
        assert export_path.exists()
        assert "export_path" in metadata
        assert "opset_version" in metadata
        assert metadata["opset_version"] == 13
    
    def test_export_with_dynamic_axes(self, test_model, test_input, temp_dir):
        """Test ONNX export with dynamic axes."""
        export_path = Path(temp_dir) / "model_dynamic.onnx"
        
        dynamic_axes = {
            "input": {0: "batch", 2: "height", 3: "width"},
            "output": {0: "batch", 2: "height", 3: "width"}
        }
        
        config = ONNXExportConfig(
            dynamic_axes=dynamic_axes,
            verify_export=True
        )
        
        exporter = ONNXExporter(config)
        metadata = exporter.export(
            test_model,
            test_input,
            str(export_path),
            input_names=["input"],
            output_names=["output"],
            dynamic_axes=dynamic_axes
        )
        
        assert export_path.exists()
        assert metadata["verified"]
    
    def test_export_verification(self, test_model, test_input, temp_dir):
        """Test ONNX export verification."""
        pytest.importorskip("onnxruntime")
        
        export_path = Path(temp_dir) / "model_verify.onnx"
        
        config = ONNXExportConfig(verify_export=True, tolerance=1e-3)
        exporter = ONNXExporter(config)
        
        metadata = exporter.export(
            test_model,
            test_input,
            str(export_path)
        )
        
        assert metadata["verified"]
        assert "max_difference" in metadata
        assert metadata["max_difference"] < 1e-3
    
    def test_onnx_benchmark(self, test_model, test_input, temp_dir):
        """Test ONNX model benchmarking."""
        pytest.importorskip("onnxruntime")
        
        export_path = Path(temp_dir) / "model_bench.onnx"
        
        exporter = ONNXExporter()
        exporter.export(test_model, test_input, str(export_path))
        
        results = exporter.benchmark_onnx_model(
            str(export_path),
            test_input.numpy(),
            num_iterations=10
        )
        
        assert "average_time_ms" in results
        assert "throughput_fps" in results
        assert results["average_time_ms"] > 0
        assert results["throughput_fps"] > 0
    
    def test_convenience_export_functions(self, test_model, temp_dir):
        """Test convenience export functions."""
        # Style transfer export
        st_path = Path(temp_dir) / "style_transfer.onnx"
        metadata_st = export_style_transfer_to_onnx(
            test_model,
            str(st_path),
            input_size=(64, 64)
        )
        assert st_path.exists()
        assert "export_path" in metadata_st
        
        # Super resolution export
        sr_path = Path(temp_dir) / "super_resolution.onnx"
        metadata_sr = export_super_resolution_to_onnx(
            test_model,
            str(sr_path),
            input_size=(64, 64),
            scale=4
        )
        assert sr_path.exists()
        assert "export_path" in metadata_sr


class TestTensorRTOptimizer:
    """Test TensorRT optimization."""
    
    def test_tensorrt_availability(self):
        """Test TensorRT availability check."""
        optimizer = TensorRTOptimizer()
        # Should not raise error even if TensorRT not available
        assert hasattr(optimizer, 'tensorrt_available')
    
    @pytest.mark.skipif(
        not torch.cuda.is_available(),
        reason="CUDA not available"
    )
    def test_tensorrt_optimization(self, test_model, test_input, temp_dir):
        """Test TensorRT optimization (if available)."""
        pytest.importorskip("tensorrt")
        
        # First export to ONNX
        onnx_path = Path(temp_dir) / "model.onnx"
        exporter = ONNXExporter()
        exporter.export(test_model, test_input, str(onnx_path))
        
        # Then optimize with TensorRT
        engine_path = Path(temp_dir) / "model.engine"
        
        config = TensorRTConfig(
            fp16_mode=True,
            max_batch_size=1
        )
        
        optimizer = TensorRTOptimizer(config)
        
        if optimizer.tensorrt_available:
            input_shapes = {"input": (1, 3, 64, 64)}
            
            metadata = optimizer.optimize_from_onnx(
                str(onnx_path),
                str(engine_path),
                input_shapes
            )
            
            assert engine_path.exists()
            assert "engine_path" in metadata
            assert metadata["fp16_enabled"]
        else:
            pytest.skip("TensorRT not available")


class TestIntegrationOptimization:
    """Test complete optimization pipeline."""
    
    def test_full_optimization_pipeline(self, test_model, test_input, temp_dir):
        """Test complete optimization pipeline."""
        # 1. Quantize model
        quantizer = ModelQuantizer(
            QuantizationConfig(quantization_type=QuantizationType.DYNAMIC)
        )
        quantized_model = quantizer.quantize(test_model)
        
        # 2. Export to ONNX
        onnx_path = Path(temp_dir) / "optimized_model.onnx"
        exporter = ONNXExporter(ONNXExportConfig(verify_export=False))
        onnx_metadata = exporter.export(
            quantized_model,
            test_input,
            str(onnx_path)
        )
        
        assert onnx_path.exists()
        
        # 3. Benchmark improvements
        quant_results = quantizer.benchmark_quantization(
            test_model,
            quantized_model,
            test_input,
            num_iterations=10
        )
        
        assert quant_results["size_reduction_percent"] > 0
        
        print(f"\nOptimization Results:")
        print(f"  Size reduction: {quant_results['size_reduction_percent']:.1f}%")
        print(f"  Speedup: {quant_results['speedup']:.2f}x")
    
    def test_compare_optimization_strategies(self, test_model, test_input):
        """Compare different optimization strategies."""
        results = {}
        
        # Original model
        original_size = self._get_model_size(test_model)
        results["original"] = {"size_mb": original_size}
        
        # Dynamic quantization
        quantizer_dynamic = ModelQuantizer(
            QuantizationConfig(quantization_type=QuantizationType.DYNAMIC)
        )
        quantized_dynamic = quantizer_dynamic.quantize(test_model)
        dynamic_size = self._get_model_size(quantized_dynamic)
        results["dynamic_quant"] = {
            "size_mb": dynamic_size,
            "reduction": (1 - dynamic_size / original_size) * 100
        }
        
        # FP16 (if CUDA available)
        if torch.cuda.is_available():
            quantizer_fp16 = ModelQuantizer(
                QuantizationConfig(quantization_type=QuantizationType.FP16)
            )
            quantized_fp16 = quantizer_fp16.quantize(test_model, device="cuda")
            fp16_size = self._get_model_size(quantized_fp16)
            results["fp16"] = {
                "size_mb": fp16_size,
                "reduction": (1 - fp16_size / original_size) * 100
            }
        
        print(f"\nOptimization Strategy Comparison:")
        for strategy, metrics in results.items():
            print(f"  {strategy}: {metrics['size_mb']:.2f}MB", end="")
            if "reduction" in metrics:
                print(f" ({metrics['reduction']:.1f}% reduction)")
            else:
                print()
        
        # All optimized versions should be smaller
        for strategy, metrics in results.items():
            if strategy != "original" and "reduction" in metrics:
                assert metrics["reduction"] > 0
    
    def _get_model_size(self, model):
        """Get model size in MB."""
        import io
        buffer = io.BytesIO()
        torch.save(model.state_dict(), buffer)
        return buffer.tell() / (1024 * 1024)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
