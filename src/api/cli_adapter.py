"""
CLI Handler Adapter

This module provides an adapter layer that wraps existing CLI handlers
and makes them accessible through the API layer. It handles parameter
conversion, result conversion, and error mapping.
"""

import argparse
import io
import sys
import logging
from typing import Any, Dict, Optional, Type
from pathlib import Path

from .models import APIResponse, ErrorDetails, ErrorCodes, ResponseMetadata, RequestContext
from .error_handler import ErrorHandler
from datetime import datetime


logger = logging.getLogger(__name__)


class CLIHandlerAdapter:
    """
    Adapter that wraps CLI handlers for use in the API layer.
    
    Provides:
    - Parameter conversion (API params → CLI args)
    - Result conversion (CLI output → API response)
    - Error handling and conversion
    - Output capture
    """
    
    def __init__(self, handler_class: Type, api_version: str = "v1"):
        """
        Initialize the adapter.
        
        Args:
            handler_class: CLI handler class to wrap
            api_version: API version string
        """
        self.handler_class = handler_class
        self.api_version = api_version
        self.error_handler = ErrorHandler(debug_mode=False)
        self.logger = logging.getLogger(f"{self.__class__.__name__}.{handler_class.command_name}")
    
    def execute(
        self,
        params: Dict[str, Any],
        context: RequestContext,
    ) -> APIResponse:
        """
        Execute the CLI handler with API parameters.
        
        Args:
            params: API request parameters
            context: Request context
            
        Returns:
            API response
        """
        try:
            # Convert API params to CLI args
            args = self._params_to_args(params)
            
            # Create handler instance
            handler = self.handler_class()
            
            # Capture output
            output_capture = io.StringIO()
            error_capture = io.StringIO()
            
            original_stdout = sys.stdout
            original_stderr = sys.stderr
            
            try:
                # Redirect output
                sys.stdout = output_capture
                sys.stderr = error_capture
                
                # Execute handler
                exit_code = handler.execute(args)
                
            finally:
                # Restore output
                sys.stdout = original_stdout
                sys.stderr = original_stderr
            
            # Get captured output
            stdout_text = output_capture.getvalue()
            stderr_text = error_capture.getvalue()
            
            # Convert result to API response
            return self._result_to_response(
                exit_code=exit_code,
                stdout=stdout_text,
                stderr=stderr_text,
                handler=handler,
                context=context,
            )
            
        except Exception as e:
            # Handle any exceptions during execution
            self.logger.error(f"CLI handler execution failed: {e}", exc_info=True)
            return self.error_handler.handle_exception(e, context, self.api_version)
    
    def _params_to_args(self, params: Dict[str, Any]) -> argparse.Namespace:
        """
        Convert API parameters to CLI arguments.
        
        Args:
            params: API request parameters
            
        Returns:
            Namespace object with CLI arguments
        """
        # Create namespace with default values
        args_dict = {}
        
        # Map common parameter names
        param_mapping = {
            "project_name": "project_name",
            "project_path": "project",
            "project": "project",
            "path": "path",
            "output": "out",
            "output_path": "out",
            "scale": "scale",
            "method": "method",
            "grid": "grid",
            "cell_size": "cell_size",
            "interactive": "interactive",
        }
        
        # Convert parameters
        for api_param, cli_param in param_mapping.items():
            if api_param in params:
                args_dict[cli_param] = params[api_param]
        
        # Add any additional parameters not in the mapping
        for key, value in params.items():
            if key not in param_mapping:
                # Convert camelCase to snake_case
                cli_key = self._camel_to_snake(key)
                args_dict[cli_key] = value
        
        # Set defaults for common parameters if not provided
        if "project" not in args_dict:
            args_dict["project"] = "."
        
        # Set default for 'out' parameter (used by grid and other commands)
        if "out" not in args_dict:
            args_dict["out"] = None
        
        return argparse.Namespace(**args_dict)
    
    def _result_to_response(
        self,
        exit_code: int,
        stdout: str,
        stderr: str,
        handler: Any,
        context: RequestContext,
    ) -> APIResponse:
        """
        Convert CLI handler result to API response.
        
        Args:
            exit_code: CLI handler exit code
            stdout: Captured stdout
            stderr: Captured stderr
            handler: CLI handler instance
            context: Request context
            
        Returns:
            API response
        """
        metadata = ResponseMetadata(
            request_id=context.request_id,
            timestamp=datetime.now(),
            duration_ms=context.get_duration_ms(),
            api_version=self.api_version,
        )
        
        # Success case
        if exit_code == 0:
            # Try to extract structured data from handler
            result_data = self._extract_result_data(handler, stdout)
            
            return APIResponse(
                status="success",
                data={
                    "exit_code": exit_code,
                    "output": stdout.strip() if stdout else None,
                    "command": handler.command_name,
                    **result_data,
                },
                metadata=metadata,
            )
        
        # Error case
        else:
            error = self._create_error_from_cli_failure(
                exit_code=exit_code,
                stderr=stderr,
                handler=handler,
            )
            
            return APIResponse(
                status="error",
                error=error,
                metadata=metadata,
            )
    
    def _extract_result_data(self, handler: Any, stdout: str) -> Dict[str, Any]:
        """
        Extract structured data from CLI handler result.
        
        Args:
            handler: CLI handler instance
            stdout: Captured stdout
            
        Returns:
            Dictionary with extracted data
        """
        result = {}
        
        # Try to get execution time
        if hasattr(handler, "get_execution_time"):
            try:
                result["execution_time"] = handler.get_execution_time()
            except Exception:
                pass
        
        # Try to extract project information
        if hasattr(handler, "command_name"):
            command = handler.command_name
            
            # For init command, try to extract project name
            if command == "init" and "Project" in stdout and "initialized" in stdout:
                # Parse project name from output
                lines = stdout.split("\n")
                for line in lines:
                    if "Project" in line and "initialized" in line:
                        # Extract project name (simple heuristic)
                        parts = line.split("'")
                        if len(parts) >= 2:
                            result["project_name"] = parts[1]
                        break
            
            # For grid command, try to extract grid info
            elif command == "grid" and "Grid generated" in stdout:
                result["grid_generated"] = True
                # Try to extract panel count
                if "Panels:" in stdout:
                    for line in stdout.split("\n"):
                        if "Panels:" in line:
                            result["panels_info"] = line.split("Panels:")[1].strip()
                            break
            
            # For promote command, try to extract promotion info
            elif command == "promote" and "Promoted" in stdout:
                result["promotion_complete"] = True
                # Try to extract panel count
                if "panels" in stdout:
                    for line in stdout.split("\n"):
                        if "Promoted" in line and "panels" in line:
                            # Extract number
                            words = line.split()
                            for i, word in enumerate(words):
                                if word == "Promoted" and i + 1 < len(words):
                                    try:
                                        result["panels_promoted"] = int(words[i + 1])
                                    except ValueError:
                                        pass
                                    break
                            break
            
            # For qa command, try to extract QA results
            elif command == "qa" and ("passed" in stdout.lower() or "failed" in stdout.lower()):
                result["qa_complete"] = True
                result["qa_passed"] = "passed" in stdout.lower()
            
            # For export command, try to extract export info
            elif command == "export" and "Export" in stdout:
                result["export_complete"] = True
                # Try to extract export path
                for line in stdout.split("\n"):
                    if "Location:" in line or "Package:" in line:
                        result["export_path"] = line.split(":", 1)[1].strip()
                        break
        
        return result
    
    def _create_error_from_cli_failure(
        self,
        exit_code: int,
        stderr: str,
        handler: Any,
    ) -> ErrorDetails:
        """
        Create error details from CLI handler failure.
        
        Args:
            exit_code: CLI handler exit code
            stderr: Captured stderr
            handler: CLI handler instance
            
        Returns:
            Error details
        """
        # Parse error message from stderr
        error_message = stderr.strip() if stderr else f"Command failed with exit code {exit_code}"
        
        # Try to extract error type from stderr
        error_code = ErrorCodes.INTERNAL_ERROR
        remediation = None
        
        if "not found" in error_message.lower():
            error_code = ErrorCodes.NOT_FOUND
            remediation = "Check that the resource exists and the path is correct"
        elif "permission" in error_message.lower() or "denied" in error_message.lower():
            error_code = ErrorCodes.AUTHORIZATION_DENIED
            remediation = "Check file permissions and access rights"
        elif "invalid" in error_message.lower() or "validation" in error_message.lower():
            error_code = ErrorCodes.VALIDATION_ERROR
            remediation = "Check that all parameters are valid and properly formatted"
        elif "timeout" in error_message.lower():
            error_code = ErrorCodes.TIMEOUT
            remediation = "Try again or increase timeout settings"
        elif "unavailable" in error_message.lower() or "connection" in error_message.lower():
            error_code = ErrorCodes.SERVICE_UNAVAILABLE
            remediation = "Check that required services are running and accessible"
        
        return ErrorDetails(
            code=error_code,
            message=error_message,
            details={
                "exit_code": exit_code,
                "command": handler.command_name if hasattr(handler, "command_name") else "unknown",
            },
            remediation=remediation,
        )
    
    @staticmethod
    def _camel_to_snake(name: str) -> str:
        """
        Convert camelCase to snake_case.
        
        Args:
            name: camelCase string
            
        Returns:
            snake_case string
        """
        result = []
        for i, char in enumerate(name):
            if char.isupper() and i > 0:
                result.append('_')
            result.append(char.lower())
        return ''.join(result)


class CLIAdapterRegistry:
    """
    Registry for CLI handler adapters.
    
    Provides a central place to register and retrieve CLI adapters
    for different commands.
    """
    
    def __init__(self, api_version: str = "v1"):
        """
        Initialize the registry.
        
        Args:
            api_version: API version string
        """
        self.api_version = api_version
        self.adapters: Dict[str, CLIHandlerAdapter] = {}
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def register(self, command_name: str, handler_class: Type) -> None:
        """
        Register a CLI handler adapter.
        
        Args:
            command_name: Command name (e.g., "init", "grid")
            handler_class: CLI handler class
        """
        adapter = CLIHandlerAdapter(handler_class, self.api_version)
        self.adapters[command_name] = adapter
        self.logger.info(f"Registered CLI adapter for command: {command_name}")
    
    def get(self, command_name: str) -> Optional[CLIHandlerAdapter]:
        """
        Get a CLI handler adapter.
        
        Args:
            command_name: Command name
            
        Returns:
            CLI handler adapter or None if not found
        """
        return self.adapters.get(command_name)
    
    def list_commands(self) -> list[str]:
        """
        List all registered commands.
        
        Returns:
            List of command names
        """
        return list(self.adapters.keys())
    
    def register_all_handlers(self) -> None:
        """
        Register all available CLI handlers.
        
        This method discovers and registers all CLI handlers from the
        src/cli/handlers directory.
        """
        try:
            # Import handler classes
            from cli.handlers.init import InitHandler
            from cli.handlers.grid import GridHandler
            from cli.handlers.promote import PromoteHandler
            from cli.handlers.qa import QAHandler
            from cli.handlers.export import ExportHandler
            from cli.handlers.narrative import NarrativeHandler
            from cli.handlers.script import ScriptHandler
            from cli.handlers.scene_breakdown import SceneBreakdownHandler
            from cli.handlers.world_generate import WorldGenerateHandler
            from cli.handlers.character_wizard import CharacterWizardHandler
            
            # Register handlers
            self.register("init", InitHandler)
            self.register("grid", GridHandler)
            self.register("promote", PromoteHandler)
            self.register("qa", QAHandler)
            self.register("export", ExportHandler)
            self.register("narrative", NarrativeHandler)
            self.register("script", ScriptHandler)
            self.register("scene_breakdown", SceneBreakdownHandler)
            self.register("world_generate", WorldGenerateHandler)
            self.register("character_wizard", CharacterWizardHandler)
            
            self.logger.info(f"Registered {len(self.adapters)} CLI handler adapters")
            
        except ImportError as e:
            self.logger.warning(f"Failed to import some CLI handlers: {e}")
