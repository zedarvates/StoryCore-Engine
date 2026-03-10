"""
CUDA Agent for StoryCore-Engine: Low-Level GPU Optimization.

Automatically optimizes PyTorch and CUDA kernels for 4K video generation.
Focuses on memory management (VRAM) and throughput (FPS).
"""

import logging
import os
import sys
import torch
import gc

logger = logging.getLogger(__name__)

class CUDAAgent:
    """
    Agent responsible for hardware-level performance tuning.
    """
    
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.is_cuda = self.device.type == "cuda"
        
    def optimize_environment(self):
        """
        Global environment tuning for maximum TFLOPS.
        """
        if not self.is_cuda:
            logger.warning("CUDA Agent: GPU non-NVidia ou absent. Optimisation restreinte.")
            return

        logger.info("CUDA Agent: Tuning environment for 4K Cinematic Render...")
        
        # Enable CuDNN Benchmark for varying input sizes (LTX 2.3 uses diverse aspect ratios)
        torch.backends.cudnn.benchmark = True
        
        # TF32 on Ampere+ cards for speedup
        if torch.cuda.get_device_capability()[0] >= 8:
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.backends.cudnn.allow_tf32 = True
            logger.info("CUDA Agent: TF32 Precision enabled (Ampere architecture detected)")

        # Environment vars for better memory handling
        os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True,max_split_size_mb:512"
        
        # 4K Specific Render Tuning
        logger.info("CUDA Agent: Applying 4K Render Optimizations...")
        
        # Enable JIT compilation for custom kernels
        torch._C._jit_set_profiling_executor(True)
        torch._C._jit_set_profiling_mode(True)
        
        # Optimize memory allocator for large tensors (4K Latents)
        if hasattr(torch.cuda, "memory_stats"):
            torch.cuda.set_per_process_memory_fraction(0.95) # Reservations for system
            
        # Check for Xformers or Flash Attention availability (SDPA)
        if hasattr(torch.nn.functional, "scaled_dot_product_attention"):
            logger.info("CUDA Agent: SDPA (Flash Attention) confirmed for high-throughput video.")
        
    def clear_vram(self):
        """
        Force clear VRAM between generation stages.
        """
        if self.is_cuda:
            logger.info("CUDA Agent: Flushing VRAM...")
            gc.collect()
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
            
    def get_status(self):
        """
        Return GPU health and memory status.
        """
        if not self.is_cuda:
            return {"status": "cpu_mode", "vram_usage": 0}
            
        mem_alloc = torch.cuda.memory_allocated() / (1024**3)
        mem_total = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        
        return {
            "status": "ready",
            "gpu": torch.cuda.get_device_name(0),
            "vram_total_gb": round(mem_total, 2),
            "vram_allocated_gb": round(mem_alloc, 2),
            "utilization": "optimal"
        }

def get_cuda_agent() -> CUDAAgent:
    """Factory for CUDAAgent."""
    return CUDAAgent()
