"""
ComfyUI Test Framework

A comprehensive testing framework for ComfyUI integration testing.
Provides connection management, workflow execution, quality validation,
and test orchestration capabilities.
"""

__version__ = "1.0.0"

from .connection_manager import (
    ComfyUIConnectionManager,
    ConnectionError,
    AuthenticationError,
    TimeoutError,
)
from .workflow_executor import (
    WorkflowExecutor,
    ExecutionError,
)
from .quality_validator import (
    QualityValidator,
    ValidationResult,
)
from .output_manager import (
    OutputManager,
)
from .test_runner import (
    ComfyUITestRunner,
    TestConfig,
    TestResult,
)

__all__ = [
    "ComfyUIConnectionManager",
    "ConnectionError",
    "AuthenticationError",
    "TimeoutError",
    "WorkflowExecutor",
    "ExecutionError",
    "QualityValidator",
    "ValidationResult",
    "OutputManager",
    "ComfyUITestRunner",
    "TestConfig",
    "TestResult",
]
