"""
Unit tests for PuppetLayerHandler.
"""

import argparse
import pytest
from pathlib import Path
from unittest.mock import Mock, patch

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.handlers.puppet_layer import PuppetLayerHandler


class TestPuppetLayerHandler:
    """Test suite for PuppetLayerHandler."""
    
    def test_handler_attributes(self):
        """Test that handler has required attributes."""
        handler = PuppetLayerHandler()
        assert handler.command_name == "puppet-layer"
        assert handler.description == "Generate puppet layers for character animation"
    
    def test_setup_parser(self):
        """Test parser setup with correct arguments."""
        handler = PuppetLayerHandler()
        parser = argparse.ArgumentParser()
        handler.setup_parser(parser)
        
        # Parse test arguments with defaults
        args = parser.parse_args([])
        assert args.project == "."
        
        # Parse with custom arguments
        args = parser.parse_args(["--project", "test-proj"])
        assert args.project == "test-proj"
    
    def test_execute_success(self, tmp_path):
        """Test successful puppet layer generation."""
        handler = PuppetLayerHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            character="char1",
            all=False,
            layers=None
        )
        
        with patch('puppet_layer_engine.PuppetLayerEngine') as mock_engine_class:
            mock_engine = Mock()
            mock_engine.generate_puppet_layers.return_value = {
                "status": "success",
                "total_layers": 5,
                "layer_breakdown": {}
            }
            mock_engine_class.return_value = mock_engine
            
            exit_code = handler.execute(args)
            
            assert exit_code == 0
            mock_engine.generate_puppet_layers.assert_called_once()
    
    def test_execute_project_not_found(self):
        """Test execution fails when project directory doesn't exist."""
        handler = PuppetLayerHandler()
        args = argparse.Namespace(project="/nonexistent/path")
        
        exit_code = handler.execute(args)
        assert exit_code != 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
