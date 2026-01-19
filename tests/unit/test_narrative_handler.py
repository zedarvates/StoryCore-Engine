"""
Unit tests for NarrativeHandler.
"""

import argparse
import pytest
from pathlib import Path
from unittest.mock import Mock, patch

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.handlers.narrative import NarrativeHandler


class TestNarrativeHandler:
    """Test suite for NarrativeHandler."""
    
    def test_handler_attributes(self):
        """Test that handler has required attributes."""
        handler = NarrativeHandler()
        assert handler.command_name == "narrative"
        assert handler.description == "Process narrative and ensure style consistency"
    
    def test_setup_parser(self):
        """Test parser setup with correct arguments."""
        handler = NarrativeHandler()
        parser = argparse.ArgumentParser()
        handler.setup_parser(parser)
        
        # Parse test arguments with defaults
        args = parser.parse_args([])
        assert args.project == "."
        
        # Parse with custom arguments
        args = parser.parse_args(["--project", "test-proj"])
        assert args.project == "test-proj"
    
    def test_execute_success(self, tmp_path):
        """Test successful narrative generation."""
        handler = NarrativeHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(project=str(project_path))
        
        with patch('narrative_engine.NarrativeEngine') as mock_engine_class:
            mock_engine = Mock()
            # Return a dict instead of Mock to avoid subscriptable error
            mock_engine.process_storyboard.return_value = {
                "status": "success",
                "shots_processed": 10,
                "global_style": {},
                "consistency_issues": [],
                "augmented_prompts": []
            }
            mock_engine_class.return_value = mock_engine
            
            exit_code = handler.execute(args)
            
            assert exit_code == 0
            mock_engine.process_storyboard.assert_called_once()
    
    def test_execute_project_not_found(self):
        """Test execution fails when project directory doesn't exist."""
        handler = NarrativeHandler()
        args = argparse.Namespace(project="/nonexistent/path")
        
        exit_code = handler.execute(args)
        assert exit_code != 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
