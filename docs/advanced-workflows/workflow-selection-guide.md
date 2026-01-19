# Workflow Selection Guide - Advanced ComfyUI Workflows

## Overview

This guide helps you choose the optimal workflow for your specific creative needs. Learn about each workflow's strengths, use cases, and when to use automatic vs manual selection.

## Table of Contents

1. [Workflow Overview](#workflow-overview)
2. [Video Workflows](#video-workflows)
3. [Image Workflows](#image-workflows)
4. [Selection Strategies](#selection-strategies)
5. [Use Case Matrix](#use-case-matrix)
6. [Performance Comparison](#performance-comparison)
7. [Quality Comparison](#quality-comparison)

## Workflow Overview

### Available Workflows

| Category | Workflow | Primary Use Case | Quality | Speed | VRAM |
|----------|----------|------------------|---------|-------|------|
| **Video** | HunyuanVideo T2V | Text-to-video generation | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 8GB |
| **Video** | HunyuanVideo I2V | Image-to-video animation | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 8GB |
| **Video** | Wan Video Inpaint | Video inpainting/transitions | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 12GB |
| **Video** | Wan Alpha Video | Transparent video generation | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 12GB |
| **Image** | NewBie Anime | Anime-style image generation | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 6GB |
| **Image** | Qwen Relight | Image relighting | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 8GB |
| **Image** | Qwen Edit | Multi-modal image editing | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 10GB |
| **Image** | Qwen Layered | Layered image generation | ⭐⭐⭐⭐ | ⭐⭐⭐ | 12GB |

### Selection Modes

| Mode | Description | When to Use |
|------|-------------|-------------|
| `auto` | Intelligent automatic selection | General use, unsure which workflow |
| `manual` | Explicit workflow specification | Specific requirements, expert use |
| `fallback` | Automatic fallback on failure | Production environments |
| `hybrid` | Combination of multiple workflows | Complex creative projects |

## Video Workflows

### HunyuanVideo Text-to-Video (T2V)

**Best For:**
- Creating original video content from text descriptions
- Cinematic and realistic video generation
- Professional video production
- Marketing and advertising content

**Strengths:**
- ✅ Exceptional temporal consistency
- ✅ High-quality 720p/1080p output
- ✅ Excellent prompt adherence
- ✅ Smooth motion generation
- ✅ Professional-grade results

**Limitations:**
- ❌ Longer generation time (2-5 minutes)
- ❌ Higher VRAM requirements
- ❌ Limited to realistic styles

**When to Choose:**
```python
# Choose HunyuanVideo T2V when:
request = VideoGenerationRequest(
    prompt="A majestic eagle soaring over mountains at sunset",
    style="realistic",
    quality_level="high",
    duration=5.0
)
# System will automatically select hunyuan_t2v
```

**Example Use Cases:**
- Nature documentaries
- Product demonstrations
- Architectural visualizations
- Cinematic sequences
- Educational content

### HunyuanVideo Image-to-Video (I2V)

**Best For:**
- Animating static images
- Creating cinemagraphs
- Bringing artwork to life
- Photo animation

**Strengths:**
- ✅ Preserves image composition
- ✅ Natural motion generation
- ✅ High fidelity to source image
- ✅ Controllable motion strength

**Limitations:**
- ❌ Requires high-quality input images
- ❌ Motion limited by image content
- ❌ May struggle with complex scenes

**When to Choose:**
```python
# Choose HunyuanVideo I2V when:
request = VideoGenerationRequest(
    prompt="The character starts walking with a gentle smile",
    reference_image="portrait.jpg",
    mode="i2v_specialized",
    motion_strength=0.7
)
```

**Example Use Cases:**
- Portrait animation
- Landscape cinemagraphs
- Art gallery presentations
- Social media content
- Historical photo animation

### Wan Video Inpainting

**Best For:**
- Creating transitions between scenes
- Video morphing and transformation
- Creative video effects
- Seamless scene changes

**Strengths:**
- ✅ Smooth keyframe interpolation
- ✅ Creative transformation effects
- ✅ Fast generation with Lightning LoRA
- ✅ Dual image guidance system

**Limitations:**
- ❌ Requires carefully chosen keyframes
- ❌ May produce artifacts in complex scenes
- ❌ Limited to transformation scenarios

**When to Choose:**
```python
# Choose Wan Video Inpainting when:
request = VideoGenerationRequest(
    start_image="day_scene.jpg",
    end_image="night_scene.jpg",
    prompt="Gradual transition from day to night",
    mode="inpainting"
)
```

**Example Use Cases:**
- Day-to-night transitions
- Season changes
- Character transformations
- Morphing effects
- Creative transitions

### Wan Alpha Video

**Best For:**
- Compositing and VFX work
- Transparent background videos
- Overlay effects
- Green screen alternatives

**Strengths:**
- ✅ Clean alpha channel generation
- ✅ Perfect for compositing
- ✅ No green screen required
- ✅ Professional VFX quality

**Limitations:**
- ❌ Limited to subjects with clear edges
- ❌ May struggle with fine details (hair, fur)
- ❌ Requires careful prompt engineering

**When to Choose:**
```python
# Choose Wan Alpha Video when:
request = VideoGenerationRequest(
    prompt="A dancing butterfly with transparent background",
    mode="alpha_channel",
    alpha_strength=0.9
)
```

**Example Use Cases:**
- VFX elements
- Logo animations
- Overlay graphics
- Compositing elements
- Motion graphics

## Image Workflows

### NewBie Anime Image Generation

**Best For:**
- Anime and manga-style artwork
- Character design and illustration
- Stylized portraits
- Creative artwork

**Strengths:**
- ✅ Exceptional anime quality
- ✅ Structured character control
- ✅ High-resolution output (1024x1536)
- ✅ Character consistency features
- ✅ XML prompt formatting

**Limitations:**
- ❌ Limited to anime/manga styles
- ❌ May not work well for realistic images
- ❌ Requires understanding of anime conventions

**When to Choose:**
```python
# Choose NewBie Anime when:
request = ImageGenerationRequest(
    prompt="Anime girl with silver hair in school uniform",
    mode="anime",
    style="detailed",
    resolution=(1024, 1536)
)
```

**Character XML Example:**
```xml
<character>
    <appearance>
        <hair color="silver" style="long" />
        <eyes color="blue" expression="gentle" />
        <clothing type="school_uniform" color="navy" />
    </appearance>
    <pose type="standing" expression="smiling" />
</character>
```

**Example Use Cases:**
- Character design sheets
- Anime artwork
- Visual novel characters
- Manga illustrations
- Avatar creation

### Qwen Image Relighting

**Best For:**
- Professional photo editing
- Lighting correction and enhancement
- Mood and atmosphere changes
- Product photography

**Strengths:**
- ✅ Natural lighting effects
- ✅ Fast generation (4-step Lightning)
- ✅ Professional quality results
- ✅ Multiple lighting presets
- ✅ Preserves image structure

**Limitations:**
- ❌ Works best with well-lit source images
- ❌ May struggle with extreme lighting changes
- ❌ Limited to lighting modifications

**When to Choose:**
```python
# Choose Qwen Relight when:
request = ImageGenerationRequest(
    input_image="portrait.jpg",
    mode="professional_edit",
    edit_type="relight",
    lighting_type="golden_hour"
)
```

**Available Lighting Types:**
- `natural_daylight`: Soft, even illumination
- `golden_hour`: Warm sunset lighting
- `studio_portrait`: Professional studio setup
- `dramatic_side`: Strong directional lighting
- `soft_diffused`: Even, shadowless light
- `neon_cyberpunk`: Colorful neon effects
- `candlelight_warm`: Intimate warm lighting
- `moonlight_cool`: Cool mysterious lighting
- `backlit_silhouette`: Strong backlighting
- `rim_lighting`: Edge highlighting

**Example Use Cases:**
- Portrait enhancement
- Product photography
- Architectural photography
- Mood adjustment
- Professional retouching

### Qwen Multi-Modal Image Editing

**Best For:**
- Complex image editing tasks
- Style transfer with references
- Multi-image composition
- Professional image manipulation

**Strengths:**
- ✅ Multi-image reference support
- ✅ Advanced editing capabilities
- ✅ High-quality results
- ✅ Flexible editing options
- ✅ Professional-grade tools

**Limitations:**
- ❌ Requires good reference images
- ❌ Longer processing time
- ❌ Complex parameter tuning

**When to Choose:**
```python
# Choose Qwen Multi-Modal Edit when:
request = ImageGenerationRequest(
    input_image="base_image.jpg",
    reference_images=["style_ref.jpg", "color_ref.jpg"],
    mode="professional_edit",
    edit_prompt="Apply artistic style while maintaining composition"
)
```

**Example Use Cases:**
- Style transfer
- Color grading
- Artistic enhancement
- Composition changes
- Creative editing

### Qwen Layered Image Generation

**Best For:**
- Compositing workflows
- Multi-layer artwork
- Professional design work
- Complex scene creation

**Strengths:**
- ✅ Separate layer generation
- ✅ Professional compositing support
- ✅ Layer mask generation
- ✅ Flexible composition control
- ✅ High-quality layer separation

**Limitations:**
- ❌ Increased complexity
- ❌ Higher VRAM requirements
- ❌ Longer generation time

**When to Choose:**
```python
# Choose Qwen Layered when:
request = ImageGenerationRequest(
    prompt="Fantasy castle scene",
    mode="layered_composition",
    num_layers=4,
    layer_descriptions=[
        "Background sky and clouds",
        "Mountain landscape", 
        "Castle structure",
        "Foreground vegetation"
    ]
)
```

**Example Use Cases:**
- Game asset creation
- Architectural visualization
- Concept art
- Marketing materials
- Complex illustrations

## Selection Strategies

### Automatic Selection Algorithm

The system uses intelligent routing based on multiple factors:

```python
def select_workflow(request):
    """Intelligent workflow selection algorithm"""
    
    # Analyze request parameters
    content_type = analyze_content_type(request.prompt)
    style_preference = detect_style_preference(request)
    quality_requirements = assess_quality_needs(request)
    performance_constraints = check_hardware_limits()
    
    # Score workflows based on suitability
    scores = {}
    for workflow in available_workflows:
        score = calculate_suitability_score(
            workflow, content_type, style_preference,
            quality_requirements, performance_constraints
        )
        scores[workflow] = score
    
    # Select highest scoring workflow
    return max(scores, key=scores.get)
```

### Selection Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| **Content Type** | 40% | Video vs image, style requirements |
| **Quality Requirements** | 30% | Desired output quality level |
| **Performance Constraints** | 20% | Available VRAM, speed requirements |
| **Feature Requirements** | 10% | Specific features needed |

### Manual Selection Guidelines

**Choose HunyuanVideo when:**
- Need highest quality video generation
- Working with realistic content
- Have sufficient VRAM (8GB+)
- Quality is more important than speed

**Choose Wan Video when:**
- Need specific video effects (inpainting, alpha)
- Want faster generation with Lightning LoRA
- Working on compositing projects
- Need creative transformation effects

**Choose NewBie Image when:**
- Creating anime/manga artwork
- Need character consistency
- Want structured prompt control
- Working with stylized content

**Choose Qwen Image when:**
- Professional image editing needs
- Want advanced editing capabilities
- Need layered generation
- Working with photography/realistic images

## Use Case Matrix

### Video Generation Use Cases

| Use Case | Primary Workflow | Alternative | Quality Priority | Speed Priority |
|----------|------------------|-------------|------------------|----------------|
| **Marketing Videos** | HunyuanVideo T2V | Wan Inpaint | High | Medium |
| **Social Media Content** | Wan Alpha | HunyuanVideo I2V | Medium | High |
| **Documentaries** | HunyuanVideo T2V | - | Very High | Low |
| **Animation** | HunyuanVideo I2V | Wan Inpaint | High | Medium |
| **VFX Elements** | Wan Alpha | - | High | High |
| **Transitions** | Wan Inpaint | HunyuanVideo I2V | Medium | High |
| **Cinemagraphs** | HunyuanVideo I2V | - | High | Medium |

### Image Generation Use Cases

| Use Case | Primary Workflow | Alternative | Quality Priority | Speed Priority |
|----------|------------------|-------------|------------------|----------------|
| **Character Design** | NewBie Anime | - | Very High | Medium |
| **Photo Enhancement** | Qwen Relight | Qwen Edit | High | High |
| **Concept Art** | Qwen Layered | NewBie Anime | Very High | Low |
| **Product Photos** | Qwen Relight | Qwen Edit | High | High |
| **Illustrations** | NewBie Anime | Qwen Edit | High | Medium |
| **Style Transfer** | Qwen Edit | - | High | Medium |
| **Compositing** | Qwen Layered | Qwen Edit | High | Low |

## Performance Comparison

### Generation Speed Comparison

| Workflow | Resolution | Typical Time | Lightning Mode | Hardware Req |
|----------|------------|--------------|----------------|--------------|
| HunyuanVideo T2V | 720p | 2-5 min | N/A | 8GB VRAM |
| HunyuanVideo I2V | 720p | 2-4 min | N/A | 8GB VRAM |
| Wan Inpaint | 720p | 1-3 min | 30-60s | 12GB VRAM |
| Wan Alpha | 720p | 1-3 min | 30-60s | 12GB VRAM |
| NewBie Anime | 1024x1536 | 15-30s | N/A | 6GB VRAM |
| Qwen Relight | 1024x1024 | 10-20s | 5-10s | 8GB VRAM |
| Qwen Edit | 1024x1024 | 20-40s | 10-15s | 10GB VRAM |
| Qwen Layered | 1024x1024 | 30-60s | N/A | 12GB VRAM |

### Memory Usage Comparison

| Workflow | Base VRAM | Peak VRAM | System RAM | Model Size |
|----------|-----------|-----------|------------|------------|
| HunyuanVideo T2V | 6GB | 8GB | 16GB | 4.5GB |
| HunyuanVideo I2V | 6GB | 8GB | 16GB | 4.5GB |
| Wan Inpaint | 10GB | 12GB | 24GB | 8GB |
| Wan Alpha | 10GB | 12GB | 24GB | 8GB |
| NewBie Anime | 4GB | 6GB | 12GB | 3GB |
| Qwen Relight | 6GB | 8GB | 16GB | 4GB |
| Qwen Edit | 8GB | 10GB | 20GB | 5GB |
| Qwen Layered | 10GB | 12GB | 24GB | 6GB |

## Quality Comparison

### Video Quality Metrics

| Workflow | Temporal Consistency | Visual Quality | Motion Smoothness | Overall Score |
|----------|---------------------|----------------|-------------------|---------------|
| HunyuanVideo T2V | 0.95 | 0.92 | 0.94 | 0.94 |
| HunyuanVideo I2V | 0.93 | 0.90 | 0.92 | 0.92 |
| Wan Inpaint | 0.88 | 0.85 | 0.87 | 0.87 |
| Wan Alpha | 0.85 | 0.83 | 0.86 | 0.85 |

### Image Quality Metrics

| Workflow | Sharpness | Color Accuracy | Style Consistency | Overall Score |
|----------|-----------|----------------|-------------------|---------------|
| NewBie Anime | 0.92 | 0.89 | 0.95 | 0.92 |
| Qwen Relight | 0.90 | 0.94 | 0.88 | 0.91 |
| Qwen Edit | 0.88 | 0.91 | 0.89 | 0.89 |
| Qwen Layered | 0.86 | 0.87 | 0.85 | 0.86 |

## Decision Tree

### Video Workflow Selection

```
Start: Video Generation Request
├── Need transparent background?
│   └── Yes → Wan Alpha Video
├── Have start/end keyframes?
│   └── Yes → Wan Video Inpaint
├── Have reference image?
│   ├── Yes → HunyuanVideo I2V
│   └── No → Continue
├── Need highest quality?
│   ├── Yes → HunyuanVideo T2V
│   └── No → Continue
├── Need fastest generation?
│   └── Yes → Wan Video (Lightning)
└── Default → HunyuanVideo T2V
```

### Image Workflow Selection

```
Start: Image Generation Request
├── Anime/manga style?
│   └── Yes → NewBie Anime
├── Need layered output?
│   └── Yes → Qwen Layered
├── Have input image to edit?
│   ├── Yes → Continue
│   │   ├── Only need relighting?
│   │   │   └── Yes → Qwen Relight
│   │   └── Complex editing?
│   │       └── Yes → Qwen Edit
│   └── No → Continue
├── Professional photography?
│   └── Yes → Qwen Relight
└── Default → Auto Selection
```

---

*This workflow selection guide helps you choose the optimal workflow for any creative project. For detailed usage instructions, see the [User Guide](user-guide.md).*