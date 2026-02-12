# 🎭 StoryCore Lip Sync Addon

Lip synchronization addon for StoryCore Creative Studio using Wav2Lip and GFPGAN.

## 📁 Structure

```
lip-sync/
├── LipSyncAddon.tsx    # Main React component
├── LipSync.module.css  # Styles
└── index.ts           # Plugin export
```

## 🚀 Installation

### 1. Install Backend Dependencies

```bash
# Install required Python packages
pip install fastapi uvicorn pydantic

# Or from requirements.txt
pip install -r requirements.txt
```

### 2. Install ComfyUI Models

Download required models:

```bash
# Run the downloader script
python scripts/download_comfyui_models.py

# Or manually download:
# Wav2Lip: https://github.com/Rudrabha/Wav2Lip
# - wav2lip_gan.pth → models/wav2lip/
# - wav2lip.pth → models/wav2lip/

# GFPGAN: https://github.com/Tencent/GFPGAN
# - GFPGANv1.4.pth → models/gfpgan/
```

### 3. Configure ComfyUI

1. Install ComfyUI from: https://github.com/comfyanonymous/ComfyUI
2. Install Wav2Lip extension for ComfyUI
3. Place models in correct directories
4. Start ComfyUI on port 8188

### 4. Run Backend API

```bash
# Start lip sync API server
python backend/lip_sync_api.py

# Or integrate with main API
python backend/main_api.py
```

### 5. Run Frontend

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🔧 Usage

### Basic Usage

1. Upload a character face image (PNG/JPG)
2. Upload dialogue audio (WAV/MP3)
3. Select quality preset
4. Click "Generate Lip Sync"
5. Download result

### API Endpoints

```bash
# Start lip sync job
POST /api/v1/lip-sync/execute
{
  "character_image": "base64_or_path",
  "dialogue_audio": "base64_or_path",
  "preset": "default",
  "enhancer": true,
  "nosmooth": false,
  "upsample": true,
  "pads": [0, 10, 0, 0]
}

# Check job status
GET /api/v1/lip-sync/status/{job_id}

# Get available presets
GET /api/v1/lip-sync/presets

# Health check
GET /api/v1/lip-sync/health
```

## 📊 Quality Presets

| Preset | Description | Best For |
|--------|-------------|----------|
| Default | Standard quality with enhancement | Most use cases |
| High Quality | GFPGAN face enhancement | Close-ups |
| Fast | Quick processing without enhancement | Previews |

## 💡 Tips

- Use high-quality face images with clear mouth visible
- Audio should be clean with minimal background noise
- 16kHz audio sample rate works best
- For best quality, use the High Quality preset
- Processing takes ~30 seconds for 10 seconds of video

## 🔧 Integration with Dialogue Wizard

The Lip Sync addon integrates with StoryCore's Dialogue Wizard:

```typescript
import { createDialogueWizard } from '../../wizard/dialogue_wizard';

// Generate dialogue
const wizard = createDialogueWizard();
const scene = wizard.generateDialogueScene({
  sceneConcept: 'Character introduction',
  characters: ['Alice'],
  purpose: 'character_development',
  tone: 'dramatic'
});

// Generate audio via Qwen3 TTS
const audioFile = await generateAudio(scene.dialogueLines);

// Use with Lip Sync
const lipSyncResult = await executeLipSync({
  characterImage: characterFace,
  dialogueAudio: audioFile
});
```

## 📦 Dependencies

### Frontend
- React 18+
- TypeScript
- CSS Modules

### Backend
- Python 3.9+
- FastAPI
- ComfyUI (with Wav2Lip extension)

### Models
- Wav2Lip GAN (~350MB)
- GFPGAN v1.4 (~120MB)
- RealESRGAN x4+ (~64MB)

## 🐛 Troubleshooting

### "Wav2Lip not found"
- Ensure models are in correct directories
- Check ComfyUI is running
- Verify model paths in config

### "Poor lip sync quality"
- Use higher quality input images
- Enable GFPGAN enhancement
- Ensure clear audio without background noise

### "Processing too slow"
- Use Fast preset for previews
- Reduce input video length
- Check GPU memory availability

## 📄 License

MIT License - See LICENSE file for details

