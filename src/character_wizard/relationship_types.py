"""
Character Relationship Types and Data Classes

This module defines all relationship types, enums, and data structures
used for character relationship mapping.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Any
from datetime import datetime


class RelationshipType(Enum):
    """
    Types of relationships between characters.
    
    Categories:
    - Family: Blood relations
    - Romantic: Intimate partners
    - Social: Friends, allies, enemies
    - Professional: Work-related
    - Historical: Past connections
    """
    # Family Relationships
    PARENT = "parent"
    CHILD = "child"
    SIBLING = "sibling"
    GRANDPARENT = "grandparent"
    GRANDCHILD = "grandchild"
    AUNT_UNCLE = "aunt_uncle"
    NIECE_NEPHEW = "niece_nephew"
    COUSIN = "cousin"
    STEP_PARENT = "step_parent"
    STEP_SIBLING = "step_sibling"
    IN_LAW = "in_law"
    
    # Romantic Relationships
    SPOUSE = "spouse"
    PARTNER = "partner"
    LOVER = "lover"
    EX_PARTNER = "ex_partner"
    CRUSH = "crush"
    FIDIANE = "fiancee"
    DATING = "dating"
    
    # Social Relationships
    FRIEND = "friend"
    BEST_FRIEND = "best_friend"
    ACQUAINTANCE = "acquaintance"
    ENEMY = "enemy"
    RIVAL = "rival"
    NEMESIS = "nemesis"
    ALLY = "ally"
    MENTOR = "mentor"
    PROTÉGÉ = "protege"
    STUDENT = "student"
    TEACHER = "teacher"
    
    # Professional Relationships
    BOSS = "boss"
    EMPLOYEE = "employee"
    COLLEAGUE = "colleague"
    CLIENT = "client"
    BUSINESS_PARTNER = "business_partner"
    COMPETITOR = "competitor"
    
    # Historical/Other
    CHILDHOOD_FRIEND = "childhood_friend"
    OLD_FLAME = "old_flame"
    FORMER_ENEMY = "former_enemy"
    HERO_IDOL = "hero_idol"
    FAN = "fan"
    NEIGHBOR = "neighbor"
    STRANGER = "stranger"
    
    # Faction/Group
    FELLOW_MEMBER = "fellow_member"
    LEADER = "leader"
    FOLLOWER = "follower"
    FACTION_RIVAL = "faction_rival"

    def get_category(self) -> "RelationshipCategory":
        """Get the category for this relationship type."""
        family_types = {
            RelationshipType.PARENT, RelationshipType.CHILD,
            RelationshipType.SIBLING, RelationshipType.GRANDPARENT,
            RelationshipType.GRANDCHILD, RelationshipType.AUNT_UNCLE,
            RelationshipType.NIECE_NEPHEW, RelationshipType.COUSIN,
            RelationshipType.STEP_PARENT, RelationshipType.STEP_SIBLING,
            RelationshipType.IN_LAW
        }
        
        romantic_types = {
            RelationshipType.SPOUSE, RelationshipType.PARTNER,
            RelationshipType.LOVER, RelationshipType.EX_PARTNER,
            RelationshipType.CRUSH, RelationshipType.FIDIANE,
            RelationshipType.DATING
        }
        
        social_types = {
            RelationshipType.FRIEND, RelationshipType.BEST_FRIEND,
            RelationshipType.ACQUAINTANCE, RelationshipType.ENEMY,
            RelationshipType.RIVAL, RelationshipType.NEMESIS,
            RelationshipType.ALLY, RelationshipType.MENTOR,
            RelationshipType.PROTÉGÉ, RelationshipType.STUDENT,
            RelationshipType.TEACHER
        }
        
        professional_types = {
            RelationshipType.BOSS, RelationshipType.EMPLOYEE,
            RelationshipType.COLLEAGUE, RelationshipType.CLIENT,
            RelationshipType.BUSINESS_PARTNER, RelationshipType.COMPETITOR
        }
        
        historical_types = {
            RelationshipType.CHILDHOOD_FRIEND, RelationshipType.OLD_FLAME,
            RelationshipType.FORMER_ENEMY, RelationshipType.HERO_IDOL,
            RelationshipType.FAN, RelationshipType.NEIGHBOR,
            RelationshipType.STRANGER
        }
        
        faction_types = {
            RelationshipType.FELLOW_MEMBER, RelationshipType.LEADER,
            RelationshipType.FOLLOWER, RelationshipType.FACTION_RIVAL
        }
        
        if self in family_types:
            return RelationshipCategory.FAMILY
        elif self in romantic_types:
            return RelationshipCategory.ROMANTIC
        elif self in social_types:
            return RelationshipCategory.SOCIAL
        elif self in professional_types:
            return RelationshipCategory.PROFESSIONAL
        elif self in historical_types:
            return RelationshipCategory.HISTORICAL
        else:
            return RelationshipCategory.OTHER


class RelationshipCategory(Enum):
    """Categories of relationships."""
    FAMILY = "family"
    ROMANTIC = "romantic"
    SOCIAL = "social"
    PROFESSIONAL = "professional"
    HISTORICAL = "historical"
    OTHER = "other"


class RelationshipStrength(Enum):
    """
    Strength/intensity of a relationship.
    """
    VERY_WEAK = 1  # Barely connected
    WEAK = 2       # Casual acquaintance
    MODERATE = 3   # Regular interaction
    STRONG = 4     # Deep connection
    VERY_STRONG = 5  # Unbreakable bond
    NEGATIVE_STRONG = -4  # Deep enmity
    NEGATIVE_VERY_STRONG = -5  # Nemesis level

    def is_positive(self) -> bool:
        """Check if relationship is positive."""
        return self.value > 0

    def is_negative(self) -> bool:
        """Check if relationship is negative."""
        return self.value < 0

    def is_neutral(self) -> bool:
        """Check if relationship is neutral."""
        return self.value == 0

    def magnitude(self) -> int:
        """Get absolute strength magnitude."""
        return abs(self.value)


class RelationshipEventType(Enum):
    """Types of events that affect relationships."""
    MET = "met"
    CONVERSATION = "conversation"
    CONFLICT = "conflict"
    RESOLUTION = "resolution"
    HELPED = "helped"
    BETRAYED = "betrayed"
    GIFT = "gift"
    ARGUMENT = "argument"
    APOLOGY = "apology"
    REUNION = "reunion"
    SEPARATION = "separation"
    PROPOSAL = "proposal"
    MARRIAGE = "marriage"
    DIVORCE = "divorce"
    BIRTH = "birth"
    DEATH = "death"
    ALLIANCE = "alliance"
    BETRAYAL = "betrayal"
    DISCOVERY = "discovery"
    REVELATION = "revelation"
    MISSED_OPPORTUNITY = "missed_opportunity"
    SAVED_LIFE = "saved_life"
    TOOK_LIFE = "took_life"


@dataclass
class RelationshipEvent:
    """
    An event that affects a relationship.
    """
    event_type: RelationshipEventType
    timestamp: datetime
    description: str
    impact: float  # -1.0 to 1.0, effect on relationship
    scene_id: Optional[str] = None
    characters_involved: List[str] = field(default_factory=list)
    details: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if isinstance(self.timestamp, str):
            self.timestamp = datetime.fromisoformat(self.timestamp)


@dataclass
class CharacterRelationship:
    """
    Represents a relationship between two characters.
    """
    # Identity
    character_id_1: str
    character_id_2: str
    relationship_type: RelationshipType
    
    # State
    strength: RelationshipStrength
    description: str = ""
    
    # History
    events: List[RelationshipEvent] = field(default_factory=list)
    first_met: Optional[datetime] = None
    last_interaction: Optional[datetime] = None
    
    # Dynamics
    dynamics_summary: str = ""  # e.g., "complicated", "supportive but distant"
    conflicts: List[str] = field(default_factory=list)
    shared_secrets: List[str] = field(default_factory=list)
    common_goals: List[str] = field(default_factory=list)
    
    # Metadata
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def __post_init__(self):
        # Ensure consistent ordering of character IDs
        if self.character_id_1 > self.character_id_2:
            self.character_id_1, self.character_id_2 = self.character_id_2, self.character_id_1
        
        if isinstance(self.strength, (int, float)):
            self.strength = self._int_to_strength(int(self.strength))
    
    def _int_to_strength(self, value: int) -> RelationshipStrength:
        """Convert integer to RelationshipStrength."""
        if value > 0:
            if value >= 5: return RelationshipStrength.VERY_STRONG
            elif value >= 4: return RelationshipStrength.STRONG
            elif value >= 3: return RelationshipStrength.MODERATE
            elif value >= 2: return RelationshipStrength.WEAK
            else: return RelationshipStrength.VERY_WEAK
        elif value < 0:
            if value <= -5: return RelationshipStrength.NEGATIVE_VERY_STRONG
            else: return RelationshipStrength.NEGATIVE_STRONG
        else:
            return RelationshipStrength.MODERATE
    
    @property
    def character_pair(self) -> tuple:
        """Get sorted character pair."""
        return (self.character_id_1, self.character_id_2)
    
    @property
    def is_positive(self) -> bool:
        """Check if relationship is positive."""
        return self.strength.is_positive()
    
    @property
    def is_negative(self) -> bool:
        """Check if relationship is negative."""
        return self.strength.is_negative()
    
    @property
    def is_close(self) -> bool:
        """Check if relationship is close (strong positive)."""
        return self.strength in [
            RelationshipStrength.STRONG,
            RelationshipStrength.VERY_STRONG
        ]
    
    @property
    def is_hostile(self) -> bool:
        """Check if relationship is hostile."""
        return self.strength in [
            RelationshipStrength.NEGATIVE_STRONG,
            RelationshipStrength.NEGATIVE_VERY_STRONG
        ]
    
    def add_event(self, event: RelationshipEvent) -> None:
        """Add an event to the relationship history."""
        self.events.append(event)
        self.last_interaction = event.timestamp
        self.updated_at = datetime.now()
        
        # Update strength based on event impact
        self._apply_event_impact(event.impact)
    
    def _apply_event_impact(self, impact: float) -> None:
        """Apply event impact to relationship strength."""
        current_value = self.strength.value
        new_value = max(-5, min(5, current_value + int(impact * 2)))
        self.strength = self._int_to_strength(new_value)
    
    def get_event_timeline(self) -> List[RelationshipEvent]:
        """Get events sorted by timestamp."""
        return sorted(self.events, key=lambda e: e.timestamp)
    
    def calculate_trend(self) -> str:
        """
        Calculate relationship trend based on recent events.
        
        Returns: "improving", "declining", "stable", "volatile"
        """
        if len(self.events) < 2:
            return "stable"
        
        recent_events = self.events[-5:]  # Last 5 events
        
        if len(recent_events) < 2:
            return "stable"
        
        impacts = [e.impact for e in recent_events]
        avg_impact = sum(impacts) / len(impacts)
        impact_variance = sum((x - avg_impact) ** 2 for x in impacts) / len(impacts)
        
        if avg_impact > 0.3:
            return "improving"
        elif avg_impact < -0.3:
            return "declining"
        elif impact_variance > 0.2:
            return "volatile"
        else:
            return "stable"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "character_id_1": self.character_id_1,
            "character_id_2": self.character_id_2,
            "relationship_type": self.relationship_type.value,
            "strength": self.strength.value,
            "description": self.description,
            "events": [
                {
                    "event_type": e.event_type.value,
                    "timestamp": e.timestamp.isoformat(),
                    "description": e.description,
                    "impact": e.impact,
                    "scene_id": e.scene_id,
                    "characters_involved": e.characters_involved,
                    "details": e.details
                }
                for e in self.events
            ],
            "first_met": self.first_met.isoformat() if self.first_met else None,
            "last_interaction": self.last_interaction.isoformat() if self.last_interaction else None,
            "dynamics_summary": self.dynamics_summary,
            "conflicts": self.conflicts,
            "shared_secrets": self.shared_secrets,
            "common_goals": self.common_goals,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CharacterRelationship":
        """Create from dictionary."""
        events = [
            RelationshipEvent(
                event_type=RelationshipEventType(e["event_type"]),
                timestamp=datetime.fromisoformat(e["timestamp"]),
                description=e["description"],
                impact=e["impact"],
                scene_id=e.get("scene_id"),
                characters_involved=e.get("characters_involved", []),
                details=e.get("details", {})
            )
            for e in data.get("events", [])
        ]
        
        return cls(
            character_id_1=data["character_id_1"],
            character_id_2=data["character_id_2"],
            relationship_type=RelationshipType(data["relationship_type"]),
            strength=data.get("strength", 3),
            description=data.get("description", ""),
            events=events,
            first_met=datetime.fromisoformat(data["first_met"]) if data.get("first_met") else None,
            last_interaction=datetime.fromisoformat(data["last_interaction"]) if data.get("last_interaction") else None,
            dynamics_summary=data.get("dynamics_summary", ""),
            conflicts=data.get("conflicts", []),
            shared_secrets=data.get("shared_secrets", []),
            common_goals=data.get("common_goals", []),
            created_at=datetime.fromisoformat(data.get("created_at", datetime.now().isoformat())),
            updated_at=datetime.fromisoformat(data.get("updated_at", datetime.now().isoformat()))
        )


# Utility functions

def get_opposite_relationship(rel_type: RelationshipType) -> Optional[RelationshipType]:
    """Get the opposite relationship type."""
    opposites = {
        RelationshipType.FRIEND: RelationshipType.ENEMY,
        RelationshipType.ALLY: RelationshipType.RIVAL,
        RelationshipType.MENTOR: RelationshipType.NEMESIS,
        RelationshipType.LOVER: RelationshipType.EX_PARTNER,
        RelationshipType.TRUST: RelationshipType.BETRAYAL,
    }
    return opposites.get(rel_type)


def get_symmetric_relationship(rel_type: RelationshipType) -> bool:
    """Check if a relationship type is symmetric (A->B = B->A)."""
    # Family, friendship, most social relationships are symmetric
    symmetric_types = {
        RelationshipType.SIBLING, RelationshipType.COUSIN,
        RelationshipType.FRIEND, RelationshipType.BEST_FRIEND,
        RelationshipType.ACQUAINTANCE, RelationshipType.ENEMY,
        RelationshipType.RIVAL, RelationshipType.NEMESIS,
        RelationshipType.COLLEAGUE, RelationshipType.FELLOW_MEMBER,
        RelationshipType.CHILDHOOD_FRIEND, RelationshipType.NEIGHBOR,
    }
    return rel_type in symmetric_types


def get_asymmetric_relationships() -> List[tuple]:
    """Get pairs of asymmetric relationship types (A->B ≠ B->A)."""
    return [
        (RelationshipType.PARENT, RelationshipType.CHILD),
        (RelationshipType.MENTOR, RelationshipType.PROTÉGÉ),
        (RelationshipType.TEACHER, RelationshipType.STUDENT),
        (RelationshipType.BOSS, RelationshipType.EMPLOYEE),
        (RelationshipType.LEADER, RelationshipType.FOLLOWER),
        (RelationshipType.HERO_IDOL, RelationshipType.FAN),
    ]

