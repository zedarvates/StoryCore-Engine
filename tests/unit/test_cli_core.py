"""
Unit tests for CLI Core orchestration.
Tests argument parsing, command dispatch, and error handling integration.
"""

import argparse
import logging
import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.core import CLICore
from cli.errors import UserError, SystemError, ConfigurationError
from cli.base import BaseHandler


class MockHandler(BaseHandler):
    """Mock handler for testing."""
    command_name = "test"
    description = "Test command"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument("--test-arg", help="Test argument")
    
    def execute(self, args: argparse.Namespace) -> int:
        return 0


class FailingHandler(BaseHandler):
    """Handler that raises errors for testing."""
    command_name = "fail"
    description = "Failing command"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        pass
    
    def execute(self, args: argparse.Namespace) -> int:
        raise UserError("Test error", "Test suggestion")


class TestCLICore:
    """Test cases for CLICore class."""
    
    def test_initialization(self):
        """Test CLI core initialization."""
        cli = CLICore()
        
        assert cli.logger is not None
        assert cli.error_handler is not None
        assert cli.registry is None
        assert cli.parser is None
    
    def test_setup_parser(self):
        """Test argument parser setup with global options."""
        cli = CLICore()
        parser = cli.setup_parser()
        
        assert parser is not None
        assert cli.parser is parser
        
        # Test global options
        args = parser.parse_args(["--verbose"])
        assert args.verbose is True
        
        args = parser.parse_args(["--quiet"])
        assert args.quiet is True
        
        args = parser.parse_args(["--log-level", "DEBUG"])
        assert args.log_level == "DEBUG"
    
    def test_setup_logging_verbose(self):
        """Test logging setup with verbose flag."""
        cli = CLICore()
        parser = cli.setup_parser()
        args = parser.parse_args(["--verbose"])
        
        # Should not raise an exception
        cli.setup_logging(args)
        
        # Verify logging is configured
        assert logging.getLogger().handlers  # Has handlers configured
    
    def test_setup_logging_quiet(self):
        """Test logging setup with quiet flag."""
        cli = CLICore()
        parser = cli.setup_parser()
        args = parser.parse_args(["--quiet"])
        
        # Should not raise an exception
        cli.setup_logging(args)
        
        # Verify logging is configured
        assert logging.getLogger().handlers  # Has handlers configured
    
    def test_setup_logging_custom_level(self):
        """Test logging setup with custom log level."""
        cli = CLICore()
        parser = cli.setup_parser()
        args = parser.parse_args(["--log-level", "WARNING"])
        
        cli.setup_logging(args)
        
        # Verify logging is configured
        assert logging.getLogger().level == logging.WARNING
    
    @patch('cli.registry.CommandRegistry.discover_handlers')
    @patch('cli.registry.CommandRegistry.validate_handlers')
    def test_register_handlers(self, mock_validate, mock_discover):
        """Test handler registration."""
        mock_discover.return_value = [MockHandler]
        mock_validate.return_value = True
        
        # Test with eager loading (lazy_load=False)
        cli = CLICore(lazy_load=False)
        cli.setup_parser()
        cli.register_handlers()
        
        assert cli.registry is not None
        assert mock_discover.called
        assert mock_validate.called
    
    @patch('cli.registry.CommandRegistry.discover_handlers')
    @patch('cli.registry.CommandRegistry.validate_handlers')
    def test_register_handlers_validation_failure(self, mock_validate, mock_discover):
        """Test handler registration with validation failure."""
        mock_discover.return_value = [MockHandler]
        mock_validate.return_value = False
        
        # Test with eager loading (lazy_load=False)
        cli = CLICore(lazy_load=False)
        cli.setup_parser()
        
        with pytest.raises(SystemError):
            cli.register_handlers()
    
    @patch('cli.registry.CommandRegistry.discover_handlers')
    @patch('cli.registry.CommandRegistry.validate_handlers')
    @patch('cli.registry.CommandRegistry.get_handler')
    def test_execute_command_success(self, mock_get_handler, mock_validate, mock_discover):
        """Test successful command execution."""
        mock_discover.return_value = [MockHandler]
        mock_validate.return_value = True
        
        mock_handler = MockHandler()
        mock_get_handler.return_value = mock_handler
        
        cli = CLICore()
        cli.setup_parser()
        cli.register_handlers()
        
        args = argparse.Namespace(command="test", verbose=False, quiet=False, log_level="INFO")
        exit_code = cli.execute_command(args)
        
        assert exit_code == 0
    
    @patch('cli.registry.CommandRegistry.discover_handlers')
    @patch('cli.registry.CommandRegistry.validate_handlers')
    def test_execute_command_no_command(self, mock_validate, mock_discover):
        """Test execution with no command specified."""
        mock_discover.return_value = [MockHandler]
        mock_validate.return_value = True
        
        cli = CLICore()
        cli.setup_parser()
        cli.register_handlers()
        
        args = argparse.Namespace(command=None, verbose=False, quiet=False, log_level="INFO")
        exit_code = cli.execute_command(args)
        
        assert exit_code == 1
    
    @patch('cli.registry.CommandRegistry.discover_handlers')
    @patch('cli.registry.CommandRegistry.validate_handlers')
    @patch('cli.registry.CommandRegistry.get_handler')
    @patch('cli.registry.CommandRegistry.list_commands')
    def test_execute_command_unknown(self, mock_list, mock_get_handler, mock_validate, mock_discover):
        """Test execution with unknown command raises UserError."""
        mock_discover.return_value = [MockHandler]
        mock_validate.return_value = True
        mock_get_handler.return_value = None
        mock_list.return_value = ["test"]
        
        cli = CLICore()
        parser = cli.setup_parser()
        cli.register_handlers()
        
        # Create args with proper logging setup
        args = argparse.Namespace(command="unknown", verbose=False, quiet=False, log_level="INFO")
        cli.setup_logging(args)
        
        # execute_command should raise UserError for unknown command
        with pytest.raises(UserError) as exc_info:
            cli.execute_command(args)
        
        assert "Unknown command" in str(exc_info.value)
    
    @patch('cli.registry.CommandRegistry.discover_handlers')
    @patch('cli.registry.CommandRegistry.validate_handlers')
    @patch('cli.registry.CommandRegistry.get_handler')
    def test_execute_command_with_error(self, mock_get_handler, mock_validate, mock_discover):
        """Test command execution with error."""
        mock_discover.return_value = [FailingHandler]
        mock_validate.return_value = True
        
        mock_handler = FailingHandler()
        mock_get_handler.return_value = mock_handler
        
        cli = CLICore()
        cli.setup_parser()
        cli.register_handlers()
        
        args = argparse.Namespace(command="fail", verbose=False, quiet=False, log_level="INFO")
        exit_code = cli.execute_command(args)
        
        assert exit_code == 1  # UserError exit code
    
    @patch('cli.registry.CommandRegistry.discover_handlers')
    @patch('cli.registry.CommandRegistry.validate_handlers')
    def test_run_full_workflow(self, mock_validate, mock_discover):
        """Test complete run workflow."""
        mock_discover.return_value = [MockHandler]
        mock_validate.return_value = True
        
        cli = CLICore()
        
        # Test with help flag (should exit with SystemExit)
        with pytest.raises(SystemExit) as exc_info:
            cli.run(["--help"])
        
        # Help should exit with 0
        assert exc_info.value.code == 0
    
    @patch('cli.registry.CommandRegistry.discover_handlers')
    @patch('cli.registry.CommandRegistry.validate_handlers')
    @patch('cli.registry.CommandRegistry.get_handler')
    def test_run_keyboard_interrupt(self, mock_get_handler, mock_validate, mock_discover):
        """Test handling of keyboard interrupt."""
        mock_discover.return_value = [MockHandler]
        mock_validate.return_value = True
        mock_handler = MockHandler()
        mock_get_handler.return_value = mock_handler
        
        # Test with eager loading to avoid lazy loading issues
        cli = CLICore(lazy_load=False)
        
        with patch.object(cli, 'execute_command', side_effect=KeyboardInterrupt()):
            exit_code = cli.run(["test"])
            assert exit_code == 130  # SIGINT exit code
    
    @patch('cli.registry.CommandRegistry.discover_handlers')
    def test_run_initialization_error(self, mock_discover):
        """Test handling of initialization errors."""
        mock_discover.side_effect = Exception("Test error")
        
        cli = CLICore()
        exit_code = cli.run([])
        
        assert exit_code == 2  # System error exit code


class TestCLICoreIntegration:
    """Integration tests for CLI core with real components."""
    
    def test_parser_subcommands(self):
        """Test that parser correctly handles subcommands."""
        cli = CLICore()
        parser = cli.setup_parser()
        
        # Parser should be set up
        assert parser is not None
        assert hasattr(parser, 'parse_args')
    
    def test_logging_configuration(self):
        """Test logging configuration with different levels."""
        cli = CLICore()
        parser = cli.setup_parser()
        
        # Test each log level - just verify it doesn't raise an exception
        for level in ["DEBUG", "INFO", "WARNING", "ERROR"]:
            args = parser.parse_args(["--log-level", level])
            cli.setup_logging(args)
            
            # Verify logging is configured
            assert logging.getLogger().handlers  # Has handlers configured
    
    def test_error_handler_integration(self):
        """Test error handler integration with CLI core."""
        cli = CLICore()
        
        assert cli.error_handler is not None
        assert hasattr(cli.error_handler, 'handle_exception')
        
        # Test error handling
        test_error = UserError("Test error")
        exit_code = cli.error_handler.handle_exception(test_error, "test")
        assert exit_code == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
