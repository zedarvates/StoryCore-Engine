"""
Verification script for LTX-2 workflow deployment and parameter injection.

This script validates:
1. Workflow JSON structure and node connections
2. Workflow loading and parameter injection
3. Required models are referenced correctly
4. Two-stage generation structure is correct
"""

import json
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from end_to_end.workflow_manager import WorkflowManager, LTX2ImageToVideoConfig


def verify_workflow_structure():
    """Verify the LTX-2 workflow JSON structure."""
    print("=" * 80)
    print("VERIFICATION 1: Workflow JSON Structure")
    print("=" * 80)
    
    workflow_path = Path("assets/workflows/ltx2_image_to_video.json")
    
    if not workflow_path.exists():
        print(f"❌ FAILED: Workflow file not found at {workflow_path}")
        return False
    
    print(f"✅ Workflow file exists: {workflow_path}")
    
    # Load and parse JSON
    try:
        with open(workflow_path, 'r') as f:
            workflow = json.load(f)
        print(f"✅ Workflow JSON is valid")
    except json.JSONDecodeError as e:
        print(f"❌ FAILED: Invalid JSON - {e}")
        return False
    
    # Verify required nodes
    required_nodes = {
        "75": "SaveVideo",
        "98": "LoadImage",
        "102": "ResizeImageMaskNode",
        "92:60": "LTXAVTextEncoderLoader",
        "92:1": "CheckpointLoaderSimple",
        "92:48": "LTXVAudioVAELoader",
        "92:76": "LatentUpscaleModelLoader",
        "92:3": "CLIPTextEncode",
        "92:62": "PrimitiveInt",
        "92:11": "RandomNoise",
        "92:67": "RandomNoise",
        "92:113": "ManualSigmaSchedule",
        "92:73": "ManualSigmaSchedule",
        "92:50": "KSamplerSelect",
        "92:51": "KSamplerSelect",
        "92:80": "SamplerCustomAdvanced",
        "92:85": "EmptyLTXVLatentVideo",
        "92:90": "LatentUpscale",
        "92:95": "SamplerCustomAdvanced",
        "92:97": "VAEDecode"
    }
    
    missing_nodes = []
    for node_id, expected_class in required_nodes.items():
        if node_id not in workflow:
            missing_nodes.append(f"{node_id} ({expected_class})")
        elif workflow[node_id].get("class_type") != expected_class:
            print(f"❌ Node {node_id} has wrong class_type: {workflow[node_id].get('class_type')} (expected {expected_class})")
            return False
    
    if missing_nodes:
        print(f"❌ FAILED: Missing nodes: {', '.join(missing_nodes)}")
        return False
    
    print(f"✅ All {len(required_nodes)} required nodes present with correct class_type")
    
    # Verify node connections
    connections = [
        ("92:80", "92:95", "Stage 1 → Stage 2 via latent upscale"),
        ("92:95", "92:97", "Stage 2 → VAE Decode"),
        ("92:97", "75", "VAE Decode → Save Video"),
        ("98", "102", "Load Image → Resize"),
        ("92:60", "92:3", "Text Encoder → CLIP Encode"),
    ]
    
    for source, target, description in connections:
        # Check if target node references source node
        target_node = workflow.get(target, {})
        inputs = target_node.get("inputs", {})
        
        # Check if any input references the source
        found = False
        for key, value in inputs.items():
            if isinstance(value, list) and len(value) > 0:
                if value[0] == source:
                    found = True
                    break
        
        if found:
            print(f"✅ Connection verified: {description}")
        else:
            print(f"⚠️  Warning: Connection not found: {description}")
    
    # Verify required models
    required_models = {
        "ltx-2-19b-distilled.safetensors": ["92:60", "92:1", "92:48"],
        "gemma_3_12B_it_fp4_mixed.safetensors": ["92:60"],
        "ltx-2-spatial-upscaler-x2-1.0.safetensors": ["92:76"]
    }
    
    for model_name, node_ids in required_models.items():
        found_in_nodes = []
        for node_id in node_ids:
            node = workflow.get(node_id, {})
            inputs = node.get("inputs", {})
            for key, value in inputs.items():
                if value == model_name:
                    found_in_nodes.append(node_id)
                    break
        
        if found_in_nodes:
            print(f"✅ Model '{model_name}' referenced in nodes: {', '.join(found_in_nodes)}")
        else:
            print(f"❌ FAILED: Model '{model_name}' not found in expected nodes")
            return False
    
    # Verify two-stage structure
    stage1_node = workflow.get("92:80", {})
    stage2_node = workflow.get("92:95", {})
    
    if stage1_node.get("class_type") == "SamplerCustomAdvanced":
        print(f"✅ Stage 1 (Latent Generation) node verified")
    else:
        print(f"❌ FAILED: Stage 1 node incorrect")
        return False
    
    if stage2_node.get("class_type") == "SamplerCustomAdvanced":
        print(f"✅ Stage 2 (Spatial Upscaling) node verified")
    else:
        print(f"❌ FAILED: Stage 2 node incorrect")
        return False
    
    print("\n✅ PASSED: Workflow structure is correct\n")
    return True


def verify_parameter_injection():
    """Verify workflow parameter injection works correctly."""
    print("=" * 80)
    print("VERIFICATION 2: Workflow Parameter Injection")
    print("=" * 80)
    
    try:
        # Create workflow manager
        workflows_dir = Path("assets/workflows")
        comfyui_workflows_dir = Path("temp_comfyui_workflows")
        comfyui_workflows_dir.mkdir(exist_ok=True)
        
        workflow_manager = WorkflowManager(workflows_dir, comfyui_workflows_dir)
        print("✅ WorkflowManager created")
        
        # Create test configuration
        config = LTX2ImageToVideoConfig(
            input_image_path="test_image.png",
            resize_width=1920,
            resize_height=1080,
            frame_count=240,
            frame_rate=30,
            noise_seed_stage1=42,
            noise_seed_stage2=123
        )
        print(f"✅ Test configuration created")
        
        # Create workflow with custom parameters
        test_prompt = "A cinematic shot of a sunset over mountains"
        workflow = workflow_manager.create_ltx2_image_to_video_workflow(
            "test_image.png",
            test_prompt,
            config
        )
        print(f"✅ Workflow created with custom parameters")
        
        # Verify input image was updated
        if workflow["98"]["inputs"]["image"] == "test_image.png":
            print(f"✅ Input image path updated correctly")
        else:
            print(f"❌ FAILED: Input image path not updated")
            return False
        
        # Verify resize dimensions
        if (workflow["102"]["inputs"]["resize_type.width"] == 1920 and
            workflow["102"]["inputs"]["resize_type.height"] == 1080):
            print(f"✅ Resize dimensions updated correctly (1920x1080)")
        else:
            print(f"❌ FAILED: Resize dimensions not updated")
            return False
        
        # Verify prompt
        if workflow["92:3"]["inputs"]["text"] == test_prompt:
            print(f"✅ Prompt updated correctly")
        else:
            print(f"❌ FAILED: Prompt not updated")
            return False
        
        # Verify frame count
        if workflow["92:62"]["inputs"]["value"] == 240:
            print(f"✅ Frame count updated correctly (240)")
        else:
            print(f"❌ FAILED: Frame count not updated")
            return False
        
        # Verify noise seeds
        if (workflow["92:11"]["inputs"]["noise_seed"] == 42 and
            workflow["92:67"]["inputs"]["noise_seed"] == 123):
            print(f"✅ Noise seeds updated correctly (42, 123)")
        else:
            print(f"❌ FAILED: Noise seeds not updated")
            return False
        
        # Verify duration calculation
        expected_duration = 240 / 30  # 8.0 seconds
        if config.video_duration_seconds == expected_duration:
            print(f"✅ Duration calculation correct ({expected_duration}s)")
        else:
            print(f"❌ FAILED: Duration calculation incorrect")
            return False
        
        # Verify sigma schedules are preserved
        if ("92:113" in workflow and "sigmas" in workflow["92:113"]["inputs"] and
            "92:73" in workflow and "sigmas" in workflow["92:73"]["inputs"]):
            print(f"✅ Sigma schedules preserved")
        else:
            print(f"❌ FAILED: Sigma schedules not preserved")
            return False
        
        # Verify preprocessing parameters
        if (workflow["92:99"]["inputs"]["img_compression"] == config.img_compression and
            workflow["92:106"]["inputs"]["longer_edge"] == config.longer_edge_resize and
            workflow["92:107"]["inputs"]["strength"] == config.upscale_strength):
            print(f"✅ Preprocessing parameters updated correctly")
        else:
            print(f"❌ FAILED: Preprocessing parameters not updated")
            return False
        
        print("\n✅ PASSED: Parameter injection works correctly\n")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception during parameter injection - {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Cleanup
        if comfyui_workflows_dir.exists():
            import shutil
            shutil.rmtree(comfyui_workflows_dir)


def verify_workflow_loading():
    """Verify workflow can be loaded by WorkflowManager."""
    print("=" * 80)
    print("VERIFICATION 3: Workflow Loading")
    print("=" * 80)
    
    try:
        workflows_dir = Path("assets/workflows")
        comfyui_workflows_dir = Path("temp_comfyui_workflows")
        comfyui_workflows_dir.mkdir(exist_ok=True)
        
        workflow_manager = WorkflowManager(workflows_dir, comfyui_workflows_dir)
        
        # Check if LTX-2 workflow is in registry
        if "ltx2_image_to_video" in workflow_manager.workflow_registry:
            print(f"✅ LTX-2 workflow found in registry")
            
            workflow_info = workflow_manager.workflow_registry["ltx2_image_to_video"]
            print(f"   Name: {workflow_info.name}")
            print(f"   Version: {workflow_info.version}")
            print(f"   Description: {workflow_info.description}")
            print(f"   Required nodes: {len(workflow_info.required_nodes)}")
            print(f"   Required models: {len(workflow_info.required_models)}")
        else:
            print(f"❌ FAILED: LTX-2 workflow not in registry")
            return False
        
        # Verify get_video_workflow_options includes LTX-2
        video_workflows = workflow_manager.get_video_workflow_options()
        if "ltx2_image_to_video" in video_workflows:
            print(f"✅ LTX-2 workflow available in video workflow options")
        else:
            print(f"❌ FAILED: LTX-2 workflow not in video workflow options")
            return False
        
        print("\n✅ PASSED: Workflow loading works correctly\n")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception during workflow loading - {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Cleanup
        if comfyui_workflows_dir.exists():
            import shutil
            shutil.rmtree(comfyui_workflows_dir)


def main():
    """Run all verifications."""
    print("\n" + "=" * 80)
    print("LTX-2 WORKFLOW DEPLOYMENT VERIFICATION")
    print("=" * 80 + "\n")
    
    results = []
    
    # Run verifications
    results.append(("Workflow Structure", verify_workflow_structure()))
    results.append(("Parameter Injection", verify_parameter_injection()))
    results.append(("Workflow Loading", verify_workflow_loading()))
    
    # Print summary
    print("=" * 80)
    print("VERIFICATION SUMMARY")
    print("=" * 80)
    
    all_passed = True
    for name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{name:.<50} {status}")
        if not passed:
            all_passed = False
    
    print("=" * 80)
    
    if all_passed:
        print("\n🎉 ALL VERIFICATIONS PASSED! LTX-2 workflow deployment is correct.\n")
        return 0
    else:
        print("\n❌ SOME VERIFICATIONS FAILED. Please review the output above.\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
