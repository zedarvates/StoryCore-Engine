# AI Enhancement Integration - API Reference

**Version**: 1.0.0  
**Date**: 2026-01-14

---

## Table of Contents

1. [Core API](#core-api)
2. [Model Management API](#model-management-api)
3. [GPU Scheduling API](#gpu-scheduling-api)
4. [Enhancement Processors API](#enhancement-processors-api)
5. [Analytics API](#analytics-api)
6. [Batch Processing API](#batch-processing-api)
7. [Error Handling API](#error-handling-api)
8. [Cache API](#cache-api)
9. [Data Models](#data-models)

---

## Core API

### AIEnhancementEngine

Main orchestration component for AI enhancement operations.

#### Constructor

```python
AIEnhancementEngine(config: AIConfig)
```

**Parameters:**
- `config` (AIConfig): Configuration for the AI enhancement system

**Example:**
```python
from ai_enhancement_engine import AIEnhancementEngine, AIConfig

config = AIConfig()
engine = AIEnhancementEngine(config)
await engine.initialize()
```

#### Methods

##### `initialize()`

Initialize the AI enhancement engine and all components.

```python
async def initialize() -> None
```

**Returns:** None

**Raises:**
- `InitializationError`: If initialization fails

**Example:**
```python
await engine.initialize()
```

##### `enhance_frame()`

Apply AI enhancement to a single video frame.

```python
async def enhance_frame(
    frame: VideoFrame,
    enhancement_type: EnhancementType,
    parameters: Dict[str, Any]
) -> EnhancedFrame
```

**Parameters:**
- `frame` (VideoFrame): Input video frame
- `enhancement_type` (EnhancementType): Type of enhancement to apply
- `parameters` (Dict[str, Any]): Enhancement parameters

**Returns:** EnhancedFrame with enhancement results

**Raises:**
- `EnhancementError`: If enhancement fails
- `InvalidParameterError`: If parameters are invalid

**Example:**
```python
frame = VideoFrame(
    frame_id="frame_001",
    width=1920,
    height=1080,
    format="RGB",
    data=frame_data,
    timestamp=0.0
)

enhanced = await engine.enhance_frame(
    frame,
    EnhancementType.STYLE_TRANSFER,
    {'style': 'impressionist', 'quality_level': QualityLevel.HIGH}
)
```

##### `enhance_sequence()`

Apply AI enhancement to a sequence of video frames.

```python
async def enhance_sequence(
    frames: List[VideoFrame],
    enhancement_config: EnhancementConfig
) -> List[EnhancedFrame]
```

**Parameters:**
- `frames` (List[VideoFrame]): List of input frames
- `enhancement_config` (EnhancementConfig): Enhancement configuration

**Returns:** List of enhanced frames

**Example:**
```python
config = EnhancementConfig(
    enhancement_type=EnhancementType.SUPER_RESOLUTION,
    parameters={'upscale_factor': 4},
    quality_level=QualityLevel.HIGH
)

enhanced_frames = await engine.enhance_sequence(frames, config)
```

##### `get_available_enhancements()`

Get list of available AI enhancement types.

```python
def get_available_enhancements() -> List[EnhancementInfo]
```

**Returns:** List of available enhancements with metadata

**Example:**
```python
enhancements = engine.get_available_enhancements()
for enhancement in enhancements:
    print(f"{enhancement.name}: {enhancement.description}")
```

##### `get_system_status()`

Get current system status and health information.

```python
def get_system_status() -> Dict[str, Any]
```

**Returns:** Dictionary with system status information

**Example:**
```python
status = engine.get_system_status()
print(f"Initialized: {status['initialized']}")
print(f"Circuit Breaker: {status['circuit_breaker_state']}")
print(f"GPU Available: {status['gpu_available']}")
```

##### `shutdown()`

Gracefully shutdown the AI enhancement engine.

```python
async def shutdown() -> None
```

**Returns:** None

**Example:**
```python
await engine.shutdown()
```

---

## Model Management API

### ModelManager

Handles AI model lifecycle, loading, caching, and resource management.

#### Constructor

```python
ModelManager(config: ModelConfig = None)
```

**Parameters:**
- `config` (ModelConfig, optional): Model manager configuration

#### Methods

##### `load_model()`

Load an AI model with intelligent device selection.

```python
async def load_model(
    model_id: str,
    device: str = "auto"
) -> AIModel
```

**Parameters:**
- `model_id` (str): Unique identifier for the model
- `device` (str): Target device ("auto", "cuda", "cpu")

**Returns:** Loaded AI model

**Raises:**
- `ModelLoadingError`: If model loading fails
- `ModelNotFoundError`: If model doesn't exist

**Example:**
```python
model = await model_manager.load_model(
    "style_transfer_v1",
    device="cuda"
)
```

##### `unload_model()`

Unload a model and free resources.

```python
async def unload_model(model_id: str) -> bool
```

**Parameters:**
- `model_id` (str): Model identifier to unload

**Returns:** True if successful, False otherwise

**Example:**
```python
success = await model_manager.unload_model("style_transfer_v1")
```

##### `get_model_info()`

Get metadata and requirements for a model.

```python
def get_model_info(model_id: str) -> ModelInfo
```

**Parameters:**
- `model_id` (str): Model identifier

**Returns:** ModelInfo with metadata

**Example:**
```python
info = model_manager.get_model_info("super_resolution_v2")
print(f"GPU Memory Required: {info.gpu_memory_required_mb}MB")
print(f"Supported Operations: {info.supported_operations}")
```

##### `list_available_models()`

List all available models.

```python
def list_available_models() -> List[ModelInfo]
```

**Returns:** List of available models

**Example:**
```python
models = model_manager.list_available_models()
for model in models:
    print(f"{model.model_id}: {model.description}")
```

##### `get_cache_statistics()`

Get model cache statistics.

```python
def get_cache_statistics() -> Dict[str, Any]
```

**Returns:** Cache statistics

**Example:**
```python
stats = model_manager.get_cache_statistics()
print(f"Cached Models: {stats['cached_models']}")
print(f"Cache Size: {stats['cache_size_mb']}MB")
print(f"Hit Rate: {stats['hit_rate']:.2%}")
```

---

## GPU Scheduling API

### GPUScheduler

Manages GPU resources and schedules AI operations efficiently.

#### Constructor

```python
GPUScheduler(config: GPUConfig = None)
```

#### Methods

##### `schedule_job()`

Schedule an AI job with priority and resource requirements.

```python
async def schedule_job(
    job: AIJob,
    priority: JobPriority = JobPriority.NORMAL
) -> JobHandle
```

**Parameters:**
- `job` (AIJob): Job to schedule
- `priority` (JobPriority): Job priority level

**Returns:** JobHandle for tracking

**Example:**
```python
job = AIJob(
    job_id="job_001",
    operation_type=AIOperationType.STYLE_TRANSFER,
    parameters={'style': 'impressionist'}
)

handle = await gpu_scheduler.schedule_job(job, JobPriority.HIGH)
```

##### `get_optimal_device()`

Select optimal GPU device for job requirements.

```python
def get_optimal_device(
    requirements: ResourceRequirements
) -> Device
```

**Parameters:**
- `requirements` (ResourceRequirements): Job resource requirements

**Returns:** Optimal device for the job

**Example:**
```python
requirements = ResourceRequirements(
    gpu_memory_mb=2048,
    compute_capability=7.5
)

device = gpu_scheduler.get_optimal_device(requirements)
print(f"Selected Device: {device.name}")
```

##### `monitor_resources()`

Monitor GPU utilization and availability.

```python
def monitor_resources() -> GPUResourceStatus
```

**Returns:** Current GPU resource status

**Example:**
```python
status = gpu_scheduler.monitor_resources()
print(f"GPU Utilization: {status.utilization_percent}%")
print(f"Available Memory: {status.available_memory_mb}MB")
```

##### `get_statistics()`

Get GPU scheduler statistics.

```python
def get_statistics() -> Dict[str, Any]
```

**Returns:** Scheduler statistics

**Example:**
```python
stats = gpu_scheduler.get_statistics()
print(f"Total Jobs: {stats['total_jobs']}")
print(f"Active Jobs: {stats['active_jobs']}")
print(f"Average Wait Time: {stats['avg_wait_time_ms']}ms")
```

---

## Enhancement Processors API

### StyleTransferProcessor

Implements AI-powered artistic style transfer.

#### Methods

##### `apply_style()`

Apply artistic style to a video frame.

```python
async def apply_style(
    frame: VideoFrame,
    style: StyleConfig
) -> StyledFrame
```

**Parameters:**
- `frame` (VideoFrame): Input frame
- `style` (StyleConfig): Style configuration

**Returns:** Styled frame

**Example:**
```python
style_config = StyleConfig(
    style_name="impressionist",
    strength=0.8,
    preserve_colors=False
)

styled = await processor.apply_style(frame, style_config)
```

##### `apply_style_sequence()`

Apply style to sequence with temporal consistency.

```python
async def apply_style_sequence(
    frames: List[VideoFrame],
    style: StyleConfig
) -> List[StyledFrame]
```

**Parameters:**
- `frames` (List[VideoFrame]): Input frames
- `style` (StyleConfig): Style configuration

**Returns:** List of styled frames

**Example:**
```python
styled_frames = await processor.apply_style_sequence(
    frames,
    style_config
)
```

##### `get_available_styles()`

Get list of available artistic styles.

```python
def get_available_styles() -> List[StyleInfo]
```

**Returns:** List of available styles

**Example:**
```python
styles = processor.get_available_styles()
for style in styles:
    print(f"{style.name}: {style.description}")
```

### SuperResolutionEngine

Provides AI-powered upscaling with detail enhancement.

#### Methods

##### `upscale_frame()`

Upscale frame using AI super-resolution.

```python
async def upscale_frame(
    frame: VideoFrame,
    factor: int,
    quality: UpscaleQuality = UpscaleQuality.STANDARD
) -> UpscaledFrame
```

**Parameters:**
- `frame` (VideoFrame): Input frame
- `factor` (int): Upscale factor (2, 4, or 8)
- `quality` (UpscaleQuality): Quality level

**Returns:** Upscaled frame

**Example:**
```python
upscaled = await engine.upscale_frame(
    frame,
    factor=4,
    quality=UpscaleQuality.HIGH
)
```

##### `estimate_processing_time()`

Estimate processing time for upscaling operation.

```python
def estimate_processing_time(
    frame_size: Tuple[int, int],
    factor: int
) -> float
```

**Parameters:**
- `frame_size` (Tuple[int, int]): Frame dimensions (width, height)
- `factor` (int): Upscale factor

**Returns:** Estimated time in seconds

**Example:**
```python
time_estimate = engine.estimate_processing_time(
    (1920, 1080),
    factor=4
)
print(f"Estimated time: {time_estimate:.2f}s")
```

### ContentAwareInterpolator

Implements intelligent frame interpolation using scene understanding.

#### Methods

##### `interpolate_frames()`

Generate intermediate frames using content-aware interpolation.

```python
async def interpolate_frames(
    frame1: VideoFrame,
    frame2: VideoFrame,
    num_intermediate: int
) -> List[InterpolatedFrame]
```

**Parameters:**
- `frame1` (VideoFrame): First frame
- `frame2` (VideoFrame): Second frame
- `num_intermediate` (int): Number of intermediate frames to generate

**Returns:** List of interpolated frames

**Example:**
```python
interpolated = await interpolator.interpolate_frames(
    frame1,
    frame2,
    num_intermediate=3
)
```

##### `analyze_motion()`

Analyze motion patterns between frames.

```python
async def analyze_motion(
    frame1: VideoFrame,
    frame2: VideoFrame
) -> MotionAnalysis
```

**Parameters:**
- `frame1` (VideoFrame): First frame
- `frame2` (VideoFrame): Second frame

**Returns:** Motion analysis results

**Example:**
```python
analysis = await interpolator.analyze_motion(frame1, frame2)
print(f"Motion Complexity: {analysis.complexity}")
print(f"Scene Change: {analysis.scene_change_detected}")
```

### QualityOptimizer

Provides automatic quality assessment and enhancement suggestions.

#### Methods

##### `analyze_quality()`

Analyze frame quality across multiple dimensions.

```python
async def analyze_quality(
    frame: VideoFrame
) -> QualityAnalysis
```

**Parameters:**
- `frame` (VideoFrame): Frame to analyze

**Returns:** Quality analysis results

**Example:**
```python
analysis = await optimizer.analyze_quality(frame)
print(f"Sharpness: {analysis.sharpness_score}")
print(f"Color Quality: {analysis.color_score}")
print(f"Noise Level: {analysis.noise_level}")
```

##### `suggest_enhancements()`

Suggest specific enhancements based on quality analysis.

```python
async def suggest_enhancements(
    quality_analysis: QualityAnalysis
) -> List[EnhancementSuggestion]
```

**Parameters:**
- `quality_analysis` (QualityAnalysis): Quality analysis results

**Returns:** List of enhancement suggestions

**Example:**
```python
suggestions = await optimizer.suggest_enhancements(analysis)
for suggestion in suggestions:
    print(f"{suggestion.enhancement_type}: {suggestion.confidence:.2%}")
```

##### `apply_auto_enhancement()`

Apply automatic quality enhancements.

```python
async def apply_auto_enhancement(
    frame: VideoFrame,
    suggestions: List[EnhancementSuggestion]
) -> EnhancedFrame
```

**Parameters:**
- `frame` (VideoFrame): Frame to enhance
- `suggestions` (List[EnhancementSuggestion]): Enhancement suggestions

**Returns:** Enhanced frame

**Example:**
```python
enhanced = await optimizer.apply_auto_enhancement(
    frame,
    suggestions
)
```

---

## Analytics API

### AnalyticsAIIntegration

Comprehensive metrics tracking and monitoring for AI operations.

#### Constructor

```python
AnalyticsAIIntegration(config: AnalyticsConfig = None)
```

#### Methods

##### `start()`

Start the analytics system.

```python
async def start() -> None
```

**Example:**
```python
analytics = AnalyticsAIIntegration()
await analytics.start()
```

##### `record_operation_metrics()`

Record metrics for an AI operation.

```python
async def record_operation_metrics(
    operation_type: AIOperationType,
    processing_time_ms: float,
    quality_score: float,
    success: bool,
    metadata: Dict[str, Any] = None
) -> None
```

**Parameters:**
- `operation_type` (AIOperationType): Type of operation
- `processing_time_ms` (float): Processing time in milliseconds
- `quality_score` (float): Quality score (0.0-1.0)
- `success` (bool): Whether operation succeeded
- `metadata` (Dict, optional): Additional metadata

**Example:**
```python
await analytics.record_operation_metrics(
    AIOperationType.STYLE_TRANSFER,
    processing_time_ms=523.1,
    quality_score=0.94,
    success=True,
    metadata={'style': 'impressionist'}
)
```

##### `record_model_performance()`

Record AI model performance metrics.

```python
async def record_model_performance(
    model_id: str,
    model_type: str,
    inference_time_ms: float,
    quality_score: float,
    memory_usage_mb: float,
    success: bool
) -> None
```

**Parameters:**
- `model_id` (str): Model identifier
- `model_type` (str): Type of model
- `inference_time_ms` (float): Inference time
- `quality_score` (float): Quality score
- `memory_usage_mb` (float): Memory usage
- `success` (bool): Success status

**Example:**
```python
await analytics.record_model_performance(
    model_id="style_transfer_v1",
    model_type="style_transfer",
    inference_time_ms=523.1,
    quality_score=0.94,
    memory_usage_mb=512.0,
    success=True
)
```

##### `get_performance_snapshot()`

Get current performance snapshot.

```python
async def get_performance_snapshot() -> PerformanceSnapshot
```

**Returns:** Current performance metrics

**Example:**
```python
snapshot = await analytics.get_performance_snapshot()
print(f"Total Operations: {snapshot.total_operations}")
print(f"Average Processing Time: {snapshot.avg_processing_time_ms}ms")
print(f"Success Rate: {snapshot.success_rate:.2%}")
```

##### `get_statistics()`

Get comprehensive analytics statistics.

```python
def get_statistics() -> Dict[str, Any]
```

**Returns:** Analytics statistics

**Example:**
```python
stats = analytics.get_statistics()
print(f"Total Events: {stats['counters']['total_events']}")
print(f"Processed Events: {stats['counters']['processed_events']}")
```

##### `stop()`

Stop the analytics system.

```python
async def stop(timeout: float = 5.0) -> None
```

**Parameters:**
- `timeout` (float): Shutdown timeout in seconds

**Example:**
```python
await analytics.stop(timeout=2.0)
```

---

## Batch Processing API

### BatchAIIntegration

Resource-aware batch job scheduling and management.

#### Constructor

```python
BatchAIIntegration(config: BatchConfig = None)
```

#### Methods

##### `start()`

Start the batch processing system.

```python
async def start() -> None
```

**Example:**
```python
batch = BatchAIIntegration()
await batch.start()
```

##### `submit_job()`

Submit an AI batch job.

```python
async def submit_job(job: AIBatchJob) -> bool
```

**Parameters:**
- `job` (AIBatchJob): Job to submit

**Returns:** True if submitted successfully

**Example:**
```python
job = AIBatchJob(
    job_id="batch_001",
    job_type=AIJobType.STYLE_TRANSFER_BATCH,
    priority=AIJobPriority.NORMAL,
    resource_requirements=ResourceRequirements(
        gpu_count=1,
        estimated_duration_seconds=60.0
    ),
    parameters={'frames': 100, 'style': 'impressionist'}
)

success = await batch.submit_job(job)
```

##### `get_job_status()`

Get status of a batch job.

```python
def get_job_status(job_id: str) -> AIJobStatus
```

**Parameters:**
- `job_id` (str): Job identifier

**Returns:** Current job status

**Example:**
```python
status = batch.get_job_status("batch_001")
print(f"Status: {status.value}")
```

##### `cancel_job()`

Cancel a batch job.

```python
async def cancel_job(job_id: str) -> bool
```

**Parameters:**
- `job_id` (str): Job identifier

**Returns:** True if cancelled successfully

**Example:**
```python
success = await batch.cancel_job("batch_001")
```

##### `get_statistics()`

Get batch processing statistics.

```python
def get_statistics() -> Dict[str, Any]
```

**Returns:** Batch processing statistics

**Example:**
```python
stats = batch.get_statistics()
print(f"Pending Jobs: {stats['queue_status']['pending_jobs']}")
print(f"Completed Jobs: {stats['queue_status']['completed_jobs']}")
```

##### `stop()`

Stop the batch processing system.

```python
async def stop(timeout: float = 5.0) -> None
```

**Parameters:**
- `timeout` (float): Shutdown timeout in seconds

**Example:**
```python
await batch.stop(timeout=2.0)
```

---

## Error Handling API

### AIErrorHandler

Comprehensive error handling with automatic fallback selection.

#### Constructor

```python
AIErrorHandler(config: ErrorHandlerConfig = None)
```

#### Methods

##### `handle_error()`

Handle an AI error with automatic fallback.

```python
async def handle_error(
    error: AIError
) -> ErrorRecoveryResult
```

**Parameters:**
- `error` (AIError): Error to handle

**Returns:** Recovery result

**Example:**
```python
error = ModelLoadingError(
    message="Failed to load model",
    model_id="style_transfer_v1"
)

result = await error_handler.handle_error(error)
print(f"Strategy Used: {result.strategy_used.value}")
print(f"Success: {result.success}")
```

##### `handle_with_retry()`

Execute operation with retry mechanism.

```python
async def handle_with_retry(
    operation: Callable,
    max_retries: int = None
) -> Any
```

**Parameters:**
- `operation` (Callable): Operation to execute
- `max_retries` (int, optional): Maximum retry attempts

**Returns:** Operation result

**Example:**
```python
async def load_model():
    return await model_manager.load_model("model_id")

result = await error_handler.handle_with_retry(
    load_model,
    max_retries=3
)
```

##### `handle_with_timeout()`

Execute operation with timeout handling.

```python
async def handle_with_timeout(
    operation: Callable,
    timeout_seconds: float
) -> Any
```

**Parameters:**
- `operation` (Callable): Operation to execute
- `timeout_seconds` (float): Timeout in seconds

**Returns:** Operation result

**Example:**
```python
result = await error_handler.handle_with_timeout(
    enhance_frame_operation,
    timeout_seconds=30.0
)
```

##### `get_error_statistics()`

Get error handling statistics.

```python
def get_error_statistics() -> Dict[str, Any]
```

**Returns:** Error statistics

**Example:**
```python
stats = error_handler.get_error_statistics()
print(f"Total Errors: {stats['total_errors']}")
print(f"Recovered Errors: {stats['recovered_errors']}")
```

### AIUserErrorHandler

User-friendly error handling and parameter validation.

#### Methods

##### `validate_parameters()`

Validate operation parameters.

```python
def validate_parameters(
    parameters: Dict[str, Any],
    schema: Dict[str, Any]
) -> ValidationResult
```

**Parameters:**
- `parameters` (Dict): Parameters to validate
- `schema` (Dict): Validation schema

**Returns:** Validation result

**Example:**
```python
schema = {
    'quality_level': {'type': 'str', 'options': ['preview', 'standard', 'high']},
    'strength': {'type': 'float', 'range': (0.0, 1.0)}
}

result = handler.validate_parameters(parameters, schema)
if not result.is_valid:
    print(f"Errors: {result.errors}")
```

##### `create_invalid_parameter_error()`

Create user-friendly parameter error.

```python
def create_invalid_parameter_error(
    parameter_name: str,
    provided_value: Any,
    expected_type: str,
    valid_range: Tuple[Any, Any] = None
) -> AIUserError
```

**Parameters:**
- `parameter_name` (str): Parameter name
- `provided_value` (Any): Provided value
- `expected_type` (str): Expected type
- `valid_range` (Tuple, optional): Valid range

**Returns:** User-friendly error

**Example:**
```python
error = handler.create_invalid_parameter_error(
    parameter_name="quality",
    provided_value=1.5,
    expected_type="float",
    valid_range=(0.0, 1.0)
)
```

##### `format_error_for_display()`

Format error for user display.

```python
def format_error_for_display(error: AIUserError) -> str
```

**Parameters:**
- `error` (AIUserError): Error to format

**Returns:** Formatted error message

**Example:**
```python
formatted = handler.format_error_for_display(error)
print(formatted)
```

---

## Cache API

### EnhancementCache

Intelligent caching system for AI-processed content.

#### Constructor

```python
EnhancementCache(
    max_cache_size_mb: int = 1024,
    cache_ttl_seconds: int = 3600
)
```

#### Methods

##### `start()`

Start the cache system.

```python
async def start() -> None
```

##### `store()`

Store enhancement result in cache.

```python
async def store(
    cache_key: str,
    result_data: Dict[str, Any]
) -> None
```

**Parameters:**
- `cache_key` (str): Cache key
- `result_data` (Dict): Result data to cache

**Example:**
```python
await cache.store(
    "frame_001_style_transfer",
    {
        'enhanced_data': enhanced_data,
        'quality_score': 0.94,
        'processing_time_ms': 523.1
    }
)
```

##### `get()`

Retrieve result from cache.

```python
async def get(cache_key: str) -> Optional[Dict[str, Any]]
```

**Parameters:**
- `cache_key` (str): Cache key

**Returns:** Cached result or None

**Example:**
```python
result = await cache.get("frame_001_style_transfer")
if result:
    print(f"Cache hit! Quality: {result['quality_score']}")
```

##### `invalidate()`

Invalidate cache entries by pattern.

```python
async def invalidate(pattern: str) -> int
```

**Parameters:**
- `pattern` (str): Pattern to match

**Returns:** Number of entries invalidated

**Example:**
```python
count = await cache.invalidate("frame_001_*")
print(f"Invalidated {count} entries")
```

##### `get_statistics()`

Get cache statistics.

```python
def get_statistics() -> Dict[str, Any]
```

**Returns:** Cache statistics

**Example:**
```python
stats = cache.get_statistics()
print(f"Hit Rate: {stats['hit_rate']:.2%}")
print(f"Cache Size: {stats['total_size_mb']:.2f}MB")
```

##### `stop()`

Stop the cache system.

```python
async def stop(timeout: float = 5.0) -> None
```

---

## Data Models

### Core Data Classes

#### VideoFrame

```python
@dataclass
class VideoFrame:
    frame_id: str
    width: int
    height: int
    format: str  # "RGB", "RGBA", "BGR"
    data: bytes
    timestamp: float
    metadata: Dict[str, Any] = field(default_factory=dict)
```

#### EnhancedFrame

```python
@dataclass
class EnhancedFrame:
    original_frame: VideoFrame
    enhanced_data: bytes
    enhancement_type: EnhancementType
    quality_score: float
    confidence_score: float
    processing_time_ms: float
    metadata: Dict[str, Any] = field(default_factory=dict)
```

#### EnhancementConfig

```python
@dataclass
class EnhancementConfig:
    enhancement_type: EnhancementType
    parameters: Dict[str, Any]
    quality_level: QualityLevel
    performance_mode: PerformanceMode = PerformanceMode.BALANCED
```

### Enumerations

#### EnhancementType

```python
class EnhancementType(Enum):
    STYLE_TRANSFER = "style_transfer"
    SUPER_RESOLUTION = "super_resolution"
    CONTENT_AWARE_INTERPOLATION = "content_aware_interpolation"
    AUTO_QUALITY_ENHANCEMENT = "auto_quality_enhancement"
    NOISE_REDUCTION = "noise_reduction"
    COLOR_ENHANCEMENT = "color_enhancement"
```

#### QualityLevel

```python
class QualityLevel(Enum):
    PREVIEW = "preview"      # Fast, reduced quality
    STANDARD = "standard"    # Balanced
    HIGH = "high"           # High quality
    MAXIMUM = "maximum"     # Maximum quality
```

#### JobPriority

```python
class JobPriority(Enum):
    CRITICAL = 5
    HIGH = 4
    NORMAL = 3
    LOW = 2
    BACKGROUND = 1
```

---

**Document Version**: 1.0.0  
**Last Updated**: 2026-01-14
