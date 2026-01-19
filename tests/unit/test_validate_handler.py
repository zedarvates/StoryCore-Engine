"""
Unit tests for ValidateHandler.
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path
import argparse

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.handlers.validate import ValidateHandler
from cli.errors import UserError, SystemError


class TestValidateHandler(unittest.TestCase):
    """Test cases for ValidateHandler."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.handler = ValidateHandler()
    
    def test_command_name(self):
        """Test that command name is set correctly."""
        self.assertEqual(self.handler.command_name, "validate")
    
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
    
    def test_setup_parser_with_strict(self):
        """Test parser setup with strict flag."""
        parser = argparse.ArgumentParser()
        self.handler.setup_parser(parser)
        
        args = parser.parse_args(["--strict"])
        self.assertTrue(args.strict)
    
    def test_setup_parser_with_fix(self):
        """Test parser setup with fix flag."""
        parser = argparse.ArgumentParser()
        self.handler.setup_parser(parser)
        
        args = parser.parse_args(["--fix"])
        self.assertTrue(args.fix)
    
    @patch('validator.Validator')
    @patch('cli.handlers.validate.Path')
    def test_execute_success(self, mock_path, mock_validator_class):
        """Test successful validation execution."""
        # Setup mocks
        mock_project_path = MagicMock()
        mock_project_path.exists.return_value = True
        mock_project_path.absolute.return_value = "/test/project"
        mock_path.return_value = mock_project_path
        
        mock_validator = MagicMock()
        mock_validator.validate_project_directory.return_value = {
            "project.json": True,
            "storyboard.json": True
        }
        mock_validator_class.return_value = mock_validator
        
        # Create args
        args = argparse.Namespace(project="test-project", strict=False, fix=False)
        
        # Execute
        result = self.handler.execute(args)
        
        # Verify
        self.assertEqual(result, 0)
        mock_validator.validate_project_directory.assert_called_once()
    
    @patch('validator.Validator')
    @patch('cli.handlers.validate.Path')
    def test_execute_with_failures(self, mock_path, mock_validator_class):
        """Test validation with failures."""
        # Setup mocks
        mock_project_path = MagicMock()
        mock_project_path.exists.return_value = True
        mock_project_path.absolute.return_value = "/test/project"
        mock_path.return_value = mock_project_path
        
        mock_validator = MagicMock()
        mock_validator.validate_project_directory.return_value = {
            "project.json": True,
            "storyboard.json": "File not found"
        }
        mock_validator_class.return_value = mock_validator
        
        # Create args
        args = argparse.Namespace(project="test-project", strict=False, fix=False)
        
        # Execute
        result = self.handler.execute(args)
        
        # Verify
        self.assertEqual(result, 1)
    
    @patch('cli.handlers.validate.Path')
    def test_execute_project_not_found(self, mock_path):
        """Test execution with non-existent project."""
        # Setup mocks
        mock_project_path = MagicMock()
        mock_project_path.exists.return_value = False
        mock_path.return_value = mock_project_path
        
        # Create args
        args = argparse.Namespace(project="nonexistent", strict=False, fix=False)
        
        # Execute
        result = self.handler.execute(args)
        
        # Verify error handling
        self.assertNotEqual(result, 0)
    
    def test_attempt_fixes(self):
        """Test automatic fix attempts."""
        project_path = Path("/test/project")
        failed_validations = [
            ("missing_file.json", "File not found"),
            ("missing_dir/", "Directory not found")
        ]
        
        # This is a basic test - actual fix logic would need filesystem mocking
        fixed_count = self.handler._attempt_fixes(project_path, failed_validations)
        
        # Verify it returns a count
        self.assertIsInstance(fixed_count, int)
        self.assertGreaterEqual(fixed_count, 0)


if __name__ == '__main__':
    unittest.main()
