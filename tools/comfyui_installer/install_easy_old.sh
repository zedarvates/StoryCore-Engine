#!/bin/bash
# ComfyUI Portable Installation Script for StoryCore-Engine
# Downloads and installs ComfyUI with FLUX.2 models

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INSTALL_DIR="$PROJECT_ROOT/comfyui_portable"
COMFYUI_DIR="$INSTALL_DIR/ComfyUI"
PORT="${1:-8188}"

echo "🎬 StoryCore-Engine ComfyUI Portable Installer"
echo "=============================================="
echo "Project root: $PROJECT_ROOT"
echo "Install directory: $INSTALL_DIR"
echo "Port: $PORT"
echo ""

# Create install directory
echo "📁 Creating installation directory..."
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Download ComfyUI if not exists
if [ -d "ComfyUI" ]; then
    echo "✅ ComfyUI already exists, skipping download"
else
    echo "📥 Downloading ComfyUI..."
    COMFYUI_URL="https://github.com/comfyanonymous/ComfyUI/archive/refs/heads/master.zip"
    
    if command -v wget >/dev/null 2>&1; then
        wget -c "$COMFYUI_URL" -O comfyui-master.zip
    elif command -v curl >/dev/null 2>&1; then
        curl -C - -L "$COMFYUI_URL" -o comfyui-master.zip
    else
        echo "❌ Neither wget nor curl found. Please install one."
        exit 1
    fi
    
    # Check download success
    if [ ! -f "comfyui-master.zip" ]; then
        echo "❌ ComfyUI download failed!"
        exit 1
    fi
    
    echo "📦 Extracting ComfyUI..."
    if command -v unzip >/dev/null 2>&1; then
        unzip -o comfyui-master.zip
        mv ComfyUI-master ComfyUI
        rm comfyui-master.zip
    else
        echo "❌ unzip not found. Please install unzip."
        exit 1
    fi
    
    echo "✅ ComfyUI extracted successfully"
fi

# Verify ComfyUI directory exists
if [ ! -d "$COMFYUI_DIR" ]; then
    echo "❌ ComfyUI directory not found after extraction!"
    exit 1
fi

cd "$COMFYUI_DIR"

# Install Python dependencies
echo "📦 Installing Python dependencies..."
if [ -f "requirements.txt" ]; then
    python3 -m pip install -r requirements.txt --user || python -m pip install -r requirements.txt --user
else
    echo "⚠️  requirements.txt not found"
fi

# Create model directories
echo "📁 Creating model directories..."
mkdir -p models/vae
mkdir -p models/loras
mkdir -p models/diffusion_models
mkdir -p models/text_encoders

# Download FLUX.2 models
echo "📥 Downloading FLUX.2 models (11.4 GB total)..."

# VAE Model (335MB)
echo "Downloading VAE model..."
VAE_URL="https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/vae/flux2-vae.safetensors"
if [ ! -f "models/vae/flux2-vae.safetensors" ]; then
    if command -v wget >/dev/null 2>&1; then
        wget -c "$VAE_URL" -O models/vae/flux2-vae.safetensors
    else
        curl -C - -L "$VAE_URL" -o models/vae/flux2-vae.safetensors
    fi
    
    if [ -f "models/vae/flux2-vae.safetensors" ]; then
        echo "✅ VAE model downloaded"
    else
        echo "❌ VAE model download failed"
        exit 1
    fi
else
    echo "✅ VAE model already exists"
fi

# LoRA Model (100MB)
echo "Downloading LoRA model..."
LORA_URL="https://huggingface.co/ostris/flux2_berthe_morisot/resolve/main/flux2_berthe_morisot.safetensors"
if [ ! -f "models/loras/flux2_berthe_morisot.safetensors" ]; then
    if command -v wget >/dev/null 2>&1; then
        wget -c "$LORA_URL" -O models/loras/flux2_berthe_morisot.safetensors
    else
        curl -C - -L "$LORA_URL" -o models/loras/flux2_berthe_morisot.safetensors
    fi
    
    if [ -f "models/loras/flux2_berthe_morisot.safetensors" ]; then
        echo "✅ LoRA model downloaded"
    else
        echo "❌ LoRA model download failed"
        exit 1
    fi
else
    echo "✅ LoRA model already exists"
fi

# Diffusion Model (3.5GB)
echo "Downloading diffusion model (3.5GB)..."
DIFFUSION_URL="https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/diffusion_models/flux2_dev_fp8mixed.safetensors"
if [ ! -f "models/diffusion_models/flux2_dev_fp8mixed.safetensors" ]; then
    if command -v wget >/dev/null 2>&1; then
        wget -c "$DIFFUSION_URL" -O models/diffusion_models/flux2_dev_fp8mixed.safetensors
    else
        curl -C - -L "$DIFFUSION_URL" -o models/diffusion_models/flux2_dev_fp8mixed.safetensors
    fi
    
    if [ -f "models/diffusion_models/flux2_dev_fp8mixed.safetensors" ]; then
        echo "✅ Diffusion model downloaded"
    else
        echo "❌ Diffusion model download failed"
        exit 1
    fi
else
    echo "✅ Diffusion model already exists"
fi

# Text Encoder (7.2GB)
echo "Downloading text encoder (7.2GB)..."
ENCODER_URL="https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/text_encoders/mistral_3_small_flux2_bf16.safetensors"
if [ ! -f "models/text_encoders/mistral_3_small_flux2_bf16.safetensors" ]; then
    if command -v wget >/dev/null 2>&1; then
        wget -c "$ENCODER_URL" -O models/text_encoders/mistral_3_small_flux2_bf16.safetensors
    else
        curl -C - -L "$ENCODER_URL" -o models/text_encoders/mistral_3_small_flux2_bf16.safetensors
    fi
    
    if [ -f "models/text_encoders/mistral_3_small_flux2_bf16.safetensors" ]; then
        echo "✅ Text encoder downloaded"
    else
        echo "❌ Text encoder download failed"
        exit 1
    fi
else
    echo "✅ Text encoder already exists"
fi

# Copy workflow file
echo "📋 Installing StoryCore-Engine workflow..."
if [ -f "$PROJECT_ROOT/image_flux2 storycore1.json" ]; then
    cp "$PROJECT_ROOT/image_flux2 storycore1.json" ./
    echo "✅ Workflow installed"
else
    echo "⚠️  Workflow file not found in project root"
fi

echo ""
echo "🎉 Installation complete!"
echo "========================================"
echo ""
echo "📍 Installation location: $COMFYUI_DIR"
echo ""
echo "🚀 To launch ComfyUI, run:"
echo "cd $COMFYUI_DIR"
echo "python main.py --listen 0.0.0.0 --port $PORT --enable-cors-header"
echo ""
echo "🌐 ComfyUI will be available at: http://localhost:$PORT"
echo ""
