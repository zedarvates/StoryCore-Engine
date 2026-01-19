# API Reference - Advanced ComfyUI Workflows

## Overview

This document provides comprehensive API documentation for all advanced workflow components, including classes, methods, configuration options, and data structures.

## Core Components

### AdvancedWorkflowManager

The central orchestrator for all advanced workflows.

```python
from src.advanced_workflow_manager import AdvancedWorkflowManager

class AdvancedWorkflowManager:
    """Central manager for advanced ComfyUI workflows"""
    
    def __init__(self, config: AdvancedWorkflowConfig):
        """Initialize workflow manager with configuration"""
```

#### Methods

##### `get_available_workflows() -> Dict[str, List[str]]`
Returns all available workflows organized by category.

**Returns:**
```python
{
    "video": ["hunyuan_i2v", "hunyuan_t2v", "wan_inpaint", "wan_alpha"],
    "image": ["newbie_anime", "qwen_relight", "qwen_edit", "qwen_layered"]
}
```

##### `route_request(request: Union[VideoRequest, ImageRequest]) -> str`
Intelligently routes generation requests to optimal workflows.

**Parameters:**
- `request`: Generation request with requirements and preferences

**Returns:** Workflow identifier string

**Example:**
```python
manager = AdvancedWorkflowManager(config)
workflow_id = manager.route_request(VideoRequest(
    prompt="A cat walking in a garden",
    style="realistic",
    duration=5.0
))
# Returns: "hunyuan_t2v"
```

##### `execute_workflow(workflow_id: str, **kwargs) -> WorkflowResult`
Executes specified workflow with given parameters.

**Parameters:**
- `workflow_id`: Workflow identifier
- `**kwargs`: Workflow-specific parameters

**Returns:** `WorkflowResult` object with generation results

---

### Enhanced Video Engine

Advanced video generation with multiple model support.

```python
from src.enhanced_video_engine import EnhancedVideoEngine

class EnhancedVideoEngine:
    """Enhanced video engine with advanced workflow support"""
```

#### Generation Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `standard` | Basic video generation | General purpose |
| `high_quality` | Maximum quality settings | Professional content |
| `fast` | Speed-optimized generation | Rapid prototyping |
| `i2v_specialized` | Image-to-video focused | Animation from stills |
| `inpainting` | Video inpainting workflows | Content modification |
| `alpha_channel` | Transparent video generation | Compositing |
| `auto` | Intelligent mode selection | Adaptive generation |

#### Methods

##### `generate_video(request: VideoGenerationRequest) -> VideoResult`
Generate video using enhanced workflows.

**Parameters:**
```python
@dataclass
class VideoGenerationRequest:
    prompt: str
    mode: str = "auto"
    duration: float = 5.0
    fps: int = 24
    resolution: Tuple[int, int] = (720, 1280)
    style: Optional[str] = None
    reference_image: Optional[str] = None
    quality_level: str = "balanced"  # draft, balanced, high, ultra
    enable_upscaling: bool = False
```

**Returns:**
```python
@dataclass
class VideoResult:
    video_path: str
    metadata: Dict[str, Any]
    quality_metrics: QualityMetrics
    generation_time: float
    workflow_used: str
```

**Example:**
```python
engine = EnhancedVideoEngine(config)
result = engine.generate_video(VideoGenerationRequest(
    prompt="A serene lake at sunset with gentle waves",
    mode="high_quality",
    duration=8.0,
    resolution=(1080, 1920),
    enable_upscaling=True
))
```

##### `batch_generate(requests: List[VideoGenerationRequest]) -> List[VideoResult]`
Generate multiple videos in batch for efficiency.

**Parameters:**
- `requests`: List of video generation requests

**Returns:** List of video results

---

### Enhanced Image Engine

Advanced image generation with specialized workflows.

```python
from src.enhanced_image_engine import EnhancedImageEngine

class EnhancedImageEngine:
    """Enhanced image engine with advanced workflow support"""
```

#### Generation Modes

| Mode | Description | Workflow Used |
|------|-------------|---------------|
| `standard` | Basic image generation | Default ComfyUI |
| `anime` | Anime-style generation | NewBie Image |
| `professional_edit` | Advanced editing | Qwen Image Suite |
| `layered_composition` | Multi-layer generation | Qwen Layered |
| `lightning_fast` | 4-step generation | Lightning LoRA |
| `hybrid` | Multi-workflow combination | Adaptive |
| `auto` | Intelligent selection | Best match |

#### Methods

##### `generate_image(request: ImageGenerationRequest) -> ImageResult`
Generate image using enhanced workflows.

**Parameters:**
```python
@dataclass
class ImageGenerationRequest:
    prompt: str
    mode: str = "auto"
    resolution: Tuple[int, int] = (1024, 1024)
    style: Optional[str] = None
    reference_images: List[str] = field(default_factory=list)
    quality_level: str = "balanced"
    num_layers: int = 1
    enable_enhancement: bool = True
```

**Returns:**
```python
@dataclass
class ImageResult:
    image_path: str
    layers: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    quality_metrics: QualityMetrics = None
    generation_time: float = 0.0
    workflow_used: str = ""
```

---

### HunyuanVideo Integration

Specialized video generation using HunyuanVideo 1.5 models.

```python
from src.hunyuan_video_integration import HunyuanVideoIntegration

class HunyuanVideoIntegration:
    """Integration for HunyuanVideo 1.5 models"""
```

#### Methods

##### `text_to_video(prompt: str, **kwargs) -> VideoResult`
Generate video from text prompt.

**Parameters:**
- `prompt`: Text description of desired video
- `duration`: Video duration in seconds (default: 5.0)
- `fps`: Frames per second (default: 24)
- `resolution`: Output resolution (default: (720, 1280))
- `guidance_scale`: Prompt adherence strength (default: 7.5)
- `num_inference_steps`: Generation steps (default: 50)

**Example:**
```python
integration = HunyuanVideoIntegration(config)
result = integration.text_to_video(
    prompt="A majestic eagle soaring over mountains",
    duration=6.0,
    resolution=(1080, 1920),
    guidance_scale=8.0
)
```

##### `image_to_video(image_path: str, prompt: str, **kwargs) -> VideoResult`
Generate video from reference image.

**Parameters:**
- `image_path`: Path to reference image
- `prompt`: Text description for video motion
- `motion_strength`: Amount of motion (0.0-1.0, default: 0.7)
- `preserve_structure`: Maintain image composition (default: True)

---

### Wan Video Integration

Advanced video features including inpainting and alpha channels.

```python
from src.wan_video_integration import WanVideoIntegration

class WanVideoIntegration:
    """Integration for Wan Video 2.2 models"""
```

#### Methods

##### `inpaint_video(start_image: str, end_image: str, prompt: str, **kwargs) -> VideoResult`
Generate video with inpainting between keyframes.

**Parameters:**
- `start_image`: Starting keyframe image
- `end_image`: Ending keyframe image
- `prompt`: Description of desired transition
- `noise_level`: Processing noise level ("high" or "low")
- `use_lightning`: Enable 4-step Lightning LoRA (default: False)

##### `generate_alpha_video(prompt: str, **kwargs) -> VideoResult`
Generate video with alpha channel for compositing.

**Parameters:**
- `prompt`: Description of subject (background will be transparent)
- `alpha_strength`: Transparency effect strength (default: 0.8)
- `edge_refinement`: Refine alpha edges (default: True)

---

### NewBie Image Integration

Anime-style image generation with structured prompts.

```python
from src.newbie_image_integration import NewBieImageIntegration

class NewBieImageIntegration:
    """Integration for NewBie anime-style image generation"""
```

#### Methods

##### `generate_anime_image(character_prompt: str, scene_prompt: str, **kwargs) -> ImageResult`
Generate anime-style image with structured prompts.

**Parameters:**
- `character_prompt`: Character description or XML definition
- `scene_prompt`: Scene and environment description
- `style`: Anime style ("default", "detailed", "soft")
- `quality_level`: Generation quality ("draft", "standard", "high", "ultra")

**XML Character Format:**
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

##### `parse_character_xml(xml_string: str) -> Dict[str, Any]`
Parse XML character definition into structured data.

---

### Qwen Image Suite Integration

Professional image editing and manipulation.

```python
from src.qwen_image_suite_integration import QwenImageSuiteIntegration

class QwenImageSuiteIntegration:
    """Integration for Qwen image editing and generation models"""
```

#### Methods

##### `relight_image(image_path: str, lighting_prompt: str, **kwargs) -> ImageResult`
Relight image with specified lighting conditions.

**Parameters:**
- `image_path`: Source image to relight
- `lighting_prompt`: Lighting description
- `lighting_type`: Predefined lighting ("natural", "studio", "dramatic", etc.)
- `intensity`: Lighting intensity (0.0-2.0, default: 1.0)

**Lighting Types:**
- `natural_daylight`: Soft natural lighting
- `golden_hour`: Warm sunset lighting
- `studio_portrait`: Professional studio setup
- `dramatic_side`: Strong directional lighting
- `soft_diffused`: Even, soft illumination
- `neon_cyberpunk`: Colorful neon lighting
- `candlelight_warm`: Warm, intimate lighting
- `moonlight_cool`: Cool, mysterious lighting
- `backlit_silhouette`: Strong backlighting
- `rim_lighting`: Edge highlighting

##### `edit_image_multimodal(image_path: str, reference_images: List[str], edit_prompt: str, **kwargs) -> ImageResult`
Edit image using multiple reference images and text guidance.

**Parameters:**
- `image_path`: Source image to edit
- `reference_images`: List of reference image paths
- `edit_prompt`: Description of desired edits
- `model_version`: Qwen model version ("2509" or "2511")
- `edit_strength`: Strength of edits (0.0-1.0, default: 0.7)

##### `generate_layered_image(prompt: str, num_layers: int = 2, **kwargs) -> LayeredImageResult`
Generate image with separate layers for compositing.

**Parameters:**
- `prompt`: Image description
- `num_layers`: Number of layers to generate (2-8)
- `layer_descriptions`: Optional specific layer descriptions
- `compositing_mode`: How layers combine ("normal", "multiply", "overlay")

**Returns:**
```python
@dataclass
class LayeredImageResult(ImageResult):
    layers: List[str]  # Paths to individual layer images
    layer_metadata: List[Dict[str, Any]]
    composite_image: str  # Path to combined result
    layer_masks: List[str]  # Paths to layer masks
```

---

### Advanced Model Manager

Efficient model loading and memory management.

```python
from src.advanced_model_manager import AdvancedModelManager

class AdvancedModelManager:
    """Manages loading and caching of advanced models"""
```

#### Methods

##### `load_model(model_name: str, **kwargs) -> bool`
Load model with optimization.

**Parameters:**
- `model_name`: Model identifier
- `precision`: Model precision ("fp16", "fp8", "int8")
- `enable_quantization`: Apply quantization (default: True)
- `cache_model`: Keep in memory cache (default: True)

##### `get_model_info(model_name: str) -> ModelInfo`
Get detailed model information.

**Returns:**
```python
@dataclass
class ModelInfo:
    name: str
    size_gb: float
    precision: str
    is_loaded: bool
    memory_usage_gb: float
    capabilities: List[str]
    requirements: Dict[str, Any]
```

##### `optimize_memory() -> MemoryReport`
Optimize memory usage across all loaded models.

---

### Performance Optimizer

System performance monitoring and optimization.

```python
from src.advanced_performance_optimizer import AdvancedPerformanceOptimizer

class AdvancedPerformanceOptimizer:
    """Advanced performance optimization for workflows"""
```

#### Optimization Strategies

| Strategy | Focus | Use Case |
|----------|-------|----------|
| `speed_first` | Minimize generation time | Real-time applications |
| `memory_first` | Minimize VRAM usage | Limited hardware |
| `balanced` | Balance speed and quality | General use |
| `quality_first` | Maximum output quality | Professional work |
| `adaptive` | Dynamic optimization | Variable workloads |

#### Methods

##### `optimize_workflow(workflow_type: str, strategy: str = "balanced") -> OptimizationResult`
Optimize workflow performance.

**Parameters:**
- `workflow_type`: Type of workflow to optimize
- `strategy`: Optimization strategy
- `target_metrics`: Specific performance targets

**Returns:**
```python
@dataclass
class OptimizationResult:
    strategy_applied: str
    performance_improvement: float
    memory_savings_gb: float
    quality_impact: float
    recommendations: List[str]
```

---

### Quality Monitoring

Real-time quality assessment and improvement.

```python
from src.advanced_video_quality_monitor import AdvancedVideoQualityMonitor
from src.advanced_image_quality_monitor import AdvancedImageQualityMonitor
```

#### Video Quality Metrics

| Metric | Description | Range |
|--------|-------------|-------|
| `temporal_consistency` | Frame-to-frame consistency | 0.0-1.0 |
| `visual_quality` | Overall visual fidelity | 0.0-1.0 |
| `motion_smoothness` | Motion flow quality | 0.0-1.0 |
| `color_accuracy` | Color reproduction | 0.0-1.0 |
| `sharpness` | Image sharpness | 0.0-1.0 |
| `artifact_detection` | Presence of artifacts | 0.0-1.0 |
| `style_consistency` | Style coherence | 0.0-1.0 |
| `composition_quality` | Visual composition | 0.0-1.0 |
| `lighting_quality` | Lighting realism | 0.0-1.0 |
| `overall_score` | Combined quality score | 0.0-1.0 |

#### Image Quality Metrics

| Metric | Description | Range |
|--------|-------------|-------|
| `sharpness` | Image sharpness (Laplacian variance) | 0.0-1.0 |
| `contrast` | Dynamic range | 0.0-1.0 |
| `brightness` | Exposure level | 0.0-1.0 |
| `saturation` | Color saturation | 0.0-1.0 |
| `noise_level` | Image noise | 0.0-1.0 |
| `artifact_detection` | Generation artifacts | 0.0-1.0 |
| `color_accuracy` | Color fidelity | 0.0-1.0 |
| `detail_preservation` | Fine detail quality | 0.0-1.0 |
| `style_consistency` | Style coherence | 0.0-1.0 |
| `overall_score` | Combined quality score | 0.0-1.0 |

#### Methods

##### `analyze_quality(content_path: str) -> QualityReport`
Analyze content quality with comprehensive metrics.

**Returns:**
```python
@dataclass
class QualityReport:
    overall_score: float
    grade: str  # A, B, C, D, F
    metrics: Dict[str, float]
    issues: List[str]
    suggestions: List[EnhancementSuggestion]
    analysis_time: float
```

##### `suggest_improvements(quality_report: QualityReport) -> List[EnhancementSuggestion]`
Generate improvement suggestions based on quality analysis.

**Returns:**
```python
@dataclass
class EnhancementSuggestion:
    type: str
    description: str
    priority: str  # high, medium, low
    confidence: float
    parameters: Dict[str, Any]
```

---

## Configuration Classes

### AdvancedWorkflowConfig

Main configuration class for all advanced workflows.

```python
@dataclass
class AdvancedWorkflowConfig:
    # Model settings
    model_precision: str = "fp16"
    enable_quantization: bool = True
    max_memory_usage_gb: float = 20.0
    
    # Performance settings
    batch_size: int = 1
    enable_caching: bool = True
    parallel_execution: bool = False
    
    # Quality settings
    quality_threshold: float = 0.8
    enable_quality_monitoring: bool = True
    auto_retry_on_failure: bool = True
    
    # Workflow-specific configs
    hunyuan_config: HunyuanVideoConfig = field(default_factory=HunyuanVideoConfig)
    wan_config: WanVideoConfig = field(default_factory=WanVideoConfig)
    newbie_config: NewBieImageConfig = field(default_factory=NewBieImageConfig)
    qwen_config: QwenImageConfig = field(default_factory=QwenImageConfig)
```

### HunyuanVideoConfig

Configuration for HunyuanVideo workflows.

```python
@dataclass
class HunyuanVideoConfig:
    model_path: str = "models/hunyuan"
    enable_720p: bool = True
    enable_1080p_sr: bool = True
    default_fps: int = 24
    max_frames: int = 121
    guidance_scale: float = 7.5
    num_inference_steps: int = 50
```

### WanVideoConfig

Configuration for Wan Video workflows.

```python
@dataclass
class WanVideoConfig:
    model_path: str = "models/wan"
    enable_lightning_lora: bool = True
    default_noise_level: str = "high"
    alpha_threshold: float = 0.5
    enable_dual_guidance: bool = True
```

### NewBieImageConfig

Configuration for NewBie Image workflows.

```python
@dataclass
class NewBieImageConfig:
    model_path: str = "models/newbie"
    default_resolution: Tuple[int, int] = (1024, 1536)
    enable_xml_parsing: bool = True
    default_style: str = "default"
    character_cache_size: int = 100
```

### QwenImageConfig

Configuration for Qwen Image workflows.

```python
@dataclass
class QwenImageConfig:
    model_path: str = "models/qwen"
    enable_2509: bool = True
    enable_2511: bool = True
    enable_layered: bool = True
    enable_lightning_lora: bool = True
    max_layers: int = 8
    default_edit_strength: float = 0.7
```

---

## Error Handling

### Exception Classes

```python
class AdvancedWorkflowError(Exception):
    """Base exception for advanced workflow errors"""

class ModelNotFoundError(AdvancedWorkflowError):
    """Raised when required model is not available"""

class InsufficientMemoryError(AdvancedWorkflowError):
    """Raised when insufficient VRAM/RAM available"""

class WorkflowExecutionError(AdvancedWorkflowError):
    """Raised when workflow execution fails"""

class QualityValidationError(AdvancedWorkflowError):
    """Raised when output quality is below threshold"""
```

### Error Handling Patterns

```python
try:
    result = engine.generate_video(request)
except ModelNotFoundError as e:
    # Handle missing model
    fallback_result = engine.generate_video_fallback(request)
except InsufficientMemoryError as e:
    # Reduce quality and retry
    request.quality_level = "draft"
    result = engine.generate_video(request)
except WorkflowExecutionError as e:
    # Log error and use alternative workflow
    logger.error(f"Workflow failed: {e}")
    result = engine.generate_video_alternative(request)
```

---

## CLI Integration

### Command Line Interface

The advanced workflows integrate with the existing StoryCore CLI:

```bash
# Enhanced video generation
python storycore.py video --mode enhanced --workflow hunyuan_t2v \
    --prompt "A cat walking in a garden" --duration 5 --quality high

# Enhanced image generation  
python storycore.py image --mode enhanced --workflow newbie_anime \
    --prompt "Anime girl with blue hair" --style detailed

# Batch processing
python storycore.py batch --config batch_config.json --mode enhanced

# Quality analysis
python storycore.py analyze --input video.mp4 --type video --detailed

# Performance optimization
python storycore.py optimize --strategy balanced --target memory
```

### CLI Configuration

```json
{
    "advanced_workflows": {
        "enabled": true,
        "default_video_workflow": "auto",
        "default_image_workflow": "auto",
        "quality_threshold": 0.8,
        "enable_optimization": true
    }
}
```

---

*This API reference provides complete technical documentation for integrating and using advanced ComfyUI workflows in your applications.*