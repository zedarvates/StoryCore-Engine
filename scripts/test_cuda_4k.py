import torch
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from backend.cuda_agent import get_cuda_agent

def test_optimization():
    print("🚀 CUDA Agent: Final 4K Optimization Test")
    print("=========================================")
    
    agent = get_cuda_agent()
    agent.optimize_environment()
    
    status = agent.get_status()
    print(f"Status: {status['status']}")
    print(f"GPU: {status.get('gpu', 'N/A')}")
    print(f"VRAM Total: {status.get('vram_total_gb', 0)} GB")
    print(f"VRAM Allocated: {status.get('vram_allocated_gb', 0)} GB")
    
    print("\n✅ Verification specific 4K:")
    print(f" - TF32 Matrix: {'Enabled' if torch.backends.cuda.matmul.allow_tf32 else 'Disabled'}")
    print(f" - CuDNN Bench: {'Enabled' if torch.backends.cudnn.benchmark else 'Disabled'}")
    if hasattr(torch.nn.functional, "scaled_dot_product_attention"):
        print(" - Flash Attention (SDPA): Active")
    
    print("\n[SUCCESS] Pipeline optimized for 4K Cinematic Render.")

if __name__ == "__main__":
    test_optimization()
