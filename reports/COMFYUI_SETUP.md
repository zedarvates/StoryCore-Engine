# ComfyUI Setup for StoryCore-Engine

## [CRITICAL] Quick Start - Easy Install

### **Option 1: StoryCore-Engine Easy Install (Recommended)**

The StoryCore-Engine dashboard includes a one-click installer that downloads ComfyUI directly to your project folder:

1. **Open Dashboard**: `storycore-dashboard-demo.html`
2. **Configure Backend**: Click "Configure Backend..." button
3. **Easy Install**: Click "Install ComfyUI Portable (Easy Install)"
4. **Follow Wizard**: Select OS, confirm download (11.4 GB), and wait for completion
5. **Launch**: Use generated commands to start ComfyUI locally

**What the Easy Install does:**
- Downloads ComfyUI ZIP directly to `./comfyui_portable/` (avoids browser interception)
- Downloads all required FLUX.2 models (11.4 GB total) to the correct subdirectories
- Installs StoryCore-Engine workflow automatically
- Generates launch commands with correct CORS settings
- **Total isolation**: Everything stays within your project folder

**Installation Path:**
```
your-project/
├── storycore-dashboard-demo.html
├── tools/comfyui_installer/
└── comfyui_portable/          # ← ComfyUI installed here
    └── ComfyUI/
        ├── main.py
        ├── models/
        │   ├── vae/
        │   ├── diffusion_models/
        │   ├── text_encoders/
        │   └── loras/
        └── image_flux2 storycore1.json
```

**Launch Commands:**
```bash
# Navigate to local installation
cd ./comfyui_portable/ComfyUI

# Launch with CORS enabled
python main.py --listen 0.0.0.0 --port 8188 --enable-cors-header
```

### **Option 2: Manual Installation**

## [CRITICAL] Prerequisites

### **ComfyUI Installation**
```bash
# Clone ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI

# Install dependencies
pip install -r requirements.txt

# Start with CORS enabled (REQUIRED for StoryCore-Engine)
python main.py --enable-cors-header
```

### **[SOURCE OF TRUTH] Required Models**

Download and place these models in the correct directories:

#### **1. Diffusion Model (3.5GB)**
```bash
# Download to: ComfyUI/models/diffusion_models/
wget https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/diffusion_models/flux2_dev_fp8mixed.safetensors
```

#### **2. Text Encoder (7.2GB)**
```bash
# Download to: ComfyUI/models/text_encoders/
wget https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/text_encoders/mistral_3_small_flux2_bf16.safetensors
```

#### **3. VAE (335MB)**
```bash
# Download to: ComfyUI/models/vae/
wget https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/vae/flux2-vae.safetensors
```

#### **4. LoRA - Artistic Style (Optional)**
```bash
# Download to: ComfyUI/models/loras/
wget https://huggingface.co/ostris/flux2_berthe_morisot/resolve/main/flux2_berthe_morisot.safetensors
```

### **Directory Structure Verification**
```
📂 ComfyUI/
├── 📂 models/
│   ├── 📂 diffusion_models/
│   │   └── flux2_dev_fp8mixed.safetensors ✅
│   ├── 📂 text_encoders/
│   │   └── mistral_3_small_flux2_bf16.safetensors ✅
│   ├── 📂 vae/
│   │   └── flux2-vae.safetensors ✅
│   └── 📂 loras/
│       └── flux2_berthe_morisot.safetensors ✅
└── 📂 input/
    └── (StoryCore-Engine will place panel slices here)
```

## [CRITICAL] Workflow Integration

### **1. Load StoryCore-Engine Workflow**
```bash
# Copy the workflow to ComfyUI
cp "image_flux2 storycore1.json" ComfyUI/workflows/

# Or load via ComfyUI web interface:
# 1. Open ComfyUI web interface (http://localhost:8188)
# 2. Click "Load" button
# 3. Select "image_flux2 storycore1.json"
```

### **2. Key Workflow Nodes**

#### **Input Nodes (StoryCore-Engine Controls)**
- **LoadImage (nodes 42, 46)**: Panel slices from Master Coherence Sheet
- **CLIPTextEncode (node 6)**: Dynamic prompts with style anchors
- **RandomNoise (node 25)**: Deterministic seed control
- **Width/Height (nodes 50, 51)**: Resolution control (1248x832)

#### **Output Nodes**
- **SaveImage (node 9)**: Promoted keyframes with quality tracking

### **3. StoryCore-Engine Integration Points**

The workflow expects these inputs from StoryCore-Engine:
```json
{
  "input_image": "panel_slice_001.png",
  "prompt": "{style_anchor}, {shot_description}, highly detailed, cinematic",
  "seed": 42,
  "width": 1280,
  "height": 720
}
```

## [HACKATHON CONSTRAINT] Current Status

### **✅ Implemented**
- Complete FLUX.2 workflow with reference image conditioning
- Model requirements identified and documented
- Integration points mapped to StoryCore-Engine pipeline

### **🔄 In Development**
- Real-time API calls from StoryCore-Engine dashboard
- Automatic model downloading and verification
- Batch processing for multiple panels

## [CRITICAL] Windows Security & Troubleshooting

### **Windows Defender / SmartScreen Issues**

**Common Security Prompts:**
1. **SmartScreen Warning**: "Windows protected your PC"
   - Click "More info" → "Run anyway"
   - This is normal for downloaded scripts

2. **Windows Defender Real-time Protection**
   - May block downloads or quarantine model files
   - Large AI models (3.5GB, 7.2GB) trigger security scans
   - This is expected behavior

3. **UAC (User Account Control)**
   - May request administrator privileges
   - Click "Yes" to allow installation
   - Required for Python package installation

### **Before Running Scripts**

**Security Preparation:**
```cmd
REM 1. Run Command Prompt as Administrator (recommended)
REM Right-click Command Prompt → "Run as administrator"

REM 2. Navigate to project directory
cd C:\path\to\storycore-engine

REM 3. Allow script execution (if needed)
powershell -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser"
```

**Expected Security Warnings:**
- ✅ **Normal**: SmartScreen warnings for .bat files
- ✅ **Normal**: Windows Defender scanning downloaded models
- ✅ **Normal**: UAC prompts for Python installations
- ✅ **Normal**: Firewall prompts for Python/Git network access

### **Troubleshooting Blocked Downloads**

**If Model Downloads Fail:**

1. **Check Windows Defender Quarantine:**
   ```
   Windows Security → Virus & threat protection → Protection history
   Look for quarantined .safetensors files
   Click "Actions" → "Allow on device"
   ```

2. **Add Folder Exception:**
   ```
   Windows Security → Virus & threat protection → Manage settings
   Add exclusion → Folder → Select: C:\path\to\storycore-engine\comfyui_portable
   ```

3. **Temporary Disable Real-time Protection:**
   ```
   Windows Security → Virus & threat protection → Manage settings
   Turn off "Real-time protection" (temporarily)
   Re-run download script
   Turn protection back on
   ```

---

## Model Download Fallback Systems

If the automatic model download encounters issues, StoryCore-Engine provides two robust fallback options:

### Option 1: ComfyUI Manager (Recommended)
ComfyUI Manager V3.39.2 provides automatic model detection and download:

1. **Launch ComfyUI**:
   ```bash
   cd ./comfyui_portable/ComfyUI
   source venv/bin/activate  # Linux/macOS
   python main.py --listen 127.0.0.1 --port 8188 --enable-cors-header
   ```

2. **Access Web Interface**: Open http://127.0.0.1:8188

3. **Use Manager**:
   - Click "Manager" tab
   - Go to "Install Models" section  
   - Search for "FLUX.2" models
   - Install missing models automatically

### Option 2: Workflow Models Downloader
Workflow Models Downloader 1.8.1 detects missing models from workflows:

1. **Launch ComfyUI** (same as above)

2. **Load Workflow**:
   - Click "Load" button
   - Select `image_flux2 storycore1.json`

3. **Download Models**:
   - Find "Download Models from Workflow" node
   - Click "Download Missing Models" button
   - Wait for automatic completion

Both fallback systems are automatically installed by the Easy Install scripts and provide reliable alternatives when the primary download method encounters issues.

### **Manual Installation Fallback**

**If Automatic Scripts Are Blocked:**

1. **Download ComfyUI Manually:**
   ```
   URL: https://github.com/comfyanonymous/ComfyUI/archive/refs/heads/master.zip
   Extract to: .\comfyui_portable\ComfyUI\
   ```

2. **Download Models Manually:**
   - Open `tools\comfyui_installer\models_links.txt`
   - Download each URL to the corresponding folder:
     ```
     models\vae\flux2-vae.safetensors
     models\diffusion_models\flux2_dev_fp8mixed.safetensors
     models\text_encoders\mistral_3_small_flux2_bf16.safetensors
     models\loras\flux2_berthe_morisot.safetensors
     ```

3. **Install Python Dependencies:**
   ```cmd
   cd comfyui_portable\ComfyUI
   python -m pip install -r requirements.txt --user
   ```

### **Network & Firewall Issues**

**Git Clone Failures:**
```cmd
REM If git clone fails, try HTTPS instead of SSH
git config --global url."https://github.com/".insteadOf git@github.com:

REM Or download ZIP manually
curl -L -o ComfyUI.zip https://github.com/comfyanonymous/ComfyUI/archive/refs/heads/master.zip
```

**Download Tool Issues:**
```cmd
REM Install curl if missing
winget install curl

REM Or use PowerShell as fallback
powershell -Command "Invoke-WebRequest -Uri 'URL' -OutFile 'filename'"
```

### **Python Environment Issues**

**Python Not Found:**
```cmd
REM Download from: https://www.python.org/downloads/
REM During installation, check "Add Python to PATH"

REM Verify installation
python --version
pip --version
```

**Visual C++ Build Tools Missing:**
```cmd
REM Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/
REM Required for some Python packages (PyTorch, etc.)
```

### **Performance & Resource Issues**

**Large File Downloads:**
- FLUX.2 models are 3.5GB and 7.2GB each
- Windows Defender scans can take 5-10 minutes per file
- Ensure stable internet connection
- Consider downloading during off-peak hours

**Disk Space Requirements:**
- ComfyUI: ~2GB
- FLUX.2 Models: ~11.4GB
- Python Dependencies: ~3GB
- **Total**: ~16GB free space recommended

## Troubleshooting

### **Common Issues**

#### **CORS Errors**
```bash
# For ComfyUI Desktop:
# Open Settings → Enable CORS header field
# Enter: * (for all origins) or http://localhost:5173 (specific domain)

# For manual ComfyUI installation:
# Ensure ComfyUI is started with CORS enabled
python main.py --enable-cors-header

# Verify CORS headers in browser developer tools
```

#### **Model Loading Errors**
```bash
# Check model file integrity
ls -la models/diffusion_models/flux2_dev_fp8mixed.safetensors

# Verify file sizes match expected values
# flux2_dev_fp8mixed.safetensors: ~3.5GB
# mistral_3_small_flux2_bf16.safetensors: ~7.2GB
# flux2-vae.safetensors: ~335MB
```

#### **Memory Issues**
```bash
# FLUX.2 requires significant VRAM
# Minimum: 12GB VRAM
# Recommended: 16GB+ VRAM

# For lower VRAM, use CPU offloading:
python main.py --enable-cors-header --cpu
```

### **Performance Optimization**
- **GPU**: RTX 4090 or better recommended
- **RAM**: 32GB+ system RAM
- **Storage**: SSD for model loading speed
- **Network**: Stable connection for model downloads

## Integration Testing

### **Manual Test**
1. Start ComfyUI:
   - **ComfyUI Desktop**: Open app → Settings → Enable CORS header: `*`
   - **Manual installation**: `python main.py --enable-cors-header`
2. Load workflow: `image_flux2 storycore1.json`
3. Upload test image to LoadImage node
4. Set prompt: "cinematic portrait, highly detailed"
5. Queue prompt and verify output

### **StoryCore-Engine Test**
1. Open StoryCore-Engine dashboard: `storycore-dashboard-demo.html`
2. Click "Configure Backend..." 
3. Set ComfyUI URL: `http://localhost:8188`
4. Test connection and workflow loading
5. Verify panel promotion pipeline

---

*For issues or questions, refer to the main StoryCore-Engine documentation or ComfyUI community support.*
