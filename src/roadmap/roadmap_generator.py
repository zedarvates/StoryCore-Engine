"""
Roadmap Generator orchestrator for the Public Roadmap System.

This module coordinates all components to generate and maintain the public roadmap.
It integrates spec scanning, metadata extraction, status tracking, timeline organization,
formatting, changelog writing, link validation, and badge injection.
"""

import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from .models import Feature, FeatureCategory, Priority, RoadmapConfig, SpecFiles
from .spec_scanner import SpecScanner
from .metadata_extractor import MetadataExtractor
from .status_tracker import StatusTracker
from .timeline_organizer import TimelineOrganizer
from .roadmap_formatter import RoadmapFormatter
from .changelog_writer import ChangelogWriter
from .link_validator import LinkValidator
from .spec_badge_injector import SpecBadgeInjector


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RoadmapGenerator:
    """
    Orchestrates the complete roadmap generation pipeline.
    
    This class coordinates all components to:
    1. Scan specs directory for feature specifications
    2. Extract metadata from each spec
    3. Track implementation status
    4. Organize features by timeline
    5. Format the roadmap markdown
    6. Generate changelog for completed features
    7. Validate all links
    8. Inject badges into spec files
    9. Write ROADMAP.md and CHANGELOG.md to disk
    """
    
    def __init__(self, config: Optional[RoadmapConfig] = None):
        """
        Initialize the RoadmapGenerator.
        
        Args:
            config: Configuration object (uses defaults if not provided)
        """
        self.config = config or RoadmapConfig()
        
        # Initialize all components
        self.scanner = SpecScanner(self.config.specs_directory)
        self.metadata_extractor = MetadataExtractor()
        self.status_tracker = StatusTracker()
        self.timeline_organizer = TimelineOrganizer()
        self.formatter = RoadmapFormatter(self.config)
        self.changelog_writer = ChangelogWriter(self.config.changelog_path)
        self.link_validator = LinkValidator(self.config.output_path)
        self.badge_injector = SpecBadgeInjector(self.config.output_path)
        
        logger.info("RoadmapGenerator initialized with config: %s", self.config)
    
    def generate(self) -> None:
        """
        Run the complete roadmap generation pipeline.
        
        This method orchestrates all components to:
        1. Discover all spec directories
        2. Extract and process metadata for each feature
        3. Organize features by timeline and priority
        4. Generate formatted roadmap markdown
        5. Create changelog for completed features
        6. Validate and fix links
        7. Inject badges into spec files
        8. Write output files to disk
        
        Raises:
            Exception: If any critical step fails (logged and re-raised)
        """
        try:
            logger.info("Starting roadmap generation pipeline...")
            
            # Step 1: Scan specs directory
            logger.info("Step 1: Scanning specs directory: %s", self.config.specs_directory)
            spec_files_list = self.scanner.scan_specs_directory()
            logger.info("Found %d spec directories", len(spec_files_list))
            
            if not spec_files_list:
                logger.warning("No spec directories found. Creating empty roadmap.")
                self._generate_empty_roadmap()
                return
            
            # Step 2: Extract metadata and build Feature objects
            logger.info("Step 2: Extracting metadata from specs...")
            features = self._build_features(spec_files_list)
            logger.info("Processed %d features", len(features))
            
            # Step 3: Organize features by timeline
            logger.info("Step 3: Organizing features by timeline...")
            timeline_groups = self.timeline_organizer.organize_by_timeline(features)
            
            # Sort features within each quarter by priority
            for quarter in timeline_groups:
                timeline_groups[quarter] = self.timeline_organizer.sort_within_quarter(
                    timeline_groups[quarter]
                )
            
            logger.info("Organized into %d timeline groups", len(timeline_groups))
            
            # Step 4: Format roadmap markdown
            logger.info("Step 4: Formatting roadmap markdown...")
            roadmap_content = self._format_roadmap(timeline_groups)
            
            # Step 5: Write ROADMAP.md to disk
            logger.info("Step 5: Writing ROADMAP.md to %s", self.config.output_path)
            self._write_roadmap(roadmap_content)
            
            # Step 6: Generate changelog for completed features
            logger.info("Step 6: Generating changelog...")
            self._generate_changelog(features)
            
            # Step 7: Validate links
            logger.info("Step 7: Validating links...")
            self._validate_links(roadmap_content, spec_files_list)
            
            # Step 8: Inject badges into spec files
            logger.info("Step 8: Injecting badges into spec files...")
            self._inject_badges(features)
            
            logger.info("Roadmap generation completed successfully!")
            logger.info("Generated files:")
            logger.info("  - %s", self.config.output_path)
            logger.info("  - %s", self.config.changelog_path)
            
        except Exception as e:
            logger.error("Roadmap generation failed: %s", e, exc_info=True)
            raise
    
    def _build_features(self, spec_files_list: List[SpecFiles]) -> List[Feature]:
        """
        Build Feature objects from SpecFiles by extracting metadata.
        
        Args:
            spec_files_list: List of SpecFiles objects from scanner
            
        Returns:
            List of Feature objects with complete metadata
        """
        features = []
        
        for spec_files in spec_files_list:
            try:
                feature = self._process_spec(spec_files)
                features.append(feature)
            except Exception as e:
                logger.warning(
                    "Failed to process spec %s: %s",
                    spec_files.directory,
                    e
                )
                # Continue processing other specs
                continue
        
        return features
    
    def _process_spec(self, spec_files: SpecFiles) -> Feature:
        """
        Process a single spec and create a Feature object.
        
        Args:
            spec_files: SpecFiles object with paths to spec files
            
        Returns:
            Feature object with extracted metadata
        """
        # Extract frontmatter metadata
        metadata = {}
        if spec_files.requirements:
            metadata = self.metadata_extractor.extract_frontmatter(spec_files.requirements)
        elif spec_files.design:
            metadata = self.metadata_extractor.extract_frontmatter(spec_files.design)
        
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
        
        # Use directory name as fallback title
        if not title:
            title = spec_files.directory.name.replace("-", " ").title()
        
        # Use placeholder description if none found
        if not description:
            description = f"Feature specification for {title}"
        
        # Determine category
        category = metadata.get('category')
        if category:
            try:
                category = FeatureCategory(category)
            except ValueError:
                logger.warning(
                    "Invalid category '%s' in %s, inferring from content",
                    category,
                    spec_files.directory
                )
                category = self.metadata_extractor.infer_category(
                    spec_files.directory.name,
                    content
                )
        else:
            category = self.metadata_extractor.infer_category(
                spec_files.directory.name,
                content
            )
        
        # Determine priority
        priority = metadata.get('priority')
        if priority:
            try:
                priority = Priority(priority)
            except ValueError:
                logger.warning(
                    "Invalid priority '%s' in %s, inferring from content",
                    priority,
                    spec_files.directory
                )
                priority = self.metadata_extractor.infer_priority(content)
        else:
            priority = self.metadata_extractor.infer_priority(content)
        
        # Calculate completion and determine status
        completion = 0.0
        if spec_files.tasks:
            try:
                completion = self.status_tracker.calculate_completion(spec_files.tasks)
            except Exception as e:
                logger.warning(
                    "Failed to calculate completion for %s: %s",
                    spec_files.directory,
                    e
                )
        
        status = self.status_tracker.determine_status(completion, metadata)
        
        # Get completion date if completed
        completion_date = None
        if completion == 1.0:
            completion_date = self.status_tracker.get_completion_date(spec_files.directory)
        
        # Parse target date from metadata
        target_date = None
        if 'timeline' in metadata:
            target_date = self._parse_timeline(metadata['timeline'])
        
        # Assign timeline quarter
        timeline = self.timeline_organizer.assign_quarter(
            target_date or completion_date,
            status
        )
        
        # Extract dependencies
        dependencies = metadata.get('dependencies', [])
        if isinstance(dependencies, str):
            dependencies = [d.strip() for d in dependencies.split(',')]
        
        # Extract tags
        tags = metadata.get('tags', [])
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(',')]
        
        # Create Feature object
        feature = Feature(
            name=spec_files.directory.name,
            title=title,
            description=description,
            category=category,
            priority=priority,
            status=status,
            timeline=timeline,
            target_date=target_date,
            completion_date=completion_date,
            completion_percentage=completion,
            spec_path=spec_files.directory,
            dependencies=dependencies,
            tags=tags
        )
        
        return feature
    
    def _parse_timeline(self, timeline_str: str) -> Optional[datetime]:
        """
        Parse timeline string to datetime.
        
        Supports formats like:
        - "Q1 2026" -> January 1, 2026
        - "2026-03-15" -> March 15, 2026
        - "March 2026" -> March 1, 2026
        
        Args:
            timeline_str: Timeline string from metadata
            
        Returns:
            Datetime object or None if parsing fails
        """
        import re
        
        # Try Q1 2026 format
        quarter_match = re.match(r'Q(\d)\s+(\d{4})', timeline_str)
        if quarter_match:
            quarter = int(quarter_match.group(1))
            year = int(quarter_match.group(2))
            month = (quarter - 1) * 3 + 1  # Q1->1, Q2->4, Q3->7, Q4->10
            return datetime(year, month, 1)
        
        # Try ISO date format
        try:
            return datetime.fromisoformat(timeline_str)
        except ValueError:
            pass
        
        # Try month year format
        try:
            return datetime.strptime(timeline_str, "%B %Y")
        except ValueError:
            pass
        
        logger.warning("Failed to parse timeline: %s", timeline_str)
        return None
    
    def _format_roadmap(self, timeline_groups: dict) -> str:
        """
        Format the complete roadmap markdown.
        
        Args:
            timeline_groups: Dictionary mapping quarters to feature lists
            
        Returns:
            Complete roadmap markdown content
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
    
    def _write_roadmap(self, content: str) -> None:
        """
        Write roadmap content to disk.
        
        Args:
            content: Formatted roadmap markdown
        """
        # Ensure parent directory exists
        self.config.output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write to file
        self.config.output_path.write_text(content, encoding='utf-8')
    
    def _generate_changelog(self, features: List[Feature]) -> None:
        """
        Generate changelog for completed features.
        
        Args:
            features: List of all features
        """
        # Filter completed features
        completed_features = [
            f for f in features
            if f.status.value == "completed"
        ]
        
        if not completed_features:
            logger.info("No completed features found for changelog")
        
        # Add entries to changelog writer
        for feature in completed_features:
            try:
                self.changelog_writer.append_entry(
                    feature,
                    feature.completion_date
                )
            except Exception as e:
                logger.warning(
                    "Failed to add changelog entry for %s: %s",
                    feature.name,
                    e
                )
        
        # Write changelog to disk
        self.changelog_writer.write_changelog()
        logger.info("Changelog written with %d entries", len(completed_features))
    
    def _validate_links(self, roadmap_content: str, spec_files_list: List[SpecFiles]) -> None:
        """
        Validate all links in the roadmap.
        
        Args:
            roadmap_content: The generated roadmap content
            spec_files_list: List of spec directories
        """
        # Validate spec links in roadmap
        broken_links = self.link_validator.validate_spec_links(roadmap_content)
        
        if broken_links:
            logger.warning("Found %d broken links in roadmap:", len(broken_links))
            for link in broken_links:
                logger.warning(
                    "  Line %d: %s -> %s (%s)",
                    link.line_number,
                    link.link_text,
                    link.target_path,
                    link.reason
                )
        else:
            logger.info("All spec links are valid")
        
        # Validate roadmap badges in specs
        spec_dirs = [sf.directory for sf in spec_files_list]
        missing_badges = self.link_validator.validate_roadmap_badges(spec_dirs)
        
        if missing_badges:
            logger.info("Found %d specs without roadmap badges", len(missing_badges))
        else:
            logger.info("All specs have roadmap badges")
    
    def _inject_badges(self, features: List[Feature]) -> None:
        """
        Inject roadmap badges into spec files.
        
        Args:
            features: List of features to inject badges for
        """
        for feature in features:
            # Find requirements.md file
            requirements_file = feature.spec_path / "requirements.md"
            
            if not requirements_file.exists():
                logger.debug(
                    "No requirements.md found for %s, skipping badge injection",
                    feature.name
                )
                continue
            
            try:
                # Generate anchor from feature name
                anchor = feature.name.lower()
                
                # Inject badge
                self.badge_injector.inject_badge(requirements_file, anchor)
                logger.debug("Injected badge for %s", feature.name)
                
            except Exception as e:
                logger.warning(
                    "Failed to inject badge for %s: %s",
                    feature.name,
                    e
                )
    
    def _generate_empty_roadmap(self) -> None:
        """
        Generate an empty roadmap when no specs are found.
        """
        content = """# StoryCore-Engine Development Roadmap

Welcome to the StoryCore-Engine public roadmap!

**Last Updated:** {timestamp}

## No Features Yet

This project doesn't have any feature specifications yet. Check back soon!

To add features, create specification directories in `.kiro/specs/` with:
- `requirements.md` - Feature requirements
- `design.md` - Technical design
- `tasks.md` - Implementation tasks

---

*This roadmap is automatically generated from internal specifications.*
""".format(timestamp=datetime.now().strftime("%B %d, %Y at %I:%M %p"))
        
        self._write_roadmap(content)
        
        # Also create empty changelog
        self.changelog_writer.write_changelog([])
        
        logger.info("Generated empty roadmap and changelog")
