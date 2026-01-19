"""
Unit tests for GenerateAudioHandler.
"""

import argparse
import pytest
from pathlib import Path
from unittest.mock import Mock, patch

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.handlers.generate_audio import GenerateAudioHandler


class TestGenerateAudioHandler:
    """Test suite for GenerateAudioHandler."""
    
    def test_handler_attributes(self):
        """Test that handler has required attributes."""
        handler = GenerateAudioHandler()
        assert handler.command_name == "generate-audio"
        assert handler.description == "Generate audio using ComfyUI backend"
    
    def test_setup_parser(self):
        """Test parser setup with correct arguments."""
        handler = GenerateAudioHandler()
        parser = argparse.ArgumentParser()
        handler.setup_parser(parser)
        
        # Parse test arguments with defaults
        args = parser.parse_args([])
        assert args.project == "."
        
        # Parse with custom arguments
        args = parser.parse_args(["--project", "test-proj"])
        assert args.project == "test-proj"
    
    def test_execute_success(self, tmp_path):
        """Test successful audio generation."""
        handler = GenerateAudioHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            workflow=None,
            type="dialogue",
            shots=None,
            comfyui_url="http://127.0.0.1:8188",
            mock=True,
            voice=None,
            music_style=None
        )
        
        with patch('comfyui_audio_engine.ComfyUIAudioEngine') as mock_engine_class:
            mock_engine = Mock()
            mock_engine.generate_audio.return_value = {
                "total_generated": 5,
                "successful": 5,
                "failed": 0,
                "total_duration": 30.0,
                "processing_time": 10.0,
                "generated_audio": [],
                "failures": []
            }
            mock_engine_class.return_value = mock_engine
            
            exit_code = handler.execute(args)
            
            assert exit_code == 0
            mock_engine.generate_audio.assert_called_once()
    
    def test_execute_project_not_found(self):
        """Test execution fails when project directory doesn't exist."""
        handler = GenerateAudioHandler()
        args = argparse.Namespace(project="/nonexistent/path")
        
        exit_code = handler.execute(args)
        assert exit_code != 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
