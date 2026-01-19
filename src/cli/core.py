"""
CLI Core - Central orchestration of CLI functionality.
Handles argument parsing, command dispatch, and error handling.
"""

import argparse
import logging
import sys
import time
from pathlib import Path
from typing import List, Optional

from .errors import ErrorHandler, SystemError, UserError
from .plugins import PluginLoader
from .registry import CommandRegistry


class CLICore:
    """Central CLI orchestration with command dispatch and error handling."""
    
    def __init__(self, lazy_load: bool = True):
        self.logger = logging.getLogger("cli.core")
        self.error_handler = ErrorHandler(self.logger)
        self.registry: Optional[CommandRegistry] = None
        self.parser: Optional[argparse.ArgumentParser] = None
        self.lazy_load = lazy_load
        self.plugin_loader = PluginLoader()
    
    def setup_parser(self) -> argparse.ArgumentParser:
        """Set up the main argument parser with global options."""
        parser = argparse.ArgumentParser(
            description="StoryCore-Engine CLI - Modular Architecture",
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
Examples:
  storycore init my-project          # Initialize new project
  storycore validate                 # Validate current directory
  storycore grid                     # Generate 3x3 grid
  storycore promote                  # Upscale panels
  storycore qa                       # Run QA scoring
  storycore export                   # Export project
  
For command-specific help:
  storycore <command> --help
            """
        )
        
        # Global options
        parser.add_argument(
            "--verbose", "-v",
            action="store_true",
            help="Enable verbose logging"
        )
        
        parser.add_argument(
            "--quiet", "-q", 
            action="store_true",
            help="Suppress non-error output"
        )
        
        parser.add_argument(
            "--log-level",
            choices=["DEBUG", "INFO", "WARNING", "ERROR"],
            default="INFO",
            help="Set logging level (default: INFO)"
        )
        
        self.parser = parser
        return parser
    
    def setup_logging(self, args: argparse.Namespace) -> None:
        """Configure logging based on command line arguments."""
        # Determine log level
        if args.verbose:
            log_level = logging.DEBUG
        elif args.quiet:
            log_level = logging.ERROR
        else:
            log_level = getattr(logging, args.log_level)
        
        # Configure logging
        logging.basicConfig(
            level=log_level,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # Suppress verbose third-party logging unless in debug mode
        if log_level > logging.DEBUG:
            logging.getLogger("urllib3").setLevel(logging.WARNING)
            logging.getLogger("requests").setLevel(logging.WARNING)
    
    def register_handlers(self) -> None:
        """Discover and register all command handlers."""
        if not self.parser:
            raise SystemError("Parser not initialized - call setup_parser() first")
        
        self.registry = CommandRegistry(self.parser, lazy_load=self.lazy_load)
        self.registry.register_all_handlers()
        
        # Load external plugins if plugin directory exists
        self.load_plugins()
        
        # Validate all handlers (only in eager mode)
        if not self.lazy_load:
            if not self.registry.validate_handlers():
                raise SystemError("Handler validation failed")
        
        if self.lazy_load:
            self.logger.info(f"Discovered {len(self.registry.handler_modules)} commands (lazy mode)")
        else:
            self.logger.info(f"Registered {len(self.registry.list_commands())} commands (eager mode)")
    
    def load_plugins(self, plugin_dir: Optional[str] = None) -> int:
        """
        Load external plugins from a directory.
        
        Args:
            plugin_dir: Path to plugin directory (defaults to .kiro/cli/plugins)
            
        Returns:
            Number of plugins loaded
        """
        if not self.registry:
            self.logger.warning("Cannot load plugins - registry not initialized")
            return 0
        
        # Default plugin directory
        if not plugin_dir:
            plugin_dir = str(Path.cwd() / ".kiro" / "cli" / "plugins")
        
        # Load plugins from directory
        handler_classes = self.plugin_loader.load_plugins_from_directory(plugin_dir)
        
        # Register each plugin handler
        loaded_count = 0
        for handler_class in handler_classes:
            if self.registry.register_external_handler(handler_class):
                loaded_count += 1
        
        if loaded_count > 0:
            self.logger.info(f"Loaded {loaded_count} external plugins")
        
        return loaded_count
    
    def execute_command(self, args: argparse.Namespace) -> int:
        """Execute the specified command and return exit code."""
        if not self.registry:
            raise SystemError("Registry not initialized")
        
        if not args.command:
            self.parser.print_help()
            return 1
        
        # Get handler for command
        handler = self.registry.get_handler(args.command)
        if not handler:
            raise UserError(
                f"Unknown command: {args.command}",
                f"Available commands: {', '.join(self.registry.list_commands())}"
            )
        
        # Execute command with hooks
        start_time = time.time()
        try:
            self.logger.info(f"Executing command: {args.command}")
            
            # Use execute_with_hooks if available, otherwise fall back to execute
            if hasattr(handler, 'execute_with_hooks'):
                exit_code = handler.execute_with_hooks(args)
            else:
                exit_code = handler.execute(args)
            
            # Log successful execution
            duration = time.time() - start_time
            handler.log_command_execution(args, success=True)
            
            if not args.quiet:
                self.logger.debug(f"Command completed in {duration:.2f}s")
            
            return exit_code
            
        except Exception as e:
            # Log failed execution
            duration = time.time() - start_time
            handler.log_command_execution(args, success=False)
            
            # Handle error
            return self.error_handler.handle_exception(e, f"command '{args.command}'")
    
    def run(self, argv: Optional[List[str]] = None) -> int:
        """Main entry point - parse arguments and execute command."""
        try:
            # Set up parser and registry
            parser = self.setup_parser()
            self.register_handlers()
            
            # Parse arguments
            args = parser.parse_args(argv)
            
            # Set up logging
            self.setup_logging(args)
            
            # Execute command
            return self.execute_command(args)
            
        except KeyboardInterrupt:
            print("\n✗ Operation cancelled by user", file=sys.stderr)
            return 130  # Standard exit code for SIGINT
            
        except Exception as e:
            # Handle unexpected errors in core setup
            return self.error_handler.handle_exception(e, "CLI initialization")