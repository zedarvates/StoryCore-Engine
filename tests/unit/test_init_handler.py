"""
Unit tests for InitHandler.
"""

import argparse
import pytest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.handlers.init import InitHandler
from cli.errors import UserError, SystemError


class TestInitHandler:
    """Test suite for InitHandler."""
    
    def test_handler_attributes(self):
        """Test that handler has required attributes."""
        handler = InitHandler()
        assert handler.command_name == "init"
        assert handler.description == "Initialize a new StoryCore-Engine project"
    
    def test_setup_parser(self):
        """Test parser setup with correct arguments."""
        handler = InitHandler()
        parser = argparse.ArgumentParser()
        handler.setup_parser(parser)
        
        # Parse test arguments
        args = parser.parse_args(["my-project"])
        assert args.project_name == "my-project"
        assert args.path == "."
        assert args.interactive is False
        
        # Test with interactive flag
        args = parser.parse_args(["--interactive"])
        assert args.interactive is True
        assert args.project_name is None
    
    def test_execute_legacy_mode_success(self):
        """Test successful execution in legacy mode."""
        handler = InitHandler()
        args = argparse.Namespace(
            project_name="test-project",
            path=".",
            interactive=False
        )
        
        with patch('project_manager.ProjectManager') as mock_pm_class:
            mock_pm = Mock()
            mock_pm_class.return_value = mock_pm
            
            exit_code = handler.execute(args)
            
            assert exit_code == 0
            mock_pm.init_project.assert_called_once_with("test-project", ".")
    
    def test_execute_legacy_mode_missing_project_name(self):
        """Test legacy mode with project name but wizard modules trigger automatic wizard mode."""
        handler = InitHandler()
        # When project_name is None, it automatically uses wizard mode
        # So this test should verify that wizard mode is triggered
        args = argparse.Namespace(
            project_name=None,
            path=".",
            interactive=False
        )
        
        # Mock wizard to return None (cancelled)
        with patch('wizard.wizard_orchestrator.run_interactive_wizard', return_value=None):
            exit_code = handler.execute(args)
            # Cancellation returns 0 (not an error)
            assert exit_code == 0
    
    def test_execute_wizard_mode_success(self):
        """Test successful execution in wizard mode."""
        handler = InitHandler()
        args = argparse.Namespace(
            project_name=None,
            path=".",
            interactive=True
        )
        
        # Mock wizard modules
        mock_wizard_state = {"project_name": "test-project"}
        mock_config = Mock()
        mock_config.project_name = "test-project"
        
        with patch('wizard.wizard_orchestrator.run_interactive_wizard', return_value=mock_wizard_state), \
             patch('wizard.config_builder.build_project_configuration', return_value=mock_config), \
             patch('wizard.file_writer.create_project_files', return_value=True):
            
            exit_code = handler.execute(args)
            assert exit_code == 0
    
    def test_execute_wizard_mode_cancelled(self):
        """Test wizard mode when user cancels."""
        handler = InitHandler()
        args = argparse.Namespace(
            project_name=None,
            path=".",
            interactive=True
        )
        
        with patch('wizard.wizard_orchestrator.run_interactive_wizard', return_value=None):
            exit_code = handler.execute(args)
            assert exit_code == 0  # Cancellation is not an error
    
    def test_execute_wizard_mode_file_creation_failed(self):
        """Test wizard mode when file creation fails."""
        handler = InitHandler()
        args = argparse.Namespace(
            project_name=None,
            path=".",
            interactive=True
        )
        
        mock_wizard_state = {"project_name": "test-project"}
        mock_config = Mock()
        mock_config.project_name = "test-project"
        
        with patch('wizard.wizard_orchestrator.run_interactive_wizard', return_value=mock_wizard_state), \
             patch('wizard.config_builder.build_project_configuration', return_value=mock_config), \
             patch('wizard.file_writer.create_project_files', return_value=False):
            
            exit_code = handler.execute(args)
            assert exit_code == 1
    
    def test_execute_wizard_import_error(self):
        """Test wizard mode when wizard modules are not available."""
        handler = InitHandler()
        args = argparse.Namespace(
            project_name=None,
            path=".",
            interactive=True
        )
        
        with patch('wizard.wizard_orchestrator.run_interactive_wizard', side_effect=ImportError("Module not found")):
            exit_code = handler.execute(args)
            assert exit_code != 0
    
    def test_execute_legacy_import_error(self):
        """Test legacy mode when ProjectManager is not available."""
        handler = InitHandler()
        args = argparse.Namespace(
            project_name="test-project",
            path=".",
            interactive=False
        )
        
        with patch('project_manager.ProjectManager', side_effect=ImportError("Module not found")):
            exit_code = handler.execute(args)
            assert exit_code != 0
