"""
Unit tests for the ChangelogWriter component.

Tests the functionality of creating, formatting, and organizing changelog
entries for completed features.
"""

import pytest
from datetime import datetime
from pathlib import Path
import tempfile
import shutil

from src.roadmap import (
    ChangelogWriter,
    ChangelogEntry,
    Feature,
    FeatureStatus,
    FeatureCategory,
    Priority,
)


@pytest.fixture
def temp_dir():
    """Create a temporary directory for test files."""
    temp_path = Path(tempfile.mkdtemp())
    yield temp_path
    shutil.rmtree(temp_path)


@pytest.fixture
def sample_feature():
    """Create a sample completed feature for testing."""
    return Feature(
        name="user-authentication",
        title="User Authentication System",
        description="Complete authentication system with OAuth2 support and session management.",
        category=FeatureCategory.BACKEND,
        priority=Priority.HIGH,
        status=FeatureStatus.COMPLETED,
        completion_date=datetime(2026, 1, 15),
        completion_percentage=1.0,
        spec_path=Path(".kiro/specs/user-authentication")
    )


@pytest.fixture
def sample_feature_2():
    """Create another sample completed feature for testing."""
    return Feature(
        name="dashboard-ui",
        title="Dashboard UI",
        description="Modern dashboard interface with real-time updates.",
        category=FeatureCategory.UI,
        priority=Priority.MEDIUM,
        status=FeatureStatus.COMPLETED,
        completion_date=datetime(2026, 1, 10),
        completion_percentage=1.0,
        spec_path=Path(".kiro/specs/dashboard-ui")
    )


class TestChangelogEntry:
    """Tests for the ChangelogEntry class."""
    
    def test_entry_initialization(self, sample_feature):
        """Test that ChangelogEntry initializes correctly."""
        completion_date = datetime(2026, 1, 15)
        entry = ChangelogEntry(
            feature=sample_feature,
            completion_date=completion_date,
            version="v1.2.0"
        )
        
        assert entry.feature == sample_feature
        assert entry.completion_date == completion_date
        assert entry.version == "v1.2.0"
    
    def test_entry_without_version(self, sample_feature):
        """Test ChangelogEntry without version."""
        completion_date = datetime(2026, 1, 15)
        entry = ChangelogEntry(
            feature=sample_feature,
            completion_date=completion_date
        )
        
        assert entry.feature == sample_feature
        assert entry.completion_date == completion_date
        assert entry.version is None


class TestChangelogWriter:
    """Tests for the ChangelogWriter class."""
    
    def test_initialization(self, temp_dir):
        """Test ChangelogWriter initialization."""
        changelog_path = temp_dir / "CHANGELOG.md"
        writer = ChangelogWriter(changelog_path)
        
        assert writer.changelog_path == changelog_path
        assert writer.entries == []
    
    def test_append_entry_completed_feature(self, sample_feature):
        """Test appending a completed feature."""
        writer = ChangelogWriter()
        completion_date = datetime(2026, 1, 15)
        
        writer.append_entry(
            feature=sample_feature,
            completion_date=completion_date,
            version="v1.2.0"
        )
        
        assert len(writer.entries) == 1
        assert writer.entries[0].feature == sample_feature
        assert writer.entries[0].completion_date == completion_date
        assert writer.entries[0].version == "v1.2.0"
    
    def test_append_entry_uses_feature_completion_date(self, sample_feature):
        """Test that append_entry uses feature's completion_date if not provided."""
        writer = ChangelogWriter()
        
        writer.append_entry(feature=sample_feature)
        
        assert len(writer.entries) == 1
        assert writer.entries[0].completion_date == sample_feature.completion_date
    
    def test_append_entry_non_completed_feature_raises_error(self):
        """Test that appending non-completed feature raises ValueError."""
        writer = ChangelogWriter()
        in_progress_feature = Feature(
            name="test-feature",
            title="Test Feature",
            description="Test description",
            category=FeatureCategory.BACKEND,
            priority=Priority.MEDIUM,
            status=FeatureStatus.IN_PROGRESS,
            completion_percentage=0.5,
            spec_path=Path(".kiro/specs/test-feature")
        )
        
        with pytest.raises(ValueError, match="Cannot add non-completed feature"):
            writer.append_entry(feature=in_progress_feature)
    
    def test_format_entry(self, sample_feature):
        """Test formatting a single changelog entry."""
        writer = ChangelogWriter()
        entry = ChangelogEntry(
            feature=sample_feature,
            completion_date=datetime(2026, 1, 15),
            version="v1.2.0"
        )
        
        formatted = writer.format_entry(entry)
        
        # Check that formatted entry contains expected elements
        assert "### User Authentication System" in formatted
        assert "**Released:** 2026-01-15" in formatted
        assert sample_feature.description in formatted
        assert "[View in Roadmap](ROADMAP.md#user-authentication-system)" in formatted
    
    def test_format_entry_anchor_generation(self):
        """Test that anchor links are generated correctly."""
        writer = ChangelogWriter()
        feature = Feature(
            name="test",
            title="Test Feature With Spaces & Special!",
            description="Test description",
            category=FeatureCategory.BACKEND,
            priority=Priority.MEDIUM,
            status=FeatureStatus.COMPLETED,
            completion_date=datetime(2026, 1, 15),
            completion_percentage=1.0,
            spec_path=Path(".kiro/specs/test")
        )
        entry = ChangelogEntry(feature=feature, completion_date=datetime(2026, 1, 15))
        
        formatted = writer.format_entry(entry)
        
        # Anchor should have special characters removed
        assert "[View in Roadmap](ROADMAP.md#test-feature-with-spaces--special)" in formatted
    
    def test_organize_by_version_empty(self):
        """Test organizing empty changelog."""
        writer = ChangelogWriter()
        
        changelog = writer.organize_by_version()
        
        assert "# Changelog" in changelog
        assert "No Releases Yet" in changelog
        assert "[View Roadmap](ROADMAP.md)" in changelog
    
    def test_organize_by_version_single_entry(self, sample_feature):
        """Test organizing changelog with single entry."""
        writer = ChangelogWriter()
        writer.append_entry(
            feature=sample_feature,
            completion_date=datetime(2026, 1, 15),
            version="v1.2.0"
        )
        
        changelog = writer.organize_by_version()
        
        assert "# Changelog" in changelog
        assert "## v1.2.0" in changelog
        assert "### User Authentication System" in changelog
        assert "**Released:** 2026-01-15" in changelog
    
    def test_organize_by_version_multiple_entries_same_version(
        self, sample_feature, sample_feature_2
    ):
        """Test organizing multiple entries with same version."""
        writer = ChangelogWriter()
        writer.append_entry(
            feature=sample_feature,
            completion_date=datetime(2026, 1, 15),
            version="v1.2.0"
        )
        writer.append_entry(
            feature=sample_feature_2,
            completion_date=datetime(2026, 1, 10),
            version="v1.2.0"
        )
        
        changelog = writer.organize_by_version()
        
        assert "# Changelog" in changelog
        assert "## v1.2.0" in changelog
        assert "### User Authentication System" in changelog
        assert "### Dashboard UI" in changelog
        
        # Verify reverse chronological order (newer first)
        auth_pos = changelog.index("User Authentication System")
        dashboard_pos = changelog.index("Dashboard UI")
        assert auth_pos < dashboard_pos
    
    def test_organize_by_version_multiple_versions(
        self, sample_feature, sample_feature_2
    ):
        """Test organizing entries across multiple versions."""
        writer = ChangelogWriter()
        writer.append_entry(
            feature=sample_feature,
            completion_date=datetime(2026, 1, 15),
            version="v1.2.0"
        )
        writer.append_entry(
            feature=sample_feature_2,
            completion_date=datetime(2025, 12, 10),
            version="v1.1.0"
        )
        
        changelog = writer.organize_by_version()
        
        assert "## v1.2.0" in changelog
        assert "## v1.1.0" in changelog
        
        # Verify newer version appears first
        v12_pos = changelog.index("## v1.2.0")
        v11_pos = changelog.index("## v1.1.0")
        assert v12_pos < v11_pos
    
    def test_organize_by_month_without_version(
        self, sample_feature, sample_feature_2
    ):
        """Test organizing entries by month when no version provided."""
        writer = ChangelogWriter()
        writer.append_entry(
            feature=sample_feature,
            completion_date=datetime(2026, 1, 15)
        )
        writer.append_entry(
            feature=sample_feature_2,
            completion_date=datetime(2025, 12, 10)
        )
        
        changelog = writer.organize_by_version()
        
        assert "## January 2026" in changelog
        assert "## December 2025" in changelog
        
        # Verify newer month appears first
        jan_pos = changelog.index("## January 2026")
        dec_pos = changelog.index("## December 2025")
        assert jan_pos < dec_pos
    
    def test_write_changelog(self, temp_dir, sample_feature):
        """Test writing changelog to disk."""
        changelog_path = temp_dir / "CHANGELOG.md"
        writer = ChangelogWriter(changelog_path)
        writer.append_entry(
            feature=sample_feature,
            completion_date=datetime(2026, 1, 15),
            version="v1.2.0"
        )
        
        writer.write_changelog()
        
        assert changelog_path.exists()
        content = changelog_path.read_text(encoding="utf-8")
        assert "# Changelog" in content
        assert "## v1.2.0" in content
        assert "### User Authentication System" in content
    
    def test_write_changelog_creates_parent_directory(self, temp_dir, sample_feature):
        """Test that write_changelog creates parent directories if needed."""
        changelog_path = temp_dir / "nested" / "dir" / "CHANGELOG.md"
        writer = ChangelogWriter(changelog_path)
        writer.append_entry(
            feature=sample_feature,
            completion_date=datetime(2026, 1, 15)
        )
        
        writer.write_changelog()
        
        assert changelog_path.exists()
        assert changelog_path.parent.exists()
    
    def test_write_empty_changelog(self, temp_dir):
        """Test writing an empty changelog."""
        changelog_path = temp_dir / "CHANGELOG.md"
        writer = ChangelogWriter(changelog_path)
        
        writer.write_changelog()
        
        assert changelog_path.exists()
        content = changelog_path.read_text(encoding="utf-8")
        assert "# Changelog" in content
        assert "No Releases Yet" in content


class TestChangelogWriterEdgeCases:
    """Tests for edge cases and error conditions."""
    
    def test_multiple_features_same_date_same_version(self):
        """Test handling multiple features completed on same date with same version."""
        writer = ChangelogWriter()
        
        feature1 = Feature(
            name="feature-1",
            title="Feature 1",
            description="First feature",
            category=FeatureCategory.BACKEND,
            priority=Priority.HIGH,
            status=FeatureStatus.COMPLETED,
            completion_date=datetime(2026, 1, 15, 10, 0),
            completion_percentage=1.0,
            spec_path=Path(".kiro/specs/feature-1")
        )
        
        feature2 = Feature(
            name="feature-2",
            title="Feature 2",
            description="Second feature",
            category=FeatureCategory.UI,
            priority=Priority.MEDIUM,
            status=FeatureStatus.COMPLETED,
            completion_date=datetime(2026, 1, 15, 14, 0),
            completion_percentage=1.0,
            spec_path=Path(".kiro/specs/feature-2")
        )
        
        writer.append_entry(feature=feature1, version="v1.0.0")
        writer.append_entry(feature=feature2, version="v1.0.0")
        
        changelog = writer.organize_by_version()
        
        assert "## v1.0.0" in changelog
        assert "### Feature 1" in changelog
        assert "### Feature 2" in changelog
    
    def test_very_long_feature_title(self):
        """Test handling very long feature titles in anchor generation."""
        writer = ChangelogWriter()
        feature = Feature(
            name="test",
            title="This Is A Very Long Feature Title That Contains Many Words And Should Still Work Correctly",
            description="Test description",
            category=FeatureCategory.BACKEND,
            priority=Priority.MEDIUM,
            status=FeatureStatus.COMPLETED,
            completion_date=datetime(2026, 1, 15),
            completion_percentage=1.0,
            spec_path=Path(".kiro/specs/test")
        )
        entry = ChangelogEntry(feature=feature, completion_date=datetime(2026, 1, 15))
        
        formatted = writer.format_entry(entry)
        
        # Should contain the full title
        assert feature.title in formatted
        # Should have a valid anchor link
        assert "[View in Roadmap](ROADMAP.md#" in formatted
