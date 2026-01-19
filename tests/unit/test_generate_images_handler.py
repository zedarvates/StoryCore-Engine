"""
Unit tests for GenerateImagesHandler.
"""

import argparse
import pytest
from pathlib import Path
from unittest.mock import Mock, patch

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.handlers.generate_images import GenerateImagesHandler


class TestGenerateImagesHandler:
    """Test suite for GenerateImagesHandler."""
    
    def test_handler_attributes(self):
        """Test that handler has required attributes."""
        handler = GenerateImagesHandler()
        assert handler.command_name == "generate-images"
        assert handler.description == "Generate images using ComfyUI backend"
    
    def test_setup_parser(self):
        """Test parser setup with correct arguments."""
        handler = GenerateImagesHandler()
        parser = argparse.ArgumentParser()
        handler.setup_parser(parser)
        
        # Parse test arguments with defaults
        args = parser.parse_args([])
        assert args.project == "."
        
        # Parse with custom arguments
        args = parser.parse_args(["--project", "test-proj"])
        assert args.project == "test-proj"
    
    def test_execute_success(self, tmp_path):
        """Test successful image generation."""
        handler = GenerateImagesHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            workflow=None,
            shots=None,
            comfyui_url="http://127.0.0.1:8188",
            mock=True,
            batch_size=1
        )
        
        with patch('comfyui_image_engine.ComfyUIImageEngine') as mock_engine_class:
            mock_engine = Mock()
            mock_engine.generate_images.return_value = {
                "total_generated": 10,
                "successful": 10,
                "failed": 0,
                "processing_time": 20.0,
                "generated_images": [],
                "failures": []
            }
            mock_engine_class.return_value = mock_engine
            
            exit_code = handler.execute(args)
            
            assert exit_code == 0
            mock_engine.generate_images.assert_called_once()
    
    def test_execute_project_not_found(self):
        """Test execution fails when project directory doesn't exist."""
        handler = GenerateImagesHandler()
        args = argparse.Namespace(project="/nonexistent/path")
        
        exit_code = handler.execute(args)
        assert exit_code != 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
