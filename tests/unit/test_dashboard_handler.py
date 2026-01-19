"""
Unit tests for DashboardHandler.
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path
import argparse

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.handlers.dashboard import DashboardHandler
from cli.errors import UserError, SystemError


class TestDashboardHandler(unittest.TestCase):
    """Test cases for DashboardHandler."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.handler = DashboardHandler()
    
    def test_command_name(self):
        """Test that command name is set correctly."""
        self.assertEqual(self.handler.command_name, "dashboard")
    
    def test_description(self):
        """Test that description is set."""
        self.assertIsInstance(self.handler.description, str)
        self.assertGreater(len(self.handler.description), 0)
    
    def test_setup_parser(self):
        """Test parser setup."""
        parser = argparse.ArgumentParser()
        self.handler.setup_parser(parser)
        
        # Parse test arguments
        args = parser.parse_args(["--project", "test-project"])
        self.assertEqual(args.project, "test-project")
    
    def test_setup_parser_with_output(self):
        """Test parser setup with output path."""
        parser = argparse.ArgumentParser()
        self.handler.setup_parser(parser)
        
        args = parser.parse_args(["--output", "dashboard.html"])
        self.assertEqual(args.output, "dashboard.html")
    
    def test_setup_parser_with_open(self):
        """Test parser setup with open flag."""
        parser = argparse.ArgumentParser()
        self.handler.setup_parser(parser)
        
        args = parser.parse_args(["--open"])
        self.assertTrue(args.open)
    
    def test_setup_parser_with_template(self):
        """Test parser setup with template choice."""
        parser = argparse.ArgumentParser()
        self.handler.setup_parser(parser)
        
        args = parser.parse_args(["--template", "minimal"])
        self.assertEqual(args.template, "minimal")
    
    @patch('exporter.generate_dashboard')
    @patch('cli.handlers.dashboard.Path')
    def test_execute_success(self, mock_path, mock_generate):
        """Test successful dashboard generation."""
        # Setup mocks
        mock_project_path = MagicMock()
        mock_project_path.exists.return_value = True
        mock_project_path.absolute.return_value = "/test/project"
        mock_path.return_value = mock_project_path
        
        mock_generate.return_value = "/test/project/dashboard.html"
        
        # Create args
        args = argparse.Namespace(
            project="test-project",
            output=None,
            open=False,
            template="default"
        )
        
        # Execute
        result = self.handler.execute(args)
        
        # Verify
        self.assertEqual(result, 0)
        mock_generate.assert_called_once()
    
    @patch('cli.handlers.dashboard.Path')
    def test_execute_project_not_found(self, mock_path):
        """Test execution with non-existent project."""
        # Setup mocks
        mock_project_path = MagicMock()
        mock_project_path.exists.return_value = False
        mock_path.return_value = mock_project_path
        
        # Create args
        args = argparse.Namespace(
            project="nonexistent",
            output=None,
            open=False,
            template="default"
        )
        
        # Execute
        result = self.handler.execute(args)
        
        # Verify error handling
        self.assertNotEqual(result, 0)
    
    @patch('webbrowser.open')
    def test_open_in_browser_success(self, mock_webbrowser):
        """Test opening dashboard in browser."""
        dashboard_path = "/test/dashboard.html"
        
        # Execute
        self.handler._open_in_browser(dashboard_path)
        
        # Verify
        mock_webbrowser.assert_called_once()
    
    @patch('webbrowser.open')
    def test_open_in_browser_failure(self, mock_webbrowser):
        """Test browser opening failure handling."""
        mock_webbrowser.side_effect = Exception("Browser error")
        dashboard_path = "/test/dashboard.html"
        
        # Execute - should not raise exception
        self.handler._open_in_browser(dashboard_path)
        
        # Verify it was attempted
        mock_webbrowser.assert_called_once()


if __name__ == '__main__':
    unittest.main()
