"""
Unit tests for wizard data models (MVP)
"""

import pytest
import json
from .models import WizardState, ProjectConfiguration, GenreDefinition, FormatDefinition
from .definitions import (
    GENRE_DEFINITIONS, FORMAT_DEFINITIONS,
    get_genre_definition, get_format_definition,
    get_all_genres, get_all_formats,
    get_genre_names, get_format_names
)


class TestWizardState:
    """Tests for WizardState model"""
    
    def test_create_empty_state(self):
        """Test creating an empty wizard state"""
        state = WizardState()
        assert state.project_name is None
        assert state.format_key is None
        assert state.duration_minutes is None
        assert state.genre_key is None
        assert state.story_content is None
        assert state.current_step == 0
        assert state.timestamp is not None
    
    def test_create_state_with_data(self):
        """Test creating wizard state with data"""
        state = WizardState(
            project_name="test-project",
            format_key="court_metrage",
            duration_minutes=10,
            genre_key="action",
            story_content="Test story",
            current_step=5
        )
        assert state.project_name == "test-project"
        assert state.format_key == "court_metrage"
        assert state.duration_minutes == 10
        assert state.genre_key == "action"
        assert state.story_content == "Test story"
        assert state.current_step == 5
    
    def test_state_to_dict(self):
        """Test converting state to dictionary"""
        state = WizardState(project_name="test", format_key="court_metrage")
        data = state.to_dict()
        assert isinstance(data, dict)
        assert data['project_name'] == "test"
        assert data['format_key'] == "court_metrage"
    
    def test_state_from_dict(self):
        """Test creating state from dictionary"""
        data = {
            'project_name': 'test',
            'format_key': 'court_metrage',
            'duration_minutes': 10,
            'genre_key': 'action',
            'story_content': 'Test',
            'current_step': 3,
            'timestamp': '2026-01-15T10:00:00'
        }
        state = WizardState.from_dict(data)
        assert state.project_name == 'test'
        assert state.format_key == 'court_metrage'
        assert state.duration_minutes == 10
    
    def test_state_json_serialization(self):
        """Test JSON serialization and deserialization"""
        original = WizardState(
            project_name="test",
            format_key="court_metrage",
            duration_minutes=10
        )
        json_str = original.to_json()
        restored = WizardState.from_json(json_str)
        
        assert restored.project_name == original.project_name
        assert restored.format_key == original.format_key
        assert restored.duration_minutes == original.duration_minutes


class TestProjectConfiguration:
    """Tests for ProjectConfiguration model"""
    
    def test_create_empty_config(self):
        """Test creating empty configuration"""
        config = ProjectConfiguration()
        assert config.schema_version == "1.0"
        assert config.project_name == ""
        assert config.duration_minutes == 0
        assert isinstance(config.format, dict)
        assert isinstance(config.genre, dict)
    
    def test_create_config_with_data(self):
        """Test creating configuration with data"""
        config = ProjectConfiguration(
            project_name="test-project",
            duration_minutes=10,
            format={"key": "court_metrage"},
            genre={"key": "action"}
        )
        assert config.project_name == "test-project"
        assert config.duration_minutes == 10
        assert config.format['key'] == "court_metrage"
        assert config.genre['key'] == "action"
    
    def test_config_to_dict(self):
        """Test converting configuration to dictionary"""
        config = ProjectConfiguration(project_name="test")
        data = config.to_dict()
        assert isinstance(data, dict)
        assert data['project_name'] == "test"
        assert data['schema_version'] == "1.0"
    
    def test_config_json_serialization(self):
        """Test JSON serialization"""
        config = ProjectConfiguration(
            project_name="test",
            duration_minutes=10
        )
        json_str = config.to_json()
        data = json.loads(json_str)
        assert data['project_name'] == "test"
        assert data['duration_minutes'] == 10


class TestGenreDefinitions:
    """Tests for genre definitions"""
    
    def test_all_genres_present(self):
        """Test that all 5 MVP genres are defined"""
        expected_genres = ["action", "drame", "science_fiction", "horreur", "comedie"]
        assert len(GENRE_DEFINITIONS) == 5
        for genre_key in expected_genres:
            assert genre_key in GENRE_DEFINITIONS
    
    def test_genre_structure(self):
        """Test that each genre has required fields"""
        for genre_key, genre in GENRE_DEFINITIONS.items():
            assert isinstance(genre, GenreDefinition)
            assert genre.key == genre_key
            assert genre.name is not None
            assert isinstance(genre.style_defaults, dict)
            
            # Check required style fields
            assert 'lighting' in genre.style_defaults
            assert 'color_palette' in genre.style_defaults
            assert 'camera_movement' in genre.style_defaults
            assert 'pacing' in genre.style_defaults
            assert 'shot_duration_avg' in genre.style_defaults
    
    def test_get_genre_definition(self):
        """Test getting genre definition by key"""
        action = get_genre_definition("action")
        assert action.name == "Action"
        assert action.key == "action"
        assert action.style_defaults['pacing'] == "fast"
    
    def test_get_genre_definition_invalid(self):
        """Test getting invalid genre raises error"""
        with pytest.raises(KeyError):
            get_genre_definition("invalid_genre")
    
    def test_get_all_genres(self):
        """Test getting all genres"""
        genres = get_all_genres()
        assert len(genres) == 5
        assert "action" in genres
        assert "drame" in genres
    
    def test_get_genre_names(self):
        """Test getting genre names mapping"""
        names = get_genre_names()
        assert names["action"] == "Action"
        assert names["drame"] == "Drame"
        assert names["science_fiction"] == "Science-Fiction"


class TestFormatDefinitions:
    """Tests for format definitions"""
    
    def test_all_formats_present(self):
        """Test that all 3 MVP formats are defined"""
        expected_formats = ["court_metrage", "moyen_metrage", "long_metrage"]
        assert len(FORMAT_DEFINITIONS) == 3
        for format_key in expected_formats:
            assert format_key in FORMAT_DEFINITIONS
    
    def test_format_structure(self):
        """Test that each format has required fields"""
        for format_key, fmt in FORMAT_DEFINITIONS.items():
            assert isinstance(fmt, FormatDefinition)
            assert fmt.key == format_key
            assert fmt.name is not None
            assert isinstance(fmt.duration_range, tuple)
            assert len(fmt.duration_range) == 2
            assert fmt.duration_range[0] < fmt.duration_range[1]
            assert fmt.shot_duration_avg > 0
            assert fmt.resolution is not None
            assert fmt.frame_rate > 0
    
    def test_get_format_definition(self):
        """Test getting format definition by key"""
        court = get_format_definition("court_metrage")
        assert court.name == "Court-métrage"
        assert court.key == "court_metrage"
        assert court.duration_range == (1, 15)
    
    def test_get_format_definition_invalid(self):
        """Test getting invalid format raises error"""
        with pytest.raises(KeyError):
            get_format_definition("invalid_format")
    
    def test_get_all_formats(self):
        """Test getting all formats"""
        formats = get_all_formats()
        assert len(formats) == 3
        assert "court_metrage" in formats
        assert "long_metrage" in formats
    
    def test_get_format_names(self):
        """Test getting format names mapping"""
        names = get_format_names()
        assert names["court_metrage"] == "Court-métrage"
        assert names["moyen_metrage"] == "Moyen-métrage"
        assert names["long_metrage"] == "Long-métrage"
    
    def test_format_duration_ranges_valid(self):
        """Test that format duration ranges don't overlap incorrectly"""
        court = FORMAT_DEFINITIONS["court_metrage"]
        moyen = FORMAT_DEFINITIONS["moyen_metrage"]
        long = FORMAT_DEFINITIONS["long_metrage"]
        
        assert court.duration_range[1] < moyen.duration_range[0]
        assert moyen.duration_range[1] < long.duration_range[0]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
