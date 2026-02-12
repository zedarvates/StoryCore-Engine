#!/usr/bin/env python3
"""
Example: 3D Sky Keyframe Generation

Demonstrates how to use the Sky Keyframe System to generate
atmospheric keyframes for ComfyUI integration.
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from sky import KeyframeGenerator, KeyframeConfig, RenderQuality, WorldType
from sky.world_presets import get_preset, list_presets


def example_1_basic_earth():
    """Generate a basic Earth keyframe."""
    print("=" * 60)
    print("Example 1: Basic Earth Keyframe")
    print("=" * 60)
    
    # Create generator with default config
    config = KeyframeConfig(
        output_dir="output/keyframes",
        project_name="earth_scene",
        shot_id="001",
        quality=RenderQuality.DRAFT  # Use draft for quick testing
    )
    
    generator = KeyframeGenerator(config)
    
    # Setup Earth atmosphere at noon
    generator.setup_atmosphere(
        world_type=WorldType.EARTH,
        time_of_day=12.0,
        latitude=45.0
    )
    
    # Setup camera
    generator.setup_camera(
        position=(0, 1.6, 0),
        look_at=(0, 1.6, 10),
        fov=60.0
    )
    
    # Generate keyframe
    result = generator.generate_keyframe()
    
    if result.success:
        print(f"✓ Keyframe generated successfully!")
        print(f"  Image: {result.image_path}")
        print(f"  Depth: {result.depth_map_path}")
        print(f"  Metadata: {result.metadata_path}")
        
        # Show lighting info
        lighting = result.metadata.get("lighting", {})
        print(f"\n  Lighting Conditions:")
        print(f"    Sun elevation: {lighting.get('sun_position', [0, 0])[1]:.1f}°")
        print(f"    Sky color: {lighting.get('sky_color', [0, 0, 0])}")
        print(f"    Visibility: {lighting.get('visibility_km', 0):.1f} km")
    else:
        print(f"✗ Failed: {result.error_message}")


def example_2_mars_dust_storm():
    """Generate a Mars keyframe with dust storm."""
    print("\n" + "=" * 60)
    print("Example 2: Mars Dust Storm")
    print("=" * 60)
    
    # Use quick generate function
    from sky.keyframe_generator import quick_generate
    
    result = quick_generate(
        world_type=WorldType.MARS,
        time_of_day=14.0,
        output_dir="output/keyframes",
        quality=RenderQuality.DRAFT
    )
    
    if result.success:
        print(f"✓ Mars keyframe generated!")
        print(f"  Image: {result.image_path}")
        
        # Show atmospheric conditions
        conditions = result.metadata.get("conditions", {})
        print(f"\n  Atmospheric Conditions:")
        print(f"    Pressure: {conditions.get('pressure_pa', 0) / 100:.1f} hPa")
        print(f"    Temperature: {conditions.get('temperature_k', 0) - 273.15:.1f}°C")
        print(f"    Dust storm: {conditions.get('dust_storm_intensity', 0) * 100:.0f}%")
    else:
        print(f"✗ Failed: {result.error_message}")


def example_3_using_presets():
    """Generate keyframes using world presets."""
    print("\n" + "=" * 60)
    print("Example 3: Using World Presets")
    print("=" * 60)
    
    # List available presets
    print("Available presets:")
    for name in list_presets()[:5]:  # Show first 5
        preset = get_preset(name)
        print(f"  - {name}: {preset.description if preset else 'Unknown'}")
    
    # Use a preset
    preset = get_preset("mars_dust_storm")
    if preset:
        print(f"\nUsing preset: {preset.name}")
        print(f"Description: {preset.description}")
        
        # Create atmosphere from preset
        atmosphere = preset.create_atmosphere()
        lighting = atmosphere.get_lighting_conditions()
        
        print(f"\nPreset Lighting:")
        print(f"  Sun position: {lighting['sun_position']}")
        print(f"  Sky color: {lighting['sky_color']}")
        print(f"  Visibility: {lighting['visibility_km']:.1f} km")


def example_4_comfyui_integration():
    """Demonstrate ComfyUI integration."""
    print("\n" + "=" * 60)
    print("Example 4: ComfyUI Integration")
    print("=" * 60)
    
    from sky.keyframe_generator import quick_generate
    
    # Generate keyframe
    result = quick_generate(
        world_type=WorldType.TITAN,
        time_of_day=10.0,
        output_dir="output/keyframes",
        quality=RenderQuality.DRAFT
    )
    
    if result.success:
        # Build ComfyUI payload
        payload = result.to_comfyui_payload()
        
        print("ComfyUI Payload:")
        print(f"  Reference image: {payload.get('reference_image')}")
        print(f"  Depth map: {payload.get('depth_map')}")
        print(f"  World type: {payload.get('world_type')}")
        print(f"  Time: {payload.get('time_of_day')}h")
        
        print(f"\n  Prompt Enhancement:")
        print(f"    {payload.get('prompt_enhancement')}")
        
        # Example of how to use with ComfyUI
        print(f"\n  Example ComfyUI prompt:")
        base_prompt = "alien landscape with methane lakes"
        enhanced = f"{base_prompt}, {payload.get('prompt_enhancement')}"
        print(f"    {enhanced}")


def example_5_time_variations():
    """Generate keyframes at different times of day."""
    print("\n" + "=" * 60)
    print("Example 5: Time Variations")
    print("=" * 60)
    
    from sky import AtmosphereModel
    
    # Create Earth atmosphere
    atmosphere = AtmosphereModel(WorldType.EARTH)
    
    times = [6.0, 12.0, 18.0, 22.0]  # Sunrise, noon, sunset, night
    
    print("Sky colors at different times:")
    for hour in times:
        atmosphere.set_time_of_day(hour)
        
        zenith = atmosphere.get_zenith_color()
        horizon = atmosphere.get_horizon_color()
        sun = atmosphere.get_sun_color()
        
        print(f"\n  {hour:02.0f}:00")
        print(f"    Zenith:  ({zenith[0]:.2f}, {zenith[1]:.2f}, {zenith[2]:.2f})")
        print(f"    Horizon: ({horizon[0]:.2f}, {horizon[1]:.2f}, {horizon[2]:.2f})")
        print(f"    Sun:     ({sun[0]:.2f}, {sun[1]:.2f}, {sun[2]:.2f})")


def main():
    """Run all examples."""
    print("3D Sky Keyframe System - Examples")
    print("=" * 60)
    
    # Create output directory
    output_dir = Path("output/keyframes")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        example_1_basic_earth()
    except Exception as e:
        print(f"Example 1 failed: {e}")
    
    try:
        example_2_mars_dust_storm()
    except Exception as e:
        print(f"Example 2 failed: {e}")
    
    try:
        example_3_using_presets()
    except Exception as e:
        print(f"Example 3 failed: {e}")
    
    try:
        example_4_comfyui_integration()
    except Exception as e:
        print(f"Example 4 failed: {e}")
    
    try:
        example_5_time_variations()
    except Exception as e:
        print(f"Example 5 failed: {e}")
    
    print("\n" + "=" * 60)
    print("Examples completed!")
    print(f"Check {output_dir} for generated keyframes")
    print("=" * 60)


if __name__ == "__main__":
    main()
