"""
Synchronization Engine for the Public Roadmap System.

This module provides functionality to detect changes in spec files and
synchronize the roadmap accordingly while preserving manual edits.
"""

import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

from .models import Feature, FeatureStatus, RoadmapConfig, SpecFiles
from .spec_scanner import SpecScanner
from .metadata_extractor import MetadataExtractor
from .status_tracker import StatusTracker
from .timeline_organizer import TimelineOrganizer
from .roadmap_formatter import RoadmapFormatter


# Configure logging
logger = logging.getLogger(__name__)


class SynchronizationEngine:
    """
    Detects changes in spec files and synchronizes the roadmap.
    
    This class monitors spec directories for changes (create, update, delete)
    and updates the roadmap accordingly while preserving manual edits to
    introduction sections and custom content.
    """
    
    # Markers for protected sections in roadmap
    PROTECTED_SECTION_START = "<!-- MANUAL_EDIT_START -->"
    PROTECTED_SECTION_END = "<!-- MANUAL_EDIT_END -->"
    
    def __init__(self, config: Optional[RoadmapConfig] = None):
        """
        Initialize the SynchronizationEngine.
        
        Args:
            config: Configuration object (uses defaults if not provided)
        """
        self.config = config or RoadmapConfig()
        
        # Initialize components
        self.scanner = SpecScanner(self.config.specs_directory)
        self.metadata_extractor = MetadataExtractor()
        self.status_tracker = StatusTracker()
        self.timeline_organizer = TimelineOrganizer()
        self.formatter = RoadmapFormatter(self.config)
        
        # Cache for tracking file modification times
        self._modification_cache: Dict[Path, float] = {}
        
        logger.info("SynchronizationEngine initialized")
    
    def detect_changes(self) -> Dict[str, List[SpecFiles]]:
        """
        Detect changes in spec directories using file modification times.
        
        Compares current file modification times against cached values to
        identify specs that have been created, modified, or deleted since
        the last check.
        
        Returns:
            Dictionary with keys 'created', 'modified', 'deleted' mapping to
            lists of SpecFiles objects representing the changed specs.
            
        Example:
            >>> engine = SynchronizationEngine()
            >>> changes = engine.detect_changes()
            >>> print(f"Created: {len(changes['created'])}")
            >>> print(f"Modified: {len(changes['modified'])}")
            >>> print(f"Deleted: {len(changes['deleted'])}")
        """
        changes = {
            'created': [],
            'modified': [],
            'deleted': []
        }
        
        # Scan current specs
        current_specs = self.scanner.scan_specs_directory()
        current_spec_paths = {spec.directory for spec in current_specs}
        
        # Track which cached paths we've seen
        seen_cached_paths = set()
        
        # Check each current spec for creation or modification
        for spec in current_specs:
            spec_path = spec.directory
            seen_cached_paths.add(spec_path)
            
            # Get latest modification time from any spec file
            latest_mtime = self._get_latest_mtime(spec)
            
            if spec_path not in self._modification_cache:
                # New spec created
                changes['created'].append(spec)
                self._modification_cache[spec_path] = latest_mtime
                logger.info(f"Detected new spec: {spec_path.name}")
            elif latest_mtime > self._modification_cache[spec_path]:
                # Existing spec modified
                changes['modified'].append(spec)
                self._modification_cache[spec_path] = latest_mtime
                logger.info(f"Detected modified spec: {spec_path.name}")
        
        # Check for deleted specs (in cache but not in current scan)
        deleted_paths = set(self._modification_cache.keys()) - seen_cached_paths
        for deleted_path in deleted_paths:
            # Create a minimal SpecFiles object for the deleted spec
            deleted_spec = SpecFiles(
                directory=deleted_path,
                requirements=None,
                design=None,
                tasks=None,
                metadata={}
            )
            changes['deleted'].append(deleted_spec)
            del self._modification_cache[deleted_path]
            logger.info(f"Detected deleted spec: {deleted_path.name}")
        
        return changes
    
    def _get_latest_mtime(self, spec: SpecFiles) -> float:
        """
        Get the latest modification time from all spec files.
        
        Args:
            spec: SpecFiles object to check
            
        Returns:
            Latest modification timestamp as float (seconds since epoch)
        """
        mtimes = []
        
        # Check each file that exists
        for file_path in [spec.requirements, spec.design, spec.tasks]:
            if file_path and file_path.exists():
                try:
                    mtimes.append(file_path.stat().st_mtime)
                except OSError:
                    # File might have been deleted between check and stat
                    continue
        
        # Return latest mtime, or 0 if no files found
        return max(mtimes) if mtimes else 0.0
    
    def update_roadmap(
        self,
        changes: Optional[Dict[str, List[SpecFiles]]] = None
    ) -> None:
        """
        Update the roadmap to reflect spec changes.
        
        Regenerates affected sections of the roadmap based on detected changes.
        If no changes are provided, performs a full regeneration.
        
        Args:
            changes: Optional dictionary of changes from detect_changes().
                    If None, performs full regeneration.
                    
        Raises:
            FileNotFoundError: If roadmap file doesn't exist for update
            ValueError: If roadmap content is invalid
        """
        if changes is None:
            # Full regeneration - delegate to RoadmapGenerator
            logger.info("Performing full roadmap regeneration")
            from .roadmap_generator import RoadmapGenerator
            generator = RoadmapGenerator(self.config)
            generator.generate()
            return
        
        # Check if roadmap exists
        if not self.config.output_path.exists():
            logger.warning(
                "Roadmap file doesn't exist, performing full generation"
            )
            from .roadmap_generator import RoadmapGenerator
            generator = RoadmapGenerator(self.config)
            generator.generate()
            return
        
        # Read existing roadmap
        try:
            existing_content = self.config.output_path.read_text(encoding='utf-8')
        except Exception as e:
            raise ValueError(f"Failed to read roadmap file: {e}")
        
        # Extract protected sections
        protected_sections = self._extract_protected_sections(existing_content)
        
        # Get all current specs
        all_specs = self.scanner.scan_specs_directory()
        
        # Build features from specs
        features = self._build_features(all_specs)
        
        # Organize by timeline
        timeline_groups = self.timeline_organizer.organize_by_timeline(features)
        
        # Sort within quarters
        for quarter in timeline_groups:
            timeline_groups[quarter] = self.timeline_organizer.sort_within_quarter(
                timeline_groups[quarter]
            )
        
        # Generate new roadmap content
        new_content = self._generate_roadmap_content(timeline_groups)
        
        # Restore protected sections
        final_content = self._restore_protected_sections(
            new_content,
            protected_sections
        )
        
        # Write updated roadmap
        self.config.output_path.write_text(final_content, encoding='utf-8')
        
        logger.info(
            "Roadmap updated: %d created, %d modified, %d deleted",
            len(changes.get('created', [])),
            len(changes.get('modified', [])),
            len(changes.get('deleted', []))
        )
    
    def preserve_manual_edits(self, content: str) -> str:
        """
        Mark sections of roadmap content for manual edit preservation.
        
        This method wraps specified sections with HTML comments to mark them
        as protected from automatic regeneration. Protected sections include:
        - Introduction paragraphs
        - Section descriptions
        - Custom notes
        
        Args:
            content: Roadmap markdown content
            
        Returns:
            Content with protected sections marked
            
        Example:
            >>> engine = SynchronizationEngine()
            >>> content = "# Roadmap\\n\\nThis is my intro.\\n\\n## Q1 2026"
            >>> marked = engine.preserve_manual_edits(content)
            >>> # Introduction will be wrapped in protection markers
        """
        # Pattern to match introduction section (after title, before first ##)
        intro_pattern = r'(# .+?\n\n)(.+?)(\n## )'
        
        def wrap_intro(match):
            """Wrap introduction with protection markers."""
            title = match.group(1)
            intro = match.group(2)
            next_section = match.group(3)
            
            # Only wrap if not already wrapped
            if self.PROTECTED_SECTION_START not in intro:
                intro = (
                    f"{self.PROTECTED_SECTION_START}\n"
                    f"{intro}\n"
                    f"{self.PROTECTED_SECTION_END}"
                )
            
            return f"{title}{intro}{next_section}"
        
        # Apply protection to introduction
        content = re.sub(intro_pattern, wrap_intro, content, flags=re.DOTALL)
        
        return content
    
    def _extract_protected_sections(self, content: str) -> Dict[str, str]:
        """
        Extract protected sections from roadmap content.
        
        Args:
            content: Roadmap markdown content
            
        Returns:
            Dictionary mapping section identifiers to protected content
        """
        protected = {}
        
        # Find all protected sections
        pattern = (
            f"{re.escape(self.PROTECTED_SECTION_START)}\n"
            f"(.+?)\n"
            f"{re.escape(self.PROTECTED_SECTION_END)}"
        )
        
        matches = re.finditer(pattern, content, re.DOTALL)
        
        for i, match in enumerate(matches):
            section_content = match.group(1)
            protected[f"section_{i}"] = section_content
            logger.debug(f"Extracted protected section {i}")
        
        return protected
    
    def _restore_protected_sections(
        self,
        new_content: str,
        protected_sections: Dict[str, str]
    ) -> str:
        """
        Restore protected sections into new roadmap content.
        
        Args:
            new_content: Newly generated roadmap content
            protected_sections: Dictionary of protected content
            
        Returns:
            Content with protected sections restored
        """
        if not protected_sections:
            return new_content
        
        # For now, restore the first protected section (introduction)
        # This is a simplified implementation - a full version would
        # need more sophisticated section matching
        
        if 'section_0' in protected_sections:
            # Try to find where to insert the protected introduction
            # Look for the pattern: title followed by content before first ##
            intro_pattern = r'(# .+?\n\n)(.+?)(\n## )'
            
            def restore_intro(match):
                title = match.group(1)
                next_section = match.group(3)
                protected_intro = protected_sections['section_0']
                
                return (
                    f"{title}"
                    f"{self.PROTECTED_SECTION_START}\n"
                    f"{protected_intro}\n"
                    f"{self.PROTECTED_SECTION_END}"
                    f"{next_section}"
                )
            
            new_content = re.sub(
                intro_pattern,
                restore_intro,
                new_content,
                count=1,
                flags=re.DOTALL
            )
        
        return new_content
    
    def _build_features(self, spec_files_list: List[SpecFiles]) -> List[Feature]:
        """
        Build Feature objects from SpecFiles.
        
        This is a simplified version of the logic in RoadmapGenerator.
        
        Args:
            spec_files_list: List of SpecFiles objects
            
        Returns:
            List of Feature objects
        """
        features = []
        
        for spec_files in spec_files_list:
            try:
                feature = self._process_spec(spec_files)
                features.append(feature)
            except Exception as e:
                logger.warning(
                    f"Failed to process spec {spec_files.directory}: {e}"
                )
                continue
        
        return features
    
    def _process_spec(self, spec_files: SpecFiles) -> Feature:
        """
        Process a single spec and create a Feature object.
        
        Args:
            spec_files: SpecFiles object
            
        Returns:
            Feature object
        """
        # Extract metadata
        metadata = {}
        if spec_files.requirements:
            metadata = self.metadata_extractor.extract_frontmatter(
                spec_files.requirements
            )
        elif spec_files.design:
            metadata = self.metadata_extractor.extract_frontmatter(
                spec_files.design
            )
        
        # Extract title and description
        title = ""
        description = ""
        content = ""
        
        if spec_files.requirements:
            content = spec_files.requirements.read_text(encoding='utf-8')
            title = self.metadata_extractor.extract_title(content)
            description = self.metadata_extractor.extract_description(content)
        elif spec_files.design:
            content = spec_files.design.read_text(encoding='utf-8')
            title = self.metadata_extractor.extract_title(content)
            description = self.metadata_extractor.extract_description(content)
        
        if not title:
            title = spec_files.directory.name.replace("-", " ").title()
        
        if not description:
            description = f"Feature specification for {title}"
        
        # Determine category and priority
        category = self.metadata_extractor.infer_category(
            spec_files.directory.name,
            content
        )
        priority = self.metadata_extractor.infer_priority(content)
        
        # Calculate completion
        completion = 0.0
        if spec_files.tasks:
            try:
                completion = self.status_tracker.calculate_completion(
                    spec_files.tasks
                )
            except Exception:
                pass
        
        status = self.status_tracker.determine_status(completion, metadata)
        
        # Get completion date
        completion_date = None
        if completion == 1.0:
            completion_date = self.status_tracker.get_completion_date(
                spec_files.directory
            )
        
        # Assign timeline
        timeline = self.timeline_organizer.assign_quarter(
            completion_date,
            status
        )
        
        # Create Feature
        feature = Feature(
            name=spec_files.directory.name,
            title=title,
            description=description,
            category=category,
            priority=priority,
            status=status,
            timeline=timeline,
            target_date=None,
            completion_date=completion_date,
            completion_percentage=completion,
            spec_path=spec_files.directory,
            dependencies=[],
            tags=[]
        )
        
        return feature
    
    def _generate_roadmap_content(
        self,
        timeline_groups: Dict[str, List[Feature]]
    ) -> str:
        """
        Generate roadmap markdown content.
        
        Args:
            timeline_groups: Features organized by timeline
            
        Returns:
            Formatted roadmap markdown
        """
        # Generate header
        last_updated = datetime.now()
        content = self.formatter.format_header(last_updated)
        
        # Generate table of contents
        sections = list(timeline_groups.keys())
        content += self.formatter.format_toc(sections)
        
        # Generate quarter sections
        for quarter, features in timeline_groups.items():
            content += self.formatter.format_quarter_section(quarter, features)
        
        # Generate footer
        content += self.formatter.format_footer()
        
        return content
