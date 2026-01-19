"""
Unit tests for CharacterWizardHandler.
"""

import argparse
import pytest
from pathlib import Path
from unittest.mock import Mock, patch

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.handlers.character_wizard import CharacterWizardHandler


class TestCharacterWizardHandler:
    """Test suite for CharacterWizardHandler."""
    
    def test_handler_attributes(self):
        """Test that handler has required attributes."""
        handler = CharacterWizardHandler()
        assert handler.command_name == "character-wizard"
        assert handler.description == "Interactive character creation wizard"
    
    def test_setup_parser(self):
        """Test parser setup with correct arguments."""
        handler = CharacterWizardHandler()
        parser = argparse.ArgumentParser()
        handler.setup_parser(parser)
        
        # Parse test arguments with defaults
        args = parser.parse_args([])
        assert args.project == "."
        
        # Parse with custom arguments
        args = parser.parse_args(["--project", "test-proj"])
        assert args.project == "test-proj"
    
    def test_execute_success(self, tmp_path):
        """Test successful character wizard execution."""
        handler = CharacterWizardHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            resume=None,
            batch=None,
            genre=None,
            style=None
        )
        
        with patch('character_wizard.CharacterWizardOrchestrator') as mock_orchestrator_class:
            mock_orchestrator = Mock()
            # Create a mock result object with attributes
            mock_result = Mock()
            mock_result.success = True
            mock_result.character_profile = Mock()
            mock_result.character_profile.name = "Test Character"
            mock_result.character_profile.character_id = "test-123"
            mock_result.character_profile.creation_method = Mock(value="interactive")
            mock_result.character_profile.quality_score = 4.5  # Numeric value for formatting
            mock_result.processing_time = 2.3  # Numeric value for formatting
            mock_result.integration_status = None  # No integration status
            
            mock_orchestrator.start_wizard.return_value = mock_result
            mock_orchestrator_class.return_value = mock_orchestrator
            
            exit_code = handler.execute(args)
            
            assert exit_code == 0
            mock_orchestrator.start_wizard.assert_called_once()
    
    def test_execute_project_not_found(self):
        """Test execution fails when project directory doesn't exist."""
        handler = CharacterWizardHandler()
        args = argparse.Namespace(project="/nonexistent/path")
        
        exit_code = handler.execute(args)
        assert exit_code != 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
