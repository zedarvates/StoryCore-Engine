"""
Changelog Writer component for the Public Roadmap System.

This module provides functionality to maintain a chronological record of
completed features in a CHANGELOG.md file, with entries organized by
release version or date.
"""

import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from .models import Feature, FeatureStatus


# Configure logging
logger = logging.getLogger(__name__)


class ChangelogEntry:
    """
    Represents a single changelog entry for a completed feature.
    
    Attributes:
        feature: The completed feature
        completion_date: Date when the feature was completed
        version: Optional release version associated with this entry
    """
    
    def __init__(
        self,
        feature: Feature,
        completion_date: datetime,
        version: Optional[str] = None
    ):
        """
        Initialize a changelog entry.
        
        Args:
            feature: The completed feature to document
            completion_date: Date when the feature was completed
            version: Optional release version (e.g., "v1.2.0")
        """
        self.feature = feature
        self.completion_date = completion_date
        self.version = version


class ChangelogWriter:
    """
    Maintains a chronological record of completed features.
    
    The ChangelogWriter appends new entries to CHANGELOG.md when features
    complete, formats entries with date and description, and organizes
    entries by release version or date in reverse chronological order.
    """
    
    def __init__(self, changelog_path: Path = Path("CHANGELOG.md")):
        """
        Initialize the ChangelogWriter.
        
        Args:
            changelog_path: Path to the CHANGELOG.md file
            
        Raises:
            ValueError: If changelog_path is not a valid path
        """
        if not isinstance(changelog_path, Path):
            try:
                changelog_path = Path(changelog_path)
            except Exception as e:
                logger.error("Invalid changelog_path provided: %s", e)
                raise ValueError(f"changelog_path must be a valid path: {e}")
        
        self.changelog_path = changelog_path
        self.entries: List[ChangelogEntry] = []
        logger.debug("ChangelogWriter initialized with path: %s", self.changelog_path)
    
    def append_entry(
        self,
        feature: Feature,
        completion_date: Optional[datetime] = None,
        version: Optional[str] = None
    ) -> None:
        """
        Add a completed feature to the changelog.
        
        This method creates a new changelog entry for a completed feature
        and adds it to the internal entries list. The entry will be included
        when the changelog is written to disk.
        
        Args:
            feature: The completed feature to add
            completion_date: Date when feature was completed (defaults to now)
            version: Optional release version to associate with this entry
        
        Raises:
            ValueError: If feature status is not COMPLETED
        
        Example:
            >>> writer = ChangelogWriter()
            >>> writer.append_entry(
            ...     feature=my_feature,
            ...     completion_date=datetime(2026, 1, 15),
            ...     version="v1.2.0"
            ... )
        """
        if feature.status != FeatureStatus.COMPLETED:
            raise ValueError(
                f"Cannot add non-completed feature to changelog. "
                f"Feature '{feature.name}' has status: {feature.status.value}"
            )
        
        # Use provided completion_date, feature's completion_date, or current time
        if completion_date is None:
            completion_date = feature.completion_date or datetime.now()
        
        entry = ChangelogEntry(
            feature=feature,
            completion_date=completion_date,
            version=version
        )
        
        self.entries.append(entry)
    
    def format_entry(self, entry: ChangelogEntry) -> str:
        """
        Format a single changelog entry as markdown.
        
        Generates a markdown-formatted string for a changelog entry,
        including the date, feature title, description, and a link
        back to the roadmap.
        
        Args:
            entry: The changelog entry to format
        
        Returns:
            Markdown-formatted string for the entry
        
        Example:
            >>> entry = ChangelogEntry(feature, datetime(2026, 1, 15))
            >>> formatted = writer.format_entry(entry)
            >>> print(formatted)
            ### User Authentication System
            **Released:** 2026-01-15
            
            Complete authentication system with OAuth2 support...
            
            [View in Roadmap](ROADMAP.md#user-authentication-system)
        """
        # Format the date
        date_str = entry.completion_date.strftime("%Y-%m-%d")
        
        # Create anchor link from feature name (convert to lowercase, replace spaces with hyphens)
        anchor = entry.feature.title.lower().replace(" ", "-")
        # Remove special characters that aren't valid in anchors
        anchor = "".join(c for c in anchor if c.isalnum() or c == "-")
        
        # Build the entry
        lines = [
            f"### {entry.feature.title}",
            f"**Released:** {date_str}",
            "",
            entry.feature.description,
            "",
            f"[View in Roadmap](ROADMAP.md#{anchor})",
            ""
        ]
        
        return "\n".join(lines)
    
    def organize_by_version(self, entries: Optional[List[ChangelogEntry]] = None) -> str:
        """
        Organize changelog entries by version or date.
        
        Groups entries by release version (if provided) or by month,
        and orders them in reverse chronological order (newest first).
        Generates the complete changelog content as markdown.
        
        Args:
            entries: List of entries to organize (defaults to self.entries)
        
        Returns:
            Complete changelog content as markdown string
        
        Example:
            >>> writer = ChangelogWriter()
            >>> writer.append_entry(feature1, datetime(2026, 1, 15), "v1.2.0")
            >>> writer.append_entry(feature2, datetime(2026, 1, 10), "v1.2.0")
            >>> changelog = writer.organize_by_version()
            >>> print(changelog)
        """
        if entries is None:
            entries = self.entries
        
        if not entries:
            return self._generate_empty_changelog()
        
        # Sort entries by completion date (newest first)
        sorted_entries = sorted(
            entries,
            key=lambda e: e.completion_date,
            reverse=True
        )
        
        # Group entries by version or month
        grouped: Dict[str, List[ChangelogEntry]] = {}
        
        for entry in sorted_entries:
            if entry.version:
                # Group by version
                key = entry.version
            else:
                # Group by month
                key = entry.completion_date.strftime("%B %Y")
            
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(entry)
        
        # Generate markdown
        lines = [
            "# Changelog",
            "",
            "All notable changes to this project will be documented in this file.",
            "",
            "The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).",
            "",
            "---",
            ""
        ]
        
        # Add each group
        for group_key in grouped.keys():
            group_entries = grouped[group_key]
            
            # Add group header
            lines.append(f"## {group_key}")
            lines.append("")
            
            # Add entries in this group
            for entry in group_entries:
                formatted_entry = self.format_entry(entry)
                lines.append(formatted_entry)
            
            lines.append("---")
            lines.append("")
        
        return "\n".join(lines)
    
    def _generate_empty_changelog(self) -> str:
        """
        Generate an empty changelog template.
        
        Returns:
            Empty changelog content as markdown string
        """
        lines = [
            "# Changelog",
            "",
            "All notable changes to this project will be documented in this file.",
            "",
            "The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).",
            "",
            "---",
            "",
            "## No Releases Yet",
            "",
            "This project has not yet had any completed features. Check back soon!",
            "",
            "[View Roadmap](ROADMAP.md) to see planned features.",
            ""
        ]
        
        return "\n".join(lines)
    
    def write_changelog(self, entries: Optional[List[ChangelogEntry]] = None) -> None:
        """
        Write the changelog to disk.
        
        Generates the complete changelog content and writes it to the
        configured changelog_path file.
        
        Args:
            entries: List of entries to write (defaults to self.entries)
            
        Raises:
            ValueError: If file cannot be written
        
        Example:
            >>> writer = ChangelogWriter(Path("CHANGELOG.md"))
            >>> writer.append_entry(feature1, datetime(2026, 1, 15))
            >>> writer.write_changelog()
        """
        try:
            content = self.organize_by_version(entries)
            
            # Ensure parent directory exists
            try:
                self.changelog_path.parent.mkdir(parents=True, exist_ok=True)
            except PermissionError as e:
                logger.error("Permission denied creating directory %s: %s", 
                           self.changelog_path.parent, e)
                raise ValueError(f"Permission denied creating directory: {e}")
            except OSError as e:
                logger.error("OS error creating directory %s: %s", 
                           self.changelog_path.parent, e)
                raise ValueError(f"Failed to create directory: {e}")
            
            # Write to file
            try:
                self.changelog_path.write_text(content, encoding="utf-8")
                logger.info("Changelog written to %s", self.changelog_path)
            except PermissionError as e:
                logger.error("Permission denied writing %s: %s", self.changelog_path, e)
                raise ValueError(f"Permission denied writing changelog: {e}")
            except OSError as e:
                logger.error("OS error writing %s: %s", self.changelog_path, e)
                raise ValueError(f"Failed to write changelog: {e}")
                
        except Exception as e:
            logger.error("Error writing changelog: %s", e, exc_info=True)
            raise ValueError(f"Failed to write changelog: {e}")
