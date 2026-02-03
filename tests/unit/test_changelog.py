"""
Unit tests for Changelog System
"""

import pytest
import json
from pathlib import Path
from src.api.changelog import Changelog, ChangelogEntry, ChangeType, create_initial_changelog


@pytest.fixture
def temp_changelog_path(tmp_path):
    """Create temporary changelog path."""
    return str(tmp_path / "test_changelog.json")


@pytest.fixture
def changelog(temp_changelog_path):
    """Create test changelog."""
    return Changelog(temp_changelog_path)


def test_add_entry(changelog):
    """Test adding changelog entry."""
    entry = changelog.add_entry(
        version="v1.0.0",
        change_type=ChangeType.ADDED,
        description="New feature added",
        affected_endpoints=["storycore.test.endpoint"],
        date="2024-01-15",
    )
    
    assert entry.version == "v1.0.0"
    assert entry.change_type == ChangeType.ADDED
    assert entry.description == "New feature added"
    assert "storycore.test.endpoint" in entry.affected_endpoints
    assert entry.breaking is False


def test_add_breaking_change(changelog):
    """Test adding breaking change."""
    entry = changelog.add_entry(
        version="v2.0.0",
        change_type=ChangeType.CHANGED,
        description="Breaking API change",
        affected_endpoints=["storycore.test.endpoint"],
        breaking=True,
        date="2024-02-01",
    )
    
    assert entry.breaking is True


def test_get_entries_by_version(changelog):
    """Test querying entries by version."""
    changelog.add_entry(
        version="v1.0.0",
        change_type=ChangeType.ADDED,
        description="Feature 1",
        affected_endpoints=["endpoint1"],
        date="2024-01-15",
    )
    
    changelog.add_entry(
        version="v1.0.0",
        change_type=ChangeType.FIXED,
        description="Bug fix",
        affected_endpoints=["endpoint2"],
        date="2024-01-15",
    )
    
    changelog.add_entry(
        version="v1.1.0",
        change_type=ChangeType.ADDED,
        description="Feature 2",
        affected_endpoints=["endpoint3"],
        date="2024-02-01",
    )
    
    v1_entries = changelog.get_entries_by_version("v1.0.0")
    assert len(v1_entries) == 2
    
    v1_1_entries = changelog.get_entries_by_version("v1.1.0")
    assert len(v1_1_entries) == 1


def test_get_entries_by_endpoint(changelog):
    """Test querying entries by endpoint."""
    changelog.add_entry(
        version="v1.0.0",
        change_type=ChangeType.ADDED,
        description="Feature 1",
        affected_endpoints=["storycore.test.endpoint"],
        date="2024-01-15",
    )
    
    changelog.add_entry(
        version="v1.1.0",
        change_type=ChangeType.CHANGED,
        description="Feature 2",
        affected_endpoints=["storycore.test.endpoint", "storycore.other.endpoint"],
        date="2024-02-01",
    )
    
    entries = changelog.get_entries_by_endpoint("storycore.test.endpoint")
    assert len(entries) == 2


def test_get_entries_by_type(changelog):
    """Test querying entries by change type."""
    changelog.add_entry(
        version="v1.0.0",
        change_type=ChangeType.ADDED,
        description="Feature 1",
        affected_endpoints=["endpoint1"],
        date="2024-01-15",
    )
    
    changelog.add_entry(
        version="v1.0.0",
        change_type=ChangeType.ADDED,
        description="Feature 2",
        affected_endpoints=["endpoint2"],
        date="2024-01-15",
    )
    
    changelog.add_entry(
        version="v1.0.0",
        change_type=ChangeType.FIXED,
        description="Bug fix",
        affected_endpoints=["endpoint3"],
        date="2024-01-15",
    )
    
    added_entries = changelog.get_entries_by_type(ChangeType.ADDED)
    assert len(added_entries) == 2
    
    fixed_entries = changelog.get_entries_by_type(ChangeType.FIXED)
    assert len(fixed_entries) == 1


def test_get_breaking_changes(changelog):
    """Test querying breaking changes."""
    changelog.add_entry(
        version="v1.0.0",
        change_type=ChangeType.ADDED,
        description="Feature 1",
        affected_endpoints=["endpoint1"],
        breaking=False,
        date="2024-01-15",
    )
    
    changelog.add_entry(
        version="v2.0.0",
        change_type=ChangeType.CHANGED,
        description="Breaking change",
        affected_endpoints=["endpoint2"],
        breaking=True,
        date="2024-02-01",
    )
    
    breaking = changelog.get_breaking_changes()
    assert len(breaking) == 1
    assert breaking[0].breaking is True


def test_get_versions(changelog):
    """Test getting all versions."""
    changelog.add_entry(
        version="v1.0.0",
        change_type=ChangeType.ADDED,
        description="Feature 1",
        affected_endpoints=["endpoint1"],
        date="2024-01-15",
    )
    
    changelog.add_entry(
        version="v1.1.0",
        change_type=ChangeType.ADDED,
        description="Feature 2",
        affected_endpoints=["endpoint2"],
        date="2024-02-01",
    )
    
    changelog.add_entry(
        version="v1.0.0",
        change_type=ChangeType.FIXED,
        description="Bug fix",
        affected_endpoints=["endpoint3"],
        date="2024-01-15",
    )
    
    versions = changelog.get_versions()
    assert len(versions) == 2
    assert "v1.0.0" in versions
    assert "v1.1.0" in versions
    # Should be sorted newest first
    assert versions[0] == "v1.1.0"


def test_generate_markdown(changelog):
    """Test generating markdown changelog."""
    changelog.add_entry(
        version="v1.0.0",
        change_type=ChangeType.ADDED,
        description="New feature",
        affected_endpoints=["storycore.test.endpoint"],
        date="2024-01-15",
    )
    
    changelog.add_entry(
        version="v1.0.0",
        change_type=ChangeType.FIXED,
        description="Bug fix",
        affected_endpoints=["storycore.other.endpoint"],
        date="2024-01-15",
    )
    
    markdown = changelog.generate_markdown()
    
    assert "# Changelog" in markdown
    assert "## [v1.0.0] - 2024-01-15" in markdown
    assert "### Added" in markdown
    assert "### Fixed" in markdown
    assert "New feature" in markdown
    assert "Bug fix" in markdown
    assert "`storycore.test.endpoint`" in markdown


def test_markdown_breaking_change_indicator(changelog):
    """Test that breaking changes are marked in markdown."""
    changelog.add_entry(
        version="v2.0.0",
        change_type=ChangeType.CHANGED,
        description="Breaking change",
        affected_endpoints=["storycore.test.endpoint"],
        breaking=True,
        date="2024-02-01",
    )
    
    markdown = changelog.generate_markdown()
    assert "**[BREAKING]**" in markdown


def test_save_and_load(changelog, temp_changelog_path):
    """Test saving and loading changelog."""
    changelog.add_entry(
        version="v1.0.0",
        change_type=ChangeType.ADDED,
        description="Feature 1",
        affected_endpoints=["endpoint1"],
        date="2024-01-15",
    )
    
    changelog.save()
    
    # Verify file exists
    assert Path(temp_changelog_path).exists()
    
    # Load into new changelog
    new_changelog = Changelog(temp_changelog_path)
    
    assert len(new_changelog.entries) == 1
    assert new_changelog.entries[0].description == "Feature 1"


def test_export_markdown(changelog, tmp_path):
    """Test exporting changelog to markdown file."""
    changelog.add_entry(
        version="v1.0.0",
        change_type=ChangeType.ADDED,
        description="Feature 1",
        affected_endpoints=["endpoint1"],
        date="2024-01-15",
    )
    
    output_path = tmp_path / "CHANGELOG.md"
    changelog.export_markdown(str(output_path))
    
    assert output_path.exists()
    
    with open(output_path) as f:
        content = f.read()
    
    assert "# Changelog" in content
    assert "Feature 1" in content


def test_to_dict(changelog):
    """Test converting changelog to dictionary."""
    changelog.add_entry(
        version="v1.0.0",
        change_type=ChangeType.ADDED,
        description="Feature 1",
        affected_endpoints=["endpoint1"],
        date="2024-01-15",
    )
    
    changelog.add_entry(
        version="v2.0.0",
        change_type=ChangeType.CHANGED,
        description="Breaking change",
        affected_endpoints=["endpoint2"],
        breaking=True,
        date="2024-02-01",
    )
    
    data = changelog.to_dict()
    
    assert "versions" in data
    assert "total_entries" in data
    assert "breaking_changes" in data
    assert "entries" in data
    
    assert data["total_entries"] == 2
    assert data["breaking_changes"] == 1
    assert len(data["versions"]) == 2


def test_create_initial_changelog():
    """Test creating initial changelog."""
    changelog = create_initial_changelog()
    
    assert len(changelog.entries) > 0
    
    # Should have v1.0.0 entries
    v1_entries = changelog.get_entries_by_version("v1.0.0")
    assert len(v1_entries) > 0
    
    # Should include initial release entry
    descriptions = [e.description for e in v1_entries]
    assert any("Initial release" in d for d in descriptions)


def test_changelog_entry_to_dict():
    """Test converting changelog entry to dictionary."""
    entry = ChangelogEntry(
        version="v1.0.0",
        date="2024-01-15",
        change_type=ChangeType.ADDED,
        description="New feature",
        affected_endpoints=["endpoint1"],
        breaking=False,
    )
    
    data = entry.to_dict()
    
    assert data["version"] == "v1.0.0"
    assert data["date"] == "2024-01-15"
    assert data["change_type"] == "added"
    assert data["description"] == "New feature"
    assert data["affected_endpoints"] == ["endpoint1"]
    assert data["breaking"] is False


def test_changelog_entry_from_dict():
    """Test creating changelog entry from dictionary."""
    data = {
        "version": "v1.0.0",
        "date": "2024-01-15",
        "change_type": "added",
        "description": "New feature",
        "affected_endpoints": ["endpoint1"],
        "breaking": False,
    }
    
    entry = ChangelogEntry.from_dict(data)
    
    assert entry.version == "v1.0.0"
    assert entry.date == "2024-01-15"
    assert entry.change_type == ChangeType.ADDED
    assert entry.description == "New feature"
    assert entry.affected_endpoints == ["endpoint1"]
    assert entry.breaking is False
