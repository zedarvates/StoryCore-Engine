"""
Unit tests for MetadataExtractor component.

Tests cover:
- Frontmatter parsing with valid and invalid YAML
- Title extraction from markdown
- Description extraction from markdown
- Category inference from spec names and content
- Priority inference from content and dependencies
"""

import pytest
from pathlib import Path
from src.roadmap.metadata_extractor import MetadataExtractor
from src.roadmap.models import FeatureCategory, Priority


@pytest.fixture
def extractor():
    """Create a MetadataExtractor instance for testing."""
    return MetadataExtractor()


@pytest.fixture
def temp_markdown_file(tmp_path):
    """Create a temporary markdown file for testing."""
    def _create_file(content: str) -> Path:
        file_path = tmp_path / "test.md"
        file_path.write_text(content, encoding='utf-8')
        return file_path
    return _create_file


class TestExtractFrontmatter:
    """Tests for extract_frontmatter method."""
    
    def test_valid_frontmatter(self, extractor, temp_markdown_file):
        """Test extraction of valid YAML frontmatter."""
        content = """---
priority: High
category: UI
timeline: Q1 2026
status: planned
---

# Feature Title

Feature description here.
"""
        file_path = temp_markdown_file(content)
        metadata = extractor.extract_frontmatter(file_path)
        
        assert metadata['priority'] == 'High'
        assert metadata['category'] == 'UI'
        assert metadata['timeline'] == 'Q1 2026'
        assert metadata['status'] == 'planned'
    
    def test_no_frontmatter(self, extractor, temp_markdown_file):
        """Test file without frontmatter returns empty dict."""
        content = """# Feature Title

Feature description without frontmatter.
"""
        file_path = temp_markdown_file(content)
        metadata = extractor.extract_frontmatter(file_path)
        
        assert metadata == {}
    
    def test_invalid_yaml(self, extractor, temp_markdown_file):
        """Test malformed YAML returns empty dict with warning."""
        content = """---
priority: High
category: [UI
invalid: yaml: syntax:
---

# Feature Title
"""
        file_path = temp_markdown_file(content)
        metadata = extractor.extract_frontmatter(file_path)
        
        assert metadata == {}
    
    def test_empty_frontmatter(self, extractor, temp_markdown_file):
        """Test empty frontmatter section."""
        content = """---
---

# Feature Title
"""
        file_path = temp_markdown_file(content)
        metadata = extractor.extract_frontmatter(file_path)
        
        assert metadata == {}
    
    def test_frontmatter_with_complex_values(self, extractor, temp_markdown_file):
        """Test frontmatter with lists and nested structures."""
        content = """---
priority: High
dependencies:
  - feature-a
  - feature-b
tags:
  - ui
  - frontend
metadata:
  author: John Doe
  version: 1.0
---

# Feature Title
"""
        file_path = temp_markdown_file(content)
        metadata = extractor.extract_frontmatter(file_path)
        
        assert metadata['priority'] == 'High'
        assert metadata['dependencies'] == ['feature-a', 'feature-b']
        assert metadata['tags'] == ['ui', 'frontend']
        assert metadata['metadata']['author'] == 'John Doe'


class TestExtractTitle:
    """Tests for extract_title method."""
    
    def test_simple_title(self, extractor):
        """Test extraction of simple H1 title."""
        content = "# Feature Title\n\nSome content here."
        title = extractor.extract_title(content)
        
        assert title == "Feature Title"
    
    def test_title_with_extra_spaces(self, extractor):
        """Test title with extra whitespace is trimmed."""
        content = "#   Feature Title   \n\nContent."
        title = extractor.extract_title(content)
        
        assert title == "Feature Title"
    
    def test_no_title(self, extractor):
        """Test content without H1 returns empty string."""
        content = "## Subtitle\n\nNo H1 heading here."
        title = extractor.extract_title(content)
        
        assert title == ""
    
    def test_multiple_h1_returns_first(self, extractor):
        """Test that only first H1 is returned."""
        content = """# First Title

Some content.

# Second Title

More content.
"""
        title = extractor.extract_title(content)
        
        assert title == "First Title"
    
    def test_title_after_frontmatter(self, extractor):
        """Test title extraction works with frontmatter present."""
        content = """---
priority: High
---

# Feature Title

Description here.
"""
        title = extractor.extract_title(content)
        
        assert title == "Feature Title"


class TestExtractDescription:
    """Tests for extract_description method."""
    
    def test_simple_description(self, extractor):
        """Test extraction of first paragraph."""
        content = """# Feature Title

This is the first paragraph that should be extracted as the description.

This is a second paragraph that should not be included.
"""
        description = extractor.extract_description(content)
        
        assert description == "This is the first paragraph that should be extracted as the description."
    
    def test_description_after_frontmatter(self, extractor):
        """Test description extraction skips frontmatter."""
        content = """---
priority: High
---

# Feature Title

This is the description paragraph.

Second paragraph.
"""
        description = extractor.extract_description(content)
        
        assert description == "This is the description paragraph."
    
    def test_multiline_paragraph(self, extractor):
        """Test description with line breaks within paragraph."""
        content = """# Feature Title

This is a description
that spans multiple lines
but is one paragraph.

Second paragraph.
"""
        description = extractor.extract_description(content)
        
        assert description == "This is a description that spans multiple lines but is one paragraph."
    
    def test_no_description(self, extractor):
        """Test content with only title returns empty string."""
        content = "# Feature Title\n"
        description = extractor.extract_description(content)
        
        assert description == ""
    
    def test_description_skips_headings(self, extractor):
        """Test that H2/H3 headings are not included in description."""
        content = """# Feature Title

## Subtitle

This is the actual description paragraph.
"""
        description = extractor.extract_description(content)
        
        assert description == "This is the actual description paragraph."


class TestInferCategory:
    """Tests for infer_category method."""
    
    def test_ui_category_from_name(self, extractor):
        """Test UI category inference from spec name."""
        assert extractor.infer_category("ui-dashboard") == FeatureCategory.UI
        assert extractor.infer_category("wizard-setup") == FeatureCategory.UI
        assert extractor.infer_category("modal-dialog") == FeatureCategory.UI
        assert extractor.infer_category("component-library") == FeatureCategory.UI
    
    def test_backend_category_from_name(self, extractor):
        """Test Backend category inference from spec name."""
        assert extractor.infer_category("api-integration") == FeatureCategory.BACKEND
        assert extractor.infer_category("backend-service") == FeatureCategory.BACKEND
        assert extractor.infer_category("data-processor") == FeatureCategory.BACKEND
        assert extractor.infer_category("engine-core") == FeatureCategory.BACKEND
    
    def test_infrastructure_category_from_name(self, extractor):
        """Test Infrastructure category inference from spec name."""
        assert extractor.infer_category("docker-deployment") == FeatureCategory.INFRASTRUCTURE
        assert extractor.infer_category("aws-integration") == FeatureCategory.INFRASTRUCTURE
        assert extractor.infer_category("ci-cd-pipeline") == FeatureCategory.INFRASTRUCTURE
    
    def test_documentation_category_from_name(self, extractor):
        """Test Documentation category inference from spec name."""
        assert extractor.infer_category("documentation-update") == FeatureCategory.DOCUMENTATION
        assert extractor.infer_category("readme-revision") == FeatureCategory.DOCUMENTATION
        assert extractor.infer_category("api-docs") == FeatureCategory.DOCUMENTATION
    
    def test_testing_category_from_name(self, extractor):
        """Test Testing category inference from spec name."""
        assert extractor.infer_category("test-suite-debugging") == FeatureCategory.TESTING
        assert extractor.infer_category("qa-automation") == FeatureCategory.TESTING
        assert extractor.infer_category("quality-validation") == FeatureCategory.TESTING
    
    def test_tooling_category_from_name(self, extractor):
        """Test Tooling category inference from spec name."""
        assert extractor.infer_category("cli-modularization") == FeatureCategory.TOOLING
        assert extractor.infer_category("build-automation") == FeatureCategory.TOOLING
        assert extractor.infer_category("config-management") == FeatureCategory.TOOLING
    
    def test_migration_category_from_name(self, extractor):
        """Test Migration category inference from spec name."""
        assert extractor.infer_category("migration-v2") == FeatureCategory.MIGRATION
        assert extractor.infer_category("refactor-architecture") == FeatureCategory.MIGRATION
        assert extractor.infer_category("project-reorganization") == FeatureCategory.MIGRATION
    
    def test_default_category(self, extractor):
        """Test default category when no patterns match."""
        assert extractor.infer_category("unknown-feature") == FeatureCategory.TOOLING
    
    def test_category_from_content(self, extractor):
        """Test category inference from content when name doesn't match."""
        content = """
        This feature implements a new user interface component with React.
        The frontend dashboard will display real-time data.
        """
        assert extractor.infer_category("feature-x", content) == FeatureCategory.UI
        
        content = """
        This feature adds a new API endpoint for data processing.
        The backend service will handle requests efficiently.
        """
        assert extractor.infer_category("feature-y", content) == FeatureCategory.BACKEND


class TestInferPriority:
    """Tests for infer_priority method."""
    
    def test_high_priority_keywords(self, extractor):
        """Test high priority inference from keywords."""
        content = "This is a critical security fix that must be implemented urgently."
        assert extractor.infer_priority(content) == Priority.HIGH
        
        content = "This blocker issue is essential for production deployment."
        assert extractor.infer_priority(content) == Priority.HIGH
    
    def test_medium_priority_keywords(self, extractor):
        """Test medium priority inference from keywords."""
        content = "This important feature should improve performance significantly."
        assert extractor.infer_priority(content) == Priority.MEDIUM
        
        content = "We need to implement this enhancement to optimize the system."
        assert extractor.infer_priority(content) == Priority.MEDIUM
    
    def test_low_priority_keywords(self, extractor):
        """Test low priority inference from keywords."""
        content = "This is a nice to have feature that we can consider for the future."
        assert extractor.infer_priority(content) == Priority.LOW
        
        content = "Optional cosmetic polish for minor UI cleanup."
        assert extractor.infer_priority(content) == Priority.LOW
    
    def test_priority_with_dependencies(self, extractor):
        """Test priority boost from dependencies."""
        content = "This feature adds a new capability."
        
        # No dependencies - medium priority
        assert extractor.infer_priority(content, []) == Priority.MEDIUM
        
        # Few dependencies - medium priority
        assert extractor.infer_priority(content, ["dep1"]) == Priority.MEDIUM
        
        # Many dependencies - high priority
        assert extractor.infer_priority(content, ["dep1", "dep2", "dep3"]) == Priority.HIGH
    
    def test_default_priority(self, extractor):
        """Test default priority when no strong indicators."""
        content = "This feature does something useful."
        assert extractor.infer_priority(content) == Priority.MEDIUM
    
    def test_mixed_keywords(self, extractor):
        """Test priority when multiple keyword types present."""
        # High priority keywords should dominate
        content = "This critical feature is nice to have but urgent."
        assert extractor.infer_priority(content) == Priority.HIGH
