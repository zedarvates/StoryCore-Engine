"""
Unit tests for Shot Reference Wizard functionality.
"""

import pytest
import asyncio
from pathlib import Path
from unittest.mock import patch, MagicMock
from .shot_reference_wizard import (
    ShotReferenceWizard,
    ShotReferenceSpec,
    ShotReferenceResult,
    ReferenceImageStyle,
    ImageQuality,
    create_shot_reference_wizard,
    generate_shot_references
)


class TestShotReferenceSpec:
    """Test ShotReferenceSpec class."""

    def test_shot_spec_creation(self):
        """Test creating a shot reference specification."""
        spec = ShotReferenceSpec(
            shot_id="shot_001",
            shot_number=1,
            shot_type="CU",
            camera_angle="eye-level",
            camera_movement="static",
            lens_type="normal",
            duration_seconds=2.5,
            purpose="emotional",
            characters=[{"name": "Alice", "description": "young woman"}],
            environment={"type": "indoor", "time_of_day": "day"},
            lighting={"type": "natural", "intensity": "medium"}
        )

        assert spec.shot_id == "shot_001"
        assert spec.shot_type == "CU"
        assert spec.camera_angle == "eye-level"
        assert spec.purpose == "emotional"
        assert len(spec.characters) == 1

    def test_generate_prompt_cinematic(self):
        """Test prompt generation for cinematic style."""
        spec = ShotReferenceSpec(
            shot_id="shot_001",
            shot_number=1,
            shot_type="CU",
            camera_angle="eye-level",
            camera_movement="static",
            lens_type="normal",
            duration_seconds=2.5,
            purpose="emotional"
        )

        prompt = spec.generate_prompt(ReferenceImageStyle.CINEMATIC)

        assert "close-up, character face and expression" in prompt
        assert "eye level camera view, neutral perspective" in prompt
        assert "cinematic lighting, film still" in prompt

    def test_generate_prompt_storyboard(self):
        """Test prompt generation for storyboard style."""
        spec = ShotReferenceSpec(
            shot_id="shot_001",
            shot_number=1,
            shot_type="LS",
            camera_angle="low-angle",
            camera_movement="dolly-in",
            lens_type="wide",
            duration_seconds=3.0,
            purpose="establishing"
        )

        prompt = spec.generate_prompt(ReferenceImageStyle.STORYBOARD)

        assert "long shot, full scene view" in prompt
        assert "low angle camera view, looking up" in prompt
        assert "storyboard style, line art" in prompt

    def test_get_negative_prompt(self):
        """Test negative prompt generation."""
        spec = ShotReferenceSpec(
            shot_id="shot_001",
            shot_number=1,
            shot_type="CU",
            camera_angle="eye-level",
            camera_movement="static",
            lens_type="normal",
            duration_seconds=2.5,
            purpose="emotional"
        )

        negative = spec.get_negative_prompt()

        assert "blurry, low quality" in negative
        assert "distorted, ugly" in negative
        assert "watermark, text" in negative


class TestShotReferenceWizard:
    """Test ShotReferenceWizard class."""

    def test_wizard_creation(self):
        """Test wizard initialization."""
        wizard = ShotReferenceWizard()

        assert wizard.generation_results == []
        assert wizard.reference_specs == []

    @patch('builtins.open')
    @patch('pathlib.Path.exists')
    def test_load_shot_data(self, mock_exists, mock_open):
        """Test loading shot data from project files."""
        # Mock file existence
        mock_exists.return_value = True

        # Mock shot planning data
        mock_shot_data = {
            "shot_lists": [
                {
                    "shot_id": "shot_001",
                    "shot_number": 1,
                    "shot_type": {"code": "CU"},
                    "camera": {
                        "angle": {"type": "eye-level"},
                        "movement": {"type": "static"},
                        "lens": {"type": "normal"}
                    },
                    "timing": {"duration_seconds": 2.5},
                    "narrative_function": {"primary_purpose": "emotional"},
                    "characters": [{"name": "Alice"}]
                }
            ]
        }

        # Mock scene breakdown data
        mock_scene_data = {
            "detailed_scenes": [
                {
                    "scene_id": "scene_001",
                    "environment": {
                        "type": "indoor",
                        "time_of_day": "day"
                    }
                }
            ]
        }

        # Mock file opening
        mock_file = MagicMock()
        mock_file.__enter__.return_value = mock_file
        mock_file.__exit__.return_value = None

        # Return different data based on file path
        def mock_read_side_effect(*args, **kwargs):
            import json
            if 'shot_planning.json' in str(args[0]):
                return json.dumps(mock_shot_data)
            elif 'scene_breakdown.json' in str(args[0]):
                return json.dumps(mock_scene_data)
            return '{}'

        mock_file.read.side_effect = mock_read_side_effect
        mock_open.return_value = mock_file

        wizard = ShotReferenceWizard()
        specs = wizard.load_shot_data(Path("/fake/project"))

        assert len(specs) == 1
        assert specs[0].shot_id == "shot_001"
        assert specs[0].shot_type == "CU"
        assert specs[0].environment["type"] == "indoor"

    @patch('pathlib.Path.mkdir')
    @patch('pathlib.Path.exists')
    def test_generate_reference_images_mock(self, mock_exists, mock_mkdir):
        """Test reference image generation with mock mode."""
        # Setup mock wizard with test data
        wizard = ShotReferenceWizard()

        # Create test spec
        spec = ShotReferenceSpec(
            shot_id="shot_001",
            shot_number=1,
            shot_type="CU",
            camera_angle="eye-level",
            camera_movement="static",
            lens_type="normal",
            duration_seconds=2.5,
            purpose="emotional"
        )
        wizard.reference_specs = [spec]

        mock_exists.return_value = True

        async def run_test():
            results = await wizard.generate_reference_images(
                Path("/fake/project"),
                ReferenceImageStyle.CINEMATIC,
                ImageQuality.STANDARD
            )

            assert len(results) == 1
            assert results[0].shot_id == "shot_001"
            assert results[0].success is True
            assert "reference_mock.png" in results[0].image_path

        asyncio.run(run_test())

    def test_get_preview_prompts(self):
        """Test prompt preview functionality."""
        wizard = ShotReferenceWizard()

        # Create test specs
        specs = [
            ShotReferenceSpec(
                shot_id="shot_001",
                shot_number=1,
                shot_type="CU",
                camera_angle="eye-level",
                camera_movement="static",
                lens_type="normal",
                duration_seconds=2.5,
                purpose="emotional"
            ),
            ShotReferenceSpec(
                shot_id="shot_002",
                shot_number=2,
                shot_type="LS",
                camera_angle="low-angle",
                camera_movement="dolly-in",
                lens_type="wide",
                duration_seconds=3.0,
                purpose="establishing"
            )
        ]
        wizard.reference_specs = specs

        # Test preview all
        previews = wizard.get_preview_prompts()
        assert len(previews) == 2
        assert "shot_001" in previews
        assert "shot_002" in previews

        # Test preview specific
        previews = wizard.get_preview_prompts(["shot_001"])
        assert len(previews) == 1
        assert "shot_001" in previews


class TestConvenienceFunctions:
    """Test convenience functions."""

    def test_create_shot_reference_wizard(self):
        """Test wizard creation function."""
        wizard = create_shot_reference_wizard()
        assert isinstance(wizard, ShotReferenceWizard)

    @patch('asyncio.run')
    def test_generate_shot_references(self, mock_asyncio_run):
        """Test convenience generation function."""
        mock_asyncio_run.return_value = []

        results = asyncio.run(generate_shot_references(
            Path("/fake/project"),
            style="cinematic",
            quality="standard"
        ))

        mock_asyncio_run.assert_called_once()


class TestEnums:
    """Test enum definitions."""

    def test_reference_image_style_enum(self):
        """Test ReferenceImageStyle enum values."""
        assert ReferenceImageStyle.CINEMATIC.value == "cinematic"
        assert ReferenceImageStyle.STORYBOARD.value == "storyboard"
        assert ReferenceImageStyle.REALISTIC.value == "realistic"
        assert ReferenceImageStyle.CONCEPT_ART.value == "concept_art"

    def test_image_quality_enum(self):
        """Test ImageQuality enum values."""
        assert ImageQuality.DRAFT.value == "draft"
        assert ImageQuality.STANDARD.value == "standard"
        assert ImageQuality.HIGH.value == "high"
        assert ImageQuality.MAXIMUM.value == "maximum"


class TestIntegrationScenarios:
    """Test integration scenarios."""

    def test_complete_workflow_simulation(self):
        """Test a complete workflow from spec creation to result."""
        # Create spec
        spec = ShotReferenceSpec(
            shot_id="shot_001",
            shot_number=1,
            shot_type="CU",
            camera_angle="eye-level",
            camera_movement="static",
            lens_type="normal",
            duration_seconds=2.5,
            purpose="emotional",
            characters=[{
                "description": "young woman with expressive eyes",
                "visibility": "primary_focus"
            }],
            environment={
                "type": "indoor",
                "time_of_day": "afternoon"
            }
        )

        # Test prompt generation
        prompt = spec.generate_prompt(ReferenceImageStyle.CINEMATIC)
        assert "close-up, character face and expression" in prompt
        assert "featuring young woman with expressive eyes, main subject" in prompt
        assert "indoor environment, afternoon lighting" in prompt

        # Test result creation
        result = ShotReferenceResult(
            shot_id="shot_001",
            success=True,
            image_path="/path/to/image.png",
            prompt_used=prompt,
            generation_time=5.2
        )

        assert result.shot_id == "shot_001"
        assert result.success is True
        assert result.generation_time == 5.2

    def test_different_shot_types_prompts(self):
        """Test prompt generation for different shot types."""
        test_cases = [
            ("ELS", "extreme long shot, wide establishing view"),
            ("LS", "long shot, full scene view"),
            ("FS", "full shot, character full body view"),
            ("CU", "close-up, character face and expression"),
            ("ECU", "extreme close-up, character eyes and details")
        ]

        for shot_type, expected_text in test_cases:
            spec = ShotReferenceSpec(
                shot_id=f"shot_{shot_type}",
                shot_number=1,
                shot_type=shot_type,
                camera_angle="eye-level",
                camera_movement="static",
                lens_type="normal",
                duration_seconds=2.5,
                purpose="establishing"
            )

            prompt = spec.generate_prompt()
            assert expected_text in prompt

    def test_camera_angles_in_prompts(self):
        """Test camera angle descriptions in prompts."""
        test_cases = [
            ("eye-level", "eye level camera view, neutral perspective"),
            ("low-angle", "low angle camera view, looking up"),
            ("high-angle", "high angle camera view, looking down")
        ]

        for angle, expected_text in test_cases:
            spec = ShotReferenceSpec(
                shot_id="shot_test",
                shot_number=1,
                shot_type="CU",
                camera_angle=angle,
                camera_movement="static",
                lens_type="normal",
                duration_seconds=2.5,
                purpose="emotional"
            )

            prompt = spec.generate_prompt()
            assert expected_text in prompt

    def test_lens_types_in_prompts(self):
        """Test lens type descriptions in prompts."""
        test_cases = [
            ("wide", "wide angle lens, expansive perspective"),
            ("telephoto", "telephoto lens, compressed perspective, shallow depth of field"),
            ("normal", "normal lens, natural perspective")
        ]

        for lens, expected_text in test_cases:
            spec = ShotReferenceSpec(
                shot_id="shot_test",
                shot_number=1,
                shot_type="CU",
                camera_angle="eye-level",
                camera_movement="static",
                lens_type=lens,
                duration_seconds=2.5,
                purpose="emotional"
            )

            prompt = spec.generate_prompt()
            assert expected_text in prompt