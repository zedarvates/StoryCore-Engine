#!/usr/bin/env python3
"""
Property-based tests for Audio Engine.

These tests validate universal correctness properties that should hold
for all audio generation scenarios, ensuring robust and reliable behavior
across different inputs and configurations.
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
from pathlib import Path
import tempfile
import shutil
import json
from typing import Dict, Any, List

# Import the modules to test
from src.audio_engine import (
    AudioEngine, AudioProject, AudioTrack, AudioClip, ReverbZone,
    AudioType, VoiceType, AudioQuality
)


# Test data generation strategies
@st.composite
def generate_timeline_metadata(draw):
    """Generate valid timeline metadata."""
    total_duration = draw(st.floats(min_value=5.0, max_value=300.0))
    total_frames = int(total_duration * 24)  # 24 FPS
    
    # Generate sync points
    num_sync_points = draw(st.integers(min_value=2, max_value=10))
    sync_points = []
    
    for i in range(num_sync_points):
        timestamp = (i / (num_sync_points - 1)) * total_duration
        sync_points.append({
            "timestamp": timestamp,
            "type": draw(st.sampled_from(["start", "scene_change", "climax", "end", "sync"])),
            "description": f"Sync point {i}",
            "frame_number": int(timestamp * 24)
        })
    
    return {
        "total_duration": total_duration,
        "total_frames": total_frames,
        "audio_sync_points": sync_points
    }


@st.composite
def generate_scene_data(draw):
    """Generate valid scene data."""
    num_scenes = draw(st.integers(min_value=1, max_value=5))
    scenes = []
    
    for i in range(num_scenes):
        # Generate dialogue
        num_dialogue = draw(st.integers(min_value=0, max_value=5))
        dialogue = []
        for j in range(num_dialogue):
            dialogue.append({
                "character_id": draw(st.sampled_from(["hero", "companion", "villain", "narrator"])),
                "text": draw(st.text(min_size=5, max_size=100, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs')))),
                "emotion": draw(st.sampled_from(["happy", "sad", "angry", "neutral", "excited", "concerned"])),
                "intensity": draw(st.floats(min_value=0.0, max_value=1.0))
            })
        
        # Generate actions
        num_actions = draw(st.integers(min_value=0, max_value=5))
        actions = []
        for k in range(num_actions):
            actions.append({
                "type": draw(st.sampled_from(["walk", "run", "fight", "magic", "open", "close"])),
                "description": f"Action {k} in scene {i}"
            })
        
        scene = {
            "scene_id": f"scene_{i}",
            "environment": {
                "type": draw(st.sampled_from(["outdoor", "indoor", "cave", "forest", "city"])),
                "time_of_day": draw(st.sampled_from(["day", "night", "dawn", "dusk"])),
                "weather": draw(st.sampled_from(["clear", "rain", "storm", "fog"]))
            },
            "mood": draw(st.sampled_from(["peaceful", "tense", "dramatic", "mysterious", "joyful"])),
            "tension": draw(st.floats(min_value=0.0, max_value=1.0)),
            "dialogue": dialogue,
            "actions": actions
        }
        scenes.append(scene)
    
    return {"scenes": scenes}


@st.composite
def generate_character_data(draw):
    """Generate valid character data."""
    num_characters = draw(st.integers(min_value=1, max_value=5))
    characters = []
    
    for i in range(num_characters):
        character = {
            "character_id": f"char_{i}",
            "name": draw(st.text(min_size=3, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Ll')))),
            "age": draw(st.sampled_from(["child", "young", "adult", "elderly"])),
            "gender": draw(st.sampled_from(["male", "female", "neutral"]))
        }
        characters.append(character)
    
    return {"characters": characters}


class TestAudioEngineProperties:
    """Property-based tests for Audio Engine core functionality."""
    
    @given(
        quality=st.sampled_from(list(AudioQuality)),
        mock_mode=st.booleans()
    )
    @settings(max_examples=10, deadline=5000)
    def test_audio_engine_initialization_consistency(self, quality, mock_mode):
        """
        Property AE-1: Audio Engine Initialization Consistency
        
        The Audio Engine should initialize consistently with valid settings
        regardless of quality level or mock mode configuration.
        """
        engine = AudioEngine(quality=quality, mock_mode=mock_mode)
        
        # Verify engine properties
        assert engine.quality == quality, "Quality setting not preserved"
        assert engine.mock_mode == mock_mode, "Mock mode setting not preserved"
        assert engine.sample_rate > 0, "Invalid sample rate"
        assert engine.bit_depth > 0, "Invalid bit depth"
        assert isinstance(engine.settings, dict), "Settings not properly initialized"
        assert isinstance(engine.character_voices, dict), "Character voices not initialized"
        assert isinstance(engine.acoustic_profiles, dict), "Acoustic profiles not initialized"
        
        # Verify quality settings are appropriate
        settings = engine.settings
        assert 0.0 <= settings["dialogue_quality"] <= 1.0, "Invalid dialogue quality range"
        assert 0.0 <= settings["sfx_density"] <= 1.0, "Invalid SFX density range"
        assert 0.0 <= settings["music_complexity"] <= 1.0, "Invalid music complexity range"
        assert 0.0 <= settings["reverb_quality"] <= 1.0, "Invalid reverb quality range"
    
    @given(
        timeline_metadata=generate_timeline_metadata(),
        scene_data=generate_scene_data(),
        character_data=generate_character_data(),
        quality=st.sampled_from(list(AudioQuality))
    )
    @settings(max_examples=7, deadline=10000)
    def test_audio_project_generation_completeness(self, timeline_metadata, scene_data, character_data, quality):
        """
        Property AE-2: Audio Project Generation Completeness
        
        Generated audio projects should always contain all required components
        and maintain structural integrity regardless of input data.
        """
        engine = AudioEngine(quality=quality, mock_mode=True)
        project = engine.generate_audio_project(timeline_metadata, scene_data, character_data)
        
        # Verify project structure
        assert isinstance(project, AudioProject), "Invalid project type"
        assert project.project_id, "Missing project ID"
        assert project.sample_rate > 0, "Invalid sample rate"
        assert project.bit_depth > 0, "Invalid bit depth"
        assert project.total_duration > 0, "Invalid total duration"
        
        # Verify tracks exist
        assert len(project.tracks) >= 4, "Missing required tracks (dialogue, SFX, ambience, music)"
        
        track_types = {track.track_type for track in project.tracks}
        required_types = {AudioType.DIALOGUE, AudioType.SFX, AudioType.AMBIENCE, AudioType.MUSIC}
        assert required_types.issubset(track_types), f"Missing required track types: {required_types - track_types}"
        
        # Verify each track has valid structure
        for track in project.tracks:
            assert track.track_id, "Track missing ID"
            assert isinstance(track.clips, list), "Track clips not a list"
            assert 0.0 <= track.volume <= 1.0, f"Invalid track volume: {track.volume}"
            
            # Verify clips in track
            for clip in track.clips:
                assert isinstance(clip, AudioClip), "Invalid clip type"
                assert clip.clip_id, "Clip missing ID"
                assert clip.start_time >= 0, "Invalid clip start time"
                assert clip.duration > 0, "Invalid clip duration"
                assert clip.content, "Clip missing content"
                assert 0.0 <= clip.volume <= 1.0, f"Invalid clip volume: {clip.volume}"
                assert -1.0 <= clip.pan <= 1.0, f"Invalid clip pan: {clip.pan}"
        
        # Verify reverb zones
        assert isinstance(project.reverb_zones, list), "Reverb zones not a list"
        for zone in project.reverb_zones:
            assert isinstance(zone, ReverbZone), "Invalid reverb zone type"
            assert zone.zone_id, "Reverb zone missing ID"
            assert zone.reverb_time > 0, "Invalid reverb time"
            assert 0.0 <= zone.wet_level <= 1.0, "Invalid wet level"
            assert 0.0 <= zone.dry_level <= 1.0, "Invalid dry level"
        
        # Verify sync markers
        assert isinstance(project.sync_markers, list), "Sync markers not a list"
        for marker in project.sync_markers:
            assert "timestamp" in marker, "Marker missing timestamp"
            assert "type" in marker, "Marker missing type"
            assert marker["timestamp"] >= 0, "Invalid marker timestamp"
        
        # Verify metadata
        assert isinstance(project.metadata, dict), "Project metadata not a dict"
        assert "generation_timestamp" in project.metadata, "Missing generation timestamp"
        assert "quality_level" in project.metadata, "Missing quality level"
    
    @given(
        timeline_metadata=generate_timeline_metadata(),
        scene_data=generate_scene_data(),
        character_data=generate_character_data()
    )
    @settings(max_examples=5, deadline=8000)
    def test_character_voice_assignment_consistency(self, timeline_metadata, scene_data, character_data):
        """
        Property AE-3: Character Voice Assignment Consistency
        
        Character voice assignments should be consistent and appropriate
        based on character attributes across all dialogue generation.
        """
        engine = AudioEngine(quality=AudioQuality.STANDARD, mock_mode=True)
        project = engine.generate_audio_project(timeline_metadata, scene_data, character_data)
        
        # Get dialogue track
        dialogue_track = next((t for t in project.tracks if t.track_type == AudioType.DIALOGUE), None)
        assert dialogue_track is not None, "Dialogue track not found"
        
        # Verify character voice consistency
        character_voices = {}
        for clip in dialogue_track.clips:
            if clip.character_id:
                if clip.character_id in character_voices:
                    # Same character should have same voice type
                    assert character_voices[clip.character_id] == clip.voice_type, \
                        f"Inconsistent voice type for character {clip.character_id}"
                else:
                    character_voices[clip.character_id] = clip.voice_type
                
                # Verify voice type is valid
                assert isinstance(clip.voice_type, VoiceType), "Invalid voice type"
                
                # Verify voice assignment logic
                character = next((c for c in character_data["characters"] if c["character_id"] == clip.character_id), None)
                if character:
                    age = character.get("age", "adult")
                    gender = character.get("gender", "neutral")
                    
                    # Verify age-appropriate voice assignment
                    if age == "child":
                        assert clip.voice_type == VoiceType.CHILD, "Child character should have child voice"
                    elif gender == "male" and age == "elderly":
                        assert clip.voice_type == VoiceType.MALE_ELDERLY, "Elderly male should have elderly male voice"
                    elif gender == "female" and age == "young":
                        assert clip.voice_type == VoiceType.FEMALE_YOUNG, "Young female should have young female voice"
    
    @given(
        timeline_metadata=generate_timeline_metadata(),
        scene_data=generate_scene_data(),
        character_data=generate_character_data()
    )
    @settings(max_examples=5, deadline=8000)
    def test_audio_synchronization_accuracy(self, timeline_metadata, scene_data, character_data):
        """
        Property AE-4: Audio Synchronization Accuracy
        
        Audio clips should be properly synchronized with timeline metadata
        and maintain temporal coherence across all tracks.
        """
        engine = AudioEngine(quality=AudioQuality.STANDARD, mock_mode=True)
        project = engine.generate_audio_project(timeline_metadata, scene_data, character_data)
        
        total_duration = timeline_metadata["total_duration"]
        
        # Verify all clips fit within project duration
        for track in project.tracks:
            for clip in track.clips:
                assert clip.start_time >= 0, "Clip starts before project start"
                assert clip.start_time + clip.duration <= total_duration + 1.0, \
                    f"Clip extends beyond project duration: {clip.start_time + clip.duration} > {total_duration}"
        
        # Verify sync markers are within bounds
        for marker in project.sync_markers:
            timestamp = marker["timestamp"]
            assert 0 <= timestamp <= total_duration, \
                f"Sync marker outside project bounds: {timestamp}"
        
        # Verify sync markers from timeline are preserved
        original_sync_points = timeline_metadata.get("audio_sync_points", [])
        project_timestamps = {marker["timestamp"] for marker in project.sync_markers}
        
        for sync_point in original_sync_points:
            original_timestamp = sync_point["timestamp"]
            # Allow small floating point tolerance
            assert any(abs(ts - original_timestamp) < 0.1 for ts in project_timestamps), \
                f"Original sync point {original_timestamp} not preserved in project"
    
    @given(
        timeline_metadata=generate_timeline_metadata(),
        scene_data=generate_scene_data(),
        character_data=generate_character_data()
    )
    @settings(max_examples=5, deadline=10000)
    def test_audio_export_completeness(self, timeline_metadata, scene_data, character_data):
        """
        Property AE-5: Audio Export Completeness
        
        Audio project exports should contain all required files and metadata
        with proper organization and data integrity.
        """
        engine = AudioEngine(quality=AudioQuality.STANDARD, mock_mode=True)
        project = engine.generate_audio_project(timeline_metadata, scene_data, character_data)
        
        # Create temporary export directory
        with tempfile.TemporaryDirectory() as temp_dir:
            export_path = Path(temp_dir) / "audio_export"
            manifest = engine.export_audio_project(project, export_path, export_stems=True)
            
            # Verify export manifest structure
            assert "project_id" in manifest, "Missing project ID in manifest"
            assert "export_timestamp" in manifest, "Missing export timestamp"
            assert "export_path" in manifest, "Missing export path"
            assert "files" in manifest, "Missing files section"
            assert "metadata" in manifest, "Missing metadata section"
            
            # Verify required files exist
            required_files = ["project_metadata", "sync_markers", "reverb_zones", "statistics"]
            for req_file in required_files:
                assert req_file in manifest["files"], f"Missing required file: {req_file}"
                file_path = Path(manifest["files"][req_file])
                assert file_path.exists(), f"Required file does not exist: {file_path}"
            
            # Verify stem files for each track
            for track in project.tracks:
                stem_key = f"stem_{track.track_id}"
                assert stem_key in manifest["files"], f"Missing stem file for track: {track.track_id}"
                stem_path = Path(manifest["files"][stem_key])
                assert stem_path.exists(), f"Stem file does not exist: {stem_path}"
            
            # Verify directory structure
            assert export_path.exists(), "Export directory not created"
            assert (export_path / "stems").exists(), "Stems directory not created"
            assert (export_path / "metadata").exists(), "Metadata directory not created"
            
            # Verify metadata files contain valid JSON
            metadata_files = ["project_metadata", "sync_markers", "reverb_zones", "statistics"]
            for meta_file in metadata_files:
                file_path = Path(manifest["files"][meta_file])
                with open(file_path, 'r') as f:
                    data = json.load(f)
                    assert isinstance(data, (dict, list)), f"Invalid JSON structure in {meta_file}"
            
            # Verify statistics completeness
            stats = manifest["metadata"]["statistics"]
            assert "project_overview" in stats, "Missing project overview in statistics"
            assert "track_analysis" in stats, "Missing track analysis in statistics"
            assert "content_analysis" in stats, "Missing content analysis in statistics"
            assert "quality_metrics" in stats, "Missing quality metrics in statistics"
            
            # Verify project overview statistics
            overview = stats["project_overview"]
            assert overview["total_duration"] > 0, "Invalid total duration in statistics"
            assert overview["track_count"] == len(project.tracks), "Track count mismatch in statistics"
            assert overview["total_clips"] == sum(len(track.clips) for track in project.tracks), \
                "Total clips mismatch in statistics"
    
    @given(
        scene_data=generate_scene_data()
    )
    @settings(max_examples=7, deadline=5000)
    def test_reverb_zone_assignment_logic(self, scene_data):
        """
        Property AE-6: Reverb Zone Assignment Logic
        
        Reverb zones should be assigned appropriately based on scene environments
        and maintain acoustic consistency across similar environments.
        """
        engine = AudioEngine(quality=AudioQuality.STANDARD, mock_mode=True)
        
        # Generate minimal timeline and character data
        timeline_metadata = {"total_duration": 30.0, "audio_sync_points": []}
        character_data = {"characters": [{"character_id": "test", "age": "adult", "gender": "neutral"}]}
        
        project = engine.generate_audio_project(timeline_metadata, scene_data, character_data)
        
        # Collect unique environment types from scenes
        scene_environments = set()
        for scene in scene_data["scenes"]:
            env_type = scene.get("environment", {}).get("type", "indoor")
            scene_environments.add(env_type)
        
        # Verify reverb zones exist for environments
        zone_ids = {zone.zone_id for zone in project.reverb_zones}
        
        # Each unique environment should have a corresponding reverb zone
        for env_type in scene_environments:
            assert env_type in zone_ids or any(env_type in zone_id for zone_id in zone_ids), \
                f"No reverb zone found for environment type: {env_type}"
        
        # Verify reverb zone properties are valid
        for zone in project.reverb_zones:
            assert zone.zone_id, "Reverb zone missing ID"
            assert zone.name, "Reverb zone missing name"
            assert zone.reverb_time > 0, f"Invalid reverb time: {zone.reverb_time}"
            assert zone.pre_delay >= 0, f"Invalid pre-delay: {zone.pre_delay}"
            assert 0.0 <= zone.room_size <= 1.0, f"Invalid room size: {zone.room_size}"
            assert 0.0 <= zone.damping <= 1.0, f"Invalid damping: {zone.damping}"
            assert 0.0 <= zone.wet_level <= 1.0, f"Invalid wet level: {zone.wet_level}"
            assert 0.0 <= zone.dry_level <= 1.0, f"Invalid dry level: {zone.dry_level}"
        
        # Verify acoustic appropriateness for known environments
        for zone in project.reverb_zones:
            if zone.zone_id == "outdoor":
                assert zone.reverb_time < 1.0, "Outdoor should have short reverb time"
                assert zone.wet_level < 0.5, "Outdoor should have low wet level"
            elif zone.zone_id == "cathedral":
                assert zone.reverb_time > 3.0, "Cathedral should have long reverb time"
                assert zone.wet_level > 0.5, "Cathedral should have high wet level"
            elif zone.zone_id == "cave":
                assert zone.reverb_time > 2.0, "Cave should have long reverb time"
    
    @given(
        quality1=st.sampled_from(list(AudioQuality)),
        quality2=st.sampled_from(list(AudioQuality)),
        timeline_metadata=generate_timeline_metadata(),
        scene_data=generate_scene_data(),
        character_data=generate_character_data()
    )
    @settings(max_examples=5, deadline=8000)
    def test_quality_level_consistency(self, quality1, quality2, timeline_metadata, scene_data, character_data):
        """
        Property AE-7: Quality Level Consistency
        
        Different quality levels should produce structurally similar projects
        with appropriate quality differences in settings and parameters.
        """
        assume(quality1 != quality2)  # Only test different quality levels
        
        engine1 = AudioEngine(quality=quality1, mock_mode=True)
        engine2 = AudioEngine(quality=quality2, mock_mode=True)
        
        project1 = engine1.generate_audio_project(timeline_metadata, scene_data, character_data)
        project2 = engine2.generate_audio_project(timeline_metadata, scene_data, character_data)
        
        # Both projects should have same structural elements
        assert len(project1.tracks) == len(project2.tracks), "Different number of tracks between quality levels"
        
        track_types1 = {track.track_type for track in project1.tracks}
        track_types2 = {track.track_type for track in project2.tracks}
        assert track_types1 == track_types2, "Different track types between quality levels"
        
        # Both should have same total duration
        assert abs(project1.total_duration - project2.total_duration) < 0.1, \
            "Significant duration difference between quality levels"
        
        # Quality settings should be different and appropriate
        settings1 = engine1.settings
        settings2 = engine2.settings
        
        # Higher quality should have higher or equal settings
        quality_order = [AudioQuality.DRAFT, AudioQuality.STANDARD, AudioQuality.PROFESSIONAL, AudioQuality.BROADCAST]
        if quality_order.index(quality1) < quality_order.index(quality2):
            # quality2 is higher quality
            assert settings2["dialogue_quality"] >= settings1["dialogue_quality"], \
                "Higher quality should have better dialogue quality"
            assert settings2["sample_rate"] >= settings1["sample_rate"], \
                "Higher quality should have higher sample rate"
        
        # Both projects should have valid reverb zones and sync markers
        assert len(project1.reverb_zones) > 0, "Project 1 missing reverb zones"
        assert len(project2.reverb_zones) > 0, "Project 2 missing reverb zones"
        assert len(project1.sync_markers) > 0, "Project 1 missing sync markers"
        assert len(project2.sync_markers) > 0, "Project 2 missing sync markers"


def test_audio_engine_basic_functionality():
    """Basic functionality test to ensure the Audio Engine works correctly."""
    # Create simple test data
    timeline_metadata = {
        "total_duration": 20.0,
        "total_frames": 480,
        "audio_sync_points": [
            {"timestamp": 0.0, "type": "start", "description": "Start"},
            {"timestamp": 20.0, "type": "end", "description": "End"}
        ]
    }
    
    scene_data = {
        "scenes": [
            {
                "scene_id": "test_scene",
                "environment": {"type": "outdoor", "time_of_day": "day", "weather": "clear"},
                "mood": "peaceful",
                "tension": 0.3,
                "dialogue": [
                    {"character_id": "hero", "text": "Hello world!", "emotion": "happy"}
                ],
                "actions": [
                    {"type": "walk", "description": "Walking"}
                ]
            }
        ]
    }
    
    character_data = {
        "characters": [
            {"character_id": "hero", "name": "Hero", "age": "adult", "gender": "male"}
        ]
    }
    
    # Test engine initialization
    engine = AudioEngine(quality=AudioQuality.STANDARD, mock_mode=True)
    assert engine is not None
    
    # Test project generation
    project = engine.generate_audio_project(timeline_metadata, scene_data, character_data)
    assert project is not None
    assert len(project.tracks) >= 4  # dialogue, SFX, ambience, music
    
    # Test export
    with tempfile.TemporaryDirectory() as temp_dir:
        export_path = Path(temp_dir) / "test_export"
        manifest = engine.export_audio_project(project, export_path)
        assert manifest is not None
        assert export_path.exists()


if __name__ == "__main__":
    # Run basic functionality test
    test_audio_engine_basic_functionality()
    print("✅ Audio Engine basic functionality test passed!")
    
    # Run a few property tests manually
    print("Running property-based tests...")
    
    # You can run individual property tests here for debugging
    # pytest.main([__file__, "-v"])