"""
Unit tests for VideoPlanHandler.
"""

import argparse
import pytest
from pathlib import Path
from unittest.mock import Mock, patch

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.handlers.video_plan import VideoPlanHandler


class TestVideoPlanHandler:
    """Test suite for VideoPlanHandler."""
    
    def test_handler_attributes(self):
        """Test that handler has required attributes."""
        handler = VideoPlanHandler()
        assert handler.command_name == "video-plan"
        assert handler.description == "Generate video plan with camera movements and transitions"
    
    def test_setup_parser(self):
        """Test parser setup with correct arguments."""
        handler = VideoPlanHandler()
        parser = argparse.ArgumentParser()
        handler.setup_parser(parser)
        
        # Parse test arguments with defaults
        args = parser.parse_args([])
        assert args.project == "."
        
        # Parse with custom arguments
        args = parser.parse_args(["--project", "test-proj"])
        assert args.project == "test-proj"
    
    def test_execute_success(self, tmp_path):
        """Test successful video plan generation."""
        handler = VideoPlanHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            duration=None,
            fps=24,
            style="cinematic"
        )
        
        with patch('video_plan_engine.VideoPlanEngine') as mock_engine_class:
            mock_engine = Mock()
            mock_engine.generate_video_plan.return_value = {
                "status": "success",
                "total_shots": 10,
                "total_duration": 30.0,
                "camera_movements": {},
                "transitions": {}
            }
            mock_engine_class.return_value = mock_engine
            
            exit_code = handler.execute(args)
            
            assert exit_code == 0
            mock_engine.generate_video_plan.assert_called_once()
    
    def test_execute_project_not_found(self):
        """Test execution fails when project directory doesn't exist."""
        handler = VideoPlanHandler()
        args = argparse.Namespace(project="/nonexistent/path")
        
        exit_code = handler.execute(args)
        assert exit_code != 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
