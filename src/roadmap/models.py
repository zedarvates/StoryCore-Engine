"""
Data models for the Public Roadmap System.

This module defines the core data structures used throughout the roadmap generation
pipeline, including feature metadata, spec file references, and configuration.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional


class FeatureCategory(Enum):
    """Classification of features by type."""
    
    UI = "UI"
    BACKEND = "Backend"
    INFRASTRUCTURE = "Infrastructure"
    DOCUMENTATION = "Documentation"
    TESTING = "Testing"
    TOOLING = "Tooling"
    MIGRATION = "Migration"


class Priority(Enum):
    """Priority level for feature implementation."""
    
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class FeatureStatus(Enum):
    """Current implementation status of a feature."""
    
    COMPLETED = "completed"
    IN_PROGRESS = "in-progress"
    PLANNED = "planned"
    FUTURE = "future"


@dataclass
class SpecFiles:
    """
    References to specification files for a feature.
    
    Attributes:
        directory: Path to the spec directory
        requirements: Path to requirements.md file (if exists)
        design: Path to design.md file (if exists)
        tasks: Path to tasks.md file (if exists)
        metadata: Parsed frontmatter from spec files
    """
    
    directory: Path
    requirements: Optional[Path] = None
    design: Optional[Path] = None
    tasks: Optional[Path] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Feature:
    """
    Complete feature metadata for roadmap generation.
    
    Attributes:
        name: Kebab-case directory name
        title: Human-readable title
        description: 2-3 sentence summary
        category: Feature classification (UI, Backend, etc.)
        priority: Implementation priority (High, Medium, Low)
        status: Current implementation status
        timeline: Quarter designation (e.g., "Q1 2026")
        target_date: Planned completion date
        completion_date: Actual completion date
        completion_percentage: Task completion ratio (0.0 to 1.0)
        spec_path: Relative path to spec directory
        dependencies: Names of dependent features
        tags: Additional classification tags
    """
    
    name: str
    title: str
    description: str
    category: FeatureCategory
    priority: Priority
    status: FeatureStatus
    timeline: Optional[str] = None
    target_date: Optional[datetime] = None
    completion_date: Optional[datetime] = None
    completion_percentage: float = 0.0
    spec_path: Path = field(default_factory=lambda: Path("."))
    dependencies: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    
    def __post_init__(self):
        """Validate feature data after initialization."""
        if not 0.0 <= self.completion_percentage <= 1.0:
            raise ValueError(
                f"completion_percentage must be between 0.0 and 1.0, "
                f"got {self.completion_percentage}"
            )


@dataclass
class RoadmapConfig:
    """
    Configuration for roadmap generation.
    
    Attributes:
        specs_directory: Path to internal specs directory
        output_path: Path for generated ROADMAP.md
        changelog_path: Path for generated CHANGELOG.md
        include_future: Whether to include future considerations section
        max_description_length: Maximum characters for feature descriptions
        status_emoji: Emoji mapping for feature statuses
        priority_emoji: Emoji mapping for priority levels
    """
    
    specs_directory: Path = Path(".kiro/specs")
    output_path: Path = Path("ROADMAP.md")
    changelog_path: Path = Path("CHANGELOG.md")
    include_future: bool = True
    max_description_length: int = 300
    status_emoji: Dict[FeatureStatus, str] = field(default_factory=lambda: {
        FeatureStatus.COMPLETED: "✅",
        FeatureStatus.IN_PROGRESS: "🚧",
        FeatureStatus.PLANNED: "📋",
        FeatureStatus.FUTURE: "💡",
    })
    priority_emoji: Dict[Priority, str] = field(default_factory=lambda: {
        Priority.HIGH: "🔴",
        Priority.MEDIUM: "🟡",
        Priority.LOW: "🟢",
    })
