"""
Unit tests for the LinkValidator component.

Tests validation of links between roadmap and specs, badge checking,
and link update functionality.
"""

import pytest
from pathlib import Path
from src.roadmap.link_validator import LinkValidator, BrokenLink, MissingBadge


class TestLinkValidator:
    """Test suite for LinkValidator class."""
    
    def test_initialization(self):
        """Test LinkValidator initializes with correct default path."""
        validator = LinkValidator()
        assert validator.roadmap_path == Path("ROADMAP.md")
    
    def test_initialization_custom_path(self):
        """Test LinkValidator initializes with custom path."""
        custom_path = Path("custom/ROADMAP.md")
        validator = LinkValidator(roadmap_path=custom_path)
        assert validator.roadmap_path == custom_path


class TestValidateSpecLinks:
    """Test suite for validate_spec_links method."""
    
    def test_validate_spec_links_empty_content(self):
        """Test validation with empty roadmap content."""
        validator = LinkValidator()
        broken = validator.validate_spec_links("")
        assert broken == []
    
    def test_validate_spec_links_no_links(self):
        """Test validation with content but no links."""
        validator = LinkValidator()
        content = "# Roadmap\n\nThis is a roadmap with no links."
        broken = validator.validate_spec_links(content)
        assert broken == []
    
    def test_validate_spec_links_external_links_ignored(self):
        """Test that external links are not validated."""
        validator = LinkValidator()
        content = """
        # Roadmap
        [GitHub](https://github.com)
        [Email](mailto:test@example.com)
        """
        broken = validator.validate_spec_links(content)
        assert broken == []
    
    def test_validate_spec_links_anchor_links_ignored(self):
        """Test that anchor-only links are not validated."""
        validator = LinkValidator()
        content = """
        # Roadmap
        [Jump to section](#section-name)
        """
        broken = validator.validate_spec_links(content)
        assert broken == []
    
    def test_validate_spec_links_non_spec_links_ignored(self):
        """Test that non-spec links are not validated."""
        validator = LinkValidator()
        content = """
        # Roadmap
        [Documentation](docs/guide.md)
        [README](README.md)
        """
        broken = validator.validate_spec_links(content)
        assert broken == []
    
    def test_validate_spec_links_valid_spec_link(self, tmp_path):
        """Test validation passes for valid spec link."""
        # Create a valid spec directory
        spec_dir = tmp_path / ".kiro" / "specs" / "test-feature"
        spec_dir.mkdir(parents=True)
        (spec_dir / "requirements.md").write_text("# Requirements")
        
        # Create roadmap in tmp_path
        roadmap_path = tmp_path / "ROADMAP.md"
        validator = LinkValidator(roadmap_path=roadmap_path)
        
        content = "[Test Feature](.kiro/specs/test-feature)"
        broken = validator.validate_spec_links(content)
        assert broken == []
    
    def test_validate_spec_links_nonexistent_directory(self):
        """Test validation detects nonexistent spec directory."""
        validator = LinkValidator()
        content = "[Missing Feature](.kiro/specs/nonexistent-feature)"
        broken = validator.validate_spec_links(content)
        
        assert len(broken) == 1
        assert broken[0].link_text == "Missing Feature"
        assert broken[0].target_path == ".kiro/specs/nonexistent-feature"
        assert "does not exist" in broken[0].reason
    
    def test_validate_spec_links_target_is_file(self, tmp_path):
        """Test validation detects when target is a file not directory."""
        # Create a file instead of directory
        spec_path = tmp_path / ".kiro" / "specs" / "test-feature"
        spec_path.parent.mkdir(parents=True)
        spec_path.write_text("not a directory")
        
        roadmap_path = tmp_path / "ROADMAP.md"
        validator = LinkValidator(roadmap_path=roadmap_path)
        
        content = "[Test Feature](.kiro/specs/test-feature)"
        broken = validator.validate_spec_links(content)
        
        assert len(broken) == 1
        assert "not a directory" in broken[0].reason
    
    def test_validate_spec_links_directory_no_spec_files(self, tmp_path):
        """Test validation detects directory without spec files."""
        # Create directory but no spec files
        spec_dir = tmp_path / ".kiro" / "specs" / "empty-feature"
        spec_dir.mkdir(parents=True)
        
        roadmap_path = tmp_path / "ROADMAP.md"
        validator = LinkValidator(roadmap_path=roadmap_path)
        
        content = "[Empty Feature](.kiro/specs/empty-feature)"
        broken = validator.validate_spec_links(content)
        
        assert len(broken) == 1
        assert "no spec files" in broken[0].reason
    
    def test_validate_spec_links_multiple_links(self, tmp_path):
        """Test validation with multiple links, some broken."""
        # Create one valid spec
        valid_spec = tmp_path / ".kiro" / "specs" / "valid-feature"
        valid_spec.mkdir(parents=True)
        (valid_spec / "design.md").write_text("# Design")
        
        roadmap_path = tmp_path / "ROADMAP.md"
        validator = LinkValidator(roadmap_path=roadmap_path)
        
        content = """
        [Valid Feature](.kiro/specs/valid-feature)
        [Broken Feature](.kiro/specs/broken-feature)
        """
        broken = validator.validate_spec_links(content)
        
        assert len(broken) == 1
        assert broken[0].link_text == "Broken Feature"
    
    def test_validate_spec_links_line_numbers(self):
        """Test that line numbers are correctly reported."""
        validator = LinkValidator()
        content = """Line 1
Line 2
[Feature](.kiro/specs/test)
Line 4"""
        broken = validator.validate_spec_links(content)
        
        assert len(broken) == 1
        assert broken[0].line_number == 3


class TestValidateRoadmapBadges:
    """Test suite for validate_roadmap_badges method."""
    
    def test_validate_roadmap_badges_empty_list(self):
        """Test validation with empty spec directory list."""
        validator = LinkValidator()
        missing = validator.validate_roadmap_badges([])
        assert missing == []
    
    def test_validate_roadmap_badges_no_requirements_file(self, tmp_path):
        """Test detection of missing requirements.md file."""
        spec_dir = tmp_path / ".kiro" / "specs" / "test-feature"
        spec_dir.mkdir(parents=True)
        
        validator = LinkValidator()
        missing = validator.validate_roadmap_badges([spec_dir])
        
        assert len(missing) == 1
        assert missing[0].spec_dir == spec_dir
        assert "No requirements.md" in missing[0].reason
    
    def test_validate_roadmap_badges_valid_badge(self, tmp_path):
        """Test validation passes for valid roadmap badge."""
        spec_dir = tmp_path / ".kiro" / "specs" / "test-feature"
        spec_dir.mkdir(parents=True)
        
        requirements = spec_dir / "requirements.md"
        requirements.write_text("""
# Requirements

[View in Roadmap](ROADMAP.md#test-feature)

## Details
""")
        
        validator = LinkValidator()
        missing = validator.validate_roadmap_badges([spec_dir])
        assert missing == []
    
    def test_validate_roadmap_badges_case_insensitive(self, tmp_path):
        """Test badge detection is case insensitive."""
        spec_dir = tmp_path / ".kiro" / "specs" / "test-feature"
        spec_dir.mkdir(parents=True)
        
        requirements = spec_dir / "requirements.md"
        requirements.write_text("[View in ROADMAP](ROADMAP.md#test)")
        
        validator = LinkValidator()
        missing = validator.validate_roadmap_badges([spec_dir])
        assert missing == []
    
    def test_validate_roadmap_badges_missing_badge(self, tmp_path):
        """Test detection of missing roadmap badge."""
        spec_dir = tmp_path / ".kiro" / "specs" / "test-feature"
        spec_dir.mkdir(parents=True)
        
        requirements = spec_dir / "requirements.md"
        requirements.write_text("# Requirements\n\nNo badge here.")
        
        validator = LinkValidator()
        missing = validator.validate_roadmap_badges([spec_dir])
        
        assert len(missing) == 1
        assert missing[0].spec_dir == spec_dir
        assert "No roadmap badge" in missing[0].reason
    
    def test_validate_roadmap_badges_unreadable_file(self, tmp_path):
        """Test handling of unreadable requirements file."""
        import sys
        
        # Skip this test on Windows as file permissions work differently
        if sys.platform == "win32":
            pytest.skip("File permission tests not reliable on Windows")
        
        spec_dir = tmp_path / ".kiro" / "specs" / "test-feature"
        spec_dir.mkdir(parents=True)
        
        requirements = spec_dir / "requirements.md"
        requirements.write_text("content")
        
        # Make file unreadable (Unix-like systems only)
        import os
        try:
            os.chmod(requirements, 0o000)
            
            validator = LinkValidator()
            missing = validator.validate_roadmap_badges([spec_dir])
            
            assert len(missing) == 1
            assert "Failed to read" in missing[0].reason
        finally:
            # Restore permissions for cleanup
            os.chmod(requirements, 0o644)
    
    def test_validate_roadmap_badges_multiple_specs(self, tmp_path):
        """Test validation with multiple spec directories."""
        # Create two specs, one with badge, one without
        spec1 = tmp_path / ".kiro" / "specs" / "feature-1"
        spec1.mkdir(parents=True)
        (spec1 / "requirements.md").write_text("[Roadmap](ROADMAP.md#feature-1)")
        
        spec2 = tmp_path / ".kiro" / "specs" / "feature-2"
        spec2.mkdir(parents=True)
        (spec2 / "requirements.md").write_text("No badge")
        
        validator = LinkValidator()
        missing = validator.validate_roadmap_badges([spec1, spec2])
        
        assert len(missing) == 1
        assert missing[0].spec_dir == spec2


class TestUpdateBrokenLinks:
    """Test suite for update_broken_links method."""
    
    def test_update_broken_links_file_not_found(self):
        """Test error handling for nonexistent roadmap file."""
        validator = LinkValidator()
        with pytest.raises(FileNotFoundError):
            validator.update_broken_links(Path("nonexistent.md"), {})
    
    def test_update_broken_links_single_fix(self, tmp_path):
        """Test updating a single broken link."""
        roadmap = tmp_path / "ROADMAP.md"
        roadmap.write_text("[Feature](.kiro/specs/old-name)")
        
        validator = LinkValidator()
        fixes = {".kiro/specs/old-name": ".kiro/specs/new-name"}
        validator.update_broken_links(roadmap, fixes)
        
        updated = roadmap.read_text()
        assert ".kiro/specs/new-name" in updated
        assert ".kiro/specs/old-name" not in updated
    
    def test_update_broken_links_multiple_fixes(self, tmp_path):
        """Test updating multiple broken links."""
        roadmap = tmp_path / "ROADMAP.md"
        roadmap.write_text("""
[Feature 1](.kiro/specs/old-1)
[Feature 2](.kiro/specs/old-2)
""")
        
        validator = LinkValidator()
        fixes = {
            ".kiro/specs/old-1": ".kiro/specs/new-1",
            ".kiro/specs/old-2": ".kiro/specs/new-2"
        }
        validator.update_broken_links(roadmap, fixes)
        
        updated = roadmap.read_text()
        assert ".kiro/specs/new-1" in updated
        assert ".kiro/specs/new-2" in updated
        assert ".kiro/specs/old-1" not in updated
        assert ".kiro/specs/old-2" not in updated
    
    def test_update_broken_links_preserves_other_content(self, tmp_path):
        """Test that non-link content is preserved."""
        roadmap = tmp_path / "ROADMAP.md"
        original = """# Roadmap

This is important text.

[Feature](.kiro/specs/old-name)

More important text.
"""
        roadmap.write_text(original)
        
        validator = LinkValidator()
        fixes = {".kiro/specs/old-name": ".kiro/specs/new-name"}
        validator.update_broken_links(roadmap, fixes)
        
        updated = roadmap.read_text()
        assert "# Roadmap" in updated
        assert "This is important text." in updated
        assert "More important text." in updated
    
    def test_update_broken_links_multiple_occurrences(self, tmp_path):
        """Test updating link that appears multiple times."""
        roadmap = tmp_path / "ROADMAP.md"
        roadmap.write_text("""
[Feature](.kiro/specs/old-name)
[Same Feature](.kiro/specs/old-name)
""")
        
        validator = LinkValidator()
        fixes = {".kiro/specs/old-name": ".kiro/specs/new-name"}
        validator.update_broken_links(roadmap, fixes)
        
        updated = roadmap.read_text()
        assert updated.count(".kiro/specs/new-name") == 2
        assert ".kiro/specs/old-name" not in updated
    
    def test_update_broken_links_no_fixes(self, tmp_path):
        """Test that file is unchanged when no fixes provided."""
        roadmap = tmp_path / "ROADMAP.md"
        original = "[Feature](.kiro/specs/feature-name)"
        roadmap.write_text(original)
        
        validator = LinkValidator()
        validator.update_broken_links(roadmap, {})
        
        updated = roadmap.read_text()
        assert updated == original


class TestGenerateAnchorForSpec:
    """Test suite for _generate_anchor_for_spec method."""
    
    def test_generate_anchor_simple_name(self):
        """Test anchor generation for simple spec name."""
        validator = LinkValidator()
        spec_dir = Path(".kiro/specs/my-feature")
        anchor = validator._generate_anchor_for_spec(spec_dir)
        assert anchor == "my-feature"
    
    def test_generate_anchor_preserves_hyphens(self):
        """Test that hyphens are preserved in anchor."""
        validator = LinkValidator()
        spec_dir = Path(".kiro/specs/multi-word-feature")
        anchor = validator._generate_anchor_for_spec(spec_dir)
        assert anchor == "multi-word-feature"
    
    def test_generate_anchor_lowercase(self):
        """Test that anchor is lowercase."""
        validator = LinkValidator()
        spec_dir = Path(".kiro/specs/MyFeature")
        anchor = validator._generate_anchor_for_spec(spec_dir)
        assert anchor == "myfeature"
    
    def test_generate_anchor_nested_path(self):
        """Test anchor uses only directory name, not full path."""
        validator = LinkValidator()
        spec_dir = Path(".kiro/specs/category/my-feature")
        anchor = validator._generate_anchor_for_spec(spec_dir)
        assert anchor == "my-feature"


class TestBrokenLinkDataclass:
    """Test suite for BrokenLink dataclass."""
    
    def test_broken_link_initialization(self):
        """Test BrokenLink can be initialized with all fields."""
        link = BrokenLink(
            file_path=Path("ROADMAP.md"),
            line_number=42,
            link_text="Test Feature",
            target_path=".kiro/specs/test",
            reason="Does not exist"
        )
        assert link.file_path == Path("ROADMAP.md")
        assert link.line_number == 42
        assert link.link_text == "Test Feature"
        assert link.target_path == ".kiro/specs/test"
        assert link.reason == "Does not exist"


class TestMissingBadgeDataclass:
    """Test suite for MissingBadge dataclass."""
    
    def test_missing_badge_initialization(self):
        """Test MissingBadge can be initialized with all fields."""
        badge = MissingBadge(
            spec_dir=Path(".kiro/specs/test"),
            expected_anchor="test-feature",
            reason="No badge found"
        )
        assert badge.spec_dir == Path(".kiro/specs/test")
        assert badge.expected_anchor == "test-feature"
        assert badge.reason == "No badge found"
