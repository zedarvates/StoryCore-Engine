"""
Test Suite for StoryCore Engine Backend APIs

Tests for:
- Project API (POST /api/projects)
- Sequence API (POST /api/sequences/generate)
- Shot API (POST /api/shots)
- Location API (POST /api/locations)
- Audio API (POST /api/audio/generate)

Coverage target: 80%
"""

import pytest
import json
import os
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from typing import Dict, Any, List

# Import API modules
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from project_api import create_project, get_project, list_projects, update_project, delete_project
from sequence_api import generate_sequence, get_sequence, list_sequences, update_sequence
from shot_api import create_shot, get_shot, update_shot, delete_shot
from location_api import create_location, get_location, list_locations, update_location, delete_location
from audio_api import generate_audio


class TestProjectAPI:
    """Test suite for Project API endpoints"""
    
    @pytest.fixture
    def temp_project_dir(self):
        """Create temporary project directory"""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield tmpdir
    
    @pytest.fixture
    def sample_project_data(self) -> Dict[str, Any]:
        """Sample project data for testing"""
        return {
            "name": "Test Project",
            "description": "A test project for unit testing",
            "genre": "drama",
            "tone": "serious",
            "target_audience": "adults",
            "estimated_duration": 30,
            "language": "fr-FR"
        }
    
    def test_create_project_success(self, temp_project_dir, sample_project_data):
        """Test successful project creation"""
        with patch('project_api.PROJECTS_DIR', temp_project_dir):
            project = create_project(sample_project_data)
            
            assert project is not None
            assert project["id"] is not None
            assert project["name"] == sample_project_data["name"]
            assert project["created_at"] is not None
    
    def test_create_project_missing_required_fields(self, temp_project_dir):
        """Test project creation fails with missing required fields"""
        incomplete_data = {"description": "Missing name"}
        
        with patch('project_api.PROJECTS_DIR', temp_project_dir):
            with pytest.raises(ValueError, match="name.*required"):
                create_project(incomplete_data)
    
    def test_get_project_exists(self, temp_project_dir, sample_project_data):
        """Test retrieving an existing project"""
        with patch('project_api.PROJECTS_DIR', temp_project_dir):
            created = create_project(sample_project_data)
            project_id = created["id"]
            
            retrieved = get_project(project_id)
            assert retrieved is not None
            assert retrieved["id"] == project_id
    
    def test_get_project_not_exists(self, temp_project_dir):
        """Test retrieving non-existent project returns None"""
        with patch('project_api.PROJECTS_DIR', temp_project_dir):
            result = get_project("non-existent-id")
            assert result is None
    
    def test_list_projects(self, temp_project_dir):
        """Test listing all projects"""
        with patch('project_api.PROJECTS_DIR', temp_project_dir):
            # Create multiple projects
            create_project({"name": "Project 1", "genre": "action"})
            create_project({"name": "Project 2", "genre": "drama"})
            
            projects = list_projects()
            assert isinstance(projects, list)
            assert len(projects) >= 2
    
    def test_update_project(self, temp_project_dir, sample_project_data):
        """Test updating a project"""
        with patch('project_api.PROJECTS_DIR', temp_project_dir):
            created = create_project(sample_project_data)
            project_id = created["id"]
            
            updated = update_project(project_id, {"description": "Updated description"})
            assert updated["description"] == "Updated description"
    
    def test_delete_project(self, temp_project_dir, sample_project_data):
        """Test deleting a project"""
        with patch('project_api.PROJECTS_DIR', temp_project_dir):
            created = create_project(sample_project_data)
            project_id = created["id"]
            
            result = delete_project(project_id)
            assert result is True
            
            # Verify deletion
            assert get_project(project_id) is None


class TestSequenceAPI:
    """Test suite for Sequence API endpoints"""
    
    @pytest.fixture
    def sample_sequence_data(self) -> Dict[str, Any]:
        """Sample sequence data for testing"""
        return {
            "project_id": "test-project-id",
            "name": "Opening Sequence",
            "description": "The opening scene of the story",
            "scene_count": 5,
            "estimated_duration": 120,
            "mood": "tense",
            "lighting": "low"
        }
    
    def test_generate_sequence_success(self, sample_sequence_data):
        """Test successful sequence generation"""
        with patch('sequence_api.PROJECTS_DIR', tempfile.gettempdir()):
            with patch('sequence_api.llm_api') as mock_llm:
                mock_llm.generate_sequence.return_value = {
                    "shots": [
                        {"shot_type": "wide", "camera_angle": "high"},
                        {"shot_type": "medium", "camera_angle": "eye"}
                    ]
                }
                
                sequence = generate_sequence(sample_sequence_data)
                
                assert sequence is not None
                assert sequence["project_id"] == sample_sequence_data["project_id"]
                assert sequence["shots"] is not None
    
    def test_generate_sequence_with_llm(self, sample_sequence_data):
        """Test sequence generation uses LLM for enhanced output"""
        with patch('sequence_api.PROJECTS_DIR', tempfile.gettempdir()):
            with patch('sequence_api.llm_api') as mock_llm:
                mock_llm.generate_sequence.return_value = {
                    "shots": [],
                    "dialogues": [],
                    "locations": []
                }
                
                sequence = generate_sequence(sample_sequence_data, use_llm=True)
                
                mock_llm.generate_sequence.assert_called_once()
    
    def test_get_sequence_exists(self):
        """Test retrieving an existing sequence"""
        with patch('sequence_api.SEQUENCES_DIR', tempfile.gettempdir()):
            # Create a sequence first
            sequence_id = generate_sequence({
                "project_id": "test",
                "name": "Test Sequence"
            })["id"]
            
            retrieved = get_sequence(sequence_id)
            assert retrieved is not None
            assert retrieved["id"] == sequence_id
    
    def test_list_sequences(self):
        """Test listing sequences for a project"""
        with patch('sequence_api.SEQUENCES_DIR', tempfile.gettempdir()):
            project_id = "test-project"
            
            # Create sequences
            generate_sequence({"project_id": project_id, "name": "Seq 1"})
            generate_sequence({"project_id": project_id, "name": "Seq 2"})
            
            sequences = list_sequences(project_id)
            assert isinstance(sequences, list)
            assert len(sequences) >= 2


class TestShotAPI:
    """Test suite for Shot API endpoints"""
    
    @pytest.fixture
    def sample_shot_data(self) -> Dict[str, Any]:
        """Sample shot data for testing"""
        return {
            "sequence_id": "test-sequence-id",
            "shot_number": 1,
            "shot_type": "medium",
            "camera_angle": "eye",
            "camera_movement": "static",
            "description": "Character enters the room",
            "dialogue": "Hello world"
        }
    
    def test_create_shot_success(self, sample_shot_data):
        """Test successful shot creation"""
        with patch('shot_api.SHOTS_DIR', tempfile.gettempdir()):
            shot = create_shot(sample_shot_data)
            
            assert shot is not None
            assert shot["sequence_id"] == sample_shot_data["sequence_id"]
            assert shot["shot_number"] == sample_shot_data["shot_number"]
    
    def test_create_shot_validation(self, sample_shot_data):
        """Test shot creation validates required fields"""
        with patch('shot_api.SHOTS_DIR', tempfile.gettempdir()):
            invalid_data = {"sequence_id": "test"}  # Missing required fields
            
            with pytest.raises(ValueError):
                create_shot(invalid_data)
    
    def test_get_shot_exists(self, sample_shot_data):
        """Test retrieving an existing shot"""
        with patch('shot_api.SHOTS_DIR', tempfile.gettempdir()):
            created = create_shot(sample_shot_data)
            shot_id = created["id"]
            
            retrieved = get_shot(shot_id)
            assert retrieved is not None
            assert retrieved["id"] == shot_id
    
    def test_update_shot(self, sample_shot_data):
        """Test updating a shot"""
        with patch('shot_api.SHOTS_DIR', tempfile.gettempdir()):
            created = create_shot(sample_shot_data)
            shot_id = created["id"]
            
            updated = update_shot(shot_id, {"description": "Updated description"})
            assert updated["description"] == "Updated description"
    
    def test_delete_shot(self, sample_shot_data):
        """Test deleting a shot"""
        with patch('shot_api.SHOTS_DIR', tempfile.gettempdir()):
            created = create_shot(sample_shot_data)
            shot_id = created["id"]
            
            result = delete_shot(shot_id)
            assert result is True
            
            assert get_shot(shot_id) is None


class TestLocationAPI:
    """Test suite for Location API endpoints"""
    
    @pytest.fixture
    def sample_location_data(self) -> Dict[str, Any]:
        """Sample location data for testing"""
        return {
            "project_id": "test-project-id",
            "name": "Ancient Library",
            "description": "A mysterious library filled with ancient books",
            "type": "interior",
            "time_period": "medieval",
            "mood": "mysterious",
            "lighting": "dim",
            "props": ["books", "candles", "dust"]
        }
    
    def test_create_location_success(self, sample_location_data):
        """Test successful location creation"""
        with patch('location_api.LOCATIONS_DIR', tempfile.gettempdir()):
            location = create_location(sample_location_data)
            
            assert location is not None
            assert location["name"] == sample_location_data["name"]
            assert location["type"] == sample_location_data["type"]
    
    def test_get_location_exists(self, sample_location_data):
        """Test retrieving an existing location"""
        with patch('location_api.LOCATIONS_DIR', tempfile.gettempdir()):
            created = create_location(sample_location_data)
            location_id = created["id"]
            
            retrieved = get_location(location_id)
            assert retrieved is not None
            assert retrieved["id"] == location_id
    
    def test_list_locations(self, sample_location_data):
        """Test listing locations for a project"""
        with patch('location_api.LOCATIONS_DIR', tempfile.gettempdir()):
            project_id = sample_location_data["project_id"]
            
            create_location({**sample_location_data, "name": "Location 1"})
            create_location({**sample_location_data, "name": "Location 2"})
            
            locations = list_locations(project_id)
            assert isinstance(locations, list)
            assert len(locations) >= 2
    
    def test_update_location(self, sample_location_data):
        """Test updating a location"""
        with patch('location_api.LOCATIONS_DIR', tempfile.gettempdir()):
            created = create_location(sample_location_data)
            location_id = created["id"]
            
            updated = update_location(location_id, {"mood": "eerie"})
            assert updated["mood"] == "eerie"
    
    def test_delete_location(self, sample_location_data):
        """Test deleting a location"""
        with patch('location_api.LOCATIONS_DIR', tempfile.gettempdir()):
            created = create_location(sample_location_data)
            location_id = created["id"]
            
            result = delete_location(location_id)
            assert result is True
            
            assert get_location(location_id) is None


class TestAudioAPI:
    """Test suite for Audio API endpoints"""
    
    @pytest.fixture
    def sample_audio_request(self) -> Dict[str, Any]:
        """Sample audio generation request"""
        return {
            "type": "dialogue",
            "text": "Hello, this is a test dialogue",
            "voice": "fr-FR-Hélène",
            "speed": 1.0,
            "pitch": 1.0,
            "output_format": "mp3"
        }
    
    def test_generate_audio_dialogue(self, sample_audio_request):
        """Test dialogue audio generation"""
        with patch('audio_api.ffmpeg_service') as mock_ffmpeg:
            mock_ffmpeg.generate_audio.return_value = "/tmp/test_audio.mp3"
            
            result = generate_audio(sample_audio_request)
            
            assert result is not None
            assert "output_path" in result or "file" in result
    
    def test_generate_audio_invalid_type(self, sample_audio_request):
        """Test audio generation fails with invalid type"""
        invalid_request = {**sample_audio_request, "type": "invalid_type"}
        
        with pytest.raises(ValueError, match="invalid type"):
            generate_audio(invalid_request)
    
    def test_generate_audio_missing_text(self):
        """Test audio generation fails without text"""
        with pytest.raises(ValueError, match="text.*required"):
            generate_audio({"type": "dialogue"})
    
    def test_generate_audio_voice_over(self):
        """Test voice-over audio generation"""
        request = {
            "type": "voice_over",
            "text": "Narrator voice over",
            "voice": "fr-FR-Henri",
            "output_format": "wav"
        }
        
        with patch('audio_api.ffmpeg_service') as mock_ffmpeg:
            mock_ffmpeg.generate_audio.return_value = "/tmp/voice_over.wav"
            
            result = generate_audio(request)
            assert result is not None


class TestEdgeCases:
    """Test edge cases and error handling"""
    
    def test_project_api_handles_corrupted_data(self, temp_project_dir):
        """Test project API handles corrupted project files gracefully"""
        with patch('project_api.PROJECTS_DIR', temp_project_dir):
            project_id = "test-corrupted"
            project_file = Path(temp_project_dir) / f"{project_id}.json"
            
            # Write corrupted JSON
            project_file.write_text("{ corrupted json }")
            
            # Should not raise exception, should return None
            result = get_project(project_id)
            assert result is None
    
    def test_sequence_api_handles_empty_llm_response(self):
        """Test sequence generation handles empty LLM response"""
        with patch('sequence_api.PROJECTS_DIR', tempfile.gettempdir()):
            with patch('sequence_api.llm_api') as mock_llm:
                mock_llm.generate_sequence.return_value = {}
                
                result = generate_sequence({"project_id": "test", "name": "Test"})
                # Should return sequence with empty shots
                assert result is not None
                assert "shots" in result or result.get("shots") == []
    
    def test_shot_api_validates_shot_number(self):
        """Test shot API validates shot number is positive"""
        with patch('shot_api.SHOTS_DIR', tempfile.gettempdir()):
            with pytest.raises(ValueError, match="positive"):
                create_shot({
                    "sequence_id": "test",
                    "shot_number": -1,
                    "shot_type": "medium"
                })
    
    def test_location_api_handles_empty_props(self):
        """Test location API handles empty props list"""
        with patch('location_api.LOCATIONS_DIR', tempfile.gettempdir()):
            result = create_location({
                "project_id": "test",
                "name": "Empty Room",
                "type": "interior",
                "props": []
            })
            
            assert result is not None
            assert result["props"] == []


class TestPerformance:
    """Performance and load tests"""
    
    def test_project_creation_performance(self, temp_project_dir):
        """Test project creation completes within acceptable time"""
        import time
        
        with patch('project_api.PROJECTS_DIR', temp_project_dir):
            start = time.time()
            
            # Create 10 projects
            for i in range(10):
                create_project({"name": f"Performance Test {i}", "genre": "action"})
            
            duration = time.time() - start
            
            # Should complete in less than 1 second
            assert duration < 1.0
    
    def test_list_projects_scalability(self, temp_project_dir):
        """Test list projects scales with number of projects"""
        with patch('project_api.PROJECTS_DIR', temp_project_dir):
            # Create 50 projects
            for i in range(50):
                create_project({"name": f"Scale Test {i}", "genre": "drama"})
            
            # List should complete quickly
            import time
            start = time.time()
            projects = list_projects()
            duration = time.time() - start
            
            assert duration < 0.5  # Less than 500ms
            assert len(projects) >= 50


# Pytest configuration
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
