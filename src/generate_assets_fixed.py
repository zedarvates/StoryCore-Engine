#!/usr/bin/env python3
import asyncio
import aiohttp
import time
import json
from pathlib import Path

COMFYUI_URL = 'http://127.0.0.1:8000'
OUTPUT_DIR = Path('assets/generated')

ASSETS = [
    ('storycore_logo_horizontal', 'Professional logo design for StoryCore text', 1024, 256),
    ('storycore_logo_square', 'Square app icon design SC monogram logo', 512, 512),
    ('storycore_panel_placeholder', 'Storyboard panel placeholder neutral gray background', 768, 432),
    ('storycore_loading_state', 'Loading spinner icon clean minimal UI design', 256, 256),
    ('storycore_error_state', 'Error warning icon clean UI design', 400, 300),
    ('storycore_character_template', 'Character outline template front view', 512, 768),
    ('storycore_banner_featured', 'Featured banner dark gradient background', 1200, 400),
]

def create_workflow(name, prompt, width, height):
    seed = int(time.time()) % 10000000
    return {
        '3': {'class_type': 'DualCLIPLoader', 'inputs': {'clip_name1': 'gemma_3_4b_it_bf16.safetensors', 'clip_name2': 'mistral_3_small_flux2_bf16.safetensors', 'type': 'flux'}},
        '4': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'ae.safetensors'}},
        '6': {'class_type': 'UNETLoader', 'inputs': {'unet_name': 'flux2_dev_fp8mixed.safetensors', 'weight_dtype': 'fp8_e4m3fn'}},
        '7': {'class_type': 'EmptyLatentImage', 'inputs': {'width': width, 'height': height, 'batch_size': 1}},
        '1': {'class_type': 'CLIPTextEncode', 'inputs': {'clip': ['3', 0], 'text': prompt}},
        '2': {'class_type': 'CLIPTextEncode', 'inputs': {'clip': ['3', 0], 'text': 'blurry low quality distorted ugly watermark text signature'}},
        '5': {'class_type': 'KSampler', 'inputs': {'model': ['6', 0], 'positive': ['1', 0], 'negative': ['2', 0], 'latent_image': ['7', 0], 'steps': 20, 'cfg': 1.0, 'sampler_name': 'euler_ancestral', 'scheduler': 'normal', 'denoise': 1.0, 'seed': seed}},
        '8': {'class_type': 'VAEDecode', 'inputs': {'samples': ['5', 0], 'vae': ['4', 0]}},
        '9': {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': 'StoryCore_' + name}}
    }

async def queue_prompt(session, workflow):
    payload = {'prompt': workflow, 'client_id': 'storycore_' + str(int(time.time()))}
    async with session.post(COMFYUI_URL + '/prompt', json=payload) as r:
        if r.status == 200:
            return await r.json()
        raise Exception('Queue failed: ' + str(r.status))

async def wait_done(session, prompt_id):
    for _ in range(300):
        await asyncio.sleep(1)
        async with session.get(COMFYUI_URL + '/history/' + prompt_id) as r:
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
    async with session.get(COMFYUI_URL + '/history/' + prompt_id) as r:
        if r.status != 200:
            return False
        h = await r.json()
        if prompt_id in h:
            for n, o in h[prompt_id].get('outputs', {}).items():
                if 'images' in o:
                    img = o['images'][0]
                    p = {'filename': img['filename'], 'type': img['type']}
                    async with session.get(COMFYUI_URL + '/view', params=p) as r:
                        if r.status == 200:
                            path.parent.mkdir(parents=True, exist_ok=True)
                            path.write_bytes(await r.read())
                            return True
    return False

async def generate(session, name, prompt, w, h):
    print('Generating: ' + name + '...')
    try:
        wf = create_workflow(name, prompt, w, h)
        result = await queue_prompt(session, wf)
        pid = result.get('prompt_id')
        print('  Queued: ' + pid)
        await wait_done(session, pid)
        p = OUTPUT_DIR / (name + '.png')
        if await download(session, pid, p):
            print('  Saved: ' + str(p))
            return True
        print('  Download failed')
        return False
    except Exception as e:
        print('  Error: ' + str(e))
        return False

async def main():
    print('=' * 60)
    print('StoryCore ComfyUI Asset Generator')
    print('=' * 60)
    
    async with aiohttp.ClientSession() as session:
        print('')
        print('Checking ComfyUI...')
        r = await session.get(COMFYUI_URL + '/')
        if r.status != 200:
            print('ComfyUI not accessible!')
            return
        print('Connected!')
        
        print('')
        print('Generating ' + str(len(ASSETS)) + ' assets...')
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
            print('  ' + n + ': ' + status)
        print('=' * 60)

asyncio.run(main())
