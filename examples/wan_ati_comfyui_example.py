"""
Example: Wan ATI Integration with ComfyUI

This example demonstrates how to use the Wan ATI integration with real ComfyUI
workflow execution for trajectory-based video generation.

Prerequisites:
1. ComfyUI running at localhost:8188
2. Required models downloaded (see video_wan_ati.json for model list)
3. Dependencies installed: pip install aiohttp websockets scipy

Usage:
    python examples/wan_ati_comfyui_example.py
"""

import sys
import asyncio
import logging
from pathlib import Path
from PIL import Image

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.wan_ati_integration import (
    WanATIIntegration,
    WanATIConfig,
    TrajectoryControlSystem
)
from src.comfyui_workflow_executor import ComfyUIConfig

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def example_1_simple_generation():
    """Example 1: Simple video generation with ComfyUI"""
    logger.info("=" * 60)
    logger.info("Example 1: Simple Video Generation with ComfyUI")
    logger.info("=" * 60)
    
    # Configuration
    config = WanATIConfig(
        width=720,
        height=480,
        length=81,
        steps=20,
        cfg_scale=3.0,
        trajectory_strength=220,
        trajectory_decay=10
    )
    
    # ComfyUI configuration
    comfyui_config = ComfyUIConfig(
        host="localhost",
        port=8188,
        timeout=600  # 10 minutes
    )
    
    # Initialize integration
    integration = WanATIIntegration(config, comfyui_config)
    
    # Create simple test image
    image = Image.new('RGB', (720, 480), color='skyblue')
    
    # Simple horizontal trajectory
    trajectory_json = """
    [
        [
            {"x": 100, "y": 240},
            {"x": 600, "y": 240}
        ]
    ]
    """
    
    # Parse trajectory
    trajectories = integration.trajectory_system.parse_trajectory_json(trajectory_json)
    
    # Progress callback
    def progress_callback(message: str, progress: float):
        logger.info(f"[{progress*100:.1f}%] {message}")
    
    try:
        # Generate video
        result = await integration.generate_trajectory_video(
            start_image=image,
            trajectories=trajectories,
            prompt="Camera pans horizontally across landscape",
            negative_prompt="static, blurry, low quality",
            progress_callback=progress_callback,
            seed=42
        )
        
        logger.info(f"✅ Generated {len(result['video_frames'])} frames")
        logger.info(f"Prompt ID: {result['metadata']['prompt_id']}")
        logger.info(f"Quality metrics: {result['quality_metrics']}")
        
        # Save frames
        output_dir = Path("temp_assets") / "wan_ati_output"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        for i, frame in enumerate(result['video_frames']):
            frame.save(output_dir / f"frame_{i:04d}.png")
        
        logger.info(f"Frames saved to: {output_dir}")
        
    except Exception as e:
        logger.error(f"❌ Generation failed: {e}")


async def example_2_complex_trajectory():
    """Example 2: Complex trajectory with multiple points"""
    logger.info("=" * 60)
    logger.info("Example 2: Complex Trajectory")
    logger.info("=" * 60)
    
    # Configuration
    config = WanATIConfig()
    comfyui_config = ComfyUIConfig()
    
    # Initialize
    integration = WanATIIntegration(config, comfyui_config)
    
    # Create test image
    image = Image.new('RGB', (720, 480), color='lightblue')
    
    # Complex S-curve trajectory
    trajectory_json = """
    [
        [
            {"x": 100, "y": 100},
            {"x": 200, "y": 150},
            {"x": 300, "y": 200},
            {"x": 400, "y": 250},
            {"x": 500, "y": 300},
            {"x": 600, "y": 350}
        ]
    ]
    """
    
    trajectories = integration.trajectory_system.parse_trajectory_json(trajectory_json)
    
    # Visualize trajectory
    viz_image = integration.visualize_trajectories(image, trajectories)
    viz_image.save("temp_assets/trajectory_visualization.png")
    logger.info("Trajectory visualization saved")
    
    try:
        result = await integration.generate_trajectory_video(
            start_image=image,
            trajectories=trajectories,
            prompt="Smooth camera movement following S-curve path",
            negative_prompt="static, jerky motion, low quality"
        )
        
        logger.info(f"✅ Generated {len(result['video_frames'])} frames")
        
    except Exception as e:
        logger.error(f"❌ Generation failed: {e}")


async def example_3_multi_trajectory():
    """Example 3: Multiple trajectories"""
    logger.info("=" * 60)
    logger.info("Example 3: Multiple Trajectories")
    logger.info("=" * 60)
    
    # Configuration
    config = WanATIConfig()
    comfyui_config = ComfyUIConfig()
    
    # Initialize
    integration = WanATIIntegration(config, comfyui_config)
    
    # Create test image
    image = Image.new('RGB', (720, 480), color='lightgreen')
    
    # Multiple trajectories
    trajectory_json = """
    [
        [
            {"x": 100, "y": 100},
            {"x": 600, "y": 100}
        ],
        [
            {"x": 100, "y": 380},
            {"x": 600, "y": 380}
        ]
    ]
    """
    
    trajectories = integration.trajectory_system.parse_trajectory_json(trajectory_json)
    
    # Visualize
    viz_image = integration.visualize_trajectories(image, trajectories)
    viz_image.save("temp_assets/multi_trajectory_visualization.png")
    logger.info("Multi-trajectory visualization saved")
    
    try:
        result = await integration.generate_trajectory_video(
            start_image=image,
            trajectories=trajectories,
            prompt="Two objects moving horizontally in parallel",
            negative_prompt="static, single object, low quality"
        )
        
        logger.info(f"✅ Generated {len(result['video_frames'])} frames")
        
    except Exception as e:
        logger.error(f"❌ Generation failed: {e}")


async def example_4_from_file():
    """Example 4: Load trajectory from file"""
    logger.info("=" * 60)
    logger.info("Example 4: Load Trajectory from File")
    logger.info("=" * 60)
    
    # Configuration
    config = WanATIConfig()
    comfyui_config = ComfyUIConfig()
    
    # Initialize
    integration = WanATIIntegration(config, comfyui_config)
    
    # Load image
    image_path = Path("temp_assets/test_image.png")
    if not image_path.exists():
        # Create test image if not exists
        image = Image.new('RGB', (720, 480), color='coral')
        image.save(image_path)
        logger.info(f"Created test image: {image_path}")
    else:
        image = Image.open(image_path)
        logger.info(f"Loaded image: {image_path}")
    
    # Load trajectory from file
    trajectory_file = Path("temp_assets/trajectory.json")
    if not trajectory_file.exists():
        # Create example trajectory file
        trajectory_json = """
[
    [
        {"x": 360, "y": 100},
        {"x": 360, "y": 380}
    ]
]
"""
        trajectory_file.write_text(trajectory_json)
        logger.info(f"Created trajectory file: {trajectory_file}")
    
    with open(trajectory_file, 'r') as f:
        trajectory_json = f.read()
    
    trajectories = integration.trajectory_system.parse_trajectory_json(trajectory_json)
    logger.info(f"Loaded {len(trajectories)} trajectories from file")
    
    try:
        result = await integration.generate_trajectory_video(
            start_image=image,
            trajectories=trajectories,
            prompt="Vertical camera movement from top to bottom",
            negative_prompt="horizontal movement, static, low quality"
        )
        
        logger.info(f"✅ Generated {len(result['video_frames'])} frames")
        
    except Exception as e:
        logger.error(f"❌ Generation failed: {e}")


async def example_5_fallback_mode():
    """Example 5: Fallback to mock mode when ComfyUI unavailable"""
    logger.info("=" * 60)
    logger.info("Example 5: Fallback Mode (No ComfyUI)")
    logger.info("=" * 60)
    
    # Configuration WITHOUT ComfyUI config
    config = WanATIConfig()
    
    # Initialize without ComfyUI
    integration = WanATIIntegration(config)  # No comfyui_config
    
    # Create test image
    image = Image.new('RGB', (720, 480), color='lavender')
    
    # Simple trajectory
    trajectory_json = """
    [
        [
            {"x": 100, "y": 240},
            {"x": 600, "y": 240}
        ]
    ]
    """
    
    trajectories = integration.trajectory_system.parse_trajectory_json(trajectory_json)
    
    # Generate (will use mock mode)
    result = await integration.generate_trajectory_video(
        start_image=image,
        trajectories=trajectories,
        prompt="Test prompt"
    )
    
    logger.info(f"Mode: {result['metadata'].get('mode', 'comfyui')}")
    logger.info(f"Frames: {len(result['video_frames'])}")
    logger.info("✅ Fallback mode works correctly")


async def main():
    """Run all examples"""
    logger.info("Starting Wan ATI ComfyUI Examples")
    logger.info("=" * 60)
    
    # Create output directory
    Path("temp_assets").mkdir(exist_ok=True)
    
    # Run examples
    examples = [
        ("Example 1: Simple Generation", example_1_simple_generation),
        ("Example 2: Complex Trajectory", example_2_complex_trajectory),
        ("Example 3: Multiple Trajectories", example_3_multi_trajectory),
        ("Example 4: Load from File", example_4_from_file),
        ("Example 5: Fallback Mode", example_5_fallback_mode),
    ]
    
    for name, example_func in examples:
        try:
            await example_func()
            logger.info(f"✅ {name} completed\n")
        except Exception as e:
            logger.error(f"❌ {name} failed: {e}\n")
    
    logger.info("=" * 60)
    logger.info("All examples completed!")


if __name__ == "__main__":
    asyncio.run(main())
