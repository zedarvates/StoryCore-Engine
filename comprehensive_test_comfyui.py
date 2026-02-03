#!/usr/bin/env python3
"""
Comprehensive ComfyUI Integration Test Suite

This script performs a complete validation of ComfyUI integration including
image generation, video generation, and full pipeline testing. It generates
detailed reports with performance metrics and quality validation results.

Usage:
    python comprehensive_test_comfyui.py
    python comprehensive_test_comfyui.py --url http://localhost:8188
    python comprehensive_test_comfyui.py --url http://localhost:8188 --output ./test_results
    python comprehensive_test_comfyui.py --test-type image
    python comprehensive_test_comfyui.py --test-type video --image ./test_image.png
    python comprehensive_test_comfyui.py --test-type pipeline --prompt "A serene mountain landscape"

Requirements:
    - ComfyUI server must be running
    - Required models installed (z_image_turbo_bf16.safetensors, LTX2)
    - Workflow files in assets/workflows/
    - Python 3.9+
    - All dependencies from requirements.txt

Exit Codes:
    0 - All tests passed
    1 - One or more tests failed
    2 - Setup/configuration error

Example Output:
    ================================================================================
    ComfyUI Comprehensive Test Suite
    ================================================================================
    
    Configuration:
      - ComfyUI URL: http://localhost:8000
      - Output Directory: temp_comfyui_export_test
      - Timeout: 300s
      - Test Types: image, video, pipeline
    
    Running Tests...
    
    [1/3] Image Generation Test
      ✓ Connection established
      ✓ Workflow loaded
      ✓ Image generated
      ✓ Quality validation passed
      Duration: 12.5s
    
    [2/3] Video Generation Test
      ✓ Connection established
      ✓ Workflow loaded
      ✓ Video generated
      ✓ Quality validation passed
      Duration: 45.3s
    
    [3/3] Pipeline Test
      ✓ Image generation completed
      ✓ Video generation completed
      ✓ Pipeline validation passed
      Duration: 58.7s
    
    ================================================================================
    Test Summary
    ================================================================================
    
    Total Tests: 3
    Passed: 3
    Failed: 0
    Total Duration: 116.5s
    
    Performance Metrics:
      - Average Test Duration: 38.8s
      - Image Generation: 12.5s
      - Video Generation: 45.3s
      - Full Pipeline: 58.7s
    
    Outputs:
      - Images: 2 files
      - Videos: 2 files
      - Reports: 1 file
    
    Report saved to: temp_comfyui_export_test/20260128_143022/test_report.json
"""

import argparse
import asyncio
import json
import logging
import sys
import time
from pathlib import Path
from typing import List, Optional

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent / "src"))

from comfyui_test_framework import (
    ComfyUITestRunner,
    TestConfig,
    TestResult,
    ConnectionError,
    AuthenticationError,
    TimeoutError,
)


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def print_header():
    """Print test suite header."""
    print("=" * 80)
    print("ComfyUI Comprehensive Test Suite")
    print("=" * 80)
    print()


def print_section(title: str):
    """Print section header."""
    print()
    print(f"{title}")
    print("-" * len(title))


def print_config(config: TestConfig):
    """Print test configuration."""
    print_section("Configuration")
    print(f"  - ComfyUI URL: {config.comfyui_url}")
    print(f"  - Workflows Directory: {config.workflows_dir}")
    print(f"  - Output Directory: {config.output_dir}")
    print(f"  - Timeout: {config.timeout}s")
    print(f"  - Poll Interval: {config.poll_interval}s")
    print()


def print_test_start(test_num: int, total: int, test_name: str):
    """Print test start message."""
    print()
    print(f"[{test_num}/{total}] {test_name}")


def print_test_result(result: TestResult):
    """Print test result summary."""
    status_symbol = "✓" if result.success else "✗"
    status_text = "PASSED" if result.success else "FAILED"
    
    print(f"  {status_symbol} Status: {status_text}")
    print(f"  {status_symbol} Duration: {result.duration:.2f}s")
    
    if result.outputs:
        print(f"  {status_symbol} Outputs:")
        for output_name, output_path in result.outputs.items():
            print(f"      - {output_name}: {output_path.name}")
    
    if result.validation_results:
        print(f"  {status_symbol} Validation:")
        for val_name, val_result in result.validation_results.items():
            val_status = "PASS" if val_result.passed else "FAIL"
            print(f"      - {val_name}: {val_status}")
            if not val_result.passed:
                for error in val_result.errors:
                    print(f"          Error: {error}")
    
    if result.errors:
        print(f"  ✗ Errors:")
        for error in result.errors:
            print(f"      - {error}")


def print_summary(results: List[TestResult], total_duration: float):
    """Print test summary."""
    print()
    print("=" * 80)
    print("Test Summary")
    print("=" * 80)
    print()
    
    total_tests = len(results)
    passed_tests = sum(1 for r in results if r.success)
    failed_tests = total_tests - passed_tests
    
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {failed_tests}")
    print(f"Total Duration: {total_duration:.2f}s")
    print()
    
    if results:
        print_section("Performance Metrics")
        avg_duration = sum(r.duration for r in results) / len(results)
        print(f"  - Average Test Duration: {avg_duration:.2f}s")
        
        # Group by test type
        image_tests = [r for r in results if r.test_type == "image"]
        video_tests = [r for r in results if r.test_type == "video"]
        pipeline_tests = [r for r in results if r.test_type == "pipeline"]
        
        if image_tests:
            avg_image = sum(r.duration for r in image_tests) / len(image_tests)
            print(f"  - Image Generation (avg): {avg_image:.2f}s")
        
        if video_tests:
            avg_video = sum(r.duration for r in video_tests) / len(video_tests)
            print(f"  - Video Generation (avg): {avg_video:.2f}s")
        
        if pipeline_tests:
            avg_pipeline = sum(r.duration for r in pipeline_tests) / len(pipeline_tests)
            print(f"  - Full Pipeline (avg): {avg_pipeline:.2f}s")
        
        print()
        
        # Count outputs
        total_images = sum(1 for r in results if "image" in r.outputs)
        total_videos = sum(1 for r in results if "video" in r.outputs)
        
        print_section("Outputs")
        print(f"  - Images: {total_images} files")
        print(f"  - Videos: {total_videos} files")
        print()


async def run_image_test(
    runner: ComfyUITestRunner,
    prompt: str,
    test_num: int,
    total: int
) -> TestResult:
    """Run image generation test."""
    print_test_start(test_num, total, "Image Generation Test")
    print(f"  Prompt: {prompt[:60]}...")
    
    result = await runner.run_image_generation_test(
        prompt=prompt,
        test_name=f"image_test_{test_num}"
    )
    
    print_test_result(result)
    return result


async def run_video_test(
    runner: ComfyUITestRunner,
    image_path: Path,
    prompt: str,
    test_num: int,
    total: int
) -> TestResult:
    """Run video generation test."""
    print_test_start(test_num, total, "Video Generation Test")
    print(f"  Input Image: {image_path}")
    print(f"  Prompt: {prompt[:60]}...")
    
    result = await runner.run_video_generation_test(
        image_path=image_path,
        prompt=prompt,
        test_name=f"video_test_{test_num}"
    )
    
    print_test_result(result)
    return result


async def run_pipeline_test(
    runner: ComfyUITestRunner,
    prompt: str,
    test_num: int,
    total: int
) -> TestResult:
    """Run full pipeline test."""
    print_test_start(test_num, total, "Full Pipeline Test")
    print(f"  Prompt: {prompt[:60]}...")
    
    result = await runner.run_pipeline_test(
        prompt=prompt,
        test_name=f"pipeline_test_{test_num}"
    )
    
    print_test_result(result)
    return result


async def run_comprehensive_tests(
    config: TestConfig,
    test_type: str,
    prompts: List[str],
    image_path: Optional[Path] = None
) -> List[TestResult]:
    """
    Run comprehensive test suite.
    
    Args:
        config: Test configuration
        test_type: Type of tests to run ('all', 'image', 'video', 'pipeline')
        prompts: List of prompts to test
        image_path: Optional image path for video tests
    
    Returns:
        List of test results
    """
    results = []
    
    # Create test runner
    runner = ComfyUITestRunner(config)
    
    try:
        # Test connection first
        print_section("Testing Connection")
        print(f"  Connecting to {config.comfyui_url}...")
        
        try:
            await runner.connection.connect()
            print("  ✓ Connection successful")
        except ConnectionError as e:
            print(f"  ✗ Connection failed: {e}")
            print()
            print("Please ensure ComfyUI is running and accessible.")
            return results
        except AuthenticationError as e:
            print(f"  ✗ Authentication failed: {e}")
            return results
        except TimeoutError as e:
            print(f"  ✗ Connection timeout: {e}")
            return results
        
        # Check health
        try:
            health = await runner.connection.check_health()
            print("  ✓ Health check passed")
        except Exception as e:
            print(f"  ✗ Health check failed: {e}")
        
        print()
        print("Running Tests...")
        
        # Determine which tests to run
        run_image = test_type in ["all", "image"]
        run_video = test_type in ["all", "video"]
        run_pipeline = test_type in ["all", "pipeline"]
        
        # Calculate total tests
        total_tests = 0
        if run_image:
            total_tests += len(prompts)
        if run_video:
            total_tests += len(prompts)
        if run_pipeline:
            total_tests += len(prompts)
        
        test_num = 0
        
        # Run image tests
        if run_image:
            for i, prompt in enumerate(prompts):
                test_num += 1
                try:
                    result = await run_image_test(runner, prompt, test_num, total_tests)
                    results.append(result)
                except Exception as e:
                    logger.error(f"Image test failed: {e}")
                    print(f"  ✗ Test failed with error: {e}")
        
        # Run video tests
        if run_video:
            if not image_path:
                # Use first image from image tests if available
                if results and "image" in results[0].outputs:
                    image_path = results[0].outputs["image"]
                else:
                    print()
                    print("  ✗ No input image available for video tests")
                    print("    Run image tests first or provide --image path")
            
            if image_path:
                for i, prompt in enumerate(prompts):
                    test_num += 1
                    try:
                        result = await run_video_test(
                            runner, image_path, prompt, test_num, total_tests
                        )
                        results.append(result)
                    except Exception as e:
                        logger.error(f"Video test failed: {e}")
                        print(f"  ✗ Test failed with error: {e}")
        
        # Run pipeline tests
        if run_pipeline:
            for i, prompt in enumerate(prompts):
                test_num += 1
                try:
                    result = await run_pipeline_test(runner, prompt, test_num, total_tests)
                    results.append(result)
                except Exception as e:
                    logger.error(f"Pipeline test failed: {e}")
                    print(f"  ✗ Test failed with error: {e}")
        
        # Generate report
        if results:
            print()
            print_section("Generating Report")
            report_path = runner.generate_report(results)
            print(f"  ✓ Report saved to: {report_path}")
    
    finally:
        # Close runner
        await runner.close()
    
    return results


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Comprehensive ComfyUI integration test suite",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run all tests with default prompt
  python comprehensive_test_comfyui.py
  
  # Run only image generation tests
  python comprehensive_test_comfyui.py --test-type image
  
  # Run video tests with custom image
  python comprehensive_test_comfyui.py --test-type video --image ./my_image.png
  
  # Run pipeline test with custom prompt
  python comprehensive_test_comfyui.py --test-type pipeline --prompt "A serene lake"
  
  # Run all tests with custom configuration
  python comprehensive_test_comfyui.py --url http://localhost:8000 --output ./results --timeout 600

Exit Codes:
  0 - All tests passed
  1 - One or more tests failed
  2 - Setup/configuration error
        """
    )
    
    parser.add_argument(
        "--url",
        type=str,
        default="http://localhost:8000",
        help="ComfyUI server URL (default: http://localhost:8000)"
    )
    
    parser.add_argument(
        "--workflows-dir",
        type=Path,
        default=Path("assets/workflows"),
        help="Directory containing workflow JSON files (default: assets/workflows)"
    )
    
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("temp_comfyui_export_test"),
        help="Output directory for test results (default: temp_comfyui_export_test)"
    )
    
    parser.add_argument(
        "--timeout",
        type=int,
        default=300,
        help="Workflow execution timeout in seconds (default: 300)"
    )
    
    parser.add_argument(
        "--poll-interval",
        type=int,
        default=5,
        help="Status polling interval in seconds (default: 5)"
    )
    
    parser.add_argument(
        "--test-type",
        type=str,
        choices=["all", "image", "video", "pipeline"],
        default="all",
        help="Type of tests to run (default: all)"
    )
    
    parser.add_argument(
        "--prompt",
        type=str,
        action="append",
        help="Test prompt (can be specified multiple times)"
    )
    
    parser.add_argument(
        "--image",
        type=Path,
        help="Input image for video tests"
    )
    
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging"
    )
    
    args = parser.parse_args()
    
    # Configure logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Validate inputs
    if args.test_type == "video" and not args.image and args.test_type != "all":
        print("Error: Video tests require --image argument")
        sys.exit(2)
    
    if args.image and not args.image.exists():
        print(f"Error: Image file not found: {args.image}")
        sys.exit(2)
    
    if not args.workflows_dir.exists():
        print(f"Error: Workflows directory not found: {args.workflows_dir}")
        sys.exit(2)
    
    # Prepare prompts
    prompts = args.prompt if args.prompt else [
        "A beautiful landscape with mountains and a lake at sunset"
    ]
    
    # Create test configuration
    config = TestConfig(
        comfyui_url=args.url,
        workflows_dir=args.workflows_dir,
        output_dir=args.output,
        timeout=args.timeout,
        poll_interval=args.poll_interval,
        test_prompts=prompts
    )
    
    # Print header
    print_header()
    print_config(config)
    
    # Run tests
    start_time = time.time()
    
    try:
        results = asyncio.run(
            run_comprehensive_tests(
                config=config,
                test_type=args.test_type,
                prompts=prompts,
                image_path=args.image
            )
        )
    except KeyboardInterrupt:
        print()
        print("Tests interrupted by user")
        sys.exit(2)
    except Exception as e:
        print()
        print(f"Fatal error: {e}")
        logger.exception("Fatal error during test execution")
        sys.exit(2)
    
    total_duration = time.time() - start_time
    
    # Print summary
    print_summary(results, total_duration)
    
    # Determine exit code
    if not results:
        print("No tests were run")
        sys.exit(2)
    
    failed_tests = sum(1 for r in results if not r.success)
    
    if failed_tests > 0:
        print(f"✗ {failed_tests} test(s) failed")
        sys.exit(1)
    else:
        print("✓ All tests passed")
        sys.exit(0)


if __name__ == "__main__":
    main()
