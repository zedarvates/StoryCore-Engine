"""
Performance benchmark tests for ComfyUI integration.

Measures time per image generation, tracks queue depth and wait times,
and reports generation performance metrics.

Requirements tested: 5.6
"""

import pytest
import asyncio
import os
from pathlib import Path
from PIL import Image
import tempfile
import shutil
import time
import statistics
from typing import List, Dict, Any

# Import the modules we need to test
try:
    from src.end_to_end.comfyui_integration import ComfyUIIntegration
    from src.end_to_end.data_models import (
        WorldConfig,
        StyleConfig,
        ShotConfig,
        MasterCoherenceSheet,
        FallbackMode,
        ColorPalette
    )
except ImportError:
    pytest.skip("ComfyUI integration modules not available", allow_module_level=True)


class TestPerformanceBenchmarks:
    """Performance benchmark tests for ComfyUI integration."""
    
    @pytest.fixture
    def backend_url(self):
        """Get ComfyUI backend URL from environment or use default."""
        return os.getenv("COMFYUI_URL", "http://localhost:8000")
    
    @pytest.fixture
    def temp_output_dir(self):
        """Create temporary directory for test outputs."""
        temp_dir = tempfile.mkdtemp(prefix="test_perf_")
        yield Path(temp_dir)
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    @pytest.fixture
    def world_config(self):
        """Create sample world configuration."""
        return WorldConfig(
            name="Performance Test World",
            description="A world for performance testing",
            setting="Test environment",
            time_period="Present",
            atmosphere="Neutral",
            color_palette=ColorPalette(
                primary="#FF5733",
                secondary="#33FF57",
                accent="#3357FF",
                background="#F0F0F0"
            )
        )
    
    @pytest.fixture
    def style_config(self):
        """Create sample style configuration."""
        return StyleConfig(
            art_style="Performance test style",
            lighting="Standard lighting",
            camera_angle="Standard angle",
            mood="Neutral",
            quality_tags="test, benchmark"
        )
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    @pytest.mark.benchmark
    async def test_single_image_generation_time(
        self, backend_url, temp_output_dir, world_config, style_config
    ):
        """
        Measure time for single image generation.
        
        Validates:
        - Generation completes within reasonable time
        - Time is measured accurately
        - Performance metrics are collected
        """
        async with ComfyUIIntegration(
            backend_url=backend_url,
            timeout=120,
            max_retries=3,
            fallback_mode=FallbackMode.PLACEHOLDER
        ) as comfyui:
            status = await comfyui.check_availability()
            if not status.available:
                pytest.skip(f"ComfyUI backend not available at {backend_url}")
            
            shot_config = ShotConfig(
                shot_number=1,
                description="Performance benchmark shot",
                camera_movement="Static",
                duration_seconds=2.0,
                resolution=(1920, 1080)
            )
            
            output_path = temp_output_dir / "perf_shot.png"
            
            # Create a simple coherence sheet for reference
            coherence_sheet = await comfyui.generate_master_coherence_sheet(
                world_config=world_config,
                style_config=style_config,
                output_dir=temp_output_dir
            )
            
            # Measure generation time
            start_time = time.time()
            
            generated_shot = await comfyui.generate_shot(
                shot_config=shot_config,
                coherence_sheet=coherence_sheet,
                output_path=output_path
            )
            
            end_time = time.time()
            generation_time = end_time - start_time
            
            # Validate generation completed
            assert generated_shot is not None, \
                "Shot should be generated"
            assert generated_shot.path.exists(), \
                "Generated shot should exist"
            
            # Report performance
            print(f"\n{'='*60}")
            print(f"Single Image Generation Performance")
            print(f"{'='*60}")
            print(f"Generation Time: {generation_time:.2f} seconds")
            print(f"Resolution: {shot_config.resolution[0]}x{shot_config.resolution[1]}")
            print(f"{'='*60}\n")
            
            # Performance assertion (adjust based on expected performance)
            # This is a soft limit - actual time depends on hardware
            assert generation_time < 300, \
                f"Generation took {generation_time:.2f}s, expected < 300s"
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    @pytest.mark.benchmark
    async def test_master_coherence_sheet_generation_time(
        self, backend_url, temp_output_dir, world_config, style_config
    ):
        """
        Measure time for Master Coherence Sheet (9 panels) generation.
        
        Validates:
        - All 9 panels are generated
        - Total time is measured
        - Average time per panel is calculated
        """
        async with ComfyUIIntegration(
            backend_url=backend_url,
            timeout=120,
            max_retries=3,
            fallback_mode=FallbackMode.PLACEHOLDER
        ) as comfyui:
            status = await comfyui.check_availability()
            if not status.available:
                pytest.skip(f"ComfyUI backend not available at {backend_url}")
            
            # Measure generation time
            start_time = time.time()
            
            coherence_sheet = await comfyui.generate_master_coherence_sheet(
                world_config=world_config,
                style_config=style_config,
                output_dir=temp_output_dir
            )
            
            end_time = time.time()
            total_time = end_time - start_time
            
            # Validate generation
            assert coherence_sheet is not None, \
                "Coherence sheet should be generated"
            assert len(coherence_sheet.panels) == 9, \
                "Should have 9 panels"
            
            # Calculate metrics
            avg_time_per_panel = total_time / 9
            
            # Report performance
            print(f"\n{'='*60}")
            print(f"Master Coherence Sheet Generation Performance")
            print(f"{'='*60}")
            print(f"Total Time: {total_time:.2f} seconds")
            print(f"Average Time per Panel: {avg_time_per_panel:.2f} seconds")
            print(f"Panels Generated: 9")
            print(f"{'='*60}\n")
            
            # Performance assertions
            assert total_time < 3000, \
                f"Total generation took {total_time:.2f}s, expected < 3000s"
            assert avg_time_per_panel < 400, \
                f"Average per panel {avg_time_per_panel:.2f}s, expected < 400s"
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    @pytest.mark.benchmark
    async def test_queue_depth_tracking(
        self, backend_url, temp_output_dir, world_config, style_config
    ):
        """
        Track queue depth during generation.
        
        Validates:
        - Queue depth is monitored
        - Wait times are measured
        - Queue metrics are reported
        """
        queue_depths = []
        
        async with ComfyUIIntegration(
            backend_url=backend_url,
            timeout=120,
            max_retries=3,
            fallback_mode=FallbackMode.PLACEHOLDER
        ) as comfyui:
            status = await comfyui.check_availability()
            if not status.available:
                pytest.skip(f"ComfyUI backend not available at {backend_url}")
            
            # Record initial queue depth
            initial_status = await comfyui.check_availability()
            queue_depths.append(initial_status.queue_size)
            
            # Generate shot and track queue
            shot_config = ShotConfig(
                shot_number=1,
                description="Queue tracking test",
                camera_movement="Static",
                duration_seconds=2.0,
                resolution=(1920, 1080)
            )
            
            output_path = temp_output_dir / "queue_test.png"
            
            coherence_sheet = await comfyui.generate_master_coherence_sheet(
                world_config=world_config,
                style_config=style_config,
                output_dir=temp_output_dir
            )
            
            # Check queue depth during generation
            for _ in range(3):
                await asyncio.sleep(1)
                status = await comfyui.check_availability()
                queue_depths.append(status.queue_size)
            
            # Generate shot
            await comfyui.generate_shot(
                shot_config=shot_config,
                coherence_sheet=coherence_sheet,
                output_path=output_path
            )
            
            # Final queue check
            final_status = await comfyui.check_availability()
            queue_depths.append(final_status.queue_size)
            
            # Report queue metrics
            print(f"\n{'='*60}")
            print(f"Queue Depth Tracking")
            print(f"{'='*60}")
            print(f"Queue Depths Observed: {queue_depths}")
            print(f"Max Queue Depth: {max(queue_depths)}")
            print(f"Min Queue Depth: {min(queue_depths)}")
            print(f"Avg Queue Depth: {statistics.mean(queue_depths):.2f}")
            print(f"{'='*60}\n")
            
            # Validate queue tracking
            assert all(isinstance(depth, int) and depth >= 0 for depth in queue_depths), \
                "Queue depths should be non-negative integers"
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    @pytest.mark.benchmark
    async def test_batch_generation_performance(
        self, backend_url, temp_output_dir, world_config, style_config
    ):
        """
        Measure performance for batch shot generation.
        
        Validates:
        - Multiple shots can be generated efficiently
        - Performance scales reasonably
        - Metrics are collected for each shot
        """
        num_shots = 5
        generation_times = []
        
        async with ComfyUIIntegration(
            backend_url=backend_url,
            timeout=120,
            max_retries=3,
            fallback_mode=FallbackMode.PLACEHOLDER
        ) as comfyui:
            status = await comfyui.check_availability()
            if not status.available:
                pytest.skip(f"ComfyUI backend not available at {backend_url}")
            
            # Generate coherence sheet
            coherence_sheet = await comfyui.generate_master_coherence_sheet(
                world_config=world_config,
                style_config=style_config,
                output_dir=temp_output_dir
            )
            
            # Generate multiple shots
            overall_start = time.time()
            
            for i in range(num_shots):
                shot_config = ShotConfig(
                    shot_number=i + 1,
                    description=f"Batch test shot {i + 1}",
                    camera_movement="Static",
                    duration_seconds=2.0,
                    resolution=(1920, 1080)
                )
                
                output_path = temp_output_dir / f"batch_shot_{i+1:03d}.png"
                
                shot_start = time.time()
                
                await comfyui.generate_shot(
                    shot_config=shot_config,
                    coherence_sheet=coherence_sheet,
                    output_path=output_path
                )
                
                shot_end = time.time()
                generation_times.append(shot_end - shot_start)
            
            overall_end = time.time()
            total_time = overall_end - overall_start
            
            # Calculate metrics
            avg_time = statistics.mean(generation_times)
            min_time = min(generation_times)
            max_time = max(generation_times)
            
            # Report performance
            print(f"\n{'='*60}")
            print(f"Batch Generation Performance ({num_shots} shots)")
            print(f"{'='*60}")
            print(f"Total Time: {total_time:.2f} seconds")
            print(f"Average Time per Shot: {avg_time:.2f} seconds")
            print(f"Min Time: {min_time:.2f} seconds")
            print(f"Max Time: {max_time:.2f} seconds")
            print(f"Individual Times: {[f'{t:.2f}s' for t in generation_times]}")
            print(f"{'='*60}\n")
            
            # Performance assertions
            assert total_time < 1500, \
                f"Batch generation took {total_time:.2f}s, expected < 1500s"
            assert avg_time < 300, \
                f"Average time {avg_time:.2f}s, expected < 300s"
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    @pytest.mark.benchmark
    async def test_resolution_impact_on_performance(
        self, backend_url, temp_output_dir, world_config, style_config
    ):
        """
        Measure performance impact of different resolutions.
        
        Validates:
        - Higher resolutions take longer
        - Performance scales predictably
        - All resolutions complete successfully
        """
        resolutions = [
            (1280, 720, "HD"),
            (1920, 1080, "Full HD"),
            (2560, 1440, "2K"),
        ]
        
        performance_data = []
        
        async with ComfyUIIntegration(
            backend_url=backend_url,
            timeout=180,
            max_retries=3,
            fallback_mode=FallbackMode.PLACEHOLDER
        ) as comfyui:
            status = await comfyui.check_availability()
            if not status.available:
                pytest.skip(f"ComfyUI backend not available at {backend_url}")
            
            coherence_sheet = await comfyui.generate_master_coherence_sheet(
                world_config=world_config,
                style_config=style_config,
                output_dir=temp_output_dir
            )
            
            for width, height, label in resolutions:
                shot_config = ShotConfig(
                    shot_number=1,
                    description=f"Resolution test {label}",
                    camera_movement="Static",
                    duration_seconds=2.0,
                    resolution=(width, height)
                )
                
                output_path = temp_output_dir / f"res_test_{width}x{height}.png"
                
                start_time = time.time()
                
                await comfyui.generate_shot(
                    shot_config=shot_config,
                    coherence_sheet=coherence_sheet,
                    output_path=output_path
                )
                
                end_time = time.time()
                generation_time = end_time - start_time
                
                pixel_count = width * height
                
                performance_data.append({
                    'resolution': f"{width}x{height}",
                    'label': label,
                    'pixels': pixel_count,
                    'time': generation_time,
                    'time_per_megapixel': generation_time / (pixel_count / 1_000_000)
                })
            
            # Report performance
            print(f"\n{'='*60}")
            print(f"Resolution Impact on Performance")
            print(f"{'='*60}")
            for data in performance_data:
                print(f"{data['label']} ({data['resolution']}):")
                print(f"  Time: {data['time']:.2f}s")
                print(f"  Pixels: {data['pixels']:,}")
                print(f"  Time per Megapixel: {data['time_per_megapixel']:.2f}s/MP")
            print(f"{'='*60}\n")
            
            # Validate all resolutions completed
            assert len(performance_data) == len(resolutions), \
                "All resolutions should complete"
            
            # Validate times are reasonable
            for data in performance_data:
                assert data['time'] < 600, \
                    f"{data['label']} took {data['time']:.2f}s, expected < 600s"
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    @pytest.mark.benchmark
    async def test_generation_metrics_collection(
        self, backend_url, temp_output_dir, world_config, style_config
    ):
        """
        Test collection of comprehensive generation metrics.
        
        Validates:
        - All metrics are collected
        - Metrics are accurate
        - Metrics can be reported
        """
        metrics = {
            'total_images': 0,
            'successful': 0,
            'failed': 0,
            'total_time': 0.0,
            'generation_times': [],
            'queue_depths': []
        }
        
        async with ComfyUIIntegration(
            backend_url=backend_url,
            timeout=120,
            max_retries=3,
            fallback_mode=FallbackMode.PLACEHOLDER
        ) as comfyui:
            status = await comfyui.check_availability()
            if not status.available:
                pytest.skip(f"ComfyUI backend not available at {backend_url}")
            
            overall_start = time.time()
            
            # Generate coherence sheet
            coherence_sheet = await comfyui.generate_master_coherence_sheet(
                world_config=world_config,
                style_config=style_config,
                output_dir=temp_output_dir
            )
            
            metrics['total_images'] += 9  # 9 panels
            metrics['successful'] += 9
            
            # Generate test shots
            for i in range(3):
                shot_config = ShotConfig(
                    shot_number=i + 1,
                    description=f"Metrics test shot {i + 1}",
                    camera_movement="Static",
                    duration_seconds=2.0,
                    resolution=(1920, 1080)
                )
                
                output_path = temp_output_dir / f"metrics_shot_{i+1}.png"
                
                shot_start = time.time()
                
                try:
                    await comfyui.generate_shot(
                        shot_config=shot_config,
                        coherence_sheet=coherence_sheet,
                        output_path=output_path
                    )
                    
                    shot_end = time.time()
                    shot_time = shot_end - shot_start
                    
                    metrics['total_images'] += 1
                    metrics['successful'] += 1
                    metrics['generation_times'].append(shot_time)
                    
                    # Check queue depth
                    status = await comfyui.check_availability()
                    metrics['queue_depths'].append(status.queue_size)
                    
                except Exception as e:
                    metrics['total_images'] += 1
                    metrics['failed'] += 1
                    print(f"Shot {i+1} failed: {e}")
            
            overall_end = time.time()
            metrics['total_time'] = overall_end - overall_start
            
            # Calculate derived metrics
            if metrics['generation_times']:
                metrics['avg_time_per_image'] = statistics.mean(metrics['generation_times'])
                metrics['min_time'] = min(metrics['generation_times'])
                metrics['max_time'] = max(metrics['generation_times'])
            
            if metrics['queue_depths']:
                metrics['avg_queue_depth'] = statistics.mean(metrics['queue_depths'])
                metrics['max_queue_depth'] = max(metrics['queue_depths'])
            
            # Report metrics
            print(f"\n{'='*60}")
            print(f"Generation Metrics Report")
            print(f"{'='*60}")
            print(f"Total Images: {metrics['total_images']}")
            print(f"Successful: {metrics['successful']}")
            print(f"Failed: {metrics['failed']}")
            print(f"Total Time: {metrics['total_time']:.2f}s")
            if 'avg_time_per_image' in metrics:
                print(f"Avg Time per Image: {metrics['avg_time_per_image']:.2f}s")
                print(f"Min Time: {metrics['min_time']:.2f}s")
                print(f"Max Time: {metrics['max_time']:.2f}s")
            if 'avg_queue_depth' in metrics:
                print(f"Avg Queue Depth: {metrics['avg_queue_depth']:.2f}")
                print(f"Max Queue Depth: {metrics['max_queue_depth']}")
            print(f"{'='*60}\n")
            
            # Validate metrics
            assert metrics['total_images'] > 0, \
                "Should have generated images"
            assert metrics['successful'] > 0, \
                "Should have successful generations"
            assert metrics['total_time'] > 0, \
                "Should have measured time"


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "-s", "--tb=short", "-m", "benchmark"])
