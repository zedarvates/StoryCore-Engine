"""
Data models for Pipeline API category.

This module defines all data structures used by pipeline endpoints.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class PipelineStageStatus(str, Enum):
    """Status of a pipeline stage."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class PipelinePhase(str, Enum):
    """Current phase of the pipeline."""
    INITIALIZATION = "initialization"
    GRID_GENERATION = "grid_generation"
    PROMOTION = "promotion"
    REFINEMENT = "refinement"
    QA = "qa"
    AUTOFIX = "autofix"
    EXPORT = "export"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class PipelineStage:
    """Definition of a pipeline stage."""
    name: str
    description: str
    dependencies: List[str] = field(default_factory=list)
    estimated_duration: float = 0.0  # seconds
    parameters: Dict[str, Any] = field(default_factory=dict)
    required: bool = True
    async_capable: bool = False


@dataclass
class PipelineStatus:
    """Current status of the pipeline."""
    project_name: str
    current_stage: str
    current_phase: str
    stages_completed: List[str] = field(default_factory=list)
    stages_remaining: List[str] = field(default_factory=list)
    progress: float = 0.0  # 0.0 to 1.0
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    started_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    estimated_completion: Optional[datetime] = None


@dataclass
class ProjectInitRequest:
    """Request to initialize a new project."""
    project_name: str
    base_path: str = "."
    config: Optional[Dict[str, Any]] = None
    capabilities: Optional[Dict[str, bool]] = None


@dataclass
class ProjectInitResponse:
    """Response from project initialization."""
    project_name: str
    project_path: str
    project_id: str
    global_seed: int
    created_at: str
    capabilities: Dict[str, bool]
    generation_status: Dict[str, str]


@dataclass
class ProjectValidationResult:
    """Result of project validation."""
    valid: bool
    project_name: str
    schema_version: str
    issues: List[Dict[str, Any]] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    data_contract_compliant: bool = True
    missing_fields: List[str] = field(default_factory=list)
    invalid_fields: List[str] = field(default_factory=list)


@dataclass
class PipelineExecutionRequest:
    """Request to execute pipeline stages."""
    project_name: str
    stages: List[str]
    async_mode: bool = True
    continue_on_error: bool = False
    parameters: Optional[Dict[str, Any]] = None


@dataclass
class PipelineExecutionResponse:
    """Response from pipeline execution."""
    project_name: str
    stages: List[str]
    execution_mode: str  # "sync" or "async"
    task_id: Optional[str] = None
    started_at: Optional[datetime] = None


@dataclass
class PipelineStageConfig:
    """Configuration for a pipeline stage."""
    stage_name: str
    enabled: bool = True
    parameters: Dict[str, Any] = field(default_factory=dict)
    timeout: Optional[int] = None  # seconds
    retry_on_failure: bool = False
    max_retries: int = 0


@dataclass
class PipelineCheckpoint:
    """A saved pipeline checkpoint."""
    checkpoint_id: str
    project_name: str
    created_at: datetime
    current_stage: str
    current_phase: str
    stages_completed: List[str]
    project_state: Dict[str, Any]
    description: Optional[str] = None


@dataclass
class DependencyCheckResult:
    """Result of dependency check."""
    all_available: bool
    missing_dependencies: List[str] = field(default_factory=list)
    available_dependencies: List[str] = field(default_factory=list)
    dependency_versions: Dict[str, str] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)


@dataclass
class StageListResponse:
    """Response listing available pipeline stages."""
    stages: List[PipelineStage]
    total_count: int
    categories: Dict[str, List[str]] = field(default_factory=dict)  # category -> stage names


# Pipeline stage definitions
PIPELINE_STAGES = {
    "init": PipelineStage(
        name="init",
        description="Initialize project structure and configuration",
        dependencies=[],
        estimated_duration=2.0,
        required=True,
        async_capable=False,
    ),
    "grid": PipelineStage(
        name="grid",
        description="Generate Master Coherence Sheet (3x3 grid)",
        dependencies=["init"],
        estimated_duration=30.0,
        required=True,
        async_capable=True,
    ),
    "promote": PipelineStage(
        name="promote",
        description="Promote selected panels from grid",
        dependencies=["grid"],
        estimated_duration=60.0,
        required=True,
        async_capable=True,
    ),
    "refine": PipelineStage(
        name="refine",
        description="Refine promoted images",
        dependencies=["promote"],
        estimated_duration=45.0,
        required=False,
        async_capable=True,
    ),
    "qa": PipelineStage(
        name="qa",
        description="Quality assurance analysis",
        dependencies=["promote"],
        estimated_duration=10.0,
        required=True,
        async_capable=False,
    ),
    "autofix": PipelineStage(
        name="autofix",
        description="Automatic quality fixing",
        dependencies=["qa"],
        estimated_duration=30.0,
        required=False,
        async_capable=True,
    ),
    "narrative": PipelineStage(
        name="narrative",
        description="Generate narrative content",
        dependencies=["init"],
        estimated_duration=20.0,
        required=False,
        async_capable=True,
    ),
    "video_plan": PipelineStage(
        name="video_plan",
        description="Plan video sequence and transitions",
        dependencies=["promote", "narrative"],
        estimated_duration=15.0,
        required=False,
        async_capable=False,
    ),
    "export": PipelineStage(
        name="export",
        description="Export final package",
        dependencies=["qa"],
        estimated_duration=20.0,
        required=True,
        async_capable=False,
    ),
}
