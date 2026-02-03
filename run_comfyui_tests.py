#!/usr/bin/env python3
"""
ComfyUI Integration Test Runner - Command Line Interface

Main entry point for running ComfyUI integration tests with configurable
parameters via command-line arguments and environment variables.

Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6

Usage:
    # Run all tests with defaults
    python run_comfyui_tests.py
    
    # Run specific test type
    python run_comfyui_tests.py --test-type image
    python run_comfyui_tests.py --test-type video
    python run_comfyui_tests.py --test-type pipeline
    
    # Custom configuration
    python run_comfyui_tests.py --url http://localhost:8188 --timeout 600
    
    # Custom output directory
    python run_comfyui_tests.py --output-dir ./my_test_results
    
    # Custom workflows directory
    python run_comfyui_tests.py --workflows-dir ./my_workflows
    
    # With custom prompts
    python run_comfyui_tests.py --prompt "A beautiful sunset" --prompt "A futuristic city"
    
    # Using environment variables
    export COMFYUI_URL=http://localhost:8188
    export COMFYUI_TIMEOUT=600
    export COMFYUI_OUTPUT_DIR=./test_results
    python run_comfyui_tests.py
"""

import argparse
import asyncio
import logging
import os
import sys
from pathlib import Path
from typing import List, Optional

# Add src directory to path for imports
sys.path.insert(0, str(Path(__file__).parent / "src"))

from comfyui_test_framework.test_runner import (
    ComfyUITestRunner,
    TestConfig,
    TestResult
)


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('comfyui_tests.log')
    ]
)

logger = logging.getLogger(__name__)


def parse_arguments() -> argparse.Namespace:
    """
    Parse command-line arguments.
    
    Returns:
        Parsed arguments namespace
    
    Requirements: 8.1, 8.2, 8.3, 8.4, 8.6
    """
    parser = argparse.ArgumentParser(
        description='ComfyUI Integration Test Runner',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run all tests with defaults
  %(prog)s
  
  # Run only image generation tests
  %(prog)s --test-type image
  
  # Run with custom ComfyUI URL
  %(prog)s --url http://localhost:8188
  
  # Run with custom timeout and output directory
  %(prog)s --timeout 600 --output-dir ./my_results
  
  # Run with custom prompts
  %(prog)s --prompt "A sunset" --prompt "A city"
  
Environment Variables:
  COMFYUI_URL          ComfyUI server URL (default: http://localhost:8000)
  COMFYUI_TIMEOUT      Test timeout in seconds (default: 300)
  COMFYUI_OUTPUT_DIR   Output directory path (default: temp_comfyui_export_test)
  COMFYUI_WORKFLOWS_DIR Workflows directory path (default: assets/workflows)
  COMFYUI_TEST_TYPE    Test type to run (image, video, pipeline, or all)
        """
    )
    
    # Requirement 8.1: ComfyUI URL configuration
    parser.add_argument(
        '--url',
        type=str,
        default=None,
        help='ComfyUI server URL (default: http://localhost:8000, or COMFYUI_URL env var)'
    )
    
    # Requirement 8.2: Output directory configuration
    parser.add_argument(
        '--output-dir',
        type=str,
        default=None,
        help='Output directory for test results (default: temp_comfyui_export_test, or COMFYUI_OUTPUT_DIR env var)'
    )
    
    # Requirement 8.3: Timeout configuration
    parser.add_argument(
        '--timeout',
        type=int,
        default=None,
        help='Test timeout in seconds (default: 300, or COMFYUI_TIMEOUT env var)'
    )
    
    # Requirement 8.4: Test selection configuration
    parser.add_argument(
        '--test-type',
        type=str,
        choices=['image', 'video', 'pipeline', 'all'],
        default=None,
        help='Type of test to run (default: all, or COMFYUI_TEST_TYPE env var)'
    )
    
    # Requirement 8.6: Workflow path configuration
    parser.add_argument(
        '--workflows-dir',
        type=str,
        default=None,
        help='Directory containing workflow JSON files (default: assets/workflows, or COMFYUI_WORKFLOWS_DIR env var)'
    )
    
    # Additional options
    parser.add_argument(
        '--prompt',
        type=str,
        action='append',
        dest='prompts',
        help='Test prompt (can be specified multiple times)'
    )
    
    parser.add_argument(
        '--poll-interval',
        type=int,
        default=5,
        help='Polling interval in seconds (default: 5)'
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )
    
    parser.add_argument(
        '--no-report',
        action='store_true',
        help='Skip generating JSON report'
    )
    
    return parser.parse_args()


def get_config_from_args(args: argparse.Namespace) -> TestConfig:
    """
    Create TestConfig from command-line arguments and environment variables.
    
    Args:
        args: Parsed command-line arguments
    
    Returns:
        TestConfig object
    
    Requirements: 8.1, 8.2, 8.3, 8.5, 8.6
    """
    # Requirement 8.5: Environment variable override
    # Priority: command-line args > environment variables > defaults
    
    # Requirement 8.1: ComfyUI URL
    comfyui_url = (
        args.url or 
        os.environ.get('COMFYUI_URL') or 
        'http://localhost:8000'
    )
    
    # Requirement 8.2: Output directory
    output_dir = Path(
        args.output_dir or 
        os.environ.get('COMFYUI_OUTPUT_DIR') or 
        'temp_comfyui_export_test'
    )
    
    # Requirement 8.3: Timeout
    timeout = (
        args.timeout or 
        int(os.environ.get('COMFYUI_TIMEOUT', '300'))
    )
    
    # Requirement 8.6: Workflows directory
    workflows_dir = Path(
        args.workflows_dir or 
        os.environ.get('COMFYUI_WORKFLOWS_DIR') or 
        'assets/workflows'
    )
    
    # Test prompts
    test_prompts = args.prompts or []
    if not test_prompts:
        # Default test prompts
        test_prompts = [
            "A beautiful landscape with mountains and a lake",
            "A futuristic city at night with neon lights"
        ]
    
    config = TestConfig(
        comfyui_url=comfyui_url,
        workflows_dir=workflows_dir,
        output_dir=output_dir,
        timeout=timeout,
        poll_interval=args.poll_interval,
        test_prompts=test_prompts
    )
    
    return config


async def run_image_tests(
    runner: ComfyUITestRunner,
    prompts: List[str]
) -> List[TestResult]:
    """
    Run image generation tests only.
    
    Args:
        runner: Test runner instance
        prompts: List of test prompts
    
    Returns:
        List of test results
    
    Requirements: 8.4
    """
    logger.info("Running image generation tests only")
    results = []
    
    for i, prompt in enumerate(prompts):
        logger.info(f"Image test {i+1}/{len(prompts)}")
        try:
            result = await runner.run_image_generation_test(
                prompt=prompt,
                test_name=f"image_test_{i+1}"
            )
            results.append(result)
        except Exception as e:
            logger.error(f"Image test {i+1} failed: {str(e)}")
    
    return results


async def run_video_tests(
    runner: ComfyUITestRunner,
    prompts: List[str]
) -> List[TestResult]:
    """
    Run video generation tests only.
    
    Args:
        runner: Test runner instance
        prompts: List of test prompts
    
    Returns:
        List of test results
    
    Requirements: 8.4
    """
    logger.info("Running video generation tests only")
    results = []
    
    # First generate images to use as input
    logger.info("Generating input images for video tests")
    image_paths = []
    
    for i, prompt in enumerate(prompts):
        logger.info(f"Generating input image {i+1}/{len(prompts)}")
        try:
            image_result = await runner.run_image_generation_test(
                prompt=prompt,
                test_name=f"video_input_image_{i+1}"
            )
            if image_result.success and "image" in image_result.outputs:
                image_paths.append(image_result.outputs["image"])
            else:
                logger.error(f"Failed to generate input image {i+1}")
        except Exception as e:
            logger.error(f"Input image generation {i+1} failed: {str(e)}")
    
    # Now run video tests with generated images
    for i, (prompt, image_path) in enumerate(zip(prompts, image_paths)):
        logger.info(f"Video test {i+1}/{len(image_paths)}")
        try:
            result = await runner.run_video_generation_test(
                image_path=image_path,
                prompt=prompt,
                test_name=f"video_test_{i+1}"
            )
            results.append(result)
        except Exception as e:
            logger.error(f"Video test {i+1} failed: {str(e)}")
    
    return results


async def run_pipeline_tests(
    runner: ComfyUITestRunner,
    prompts: List[str]
) -> List[TestResult]:
    """
    Run full pipeline tests only.
    
    Args:
        runner: Test runner instance
        prompts: List of test prompts
    
    Returns:
        List of test results
    
    Requirements: 8.4
    """
    logger.info("Running full pipeline tests only")
    results = []
    
    for i, prompt in enumerate(prompts):
        logger.info(f"Pipeline test {i+1}/{len(prompts)}")
        try:
            result = await runner.run_pipeline_test(
                prompt=prompt,
                test_name=f"pipeline_test_{i+1}"
            )
            results.append(result)
        except Exception as e:
            logger.error(f"Pipeline test {i+1} failed: {str(e)}")
    
    return results


async def run_all_tests(
    runner: ComfyUITestRunner,
    prompts: List[str]
) -> List[TestResult]:
    """
    Run all test types.
    
    Args:
        runner: Test runner instance
        prompts: List of test prompts
    
    Returns:
        List of test results
    
    Requirements: 8.4
    """
    logger.info("Running all test types")
    results = []
    
    # Run image tests
    image_results = await run_image_tests(runner, prompts)
    results.extend(image_results)
    
    # Run pipeline tests
    pipeline_results = await run_pipeline_tests(runner, prompts)
    results.extend(pipeline_results)
    
    return results


def print_summary(results: List[TestResult]):
    """
    Print test summary to console.
    
    Args:
        results: List of test results
    """
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    total = len(results)
    passed = sum(1 for r in results if r.success)
    failed = total - passed
    
    print(f"\nTotal tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if results:
        total_duration = sum(r.duration for r in results)
        print(f"Total duration: {total_duration:.2f} seconds")
        print(f"Average duration: {total_duration/total:.2f} seconds")
    
    print("\nTest Details:")
    print("-" * 80)
    
    for result in results:
        status = "✓ PASS" if result.success else "✗ FAIL"
        print(f"{status} | {result.test_name} ({result.test_type}) | {result.duration:.2f}s")
        
        if result.outputs:
            for output_name, output_path in result.outputs.items():
                print(f"       Output: {output_name} -> {output_path}")
        
        if result.errors:
            for error in result.errors:
                print(f"       Error: {error}")
    
    print("="*80 + "\n")


async def main():
    """
    Main entry point for CLI.
    
    Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
    """
    # Parse arguments
    args = parse_arguments()
    
    # Configure logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Get configuration
    config = get_config_from_args(args)
    
    # Requirement 8.4: Test selection logic
    test_type = (
        args.test_type or 
        os.environ.get('COMFYUI_TEST_TYPE') or 
        'all'
    )
    
    # Log configuration
    logger.info("="*80)
    logger.info("ComfyUI Integration Test Runner")
    logger.info("="*80)
    logger.info(f"ComfyUI URL: {config.comfyui_url}")
    logger.info(f"Workflows directory: {config.workflows_dir}")
    logger.info(f"Output directory: {config.output_dir}")
    logger.info(f"Timeout: {config.timeout} seconds")
    logger.info(f"Poll interval: {config.poll_interval} seconds")
    logger.info(f"Test type: {test_type}")
    logger.info(f"Test prompts: {len(config.test_prompts)}")
    logger.info("="*80 + "\n")
    
    # Validate workflows directory exists
    if not config.workflows_dir.exists():
        logger.error(f"Workflows directory not found: {config.workflows_dir}")
        logger.error("Please ensure the workflows directory exists and contains workflow JSON files")
        return 1
    
    # Create output directory if it doesn't exist
    config.output_dir.mkdir(parents=True, exist_ok=True)
    
    # Initialize test runner
    runner = ComfyUITestRunner(config)
    
    try:
        # Run tests based on selection
        if test_type == 'image':
            results = await run_image_tests(runner, config.test_prompts)
        elif test_type == 'video':
            results = await run_video_tests(runner, config.test_prompts)
        elif test_type == 'pipeline':
            results = await run_pipeline_tests(runner, config.test_prompts)
        else:  # 'all'
            results = await run_all_tests(runner, config.test_prompts)
        
        # Generate report unless disabled
        if not args.no_report:
            report_path = runner.generate_report(results)
            logger.info(f"Test report saved to: {report_path}")
        
        # Print summary
        print_summary(results)
        
        # Determine exit code
        # Requirement 8.1: Exit codes (0 for success, 1 for failure)
        all_passed = all(r.success for r in results)
        exit_code = 0 if all_passed else 1
        
        if all_passed:
            logger.info("All tests passed!")
        else:
            logger.warning("Some tests failed. See details above.")
        
        return exit_code
    
    except KeyboardInterrupt:
        logger.info("\nTest execution interrupted by user")
        return 130  # Standard exit code for SIGINT
    
    except Exception as e:
        logger.error(f"Test execution failed: {str(e)}", exc_info=True)
        return 1
    
    finally:
        # Cleanup
        await runner.close()


if __name__ == '__main__':
    # Run async main and exit with appropriate code
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
