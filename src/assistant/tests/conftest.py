"""
Pytest configuration and fixtures for StoryCore AI Assistant tests
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from typing import Generator


@pytest.fixture
def temp_project_dir() -> Generator[Path, None, None]:
    """Create a temporary project directory for testing"""
    temp_dir = Path(tempfile.mkdtemp())
    yield temp_dir
    # Cleanup
    if temp_dir.exists():
        shutil.rmtree(temp_dir)


@pytest.fixture
def sample_project_data() -> dict:
    """Sample project data for testing"""
    return {
        "schema_version": "1.0",
        "project_name": "test_project",
        "capabilities": {
            "grid_generation": True,
            "promotion_engine": True,
            "qa_engine": True,
            "autofix_engine": True
        },
        "generation_status": {
            "grid": "pending",
            "promotion": "pending"
        }
    }


@pytest.fixture
def sample_scene_data() -> dict:
    """Sample scene data for testing"""
    return {
        "id": "scene_1",
        "number": 1,
        "title": "Opening Scene",
        "description": "A mysterious figure walks through a dark alley",
        "location": "Dark Alley",
        "time_of_day": "night",
        "duration": 5.0,
        "characters": ["char_1"],
        "key_actions": ["walking", "looking around"],
        "visual_notes": "Film noir style, high contrast lighting"
    }


@pytest.fixture
def sample_character_data() -> dict:
    """Sample character data for testing"""
    return {
        "id": "char_1",
        "name": "Detective Morgan",
        "role": "protagonist",
        "description": "A hardened detective with a troubled past",
        "appearance": "Middle-aged man, wearing a trench coat and fedora, weathered face",
        "personality": "Cynical but determined, haunted by past failures"
    }


@pytest.fixture
def mock_llm_client():
    """Mock LLM client for testing"""
    class MockLLMClient:
        def complete(self, prompt: str) -> str:
            """Mock completion method"""
            return '{"genre": "sci-fi", "tone": "thriller", "characters": [], "scenes": []}'
    
    return MockLLMClient()
