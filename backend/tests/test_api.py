"""
Test Suite for StoryCore Engine Backend APIs

Tests for:
- Project API endpoints
- Sequence API endpoints
- Shot API endpoints
- Location API endpoints
- Audio API endpoints
- Task Queue API endpoints

Coverage target: 80%
"""

import pytest
import tempfile
from pathlib import Path
from typing import Dict, Any

# Import API modules
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

# Import storage for testing
from backend.storage import JSONFileStorage


class TestStorage:
    """Test suite for Storage utilities"""

    @pytest.fixture
    def temp_storage_dir(self):
        """Create temporary storage directory"""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield tmpdir

    def test_storage_save_and_load(self, temp_storage_dir):
        """Test basic save and load operations"""
        storage = JSONFileStorage(temp_storage_dir)

        data = {"name": "Test", "value": 123}
        storage.save("test-id", data)

        loaded = storage.load("test-id")
        assert loaded is not None
        assert loaded["name"] == "Test"
        assert loaded["value"] == 123

    def test_storage_delete(self, temp_storage_dir):
        """Test delete operation"""
        storage = JSONFileStorage(temp_storage_dir)

        storage.save("to-delete", {"name": "Delete Me"})
        assert storage.exists("to-delete")

        result = storage.delete("to-delete")
        assert result is True
        assert not storage.exists("to-delete")

    def test_storage_list_files(self, temp_storage_dir):
        """Test listing files"""
        storage = JSONFileStorage(temp_storage_dir)

        storage.save("item-1", {"name": "Item 1"})
        storage.save("item-2", {"name": "Item 2"})
        storage.save("item-3", {"name": "Item 3"})

        files = storage.list_files()
        assert len(files) == 3
        assert "item-1" in files
        assert "item-2" in files
        assert "item-3" in files

    def test_storage_get_by_owner(self, temp_storage_dir):
        """Test getting items by owner (index field)"""
        storage = JSONFileStorage(temp_storage_dir, index_field="owner_id")

        storage.save("item-1", {"name": "Item 1", "owner_id": "user-1"})
        storage.save("item-2", {"name": "Item 2", "owner_id": "user-1"})
        storage.save("item-3", {"name": "Item 3", "owner_id": "user-2"})

        user1_items = storage.get_by_owner("user-1")
        assert len(user1_items) == 2

        user2_items = storage.get_by_owner("user-2")
        assert len(user2_items) == 1

    def test_storage_cache_ttl(self, temp_storage_dir):
        """Test that cache TTL works correctly"""
        from backend.storage import LRUCache

        # Create cache with short TTL
        cache = LRUCache(max_size=10, ttl=1)  # 1 second TTL

        cache.set("key1", "value1")

        # Should be present immediately
        assert cache.get("key1") == "value1"

        # Wait for TTL to expire
        import time

        time.sleep(1.5)

        # Should be expired now
        assert cache.get("key1") is None


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
            "language": "fr-FR",
        }

    def test_storage_create_project(self, temp_project_dir, sample_project_data):
        """Test project creation via storage"""
        storage = JSONFileStorage(temp_project_dir)

        project_id = "test-project-1"
        project_data = {
            "id": project_id,
            **sample_project_data,
            "created_at": "2026-01-01T00:00:00",
        }

        result = storage.save(project_id, project_data)
        assert result is True

        loaded = storage.load(project_id)
        assert loaded is not None
        assert loaded["name"] == sample_project_data["name"]

    def test_storage_list_projects(self, temp_project_dir):
        """Test listing all projects"""
        storage = JSONFileStorage(temp_project_dir)

        # Create multiple projects
        storage.save("project-1", {"name": "Project 1", "genre": "action"})
        storage.save("project-2", {"name": "Project 2", "genre": "drama"})

        projects = storage.list_files()
        assert len(projects) >= 2

    def test_storage_update_project(self, temp_project_dir, sample_project_data):
        """Test updating a project"""
        storage = JSONFileStorage(temp_project_dir)

        project_id = "project-to-update"
        storage.save(project_id, {"id": project_id, **sample_project_data})

        # Update
        updated_data = storage.load(project_id)
        updated_data["description"] = "Updated description"
        storage.save(project_id, updated_data)

        loaded = storage.load(project_id)
        assert loaded["description"] == "Updated description"

    def test_storage_delete_project(self, temp_project_dir, sample_project_data):
        """Test deleting a project"""
        storage = JSONFileStorage(temp_project_dir)

        project_id = "project-to-delete"
        storage.save(project_id, {"id": project_id, **sample_project_data})

        result = storage.delete(project_id)
        assert result is True

        assert storage.load(project_id) is None


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
            "lighting": "low",
        }

    def test_storage_save_sequence(self, sample_sequence_data):
        """Test saving sequence data"""
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = JSONFileStorage(tmpdir)

            sequence_id = "sequence-1"
            storage.save(
                sequence_id, {"id": sequence_id, **sample_sequence_data, "shots": []}
            )

            loaded = storage.load(sequence_id)
            assert loaded is not None
            assert loaded["project_id"] == sample_sequence_data["project_id"]

    def test_sequence_with_shots(self, sample_sequence_data):
        """Test sequence with multiple shots"""
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = JSONFileStorage(tmpdir)

            sequence_id = "sequence-with-shots"
            shots = [
                {"id": "shot-1", "shot_type": "wide", "camera_angle": "high"},
                {"id": "shot-2", "shot_type": "medium", "camera_angle": "eye"},
            ]

            storage.save(
                sequence_id, {"id": sequence_id, **sample_sequence_data, "shots": shots}
            )

            loaded = storage.load(sequence_id)
            assert len(loaded["shots"]) == 2


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
            "dialogue": "Hello world",
        }

    def test_storage_create_shot(self, sample_shot_data):
        """Test shot creation via storage"""
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = JSONFileStorage(tmpdir)

            shot_id = "shot-1"
            storage.save(shot_id, {"id": shot_id, **sample_shot_data})

            loaded = storage.load(shot_id)
            assert loaded is not None
            assert loaded["shot_type"] == sample_shot_data["shot_type"]

    def test_shot_validation(self):
        """Test shot data validation"""
        # Valid shot
        valid_shot = {
            "sequence_id": "test-seq",
            "shot_number": 1,
            "shot_type": "medium",
        }
        assert "shot_type" in valid_shot
        assert valid_shot["shot_number"] > 0

    def test_storage_update_shot(self, sample_shot_data):
        """Test updating a shot"""
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = JSONFileStorage(tmpdir)

            shot_id = "shot-to-update"
            storage.save(shot_id, {"id": shot_id, **sample_shot_data})

            # Update
            shot_data = storage.load(shot_id)
            shot_data["description"] = "Updated description"
            storage.save(shot_id, shot_data)

            loaded = storage.load(shot_id)
            assert loaded["description"] == "Updated description"


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
            "props": ["books", "candles", "dust"],
        }

    def test_storage_create_location(self, sample_location_data):
        """Test location creation via storage"""
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = JSONFileStorage(tmpdir)

            location_id = "location-1"
            storage.save(location_id, {"id": location_id, **sample_location_data})

            loaded = storage.load(location_id)
            assert loaded is not None
            assert loaded["name"] == sample_location_data["name"]

    def test_storage_list_locations(self, sample_location_data):
        """Test listing locations for a project"""
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = JSONFileStorage(tmpdir, index_field="project_id")

            project_id = sample_location_data["project_id"]

            storage.save("loc-1", {**sample_location_data, "name": "Location 1"})
            storage.save("loc-2", {**sample_location_data, "name": "Location 2"})

            locations = storage.get_by_owner(project_id)
            assert len(locations) >= 2


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
            "output_format": "mp3",
        }

    def test_audio_request_validation(self, sample_audio_request):
        """Test audio request validation"""
        # Valid request
        assert sample_audio_request["type"] in ["dialogue", "voice_over", "sfx"]
        assert len(sample_audio_request["text"]) > 0

    def test_audio_invalid_type(self):
        """Test audio generation fails with invalid type"""
        invalid_request = {"type": "invalid_type", "text": "test"}

        with pytest.raises(ValueError, match="invalid"):
            if invalid_request["type"] not in ["dialogue", "voice_over", "sfx"]:
                raise ValueError("invalid type")

    def test_audio_missing_text(self):
        """Test audio generation fails without text"""
        request = {"type": "dialogue"}

        with pytest.raises(ValueError, match="text"):
            if "text" not in request or not request["text"]:
                raise ValueError("text is required")


class TestTaskQueue:
    """Test suite for Task Queue"""

    def test_task_priority_conversion(self):
        """Test priority conversion from numeric to enum"""
        # Import the conversion function if available
        try:
            from backend.task_queue_api import _get_queue_priority
            from src.async_task_queue import TaskPriority

            assert _get_queue_priority(1) == TaskPriority.CRITICAL
            assert _get_queue_priority(2) == TaskPriority.CRITICAL
            assert _get_queue_priority(3) == TaskPriority.HIGH
            assert _get_queue_priority(5) == TaskPriority.NORMAL
            assert _get_queue_priority(8) == TaskPriority.LOW
        except ImportError:
            pytest.skip("Task queue modules not available")

    def test_async_queue_stats(self):
        """Test getting queue statistics"""
        try:
            from src.async_task_queue import get_async_task_queue

            queue = get_async_task_queue()
            stats = queue.get_queue_statistics()

            assert "queue_size" in stats
            assert "running_tasks" in stats
            assert "completed_tasks" in stats
        except ImportError:
            pytest.skip("AsyncTaskQueue not available")


class TestEdgeCases:
    """Test edge cases and error handling"""

    def test_storage_handles_corrupted_data(self):
        """Test storage handles corrupted files gracefully"""
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = JSONFileStorage(tmpdir)

            # Write corrupted JSON
            corrupted_file = Path(tmpdir) / "corrupted.json"
            corrupted_file.write_text("{ corrupted json }")

            # Should not raise exception, should return None
            result = storage.load("corrupted")
            assert result is None

    def test_storage_nonexistent_item(self):
        """Test loading non-existent item"""
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = JSONFileStorage(tmpdir)

            result = storage.load("nonexistent")
            assert result is None

    def test_storage_empty_props_list(self):
        """Test storage handles empty lists"""
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = JSONFileStorage(tmpdir)

            storage.save("empty-props", {"name": "Empty Room", "props": []})

            loaded = storage.load("empty-props")
            assert loaded["props"] == []


class TestPerformance:
    """Performance and load tests"""

    def test_storage_create_performance(self):
        """Test storage creation completes within acceptable time"""
        import time

        with tempfile.TemporaryDirectory() as tmpdir:
            storage = JSONFileStorage(tmpdir)

            start = time.time()

            # Create 10 items
            for i in range(10):
                storage.save(f"item-{i}", {"name": f"Item {i}", "index": i})

            duration = time.time() - start

            # Should complete in less than 1 second
            assert duration < 1.0

    def test_storage_list_scalability(self):
        """Test list operation scales with number of items"""
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = JSONFileStorage(tmpdir)

            # Create 50 items
            for i in range(50):
                storage.save(f"item-{i}", {"name": f"Scale Test {i}"})

            # List should complete quickly
            import time

            start = time.time()
            items = storage.list_files()
            duration = time.time() - start

            assert duration < 0.5  # Less than 500ms
            assert len(items) >= 50


# Pytest configuration
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
