"""
StoryCore LLM Memory System

An intelligent project organization framework that automatically creates and maintains
a structured directory system optimized for LLM assistant efficiency.

This module provides:
- Automatic directory structure creation
- Discussion recording and summarization
- Asset management and indexing
- Comprehensive build logging
- Error detection and recovery
- Quality assurance validation
- Project context management
"""

__version__ = "1.0.0"

# Core orchestrator
from .memory_system_core import MemorySystemCore

# Managers
from .config_manager import ConfigManager
from .directory_manager import DirectoryManager
from .discussion_manager import DiscussionManager
from .memory_manager import MemoryManager
from .asset_manager import AssetManager
from .build_logger import BuildLogger
from .log_processor import LogProcessor
from .error_detector import ErrorDetector
from .recovery_engine import RecoveryEngine
from .summarization_engine import SummarizationEngine
from .timeline_generator import TimelineGenerator
from .variables_manager import VariablesManager
from .auto_qa_system import AutoQASystem

# Data models
from .data_models import (
    ProjectConfig,
    ProjectMemory,
    MemorySystemConfig,
    Conversation,
    Message,
    AssetInfo,
    AssetType,
    AssetMetadata,
    Error,
    ErrorType,
    ErrorSeverity,
    RecoveryType,
    Variables,
    Variable,
    Action,
    RepairResult,
    RecoveryReport,
    ValidationResult,
    ProjectContext,
    QAIssue,
    QAReport,
    Objective,
    Entity,
    Constraint,
    Decision,
    StyleRule,
    Task,
    CurrentState,
)

__all__ = [
    # Version
    "__version__",
    
    # Core
    "MemorySystemCore",
    
    # Managers
    "ConfigManager",
    "DirectoryManager",
    "DiscussionManager",
    "MemoryManager",
    "AssetManager",
    "BuildLogger",
    "LogProcessor",
    "ErrorDetector",
    "RecoveryEngine",
    "SummarizationEngine",
    "TimelineGenerator",
    "VariablesManager",
    "AutoQASystem",
    
    # Data models
    "ProjectConfig",
    "ProjectMemory",
    "MemorySystemConfig",
    "Conversation",
    "Message",
    "AssetInfo",
    "AssetType",
    "AssetMetadata",
    "Error",
    "ErrorType",
    "ErrorSeverity",
    "RecoveryType",
    "Variables",
    "Variable",
    "Action",
    "RepairResult",
    "RecoveryReport",
    "ValidationResult",
    "ProjectContext",
    "QAIssue",
    "QAReport",
    "Objective",
    "Entity",
    "Constraint",
    "Decision",
    "StyleRule",
    "Task",
    "CurrentState",
]


def create_memory_system(
    project_path: str,
    project_name: str,
    project_type: str = "video",
    objectives: list = None
) -> MemorySystemCore:
    """
    Factory function to create and initialize a memory system.
    
    Args:
        project_path: Path to the project directory
        project_name: Name of the project
        project_type: Type of project (video, script, creative, technical)
        objectives: List of project objectives
        
    Returns:
        Initialized MemorySystemCore instance
    """
    from pathlib import Path
    
    core = MemorySystemCore(Path(project_path))
    
    if objectives is None:
        objectives = []
    
    core.initialize_project(
        project_name=project_name,
        project_type=project_type,
        objectives=objectives
    )
    
    return core


def load_memory_system(project_path: str) -> MemorySystemCore:
    """
    Factory function to load an existing memory system.
    
    Args:
        project_path: Path to the project directory
        
    Returns:
        Loaded MemorySystemCore instance
    """
    from pathlib import Path
    return MemorySystemCore(Path(project_path))

