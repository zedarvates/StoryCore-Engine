# PromotionEngine Interface Contract v1.0

## 1. Interface Contract

### Coordinate System Convention
- **Grid Position**: `[row, col]` with 0-based indexing
- **Origin**: Top-left corner (0,0)
- **Row**: Vertical position (0 = top)
- **Column**: Horizontal position (0 = left)

### Panel Bounds Computation
```python
# For grid_specification "CxR" (columns x rows)
cols, rows = map(int, grid_spec.split('x'))
panel_width = image_width // cols
panel_height = image_height // rows

# Panel bounds for position [row, col]
left = col * panel_width
top = row * panel_height  
right = left + panel_width
bottom = top + panel_height
```

### Center Fill Crop Algorithm (16:9)
```python
def center_fill_crop(image, target_ratio=16/9):
    width, height = image.size
    current_ratio = width / height
    
    if current_ratio > target_ratio:
        # Crop width (image too wide)
        new_width = int(height * target_ratio)
        left = (width - new_width) // 2
        return image.crop((left, 0, left + new_width, height))
    else:
        # Crop height (image too tall)  
        new_height = int(width / target_ratio)
        top = (height - new_height) // 2
        return image.crop((0, top, width, top + new_height))

# Edge Case: If source is smaller than minimum viable crop (64x36), 
# pad with black borders before cropping
```

### Output Structure
```
output_directory/
├── panel_01_promoted.png
├── panel_02_promoted.png
├── ...
├── qa_report.json
└── promotion_summary.json
```

### Determinism Rules
- **Panel Seed**: `global_seed + hash(panel_id) % 1000000`
- **Seed Logging**: All seeds recorded in promotion_summary.json
- **Reproducibility**: Same input → identical output (deterministic hash)

## 2. QA Rules

### Sharpness Thresholds (Laplacian Variance)
```python
SHARPNESS_THRESHOLDS = {
    "too_soft": 50.0,      # Below this = quality concern
    "acceptable": 100.0,   # Minimum acceptable quality
    "good": 200.0,         # Good quality range
    "oversharpen_risk": 500.0  # Above this = artifact risk
}
```

### QA Metrics Structure
```json
{
  "panel_metrics": [
    {
      "panel_id": "panel_01",
      "sharpness_score": 156.7,
      "quality_tier": "good",
      "aspect_ratio": 1.778
    }
  ],
  "aggregate_stats": {
    "mean_sharpness": 145.2,
    "min_sharpness": 89.1,
    "max_sharpness": 234.5,
    "std_sharpness": 42.3
  }
}
```

### Fail-Fast vs Warning Conditions
- **FAIL**: Mean sharpness < 50.0 (too_soft threshold)
- **FAIL**: Any panel aspect ratio deviation > 5% from 16:9
- **FAIL**: Missing input files or invalid grid_specification
- **WARN**: Individual panel sharpness < 100.0
- **WARN**: Any panel sharpness > 500.0 (oversharpen risk)

## 3. Refinement Metadata Schemas

### ComfyUI Payload Schema
```json
{
  "input_image": "assets/images/promoted/panel_01_upscaled.png",
  "prompt": "{global_style_anchor} {prompt_extension}, highly detailed, 8k",
  "negative_prompt": "low quality, blurry, distorted, artifacts",
  "denoising_strength": 0.35,
  "seed": 1234567,
  "cfg_scale": 7.5,
  "steps": 30,
  "sampler_name": "dpmpp_2m_karras",
  "scheduler": "karras",
  "model": "cinematic_v1.safetensors",
  "width": 1024,
  "height": 576
}
```

### Automatic1111 Payload Schema
```json
{
  "init_images": ["base64_encoded_image"],
  "prompt": "{global_style_anchor} {prompt_extension}, highly detailed, 8k",
  "negative_prompt": "low quality, blurry, distorted, artifacts", 
  "denoising_strength": 0.35,
  "seed": 1234567,
  "cfg_scale": 7.5,
  "steps": 30,
  "sampler_index": "DPM++ 2M Karras",
  "width": 1024,
  "height": 576,
  "restore_faces": false,
  "tiling": false
}
```

### Seed Usage Pattern
```python
def generate_panel_seed(global_seed: int, panel_id: str) -> int:
    """Generate deterministic seed for panel processing."""
    panel_hash = hash(panel_id) % 1000000
    return (global_seed + panel_hash) % 2147483647  # Max int32
```

## 4. Test Plan

### Unit Tests

#### Test 1: Panel Slicing Bounds
```python
def test_panel_slicing_bounds():
    """Verify correct panel extraction from 3x3 grid."""
    # 900x900 image, 3x3 grid = 300x300 panels
    grid_size = (900, 900)
    
    # Test center panel [1,1]
    expected_bounds = (300, 300, 600, 600)  # left, top, right, bottom
    actual_bounds = calculate_panel_bounds([1, 1], "3x3", grid_size)
    
    assert actual_bounds == expected_bounds
    assert (actual_bounds[2] - actual_bounds[0]) == 300  # width
    assert (actual_bounds[3] - actual_bounds[1]) == 300  # height
```

#### Test 2: Center Fill Crop Aspect Ratio
```python
def test_center_fill_crop_aspect_ratio():
    """Verify 16:9 aspect ratio conversion without stretching."""
    # Test square input (300x300)
    square_image = Image.new('RGB', (300, 300), 'red')
    cropped = center_fill_crop(square_image, 16/9)
    
    aspect_ratio = cropped.size[0] / cropped.size[1]
    expected_ratio = 16/9
    
    assert abs(aspect_ratio - expected_ratio) < 0.01
    assert cropped.size == (300, 169)  # Height cropped, width preserved
```

#### Test 3: Laplacian Variance Sanity
```python
def test_laplacian_variance_sanity():
    """Verify sharpened image has higher variance than blurred."""
    # Create test image with edges
    test_image = Image.new('RGB', (100, 100), 'white')
    draw = ImageDraw.Draw(test_image)
    draw.rectangle([25, 25, 75, 75], fill='black')
    
    # Apply blur and sharpen
    blurred = test_image.filter(ImageFilter.GaussianBlur(2))
    sharpened = test_image.filter(ImageFilter.UnsharpMask(radius=1, percent=150))
    
    blur_variance = calculate_sharpness(blurred)
    sharp_variance = calculate_sharpness(sharpened)
    original_variance = calculate_sharpness(test_image)
    
    assert sharp_variance > original_variance > blur_variance
    assert sharp_variance > 50.0  # Above "too_soft" threshold
```

### Integration Test

#### Test 4: End-to-End Process Grid
```python
def test_process_grid_integration():
    """Validate complete process_grid() workflow."""
    # Create test promotion plan
    test_plan = {
        "master_grid_path": "test_assets/test_grid_3x3.png",
        "output_directory": "test_output",
        "grid_specification": "3x3", 
        "global_seed": 42,
        "panels": [
            {
                "panel_id": "panel_01",
                "grid_position": [0, 0],
                "prompt_extension": "test prompt"
            }
        ]
    }
    
    # Execute engine
    engine = PromotionEngine()
    results = engine.process_grid(test_plan)
    
    # Validate outputs
    assert results["total_panels"] == 1
    assert Path("test_output/panel_01_promoted.png").exists()
    assert Path("test_output/qa_report.json").exists()
    
    # Validate QA metrics
    qa_report = results["qa_report"]
    assert "sharpness_metrics" in qa_report
    assert qa_report["validation_status"] in ["PASSED", "REVIEW_NEEDED"]
    
    # Cleanup
    shutil.rmtree("test_output")
```

## Edge Cases Documentation

### Input Validation Edge Cases
- **Empty Grid**: grid_specification with 0 dimensions → FAIL
- **Malformed Spec**: "3x" or "x3" → FAIL  
- **Missing Panels**: Fewer panels than grid cells → WARN
- **Duplicate Positions**: Multiple panels at same grid_position → FAIL

### Image Processing Edge Cases
- **Tiny Images**: Source < 64px → Pad before processing
- **Extreme Ratios**: Source ratio > 10:1 → WARN (may lose content)
- **Corrupted Files**: Invalid image format → FAIL with clear error

### Seed Determinism Edge Cases
- **Hash Collisions**: Different panel_ids with same hash → Use panel index fallback
- **Seed Overflow**: Ensure seeds stay within int32 range
- **Unicode Panel IDs**: Hash UTF-8 encoded strings consistently

This contract ensures robust, predictable operation while maintaining hackathon development speed.
