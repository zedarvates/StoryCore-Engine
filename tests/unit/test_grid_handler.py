"""
Unit tests for GridHandler.
"""

import argparse
import pytest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.handlers.grid import GridHandler
from cli.errors import UserError, SystemError


class TestGridHandler:
    """Test suite for GridHandler."""
    
    def test_handler_attributes(self):
        """Test that handler has required attributes."""
        handler = GridHandler()
        assert handler.command_name == "grid"
        assert handler.description == "Generate grid and slice into panels"
        assert handler.SUPPORTED_GRIDS == ["3x3", "1x2", "1x4"]
    
    def test_setup_parser(self):
        """Test parser setup with correct arguments."""
        handler = GridHandler()
        parser = argparse.ArgumentParser()
        handler.setup_parser(parser)
        
        # Parse test arguments with defaults
        args = parser.parse_args([])
        assert args.project == "."
        assert args.grid == "3x3"
        assert args.cell_size == 512
        assert args.out is None
        
        # Parse with custom arguments
        args = parser.parse_args(["--project", "test-proj", "--grid", "1x2", "--cell-size", "1024"])
        assert args.project == "test-proj"
        assert args.grid == "1x2"
        assert args.cell_size == 1024
    
    def test_execute_success(self, tmp_path):
        """Test successful grid generation."""
        handler = GridHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            grid="3x3",
            out=None,
            cell_size=512
        )
        
        with patch('grid_generator.GridGenerator') as mock_gen_class:
            mock_gen = Mock()
            mock_gen.generate_grid.return_value = "grid.png"
            mock_gen_class.return_value = mock_gen
            
            exit_code = handler.execute(args)
            
            assert exit_code == 0
            mock_gen.generate_grid.assert_called_once_with(
                str(project_path), "3x3", None, 512
            )
    
    def test_execute_project_not_found(self):
        """Test execution fails when project directory doesn't exist."""
        handler = GridHandler()
        args = argparse.Namespace(
            project="/nonexistent/path",
            grid="3x3",
            out=None,
            cell_size=512
        )
        
        with patch('grid_generator.GridGenerator'):
            exit_code = handler.execute(args)
            assert exit_code != 0
    
    def test_execute_invalid_grid_spec(self, tmp_path):
        """Test execution fails with invalid grid specification."""
        handler = GridHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            grid="5x5",  # Invalid
            out=None,
            cell_size=512
        )
        
        with patch('grid_generator.GridGenerator'):
            exit_code = handler.execute(args)
            assert exit_code != 0
    
    def test_execute_invalid_cell_size(self, tmp_path):
        """Test execution fails with invalid cell size."""
        handler = GridHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            grid="3x3",
            out=None,
            cell_size=-100  # Invalid
        )
        
        with patch('grid_generator.GridGenerator'):
            exit_code = handler.execute(args)
            assert exit_code != 0
    
    def test_execute_import_error(self, tmp_path):
        """Test execution fails when GridGenerator is not available."""
        handler = GridHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            grid="3x3",
            out=None,
            cell_size=512
        )
        
        with patch('grid_generator.GridGenerator', side_effect=ImportError("Module not found")):
            exit_code = handler.execute(args)
            assert exit_code != 0
    
    def test_execute_with_custom_output(self, tmp_path):
        """Test grid generation with custom output path."""
        handler = GridHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            grid="1x4",
            out="custom_grid.png",
            cell_size=1024
        )
        
        with patch('grid_generator.GridGenerator') as mock_gen_class:
            mock_gen = Mock()
            mock_gen.generate_grid.return_value = "custom_grid.png"
            mock_gen_class.return_value = mock_gen
            
            exit_code = handler.execute(args)
            
            assert exit_code == 0
            mock_gen.generate_grid.assert_called_once_with(
                str(project_path), "1x4", "custom_grid.png", 1024
            )
