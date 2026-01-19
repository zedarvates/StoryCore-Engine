"""
Unit tests for StoryboardHandler.
"""

import argparse
import pytest
from pathlib import Path
from unittest.mock import Mock, patch

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.handlers.storyboard import StoryboardHandler


class TestStoryboardHandler:
    """Test suite for StoryboardHandler."""
    
    def test_handler_attributes(self):
        """Test that handler has required attributes."""
        handler = StoryboardHandler()
        assert handler.command_name == "storyboard"
        assert handler.description == "Generate and manage project storyboards"
    
    def test_setup_parser(self):
        """Test parser setup with correct arguments."""
        handler = StoryboardHandler()
        parser = argparse.ArgumentParser()
        handler.setup_parser(parser)
        
        # Parse test arguments with defaults
        args = parser.parse_args([])
        assert args.project == "."
        
        # Parse with custom arguments
        args = parser.parse_args(["--project", "test-proj"])
        assert args.project == "test-proj"
    
    def test_execute_success(self, tmp_path):
        """Test successful storyboard generation."""
        handler = StoryboardHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        # Create a storyboard.json file for the default info display
        import json
        storyboard_file = project_path / "storyboard.json"
        storyboard_file.write_text(json.dumps({
            "project_name": "test-project",
            "shots": []
        }))
        
        args = argparse.Namespace(
            project=str(project_path),
            generate=False,
            update=False,
            validate=False,
            shots=None
        )
        
        exit_code = handler.execute(args)
        
        assert exit_code == 0
    
    def test_execute_project_not_found(self):
        """Test execution fails when project directory doesn't exist."""
        handler = StoryboardHandler()
        args = argparse.Namespace(project="/nonexistent/path")
        
        exit_code = handler.execute(args)
        assert exit_code != 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
