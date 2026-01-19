"""
Unit tests for WorldGenerateHandler.
"""

import argparse
import pytest
from pathlib import Path
from unittest.mock import Mock, patch

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.handlers.world_generate import WorldGenerateHandler


class TestWorldGenerateHandler:
    """Test suite for WorldGenerateHandler."""
    
    def test_handler_attributes(self):
        """Test that handler has required attributes."""
        handler = WorldGenerateHandler()
        assert handler.command_name == "world-generate"
        assert handler.description == "Generate world and environment settings"
    
    def test_setup_parser(self):
        """Test parser setup with correct arguments."""
        handler = WorldGenerateHandler()
        parser = argparse.ArgumentParser()
        handler.setup_parser(parser)
        
        # Parse test arguments with defaults
        args = parser.parse_args([])
        assert args.project == "."
        
        # Parse with custom arguments
        args = parser.parse_args(["--project", "test-proj"])
        assert args.project == "test-proj"
    
    def test_execute_success(self, tmp_path):
        """Test successful world generation."""
        handler = WorldGenerateHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            genre="fantasy",
            scale="medium",
            locations=None,
            interactive=False
        )
        
        with patch('world_generator.WorldGenerator') as mock_gen_class:
            mock_gen = Mock()
            mock_gen.generate_world.return_value = {
                "world_id": "test-123",
                "world_name": "Test World",
                "genre": "fantasy",
                "scale": "medium",
                "total_locations": 5,
                "locations": [],
                "world_features": {}
            }
            mock_gen_class.return_value = mock_gen
            
            exit_code = handler.execute(args)
            
            assert exit_code == 0
            mock_gen.generate_world.assert_called_once()
    
    def test_execute_project_not_found(self):
        """Test execution fails when project directory doesn't exist."""
        handler = WorldGenerateHandler()
        args = argparse.Namespace(project="/nonexistent/path")
        
        exit_code = handler.execute(args)
        assert exit_code != 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
