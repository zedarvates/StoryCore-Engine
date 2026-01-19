"""
Unit tests for GenerateVideoHandler.
"""

import argparse
import pytest
from pathlib import Path
from unittest.mock import Mock, patch

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.handlers.generate_video import GenerateVideoHandler


class TestGenerateVideoHandler:
    """Test suite for GenerateVideoHandler."""
    
    def test_handler_attributes(self):
        """Test that handler has required attributes."""
        handler = GenerateVideoHandler()
        assert handler.command_name == "generate-video"
        assert handler.description == "Generate videos using ComfyUI backend"
    
    def test_setup_parser(self):
        """Test parser setup with correct arguments."""
        handler = GenerateVideoHandler()
        parser = argparse.ArgumentParser()
        handler.setup_parser(parser)
        
        # Parse test arguments with defaults
        args = parser.parse_args([])
        assert args.project == "."
        
        # Parse with custom arguments
        args = parser.parse_args(["--project", "test-proj"])
        assert args.project == "test-proj"
    
    def test_execute_success(self, tmp_path):
        """Test successful video generation."""
        handler = GenerateVideoHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            workflow=None,
            shots=None,
            comfyui_url="http://127.0.0.1:8188",
            mock=True,
            fps=24,
            duration=None
        )
        
        with patch('comfyui_video_engine.ComfyUIVideoEngine') as mock_engine_class:
            mock_engine = Mock()
            mock_engine.generate_videos.return_value = {
                "total_generated": 5,
                "successful": 5,
                "failed": 0,
                "total_duration": 30.0,
                "processing_time": 15.0,
                "generated_videos": [],
                "failures": []
            }
            mock_engine_class.return_value = mock_engine
            
            exit_code = handler.execute(args)
            
            assert exit_code == 0
            mock_engine.generate_videos.assert_called_once()
    
    def test_execute_project_not_found(self):
        """Test execution fails when project directory doesn't exist."""
        handler = GenerateVideoHandler()
        args = argparse.Namespace(project="/nonexistent/path")
        
        exit_code = handler.execute(args)
        assert exit_code != 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
