"""
Unit tests for SceneBreakdownHandler.
"""

import argparse
import pytest
from pathlib import Path
from unittest.mock import Mock, patch

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.handlers.scene_breakdown import SceneBreakdownHandler


class TestSceneBreakdownHandler:
    """Test suite for SceneBreakdownHandler."""
    
    def test_handler_attributes(self):
        """Test that handler has required attributes."""
        handler = SceneBreakdownHandler()
        assert handler.command_name == "scene-breakdown"
        assert handler.description == "Process detailed scene breakdown with lighting and environment"
    
    def test_setup_parser(self):
        """Test parser setup with correct arguments."""
        handler = SceneBreakdownHandler()
        parser = argparse.ArgumentParser()
        handler.setup_parser(parser)
        
        # Parse test arguments with defaults
        args = parser.parse_args([])
        assert args.project == "."
        
        # Parse with custom arguments
        args = parser.parse_args(["--project", "test-proj"])
        assert args.project == "test-proj"
    
    def test_execute_success(self, tmp_path):
        """Test successful scene breakdown generation."""
        handler = SceneBreakdownHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(project=str(project_path))
        
        with patch('scene_breakdown_engine.SceneBreakdownEngine') as mock_engine_class:
            mock_engine = Mock()
            # Return a dict with all required keys
            mock_engine.process_scene_breakdown.return_value = {
                "status": "success",
                "scene_breakdown_id": "test-123",
                "processing_metadata": {
                    "total_scenes_processed": 5,
                    "average_scene_complexity": 3.5,
                    "lighting_consistency_score": 4.0,
                    "color_harmony_score": 4.2
                },
                "detailed_scenes": [],
                "global_cinematic_rules": {}
            }
            mock_engine_class.return_value = mock_engine
            
            exit_code = handler.execute(args)
            
            assert exit_code == 0
            mock_engine.process_scene_breakdown.assert_called_once()
    
    def test_execute_project_not_found(self):
        """Test execution fails when project directory doesn't exist."""
        handler = SceneBreakdownHandler()
        args = argparse.Namespace(project="/nonexistent/path")
        
        exit_code = handler.execute(args)
        assert exit_code != 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
