"""
Base handler class providing common functionality for all CLI command handlers.
Defines the interface contract and shared utilities.
"""

import argparse
import json
import logging
import sys
import time
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

from .errors import CLIError, UserError, SystemError, ConfigurationError
from .help import CommandHelp, create_command_help


class BaseHandler(ABC):
    """Abstract base class for all CLI command handlers."""
    
    # Must be defined by subclasses
    command_name: str
    description: str
    aliases: List[str] = []  # Optional command aliases
    
    def __init__(self):
        self.logger = logging.getLogger(f"cli.{self.command_name}")
        self.start_time = time.time()
        self._pre_hooks: List[Callable[[argparse.Namespace], None]] = []
        self._post_hooks: List[Callable[[argparse.Namespace, int], None]] = []
        self._memory_hooks: List[Callable[[argparse.Namespace, int], None]] = []
    
    @abstractmethod
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up command-specific arguments."""
        pass
    
    def get_help(self) -> Optional[CommandHelp]:
        """
        Get enhanced help for this command.
        
        Subclasses can override this to provide examples and notes.
        
        Returns:
            CommandHelp instance or None
        """
        return None
    
    def setup_help(self, parser: argparse.ArgumentParser) -> None:
        """
        Set up enhanced help for the command.
        
        Args:
            parser: Argument parser to configure
        """
        help_obj = self.get_help()
        if help_obj:
            help_obj.setup_parser(parser)
    
    @abstractmethod
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the command and return exit code."""
        pass
    
    def execute_with_hooks(self, args: argparse.Namespace) -> int:
        """
        Execute command with pre and post execution hooks.
        
        Args:
            args: Parsed command-line arguments
            
        Returns:
            Exit code from command execution
        """
        # Run pre-execution hooks
        for hook in self._pre_hooks:
            try:
                hook(args)
            except Exception as e:
                self.logger.warning(f"Pre-execution hook failed: {e}")
        
        # Execute command
        exit_code = self.execute(args)
        
        # Run post-execution hooks
        for hook in self._post_hooks:
            try:
                hook(args, exit_code)
            except Exception as e:
                self.logger.warning(f"Post-execution hook failed: {e}")
        
        # Run memory hooks
        for hook in self._memory_hooks:
            try:
                hook(args, exit_code)
            except Exception as e:
                self.logger.warning(f"Memory hook failed: {e}")
        
        return exit_code
    
    def add_pre_hook(self, hook: Callable[[argparse.Namespace], None]) -> None:
        """
        Add a pre-execution hook.
        
        Args:
            hook: Callable that takes args and returns None
        """
        self._pre_hooks.append(hook)
        self.logger.debug(f"Added pre-execution hook: {hook.__name__}")
    
    def add_post_hook(self, hook: Callable[[argparse.Namespace, int], None]) -> None:
        """
        Add a post-execution hook.
        
        Args:
            hook: Callable that takes args and exit_code, returns None
        """
        self._post_hooks.append(hook)
        self.logger.debug(f"Added post-execution hook: {hook.__name__}")

    def add_memory_hook(self, hook: Callable[[argparse.Namespace, int], None]) -> None:
        """
        Add a memory system hook.
        
        Args:
            hook: Callable that takes args and exit_code, returns None
        """
        self._memory_hooks.append(hook)
        self.logger.debug(f"Added memory hook: {hook.__name__}")
    
    def remove_pre_hook(self, hook: Callable[[argparse.Namespace], None]) -> bool:
        """
        Remove a pre-execution hook.
        
        Args:
            hook: Hook to remove
            
        Returns:
            True if hook was removed, False if not found
        """
        try:
            self._pre_hooks.remove(hook)
            self.logger.debug(f"Removed pre-execution hook: {hook.__name__}")
            return True
        except ValueError:
            return False
    
    def remove_post_hook(self, hook: Callable[[argparse.Namespace, int], None]) -> bool:
        """
        Remove a post-execution hook.
        
        Args:
            hook: Hook to remove
            
        Returns:
            True if hook was removed, False if not found
        """
        try:
            self._post_hooks.remove(hook)
            self.logger.debug(f"Removed post-execution hook: {hook.__name__}")
            return True
        except ValueError:
            return False
    
    # Common utility methods
    
    def load_project(self, project_path: str) -> Dict[str, Any]:
        """Load and validate project configuration."""
        project_dir = Path(project_path)
        project_file = project_dir / "project.json"
        
        if not project_dir.exists():
            raise UserError(
                f"Project directory not found: {project_dir}",
                "Check the project path or create a new project with 'storycore init'"
            )
        
        if not project_file.exists():
            raise UserError(
                f"Project file not found: {project_file}",
                "Initialize the project with 'storycore init' or check the project structure"
            )
        
        try:
            with open(project_file, 'r', encoding='utf-8') as f:
                project_data = json.load(f)
            
            # Basic validation
            if not isinstance(project_data, dict):
                raise ConfigurationError("Project file must contain a JSON object")
            
            if "project_name" not in project_data:
                raise ConfigurationError("Project file missing required 'project_name' field")
            
            self.logger.info(f"Loaded project: {project_data.get('project_name')}")
            return project_data
            
        except json.JSONDecodeError as e:
            raise ConfigurationError(
                f"Invalid JSON in project file: {e}",
                "Check the project.json file for syntax errors"
            )
        except Exception as e:
            raise SystemError(f"Failed to load project: {e}")
    
    def validate_project(self, project_path: str) -> bool:
        """Validate project structure and return True if valid."""
        try:
            self.load_project(project_path)
            return True
        except CLIError:
            return False
    
    def ensure_project_directories(self, project_path: str) -> None:
        """Ensure required project directories exist."""
        project_dir = Path(project_path)
        
        # Standard StoryCore-Engine directories
        directories = [
            "assets/images",
            "assets/audio", 
            "exports",
            "panels",
            "promoted",
            "refined"
        ]
        
        for dir_path in directories:
            full_path = project_dir / dir_path
            full_path.mkdir(parents=True, exist_ok=True)
            self.logger.debug(f"Ensured directory exists: {full_path}")
    
    def handle_error(self, error: Exception, context: str) -> int:
        """Handle error and return appropriate exit code."""
        from .errors import ErrorHandler
        
        error_handler = ErrorHandler(self.logger)
        return error_handler.handle_exception(error, context)
    
    def print_success(self, message: str) -> None:
        """Print success message with consistent formatting."""
        print(f"[SUCCESS] {message}")
        self.logger.info(message)
    
    def print_error(self, message: str) -> None:
        """Print error message with consistent formatting."""
        print(f"[ERROR] {message}", file=sys.stderr)
        self.logger.error(message)
    
    def print_warning(self, message: str) -> None:
        """Print warning message with consistent formatting."""
        print(f"[WARN] {message}")
        self.logger.warning(message)
    
    def print_info(self, message: str) -> None:
        """Print info message with consistent formatting."""
        print(f"[INFO] {message}")
        self.logger.info(message)
    
    def get_execution_time(self) -> float:
        """Get execution time since handler creation."""
        return time.time() - self.start_time
    
    def log_command_execution(self, args: argparse.Namespace, success: bool) -> None:
        """Log command execution with timing and status."""
        duration = self.get_execution_time()
        
        self.logger.info(
            "Command executed",
            extra={
                "command": self.command_name,
                "arguments": vars(args),  # Changed from 'args' to 'arguments'
                "duration": duration,
                "success": success
            }
        )
        
        if success:
            self.logger.debug(f"Command '{self.command_name}' completed in {duration:.2f}s")
        else:
            self.logger.error(f"Command '{self.command_name}' failed after {duration:.2f}s")