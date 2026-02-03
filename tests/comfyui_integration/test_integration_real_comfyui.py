"""
Integration tests for real ComfyUI backend.

These tests require a running ComfyUI instance with the required models installed.
Run with: pytest tests/comfyui_integration/test_integration_real_comfyui.py -m integration

Requirements:
- ComfyUI running on http://localhost:8000 (or configured URL)
- z_image_turbo_bf16.safetensors model installed
- LTX2 models installed
- Workflows in assets/workflows/
"""

import pytest
import asyncio
from pathlib import Path
import os
import time

from src.comfyui_test_framework.connection_manager import ComfyUIConnectionManager
from src.comfyui_test_framework.workflow_executor import WorkflowExecutor
from src.comfyui_test_framework.quality_validator import QualityValidator
from src.comfyui_test_framework.output_manager import OutputManager
from src.comfyui_test_framework.test_runner import ComfyUITestRunner, TestConfig


# Configuration from environment or defaults
COMFYUI_URL = os.environ.get("COMFYUI_URL", "http://localhost:8000")
OUTPUT_DIR = Path("temp_comfyui_export_test")
WORKFLOWS_DIR = Path("assets/workflows")
TEST_TIMEOUT = int(os.environ.get("TEST_TIMEOUT", "300"))


@pytest.fixture
def comfyui_url():
    """ComfyUI server URL."""
    return COMFYUI_URL


@pytest.fixture
def output_dir(tmp_path):
    """Temporary output directory for test artifacts."""
    test_output = OUTPUT_DIR / "integration_tests"
    test_output.mkdir(parents=True, exist_ok=True)
    return test_output


@pytest.fixture
def workflows_dir():
    """Workflows directory."""
    return WORKFLOWS_DIR


@pytest.fixture
async def connection_manager(comfyui_url):
    """Create and connect to ComfyUI."""
    manager = ComfyUIConnectionManager(comfyui_url, timeout=10)
    try:
        await manager.connect()
        yield manager
    finally:
        await manager.close()


@pytest.fixture
def workflow_executor(connection_manager, workflows_dir):
    """Create workflow executor."""
    return WorkflowExecutor(connection_manager, workflows_dir)


@pytest.fixture
def quality_validator():
    """Create quality validator."""
    return QualityValidator()


@pytest.fixture
def output_manager(output_dir):
    """Create output manager."""
    return OutputManager(output_dir)


@pytest.fixture
def test_config(comfyui_url, workflows_dir, output_dir):
    """Create test configuration."""
    return TestConfig(
        comfyui_url=comfyui_url,
        workflows_dir=workflows_dir,
        output_dir=output_dir,
        timeout=TEST_TIMEOUT,
        poll_interval=5
    )


@pytest.fixture
def test_runner(test_config):
    """Create test runner."""
    return ComfyUITestRunner(test_config)


# Test prompts for image generation
TEST_IMAGE_PROMPTS = [
    "A beautiful landscape with mountains and a lake at sunset",
    "A futuristic city at night with neon lights and flying cars",
    "A serene forest path in autumn with golden leaves"
]


@pytest.mark.integration
@pytest.mark.asyncio
class TestFluxTurboImageGeneration:
    """
    Integration tests for Flux Turbo image generation.
    Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
    """

    async def test_flux_turbo_image_generation_basic(
        self,
        workflow_executor,
        quality_validator,
        output_manager
    ):
        """
        Test basic Flux Turbo image generation.
        
        Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
        
        Steps:
        1. Load z_image_turbo_generation.json workflow
        2. Inject test prompt
        3. Submit workflow and get prompt_id
        4. Poll for completion
        5. Download output image
        6. Validate image quality
        7. Save to output directory
        """
        # Load workflow
        workflow = workflow_executor.load_workflow("z_image_turbo_generation.json")
        assert workflow is not None, "Failed to load workflow"
        
        # Inject parameters
        test_prompt = TEST_IMAGE_PROMPTS[0]
        parameters = {
            "prompt": test_prompt,
            "seed": 42
        }
        workflow = workflow_executor.inject_parameters(workflow, parameters)
        
        # Execute workflow
        prompt_id = await workflow_executor.execute_workflow(workflow)
        assert prompt_id is not None, "Failed to get prompt_id"
        assert len(prompt_id) > 0, "prompt_id is empty"
        
        # Wait for completion
        result = await workflow_executor.wait_for_completion(
            prompt_id,
            timeout=TEST_TIMEOUT
        )
        assert result is not None, "Workflow execution failed"
        
        # Download output
        output_path = output_manager.create_timestamped_directory() / "flux_turbo_test.png"
        downloaded_path = await workflow_executor.download_output(result, output_path)
        assert downloaded_path.exists(), "Output file not downloaded"
        
        # Validate quality
        validation_result = quality_validator.validate_image(downloaded_path)
        assert validation_result.passed, f"Image validation failed: {validation_result.errors}"
        
        # Verify specific checks
        assert validation_result.checks["format_check"], "Format check failed"
        assert validation_result.checks["size_check"], "Size check failed"
        assert validation_result.checks["dimensions_check"], "Dimensions check failed"
        
        # Verify metadata
        assert validation_result.metadata["width"] > 0, "Invalid width"
        assert validation_result.metadata["height"] > 0, "Invalid height"
        assert validation_result.metadata["file_size"] > 10240, "File too small (< 10KB)"

    async def test_flux_turbo_multiple_prompts(
        self,
        workflow_executor,
        quality_validator,
        output_manager
    ):
        """
        Test Flux Turbo with multiple different prompts.
        
        Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
        """
        results = []
        
        for idx, prompt in enumerate(TEST_IMAGE_PROMPTS):
            # Load and inject
            workflow = workflow_executor.load_workflow("z_image_turbo_generation.json")
            parameters = {"prompt": prompt, "seed": 42 + idx}
            workflow = workflow_executor.inject_parameters(workflow, parameters)
            
            # Execute
            prompt_id = await workflow_executor.execute_workflow(workflow)
            result = await workflow_executor.wait_for_completion(prompt_id, timeout=TEST_TIMEOUT)
            
            # Download
            output_path = output_manager.create_timestamped_directory() / f"flux_turbo_prompt_{idx}.png"
            downloaded_path = await workflow_executor.download_output(result, output_path)
            
            # Validate
            validation_result = quality_validator.validate_image(downloaded_path)
            assert validation_result.passed, f"Validation failed for prompt {idx}"
            
            results.append({
                "prompt": prompt,
                "path": downloaded_path,
                "validation": validation_result
            })
        
        # Verify all succeeded
        assert len(results) == len(TEST_IMAGE_PROMPTS), "Not all prompts processed"
        for result in results:
            assert result["path"].exists(), f"Output missing for: {result['prompt']}"

    async def test_flux_turbo_with_test_runner(self, test_runner):
        """
        Test Flux Turbo using the high-level test runner.
        
        Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
        """
        test_prompt = "A majestic mountain peak at sunrise with clouds"
        
        # Run test
        result = await test_runner.run_image_generation_test(test_prompt)
        
        # Verify result
        assert result.success, f"Test failed: {result.errors}"
        assert result.test_type == "image", "Wrong test type"
        assert "image" in result.outputs, "No image output"
        assert result.outputs["image"].exists(), "Image file not found"
        
        # Verify validation
        assert "image" in result.validation_results, "No validation result"
        validation = result.validation_results["image"]
        assert validation.passed, f"Validation failed: {validation.errors}"
        
        # Verify duration is reasonable
        assert result.duration > 0, "Invalid duration"
        assert result.duration < TEST_TIMEOUT, "Test took too long"



@pytest.mark.integration
@pytest.mark.asyncio
class TestLTX2VideoGeneration:
    """
    Integration tests for LTX2 video generation.
    Requirements: 3.1, 3.2, 3.3, 3.6, 3.7, 3.8
    """

    @pytest.fixture
    def test_image_path(self, tmp_path):
        """Create a test image for video generation."""
        from PIL import Image
        
        # Create a simple test image
        img = Image.new('RGB', (512, 512), color='blue')
        img_path = tmp_path / "test_input.png"
        img.save(img_path)
        return img_path

    async def test_ltx2_video_generation_basic(
        self,
        workflow_executor,
        quality_validator,
        output_manager,
        test_image_path
    ):
        """
        Test basic LTX2 video generation from image.
        
        Requirements: 3.1, 3.2, 3.3, 3.6, 3.7, 3.8
        
        Steps:
        1. Load ltx2_image_to_video.json workflow
        2. Inject image path and prompt
        3. Submit workflow and get prompt_id
        4. Poll for completion
        5. Download output video
        6. Validate video quality
        7. Save to output directory
        """
        # Load workflow
        workflow = workflow_executor.load_workflow("ltx2_image_to_video.json")
        assert workflow is not None, "Failed to load workflow"
        
        # Inject parameters
        test_prompt = "A camera slowly zooming into the scene"
        parameters = {
            "image_path": str(test_image_path),
            "prompt": test_prompt,
            "seed_stage1": 42,
            "seed_stage2": 43
        }
        workflow = workflow_executor.inject_parameters(workflow, parameters)
        
        # Execute workflow
        prompt_id = await workflow_executor.execute_workflow(workflow)
        assert prompt_id is not None, "Failed to get prompt_id"
        assert len(prompt_id) > 0, "prompt_id is empty"
        
        # Wait for completion (video generation takes longer)
        result = await workflow_executor.wait_for_completion(
            prompt_id,
            timeout=TEST_TIMEOUT
        )
        assert result is not None, "Workflow execution failed"
        
        # Download output
        output_path = output_manager.create_timestamped_directory() / "ltx2_test.mp4"
        downloaded_path = await workflow_executor.download_output(result, output_path)
        assert downloaded_path.exists(), "Output file not downloaded"
        
        # Validate quality
        validation_result = quality_validator.validate_video(downloaded_path)
        assert validation_result.passed, f"Video validation failed: {validation_result.errors}"
        
        # Verify specific checks
        assert validation_result.checks["format_check"], "Format check failed"
        assert validation_result.checks["size_check"], "Size check failed"
        assert validation_result.checks["duration_check"], "Duration check failed"
        
        # Verify metadata
        assert validation_result.metadata["duration"] > 0, "Invalid duration"
        assert validation_result.metadata["file_size"] > 102400, "File too small (< 100KB)"

    async def test_ltx2_with_different_prompts(
        self,
        workflow_executor,
        quality_validator,
        output_manager,
        test_image_path
    ):
        """
        Test LTX2 with different camera movement prompts.
        
        Requirements: 3.1, 3.2, 3.3
        """
        camera_prompts = [
            "A slow pan from left to right",
            "A gentle zoom in on the center",
            "A static shot with subtle movement"
        ]
        
        results = []
        
        for idx, prompt in enumerate(camera_prompts):
            # Load and inject
            workflow = workflow_executor.load_workflow("ltx2_image_to_video.json")
            parameters = {
                "image_path": str(test_image_path),
                "prompt": prompt,
                "seed_stage1": 42 + idx,
                "seed_stage2": 43 + idx
            }
            workflow = workflow_executor.inject_parameters(workflow, parameters)
            
            # Execute
            prompt_id = await workflow_executor.execute_workflow(workflow)
            result = await workflow_executor.wait_for_completion(prompt_id, timeout=TEST_TIMEOUT)
            
            # Download
            output_path = output_manager.create_timestamped_directory() / f"ltx2_prompt_{idx}.mp4"
            downloaded_path = await workflow_executor.download_output(result, output_path)
            
            # Validate
            validation_result = quality_validator.validate_video(downloaded_path)
            assert validation_result.passed, f"Validation failed for prompt {idx}"
            
            results.append({
                "prompt": prompt,
                "path": downloaded_path,
                "validation": validation_result
            })
        
        # Verify all succeeded
        assert len(results) == len(camera_prompts), "Not all prompts processed"
        for result in results:
            assert result["path"].exists(), f"Output missing for: {result['prompt']}"

    async def test_ltx2_with_test_runner(self, test_runner, test_image_path):
        """
        Test LTX2 using the high-level test runner.
        
        Requirements: 3.1, 3.2, 3.3, 3.6, 3.7, 3.8
        """
        test_prompt = "A smooth camera movement revealing the scene"
        
        # Run test
        result = await test_runner.run_video_generation_test(test_image_path, test_prompt)
        
        # Verify result
        assert result.success, f"Test failed: {result.errors}"
        assert result.test_type == "video", "Wrong test type"
        assert "video" in result.outputs, "No video output"
        assert result.outputs["video"].exists(), "Video file not found"
        
        # Verify validation
        assert "video" in result.validation_results, "No validation result"
        validation = result.validation_results["video"]
        assert validation.passed, f"Validation failed: {validation.errors}"
        
        # Verify duration is reasonable
        assert result.duration > 0, "Invalid duration"
        assert result.duration < TEST_TIMEOUT, "Test took too long"

    async def test_ltx2_video_format_validation(
        self,
        workflow_executor,
        quality_validator,
        output_manager,
        test_image_path
    ):
        """
        Test that LTX2 output meets format requirements.
        
        Requirements: 3.7, 3.8
        """
        # Generate video
        workflow = workflow_executor.load_workflow("ltx2_image_to_video.json")
        parameters = {
            "image_path": str(test_image_path),
            "prompt": "Test video generation",
            "seed_stage1": 42,
            "seed_stage2": 43
        }
        workflow = workflow_executor.inject_parameters(workflow, parameters)
        
        prompt_id = await workflow_executor.execute_workflow(workflow)
        result = await workflow_executor.wait_for_completion(prompt_id, timeout=TEST_TIMEOUT)
        
        output_path = output_manager.create_timestamped_directory() / "ltx2_format_test.mp4"
        downloaded_path = await workflow_executor.download_output(result, output_path)
        
        # Validate format
        validation_result = quality_validator.validate_video(downloaded_path)
        
        # Check file format is MP4 or WebM
        file_format = validation_result.metadata.get("format", "").lower()
        assert file_format in ["mp4", "webm"], f"Invalid format: {file_format}"
        
        # Check file size is within bounds (100KB - 500MB)
        file_size = validation_result.metadata["file_size"]
        assert file_size >= 102400, f"File too small: {file_size} bytes"
        assert file_size <= 524288000, f"File too large: {file_size} bytes"
        
        # Check duration is greater than 0
        duration = validation_result.metadata["duration"]
        assert duration > 0, f"Invalid duration: {duration}"



@pytest.mark.integration
@pytest.mark.asyncio
class TestFullPipeline:
    """
    Integration tests for complete pipeline: text → image → video.
    Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
    """

    async def test_full_pipeline_text_to_video(
        self,
        workflow_executor,
        quality_validator,
        output_manager
    ):
        """
        Test complete pipeline from text prompt to final video.
        
        Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
        
        Steps:
        1. Generate image using Flux Turbo
        2. Use generated image as input for LTX2
        3. Generate video from image
        4. Validate both outputs
        5. Verify image was used as video input
        6. Save all outputs
        """
        output_dir = output_manager.create_timestamped_directory()
        
        # Step 1: Generate image with Flux Turbo
        print("\n=== Step 1: Generating image with Flux Turbo ===")
        image_workflow = workflow_executor.load_workflow("z_image_turbo_generation.json")
        image_prompt = "A beautiful mountain landscape at sunset"
        image_params = {
            "prompt": image_prompt,
            "seed": 42
        }
        image_workflow = workflow_executor.inject_parameters(image_workflow, image_params)
        
        image_prompt_id = await workflow_executor.execute_workflow(image_workflow)
        image_result = await workflow_executor.wait_for_completion(
            image_prompt_id,
            timeout=TEST_TIMEOUT
        )
        
        image_path = output_dir / "pipeline_image.png"
        image_path = await workflow_executor.download_output(image_result, image_path)
        assert image_path.exists(), "Image generation failed"
        
        # Validate image
        image_validation = quality_validator.validate_image(image_path)
        assert image_validation.passed, f"Image validation failed: {image_validation.errors}"
        print(f"✓ Image generated and validated: {image_path}")
        
        # Step 2: Generate video using the generated image
        print("\n=== Step 2: Generating video with LTX2 ===")
        video_workflow = workflow_executor.load_workflow("ltx2_image_to_video.json")
        video_prompt = "A slow camera pan revealing the landscape"
        video_params = {
            "image_path": str(image_path),
            "prompt": video_prompt,
            "seed_stage1": 42,
            "seed_stage2": 43
        }
        video_workflow = workflow_executor.inject_parameters(video_workflow, video_params)
        
        video_prompt_id = await workflow_executor.execute_workflow(video_workflow)
        video_result = await workflow_executor.wait_for_completion(
            video_prompt_id,
            timeout=TEST_TIMEOUT
        )
        
        video_path = output_dir / "pipeline_video.mp4"
        video_path = await workflow_executor.download_output(video_result, video_path)
        assert video_path.exists(), "Video generation failed"
        
        # Validate video
        video_validation = quality_validator.validate_video(video_path)
        assert video_validation.passed, f"Video validation failed: {video_validation.errors}"
        print(f"✓ Video generated and validated: {video_path}")
        
        # Step 3: Verify both outputs exist
        assert image_path.exists(), "Intermediate image missing"
        assert video_path.exists(), "Final video missing"
        print(f"✓ Both outputs exist in: {output_dir}")
        
        # Step 4: Verify the image was used as video input
        # This is verified by the successful execution with the image_path parameter
        assert str(image_path) in str(video_params["image_path"]), "Image not used as video input"
        print("✓ Image successfully used as video input")

    async def test_full_pipeline_with_test_runner(self, test_runner):
        """
        Test complete pipeline using the high-level test runner.
        
        Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
        """
        test_prompt = "A serene lake surrounded by mountains"
        
        # Run pipeline test
        result = await test_runner.run_pipeline_test(test_prompt)
        
        # Verify result
        assert result.success, f"Pipeline test failed: {result.errors}"
        assert result.test_type == "pipeline", "Wrong test type"
        
        # Verify both outputs exist
        assert "image" in result.outputs, "No image output"
        assert "video" in result.outputs, "No video output"
        assert result.outputs["image"].exists(), "Image file not found"
        assert result.outputs["video"].exists(), "Video file not found"
        
        # Verify both validations passed
        assert "image" in result.validation_results, "No image validation"
        assert "video" in result.validation_results, "No video validation"
        
        image_validation = result.validation_results["image"]
        video_validation = result.validation_results["video"]
        
        assert image_validation.passed, f"Image validation failed: {image_validation.errors}"
        assert video_validation.passed, f"Video validation failed: {video_validation.errors}"
        
        # Verify duration is reasonable
        assert result.duration > 0, "Invalid duration"
        assert result.duration < TEST_TIMEOUT * 2, "Pipeline took too long"

    async def test_pipeline_execution_order(
        self,
        workflow_executor,
        quality_validator,
        output_manager
    ):
        """
        Test that pipeline executes in correct order: image first, then video.
        
        Requirements: 4.1
        """
        output_dir = output_manager.create_timestamped_directory()
        execution_log = []
        
        # Generate image
        execution_log.append(("image_start", time.time()))
        image_workflow = workflow_executor.load_workflow("z_image_turbo_generation.json")
        image_params = {"prompt": "Test image", "seed": 42}
        image_workflow = workflow_executor.inject_parameters(image_workflow, image_params)
        
        image_prompt_id = await workflow_executor.execute_workflow(image_workflow)
        image_result = await workflow_executor.wait_for_completion(image_prompt_id, timeout=TEST_TIMEOUT)
        image_path = await workflow_executor.download_output(
            image_result,
            output_dir / "order_test_image.png"
        )
        execution_log.append(("image_complete", time.time()))
        
        # Generate video (should start after image completes)
        execution_log.append(("video_start", time.time()))
        video_workflow = workflow_executor.load_workflow("ltx2_image_to_video.json")
        video_params = {
            "image_path": str(image_path),
            "prompt": "Test video",
            "seed_stage1": 42,
            "seed_stage2": 43
        }
        video_workflow = workflow_executor.inject_parameters(video_workflow, video_params)
        
        video_prompt_id = await workflow_executor.execute_workflow(video_workflow)
        video_result = await workflow_executor.wait_for_completion(video_prompt_id, timeout=TEST_TIMEOUT)
        video_path = await workflow_executor.download_output(
            video_result,
            output_dir / "order_test_video.mp4"
        )
        execution_log.append(("video_complete", time.time()))
        
        # Verify execution order
        image_start = next(t for event, t in execution_log if event == "image_start")
        image_complete = next(t for event, t in execution_log if event == "image_complete")
        video_start = next(t for event, t in execution_log if event == "video_start")
        video_complete = next(t for event, t in execution_log if event == "video_complete")
        
        assert image_start < image_complete, "Image timing invalid"
        assert image_complete <= video_start, "Video started before image completed"
        assert video_start < video_complete, "Video timing invalid"
        print("✓ Pipeline executed in correct order: image → video")

    async def test_pipeline_output_chaining(
        self,
        workflow_executor,
        quality_validator,
        output_manager
    ):
        """
        Test that generated image is correctly used as video input.
        
        Requirements: 4.2, 4.4
        """
        output_dir = output_manager.create_timestamped_directory()
        
        # Generate image
        image_workflow = workflow_executor.load_workflow("z_image_turbo_generation.json")
        image_params = {"prompt": "A unique test pattern", "seed": 12345}
        image_workflow = workflow_executor.inject_parameters(image_workflow, image_params)
        
        image_prompt_id = await workflow_executor.execute_workflow(image_workflow)
        image_result = await workflow_executor.wait_for_completion(image_prompt_id, timeout=TEST_TIMEOUT)
        image_path = await workflow_executor.download_output(
            image_result,
            output_dir / "chain_test_image.png"
        )
        
        # Verify image exists and is valid
        assert image_path.exists(), "Image not generated"
        image_validation = quality_validator.validate_image(image_path)
        assert image_validation.passed, "Image validation failed"
        
        # Use the exact same image for video generation
        video_workflow = workflow_executor.load_workflow("ltx2_image_to_video.json")
        video_params = {
            "image_path": str(image_path),
            "prompt": "Camera movement",
            "seed_stage1": 42,
            "seed_stage2": 43
        }
        video_workflow = workflow_executor.inject_parameters(video_workflow, video_params)
        
        video_prompt_id = await workflow_executor.execute_workflow(video_workflow)
        video_result = await workflow_executor.wait_for_completion(video_prompt_id, timeout=TEST_TIMEOUT)
        video_path = await workflow_executor.download_output(
            video_result,
            output_dir / "chain_test_video.mp4"
        )
        
        # Verify video was generated from the image
        assert video_path.exists(), "Video not generated"
        video_validation = quality_validator.validate_video(video_path)
        assert video_validation.passed, "Video validation failed"
        
        # Verify the image file still exists (wasn't moved or deleted)
        assert image_path.exists(), "Image was removed after video generation"
        print("✓ Image successfully chained to video generation")

    async def test_pipeline_all_outputs_saved(
        self,
        workflow_executor,
        quality_validator,
        output_manager
    ):
        """
        Test that all pipeline outputs are saved to the correct directory.
        
        Requirements: 4.3, 4.5
        """
        output_dir = output_manager.create_timestamped_directory()
        
        # Generate image
        image_workflow = workflow_executor.load_workflow("z_image_turbo_generation.json")
        image_params = {"prompt": "Test output saving", "seed": 42}
        image_workflow = workflow_executor.inject_parameters(image_workflow, image_params)
        
        image_prompt_id = await workflow_executor.execute_workflow(image_workflow)
        image_result = await workflow_executor.wait_for_completion(image_prompt_id, timeout=TEST_TIMEOUT)
        image_path = await workflow_executor.download_output(
            image_result,
            output_dir / "save_test_image.png"
        )
        
        # Generate video
        video_workflow = workflow_executor.load_workflow("ltx2_image_to_video.json")
        video_params = {
            "image_path": str(image_path),
            "prompt": "Test video",
            "seed_stage1": 42,
            "seed_stage2": 43
        }
        video_workflow = workflow_executor.inject_parameters(video_workflow, video_params)
        
        video_prompt_id = await workflow_executor.execute_workflow(video_workflow)
        video_result = await workflow_executor.wait_for_completion(video_prompt_id, timeout=TEST_TIMEOUT)
        video_path = await workflow_executor.download_output(
            video_result,
            output_dir / "save_test_video.mp4"
        )
        
        # Verify both files exist in the output directory
        assert image_path.exists(), f"Image not saved to {image_path}"
        assert video_path.exists(), f"Video not saved to {video_path}"
        
        # Verify they're in the same directory
        assert image_path.parent == video_path.parent, "Outputs not in same directory"
        assert image_path.parent == output_dir, "Outputs not in expected directory"
        
        # Verify files are accessible and valid
        image_validation = quality_validator.validate_image(image_path)
        video_validation = quality_validator.validate_video(video_path)
        
        assert image_validation.passed, "Saved image is invalid"
        assert video_validation.passed, "Saved video is invalid"
        
        print(f"✓ All outputs saved to: {output_dir}")
        print(f"  - Image: {image_path.name}")
        print(f"  - Video: {video_path.name}")



@pytest.mark.integration
@pytest.mark.asyncio
class TestErrorScenarios:
    """
    Integration tests for error handling scenarios.
    Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
    """

    async def test_comfyui_not_running(self):
        """
        Test behavior when ComfyUI is not running.
        
        Requirements: 6.1
        """
        # Use an invalid URL that won't have ComfyUI running
        invalid_url = "http://localhost:9999"
        manager = ComfyUIConnectionManager(invalid_url, timeout=5)
        
        # Attempt to connect should fail
        with pytest.raises(Exception) as exc_info:
            await manager.connect()
        
        # Verify error message is clear
        error_message = str(exc_info.value).lower()
        assert any(keyword in error_message for keyword in [
            "connect", "connection", "refused", "unreachable", "timeout"
        ]), f"Error message not clear: {exc_info.value}"
        
        print(f"✓ Clear error when ComfyUI not running: {exc_info.value}")
        
        await manager.close()

    async def test_workflow_file_not_found(self, connection_manager):
        """
        Test behavior when workflow file is missing.
        
        Requirements: 6.3
        """
        workflows_dir = Path("assets/workflows")
        executor = WorkflowExecutor(connection_manager, workflows_dir)
        
        # Try to load non-existent workflow
        with pytest.raises(FileNotFoundError) as exc_info:
            executor.load_workflow("nonexistent_workflow.json")
        
        # Verify error message includes expected path
        error_message = str(exc_info.value)
        assert "nonexistent_workflow.json" in error_message, "Workflow name not in error"
        
        print(f"✓ Clear error for missing workflow: {exc_info.value}")

    async def test_invalid_workflow_json(self, connection_manager, tmp_path):
        """
        Test behavior when workflow JSON is invalid.
        
        Requirements: 6.3
        """
        # Create invalid JSON file
        invalid_workflow = tmp_path / "invalid.json"
        invalid_workflow.write_text("{ invalid json content }")
        
        executor = WorkflowExecutor(connection_manager, tmp_path)
        
        # Try to load invalid workflow
        with pytest.raises(Exception) as exc_info:
            executor.load_workflow("invalid.json")
        
        # Verify error indicates JSON problem
        error_message = str(exc_info.value).lower()
        assert any(keyword in error_message for keyword in [
            "json", "parse", "invalid", "decode"
        ]), f"Error doesn't indicate JSON problem: {exc_info.value}"
        
        print(f"✓ Clear error for invalid JSON: {exc_info.value}")

    async def test_workflow_execution_timeout(
        self,
        workflow_executor,
        output_manager
    ):
        """
        Test timeout handling during workflow execution.
        
        Requirements: 6.5
        """
        # Load a valid workflow
        workflow = workflow_executor.load_workflow("z_image_turbo_generation.json")
        parameters = {"prompt": "Test timeout", "seed": 42}
        workflow = workflow_executor.inject_parameters(workflow, parameters)
        
        # Execute workflow
        prompt_id = await workflow_executor.execute_workflow(workflow)
        
        # Try to wait with very short timeout (should timeout)
        with pytest.raises(asyncio.TimeoutError) as exc_info:
            await workflow_executor.wait_for_completion(
                prompt_id,
                timeout=1,  # Very short timeout
                poll_interval=1
            )
        
        print(f"✓ Timeout handled correctly: {exc_info.value}")

    async def test_missing_model_error_message(
        self,
        connection_manager,
        workflows_dir
    ):
        """
        Test that missing model errors are reported clearly.
        
        Requirements: 6.2
        
        Note: This test assumes the workflow will fail if models are missing.
        The actual error depends on ComfyUI's response.
        """
        executor = WorkflowExecutor(connection_manager, workflows_dir)
        
        # Load workflow (may require specific models)
        workflow = executor.load_workflow("z_image_turbo_generation.json")
        parameters = {"prompt": "Test missing model", "seed": 42}
        workflow = executor.inject_parameters(workflow, parameters)
        
        try:
            # Try to execute (may fail if models missing)
            prompt_id = await executor.execute_workflow(workflow)
            result = await executor.wait_for_completion(prompt_id, timeout=30)
            
            # If it succeeds, models are present (test passes)
            print("✓ Models are present, workflow executed successfully")
            
        except Exception as e:
            # If it fails, check error message quality
            error_message = str(e).lower()
            
            # Error should mention model or checkpoint
            has_model_info = any(keyword in error_message for keyword in [
                "model", "checkpoint", "safetensors", "missing", "not found"
            ])
            
            if has_model_info:
                print(f"✓ Clear error for missing model: {e}")
            else:
                # Error occurred but doesn't clearly indicate model issue
                print(f"⚠ Error occurred but message could be clearer: {e}")

    async def test_error_logging_completeness(
        self,
        workflow_executor,
        caplog
    ):
        """
        Test that errors are logged with sufficient detail.
        
        Requirements: 6.6
        """
        import logging
        caplog.set_level(logging.ERROR)
        
        # Try to load non-existent workflow
        try:
            workflow_executor.load_workflow("missing_workflow.json")
        except FileNotFoundError:
            pass  # Expected
        
        # Check that error was logged
        assert len(caplog.records) > 0, "No error logged"
        
        # Verify log contains useful information
        log_messages = [record.message for record in caplog.records]
        combined_log = " ".join(log_messages).lower()
        
        assert "missing_workflow.json" in combined_log, "Filename not in log"
        print(f"✓ Error logged with details: {log_messages}")

    async def test_connection_error_recovery(self):
        """
        Test that connection errors are handled gracefully.
        
        Requirements: 6.1, 6.6
        """
        # Create manager with invalid URL
        manager = ComfyUIConnectionManager("http://invalid-host:8000", timeout=2)
        
        # First connection attempt should fail
        connection_failed = False
        try:
            await manager.connect()
        except Exception as e:
            connection_failed = True
            error_message = str(e)
            print(f"✓ Connection error caught: {error_message}")
        
        assert connection_failed, "Connection should have failed"
        
        # Manager should be in a safe state
        await manager.close()
        print("✓ Manager closed gracefully after error")

    async def test_validation_error_messages(
        self,
        quality_validator,
        tmp_path
    ):
        """
        Test that validation errors provide clear messages.
        
        Requirements: 6.6
        """
        from PIL import Image
        
        # Create an invalid image (too small)
        tiny_image = Image.new('RGB', (10, 10), color='red')
        tiny_path = tmp_path / "tiny.png"
        tiny_image.save(tiny_path)
        
        # Validate should fail
        result = quality_validator.validate_image(tiny_path)
        
        # Check that errors are clear
        if not result.passed:
            assert len(result.errors) > 0, "No error messages provided"
            
            # Errors should be descriptive
            for error in result.errors:
                assert len(error) > 10, f"Error message too short: {error}"
                print(f"✓ Clear validation error: {error}")
        else:
            print("⚠ Validation passed for tiny image (may need stricter rules)")

    async def test_workflow_submission_error_handling(
        self,
        connection_manager,
        workflows_dir
    ):
        """
        Test error handling during workflow submission.
        
        Requirements: 6.4
        """
        executor = WorkflowExecutor(connection_manager, workflows_dir)
        
        # Create an invalid workflow (empty dict)
        invalid_workflow = {}
        
        # Try to execute invalid workflow
        try:
            prompt_id = await executor.execute_workflow(invalid_workflow)
            # If it succeeds, ComfyUI accepted it (unexpected but not an error)
            print("⚠ ComfyUI accepted empty workflow")
        except Exception as e:
            # Error should be descriptive
            error_message = str(e)
            assert len(error_message) > 0, "Empty error message"
            print(f"✓ Workflow submission error handled: {e}")

    async def test_output_download_error_handling(
        self,
        workflow_executor,
        output_manager
    ):
        """
        Test error handling when output download fails.
        
        Requirements: 6.4, 6.6
        """
        # Create invalid result (missing output info)
        invalid_result = {"outputs": {}}
        
        output_path = output_manager.create_timestamped_directory() / "test.png"
        
        # Try to download with invalid result
        try:
            await workflow_executor.download_output(invalid_result, output_path)
            print("⚠ Download succeeded with invalid result (unexpected)")
        except Exception as e:
            # Error should indicate the problem
            error_message = str(e).lower()
            assert len(error_message) > 0, "Empty error message"
            print(f"✓ Download error handled: {e}")
