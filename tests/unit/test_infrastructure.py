"""
Unit tests for core infrastructure and data models.
"""

import pytest
from datetime import datetime
from pathlib import Path
from src.end_to_end.data_models import (
    ParsedPrompt, CharacterInfo, WorkflowState, WorkflowStep,
    ProjectComponents, WorldConfig, ColorPalette, Location
)
from src.end_to_end.config import ConfigurationManager
from src.end_to_end.logging_config import WorkflowLogger


class TestDataModels:
    """Test core data models"""
    
    def test_parsed_prompt_creation(self):
        """Test ParsedPrompt can be created"""
        prompt = ParsedPrompt(
            project_title="Test Project",
            genre="cyberpunk",
            video_type="trailer",
            mood=["dark", "intense"],
            setting="futuristic city",
            time_period="2048",
            characters=[CharacterInfo("Alice", "protagonist", "A hacker")],
            key_elements=["neon lights", "rain"],
            visual_style=["noir", "high-tech"],
            aspect_ratio="16:9",
            duration_seconds=60,
            raw_prompt="Test prompt"
        )
        
        assert prompt.project_title == "Test Project"
        assert prompt.genre == "cyberpunk"
        assert len(prompt.characters) == 1
        assert prompt.duration_seconds == 60
    
    def test_workflow_state_creation(self):
        """Test WorkflowState can be created"""
        state = WorkflowState(
            current_step=WorkflowStep.PARSING,
            completed_steps=[],
            failed_steps=[],
            project_data={},
            start_time=datetime.now()
        )
        
        assert state.current_step == WorkflowStep.PARSING
        assert len(state.completed_steps) == 0
    
    def test_world_config_creation(self):
        """Test WorldConfig can be created"""
        palette = ColorPalette(
            primary="#FF0000",
            secondary="#00FF00",
            accent="#0000FF",
            background="#000000"
        )
        
        location = Location(
            location_id="loc_1",
            name="Main Street",
            description="A busy street",
            visual_description="Neon-lit street with rain"
        )
        
        world = WorldConfig(
            world_id="world_1",
            name="Cyberpunk City",
            genre="cyberpunk",
            setting="urban",
            time_period="2048",
            visual_style=["noir", "neon"],
            color_palette=palette,
            lighting_style="dramatic",
            atmosphere="tense",
            key_locations=[location]
        )
        
        assert world.name == "Cyberpunk City"
        assert len(world.key_locations) == 1


class TestConfigurationManager:
    """Test configuration management"""
    
    def test_default_config_creation(self):
        """Test default configuration is created"""
        config_mgr = ConfigurationManager()
        config = config_mgr.get_config()
        
        assert config.default_quality_tier == "preview"
        assert config.max_retry_attempts == 3
        assert config.checkpoint_enabled is True
    
    def test_config_validation(self):
        """Test configuration validation"""
        config_mgr = ConfigurationManager()
        is_valid, errors = config_mgr.validate_config()
        
        # Should be valid or have specific errors
        assert isinstance(is_valid, bool)
        assert isinstance(errors, list)


class TestLogging:
    """Test logging infrastructure"""
    
    def test_logger_creation(self):
        """Test logger can be created"""
        logger = WorkflowLogger(name="test_logger")
        
        # Should not raise exception
        logger.info("Test message")
        logger.debug("Debug message")
        logger.warning("Warning message")
    
    def test_workflow_logging(self):
        """Test workflow-specific logging"""
        logger = WorkflowLogger(name="test_workflow")
        
        # Should not raise exception
        logger.log_workflow_start("Test prompt")
        logger.log_step_start("parsing")
        logger.log_step_complete("parsing", 1.5)
        logger.log_workflow_complete(10.0, True)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
