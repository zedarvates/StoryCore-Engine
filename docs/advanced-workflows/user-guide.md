# User Guide - Advanced ComfyUI Workflows

## Overview

This comprehensive user guide walks you through using the advanced ComfyUI workflows in StoryCore-Engine. Whether you're creating professional videos, anime artwork, or editing images, this guide covers everything you need to know.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Video Generation](#video-generation)
3. [Image Generation](#image-generation)
4. [Advanced Features](#advanced-features)
5. [Quality Control](#quality-control)
6. [Performance Optimization](#performance-optimization)
7. [Best Practices](#best-practices)

## Getting Started

### Prerequisites

Before using advanced workflows, ensure you have:

- ✅ StoryCore-Engine installed and configured
- ✅ NVIDIA GPU with 16GB+ VRAM (24GB recommended)
- ✅ 32GB+ system RAM (64GB recommended)
- ✅ 100GB+ free storage space
- ✅ High-speed internet for model downloads

### Initial Setup

1. **Enable Advanced Workflows**
   ```bash
   python storycore.py config --enable-advanced-workflows
   ```

2. **Download Required Models**
   ```bash
   python storycore.py models --download-advanced --all
   ```

3. **Verify Installation**
   ```bash
   python storycore.py test --advanced-workflows
   ```

### First Generation

Let's create your first enhanced video:

```bash
python storycore.py video --mode enhanced \
    --prompt "A serene lake at sunset with gentle ripples" \
    --duration 5 --quality balanced
```

This command will:
- Automatically select the best video workflow
- Generate a 5-second video at 720p
- Apply quality monitoring and optimization
- Save results with detailed metadata

## Video Generation

### HunyuanVideo Workflows

HunyuanVideo 1.5 provides state-of-the-art video generation capabilities.

#### Text-to-Video Generation

**Basic Usage:**
```bash
python storycore.py video --workflow hunyuan_t2v \
    --prompt "A majestic eagle soaring over snow-capped mountains" \
    --duration 6 --resolution 720p
```

**Advanced Options:**
```bash
python storycore.py video --workflow hunyuan_t2v \
    --prompt "A bustling Tokyo street at night with neon lights" \
    --duration 8 \
    --resolution 1080p \
    --fps 30 \
    --guidance-scale 8.0 \
    --steps 50 \
    --enable-upscaling
```

**Python API:**
```python
from src.enhanced_video_engine import EnhancedVideoEngine
from src.enhanced_video_engine import VideoGenerationRequest

engine = EnhancedVideoEngine(config)
request = VideoGenerationRequest(
    prompt="A peaceful forest with sunlight filtering through trees",
    mode="high_quality",
    duration=7.0,
    resolution=(1080, 1920),
    fps=24,
    enable_upscaling=True
)

result = engine.generate_video(request)
print(f"Video saved to: {result.video_path}")
print(f"Quality score: {result.quality_metrics.overall_score}")
```

#### Image-to-Video Generation

Transform static images into dynamic videos:

**CLI Usage:**
```bash
python storycore.py video --workflow hunyuan_i2v \
    --input-image "path/to/image.jpg" \
    --prompt "The character starts walking forward with a gentle smile" \
    --duration 5 \
    --motion-strength 0.7
```

**Python API:**
```python
result = engine.generate_video(VideoGenerationRequest(
    prompt="The ocean waves gently crash against the shore",
    mode="i2v_specialized",
    reference_image="beach_scene.jpg",
    duration=6.0,
    motion_strength=0.8,
    preserve_structure=True
))
```

### Wan Video Workflows

Wan Video 2.2 offers advanced features like inpainting and alpha channels.

#### Video Inpainting

Create smooth transitions between keyframes:

**CLI Usage:**
```bash
python storycore.py video --workflow wan_inpaint \
    --start-image "frame_001.jpg" \
    --end-image "frame_120.jpg" \
    --prompt "Smooth transformation from day to night" \
    --duration 4 \
    --noise-level high
```

**Python API:**
```python
from src.wan_video_integration import WanVideoIntegration

wan_integration = WanVideoIntegration(config)
result = wan_integration.inpaint_video(
    start_image="sunset_start.jpg",
    end_image="night_end.jpg",
    prompt="Gradual transition from sunset to starry night",
    noise_level="high",
    use_lightning=True  # 4-step generation
)
```

#### Alpha Channel Videos

Generate videos with transparent backgrounds for compositing:

**CLI Usage:**
```bash
python storycore.py video --workflow wan_alpha \
    --prompt "A dancing butterfly with transparent background" \
    --duration 3 \
    --alpha-strength 0.9
```

**Python API:**
```python
result = wan_integration.generate_alpha_video(
    prompt="A floating magical orb with glowing particles",
    alpha_strength=0.85,
    edge_refinement=True
)
```

### Video Quality Levels

Choose the appropriate quality level for your needs:

| Quality Level | Resolution | Steps | Time | Use Case |
|---------------|------------|-------|------|----------|
| `draft` | 512p | 20 | ~30s | Quick previews |
| `balanced` | 720p | 35 | ~90s | General use |
| `high` | 720p | 50 | ~150s | Professional work |
| `ultra` | 1080p | 50 | ~300s | Maximum quality |

## Image Generation

### NewBie Image Workflows

Specialized for high-quality anime-style image generation.

#### Basic Anime Generation

**CLI Usage:**
```bash
python storycore.py image --workflow newbie_anime \
    --prompt "Anime girl with silver hair and blue eyes in school uniform" \
    --style detailed \
    --quality high
```

**Python API:**
```python
from src.enhanced_image_engine import EnhancedImageEngine
from src.enhanced_image_engine import ImageGenerationRequest

engine = EnhancedImageEngine(config)
result = engine.generate_image(ImageGenerationRequest(
    prompt="Anime warrior with flowing red cape in fantasy landscape",
    mode="anime",
    resolution=(1024, 1536),
    style="detailed",
    quality_level="high"
))
```

#### Structured Character Prompts

Use XML format for precise character control:

```xml
<character>
    <appearance>
        <hair color="silver" style="long" texture="silky" />
        <eyes color="emerald" shape="large" expression="gentle" />
        <skin tone="fair" texture="smooth" />
        <clothing type="kimono" color="deep_blue" pattern="cherry_blossoms" />
    </appearance>
    <pose type="sitting" position="seiza" expression="serene" />
    <accessories>
        <item type="hair_ornament" style="traditional" />
        <item type="earrings" style="pearl" />
    </accessories>
</character>
```

**Usage:**
```python
from src.newbie_image_integration import NewBieImageIntegration

newbie = NewBieImageIntegration(config)
result = newbie.generate_anime_image(
    character_prompt=xml_character_definition,
    scene_prompt="Traditional Japanese garden with koi pond and bamboo",
    style="detailed",
    quality_level="ultra"
)
```

#### Character Consistency

Maintain character consistency across multiple images:

```python
# Generate character reference
character_data = newbie.parse_character_xml(xml_definition)
character_id = newbie.save_character(character_data, "main_character")

# Generate multiple scenes with same character
scenes = [
    "Standing in a flower field",
    "Sitting by a window reading",
    "Walking in the rain with umbrella"
]

results = []
for scene in scenes:
    result = newbie.generate_with_character(
        character_id=character_id,
        scene_prompt=scene,
        maintain_consistency=True
    )
    results.append(result)
```

### Qwen Image Suite Workflows

Professional image editing and manipulation capabilities.

#### Image Relighting

Transform lighting conditions in existing images:

**CLI Usage:**
```bash
python storycore.py image --workflow qwen_relight \
    --input-image "portrait.jpg" \
    --lighting "golden_hour" \
    --intensity 1.2
```

**Available Lighting Types:**
- `natural_daylight`: Soft, even natural lighting
- `golden_hour`: Warm, directional sunset lighting
- `studio_portrait`: Professional studio setup
- `dramatic_side`: Strong side lighting with shadows
- `soft_diffused`: Even, shadowless illumination
- `neon_cyberpunk`: Colorful neon lighting effects
- `candlelight_warm`: Intimate, warm candlelight
- `moonlight_cool`: Cool, mysterious moonlight
- `backlit_silhouette`: Strong backlighting
- `rim_lighting`: Edge highlighting effects

**Python API:**
```python
from src.qwen_image_suite_integration import QwenImageSuiteIntegration

qwen = QwenImageSuiteIntegration(config)
result = qwen.relight_image(
    image_path="original_portrait.jpg",
    lighting_prompt="Soft golden hour lighting from the left side",
    lighting_type="golden_hour",
    intensity=1.1,
    preserve_shadows=True
)
```

#### Multi-Modal Image Editing

Edit images using multiple reference images and text guidance:

**CLI Usage:**
```bash
python storycore.py image --workflow qwen_edit \
    --input-image "base_image.jpg" \
    --reference-images "style_ref.jpg,color_ref.jpg" \
    --edit-prompt "Change the style to match the reference while keeping the composition" \
    --model-version 2511
```

**Python API:**
```python
result = qwen.edit_image_multimodal(
    image_path="landscape.jpg",
    reference_images=["style_reference.jpg", "color_palette.jpg"],
    edit_prompt="Apply the artistic style and color palette from references",
    model_version="2511",
    edit_strength=0.8,
    preserve_composition=True
)
```

#### Layered Image Generation

Generate images with separate layers for advanced compositing:

**CLI Usage:**
```bash
python storycore.py image --workflow qwen_layered \
    --prompt "Fantasy castle on a mountain" \
    --num-layers 4 \
    --layer-descriptions "background_sky,mountains,castle,foreground_trees"
```

**Python API:**
```python
result = qwen.generate_layered_image(
    prompt="Magical forest scene with fairy lights",
    num_layers=3,
    layer_descriptions=[
        "Background forest and trees",
        "Magical fairy lights and particles", 
        "Foreground flowers and grass"
    ],
    compositing_mode="overlay"
)

# Access individual layers
for i, layer_path in enumerate(result.layers):
    print(f"Layer {i+1}: {layer_path}")
    
# Use composite result
composite_image = result.composite_image
```

### Image Quality Levels

| Quality Level | Resolution | Steps | Time | Use Case |
|---------------|------------|-------|------|----------|
| `draft` | 512x512 | 10 | ~5s | Quick concepts |
| `standard` | 1024x1024 | 20 | ~15s | General use |
| `high` | 1024x1536 | 35 | ~30s | Professional work |
| `ultra` | 2048x2048 | 50 | ~60s | Maximum detail |

## Advanced Features

### Intelligent Workflow Selection

The system automatically selects the best workflow based on your requirements:

```python
# Automatic selection based on prompt analysis
result = engine.generate_video(VideoGenerationRequest(
    prompt="Anime character walking through cherry blossoms",
    mode="auto"  # Will select appropriate anime-capable workflow
))

# Manual workflow specification
result = engine.generate_video(VideoGenerationRequest(
    prompt="Realistic ocean waves",
    mode="high_quality",
    workflow_preference="hunyuan_t2v"
))
```

### Batch Processing

Process multiple requests efficiently:

**CLI Batch Processing:**
```bash
# Create batch configuration
cat > batch_config.json << EOF
{
    "requests": [
        {
            "type": "video",
            "prompt": "Sunset over mountains",
            "duration": 5,
            "quality": "high"
        },
        {
            "type": "image", 
            "prompt": "Anime girl with blue hair",
            "mode": "anime",
            "quality": "ultra"
        }
    ],
    "output_directory": "batch_results",
    "parallel_processing": true,
    "max_concurrent": 2
}
EOF

python storycore.py batch --config batch_config.json
```

**Python Batch Processing:**
```python
requests = [
    VideoGenerationRequest(prompt="Forest scene", duration=4),
    VideoGenerationRequest(prompt="Ocean waves", duration=6),
    ImageGenerationRequest(prompt="Mountain landscape", mode="standard")
]

# Process in parallel
results = engine.batch_process(requests, max_concurrent=2)

for i, result in enumerate(results):
    print(f"Request {i+1} completed: {result.output_path}")
```

### Style Transfer and Consistency

Maintain consistent style across multiple generations:

```python
# Extract style from reference
style_profile = engine.extract_style_profile("reference_image.jpg")

# Apply style to new generations
requests = [
    ImageGenerationRequest(
        prompt="Character in forest",
        style_profile=style_profile
    ),
    ImageGenerationRequest(
        prompt="Same character in city",
        style_profile=style_profile
    )
]

results = engine.batch_generate_with_style(requests)
```

### Custom Workflow Chains

Create custom processing pipelines:

```python
from src.workflow_chain import WorkflowChain

# Define custom chain
chain = WorkflowChain([
    ("generate", "hunyuan_t2v"),
    ("enhance", "quality_upscale"),
    ("analyze", "quality_check"),
    ("optimize", "compression")
])

# Execute chain
result = chain.execute({
    "prompt": "Epic fantasy battle scene",
    "duration": 8,
    "target_quality": 0.9
})
```

## Quality Control

### Real-Time Quality Monitoring

Monitor generation quality in real-time:

```python
from src.advanced_video_quality_monitor import AdvancedVideoQualityMonitor

monitor = AdvancedVideoQualityMonitor(config)

# Enable real-time monitoring
engine.enable_quality_monitoring(monitor)

# Generate with quality feedback
result = engine.generate_video(request)

# Review quality report
quality_report = result.quality_metrics
print(f"Overall Quality: {quality_report.grade} ({quality_report.overall_score:.2f})")

for metric, score in quality_report.metrics.items():
    print(f"{metric}: {score:.2f}")

# Get improvement suggestions
suggestions = monitor.suggest_improvements(quality_report)
for suggestion in suggestions:
    print(f"Suggestion: {suggestion.description} (Priority: {suggestion.priority})")
```

### Quality Thresholds and Auto-Retry

Set quality thresholds for automatic retry:

```python
config.quality_threshold = 0.8
config.auto_retry_on_failure = True
config.max_retry_attempts = 3

# Will automatically retry if quality < 0.8
result = engine.generate_video(request)
```

### Quality Enhancement

Automatically enhance low-quality outputs:

```python
from src.quality_enhancer import QualityEnhancer

enhancer = QualityEnhancer(config)

# Analyze and enhance
quality_report = monitor.analyze_quality("generated_video.mp4")
if quality_report.overall_score < 0.8:
    enhanced_result = enhancer.enhance_video(
        "generated_video.mp4",
        suggestions=quality_report.suggestions
    )
```

## Performance Optimization

### Memory Management

Optimize memory usage for your hardware:

```python
from src.advanced_performance_optimizer import AdvancedPerformanceOptimizer

optimizer = AdvancedPerformanceOptimizer(config)

# Optimize for available VRAM
optimization_result = optimizer.optimize_for_hardware()
print(f"Memory savings: {optimization_result.memory_savings_gb:.1f}GB")

# Set optimization strategy
optimizer.set_strategy("memory_first")  # For limited VRAM
# optimizer.set_strategy("speed_first")   # For fast generation
# optimizer.set_strategy("balanced")      # Default balanced approach
```

### Model Caching and Sharing

Efficiently manage model loading:

```python
# Enable model sharing between workflows
config.enable_model_sharing = True
config.model_cache_size_gb = 12.0

# Preload frequently used models
engine.preload_models([
    "hunyuan_t2v_720p",
    "newbie_anime_base",
    "qwen_edit_2511"
])

# Monitor model usage
model_stats = engine.get_model_statistics()
print(f"Cache hit rate: {model_stats.cache_hit_rate:.1%}")
```

### Batch Optimization

Optimize batch processing for throughput:

```python
# Configure batch processing
batch_config = {
    "batch_size": 4,
    "parallel_processing": True,
    "memory_optimization": True,
    "model_sharing": True
}

# Process large batch efficiently
large_batch = [create_request(i) for i in range(20)]
results = engine.batch_process(large_batch, **batch_config)
```

## Best Practices

### Prompt Engineering

**Video Prompts:**
- Be specific about motion and camera movement
- Include temporal elements (duration, pacing)
- Specify visual style and mood
- Use clear, descriptive language

```python
# Good video prompt
prompt = "A majestic golden eagle soaring gracefully over snow-capped mountain peaks, " \
         "with smooth camera movement following the bird's flight path, " \
         "cinematic lighting with warm sunset colors, " \
         "slow and steady motion, peaceful atmosphere"

# Poor video prompt  
prompt = "Eagle flying"
```

**Image Prompts:**
- Include composition and framing details
- Specify art style and technique
- Add lighting and mood descriptors
- Use structured format for anime characters

```python
# Good anime prompt with XML structure
character_xml = """
<character>
    <appearance>
        <hair color="silver" style="long_flowing" />
        <eyes color="violet" expression="determined" />
        <clothing type="battle_armor" style="fantasy" />
    </appearance>
    <pose type="action" stance="ready_to_fight" />
</character>
"""

scene_prompt = "Epic fantasy battlefield with dramatic storm clouds, " \
               "dynamic lighting with lightning flashes, " \
               "detailed armor and weapon, heroic composition"
```

### Workflow Selection Guidelines

**Choose HunyuanVideo when:**
- Need high-quality realistic video generation
- Want smooth motion and temporal consistency
- Require 720p/1080p output resolution
- Working with text-to-video or image-to-video

**Choose Wan Video when:**
- Need video inpainting between keyframes
- Require alpha channel/transparent backgrounds
- Want fast 4-step generation with Lightning LoRA
- Working on compositing projects

**Choose NewBie Image when:**
- Creating anime-style artwork
- Need character consistency across images
- Want structured prompt control
- Require high-resolution anime output

**Choose Qwen Image when:**
- Editing existing images
- Need professional relighting
- Want layered image generation
- Require multi-modal editing capabilities

### Performance Tips

1. **Memory Management:**
   ```python
   # Monitor VRAM usage
   if get_vram_usage() > 0.8:
       engine.clear_model_cache()
       
   # Use appropriate precision
   config.model_precision = "fp8"  # For 16GB VRAM
   config.model_precision = "fp16" # For 24GB+ VRAM
   ```

2. **Quality vs Speed:**
   ```python
   # Fast preview generation
   request.quality_level = "draft"
   request.num_inference_steps = 20
   
   # High quality final generation
   request.quality_level = "ultra"
   request.num_inference_steps = 50
   ```

3. **Batch Processing:**
   ```python
   # Group similar requests for efficiency
   video_requests = [req for req in requests if req.type == "video"]
   image_requests = [req for req in requests if req.type == "image"]
   
   # Process each group separately
   video_results = engine.batch_generate_videos(video_requests)
   image_results = engine.batch_generate_images(image_requests)
   ```

### Error Handling

Implement robust error handling:

```python
from src.advanced_workflow_manager import (
    ModelNotFoundError, 
    InsufficientMemoryError,
    WorkflowExecutionError
)

try:
    result = engine.generate_video(request)
except ModelNotFoundError:
    # Try fallback workflow
    request.workflow_preference = "fallback"
    result = engine.generate_video(request)
    
except InsufficientMemoryError:
    # Reduce quality and retry
    request.quality_level = "draft"
    request.resolution = (512, 512)
    result = engine.generate_video(request)
    
except WorkflowExecutionError as e:
    # Log error and notify user
    logger.error(f"Generation failed: {e}")
    raise UserFriendlyError("Generation failed. Please try again with different settings.")
```

### Quality Assurance

Implement quality checks in your workflow:

```python
def generate_with_quality_assurance(request, min_quality=0.8):
    """Generate content with quality assurance"""
    
    max_attempts = 3
    for attempt in range(max_attempts):
        result = engine.generate_video(request)
        
        if result.quality_metrics.overall_score >= min_quality:
            return result
            
        # Adjust parameters for next attempt
        if attempt < max_attempts - 1:
            request = adjust_parameters_for_quality(request, result.quality_metrics)
    
    # Final attempt with highest quality settings
    request.quality_level = "ultra"
    return engine.generate_video(request)
```

---

*This user guide provides comprehensive coverage of all advanced workflow features. For technical details, see the [API Reference](api-reference.md). For troubleshooting, see the [Troubleshooting Guide](troubleshooting.md).*