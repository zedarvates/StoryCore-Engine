#!/usr/bin/env python3
"""
Integration Test Script for Wan Video Task 2.2
Tests real ComfyUI integration for inpainting, alpha channel, and dual guidance
"""

import asyncio
import time
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import json
import sys
import os

# Add src to path for imports (same as existing tests)
sys.path.insert(0, str(Path(__file__).parent / "src"))

try:
    from PIL import Image
    import numpy as np
except ImportError as e:
    print(f"ERROR: PIL not available: {e}")
    sys.exit(1)

try:
    from wan_video_integration import (
        WanVideoIntegration,
        InpaintingMask,
        DualImageGuidance,
        AlphaChannelMode
    )
    from advanced_workflow_config import WanVideoConfig
except ImportError as e:
    print(f"ERROR: Cannot import WanVideoIntegration: {e}")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class IntegrationTestRunner:
    """Runs integration tests for Wan Video Task 2.2"""

    def __init__(self, comfyui_base_url: str = "http://127.0.0.1:8188"):
        self.comfyui_base_url = comfyui_base_url
        self.results: Dict[str, Any] = {}
        self.assets_path = Path("assets")

    def find_test_images(self, count: int = 2) -> List[Path]:
        """Find test images from assets"""
        test_images = []

        # Try small_files first
        small_files = list(self.assets_path.glob("small_files/*.jpg"))
        small_files.extend(list(self.assets_path.glob("small_files/*.png")))

        if len(small_files) >= count:
            test_images = small_files[:count]
        else:
            # Try jpg_files
            jpg_files = list(self.assets_path.glob("jpg_files/*.jpg"))
            test_images = (small_files + jpg_files)[:count]

        if len(test_images) < count:
            logger.warning(f"Only found {len(test_images)} test images, expected {count}")

        return test_images

    def create_test_mask(self, width: int, height: int) -> InpaintingMask:
        """Create a simple test mask"""
        # Create a circular mask in the center
        mask_array = np.ones((height, width), dtype=np.uint8) * 255

        # Create a circular mask (white = process, black = keep)
        center_x, center_y = width // 2, height // 2
        radius = min(width, height) // 4

        y, x = np.ogrid[:height, :width]
        mask = (x - center_x) ** 2 + (y - center_y) ** 2 <= radius ** 2
        mask_array[mask] = 0  # Black in center = keep original

        mask_image = Image.fromarray(mask_array, mode='L')
        return InpaintingMask(mask_image=mask_image, blur_radius=2, feather_amount=1)

    def create_dual_guidance(self, reference_path: Path, style_path: Optional[Path] = None) -> DualImageGuidance:
        """Create dual image guidance from test images"""
        reference_image = Image.open(reference_path).convert('RGB')

        style_image = None
        if style_path:
            style_image = Image.open(style_path).convert('RGB')

        return DualImageGuidance(
            reference_image=reference_image,
            style_image=style_image,
            reference_strength=0.8,
            style_strength=0.5,
            blend_mode="linear"
        )

    async def test_generate_video_with_inpainting(self) -> Dict[str, Any]:
        """Test inpainting functionality"""
        start_time = time.time()
        result = {
            "test_name": "generate_video_with_inpainting",
            "success": False,
            "error": None,
            "execution_time": 0.0,
            "frames_generated": 0,
            "output_type": None,
            "details": {}
        }

        try:
            logger.info("Starting inpainting test...")

            # Find test images
            test_images = self.find_test_images(2)
            if len(test_images) < 2:
                raise RuntimeError(f"Need at least 2 test images, found {len(test_images)}")

            # Load start and end images
            start_image = Image.open(test_images[0]).convert('RGB').resize((832, 480))
            end_image = Image.open(test_images[1]).convert('RGB').resize((832, 480))

            # Create video frames (simple interpolation between start and end)
            video_frames = []
            for i in range(16):  # 16 frames
                alpha = i / 15.0
                blended = Image.blend(start_image, end_image, alpha)
                video_frames.append(blended)

            # Create mask
            mask = self.create_test_mask(832, 480)

            # Create config
            config = WanVideoConfig(
                width=832,
                height=480,
                num_frames=16,
                enable_inpainting=True
            )

            # Create integration
            integration = WanVideoIntegration(
                config=config,
                comfyui_base_url=self.comfyui_base_url,
                timeout_seconds=60.0
            )

            # Test inpainting
            inpainted_frames = await integration.generate_video_with_inpainting(
                prompt="Fill the masked area with a beautiful mountain landscape",
                video_frames=video_frames,
                mask=mask,
                use_multi_stage=True,
                timeout=45.0
            )

            # Validate result
            if not isinstance(inpainted_frames, list):
                raise ValueError(f"Expected list of frames, got {type(inpainted_frames)}")

            if len(inpainted_frames) == 0:
                raise ValueError("No frames generated")

            # Check frame types
            for i, frame in enumerate(inpainted_frames):
                if not isinstance(frame, Image.Image):
                    raise ValueError(f"Frame {i} is not PIL Image, got {type(frame)}")

            result["success"] = True
            result["frames_generated"] = len(inpainted_frames)
            result["output_type"] = "list_pil_images"
            result["details"] = {
                "input_frames": len(video_frames),
                "mask_applied": True,
                "prompt_used": "Fill the masked area with a beautiful mountain landscape"
            }

            await integration.cleanup()

        except Exception as e:
            result["error"] = str(e)
            logger.error(f"Inpainting test failed: {e}")

        finally:
            result["execution_time"] = time.time() - start_time

        return result

    async def test_generate_video_with_alpha(self) -> Dict[str, Any]:
        """Test alpha channel generation"""
        start_time = time.time()
        result = {
            "test_name": "generate_video_with_alpha",
            "success": False,
            "error": None,
            "execution_time": 0.0,
            "frames_generated": 0,
            "alpha_masks_generated": 0,
            "output_type": None,
            "details": {}
        }

        try:
            logger.info("Starting alpha channel test...")

            # Create config
            config = WanVideoConfig(
                width=832,
                height=480,
                num_frames=16,
                enable_alpha=True,
                alpha_threshold=0.5
            )

            # Create integration
            integration = WanVideoIntegration(
                config=config,
                comfyui_base_url=self.comfyui_base_url,
                timeout_seconds=60.0
            )

            # Test alpha generation
            rgb_frames, alpha_masks = await integration.generate_video_with_alpha(
                prompt="A floating crystal with transparent background",
                width=832,
                height=480,
                num_frames=16,
                alpha_mode=AlphaChannelMode.THRESHOLD,
                timeout=45.0
            )

            # Validate result
            if not isinstance(rgb_frames, list) or not isinstance(alpha_masks, list):
                raise ValueError(f"Expected tuple of lists, got {type(rgb_frames)}, {type(alpha_masks)}")

            if len(rgb_frames) != len(alpha_masks):
                raise ValueError(f"RGB frames ({len(rgb_frames)}) != alpha masks ({len(alpha_masks)})")

            if len(rgb_frames) == 0:
                raise ValueError("No frames generated")

            # Check frame types
            for i, (rgb_frame, alpha_mask) in enumerate(zip(rgb_frames, alpha_masks)):
                if not isinstance(rgb_frame, Image.Image):
                    raise ValueError(f"RGB frame {i} is not PIL Image, got {type(rgb_frame)}")
                if not isinstance(alpha_mask, Image.Image):
                    raise ValueError(f"Alpha mask {i} is not PIL Image, got {type(alpha_mask)}")

            result["success"] = True
            result["frames_generated"] = len(rgb_frames)
            result["alpha_masks_generated"] = len(alpha_masks)
            result["output_type"] = "tuple_rgb_alpha_lists"
            result["details"] = {
                "prompt_used": "A floating crystal with transparent background",
                "alpha_mode": "THRESHOLD",
                "dimensions": f"{config.width}x{config.height}"
            }

            await integration.cleanup()

        except Exception as e:
            result["error"] = str(e)
            logger.error(f"Alpha test failed: {e}")

        finally:
            result["execution_time"] = time.time() - start_time

        return result

    async def test_generate_video_with_dual_guidance(self) -> Dict[str, Any]:
        """Test dual image guidance"""
        start_time = time.time()
        result = {
            "test_name": "generate_video_with_dual_guidance",
            "success": False,
            "error": None,
            "execution_time": 0.0,
            "frames_generated": 0,
            "output_type": None,
            "details": {}
        }

        try:
            logger.info("Starting dual guidance test...")

            # Find test images
            test_images = self.find_test_images(2)
            if len(test_images) < 2:
                raise RuntimeError(f"Need at least 2 test images, found {len(test_images)}")

            # Create dual guidance
            guidance = self.create_dual_guidance(test_images[0], test_images[1])

            # Create config
            config = WanVideoConfig(
                width=832,
                height=480,
                num_frames=16
            )

            # Create integration
            integration = WanVideoIntegration(
                config=config,
                comfyui_base_url=self.comfyui_base_url,
                timeout_seconds=60.0
            )

            # Test dual guidance
            video_frames = await integration.generate_with_dual_guidance(
                prompt="Blend these two images into a smooth video transition",
                guidance=guidance,
                width=832,
                height=480,
                num_frames=16,
                timeout=45.0
            )

            # Validate result
            if not isinstance(video_frames, list):
                raise ValueError(f"Expected list of frames, got {type(video_frames)}")

            if len(video_frames) == 0:
                raise ValueError("No frames generated")

            # Check frame types
            for i, frame in enumerate(video_frames):
                if not isinstance(frame, Image.Image):
                    raise ValueError(f"Frame {i} is not PIL Image, got {type(frame)}")

            result["success"] = True
            result["frames_generated"] = len(video_frames)
            result["output_type"] = "list_pil_images"
            result["details"] = {
                "prompt_used": "Blend these two images into a smooth video transition",
                "reference_strength": guidance.reference_strength,
                "style_strength": guidance.style_strength,
                "blend_mode": guidance.blend_mode
            }

            await integration.cleanup()

        except Exception as e:
            result["error"] = str(e)
            logger.error(f"Dual guidance test failed: {e}")

        finally:
            result["execution_time"] = time.time() - start_time

        return result

    def generate_report(self) -> str:
        """Generate detailed test report"""
        report_lines = []
        report_lines.append("=" * 60)
        report_lines.append("WAN VIDEO TASK 2.2 INTEGRATION TEST REPORT")
        report_lines.append("=" * 60)
        report_lines.append("")

        total_tests = len(self.results)
        successful_tests = sum(1 for r in self.results.values() if r["success"])
        total_time = sum(r["execution_time"] for r in self.results.values())

        report_lines.append(f"Summary:")
        report_lines.append(f"  Total Tests: {total_tests}")
        report_lines.append(f"  Successful: {successful_tests}")
        report_lines.append(f"  Failed: {total_tests - successful_tests}")
        report_lines.append(".2f")
        report_lines.append(".1f")
        report_lines.append("")

        for test_name, result in self.results.items():
            report_lines.append(f"Test: {test_name}")
            report_lines.append(f"  Status: {'PASS' if result['success'] else 'FAIL'}")
            report_lines.append(".2f")

            if result["success"]:
                if "frames_generated" in result:
                    report_lines.append(f"  Frames Generated: {result['frames_generated']}")
                if "alpha_masks_generated" in result:
                    report_lines.append(f"  Alpha Masks: {result['alpha_masks_generated']}")
                if result["output_type"]:
                    report_lines.append(f"  Output Type: {result['output_type']}")

                if result["details"]:
                    report_lines.append("  Details:")
                    for k, v in result["details"].items():
                        report_lines.append(f"    {k}: {v}")
            else:
                report_lines.append(f"  Error: {result['error']}")

            report_lines.append("")

        # Performance analysis
        if total_time > 0:
            report_lines.append("Performance Analysis:")
            avg_time = total_time / total_tests
            report_lines.append(".2f")

            # Check for timeouts (>30s considered slow)
            slow_tests = [name for name, r in self.results.items() if r["execution_time"] > 30.0]
            if slow_tests:
                report_lines.append(f"  Slow Tests (>30s): {', '.join(slow_tests)}")
            else:
                report_lines.append("  All tests completed within reasonable time")
            report_lines.append("")

        return "\n".join(report_lines)

    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all integration tests"""
        logger.info("Starting Wan Video Task 2.2 integration tests")
        logger.info(f"ComfyUI URL: {self.comfyui_base_url}")

        try:
            # Test 1: Inpainting
            self.results["inpainting"] = await self.test_generate_video_with_inpainting()

            # Test 2: Alpha channel
            self.results["alpha"] = await self.test_generate_video_with_alpha()

            # Test 3: Dual guidance
            self.results["dual_guidance"] = await self.test_generate_video_with_dual_guidance()

        except Exception as e:
            logger.error(f"Test runner failed: {e}")
            self.results["runner_error"] = {
                "test_name": "test_runner",
                "success": False,
                "error": str(e),
                "execution_time": 0.0
            }

        # Generate and print report
        report = self.generate_report()
        print("\n" + report)

        return {
            "results": self.results,
            "report": report,
            "summary": {
                "total_tests": len(self.results),
                "successful": sum(1 for r in self.results.values() if r["success"]),
                "total_time": sum(r["execution_time"] for r in self.results.values())
            }
        }


async def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Wan Video Task 2.2 Integration Tests")
    parser.add_argument("--comfyui-url", default="http://127.0.0.1:8188",
                       help="ComfyUI server URL")
    parser.add_argument("--timeout", type=float, default=60.0,
                       help="Default timeout per test (seconds)")

    args = parser.parse_args()

    # Create test runner
    runner = IntegrationTestRunner(comfyui_base_url=args.comfyui_url)

    # Run tests
    test_results = await runner.run_all_tests()

    # Exit with appropriate code
    successful = test_results["summary"]["successful"]
    total = test_results["summary"]["total_tests"]

    if successful == total:
        logger.info("All tests passed!")
        sys.exit(0)
    else:
        logger.error(f"{total - successful}/{total} tests failed")
        sys.exit(1)


if __name__ == "__main__":
    # Run async main
    asyncio.run(main())