#!/bin/bash
# ComfyUI Installation Script for StoryCore-Engine - WSL Ubuntu
# Handles Python virtual environment (PEP 668) and complete automation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INSTALL_DIR="$PROJECT_ROOT/comfyui_portable"
COMFYUI_DIR="$INSTALL_DIR/ComfyUI"
PORT="${1:-8188}"

echo "🎬 StoryCore-Engine ComfyUI Installation (WSL Ubuntu)"
echo "===================================================="
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
    echo "✅ ComfyUI already exists"
else
    echo "📥 Downloading ComfyUI..."
    COMFYUI_URL="https://github.com/comfyanonymous/ComfyUI/archive/refs/heads/master.zip"
    
    if command -v wget >/dev/null 2>&1; then
        wget -c "$COMFYUI_URL" -O comfyui-master.zip
    elif command -v curl >/dev/null 2>&1; then
        curl -C - -L "$COMFYUI_URL" -o comfyui-master.zip
    else
        echo "❌ Neither wget nor curl found"
        exit 1
    fi
    
    if [ ! -f "comfyui-master.zip" ]; then
        echo "❌ ComfyUI download failed!"
        exit 1
    fi
    
    echo "📦 Extracting ComfyUI..."
    unzip -o comfyui-master.zip
    mv ComfyUI-master ComfyUI
    rm comfyui-master.zip
    echo "✅ ComfyUI extracted"
fi

cd "$COMFYUI_DIR"

# Create Python virtual environment (PEP 668 compliance)
echo "🐍 Setting up Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "❌ Failed to create virtual environment"
        exit 1
    fi
fi

# Activate virtual environment and install dependencies
echo "📦 Installing dependencies in virtual environment..."
source venv/bin/activate

if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    echo "⚠️  requirements.txt not found"
fi

# Create model directories
echo "📁 Creating model directories..."
mkdir -p models/vae
mkdir -p models/loras
mkdir -p models/diffusion_models
mkdir -p models/text_encoders

# Download models from links file
echo "📥 Downloading FLUX.2 models..."
while IFS= read -r url; do
    if [[ "$url" =~ ^https:// ]]; then
        filename=$(basename "$url")
        
        # Determine output path
        if [[ "$filename" == *"vae"* ]]; then
            output_path="models/vae/$filename"
        elif [[ "$filename" == *"morisot"* ]]; then
            output_path="models/loras/$filename"
        elif [[ "$filename" == *"fp8mixed"* ]]; then
            output_path="models/diffusion_models/$filename"
        elif [[ "$filename" == *"mistral"* ]]; then
            output_path="models/text_encoders/$filename"
        else
            continue
        fi
        
        if [ ! -f "$output_path" ]; then
            echo "Downloading $filename..."
            if command -v wget >/dev/null 2>&1; then
                wget -c "$url" -O "$output_path"
            else
                curl -C - -L "$url" -o "$output_path"
            fi
            
            if [ -f "$output_path" ]; then
                echo "✅ $filename downloaded"
            else
                echo "❌ $filename download failed"
            fi
        else
            echo "✅ $filename already exists"
        fi
    fi
done < "$SCRIPT_DIR/models_links.txt"

# Copy workflow file
echo "📋 Installing StoryCore-Engine workflow..."
if [ -f "$PROJECT_ROOT/image_flux2 storycore1.json" ]; then
    cp "$PROJECT_ROOT/image_flux2 storycore1.json" ./
    echo "✅ Workflow installed"
fi

echo ""
echo "🎉 Installation complete!"
echo "========================================"
echo ""
echo "📍 Installation: $COMFYUI_DIR"
echo "🌐 Multimodal Pipe ready for StoryCore-Engine"
echo ""
echo "🚀 To launch ComfyUI:"
echo "cd $COMFYUI_DIR"
echo "source venv/bin/activate"
echo "python main.py --listen 127.0.0.1 --port $PORT --enable-cors-header"
echo ""
echo "🌐 ComfyUI will be available at: http://127.0.0.1:$PORT"
echo ""
