"""
Link Validator component for the Public Roadmap System.

This module ensures all links between the roadmap and internal specs remain valid,
detecting broken references and providing mechanisms to fix them.
"""

import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import List, Dict, Optional


# Configure logging
logger = logging.getLogger(__name__)


@dataclass
class BrokenLink:
    """
    Represents a broken link found during validation.
    
    Attributes:
        file_path: Path to the file containing the broken link
        line_number: Line number where the link appears
        link_text: The actual link text/URL
        target_path: The path the link points to
        reason: Description of why the link is broken
    """
    
    file_path: Path
    line_number: int
    link_text: str
    target_path: str
    reason: str


@dataclass
class MissingBadge:
    """
    Represents a spec directory missing a roadmap badge.
    
    Attributes:
        spec_dir: Path to the spec directory
        expected_anchor: The anchor the badge should link to
        reason: Description of the issue
    """
    
    spec_dir: Path
    expected_anchor: str
    reason: str


class LinkValidator:
    """
    Validates and maintains links between roadmap and internal specs.
    
    This class provides functionality to:
    - Validate links from roadmap to spec directories
    - Validate badges in specs that link back to roadmap
    - Update broken links with corrected paths
    """
    
    def __init__(self, roadmap_path: Path = Path("ROADMAP.md")):
        """
        Initialize the LinkValidator.
        
        Args:
            roadmap_path: Path to the ROADMAP.md file
        """
        self.roadmap_path = roadmap_path
    
    def validate_spec_links(self, roadmap_content: str) -> List[BrokenLink]:
        """
        Validate all links from roadmap to spec directories.
        
        Parses the roadmap markdown content to find all links pointing to
        spec directories and verifies that:
        1. The target directory exists
        2. The target directory contains at least one spec file
        3. The link format is valid
        
        Args:
            roadmap_content: The full content of the ROADMAP.md file
            
        Returns:
            List of BrokenLink objects for any invalid links found.
            Empty list if all links are valid.
            
        Example:
            >>> validator = LinkValidator()
            >>> with open("ROADMAP.md") as f:
            ...     content = f.read()
            >>> broken = validator.validate_spec_links(content)
            >>> for link in broken:
            ...     print(f"Broken link at line {link.line_number}: {link.target_path}")
        """
        broken_links = []
        
        # Pattern to match markdown links: [text](path)
        # Captures the link text and the path
        link_pattern = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')
        
        lines = roadmap_content.split('\n')
        
        for line_num, line in enumerate(lines, start=1):
            matches = link_pattern.finditer(line)
            
            for match in matches:
                link_text = match.group(1)
                link_path = match.group(2)
                
                # Skip external links (http://, https://, mailto:, etc.)
                if any(link_path.startswith(prefix) for prefix in ['http://', 'https://', 'mailto:', '#']):
                    continue
                
                # Skip anchor-only links
                if link_path.startswith('#'):
                    continue
                
                # Check if this looks like a spec link
                # Spec links should point to .kiro/specs/ directories
                if not link_path.startswith('.kiro/specs/'):
                    continue
                
                # Resolve the path relative to the roadmap location
                target_path = self.roadmap_path.parent / link_path
                
                # Check if target exists
                if not target_path.exists():
                    broken_links.append(BrokenLink(
                        file_path=self.roadmap_path,
                        line_number=line_num,
                        link_text=link_text,
                        target_path=link_path,
                        reason=f"Target directory does not exist: {target_path}"
                    ))
                    continue
                
                # Check if target is a directory
                if not target_path.is_dir():
                    broken_links.append(BrokenLink(
                        file_path=self.roadmap_path,
                        line_number=line_num,
                        link_text=link_text,
                        target_path=link_path,
                        reason=f"Target is not a directory: {target_path}"
                    ))
                    continue
                
                # Check if directory contains at least one spec file
                spec_files = ['requirements.md', 'design.md', 'tasks.md']
                has_spec_file = any((target_path / f).exists() for f in spec_files)
                
                if not has_spec_file:
                    broken_links.append(BrokenLink(
                        file_path=self.roadmap_path,
                        line_number=line_num,
                        link_text=link_text,
                        target_path=link_path,
                        reason=f"Target directory contains no spec files: {target_path}"
                    ))
        
        return broken_links
    
    def validate_roadmap_badges(self, spec_dirs: List[Path]) -> List[MissingBadge]:
        """
        Validate that spec directories have badges linking back to roadmap.
        
        Checks each spec directory's requirements.md file for a "Public Roadmap"
        badge that links back to the appropriate section in ROADMAP.md.
        
        Args:
            spec_dirs: List of paths to spec directories to check
            
        Returns:
            List of MissingBadge objects for specs without valid badges.
            Empty list if all specs have valid badges.
            
        Example:
            >>> validator = LinkValidator()
            >>> spec_dirs = [Path(".kiro/specs/my-feature")]
            >>> missing = validator.validate_roadmap_badges(spec_dirs)
            >>> for badge in missing:
            ...     print(f"Missing badge in: {badge.spec_dir}")
        """
        missing_badges = []
        
        for spec_dir in spec_dirs:
            # Check requirements.md for badge
            requirements_file = spec_dir / "requirements.md"
            
            if not requirements_file.exists():
                # No requirements file, can't have a badge
                missing_badges.append(MissingBadge(
                    spec_dir=spec_dir,
                    expected_anchor=self._generate_anchor_for_spec(spec_dir),
                    reason="No requirements.md file found"
                ))
                continue
            
            try:
                content = requirements_file.read_text(encoding='utf-8')
            except Exception as e:
                missing_badges.append(MissingBadge(
                    spec_dir=spec_dir,
                    expected_anchor=self._generate_anchor_for_spec(spec_dir),
                    reason=f"Failed to read requirements.md: {e}"
                ))
                continue
            
            # Look for roadmap badge
            # Badge format: [![Public Roadmap](badge-url)](ROADMAP.md#anchor)
            # Or simpler: [View in Roadmap](ROADMAP.md#anchor)
            badge_pattern = re.compile(
                r'\[.*?[Rr]oadmap.*?\]\(ROADMAP\.md#[^\)]+\)',
                re.IGNORECASE
            )
            
            if not badge_pattern.search(content):
                missing_badges.append(MissingBadge(
                    spec_dir=spec_dir,
                    expected_anchor=self._generate_anchor_for_spec(spec_dir),
                    reason="No roadmap badge found in requirements.md"
                ))
        
        return missing_badges
    
    def update_broken_links(
        self,
        roadmap_path: Path,
        fixes: Dict[str, str]
    ) -> None:
        """
        Update broken links in the roadmap with corrected paths.
        
        Reads the roadmap file, replaces broken link paths with corrected
        versions, and writes the updated content back to disk.
        
        Args:
            roadmap_path: Path to the ROADMAP.md file to update
            fixes: Dictionary mapping old (broken) paths to new (correct) paths
            
        Raises:
            FileNotFoundError: If roadmap_path doesn't exist
            ValueError: If file cannot be read or written
            
        Example:
            >>> validator = LinkValidator()
            >>> fixes = {
            ...     ".kiro/specs/old-name": ".kiro/specs/new-name",
            ...     ".kiro/specs/deleted": ".kiro/specs/replacement"
            ... }
            >>> validator.update_broken_links(Path("ROADMAP.md"), fixes)
        """
        if not roadmap_path.exists():
            raise FileNotFoundError(f"Roadmap file not found: {roadmap_path}")
        
        try:
            content = roadmap_path.read_text(encoding='utf-8')
        except Exception as e:
            raise ValueError(f"Failed to read roadmap file {roadmap_path}: {e}")
        
        # Apply each fix
        updated_content = content
        for old_path, new_path in fixes.items():
            # Replace in markdown links: [text](old_path) -> [text](new_path)
            # Use word boundaries to avoid partial matches
            pattern = re.compile(
                r'(\[[^\]]+\]\()' + re.escape(old_path) + r'(\))',
                re.MULTILINE
            )
            updated_content = pattern.sub(r'\1' + new_path + r'\2', updated_content)
        
        # Write updated content back to file
        try:
            roadmap_path.write_text(updated_content, encoding='utf-8')
        except Exception as e:
            raise ValueError(f"Failed to write roadmap file {roadmap_path}: {e}")
    
    def _generate_anchor_for_spec(self, spec_dir: Path) -> str:
        """
        Generate the expected roadmap anchor for a spec directory.
        
        Creates an anchor link based on the spec directory name by:
        - Using the directory name (last component of path)
        - Converting to lowercase
        - Replacing hyphens with spaces for readability
        
        Args:
            spec_dir: Path to the spec directory
            
        Returns:
            Anchor string (without # prefix)
        """
        # Get the directory name (last component)
        dir_name = spec_dir.name
        
        # Convert to lowercase and replace hyphens with spaces
        # This matches how markdown generates anchors from headings
        anchor = dir_name.lower().replace("-", "-")
        
        return anchor
