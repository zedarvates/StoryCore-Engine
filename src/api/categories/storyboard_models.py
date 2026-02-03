"""
Storyboard and Timeline Data Models

This module defines data models for storyboard and timeline management.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from datetime import datetime


@dataclass
class Shot:
    """Represents a single shot in a storyboard."""
    shot_id: str
    description: str
    duration_seconds: float
    camera_angle: Optional[str] = None
    camera_movement: Optional[str] = None
    composition: Optional[str] = None
    lighting: Optional[str] = None
    visual_notes: Optional[str] = None
    audio_notes: Optional[str] = None
    sequence_number: int = 0
    image_path: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class Storyboard:
    """Represents a complete storyboard."""
    storyboard_id: str
    project_name: str
    title: str
    description: Optional[str] = None
    shots: List[Shot] = field(default_factory=list)
    total_duration_seconds: float = 0.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class StoryboardCreateRequest:
    """Request to create a new storyboard."""
    project_name: str
    title: str
    description: Optional[str] = None
    scene_data: Optional[Dict[str, Any]] = None
    auto_generate_shots: bool = False
    num_shots: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class StoryboardCreateResult:
    """Result of storyboard creation."""
    storyboard_id: str
    project_name: str
    title: str
    total_shots: int
    total_duration_seconds: float
    created_at: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ShotAddRequest:
    """Request to add a shot to a storyboard."""
    storyboard_id: str
    description: str
    duration_seconds: float
    camera_angle: Optional[str] = None
    camera_movement: Optional[str] = None
    composition: Optional[str] = None
    lighting: Optional[str] = None
    visual_notes: Optional[str] = None
    audio_notes: Optional[str] = None
    insert_at: Optional[int] = None  # Position to insert, None = append
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ShotAddResult:
    """Result of adding a shot."""
    shot_id: str
    storyboard_id: str
    sequence_number: int
    total_shots: int
    created_at: datetime


@dataclass
class ShotUpdateRequest:
    """Request to update an existing shot."""
    storyboard_id: str
    shot_id: str
    description: Optional[str] = None
    duration_seconds: Optional[float] = None
    camera_angle: Optional[str] = None
    camera_movement: Optional[str] = None
    composition: Optional[str] = None
    lighting: Optional[str] = None
    visual_notes: Optional[str] = None
    audio_notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class ShotUpdateResult:
    """Result of updating a shot."""
    shot_id: str
    storyboard_id: str
    updated_fields: List[str]
    updated_at: datetime


@dataclass
class ShotDeleteRequest:
    """Request to delete a shot."""
    storyboard_id: str
    shot_id: str


@dataclass
class ShotDeleteResult:
    """Result of deleting a shot."""
    shot_id: str
    storyboard_id: str
    deleted: bool
    remaining_shots: int


@dataclass
class ShotReorderRequest:
    """Request to reorder shots."""
    storyboard_id: str
    shot_order: List[str]  # List of shot_ids in desired order


@dataclass
class ShotReorderResult:
    """Result of reordering shots."""
    storyboard_id: str
    reordered_count: int
    new_sequence: List[Dict[str, Any]]  # List of {shot_id, sequence_number}


@dataclass
class TimelineEntry:
    """Represents a single entry in a timeline."""
    shot_id: str
    start_time_seconds: float
    end_time_seconds: float
    duration_seconds: float
    description: str
    sequence_number: int
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Timeline:
    """Represents a complete timeline."""
    storyboard_id: str
    project_name: str
    entries: List[TimelineEntry]
    total_duration_seconds: float
    total_shots: int
    generated_at: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TimelineGenerateRequest:
    """Request to generate a timeline."""
    storyboard_id: str
    include_transitions: bool = False
    transition_duration_seconds: float = 0.5
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TimelineGenerateResult:
    """Result of timeline generation."""
    storyboard_id: str
    timeline: Timeline
    generated_at: datetime


@dataclass
class StoryboardValidationIssue:
    """Represents a validation issue."""
    severity: str  # "error", "warning", "info"
    category: str  # "structure", "duration", "sequence", "content"
    message: str
    shot_id: Optional[str] = None
    suggestion: Optional[str] = None


@dataclass
class StoryboardValidationResult:
    """Result of storyboard validation."""
    storyboard_id: str
    valid: bool
    issues: List[StoryboardValidationIssue]
    total_issues: int
    errors: int
    warnings: int
    info: int
    validated_at: datetime


@dataclass
class StoryboardExportRequest:
    """Request to export a storyboard."""
    storyboard_id: str
    format: str  # "json", "pdf", "html", "csv"
    include_images: bool = False
    output_path: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class StoryboardExportResult:
    """Result of storyboard export."""
    storyboard_id: str
    format: str
    output_path: str
    file_size_bytes: int
    exported_at: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)
