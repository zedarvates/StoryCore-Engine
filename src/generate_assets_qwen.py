#!/usr/bin/env python3
"""
StoryCore Asset Generator - Qwen Image
Uses Qwen Image workflow format (compatible with your models)
"""

import asyncio
import aiohttp
import time
from pathlib import Path

COMFYUI_URL = 'http://127.0.0.1:8000'
OUTPUT_DIR = Path('assets/generated')

ASSETS = [
    ('storycore_logo_horizontal', 'Professional logo for StoryCore text, modern typography, minimal design', 1024, 256),
    ('storycore_logo_square', 'Square app icon with SC monogram, modern minimal style', 512, 512),
    ('storycore_panel_placeholder', 'Storyboard panel placeholder, neutral gray background, grid overlay', 768, 432),
    ('storycore_loading_state', 'Loading spinner icon, clean minimal UI design', 256, 256),
    ('storycore_error_state', 'Warning triangle icon, clean error graphic', 400, 300),
    ('storycore_character_template', 'Character design template, generic figure outline', 512, 768),
    ('storycore_banner_featured', 'Featured banner, dark gradient background, modern style', 1024, 320),
]


def create_qwen_workflow(name, prompt, width, height, seed=None):
    """Create Qwen Image workflow"""
    if seed is None:
        seed = int(time.time()) % 1000000000000
    
    return {
        "1": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": prompt, "clip": ["3", 0]}
        },
        "2": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": "blurry, low quality, distorted, ugly, watermark, text, signature", "clip": ["3", 0]}
        },
        "3": {
            "class_type": "CLIPLoader",
            "inputs": {"clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors", "type": "qwen_image", "device": "default"}
        },
        "4": {
            "class_type": "VAELoader",
            "inputs": {"vae_name": "qwen_image_vae.safetensors"}
        },
        "5": {
            "class_type": "UNETLoader",
            "inputs": {"unet_name": "qwen_image_2512_fp8_e4m3fn.safetensors", "weight_dtype": "default"}
        },
        "6": {
            "class_type": "EmptySD3LatentImage",
            "inputs": {"width": width, "height": height, "batch_size": 1}
        },
        "7": {
            "class_type": "ModelSamplingAuraFlow",
            "inputs": {"shift": 3.1, "model": ["5", 0]}
        },
        "8": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed,
                "steps": 30,
                "cfg": 4,
                "sampler_name": "euler",
                "scheduler": "simple",
                "denoise": 1,
                "model": ["7", 0],
                "positive": ["1", 0],
                "negative": ["2", 0],
                "latent_image": ["6", 0]
            }
        },
        "9": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["8", 0], "vae": ["4", 0]}
        },
        "10": {
            "class_type": "SaveImage",
            "inputs": {"images": ["9", 0], "filename_prefix": f"StoryCore_{name}"}
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
        wf = create_qwen_workflow(name, prompt, w, h)
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
    print('StoryCore Asset Generator - Qwen Image')
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
