"""
Unit tests for ShotPlanningHandler.
"""

import argparse
import pytest
from pathlib import Path
from unittest.mock import Mock, patch

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.handlers.shot_planning import ShotPlanningHandler


class TestShotPlanningHandler:
    """Test suite for ShotPlanningHandler."""
    
    def test_handler_attributes(self):
        """Test that handler has required attributes."""
        handler = ShotPlanningHandler()
        assert handler.command_name == "shot-planning"
        assert handler.description == "Process shot planning with cinematic grammar analysis"
    
    def test_setup_parser(self):
        """Test parser setup with correct arguments."""
        handler = ShotPlanningHandler()
        parser = argparse.ArgumentParser()
        handler.setup_parser(parser)
        
        # Parse test arguments with defaults
        args = parser.parse_args([])
        assert args.project == "."
        
        # Parse with custom arguments
        args = parser.parse_args(["--project", "test-proj"])
        assert args.project == "test-proj"
    
    def test_execute_success(self, tmp_path):
        """Test successful shot planning generation."""
        handler = ShotPlanningHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            style="cinematic",
            analyze_grammar=False,
            camera_specs=False
        )
        
        with patch('shot_engine.ShotEngine') as mock_engine_class:
            mock_engine = Mock()
            mock_engine.process_shot_planning.return_value = {
                "status": "success",
                "shot_planning_id": "test-123",
                "processing_metadata": {
                    "total_shots": 10,
                    "average_shot_duration": 3.5,
                    "shot_variety_score": 4.0,
                    "camera_complexity_score": 3.8
                },
                "cinematic_grammar": {},
                "camera_specifications": {}
            }
            mock_engine_class.return_value = mock_engine
            
            exit_code = handler.execute(args)
            
            assert exit_code == 0
            mock_engine.process_shot_planning.assert_called_once()
    
    def test_execute_project_not_found(self):
        """Test execution fails when project directory doesn't exist."""
        handler = ShotPlanningHandler()
        args = argparse.Namespace(project="/nonexistent/path")
        
        exit_code = handler.execute(args)
        assert exit_code != 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
