"""
Unit tests for HelpHandler.
"""

import argparse
import pytest
from pathlib import Path
from unittest.mock import Mock, patch

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.handlers.help import HelpHandler


class TestHelpHandler:
    """Test suite for HelpHandler."""
    
    def test_handler_attributes(self):
        """Test that handler has required attributes."""
        handler = HelpHandler()
        assert handler.command_name == "help"
        assert handler.description == "Display help and documentation for commands"
    
    def test_setup_parser(self):
        """Test parser setup with correct arguments."""
        handler = HelpHandler()
        parser = argparse.ArgumentParser()
        handler.setup_parser(parser)
        
        # Parse test arguments with defaults
        args = parser.parse_args([])
        assert args.command is None
        
        # Parse with command argument
        args = parser.parse_args(["grid"])
        assert args.command == "grid"
    
    def test_execute_general_help(self):
        """Test execution with no specific command."""
        handler = HelpHandler()
        args = argparse.Namespace(
            command=None,
            quick=False,
            list=False
        )
        
        exit_code = handler.execute(args)
        assert exit_code == 0
    
    def test_execute_command_help(self):
        """Test execution with specific command."""
        handler = HelpHandler()
        args = argparse.Namespace(
            command="grid",
            quick=False,
            list=False
        )
        
        exit_code = handler.execute(args)
        assert exit_code == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
