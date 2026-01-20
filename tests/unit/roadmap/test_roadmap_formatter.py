"""
Unit tests for the RoadmapFormatter component.

Tests markdown generation including headers, TOC, sections, feature entries,
and footers.
"""

import pytest
from datetime import datetime
from pathlib import Path

from src.roadmap import (
    RoadmapFormatter,
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
def sample_feature():
    """Create a sample feature for testing."""
    return Feature(
        name="test-feature",
        title="Test Feature",
        description="This is a test feature for unit testing purposes.",
        category=FeatureCategory.UI,
        priority=Priority.HIGH,
        status=FeatureStatus.PLANNED,
        timeline="Q1 2026",
        spec_path=Path(".kiro/specs/test-feature"),
    )


class TestFormatHeader:
    """Tests for format_header method."""
    
    def test_header_contains_title(self, formatter):
        """Test that header contains the main title."""
        last_updated = datetime(2026, 1, 15, 14, 30)
        header = formatter.format_header(last_updated)
        
        assert "# StoryCore-Engine Development Roadmap" in header
    
    def test_header_contains_timestamp(self, formatter):
        """Test that header contains the last updated timestamp."""
        last_updated = datetime(2026, 1, 15, 14, 30)
        header = formatter.format_header(last_updated)
        
        assert "**Last Updated:**" in header
        assert "January 15, 2026" in header
    
    def test_header_contains_explanation(self, formatter):
        """Test that header contains purpose explanation."""
        last_updated = datetime(2026, 1, 15, 14, 30)
        header = formatter.format_header(last_updated)
        
        assert "About This Roadmap" in header
        assert "Timeline Quarters" in header
        assert "Priority Levels" in header


class TestFormatToc:
    """Tests for format_toc method."""
    
    def test_toc_with_sections(self, formatter):
        """Test TOC generation with multiple sections."""
        sections = ["Q1 2026", "Q2 2026", "Future Considerations"]
        toc = formatter.format_toc(sections)
        
        assert "## Table of Contents" in toc
        assert "[Q1 2026](#q1-2026)" in toc
        assert "[Q2 2026](#q2-2026)" in toc
        assert "[Future Considerations](#future-considerations)" in toc
    
    def test_toc_includes_legend(self, formatter):
        """Test that TOC includes link to legend."""
        sections = ["Q1 2026"]
        toc = formatter.format_toc(sections)
        
        assert "[Legend](#legend)" in toc
    
    def test_toc_empty_sections(self, formatter):
        """Test TOC with empty sections list."""
        toc = formatter.format_toc([])
        
        assert toc == ""
    
    def test_toc_includes_separator(self, formatter):
        """Test that TOC includes horizontal rule separator."""
        sections = ["Q1 2026"]
        toc = formatter.format_toc(sections)
        
        assert "---" in toc


class TestFormatQuarterSection:
    """Tests for format_quarter_section method."""
    
    def test_quarter_section_with_features(self, formatter, sample_feature):
        """Test quarter section generation with features."""
        section = formatter.format_quarter_section("Q1 2026", [sample_feature])
        
        assert "## Q1 2026" in section
        assert "### UI" in section
        assert "Test Feature" in section
    
    def test_quarter_section_groups_by_category(self, formatter):
        """Test that features are grouped by category."""
        features = [
            Feature(
                name="ui-feature",
                title="UI Feature",
                description="UI test",
                category=FeatureCategory.UI,
                priority=Priority.HIGH,
                status=FeatureStatus.PLANNED,
                spec_path=Path(".kiro/specs/ui-feature"),
            ),
            Feature(
                name="backend-feature",
                title="Backend Feature",
                description="Backend test",
                category=FeatureCategory.BACKEND,
                priority=Priority.MEDIUM,
                status=FeatureStatus.PLANNED,
                spec_path=Path(".kiro/specs/backend-feature"),
            ),
        ]
        
        section = formatter.format_quarter_section("Q1 2026", features)
        
        # Check that both categories appear
        assert "### Backend" in section
        assert "### UI" in section
        
        # Check that Backend appears before UI (alphabetical order)
        backend_pos = section.index("### Backend")
        ui_pos = section.index("### UI")
        assert backend_pos < ui_pos
    
    def test_quarter_section_empty_features(self, formatter):
        """Test quarter section with no features."""
        section = formatter.format_quarter_section("Q1 2026", [])
        
        assert section == ""
    
    def test_quarter_section_includes_separator(self, formatter, sample_feature):
        """Test that quarter section includes horizontal rule."""
        section = formatter.format_quarter_section("Q1 2026", [sample_feature])
        
        assert "---" in section


class TestFormatFeatureEntry:
    """Tests for format_feature_entry method."""
    
    def test_feature_entry_contains_title(self, formatter, sample_feature):
        """Test that feature entry contains the title."""
        entry = formatter.format_feature_entry(sample_feature)
        
        assert "**Test Feature**" in entry
    
    def test_feature_entry_contains_status_emoji(self, formatter, sample_feature):
        """Test that feature entry contains status emoji."""
        entry = formatter.format_feature_entry(sample_feature)
        
        # Planned status should have 📋 emoji
        assert "📋" in entry
    
    def test_feature_entry_contains_priority_emoji(self, formatter, sample_feature):
        """Test that feature entry contains priority emoji."""
        entry = formatter.format_feature_entry(sample_feature)
        
        # High priority should have 🔴 emoji
        assert "🔴" in entry
    
    def test_feature_entry_contains_category_tag(self, formatter, sample_feature):
        """Test that feature entry contains category tag."""
        entry = formatter.format_feature_entry(sample_feature)
        
        assert "`UI`" in entry
    
    def test_feature_entry_contains_description(self, formatter, sample_feature):
        """Test that feature entry contains description."""
        entry = formatter.format_feature_entry(sample_feature)
        
        assert "This is a test feature" in entry
    
    def test_feature_entry_contains_spec_link(self, formatter, sample_feature):
        """Test that feature entry contains link to spec."""
        entry = formatter.format_feature_entry(sample_feature)
        
        assert "[View Spec]" in entry
        assert ".kiro/specs/test-feature" in entry
    
    def test_feature_entry_truncates_long_description(self, formatter):
        """Test that long descriptions are truncated."""
        long_description = "A" * 400  # Exceeds max_description_length of 300
        
        feature = Feature(
            name="test",
            title="Test",
            description=long_description,
            category=FeatureCategory.UI,
            priority=Priority.LOW,
            status=FeatureStatus.PLANNED,
            spec_path=Path(".kiro/specs/test"),
        )
        
        entry = formatter.format_feature_entry(feature)
        
        # Should be truncated with ellipsis
        assert "..." in entry
        # Description in entry should not exceed max length
        lines = entry.split("\n")
        description_line = [l for l in lines if l.strip() and not l.strip().startswith("-") and not l.strip().startswith("[")][0]
        assert len(description_line.strip()) <= 303  # 300 + "..."
    
    def test_feature_entry_different_statuses(self, formatter):
        """Test feature entries with different statuses."""
        statuses = [
            (FeatureStatus.COMPLETED, "✅"),
            (FeatureStatus.IN_PROGRESS, "🚧"),
            (FeatureStatus.PLANNED, "📋"),
            (FeatureStatus.FUTURE, "💡"),
        ]
        
        for status, emoji in statuses:
            feature = Feature(
                name="test",
                title="Test",
                description="Test",
                category=FeatureCategory.UI,
                priority=Priority.MEDIUM,
                status=status,
                spec_path=Path(".kiro/specs/test"),
            )
            
            entry = formatter.format_feature_entry(feature)
            assert emoji in entry


class TestFormatFooter:
    """Tests for format_footer method."""
    
    def test_footer_contains_legend_heading(self, formatter):
        """Test that footer contains legend heading."""
        footer = formatter.format_footer()
        
        assert "## Legend" in footer
    
    def test_footer_contains_status_indicators(self, formatter):
        """Test that footer explains status indicators."""
        footer = formatter.format_footer()
        
        assert "### Status Indicators" in footer
        assert "✅" in footer
        assert "🚧" in footer
        assert "📋" in footer
        assert "💡" in footer
    
    def test_footer_contains_priority_levels(self, formatter):
        """Test that footer explains priority levels."""
        footer = formatter.format_footer()
        
        assert "### Priority Levels" in footer
        assert "🔴" in footer
        assert "🟡" in footer
        assert "🟢" in footer
    
    def test_footer_contains_categories(self, formatter):
        """Test that footer explains categories."""
        footer = formatter.format_footer()
        
        assert "### Categories" in footer
        assert "`UI`" in footer
        assert "`Backend`" in footer
        assert "`Infrastructure`" in footer
    
    def test_footer_contains_additional_resources(self, formatter):
        """Test that footer includes additional resources."""
        footer = formatter.format_footer()
        
        assert "## Additional Resources" in footer
        assert "CHANGELOG.md" in footer
        assert "CONTRIBUTING.md" in footer


class TestGenerateAnchor:
    """Tests for _generate_anchor helper method."""
    
    def test_anchor_lowercase(self, formatter):
        """Test that anchors are converted to lowercase."""
        anchor = formatter._generate_anchor("Q1 2026")
        
        assert anchor == "q1-2026"
    
    def test_anchor_spaces_to_hyphens(self, formatter):
        """Test that spaces are converted to hyphens."""
        anchor = formatter._generate_anchor("Future Considerations")
        
        assert anchor == "future-considerations"
    
    def test_anchor_removes_special_chars(self, formatter):
        """Test that special characters are removed."""
        anchor = formatter._generate_anchor("Test & Feature!")
        
        assert anchor == "test-feature"


class TestFormatSpecLink:
    """Tests for _format_spec_link helper method."""
    
    def test_spec_link_format(self, formatter, sample_feature):
        """Test that spec links are formatted correctly."""
        link = formatter._format_spec_link(sample_feature)
        
        assert link == ".kiro/specs/test-feature"
    
    def test_spec_link_uses_forward_slashes(self, formatter):
        """Test that spec links use forward slashes on all platforms."""
        feature = Feature(
            name="test",
            title="Test",
            description="Test",
            category=FeatureCategory.UI,
            priority=Priority.LOW,
            status=FeatureStatus.PLANNED,
            spec_path=Path(".kiro\\specs\\test"),  # Windows-style path
        )
        
        link = formatter._format_spec_link(feature)
        
        # Should convert to forward slashes
        assert "\\" not in link
        assert "/" in link
