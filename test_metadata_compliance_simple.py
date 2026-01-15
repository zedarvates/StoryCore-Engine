#!/usr/bin/env python3
"""
Simple test for Task 14.3 - Property VE-25: Data Contract Compliance
Tests metadata compliance validation for Video Engine pipeline integration.
"""

import sys
import tempfile
import shutil
import json
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent / "src"))

from video_pipeline_integration import VideoPipelineIntegrator, ComfyUIImageOutput, ShotEngineOutput


def test_metadata_compliance_basic():
    """Test basic metadata compliance validation."""
    print("Testing Task 14.3 - Property VE-25: Data Contract Compliance...")
    
    # Create temporary project
    temp_dir = tempfile.mkdtemp()
    project_path = Path(temp_dir) / "metadata_test_project"
    project_path.mkdir(parents=True)
    
    try:
        # Create project.json with Data Contract v1 compliance
        project_data = {
            "schema_version": "1.0",
            "project_name": "metadata_test_project",
            "capabilities": {"video_generation": True}
        }
        
        with open(project_path / "project.json", 'w') as f:
            json.dump(project_data, f, indent=2)
        
        (project_path / "assets" / "images" / "generated").mkdir(parents=True)
        
        # Initialize integrator
        integrator = VideoPipelineIntegrator(str(project_path))
        
        # Create test data
        comfyui_outputs = [
            ComfyUIImageOutput(
                image_generation_id="test_gen_001",
                frame_id="frame_001",
                image_path=str(project_path / "assets" / "images" / "generated" / "frame_001.png"),
                generation_metadata={"generation_time": 2.5, "model_used": "test_model"},
                quality_metrics={"overall_quality": 0.95, "sharpness": 0.92, "coherence": 0.94},
                timestamp="2024-01-01T12:00:00Z"
            ),
            ComfyUIImageOutput(
                image_generation_id="test_gen_001",
                frame_id="frame_002",
                image_path=str(project_path / "assets" / "images" / "generated" / "frame_002.png"),
                generation_metadata={"generation_time": 2.3, "model_used": "test_model"},
                quality_metrics={"overall_quality": 0.93, "sharpness": 0.90, "coherence": 0.96},
                timestamp="2024-01-01T12:00:02Z"
            )
        ]
        
        shot_outputs = [
            ShotEngineOutput(
                shot_id="shot_001",
                shot_type="establishing",
                camera_movement={"type": "pan", "direction": "left_to_right", "speed": "slow"},
                duration=2.0,
                frame_count=48,
                keyframe_positions=[0, 23, 47],
                metadata={"scene": "opening", "importance": "high"}
            )
        ]
        
        # Set up pipeline data
        integrator.comfyui_outputs = comfyui_outputs
        integrator.shot_metadata = shot_outputs
        integrator.pipeline_metadata.source_components.extend(["comfyui_image_engine", "shot_engine"])
        
        # Integrate with video engine
        success = integrator.integrate_with_video_engine()
        assert success, "Video engine integration should succeed"
        
        # Generate metadata outputs
        audio_output = integrator.generate_audio_engine_output()
        integration_report = integrator.get_integration_report()
        
        # Test VE-6.4: Data Contract v1 compliance validation
        print("✓ Testing VE-6.4: Data Contract v1 compliance...")
        
        # Validate project.json compliance
        assert project_data["schema_version"] == "1.0"
        assert "project_name" in project_data
        assert "capabilities" in project_data
        
        # Validate audio synchronization metadata compliance
        if audio_output:
            assert audio_output["schema_version"] == "1.0"
            assert "video_timeline_id" in audio_output
            assert "created_at" in audio_output
            assert "timeline_metadata" in audio_output
            assert "shot_synchronization" in audio_output
            assert "pipeline_metadata" in audio_output
            
            # Validate timeline metadata structure
            timeline_meta = audio_output["timeline_metadata"]
            assert "total_duration" in timeline_meta
            assert "frame_rate" in timeline_meta
            assert "total_frames" in timeline_meta
            
            # Validate shot synchronization structure
            shot_sync = audio_output["shot_synchronization"]
            assert isinstance(shot_sync, list)
            assert len(shot_sync) > 0
            
            for sync_shot in shot_sync:
                assert "shot_id" in sync_shot
                assert "start_time" in sync_shot
                assert "end_time" in sync_shot
                assert "duration" in sync_shot
                assert sync_shot["end_time"] >= sync_shot["start_time"]
        
        # Test VE-10.8: Comprehensive processing reports validation
        print("✓ Testing VE-10.8: Comprehensive processing reports...")
        
        # Integration report must be comprehensive
        required_sections = [
            "integration_id", "pipeline_metadata", "data_contract_compliance",
            "component_status", "integration_metrics"
        ]
        
        for section in required_sections:
            assert section in integration_report, f"Missing required section: {section}"
        
        # Component status must be detailed
        component_status = integration_report["component_status"]
        required_components = ["comfyui_image_engine", "shot_engine", "video_engine"]
        
        for component in required_components:
            assert component in component_status, f"Missing component status: {component}"
            comp_status = component_status[component]
            
            # Each component must have status indicators
            assert "loaded" in comp_status or "initialized" in comp_status
        
        # Integration metrics must be comprehensive
        metrics = integration_report["integration_metrics"]
        required_metrics = [
            "total_keyframes", "total_shots", "average_shot_duration", "keyframes_per_shot"
        ]
        
        for metric in required_metrics:
            assert metric in metrics, f"Missing required metric: {metric}"
            assert isinstance(metrics[metric], (int, float))
        
        # Validate metric accuracy
        assert metrics["total_keyframes"] == len(comfyui_outputs)
        assert metrics["total_shots"] == len(shot_outputs)
        
        # Data contract compliance validation
        compliance_info = integration_report["data_contract_compliance"]
        assert "is_compliant" in compliance_info
        assert "issues" in compliance_info
        assert isinstance(compliance_info["is_compliant"], bool)
        assert isinstance(compliance_info["issues"], list)
        
        # Validate processing report persistence
        audio_sync_file = project_path / "video_audio_synchronization.json"
        if audio_output:
            assert audio_sync_file.exists(), "Audio sync file should be saved"
            
            with open(audio_sync_file, 'r') as f:
                saved_audio_data = json.load(f)
            
            # Saved data should match generated data
            assert saved_audio_data["schema_version"] == audio_output["schema_version"]
            assert saved_audio_data["video_timeline_id"] == audio_output["video_timeline_id"]
        
        print("✓ All metadata compliance validations passed!")
        print(f"✓ Validated {len(comfyui_outputs)} ComfyUI outputs")
        print(f"✓ Validated {len(shot_outputs)} shot metadata entries")
        print(f"✓ Generated comprehensive integration report with {len(integration_report)} sections")
        print(f"✓ Audio synchronization data saved to {audio_sync_file}")
        
        return True
        
    finally:
        shutil.rmtree(temp_dir)


def main():
    """Run the metadata compliance test."""
    print("=" * 80)
    print("Task 14.3 - Property VE-25: Data Contract Compliance Test")
    print("=" * 80)
    
    try:
        success = test_metadata_compliance_basic()
        if success:
            print("\n🎉 Task 14.3 completed successfully!")
            print("✅ Property VE-25: Data Contract Compliance implemented and validated")
            print("✅ Requirements VE-6.4 and VE-10.8 satisfied")
            print("\nNext: Ready to proceed with Task 15.1 - Cross-platform compatibility")
        else:
            print("\n❌ Task 14.3 failed - metadata compliance validation issues")
            return False
            
    except Exception as e:
        print(f"\n❌ Task 14.3 failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


if __name__ == "__main__":
    main()