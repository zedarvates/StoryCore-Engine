"""
Wan ATI Integration - Usage Examples

This script demonstrates how to use the Wan Video ATI integration
for trajectory-based motion control in video generation.
"""

import asyncio
import json
import logging
import sys
from pathlib import Path
from PIL import Image

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.wan_ati_integration import (
    WanATIIntegration,
    WanATIConfig,
    TrajectoryInterpolationMethod
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def example_1_parse_and_validate():
    """Example 1: Parse and validate trajectory from JSON"""
    logger.info("=" * 60)
    logger.info("Example 1: Parse and Validate Trajectory")
    logger.info("=" * 60)
    
    # Sample trajectory JSON (from Trajectory Annotation Tool)
    trajectory_json = """
    [
        [
            {"x": 100, "y": 100},
            {"x": 200, "y": 150},
            {"x": 300, "y": 200},
            {"x": 400, "y": 250},
            {"x": 500, "y": 300}
        ]
    ]
    """
    
    # Initialize integration
    config = WanATIConfig()
    integration = WanATIIntegration(config)
    
    # Parse trajectories
    logger.info("Parsing trajectory JSON...")
    trajectories = integration.trajectory_system.parse_trajectory_json(trajectory_json)
    logger.info(f"✓ Parsed {len(trajectories)} trajectory(ies)")
    
    # Validate each trajectory
    for i, traj in enumerate(trajectories):
        logger.info(f"\nValidating Trajectory {i+1}:")
        logger.info(f"  - Points: {len(traj.points)}")
        logger.info(f"  - Name: {traj.name}")
        logger.info(f"  - Color: {traj.color}")
        
        is_valid, errors = integration.trajectory_system.validate_trajectory(
            traj,
            (config.width, config.height),
            config.length
        )
        
        if is_valid:
            logger.info(f"  ✓ Validation: PASSED")
        else:
            logger.error(f"  ✗ Validation: FAILED")
            for error in errors:
                logger.error(f"    - {error}")
    
    return trajectories


def example_2_interpolate_trajectory():
    """Example 2: Interpolate trajectory to match frame count"""
    logger.info("\n" + "=" * 60)
    logger.info("Example 2: Trajectory Interpolation")
    logger.info("=" * 60)
    
    # Create a simple trajectory with few points
    from src.wan_ati_integration import TrajectoryPoint, Trajectory
    
    points = [
        TrajectoryPoint(x=100, y=100),
        TrajectoryPoint(x=300, y=200),
        TrajectoryPoint(x=500, y=300)
    ]
    trajectory = Trajectory(points=points, name="Simple Path")
    
    logger.info(f"Original trajectory: {len(trajectory.points)} points")
    
    # Interpolate to 81 frames (5 seconds at 16fps)
    target_frames = 81
    
    # Linear interpolation
    logger.info(f"\nInterpolating to {target_frames} frames (LINEAR)...")
    linear_traj = trajectory.interpolate(
        target_frames,
        TrajectoryInterpolationMethod.LINEAR
    )
    logger.info(f"✓ Interpolated trajectory: {len(linear_traj.points)} points")
    logger.info(f"  - Start: ({linear_traj.points[0].x}, {linear_traj.points[0].y})")
    logger.info(f"  - End: ({linear_traj.points[-1].x}, {linear_traj.points[-1].y})")
    
    # Cubic interpolation
    logger.info(f"\nInterpolating to {target_frames} frames (CUBIC)...")
    cubic_traj = trajectory.interpolate(
        target_frames,
        TrajectoryInterpolationMethod.CUBIC
    )
    logger.info(f"✓ Interpolated trajectory: {len(cubic_traj.points)} points")
    logger.info(f"  - Start: ({cubic_traj.points[0].x}, {cubic_traj.points[0].y})")
    logger.info(f"  - End: ({cubic_traj.points[-1].x}, {cubic_traj.points[-1].y})")
    
    return linear_traj, cubic_traj


def example_3_visualize_trajectory():
    """Example 3: Visualize trajectory on image"""
    logger.info("\n" + "=" * 60)
    logger.info("Example 3: Trajectory Visualization")
    logger.info("=" * 60)
    
    # Create test image
    logger.info("Creating test image (720x480)...")
    image = Image.new('RGB', (720, 480), color='lightblue')
    
    # Create trajectory
    from src.wan_ati_integration import TrajectoryPoint, Trajectory
    
    points = [
        TrajectoryPoint(x=100, y=240),
        TrajectoryPoint(x=200, y=200),
        TrajectoryPoint(x=300, y=240),
        TrajectoryPoint(x=400, y=280),
        TrajectoryPoint(x=500, y=240),
        TrajectoryPoint(x=600, y=200)
    ]
    trajectory = Trajectory(points=points, name="Wave Path", color="red")
    
    # Initialize integration
    config = WanATIConfig()
    integration = WanATIIntegration(config)
    
    # Visualize
    logger.info("Visualizing trajectory...")
    viz_image = integration.trajectory_system.visualize_trajectory(
        image,
        trajectory,
        line_width=3,
        point_radius=5
    )
    
    # Save result
    output_path = Path("examples/trajectory_visualization.png")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    viz_image.save(output_path)
    logger.info(f"✓ Saved visualization to: {output_path}")
    
    return viz_image


def example_4_multiple_trajectories():
    """Example 4: Work with multiple trajectories"""
    logger.info("\n" + "=" * 60)
    logger.info("Example 4: Multiple Trajectories")
    logger.info("=" * 60)
    
    # Multi-trajectory JSON
    trajectory_json = """
    [
        [
            {"x": 100, "y": 100},
            {"x": 300, "y": 200},
            {"x": 500, "y": 300}
        ],
        [
            {"x": 600, "y": 100},
            {"x": 400, "y": 200},
            {"x": 200, "y": 300}
        ]
    ]
    """
    
    # Initialize integration
    config = WanATIConfig()
    integration = WanATIIntegration(config)
    
    # Parse trajectories
    logger.info("Parsing multiple trajectories...")
    trajectories = integration.trajectory_system.parse_trajectory_json(trajectory_json)
    logger.info(f"✓ Parsed {len(trajectories)} trajectories")
    
    # Create test image
    image = Image.new('RGB', (720, 480), color='white')
    
    # Visualize all trajectories
    logger.info("Visualizing all trajectories...")
    viz_image = integration.visualize_trajectories(image, trajectories)
    
    # Save result
    output_path = Path("examples/multiple_trajectories.png")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    viz_image.save(output_path)
    logger.info(f"✓ Saved visualization to: {output_path}")
    
    return trajectories


async def example_5_generate_video():
    """Example 5: Generate video with trajectory control (mock)"""
    logger.info("\n" + "=" * 60)
    logger.info("Example 5: Generate Trajectory Video")
    logger.info("=" * 60)
    
    # Create trajectory
    trajectory_json = """
    [
        [
            {"x": 100, "y": 240},
            {"x": 200, "y": 200},
            {"x": 300, "y": 240},
            {"x": 400, "y": 280},
            {"x": 500, "y": 240},
            {"x": 600, "y": 200}
        ]
    ]
    """
    
    # Initialize integration
    config = WanATIConfig(
        width=720,
        height=480,
        length=81,
        trajectory_strength=220,
        trajectory_decay=10,
        steps=20,
        cfg_scale=3.0
    )
    integration = WanATIIntegration(config)
    
    # Parse trajectories
    logger.info("Parsing trajectory...")
    trajectories = integration.trajectory_system.parse_trajectory_json(trajectory_json)
    
    # Create test image
    logger.info("Creating start image...")
    image = Image.new('RGB', (720, 480), color='skyblue')
    
    # Generate video (mock)
    logger.info("Generating video with trajectory control...")
    logger.info(f"  - Resolution: {config.width}x{config.height}")
    logger.info(f"  - Frames: {config.length}")
    logger.info(f"  - Trajectory Strength: {config.trajectory_strength}")
    logger.info(f"  - Trajectory Decay: {config.trajectory_decay}")
    
    result = await integration.generate_trajectory_video(
        start_image=image,
        trajectories=trajectories,
        prompt="Camera smoothly pans across a beautiful landscape",
        negative_prompt="static, blurry, low quality"
    )
    
    # Display results
    logger.info("\n✓ Video generation complete (mock)")
    logger.info(f"  Metadata:")
    for key, value in result["metadata"].items():
        logger.info(f"    - {key}: {value}")
    
    return result


def example_6_export_template():
    """Example 6: Export trajectory template"""
    logger.info("\n" + "=" * 60)
    logger.info("Example 6: Export Trajectory Template")
    logger.info("=" * 60)
    
    # Initialize system
    config = WanATIConfig()
    integration = WanATIIntegration(config)
    
    # Export template
    logger.info(f"Exporting template for {config.width}x{config.height}...")
    template = integration.trajectory_system.export_trajectory_template(
        (config.width, config.height),
        num_points=10
    )
    
    # Save template
    output_path = Path("examples/trajectory_template.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(template)
    logger.info(f"✓ Saved template to: {output_path}")
    
    # Display template
    logger.info("\nTemplate content:")
    logger.info(template)
    
    return template


def example_7_complete_workflow():
    """Example 7: Complete workflow from JSON to visualization"""
    logger.info("\n" + "=" * 60)
    logger.info("Example 7: Complete Workflow")
    logger.info("=" * 60)
    
    # Step 1: Load trajectory from file (or use inline JSON)
    logger.info("Step 1: Load trajectory JSON")
    trajectory_json = """
    [
        [
            {"x": 360, "y": 100},
            {"x": 360, "y": 150},
            {"x": 300, "y": 200},
            {"x": 360, "y": 250},
            {"x": 420, "y": 300},
            {"x": 360, "y": 350},
            {"x": 360, "y": 400}
        ]
    ]
    """
    
    # Step 2: Initialize integration
    logger.info("Step 2: Initialize Wan ATI integration")
    config = WanATIConfig(
        width=720,
        height=480,
        trajectory_strength=250,  # Higher strength for tighter following
        trajectory_decay=8         # Lower decay for consistent influence
    )
    integration = WanATIIntegration(config)
    
    # Step 3: Parse and validate
    logger.info("Step 3: Parse and validate trajectory")
    trajectories = integration.trajectory_system.parse_trajectory_json(trajectory_json)
    
    for i, traj in enumerate(trajectories):
        is_valid, errors = integration.trajectory_system.validate_trajectory(
            traj,
            (config.width, config.height),
            config.length
        )
        if not is_valid:
            logger.error(f"Trajectory {i} validation failed: {errors}")
            return None
        logger.info(f"  ✓ Trajectory {i} validated ({len(traj.points)} points)")
    
    # Step 4: Interpolate
    logger.info("Step 4: Interpolate trajectory to match frame count")
    interpolated = trajectories[0].interpolate(
        config.length,
        TrajectoryInterpolationMethod.CUBIC
    )
    logger.info(f"  ✓ Interpolated to {len(interpolated.points)} points")
    
    # Step 5: Visualize
    logger.info("Step 5: Visualize trajectory")
    image = Image.new('RGB', (720, 480), color='lightgray')
    viz_image = integration.visualize_trajectories(image, [interpolated])
    
    output_path = Path("examples/complete_workflow.png")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    viz_image.save(output_path)
    logger.info(f"  ✓ Saved to: {output_path}")
    
    # Step 6: Ready for video generation
    logger.info("Step 6: Ready for video generation")
    logger.info("  Configuration:")
    logger.info(f"    - Resolution: {config.width}x{config.height}")
    logger.info(f"    - Frames: {config.length}")
    logger.info(f"    - Trajectory Strength: {config.trajectory_strength}")
    logger.info(f"    - Trajectory Decay: {config.trajectory_decay}")
    logger.info("  ✓ All steps complete - ready for ComfyUI workflow execution")
    
    return interpolated


async def main():
    """Run all examples"""
    logger.info("\n" + "=" * 60)
    logger.info("Wan ATI Integration - Usage Examples")
    logger.info("=" * 60)
    
    try:
        # Run examples
        example_1_parse_and_validate()
        example_2_interpolate_trajectory()
        example_3_visualize_trajectory()
        example_4_multiple_trajectories()
        await example_5_generate_video()
        example_6_export_template()
        example_7_complete_workflow()
        
        logger.info("\n" + "=" * 60)
        logger.info("✓ All examples completed successfully!")
        logger.info("=" * 60)
        logger.info("\nGenerated files:")
        logger.info("  - examples/trajectory_visualization.png")
        logger.info("  - examples/multiple_trajectories.png")
        logger.info("  - examples/trajectory_template.json")
        logger.info("  - examples/complete_workflow.png")
        logger.info("\nNext steps:")
        logger.info("  1. Visit: https://comfyui-wiki.github.io/Trajectory-Annotation-Tool/")
        logger.info("  2. Upload your image and create trajectories")
        logger.info("  3. Export JSON and use with Wan ATI integration")
        logger.info("  4. Generate videos with precise motion control!")
        
    except Exception as e:
        logger.error(f"Error running examples: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    asyncio.run(main())
