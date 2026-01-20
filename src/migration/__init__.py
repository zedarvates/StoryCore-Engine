"""
Migration package for StoryCore-Engine project structure reorganization.

This package provides tools for safely migrating the project structure while
preserving functionality, Git history, and enabling rollback capabilities.
"""

from .backup_manager import BackupManager, BackupInfo
from .build_script_updater import BuildScriptUpdater, ScriptUpdate, UpdateResult
from .file_analyzer import (
    FileAnalyzer,
    FileCategory,
    FileInfo,
    ProjectStructure,
    DependencyGraph,
    FileMovement,
    MovementPlan
)

__all__ = [
    'BackupManager',
    'BackupInfo',
    'BuildScriptUpdater',
    'ScriptUpdate',
    'UpdateResult',
    'FileAnalyzer',
    'FileCategory',
    'FileInfo',
    'ProjectStructure',
    'DependencyGraph',
    'FileMovement',
    'MovementPlan'
]
