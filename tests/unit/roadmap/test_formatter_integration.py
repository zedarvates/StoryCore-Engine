"""
Integration tests for RoadmapFormatter with other components.

Tests the formatter's ability to work with real feature data from
other roadmap components.
"""

import pytest
from datetime import datetime
from pathlib import Path

from src.roadmap import (
    RoadmapFormatter,
    TimelineOrganizer,
    Feature,
    FeatureCategory,
    Priority,
    FeatureStatus,
    RoadmapConfig,
)


@pytest.fixture
def config():
    """Create a default RoadmapConfig for testing."""
    return RoadmapConfig()


@pytest.fixture
def formatter(config):
    """Create a RoadmapFormatter instance for testing."""
    return RoadmapFormatter(config)


@pytest.fixture
def timeline_organizer():
    """Create a TimelineOrganizer instance for testing."""
    return TimelineOrganizer()


@pytest.fixture
def sample_features():
    """Create a list of sample features for testing."""
    return [
        Feature(
            name="ui-feature",
            title="UI Enhancement",
            description="Improve user interface components.",
            category=FeatureCategory.UI,
            priority=Priority.HIGH,
            status=FeatureStatus.IN_PROGRESS,
            target_date=datetime(2026, 2, 15),
            completion_percentage=0.5,
            spec_path=Path(".kiro/specs/ui-feature"),
        ),
        Feature(
            name="backend-feature",
            title="Backend Optimization",
            description="Optimize backend processing pipeline.",
            category=FeatureCategory.BACKEND,
            priority=Priority.MEDIUM,
            status=FeatureStatus.PLANNED,
            target_date=datetime(2026, 3, 1),
            spec_path=Path(".kiro/specs/backend-feature"),
        ),
        Feature(
            name="completed-feature",
            title="Completed Feature",
            description="This feature is already done.",
            category=FeatureCategory.TESTING,
            priority=Priority.HIGH,
            status=FeatureStatus.COMPLETED,
            completion_date=datetime(2025, 12, 15),
            completion_percentage=1.0,
            spec_path=Path(".kiro/specs/completed-feature"),
        ),
        Feature(
            name="future-feature",
            title="Future Consideration",
            description="Feature for future development.",
            category=FeatureCategory.INFRASTRUCTURE,
            priority=Priority.LOW,
            status=FeatureStatus.FUTURE,
            spec_path=Path(".kiro/specs/future-feature"),
        ),
    ]


class TestFormatterWithTimelineOrganizer:
    """Tests for RoadmapFormatter integration with TimelineOrganizer."""
    
    def test_format_organized_timeline(
        self,
        formatter,
        timeline_organizer,
        sample_features
    ):
        """Test formatting features organized by timeline."""
        # Organize features by timeline
        timeline_groups = timeline_organizer.organize_by_timeline(sample_features)
        
        # Format each quarter section
        sections = []
        for quarter, features in timeline_groups.items():
            # Sort features within quarter
            sorted_features = timeline_organizer.sort_within_quarter(features)
            
            # Format the section
            section = formatter.format_quarter_section(quarter, sorted_features)
            sections.append(section)
        
        # Verify sections were created
        assert len(sections) > 0
        
        # Verify Q4 2025 section exists (completed feature)
        q4_2025_section = [s for s in sections if "Q4 2025" in s]
        assert len(q4_2025_section) == 1
        assert "Completed Feature" in q4_2025_section[0]
        
        # Verify Q1 2026 section exists (in-progress and planned features)
        q1_2026_section = [s for s in sections if "Q1 2026" in s]
        assert len(q1_2026_section) == 1
        assert "UI Enhancement" in q1_2026_section[0]
        assert "Backend Optimization" in q1_2026_section[0]
        
        # Verify Future Considerations section exists
        future_section = [s for s in sections if "Future Considerations" in s]
        assert len(future_section) == 1
        assert "Future Consideration" in future_section[0]
    
    def test_priority_ordering_in_formatted_output(
        self,
        formatter,
        timeline_organizer,
        sample_features
    ):
        """Test that high priority features appear before low priority within same category."""
        # Create features with same category but different priorities
        same_category_features = [
            Feature(
                name="low-priority",
                title="Low Priority Feature",
                description="Low priority test",
                category=FeatureCategory.UI,
                priority=Priority.LOW,
                status=FeatureStatus.PLANNED,
                target_date=datetime(2026, 2, 15),
                spec_path=Path(".kiro/specs/low-priority"),
            ),
            Feature(
                name="high-priority",
                title="High Priority Feature",
                description="High priority test",
                category=FeatureCategory.UI,
                priority=Priority.HIGH,
                status=FeatureStatus.PLANNED,
                target_date=datetime(2026, 2, 15),
                spec_path=Path(".kiro/specs/high-priority"),
            ),
        ]
        
        # Sort features
        sorted_features = timeline_organizer.sort_within_quarter(same_category_features)
        
        # Format section
        section = formatter.format_quarter_section("Q1 2026", sorted_features)
        
        # Find positions of features
        high_priority_pos = section.find("High Priority Feature")
        low_priority_pos = section.find("Low Priority Feature")
        
        # High priority should come before low priority
        assert high_priority_pos < low_priority_pos


class TestCompleteRoadmapGeneration:
    """Tests for generating a complete roadmap document."""
    
    def test_generate_complete_roadmap(
        self,
        formatter,
        timeline_organizer,
        sample_features
    ):
        """Test generating a complete roadmap with all sections."""
        last_updated = datetime(2026, 1, 19, 14, 30)
        
        # Generate header
        header = formatter.format_header(last_updated)
        
        # Organize features
        timeline_groups = timeline_organizer.organize_by_timeline(sample_features)
        
        # Generate TOC
        toc = formatter.format_toc(list(timeline_groups.keys()))
        
        # Generate quarter sections
        sections = []
        for quarter, features in timeline_groups.items():
            sorted_features = timeline_organizer.sort_within_quarter(features)
            section = formatter.format_quarter_section(quarter, sorted_features)
            sections.append(section)
        
        # Generate footer
        footer = formatter.format_footer()
        
        # Combine into complete roadmap
        roadmap = header + toc + "".join(sections) + footer
        
        # Verify complete roadmap structure
        assert "# StoryCore-Engine Development Roadmap" in roadmap
        assert "## Table of Contents" in roadmap
        assert "## Q4 2025" in roadmap
        assert "## Q1 2026" in roadmap
        assert "## Future Considerations" in roadmap
        assert "## Legend" in roadmap
        
        # Verify all features are present
        assert "UI Enhancement" in roadmap
        assert "Backend Optimization" in roadmap
        assert "Completed Feature" in roadmap
        assert "Future Consideration" in roadmap
        
        # Verify links are present
        assert "[View Spec]" in roadmap
        assert ".kiro/specs/" in roadmap
    
    def test_roadmap_markdown_validity(
        self,
        formatter,
        timeline_organizer,
        sample_features
    ):
        """Test that generated roadmap is valid markdown."""
        last_updated = datetime(2026, 1, 19, 14, 30)
        
        # Generate complete roadmap
        header = formatter.format_header(last_updated)
        timeline_groups = timeline_organizer.organize_by_timeline(sample_features)
        toc = formatter.format_toc(list(timeline_groups.keys()))
        
        sections = []
        for quarter, features in timeline_groups.items():
            sorted_features = timeline_organizer.sort_within_quarter(features)
            section = formatter.format_quarter_section(quarter, sorted_features)
            sections.append(section)
        
        footer = formatter.format_footer()
        roadmap = header + toc + "".join(sections) + footer
        
        # Check for proper markdown structure
        assert roadmap.count("# ") >= 1  # At least one H1
        assert roadmap.count("## ") >= 3  # Multiple H2s
        assert roadmap.count("### ") >= 1  # At least one H3
        assert roadmap.count("- ") >= 4  # Multiple bullet points
        assert roadmap.count("---") >= 2  # Multiple horizontal rules
        
        # Check for proper link syntax
        assert "[" in roadmap and "](" in roadmap
        
        # Check for proper code formatting
        assert "`" in roadmap
