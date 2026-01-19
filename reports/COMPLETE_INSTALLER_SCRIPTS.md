# Complete ComfyUI Portable Installation Scripts

## 🎯 Fully Functional Scripts Created

### **install_easy.sh (Linux/macOS)**
**Complete installation in one script:**
- ✅ Creates `./comfyui_portable/` directory
- ✅ Downloads ComfyUI ZIP with resume support (wget/curl)
- ✅ Extracts ZIP to correct location
- ✅ Downloads all 4 FLUX.2 models (11.4 GB total)
- ✅ Verifies download success before proceeding
- ✅ Installs Python dependencies
- ✅ Copies StoryCore-Engine workflow
- ✅ Provides exact launch command

### **install_easy.bat (Windows)**
**Complete installation in one script:**
- ✅ Creates `.\comfyui_portable\` directory
- ✅ Downloads ComfyUI ZIP with resume support (curl/PowerShell)
- ✅ Extracts ZIP using PowerShell
- ✅ Downloads all 4 FLUX.2 models (11.4 GB total)
- ✅ Verifies download success before proceeding
- ✅ Installs Python dependencies
- ✅ Copies StoryCore-Engine workflow
- ✅ Provides exact launch command

## 📁 Installation Structure Created

```
storycore-engine/
├── tools/comfyui_installer/
│   ├── install_easy.sh          # Complete Linux/macOS installer
│   ├── install_easy.bat         # Complete Windows installer
│   ├── test_install.sh          # Installation validator
│   ├── windows_troubleshoot.bat # Windows diagnostics
│   ├── installer_manifest.json  # Model specifications
│   └── models_links.txt         # HuggingFace URLs
└── comfyui_portable/            # Created by installer
    └── ComfyUI/
        ├── main.py
        ├── models/
        │   ├── vae/
        │   │   └── flux2-vae.safetensors (335MB)
        │   ├── loras/
        │   │   └── flux2_berthe_morisot.safetensors (100MB)
        │   ├── diffusion_models/
        │   │   └── flux2_dev_fp8mixed.safetensors (3.5GB)
        │   └── text_encoders/
        │       └── mistral_3_small_flux2_bf16.safetensors (7.2GB)
        └── image_flux2 storycore1.json
```

## 🚀 Usage Instructions

### **Linux/macOS:**
```bash
cd storycore-engine
chmod +x tools/comfyui_installer/install_easy.sh
./tools/comfyui_installer/install_easy.sh

# Launch ComfyUI
cd ./comfyui_portable/ComfyUI
python main.py --listen 0.0.0.0 --port 8188 --enable-cors-header
```

### **Windows:**
```cmd
cd storycore-engine
tools\comfyui_installer\install_easy.bat

REM Launch ComfyUI
cd .\comfyui_portable\ComfyUI
python main.py --listen 0.0.0.0 --port 8188 --enable-cors-header
```

## 🔧 Key Features

### **Resume Support:**
- wget/curl with `-c`/`-C` flags for interrupted downloads
- Checks file existence before downloading
- Skips existing files to avoid re-downloading

### **Error Handling:**
- Verifies each download before proceeding
- Clear error messages with exit codes
- Fallback options for different tools

### **Progress Tracking:**
- Clear echo messages for each step
- File size information for large downloads
- Success/failure indicators

### **Model Downloads:**
```bash
# VAE Model (335MB)
wget -c "https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/vae/flux2-vae.safetensors"

# LoRA Model (100MB)  
wget -c "https://huggingface.co/ostris/flux2_berthe_morisot/resolve/main/flux2_berthe_morisot.safetensors"

# Diffusion Model (3.5GB)
wget -c "https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/diffusion_models/flux2_dev_fp8mixed.safetensors"

# Text Encoder (7.2GB)
wget -c "https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/text_encoders/mistral_3_small_flux2_bf16.safetensors"
```

## 📊 Script Output Example

```
🎬 StoryCore-Engine ComfyUI Portable Installer
==============================================
Project root: /home/user/storycore-engine
Install directory: /home/user/storycore-engine/comfyui_portable
Port: 8188

📁 Creating installation directory...
📥 Downloading ComfyUI...
📦 Extracting ComfyUI...
✅ ComfyUI extracted successfully
📦 Installing Python dependencies...
📁 Creating model directories...
📥 Downloading FLUX.2 models (11.4 GB total)...
Downloading VAE model...
✅ VAE model downloaded
Downloading LoRA model...
✅ LoRA model downloaded
Downloading diffusion model (3.5GB)...
✅ Diffusion model downloaded
Downloading text encoder (7.2GB)...
✅ Text encoder downloaded
📋 Installing StoryCore-Engine workflow...
✅ Workflow installed

🎉 Installation complete!
========================================

📍 Installation location: /home/user/storycore-engine/comfyui_portable/ComfyUI

🚀 To launch ComfyUI, run:
cd /home/user/storycore-engine/comfyui_portable/ComfyUI
python main.py --listen 0.0.0.0 --port 8188 --enable-cors-header

🌐 ComfyUI will be available at: http://localhost:8188
```

## 🛡️ Safety Features

### **Download Verification:**
- Checks file existence after each download
- Exits with error code if download fails
- Clear error messages for troubleshooting

### **Resume Support:**
- Interrupted downloads can be resumed
- Existing files are skipped automatically
- No unnecessary re-downloading

### **Path Safety:**
- All operations within project directory
- No system-wide modifications
- Easy cleanup by deleting `comfyui_portable/`

## 🧪 Testing

### **Validation Script:**
```bash
./tools/comfyui_installer/test_install.sh
```

**Tests performed:**
- ComfyUI installation verification
- Model file existence and size validation
- Python environment checking
- Dependency verification
- Launch command generation

---

**Result**: Complete, functional installation scripts that handle the entire ComfyUI + FLUX.2 setup in one command, with proper error handling, resume support, and clear user feedback.
