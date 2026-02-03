"""
Knowledge API Data Models

This module defines data models for knowledge management operations including
adding, searching, updating, deleting knowledge items, building knowledge graphs,
verifying consistency, and exporting knowledge bases.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum


class KnowledgeType(str, Enum):
    """Types of knowledge items."""
    FACT = "fact"
    CONCEPT = "concept"
    RULE = "rule"
    RELATIONSHIP = "relationship"
    DEFINITION = "definition"
    EXAMPLE = "example"
    CONSTRAINT = "constraint"


class RelationshipType(str, Enum):
    """Types of relationships between knowledge items."""
    IS_A = "is_a"
    HAS_A = "has_a"
    PART_OF = "part_of"
    RELATED_TO = "related_to"
    DEPENDS_ON = "depends_on"
    CONTRADICTS = "contradicts"
    SUPPORTS = "supports"
    DERIVED_FROM = "derived_from"


class ConsistencyStatus(str, Enum):
    """Knowledge consistency status."""
    CONSISTENT = "consistent"
    INCONSISTENT = "inconsistent"
    UNKNOWN = "unknown"
    NEEDS_REVIEW = "needs_review"


class ExportFormat(str, Enum):
    """Knowledge export formats."""
    JSON = "json"
    YAML = "yaml"
    MARKDOWN = "markdown"
    CSV = "csv"
    RDF = "rdf"


@dataclass
class KnowledgeItem:
    """A single knowledge item."""
    id: str
    content: str
    knowledge_type: str
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    source: Optional[str] = None
    confidence: float = 1.0  # 0.0 to 1.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "content": self.content,
            "knowledge_type": self.knowledge_type,
            "tags": self.tags,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "source": self.source,
            "confidence": self.confidence,
        }


@dataclass
class KnowledgeRelationship:
    """A relationship between two knowledge items."""
    from_id: str
    to_id: str
    relationship_type: str
    strength: float = 1.0  # 0.0 to 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "from_id": self.from_id,
            "to_id": self.to_id,
            "relationship_type": self.relationship_type,
            "strength": self.strength,
            "metadata": self.metadata,
        }


@dataclass
class KnowledgeGraph:
    """A knowledge graph containing items and relationships."""
    items: List[KnowledgeItem]
    relationships: List[KnowledgeRelationship]
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "items": [item.to_dict() for item in self.items],
            "relationships": [rel.to_dict() for rel in self.relationships],
            "metadata": self.metadata,
        }


@dataclass
class KnowledgeAddRequest:
    """Request for adding knowledge items."""
    items: List[Dict[str, Any]]
    auto_link: bool = True  # Automatically create relationships
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class KnowledgeAddResult:
    """Result of adding knowledge items."""
    added_count: int
    items: List[KnowledgeItem]
    auto_linked_count: int = 0
    add_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class KnowledgeSearchRequest:
    """Request for searching knowledge base."""
    query: str
    knowledge_types: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    max_results: int = 10
    min_confidence: float = 0.0
    semantic_search: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class KnowledgeSearchResult:
    """Result of knowledge search."""
    query: str
    results: List[KnowledgeItem]
    total_count: int
    search_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class KnowledgeUpdateRequest:
    """Request for updating knowledge items."""
    item_id: str
    updates: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class KnowledgeUpdateResult:
    """Result of updating knowledge item."""
    updated: bool
    item: Optional[KnowledgeItem] = None
    update_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class KnowledgeDeleteRequest:
    """Request for deleting knowledge items."""
    item_ids: List[str]
    cascade: bool = False  # Delete related items
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class KnowledgeDeleteResult:
    """Result of deleting knowledge items."""
    deleted_count: int
    deleted_ids: List[str]
    cascaded_count: int = 0
    delete_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class KnowledgeGraphBuildRequest:
    """Request for building knowledge graph."""
    item_ids: Optional[List[str]] = None  # None = all items
    include_relationships: bool = True
    max_depth: int = 3
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class KnowledgeGraphBuildResult:
    """Result of building knowledge graph."""
    graph: KnowledgeGraph
    item_count: int
    relationship_count: int
    build_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class KnowledgeVerifyRequest:
    """Request for verifying knowledge consistency."""
    item_ids: Optional[List[str]] = None  # None = all items
    check_contradictions: bool = True
    check_completeness: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ConsistencyIssue:
    """A consistency issue found during verification."""
    issue_type: str
    severity: str  # "critical", "warning", "info"
    description: str
    affected_items: List[str]
    suggestion: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "issue_type": self.issue_type,
            "severity": self.severity,
            "description": self.description,
            "affected_items": self.affected_items,
            "suggestion": self.suggestion,
        }


@dataclass
class KnowledgeVerifyResult:
    """Result of knowledge verification."""
    status: str  # "consistent", "inconsistent", "needs_review"
    issues: List[ConsistencyIssue]
    items_checked: int
    verify_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class KnowledgeExportRequest:
    """Request for exporting knowledge base."""
    format: str = "json"
    item_ids: Optional[List[str]] = None  # None = all items
    include_relationships: bool = True
    include_metadata: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class KnowledgeExportResult:
    """Result of knowledge export."""
    format: str
    content: str
    item_count: int
    export_path: Optional[str] = None
    export_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


# Supported knowledge types
SUPPORTED_KNOWLEDGE_TYPES = [kt.value for kt in KnowledgeType]

# Supported relationship types
SUPPORTED_RELATIONSHIP_TYPES = [rt.value for rt in RelationshipType]

# Supported export formats
SUPPORTED_EXPORT_FORMATS = [ef.value for ef in ExportFormat]

# Supported consistency statuses
SUPPORTED_CONSISTENCY_STATUSES = [cs.value for cs in ConsistencyStatus]

# Supported issue severities
SUPPORTED_ISSUE_SEVERITIES = ["critical", "warning", "info"]


def validate_knowledge_type(knowledge_type: str) -> bool:
    """Validate if knowledge type is supported."""
    return knowledge_type.lower() in SUPPORTED_KNOWLEDGE_TYPES


def validate_relationship_type(relationship_type: str) -> bool:
    """Validate if relationship type is supported."""
    return relationship_type.lower() in SUPPORTED_RELATIONSHIP_TYPES


def validate_export_format(export_format: str) -> bool:
    """Validate if export format is supported."""
    return export_format.lower() in SUPPORTED_EXPORT_FORMATS


def validate_consistency_status(status: str) -> bool:
    """Validate if consistency status is supported."""
    return status.lower() in SUPPORTED_CONSISTENCY_STATUSES


def validate_issue_severity(severity: str) -> bool:
    """Validate if issue severity is supported."""
    return severity.lower() in SUPPORTED_ISSUE_SEVERITIES
