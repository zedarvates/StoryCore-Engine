"""
Wan Video Integration Module

Provides integration with Wan Video 2.2 models for:
- Video inpainting with multi-stage processing
- Alpha channel video generation
- LoRA-accelerated inference
- Dual image guidance system
- Transparent background support
- Compositing pipeline integration

Author: StoryCore-Engine Team
Date: 2026-01-14

This module has been refactored into smaller modules in src/wan_integration/
All functionality is preserved through imports.
"""

# Import all functionality from the refactored modules
try:
    from .wan_integration import *
except ImportError:
    from src.wan_integration import *


# Example usage (preserved from original)
if __name__ == "__main__":
    import asyncio

    async def example_usage():
        # Create configuration
        config = WanVideoConfig(
            width=720,
            height=480,
            num_frames=81,
            enable_inpainting=True,
            enable_alpha=True,
            enable_lora=True
        )

        # Create integration with non-blocking features
        integration = WanVideoIntegration(
            config,
            timeout_seconds=300.0,
            enable_circuit_breaker=True
        )

        try:
            # Example 1: Load models with timeout
            print("Loading models...")
            await integration.load_models()
            print("Models loaded successfully")

            # Example 2: Generate transparent video
            print("\nGenerating transparent video...")
            rgba_frames = await integration.create_transparent_video(
                prompt="A floating ghost character with transparent background",
                alpha_mode=AlphaChannelMode.THRESHOLD,
                timeout=60.0
            )
            print(f"Generated {len(rgba_frames)} RGBA frames")

            # Example 3: Video inpainting
            if Image:
                print("\nGenerating inpainted video...")
                # Create mock input frames
                input_frames = [
                    Image.new('RGB', (720, 480), (100, 100, 100))
                    for _ in range(10)
                ]

                # Create mask
                mask = InpaintingMask(
                    mask_image=Image.new('L', (720, 480), 255),
                    blur_radius=4
                )

                inpainted_frames = await integration.generate_video_with_inpainting(
                    prompt="Fill the masked area with a beautiful landscape",
                    video_frames=input_frames,
                    mask=mask,
                    use_multi_stage=True,
                    timeout=120.0
                )
                print(f"Inpainted {len(inpainted_frames)} frames")

            # Example 4: Test cancellation
            print("\nTesting cancellation...")
            async def long_operation():
                await asyncio.sleep(10)
                return await integration.create_transparent_video(
                    prompt="This should be cancelled",
                    timeout=5.0
                )

            # Start operation and cancel it
            task = asyncio.create_task(long_operation())
            await asyncio.sleep(0.1)
            integration.request_cancellation()

            try:
                await task
            except asyncio.CancelledError:
                print("Operation cancelled successfully")

            # Print statistics
            stats = integration.get_stats()
            print(f"\nStatistics:")
            print(f"  Total frames: {stats['total_frames']}")
            print(f"  Inpainting count: {stats['inpainting_count']}")
            print(f"  Alpha generation count: {stats['alpha_generation_count']}")
            print(f"  Timeouts: {stats['timeouts']}")
            print(f"  Failures: {stats['failures']}")
            print(f"  Cancellations: {stats['cancellations']}")
            print(f"  Circuit breaker: {stats['circuit_breaker_status']}")

            # Get model info
            model_info = integration.get_model_info()
            print(f"\nModel Info:")
            print(f"  Models loaded: {model_info['model_loaded']}")
            print(f"  Circuit breaker open: {model_info['circuit_breaker']['open']}")
            print(f"  Failure count: {model_info['circuit_breaker']['failure_count']}")

        except asyncio.TimeoutError as e:
            print(f"Operation timed out: {e}")
        except RuntimeError as e:
            print(f"Runtime error: {e}")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            # Cleanup
            await integration.cleanup()
            print("\nCleanup complete")

    # Run example
    asyncio.run(example_usage())
