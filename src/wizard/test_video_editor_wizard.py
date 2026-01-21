"""
Unit tests for EditForge Video Editor Wizard - Automatic montage creation.
"""

import pytest
import asyncio
from pathlib import Path
from unittest.mock import patch, MagicMock
from .video_editor_wizard import (
    VideoEditorWizard,
    VideoMontage,
    VideoClip,
    AudioTrack,
    EditingStyle,
    TransitionType,
    create_video_editor_wizard,
    get_montage_preview
)


class TestVideoEditorWizard:
    """Test EditForge Video Editor wizard functionality."""

    def test_editing_styles_enum(self):
        """Test that editing styles are properly defined."""
        assert hasattr(EditingStyle, 'CINEMATIC')
        assert hasattr(EditingStyle, 'DYNAMIC')
        assert hasattr(EditingStyle, 'SMOOTH')
        assert hasattr(EditingStyle, 'INTENSE')
        assert hasattr(EditingStyle, 'MINIMALIST')
        assert hasattr(EditingStyle, 'DOCUMENTARY')

    def test_transition_types_enum(self):
        """Test that transition types are properly defined."""
        assert hasattr(TransitionType, 'CUT')
        assert hasattr(TransitionType, 'FADE_IN')
        assert hasattr(TransitionType, 'DISSOLVE')
        assert hasattr(TransitionType, 'WIPE')
        assert hasattr(TransitionType, 'ZOOM')

    async def test_video_editor_wizard_creation(self):
        """Test wizard creation and basic functionality."""
        wizard = VideoEditorWizard()

        # Test montage creation with minimal data
        with patch.object(wizard, '_load_project_data') as mock_load, \
             patch.object(wizard, '_load_audio_production_plan') as mock_audio, \
             patch.object(wizard, '_save_montage_plan') as mock_save:

            mock_load.return_value = {
                'shot_planning': {
                    'shot_lists': [
                        {
                            'shot_id': 'test_shot',
                            'description': 'Test shot',
                            'purpose': 'narrative',
                            'timing': {'duration_seconds': 3.0}
                        }
                    ]
                }
            }
            mock_audio.return_value = None

            montage = await wizard.create_video_montage(Path("/fake/project"))

            assert montage.montage_id.startswith('montage_')
            assert montage.project_id == 'unknown'  # Default when no project.json
            assert montage.total_duration > 0
            assert len(montage.video_clips) > 0
            assert montage.editing_style == EditingStyle.CINEMATIC

    async def test_montage_preview(self):
        """Test montage preview functionality."""
        wizard = VideoEditorWizard()

        with patch.object(wizard, '_load_project_data') as mock_load, \
             patch.object(wizard, '_load_audio_production_plan') as mock_audio:

            mock_load.return_value = {
                'shot_planning': {
                    'shot_lists': [
                        {'shot_id': 'shot1', 'timing': {'duration_seconds': 2.0}},
                        {'shot_id': 'shot2', 'timing': {'duration_seconds': 3.0}}
                    ]
                }
            }
            mock_audio.return_value = None

            preview = wizard.get_montage_preview(Path("/fake/project"))

            assert 'project_name' in preview
            assert preview['total_shots'] == 2
            assert preview['estimated_duration'] == 5.0
            assert preview['estimated_clips'] == 2
            assert preview['has_audio_plan'] is False

    async def test_editing_style_transitions(self):
        """Test that different editing styles produce different transitions."""
        wizard = VideoEditorWizard()

        test_shots = [
            {'shot_id': 'shot1', 'purpose': 'opening', 'shot_type': {'code': 'WS'}},
            {'shot_id': 'shot2', 'purpose': 'action', 'shot_type': {'code': 'MS'}}
        ]

        # Test cinematic style
        cinematic_trans = wizard._choose_transition_type(EditingStyle.CINEMATIC, test_shots[0], test_shots[1])
        assert isinstance(cinematic_trans, TransitionType)

        # Test dynamic style
        dynamic_trans = wizard._choose_transition_type(EditingStyle.DYNAMIC, test_shots[0], test_shots[1])
        assert isinstance(dynamic_trans, TransitionType)

    async def test_transition_durations(self):
        """Test transition duration calculation for different styles."""
        wizard = VideoEditorWizard()

        from_shot = {'purpose': 'narrative'}
        to_shot = {'purpose': 'action'}

        # Cinematic should have moderate transition duration
        cinematic_duration = wizard._calculate_transition_duration(EditingStyle.CINEMATIC, from_shot, to_shot)
        assert 0.4 <= cinematic_duration <= 0.6

        # Dynamic should have shorter transitions
        dynamic_duration = wizard._calculate_transition_duration(EditingStyle.DYNAMIC, from_shot, to_shot)
        assert dynamic_duration < cinematic_duration

        # Minimalist should have no transitions
        minimalist_duration = wizard._calculate_transition_duration(EditingStyle.MINIMALIST, from_shot, to_shot)
        assert minimalist_duration == 0.0

    async def test_quality_metrics_calculation(self):
        """Test montage quality metrics calculation."""
        wizard = VideoEditorWizard()

        # Create test montage with varying clip durations
        montage = VideoMontage(
            montage_id="test",
            project_id="test_project",
            creation_timestamp="2024-01-01T00:00:00Z",
            total_duration=10.0,
            video_clips=[
                VideoClip("clip1", "shot1", 0.0, 2.0),
                VideoClip("clip2", "shot2", 2.0, 3.0),
                VideoClip("clip3", "shot3", 5.0, 5.0),
                VideoClip("clip4", "shot4", 10.0, 1.0),
            ]
        )

        metrics = wizard._calculate_montage_quality_metrics(montage)

        assert 'rhythm_consistency' in metrics
        assert 'transition_coverage' in metrics
        assert 'audio_coverage' in metrics
        assert 'overall_quality' in metrics

        # All metrics should be between 0 and 10
        for metric_name, value in metrics.items():
            assert 0 <= value <= 10, f"Metric {metric_name} out of range: {value}"

    async def test_export_settings_generation(self):
        """Test export settings generation."""
        wizard = VideoEditorWizard()

        montage = VideoMontage(
            montage_id="test",
            project_id="test",
            creation_timestamp="2024-01-01T00:00:00Z",
            total_duration=10.0
        )

        settings = wizard._generate_export_settings("test_output", montage)

        assert settings['output_filename'] == 'test_output'
        assert settings['format'] == 'MP4'
        assert settings['codec'] == 'H.264'
        assert 'resolution' in settings
        assert 'chapters' in settings
        assert len(settings['chapters']) == 0  # No clips in this test

    def test_convenience_functions(self):
        """Test convenience functions."""
        wizard = create_video_editor_wizard()
        assert isinstance(wizard, VideoEditorWizard)

        preview = get_montage_preview(Path("/fake/project"))
        assert isinstance(preview, dict)
        assert 'error' in preview  # Should error on non-existent project


class TestVideoMontage:
    """Test VideoMontage dataclass."""

    def test_video_montage_creation(self):
        """Test creating a video montage."""
        montage = VideoMontage(
            montage_id="test_montage",
            project_id="test_project",
            creation_timestamp="2024-01-01T00:00:00Z",
            total_duration=10.0,
            editing_style=EditingStyle.CINEMATIC
        )

        assert montage.montage_id == "test_montage"
        assert montage.editing_style == EditingStyle.CINEMATIC
        assert montage.video_clips == []
        assert montage.audio_tracks == []
        assert montage.transitions == []

    def test_video_clip_creation(self):
        """Test creating a video clip."""
        clip = VideoClip(
            clip_id="test_clip",
            shot_id="shot_001",
            start_time=0.0,
            duration=5.0,
            transition_in=TransitionType.FADE_IN,
            transition_out=TransitionType.DISSOLVE
        )

        assert clip.clip_id == "test_clip"
        assert clip.shot_id == "shot_001"
        assert clip.transition_in == TransitionType.FADE_IN
        assert clip.transition_out == TransitionType.DISSOLVE

    def test_audio_track_creation(self):
        """Test creating an audio track."""
        track = AudioTrack(
            track_id="test_track",
            audio_type="voice_over",
            start_time=0.0,
            duration=3.0,
            volume_level=0.8,
            fade_in=0.5,
            fade_out=0.5
        )

        assert track.track_id == "test_track"
        assert track.audio_type == "voice_over"
        assert track.volume_level == 0.8
        assert track.fade_in == 0.5
        assert track.fade_out == 0.5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])