#!/bin/bash
# ComfyUI Installation Script for StoryCore-Engine - Linux/macOS
# Handles Python virtual environment (PEP 668) and complete automation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INSTALL_DIR="$PROJECT_ROOT/comfyui_portable"
COMFYUI_DIR="$INSTALL_DIR/ComfyUI"
PORT="${1:-8188}"

echo "🎬 StoryCore-Engine ComfyUI Installation (Linux/macOS)"
echo "====================================================="
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
    if command -v unzip >/dev/null 2>&1; then
        unzip -o comfyui-master.zip
        mv ComfyUI-master ComfyUI
        rm comfyui-master.zip
        echo "✅ ComfyUI extracted"
    else
        echo "❌ unzip not found"
        exit 1
    fi
fi

cd "$COMFYUI_DIR"

# Create Python virtual environment (PEP 668 compliance)
echo "🐍 Setting up Python virtual environment..."
if [ ! -d "venv" ]; then
    if command -v python3 >/dev/null 2>&1; then
        python3 -m venv venv
    elif command -v python >/dev/null 2>&1; then
        python -m venv venv
    else
        echo "❌ Python not found"
        exit 1
    fi
    
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
            output_path="models/checkpoints/$filename"
        fi
        
        # Skip if file already exists
        if [ -f "$output_path" ]; then
            echo "✅ $filename already exists, skipping"
            continue
        fi
        
        echo "📥 Downloading $filename..."
        wget -O "$output_path" "$url" || curl -L -o "$output_path" "$url"
        
        if [ -f "$output_path" ]; then
            echo "✅ Downloaded $filename ($(du -h "$output_path" | cut -f1))"
        else
            echo "❌ Failed to download $filename"
        fi
    fi
done < "$SCRIPT_DIR/models_links.txt"
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

# Install ComfyUI Manager as fallback
echo "🔧 Installing ComfyUI Manager (fallback system)..."
if [ ! -d "custom_nodes/ComfyUI-Manager" ]; then
    cd custom_nodes
    if command -v git >/dev/null 2>&1; then
        git clone https://github.com/ltdrdata/ComfyUI-Manager.git
        echo "✅ ComfyUI Manager installed"
    else
        echo "⚠️  Git not found, ComfyUI Manager not installed"
    fi
    cd ..
else
    echo "✅ ComfyUI Manager already installed"
fi

# Install Workflow Models Downloader
echo "📥 Installing Workflow Models Downloader..."
if [ ! -d "custom_nodes/ComfyUI-Workflow-Models-Downloader" ]; then
    cd custom_nodes
    if command -v git >/dev/null 2>&1; then
        git clone https://github.com/slahiri/ComfyUI-Workflow-Models-Downloader.git
        echo "✅ Workflow Models Downloader installed"
    else
        echo "⚠️  Git not found, Workflow Models Downloader not installed"
    fi
    cd ..
else
    echo "✅ Workflow Models Downloader already installed"
fi

echo ""
echo "🔍 Validating model installation..."
if [ -f "tools/comfyui_installer/validate_models.sh" ]; then
    chmod +x tools/comfyui_installer/validate_models.sh
    ./tools/comfyui_installer/validate_models.sh
else
    echo "⚠️  Model validation script not found. Please verify models manually."
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
