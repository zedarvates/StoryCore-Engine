"""
Roadmap Formatter component for the Public Roadmap System.

This module generates well-formatted markdown output for the public roadmap,
including headers, table of contents, feature sections, and footers.
"""

import logging
from datetime import datetime
from typing import Dict, List

from .models import Feature, FeatureCategory, FeatureStatus, Priority, RoadmapConfig


# Configure logging
logger = logging.getLogger(__name__)


class RoadmapFormatter:
    """
    Generates well-formatted markdown output for the public roadmap.
    
    This class handles:
    - Header generation with title and timestamp
    - Table of contents with anchor links
    - Quarter sections with features grouped by category
    - Feature entries with emoji, title, description, and links
    - Footer with legend and additional information
    """
    
    def __init__(self, config: RoadmapConfig):
        """
        Initialize the RoadmapFormatter.
        
        Args:
            config: Configuration object with emoji mappings and settings
        """
        self.config = config
    
    def format_header(self, last_updated: datetime) -> str:
        """
        Generate the roadmap header with title and last updated timestamp.
        
        Creates a markdown header section that includes:
        - Main title (H1)
        - Purpose and structure explanation
        - Last updated timestamp
        
        Args:
            last_updated: Timestamp for when the roadmap was generated/updated
            
        Returns:
            Formatted markdown header string
        """
        timestamp = last_updated.strftime("%B %d, %Y at %I:%M %p")
        
        header = f"""# StoryCore-Engine Development Roadmap

Welcome to the StoryCore-Engine public roadmap! This document provides visibility into our development direction, organized by timeline and priority.

**Last Updated:** {timestamp}

## About This Roadmap

This roadmap consolidates information from our internal technical specifications and presents it in a user-friendly format. Features are organized by:

- **Timeline Quarters**: When we plan to deliver capabilities
- **Priority Levels**: Which features are most critical
- **Categories**: Type of work (UI, Backend, Infrastructure, etc.)
- **Status**: Current implementation state

For detailed technical specifications, follow the links to individual feature documents.

"""
        return header
    
    def format_toc(self, sections: List[str]) -> str:
        """
        Generate table of contents with anchor links.
        
        Creates a markdown TOC with links to major sections in the roadmap.
        Anchor links are generated from section names by converting to lowercase
        and replacing spaces with hyphens.
        
        Args:
            sections: List of section names (e.g., ["Q1 2026", "Q2 2026", "Future Considerations"])
            
        Returns:
            Formatted markdown table of contents
        """
        if not sections:
            return ""
        
        toc = "## Table of Contents\n\n"
        
        for section in sections:
            # Generate anchor link from section name
            anchor = self._generate_anchor(section)
            toc += f"- [{section}](#{anchor})\n"
        
        # Add standard sections
        toc += "- [Legend](#legend)\n"
        toc += "\n---\n\n"
        
        return toc
    
    def format_quarter_section(
        self,
        quarter: str,
        features: List[Feature]
    ) -> str:
        """
        Format a quarter section with features grouped by category.
        
        Creates a markdown section for a specific quarter, organizing features
        by their category (UI, Backend, Infrastructure, etc.) and formatting
        each feature entry with appropriate emoji and details.
        
        Args:
            quarter: Quarter name (e.g., "Q1 2026", "Future Considerations")
            features: List of features for this quarter
            
        Returns:
            Formatted markdown section for the quarter
        """
        if not features:
            return ""
        
        section = f"## {quarter}\n\n"
        
        # Group features by category
        features_by_category: Dict[FeatureCategory, List[Feature]] = {}
        for feature in features:
            if feature.category not in features_by_category:
                features_by_category[feature.category] = []
            features_by_category[feature.category].append(feature)
        
        # Sort categories for consistent output
        sorted_categories = sorted(
            features_by_category.keys(),
            key=lambda c: c.value
        )
        
        # Format each category subsection
        for category in sorted_categories:
            category_features = features_by_category[category]
            section += f"### {category.value}\n\n"
            
            for feature in category_features:
                section += self.format_feature_entry(feature)
                section += "\n"
            
            section += "\n"
        
        section += "---\n\n"
        
        return section
    
    def format_feature_entry(self, feature: Feature) -> str:
        """
        Format a single feature entry with emoji, title, description, and links.
        
        Creates a markdown bullet point entry for a feature, including:
        - Status emoji (✅, 🚧, 📋, 💡)
        - Priority indicator (🔴, 🟡, 🟢)
        - Feature title
        - Category tag
        - Description (truncated to max length)
        - Link to detailed spec
        
        Args:
            feature: Feature object to format
            
        Returns:
            Formatted markdown feature entry
        """
        # Get emoji for status and priority
        status_emoji = self.config.status_emoji.get(feature.status, "")
        priority_emoji = self.config.priority_emoji.get(feature.priority, "")
        
        # Truncate description if needed
        description = feature.description
        if len(description) > self.config.max_description_length:
            description = description[:self.config.max_description_length - 3] + "..."
        
        # Generate spec link
        spec_link = self._format_spec_link(feature)
        
        # Build feature entry
        entry = f"- {status_emoji} **{feature.title}** {priority_emoji} `{feature.category.value}`\n"
        entry += f"  {description}\n"
        entry += f"  [View Spec]({spec_link})\n"
        
        return entry
    
    def format_footer(self) -> str:
        """
        Generate the roadmap footer with legend and links.
        
        Creates a footer section that includes:
        - Legend explaining status emoji
        - Legend explaining priority indicators
        - Legend explaining category tags
        - Links to changelog and contribution guidelines
        
        Returns:
            Formatted markdown footer string
        """
        footer = """## Legend

### Status Indicators

- ✅ **Completed**: Feature is fully implemented and tested
- 🚧 **In Progress**: Feature is currently being developed
- 📋 **Planned**: Feature is scheduled for development
- 💡 **Future Considerations**: Feature is under consideration for future releases

### Priority Levels

- 🔴 **High Priority**: Critical features for core functionality
- 🟡 **Medium Priority**: Important features for enhanced capabilities
- 🟢 **Low Priority**: Nice-to-have features and optimizations

### Categories

- `UI`: User interface and creative studio components
- `Backend`: Core engine and processing logic
- `Infrastructure`: System architecture and deployment
- `Documentation`: User guides and technical documentation
- `Testing`: Test suites and quality assurance
- `Tooling`: Development tools and CLI commands
- `Migration`: Code refactoring and modernization

---

## Additional Resources

- **[CHANGELOG.md](CHANGELOG.md)**: View completed features and release history
- **[Contributing Guidelines](CONTRIBUTING.md)**: Learn how to contribute to StoryCore-Engine
- **[Technical Specs](.kiro/specs/)**: Browse detailed internal specifications

---

*This roadmap is automatically generated from internal specifications and updated regularly. For questions or suggestions, please open an issue on GitHub.*
"""
        return footer
    
    def _generate_anchor(self, section_name: str) -> str:
        """
        Generate a markdown anchor link from a section name.
        
        Converts section names to valid anchor links by:
        - Converting to lowercase
        - Replacing spaces with hyphens
        - Removing special characters
        
        Args:
            section_name: Section name to convert
            
        Returns:
            Anchor link string (without the # prefix)
        """
        # Convert to lowercase and replace spaces with hyphens
        anchor = section_name.lower().replace(" ", "-")
        
        # Remove special characters except hyphens
        anchor = "".join(c for c in anchor if c.isalnum() or c == "-")
        
        # Remove consecutive hyphens
        while "--" in anchor:
            anchor = anchor.replace("--", "-")
        
        # Remove leading/trailing hyphens
        anchor = anchor.strip("-")
        
        return anchor
    
    def _format_spec_link(self, feature: Feature) -> str:
        """
        Format a relative link to a feature's spec directory.
        
        Creates a relative path link from the roadmap location to the
        feature's spec directory.
        
        Args:
            feature: Feature object with spec_path
            
        Returns:
            Relative link string to the spec directory
        """
        # Convert Path to string and ensure forward slashes
        spec_path_str = str(feature.spec_path).replace("\\", "/")
        
        return spec_path_str
