"""
Diagnostic Collector Module

Collects system information, module state, logs, and other diagnostic data
for the Feedback & Diagnostics system.
"""

import sys
import platform
import locale
from typing import Dict, Any, Optional
from datetime import datetime
from pathlib import Path
from feedback_error_logger import log_diagnostic_error, log_error


class DiagnosticCollector:
    """Collects diagnostic information for bug reports and feedback submissions."""
    
    def __init__(self):
        """Initialize the diagnostic collector."""
        self.storycore_version = self._get_storycore_version()
    
    def _get_storycore_version(self) -> str:
        """
        Get StoryCore version from package metadata or version file.
        
        Returns:
            str: StoryCore version string
        """
        try:
            # Try to import from package metadata
            try:
                from importlib.metadata import version
                return version("storycore-engine")
            except Exception:
                pass
            
            # Try to read from setup.py
            setup_file = Path(__file__).parent.parent / "setup.py"
            if setup_file.exists():
                with open(setup_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        if 'version=' in line and '"' in line:
                            # Extract version from setup.py
                            version_str = line.split('version=')[1].split('"')[1]
                            return version_str
            
            # Try to read from pyproject.toml
            pyproject_file = Path(__file__).parent.parent / "pyproject.toml"
            if pyproject_file.exists():
                with open(pyproject_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        if line.startswith('version ='):
                            # Extract version from pyproject.toml
                            version_str = line.split('=')[1].strip().strip('"')
                            return version_str
            
            return "0.1.0"  # Default version
        except Exception as e:
            log_diagnostic_error(
                component="version_detection",
                error=e,
                context={"fallback": "unknown"}
            )
            return "unknown"
    
    def collect_system_info(self) -> Dict[str, Any]:
        """
        Gather system information including OS, Python version, and StoryCore version.
        
        Requirements: 3.1, 8.3
        
        Returns:
            Dict containing system information:
            - storycore_version: StoryCore version string
            - python_version: Python version string (e.g., "3.9.7")
            - os_platform: OS platform (Windows, Linux, Darwin)
            - os_version: OS version string
            - language: System language setting (e.g., "en_US")
        """
        system_info = {
            "storycore_version": self.storycore_version,
            "python_version": "unknown",
            "os_platform": "unknown",
            "os_version": "unknown",
            "language": "en_US"
        }
        
        try:
            # Get Python version
            try:
                system_info["python_version"] = sys.version.split()[0]
            except Exception as e:
                log_diagnostic_error(
                    component="python_version",
                    error=e,
                    context={"fallback": "unknown"}
                )
            
            # Get OS platform
            try:
                system_info["os_platform"] = platform.system()
            except Exception as e:
                log_diagnostic_error(
                    component="os_platform",
                    error=e,
                    context={"fallback": "unknown"}
                )
            
            # Get OS version
            try:
                system_info["os_version"] = platform.version()
            except Exception as e:
                log_diagnostic_error(
                    component="os_version",
                    error=e,
                    context={"fallback": "unknown"}
                )
            
            # Get system language
            try:
                lang, encoding = locale.getdefaultlocale()
                system_info["language"] = lang if lang else "en_US"
            except Exception as e:
                log_diagnostic_error(
                    component="language",
                    error=e,
                    context={"fallback": "en_US"}
                )
        
        except Exception as e:
            # Catch-all for unexpected errors
            log_diagnostic_error(
                component="system_info",
                error=e,
                context={"partial_info": system_info}
            )
        
        return system_info
    
    def collect_module_state(self, module_name: str) -> Dict[str, Any]:
        """
        Capture active module context and current state.
        
        Requirements: 3.1, 8.3
        
        Args:
            module_name: Name of the active module (e.g., "grid-generator", "promotion-engine")
            
        Returns:
            Dict containing module context:
            - active_module: Module name
            - module_state: Module-specific state information
        """
        module_context = {
            "active_module": module_name or "unknown",
            "module_state": {}
        }
        
        # Try to import and get state from the module if it exists
        try:
            # Check if module is importable
            if module_name and module_name != "unknown":
                # Convert module name to Python module path
                # e.g., "grid-generator" -> "grid_generator"
                module_path = module_name.replace("-", "_")
                
                # Try to get module configuration if available
                try:
                    module = sys.modules.get(f"src.{module_path}")
                    if module and hasattr(module, 'get_state'):
                        module_context["module_state"] = module.get_state()
                except Exception as e:
                    log_diagnostic_error(
                        component="module_state_import",
                        error=e,
                        context={"module_name": module_name, "module_path": module_path}
                    )
                
                # Add basic module info
                module_context["module_state"]["module_name"] = module_name
                module_context["module_state"]["timestamp"] = datetime.utcnow().isoformat() + "Z"
        except Exception as e:
            # If module state collection fails, continue with basic info
            log_diagnostic_error(
                component="module_state",
                error=e,
                context={"module_name": module_name}
            )
        
        return module_context
    
    def collect_logs(self, max_lines: int = 500) -> list:
        """
        Retrieve recent application logs.
        
        Requirements: 3.3, 8.3
        
        Reads from StoryCore log file locations and applies anonymization
        before including in the payload. Searches multiple potential log
        locations and returns the most recent log lines.
        
        Args:
            max_lines: Maximum number of log lines to retrieve (default: 500)
            
        Returns:
            List of anonymized log line strings (most recent lines first)
        """
        logs = []
        
        # Define potential log file locations (in order of preference)
        log_locations = [
            Path.home() / ".storycore" / "logs" / "storycore.log",
            Path.home() / ".storycore" / "logs" / "application.log",
            Path("logs") / "production.log",
            Path("logs") / "storycore.log",
            Path("logs") / "application.log",
        ]
        
        # Try to find and read from the first available log file
        for log_path in log_locations:
            try:
                if log_path.exists() and log_path.is_file():
                    # Read the log file
                    with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
                        # Read all lines
                        all_lines = f.readlines()
                        
                        # Get the last N lines
                        recent_lines = all_lines[-max_lines:] if len(all_lines) > max_lines else all_lines
                        
                        # Strip newlines and filter empty lines
                        logs = [line.rstrip('\n\r') for line in recent_lines if line.strip()]
                        
                        # Found logs, break out of loop
                        break
            except (IOError, OSError, PermissionError) as e:
                # If we can't read this log file, try the next one
                log_diagnostic_error(
                    component="logs",
                    error=e,
                    context={"log_path": str(log_path), "trying_next": True}
                )
                continue
            except Exception as e:
                # Unexpected error reading log file
                log_diagnostic_error(
                    component="logs",
                    error=e,
                    context={"log_path": str(log_path), "unexpected": True}
                )
                continue
        
        # Apply log anonymization before returning
        if logs:
            try:
                from .log_anonymizer import LogAnonymizer
                anonymizer = LogAnonymizer()
                logs = anonymizer.anonymize_logs(logs)
            except Exception as e:
                # If anonymization fails, return empty list for safety
                # (better to not include logs than to leak sensitive data)
                log_diagnostic_error(
                    component="log_anonymization",
                    error=e,
                    context={"action": "returning_empty_logs_for_safety"}
                )
                return []
        
        return logs
    
    def collect_stacktrace(self) -> Optional[str]:
        """
        Capture current exception stacktrace if available.
        
        Requirements: 3.2, 8.3
        
        Uses the traceback module to format the current exception stacktrace.
        This should be called within an exception handler context to capture
        the active exception information.
        
        Returns:
            Formatted stacktrace string if an exception is active, None otherwise
        """
        import traceback
        
        try:
            # Get the current exception information
            exc_info = sys.exc_info()
            
            # Check if there's an active exception
            if exc_info[0] is not None:
                # Format the exception with full traceback
                try:
                    # Format the full traceback including exception type and message
                    stacktrace_lines = traceback.format_exception(
                        exc_info[0],  # Exception type
                        exc_info[1],  # Exception value
                        exc_info[2]   # Traceback object
                    )
                    
                    # Join all lines into a single string
                    stacktrace = ''.join(stacktrace_lines)
                    
                    return stacktrace
                except Exception as e:
                    # If formatting fails, try to get at least the exception string
                    log_diagnostic_error(
                        component="stacktrace_formatting",
                        error=e,
                        context={"fallback": "exception_string"}
                    )
                    try:
                        return str(exc_info[1])
                    except Exception:
                        return None
            
            return None
        except Exception as e:
            log_diagnostic_error(
                component="stacktrace",
                error=e,
                context={"action": "returning_none"}
            )
            return None
    
    def collect_memory_state(self) -> Dict[str, Any]:
        """
        Gather memory usage and process information.
        
        Requirements: 3.4, 8.3
        
        Uses psutil library to collect current memory usage and active process state.
        Captures both system-wide and process-specific memory information.
        
        Returns:
            Dict containing memory state information:
            - memory_usage_mb: Current process memory usage in MB
            - memory_percent: Percentage of system memory used by process
            - system_memory_total_mb: Total system memory in MB
            - system_memory_available_mb: Available system memory in MB
            - system_memory_percent: System-wide memory usage percentage
            - process_state: Process-specific information (PID, status, threads, etc.)
        """
        try:
            import psutil
            
            # Get current process
            process = psutil.Process()
            
            # Get process memory information
            try:
                memory_info = process.memory_info()
                memory_usage_bytes = memory_info.rss  # Resident Set Size (actual physical memory)
                memory_usage_mb = memory_usage_bytes / (1024 * 1024)
            except Exception as e:
                log_diagnostic_error(
                    component="memory_info",
                    error=e,
                    context={"fallback": 0}
                )
                memory_usage_mb = 0
            
            # Get process memory percentage
            try:
                memory_percent = process.memory_percent()
            except Exception as e:
                log_diagnostic_error(
                    component="memory_percent",
                    error=e,
                    context={"fallback": 0.0}
                )
                memory_percent = 0.0
            
            # Get system-wide memory information
            try:
                system_memory = psutil.virtual_memory()
                system_memory_total_mb = system_memory.total / (1024 * 1024)
                system_memory_available_mb = system_memory.available / (1024 * 1024)
                system_memory_percent = system_memory.percent
            except Exception as e:
                log_diagnostic_error(
                    component="system_memory",
                    error=e,
                    context={"fallback": "zeros"}
                )
                system_memory_total_mb = 0
                system_memory_available_mb = 0
                system_memory_percent = 0.0
            
            # Get process state information
            process_state = {
                "pid": process.pid,
                "status": "unknown",
                "num_threads": 0,
                "cpu_percent": 0.0,
            }
            
            try:
                process_state["status"] = process.status()
            except Exception as e:
                log_diagnostic_error(
                    component="process_status",
                    error=e,
                    context={"fallback": "unknown"}
                )
            
            try:
                process_state["num_threads"] = process.num_threads()
            except Exception as e:
                log_diagnostic_error(
                    component="num_threads",
                    error=e,
                    context={"fallback": 0}
                )
            
            # Try to get CPU usage (may require a short interval)
            try:
                # Get CPU percent with a very short interval (non-blocking)
                cpu_percent = process.cpu_percent(interval=0.0)
                process_state["cpu_percent"] = cpu_percent
            except Exception as e:
                log_diagnostic_error(
                    component="cpu_percent",
                    error=e,
                    context={"fallback": 0.0}
                )
            
            # Try to get additional process information
            try:
                process_state["create_time"] = datetime.fromtimestamp(
                    process.create_time()
                ).isoformat()
            except Exception as e:
                log_diagnostic_error(
                    component="create_time",
                    error=e,
                    context={"skipping": True}
                )
            
            try:
                process_state["num_fds"] = process.num_fds() if hasattr(process, 'num_fds') else None
            except Exception as e:
                log_diagnostic_error(
                    component="num_fds",
                    error=e,
                    context={"fallback": None}
                )
                process_state["num_fds"] = None
            
            # Compile memory state
            memory_state = {
                "memory_usage_mb": round(memory_usage_mb, 2),
                "memory_percent": round(memory_percent, 2),
                "system_memory_total_mb": round(system_memory_total_mb, 2),
                "system_memory_available_mb": round(system_memory_available_mb, 2),
                "system_memory_percent": round(system_memory_percent, 2),
                "process_state": process_state
            }
            
            return memory_state
            
        except ImportError as e:
            # psutil not available - return minimal information
            log_diagnostic_error(
                component="memory",
                error=e,
                context={"reason": "psutil_not_available"}
            )
            return {
                "memory_usage_mb": 0,
                "memory_percent": 0.0,
                "system_memory_total_mb": 0,
                "system_memory_available_mb": 0,
                "system_memory_percent": 0.0,
                "process_state": {
                    "error": "psutil library not available"
                }
            }
        except Exception as e:
            # Error collecting memory state - return error information
            log_diagnostic_error(
                component="memory",
                error=e,
                context={"action": "returning_error_state"}
            )
            return {
                "memory_usage_mb": 0,
                "memory_percent": 0.0,
                "system_memory_total_mb": 0,
                "system_memory_available_mb": 0,
                "system_memory_percent": 0.0,
                "process_state": {
                    "error": f"Failed to collect memory state: {str(e)}"
                }
            }
    
    def validate_screenshot(self, file_path: str) -> tuple[bool, Optional[str]]:
        """
        Validate screenshot file format and size.
        
        Requirements: 3.5, 8.3
        
        Checks that the uploaded file is in an accepted format (PNG, JPG, GIF)
        and does not exceed the maximum size limit (5MB). Returns validation
        result and descriptive error message if validation fails.
        
        Args:
            file_path: Path to the screenshot file to validate
            
        Returns:
            Tuple of (is_valid, error_message):
            - is_valid: True if file passes validation, False otherwise
            - error_message: Descriptive error message if validation fails, None if valid
            
        Examples:
            >>> collector = DiagnosticCollector()
            >>> is_valid, error = collector.validate_screenshot("screenshot.png")
            >>> if not is_valid:
            ...     print(f"Validation failed: {error}")
        """
        # Maximum file size in bytes (5MB)
        MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5MB
        MAX_SIZE_MB = 5
        
        # Accepted file formats (extensions and MIME types)
        ACCEPTED_FORMATS = {
            '.png': ['image/png'],
            '.jpg': ['image/jpeg'],
            '.jpeg': ['image/jpeg'],
            '.gif': ['image/gif']
        }
        
        try:
            # Convert to Path object for easier manipulation
            file_path_obj = Path(file_path)
            
            # Check if file exists
            if not file_path_obj.exists():
                error_msg = f"File not found: {file_path}"
                log_error(
                    error_type="ValidationError",
                    message="Screenshot file not found",
                    context={"file_path": file_path}
                )
                return False, error_msg
            
            # Check if it's a file (not a directory)
            if not file_path_obj.is_file():
                error_msg = f"Path is not a file: {file_path}"
                log_error(
                    error_type="ValidationError",
                    message="Screenshot path is not a file",
                    context={"file_path": file_path}
                )
                return False, error_msg
            
            # Check file extension
            file_extension = file_path_obj.suffix.lower()
            if file_extension not in ACCEPTED_FORMATS:
                accepted_formats_str = ", ".join(sorted(ACCEPTED_FORMATS.keys()))
                error_msg = (
                    f"Invalid file format: {file_extension}. "
                    f"Accepted formats are: {accepted_formats_str}"
                )
                log_error(
                    error_type="ValidationError",
                    message="Invalid screenshot format",
                    context={"file_extension": file_extension, "accepted": accepted_formats_str}
                )
                return False, error_msg
            
            # Check file size
            file_size_bytes = file_path_obj.stat().st_size
            
            # Check if file is empty
            if file_size_bytes == 0:
                error_msg = "File is empty. Please provide a valid screenshot image."
                log_error(
                    error_type="ValidationError",
                    message="Screenshot file is empty",
                    context={"file_path": file_path}
                )
                return False, error_msg
            
            if file_size_bytes > MAX_SIZE_BYTES:
                file_size_mb = file_size_bytes / (1024 * 1024)
                error_msg = (
                    f"File size ({file_size_mb:.2f} MB) exceeds maximum allowed size "
                    f"of {MAX_SIZE_MB} MB"
                )
                log_error(
                    error_type="ValidationError",
                    message="Screenshot file too large",
                    context={"file_size_mb": file_size_mb, "max_size_mb": MAX_SIZE_MB}
                )
                return False, error_msg
            
            # Optional: Verify file content matches extension using magic bytes
            # This provides additional security by checking the actual file content
            try:
                with open(file_path_obj, 'rb') as f:
                    # Read first few bytes to check magic numbers
                    header = f.read(12)
                    
                    # Check magic bytes for common image formats
                    if len(header) >= 8:
                        # PNG: starts with \x89PNG\r\n\x1a\n
                        if header[:8] == b'\x89PNG\r\n\x1a\n':
                            if file_extension not in ['.png']:
                                error_msg = (
                                    f"File content is PNG but extension is {file_extension}. "
                                    f"Please use .png extension."
                                )
                                log_error(
                                    error_type="ValidationError",
                                    message="Screenshot extension mismatch",
                                    context={"actual_format": "PNG", "extension": file_extension}
                                )
                                return False, error_msg
                        # JPEG: starts with \xff\xd8\xff
                        elif header[:3] == b'\xff\xd8\xff':
                            if file_extension not in ['.jpg', '.jpeg']:
                                error_msg = (
                                    f"File content is JPEG but extension is {file_extension}. "
                                    f"Please use .jpg or .jpeg extension."
                                )
                                log_error(
                                    error_type="ValidationError",
                                    message="Screenshot extension mismatch",
                                    context={"actual_format": "JPEG", "extension": file_extension}
                                )
                                return False, error_msg
                        # GIF: starts with GIF87a or GIF89a
                        elif header[:6] in [b'GIF87a', b'GIF89a']:
                            if file_extension not in ['.gif']:
                                error_msg = (
                                    f"File content is GIF but extension is {file_extension}. "
                                    f"Please use .gif extension."
                                )
                                log_error(
                                    error_type="ValidationError",
                                    message="Screenshot extension mismatch",
                                    context={"actual_format": "GIF", "extension": file_extension}
                                )
                                return False, error_msg
                        else:
                            # Unknown or corrupted image format
                            error_msg = (
                                f"File does not appear to be a valid image. "
                                f"Please ensure the file is a valid PNG, JPG, or GIF image."
                            )
                            log_error(
                                error_type="ValidationError",
                                message="Screenshot file corrupted or invalid format",
                                context={"file_path": file_path}
                            )
                            return False, error_msg
            except (IOError, OSError) as e:
                # If we can't read the file for magic byte checking, 
                # still allow it if extension is valid (fail open for compatibility)
                log_diagnostic_error(
                    component="screenshot_magic_bytes",
                    error=e,
                    context={"file_path": file_path, "action": "allowing_based_on_extension"}
                )
            
            # All validations passed
            return True, None
            
        except Exception as e:
            # Unexpected error during validation
            error_msg = f"Error validating screenshot: {str(e)}"
            log_diagnostic_error(
                component="screenshot_validation",
                error=e,
                context={"file_path": file_path}
            )
            return False, error_msg
    
    def encode_screenshot(self, file_path: str) -> Optional[str]:
        """
        Convert screenshot to base64 for inclusion in payload.
        
        Requirements: 3.5, 8.3
        
        Reads the screenshot file and encodes it as a base64 string for
        inclusion in the report payload. Handles encoding errors gracefully
        by returning None and logging the error.
        
        Args:
            file_path: Path to the screenshot file to encode
            
        Returns:
            Base64-encoded string of the screenshot, or None if encoding fails
            
        Examples:
            >>> collector = DiagnosticCollector()
            >>> base64_data = collector.encode_screenshot("screenshot.png")
            >>> if base64_data:
            ...     print(f"Encoded {len(base64_data)} characters")
        """
        import base64
        
        try:
            # Convert to Path object
            file_path_obj = Path(file_path)
            
            # Validate the screenshot first
            is_valid, error_message = self.validate_screenshot(file_path)
            if not is_valid:
                # Log the validation error
                log_error(
                    error_type="ValidationError",
                    message="Screenshot validation failed during encoding",
                    context={"file_path": file_path, "error": error_message}
                )
                return None
            
            # Read the file in binary mode
            try:
                with open(file_path_obj, 'rb') as f:
                    file_data = f.read()
            except (IOError, OSError) as e:
                # File reading error
                log_diagnostic_error(
                    component="screenshot_read",
                    error=e,
                    context={"file_path": file_path}
                )
                return None
            
            # Encode to base64
            try:
                base64_data = base64.b64encode(file_data)
                
                # Convert bytes to string for JSON serialization
                base64_string = base64_data.decode('utf-8')
                
                return base64_string
            except Exception as e:
                # Encoding error
                log_diagnostic_error(
                    component="screenshot_encode",
                    error=e,
                    context={"file_path": file_path}
                )
                return None
            
        except Exception as e:
            # Unexpected encoding error
            log_diagnostic_error(
                component="screenshot",
                error=e,
                context={"file_path": file_path}
            )
            return None
    
    def create_report_payload(
        self,
        report_type: str,
        description: str,
        reproduction_steps: str,
        include_logs: bool,
        screenshot_path: Optional[str] = None,
        module_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Assemble complete report payload.
        
        Requirements: 8.3
        
        Args:
            report_type: Type of report (bug, enhancement, question)
            description: User-provided description
            reproduction_steps: Steps to reproduce the issue
            include_logs: Whether to include logs in the payload
            screenshot_path: Optional path to screenshot file
            module_name: Optional active module name
            
        Returns:
            Complete report payload dictionary
        """
        try:
            # Collect memory state
            memory_state = self.collect_memory_state()
            
            # Encode screenshot if provided
            screenshot_base64 = None
            if screenshot_path:
                try:
                    screenshot_base64 = self.encode_screenshot(screenshot_path)
                except Exception as e:
                    # Log error but continue without screenshot
                    log_diagnostic_error(
                        component="screenshot",
                        error=e,
                        context={"screenshot_path": screenshot_path, "action": "continuing_without_screenshot"}
                    )
            
            # Collect logs if consent given
            logs = []
            if include_logs:
                try:
                    logs = self.collect_logs()
                except Exception as e:
                    # Log error but continue without logs
                    log_diagnostic_error(
                        component="logs",
                        error=e,
                        context={"action": "continuing_without_logs"}
                    )
            
            # Collect stacktrace
            stacktrace = None
            try:
                stacktrace = self.collect_stacktrace()
            except Exception as e:
                # Log error but continue without stacktrace
                log_diagnostic_error(
                    component="stacktrace",
                    error=e,
                    context={"action": "continuing_without_stacktrace"}
                )
            
            payload = {
                "schema_version": "1.0",
                "report_type": report_type,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "system_info": self.collect_system_info(),
                "module_context": self.collect_module_state(module_name or "unknown"),
                "user_input": {
                    "description": description,
                    "reproduction_steps": reproduction_steps
                },
                "diagnostics": {
                    "stacktrace": stacktrace,
                    "logs": logs,
                    "memory_usage_mb": memory_state.get("memory_usage_mb", 0),
                    "process_state": memory_state.get("process_state", {})
                },
                "screenshot_base64": screenshot_base64
            }
            
            return payload
        
        except Exception as e:
            # Critical error creating payload - log and re-raise
            log_error(
                error_type="PayloadCreationError",
                message="Failed to create report payload",
                context={
                    "report_type": report_type,
                    "has_screenshot": screenshot_path is not None,
                    "include_logs": include_logs
                },
                exception=e
            )
            raise
