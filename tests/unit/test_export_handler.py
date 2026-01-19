"""
Unit tests for ExportHandler.
"""

import argparse
import pytest
from pathlib import Path
from unittest.mock import Mock, patch

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.handlers.export import ExportHandler


class TestExportHandler:
    """Test suite for ExportHandler."""
    
    def test_handler_attributes(self):
        """Test that handler has required attributes."""
        handler = ExportHandler()
        assert handler.command_name == "export"
        assert handler.description == "Export project with assets and reports"
    
    def test_setup_parser(self):
        """Test parser setup with correct arguments."""
        handler = ExportHandler()
        parser = argparse.ArgumentParser()
        handler.setup_parser(parser)
        
        # Parse with defaults
        args = parser.parse_args([])
        assert args.project == "."
        assert args.output is None
        assert args.format == "zip"
        assert args.include_source is False
        
        # Parse with custom arguments
        args = parser.parse_args([
            "--project", "test-proj",
            "--output", "exports",
            "--format", "tar",
            "--include-source"
        ])
        assert args.project == "test-proj"
        assert args.output == "exports"
        assert args.format == "tar"
        assert args.include_source is True
    
    def test_execute_success(self, tmp_path):
        """Test successful project export."""
        handler = ExportHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        export_path = tmp_path / "exports" / "test-export"
        export_path.mkdir(parents=True)
        
        # Create some test files in export directory
        (export_path / "project.json").write_text("{}")
        (export_path / "README.md").write_text("# Test")
        
        args = argparse.Namespace(
            project=str(project_path),
            output=None,
            format="zip",
            include_source=False
        )
        
        with patch('exporter.Exporter') as mock_exporter_class:
            mock_exporter = Mock()
            mock_exporter.export_project.return_value = str(export_path)
            mock_exporter_class.return_value = mock_exporter
            
            exit_code = handler.execute(args)
            assert exit_code == 0
            mock_exporter.export_project.assert_called_once_with(str(project_path), None)
    
    def test_execute_project_not_found(self):
        """Test execution fails when project directory doesn't exist."""
        handler = ExportHandler()
        args = argparse.Namespace(
            project="/nonexistent/path",
            output=None,
            format="zip",
            include_source=False
        )
        
        with patch('exporter.Exporter'):
            exit_code = handler.execute(args)
            assert exit_code != 0
    
    def test_execute_with_custom_output(self, tmp_path):
        """Test export with custom output directory."""
        handler = ExportHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        export_path = tmp_path / "custom-exports"
        export_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            output=str(export_path),
            format="zip",
            include_source=False
        )
        
        with patch('exporter.Exporter') as mock_exporter_class:
            mock_exporter = Mock()
            mock_exporter.export_project.return_value = str(export_path)
            mock_exporter_class.return_value = mock_exporter
            
            exit_code = handler.execute(args)
            assert exit_code == 0
            mock_exporter.export_project.assert_called_once_with(
                str(project_path), str(export_path)
            )
    
    def test_execute_different_formats(self, tmp_path):
        """Test export with different formats."""
        handler = ExportHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        export_path = tmp_path / "exports"
        export_path.mkdir()
        
        formats = ["zip", "tar", "directory"]
        
        for fmt in formats:
            args = argparse.Namespace(
                project=str(project_path),
                output=None,
                format=fmt,
                include_source=False
            )
            
            with patch('exporter.Exporter') as mock_exporter_class:
                mock_exporter = Mock()
                mock_exporter.export_project.return_value = str(export_path)
                mock_exporter_class.return_value = mock_exporter
                
                exit_code = handler.execute(args)
                assert exit_code == 0
    
    def test_execute_with_source_files(self, tmp_path):
        """Test export including source files."""
        handler = ExportHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        export_path = tmp_path / "exports"
        export_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            output=None,
            format="zip",
            include_source=True
        )
        
        with patch('exporter.Exporter') as mock_exporter_class:
            mock_exporter = Mock()
            mock_exporter.export_project.return_value = str(export_path)
            mock_exporter_class.return_value = mock_exporter
            
            exit_code = handler.execute(args)
            assert exit_code == 0
    
    def test_execute_import_error(self, tmp_path):
        """Test execution fails when Exporter is not available."""
        handler = ExportHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            output=None,
            format="zip",
            include_source=False
        )
        
        with patch('exporter.Exporter', side_effect=ImportError("Module not found")):
            exit_code = handler.execute(args)
            assert exit_code != 0
    
    def test_execute_empty_export_directory(self, tmp_path):
        """Test export with empty export directory shows warning."""
        handler = ExportHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        export_path = tmp_path / "exports"
        export_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            output=None,
            format="zip",
            include_source=False
        )
        
        with patch('exporter.Exporter') as mock_exporter_class:
            mock_exporter = Mock()
            mock_exporter.export_project.return_value = str(export_path)
            mock_exporter_class.return_value = mock_exporter
            
            exit_code = handler.execute(args)
            assert exit_code == 0
