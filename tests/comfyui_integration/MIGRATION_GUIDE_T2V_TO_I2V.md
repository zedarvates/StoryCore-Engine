# Migration Guide: LTX2 Text-to-Video (t2v) to Image-to-Video (i2v)

## Overview

This guide helps you migrate from the deprecated `ltx2_image_to_video.json` (text-to-video) workflow to the recommended `ltx2_image_to_video_i2v.json` (image-to-video) workflow.

## Why Migrate?

The old t2v workflow has several issues:
- ❌ Requires `ManualSigmaSchedule` custom node (not in standard ComfyUI)
- ❌ More complex setup with additional dependencies
- ❌ Less reliable for image-to-video conversion
- ❌ Causes "node does not exist" errors

The new i2v workflow:
- ✅ Uses standard LTX2 custom nodes only
- ✅ Uses `ManualSigmas` (standard ComfyUI node)
- ✅ More reliable and easier to set up
- ✅ Better maintained and documented

## Quick Migration Checklist

- [ ] Update workflow filename in code
- [ ] Verify LTX2 custom nodes are installed
- [ ] Test with a sample image
- [ ] Update any documentation/comments
- [ ] Run integration tests

## Step-by-Step Migration

### Step 1: Update Code References

Find all references to the old workflow and update them:

**Before:**
```python
workflow = executor.load_workflow("ltx2_image_to_video.json")
```

**After:**
```python
workflow = executor.load_workflow("ltx2_image_to_video_i2v.json")
```

### Step 2: Verify Custom Nodes Installation

The i2v workflow requires standard LTX2 custom nodes:

```bash
# Check if LTX2 custom nodes are installed
cd ComfyUI/custom_nodes
ls -la | grep -i ltx

# If not installed, clone the repository
git clone https://github.com/Lightricks/ComfyUI-LTX2

# Restart ComfyUI
```

### Step 3: Update Parameter Injection (Optional)

The parameter injection points are mostly the same, but you can now also control resize dimensions:

**Old Parameters:**
```python
parameters = {
    "image_path": "input.png",
    "prompt": "Camera movement",
    "length": 121,
    "seed_stage1": 42,
    "seed_stage2": 123
}
```

**New Parameters (with optional resize):**
```python
parameters = {
    "image_path": "input.png",
    "prompt": "Camera movement",
    "negative_prompt": "blurry, low quality",  # NEW: explicit negative prompt
    "length": 121,
    "seed_stage1": 42,
    "seed_stage2": 123,
    "resize_width": 1280,   # NEW: optional resize
    "resize_height": 720    # NEW: optional resize
}
```

### Step 4: Test the Migration

Run a test to verify everything works:

```bash
# Test video generation only
python run_comfyui_tests.py --test-type video-only --verbose

# Or run full pipeline test
python run_comfyui_tests.py --test-type full-pipeline --verbose
```

### Step 5: Update Documentation

Update any documentation, comments, or configuration files that reference the old workflow:

- README files
- Configuration files
- Code comments
- User guides
- API documentation

## Code Examples

### Example 1: Basic Test Runner Update

**Before:**
```python
class ComfyUITestRunner:
    async def run_video_generation_test(self, image_path, prompt):
        workflow = self.executor.load_workflow("ltx2_image_to_video.json")
        # ... rest of code
```

**After:**
```python
class ComfyUITestRunner:
    async def run_video_generation_test(self, image_path, prompt):
        workflow = self.executor.load_workflow("ltx2_image_to_video_i2v.json")
        # ... rest of code
```

### Example 2: Integration Test Update

**Before:**
```python
@pytest.mark.integration
async def test_ltx2_video_generation():
    workflow = workflow_executor.load_workflow("ltx2_image_to_video.json")
    # ... rest of test
```

**After:**
```python
@pytest.mark.integration
async def test_ltx2_video_generation():
    workflow = workflow_executor.load_workflow("ltx2_image_to_video_i2v.json")
    # ... rest of test
```

### Example 3: Pipeline Test Update

**Before:**
```python
# Generate video from image
video_workflow = executor.load_workflow("ltx2_image_to_video.json")
video_params = {
    "image_path": str(image_path),
    "prompt": "Slow camera pan"
}
```

**After:**
```python
# Generate video from image
video_workflow = executor.load_workflow("ltx2_image_to_video_i2v.json")
video_params = {
    "image_path": str(image_path),
    "prompt": "Slow camera pan",
    "negative_prompt": "blurry, low quality, still frame"
}
```

## Troubleshooting

### Error: "Workflow file not found: ltx2_image_to_video_i2v.json"

**Cause:** The new workflow file doesn't exist in your workflows directory.

**Solution:**
```bash
# Verify the file exists
ls -la assets/workflows/ltx2_image_to_video_i2v.json

# If missing, ensure you have the latest version of the repository
git pull origin main
```

### Error: "Node LTXVImgToVideoInplace does not exist"

**Cause:** LTX2 custom nodes are not installed.

**Solution:**
```bash
cd ComfyUI/custom_nodes
git clone https://github.com/Lightricks/ComfyUI-LTX2
# Restart ComfyUI
```

### Error: "Model not found: ltx-2-19b-dev-fp8.safetensors"

**Cause:** Required models are not downloaded.

**Solution:**
Download models from [Hugging Face - LTX2](https://huggingface.co/Lightricks/LTX-Video) and place them in the correct directories:
- `ltx-2-19b-dev-fp8.safetensors` → `ComfyUI/models/checkpoints/`
- `gemma_3_12B_it_fp4_mixed.safetensors` → `ComfyUI/models/text_encoders/`
- `ltx-2-19b-distilled-lora-384.safetensors` → `ComfyUI/models/loras/`
- `ltx-2-spatial-upscaler-x2-1.0.safetensors` → `ComfyUI/models/upscale_models/`

### Tests Still Failing After Migration

**Checklist:**
1. ✅ Verify ComfyUI is running: `curl http://localhost:8000/system_stats`
2. ✅ Check LTX2 custom nodes are installed: `ls ComfyUI/custom_nodes/ | grep -i ltx`
3. ✅ Verify all models are downloaded and in correct locations
4. ✅ Restart ComfyUI after installing custom nodes
5. ✅ Check ComfyUI logs for any error messages
6. ✅ Run tests with `--verbose` flag for detailed output

## Automated Migration Script

You can use this script to automatically update your code:

```bash
#!/bin/bash
# migrate_ltx2_workflow.sh

echo "Migrating LTX2 workflow references..."

# Find and replace in Python files
find . -name "*.py" -type f -exec sed -i 's/ltx2_image_to_video\.json/ltx2_image_to_video_i2v.json/g' {} +

# Find and replace in Markdown files
find . -name "*.md" -type f -exec sed -i 's/ltx2_image_to_video\.json/ltx2_image_to_video_i2v.json/g' {} +

echo "Migration complete! Please review changes and test."
```

**Usage:**
```bash
chmod +x migrate_ltx2_workflow.sh
./migrate_ltx2_workflow.sh
```

**Note:** Always review the changes before committing!

## Verification

After migration, verify everything works:

```bash
# 1. Run unit tests
pytest tests/comfyui_integration/ -v

# 2. Run integration tests (requires ComfyUI running)
pytest tests/comfyui_integration/test_integration_real_comfyui.py -m integration -v

# 3. Run full test suite
python run_comfyui_tests.py --verbose

# 4. Check test coverage
pytest tests/comfyui_integration/ --cov=src/comfyui_test_framework --cov-report=term
```

## Rollback Plan

If you need to rollback for any reason:

```bash
# Revert code changes
git checkout -- .

# Or manually change back
# ltx2_image_to_video_i2v.json → ltx2_image_to_video.json
```

**Note:** Rollback is not recommended as the old workflow has known issues.

## Additional Resources

- [LTX2 Workflow Guide](../../assets/workflows/LTX2_WORKFLOW_GUIDE.md) - Detailed workflow comparison
- [Test Framework README](COMFYUI_TEST_FRAMEWORK_README.md) - Complete testing guide
- [Developer Documentation](DEVELOPER_DOCUMENTATION.md) - Architecture details
- [LTX2 Official Repository](https://github.com/Lightricks/LTX-Video) - Model and node documentation

## Support

If you encounter issues during migration:

1. Check the [Troubleshooting section](#troubleshooting) above
2. Review the [LTX2 Workflow Guide](../../assets/workflows/LTX2_WORKFLOW_GUIDE.md)
3. Check ComfyUI logs for detailed error messages
4. Verify all prerequisites are met (models, custom nodes, etc.)

---

**Migration Guide Version:** 1.0.0  
**Last Updated:** January 28, 2026  
**Maintained by:** StoryCore-Engine Team
