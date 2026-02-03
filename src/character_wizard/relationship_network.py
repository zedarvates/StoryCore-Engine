"""
Character Relationship Network

This module provides the main relationship network class for managing
and querying character relationships.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Any
from datetime import datetime
from collections import defaultdict

from .relationship_types import (
    RelationshipType, RelationshipCategory, RelationshipStrength,
    RelationshipEvent, RelationshipEventType, CharacterRelationship,
    get_symmetric_relationship, get_asymmetric_relationships
)

logger = logging.getLogger(__name__)


@dataclass
class CharacterNode:
    """Represents a character in the relationship network."""
    character_id: str
    name: str
    archetype: str = ""
    is_protagonist: bool = False
    is_antagonist: bool = False
    
    # For visualization
    importance_score: float = 0.5
    cluster_id: Optional[str] = None
    
    # Metadata
    created_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def add_relationship(self, rel_type: RelationshipType) -> None:
        """Track a relationship type involving this character."""
        if "relationship_types" not in self.metadata:
            self.metadata["relationship_types"] = set()
        self.metadata["relationship_types"].add(rel_type.value)


@dataclass
class RelationshipStats:
    """Statistics for a relationship network."""
    total_characters: int = 0
    total_relationships: int = 0
    relationship_counts: Dict[str, int] = field(default_factory=dict)
    category_counts: Dict[str, int] = field(default_factory=dict)
    average_strength: float = 0.0
    close_relationships: int = 0
    hostile_relationships: int = 0
    improving_trends: int = 0
    declining_trends: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "total_characters": self.total_characters,
            "total_relationships": self.total_relationships,
            "relationship_counts": self.relationship_counts,
            "category_counts": self.category_counts,
            "average_strength": self.average_strength,
            "close_relationships": self.close_relationships,
            "hostile_relationships": self.hostile_relationships,
            "improving_trends": self.improving_trends,
            "declining_trends": self.declining_trends
        }


class RelationshipNetwork:
    """
    Manages relationships between characters in a story.
    
    Provides:
    - Relationship creation and management
    - Querying by character, type, strength
    - Evolution tracking
    - Statistics generation
    - Visualization data export
    """
    
    def __init__(self, story_id: str = "default"):
        """
        Initialize the relationship network.
        
        Args:
            story_id: Identifier for the story/project
        """
        self.story_id = story_id
        self.characters: Dict[str, CharacterNode] = {}
        self.relationships: Dict[tuple, CharacterRelationship] = {}
        
        # Indexes for fast querying
        self._by_character: Dict[str, Set[tuple]] = defaultdict(set)
        self._by_type: Dict[RelationshipType, Set[tuple]] = defaultdict(set)
        self._by_category: Dict[RelationshipCategory, Set[tuple]] = defaultdict(set)
        self._by_strength: Dict[RelationshipStrength, Set[tuple]] = defaultdict(set)
        
        # Event timeline
        self.all_events: List[RelationshipEvent] = []
        
        # Metadata
        self.created_at = datetime.now()
        self.modified_at = datetime.now()
        
    # =========================================================================
    # Character Management
    # =========================================================================
    
    def add_character(
        self,
        character_id: str,
        name: str,
        archetype: str = "",
        is_protagonist: bool = False,
        is_antagonist: bool = False,
        **kwargs
    ) -> CharacterNode:
        """
        Add a character to the network.
        
        Args:
            character_id: Unique identifier
            name: Character name
            archetype: Character archetype
            is_protagonist: Whether this is a main character
            is_antagonist: Whether this is the antagonist
            **kwargs: Additional metadata
            
        Returns:
            Created CharacterNode
        """
        if character_id in self.characters:
            logger.warning(f"Character {character_id} already exists, updating")
        
        node = CharacterNode(
            character_id=character_id,
            name=name,
            archetype=archetype,
            is_protagonist=is_protagonist,
            is_antagonist=is_antagonist,
            metadata=kwargs
        )
        
        self.characters[character_id] = node
        self.modified_at = datetime.now()
        
        return node
    
    def get_character(self, character_id: str) -> Optional[CharacterNode]:
        """Get a character by ID."""
        return self.characters.get(character_id)
    
    def remove_character(self, character_id: str) -> bool:
        """
        Remove a character and all their relationships.
        
        Returns:
            True if character was removed
        """
        if character_id not in self.characters:
            return False
        
        # Remove all relationships involving this character
        keys_to_remove = [
            key for key in self.relationships.keys()
            if character_id in key
        ]
        
        for key in keys_to_remove:
            self._remove_relationship_from_indexes(key)
            del self.relationships[key]
        
        # Remove from characters dict
        del self.characters[character_id]
        
        self.modified_at = datetime.now()
        return True
    
    # =========================================================================
    # Relationship Management
    # =========================================================================
    
    def add_relationship(
        self,
        character_id_1: str,
        character_id_2: str,
        relationship_type: RelationshipType,
        strength: RelationshipStrength = RelationshipStrength.MODERATE,
        description: str = "",
        first_met: Optional[datetime] = None,
        bidirectional: bool = True
    ) -> Optional[CharacterRelationship]:
        """
        Add a relationship between two characters.
        
        Args:
            character_id_1: First character ID
            character_id_2: Second character ID
            relationship_type: Type of relationship
            strength: Relationship strength
            description: Relationship description
            first_met: When they first met
            bidirectional: Whether relationship is symmetric
            
        Returns:
            Created CharacterRelationship or None if invalid
        """
        # Validate characters exist
        if character_id_1 not in self.characters:
            logger.error(f"Character {character_id_1} not found")
            return None
        if character_id_2 not in self.characters:
            logger.error(f"Character {character_id_2} not found")
            return None
        
        # Check if relationship already exists
        pair = tuple(sorted([character_id_1, character_id_2]))
        if pair in self.relationships:
            logger.warning(f"Relationship already exists for {pair}")
            return None
        
        # Check if asymmetric
        is_symmetric = get_symmetric_relationship(relationship_type)
        
        # Create relationship
        relationship = CharacterRelationship(
            character_id_1=character_id_1,
            character_id_2=character_id_2,
            relationship_type=relationship_type,
            strength=strength,
            description=description,
            first_met=first_met or datetime.now()
        )
        
        # Add to network
        self.relationships[pair] = relationship
        self._add_relationship_to_indexes(relationship, pair)
        
        # Update character nodes
        self.characters[character_id_1].add_relationship(relationship_type)
        self.characters[character_id_2].add_relationship(relationship_type)
        
        self.modified_at = datetime.now()
        
        return relationship
    
    def get_relationship(
        self,
        character_id_1: str,
        character_id_2: str
    ) -> Optional[CharacterRelationship]:
        """Get the relationship between two characters."""
        pair = tuple(sorted([character_id_1, character_id_2]))
        return self.relationships.get(pair)
    
    def update_relationship_strength(
        self,
        character_id_1: str,
        character_id_2: str,
        new_strength: RelationshipStrength
    ) -> bool:
        """Update the strength of a relationship."""
        relationship = self.get_relationship(character_id_1, character_id_2)
        if not relationship:
            return False
        
        # Remove from strength index
        old_pair = tuple(sorted([character_id_1, character_id_2]))
        self._by_strength[relationship.strength].discard(old_pair)
        
        # Update
        relationship.strength = new_strength
        relationship.updated_at = datetime.now()
        
        # Add to new strength index
        self._by_strength[new_strength].add(old_pair)
        self.modified_at = datetime.now()
        
        return True
    
    def add_relationship_event(
        self,
        character_id_1: str,
        character_id_2: str,
        event_type: RelationshipEventType,
        description: str,
        impact: float,
        scene_id: Optional[str] = None,
        timestamp: Optional[datetime] = None,
        **kwargs
    ) -> Optional[RelationshipEvent]:
        """
        Add an event that affects a relationship.
        
        Args:
            character_id_1: First character
            character_id_2: Second character
            event_type: Type of event
            description: Event description
            impact: Impact on relationship (-1.0 to 1.0)
            scene_id: Scene where event occurred
            timestamp: When event occurred
            **kwargs: Additional event details
            
        Returns:
            Created RelationshipEvent or None
        """
        relationship = self.get_relationship(character_id_1, character_id_2)
        if not relationship:
            logger.error(f"No relationship found between {character_id_1} and {character_id_2}")
            return None
        
        event = RelationshipEvent(
            event_type=event_type,
            timestamp=timestamp or datetime.now(),
            description=description,
            impact=impact,
            scene_id=scene_id,
            characters_involved=[character_id_1, character_id_2],
            details=kwargs
        )
        
        relationship.add_event(event)
        self.all_events.append(event)
        self.modified_at = datetime.now()
        
        return event
    
    # =========================================================================
    # Query Methods
    # =========================================================================
    
    def get_character_relationships(
        self,
        character_id: str,
        relationship_type: Optional[RelationshipType] = None,
        min_strength: Optional[RelationshipStrength] = None,
        include_negative: bool = True
    ) -> List[CharacterRelationship]:
        """
        Get all relationships for a character.
        
        Args:
            character_id: Character to query
            relationship_type: Filter by type
            min_strength: Minimum strength filter
            include_negative: Include hostile relationships
            
        Returns:
            List of matching relationships
        """
        pairs = self._by_character.get(character_id, set())
        results = []
        
        for pair in pairs:
            rel = self.relationships[pair]
            
            # Apply filters
            if relationship_type and rel.relationship_type != relationship_type:
                continue
            
            if min_strength and rel.strength.value < min_strength.value:
                continue
            
            if not include_negative and rel.strength.value < 0:
                continue
            
            results.append(rel)
        
        return sorted(results, key=lambda r: r.strength.value, reverse=True)
    
    def get_relationships_by_type(
        self,
        relationship_type: RelationshipType
    ) -> List[CharacterRelationship]:
        """Get all relationships of a specific type."""
        pairs = self._by_type.get(relationship_type, set())
        return [self.relationships[p] for p in pairs]
    
    def get_relationships_by_category(
        self,
        category: RelationshipCategory
    ) -> List[CharacterRelationship]:
        """Get all relationships in a category."""
        pairs = self._by_category.get(category, set())
        return [self.relationships[p] for p in pairs]
    
    def get_close_relationships(
        self,
        character_id: Optional[str] = None
    ) -> List[CharacterRelationship]:
        """
        Get all close relationships (strength >= STRONG).
        
        Args:
            character_id: Optional character filter
            
        Returns:
            List of close relationships
        """
        if character_id:
            return [
                r for r in self.get_character_relationships(character_id)
                if r.is_close
            ]
        
        return [
            r for r in self.relationships.values()
            if r.is_close
        ]
    
    def get_hostile_relationships(
        self,
        character_id: Optional[str] = None
    ) -> List[CharacterRelationship]:
        """
        Get all hostile relationships.
        
        Args:
            character_id: Optional character filter
            
        Returns:
            List of hostile relationships
        """
        if character_id:
            return [
                r for r in self.get_character_relationships(character_id, include_negative=True)
                if r.is_hostile
            ]
        
        return [
            r for r in self.relationships.values()
            if r.is_hostile
        ]
    
    def get_characters_with_relationships(
        self,
        relationship_type: Optional[RelationshipType] = None
    ) -> List[str]:
        """Get all characters that have relationships."""
        chars = set()
        for rel in self.relationships.values():
            chars.add(rel.character_id_1)
            chars.add(rel.character_id_2)
        return list(chars)
    
    def get_isolated_characters(self) -> List[str]:
        """Get characters with no relationships."""
        all_related = set(self.get_characters_with_relationships())
        all_characters = set(self.characters.keys())
        return list(all_characters - all_related)
    
    # =========================================================================
    # Analysis Methods
    # =========================================================================
    
    def get_stats(self) -> RelationshipStats:
        """Calculate statistics for the network."""
        stats = RelationshipStats()
        
        stats.total_characters = len(self.characters)
        stats.total_relationships = len(self.relationships)
        
        # Count by type
        for rel in self.relationships.values():
            type_name = rel.relationship_type.value
            stats.relationship_counts[type_name] = \
                stats.relationship_counts.get(type_name, 0) + 1
            
            category = rel.relationship_type.get_category()
            cat_name = category.value
            stats.category_counts[cat_name] = \
                stats.category_counts.get(cat_name, 0) + 1
        
        # Average strength
        if self.relationships:
            strengths = [r.strength.value for r in self.relationships.values()]
            stats.average_strength = sum(strengths) / len(strengths)
        
        # Count special types
        for rel in self.relationships.values():
            if rel.is_close:
                stats.close_relationships += 1
            if rel.is_hostile:
                stats.hostile_relationships += 1
            
            trend = rel.calculate_trend()
            if trend == "improving":
                stats.improving_trends += 1
            elif trend == "declining":
                stats.declining_trends += 1
        
        return stats
    
    def find_clusters(self) -> Dict[str, List[str]]:
        """
        Find character clusters based on relationships.
        
        Returns:
            Dictionary mapping cluster_id to list of character IDs
        """
        # Simple BFS-based clustering
        visited = set()
        clusters = {}
        
        for char_id in self.characters:
            if char_id in visited:
                continue
            
            # Start new cluster
            cluster_id = f"cluster_{len(clusters)}"
            cluster_chars = []
            
            # BFS to find connected characters
            queue = [char_id]
            while queue:
                current = queue.pop(0)
                if current in visited:
                    continue
                
                visited.add(current)
                cluster_chars.append(current)
                
                # Add connected characters
                for rel in self.get_character_relationships(current):
                    for neighbor in [rel.character_id_1, rel.character_id_2]:
                        if neighbor != current and neighbor not in visited:
                            queue.append(neighbor)
            
            clusters[cluster_id] = cluster_chars
        
        # Update character nodes with cluster info
        for cluster_id, chars in clusters.items():
            for char_id in chars:
                if char_id in self.characters:
                    self.characters[char_id].cluster_id = cluster_id
        
        return clusters
    
    def find_key_relationships(self, top_n: int = 5) -> List[CharacterRelationship]:
        """
        Find the most important relationships.
        
        Based on: strength, number of events, recency of interaction
        
        Args:
            top_n: Number of relationships to return
            
        Returns:
            List of most important relationships
        """
        scored = []
        
        for rel in self.relationships.values():
            score = 0.0
            
            # Strength contribution (0-5)
            score += abs(rel.strength.value) * 2
            
            # Event history contribution
            score += min(len(rel.events), 10) * 0.5
            
            # Recency contribution (if recently interacted)
            if rel.last_interaction:
                days_since = (datetime.now() - rel.last_interaction).days
                if days_since < 7:
                    score += 2
                elif days_since < 30:
                    score += 1
            
            # Trend bonus
            if rel.calculate_trend() == "improving":
                score += 1
            
            scored.append((rel, score))
        
        # Sort by score and return top N
        scored.sort(key=lambda x: x[1], reverse=True)
        return [rel for rel, _ in scored[:top_n]]
    
    def predict_conflicts(self) -> List[Dict[str, Any]]:
        """
        Predict potential conflicts based on relationships.
        
        Returns:
            List of potential conflicts with details
        """
        conflicts = []
        
        for rel in self.relationships.values():
            # Check for unstable relationships
            if rel.calculate_trend() == "volatile" and rel.strength.value > 0:
                conflicts.append({
                    "type": "unstable_relationship",
                    "characters": [rel.character_id_1, rel.character_id_2],
                    "relationship_type": rel.relationship_type.value,
                    "description": f"Volatile relationship between {rel.character_id_1} and {rel.character_id_2}",
                    "severity": "medium"
                })
            
            # Check for escalating tensions
            if rel.strength.value < -3 and rel.calculate_trend() == "declining":
                conflicts.append({
                    "type": "escalating_tension",
                    "characters": [rel.character_id_1, rel.character_id_2],
                    "relationship_type": rel.relationship_type.value,
                    "description": f"Escalating hostility between {rel.character_id_1} and {rel.character_id_2}",
                    "severity": "high"
                })
        
        return conflicts
    
    # =========================================================================
    # Serialization
    # =========================================================================
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize the network to a dictionary."""
        return {
            "story_id": self.story_id,
            "characters": {
                cid: {
                    "character_id": node.character_id,
                    "name": node.name,
                    "archetype": node.archetype,
                    "is_protagonist": node.is_protagonist,
                    "is_antagonist": node.is_antagonist,
                    "importance_score": node.importance_score,
                    "cluster_id": node.cluster_id,
                    "metadata": node.metadata
                }
                for cid, node in self.characters.items()
            },
            "relationships": {
                f"{r.character_id_1}_{r.character_id_2}": r.to_dict()
                for r in self.relationships.values()
            },
            "created_at": self.created_at.isoformat(),
            "modified_at": self.modified_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "RelationshipNetwork":
        """Deserialize from a dictionary."""
        network = cls(story_id=data.get("story_id", "default"))
        
        # Load characters
        for cid, cdata in data.get("characters", {}).items():
            network.add_character(
                character_id=cdata["character_id"],
                name=cdata["name"],
                archetype=cdata.get("archetype", ""),
                is_protagonist=cdata.get("is_protagonist", False),
                is_antagonist=cdata.get("is_antagonist", False),
                **cdata.get("metadata", {})
            )
        
        # Load relationships
        for key, rdata in data.get("relationships", {}).items():
            pair = (rdata["character_id_1"], rdata["character_id_2"])
            network.relationships[tuple(sorted(pair))] = \
                CharacterRelationship.from_dict(rdata)
        
        # Rebuild indexes
        for pair, rel in network.relationships.items():
            network._add_relationship_to_indexes(rel, pair)
        
        network.created_at = datetime.fromisoformat(data.get("created_at", datetime.now().isoformat()))
        network.modified_at = datetime.fromisoformat(data.get("modified_at", datetime.now().isoformat()))
        
        return network
    
    # =========================================================================
    # Index Management
    # =========================================================================
    
    def _add_relationship_to_indexes(
        self,
        relationship: CharacterRelationship,
        pair: tuple
    ) -> None:
        """Add relationship to all indexes."""
        self._by_character[relationship.character_id_1].add(pair)
        self._by_character[relationship.character_id_2].add(pair)
        self._by_type[relationship.relationship_type].add(pair)
        self._by_category[relationship.relationship_type.get_category()].add(pair)
        self._by_strength[relationship.strength].add(pair)
    
    def _remove_relationship_from_indexes(self, pair: tuple) -> None:
        """Remove relationship from all indexes."""
        if pair not in self.relationships:
            return
        
        rel = self.relationships[pair]
        self._by_character[rel.character_id_1].discard(pair)
        self._by_character[rel.character_id_2].discard(pair)
        self._by_type[rel.relationship_type].discard(pair)
        self._by_category[rel.relationship_type.get_category()].discard(pair)
        self._by_strength[rel.strength].discard(pair)

