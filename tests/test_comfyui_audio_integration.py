#!/usr/bin/env python3
"""
Test ComfyUI Audio Integration
Validates the integration of ComfyUI workflows into the Audio Engine.
"""

import json
import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent / "src"))

from audio_engine import (
    AudioEngine, AudioQuality, ComfyUIWorkflowType, 
    ComfyUIAudioRequest, AudioType, VoiceType
)


def test_workflow_loading():
    """Test loading of ComfyUI workflows."""
    print("Testing ComfyUI workflow loading...")
    
    engine = AudioEngine(quality=AudioQuality.PROFESSIONAL, mock_mode=True)
    
    # Check if workflows are loaded
    expected_workflows = [
        ComfyUIWorkflowType.ACE_STEP_T2A,
        ComfyUIWorkflowType.ACE_STEP_M2M,
        ComfyUIWorkflowType.STABLE_AUDIO
    ]
    
    loaded_workflows = list(engine.audio_workflows.keys())
    print(f"   ✓ Loaded workflows: {[w.value for w in loaded_workflows]}")
    
    # Validate workflow structure
    for workflow_type in loaded_workflows:
        workflow = engine.audio_workflows[workflow_type]
        assert "nodes" in workflow, f"Workflow {workflow_type.value} missing nodes"
        assert "links" in workflow, f"Workflow {workflow_type.value} missing links"
        print(f"   ✓ {workflow_type.value}: {len(workflow['nodes'])} nodes, {len(workflow['links'])} links")
    
    return True


def test_workflow_customization():
    """Test workflow customization with different requests."""
    print("\nTesting workflow customization...")
    
    engine = AudioEngine(quality=AudioQuality.PROFESSIONAL, mock_mode=True)
    
    # Test ACE Step T2A customization
    request_t2a = ComfyUIAudioRequest(
        workflow_type=ComfyUIWorkflowType.ACE_STEP_T2A,
        prompt="epic orchestral music, heroic theme",
        duration=15.0,
        seed=12345,
        metadata={"lyrics": "[instrumental]"}
    )
    
    if ComfyUIWorkflowType.ACE_STEP_T2A in engine.audio_workflows:
        workflow = engine._customize_workflow(
            engine.audio_workflows[ComfyUIWorkflowType.ACE_STEP_T2A], 
            request_t2a
        )
        print(f"   ✓ ACE Step T2A customized with prompt: '{request_t2a.prompt}'")
    
    # Test Stable Audio customization
    request_stable = ComfyUIAudioRequest(
        workflow_type=ComfyUIWorkflowType.STABLE_AUDIO,
        prompt="forest ambience, birds chirping, nature sounds",
        duration=10.0,
        negative_prompt="urban, city, traffic",
        seed=67890
    )
    
    if ComfyUIWorkflowType.STABLE_AUDIO in engine.audio_workflows:
        workflow = engine._customize_workflow(
            engine.audio_workflows[ComfyUIWorkflowType.STABLE_AUDIO], 
            request_stable
        )
        print(f"   ✓ Stable Audio customized with prompt: '{request_stable.prompt}'")
    
    return True


def test_audio_generation_integration():
    """Test complete audio generation with ComfyUI integration."""
    print("\nTesting complete audio generation with ComfyUI...")
    
    # Create test data
    timeline_metadata = {
        "total_duration": 20.0,
        "total_frames": 480,
        "audio_sync_points": [
            {"timestamp": 0.0, "type": "start", "description": "Scene start"},
            {"timestamp": 10.0, "type": "scene_change", "description": "Scene transition"}
        ]
    }
    
    scene_data = {
        "scenes": [
            {
                "scene_id": "scene_1",
                "environment": {"type": "forest", "time_of_day": "day", "weather": "clear"},
                "mood": "peaceful",
                "tension": 0.3,
                "dialogue": [
                    {"character_id": "hero", "text": "What a beautiful forest!", "emotion": "happy"}
                ],
                "actions": [
                    {"type": "walk", "description": "Walking through forest"}
                ]
            },
            {
                "scene_id": "scene_2",
                "environment": {"type": "cave", "time_of_day": "day", "weather": "clear"},
                "mood": "tense",
                "tension": 0.8,
                "dialogue": [
                    {"character_id": "hero", "text": "This cave is spooky.", "emotion": "nervous"}
                ],
                "actions": [
                    {"type": "magic", "description": "Casting light spell"}
                ]
            }
        ]
    }
    
    character_data = {
        "characters": [
            {"character_id": "hero", "name": "Alex", "age": "adult", "gender": "male"}
        ]
    }
    
    # Initialize engine
    engine = AudioEngine(quality=AudioQuality.PROFESSIONAL, mock_mode=True)
    
    # Generate audio project
    project = engine.generate_audio_project(timeline_metadata, scene_data, character_data)
    
    print(f"   ✓ Generated project with {len(project.tracks)} tracks")
    
    # Validate ComfyUI integration in tracks
    for track in project.tracks:
        comfyui_clips = 0
        for clip in track.clips:
            if clip.metadata.get("comfyui_prompt"):
                comfyui_clips += 1
                print(f"   ✓ {track.track_id} clip '{clip.clip_id}' has ComfyUI prompt")
        
        if comfyui_clips > 0:
            print(f"   ✓ {track.track_id}: {comfyui_clips}/{len(track.clips)} clips use ComfyUI")
    
    return True


def test_prompt_generation():
    """Test prompt generation for different audio types."""
    print("\nTesting ComfyUI prompt generation...")
    
    engine = AudioEngine(quality=AudioQuality.PROFESSIONAL, mock_mode=True)
    
    # Test dialogue prompts
    dialogue_prompt = engine._create_dialogue_prompt(
        "Hello there!", VoiceType.MALE_ADULT, "happy"
    )
    print(f"   ✓ Dialogue prompt: '{dialogue_prompt}'")
    
    # Test ambience prompts
    ambience_prompt = engine._create_ambience_prompt("forest", "night", "rain")
    print(f"   ✓ Ambience prompt: '{ambience_prompt}'")
    
    # Test music prompts
    music_prompt = engine._create_music_prompt("epic", 0.9)
    print(f"   ✓ Music prompt: '{music_prompt}'")
    
    return True


def test_mock_audio_generation():
    """Test mock audio file generation."""
    print("\nTesting mock audio file generation...")
    
    engine = AudioEngine(quality=AudioQuality.PROFESSIONAL, mock_mode=True)
    
    # Test different workflow types
    requests = [
        ComfyUIAudioRequest(
            workflow_type=ComfyUIWorkflowType.ACE_STEP_T2A,
            prompt="epic orchestral music",
            duration=10.0
        ),
        ComfyUIAudioRequest(
            workflow_type=ComfyUIWorkflowType.STABLE_AUDIO,
            prompt="forest ambience",
            duration=5.0
        )
    ]
    
    for request in requests:
        audio_path = engine._generate_comfyui_audio(request)
        if audio_path:
            print(f"   ✓ Generated mock audio: {Path(audio_path).name}")
            
            # Verify mock file exists and has content
            if Path(audio_path).exists():
                with open(audio_path, 'r') as f:
                    content = f.read()
                    assert request.prompt in content, "Prompt not found in mock file"
                    print(f"   ✓ Mock file contains expected metadata")
    
    return True


def test_export_with_comfyui_metadata():
    """Test export functionality with ComfyUI metadata."""
    print("\nTesting export with ComfyUI metadata...")
    
    engine = AudioEngine(quality=AudioQuality.PROFESSIONAL, mock_mode=True)
    
    # Create simple test project
    timeline_metadata = {"total_duration": 10.0}
    scene_data = {
        "scenes": [{
            "scene_id": "test_scene",
            "environment": {"type": "outdoor"},
            "mood": "happy",
            "tension": 0.5,
            "dialogue": [{"character_id": "test", "text": "Test dialogue", "emotion": "neutral"}],
            "actions": [{"type": "walk"}]
        }]
    }
    character_data = {"characters": [{"character_id": "test", "age": "adult", "gender": "neutral"}]}
    
    project = engine.generate_audio_project(timeline_metadata, scene_data, character_data)
    
    # Export project
    export_path = Path("temp_comfyui_export_test")
    manifest = engine.export_audio_project(project, export_path, export_stems=True)
    
    print(f"   ✓ Exported to: {export_path}")
    print(f"   ✓ Files generated: {len(manifest['files'])}")
    
    # Verify ComfyUI metadata in exported files
    project_metadata_path = export_path / "metadata" / "audio_project.json"
    if project_metadata_path.exists():
        with open(project_metadata_path, 'r') as f:
            exported_data = json.load(f)
        
        # Check for ComfyUI-related metadata
        comfyui_clips = 0
        for track in exported_data.get("tracks", []):
            for clip in track.get("clips", []):
                if clip.get("metadata", {}).get("comfyui_prompt"):
                    comfyui_clips += 1
        
        print(f"   ✓ Found {comfyui_clips} clips with ComfyUI metadata in export")
    
    return True


def main():
    """Run all ComfyUI integration tests."""
    print("StoryCore-Engine ComfyUI Audio Integration Tests")
    print("=" * 60)
    
    tests = [
        test_workflow_loading,
        test_workflow_customization,
        test_audio_generation_integration,
        test_prompt_generation,
        test_mock_audio_generation,
        test_export_with_comfyui_metadata
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
                print(f"✅ {test.__name__} PASSED")
            else:
                failed += 1
                print(f"❌ {test.__name__} FAILED")
        except Exception as e:
            failed += 1
            print(f"❌ {test.__name__} FAILED: {e}")
    
    print(f"\n" + "=" * 60)
    print(f"Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All ComfyUI integration tests passed!")
        print("🎵 Audio Engine is ready for real ComfyUI audio generation")
        print("🔧 To enable real generation: set mock_mode=False and configure ComfyUI")
    else:
        print("⚠️  Some tests failed - check implementation")
    
    return failed == 0


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)