import asyncio
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

# Force mock mode BEFORE any other imports to ensure settings picks it up
os.environ["USE_MOCK_COMFYUI"] = "true"

from backend.ltx_service import LTXVideoService, LTXGenerationConfig, LTXAspectRatio

async def test_simple():
    print("Testing LTX Service (Mock Mode)...")
    service = LTXVideoService()
    config = LTXGenerationConfig(prompt="A simple test")
    result = await service.generate_video(config)
    print(f"Result: {result['status']}")
    if result['status'] == 'completed':
        print(f"Path: {result['output_path']}")
    else:
        print(f"Error: {result.get('error')}")

if __name__ == "__main__":
    asyncio.run(test_simple())
