"""
Logging configuration for end-to-end project creation.

Provides structured logging with different levels and output formats.
"""

import logging
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional


class WorkflowLogger:
    """Centralized logging for workflow execution"""
    
    def __init__(
        self,
        name: str = "end_to_end",
        log_level: str = "INFO",
        log_file: Optional[Path] = None,
        console_output: bool = True
    ):
        """
        Initialize workflow logger.
        
        Args:
            name: Logger name
            log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            log_file: Path to log file (optional)
            console_output: Whether to output to console
        """
        self.logger = logging.getLogger(name)
        self.logger.setLevel(getattr(logging, log_level.upper()))
        
        # Clear existing handlers
        self.logger.handlers.clear()
        
        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # Console handler
        if console_output:
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setFormatter(formatter)
            self.logger.addHandler(console_handler)
        
        # File handler
        if log_file:
            log_file.parent.mkdir(parents=True, exist_ok=True)
            file_handler = logging.FileHandler(log_file)
            file_handler.setFormatter(formatter)
            self.logger.addHandler(file_handler)
    
    def debug(self, message: str, **kwargs):
        """Log debug message"""
        self.logger.debug(message, extra=kwargs)
    
    def info(self, message: str, **kwargs):
        """Log info message"""
        self.logger.info(message, extra=kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning message"""
        self.logger.warning(message, extra=kwargs)
    
    def error(self, message: str, **kwargs):
        """Log error message"""
        self.logger.error(message, extra=kwargs)
    
    def critical(self, message: str, **kwargs):
        """Log critical message"""
        self.logger.critical(message, extra=kwargs)
    
    def log_workflow_start(self, prompt: str):
        """Log workflow start"""
        self.info("=" * 80)
        self.info("WORKFLOW STARTED")
        self.info(f"Prompt: {prompt[:100]}...")
        self.info("=" * 80)
    
    def log_workflow_complete(self, duration: float, success: bool):
        """Log workflow completion"""
        self.info("=" * 80)
        status = "SUCCESS" if success else "FAILED"
        self.info(f"WORKFLOW {status}")
        self.info(f"Duration: {duration:.2f} seconds")
        self.info("=" * 80)
    
    def log_step_start(self, step_name: str):
        """Log step start"""
        self.info(f">>> Starting step: {step_name}")
    
    def log_step_complete(self, step_name: str, duration: float):
        """Log step completion"""
        self.info(f"<<< Completed step: {step_name} ({duration:.2f}s)")
    
    def log_error_with_context(self, error: Exception, context: dict):
        """Log error with full context"""
        self.error(f"Error: {str(error)}")
        self.error(f"Error type: {type(error).__name__}")
        for key, value in context.items():
            self.error(f"  {key}: {value}")


def setup_project_logger(project_path: Path, log_level: str = "INFO") -> WorkflowLogger:
    """
    Setup logger for a specific project.
    
    Args:
        project_path: Path to project directory
        log_level: Logging level
        
    Returns:
        Configured WorkflowLogger instance
    """
    log_dir = project_path / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = log_dir / f"workflow_{timestamp}.log"
    
    return WorkflowLogger(
        name=f"project_{project_path.name}",
        log_level=log_level,
        log_file=log_file,
        console_output=True
    )


def get_logger(name: str = "end_to_end") -> WorkflowLogger:
    """
    Get or create a logger instance.
    
    Args:
        name: Logger name
        
    Returns:
        WorkflowLogger instance
    """
    return WorkflowLogger(name=name)
