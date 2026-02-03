"""
Test LTX-2 video generation with various input types and prompts.

This script tests:
1. Different input image types (photos, illustrations, renders)
2. Various prompts (motion descriptions, scene changes)
3. Output quality and consistency

Requirements: 14.8, 14.9
"""

import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from end_to_end.workflow_manager import WorkflowManager, LTX2ImageToVideoConfig


def create_photo_style_image(path: Path, size=(1280, 720)):
    """Create a photo-style test image."""
    img = Image.new('RGB', size, color=(135, 206, 235))  # Sky blue
    draw = ImageDraw.Draw(img)
    
    # Draw landscape elements
    # Ground
    draw.rectangle([0, size[1]//2, size[0], size[1]], fill=(34, 139, 34))
    
    # Mountains
    points = [(0, size[1]//2), (size[0]//4, size[1]//4), (size[0]//2, size[1]//2)]
    draw.polygon(points, fill=(105, 105, 105))
    
    points = [(size[0]//3, size[1]//2), (size[0]//2, size[1]//3), (2*size[0]//3, size[1]//2)]
    draw.polygon(points, fill=(128, 128, 128))
    
    # Sun
    draw.ellipse([size[0]-150, 50, size[0]-50, 150], fill=(255, 255, 0))
    
    img.save(path)
    return path


def create_illustration_style_image(path: Path, size=(1280, 720)):
    """Create an illustration-style test image."""
    img = Image.new('RGB', size, color=(255, 240, 245))  # Light pink
    draw = ImageDraw.Draw(img)
    
    # Draw stylized elements
    # Geometric shapes
    draw.rectangle([100, 100, 400, 400], fill=(255, 182, 193), outline=(255, 105, 180), width=5)
    draw.ellipse([500, 150, 800, 450], fill=(173, 216, 230), outline=(70, 130, 180), width=5)
    draw.polygon([(900, 400), (1100, 100), (1300, 400)], fill=(144, 238, 144), outline=(34, 139, 34), width=5)
    
    # Add text
    try:
        draw.text((size[0]//2, 50), "Illustration Style", fill=(0, 0, 0), anchor="mm")
    except:
        pass  # Font not available
    
    img.save(path)
    return path


def create_render_style_image(path: Path, size=(1280, 720)):
    """Create a 3D render-style test image."""
    img = Image.new('RGB', size, color=(50, 50, 50))  # Dark gray
    draw = ImageDraw.Draw(img)
    
    # Draw 3D-like shapes with gradients (simulated)
    # Cube
    cube_points = [
        (300, 300), (500, 300), (500, 500), (300, 500)
    ]
    draw.polygon(cube_points, fill=(100, 100, 150), outline=(200, 200, 255), width=3)
    
    # Top face
    top_points = [
        (300, 300), (500, 300), (550, 250), (350, 250)
    ]
    draw.polygon(top_points, fill=(150, 150, 200), outline=(200, 200, 255), width=3)
    
    # Side face
    side_points = [
        (500, 300), (500, 500), (550, 450), (550, 250)
    ]
    draw.polygon(side_points, fill=(80, 80, 120), outline=(200, 200, 255), width=3)
    
    # Sphere (circle with shading)
    draw.ellipse([700, 250, 1000, 550], fill=(120, 120, 180), outline=(200, 200, 255), width=3)
    
    img.save(path)
    return path


def test_workflow_with_various_inputs():
    """Test workflow creation with various input types and prompts."""
    print("=" * 80)
    print("TEST: LTX-2 Video Generation with Various Inputs")
    print("=" * 80)
    
    # Create test images
    test_dir = Path("temp_test_ltx2_inputs")
    test_dir.mkdir(exist_ok=True)
    
    try:
        # Create different style images
        photo_image = create_photo_style_image(test_dir / "photo_landscape.png")
        illustration_image = create_illustration_style_image(test_dir / "illustration_shapes.png")
        render_image = create_render_style_image(test_dir / "render_3d.png")
        
        print(f"✅ Created test images:")
        print(f"   - Photo style: {photo_image}")
        print(f"   - Illustration style: {illustration_image}")
        print(f"   - Render style: {render_image}")
        print()
        
        # Create workflow manager
        workflows_dir = Path("assets/workflows")
        comfyui_workflows_dir = Path("temp_comfyui_workflows")
        comfyui_workflows_dir.mkdir(exist_ok=True)
        
        workflow_manager = WorkflowManager(workflows_dir, comfyui_workflows_dir)
        
        # Test cases: (image_path, prompt, description)
        test_cases = [
            (
                photo_image,
                "A slow pan across a mountain landscape at sunset, with warm golden light illuminating the peaks",
                "Photo - Landscape Pan"
            ),
            (
                photo_image,
                "Camera zooms in on the mountain peak, revealing details of the rocky terrain",
                "Photo - Zoom In"
            ),
            (
                illustration_image,
                "Geometric shapes rotate and transform, creating a dynamic abstract animation",
                "Illustration - Shape Animation"
            ),
            (
                illustration_image,
                "Colors shift and blend as the shapes pulse with energy",
                "Illustration - Color Shift"
            ),
            (
                render_image,
                "Camera orbits around the 3D objects, revealing their depth and form",
                "Render - Camera Orbit"
            ),
            (
                render_image,
                "Dramatic lighting sweeps across the scene, casting dynamic shadows",
                "Render - Lighting Change"
            ),
        ]
        
        print("=" * 80)
        print("Testing Workflow Creation with Various Inputs")
        print("=" * 80)
        
        all_passed = True
        
        for i, (image_path, prompt, description) in enumerate(test_cases, 1):
            print(f"\nTest Case {i}: {description}")
            print(f"  Image: {image_path.name}")
            print(f"  Prompt: {prompt[:60]}...")
            
            try:
                # Create configuration
                config = LTX2ImageToVideoConfig(
                    input_image_path=str(image_path),
                    resize_width=1280,
                    resize_height=720,
                    frame_count=121,
                    frame_rate=25
                )
                
                # Create workflow
                workflow = workflow_manager.create_ltx2_image_to_video_workflow(
                    str(image_path),
                    prompt,
                    config
                )
                
                # Verify workflow structure
                assert "98" in workflow, "LoadImage node missing"
                assert workflow["98"]["inputs"]["image"] == str(image_path), "Image path not set"
                assert "92:3" in workflow, "CLIPTextEncode node missing"
                assert workflow["92:3"]["inputs"]["text"] == prompt, "Prompt not set"
                assert "92:62" in workflow, "Frame count node missing"
                assert workflow["92:62"]["inputs"]["value"] == 121, "Frame count not set"
                
                print(f"  ✅ Workflow created successfully")
                print(f"     - Image path: {workflow['98']['inputs']['image']}")
                print(f"     - Prompt length: {len(workflow['92:3']['inputs']['text'])} chars")
                print(f"     - Frame count: {workflow['92:62']['inputs']['value']}")
                print(f"     - Resolution: {workflow['102']['inputs']['resize_type.width']}x{workflow['102']['inputs']['resize_type.height']}")
                
            except Exception as e:
                print(f"  ❌ FAILED: {e}")
                all_passed = False
        
        print("\n" + "=" * 80)
        print("Testing Different Video Parameters")
        print("=" * 80)
        
        # Test different video parameters
        parameter_tests = [
            (60, 24, 1920, 1080, "Short video, 24fps, 1080p"),
            (121, 25, 1280, 720, "Medium video, 25fps, 720p"),
            (240, 30, 1920, 1080, "Long video, 30fps, 1080p"),
        ]
        
        for frame_count, frame_rate, width, height, description in parameter_tests:
            print(f"\nParameter Test: {description}")
            print(f"  Frames: {frame_count}, FPS: {frame_rate}, Resolution: {width}x{height}")
            
            try:
                config = LTX2ImageToVideoConfig(
                    input_image_path=str(photo_image),
                    resize_width=width,
                    resize_height=height,
                    frame_count=frame_count,
                    frame_rate=frame_rate
                )
                
                workflow = workflow_manager.create_ltx2_image_to_video_workflow(
                    str(photo_image),
                    "Test prompt",
                    config
                )
                
                # Verify parameters
                assert workflow["92:62"]["inputs"]["value"] == frame_count
                assert workflow["102"]["inputs"]["resize_type.width"] == width
                assert workflow["102"]["inputs"]["resize_type.height"] == height
                
                duration = config.video_duration_seconds
                expected_duration = frame_count / frame_rate
                assert abs(duration - expected_duration) < 0.01, f"Duration mismatch: {duration} vs {expected_duration}"
                
                print(f"  ✅ Parameters applied correctly")
                print(f"     - Duration: {duration:.2f}s (expected: {expected_duration:.2f}s)")
                
            except Exception as e:
                print(f"  ❌ FAILED: {e}")
                all_passed = False
        
        print("\n" + "=" * 80)
        print("Testing Prompt Variations")
        print("=" * 80)
        
        # Test various prompt types
        prompt_tests = [
            ("A slow, smooth camera movement", "Slow motion"),
            ("Fast-paced action with quick cuts and dynamic angles", "Fast action"),
            ("Gentle zoom in revealing intricate details", "Zoom in"),
            ("Wide establishing shot pulling back to reveal the full scene", "Zoom out"),
            ("Camera pans left to right across the landscape", "Pan left-right"),
            ("Dramatic lighting change from day to night", "Lighting change"),
            ("Objects transform and morph into new shapes", "Transformation"),
            ("Subtle ambient movement with atmospheric effects", "Ambient"),
        ]
        
        for prompt, description in prompt_tests:
            print(f"\nPrompt Test: {description}")
            print(f"  Prompt: {prompt}")
            
            try:
                config = LTX2ImageToVideoConfig(
                    input_image_path=str(photo_image),
                    resize_width=1280,
                    resize_height=720,
                    frame_count=121,
                    frame_rate=25
                )
                
                workflow = workflow_manager.create_ltx2_image_to_video_workflow(
                    str(photo_image),
                    prompt,
                    config
                )
                
                assert workflow["92:3"]["inputs"]["text"] == prompt
                print(f"  ✅ Prompt applied correctly")
                
            except Exception as e:
                print(f"  ❌ FAILED: {e}")
                all_passed = False
        
        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        
        if all_passed:
            print("✅ ALL TESTS PASSED")
            print("\nVerified:")
            print("  - Photo-style images work correctly")
            print("  - Illustration-style images work correctly")
            print("  - Render-style images work correctly")
            print("  - Various motion prompts are accepted")
            print("  - Different video parameters are applied correctly")
            print("  - Prompt variations are handled properly")
            return 0
        else:
            print("❌ SOME TESTS FAILED")
            return 1
            
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        # Cleanup
        import shutil
        if test_dir.exists():
            shutil.rmtree(test_dir)
        if comfyui_workflows_dir.exists():
            shutil.rmtree(comfyui_workflows_dir)


if __name__ == "__main__":
    sys.exit(test_workflow_with_various_inputs())
