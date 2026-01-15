#!/usr/bin/env python3
"""Test script for Audio Engine CLI integration."""

import sys
import os
sys.path.append('.')

from src.audio_engine import AudioEngine, AudioQuality
import json
from pathlib import Path

def test_audio_generation():
    """Test audio generation functionality."""
    print("🎵 Testing Audio Engine CLI Integration")
    print("=" * 50)
    
    # Create test project directory
    project_path = Path("demo-audio-project")
    project_path.mkdir(exist_ok=True)
    
    # Create mock timeline metadata
    timeline_metadata = {
        "total_duration": 30.0,
        "total_frames": 720,
        "audio_sync_points": [
            {"timestamp": 0.0, "type": "start", "description": "Scene start"},
            {"timestamp": 10.0, "type": "scene_change", "description": "Scene transition"},
            {"timestamp": 20.0, "type": "climax", "description": "Dramatic moment"},
            {"timestamp": 30.0, "type": "end", "description": "Scene end"}
        ]
    }
    
    # Create mock scene data
    scene_data = {
        "scenes": [
            {
                "scene_id": "scene_1",
                "environment": {"type": "outdoor", "time_of_day": "day", "weather": "clear"},
                "mood": "peaceful",
                "tension": 0.3,
                "dialogue": [
                    {"character_id": "hero", "text": "What a beautiful day for an adventure!", "emotion": "happy"},
                    {"character_id": "companion", "text": "Indeed, but I sense danger ahead.", "emotion": "concerned"}
                ],
                "actions": [
                    {"type": "walk", "description": "Characters walking through forest"}
                ]
            },
            {
                "scene_id": "scene_2",
                "environment": {"type": "cave", "time_of_day": "day", "weather": "clear"},
                "mood": "tense",
                "tension": 0.8,
                "dialogue": [
                    {"character_id": "hero", "text": "This cave gives me the creeps.", "emotion": "nervous"},
                    {"character_id": "companion", "text": "Stay close. Something's not right.", "emotion": "alert"}
                ],
                "actions": [
                    {"type": "walk", "description": "Cautiously entering cave"},
                    {"type": "magic", "description": "Casting light spell"}
                ]
            }
        ]
    }
    
    # Create mock character data
    character_data = {
        "characters": [
            {"character_id": "hero", "name": "Alex", "age": "adult", "gender": "male"},
            {"character_id": "companion", "name": "Sam", "age": "adult", "gender": "female"}
        ]
    }
    
    print("✓ Test data created")
    
    # Initialize Audio Engine
    engine = AudioEngine(quality=AudioQuality.PROFESSIONAL, mock_mode=True)
    print("✓ Audio Engine initialized")
    
    # Generate audio project
    print("\n🎼 Generating audio project...")
    audio_project = engine.generate_audio_project(timeline_metadata, scene_data, character_data)
    
    print(f"✓ Audio project generated:")
    print(f"  • Project ID: {audio_project.project_id}")
    print(f"  • Duration: {audio_project.total_duration} seconds")
    print(f"  • Sample rate: {audio_project.sample_rate} Hz")
    print(f"  • Bit depth: {audio_project.bit_depth} bit")
    print(f"  • Tracks: {len(audio_project.tracks)}")
    print(f"  • Total clips: {sum(len(track.clips) for track in audio_project.tracks)}")
    print(f"  • Reverb zones: {len(audio_project.reverb_zones)}")
    print(f"  • Sync markers: {len(audio_project.sync_markers)}")
    
    # Show track breakdown
    print(f"\n🎵 Track breakdown:")
    for track in audio_project.tracks:
        print(f"  • {track.track_id}: {len(track.clips)} clips, volume {track.volume:.1f}")
    
    # Export audio project
    print(f"\n📁 Exporting audio project...")
    export_path = project_path / "audio_output"
    manifest = engine.export_audio_project(audio_project, export_path, export_stems=True)
    
    print(f"✓ Audio project exported to: {export_path}")
    print(f"  • Files generated: {len(manifest['files'])}")
    
    # Show quality metrics
    if "statistics" in manifest["metadata"]:
        stats = manifest["metadata"]["statistics"]
        quality_metrics = stats.get("quality_metrics", {})
        
        print(f"\n📊 Quality metrics:")
        print(f"  • Dialogue coverage: {quality_metrics.get('dialogue_coverage', 0):.1%}")
        print(f"  • SFX density: {quality_metrics.get('sfx_density', 0):.1f} events/second")
        print(f"  • Ambience consistency: {quality_metrics.get('ambience_consistency', 0):.1%}")
        print(f"  • Music continuity: {quality_metrics.get('music_continuity', 0):.1%}")
    
    print(f"\n✅ Audio Engine CLI integration test complete!")
    print(f"💡 Mock mode generated realistic audio project structure")
    print(f"🎵 Ready for integration with Assembly & Export Engine")

if __name__ == "__main__":
    test_audio_generation()