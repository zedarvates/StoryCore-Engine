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
    wget -O comfyui.zip "$COMFYUI_URL" || curl -L -o comfyui.zip "$COMFYUI_URL"
    unzip -q comfyui.zip
    mv ComfyUI-master ComfyUI
    rm comfyui.zip
    echo "✅ ComfyUI downloaded and extracted"
fi

cd "$COMFYUI_DIR"

# Create Python virtual environment (PEP 668 compliance)
echo "🐍 Setting up Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment and install dependencies
echo "📦 Installing dependencies in virtual environment..."
source venv/bin/activate
pip install --upgrade pip
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
echo "✅ Dependencies installed"

# Download models from models_links.txt
echo "📥 Downloading required models..."
download_model() {
    local url="$1"
    local filename=$(basename "$url")
    local subdir=""
    
    # Determine subdirectory based on filename
    case "$filename" in
        *vae*) subdir="vae" ;;
        *diffusion*|*flux*) subdir="checkpoints" ;;
        *text*|*mistral*|*clip*) subdir="clip" ;;
        *lora*) subdir="loras" ;;
        *) subdir="checkpoints" ;;
    esac
    
    local target_dir="models/$subdir"
    local target_file="$target_dir/$filename"
    
    mkdir -p "$target_dir"
    
    if [ -f "$target_file" ]; then
        echo "✅ $filename already exists, skipping"
        return 0
    fi
    
    echo "📥 Downloading $filename to $subdir/..."
    wget -O "$target_file" "$url" || curl -L -o "$target_file" "$url"
    
    if [ -f "$target_file" ]; then
        echo "✅ Downloaded $filename ($(du -h "$target_file" | cut -f1))"
    else
        echo "❌ Failed to download $filename"
        return 1
    fi
}

# Parse models_links.txt and download models
if [ -f "$SCRIPT_DIR/models_links.txt" ]; then
    while IFS= read -r line; do
        # Skip comments and empty lines
        [[ "$line" =~ ^#.*$ ]] || [[ -z "$line" ]] && continue
        download_model "$line"
    done < "$SCRIPT_DIR/models_links.txt"
else
    echo "⚠️  models_links.txt not found, skipping model downloads"
fi
    
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

# Install ComfyUI Manager V3.39.2 (fallback system)
echo "🔧 Installing ComfyUI Manager V3.39.2..."
if [ ! -d "custom_nodes/ComfyUI-Manager" ]; then
    mkdir -p custom_nodes
    cd custom_nodes
    git clone https://github.com/ltdrdata/ComfyUI-Manager.git
    cd ComfyUI-Manager
    git checkout v3.39.2 2>/dev/null || echo "Using latest version"
    cd ../..
    echo "✅ ComfyUI Manager installed"
else
    echo "✅ ComfyUI Manager already installed"
fi

# Install Workflow Models Downloader 1.8.1 (automatic model detection)
echo "📥 Installing Workflow Models Downloader 1.8.1..."
if [ ! -d "custom_nodes/ComfyUI-Workflow-Models-Downloader" ]; then
    mkdir -p custom_nodes
    cd custom_nodes
    git clone https://github.com/slahiri/ComfyUI-Workflow-Models-Downloader.git
    cd ComfyUI-Workflow-Models-Downloader
    git checkout v1.8.1 2>/dev/null || echo "Using latest version"
    
    # Install dependencies if requirements.txt exists
    if [ -f "requirements.txt" ]; then
        source ../../venv/bin/activate
        pip install -r requirements.txt
    fi
    cd ../..
    echo "✅ Workflow Models Downloader installed"
else
    echo "✅ Workflow Models Downloader already installed"
fi

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
