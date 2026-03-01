# 🌐 Multi-Node Architecture & Network Setup Guide

Generating high-quality, temporally consistent video using AI requires significant processing power, often exceeding 12GB to 24GB of VRAM. A common and highly recommended approach is to run the **StoryCore Orchestrator** (the brain) on your daily workstation, while offloading the heavy rendering to a **Dedicated GPU Server** (the muscle) on your local network.

This guide explains how to properly connect StoryCore's various components across multiple machines.

---

## Architecture Overview

In a typical two-machine setup:

1. **Macbook / Lightweight PC (Node A)**
   - Runs the StoryCore CLI, UI, Orchestrator, and Addons (`src/end_to_end/orchestrator.py`).
   - Runs the LLM (Ollama) if the CPU/RAM is sufficient, or offloads it to Node B.
   - Manages prompt processing, video logic, timeline, and final FFmpeg assembly.
2. **Heavy GPU Workstation (Node B)**
   - Runs **ComfyUI / ComfyUI Desktop** exclusively.
   - Optionally runs **Ollama** if you want to use large models (e.g., Qwen 14B) running on VRAM.

---

## 🛠 Step 1: Configuring ComfyUI for Network Access (Node B)

By default, ComfyUI binds only to `localhost` (127.0.0.1) for security reasons. To allow the StoryCore Engine (Node A) to send generation commands, you must configure ComfyUI to accept remote connections and bypass CORS restrictions.

### Option A: ComfyUI Standard (Standalone)

You must run ComfyUI with specific flags:

1. Open your terminal on the GPU machine (Node B).
2. Start ComfyUI using the `--listen` flag to bind to all IPs (`0.0.0.0`), and the `--enable-cors-header` flag:
   ```bash
   python main.py --listen 0.0.0.0 --port 8188 --enable-cors-header "*"
   ```
*(Note: Exposing `0.0.0.0` with `*` CORS over a public network is a security risk. Only do this on a trusted local network/VPN).*

### Option B: ComfyUI Desktop

1. Open the ComfyUI Desktop application settings.
2. Under "Developer", ensure the API port is bound securely. Desktop usually runs on port `8000`. You may need to manually modify its internal configuration or use a local reverse-proxy depending on the OS firewall settings.

### Checking the IP of Node B (GPU Server)
- **Windows**: Open cmd and run `ipconfig` (look for "IPv4 Address").
- **Mac/Linux**: Open terminal and run `ifconfig` or `ip a`.
*Example IP:* `192.168.1.50`

---

## 🛠 Step 2: Configuring Ollama for Network Access (Optional, Node B)

If you want the GPU machine to also handle the LLM requests (highly recommended to free up RAM on your main machine):

1. **Windows**: Set a global environment variable `OLLAMA_HOST=0.0.0.0` before starting Ollama.
2. **Mac/Linux**: Edit the systemd service or run:
   ```bash
   OLLAMA_HOST=0.0.0.0 ollama serve
   ```
   *(Ensure port `11434` is open in the firewall).*

---

## 🛠 Step 3: Configuring the StoryCore Engine (Node A)

Now, return to your main workstation (Node A) and update the project's environment variables so it knows where to send the heavy requests.

1. Open the `.env` file at the root of the StoryCore project.
2. Update the network variables using the IP address you found in Step 1.

```ini
# --- COMFYUI GPU RENDER NODE (Node B) ---
COMFYUI_HOST=192.168.1.50
COMFYUI_PORT=8188

# --- OLLAMA AI INFERENCE NODE (Node B or Localhost) ---
OLLAMA_HOST=http://192.168.1.50:11434
```

---

## 🔎 Checking Network Health

StoryCore includes a pre-flight utility to verify your multi-node communication before starting a multi-hour render.

On Node A, run:

```bash
python scripts/startup_check.py --host 192.168.1.50
```

You should see:
```text
[COMFYUI]
✅ ComfyUI (Standard :8188)   Reachable — v0.4.5-beta | Queue: 0 job(s)
✅ ComfyUI models             Required model families detected 

[LLM]
✅ Ollama / LLM               12 model(s) available: qwen2.5:7b...
```

---

## Performance & Transfer Notes

When operating across a network, keep the following in mind:

- **Network Speed**: StoryCore transfers large base64 encoded images and raw media back and forth. A **Gigabit Ethernet connection (1000 Mbps)** is highly recommended. Wi-Fi 5/6 may cause bottlenecks during the final sequence compositing phase.
- **Shared Drive (Advanced)**: For massive projects, you can map a network drive (e.g., `Z:\` or `/mnt/storycore_output`) so both Node A (Orchestrator) and Node B (ComfyUI Custom Nodes) load and save raw `.mp4` / `.png` assets sequentially without HTTP overhead. Currently, StoryCore's `PipelineExecutor` will use the API to request base64 images by default.
