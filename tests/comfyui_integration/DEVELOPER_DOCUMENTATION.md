# ComfyUI Test Framework - Developer Documentation

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Component Design](#component-design)
- [Workflow Parameter Mapping](#workflow-parameter-mapping)
- [Test Data Management](#test-data-management)
- [Extending the Framework](#extending-the-framework)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## Architecture Overview

### System Design Philosophy

The ComfyUI Test Framework follows a modular, layered architecture designed for:
- **Separation of Concerns**: Each component has a single, well-defined responsibility
- **Testability**: All components can be tested independently
- **Extensibility**: New workflows and test types can be added easily
- **Reliability**: Comprehensive error handling and recovery mechanisms

### Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI Layer (run_comfyui_tests.py)         │
│  - Argument parsing                                          │
│  - Environment variable handling                             │
│  - Test orchestration                                        │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                  Test Runner (test_runner.py)                │
│  - Test execution coordination                               │
│  - Result aggregation                                        │
│  - Report generation                                         │
└────────────────┬────────────────────────────────────────────┘
                 │
    ┌────────────┼────────────┬────────────────┐
    │            │            │                │
┌───▼───┐  ┌────▼────┐  ┌────▼────┐  ┌───────▼────────┐
│Connect│  │Workflow │  │Quality  │  │Output          │
│Manager│  │Executor │  │Validator│  │Manager         │
└───────┘  └─────────┘  └─────────┘  └────────────────┘
```

### Data Flow

**Image Generation Flow:**
```
1. CLI parses arguments
2. TestRunner initializes components
3. ConnectionManager verifies ComfyUI availability
4. WorkflowExecutor loads z_image_turbo_generation.json
5. WorkflowExecutor injects prompt into node 58
6. WorkflowExecutor submits to ComfyUI /prompt endpoint
7. WorkflowExecutor polls /history/{prompt_id} until complete
8. WorkflowExecutor downloads output image
9. QualityValidator checks format, size, dimensions
10. OutputManager saves file and generates report
```

**Video Generation Flow:**
```
1-3. Same as image generation
4. WorkflowExecutor loads ltx2_image_to_video.json
5. WorkflowExecutor injects image path (node 98) and prompt (node 92:3)
6-10. Same as image generation (with video-specific validation)
```


## Component Design

### 1. Connection Manager (`connection_manager.py`)

**Purpose:** Manages all communication with the ComfyUI server.

**Key Responsibilities:**
- Establish and maintain HTTP connections
- Perform health checks
- Handle authentication
- Provide error handling for network issues

**Class Structure:**
```python
class ComfyUIConnectionManager:
    def __init__(self, base_url: str, timeout: int = 10, auth: Optional[Dict] = None)
    async def connect(self) -> bool
    async def check_health(self) -> Dict[str, Any]
    async def get(self, endpoint: str) -> Dict[str, Any]
    async def post(self, endpoint: str, data: Dict) -> Dict[str, Any]
    async def close(self)
```

**Usage Example:**
```python
from comfyui_test_framework import ComfyUIConnectionManager

# Initialize connection
conn = ComfyUIConnectionManager(
    base_url="http://localhost:8000",
    timeout=10
)

# Test connection
try:
    await conn.connect()
    health = await conn.check_health()
    print(f"ComfyUI version: {health['version']}")
except ConnectionError as e:
    print(f"Connection failed: {e}")
finally:
    await conn.close()
```

**Error Handling:**
- `ConnectionError`: Server unreachable
- `AuthenticationError`: Invalid credentials
- `TimeoutError`: Connection timeout exceeded

### 2. Workflow Executor (`workflow_executor.py`)

**Purpose:** Loads, modifies, and executes ComfyUI workflows.

**Key Responsibilities:**
- Load workflow JSON files
- Inject test parameters into workflow nodes
- Submit workflows to ComfyUI
- Poll for completion
- Download generated outputs

**Class Structure:**
```python
class WorkflowExecutor:
    def __init__(self, connection_manager: ComfyUIConnectionManager, workflows_dir: Path)
    def load_workflow(self, workflow_name: str) -> Dict[str, Any]
    def inject_parameters(self, workflow: Dict, parameters: Dict[str, Any]) -> Dict
    async def execute_workflow(self, workflow: Dict, client_id: str = "test_runner") -> str
    async def wait_for_completion(self, prompt_id: str, timeout: int = 300, poll_interval: int = 5) -> Dict[str, Any]
    async def download_output(self, output_info: Dict, save_path: Path) -> Path
```

**Usage Example:**
```python
from comfyui_test_framework import WorkflowExecutor

executor = WorkflowExecutor(connection_manager, Path("assets/workflows"))

# Load and modify workflow
workflow = executor.load_workflow("z_image_turbo_generation.json")
workflow = executor.inject_parameters(workflow, {
    "prompt": "A beautiful landscape",
    "seed": 12345
})

# Execute workflow
prompt_id = await executor.execute_workflow(workflow)
result = await executor.wait_for_completion(prompt_id, timeout=300)
output_path = await executor.download_output(result, Path("output.png"))
```

**Parameter Injection:**
The framework uses a mapping system to inject parameters into specific workflow nodes:

```python
# Flux Turbo parameter mapping
FLUX_TURBO_PARAMS = {
    "prompt_node": "58",           # PrimitiveStringMultiline
    "prompt_field": "value",
    "seed_node": "57:3",           # KSampler
    "seed_field": "seed"
}

# LTX2 parameter mapping
LTX2_PARAMS = {
    "image_node": "98",            # LoadImage
    "image_field": "image",
    "prompt_node": "92:3",         # CLIPTextEncode
    "prompt_field": "text"
}
```

### 3. Quality Validator (`quality_validator.py`)

**Purpose:** Validates generated outputs meet quality standards.

**Key Responsibilities:**
- Check file formats
- Verify file sizes
- Extract and validate dimensions/duration
- Generate validation reports

**Class Structure:**
```python
@dataclass
class ValidationResult:
    passed: bool
    checks: Dict[str, bool]
    errors: List[str]
    metadata: Dict[str, Any]

class QualityValidator:
    def __init__(self)
    def validate_image(self, image_path: Path) -> ValidationResult
    def validate_video(self, video_path: Path) -> ValidationResult
    def check_file_format(self, file_path: Path, expected_formats: List[str]) -> bool
    def check_file_size(self, file_path: Path, min_size: int, max_size: int) -> bool
    def get_image_dimensions(self, image_path: Path) -> Tuple[int, int]
    def get_video_duration(self, video_path: Path) -> float
```

**Usage Example:**
```python
from comfyui_test_framework import QualityValidator

validator = QualityValidator()

# Validate image
result = validator.validate_image(Path("output.png"))
if result.passed:
    print(f"Image valid: {result.metadata['dimensions']}")
else:
    print(f"Validation failed: {result.errors}")

# Validate video
result = validator.validate_video(Path("output.mp4"))
if result.passed:
    print(f"Video valid: {result.metadata['duration']}s")
```

**Validation Criteria:**

**Images:**
- Format: PNG or JPEG
- Size: 10 KB - 50 MB
- Dimensions: width > 0, height > 0

**Videos:**
- Format: MP4 or WebM
- Size: 100 KB - 500 MB
- Duration: > 0 seconds

### 4. Output Manager (`output_manager.py`)

**Purpose:** Organizes test outputs and generates reports.

**Key Responsibilities:**
- Create timestamped directories
- Generate descriptive filenames
- Save output files
- Generate JSON test reports
- Organize outputs by test type

**Class Structure:**
```python
class OutputManager:
    def __init__(self, output_dir: Path)
    def create_timestamped_directory(self) -> Path
    def generate_filename(self, test_name: str, extension: str) -> str
    def save_output(self, source: Path, test_name: str) -> Path
    def generate_report(self, test_results: List[TestResult]) -> Path
    def organize_by_type(self, test_type: str) -> Path
```

**Usage Example:**
```python
from comfyui_test_framework import OutputManager

output_mgr = OutputManager(Path("temp_comfyui_export_test"))

# Create timestamped directory
test_dir = output_mgr.create_timestamped_directory()

# Save output with descriptive name
output_path = output_mgr.save_output(
    source=Path("temp_image.png"),
    test_name="flux_turbo_image_generation"
)

# Generate report
report_path = output_mgr.generate_report(test_results)
```

### 5. Test Runner (`test_runner.py`)

**Purpose:** Orchestrates test execution and coordinates all components.

**Key Responsibilities:**
- Initialize all components
- Execute test sequences
- Aggregate results
- Generate summary reports

**Class Structure:**
```python
@dataclass
class TestConfig:
    comfyui_url: str = "http://localhost:8000"
    workflows_dir: Path = Path("assets/workflows")
    output_dir: Path = Path("temp_comfyui_export_test")
    timeout: int = 300
    poll_interval: int = 5
    auth: Optional[Dict] = None

@dataclass
class TestResult:
    test_name: str
    test_type: str
    success: bool
    duration: float
    outputs: Dict[str, Path]
    validation_results: Dict[str, ValidationResult]
    errors: List[str]
    metadata: Dict[str, Any]

class ComfyUITestRunner:
    def __init__(self, config: TestConfig)
    async def run_image_generation_test(self, prompt: str) -> TestResult
    async def run_video_generation_test(self, image_path: Path, prompt: str) -> TestResult
    async def run_pipeline_test(self, prompt: str) -> TestResult
    async def run_all_tests(self) -> List[TestResult]
    def generate_report(self, results: List[TestResult]) -> Path
```

**Usage Example:**
```python
from comfyui_test_framework import ComfyUITestRunner, TestConfig

# Configure test runner
config = TestConfig(
    comfyui_url="http://localhost:8000",
    timeout=300
)

# Run tests
runner = ComfyUITestRunner(config)
results = await runner.run_all_tests()

# Generate report
report_path = runner.generate_report(results)
```


## Workflow Parameter Mapping

### Understanding ComfyUI Workflows

ComfyUI workflows are JSON files that define a graph of nodes. Each node has:
- **Unique ID**: Numeric identifier
- **Class Type**: Node type (e.g., "KSampler", "LoadImage")
- **Inputs**: Parameters and connections to other nodes

### Flux Turbo Workflow Structure

**File:** `assets/workflows/z_image_turbo_generation.json`

**Key Nodes:**
```json
{
  "58": {
    "class_type": "PrimitiveStringMultiline",
    "inputs": {
      "value": "A beautiful landscape"  // TEXT PROMPT INJECTION POINT
    }
  },
  "57:3": {
    "class_type": "KSampler",
    "inputs": {
      "seed": 12345,                    // SEED INJECTION POINT
      "steps": 4,
      "cfg": 1.0,
      "sampler_name": "euler",
      "scheduler": "simple"
    }
  },
  "57:13": {
    "class_type": "EmptySD3LatentImage",
    "inputs": {
      "width": 1024,                    // WIDTH INJECTION POINT
      "height": 784                     // HEIGHT INJECTION POINT
    }
  }
}
```

**Parameter Mapping:**
```python
FLUX_TURBO_PARAMS = {
    "prompt_node": "58",
    "prompt_field": "value",
    "seed_node": "57:3",
    "seed_field": "seed",
    "width_node": "57:13",
    "width_field": "width",
    "height_node": "57:13",
    "height_field": "height",
    "steps_node": "57:3",
    "steps_field": "steps"
}
```

**Injection Example:**
```python
def inject_flux_turbo_parameters(workflow: Dict, prompt: str, seed: int = None) -> Dict:
    """Inject parameters into Flux Turbo workflow."""
    # Inject prompt
    workflow["58"]["inputs"]["value"] = prompt
    
    # Inject seed if provided
    if seed is not None:
        workflow["57:3"]["inputs"]["seed"] = seed
    
    return workflow
```

### LTX2 Workflow Structure

**File:** `assets/workflows/ltx2_image_to_video.json`

**Key Nodes:**
```json
{
  "98": {
    "class_type": "LoadImage",
    "inputs": {
      "image": "input_image.png"      // IMAGE PATH INJECTION POINT
    }
  },
  "92:3": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "Camera movement description"  // PROMPT INJECTION POINT
    }
  },
  "92:62": {
    "class_type": "PrimitiveInt",
    "inputs": {
      "value": 121                      // FRAME COUNT INJECTION POINT
    }
  },
  "92:11": {
    "class_type": "RandomNoise",
    "inputs": {
      "noise_seed": 12345               // STAGE 1 SEED INJECTION POINT
    }
  },
  "92:67": {
    "class_type": "RandomNoise",
    "inputs": {
      "noise_seed": 12345               // STAGE 2 SEED INJECTION POINT
    }
  }
}
```

**Parameter Mapping:**
```python
LTX2_PARAMS = {
    "image_node": "98",
    "image_field": "image",
    "prompt_node": "92:3",
    "prompt_field": "text",
    "length_node": "92:62",
    "length_field": "value",
    "seed_stage1_node": "92:11",
    "seed_stage1_field": "noise_seed",
    "seed_stage2_node": "92:67",
    "seed_stage2_field": "noise_seed"
}
```

**Injection Example:**
```python
def inject_ltx2_parameters(workflow: Dict, image_path: str, prompt: str, 
                          frames: int = 121, seed: int = None) -> Dict:
    """Inject parameters into LTX2 workflow."""
    # Inject image path
    workflow["98"]["inputs"]["image"] = image_path
    
    # Inject prompt
    workflow["92:3"]["inputs"]["text"] = prompt
    
    # Inject frame count
    workflow["92:62"]["inputs"]["value"] = frames
    
    # Inject seeds if provided
    if seed is not None:
        workflow["92:11"]["inputs"]["noise_seed"] = seed
        workflow["92:67"]["inputs"]["noise_seed"] = seed
    
    return workflow
```

### Adding New Workflows

To add support for a new workflow:

1. **Analyze the workflow JSON:**
```python
import json

with open("new_workflow.json") as f:
    workflow = json.load(f)

# Identify key nodes
for node_id, node_data in workflow.items():
    print(f"Node {node_id}: {node_data['class_type']}")
    print(f"  Inputs: {node_data['inputs'].keys()}")
```

2. **Create parameter mapping:**
```python
NEW_WORKFLOW_PARAMS = {
    "param1_node": "node_id",
    "param1_field": "field_name",
    # ... more mappings
}
```

3. **Implement injection function:**
```python
def inject_new_workflow_parameters(workflow: Dict, **params) -> Dict:
    """Inject parameters into new workflow."""
    for param_name, param_value in params.items():
        node_id = NEW_WORKFLOW_PARAMS[f"{param_name}_node"]
        field_name = NEW_WORKFLOW_PARAMS[f"{param_name}_field"]
        workflow[node_id]["inputs"][field_name] = param_value
    return workflow
```

4. **Add test method to TestRunner:**
```python
async def run_new_workflow_test(self, **params) -> TestResult:
    """Test new workflow."""
    workflow = self.executor.load_workflow("new_workflow.json")
    workflow = inject_new_workflow_parameters(workflow, **params)
    # ... execute and validate
```


## Test Data Management

### Test Prompts

**Location:** `tests/fixtures/prompts.json`

**Structure:**
```json
{
  "image_generation": [
    "A beautiful landscape with mountains and a lake",
    "A futuristic city at night with neon lights",
    "A serene forest path in autumn",
    "An abstract geometric pattern in vibrant colors"
  ],
  "video_generation": [
    "Slow camera pan from left to right",
    "Zoom in on the center of the image",
    "Gentle camera movement following the subject",
    "Static shot with subtle parallax effect"
  ]
}
```

**Usage:**
```python
import json
from pathlib import Path

def load_test_prompts(category: str = "image_generation") -> List[str]:
    """Load test prompts from fixtures."""
    prompts_file = Path("tests/fixtures/prompts.json")
    with open(prompts_file) as f:
        prompts = json.load(f)
    return prompts.get(category, [])

# Use in tests
prompts = load_test_prompts("image_generation")
for prompt in prompts:
    result = await runner.run_image_generation_test(prompt)
```

### Test Images

**Location:** `tests/fixtures/images/`

**Organization:**
```
tests/fixtures/images/
├── 512x512/
│   ├── test_image_1.png
│   ├── test_image_2.png
│   └── test_image_3.png
├── 1024x768/
│   ├── landscape_1.png
│   └── landscape_2.png
└── 1920x1080/
    ├── hd_image_1.png
    └── hd_image_2.png
```

**Usage:**
```python
from pathlib import Path

def get_test_image(size: str = "1024x768", index: int = 1) -> Path:
    """Get test image path."""
    return Path(f"tests/fixtures/images/{size}/test_image_{index}.png")

# Use in tests
test_image = get_test_image("1024x768", 1)
result = await runner.run_video_generation_test(test_image, "Camera pan")
```

### Expected Outputs

**Location:** `tests/fixtures/expected/`

**Structure:**
```
tests/fixtures/expected/
├── flux_turbo/
│   ├── expected_output_1.png
│   ├── expected_output_1_metadata.json
│   └── ...
└── ltx2/
    ├── expected_output_1.mp4
    ├── expected_output_1_metadata.json
    └── ...
```

**Metadata Format:**
```json
{
  "test_name": "flux_turbo_basic",
  "prompt": "A beautiful landscape",
  "expected_format": "png",
  "expected_min_size": 10240,
  "expected_max_size": 52428800,
  "expected_dimensions": {
    "width": 1024,
    "height": 784
  }
}
```

**Usage:**
```python
def load_expected_metadata(test_name: str) -> Dict:
    """Load expected output metadata."""
    metadata_file = Path(f"tests/fixtures/expected/{test_name}_metadata.json")
    with open(metadata_file) as f:
        return json.load(f)

# Use in validation
expected = load_expected_metadata("flux_turbo_basic")
assert result.metadata["dimensions"] == expected["expected_dimensions"]
```

### Test Configuration Files

**Location:** `tests/fixtures/configs/`

**Example Configuration:**
```json
{
  "test_suite": "integration_tests",
  "comfyui_url": "http://localhost:8000",
  "timeout": 300,
  "workflows": {
    "flux_turbo": {
      "file": "z_image_turbo_generation.json",
      "default_params": {
        "steps": 4,
        "cfg": 1.0,
        "width": 1024,
        "height": 784
      }
    },
    "ltx2": {
      "file": "ltx2_image_to_video.json",
      "default_params": {
        "frames": 121,
        "fps": 24
      }
    }
  }
}
```

**Usage:**
```python
def load_test_config(config_name: str = "default") -> Dict:
    """Load test configuration."""
    config_file = Path(f"tests/fixtures/configs/{config_name}.json")
    with open(config_file) as f:
        return json.load(f)

# Use in test setup
config_data = load_test_config("integration_tests")
test_config = TestConfig(
    comfyui_url=config_data["comfyui_url"],
    timeout=config_data["timeout"]
)
```


## Extending the Framework

### Adding New Test Types

To add a new test type (e.g., audio generation):

1. **Create test method in TestRunner:**
```python
async def run_audio_generation_test(self, prompt: str, duration: int = 10) -> TestResult:
    """Test audio generation workflow."""
    start_time = time.time()
    test_name = "audio_generation"
    
    try:
        # Load workflow
        workflow = self.executor.load_workflow("audio_generation.json")
        
        # Inject parameters
        workflow = inject_audio_parameters(workflow, prompt, duration)
        
        # Execute workflow
        prompt_id = await self.executor.execute_workflow(workflow)
        result = await self.executor.wait_for_completion(prompt_id, self.config.timeout)
        
        # Download output
        output_path = await self.executor.download_output(
            result,
            self.output_manager.generate_filename(test_name, "wav")
        )
        
        # Validate output
        validation = self.validator.validate_audio(output_path)
        
        # Save output
        saved_path = self.output_manager.save_output(output_path, test_name)
        
        return TestResult(
            test_name=test_name,
            test_type="audio",
            success=validation.passed,
            duration=time.time() - start_time,
            outputs={"audio": saved_path},
            validation_results={"audio": validation},
            errors=[],
            metadata={"prompt": prompt, "duration": duration}
        )
    except Exception as e:
        return TestResult(
            test_name=test_name,
            test_type="audio",
            success=False,
            duration=time.time() - start_time,
            outputs={},
            validation_results={},
            errors=[str(e)],
            metadata={"prompt": prompt}
        )
```

2. **Add validation method to QualityValidator:**
```python
def validate_audio(self, audio_path: Path) -> ValidationResult:
    """Validate audio output."""
    checks = {}
    errors = []
    metadata = {}
    
    # Check file exists
    if not audio_path.exists():
        errors.append(f"Audio file not found: {audio_path}")
        return ValidationResult(False, checks, errors, metadata)
    
    # Check format
    checks["format_check"] = self.check_file_format(
        audio_path, ["wav", "mp3", "flac"]
    )
    if not checks["format_check"]:
        errors.append(f"Invalid audio format: {audio_path.suffix}")
    
    # Check size
    checks["size_check"] = self.check_file_size(
        audio_path, 1024, 100 * 1024 * 1024  # 1KB - 100MB
    )
    if not checks["size_check"]:
        errors.append(f"Audio file size out of bounds")
    
    # Get duration using ffmpeg
    try:
        duration = self.get_audio_duration(audio_path)
        metadata["duration"] = duration
        checks["duration_check"] = duration > 0
        if not checks["duration_check"]:
            errors.append("Audio duration is 0")
    except Exception as e:
        errors.append(f"Failed to get audio duration: {e}")
        checks["duration_check"] = False
    
    passed = all(checks.values())
    return ValidationResult(passed, checks, errors, metadata)

def get_audio_duration(self, audio_path: Path) -> float:
    """Get audio duration in seconds using ffmpeg."""
    import ffmpeg
    probe = ffmpeg.probe(str(audio_path))
    duration = float(probe['format']['duration'])
    return duration
```

3. **Add CLI option:**
```python
# In run_comfyui_tests.py
parser.add_argument(
    "--test-type",
    choices=["all", "connection-only", "image-only", "video-only", 
             "audio-only", "full-pipeline"],
    default="all",
    help="Type of test to run"
)

# In main execution
if args.test_type in ["all", "audio-only"]:
    result = await runner.run_audio_generation_test(args.prompt)
    results.append(result)
```

### Adding Custom Validators

To add custom validation logic:

1. **Create custom validator class:**
```python
class CustomQualityValidator(QualityValidator):
    """Extended validator with custom checks."""
    
    def validate_image_with_content_check(self, image_path: Path, 
                                         expected_content: str) -> ValidationResult:
        """Validate image and check for expected content."""
        # Run standard validation
        result = self.validate_image(image_path)
        
        if not result.passed:
            return result
        
        # Add custom content check using OCR or image analysis
        try:
            from PIL import Image
            import pytesseract
            
            img = Image.open(image_path)
            text = pytesseract.image_to_string(img)
            
            content_check = expected_content.lower() in text.lower()
            result.checks["content_check"] = content_check
            
            if not content_check:
                result.errors.append(f"Expected content not found: {expected_content}")
                result.passed = False
        except Exception as e:
            result.errors.append(f"Content check failed: {e}")
            result.checks["content_check"] = False
            result.passed = False
        
        return result
```

2. **Use custom validator:**
```python
# In TestRunner initialization
self.validator = CustomQualityValidator()

# In test method
validation = self.validator.validate_image_with_content_check(
    output_path,
    expected_content="landscape"
)
```

### Adding Performance Metrics

To add performance tracking:

1. **Create performance tracker:**
```python
from dataclasses import dataclass
from typing import Dict, List
import time

@dataclass
class PerformanceMetrics:
    """Performance metrics for test execution."""
    connection_time: float
    workflow_load_time: float
    execution_time: float
    download_time: float
    validation_time: float
    total_time: float
    memory_usage: Dict[str, int]

class PerformanceTracker:
    """Track performance metrics during test execution."""
    
    def __init__(self):
        self.metrics = {}
        self.start_times = {}
    
    def start(self, operation: str):
        """Start timing an operation."""
        self.start_times[operation] = time.time()
    
    def end(self, operation: str) -> float:
        """End timing an operation and return duration."""
        if operation not in self.start_times:
            return 0.0
        duration = time.time() - self.start_times[operation]
        self.metrics[operation] = duration
        return duration
    
    def get_metrics(self) -> PerformanceMetrics:
        """Get collected metrics."""
        return PerformanceMetrics(
            connection_time=self.metrics.get("connection", 0.0),
            workflow_load_time=self.metrics.get("workflow_load", 0.0),
            execution_time=self.metrics.get("execution", 0.0),
            download_time=self.metrics.get("download", 0.0),
            validation_time=self.metrics.get("validation", 0.0),
            total_time=sum(self.metrics.values()),
            memory_usage=self._get_memory_usage()
        )
    
    def _get_memory_usage(self) -> Dict[str, int]:
        """Get current memory usage."""
        import psutil
        process = psutil.Process()
        return {
            "rss": process.memory_info().rss,
            "vms": process.memory_info().vms
        }
```

2. **Integrate into TestRunner:**
```python
async def run_image_generation_test(self, prompt: str) -> TestResult:
    """Test image generation with performance tracking."""
    tracker = PerformanceTracker()
    
    tracker.start("connection")
    await self.connection.connect()
    tracker.end("connection")
    
    tracker.start("workflow_load")
    workflow = self.executor.load_workflow("z_image_turbo_generation.json")
    tracker.end("workflow_load")
    
    tracker.start("execution")
    prompt_id = await self.executor.execute_workflow(workflow)
    result = await self.executor.wait_for_completion(prompt_id)
    tracker.end("execution")
    
    tracker.start("download")
    output_path = await self.executor.download_output(result, ...)
    tracker.end("download")
    
    tracker.start("validation")
    validation = self.validator.validate_image(output_path)
    tracker.end("validation")
    
    metrics = tracker.get_metrics()
    
    return TestResult(
        # ... other fields
        metadata={
            "prompt": prompt,
            "performance": metrics.__dict__
        }
    )
```


## CI/CD Integration

### GitHub Actions Workflow

**File:** `.github/workflows/comfyui_integration_tests.yml`

```yaml
name: ComfyUI Integration Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      
      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('requirements.txt') }}
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
      
      - name: Run unit tests
        run: |
          pytest tests/comfyui_integration/ -m "not integration" -v --cov=src/comfyui_test_framework --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
          flags: unittests

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      
      - name: Install system dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y ffmpeg
      
      - name: Install Python dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
      
      - name: Install ComfyUI
        run: |
          git clone https://github.com/comfyanonymous/ComfyUI.git
          cd ComfyUI
          pip install -r requirements.txt
      
      - name: Download models
        run: |
          mkdir -p ComfyUI/models/checkpoints
          mkdir -p ComfyUI/models/ltx2
          # Download models from cache or external storage
          # Note: In production, use artifact storage or model registry
          wget -O ComfyUI/models/checkpoints/z_image_turbo_bf16.safetensors \
            ${{ secrets.MODEL_STORAGE_URL }}/z_image_turbo_bf16.safetensors
      
      - name: Start ComfyUI
        run: |
          cd ComfyUI
          python main.py --listen 0.0.0.0 --port 8000 &
          echo $! > comfyui.pid
          # Wait for ComfyUI to start
          for i in {1..30}; do
            if curl -s http://localhost:8000/system_stats > /dev/null; then
              echo "ComfyUI started successfully"
              break
            fi
            echo "Waiting for ComfyUI to start... ($i/30)"
            sleep 2
          done
      
      - name: Run integration tests
        run: |
          python run_comfyui_tests.py --verbose
        env:
          COMFYUI_URL: http://localhost:8000
          TEST_TIMEOUT: 600
      
      - name: Upload test outputs
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-outputs
          path: temp_comfyui_export_test/
      
      - name: Stop ComfyUI
        if: always()
        run: |
          if [ -f ComfyUI/comfyui.pid ]; then
            kill $(cat ComfyUI/comfyui.pid) || true
          fi
```

### GitLab CI/CD Pipeline

**File:** `.gitlab-ci.yml`

```yaml
stages:
  - test
  - integration

variables:
  COMFYUI_URL: "http://localhost:8000"
  TEST_TIMEOUT: "600"

unit_tests:
  stage: test
  image: python:3.9
  
  before_script:
    - pip install -r requirements.txt
  
  script:
    - pytest tests/comfyui_integration/ -m "not integration" -v --cov=src/comfyui_test_framework --cov-report=xml
  
  coverage: '/(?i)total.*? (100(?:\.0+)?\%|[1-9]?\d(?:\.\d+)?\%)$/'
  
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml

integration_tests:
  stage: integration
  image: python:3.9
  
  services:
    - name: comfyui:latest
      alias: comfyui
  
  before_script:
    - apt-get update && apt-get install -y ffmpeg
    - pip install -r requirements.txt
  
  script:
    - python run_comfyui_tests.py --comfyui-url http://comfyui:8000 --verbose
  
  artifacts:
    when: always
    paths:
      - temp_comfyui_export_test/
    expire_in: 1 week
```

### Jenkins Pipeline

**File:** `Jenkinsfile`

```groovy
pipeline {
    agent any
    
    environment {
        COMFYUI_URL = 'http://localhost:8000'
        TEST_TIMEOUT = '600'
    }
    
    stages {
        stage('Setup') {
            steps {
                sh 'python -m pip install --upgrade pip'
                sh 'pip install -r requirements.txt'
            }
        }
        
        stage('Unit Tests') {
            steps {
                sh 'pytest tests/comfyui_integration/ -m "not integration" -v --junitxml=unit-test-results.xml'
            }
            post {
                always {
                    junit 'unit-test-results.xml'
                }
            }
        }
        
        stage('Start ComfyUI') {
            steps {
                sh '''
                    cd ComfyUI
                    python main.py --listen 0.0.0.0 --port 8000 &
                    echo $! > comfyui.pid
                    sleep 30
                '''
            }
        }
        
        stage('Integration Tests') {
            steps {
                sh 'python run_comfyui_tests.py --verbose'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'temp_comfyui_export_test/**/*', allowEmptyArchive: true
                }
            }
        }
    }
    
    post {
        always {
            sh '''
                if [ -f ComfyUI/comfyui.pid ]; then
                    kill $(cat ComfyUI/comfyui.pid) || true
                fi
            '''
        }
    }
}
```

### Docker Integration

**Dockerfile for Testing:**

```dockerfile
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy test framework
COPY src/ ./src/
COPY tests/ ./tests/
COPY assets/ ./assets/
COPY run_comfyui_tests.py .

# Set environment variables
ENV COMFYUI_URL=http://comfyui:8000
ENV TEST_TIMEOUT=600

# Run tests
CMD ["python", "run_comfyui_tests.py", "--verbose"]
```

**Docker Compose for Testing:**

```yaml
version: '3.8'

services:
  comfyui:
    image: comfyui:latest
    ports:
      - "8000:8000"
    volumes:
      - ./ComfyUI/models:/app/models
      - ./ComfyUI/output:/app/output
    environment:
      - LISTEN=0.0.0.0
      - PORT=8000
  
  test-runner:
    build:
      context: .
      dockerfile: Dockerfile
    depends_on:
      - comfyui
    environment:
      - COMFYUI_URL=http://comfyui:8000
      - TEST_TIMEOUT=600
    volumes:
      - ./temp_comfyui_export_test:/app/temp_comfyui_export_test
```

**Run tests with Docker Compose:**
```bash
docker-compose up --abort-on-container-exit
```


## Best Practices

### Code Organization

**1. Separation of Concerns**
- Keep each component focused on a single responsibility
- Use dependency injection for better testability
- Avoid tight coupling between components

**Example:**
```python
# Good: Dependency injection
class TestRunner:
    def __init__(self, connection: ConnectionManager, 
                 executor: WorkflowExecutor,
                 validator: QualityValidator):
        self.connection = connection
        self.executor = executor
        self.validator = validator

# Bad: Direct instantiation
class TestRunner:
    def __init__(self):
        self.connection = ConnectionManager()  # Hard to test
        self.executor = WorkflowExecutor()     # Hard to mock
```

**2. Error Handling**
- Use specific exception types
- Provide clear error messages
- Log errors with context
- Clean up resources in finally blocks

**Example:**
```python
async def execute_workflow(self, workflow: Dict) -> str:
    """Execute workflow with proper error handling."""
    try:
        response = await self.connection.post("/prompt", {"prompt": workflow})
        return response["prompt_id"]
    except ConnectionError as e:
        logger.error(f"Failed to connect to ComfyUI: {e}")
        raise ExecutionError(f"Cannot submit workflow: {e}") from e
    except KeyError as e:
        logger.error(f"Invalid response from ComfyUI: {e}")
        raise ExecutionError(f"Invalid ComfyUI response: {e}") from e
    except Exception as e:
        logger.error(f"Unexpected error during workflow execution: {e}")
        raise
```

**3. Async/Await Patterns**
- Use async/await for I/O operations
- Avoid blocking calls in async functions
- Use asyncio.gather() for parallel operations

**Example:**
```python
# Good: Parallel execution
async def run_multiple_tests(self, prompts: List[str]) -> List[TestResult]:
    """Run multiple tests in parallel."""
    tasks = [self.run_image_generation_test(prompt) for prompt in prompts]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r for r in results if isinstance(r, TestResult)]

# Bad: Sequential execution
async def run_multiple_tests(self, prompts: List[str]) -> List[TestResult]:
    """Run multiple tests sequentially (slow)."""
    results = []
    for prompt in prompts:
        result = await self.run_image_generation_test(prompt)
        results.append(result)
    return results
```

### Testing Best Practices

**1. Unit Test Structure**
- Follow Arrange-Act-Assert pattern
- Use descriptive test names
- Test one thing per test
- Use fixtures for common setup

**Example:**
```python
import pytest
from pathlib import Path

@pytest.fixture
def connection_manager():
    """Fixture for connection manager."""
    return ComfyUIConnectionManager("http://localhost:8000")

@pytest.fixture
def mock_workflow():
    """Fixture for mock workflow."""
    return {
        "58": {"inputs": {"value": "test prompt"}},
        "57:3": {"inputs": {"seed": 12345}}
    }

def test_inject_parameters_updates_prompt_node(mock_workflow):
    """Test that inject_parameters correctly updates the prompt node."""
    # Arrange
    executor = WorkflowExecutor(None, Path("assets/workflows"))
    new_prompt = "A beautiful landscape"
    
    # Act
    result = executor.inject_parameters(mock_workflow, {"prompt": new_prompt})
    
    # Assert
    assert result["58"]["inputs"]["value"] == new_prompt
    assert result["57:3"]["inputs"]["seed"] == 12345  # Unchanged
```

**2. Integration Test Patterns**
- Use markers to separate test types
- Clean up test outputs after tests
- Use realistic test data
- Handle flaky tests with retries

**Example:**
```python
import pytest

@pytest.mark.integration
@pytest.mark.comfyui
@pytest.mark.flaky(reruns=3, reruns_delay=2)
async def test_flux_turbo_image_generation():
    """Integration test for Flux Turbo image generation."""
    # Setup
    config = TestConfig(comfyui_url="http://localhost:8000")
    runner = ComfyUITestRunner(config)
    
    try:
        # Execute
        result = await runner.run_image_generation_test("A beautiful landscape")
        
        # Assert
        assert result.success
        assert result.outputs["image"].exists()
        assert result.validation_results["image"].passed
    finally:
        # Cleanup
        if result.outputs.get("image"):
            result.outputs["image"].unlink(missing_ok=True)
```

**3. Property-Based Testing**
- Use Hypothesis for property tests
- Define clear properties
- Use appropriate strategies
- Run sufficient iterations

**Example:**
```python
from hypothesis import given, strategies as st

@given(st.text(min_size=1, max_size=500))
def test_property_prompt_injection_preserves_workflow_structure(prompt):
    """
    Property: For any text prompt, injecting it into a workflow should
    preserve the workflow structure (all nodes remain present).
    """
    # Arrange
    executor = WorkflowExecutor(None, Path("assets/workflows"))
    workflow = executor.load_workflow("z_image_turbo_generation.json")
    original_nodes = set(workflow.keys())
    
    # Act
    modified = executor.inject_parameters(workflow, {"prompt": prompt})
    
    # Assert
    assert set(modified.keys()) == original_nodes
    assert modified["58"]["inputs"]["value"] == prompt
```

### Performance Optimization

**1. Connection Pooling**
```python
class ComfyUIConnectionManager:
    """Connection manager with connection pooling."""
    
    def __init__(self, base_url: str, pool_size: int = 10):
        self.base_url = base_url
        self.connector = aiohttp.TCPConnector(limit=pool_size)
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(connector=self.connector)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.session.close()
```

**2. Caching**
```python
from functools import lru_cache

class WorkflowExecutor:
    """Workflow executor with caching."""
    
    @lru_cache(maxsize=10)
    def load_workflow(self, workflow_name: str) -> Dict[str, Any]:
        """Load workflow with caching."""
        workflow_path = self.workflows_dir / workflow_name
        with open(workflow_path) as f:
            return json.load(f)
```

**3. Batch Processing**
```python
async def run_batch_tests(self, prompts: List[str], batch_size: int = 5) -> List[TestResult]:
    """Run tests in batches to avoid overwhelming ComfyUI."""
    results = []
    for i in range(0, len(prompts), batch_size):
        batch = prompts[i:i + batch_size]
        batch_results = await asyncio.gather(
            *[self.run_image_generation_test(p) for p in batch]
        )
        results.extend(batch_results)
        await asyncio.sleep(1)  # Brief pause between batches
    return results
```

### Documentation Standards

**1. Docstring Format**
```python
async def execute_workflow(self, workflow: Dict, client_id: str = "test_runner") -> str:
    """
    Submit workflow to ComfyUI and return prompt ID.
    
    This method submits a workflow to the ComfyUI /prompt endpoint and returns
    the prompt_id that can be used to track execution progress.
    
    Args:
        workflow: Workflow dictionary with node definitions
        client_id: Client identifier for tracking (default: "test_runner")
    
    Returns:
        Prompt ID string for tracking execution
    
    Raises:
        ExecutionError: If workflow submission fails
        ConnectionError: If ComfyUI is unreachable
    
    Example:
        >>> executor = WorkflowExecutor(connection, Path("workflows"))
        >>> workflow = executor.load_workflow("flux_turbo.json")
        >>> prompt_id = await executor.execute_workflow(workflow)
        >>> print(f"Submitted workflow: {prompt_id}")
    """
    # Implementation
```

**2. Type Hints**
```python
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path

async def wait_for_completion(
    self,
    prompt_id: str,
    timeout: int = 300,
    poll_interval: int = 5
) -> Dict[str, Any]:
    """Wait for workflow completion with type hints."""
    # Implementation
```

**3. README Structure**
- Clear overview
- Prerequisites
- Installation steps
- Usage examples
- Troubleshooting
- API reference

### Security Considerations

**1. Input Validation**
```python
def validate_workflow_path(self, workflow_name: str) -> Path:
    """Validate workflow path to prevent directory traversal."""
    # Prevent directory traversal
    if ".." in workflow_name or "/" in workflow_name or "\\" in workflow_name:
        raise ValueError(f"Invalid workflow name: {workflow_name}")
    
    workflow_path = self.workflows_dir / workflow_name
    
    # Ensure path is within workflows directory
    if not workflow_path.resolve().is_relative_to(self.workflows_dir.resolve()):
        raise ValueError(f"Workflow path outside workflows directory: {workflow_path}")
    
    return workflow_path
```

**2. Credential Management**
```python
import os
from typing import Optional, Dict

def get_auth_credentials() -> Optional[Dict[str, str]]:
    """Get authentication credentials from environment."""
    username = os.getenv("COMFYUI_USERNAME")
    password = os.getenv("COMFYUI_PASSWORD")
    
    if username and password:
        return {"username": username, "password": password}
    return None

# Usage
auth = get_auth_credentials()
connection = ComfyUIConnectionManager(url, auth=auth)
```

**3. Timeout Protection**
```python
async def execute_with_timeout(self, coro, timeout: int):
    """Execute coroutine with timeout protection."""
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        raise TimeoutError(f"Operation timed out after {timeout} seconds")
```

## Conclusion

This developer documentation provides a comprehensive guide to understanding, extending, and maintaining the ComfyUI Test Framework. Key takeaways:

1. **Modular Architecture**: Each component has a clear responsibility
2. **Extensibility**: Easy to add new workflows and test types
3. **Best Practices**: Follow established patterns for reliability
4. **CI/CD Ready**: Designed for automated testing pipelines
5. **Well-Documented**: Clear documentation for all components

For additional support:
- Review the main [README](COMFYUI_TEST_FRAMEWORK_README.md)
- Check the [Integration Tests README](INTEGRATION_TESTS_README.md)
- Consult the [CLI README](CLI_README.md)
- Refer to the design document in `.kiro/specs/comfyui-real-integration-testing/design.md`

---

**Version:** 1.0.0  
**Last Updated:** January 28, 2026  
**Maintained by:** StoryCore-Engine Team
