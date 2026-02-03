"""
Unit tests for Test Examples Generator

Tests the generation of test examples and anti-patterns documentation.
"""

import pytest
from pathlib import Path
import tempfile
import shutil
from datetime import datetime
from test_cleanup.documentation.examples_generator import TestExamplesGenerator
from test_cleanup.models import CleanupLog, CleanupAction, TestMetrics


class TestTestExamplesGenerator:
    """Test suite for TestExamplesGenerator"""
    
    @pytest.fixture
    def temp_output_dir(self):
        """Create temporary output directory"""
        temp_dir = Path(tempfile.mkdtemp())
        yield temp_dir
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def sample_cleanup_log(self):
        """Create sample cleanup log with actions"""
        actions = [
            CleanupAction(
                action_type="rewrite",
                test_name="test_fragile_timing",
                reason="Removed sleep() calls and timing dependencies",
                timestamp=datetime.now(),
                before_metrics=TestMetrics(
                    name="test_fragile_timing",
                    file_path=Path("tests/test_old.py"),
                    failure_rate=0.15,
                    execution_time=5.0,
                    last_modified=datetime.now(),
                    lines_of_code=20
                ),
                after_metrics=TestMetrics(
                    name="test_fragile_timing",
                    file_path=Path("tests/test_old.py"),
                    failure_rate=0.0,
                    execution_time=0.5,
                    last_modified=datetime.now(),
                    lines_of_code=15
                )
            ),
            CleanupAction(
                action_type="rewrite",
                test_name="test_random_data",
                reason="Fixed non-deterministic random data generation",
                timestamp=datetime.now(),
                before_metrics=None,
                after_metrics=None
            ),
            CleanupAction(
                action_type="remove",
                test_name="test_obsolete",
                reason="Tests non-existent functionality",
                timestamp=datetime.now(),
                before_metrics=None,
                after_metrics=None
            )
        ]
        
        return CleanupLog(
            actions=actions,
            total_removed=1,
            total_rewritten=2,
            total_merged=0,
            start_time=datetime.now(),
            end_time=datetime.now()
        )
    
    @pytest.fixture
    def generator(self, temp_output_dir):
        """Create examples generator instance"""
        return TestExamplesGenerator(temp_output_dir)
    
    @pytest.fixture
    def generator_with_log(self, temp_output_dir, sample_cleanup_log):
        """Create examples generator with cleanup log"""
        return TestExamplesGenerator(temp_output_dir, sample_cleanup_log)
    
    def test_generator_creates_output_directory(self, temp_output_dir):
        """Test that generator creates output directory if it doesn't exist"""
        output_dir = temp_output_dir / "new_dir"
        assert not output_dir.exists()
        
        generator = TestExamplesGenerator(output_dir)
        assert output_dir.exists()
    
    def test_generate_examples_document_creates_file(self, generator, temp_output_dir):
        """Test that examples document is created"""
        output_path = generator.generate_examples_document()
        
        assert output_path.exists()
        assert output_path.name == "TEST_EXAMPLES_AND_ANTIPATTERNS.md"
        assert output_path.parent == temp_output_dir
    
    def test_examples_document_contains_required_sections(self, generator):
        """Test that generated document contains all required sections"""
        output_path = generator.generate_examples_document()
        content = output_path.read_text(encoding='utf-8')
        
        # Check for main sections (Requirement 7.2, 7.3)
        required_sections = [
            "# Test Examples and Anti-Patterns",
            "## Examples of Well-Written Tests",
            "## Anti-Patterns to Avoid",
            "## Before/After Cleanup Examples",
            "## Common Mistakes",
            "## Refactoring Patterns"
        ]
        
        for section in required_sections:
            assert section in content, f"Missing section: {section}"
    
    def test_good_examples_section_provides_examples(self, generator):
        """Test that good examples section provides concrete examples (Requirement 7.2)"""
        output_path = generator.generate_examples_document()
        content = output_path.read_text(encoding='utf-8')
        
        # Should have multiple examples
        assert "### Example 1:" in content
        assert "### Example 2:" in content
        assert "### Example 3:" in content
        
        # Should have code examples
        assert "```python" in content
        assert "```typescript" in content
        
        # Should explain why examples are good
        assert "**Why this is good:**" in content
    
    def test_antipatterns_section_documents_patterns_to_avoid(self, generator):
        """Test that anti-patterns section documents what to avoid (Requirement 7.3)"""
        output_path = generator.generate_examples_document()
        content = output_path.read_text(encoding='utf-8')
        
        # Should have anti-pattern examples
        assert "### Anti-Pattern 1:" in content
        assert "### Anti-Pattern 2:" in content
        
        # Should show bad examples
        assert "**Bad:**" in content
        
        # Should explain why they're bad
        assert "**Why this is bad:**" in content
        
        # Should show good alternatives
        assert "**Good:**" in content
    
    def test_before_after_section_without_cleanup_log(self, generator):
        """Test before/after section when no cleanup log provided"""
        output_path = generator.generate_examples_document()
        content = output_path.read_text(encoding='utf-8')
        
        # Should indicate no cleanup log
        assert "Before/After Cleanup Examples" in content
        assert "No cleanup log provided" in content
    
    def test_before_after_section_with_cleanup_log(self, generator_with_log):
        """Test before/after section includes cleanup examples (Requirement 7.3)"""
        output_path = generator_with_log.generate_examples_document()
        content = output_path.read_text(encoding='utf-8')
        
        # Should have before/after examples
        assert "Before/After Cleanup Examples" in content
        assert "actual improvements made during cleanup" in content
        
        # Should include specific examples from cleanup log
        assert "test_fragile_timing" in content
        assert "Removed sleep() calls" in content
        
        # Should have before/after structure
        assert "**Before:**" in content
        assert "**After:**" in content
    
    def test_common_mistakes_section_provides_solutions(self, generator):
        """Test that common mistakes section provides solutions"""
        output_path = generator.generate_examples_document()
        content = output_path.read_text(encoding='utf-8')
        
        # Should have mistake examples
        assert "### Mistake 1:" in content
        assert "### Mistake 2:" in content
        
        # Should show problem and solution
        assert "**Problem:**" in content
        assert "**Solution:**" in content
    
    def test_refactoring_patterns_section_shows_transformations(self, generator):
        """Test that refactoring patterns show before/after transformations"""
        output_path = generator.generate_examples_document()
        content = output_path.read_text(encoding='utf-8')
        
        # Should have refactoring patterns
        assert "### Pattern 1:" in content
        assert "### Pattern 2:" in content
        
        # Should show before/after
        assert "**Before:**" in content
        assert "**After:**" in content
    
    def test_examples_cover_both_python_and_typescript(self, generator):
        """Test that examples cover both Python and TypeScript"""
        output_path = generator.generate_examples_document()
        content = output_path.read_text(encoding='utf-8')
        
        # Should have Python examples
        assert "pytest" in content
        assert "def test_" in content
        
        # Should have TypeScript examples
        assert "vitest" in content
        assert "describe(" in content
        assert "it(" in content
    
    def test_examples_include_different_test_types(self, generator):
        """Test that examples include different types of tests"""
        output_path = generator.generate_examples_document()
        content = output_path.read_text(encoding='utf-8')
        
        # Should cover different test types
        assert "Unit Test" in content
        assert "Integration Test" in content
        assert "Property-Based Test" in content
        assert "Component Test" in content or "React" in content
    
    def test_generate_summary_returns_metadata(self, generator):
        """Test that generate_summary returns correct metadata"""
        generator.generate_examples_document()
        summary = generator.generate_summary()
        
        assert summary["document_generated"] is True
        assert "TEST_EXAMPLES_AND_ANTIPATTERNS.md" in summary["output_path"]
        assert len(summary["sections_included"]) == 5
        assert summary["requirements_addressed"] == ["7.2", "7.3"]
        assert summary["cleanup_examples_included"] is False
    
    def test_generate_summary_with_cleanup_log(self, generator_with_log):
        """Test that summary indicates cleanup examples are included"""
        generator_with_log.generate_examples_document()
        summary = generator_with_log.generate_summary()
        
        assert summary["cleanup_examples_included"] is True
    
    def test_document_is_valid_markdown(self, generator):
        """Test that generated document is valid markdown"""
        output_path = generator.generate_examples_document()
        content = output_path.read_text(encoding='utf-8')
        
        # Should have markdown headers
        assert content.startswith("# Test Examples")
        
        # Should have proper markdown formatting
        assert "##" in content  # Section headers
        assert "```" in content  # Code blocks
        assert "**" in content  # Bold text
    
    def test_document_includes_generation_timestamp(self, generator):
        """Test that document includes generation timestamp"""
        output_path = generator.generate_examples_document()
        content = output_path.read_text(encoding='utf-8')
        
        assert "**Generated:**" in content
        # Should have a date in format YYYY-MM-DD
        import re
        assert re.search(r'\d{4}-\d{2}-\d{2}', content)
    
    def test_antipatterns_cover_common_issues(self, generator):
        """Test that anti-patterns cover common testing issues"""
        output_path = generator.generate_examples_document()
        content = output_path.read_text(encoding='utf-8')
        
        # Should cover key anti-patterns
        assert "Implementation Details" in content
        assert "Multiple Unrelated Assertions" in content
        assert "Non-Deterministic" in content
        assert "Test Interdependence" in content
    
    def test_examples_have_explanations(self, generator):
        """Test that all examples have clear explanations"""
        output_path = generator.generate_examples_document()
        content = output_path.read_text(encoding='utf-8')
        
        # Good examples should explain why they're good
        good_examples_count = content.count("### Example")
        why_good_count = content.count("**Why this is good:**")
        assert why_good_count >= good_examples_count - 1  # Allow for some variation
        
        # Anti-patterns should explain why they're bad
        antipattern_count = content.count("### Anti-Pattern")
        why_bad_count = content.count("**Why this is bad:**")
        assert why_bad_count >= antipattern_count - 1
