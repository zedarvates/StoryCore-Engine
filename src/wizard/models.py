"""
Data models for the Interactive Project Setup Wizard (MVP)

This module defines the core data structures used throughout the wizard,
including wizard state, project configuration, and format/genre definitions.
"""

from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any
from datetime import datetime
import json


@dataclass
class WizardState:
    """
    Represents the current state of the wizard session (MVP version)
    
    Simplified for MVP - only essential fields for basic wizard flow.
    Enhanced for V2 with story generation support.
    """
    project_name: Optional[str] = None
    format_key: Optional[str] = None
    duration_minutes: Optional[int] = None
    genre_key: Optional[str] = None
    story_content: Optional[str] = None
    generated_story: Optional[Any] = None  # V2: Full Story object from story generator
    current_step: int = 0
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        data = asdict(self)
        # Handle generated_story serialization
        if self.generated_story is not None:
            # Convert Story object to dict if it has to_dict method
            if hasattr(self.generated_story, 'to_dict'):
                data['generated_story'] = self.generated_story.to_dict()
            else:
                # Fallback to asdict for dataclass
                try:
                    data['generated_story'] = asdict(self.generated_story)
                except:
                    # If serialization fails, store as None
                    data['generated_story'] = None
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'WizardState':
        """Create from dictionary (JSON deserialization)"""
        # Handle generated_story deserialization
        if 'generated_story' in data and data['generated_story'] is not None:
            # For now, just store as dict - full deserialization would need Story class
            pass  # Keep as dict for now
        return cls(**data)
    
    def to_json(self) -> str:
        """Serialize to JSON string"""
        return json.dumps(self.to_dict(), indent=2)
    
    @classmethod
    def from_json(cls, json_str: str) -> 'WizardState':
        """Deserialize from JSON string"""
        return cls.from_dict(json.loads(json_str))


@dataclass
class ProjectConfiguration:
    """
    Complete project configuration built from wizard responses (MVP version)
    
    Simplified for MVP - contains only essential configuration data.
    """
    schema_version: str = "1.0"
    project_name: str = ""
    format: Dict[str, Any] = field(default_factory=dict)
    duration_minutes: int = 0
    genre: Dict[str, Any] = field(default_factory=dict)
    story: str = ""
    style_config: Dict[str, Any] = field(default_factory=dict)
    technical_specs: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return asdict(self)
    
    def to_json(self) -> str:
        """Serialize to JSON string"""
        return json.dumps(self.to_dict(), indent=2)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ProjectConfiguration':
        """Create from dictionary"""
        return cls(**data)


@dataclass
class GenreDefinition:
    """Definition of a genre with its visual and audio characteristics"""
    key: str
    name: str
    style_defaults: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)


@dataclass
class FormatDefinition:
    """Definition of a cinematic format with duration and technical specs"""
    key: str
    name: str
    duration_range: tuple
    shot_duration_avg: float
    resolution: str
    frame_rate: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        # Convert tuple to list for JSON serialization
        data['duration_range'] = list(data['duration_range'])
        return data
