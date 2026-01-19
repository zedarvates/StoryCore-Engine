"""
Unit tests for CompletionHandler.
"""

import argparse
import pytest
from pathlib import Path
from unittest.mock import Mock, patch

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.handlers.completion import CompletionHandler


class TestCompletionHandler:
    """Test suite for CompletionHandler."""
    
    def test_handler_attributes(self):
        """Test that handler has required attributes."""
        handler = CompletionHandler()
        assert handler.command_name == "completion"
        assert handler.description == "Generate shell completion scripts"
    
    def test_setup_parser(self):
        """Test parser setup with correct arguments."""
        handler = CompletionHandler()
        parser = argparse.ArgumentParser()
        handler.setup_parser(parser)
        
        # Parse test arguments - shell is required positional argument
        args = parser.parse_args(["bash"])
        assert args.shell == "bash"
        assert args.commands is None
    
    def test_execute_bash_completion(self):
        """Test bash completion generation."""
        handler = CompletionHandler()
        args = argparse.Namespace(shell="bash", commands=None)
        
        exit_code = handler.execute(args)
        assert exit_code == 0
    
    def test_execute_zsh_completion(self):
        """Test zsh completion generation."""
        handler = CompletionHandler()
        args = argparse.Namespace(shell="zsh", commands=None)
        
        exit_code = handler.execute(args)
        assert exit_code == 0
    
    def test_execute_fish_completion(self):
        """Test fish completion generation."""
        handler = CompletionHandler()
        args = argparse.Namespace(shell="fish", commands=None)
        
        exit_code = handler.execute(args)
        assert exit_code == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
