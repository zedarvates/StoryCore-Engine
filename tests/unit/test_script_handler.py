"""
Unit tests for ScriptHandler.
"""

import argparse
import pytest
from pathlib import Path
from unittest.mock import Mock, patch

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.handlers.script import ScriptHandler


class TestScriptHandler:
    """Test suite for ScriptHandler."""
    
    def test_handler_attributes(self):
        """Test that handler has required attributes."""
        handler = ScriptHandler()
        assert handler.command_name == "script"
        assert handler.description == "Process script and extract narrative structure"
    
    def test_setup_parser(self):
        """Test parser setup with correct arguments."""
        handler = ScriptHandler()
        parser = argparse.ArgumentParser()
        handler.setup_parser(parser)
        
        # Parse test arguments with defaults
        args = parser.parse_args([])
        assert args.project == "."
        
        # Parse with custom arguments
        args = parser.parse_args(["--project", "test-proj"])
        assert args.project == "test-proj"
    
    def test_execute_success(self, tmp_path):
        """Test successful script processing."""
        handler = ScriptHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            text="Test script content",
            input=None,
            format="plain",
            extract_characters=False,
            extract_scenes=False
        )
        
        with patch('script_engine.ScriptEngine') as mock_engine_class:
            mock_engine = Mock()
            mock_engine.process_script.return_value = {
                "status": "success",
                "script_id": "test-123",
                "processing_metadata": {
                    "total_scenes": 3,
                    "total_characters": 2,
                    "estimated_duration_seconds": 120,
                    "complexity_score": 3.5
                },
                "narrative_structure": {"scenes": []},
                "characters": []
            }
            mock_engine_class.return_value = mock_engine
            
            exit_code = handler.execute(args)
            
            assert exit_code == 0
            mock_engine.process_script.assert_called_once()
    
    def test_execute_project_not_found(self):
        """Test execution fails when project directory doesn't exist."""
        handler = ScriptHandler()
        args = argparse.Namespace(project="/nonexistent/path")
        
        exit_code = handler.execute(args)
        assert exit_code != 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
