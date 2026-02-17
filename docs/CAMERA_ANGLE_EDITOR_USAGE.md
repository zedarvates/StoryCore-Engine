# Camera Angle Editor - Usage Guide

## Overview

The Camera Angle Editor is an AI-powered feature that allows you to transform images by generating variations from different camera angles. Upload any image and create multiple perspectives such as front view, side views, isometric, and more.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Interface Guide](#user-interface-guide)
3. [API Documentation](#api-documentation)
4. [Troubleshooting](#troubleshooting)
5. [Best Practices](#best-practices)
6. [FAQ](#faq)

---

## Getting Started

### Prerequisites

Before using the Camera Angle Editor, ensure:

1. **ComfyUI is running** - The feature requires a ComfyUI server for image generation
2. **Required models are installed**:
   - ControlNet Depth model
   - ControlNet Canny model
   - IP-Adapter model
3. **Sufficient GPU memory** - At least 4GB VRAM recommended

### Accessing the Editor

The Camera Angle Editor can be accessed from multiple locations:

#### Method 1: Tools Menu
1. Open the **Tools** menu in the menu bar
2. Select **Camera Angle Editor**
3. The editor modal will open

#### Method 2: Image Hover Button
1. Navigate to any image in:
   - Asset Panel
   - Image Gallery
   - Shot Viewer
2. Hover over the image
3. Click the **"Edit Camera Angle"** button that appears

#### Method 3: Context Menu
1. Right-click on any image
2. Select **"Edit Camera Angle"** from the context menu

---

## User Interface Guide

### Main Components

```
┌─────────────────────────────────────────────────────────────┐
│  Camera Angle Editor                                    [X] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐                                        │
│  │   Source Image  │  [Upload Image] [Clear Image]         │
│  │                 │                                        │
│  └─────────────────┘                                        │
│                                                             │
│  Select Camera Angles                    [Select All]       │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │
│  │ Front  │ │ Left   │ │ Right  │ │ Back   │              │
│  │   ✓    │ │        │ │   ✓    │ │        │              │
│  └────────┘ └────────┘ └────────┘ └────────┘              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │
│  │ Top    │ │Isometric│ │Close-up│ │ Bird's │              │
│  │        │ │   ✓     │ │        │ │  Eye   │              │
│  └────────┘ └────────┘ └────────┘ └────────┘              │
│                                                             │
│  Generation Options                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Preserve Original Style  [===]                       │   │
│  │ Quality: [Standard ▼]                                │   │
│  │ Custom Prompt: [________________________]            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Generated Images (3)                    [Download All]    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │  Front   │ │  Right   │ │Isometric │                   │
│  │  View    │ │  Side    │ │  View    │                   │
│  │  [DL]    │ │  [DL]    │ │  [DL]    │                   │
│  └──────────┘ └──────────┘ └──────────┘                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [Reset]                           [Generate (3)]          │
└─────────────────────────────────────────────────────────────┘
```

### Source Image Section

- **Image Preview**: Shows the currently loaded source image
- **Upload Image**: Click to select an image file from your computer
- **Clear Image**: Remove the current image and start fresh
- **Supported formats**: PNG, JPG, JPEG, WebP
- **Maximum size**: 4096 x 4096 pixels

### Camera Angle Selection

Available camera angle presets:

| Angle | Description | Best For |
|-------|-------------|----------|
| **Front View** | Direct front-facing camera | Character portraits, product shots |
| **Left Side** | Profile from the left | Character profiles, object sides |
| **Right Side** | Profile from the right | Character profiles, object sides |
| **Top View** | Bird's eye view from above | Maps, layouts, objects from above |
| **Bottom View** | Looking up from below | Dramatic angles, architecture |
| **Isometric** | 3D isometric perspective | Technical illustrations, game assets |
| **Close-up** | Zoomed-in detail view | Details, expressions, textures |
| **Wide Shot** | Pulled-back establishing view | Environments, full scenes |
| **Bird's Eye** | High angle looking down | Action shots, scenes |
| **Worm's Eye** | Low angle looking up | Dramatic perspectives |

### Generation Options

#### Preserve Original Style
- **Enabled** (default): Maintains the artistic style of the source image
- **Disabled**: Allows more creative interpretation

#### Quality Settings

| Quality | Speed | Detail | Use Case |
|---------|-------|--------|----------|
| **Draft** | Fast (~5s/angle) | Lower | Quick previews, testing |
| **Standard** | Medium (~10s/angle) | Good | General use |
| **High** | Slow (~20s/angle) | Best | Final outputs, presentations |

#### Custom Prompt
Add additional instructions to guide the AI:
- Example: "cinematic lighting, dramatic shadows"
- Example: "anime style, vibrant colors"
- Example: "photorealistic, studio lighting"

### Results Grid

- **Generated Images**: Shows all generated variations
- **Download Button**: Save individual images (hover to reveal)
- **Download All**: Save all images as a ZIP file
- **Generation Time**: Shows how long each angle took

---

## API Documentation

### Endpoints

#### Start Generation Job

```http
POST /api/camera-angle/generate
Content-Type: application/json
Authorization: Bearer <token>

{
  "image_base64": "data:image/png;base64,...",
  "angle_ids": ["front", "left", "isometric"],
  "preserve_style": true,
  "quality": "standard",
  "seed": null,
  "custom_prompt": null
}
```

**Response:**
```json
{
  "job_id": "job-abc123",
  "status": "pending",
  "message": "Generation job started successfully",
  "estimated_time": 30
}
```

#### Get Job Status

```http
GET /api/camera-angle/jobs/{job_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "job_id": "job-abc123",
  "status": "processing",
  "progress": 50,
  "current_step": "Generating isometric view...",
  "completed_angles": ["front", "left"],
  "remaining_angles": ["isometric"],
  "error": null,
  "created_at": "2026-02-15T10:00:00Z",
  "started_at": "2026-02-15T10:00:05Z",
  "completed_at": null
}
```

#### Get Results

```http
GET /api/camera-angle/results/{job_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "job_id": "job-abc123",
  "status": "completed",
  "results": [
    {
      "id": "result-1",
      "angle_id": "front",
      "original_image_base64": "...",
      "generated_image_base64": "...",
      "prompt_used": "front view, facing camera...",
      "generation_time_seconds": 8.5,
      "metadata": {}
    }
  ],
  "total_generation_time": 25.5
}
```

#### List Available Presets

```http
GET /api/camera-angle/presets
```

**Response:**
```json
{
  "presets": [
    {
      "id": "front",
      "display_name": "Front View",
      "description": "Direct front-facing camera",
      "icon": "Camera"
    }
  ],
  "total": 10
}
```

#### Cancel Job

```http
DELETE /api/camera-angle/jobs/{job_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "job_id": "job-abc123",
  "status": "cancelled",
  "message": "Job cancelled successfully"
}
```

#### Test Connection

```http
GET /api/camera-angle/test-connection
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully connected to ComfyUI",
  "comfyui_url": "http://localhost:8188"
}
```

### Error Responses

```json
{
  "detail": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (access denied)
- `404` - Not Found (job/resource not found)
- `500` - Internal Server Error

---

## Troubleshooting

### Common Issues

#### 1. "ComfyUI server is not responding"

**Cause:** ComfyUI is not running or not accessible.

**Solutions:**
1. Verify ComfyUI is running: `http://localhost:8188`
2. Check the ComfyUI URL in settings
3. Restart ComfyUI server
4. Check firewall settings

#### 2. "Generation failed: Out of memory"

**Cause:** Insufficient GPU memory.

**Solutions:**
1. Use "Draft" quality instead of "High"
2. Generate fewer angles at once
3. Close other GPU-intensive applications
4. Reduce image size before uploading

#### 3. "Image too large"

**Cause:** Image exceeds maximum dimensions.

**Solutions:**
1. Resize image to 4096x4096 or smaller
2. Use image compression tools
3. Crop unnecessary parts of the image

#### 4. "Generation timeout"

**Cause:** Generation took too long.

**Solutions:**
1. Use lower quality setting
2. Check ComfyUI server performance
3. Try with fewer angles
4. Check network connection

#### 5. "Model not found"

**Cause:** Required AI models not installed.

**Solutions:**
1. Install ControlNet models in ComfyUI
2. Install IP-Adapter model
3. Check model paths in ComfyUI settings

### Error Messages Reference

| Error | Meaning | Action |
|-------|---------|--------|
| `INVALID_IMAGE` | Image format not supported | Use PNG, JPG, or WebP |
| `NO_ANGLES_SELECTED` | No angles selected | Select at least one angle |
| `JOB_NOT_FOUND` | Job ID doesn't exist | Check job ID or start new job |
| `GENERATION_FAILED` | AI generation error | Check ComfyUI logs |
| `UNAUTHORIZED` | Not authenticated | Log in and retry |

### Debug Mode

Enable debug logging for more detailed error information:

```typescript
// In browser console
localStorage.setItem('camera-angle-debug', 'true');
```

---

## Best Practices

### Image Preparation

1. **Resolution**: Use images between 512x512 and 2048x2048 for best results
2. **Format**: PNG for images with transparency, JPG for photographs
3. **Content**: Clear subjects with good lighting work best
4. **Background**: Simple backgrounds produce cleaner angle transformations

### Angle Selection

1. **Start simple**: Begin with 2-3 angles to test results
2. **Complementary angles**: Combine front + side views for character studies
3. **Context matters**: Choose angles appropriate for your subject

### Quality Settings

1. **Draft**: Use for quick tests and previews
2. **Standard**: Best balance of speed and quality
3. **High**: Use for final outputs only

### Performance Tips

1. **Batch wisely**: Generate 3-5 angles at a time
2. **Cancel unused**: Cancel jobs you no longer need
3. **Clear history**: Clear old results to free memory
4. **Monitor resources**: Watch GPU memory usage

---

## FAQ

### General Questions

**Q: What types of images work best?**
A: Images with clear subjects, good lighting, and simple backgrounds produce the best results. Character portraits, product photos, and illustrations work particularly well.

**Q: How long does generation take?**
A: Generation time depends on:
- Number of angles selected
- Quality setting
- GPU performance
- Image complexity

Typical times: Draft ~5s/angle, Standard ~10s/angle, High ~20s/angle

**Q: Can I use my own custom angles?**
A: Currently, only predefined presets are supported. Custom angle input is planned for a future release.

**Q: Are generated images saved automatically?**
A: No, generated images are temporary. You must download them to save permanently.

### Technical Questions

**Q: What AI models are used?**
A: The feature uses:
- ControlNet (Depth and Canny) for structure preservation
- IP-Adapter for style transfer
- Stable Diffusion for image generation

**Q: Can I run this without a GPU?**
A: A GPU is strongly recommended. CPU-only generation would be extremely slow.

**Q: What's the maximum image size?**
A: Maximum input size is 4096x4096 pixels. Larger images are automatically resized.

**Q: Is my image data sent to external servers?**
A: No, all processing happens locally on your ComfyUI server. Images are not uploaded to external services.

### Troubleshooting Questions

**Q: Why do my results look different from the original?**
A: Try enabling "Preserve Original Style" or add style hints in the custom prompt.

**Q: Why are some angles better than others?**
A: Some angles are more challenging for AI to generate. Front and side views typically produce the best results.

**Q: Can I cancel a generation in progress?**
A: Yes, click the "Cancel" button or close the modal to stop generation.

---

## Support

For additional support:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review the [API Documentation](#api-documentation)
3. Check ComfyUI logs for detailed error messages
4. Open an issue on the project repository

---

*Document Version: 1.0*
*Last Updated: 2026-02-15*
