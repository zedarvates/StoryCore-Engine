name="content">"""
Character Consistency Tracking Types

Data structures for tracking character consistency across scenes.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Set
from typing import TypedDict


class ConsistencyCategory(Enum):
    """Categories of consistency to track."""
    APPEARANCE = "appearance"
    CLOTHING = "clothing"
    ACCESSORIES = "accessories"
    BEHAVIOR = "behavior"
    PERSONALITY = "personality"
    DIALOGUE = "dialogue"
    RELATIONSHIPS = "relationships"
    KNOWLEDGE = "knowledge"
    ABILITIES = "abilities"


class ConsistencyStatus(Enum):
    """Status of consistency for a category."""
    CONSISTENT = "consistent"
    MINOR_VARIATION = "minor_variation"
    SIGNIFICANT_VARIATION = "significant_variation"
    CONTRADICTION = "contradiction"
    UNKNOWN = "unknown"


class VariationType(Enum):
    """Type of variation detected."""
    NONE = "none"
    CHANGE = "change"
    ADDITION = "addition"
    REMOVAL = "removal"
    CONTRADICTION = "contradiction"


@dataclass
class AppearanceSnapshot:
    """Snapshot of character appearance at a point in time."""
    scene_id: str
    timestamp: datetime
    
    # Physical description
    age_description: str = ""
    height: str = ""
    build: str = ""
    hair_color: str = ""
    eye_color: str = ""
    skin_tone: str = ""
    distinguishing_features: List[str] = field(default_factory=list)
    
    # Clothing snapshot
    clothing_top: str = ""
    clothing_bottom: str = ""
    footwear: str = ""
    outerwear: str = ""
    clothing_colors: List[str] = field(default_factory=list)
    
    # Accessories
    accessories: List[str] = field(default_factory=list)
    jewelry: List[str] = field(default_factory=list)
    tech_devices: List[str] = field(default_factory=list)
    
    # Grooming
    grooming_level: str = ""
    hair_style: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "scene_id": self.scene_id,
            "timestamp": self.timestamp.isoformat(),
            "age_description": self.age_description,
            "height": self.height,
            "build": self.build,
            "hair_color": self.hair_color,
            "eye_color": self.eye_color,
            "skin_tone": self.skin_tone,
            "distinguishing_features": self.distinguishing_features,
            "clothing_top": self.clothing_top,
            "clothing_bottom": self.clothing_bottom,
            "footwear": self.footwear,
            "outerwear": self.outerwear,
            "clothing_colors": self.clothing_colors,
            "accessories": self.accessories,
            "jewelry": self.jewelry,
            "tech_devices": self.tech_devices,
            "grooming_level": self.grooming_level,
            "hair_style": self.hair_style
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AppearanceSnapshot":
        data = data.copy()
        if isinstance(data.get("timestamp"), str):
            data["timestamp"] = datetime.fromisoformat(data["timestamp"])
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class BehaviorSnapshot:
    """Snapshot of character behavior at a point in time."""
    scene_id: str
    timestamp: datetime
    
    # Mood and emotional state
    mood: str = ""
    emotional_state: str = ""
    
    # Behavioral traits displayed
    displayed_traits: List[str] = field(default_factory=list)
    behavior_notes: List[str] = field(default_factory=list)
    
    # Actions and mannerisms
    actions: List[str] = field(default_factory=list)
    mannerisms: List[str] = field(default_factory=list)
    speech_patterns: List[str] = field(default_factory=list)
    
    # Physical behavior
    posture: str = ""
    movement_style: str = ""
    gestures: List[str] = field(default_factory=list)
    
    # Social behavior
    interaction_style: str = ""
    relationship_dynamics: Dict[str, str] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "scene_id": self.scene_id,
            "timestamp": self.timestamp.isoformat(),
            "mood": self.mood,
            "emotional_state": self.emotional_state,
            "displayed_traits": self.displayed_traits,
            "behavior_notes": self.behavior_notes,
            "actions": self.actions,
            "mannerisms": self.mannerisms,
            "speech_patterns": self.speech_patterns,
            "posture": self.posture,
            "movement_style": self.movement_style,
            "gestures": self.gestures,
            "interaction_style": self.interaction_style,
            "relationship_dynamics": self.relationship_dynamics
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BehaviorSnapshot":
        data = data.copy()
        if isinstance(data.get("timestamp"), str):
            data["timestamp"] = datetime.fromisoformat(data["timestamp"])
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class DialogueSnapshot:
    """Snapshot of character dialogue characteristics."""
    scene_id: str
    timestamp: datetime
    
    # Vocabulary
    vocabulary_level: str = ""
    specialized_terms: List[str] = field(default_factory=list)
    catchphrases: List[str] = field(default_factory=list)
    
    # Speech patterns
    sentence_structure: str = ""
    speech_tempo: str = ""
    formality_level: str = ""
    
    # Voice characteristics
    tone: str = ""
    volume: str = ""
    accents: List[str] = field(default_factory=list)
    
    # Content patterns
    topics_discussed: List[str] = field(default_factory=list)
    secrets_revealed: List[str] = field(default_factory=list)
    lies_told: List[str] = field(default_factory=list)
    
    # Relationships referenced
    referenced_characters: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "scene_id": self.scene_id,
            "timestamp": self.timestamp.isoformat(),
            "vocabulary_level": self.vocabulary_level,
            "specialized_terms": self.specialized_terms,
            "catchphrases": self.catchphrases,
            "sentence_structure": self.sentence_structure,
            "speech_tempo": self.speech_tempo,
            "formality_level": self.formality_level,
            "tone": self.tone,
            "volume": self.volume,
            "accents": self.accents,
            "topics_discussed": self.topics_discussed,
            "secrets_revealed": self.secrets_revealed,
            "lies_told": self.lies_told,
            "referenced_characters": self.referenced_characters
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DialogueSnapshot":
        data = data.copy()
        if isinstance(data.get("timestamp"), str):
            data["timestamp"] = datetime.fromisoformat(data["timestamp"])
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class KnowledgeSnapshot:
    """Snapshot of character knowledge at a point in time."""
    scene_id: str
    timestamp: datetime
    
    # What character knows
    known_facts: List[str] = field(default_factory=list)
    known_people: List[str] = field(default_factory=list)
    known_locations: List[str] = field(default_factory=list)
    known_skills: List[str] = field(default_factory=list)
    
    # What character should NOT know
    impossible_knowledge: List[str] = field(default_factory=list)
    
    # Learning moments
    new_information: List[str] = field(default_factory=list)
    revelations: List[str] = field(default_factory=list)
    
    # Memory gaps
    forgotten_information: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "scene_id": self.scene_id,
            "timestamp": self.timestamp.isoformat(),
            "known_facts": self.known_facts,
            "known_people": self.known_people,
            "known_locations": self.known_locations,
            "known_skills": self.known_skills,
            "impossible_knowledge": self.impossible_knowledge,
            "new_information": self.new_information,
            "revelations": self.revelations,
            "forgotten_information": self.forgotten_information
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "KnowledgeSnapshot":
        data = data.copy()
        if isinstance(data.get("timestamp"), str):
            data["timestamp"] = datetime.fromisoformat(data["timestamp"])
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class Variation:
    """A detected variation in character consistency."""
    category: ConsistencyCategory
    variation_type: VariationType
    
    # What changed
    field_name: str
    previous_value: Any
    current_value: Any
    
    # Context
    scene_id: str
    previous_scene_id: str
    
    # Severity assessment
    severity: str  # "minor", "moderate", "major", "critical"
    impact_on_story: str  # "none", "minor", "significant", "breaking"
    
    # Suggestion for resolution
    suggestion: str = ""
    
    # Timestamp
    detected_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "category": self.category.value,
            "variation_type": self.variation_type.value,
            "field_name": self.field_name,
            "previous_value": str(self.previous_value),
            "current_value": str(self.current_value),
            "scene_id": self.scene_id,
            "previous_scene_id": self.previous_scene_id,
            "severity": self.severity,
            "impact_on_story": self.impact_on_story,
            "suggestion": self.suggestion,
            "detected_at": self.detected_at.isoformat()
        }


@dataclass
class ConsistencyScore:
    """Consistency score for a character."""
    character_id: str
    
    # Overall score (0.0 to 1.0)
    overall_score: float = 0.0
    
    # Category scores
    appearance_score: float = 1.0
    clothing_score: float = 1.0
    accessories_score: float = 1.0
    behavior_score: float = 1.0
    personality_score: float = 1.0
    dialogue_score: float = 1.0
    relationships_score: float = 1.0
    knowledge_score: float = 1.0
    abilities_score: float = 1.0
    
    # Statistics
    total_scenes: int = 0
    total_variations: int = 0
    contradictions: int = 0
    warnings_issued: int = 0
    
    # Last updated
    last_updated: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "character_id": self.character_id,
            "overall_score": self.overall_score,
            "appearance_score": self.appearance_score,
            "clothing_score": self.clothing_score,
            "accessories_score": self.accessories_score,
            "behavior_score": self.behavior_score,
            "personality_score": self.personality_score,
            "dialogue_score": self.dialogue_score,
            "relationships_score": self.relationships_score,
            "knowledge_score": self.knowledge_score,
            "abilities_score": self.abilities_score,
            "total_scenes": self.total_scenes,
            "total_variations": self.total_variations,
            "contradictions": self.contradictions,
            "warnings_issued": self.warnings_issued,
            "last_updated": self.last_updated.isoformat()
        }
    
    def get_status(self) -> ConsistencyStatus:
        """Get overall consistency status."""
        if self.overall_score >= 0.95:
            return ConsistencyStatus.CONSISTENT
        elif self.overall_score >= 0.80:
            return ConsistencyStatus.MINOR_VARIATION
        elif self.overall_score >= 0.60:
            return ConsistencyStatus.SIGNIFICANT_VARIATION
        elif self.overall_score >= 0.40:
            return ConsistencyStatus.CONTRADICTION
        else:
            return ConsistencyStatus.CONTRADICTION


@dataclass
class ConsistencyWarning:
    """A warning about a character consistency issue."""
    warning_id: str
    character_id: str
    warning_type: str
    
    # Details
    category: ConsistencyCategory
    severity: str  # "info", "warning", "error", "critical"
    title: str
    description: str
    
    # Context
    scene_id: str
    related_scenes: List[str] = field(default_factory=list)
    
    # Resolution
    suggestion: str = ""
    is_resolved: bool = False
    resolved_at: Optional[datetime] = None
    
    # Metadata
    created_at: datetime = field(default_factory=datetime.now)
    acknowledged: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "warning_id": self.warning_id,
            "character_id": self.character_id,
            "warning_type": self.warning_type,
            "category": self.category.value,
            "severity": self.severity,
            "title": self.title,
            "description": self.description,
            "scene_id": self.scene_id,
            "related_scenes": self.related_scenes,
            "suggestion": self.suggestion,
            "is_resolved": self.is_resolved,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "created_at": self.created_at.isoformat(),
            "acknowledged": self.acknowledged
        }


@dataclass
class CharacterConsistencyRecord:
    """Complete consistency record for a character."""
    character_id: str
    character_name: str
    
    # Snapshots by category
    appearances: List[AppearanceSnapshot] = field(default_factory=list)
    behaviors: List[BehaviorSnapshot] = field(default_factory=list)
    dialogues: List[DialogueSnapshot] = field(default_factory=list)
    knowledge: List[KnowledgeSnapshot] = field(default_factory=list)
    
    # Tracking
    variations: List[Variation] = field(default_factory=list)
    warnings: List[ConsistencyWarning] = field(default_factory=list)
    
    # Current score
    current_score: ConsistencyScore = field(default_factory=lambda: ConsistencyScore(""))
    
    # Metadata
    first_scene: str = ""
    last_scene: str = ""
    scene_count: int = 0
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "character_id": self.character_id,
            "character_name": self.character_name,
            "appearances": [a.to_dict() for a in self.appearances],
            "behaviors": [b.to_dict() for b in self.behaviors],
            "dialogues": [d.to_dict() for d in self.dialogues],
            "knowledge": [k.to_dict() for k in self.knowledge],
            "variations": [v.to_dict() for v in self.variations],
            "warnings": [w.to_dict() for w in self.warnings],
            "current_score": self.current_score.to_dict(),
            "first_scene": self.first_scene,
            "last_scene": self.last_scene,
            "scene_count": self.scene_count,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CharacterConsistencyRecord":
        data = data.copy()
        
        # Parse nested structures
        data["appearances"] = [AppearanceSnapshot.from_dict(a) for a in data.get("appearances", [])]
        data["behaviors"] = [BehaviorSnapshot.from_dict(b) for b in data.get("behaviors", [])]
        data["dialogues"] = [DialogueSnapshot.from_dict(d) for d in data.get("dialogues", [])]
        data["knowledge"] = [KnowledgeSnapshot.from_dict(k) for k in data.get("knowledge", [])]
        
        # Parse variations and warnings
        data["variations"] = [Variation(**v) if isinstance(v, dict) else v for v in data.get("variations", [])]
        data["warnings"] = [ConsistencyWarning(**w) if isinstance(w, dict) else w for w in data.get("warnings", [])]
        
        # Parse score
        if isinstance(data.get("current_score"), dict):
            score_data = data["current_score"]
            data["current_score"] = ConsistencyScore(
                character_id=score_data.get("character_id", "")
            )
            for key, value in score_data.items():
                if hasattr(data["current_score"], key):
                    setattr(data["current_score"], key, value)
        
        # Parse dates
        for date_field in ["created_at", "updated_at"]:
            if isinstance(data.get(date_field), str):
                data[date_field] = datetime.fromisoformat(data[date_field])
        
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})
