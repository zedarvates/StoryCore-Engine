"""
Data models for Memory and Context API category.

This module defines all data structures used by memory and context endpoints.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime


@dataclass
class MemoryItem:
    """A stored memory item."""
    key: str
    value: Any
    created_at: datetime
    updated_at: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)


@dataclass
class MemorySearchResult:
    """Result from memory search."""
    key: str
    value: Any
    score: float  # Similarity score (0.0 to 1.0)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ContextItem:
    """An item in the context stack."""
    data: Dict[str, Any]
    pushed_at: datetime
    source: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ContextState:
    """Current state of the context stack."""
    stack_size: int
    current_context: Optional[Dict[str, Any]] = None
    stack_items: List[ContextItem] = field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class MemoryStoreRequest:
    """Request to store memory."""
    key: str
    value: Any
    metadata: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    overwrite: bool = True


@dataclass
class MemoryRetrieveRequest:
    """Request to retrieve memory."""
    key: str
    default: Optional[Any] = None


@dataclass
class MemorySearchRequest:
    """Request to search memory."""
    query: str
    limit: int = 10
    threshold: float = 0.5  # Minimum similarity score
    tags: Optional[List[str]] = None


@dataclass
class MemoryClearRequest:
    """Request to clear memory."""
    keys: Optional[List[str]] = None  # If None, clear all
    tags: Optional[List[str]] = None  # Clear by tags


@dataclass
class ContextPushRequest:
    """Request to push context."""
    data: Dict[str, Any]
    source: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class ContextPopRequest:
    """Request to pop context."""
    count: int = 1  # Number of items to pop


@dataclass
class ContextGetRequest:
    """Request to get current context."""
    include_stack: bool = False  # Include full stack or just top item


@dataclass
class ContextResetRequest:
    """Request to reset context."""
    preserve_defaults: bool = True  # Keep default context values
