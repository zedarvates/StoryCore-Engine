"""
End-to-End Project Creation Module

This module provides automated project creation from a single user prompt,
handling everything from parsing to final video export.
"""

from .prompt_parser import PromptParser
from .config import ConfigurationManager
from .error_recovery_manager import ErrorRecoveryManager
from .orchestrator import EndToEndOrchestrator, WorkflowStatus, WorkflowInfo, create_project
from .data_models import (
    ParsedPrompt,
    CharacterInfo,
    ProjectComponents,
    WorkflowState,
    WorkflowStep,
    RecoveryStrategy,
    PipelineStep,
    OrchestratorConfig,
    OrchestratorConfig as EndToEndOrchestratorConfig,
)
from .error_handling import (
    ErrorCategory,
    CategorizedError,
    ErrorCategorizer,
    RetryManager,
    ErrorLogger,
    with_error_handling,
)

__version__ = "1.0.0"

__all__ = [
    "PromptParser",
    "ConfigurationManager",
    "ErrorRecoveryManager",
    "EndToEndOrchestrator",
    "WorkflowStatus",
    "WorkflowInfo",
    "create_project",
    "ParsedPrompt",
    "CharacterInfo",
    "ProjectComponents",
    "WorkflowState",
    "WorkflowStep",
    "RecoveryStrategy",
    "PipelineStep",
    "OrchestratorConfig",
    "EndToEndOrchestratorConfig",
    "ErrorCategory",
    "CategorizedError",
    "ErrorCategorizer",
    "RetryManager",
    "ErrorLogger",
    "with_error_handling",
]

