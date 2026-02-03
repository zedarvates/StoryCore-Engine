#!/usr/bin/env python3
"""
StoryCore Base Asset Generator - FLUX 2 Format
Uses proper FLUX 2 nodes
"""

import asyncio
import aiohttp
import time
from pathlib import Path

COMFYUI_URL = 'http://127.0.0.1:8000'
OUTPUT_DIR = Path('assets/generated')

ASSETS = [
    ('storycore_logo_horizontal', 'Professional logo for StoryCore text, modern typography', 1024, 256),
    ('storycore_logo_square', 'Square app icon with SC monogram, modern minimal', 512, 512),
    ('storycore_panel_placeholder', 'Storyboard panel placeholder, neutral gray background', 768, 432),
    ('storycore_loading_state', 'Loading spinner icon, clean minimal UI design', 256, 256),
    ('storycore_error_state', 'Warning triangle icon, clean error graphic', 400, 300),
    ('storycore_character_template', 'Character design template, generic figure outline', 512, 768),
    ('storycore_banner_featured', 'Featured banner, dark gradient background', 1024, 320),
]


def create_flux2_workflow(name, prompt, width, height, seed=None):
    """Create FLUX 2 workflow with correct format"""
    if seed is None:
        seed = int(time.time()) % 1000000000000
    
    return {
        "1": {
            "class_type": "CLIPTextEncode",
            "inputs": {"clip": ["3", 0], "text": prompt}
        },
        "2": {
            "class_type": "CLIPTextEncode",
            "inputs": {"clip": ["3", 0], "text": "blurry, low quality, distorted, ugly, watermark"}
        },
        "3": {
            "class_type": "DualCLIPLoader",
            "inputs": {
                "clip_name1": "mistral_3_small_flux2_bf16.safetensors",
                "clip_name2": "mistral_3_small_flux2_bf16.safetensors",
                "type": "flux"
            }
        },
        "4": {
            "class_type": "VAELoader",
            "inputs": {"vae_name": "ae.safetensors"}
        },
        "5": {
            "class_type": "UNETLoader",
            "inputs": {"unet_name": "flux2_dev_fp8mixed.safetensors", "weight_dtype": "default"}
        },
        "6": {
            "class_type": "EmptyLatentImage",
            "inputs": {"width": width, "height": height, "batch_size": 1}
        },
        "7": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["5", 0],
                "positive": ["1", 0],
                "negative": ["2", 0],
                "latent_image": ["6", 0],
                "steps": 20,
                "cfg": 1.0,
                "sampler_name": "euler_ancestral",
                "scheduler": "normal",
                "denoise": 1.0,
                "seed": seed
            }
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["7", 0], "vae": ["4", 0]}
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {"images": ["8", 0], "filename_prefix": f"StoryCore_{name}"}
        }
    }


async def queue_prompt(session, workflow):
    payload = {'prompt': workflow, 'client_id': f'storycore_{int(time.time())}'}
    async with session.post(f'{COMFYUI_URL}/prompt', json=payload) as r:
        if r.status == 200:
            return await r.json()
        raise Exception(f'Queue failed: {r.status}')


async def wait_done(session, prompt_id):
    for _ in range(300):
        await asyncio.sleep(1)
        async with session.get(f'{COMFYUI_URL}/history/{prompt_id}') as r:
            if r.status == 200:
                h = await r.json()
                if prompt_id in h:
                    s = h[prompt_id].get('status', {})
                    if s.get('completed'):
                        return True
                    if s.get('exception'):
                        raise Exception(s['exception'])
    raise Exception('Timeout')


async def download(session, prompt_id, path):
    async with session.get(f'{COMFYUI_URL}/history/{prompt_id}') as r:
        if r.status != 200:
            return False
        h = await r.json()
        if prompt_id in h:
            for n, o in h[prompt_id].get('outputs', {}).items():
                if 'images' in o:
                    for img in o['images']:
                        p = {'filename': img['filename'], 'type': img['type']}
                        if img.get('subfolder'):
                            p['subfolder'] = img['subfolder']
                        async with session.get(f'{COMFYUI_URL}/view', params=p) as r:
                            if r.status == 200:
                                path.parent.mkdir(parents=True, exist_ok=True)
                                path.write_bytes(await r.read())
                                return True
    return False


async def generate(session, name, prompt, w, h):
    print(f'Generating: {name} ({w}x{h})...')
    try:
        wf = create_flux2_workflow(name, prompt, w, h)
        result = await queue_prompt(session, wf)
        pid = result.get('prompt_id')
        print(f'  Queued: {pid}')
        await wait_done(session, pid)
        p = OUTPUT_DIR / (f'{name}.png')
        if await download(session, pid, p):
            print(f'  Saved: {p}')
            return True
        print('  Download failed')
        return False
    except Exception as e:
        print(f'  Error: {str(e)[:80]}')
        return False


async def main():
    print('=' * 60)
    print('StoryCore Asset Generator - FLUX 2')
    print('=' * 60)
    
    async with aiohttp.ClientSession() as session:
        print('')
        print('Checking ComfyUI...')
        r = await session.get(f'{COMFYUI_URL}/')
        if r.status != 200:
            print('ComfyUI not accessible!')
            return
        print('Connected!')
        
        print('')
        print(f'Generating {len(ASSETS)} assets...')
        results = []
        for name, prompt, w, h in ASSETS:
            ok = await generate(session, name, prompt, w, h)
            results.append((name, ok))
            await asyncio.sleep(2)
        
        print('')
        print('=' * 60)
        print('Summary:')
        for n, ok in results:
            status = 'OK' if ok else 'FAILED'
            print(f'  {n}: {status}')
        print('=' * 60)


asyncio.run(main())
