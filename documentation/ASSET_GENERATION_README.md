# StoryCore Base Asset Generator

This module generates base image assets for StoryCore using local ComfyUI installation.

## Files Created

- `generate_base_assets.py` - Main asset generation script
- `test_comfyui_connection.py` - Connection test utility
- `start_comfyui_port8000.bat` - Windows batch script to start ComfyUI on port 8000

## Usage

### Quick Start (Mock Mode - Placeholders Only)

```bash
python generate_base_assets.py --mock
```

This generates placeholder images without requiring ComfyUI.

### Real Generation with ComfyUI

1. **Start ComfyUI on port 8000 with CORS:**

   ```batch
   start_comfyui_port8000.bat
   ```

   Or manually:
   ```bash
   cd comfyui_portable
   python main.py --port 8000 --listen 0.0.0.0 --cors
   ```

2. **Generate assets:**

   ```bash
   python generate_base_assets.py
   ```

   The script will automatically detect ComfyUI and use it for generation.

### Test Connection

```bash
python test_comfyui_connection.py
```

This script:
- Scans for ComfyUI on common ports (8188, 8000, 5000, 7860)
- Tests StoryCore API connectivity
- Can generate a test image

## Generated Assets

Assets are saved to `assets/generated/` with the following structure:

```
assets/generated/
├── generation_report.json
├── banners/
│   └── storycore_banner_featured.png
├── icons/
│   └── storycore_logo_square.png
├── logos/
│   └── storycore_logo_horizontal.png
├── placeholders/
│   └── storycore_panel_placeholder.png
├── templates/
│   ├── storycore_character_template_male.png
│   ├── storycore_character_template_female.png
│   ├── storycore_environment_landscape.png
│   └── storycore_environment_interior.png
└── ui/
    ├── storycore_loading_state.png
    ├── storycore_error_state.png
    ├── storycore_ui_button_primary.png
    └── storycore_ui_button_secondary.png
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `COMFYUI_URL` | `http://127.0.0.1:8188` | ComfyUI server URL |
| `MOCK_MODE` | `false` | Set to `true` for placeholder generation |

### Asset Definitions

Edit `BASE_ASSETS` list in `generate_base_assets.py` to customize or add new assets.

Example asset definition:
```python
{
    "name": "asset_name",
    "prompt": "Detailed prompt describing the asset",
    "negative_prompt": "What to avoid in generation",
    "width": 512,
    "height": 512,
    "steps": 25,
    "cfg_scale": 4.0,
    "output_subdir": "category"
}
```

## API Integration

The asset generator connects to ComfyUI via its REST API:

- **Queue Prompt:** `POST {COMFYUI_URL}/prompt`
- **Check Status:** `GET {COMFYUI_URL}/history/{prompt_id}`
- **Get Images:** `GET {COMFYUI_URL}/view?filename=...&type=...`

## Troubleshooting

### ComfyUI Not Found

1. Ensure ComfyUI is running
2. Check the port: default is 8188 or 8000
3. Run `python test_comfyui_connection.py` to discover the correct port

### Generation Fails

1. Check ComfyUI logs for errors
2. Ensure required models are installed (flux2_dev_fp8mixed.safetensors)
3. Verify sufficient GPU memory

### CORS Errors

Start ComfyUI with CORS flags:
```bash
python main.py --port 8000 --cors --cors-allow-origins "*"
```

## Requirements

- Python 3.8+
- aiohttp
- PIL (Pillow)
- ComfyUI running locally with FLUX.2 support

## Notes

- In mock mode, placeholder images are generated locally
- Real generation requires ComfyUI with FLUX.2 models
- Generation time varies based on asset complexity and hardware

