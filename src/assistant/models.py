"""
Data models for StoryCore AI Assistant.

These models represent the core data structures used throughout the assistant,
including projects, scenes, characters, sequences, and shots.
"""

from dataclasses import dataclass, field
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional


@dataclass
class ProjectMetadata:
    """Data Contract v1 metadata."""
    schema_version: str = "1.0"
    project_name: str = ""
    capabilities: Dict[str, bool] = field(default_factory=lambda: {
        "grid_generation": True,
        "promotion_engine": True,
        "qa_engine": True,
        "autofix_engine": True
    })
    generation_status: Dict[str, str] = field(default_factory=lambda: {
        "grid": "pending",
        "promotion": "pending"
    })


@dataclass
class Scene:
    """Scene definition."""
    id: str
    number: int
    title: str
    description: str
    location: str
    time_of_day: str
    duration: float
    characters: List[str]
    key_actions: List[str]
    visual_notes: Optional[str] = None


@dataclass
class Character:
    """Character profile."""
    id: str
    name: str
    role: str
    description: str
    appearance: str
    personality: str
    visual_reference: Optional[str] = None


@dataclass
class Shot:
    """Individual shot configuration."""
    id: str
    number: int
    type: str  # "wide", "medium", "close-up", "extreme-close-up"
    camera_movement: str  # "static", "pan", "tilt", "dolly", "crane"
    duration: float
    description: str
    visual_style: str


@dataclass
class Sequence:
    """Sequence with shots."""
    id: str
    scene_id: str
    shots: List[Shot]
    total_duration: float


@dataclass
class Project:
    """Complete StoryCore project."""
    name: str
    path: Path
    metadata: ProjectMetadata
    scenes: List[Scene]
    characters: List[Character]
    sequences: List[Sequence]
    created_at: datetime
    modified_at: datetime


@dataclass
class ParsedPrompt:
    """Parsed natural language prompt."""
    genre: str
    tone: str
    characters: List[Dict]
    setting: str
    scenes: List[Dict]
    visual_style: str
    duration: Optional[float]
    language: str
    raw_prompt: str


@dataclass
class GeneratedProject:
    """Generated project preview."""
    name: str
    metadata: ProjectMetadata
    scenes: List[Scene]
    characters: List[Character]
    sequences: List[Sequence]
    parsed_prompt: ParsedPrompt
