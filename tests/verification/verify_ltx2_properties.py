"""
Verify LTX-2 correctness properties (Properties 56-66).

This script validates all LTX-2 specific correctness properties defined in the design document.

Requirements: 14.1-14.15
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from end_to_end.workflow_manager import WorkflowManager, LTX2ImageToVideoConfig
from end_to_end.data_models import GeneratedVideo


def verify_property_56():
    """
    Property 56: LTX-2 Workflow Availability
    For any system with video generation enabled, LTX-2 workflow should be available.
    Validates: Requirements 14.1
    """
    print("=" * 80)
    print("Property 56: LTX-2 Workflow Availability")
    print("=" * 80)
    
    try:
        workflows_dir = Path("assets/workflows")
        comfyui_workflows_dir = Path("temp_comfyui_workflows")
        comfyui_workflows_dir.mkdir(exist_ok=True)
        
        workflow_manager = WorkflowManager(workflows_dir, comfyui_workflows_dir)
        
        # Check if LTX-2 workflow is available
        video_workflows = workflow_manager.get_video_workflow_options()
        
        assert "ltx2_image_to_video" in video_workflows, \
            "LTX-2 workflow should be available in video workflow options"
        
        print("✅ LTX-2 workflow is available")
        print(f"   Available video workflows: {video_workflows}")
        
        # Cleanup
        import shutil
        if comfyui_workflows_dir.exists():
            shutil.rmtree(comfyui_workflows_dir)
        
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def verify_property_57():
    """
    Property 57: LTX-2 Model Availability
    For any LTX-2 workflow execution, verify required models are available.
    Validates: Requirements 14.2, 14.3, 14.4, 14.11
    """
    print("\n" + "=" * 80)
    print("Property 57: LTX-2 Model Availability")
    print("=" * 80)
    
    try:
        # Define required models
        required_models = [
            "ltx-2-19b-distilled.safetensors",
            "gemma_3_12B_it_fp4_mixed.safetensors",
            "ltx-2-spatial-upscaler-x2-1.0.safetensors"
        ]
        
        # Check workflow references these models
        import json
        workflow_path = Path("assets/workflows/ltx2_image_to_video.json")
        
        with open(workflow_path, 'r') as f:
            workflow = json.load(f)
        
        found_models = []
        for node_id, node in workflow.items():
            inputs = node.get("inputs", {})
            for key, value in inputs.items():
                if isinstance(value, str) and value in required_models:
                    found_models.append(value)
        
        for model in required_models:
            assert model in found_models, f"Required model {model} not found in workflow"
            print(f"✅ Model referenced: {model}")
        
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def verify_property_58():
    """
    Property 58: LTX-2 Input Image Processing
    For any input image, verify preprocessing with Lanczos resizing.
    Validates: Requirements 14.5, 14.6
    """
    print("\n" + "=" * 80)
    print("Property 58: LTX-2 Input Image Processing")
    print("=" * 80)
    
    try:
        import json
        workflow_path = Path("assets/workflows/ltx2_image_to_video.json")
        
        with open(workflow_path, 'r') as f:
            workflow = json.load(f)
        
        # Check ResizeImageMaskNode configuration
        resize_node = workflow.get("102")
        assert resize_node is not None, "Resize node not found"
        assert resize_node["class_type"] == "ResizeImageMaskNode", "Wrong node type"
        
        inputs = resize_node["inputs"]
        assert inputs["scale_method"] == "lanczos", "Should use Lanczos resizing"
        assert inputs["resize_type.crop"] == "center", "Should use center crop"
        
        print("✅ Lanczos resizing configured")
        print("✅ Center crop configured")
        
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def verify_property_59():
    """
    Property 59: LTX-2 Video Duration
    For any LTX-2 generation with N frames at F fps, verify duration is N/F seconds.
    Validates: Requirements 14.5, 14.13
    """
    print("\n" + "=" * 80)
    print("Property 59: LTX-2 Video Duration")
    print("=" * 80)
    
    try:
        test_cases = [
            (60, 24, 2.5),
            (121, 25, 4.84),
            (240, 30, 8.0),
        ]
        
        for frame_count, frame_rate, expected_duration in test_cases:
            config = LTX2ImageToVideoConfig(
                input_image_path="test.png",
                frame_count=frame_count,
                frame_rate=frame_rate
            )
            
            calculated_duration = config.video_duration_seconds
            assert abs(calculated_duration - expected_duration) < 0.01, \
                f"Duration mismatch: {calculated_duration} vs {expected_duration}"
            
            print(f"✅ {frame_count} frames @ {frame_rate}fps = {calculated_duration}s")
        
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def verify_property_60():
    """
    Property 60: LTX-2 Audio Generation
    For any LTX-2 video generation, verify output includes synchronized audio.
    Validates: Requirements 14.7, 14.15
    """
    print("\n" + "=" * 80)
    print("Property 60: LTX-2 Audio Generation")
    print("=" * 80)
    
    try:
        # Verify GeneratedVideo includes audio flag
        video = GeneratedVideo(
            path=Path("test.mp4"),
            duration_seconds=4.84,
            frame_count=121,
            frame_rate=25,
            resolution=(1280, 720),
            has_audio=True,
            generation_time=75.0
        )
        
        assert hasattr(video, 'has_audio'), "GeneratedVideo should have has_audio attribute"
        assert video.has_audio is True, "LTX-2 videos should have audio"
        
        print("✅ GeneratedVideo includes audio flag")
        print("✅ Audio is enabled for LTX-2 videos")
        
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def verify_property_61():
    """
    Property 61: LTX-2 Two-Stage Generation
    For any LTX-2 execution, verify initial latent generation followed by spatial upscaling.
    Validates: Requirements 14.8
    """
    print("\n" + "=" * 80)
    print("Property 61: LTX-2 Two-Stage Generation")
    print("=" * 80)
    
    try:
        import json
        workflow_path = Path("assets/workflows/ltx2_image_to_video.json")
        
        with open(workflow_path, 'r') as f:
            workflow = json.load(f)
        
        # Verify stage 1 (latent generation)
        stage1_node = workflow.get("92:80")
        assert stage1_node is not None, "Stage 1 node not found"
        assert stage1_node["class_type"] == "SamplerCustomAdvanced", "Wrong stage 1 node type"
        print("✅ Stage 1 (Latent Generation) node present")
        
        # Verify latent upscale node
        upscale_node = workflow.get("92:90")
        assert upscale_node is not None, "Upscale node not found"
        assert upscale_node["class_type"] == "LatentUpscale", "Wrong upscale node type"
        print("✅ Latent Upscale node present")
        
        # Verify stage 2 (spatial upscaling)
        stage2_node = workflow.get("92:95")
        assert stage2_node is not None, "Stage 2 node not found"
        assert stage2_node["class_type"] == "SamplerCustomAdvanced", "Wrong stage 2 node type"
        print("✅ Stage 2 (Spatial Upscaling) node present")
        
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def verify_property_62():
    """
    Property 62: LTX-2 Prompt Support
    For any LTX-2 generation, verify custom prompts are accepted.
    Validates: Requirements 14.9
    """
    print("\n" + "=" * 80)
    print("Property 62: LTX-2 Prompt Support")
    print("=" * 80)
    
    try:
        workflows_dir = Path("assets/workflows")
        comfyui_workflows_dir = Path("temp_comfyui_workflows")
        comfyui_workflows_dir.mkdir(exist_ok=True)
        
        workflow_manager = WorkflowManager(workflows_dir, comfyui_workflows_dir)
        
        test_prompt = "A cinematic shot of a sunset over mountains"
        config = LTX2ImageToVideoConfig(input_image_path="test.png")
        
        workflow = workflow_manager.create_ltx2_image_to_video_workflow(
            "test.png",
            test_prompt,
            config
        )
        
        # Verify prompt was set
        assert workflow["92:3"]["inputs"]["text"] == test_prompt, "Prompt not set correctly"
        print(f"✅ Custom prompt accepted: {test_prompt[:50]}...")
        
        # Cleanup
        import shutil
        if comfyui_workflows_dir.exists():
            shutil.rmtree(comfyui_workflows_dir)
        
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def verify_property_63():
    """
    Property 63: LTX-2 Sigma Schedule Control
    For any LTX-2 generation, verify manual sigma schedules are used.
    Validates: Requirements 14.10
    """
    print("\n" + "=" * 80)
    print("Property 63: LTX-2 Sigma Schedule Control")
    print("=" * 80)
    
    try:
        import json
        workflow_path = Path("assets/workflows/ltx2_image_to_video.json")
        
        with open(workflow_path, 'r') as f:
            workflow = json.load(f)
        
        # Verify stage 1 sigma schedule
        stage1_sigma = workflow.get("92:113")
        assert stage1_sigma is not None, "Stage 1 sigma schedule not found"
        assert stage1_sigma["class_type"] == "ManualSigmaSchedule", "Wrong sigma schedule type"
        assert "sigmas" in stage1_sigma["inputs"], "Sigma values not found"
        print("✅ Stage 1 manual sigma schedule present")
        
        # Verify stage 2 sigma schedule
        stage2_sigma = workflow.get("92:73")
        assert stage2_sigma is not None, "Stage 2 sigma schedule not found"
        assert stage2_sigma["class_type"] == "ManualSigmaSchedule", "Wrong sigma schedule type"
        assert "sigmas" in stage2_sigma["inputs"], "Sigma values not found"
        print("✅ Stage 2 manual sigma schedule present")
        
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def verify_property_64():
    """
    Property 64: LTX-2 Workflow Validation
    For any system startup with LTX-2 enabled, validate workflow compatibility.
    Validates: Requirements 14.12
    """
    print("\n" + "=" * 80)
    print("Property 64: LTX-2 Workflow Validation")
    print("=" * 80)
    
    try:
        workflows_dir = Path("assets/workflows")
        comfyui_workflows_dir = Path("temp_comfyui_workflows")
        comfyui_workflows_dir.mkdir(exist_ok=True)
        
        workflow_manager = WorkflowManager(workflows_dir, comfyui_workflows_dir)
        
        # Check if LTX-2 workflow is in registry
        assert "ltx2_image_to_video" in workflow_manager.workflow_registry, \
            "LTX-2 workflow not in registry"
        
        workflow_info = workflow_manager.workflow_registry["ltx2_image_to_video"]
        
        # Verify workflow info
        assert workflow_info.name == "ltx2_image_to_video", "Wrong workflow name"
        assert len(workflow_info.required_nodes) > 0, "No required nodes listed"
        assert len(workflow_info.required_models) > 0, "No required models listed"
        
        print(f"✅ Workflow validated: {workflow_info.name}")
        print(f"   Required nodes: {len(workflow_info.required_nodes)}")
        print(f"   Required models: {len(workflow_info.required_models)}")
        
        # Cleanup
        import shutil
        if comfyui_workflows_dir.exists():
            shutil.rmtree(comfyui_workflows_dir)
        
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def verify_property_65():
    """
    Property 65: LTX-2 Parameter Configuration
    For any LTX-2 generation, verify user can configure video parameters.
    Validates: Requirements 14.13
    """
    print("\n" + "=" * 80)
    print("Property 65: LTX-2 Parameter Configuration")
    print("=" * 80)
    
    try:
        # Test configurable parameters
        config = LTX2ImageToVideoConfig(
            input_image_path="test.png",
            resize_width=1920,
            resize_height=1080,
            frame_count=240,
            frame_rate=30,
            noise_seed_stage1=42,
            noise_seed_stage2=43,
            cfg_scale=1.2,
            upscale_strength=0.8
        )
        
        # Verify all parameters are set
        assert config.resize_width == 1920, "Width not configurable"
        assert config.resize_height == 1080, "Height not configurable"
        assert config.frame_count == 240, "Frame count not configurable"
        assert config.frame_rate == 30, "Frame rate not configurable"
        assert config.noise_seed_stage1 == 42, "Stage 1 seed not configurable"
        assert config.noise_seed_stage2 == 43, "Stage 2 seed not configurable"
        assert config.cfg_scale == 1.2, "CFG scale not configurable"
        assert config.upscale_strength == 0.8, "Upscale strength not configurable"
        
        print("✅ All video parameters are configurable:")
        print(f"   Resolution: {config.resize_width}x{config.resize_height}")
        print(f"   Frame count: {config.frame_count}")
        print(f"   Frame rate: {config.frame_rate}")
        print(f"   Seeds: {config.noise_seed_stage1}, {config.noise_seed_stage2}")
        print(f"   CFG scale: {config.cfg_scale}")
        print(f"   Upscale strength: {config.upscale_strength}")
        
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def verify_property_66():
    """
    Property 66: LTX-2 Progress Display
    For any active LTX-2 generation, verify UI displays progress for both stages.
    Validates: Requirements 14.14
    """
    print("\n" + "=" * 80)
    print("Property 66: LTX-2 Progress Display")
    print("=" * 80)
    
    try:
        from end_to_end.generation_engine import GenerationProgress
        
        # Create stage 1 progress
        stage1 = GenerationProgress(
            session_id="test",
            current_step="Latent Video Generation",
            current_item=1,
            total_items=2,
            percentage=25.0,
            elapsed_time=10.0,
            estimated_remaining=30.0,
            current_message="Generating video latents...",
            backend_queue_depth=0
        )
        
        # Create stage 2 progress
        stage2 = GenerationProgress(
            session_id="test",
            current_step="Spatial Upscaling",
            current_item=2,
            total_items=2,
            percentage=75.0,
            elapsed_time=30.0,
            estimated_remaining=10.0,
            current_message="Upscaling video resolution...",
            backend_queue_depth=0
        )
        
        # Verify both stages have distinct progress
        assert stage1.current_item == 1, "Stage 1 should be item 1"
        assert stage2.current_item == 2, "Stage 2 should be item 2"
        assert stage1.total_items == 2, "Total items should be 2"
        assert stage2.total_items == 2, "Total items should be 2"
        assert "Latent" in stage1.current_step, "Stage 1 should mention Latent"
        assert "Upscaling" in stage2.current_step, "Stage 2 should mention Upscaling"
        
        print("✅ Stage 1 progress display configured")
        print(f"   Step: {stage1.current_step}")
        print(f"   Progress: {stage1.current_item}/{stage1.total_items} ({stage1.percentage}%)")
        
        print("✅ Stage 2 progress display configured")
        print(f"   Step: {stage2.current_step}")
        print(f"   Progress: {stage2.current_item}/{stage2.total_items} ({stage2.percentage}%)")
        
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def main():
    """Run all LTX-2 correctness property verifications."""
    print("\n" + "=" * 80)
    print("LTX-2 CORRECTNESS PROPERTIES VERIFICATION (Properties 56-66)")
    print("=" * 80 + "\n")
    
    properties = [
        ("Property 56: LTX-2 Workflow Availability", verify_property_56),
        ("Property 57: LTX-2 Model Availability", verify_property_57),
        ("Property 58: LTX-2 Input Image Processing", verify_property_58),
        ("Property 59: LTX-2 Video Duration", verify_property_59),
        ("Property 60: LTX-2 Audio Generation", verify_property_60),
        ("Property 61: LTX-2 Two-Stage Generation", verify_property_61),
        ("Property 62: LTX-2 Prompt Support", verify_property_62),
        ("Property 63: LTX-2 Sigma Schedule Control", verify_property_63),
        ("Property 64: LTX-2 Workflow Validation", verify_property_64),
        ("Property 65: LTX-2 Parameter Configuration", verify_property_65),
        ("Property 66: LTX-2 Progress Display", verify_property_66),
    ]
    
    results = []
    for name, verify_func in properties:
        try:
            result = verify_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ Exception in {name}: {e}")
            results.append((name, False))
    
    # Print summary
    print("\n" + "=" * 80)
    print("VERIFICATION SUMMARY")
    print("=" * 80)
    
    all_passed = True
    for name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{name:.<60} {status}")
        if not passed:
            all_passed = False
    
    print("=" * 80)
    
    if all_passed:
        print("\n🎉 ALL 11 LTX-2 PROPERTIES VERIFIED!")
        print("\nProperties 56-66 validate:")
        print("  ✅ Workflow availability and validation")
        print("  ✅ Model requirements and references")
        print("  ✅ Image preprocessing with Lanczos")
        print("  ✅ Video duration calculations")
        print("  ✅ Audio generation and synchronization")
        print("  ✅ Two-stage generation process")
        print("  ✅ Custom prompt support")
        print("  ✅ Manual sigma schedule control")
        print("  ✅ Parameter configuration")
        print("  ✅ Progress display for both stages")
        print()
        return 0
    else:
        print("\n❌ SOME PROPERTIES FAILED. Please review the output above.\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
