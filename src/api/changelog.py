"""
API Changelog System

This module provides changelog management for tracking API changes.
"""

import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
from pathlib import Path


class ChangeType(str, Enum):
    """Types of changes in the changelog."""
    ADDED = "added"
    CHANGED = "changed"
    DEPRECATED = "deprecated"
    REMOVED = "removed"
    FIXED = "fixed"
    SECURITY = "security"


@dataclass
class ChangelogEntry:
    """A single changelog entry."""
    version: str
    date: str
    change_type: ChangeType
    description: str
    affected_endpoints: List[str]
    breaking: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "version": self.version,
            "date": self.date,
            "change_type": self.change_type.value,
            "description": self.description,
            "affected_endpoints": self.affected_endpoints,
            "breaking": self.breaking,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ChangelogEntry':
        """Create from dictionary."""
        return cls(
            version=data["version"],
            date=data["date"],
            change_type=ChangeType(data["change_type"]),
            description=data["description"],
            affected_endpoints=data["affected_endpoints"],
            breaking=data.get("breaking", False),
        )


class Changelog:
    """
    Manages API changelog entries.
    
    Features:
    - Add/query changelog entries
    - Version-based filtering
    - Endpoint-based filtering
    - Markdown generation
    - JSON persistence
    """
    
    def __init__(self, changelog_path: Optional[str] = None):
        """
        Initialize changelog.
        
        Args:
            changelog_path: Path to changelog JSON file (default: src/api/CHANGELOG.json)
        """
        if changelog_path is None:
            changelog_path = str(Path(__file__).parent / "CHANGELOG.json")
        
        self.changelog_path = changelog_path
        self.entries: List[ChangelogEntry] = []
        
        # Load existing changelog if it exists
        self.load()
    
    def add_entry(
        self,
        version: str,
        change_type: ChangeType,
        description: str,
        affected_endpoints: List[str],
        breaking: bool = False,
        date: Optional[str] = None,
    ) -> ChangelogEntry:
        """
        Add a new changelog entry.
        
        Args:
            version: Version number (e.g., "v1.1.0")
            change_type: Type of change (ChangeType enum or string)
            description: Description of the change
            affected_endpoints: List of affected endpoint paths
            breaking: Whether this is a breaking change
            date: Date of change (default: today)
            
        Returns:
            Created changelog entry
        """
        if date is None:
            date = datetime.now().strftime("%Y-%m-%d")
        
        # Convert string to ChangeType if needed
        if isinstance(change_type, str):
            change_type = ChangeType(change_type)
        
        entry = ChangelogEntry(
            version=version,
            date=date,
            change_type=change_type,
            description=description,
            affected_endpoints=affected_endpoints,
            breaking=breaking,
        )
        
        self.entries.append(entry)
        return entry
    
    def get_entries_by_version(self, version: str) -> List[ChangelogEntry]:
        """
        Get all entries for a specific version.
        
        Args:
            version: Version number
            
        Returns:
            List of changelog entries
        """
        return [e for e in self.entries if e.version == version]
    
    def get_entries_by_endpoint(self, endpoint: str) -> List[ChangelogEntry]:
        """
        Get all entries affecting a specific endpoint.
        
        Args:
            endpoint: Endpoint path
            
        Returns:
            List of changelog entries
        """
        return [e for e in self.entries if endpoint in e.affected_endpoints]
    
    def get_entries_by_type(self, change_type: ChangeType) -> List[ChangelogEntry]:
        """
        Get all entries of a specific type.
        
        Args:
            change_type: Type of change
            
        Returns:
            List of changelog entries
        """
        return [e for e in self.entries if e.change_type == change_type]
    
    def get_breaking_changes(self) -> List[ChangelogEntry]:
        """
        Get all breaking changes.
        
        Returns:
            List of breaking change entries
        """
        return [e for e in self.entries if e.breaking]
    
    def get_versions(self) -> List[str]:
        """
        Get all versions in the changelog.
        
        Returns:
            List of version numbers (sorted newest first)
        """
        versions = list(set(e.version for e in self.entries))
        # Sort versions (simple string sort, works for semantic versioning)
        return sorted(versions, reverse=True)
    
    def generate_markdown(self) -> str:
        """
        Generate changelog in Markdown format.
        
        Returns:
            Markdown string
        """
        lines = [
            "# Changelog",
            "",
            "All notable changes to the StoryCore API will be documented in this file.",
            "",
            "The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),",
            "and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).",
            "",
        ]
        
        # Group entries by version
        versions = self.get_versions()
        
        for version in versions:
            version_entries = self.get_entries_by_version(version)
            
            if not version_entries:
                continue
            
            # Get date from first entry
            date = version_entries[0].date
            
            lines.append(f"## [{version}] - {date}")
            lines.append("")
            
            # Group by change type
            by_type = {}
            for entry in version_entries:
                change_type = entry.change_type
                if change_type not in by_type:
                    by_type[change_type] = []
                by_type[change_type].append(entry)
            
            # Output in standard order
            type_order = [
                ChangeType.ADDED,
                ChangeType.CHANGED,
                ChangeType.DEPRECATED,
                ChangeType.REMOVED,
                ChangeType.FIXED,
                ChangeType.SECURITY,
            ]
            
            for change_type in type_order:
                if change_type not in by_type:
                    continue
                
                lines.append(f"### {change_type.value.title()}")
                lines.append("")
                
                for entry in by_type[change_type]:
                    # Add breaking change indicator
                    breaking_marker = " **[BREAKING]**" if entry.breaking else ""
                    
                    # Format endpoints
                    if entry.affected_endpoints:
                        endpoints_str = ", ".join(f"`{ep}`" for ep in entry.affected_endpoints)
                        lines.append(f"- {entry.description}{breaking_marker} ({endpoints_str})")
                    else:
                        lines.append(f"- {entry.description}{breaking_marker}")
                
                lines.append("")
        
        return '\n'.join(lines)
    
    def save(self) -> None:
        """Save changelog to JSON file."""
        data = {
            "changelog": [entry.to_dict() for entry in self.entries],
            "last_updated": datetime.now().isoformat(),
        }
        
        with open(self.changelog_path, 'w') as f:
            json.dump(data, f, indent=2)
    
    def load(self) -> None:
        """Load changelog from JSON file."""
        try:
            with open(self.changelog_path, 'r') as f:
                data = json.load(f)
            
            self.entries = [
                ChangelogEntry.from_dict(entry_data)
                for entry_data in data.get("changelog", [])
            ]
        except FileNotFoundError:
            # No existing changelog, start fresh
            self.entries = []
    
    def export_markdown(self, output_path: str) -> None:
        """
        Export changelog to Markdown file.
        
        Args:
            output_path: Path to output Markdown file
        """
        markdown = self.generate_markdown()
        with open(output_path, 'w') as f:
            f.write(markdown)
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert changelog to dictionary.
        
        Returns:
            Dictionary representation
        """
        return {
            "versions": self.get_versions(),
            "total_entries": len(self.entries),
            "breaking_changes": len(self.get_breaking_changes()),
            "entries": [entry.to_dict() for entry in self.entries],
        }


def create_initial_changelog() -> Changelog:
    """
    Create initial changelog with v1.0.0 entry.
    
    Returns:
        Initialized changelog
    """
    changelog = Changelog()
    
    # Add initial release entry
    changelog.add_entry(
        version="v1.0.0",
        change_type=ChangeType.ADDED,
        description="Initial release of StoryCore Complete API System",
        affected_endpoints=["*"],
        date="2024-01-15",
    )
    
    changelog.add_entry(
        version="v1.0.0",
        change_type=ChangeType.ADDED,
        description="113 endpoints across 14 functional categories",
        affected_endpoints=["*"],
        date="2024-01-15",
    )
    
    changelog.add_entry(
        version="v1.0.0",
        change_type=ChangeType.ADDED,
        description="Async task management for long-running operations",
        affected_endpoints=["storycore.task.status", "storycore.task.cancel"],
        date="2024-01-15",
    )
    
    changelog.add_entry(
        version="v1.0.0",
        change_type=ChangeType.ADDED,
        description="Authentication and authorization support",
        affected_endpoints=["storycore.security.*"],
        date="2024-01-15",
    )
    
    changelog.add_entry(
        version="v1.0.0",
        change_type=ChangeType.ADDED,
        description="Rate limiting and caching capabilities",
        affected_endpoints=["*"],
        date="2024-01-15",
    )
    
    changelog.add_entry(
        version="v1.0.0",
        change_type=ChangeType.ADDED,
        description="OpenAPI 3.0 specification generation",
        affected_endpoints=["storycore.api.openapi", "storycore.api.schema"],
        date="2024-01-15",
    )
    
    return changelog
