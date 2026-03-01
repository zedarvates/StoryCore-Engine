#!/usr/bin/env python3
"""
StoryCore ComfyUI Integration Test
Tests the connection to local ComfyUI and generates a test image
"""

import asyncio
import json
import aiohttp
import sys
from pathlib import Path

# Try multiple ports
PORTS_TO_CHECK = [8188, 8000, 5000, 7860]
COMFYUI_URL = None  # Will be set based on discovery


async def discover_comfyui_ports():
    """Check which ports have ComfyUI running"""
    print("=" * 60)
    print("Discovering ComfyUI Installation")
    print("=" * 60)
    
    async with aiohttp.ClientSession() as session:
        for port in PORTS_TO_CHECK:
            url = f"http://127.0.0.1:{port}"
            try:
                async with session.get(url, timeout=3) as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Found ComfyUI on port {port}!")
                        print(f"   Data: {json.dumps(data, indent=2)[:200]}...")
                        return port
                    else:
                        print(f"   Port {port}: HTTP {response.status}")
            except aiohttp.ClientError as e:
                print(f"   Port {port}: Connection failed")
            except Exception as e:
                print(f"   Port {port}: {e}")
    
    return None


async def test_comfyui_connection(port):
    """Test ComfyUI connection on specific port"""
    global COMFYUI_URL
    COMFYUI_URL = f"http://127.0.0.1:{port}"
    
    print(f"\n{'=' * 60}")
    print(f"Testing ComfyUI on port {port}")
    print("=" * 60)
    
    async with aiohttp.ClientSession() as session:
        # Test HTTP connection
        print(f"🌐 Connecting to ComfyUI at {COMFYUI_URL}...")
        try:
            async with session.get(f"{COMFYUI_URL}/", timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ ComfyUI is accessible!")
                    print(f"   Response: {json.dumps(data, indent=2)[:300]}...")
                else:
                    print(f"❌ ComfyUI returned status: {response.status}")
                    return False
        except Exception as e:
            print(f"❌ Failed to connect to ComfyUI: {e}")
            return False
        
        # Test queue endpoint
        try:
            print("\n📋 Checking queue status...")
            async with session.get(f"{COMFYUI_URL}/queue") as response:
                if response.status == 200:
                    queue_data = await response.json()
                    print(f"✅ Queue accessible")
                    print(f"   Running: {len(queue_data.get('queue_running', []))}")
                    print(f"   Pending: {len(queue_data.get('queue_pending', []))}")
                else:
                    print(f"⚠️ Queue check returned: {response.status}")
        except Exception as e:
            print(f"⚠️ Queue check failed: {e}")
        
        # Test system stats
        try:
            print("\n📊 Checking system stats...")
            async with session.get(f"{COMFYUI_URL}/system_stats") as response:
                if response.status == 200:
                    stats = await response.json()
                    print(f"✅ System stats accessible")
                    print(f"   {json.dumps(stats, indent=2)[:200]}...")
        except Exception as e:
            print(f"⚠️ System stats check failed: {e}")
        
        return True


async def test_storycore_api():
    """Test StoryCore API connection"""
    print("\n" + "=" * 60)
    print("Testing StoryCore API Connection")
    print("=" * 60)
    
    # Try common ports for StoryCore API
    api_ports = [8000, 8080, 3000]
    
    for port in api_ports:
        api_url = f"http://127.0.0.1:{port}"
        try:
            async with aiohttp.ClientSession() as session:
                print(f"🌐 Checking StoryCore API at {api_url}...")
                async with session.get(f"{api_url}/health", timeout=5) as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ StoryCore API is accessible on port {port}!")
                        print(f"   Status: {json.dumps(data, indent=2)}")
                        return port
        except Exception as e:
            print(f"   Port {port}: Not accessible ({type(e).__name__})")
    
    print("⚠️ StoryCore API is not running")
    return None


async def generate_test_image(port):
    """Generate a test image using ComfyUI"""
    if not COMFYUI_URL:
        return None
    
    url = f"http://127.0.0.1:{port}"
    
    print("\n" + "=" * 60)
    print("Generating Test Image")
    print("=" * 60)
    
    # Simple test workflow
    test_workflow = {
        "last_node_id": 9,
        "last_link_id": 9,
        "nodes": [
            {
                "id": 1,
                "type": "CLIPTextEncode",
                "pos": [300, 200],
                "size": {"0": 425.27801513671875, "1": 200.0},
                "inputs": [{"name": "clip", "type": "CLIP", "link": 1}],
                "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [2], "slot_index": 0}],
                "widgets_values": ["A beautiful test image for StoryCore, cinematic lighting, high quality"]
            },
            {
                "id": 2,
                "type": "CLIPTextEncode",
                "pos": [300, 450],
                "size": {"0": 425.27801513671875, "1": 200.0},
                "inputs": [{"name": "clip", "type": "CLIP", "link": 3}],
                "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [4], "slot_index": 0}],
                "widgets_values": ["blurry, low quality, distorted, ugly, watermark"]
            },
            {
                "id": 3,
                "type": "DualCLIPLoader",
                "pos": [800, 200],
                "size": {"0": 315.0, "1": 106.0},
                "outputs": [{"name": "CLIP", "type": "CLIP", "links": [1, 3], "slot_index": 0}],
                "widgets_values": ["t5xxl_fp16.safetensors", "mistral_3_small_flux2_bf16.safetensors", "flux"]
            },
            {
                "id": 4,
                "type": "VAELoader",
                "pos": [1150, 200],
                "size": {"0": 315.0, "1": 60.0},
                "outputs": [{"name": "VAE", "type": "VAE", "links": [5], "slot_index": 0}],
                "widgets_values": ["ae.safetensors"]
            },
            {
                "id": 5,
                "type": "FluxSampler",
                "pos": [300, 700],
                "size": {"0": 400.0, "1": 526.0},
                "inputs": [
                    {"name": "model", "type": "MODEL", "link": 6},
                    {"name": "conditioning", "type": "CONDITIONING", "link": 2},
                    {"name": "neg_conditioning", "type": "CONDITIONING", "link": 4},
                    {"name": "latent_image", "type": "LATENT", "link": 7}
                ],
                "outputs": [{"name": "LATENT", "type": "LATENT", "links": [8], "slot_index": 0}],
                "widgets_values": [20, 4.0, 512, 512, 0.5, 12345]
            },
            {
                "id": 6,
                "type": "UNETLoader",
                "pos": [750, 450],
                "size": {"0": 315.0, "1": 60.0},
                "outputs": [{"name": "MODEL", "type": "MODEL", "links": [6], "slot_index": 0}],
                "widgets_values": ["flux2_dev_fp8mixed.safetensors", "default"]
            },
            {
                "id": 7,
                "type": "EmptyLatentImage",
                "pos": [1150, 350],
                "size": {"0": 315.0, "1": 106.0},
                "outputs": [{"name": "LATENT", "type": "LATENT", "links": [7], "slot_index": 0}],
                "widgets_values": [512, 512, 1]
            },
            {
                "id": 8,
                "type": "VAEDecode",
                "pos": [750, 700],
                "size": {"0": 210.0, "1": 46.0},
                "inputs": [
                    {"name": "samples", "type": "LATENT", "link": 8},
                    {"name": "vae", "type": "VAE", "link": 5}
                ],
                "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [9], "slot_index": 0}]
            },
            {
                "id": 9,
                "type": "SaveImage",
                "pos": [1000, 700],
                "size": {"0": 400.0, "1": 460.0},
                "inputs": [{"name": "images", "type": "IMAGE", "link": 9}],
                "widgets_values": ["StoryCore_Test"]
            }
        ],
        "links": [
            [1, 3, 0, 1, 0, "CLIP"],
            [2, 1, 0, 5, 1, "CONDITIONING"],
            [3, 3, 0, 2, 0, "CLIP"],
            [4, 2, 0, 5, 2, "CONDITIONING"],
            [5, 4, 0, 8, 1, "VAE"],
            [6, 6, 0, 5, 0, "MODEL"],
            [7, 7, 0, 5, 3, "LATENT"],
            [8, 5, 0, 8, 0, "LATENT"],
            [9, 8, 0, 9, 0, "IMAGE"]
        ],
        "groups": [],
        "config": {},
        "version": 0.4
    }
    
    async with aiohttp.ClientSession() as session:
        try:
            print("📤 Queuing test image generation...")
            payload = {
                "prompt": test_workflow,
                "client_id": "storycore_test"
            }
            
            async with session.post(
                f"{url}/prompt",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    prompt_id = result.get("prompt_id")
                    print(f"✅ Prompt queued! ID: {prompt_id}")
                    print(f"📊 Monitor progress at: {url}/history/{prompt_id}")
                    return port
                else:
                    error_text = await response.text()
                    print(f"❌ Failed to queue prompt: {response.status} - {error_text}")
                    return None
                    
        except Exception as e:
            print(f"❌ Error queuing prompt: {e}")
            return None


async def main():
    """Main test function"""
    print("\n" + "=" * 60)
    print("StoryCore ComfyUI Integration Test")
    print("=" * 60)
    
    # Discover ComfyUI port
    comfyui_port = await discover_comfyui_ports()
    
    if comfyui_port:
        # Test connection
        connection_ok = await test_comfyui_connection(comfyui_port)
        
        # Generate test image
        if connection_ok:
            await generate_test_image(comfyui_port)
    else:
        print("\n❌ No ComfyUI installation found!")
        print("\nTo start ComfyUI:")
        print("   1. ComfyUI Desktop: Open the application")
        print("   2. Or manually: python main.py --port 8188")
    
    # Test StoryCore API
    api_port = await test_storycore_api()
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print(f"   ComfyUI: {'✅ Port ' + str(comfyui_port) if comfyui_port else '❌ Not found'}")
    print(f"   StoryCore API: {'✅ Port ' + str(api_port) if api_port else '⚠️ Not running'}")
    print("=" * 60)
    
    return comfyui_port is not None


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)

