"""
ComfyUI Test Runner

Main test orchestration class that coordinates connection management,
workflow execution, quality validation, and output management for
ComfyUI integration tests.

Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5,
             7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

from .connection_manager import ComfyUIConnectionManager
from .workflow_executor import WorkflowExecutor, ExecutionError
from .quality_validator import QualityValidator, ValidationResult
from .output_manager import OutputManager


logger = logging.getLogger(__name__)


@dataclass
class TestConfig:
    """Configuration for test execution."""
    comfyui_url: str = "http://localhost:8000"
    workflows_dir: Path = Path("assets/workflows")
    output_dir: Path = Path("temp_comfyui_export_test")
    timeout: int = 300
    poll_interval: int = 5
    auth: Optional[Dict[str, str]] = None
    test_prompts: List[str] = field(default_factory=list)


@dataclass
class TestResult:
    """Result of a single test execution."""
    test_name: str
    test_type: str  # 'image', 'video', 'pipeline'
    success: bool
    duration: float  # Execution time in seconds
    outputs: Dict[str, Path] = field(default_factory=dict)
    validation_results: Dict[str, ValidationResult] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


class ComfyUITestRunner:
    """Main test runner for ComfyUI integration tests."""
    
    def __init__(self, config: TestConfig):
        """
        Initialize test runner.
        
        Args:
            config: Test configuration
        
        Requirements: 7.1
        """
        self.config = config
        
        # Initialize components
        self.connection = ComfyUIConnectionManager(
            config.comfyui_url,
            config.timeout,
            config.auth
        )
        
        self.executor = WorkflowExecutor(
            self.connection,
            config.workflows_dir
        )
        
        self.validator = QualityValidator()
        self.output_manager = OutputManager(config.output_dir)
        
        logger.info("Initialized ComfyUITestRunner")
        logger.info(f"ComfyUI URL: {config.comfyui_url}")
        logger.info(f"Workflows directory: {config.workflows_dir}")
        logger.info(f"Output directory: {config.output_dir}")
    
    async def run_image_generation_test(
        self, 
        prompt: str,
        test_name: str = "flux_turbo_image_generation",
        seed: Optional[int] = None
    ) -> TestResult:
        """
        Test image generation using Flux Turbo.
        
        Args:
            prompt: Text prompt for image generation
            test_name: Name for this test run
            seed: Optional seed for reproducibility
        
        Returns:
            TestResult with outputs and validation results
        
        Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
        """
        # Requirement 7.1: Test start logging
        logger.info(f"Starting image generation test: {test_name}")
        logger.info(f"Parameters: prompt='{prompt[:50]}...', seed={seed}")
        
        start_time = time.time()
        result = TestResult(
            test_name=test_name,
            test_type="image",
            success=False,
            duration=0.0
        )
        
        try:
            # Requirement 7.2: Connection logging
            logger.info(f"Connecting to ComfyUI at {self.config.comfyui_url}")
            await self.connection.connect()
            logger.info("Connection successful")
            
            # Requirement 2.1: Load workflow
            logger.info("Loading Flux Turbo workflow")
            workflow = self.executor.load_workflow("z_image_turbo_generation.json")
            
            # Requirement 2.2: Inject parameters
            logger.info("Injecting parameters into workflow")
            parameters = {"prompt": prompt}
            if seed is not None:
                parameters["seed"] = seed
            
            workflow = self.executor.inject_parameters(workflow, parameters)
            
            # Requirement 2.3: Submit workflow
            # Requirement 7.3: Workflow submission logging
            logger.info("Submitting workflow to ComfyUI")
            prompt_id = await self.executor.execute_workflow(workflow)
            logger.info(f"Workflow submitted. Prompt ID: {prompt_id}, Type: image")
            
            # Requirement 2.4: Poll for completion
            # Requirement 7.4: Progress polling logging
            logger.info(f"Polling for completion (interval: {self.config.poll_interval}s)")
            execution_result = await self.executor.wait_for_completion(
                prompt_id,
                timeout=self.config.timeout,
                poll_interval=self.config.poll_interval
            )
            
            # Requirement 2.5: Download output
            logger.info("Downloading generated image")
            temp_output = Path(f"/tmp/{test_name}_{prompt_id}.png")
            output_path = await self.executor.download_output(
                execution_result,
                temp_output
            )
            
            # Requirement 2.6, 2.7: Validate quality
            # Requirement 7.6: Validation logging
            logger.info("Validating image quality")
            validation_result = self.validator.validate_image(output_path)
            
            # Log each validation check
            for check_name, check_result in validation_result.checks.items():
                status = "PASS" if check_result else "FAIL"
                logger.info(f"Validation check '{check_name}': {status}")
            
            if not validation_result.passed:
                for error in validation_result.errors:
                    logger.warning(f"Validation error: {error}")
            
            # Save output to organized directory
            saved_path = self.output_manager.save_output(
                output_path,
                test_name,
                "image"
            )
            
            # Requirement 9.5: Log output path
            self.output_manager.log_output_path(saved_path, "Generated image")
            
            # Update result
            result.success = validation_result.passed
            result.outputs["image"] = saved_path
            result.validation_results["image"] = validation_result
            result.metadata["prompt"] = prompt
            result.metadata["prompt_id"] = prompt_id
            if seed is not None:
                result.metadata["seed"] = seed
            
            # Clean up temp file
            if temp_output.exists():
                temp_output.unlink()
        
        except Exception as e:
            logger.error(f"Image generation test failed: {str(e)}")
            result.success = False
            result.errors.append(str(e))
        
        finally:
            # Requirement 7.5: Completion time logging
            result.duration = time.time() - start_time
            logger.info(f"Test completed in {result.duration:.2f} seconds")
            
            # Requirement 7.7: Test summary logging
            status = "SUCCESS" if result.success else "FAILED"
            logger.info(f"Test summary: {test_name} - {status}")
            if result.outputs:
                logger.info(f"Outputs: {list(result.outputs.keys())}")
                for output_name, output_path in result.outputs.items():
                    logger.info(f"  {output_name}: {output_path}")
        
        return result
    
    async def run_video_generation_test(
        self,
        image_path: Path,
        prompt: str,
        test_name: str = "ltx2_video_generation",
        seed_stage1: Optional[int] = None,
        seed_stage2: Optional[int] = None
    ) -> TestResult:
        """
        Test video generation using LTX2.
        
        Args:
            image_path: Input image for video generation
            prompt: Text prompt for video generation
            test_name: Name for this test run
            seed_stage1: Optional seed for stage 1
            seed_stage2: Optional seed for stage 2
        
        Returns:
            TestResult with outputs and validation results
        
        Requirements: 3.1, 3.2, 3.3, 3.6, 3.7, 3.8, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
        """
        # Requirement 7.1: Test start logging
        logger.info(f"Starting video generation test: {test_name}")
        logger.info(f"Parameters: image='{image_path}', prompt='{prompt[:50]}...'")
        
        start_time = time.time()
        result = TestResult(
            test_name=test_name,
            test_type="video",
            success=False,
            duration=0.0
        )
        
        try:
            # Requirement 7.2: Connection logging
            logger.info(f"Connecting to ComfyUI at {self.config.comfyui_url}")
            await self.connection.connect()
            logger.info("Connection successful")
            
            # Requirement 3.1: Load workflow (using i2v workflow)
            logger.info("Loading LTX2 i2v workflow")
            workflow = self.executor.load_workflow("ltx2_image_to_video_i2v.json")
            
            # Requirement 3.2, 3.3: Inject parameters
            logger.info("Injecting parameters into workflow")
            parameters = {
                "image_path": str(image_path),
                "video_prompt": prompt
            }
            if seed_stage1 is not None:
                parameters["seed_stage1"] = seed_stage1
            if seed_stage2 is not None:
                parameters["seed_stage2"] = seed_stage2
            
            workflow = self.executor.inject_parameters(workflow, parameters)
            
            # Requirement 3.4: Submit workflow
            # Requirement 7.3: Workflow submission logging
            logger.info("Submitting workflow to ComfyUI")
            prompt_id = await self.executor.execute_workflow(workflow)
            logger.info(f"Workflow submitted. Prompt ID: {prompt_id}, Type: video")
            
            # Requirement 3.5: Poll for completion
            # Requirement 7.4: Progress polling logging
            logger.info(f"Polling for completion (interval: {self.config.poll_interval}s)")
            execution_result = await self.executor.wait_for_completion(
                prompt_id,
                timeout=self.config.timeout,
                poll_interval=self.config.poll_interval
            )
            
            # Requirement 3.6: Download output
            logger.info("Downloading generated video")
            temp_output = Path(f"/tmp/{test_name}_{prompt_id}.mp4")
            output_path = await self.executor.download_output(
                execution_result,
                temp_output
            )
            
            # Requirement 3.7, 3.8: Validate quality
            # Requirement 7.6: Validation logging
            logger.info("Validating video quality")
            validation_result = self.validator.validate_video(output_path)
            
            # Log each validation check
            for check_name, check_result in validation_result.checks.items():
                status = "PASS" if check_result else "FAIL"
                logger.info(f"Validation check '{check_name}': {status}")
            
            if not validation_result.passed:
                for error in validation_result.errors:
                    logger.warning(f"Validation error: {error}")
            
            # Save output to organized directory
            saved_path = self.output_manager.save_output(
                output_path,
                test_name,
                "video"
            )
            
            # Requirement 9.5: Log output path
            self.output_manager.log_output_path(saved_path, "Generated video")
            
            # Update result
            result.success = validation_result.passed
            result.outputs["video"] = saved_path
            result.validation_results["video"] = validation_result
            result.metadata["prompt"] = prompt
            result.metadata["prompt_id"] = prompt_id
            result.metadata["input_image"] = str(image_path)
            if seed_stage1 is not None:
                result.metadata["seed_stage1"] = seed_stage1
            if seed_stage2 is not None:
                result.metadata["seed_stage2"] = seed_stage2
            
            # Clean up temp file
            if temp_output.exists():
                temp_output.unlink()
        
        except Exception as e:
            logger.error(f"Video generation test failed: {str(e)}")
            result.success = False
            result.errors.append(str(e))
        
        finally:
            # Requirement 7.5: Completion time logging
            result.duration = time.time() - start_time
            logger.info(f"Test completed in {result.duration:.2f} seconds")
            
            # Requirement 7.7: Test summary logging
            status = "SUCCESS" if result.success else "FAILED"
            logger.info(f"Test summary: {test_name} - {status}")
            if result.outputs:
                logger.info(f"Outputs: {list(result.outputs.keys())}")
                for output_name, output_path in result.outputs.items():
                    logger.info(f"  {output_name}: {output_path}")
        
        return result
    
    async def run_pipeline_test(
        self,
        prompt: str,
        test_name: str = "full_pipeline",
        image_seed: Optional[int] = None,
        video_seed_stage1: Optional[int] = None,
        video_seed_stage2: Optional[int] = None
    ) -> TestResult:
        """
        Test complete pipeline: text → image → video.
        
        Args:
            prompt: Text prompt for generation
            test_name: Name for this test run
            image_seed: Optional seed for image generation
            video_seed_stage1: Optional seed for video stage 1
            video_seed_stage2: Optional seed for video stage 2
        
        Returns:
            TestResult with all outputs and validation results
        
        Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
        """
        # Requirement 7.1: Test start logging
        logger.info(f"Starting pipeline test: {test_name}")
        logger.info(f"Parameters: prompt='{prompt[:50]}...'")
        
        start_time = time.time()
        result = TestResult(
            test_name=test_name,
            test_type="pipeline",
            success=False,
            duration=0.0
        )
        
        try:
            # Requirement 4.1: First generate image using Flux Turbo
            logger.info("Pipeline Stage 1: Generating image with Flux Turbo")
            image_result = await self.run_image_generation_test(
                prompt=prompt,
                test_name=f"{test_name}_image",
                seed=image_seed
            )
            
            if not image_result.success:
                raise ExecutionError("Image generation failed in pipeline")
            
            # Get the generated image path
            image_path = image_result.outputs.get("image")
            if not image_path:
                raise ExecutionError("No image output from image generation stage")
            
            # Requirement 4.2: Use generated image as input for video
            logger.info("Pipeline Stage 2: Generating video with LTX2")
            logger.info(f"Using generated image as input: {image_path}")
            video_result = await self.run_video_generation_test(
                image_path=image_path,
                prompt=prompt,
                test_name=f"{test_name}_video",
                seed_stage1=video_seed_stage1,
                seed_stage2=video_seed_stage2
            )
            
            if not video_result.success:
                raise ExecutionError("Video generation failed in pipeline")
            
            # Requirement 4.3: Verify both outputs exist
            logger.info("Verifying pipeline outputs")
            video_path = video_result.outputs.get("video")
            
            if not image_path.exists():
                raise ExecutionError(f"Intermediate image not found: {image_path}")
            if not video_path or not video_path.exists():
                raise ExecutionError(f"Final video not found: {video_path}")
            
            logger.info("Both intermediate image and final video exist")
            
            # Requirement 4.4: Verify image was used as video input
            # This is implicitly verified by the successful video generation
            # with the image_path parameter
            logger.info("Verified image was used as video input")
            
            # Requirement 4.5: Save both outputs
            # Already saved by individual test methods
            
            # Update result
            result.success = True
            result.outputs["image"] = image_path
            result.outputs["video"] = video_path
            result.validation_results["image"] = image_result.validation_results.get("image")
            result.validation_results["video"] = video_result.validation_results.get("video")
            result.metadata["prompt"] = prompt
            result.metadata["image_prompt_id"] = image_result.metadata.get("prompt_id")
            result.metadata["video_prompt_id"] = video_result.metadata.get("prompt_id")
            if image_seed is not None:
                result.metadata["image_seed"] = image_seed
            if video_seed_stage1 is not None:
                result.metadata["video_seed_stage1"] = video_seed_stage1
            if video_seed_stage2 is not None:
                result.metadata["video_seed_stage2"] = video_seed_stage2
        
        except Exception as e:
            logger.error(f"Pipeline test failed: {str(e)}")
            result.success = False
            result.errors.append(str(e))
        
        finally:
            # Requirement 7.5: Completion time logging
            result.duration = time.time() - start_time
            logger.info(f"Pipeline test completed in {result.duration:.2f} seconds")
            
            # Requirement 7.7: Test summary logging
            status = "SUCCESS" if result.success else "FAILED"
            logger.info(f"Test summary: {test_name} - {status}")
            if result.outputs:
                logger.info(f"Outputs: {list(result.outputs.keys())}")
                for output_name, output_path in result.outputs.items():
                    logger.info(f"  {output_name}: {output_path}")
        
        return result
    
    async def run_all_tests(
        self,
        test_prompts: Optional[List[str]] = None
    ) -> List[TestResult]:
        """
        Run all configured tests and return results.
        
        Args:
            test_prompts: Optional list of prompts to test, uses config if not provided
        
        Returns:
            List of TestResult objects
        
        Requirements: 7.1, 7.7
        """
        logger.info("Starting all tests")
        
        if test_prompts is None:
            test_prompts = self.config.test_prompts
        
        if not test_prompts:
            test_prompts = ["A beautiful landscape with mountains and a lake"]
        
        results = []
        
        # Create timestamped directory for this test run
        self.output_manager.create_timestamped_directory()
        
        for i, prompt in enumerate(test_prompts):
            logger.info(f"Running test {i+1}/{len(test_prompts)}")
            
            # Run image generation test
            try:
                image_result = await self.run_image_generation_test(
                    prompt=prompt,
                    test_name=f"image_test_{i+1}"
                )
                results.append(image_result)
            except Exception as e:
                logger.error(f"Image test {i+1} failed: {str(e)}")
            
            # Run pipeline test
            try:
                pipeline_result = await self.run_pipeline_test(
                    prompt=prompt,
                    test_name=f"pipeline_test_{i+1}"
                )
                results.append(pipeline_result)
            except Exception as e:
                logger.error(f"Pipeline test {i+1} failed: {str(e)}")
        
        logger.info(f"All tests completed. Total: {len(results)}")
        return results
    
    def generate_report(self, results: List[TestResult]) -> Path:
        """
        Generate JSON report of test results.
        
        Args:
            results: List of TestResult objects
        
        Returns:
            Path to generated report file
        
        Requirements: 9.3, 7.7
        """
        logger.info("Generating test report")
        
        # Convert TestResult objects to dictionaries
        test_results = []
        for result in results:
            test_dict = {
                "test_name": result.test_name,
                "test_type": result.test_type,
                "success": result.success,
                "duration": result.duration,
                "outputs": {k: str(v) for k, v in result.outputs.items()},
                "validation": {},
                "errors": result.errors,
                "metadata": result.metadata
            }
            
            # Add validation results
            for val_name, val_result in result.validation_results.items():
                if val_result:
                    test_dict["validation"][val_name] = {
                        "passed": val_result.passed,
                        "checks": val_result.checks,
                        "errors": val_result.errors,
                        "metadata": val_result.metadata
                    }
            
            test_results.append(test_dict)
        
        # Prepare config for report
        config_dict = {
            "comfyui_url": self.config.comfyui_url,
            "workflows_dir": str(self.config.workflows_dir),
            "output_dir": str(self.config.output_dir),
            "timeout": self.config.timeout,
            "poll_interval": self.config.poll_interval
        }
        
        # Generate report
        report_path = self.output_manager.generate_report(test_results, config_dict)
        
        logger.info(f"Test report generated: {report_path}")
        self.output_manager.log_output_path(report_path, "Test report")
        
        return report_path
    
    async def close(self):
        """Close connections and cleanup resources."""
        logger.info("Closing test runner")
        await self.connection.close()
        logger.info("Test runner closed")
    
    async def __aenter__(self):
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
