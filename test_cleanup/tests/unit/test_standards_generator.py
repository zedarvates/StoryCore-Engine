"""
Unit tests for Testing Standards Generator

Tests the generation of testing standards documentation.
"""

import pytest
from pathlib import Path
import tempfile
import shutil
from test_cleanup.documentation.standards_generator import TestingStandardsGenerator


class TestTestingStandardsGenerator:
    """Test suite for TestingStandardsGenerator"""
    
    @pytest.fixture
    def temp_output_dir(self):
        """Create temporary output directory"""
        temp_dir = Path(tempfile.mkdtemp())
        yield temp_dir
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def generator(self, temp_output_dir):
        """Create standards generator instance"""
        return TestingStandardsGenerator(temp_output_dir)
    
    def test_generator_creates_output_directory(self, temp_output_dir):
        """Test that generator creates output directory if it doesn't exist"""
        output_dir = temp_output_dir / "new_dir"
        assert not output_dir.exists()
        
        generator = TestingStandardsGenerator(output_dir)
        assert output_dir.exists()
    
    def test_generate_standards_document_creates_file(self, generator, temp_output_dir):
        """Test that standards document is created"""
        output_path = generator.generate_standards_document()
        
        assert output_path.exists()
        assert output_path.name == "TESTING_STANDARDS.md"
        assert output_path.parent == temp_output_dir
    
    def test_standards_document_contains_required_sections(self, generator):
        """Test that generated document contains all required sections"""
        output_path = generator.generate_standards_document()
        content = output_path.read_text(encoding='utf-8')
        
        # Check for main sections (Requirement 7.1, 7.4, 7.5)
        required_sections = [
            "# Testing Standards",
            "## What Makes a Test Valuable",
            "## Test Naming Conventions",
            "## When to Use Different Test Types",
            "## Test Organization",
            "## Best Practices",
            "## Quality Metrics"
        ]
        
        for section in required_sections:
            assert section in content, f"Missing section: {section}"
    
    def test_valuable_test_section_defines_criteria(self, generator):
        """Test that valuable test section defines clear criteria (Requirement 7.1)"""
        output_path = generator.generate_standards_document()
        content = output_path.read_text(encoding='utf-8')
        
        # Should define what makes a test valuable
        assert "Bug Detection" in content
        assert "Unique Coverage" in content
        assert "Requirement Verification" in content
        assert "Reliability" in content
        
        # Should define when to remove tests
        assert "Tests to Remove" in content
        assert "zero unique coverage" in content
    
    def test_naming_conventions_section_covers_both_frameworks(self, generator):
        """Test that naming conventions cover Python and TypeScript (Requirement 7.4)"""
        output_path = generator.generate_standards_document()
        content = output_path.read_text(encoding='utf-8')
        
        # Should cover Python (pytest)
        assert "Python (pytest) Naming" in content
        assert "test_" in content
        
        # Should cover TypeScript (vitest)
        assert "TypeScript (vitest) Naming" in content
        assert ".test.ts" in content
        
        # Should provide examples
        assert "# Good" in content
        assert "# Bad" in content
    
    def test_test_types_section_specifies_when_to_use(self, generator):
        """Test that test types section specifies when to use each type (Requirement 7.5)"""
        output_path = generator.generate_standards_document()
        content = output_path.read_text(encoding='utf-8')
        
        # Should define different test types
        assert "### Unit Tests" in content
        assert "### Integration Tests" in content
        assert "### Property-Based Tests" in content
        assert "### End-to-End Tests" in content
        
        # Each type should have "When to use" section
        assert content.count("**When to use:**") >= 4
        
        # Should include decision matrix
        assert "Decision Matrix" in content
    
    def test_organization_section_defines_structure(self, generator):
        """Test that organization section defines directory structure"""
        output_path = generator.generate_standards_document()
        content = output_path.read_text(encoding='utf-8')
        
        # Should define directory structure
        assert "### Directory Structure" in content
        assert "tests/" in content
        assert "unit/" in content
        assert "integration/" in content
        
        # Should cover both Python and TypeScript
        assert "**Python Tests:**" in content
        assert "**TypeScript Tests:**" in content
    
    def test_best_practices_section_provides_examples(self, generator):
        """Test that best practices section provides code examples"""
        output_path = generator.generate_standards_document()
        content = output_path.read_text(encoding='utf-8')
        
        # Should have best practices
        assert "## Best Practices" in content
        
        # Should provide examples with good/bad patterns
        assert "**Good:**" in content
        assert "**Bad:**" in content
        
        # Should cover key practices
        assert "Test Behavior, Not Implementation" in content
        assert "One Logical Assertion Per Test" in content
        assert "Make Tests Deterministic" in content
    
    def test_quality_metrics_section_defines_targets(self, generator):
        """Test that quality metrics section defines measurable targets"""
        output_path = generator.generate_standards_document()
        content = output_path.read_text(encoding='utf-8')
        
        # Should define metrics
        assert "## Quality Metrics" in content
        assert "Coverage Metrics" in content
        assert "Reliability Metrics" in content
        assert "Performance Metrics" in content
        
        # Should have specific targets
        assert "90% code coverage" in content
        assert "100% pass rate" in content
        
        # Should have quality checklist
        assert "Quality Checklist" in content
    
    def test_generate_summary_returns_metadata(self, generator):
        """Test that generate_summary returns correct metadata"""
        generator.generate_standards_document()
        summary = generator.generate_summary()
        
        assert summary["document_generated"] is True
        assert "TESTING_STANDARDS.md" in summary["output_path"]
        assert len(summary["sections_included"]) == 6
        assert summary["requirements_addressed"] == ["7.1", "7.4", "7.5"]
    
    def test_document_is_valid_markdown(self, generator):
        """Test that generated document is valid markdown"""
        output_path = generator.generate_standards_document()
        content = output_path.read_text(encoding='utf-8')
        
        # Should have markdown headers
        assert content.startswith("# Testing Standards")
        
        # Should have proper markdown formatting
        assert "##" in content  # Section headers
        assert "```" in content  # Code blocks
        assert "**" in content  # Bold text
        assert "|" in content   # Tables
    
    def test_document_includes_generation_timestamp(self, generator):
        """Test that document includes generation timestamp"""
        output_path = generator.generate_standards_document()
        content = output_path.read_text(encoding='utf-8')
        
        assert "**Generated:**" in content
        # Should have a date in format YYYY-MM-DD
        import re
        assert re.search(r'\d{4}-\d{2}-\d{2}', content)
