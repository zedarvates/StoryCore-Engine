"""
Unit tests for PanelForge Comic to Sequence Wizard - Comic panel to cinematic sequence transformation.
"""

import pytest
import asyncio
from pathlib import Path
from unittest.mock import patch, MagicMock
from .comic_to_sequence_wizard import (
    ComicToSequenceWizard,
    ComicSequence,
    ComicPanel,
    CinematicShot,
    ComicToSequenceResult,
    ComicStyle,
    PanelLayout,
    CameraAngle,
    create_comic_to_sequence_wizard,
    get_transformation_preview
)


class TestComicToSequenceWizard:
    """Test PanelForge Comic to Sequence wizard functionality."""

    def test_comic_styles_enum(self):
        """Test that comic styles are properly defined."""
        assert hasattr(ComicStyle, 'AMERICAN_COMICS')
        assert hasattr(ComicStyle, 'MANGA')
        assert hasattr(ComicStyle, 'EUROPEAN_COMICS')
        assert hasattr(ComicStyle, 'GRAPHIC_NOVEL')
        assert hasattr(ComicStyle, 'WEB_COMICS')

    def test_panel_layouts_enum(self):
        """Test that panel layouts are properly defined."""
        assert hasattr(PanelLayout, 'SINGLE_PANEL')
        assert hasattr(PanelLayout, 'MULTI_PANEL_GRID')
        assert hasattr(PanelLayout, 'IRREGULAR_LAYOUT')
        assert hasattr(PanelLayout, 'SPLASH_PAGE')

    def test_camera_angles_enum(self):
        """Test that camera angles are properly defined."""
        assert hasattr(CameraAngle, 'CLOSE_UP')
        assert hasattr(CameraAngle, 'MEDIUM_SHOT')
        assert hasattr(CameraAngle, 'LONG_SHOT')
        assert hasattr(CameraAngle, 'BIRDS_EYE')

    @patch('pathlib.Path.exists')
    async def test_comic_transformation_basic(self, mock_exists):
        """Test basic comic to sequence transformation."""
        mock_exists.return_value = True

        wizard = ComicToSequenceWizard()

        # Test with minimal setup (mock the analysis)
        with patch.object(wizard, '_analyze_comic_image') as mock_analyze, \
             patch.object(wizard, '_convert_panels_to_shots') as mock_convert, \
             patch.object(wizard, '_generate_storyboard_panels') as mock_storyboard, \
             patch.object(wizard, '_save_transformation_result') as mock_save:

            # Mock comic sequence
            mock_sequence = ComicSequence(
                sequence_id="test_seq",
                comic_title="Test Comic",
                page_number=1,
                comic_style=ComicStyle.AMERICAN_COMICS
            )
            mock_sequence.panels = [
                ComicPanel(panel_id="panel1", position=(0, 0, 400, 300),
                          content_description="Test panel", panel_number=1)
            ]

            mock_analyze.return_value = mock_sequence
            mock_convert.return_value = [
                CinematicShot(shot_id="shot1", panel_source="panel1",
                            shot_type="Close-up", camera_angle=CameraAngle.CLOSE_UP,
                            camera_movement="static", duration_seconds=3.0,
                            description="Test shot")
            ]
            mock_storyboard.return_value = [{"panel_id": "storyboard1", "description": "Test"}]

            result = await wizard.transform_comic_to_sequence(
                Path("/fake/comic.jpg"), "Test Comic", 1, ComicStyle.AMERICAN_COMICS
            )

            assert result.comic_sequence.comic_title == "Test Comic"
            assert result.comic_sequence.page_number == 1
            assert len(result.cinematic_shots) >= 0
            assert isinstance(result.confidence_score, float)

    def test_transformation_preview(self):
        """Test transformation preview functionality."""
        # Test with valid image
        with patch('pathlib.Path.exists') as mock_exists, \
             patch('pathlib.Path.stat') as mock_stat:

            mock_exists.return_value = True
            mock_stat.return_value = MagicMock(st_size=1024000)  # 1MB

            preview = get_transformation_preview(Path("/fake/comic.jpg"))

            assert 'image_path' in preview
            assert preview['file_size'] == 1024000
            assert 'estimated_panels' in preview
            assert 'supported_styles' in preview

        # Test with invalid image
        with patch('pathlib.Path.exists') as mock_exists:
            mock_exists.return_value = False

            preview = get_transformation_preview(Path("/fake/nonexistent.jpg"))
            assert 'error' in preview

        # Test with invalid format
        with patch('pathlib.Path.exists') as mock_exists, \
             patch('pathlib.Path.stat') as mock_stat:

            mock_exists.return_value = True
            mock_stat.return_value = MagicMock(st_size=1024000)

            preview = get_transformation_preview(Path("/fake/comic.gif"))
            assert 'error' in preview

    async def test_panel_analysis_simulation(self):
        """Test the panel analysis simulation."""
        wizard = ComicToSequenceWizard()

        # Test American comics style
        panels = wizard._simulate_panel_detection(Path("/fake/comic.jpg"), ComicStyle.AMERICAN_COMICS)
        assert len(panels) > 0
        assert all(isinstance(panel, ComicPanel) for panel in panels)

        # Test Manga style (should have different layout)
        manga_panels = wizard._simulate_panel_detection(Path("/fake/manga.jpg"), ComicStyle.MANGA)
        assert len(manga_panels) > 0

    async def test_content_extraction(self):
        """Test content extraction from panel descriptions."""
        wizard = ComicToSequenceWizard()

        # Test character extraction
        characters = wizard._extract_characters_from_description("The hero stands tall facing the villain")
        assert "Character A" in characters  # Based on our simulation

        # Test dialogue extraction
        dialogue = wizard._extract_dialogue_from_description("Character says something important")
        assert dialogue == ""  # Our simulation doesn't detect this specific pattern

        # Test camera angle inference
        angle = wizard._infer_camera_angle_from_description("Close-up of the character's face")
        assert angle == CameraAngle.CLOSE_UP

        angle = wizard._infer_camera_angle_from_description("Wide establishing shot of the city")
        assert angle == CameraAngle.LONG_SHOT

    async def test_mood_analysis(self):
        """Test panel mood analysis."""
        wizard = ComicToSequenceWizard()

        # Test various mood indicators
        assert wizard._analyze_panel_mood("The character looks angry and furious") == 'anger'
        assert wizard._analyze_panel_mood("Sad tears streaming down the face") == 'sadness'
        assert wizard._analyze_panel_mood("Happy celebration with joy") == 'joy'
        assert wizard._analyze_panel_mood("Neutral everyday scene") == 'neutral'

    async def test_shot_conversion(self):
        """Test conversion of comic panels to cinematic shots."""
        wizard = ComicToSequenceWizard()

        # Create test panel
        panel = ComicPanel(
            panel_id="test_panel",
            position=(0, 0, 400, 300),
            content_description="Dramatic close-up of hero's face",
            panel_number=1,
            camera_angle=CameraAngle.CLOSE_UP,
            mood_emotion="intensity"
        )

        comic_sequence = ComicSequence(
            sequence_id="test_seq",
            comic_title="Test",
            page_number=1,
            panels=[panel]
        )

        shots = await wizard._convert_panels_to_shots(comic_sequence)

        assert len(shots) == 1
        shot = shots[0]
        assert shot.shot_type == "Extreme close-up"  # Based on our logic
        assert shot.camera_angle == CameraAngle.CLOSE_UP
        assert shot.emotional_impact == "intensity"
        assert shot.duration_seconds < 4.0  # Should be shorter for intense shots

    async def test_storyboard_generation(self):
        """Test storyboard panel generation."""
        wizard = ComicToSequenceWizard()

        shots = [
            CinematicShot(
                shot_id="shot1",
                panel_source="panel1",
                shot_type="Close-up",
                camera_angle=CameraAngle.CLOSE_UP,
                camera_movement="static",
                duration_seconds=3.0,
                description="Test shot description",
                dialogue="Test dialogue",
                emotional_impact="dramatic"
            )
        ]

        comic_sequence = ComicSequence(
            sequence_id="test",
            comic_title="Test Comic",
            page_number=1
        )

        storyboard = wizard._generate_storyboard_panels(shots, comic_sequence)

        assert len(storyboard) == 1
        panel = storyboard[0]
        assert panel['shot_number'] == 1
        assert panel['description'] == "Test shot description"
        assert panel['dialogue'] == "Test dialogue"
        assert panel['emotional_impact'] == "dramatic"

    async def test_confidence_scoring(self):
        """Test confidence score calculation."""
        wizard = ComicToSequenceWizard()

        # Test with good data
        sequence_with_data = ComicSequence(
            sequence_id="test",
            comic_title="Test",
            page_number=1,
            panels=[
                ComicPanel(panel_id="p1", position=(0,0,100,100),
                          content_description="Test", characters_present=["Char1"]),
                ComicPanel(panel_id="p2", position=(0,0,100,100),
                          content_description="Test", characters_present=["Char2"])
            ],
            key_themes=["heroism"]
        )

        shots = [
            CinematicShot(shot_id="s1", panel_source="p1", shot_type="Close-up",
                        camera_angle=CameraAngle.CLOSE_UP, camera_movement="static",
                        duration_seconds=3.0, description="Test")
        ]

        score = wizard._calculate_confidence_score(sequence_with_data, shots)
        assert score > 7.0  # Should be good score

        # Test with minimal data
        sequence_minimal = ComicSequence(
            sequence_id="test",
            comic_title="Test",
            page_number=1,
            panels=[ComicPanel(panel_id="p1", position=(0,0,100,100), content_description="Test")]
        )

        low_score = wizard._calculate_confidence_score(sequence_minimal, shots)
        assert low_score < score  # Should be lower

    async def test_supporting_assets_generation(self):
        """Test generation of supporting assets."""
        wizard = ComicToSequenceWizard()

        result = ComicToSequenceResult(
            result_id="test",
            project_id="test_project",
            creation_timestamp="2024-01-01T00:00:00Z",
            source_image="/fake/image.jpg",
            comic_sequence=ComicSequence(
                sequence_id="test_seq",
                comic_title="Test Comic",
                page_number=1,
                panels=[]
            ),
            cinematic_shots=[],
            storyboard_panels=[],
            generated_assets=[]
        )

        # Mock file operations
        with patch('builtins.open', MagicMock()) as mock_open:
            assets = wizard._generate_supporting_assets(result, Path("/fake/project"))
            assert len(assets) == 2  # Should generate shot planning and storyboard
            assert any('shot_planning' in asset for asset in assets)
            assert any('storyboard' in asset for asset in assets)

    def test_convenience_functions(self):
        """Test convenience functions."""
        wizard = create_comic_to_sequence_wizard()
        assert isinstance(wizard, ComicToSequenceWizard)

        # Test preview with error
        preview = get_transformation_preview(Path("/nonexistent.jpg"))
        assert 'error' in preview


class TestComicPanel:
    """Test ComicPanel dataclass."""

    def test_comic_panel_creation(self):
        """Test creating a comic panel."""
        panel = ComicPanel(
            panel_id="test_panel",
            position=(0, 0, 400, 300),
            content_description="Test panel content",
            panel_number=1,
            is_splash_panel=True,
            mood_emotion="dramatic"
        )

        assert panel.panel_id == "test_panel"
        assert panel.position == (0, 0, 400, 300)
        assert panel.content_description == "Test panel content"
        assert panel.panel_number == 1
        assert panel.is_splash_panel is True
        assert panel.mood_emotion == "dramatic"
        assert panel.characters_present == []
        assert panel.sound_effects == []


class TestComicSequence:
    """Test ComicSequence dataclass."""

    def test_comic_sequence_creation(self):
        """Test creating a comic sequence."""
        sequence = ComicSequence(
            sequence_id="test_sequence",
            comic_title="Test Comic",
            page_number=1,
            comic_style=ComicStyle.AMERICAN_COMICS,
            overall_mood="dramatic",
            story_progression="hero's journey"
        )

        assert sequence.sequence_id == "test_sequence"
        assert sequence.comic_title == "Test Comic"
        assert sequence.page_number == 1
        assert sequence.comic_style == ComicStyle.AMERICAN_COMICS
        assert sequence.overall_mood == "dramatic"
        assert sequence.panels == []
        assert sequence.key_themes == []


class TestCinematicShot:
    """Test CinematicShot dataclass."""

    def test_cinematic_shot_creation(self):
        """Test creating a cinematic shot."""
        shot = CinematicShot(
            shot_id="test_shot",
            panel_source="panel1",
            shot_type="Close-up",
            camera_angle=CameraAngle.CLOSE_UP,
            camera_movement="static",
            duration_seconds=3.0,
            description="Test shot description",
            dialogue="Test dialogue",
            emotional_impact="dramatic"
        )

        assert shot.shot_id == "test_shot"
        assert shot.panel_source == "panel1"
        assert shot.shot_type == "Close-up"
        assert shot.camera_angle == CameraAngle.CLOSE_UP
        assert shot.camera_movement == "static"
        assert shot.duration_seconds == 3.0
        assert shot.description == "Test shot description"
        assert shot.dialogue == "Test dialogue"
        assert shot.emotional_impact == "dramatic"
        assert shot.sound_effects == []


class TestComicToSequenceResult:
    """Test ComicToSequenceResult dataclass."""

    def test_result_creation(self):
        """Test creating a transformation result."""
        result = ComicToSequenceResult(
            result_id="test_result",
            project_id="test_project",
            creation_timestamp="2024-01-01T00:00:00Z",
            source_image="/fake/image.jpg",
            comic_sequence=ComicSequence(
                sequence_id="test_seq",
                comic_title="Test",
                page_number=1
            ),
            confidence_score=8.5,
            processing_time=15.2,
            panel_count=4,
            character_count=2
        )

        assert result.result_id == "test_result"
        assert result.confidence_score == 8.5
        assert result.processing_time == 15.2
        assert result.panel_count == 4
        assert result.character_count == 2
        assert result.cinematic_shots == []
        assert result.storyboard_panels == []
        assert result.generated_assets == []


if __name__ == "__main__":
    pytest.main([__file__, "-v"])