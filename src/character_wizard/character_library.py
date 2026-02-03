"""
Character Library Management System

This module provides comprehensive character storage, search, and organization
capabilities for the StoryCore-Engine character wizard.

Features:
- Character CRUD operations with persistence
- Search and filter by multiple criteria
- Tagging system with autocomplete
- Import/export in multiple formats
- Character versioning with history

Author: StoryCore-Engine Team
Version: 1.0.0
"""

import json
import logging
import os
import re
import uuid
import yaml
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Callable, TypeVar, Generic
from pathlib import Path
from enum import Enum

logger = logging.getLogger(__name__)


class CharacterSortField(Enum):
    """Fields available for sorting characters."""
    NAME = "name"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
    ARCHETYPE = "archetype"
    IMPORTANCE = "importance_score"


class CharacterSortOrder(Enum):
    """Sort order options."""
    ASC = "asc"
    DESC = "desc"


@dataclass
class Tag:
    """Character tag."""
    name: str
    color: str = "#6366f1"
    category: str = "custom"
    created_at: datetime = field(default_factory=datetime.now)
    
    def __hash__(self):
        return hash(self.name)
    
    def __eq__(self, other):
        if isinstance(other, Tag):
            return self.name == other.name
        return False


@dataclass
class CharacterVersion:
    """A version of a character."""
    version_id: str
    character_data: Dict[str, Any]
    created_at: datetime
    created_by: str = "system"
    change_summary: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "version_id": self.version_id,
            "character_data": self.character_data,
            "created_at": self.created_at.isoformat(),
            "created_by": self.created_by,
            "change_summary": self.change_summary
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CharacterVersion":
        return cls(
            version_id=data["version_id"],
            character_data=data["character_data"],
            created_at=datetime.fromisoformat(data["created_at"]),
            created_by=data.get("created_by", "system"),
            change_summary=data.get("change_summary", "")
        )


@dataclass
class StoredCharacter:
    """A stored character with metadata."""
    # Core identity
    id: str
    name: str
    archetype: str = ""
    role: str = "supporting"
    
    # Personality (Big Five)
    openness: float = 0.5
    conscientiousness: float = 0.5
    extraversion: float = 0.5
    agreeableness: float = 0.5
    neuroticism: float = 0.5
    
    # Derived traits
    primary_traits: List[str] = field(default_factory=list)
    strengths: List[str] = field(default_factory=list)
    flaws: List[str] = field(default_factory=list)
    
    # Goals and motivations
    external_goal: str = ""
    internal_need: str = ""
    fears: List[str] = field(default_factory=list)
    values: List[str] = field(default_factory=list)
    
    # Background
    backstory: str = ""
    skills: List[str] = field(default_factory=list)
    age: str = "adult"
    gender: str = ""
    
    # Appearance (from visual_generator)
    clothing_style: str = ""
    color_palette: str = ""
    accessories: List[str] = field(default_factory=list)
    
    # Relationships
    relationships: List[Dict[str, Any]] = field(default_factory=list)
    
    # Tags
    tags: Set[str] = field(default_factory=set)
    
    # Metadata
    is_favorite: bool = False
    importance_score: float = 0.5
    project_id: str = "default"
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    # Version tracking
    version: int = 1
    version_history: List[CharacterVersion] = field(default_factory=list)
    
    # Custom fields
    custom_data: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if isinstance(self.tags, list):
            self.tags = set(self.tags)
    
    # =========================================================================
    # Version Control
    # =========================================================================
    
    def save_version(
        self,
        change_summary: str = "",
        created_by: str = "system"
    ) -> CharacterVersion:
        """Save current state as a new version."""
        version = CharacterVersion(
            version_id=str(uuid.uuid4()),
            character_data=self.to_dict(),
            created_at=datetime.now(),
            created_by=created_by,
            change_summary=change_summary
        )
        self.version_history.append(version)
        self.version = len(self.version_history)
        self.updated_at = datetime.now()
        return version
    
    def get_version(self, version_num: int) -> Optional[CharacterVersion]:
        """Get a specific version."""
        if 1 <= version_num <= len(self.version_history):
            return self.version_history[version_num - 1]
        return None
    
    def rollback(self, version_num: int) -> bool:
        """Rollback to a specific version."""
        version = self.get_version(version_num)
        if version:
            # Restore character data (excluding version history)
            data = version.character_data.copy()
            data.pop("version_history", None)
            data.pop("version", None)
            
            for key, value in data.items():
                if hasattr(self, key):
                    setattr(self, key, value)
            
            self.version = version_num
            self.updated_at = datetime.now()
            return True
        return False
    
    # =========================================================================
    # Serialization
    # =========================================================================
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        data = asdict(self)
        # Convert tags set to list
        data["tags"] = list(self.tags)
        # Convert datetime objects
        data["created_at"] = self.created_at.isoformat()
        data["updated_at"] = self.updated_at.isoformat()
        # Convert version history
        data["version_history"] = [v.to_dict() for v in self.version_history]
        return data
    
    def to_json(self, indent: int = 2) -> str:
        """Serialize to JSON string."""
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=False)
    
    def to_yaml(self) -> str:
        """Serialize to YAML string."""
        return yaml.dump(self.to_dict(), allow_unicode=True, sort_keys=False)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "StoredCharacter":
        """Create from dictionary."""
        # Handle datetime fields
        if isinstance(data.get("created_at"), str):
            data["created_at"] = datetime.fromisoformat(data["created_at"])
        if isinstance(data.get("updated_at"), str):
            data["updated_at"] = datetime.fromisoformat(data["updated_at"])
        
        # Handle tags
        if isinstance(data.get("tags"), list):
            data["tags"] = set(data["tags"])
        
        # Handle version history
        if "version_history" in data:
            data["version_history"] = [
                CharacterVersion.from_dict(v)
                for v in data["version_history"]
            ]
        
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})
    
    @classmethod
    def from_json(cls, json_str: str) -> "StoredCharacter":
        """Deserialize from JSON string."""
        data = json.loads(json_str)
        return cls.from_dict(data)
    
    @classmethod
    def from_yaml(cls, yaml_str: str) -> "StoredCharacter":
        """Deserialize from YAML string."""
        data = yaml.safe_load(yaml_str)
        return cls.from_dict(data)
    
    # =========================================================================
    # Tag Management
    # =========================================================================
    
    def add_tag(self, tag: str) -> None:
        """Add a tag to the character."""
        self.tags.add(tag.lower().strip())
        self.updated_at = datetime.now()
    
    def remove_tag(self, tag: str) -> bool:
        """Remove a tag from the character."""
        tag_lower = tag.lower().strip()
        if tag_lower in self.tags:
            self.tags.remove(tag_lower)
            self.updated_at = datetime.now()
            return True
        return False
    
    def has_tag(self, tag: str) -> bool:
        """Check if character has a specific tag."""
        return tag.lower().strip() in self.tags
    
    def clear_tags(self) -> None:
        """Remove all tags."""
        self.tags.clear()
        self.updated_at = datetime.now()


@dataclass
class SearchFilters:
    """Filters for character search."""
    name_pattern: Optional[str] = None
    archetype: Optional[str] = None
    role: Optional[str] = None
    tags: Optional[List[str]] = None
    tags_any: bool = False  # Match any tag vs all tags
    min_openness: Optional[float] = None
    max_openness: Optional[float] = None
    min_conscientiousness: Optional[float] = None
    max_conscientiousness: Optional[float] = None
    min_extraversion: Optional[float] = None
    max_extraversion: Optional[float] = None
    min_agreeableness: Optional[float] = None
    max_agreeableness: Optional[float] = None
    min_neuroticism: Optional[float] = None
    max_neuroticism: Optional[float] = None
    is_favorite: Optional[bool] = None
    min_importance: Optional[float] = None
    max_importance: Optional[float] = None
    project_id: Optional[str] = None
    has_backstory: Optional[bool] = None
    traits_contains: Optional[List[str]] = None
    skills_contains: Optional[List[str]] = None
    
    def matches(self, character: StoredCharacter) -> bool:
        """Check if character matches all filters."""
        # Name pattern
        if self.name_pattern:
            pattern = self.name_pattern.lower()
            if pattern not in character.name.lower():
                return False
        
        # Archetype
        if self.archetype and character.archetype != self.archetype:
            return False
        
        # Role
        if self.role and character.role != self.role:
            return False
        
        # Tags
        if self.tags:
            char_tags = {t.lower() for t in character.tags}
            tag_list = [t.lower() for t in self.tags]
            if self.tags_any:
                if not any(t in char_tags for t in tag_list):
                    return False
            else:
                if not all(t in char_tags for t in tag_list):
                    return False
        
        # Personality traits
        if self.min_openness is not None and character.openness < self.min_openness:
            return False
        if self.max_openness is not None and character.openness > self.max_openness:
            return False
        if self.min_conscientiousness is not None and character.conscientiousness < self.min_conscientiousness:
            return False
        if self.max_conscientiousness is not None and character.conscientiousness > self.max_conscientiousness:
            return False
        if self.min_extraversion is not None and character.extraversion < self.min_extraversion:
            return False
        if self.max_extraversion is not None and character.extraversion > self.max_extraversion:
            return False
        if self.min_agreeableness is not None and character.agreeableness < self.min_agreeableness:
            return False
        if self.max_agreeableness is not None and character.agreeableness > self.max_agreeableness:
            return False
        if self.min_neuroticism is not None and character.neuroticism < self.min_neuroticism:
            return False
        if self.max_neuroticism is not None and character.neuroticism > self.max_neuroticism:
            return False
        
        # Favorite
        if self.is_favorite is not None and character.is_favorite != self.is_favorite:
            return False
        
        # Importance
        if self.min_importance is not None and character.importance_score < self.min_importance:
            return False
        if self.max_importance is not None and character.importance_score > self.max_importance:
            return False
        
        # Project
        if self.project_id and character.project_id != self.project_id:
            return False
        
        # Backstory
        if self.has_backstory is not None:
            has_content = bool(character.backstory.strip())
            if self.has_backstory != has_content:
                return False
        
        # Traits
        if self.traits_contains:
            char_traits = {t.lower() for t in character.primary_traits}
            if not any(t.lower() in char_traits for t in self.traits_contains):
                return False
        
        # Skills
        if self.skills_contains:
            char_skills = {s.lower() for s in character.skills}
            if not any(s.lower() in char_skills for s in self.skills_contains):
                return False
        
        return True


class CharacterLibrary:
    """
    Manages a collection of characters with storage, search, and organization.
    """
    
    def __init__(
        self,
        storage_path: Optional[str] = None,
        auto_save: bool = True
    ):
        """
        Initialize the character library.
        
        Args:
            storage_path: Path to storage directory
            auto_save: Whether to auto-save on changes
        """
        self.storage_path = storage_path
        self.auto_save = auto_save
        
        # Character storage
        self._characters: Dict[str, StoredCharacter] = {}
        
        # Tag registry
        self._tag_registry: Dict[str, Tag] = {}
        
        # Indexes for fast searching
        self._name_index: Dict[str, Set[str]] = {}  # Lower name -> character IDs
        self._archetype_index: Dict[str, Set[str]] = {}
        self._tag_index: Dict[str, Set[str]] = {}
        
        # Statistics
        self._stats: Dict[str, Any] = {}
        
        # Load existing data if path provided
        if storage_path:
            self._ensure_storage_dir()
            self.load_all()
    
    # =========================================================================
    # CRUD Operations
    # =========================================================================
    
    def add_character(
        self,
        character: StoredCharacter,
        auto_version: bool = True
    ) -> StoredCharacter:
        """
        Add a character to the library.
        
        Args:
            character: Character to add
            auto_version: Whether to create initial version
            
        Returns:
            Added character
        """
        if auto_version and character.version == 0:
            character.save_version("Initial creation", "system")
        
        self._characters[character.id] = character
        self._index_character(character)
        self._update_stats()
        
        if self.auto_save:
            self._save_character(character)
        
        return character
    
    def get_character(self, character_id: str) -> Optional[StoredCharacter]:
        """Get a character by ID."""
        return self._characters.get(character_id)
    
    def update_character(
        self,
        character_id: str,
        updates: Dict[str, Any],
        change_summary: str = "Updated character"
    ) -> Optional[StoredCharacter]:
        """
        Update a character's fields.
        
        Args:
            character_id: ID of character to update
            updates: Dictionary of field -> value
            change_summary: Description of changes
            
        Returns:
            Updated character or None if not found
        """
        character = self.get_character(character_id)
        if not character:
            return None
        
        # Save version before updating
        character.save_version(change_summary, "user")
        
        # Apply updates
        for field_name, value in updates.items():
            if hasattr(character, field_name):
                setattr(character, field_name, value)
        
        character.updated_at = datetime.now()
        
        # Re-index
        self._reindex_character(character)
        self._update_stats()
        
        if self.auto_save:
            self._save_character(character)
        
        return character
    
    def delete_character(self, character_id: str) -> bool:
        """
        Delete a character from the library.
        
        Returns:
            True if deleted, False if not found
        """
        if character_id not in self._characters:
            return False
        
        character = self._characters[character_id]
        
        # Remove from indexes
        self._remove_from_indexes(character)
        
        # Remove from storage
        del self._characters[character_id]
        
        # Remove file if using file storage
        if self.storage_path:
            file_path = self._get_character_path(character_id)
            if file_path.exists():
                file_path.unlink()
        
        self._update_stats()
        return True
    
    def duplicate_character(
        self,
        character_id: str,
        new_name: Optional[str] = None
    ) -> Optional[StoredCharacter]:
        """
        Create a copy of a character.
        
        Args:
            character_id: ID of character to duplicate
            new_name: Name for the new character (default: "Copy of X")
            
        Returns:
            New character or None if original not found
        """
        original = self.get_character(character_id)
        if not original:
            return None
        
        # Create new character data
        new_data = original.to_dict()
        new_data["id"] = str(uuid.uuid4())
        new_data["name"] = new_name or f"Copy of {original.name}"
        new_data["created_at"] = datetime.now()
        new_data["updated_at"] = datetime.now()
        new_data["version"] = 0
        new_data["version_history"] = []
        
        new_character = StoredCharacter.from_dict(new_data)
        return self.add_character(new_character)
    
    # =========================================================================
    # Search and Filter
    # =========================================================================
    
    def search(
        self,
        query: str,
        limit: Optional[int] = None,
        offset: int = 0
    ) -> List[StoredCharacter]:
        """
        Search characters by name (simple text search).
        
        Args:
            query: Search query
            limit: Maximum results
            offset: Results offset
            
        Returns:
            Matching characters
        """
        query_lower = query.lower()
        results = [
            c for c in self._characters.values()
            if query_lower in c.name.lower()
            or query_lower in c.backstory.lower()
            or any(query_lower in t for t in c.primary_traits)
        ]
        
        # Sort by name
        results.sort(key=lambda c: c.name)
        
        # Apply pagination
        if offset > 0:
            results = results[offset:]
        if limit is not None:
            results = results[:limit]
        
        return results
    
    def filter(
        self,
        filters: SearchFilters,
        limit: Optional[int] = None,
        offset: int = 0
    ) -> List[StoredCharacter]:
        """
        Filter characters with detailed criteria.
        
        Args:
            filters: SearchFilters object with criteria
            limit: Maximum results
            offset: Results offset
            
        Returns:
            Matching characters
        """
        results = [c for c in self._characters.values() if filters.matches(c)]
        
        # Sort by updated_at (most recent first)
        results.sort(key=lambda c: c.updated_at, reverse=True)
        
        # Apply pagination
        if offset > 0:
            results = results[offset:]
        if limit is not None:
            results = results[:limit]
        
        return results
    
    def find_by_name(self, name: str) -> List[StoredCharacter]:
        """Find characters by exact or partial name match."""
        name_lower = name.lower()
        return [
            c for c in self._characters.values()
            if name_lower in c.name.lower()
        ]
    
    def find_by_archetype(self, archetype: str) -> List[StoredCharacter]:
        """Find all characters of a specific archetype."""
        return [
            c for c in self._characters.values()
            if c.archetype.lower() == archetype.lower()
        ]
    
    def find_by_tag(self, tag: str) -> List[StoredCharacter]:
        """Find all characters with a specific tag."""
        tag_lower = tag.lower()
        return [
            c for c in self._characters.values()
            if tag_lower in {t.lower() for t in c.tags}
        ]
    
    def find_favorites(self) -> List[StoredCharacter]:
        """Find all favorited characters."""
        return [c for c in self._characters.values() if c.is_favorite]
    
    def get_all_tags(self) -> List[str]:
        """Get all unique tags in the library."""
        tags = set()
        for character in self._characters.values():
            tags.update(t.lower() for t in character.tags)
        return sorted(tags)
    
    def get_tag_suggestions(self, prefix: str) -> List[str]:
        """Get tag suggestions matching a prefix."""
        prefix_lower = prefix.lower()
        all_tags = self.get_all_tags()
        return [t for t in all_tags if t.startswith(prefix_lower)]
    
    # =========================================================================
    # Sorting
    # =========================================================================
    
    def get_sorted(
        self,
        field: CharacterSortField = CharacterSortField.NAME,
        order: CharacterSortOrder = CharacterSortOrder.ASC,
        limit: Optional[int] = None
    ) -> List[StoredCharacter]:
        """
        Get all characters sorted by a field.
        
        Args:
            field: Field to sort by
            order: Sort order
            limit: Maximum results
            
        Returns:
            Sorted list of characters
        """
        reverse = order == CharacterSortOrder.DESC
        
        if field == CharacterSortField.NAME:
            results = sorted(
                self._characters.values(),
                key=lambda c: c.name.lower(),
                reverse=reverse
            )
        elif field == CharacterSortField.CREATED_AT:
            results = sorted(
                self._characters.values(),
                key=lambda c: c.created_at,
                reverse=reverse
            )
        elif field == CharacterSortField.UPDATED_AT:
            results = sorted(
                self._characters.values(),
                key=lambda c: c.updated_at,
                reverse=reverse
            )
        elif field == CharacterSortField.ARCHETYPE:
            results = sorted(
                self._characters.values(),
                key=lambda c: c.archetype.lower(),
                reverse=reverse
            )
        elif field == CharacterSortField.IMPORTANCE:
            results = sorted(
                self._characters.values(),
                key=lambda c: c.importance_score,
                reverse=reverse
            )
        else:
            results = list(self._characters.values())
        
        if limit:
            results = results[:limit]
        
        return results
    
    # =========================================================================
    # Statistics
    # =========================================================================
    
    def get_stats(self) -> Dict[str, Any]:
        """Get library statistics."""
        return self._stats.copy()
    
    def _update_stats(self) -> None:
        """Update library statistics."""
        characters = list(self._characters.values())
        
        if not characters:
            self._stats = {
                "total_characters": 0,
                "by_archetype": {},
                "by_role": {},
                "avg_importance": 0,
                "favorite_count": 0,
                "tag_counts": {},
                "recent_additions": 0,
                "recent_updates": 0
            }
            return
        
        # Count by archetype
        by_archetype: Dict[str, int] = {}
        by_role: Dict[str, int] = {}
        tag_counts: Dict[str, int] = {}
        
        now = datetime.now()
        week_ago = now.timestamp() - (7 * 24 * 60 * 60)
        recent_additions = 0
        recent_updates = 0
        
        for c in characters:
            # Archetype
            arch = c.archetype or "unknown"
            by_archetype[arch] = by_archetype.get(arch, 0) + 1
            
            # Role
            role = c.role or "supporting"
            by_role[role] = by_role.get(role, 0) + 1
            
            # Tags
            for tag in c.tags:
                tag_lower = tag.lower()
                tag_counts[tag_lower] = tag_counts.get(tag_lower, 0) + 1
            
            # Favorites
            if c.is_favorite:
                recent_updates += 1  # Count favorites as updates
            
            # Recency
            if c.created_at.timestamp() > week_ago:
                recent_additions += 1
            if c.updated_at.timestamp() > week_ago:
                recent_updates += 1
        
        # Calculate averages
        avg_importance = sum(c.importance_score for c in characters) / len(characters)
        
        self._stats = {
            "total_characters": len(characters),
            "by_archetype": by_archetype,
            "by_role": by_role,
            "avg_importance": round(avg_importance, 2),
            "favorite_count": sum(1 for c in characters if c.is_favorite),
            "tag_counts": tag_counts,
            "recent_additions": recent_additions,
            "recent_updates": recent_updates
        }
    
    # =========================================================================
    # Import/Export
    # =========================================================================
    
    def export_all(
        self,
        format: str = "json",
        path: Optional[str] = None
    ) -> str:
        """
        Export all characters to a string.
        
        Args:
            format: Export format ("json" or "yaml")
            path: Optional file path to save
            
        Returns:
            Exported data as string
        """
        data = {
            "exported_at": datetime.now().isoformat(),
            "character_count": len(self._characters),
            "characters": [
                c.to_dict() for c in self._characters.values()
            ]
        }
        
        if format == "json":
            result = json.dumps(data, indent=2, ensure_ascii=False)
        else:
            result = yaml.dump(data, allow_unicode=True, sort_keys=False)
        
        if path:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(result)
        
        return result
    
    def export_character(
        self,
        character_id: str,
        format: str = "json"
    ) -> Optional[str]:
        """
        Export a single character.
        
        Args:
            character_id: ID of character to export
            format: Export format
            
        Returns:
            Exported data or None if not found
        """
        character = self.get_character(character_id)
        if not character:
            return None
        
        if format == "json":
            return character.to_json()
        elif format == "yaml":
            return character.to_yaml()
        
        return None
    
    def import_character(
        self,
        data: str,
        format: str = "json",
        auto_version: bool = True
    ) -> Optional[StoredCharacter]:
        """
        Import a character from a string.
        
        Args:
            data: Character data string
            format: Data format
            auto_version: Whether to create initial version
            
        Returns:
            Imported character or None if invalid
        """
        try:
            if format == "json":
                character = StoredCharacter.from_json(data)
            elif format == "yaml":
                character = StoredCharacter.from_yaml(data)
            else:
                return None
            
            # Check for duplicate ID
            if character.id in self._characters:
                # Generate new ID
                character.id = str(uuid.uuid4())
            
            return self.add_character(character, auto_version=auto_version)
        except Exception as e:
            logger.error(f"Failed to import character: {e}")
            return None
    
    def import_from_dict(
        self,
        data: Dict[str, Any],
        auto_version: bool = True
    ) -> Optional[StoredCharacter]:
        """Import a character from a dictionary."""
        try:
            character = StoredCharacter.from_dict(data)
            
            if character.id in self._characters:
                character.id = str(uuid.uuid4())
            
            return self.add_character(character, auto_version=auto_version)
        except Exception as e:
            logger.error(f"Failed to import character: {e}")
            return None
    
    # =========================================================================
    # Bulk Operations
    # =========================================================================
    
    def add_tag_to_all(self, tag: str) -> int:
        """Add a tag to all characters."""
        count = 0
        for character in self._characters.values():
            if tag.lower() not in {t.lower() for t in character.tags}:
                character.add_tag(tag)
                count += 1
        
        if count > 0 and self.auto_save:
            self.save_all()
        
        return count
    
    def remove_tag_from_all(self, tag: str) -> int:
        """Remove a tag from all characters."""
        count = 0
        tag_lower = tag.lower()
        for character in self._characters.values():
            if character.remove_tag(tag_lower):
                count += 1
        
        if count > 0 and self.auto_save:
            self.save_all()
        
        return count
    
    def clear_favorites(self) -> int:
        """Remove favorite flag from all characters."""
        count = 0
        for character in self._characters.values():
            if character.is_favorite:
                character.is_favorite = False
                count += 1
        
        if count > 0 and self.auto_save:
            self.save_all()
        
        return count
    
    # =========================================================================
    # Persistence
    # =========================================================================
    
    def save_all(self) -> bool:
        """Save all characters to storage."""
        if not self.storage_path:
            return False
        
        try:
            self._ensure_storage_dir()
            for character in self._characters.values():
                self._save_character(character)
            return True
        except Exception as e:
            logger.error(f"Failed to save library: {e}")
            return False
    
    def load_all(self) -> int:
        """Load all characters from storage."""
        if not self.storage_path or not os.path.exists(self.storage_path):
            return 0
        
        try:
            count = 0
            for filename in os.listdir(self.storage_path):
                if filename.endswith('.json'):
                    file_path = os.path.join(self.storage_path, filename)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        character = StoredCharacter.from_dict(data)
                        self._characters[character.id] = character
                        self._index_character(character)
                        count += 1
                    except Exception as e:
                        logger.warning(f"Failed to load {filename}: {e}")
            
            self._update_stats()
            return count
        except Exception as e:
            logger.error(f"Failed to load library: {e}")
            return 0
    
    def _ensure_storage_dir(self) -> None:
        """Ensure storage directory exists."""
        if self.storage_path:
            Path(self.storage_path).mkdir(parents=True, exist_ok=True)
    
    def _get_character_path(self, character_id: str) -> Path:
        """Get file path for a character."""
        return Path(self.storage_path) / f"{character_id}.json"
    
    def _save_character(self, character: StoredCharacter) -> bool:
        """Save a single character to storage."""
        if not self.storage_path:
            return False
        
        try:
            file_path = self._get_character_path(character.id)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(character.to_json())
            return True
        except Exception as e:
            logger.error(f"Failed to save character {character.id}: {e}")
            return False
    
    # =========================================================================
    # Indexing
    # =========================================================================
    
    def _index_character(self, character: StoredCharacter) -> None:
        """Add character to search indexes."""
        # Name index
        name_lower = character.name.lower()
        for word in name_lower.split():
            if len(word) > 2:
                if word not in self._name_index:
                    self._name_index[word] = set()
                self._name_index[word].add(character.id)
        
        # Archetype index
        arch = character.archetype.lower()
        if arch:
            if arch not in self._archetype_index:
                self._archetype_index[arch] = set()
            self._archetype_index[arch].add(character.id)
        
        # Tag index
        for tag in character.tags:
            tag_lower = tag.lower()
            if tag_lower not in self._tag_index:
                self._tag_index[tag_lower] = set()
            self._tag_index[tag_lower].add(character.id)
    
    def _reindex_character(self, character: StoredCharacter) -> None:
        """Re-index a character (after update)."""
        self._remove_from_indexes(character)
        self._index_character(character)
    
    def _remove_from_indexes(self, character: StoredCharacter) -> None:
        """Remove character from all indexes."""
        # Name index
        name_lower = character.name.lower()
        for word in name_lower.split():
            if len(word) > 2 and word in self._name_index:
                self._name_index[word].discard(character.id)
                if not self._name_index[word]:
                    del self._name_index[word]
        
        # Archetype index
        arch = character.archetype.lower()
        if arch and arch in self._archetype_index:
            self._archetype_index[arch].discard(character.id)
        
        # Tag index
        for tag in character.tags:
            tag_lower = tag.lower()
            if tag_lower in self._tag_index:
                self._tag_index[tag_lower].discard(character.id)
                if not self._tag_index[tag_lower]:
                    del self._tag_index[tag_lower]
    
    # =========================================================================
    # Property Accessors
    # =========================================================================
    
    @property
    def character_count(self) -> int:
        """Get total number of characters."""
        return len(self._characters)
    
    @property
    def characters(self) -> List[StoredCharacter]:
        """Get all characters."""
        return list(self._characters.values())
    
    def __len__(self) -> int:
        """Get library size."""
        return len(self._characters)
    
    def __contains__(self, character_id: str) -> bool:
        """Check if character exists."""
        return character_id in self._characters
    
    def __iter__(self):
        """Iterate over characters."""
        return iter(self._characters.values())
    
    def __getitem__(self, character_id: str) -> Optional[StoredCharacter]:
        """Get character by ID."""
        return self._characters.get(character_id)

