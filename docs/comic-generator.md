# Comic Generator Addon — Documentation

> A StoryCore official addon that generates cohesive comic book pages (**BD / Comics / Webtoon / Manga**) leveraging the project's existing narrative data: characters, locations, objects, and story arcs.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [CLI Usage](#cli-usage)
- [REST API](#rest-api)
- [Visual Styles](#visual-styles)
- [Narrative Memory System](#narrative-memory-system)
- [Image Generation](#image-generation)
- [Export](#export)
- [Frontend Integration](#frontend-integration)
- [Tests](#tests)
- [Roadmap](#roadmap)

---

## Overview

The Comic Generator addon transforms StoryCore's rich narrative data into structured comic book pages. Each page is generated as a sequence of panels with:

- **Visual descriptions** (ready for AI image generation)
- **Dialogue lines** with styled speech bubbles
- **Narrative continuity** maintained via a three-level memory system
- **SVG placeholders** generated immediately (no GPU required)
- **Optional image generation** via a ComfyUI backend

### Key Features

| Feature | Description |
|---------|-------------|
| 🎨 **4 Comic Styles** | Franco-Belge, US Comics, Manga, Webtoon |
| 📖 **Narrative Memory** | 3-level memory: local / arc / global |
| 🔄 **Panel Regeneration** | Regenerate any panel with a new seed |
| 🖼️ **Image Generation** | ComfyUI integration with placeholder fallback |
| 📥 **Export** | JSON and PDF export |
| 🔌 **CLI + REST API** | Full access from terminal or HTTP |
| 🎭 **Character Signatures** | Per-character bubble styles and colors |

---

## Architecture

```
addons/official/comic_generator/
├── addon.json                  ← Addon manifest (metadata, permissions)
├── config.json                 ← Default configuration  
└── src/
    ├── __init__.py
    ├── types.py                ← Core dataclasses and enums
    ├── narrative_adapter.py    ← StoryCore data → panel scripts
    ├── panel_generator.py      ← Image generation (ComfyUI / SVG)
    ├── comic_pipeline.py       ← Orchestration, state, export
    ├── main.py                 ← FastAPI REST router
    └── cli.py                  ← Command-line interface

creative-studio-ui/src/addons/comic-generator/
├── types.ts                    ← TypeScript types
├── comicGeneratorService.ts    ← API client
├── ComicGenerator.tsx          ← Main React UI component
├── ComicGenerator.css          ← Component styles
└── index.ts                    ← Plugin entry point

tests/comics/
└── test_comic_generator.py     ← Comprehensive test suite
```

### Data Flow

```
StoryCore Project Data
  (characters, locations, arcs)
           │
           ▼
    NarrativeAdapter
  (selects active chars/locs,
   determines narrative beat,
   builds panel-by-panel scripts)
           │
           ▼
     ComicPipeline
  (orchestrates generation,
   manages state, rollback)
           │
     ┌─────┴──────┐
     ▼             ▼
PanelGenerator    State Persistence
(ComfyUI / SVG)  (JSON files on disk)
     │
     ▼
  ComicPage
(panels + metadata)
     │
  ┌──┴───┐
  ▼       ▼
JSON     PDF
Export  Export
```

---

## Installation

The addon is included in the official StoryCore distribution. No additional installation steps are required.

Optional Python dependencies for advanced features:

```bash
# For PDF export
pip install fpdf2>=2.7.0

# For ComfyUI image generation
pip install aiohttp>=3.8.0
```

---

## Configuration

Edit `addons/official/comic_generator/config.json`:

```json
{
  "comic_style": "manga",          // Default visual style
  "panels_per_page": 4,            // Default panel count
  "image_width": 768,
  "image_height": 1024,
  "panel_width": 512,
  "panel_height": 512,
  "narrative_memory_depth": 5,     // Pages to keep in local memory
  "auto_generate_images": false,   // Auto-trigger ComfyUI
  "comfyui_endpoint": "http://localhost:8188",
  "llm_model": "auto",
  "motion_effects_enabled": false,
  "tts_enabled": false,
  "export_format": "json",
  "output_dir": "data/assets/comics",
  "seed_base": 42
}
```

---

## CLI Usage

```bash
# Generate the next comic page
python -m addons.official.comic_generator.src.cli generate \
  --project-id my_project \
  --story "Aria confronts Vex in the Neon Wastelands..." \
  --style manga \
  --panels 4

# With character/location data
python -m addons.official.comic_generator.src.cli generate \
  --project-id my_project \
  --story "The battle intensifies..." \
  --characters-file data/characters.json \
  --locations-file data/locations.json \
  --generate-images

# Check current state
python -m addons.official.comic_generator.src.cli status \
  --project-id my_project

# View page history
python -m addons.official.comic_generator.src.cli history \
  --project-id my_project

# Export to PDF
python -m addons.official.comic_generator.src.cli export \
  --project-id my_project \
  --format pdf \
  --output ./my_comic.pdf
```

---

## REST API

Base URL: `/api/addons/comic_generator`

### Endpoints

#### `GET /status`
Health check and addon info.

```json
{
  "addon": "comic_generator",
  "version": "1.0.0",
  "status": "active",
  "supported_styles": ["franco-belge", "comics-us", "manga", "webtoon"]
}
```

#### `GET /state/{project_id}`
Get current comic state for a project.

#### `POST /generate`
Generate the next comic page.

```json
{
  "project_id": "my_project",
  "story_context": "Aria confronts Vex...",
  "characters": [...],
  "locations": [...],
  "objects": [...],
  "style": "manga",
  "generate_images": false,
  "panels_count": 4,
  "narrative_direction": "climax"
}
```

**Response:**
```json
{
  "success": true,
  "page": {
    "id": "page_abc123",
    "chapter_id": "chapter_xyz",
    "page_number": 3,
    "narrative_summary": "Aria and Vex face a moment of climax at The Neon Wastelands.",
    "emotional_tone": "climax",
    "style": "manga",
    "panels": [
      {
        "id": "panel_def456",
        "panel_index": 0,
        "characters": ["Aria", "Vex"],
        "location": "The Neon Wastelands",
        "visual_cue": "establishing wide shot of Aria, Vex...",
        "image_prompt": "establishing wide shot..., manga style...",
        "narrative_beat": "setup",
        "panel_size": "normal",
        "dialogue": [
          {
            "character": "Aria",
            "text": "This ends here.",
            "bubble_shape": "round",
            "bubble_color": "#4A90E2"
          }
        ],
        "generated_image_path": "data/assets/comics/my_project/.../panel_00_def456.svg"
      }
    ]
  }
}
```

#### `POST /regenerate_panel`
Regenerate a single panel with a new seed.

```json
{
  "project_id": "my_project",
  "page_id": "page_abc123",
  "chapter_id": "chapter_xyz",
  "page_number": 3,
  "panel_index": 2,
  "generate_image": false
}
```

#### `GET /history/{project_id}`
Get all generated pages history.

#### `POST /export`
Export comic to JSON or PDF.

```json
{
  "project_id": "my_project",
  "format": "pdf"
}
```

#### `GET /panel_image?image_path=...`
Serve a generated panel image (SVG or PNG).

---

## Visual Styles

### Franco-Belge 🇫🇷
Classic European comic style with regular square panels, vibrant colors, clear ligne claire outlines, and centered dialogue. Best for 4–6 panels per page.

### US Comics 🇺🇸  
Dynamic American superhero style with diagonal panels, bold cross-hatching inks, dramatic close-ups, and splash pages. Best for 3–5 panels.

### Manga 🇯🇵
Japanese comics style featuring variable panel sizes, large emotional panels, screentone textures, and expressive character art. Best for 4–6 panels.

### Webtoon 🇰🇷
Korean webcomic vertical scroll format with full color, breathing space between panels, and mobile-first design. Best for 4–8 panels.

---

## Narrative Memory System

The addon maintains three levels of narrative memory to ensure continuity:

| Level | Depth | Purpose |
|-------|-------|---------|
| **Local** | Current page | Immediate context |
| **Arc** | Last 20 pages | Chapter/arc continuity |
| **Global** | Last 100 pages | Full story continuity |

### Narrative Beats

The system automatically selects the appropriate narrative beat based on story progression:

| Progression | Beat |
|------------|------|
| 0–15% | Setup |
| 15–40% | Tension |
| 40–60% | Revelation |
| 60–80% | Climax |
| 80–100% | Resolution |

### Continuity Checkpoint

After each page generation, a `NarrativeCheckpoint` is saved containing:
- Active character states (emotional/physical state)
- Revealed secrets
- Active conflicts
- Last dramatic event
- Story progress (0.0–1.0)

---

## Image Generation

### ComfyUI Integration

When `generate_images: true` is set, the addon sends generation requests to ComfyUI:

1. Builds a KSampler workflow with the panel's image prompt and negative prompt
2. Polls for completion (max 60 seconds)
3. Downloads and saves the generated image

**Setup:** Ensure ComfyUI is running at `http://localhost:8188` with a compatible checkpoint model.

### SVG Placeholder Fallback

When ComfyUI is unavailable or `generate_images: false`, the addon generates rich SVG placeholders that display:
- Panel number and position
- Character names
- Location
- Visual description
- Narrative beat
- Dialogue lines
- Comic style information

These placeholders are immediately useful for storyboarding and script review.

### Seed Consistency

Each panel uses a deterministic seed (`seed_base + panel_index * 100`) for character visual consistency across multiple regenerations. Increase the seed to get variation.

---

## Export

### JSON Export
Exports all comic data in a structured JSON format suitable for further processing or custom rendering.

### PDF Export  
Generates a printable PDF with text-based panel scripts (requires `fpdf2`). Panel images are referenced but not embedded in this version.

---

## Frontend Integration

Add the `ComicGenerator` component to any page or dashboard section:

```tsx
import ComicGenerator from '@/addons/comic-generator/ComicGenerator';

// Basic usage
<ComicGenerator
  projectId={currentProject.id}
  storyContext={currentStoryArc.summary}
  characters={project.characters}
  locations={project.locations}
  objects={project.objects}
  onPageGenerated={(page) => {
    console.log('New page generated:', page.id);
  }}
/>
```

### Plugin API

```typescript
import comicGeneratorPlugin from '@/addons/comic-generator';

// Initialize
await comicGeneratorPlugin.initialize({ projectId: 'my_project' });

// Generate a page
const page = await comicGeneratorPlugin.generatePage({
  projectId: 'my_project',
  storyContext: 'The confrontation begins...',
  style: 'manga',
  panelsCount: 4,
});

// Export
const outputPath = await comicGeneratorPlugin.exportComic('my_project', 'pdf');
```

---

## Tests

```bash
# Run all comic generator tests
python -m pytest tests/comics/test_comic_generator.py -v

# Run specific test class
python -m pytest tests/comics/ -k "TestComicPipeline" -v

# Run with coverage
python -m pytest tests/comics/ --cov=addons.official.comic_generator --cov-report=term-missing
```

---

## Roadmap

| Feature | Status |
|---------|--------|
| Core pipeline (script + SVG) | ✅ Done |
| ComfyUI integration | ✅ Done |
| PDF export | ✅ Done |
| JSON export | ✅ Done |  
| CLI | ✅ Done |
| REST API | ✅ Done |
| React UI | ✅ Done |
| LLM-generated dialogue | 🔜 Planned |
| Motion effects (CSS/CSS animations) | 🔜 Planned |
| TTS voice-over integration | 🔜 Planned |
| Motion comics (video export) | 🔜 Planned |
| Character LoRA consistency | 🔜 Planned |
| Automated panel layout AI | 🔜 Planned |
| Multi-language dialogue | 🔜 Planned |
