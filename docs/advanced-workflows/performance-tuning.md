# Performance Tuning Guide - Advanced ComfyUI Workflows

## Overview

This guide provides comprehensive strategies for optimizing the performance of advanced ComfyUI workflows. Learn how to maximize speed, minimize memory usage, and achieve the best balance between quality and performance for your specific hardware configuration.

## Table of Contents

1. [Performance Fundamentals](#performance-fundamentals)
2. [Hardware Optimization](#hardware-optimization)
3. [Memory Management](#memory-management)
4. [Model Optimization](#model-optimization)
5. [Workflow-Specific Tuning](#workflow-specific-tuning)
6. [Batch Processing Optimization](#batch-processing-optimization)
7. [Quality vs Performance Trade-offs](#quality-vs-performance-trade-offs)
8. [Monitoring and Profiling](#monitoring-and-profiling)

## Performance Fundamentals

### Key Performance Metrics

| Metric | Target | Measurement | Impact |
|--------|--------|-------------|--------|
| **Generation Speed** | <2min video, <30s image | Time per generation | User experience |
| **Memory Usage** | <80% VRAM, <70% RAM | Peak memory consumption | System stability |
| **Throughput** | >10 generations/hour | Batch processing rate | Productivity |
| **Quality Score** | >0.8 | Automated quality metrics | Output quality |
| **Resource Efficiency** | >60% GPU utilization | Hardware usage | Cost effectiveness |

### Performance Bottlenecks

**Common Bottlenecks:**
1. **Model Loading** (30-60s per model)
2. **VRAM Limitations** (OOM errors)
3. **CPU-GPU Transfer** (Data movement overhead)
4. **Storage I/O** (Model and output file access)
5. **Memory Fragmentation** (Inefficient memory allocation)

### Optimization Strategies Overview

| Strategy | Speed Gain | Memory Savings | Quality Impact | Complexity |
|----------|------------|----------------|----------------|------------|
| **Model Quantization** | 20-40% | 30-50% | Minimal | Low |
| **Batch Processing** | 50-100% | Variable | None | Medium |
| **Model Sharing** | 60-80% | 40-60% | None | Medium |
| **Lightning LoRA** | 70-85% | 20-30% | Slight | Low |
| **Attention Optimization** | 15-25% | 20-40% | None | High |

## Hardware Optimization

### GPU Configuration

#### NVIDIA RTX 4090 (24GB VRAM) - Optimal Settings
```json
{
    "performance_optimization": {
        "strategy": "balanced",
        "model_precision": "fp16",
        "enable_quantization": false,
        "max_memory_usage_gb": 20.0,
        "batch_size": 2,
        "parallel_execution": true
    },
    "memory_optimization": {
        "enable_attention_slicing": false,
        "enable_cpu_offload": false,
        "enable_model_sharing": true,
        "aggressive_cleanup": false
    }
}
```

**Expected Performance:**
- Video Generation: 90-120 seconds
- Image Generation: 15-25 seconds
- Batch Throughput: 12-15 generations/hour

#### NVIDIA RTX 3080 (16GB VRAM) - Memory-Optimized Settings
```json
{
    "performance_optimization": {
        "strategy": "memory_first",
        "model_precision": "fp8",
        "enable_quantization": true,
        "max_memory_usage_gb": 14.0,
        "batch_size": 1,
        "parallel_execution": false
    },
    "memory_optimization": {
        "enable_attention_slicing": true,
        "attention_slice_size": 1,
        "enable_cpu_offload": true,
        "enable_sequential_cpu_offload": false,
        "aggressive_cleanup": true
    }
}
```

**Expected Performance:**
- Video Generation: 150-200 seconds
- Image Generation: 25-35 seconds
- Batch Throughput: 8-10 generations/hour

#### NVIDIA RTX 4060 Ti (16GB VRAM) - Balanced Settings
```json
{
    "performance_optimization": {
        "strategy": "balanced",
        "model_precision": "fp8",
        "enable_quantization": true,
        "max_memory_usage_gb": 13.0,
        "batch_size": 1,
        "parallel_execution": false
    },
    "memory_optimization": {
        "enable_attention_slicing": true,
        "attention_slice_size": 2,
        "enable_cpu_offload": false,
        "enable_model_sharing": true,
        "aggressive_cleanup": true
    }
}
```

### CPU and System Optimization

#### High-Performance CPU Configuration
```json
{
    "system_optimization": {
        "max_cpu_threads": 16,
        "cpu_affinity": [0, 1, 2, 3, 4, 5, 6, 7],
        "enable_cpu_boost": true,
        "memory_pool_size_gb": 8.0,
        "io_threads": 4
    }
}
```

#### System-Level Optimizations
```bash
# Set CPU governor to performance
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Increase file descriptor limits
ulimit -n 65536

# Optimize memory management
echo 1 | sudo tee /proc/sys/vm/swappiness
echo 3 | sudo tee /proc/sys/vm/drop_caches

# Set GPU performance mode
nvidia-smi -pm 1
nvidia-smi -pl 400  # Set power limit to maximum
```

### Storage Optimization

#### SSD Configuration (Recommended)
```json
{
    "storage_optimization": {
        "model_cache_path": "/nvme_ssd/models",
        "temp_path": "/nvme_ssd/temp",
        "output_path": "/ssd/outputs",
        "enable_compression": false,
        "io_buffer_size_mb": 64,
        "async_io": true
    }
}
```

#### HDD Configuration (Budget Option)
```json
{
    "storage_optimization": {
        "model_cache_path": "/hdd/models",
        "temp_path": "/ssd/temp",  # Use SSD for temp files
        "output_path": "/hdd/outputs",
        "enable_compression": true,
        "io_buffer_size_mb": 16,
        "async_io": false,
        "preload_models": true  # Load models into RAM
    }
}
```

## Memory Management

### VRAM Optimization Strategies

#### Strategy 1: Model Quantization
```python
from src.advanced_performance_optimizer import AdvancedPerformanceOptimizer

optimizer = AdvancedPerformanceOptimizer(config)

# Enable aggressive quantization
optimization_result = optimizer.optimize_models(
    strategy="memory_first",
    target_precision="fp8",
    enable_dynamic_quantization=True
)

print(f"Memory saved: {optimization_result.memory_savings_gb:.1f}GB")
```

#### Strategy 2: Sequential Model Loading
```python
class SequentialModelManager:
    """Load models one at a time to minimize peak memory"""
    
    def __init__(self, max_memory_gb=16.0):
        self.max_memory_gb = max_memory_gb
        self.loaded_models = {}
    
    def load_model_on_demand(self, model_name):
        """Load model only when needed"""
        # Unload other models if memory limit approached
        current_usage = self.get_memory_usage()
        if current_usage > self.max_memory_gb * 0.8:
            self.unload_least_used_model()
        
        # Load requested model
        model = self.load_model(model_name)
        self.loaded_models[model_name] = model
        return model
```

#### Strategy 3: Attention Slicing
```json
{
    "attention_optimization": {
        "enable_attention_slicing": true,
        "slice_size": 1,  # Smaller = less memory, slower
        "enable_memory_efficient_attention": true,
        "use_flash_attention": true  # If available
    }
}
```

### RAM Optimization

#### Memory Pool Management
```python
import torch

class MemoryPool:
    """Efficient memory pool for tensor operations"""
    
    def __init__(self, pool_size_gb=8.0):
        self.pool_size = int(pool_size_gb * 1e9)
        self.pool = torch.empty(self.pool_size // 4, dtype=torch.float32)
        self.allocated = 0
    
    def allocate(self, size):
        """Allocate memory from pool"""
        if self.allocated + size > self.pool_size:
            self.cleanup()
        
        tensor = self.pool[self.allocated:self.allocated + size]
        self.allocated += size
        return tensor
    
    def cleanup(self):
        """Reset pool allocation"""
        self.allocated = 0
        torch.cuda.empty_cache()
```

#### Garbage Collection Optimization
```python
import gc
import threading
import time

class MemoryManager:
    """Automatic memory management"""
    
    def __init__(self, cleanup_interval=60):
        self.cleanup_interval = cleanup_interval
        self.running = True
        self.thread = threading.Thread(target=self._cleanup_loop)
        self.thread.start()
    
    def _cleanup_loop(self):
        """Periodic memory cleanup"""
        while self.running:
            time.sleep(self.cleanup_interval)
            
            # Force garbage collection
            gc.collect()
            
            # Clear GPU cache
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            # Log memory usage
            self.log_memory_usage()
```

## Model Optimization

### Model Sharing and Caching

#### Intelligent Model Sharing
```python
class SharedModelManager:
    """Share models between workflows to reduce memory usage"""
    
    def __init__(self):
        self.shared_models = {}
        self.usage_count = {}
        self.last_used = {}
    
    def get_shared_model(self, model_name, workflow_type):
        """Get shared model instance"""
        # Check if model can be shared between workflows
        if self.can_share_model(model_name, workflow_type):
            if model_name not in self.shared_models:
                self.shared_models[model_name] = self.load_model(model_name)
            
            self.usage_count[model_name] = self.usage_count.get(model_name, 0) + 1
            self.last_used[model_name] = time.time()
            return self.shared_models[model_name]
        
        # Load dedicated model instance
        return self.load_model(model_name)
    
    def can_share_model(self, model_name, workflow_type):
        """Determine if model can be safely shared"""
        sharing_rules = {
            "text_encoder": True,  # Text encoders can be shared
            "vae": True,          # VAEs can be shared
            "unet": False,        # UNets are workflow-specific
            "diffusion": False    # Diffusion models are workflow-specific
        }
        
        model_type = self.get_model_type(model_name)
        return sharing_rules.get(model_type, False)
```

#### Model Preloading Strategy
```python
class PreloadingStrategy:
    """Intelligent model preloading based on usage patterns"""
    
    def __init__(self):
        self.usage_history = {}
        self.preload_threshold = 0.3  # Preload if >30% usage probability
    
    def should_preload(self, model_name, time_of_day, workflow_type):
        """Decide whether to preload model"""
        # Analyze historical usage patterns
        usage_prob = self.calculate_usage_probability(
            model_name, time_of_day, workflow_type
        )
        
        return usage_prob > self.preload_threshold
    
    def preload_models(self):
        """Preload models based on predicted usage"""
        current_time = datetime.now().hour
        
        for model_name in self.get_available_models():
            for workflow_type in self.get_workflow_types():
                if self.should_preload(model_name, current_time, workflow_type):
                    self.preload_model(model_name)
                    break
```

### Model Quantization

#### Dynamic Quantization
```python
class DynamicQuantizer:
    """Dynamic model quantization based on available memory"""
    
    def __init__(self):
        self.quantization_levels = {
            "fp16": {"memory_factor": 1.0, "quality_factor": 1.0},
            "fp8": {"memory_factor": 0.5, "quality_factor": 0.98},
            "int8": {"memory_factor": 0.25, "quality_factor": 0.95}
        }
    
    def select_optimal_precision(self, model_size_gb, available_memory_gb):
        """Select best precision for available memory"""
        for precision, factors in self.quantization_levels.items():
            required_memory = model_size_gb * factors["memory_factor"]
            if required_memory <= available_memory_gb * 0.8:  # 80% threshold
                return precision
        
        return "int8"  # Fallback to most aggressive quantization
    
    def quantize_model(self, model, target_precision):
        """Apply quantization to model"""
        if target_precision == "fp8":
            return self.quantize_fp8(model)
        elif target_precision == "int8":
            return self.quantize_int8(model)
        else:
            return model  # No quantization needed
```

#### Model Compression
```python
class ModelCompressor:
    """Compress models for storage and faster loading"""
    
    def compress_model(self, model_path, compression_level=6):
        """Compress model file"""
        import lzma
        
        with open(model_path, 'rb') as f_in:
            with lzma.open(f"{model_path}.xz", 'wb', preset=compression_level) as f_out:
                f_out.write(f_in.read())
        
        # Verify compression ratio
        original_size = os.path.getsize(model_path)
        compressed_size = os.path.getsize(f"{model_path}.xz")
        ratio = compressed_size / original_size
        
        print(f"Compression ratio: {ratio:.2f} ({original_size/1e9:.1f}GB -> {compressed_size/1e9:.1f}GB)")
        
        return f"{model_path}.xz"
```

## Workflow-Specific Tuning

### HunyuanVideo Optimization

#### Speed-Optimized Configuration
```json
{
    "hunyuan_optimization": {
        "enable_fast_sampling": true,
        "num_inference_steps": 25,  # Reduced from 50
        "guidance_scale": 7.0,      # Slightly reduced
        "enable_cfg_rescale": false,
        "scheduler": "euler_ancestral",  # Faster scheduler
        "enable_attention_slicing": true,
        "attention_slice_size": 2
    }
}
```

#### Quality-Optimized Configuration
```json
{
    "hunyuan_optimization": {
        "enable_fast_sampling": false,
        "num_inference_steps": 75,  # Increased for quality
        "guidance_scale": 8.5,      # Higher guidance
        "enable_cfg_rescale": true,
        "cfg_rescale_multiplier": 0.7,
        "scheduler": "ddim",        # Higher quality scheduler
        "enable_temporal_consistency": true
    }
}
```

### Wan Video Optimization

#### Lightning LoRA Configuration
```python
class WanVideoOptimizer:
    """Optimize Wan Video workflows"""
    
    def enable_lightning_mode(self):
        """Enable 4-step Lightning LoRA generation"""
        config = {
            "use_lightning_lora": True,
            "lightning_steps": 4,
            "lightning_guidance_scale": 5.0,
            "enable_noise_scheduling": True,
            "noise_schedule": "linear"
        }
        return config
    
    def optimize_for_inpainting(self):
        """Optimize for video inpainting tasks"""
        config = {
            "dual_guidance_strength": 0.8,
            "inpaint_strength": 0.7,
            "preserve_structure": True,
            "enable_edge_enhancement": True
        }
        return config
```

### NewBie Image Optimization

#### Anime Generation Optimization
```python
class NewBieOptimizer:
    """Optimize NewBie anime generation"""
    
    def optimize_for_speed(self):
        """Speed-optimized anime generation"""
        return {
            "num_inference_steps": 20,
            "guidance_scale": 7.0,
            "enable_karras_sigmas": True,
            "scheduler": "dpm_solver_multistep",
            "enable_vae_slicing": True
        }
    
    def optimize_for_quality(self):
        """Quality-optimized anime generation"""
        return {
            "num_inference_steps": 50,
            "guidance_scale": 9.0,
            "enable_karras_sigmas": False,
            "scheduler": "ddim",
            "enable_attention_refinement": True,
            "refinement_steps": 10
        }
```

### Qwen Image Optimization

#### Multi-Modal Editing Optimization
```python
class QwenOptimizer:
    """Optimize Qwen image workflows"""
    
    def optimize_relighting(self):
        """Optimize for fast relighting"""
        return {
            "use_lightning_lora": True,
            "lightning_steps": 4,
            "preserve_structure_strength": 0.9,
            "lighting_blend_mode": "soft_light"
        }
    
    def optimize_layered_generation(self):
        """Optimize for layered generation"""
        return {
            "layer_generation_strategy": "sequential",
            "enable_layer_caching": True,
            "compositing_optimization": True,
            "max_concurrent_layers": 2
        }
```

## Batch Processing Optimization

### Intelligent Batching

#### Dynamic Batch Sizing
```python
class DynamicBatcher:
    """Dynamically adjust batch size based on available resources"""
    
    def __init__(self, max_memory_gb=20.0):
        self.max_memory_gb = max_memory_gb
        self.current_batch_size = 1
        self.performance_history = []
    
    def calculate_optimal_batch_size(self, request_type, model_memory_gb):
        """Calculate optimal batch size for current conditions"""
        available_memory = self.max_memory_gb - self.get_current_usage()
        
        # Estimate memory per request
        memory_per_request = self.estimate_memory_usage(request_type, model_memory_gb)
        
        # Calculate maximum possible batch size
        max_batch_size = int(available_memory / memory_per_request)
        
        # Consider performance history
        optimal_batch_size = self.adjust_for_performance(max_batch_size)
        
        return max(1, min(optimal_batch_size, 8))  # Limit to reasonable range
    
    def adjust_for_performance(self, max_batch_size):
        """Adjust batch size based on performance history"""
        if len(self.performance_history) < 5:
            return max_batch_size
        
        # Analyze recent performance
        recent_performance = self.performance_history[-5:]
        avg_throughput = sum(p['throughput'] for p in recent_performance) / len(recent_performance)
        
        # If throughput is decreasing, reduce batch size
        if len(recent_performance) >= 2:
            if recent_performance[-1]['throughput'] < recent_performance[-2]['throughput']:
                return max(1, max_batch_size - 1)
        
        return max_batch_size
```

#### Request Grouping and Scheduling
```python
class RequestScheduler:
    """Intelligent request scheduling for optimal batching"""
    
    def __init__(self):
        self.request_queue = []
        self.processing_queue = []
    
    def add_request(self, request):
        """Add request to queue with priority scoring"""
        priority_score = self.calculate_priority(request)
        self.request_queue.append((priority_score, request))
        self.request_queue.sort(key=lambda x: x[0], reverse=True)
    
    def create_optimal_batch(self, max_batch_size=4):
        """Create optimal batch from queued requests"""
        if not self.request_queue:
            return []
        
        # Group similar requests for efficiency
        batches = self.group_similar_requests(max_batch_size)
        
        # Select best batch
        best_batch = self.select_best_batch(batches)
        
        # Remove selected requests from queue
        for request in best_batch:
            self.request_queue = [(p, r) for p, r in self.request_queue if r != request]
        
        return best_batch
    
    def group_similar_requests(self, max_batch_size):
        """Group requests by similarity for efficient batching"""
        groups = {}
        
        for priority, request in self.request_queue:
            # Create grouping key based on request characteristics
            key = (
                request.workflow_type,
                request.resolution,
                request.quality_level
            )
            
            if key not in groups:
                groups[key] = []
            
            if len(groups[key]) < max_batch_size:
                groups[key].append(request)
        
        return list(groups.values())
```

### Parallel Processing

#### Multi-GPU Support
```python
class MultiGPUProcessor:
    """Distribute workload across multiple GPUs"""
    
    def __init__(self):
        self.gpu_count = torch.cuda.device_count()
        self.gpu_queues = [[] for _ in range(self.gpu_count)]
        self.gpu_utilization = [0.0] * self.gpu_count
    
    def distribute_requests(self, requests):
        """Distribute requests across available GPUs"""
        for request in requests:
            # Select GPU with lowest utilization
            gpu_id = self.select_optimal_gpu(request)
            self.gpu_queues[gpu_id].append(request)
    
    def select_optimal_gpu(self, request):
        """Select best GPU for request"""
        # Consider GPU utilization and memory requirements
        memory_required = self.estimate_memory_requirement(request)
        
        best_gpu = 0
        best_score = float('inf')
        
        for gpu_id in range(self.gpu_count):
            available_memory = self.get_available_memory(gpu_id)
            utilization = self.gpu_utilization[gpu_id]
            
            # Score based on available memory and utilization
            if available_memory >= memory_required:
                score = utilization + (1.0 - available_memory / self.get_total_memory(gpu_id))
                if score < best_score:
                    best_score = score
                    best_gpu = gpu_id
        
        return best_gpu
    
    async def process_parallel(self):
        """Process requests in parallel across GPUs"""
        tasks = []
        
        for gpu_id, queue in enumerate(self.gpu_queues):
            if queue:
                task = asyncio.create_task(
                    self.process_gpu_queue(gpu_id, queue)
                )
                tasks.append(task)
        
        results = await asyncio.gather(*tasks)
        return [result for gpu_results in results for result in gpu_results]
```

## Quality vs Performance Trade-offs

### Performance Profiles

#### Speed-First Profile
```json
{
    "profile_name": "speed_first",
    "target_generation_time": 30,  // seconds
    "acceptable_quality_loss": 0.15,
    "settings": {
        "model_precision": "fp8",
        "num_inference_steps": 15,
        "guidance_scale": 6.0,
        "enable_lightning_lora": true,
        "batch_size": 4,
        "enable_attention_slicing": true,
        "use_fast_scheduler": true
    }
}
```

#### Balanced Profile
```json
{
    "profile_name": "balanced",
    "target_generation_time": 90,  // seconds
    "acceptable_quality_loss": 0.05,
    "settings": {
        "model_precision": "fp16",
        "num_inference_steps": 30,
        "guidance_scale": 7.5,
        "enable_lightning_lora": false,
        "batch_size": 2,
        "enable_attention_slicing": false,
        "use_fast_scheduler": false
    }
}
```

#### Quality-First Profile
```json
{
    "profile_name": "quality_first",
    "target_generation_time": 300,  // seconds
    "acceptable_quality_loss": 0.0,
    "settings": {
        "model_precision": "fp16",
        "num_inference_steps": 75,
        "guidance_scale": 9.0,
        "enable_lightning_lora": false,
        "batch_size": 1,
        "enable_refinement": true,
        "use_high_quality_scheduler": true
    }
}
```

### Adaptive Quality Control

```python
class AdaptiveQualityController:
    """Dynamically adjust quality settings based on performance targets"""
    
    def __init__(self, target_time=120, quality_threshold=0.8):
        self.target_time = target_time
        self.quality_threshold = quality_threshold
        self.performance_history = []
    
    def adjust_settings(self, current_settings, last_generation_time, last_quality_score):
        """Adjust settings to meet performance targets"""
        # Record performance
        self.performance_history.append({
            'time': last_generation_time,
            'quality': last_quality_score,
            'settings': current_settings.copy()
        })
        
        # Determine adjustment direction
        if last_generation_time > self.target_time * 1.2:
            # Too slow, reduce quality for speed
            return self.reduce_quality_for_speed(current_settings)
        elif last_quality_score < self.quality_threshold:
            # Quality too low, increase quality settings
            return self.increase_quality(current_settings)
        elif last_generation_time < self.target_time * 0.8:
            # Fast enough, can increase quality
            return self.increase_quality_if_possible(current_settings)
        
        return current_settings  # No adjustment needed
    
    def reduce_quality_for_speed(self, settings):
        """Reduce quality settings to improve speed"""
        adjustments = [
            ('num_inference_steps', max(15, settings['num_inference_steps'] - 5)),
            ('guidance_scale', max(5.0, settings['guidance_scale'] - 0.5)),
            ('enable_lightning_lora', True),
            ('batch_size', min(4, settings['batch_size'] + 1))
        ]
        
        for key, value in adjustments:
            settings[key] = value
        
        return settings
```

## Monitoring and Profiling

### Real-Time Performance Monitoring

```python
class PerformanceMonitor:
    """Real-time performance monitoring and alerting"""
    
    def __init__(self):
        self.metrics = {
            'generation_times': [],
            'memory_usage': [],
            'gpu_utilization': [],
            'quality_scores': []
        }
        self.alerts = []
    
    def start_monitoring(self):
        """Start real-time monitoring"""
        self.monitoring_thread = threading.Thread(target=self._monitor_loop)
        self.monitoring_thread.daemon = True
        self.monitoring_thread.start()
    
    def _monitor_loop(self):
        """Main monitoring loop"""
        while True:
            # Collect metrics
            metrics = self.collect_current_metrics()
            
            # Update history
            for key, value in metrics.items():
                self.metrics[key].append(value)
                # Keep only recent history
                if len(self.metrics[key]) > 1000:
                    self.metrics[key] = self.metrics[key][-1000:]
            
            # Check for performance issues
            self.check_performance_alerts(metrics)
            
            time.sleep(5)  # Monitor every 5 seconds
    
    def collect_current_metrics(self):
        """Collect current system metrics"""
        metrics = {}
        
        # GPU metrics
        if torch.cuda.is_available():
            metrics['gpu_memory_used'] = torch.cuda.memory_allocated() / 1e9
            metrics['gpu_memory_cached'] = torch.cuda.memory_reserved() / 1e9
            metrics['gpu_utilization'] = self.get_gpu_utilization()
        
        # System metrics
        metrics['ram_usage'] = psutil.virtual_memory().percent
        metrics['cpu_usage'] = psutil.cpu_percent()
        
        return metrics
    
    def generate_performance_report(self):
        """Generate comprehensive performance report"""
        report = {
            'summary': {
                'avg_generation_time': np.mean(self.metrics['generation_times'][-100:]),
                'avg_memory_usage': np.mean(self.metrics['memory_usage'][-100:]),
                'avg_gpu_utilization': np.mean(self.metrics['gpu_utilization'][-100:]),
                'avg_quality_score': np.mean(self.metrics['quality_scores'][-100:])
            },
            'trends': self.analyze_performance_trends(),
            'recommendations': self.generate_optimization_recommendations()
        }
        
        return report
```

### Profiling Tools

#### Generation Profiler
```python
import cProfile
import pstats
from functools import wraps

def profile_generation(func):
    """Decorator to profile generation functions"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        profiler = cProfile.Profile()
        profiler.enable()
        
        try:
            result = func(*args, **kwargs)
        finally:
            profiler.disable()
            
            # Analyze profiling results
            stats = pstats.Stats(profiler)
            stats.sort_stats('cumulative')
            
            # Save profiling report
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            stats.dump_stats(f"profiles/generation_{timestamp}.prof")
            
            # Print top functions
            print("Top 10 functions by cumulative time:")
            stats.print_stats(10)
        
        return result
    
    return wrapper

# Usage
@profile_generation
def generate_video_with_profiling(request):
    return engine.generate_video(request)
```

#### Memory Profiler
```python
from memory_profiler import profile
import tracemalloc

class MemoryProfiler:
    """Detailed memory profiling for optimization"""
    
    def __init__(self):
        self.snapshots = []
    
    def start_profiling(self):
        """Start memory profiling"""
        tracemalloc.start()
        self.snapshots = []
    
    def take_snapshot(self, label):
        """Take memory snapshot"""
        snapshot = tracemalloc.take_snapshot()
        self.snapshots.append((label, snapshot))
    
    def analyze_memory_usage(self):
        """Analyze memory usage patterns"""
        if len(self.snapshots) < 2:
            return
        
        for i in range(1, len(self.snapshots)):
            label1, snapshot1 = self.snapshots[i-1]
            label2, snapshot2 = self.snapshots[i]
            
            # Compare snapshots
            top_stats = snapshot2.compare_to(snapshot1, 'lineno')
            
            print(f"\nMemory changes from {label1} to {label2}:")
            for stat in top_stats[:10]:
                print(stat)
```

### Benchmarking

#### Comprehensive Benchmark Suite
```python
class WorkflowBenchmark:
    """Comprehensive benchmarking for all workflows"""
    
    def __init__(self):
        self.benchmark_results = {}
    
    def run_full_benchmark(self):
        """Run complete benchmark suite"""
        workflows = [
            'hunyuan_t2v', 'hunyuan_i2v',
            'wan_inpaint', 'wan_alpha',
            'newbie_anime', 'qwen_relight',
            'qwen_edit', 'qwen_layered'
        ]
        
        for workflow in workflows:
            print(f"Benchmarking {workflow}...")
            results = self.benchmark_workflow(workflow)
            self.benchmark_results[workflow] = results
        
        # Generate comparison report
        self.generate_benchmark_report()
    
    def benchmark_workflow(self, workflow_name, iterations=5):
        """Benchmark specific workflow"""
        results = {
            'generation_times': [],
            'memory_usage': [],
            'quality_scores': [],
            'gpu_utilization': []
        }
        
        for i in range(iterations):
            # Clear memory before each run
            torch.cuda.empty_cache()
            gc.collect()
            
            # Run generation with monitoring
            start_time = time.time()
            start_memory = torch.cuda.memory_allocated()
            
            result = self.run_workflow_test(workflow_name)
            
            end_time = time.time()
            peak_memory = torch.cuda.max_memory_allocated()
            
            # Record metrics
            results['generation_times'].append(end_time - start_time)
            results['memory_usage'].append(peak_memory / 1e9)
            results['quality_scores'].append(result.quality_score)
            
            # Reset memory stats
            torch.cuda.reset_peak_memory_stats()
        
        # Calculate statistics
        for key in results:
            values = results[key]
            results[key] = {
                'mean': np.mean(values),
                'std': np.std(values),
                'min': np.min(values),
                'max': np.max(values),
                'values': values
            }
        
        return results
```

---

*This performance tuning guide provides comprehensive strategies for optimizing advanced ComfyUI workflows. For implementation details, see the [User Guide](user-guide.md) and [API Reference](api-reference.md).*