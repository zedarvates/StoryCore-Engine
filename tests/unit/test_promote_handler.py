"""
Unit tests for PromoteHandler.
"""

import argparse
import pytest
from pathlib import Path
from unittest.mock import Mock, patch

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.handlers.promote import PromoteHandler


class TestPromoteHandler:
    """Test suite for PromoteHandler."""
    
    def test_handler_attributes(self):
        """Test that handler has required attributes."""
        handler = PromoteHandler()
        assert handler.command_name == "promote"
        assert handler.description == "Promote panels with upscaling and enhancement"
    
    def test_setup_parser(self):
        """Test parser setup with correct arguments."""
        handler = PromoteHandler()
        parser = argparse.ArgumentParser()
        handler.setup_parser(parser)
        
        # Parse with defaults
        args = parser.parse_args([])
        assert args.project == "."
        assert args.scale == 2
        assert args.method == "lanczos"
        
        # Parse with custom arguments
        args = parser.parse_args(["--project", "test-proj", "--scale", "4", "--method", "bicubic"])
        assert args.project == "test-proj"
        assert args.scale == 4
        assert args.method == "bicubic"
    
    def test_execute_success(self, tmp_path):
        """Test successful panel promotion."""
        handler = PromoteHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            scale=2,
            method="lanczos"
        )
        
        mock_result = {
            'metadata': {'total_panels': 9},
            'resolutions': [((512, 512), (1024, 1024)) for _ in range(9)],
            'output_dir': 'promoted'
        }
        
        with patch('promotion_engine.promote_panels', return_value=mock_result), \
             patch('promotion_engine.update_project_manifest'):
            
            exit_code = handler.execute(args)
            assert exit_code == 0
    
    def test_execute_project_not_found(self):
        """Test execution fails when project directory doesn't exist."""
        handler = PromoteHandler()
        args = argparse.Namespace(
            project="/nonexistent/path",
            scale=2,
            method="lanczos"
        )
        
        with patch('promotion_engine.promote_panels'), \
             patch('promotion_engine.update_project_manifest'):
            exit_code = handler.execute(args)
            assert exit_code != 0
    
    def test_execute_invalid_scale(self, tmp_path):
        """Test execution fails with invalid scale factor."""
        handler = PromoteHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            scale=0,  # Invalid
            method="lanczos"
        )
        
        with patch('promotion_engine.promote_panels'), \
             patch('promotion_engine.update_project_manifest'):
            exit_code = handler.execute(args)
            assert exit_code != 0
    
    def test_execute_large_scale_warning(self, tmp_path, capsys):
        """Test warning is shown for large scale factors."""
        handler = PromoteHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            scale=8,  # Large scale
            method="lanczos"
        )
        
        mock_result = {
            'metadata': {'total_panels': 9},
            'resolutions': [((512, 512), (4096, 4096)) for _ in range(9)],
            'output_dir': 'promoted'
        }
        
        with patch('promotion_engine.promote_panels', return_value=mock_result), \
             patch('promotion_engine.update_project_manifest'):
            
            exit_code = handler.execute(args)
            assert exit_code == 0
            
            captured = capsys.readouterr()
            assert "Large scale factor" in captured.out or "may result in very large files" in captured.out
    
    def test_execute_import_error(self, tmp_path):
        """Test execution fails when promotion_engine is not available."""
        handler = PromoteHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            scale=2,
            method="lanczos"
        )
        
        with patch('promotion_engine.promote_panels', side_effect=ImportError("Module not found")):
            exit_code = handler.execute(args)
            assert exit_code != 0
    
    def test_execute_different_methods(self, tmp_path):
        """Test promotion with different upscaling methods."""
        handler = PromoteHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        methods = ["lanczos", "bicubic", "bilinear", "nearest"]
        
        for method in methods:
            args = argparse.Namespace(
                project=str(project_path),
                scale=2,
                method=method
            )
            
            mock_result = {
                'metadata': {'total_panels': 9},
                'resolutions': [((512, 512), (1024, 1024)) for _ in range(9)],
                'output_dir': 'promoted'
            }
            
            with patch('promotion_engine.promote_panels', return_value=mock_result) as mock_promote, \
                 patch('promotion_engine.update_project_manifest'):
                
                exit_code = handler.execute(args)
                assert exit_code == 0
                mock_promote.assert_called_once_with(project_path, 2, method)
