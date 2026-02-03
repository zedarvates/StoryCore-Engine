#!/usr/bin/env python3
"""
StoryCore Asset Generator
Connects to ComfyUI Desktop (port 8000) and generates base assets
"""

import asyncio, aiohttp, time, sys
from pathlib import Path

URL = "http://127.0.0.1:8000"
OUT = Path("assets/generated")

ASSETS = [
    ("logo_h", "StoryCore logo horizontal modern", 1024, 256),
    ("logo_s", "StoryCore icon square SC", 512, 512),
    ("panel_ph", "Storyboard panel placeholder gray", 768, 432),
    ("loading", "Loading spinner UI icon", 256, 256),
    ("error", "Warning triangle error icon", 400, 300),
    ("char_tpl", "Character template outline", 512, 768),
    ("banner", "Featured banner dark gradient", 1024, 320),
]

def wf(name, p, w, h, s=None):
    s = s or int(time.time())%1000000000000
    return {
        "1": {"c":"CLIPTextEncode","i":{"text":p,"clip":["3",0]}},
        "2": {"c":"CLIPTextEncode","i":{"text":"blur low watermark","clip":["3",0]}},
        "3": {"c":"CLIPLoader","i":{"clip_name":"qwen_2.5_vl_7b_fp8_scaled.safetensors","type":"qwen_image"}},
        "4": {"c":"VAELoader","i":{"vae_name":"qwen_image_vae.safetensors"}},
        "5": {"c":"UNETLoader","i":{"unet_name":"qwen_image_2512_fp8_e4m3fn.safetensors"}},
        "6": {"c":"EmptySD3LatentImage","i":{"width":w,"height":h,"batch_size":1}},
        "7": {"c":"ModelSamplingAuraFlow","i":{"shift":3.1,"model":["5",0]}},
        "8": {"c":"KSampler","i":{"seed":s,"steps":30,"cfg":4,"sampler_name":"euler","scheduler":"simple","denoise":1,"model":["7",0],"positive":["1",0],"negative":["2",0],"latent_image":["6",0]}},
        "9": {"c":"VAEDecode","i":{"samples":["8",0],"vae":["4",0]}},
        "10":{"c":"SaveImage","i":{"images":["9",0],"filename_prefix":f"SC_{name}"}},
    }

async def q(session):
    try:
        async with session.get(f"{URL}/", timeout=5) as r:
            return r.status==200
    except: return False

async def qq(session,wf):
    async with session.post(f"{URL}/prompt", json={"prompt":wf,"client_id":"sc"}) as r:
        if r.status==200: return (await r.json()).get("prompt_id")
        raise Exception(f"Erreur {r.status}")

async def wait(session,pid):
    for _ in range(120):
        await asyncio.sleep(1)
        async with session.get(f"{URL}/history/{pid}") as r:
            if r.status==200 and pid in (await r.json()):
                return True
    raise Exception("Timeout")

async def dl(session,pid,name):
    async with session.get(f"{URL}/history/{pid}") as r:
        if r.status!=200: return False
        h=await r.json()
        if pid not in h: return False
        for o in h[pid].get("outputs",{}).values():
            if "images" in o:
                for i in o["images"]:
                    p={"filename":i["filename"],"type":i["type"]}
                    if i.get("subfolder"): p["subfolder"]=i["subfolder"]
                    async with session.get(f"{URL}/view", params=p) as r:
                        if r.status==200:
                            OUT.mkdir(parents=True,exist_ok=True)
                            (OUT/f"{name}.png").write_bytes(await r.read())
                            return True
    return False

async def run():
    print("="*50)
    print("StoryCore Asset Generator")
    print("="*50)
    print(f"URL: {URL}")
    
    async with aiohttp.ClientSession() as s:
        if not await q(s):
            print(f"ERREUR: ComfyUI non accessible sur {URL}")
            print("Lancez ComfyUI Desktop d'abord!")
            return
        print("OK: ComfyUI connecte")
        print(f"Generation de {len(ASSETS)} assets...")
        
        for n,p,w,h in ASSETS:
            print(f"  - {n} ({w}x{h})...")
            try:
                pid=await qq(s,wf(n,p,w,h))
                await wait(s,pid)
                if await dl(s,pid,n):
                    print(f"    OK: {OUT}/{n}.png")
                else: print(f"    ERREUR telechargement")
            except Exception as e:
                print(f"    ERREUR: {e}")
            await asyncio.sleep(1)
    print("="*50)
    print("Termine! Assets dans: assets/generated/")
    print("="*50)

asyncio.run(run())
