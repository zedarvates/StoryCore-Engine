#!/bin/bash
# Test script for StoryCore-Engine ComfyUI Installation
# Validates complete installation including virtual environment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INSTALL_DIR="$PROJECT_ROOT/comfyui_portable/ComfyUI"

echo "🧪 StoryCore-Engine ComfyUI Installation Test"
echo "============================================="

# Test 1: Check ComfyUI installation
echo "Test 1: ComfyUI Installation"
if [ -d "$INSTALL_DIR" ]; then
    echo "✅ ComfyUI directory exists"
    if [ -f "$INSTALL_DIR/main.py" ]; then
        echo "✅ main.py found"
    else
        echo "❌ main.py not found"
        exit 1
    fi
else
    echo "❌ ComfyUI not installed at: $INSTALL_DIR"
    echo "Run: ./install_easy.sh"
    exit 1
fi

# Test 2: Check virtual environment
echo ""
echo "Test 2: Virtual Environment"
if [ -d "$INSTALL_DIR/venv" ]; then
    echo "✅ Virtual environment exists"
    if [ -f "$INSTALL_DIR/venv/bin/activate" ]; then
        echo "✅ Virtual environment activation script found"
    else
        echo "❌ Virtual environment activation script not found"
        exit 1
    fi
else
    echo "❌ Virtual environment not found"
    exit 1
fi

# Test 3: Check workflow file
echo ""
echo "Test 3: Workflow File"
if [ -f "$INSTALL_DIR/image_flux2 storycore1.json" ]; then
    echo "✅ StoryCore-Engine workflow installed"
else
    echo "⚠️  Workflow file not found (optional)"
fi

# Test 4: Check model directories
echo ""
echo "Test 4: Model Directories"
for dir in "models/vae" "models/loras" "models/diffusion_models" "models/text_encoders"; do
    if [ -d "$INSTALL_DIR/$dir" ]; then
        echo "✅ $dir exists"
    else
        echo "❌ $dir missing"
        exit 1
    fi
done

# Test 5: Check downloaded models
echo ""
echo "Test 5: Downloaded Models"
models=(
    "models/vae/flux2-vae.safetensors:335"
    "models/loras/flux2_berthe_morisot.safetensors:100"
    "models/diffusion_models/flux2_dev_fp8mixed.safetensors:3584"
    "models/text_encoders/mistral_3_small_flux2_bf16.safetensors:7372"
)

for model_info in "${models[@]}"; do
    IFS=':' read -r model_path expected_mb <<< "$model_info"
    full_path="$INSTALL_DIR/$model_path"
    
    if [ -f "$full_path" ]; then
        # Check file size (approximate)
        if command -v stat >/dev/null 2>&1; then
            actual_size=$(stat -f%z "$full_path" 2>/dev/null || stat -c%s "$full_path" 2>/dev/null || echo "0")
            actual_mb=$((actual_size / 1024 / 1024))
            expected_bytes=$((expected_mb * 1024 * 1024))
            tolerance=$((expected_bytes / 10))  # 10% tolerance
            
            if [ $((actual_size - expected_bytes)) -lt $tolerance ] && [ $((expected_bytes - actual_size)) -lt $tolerance ]; then
                echo "✅ $(basename "$model_path") (${actual_mb}MB)"
            else
                echo "⚠️  $(basename "$model_path") (${actual_mb}MB, expected ~${expected_mb}MB)"
            fi
        else
            echo "✅ $(basename "$model_path") (size check skipped)"
        fi
    else
        echo "❌ $(basename "$model_path") not found"
        echo "    Expected at: $full_path"
    fi
done

# Test 6: Python virtual environment
echo ""
echo "Test 6: Python Virtual Environment"
cd "$INSTALL_DIR"
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    echo "✅ Virtual environment activated"
    
    # Check Python in venv
    if command -v python >/dev/null 2>&1; then
        echo "✅ Python found in venv: $(python --version)"
    else
        echo "❌ Python not found in virtual environment"
        exit 1
    fi
    
    # Check key dependencies
    echo "Checking key dependencies in venv..."
    python -c "import torch; print('✅ PyTorch:', torch.__version__)" 2>/dev/null || echo "⚠️  PyTorch not found"
    python -c "import PIL; print('✅ Pillow:', PIL.__version__)" 2>/dev/null || echo "⚠️  Pillow not found"
    
    deactivate
else
    echo "❌ Virtual environment activation script not found"
    exit 1
fi

echo ""
echo "🎉 Installation test complete!"
echo ""
echo "🚀 To launch ComfyUI:"
echo "cd $INSTALL_DIR"
echo "source venv/bin/activate"
echo "python main.py --listen 127.0.0.1 --port 8188 --enable-cors-header"
echo ""
echo "🌐 ComfyUI will be available at: http://127.0.0.1:8188"
echo "🌐 Multimodal Pipe ready for StoryCore-Engine"
        echo "❌ main.py not found"
        exit 1
    fi
else
    echo "❌ ComfyUI not installed"
    exit 1
fi

# Test 2: Check workflow file
echo ""
echo "Test 2: Workflow File"
if [ -f "$INSTALL_DIR/image_flux2 storycore1.json" ]; then
    echo "✅ StoryCore-Engine workflow installed"
else
    echo "⚠️  Workflow file not found (optional)"
fi

# Test 3: Check model directories
echo ""
echo "Test 3: Model Directories"
for dir in "models/vae" "models/loras" "models/diffusion_models" "models/text_encoders"; do
    if [ -d "$INSTALL_DIR/$dir" ]; then
        echo "✅ $dir exists"
    else
        echo "❌ $dir missing"
        exit 1
    fi
done

# Test 4: Check downloaded models
echo ""
echo "Test 4: Downloaded Models"
models=(
    "models/vae/flux2-vae.safetensors:335"
    "models/loras/flux2_berthe_morisot.safetensors:100"
    "models/diffusion_models/flux2_dev_fp8mixed.safetensors:3584"
    "models/text_encoders/mistral_3_small_flux2_bf16.safetensors:7372"
)

for model_info in "${models[@]}"; do
    IFS=':' read -r model_path expected_mb <<< "$model_info"
    full_path="$INSTALL_DIR/$model_path"
    
    if [ -f "$full_path" ]; then
        # Check file size (approximate)
        if command -v stat >/dev/null 2>&1; then
            actual_size=$(stat -f%z "$full_path" 2>/dev/null || stat -c%s "$full_path" 2>/dev/null || echo "0")
            actual_mb=$((actual_size / 1024 / 1024))
            expected_bytes=$((expected_mb * 1024 * 1024))
            tolerance=$((expected_bytes / 10))  # 10% tolerance
            
            if [ $((actual_size - expected_bytes)) -lt $tolerance ] && [ $((expected_bytes - actual_size)) -lt $tolerance ]; then
                echo "✅ $(basename "$model_path") (${actual_mb}MB)"
            else
                echo "⚠️  $(basename "$model_path") (${actual_mb}MB, expected ~${expected_mb}MB)"
            fi
        else
            echo "✅ $(basename "$model_path") (size check skipped)"
        fi
    else
        echo "❌ $(basename "$model_path") not found"
    fi
done

# Test 5: Python dependencies
echo ""
echo "Test 5: Python Environment"
cd "$INSTALL_DIR"
if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_CMD="python"
else
    echo "❌ Python not found"
    exit 1
fi

echo "✅ Python found: $PYTHON_CMD"

# Check key dependencies
echo "Checking key dependencies..."
$PYTHON_CMD -c "import torch; print('✅ PyTorch:', torch.__version__)" 2>/dev/null || echo "⚠️  PyTorch not found"
$PYTHON_CMD -c "import PIL; print('✅ Pillow:', PIL.__version__)" 2>/dev/null || echo "⚠️  Pillow not found"

echo ""
echo "🎉 Installation test complete!"
echo ""
echo "To launch ComfyUI:"
echo "cd $INSTALL_DIR"
echo "$PYTHON_CMD main.py --listen 0.0.0.0 --port 8188 --enable-cors-header"
