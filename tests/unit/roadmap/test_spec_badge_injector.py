"""
Unit tests for the SpecBadgeInjector component.

Tests badge injection, removal, and updating functionality.
"""

import pytest
from pathlib import Path
import tempfile
import shutil

from src.roadmap.spec_badge_injector import SpecBadgeInjector


class TestSpecBadgeInjector:
    """Test suite for SpecBadgeInjector class."""
    
    @pytest.fixture
    def temp_dir(self):
        """Create a temporary directory for test files."""
        temp_path = Path(tempfile.mkdtemp())
        yield temp_path
        shutil.rmtree(temp_path)
    
    @pytest.fixture
    def injector(self):
        """Create a SpecBadgeInjector instance."""
        return SpecBadgeInjector()
    
    @pytest.fixture
    def sample_spec_content(self):
        """Sample spec file content without badge."""
        return """# Requirements Document

## Introduction

This is a sample requirements document for testing.

## Requirements

### Requirement 1

Some requirement text here.
"""
    
    @pytest.fixture
    def sample_spec_with_frontmatter(self):
        """Sample spec file content with YAML frontmatter."""
        return """---
title: My Feature
priority: High
category: UI
---

# Requirements Document

## Introduction

This is a sample requirements document with frontmatter.
"""
    
    def test_inject_badge_basic(self, injector, temp_dir, sample_spec_content):
        """Test basic badge injection into a spec file."""
        # Create a test spec file
        spec_file = temp_dir / "requirements.md"
        spec_file.write_text(sample_spec_content, encoding='utf-8')
        
        # Inject badge
        injector.inject_badge(spec_file, "my-feature")
        
        # Read updated content
        updated_content = spec_file.read_text(encoding='utf-8')
        
        # Verify badge was added
        assert "View in Public Roadmap" in updated_content
        assert "ROADMAP.md#my-feature" in updated_content
        assert updated_content.startswith("[📋 View in Public Roadmap]")
    
    def test_inject_badge_with_frontmatter(
        self,
        injector,
        temp_dir,
        sample_spec_with_frontmatter
    ):
        """Test badge injection after YAML frontmatter."""
        # Create a test spec file with frontmatter
        spec_file = temp_dir / "requirements.md"
        spec_file.write_text(sample_spec_with_frontmatter, encoding='utf-8')
        
        # Inject badge
        injector.inject_badge(spec_file, "my-feature")
        
        # Read updated content
        updated_content = spec_file.read_text(encoding='utf-8')
        
        # Verify badge was added after frontmatter
        assert "View in Public Roadmap" in updated_content
        assert updated_content.startswith("---\ntitle: My Feature")
        
        # Badge should be after the closing ---
        lines = updated_content.split('\n')
        frontmatter_end = None
        for i, line in enumerate(lines):
            if i > 0 and line.strip() == "---":
                frontmatter_end = i
                break
        
        assert frontmatter_end is not None
        # Badge should be shortly after frontmatter
        badge_line = None
        for i in range(frontmatter_end + 1, min(frontmatter_end + 5, len(lines))):
            if "View in Public Roadmap" in lines[i]:
                badge_line = i
                break
        
        assert badge_line is not None
    
    def test_inject_badge_file_not_found(self, injector, temp_dir):
        """Test badge injection with non-existent file."""
        spec_file = temp_dir / "nonexistent.md"
        
        with pytest.raises(FileNotFoundError):
            injector.inject_badge(spec_file, "my-feature")
    
    def test_update_existing_badge(self, injector, temp_dir):
        """Test updating an existing badge with new anchor."""
        # Create spec file with existing badge
        content = """[📋 View in Public Roadmap](../../ROADMAP.md#old-feature)

# Requirements Document

Some content here.
"""
        spec_file = temp_dir / "requirements.md"
        spec_file.write_text(content, encoding='utf-8')
        
        # Update badge with new anchor
        injector.inject_badge(spec_file, "new-feature")
        
        # Read updated content
        updated_content = spec_file.read_text(encoding='utf-8')
        
        # Verify anchor was updated
        assert "ROADMAP.md#new-feature" in updated_content
        assert "ROADMAP.md#old-feature" not in updated_content
        assert "View in Public Roadmap" in updated_content
    
    def test_remove_badge(self, injector, temp_dir):
        """Test removing a badge from a spec file."""
        # Create spec file with badge
        content = """[📋 View in Public Roadmap](../../ROADMAP.md#my-feature)

# Requirements Document

Some content here.
"""
        spec_file = temp_dir / "requirements.md"
        spec_file.write_text(content, encoding='utf-8')
        
        # Remove badge
        injector.remove_badge(spec_file)
        
        # Read updated content
        updated_content = spec_file.read_text(encoding='utf-8')
        
        # Verify badge was removed
        assert "View in Public Roadmap" not in updated_content
        assert "ROADMAP.md#my-feature" not in updated_content
        assert "# Requirements Document" in updated_content
    
    def test_remove_badge_no_badge_present(self, injector, temp_dir, sample_spec_content):
        """Test removing badge when no badge exists (should be no-op)."""
        # Create spec file without badge
        spec_file = temp_dir / "requirements.md"
        spec_file.write_text(sample_spec_content, encoding='utf-8')
        
        original_content = sample_spec_content
        
        # Remove badge (should do nothing)
        injector.remove_badge(spec_file)
        
        # Read content
        updated_content = spec_file.read_text(encoding='utf-8')
        
        # Verify content unchanged
        assert updated_content == original_content
    
    def test_remove_badge_file_not_found(self, injector, temp_dir):
        """Test badge removal with non-existent file."""
        spec_file = temp_dir / "nonexistent.md"
        
        with pytest.raises(FileNotFoundError):
            injector.remove_badge(spec_file)
    
    def test_update_badge_link(self, injector, temp_dir):
        """Test updating badge link (alias for inject_badge)."""
        # Create spec file with existing badge
        content = """[📋 View in Public Roadmap](../../ROADMAP.md#old-anchor)

# Requirements Document
"""
        spec_file = temp_dir / "requirements.md"
        spec_file.write_text(content, encoding='utf-8')
        
        # Update badge link
        injector.update_badge_link(spec_file, "new-anchor")
        
        # Read updated content
        updated_content = spec_file.read_text(encoding='utf-8')
        
        # Verify anchor was updated
        assert "ROADMAP.md#new-anchor" in updated_content
        assert "ROADMAP.md#old-anchor" not in updated_content
    
    def test_has_roadmap_badge_true(self, injector):
        """Test detecting presence of roadmap badge."""
        content = """[📋 View in Public Roadmap](../../ROADMAP.md#feature)

# Requirements
"""
        assert injector._has_roadmap_badge(content) is True
    
    def test_has_roadmap_badge_false(self, injector, sample_spec_content):
        """Test detecting absence of roadmap badge."""
        assert injector._has_roadmap_badge(sample_spec_content) is False
    
    def test_has_roadmap_badge_case_insensitive(self, injector):
        """Test badge detection is case-insensitive."""
        content = """[View in public ROADMAP](../../ROADMAP.md#feature)

# Requirements
"""
        assert injector._has_roadmap_badge(content) is True
    
    def test_calculate_relative_path(self, injector, temp_dir):
        """Test relative path calculation from spec to roadmap."""
        spec_file = temp_dir / ".kiro" / "specs" / "my-feature" / "requirements.md"
        
        relative_path = injector._calculate_relative_path(spec_file)
        
        # Should be ../../ROADMAP.md
        assert relative_path == "../../ROADMAP.md"
    
    def test_generate_anchor_for_spec(self, injector, temp_dir):
        """Test anchor generation from spec directory name."""
        spec_dir = temp_dir / ".kiro" / "specs" / "my-feature-name"
        
        anchor = injector._generate_anchor_for_spec(spec_dir)
        
        # Should be lowercase directory name
        assert anchor == "my-feature-name"
    
    def test_find_insertion_point_no_frontmatter(self, injector, sample_spec_content):
        """Test finding insertion point without frontmatter."""
        insertion_point = injector._find_insertion_point(sample_spec_content)
        
        # Should be at the beginning
        assert insertion_point == 0
    
    def test_find_insertion_point_with_frontmatter(
        self,
        injector,
        sample_spec_with_frontmatter
    ):
        """Test finding insertion point after frontmatter."""
        insertion_point = injector._find_insertion_point(sample_spec_with_frontmatter)
        
        # Should be after the closing ---
        assert insertion_point > 0
        
        # Verify it's after the frontmatter
        content_before = sample_spec_with_frontmatter[:insertion_point]
        assert content_before.count("---") == 2
    
    def test_badge_format_includes_emoji(self, injector, temp_dir, sample_spec_content):
        """Test that injected badge includes emoji."""
        spec_file = temp_dir / "requirements.md"
        spec_file.write_text(sample_spec_content, encoding='utf-8')
        
        injector.inject_badge(spec_file, "my-feature")
        
        updated_content = spec_file.read_text(encoding='utf-8')
        
        # Verify emoji is present
        assert "📋" in updated_content
    
    def test_badge_format_uses_anchor_tag(self, injector, temp_dir, sample_spec_content):
        """Test that badge uses anchor tag for direct navigation."""
        spec_file = temp_dir / "requirements.md"
        spec_file.write_text(sample_spec_content, encoding='utf-8')
        
        injector.inject_badge(spec_file, "my-feature")
        
        updated_content = spec_file.read_text(encoding='utf-8')
        
        # Verify anchor tag is present
        assert "#my-feature" in updated_content
        assert "ROADMAP.md#my-feature" in updated_content
    
    def test_multiple_badge_updates(self, injector, temp_dir, sample_spec_content):
        """Test multiple sequential badge updates."""
        spec_file = temp_dir / "requirements.md"
        spec_file.write_text(sample_spec_content, encoding='utf-8')
        
        # First injection
        injector.inject_badge(spec_file, "feature-v1")
        content1 = spec_file.read_text(encoding='utf-8')
        assert "feature-v1" in content1
        
        # Second update
        injector.inject_badge(spec_file, "feature-v2")
        content2 = spec_file.read_text(encoding='utf-8')
        assert "feature-v2" in content2
        assert "feature-v1" not in content2
        
        # Third update
        injector.inject_badge(spec_file, "feature-v3")
        content3 = spec_file.read_text(encoding='utf-8')
        assert "feature-v3" in content3
        assert "feature-v2" not in content3
        
        # Verify only one badge exists
        assert content3.count("View in Public Roadmap") == 1
