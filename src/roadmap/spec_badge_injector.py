"""
Spec Badge Injector component for the Public Roadmap System.

This module manages "Public Roadmap" badges in internal spec files,
creating bidirectional links between specs and the public roadmap.
"""

import logging
import re
from pathlib import Path
from typing import Optional


# Configure logging
logger = logging.getLogger(__name__)


class SpecBadgeInjector:
    """
    Manages roadmap badges in internal specification files.
    
    This class provides functionality to:
    - Inject "Public Roadmap" badges into spec files
    - Remove existing badges when needed
    - Update badge links when roadmap structure changes
    
    Badges are typically added to the requirements.md file at the top,
    after any YAML frontmatter but before the main content.
    """
    
    def __init__(self, roadmap_path: Path = Path("ROADMAP.md")):
        """
        Initialize the SpecBadgeInjector.
        
        Args:
            roadmap_path: Path to the ROADMAP.md file (used for relative linking)
        """
        self.roadmap_path = roadmap_path
    
    def inject_badge(self, spec_file: Path, roadmap_anchor: str) -> None:
        """
        Add a "Public Roadmap" badge to a spec file.
        
        Injects a markdown badge at the top of the spec file (typically
        requirements.md) that links back to the feature's section in the
        public roadmap. The badge is inserted after any YAML frontmatter
        but before the main content.
        
        If a badge already exists, it will be updated with the new anchor.
        
        Args:
            spec_file: Path to the spec file (usually requirements.md)
            roadmap_anchor: Anchor tag for the feature section in ROADMAP.md
            
        Raises:
            FileNotFoundError: If spec_file doesn't exist
            ValueError: If file cannot be read or written
            
        Example:
            >>> injector = SpecBadgeInjector()
            >>> spec_file = Path(".kiro/specs/my-feature/requirements.md")
            >>> injector.inject_badge(spec_file, "my-feature")
            # Adds: [📋 View in Public Roadmap](../../ROADMAP.md#my-feature)
        """
        if not spec_file.exists():
            raise FileNotFoundError(f"Spec file not found: {spec_file}")
        
        try:
            content = spec_file.read_text(encoding='utf-8')
        except Exception as e:
            raise ValueError(f"Failed to read spec file {spec_file}: {e}")
        
        # Check if badge already exists
        if self._has_roadmap_badge(content):
            # Update existing badge
            updated_content = self._update_existing_badge(content, roadmap_anchor)
        else:
            # Inject new badge
            updated_content = self._inject_new_badge(content, spec_file, roadmap_anchor)
        
        # Write updated content back to file
        try:
            spec_file.write_text(updated_content, encoding='utf-8')
        except Exception as e:
            raise ValueError(f"Failed to write spec file {spec_file}: {e}")
    
    def remove_badge(self, spec_file: Path) -> None:
        """
        Remove the "Public Roadmap" badge from a spec file.
        
        Searches for and removes any roadmap badge from the spec file.
        This is useful when a spec is being archived or when regenerating
        badges from scratch.
        
        Args:
            spec_file: Path to the spec file to clean up
            
        Raises:
            FileNotFoundError: If spec_file doesn't exist
            ValueError: If file cannot be read or written
            
        Example:
            >>> injector = SpecBadgeInjector()
            >>> spec_file = Path(".kiro/specs/my-feature/requirements.md")
            >>> injector.remove_badge(spec_file)
        """
        if not spec_file.exists():
            raise FileNotFoundError(f"Spec file not found: {spec_file}")
        
        try:
            content = spec_file.read_text(encoding='utf-8')
        except Exception as e:
            raise ValueError(f"Failed to read spec file {spec_file}: {e}")
        
        # Remove badge if it exists
        if not self._has_roadmap_badge(content):
            # No badge to remove, nothing to do
            return
        
        updated_content = self._remove_badge_from_content(content)
        
        # Write updated content back to file
        try:
            spec_file.write_text(updated_content, encoding='utf-8')
        except Exception as e:
            raise ValueError(f"Failed to write spec file {spec_file}: {e}")
    
    def update_badge_link(self, spec_file: Path, new_anchor: str) -> None:
        """
        Update the roadmap link in an existing badge.
        
        Finds the existing roadmap badge and updates its anchor link to
        point to a new location in the roadmap. This is useful when the
        roadmap structure changes or features are reorganized.
        
        If no badge exists, this method will inject a new one.
        
        Args:
            spec_file: Path to the spec file to update
            new_anchor: New anchor tag for the roadmap link
            
        Raises:
            FileNotFoundError: If spec_file doesn't exist
            ValueError: If file cannot be read or written
            
        Example:
            >>> injector = SpecBadgeInjector()
            >>> spec_file = Path(".kiro/specs/my-feature/requirements.md")
            >>> injector.update_badge_link(spec_file, "new-feature-name")
        """
        # This is essentially the same as inject_badge, which handles both
        # new injection and updating existing badges
        self.inject_badge(spec_file, new_anchor)
    
    def _has_roadmap_badge(self, content: str) -> bool:
        """
        Check if content contains a roadmap badge.
        
        Args:
            content: File content to check
            
        Returns:
            True if a roadmap badge is found, False otherwise
        """
        # Look for roadmap badge patterns
        # Matches: [text with "roadmap"](ROADMAP.md#anchor) or similar
        badge_pattern = re.compile(
            r'\[.*?[Rr]oadmap.*?\]\(.*?ROADMAP\.md#[^\)]+\)',
            re.IGNORECASE
        )
        
        return bool(badge_pattern.search(content))
    
    def _inject_new_badge(
        self,
        content: str,
        spec_file: Path,
        roadmap_anchor: str
    ) -> str:
        """
        Inject a new badge into the content.
        
        Args:
            content: Original file content
            spec_file: Path to the spec file (for calculating relative path)
            roadmap_anchor: Anchor tag for the roadmap link
            
        Returns:
            Updated content with badge injected
        """
        # Calculate relative path from spec file to roadmap
        relative_path = self._calculate_relative_path(spec_file)
        
        # Create badge markdown
        badge = f"[📋 View in Public Roadmap]({relative_path}#{roadmap_anchor})\n\n"
        
        # Find insertion point (after frontmatter if present)
        insertion_point = self._find_insertion_point(content)
        
        # Insert badge at the appropriate location
        updated_content = (
            content[:insertion_point] +
            badge +
            content[insertion_point:]
        )
        
        return updated_content
    
    def _update_existing_badge(self, content: str, new_anchor: str) -> str:
        """
        Update the anchor in an existing badge.
        
        Args:
            content: File content with existing badge
            new_anchor: New anchor tag to use
            
        Returns:
            Updated content with badge anchor changed
        """
        # Pattern to match roadmap badge and capture the link
        badge_pattern = re.compile(
            r'(\[.*?[Rr]oadmap.*?\]\(.*?ROADMAP\.md#)([^\)]+)(\))',
            re.IGNORECASE
        )
        
        # Replace the anchor part while keeping the rest
        updated_content = badge_pattern.sub(
            r'\1' + new_anchor + r'\3',
            content
        )
        
        return updated_content
    
    def _remove_badge_from_content(self, content: str) -> str:
        """
        Remove roadmap badge from content.
        
        Args:
            content: File content with badge
            
        Returns:
            Content with badge removed
        """
        # Pattern to match the entire badge line(s)
        # Matches the badge and any trailing newlines
        badge_pattern = re.compile(
            r'\[.*?[Rr]oadmap.*?\]\(.*?ROADMAP\.md#[^\)]+\)\s*\n*',
            re.IGNORECASE
        )
        
        updated_content = badge_pattern.sub('', content)
        
        return updated_content
    
    def _find_insertion_point(self, content: str) -> int:
        """
        Find the appropriate insertion point for the badge.
        
        The badge should be inserted:
        1. After YAML frontmatter (if present)
        2. Before the first heading or content
        
        Args:
            content: File content
            
        Returns:
            Character index for badge insertion
        """
        # Check for YAML frontmatter (starts with ---)
        frontmatter_pattern = re.compile(r'^---\s*\n.*?\n---\s*\n', re.DOTALL | re.MULTILINE)
        frontmatter_match = frontmatter_pattern.match(content)
        
        if frontmatter_match:
            # Insert after frontmatter
            return frontmatter_match.end()
        
        # No frontmatter, insert at the beginning
        return 0
    
    def _calculate_relative_path(self, spec_file: Path) -> str:
        """
        Calculate relative path from spec file to roadmap.
        
        Args:
            spec_file: Path to the spec file
            
        Returns:
            Relative path string to ROADMAP.md
        """
        # Get the spec directory (parent of the spec file)
        spec_dir = spec_file.parent
        
        # Calculate relative path from spec directory to roadmap
        # Typically: ../../ROADMAP.md (from .kiro/specs/feature-name/)
        try:
            relative_path = Path("../../ROADMAP.md")
            # Normalize the path
            relative_path_str = str(relative_path).replace("\\", "/")
            return relative_path_str
        except Exception:
            # Fallback to absolute reference
            return "ROADMAP.md"
    
    def _generate_anchor_for_spec(self, spec_dir: Path) -> str:
        """
        Generate the expected roadmap anchor for a spec directory.
        
        Creates an anchor link based on the spec directory name by:
        - Using the directory name (last component of path)
        - Converting to lowercase
        - Keeping hyphens as-is (markdown anchor format)
        
        Args:
            spec_dir: Path to the spec directory
            
        Returns:
            Anchor string (without # prefix)
        """
        # Get the directory name (last component)
        dir_name = spec_dir.name
        
        # Convert to lowercase (markdown anchor format)
        anchor = dir_name.lower()
        
        return anchor
