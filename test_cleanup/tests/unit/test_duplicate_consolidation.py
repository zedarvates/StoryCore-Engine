"""
Unit tests for duplicate test consolidation.
"""

import pytest
from pathlib import Path
from test_cleanup.cleanup.duplicate_consolidation import (
    extract_assertions_from_test,
    extract_all_assertions_from_file,
    get_unique_assertions,
    extract_test_docstring,
    extract_test_setup,
    generate_merged_test_name,
    generate_merged_test_code,
    consolidate_duplicate_tests,
    consolidate_multiple_groups,
    preview_consolidation
)
from test_cleanup.models import TestGroup, CleanupLog


class TestExtractAssertionsFromTest:
    """Tests for extract_assertions_from_test function."""
    
    def test_extract_simple_assertions(self):
        """Test extracting simple assertions."""
        source = """
def test_example():
    assert 1 + 1 == 2
    assert True
"""
        assertions = extract_assertions_from_test(source, "test_example")
        
        assert len(assertions) == 2
        assert any("1 + 1 == 2" in a for a in assertions)
        assert any("True" in a for a in assertions)
    
    def test_extract_no_assertions(self):
        """Test when function has no assertions."""
        source = """
def test_example():
    x = 1 + 1
    print(x)
"""
        assertions = extract_assertions_from_test(source, "test_example")
        
        assert len(assertions) == 0
    
    def test_extract_from_nonexistent_function(self):
        """Test extracting from non-existent function."""
        source = """
def test_example():
    assert True
"""
        assertions = extract_assertions_from_test(source, "test_nonexistent")
        
        assert len(assertions) == 0


class TestExtractAllAssertionsFromFile:
    """Tests for extract_all_assertions_from_file function."""
    
    def test_extract_from_multiple_tests(self, tmp_path):
        """Test extracting assertions from multiple test functions."""
        test_file = tmp_path / "test_example.py"
        test_file.write_text("""
def test_one():
    assert 1 == 1

def test_two():
    assert 2 == 2
    assert True
""")
        
        assertions = extract_all_assertions_from_file(test_file)
        
        assert "test_one" in assertions
        assert "test_two" in assertions
        assert len(assertions["test_one"]) == 1
        assert len(assertions["test_two"]) == 2
    
    def test_extract_from_nonexistent_file(self, tmp_path):
        """Test extracting from non-existent file."""
        test_file = tmp_path / "nonexistent.py"
        
        assertions = extract_all_assertions_from_file(test_file)
        
        assert assertions == {}


class TestGetUniqueAssertions:
    """Tests for get_unique_assertions function."""
    
    def test_get_unique_assertions_from_group(self, tmp_path):
        """Test getting unique assertions from duplicate tests."""
        # Create test files
        test1 = tmp_path / "test_1.py"
        test1.write_text("""
def test_example():
    assert 1 == 1
    assert True
""")
        
        test2 = tmp_path / "test_2.py"
        test2.write_text("""
def test_example():
    assert 1 == 1
    assert 2 == 2
""")
        
        test_group = TestGroup(
            tests=["test_example", "test_example"],
            similarity_score=0.8,
            shared_assertions=[]
        )
        
        test_files = {
            "test_example": test1
        }
        
        unique = get_unique_assertions(test_group, test_files)
        
        assert len(unique) >= 1


class TestExtractTestDocstring:
    """Tests for extract_test_docstring function."""
    
    def test_extract_docstring(self):
        """Test extracting docstring from test."""
        source = """
def test_example():
    '''This is a test docstring.'''
    assert True
"""
        docstring = extract_test_docstring(source, "test_example")
        
        assert docstring is not None
        assert "test docstring" in docstring
    
    def test_extract_no_docstring(self):
        """Test when test has no docstring."""
        source = """
def test_example():
    assert True
"""
        docstring = extract_test_docstring(source, "test_example")
        
        assert docstring is None


class TestExtractTestSetup:
    """Tests for extract_test_setup function."""
    
    def test_extract_setup_code(self):
        """Test extracting setup code from test."""
        source = """
def test_example():
    x = 1
    y = 2
    assert x + y == 3
"""
        setup = extract_test_setup(source, "test_example")
        
        assert len(setup) >= 1
        # Setup should contain variable assignments
        assert any("=" in s for s in setup)


class TestGenerateMergedTestName:
    """Tests for generate_merged_test_name function."""
    
    def test_generate_name_with_common_words(self):
        """Test generating name when tests have common words."""
        test_group = TestGroup(
            tests=["test_user_login", "test_user_logout"],
            similarity_score=0.8,
            shared_assertions=[]
        )
        
        name = generate_merged_test_name(test_group)
        
        assert name.startswith("test_")
        assert "user" in name
    
    def test_generate_name_no_common_words(self):
        """Test generating name when tests have no common words."""
        test_group = TestGroup(
            tests=["test_alpha", "test_beta"],
            similarity_score=0.8,
            shared_assertions=[]
        )
        
        name = generate_merged_test_name(test_group)
        
        assert name.startswith("test_")


class TestGenerateMergedTestCode:
    """Tests for generate_merged_test_code function."""
    
    def test_generate_merged_code(self, tmp_path):
        """Test generating merged test code."""
        test1 = tmp_path / "test_1.py"
        test1.write_text("""
def test_example():
    '''Test docstring.'''
    assert 1 == 1
""")
        
        test_group = TestGroup(
            tests=["test_example"],
            similarity_score=1.0,
            shared_assertions=[]
        )
        
        test_files = {
            "test_example": test1
        }
        
        code = generate_merged_test_code(test_group, test_files)
        
        assert "def test_" in code
        assert "Consolidated test from:" in code
        assert "test_example" in code
    
    def test_generate_with_custom_name(self, tmp_path):
        """Test generating merged code with custom name."""
        test1 = tmp_path / "test_1.py"
        test1.write_text("""
def test_example():
    assert True
""")
        
        test_group = TestGroup(
            tests=["test_example"],
            similarity_score=1.0,
            shared_assertions=[]
        )
        
        test_files = {
            "test_example": test1
        }
        
        code = generate_merged_test_code(test_group, test_files, merged_name="test_custom")
        
        assert "def test_custom():" in code


class TestConsolidateDuplicateTests:
    """Tests for consolidate_duplicate_tests function."""
    
    def test_consolidate_successfully(self, tmp_path):
        """Test successfully consolidating duplicate tests."""
        test1 = tmp_path / "test_1.py"
        test1.write_text("""
def test_example():
    assert 1 == 1
""")
        
        test_group = TestGroup(
            tests=["test_example"],
            similarity_score=1.0,
            shared_assertions=[]
        )
        
        test_files = {
            "test_example": test1
        }
        
        output_file = tmp_path / "test_merged.py"
        cleanup_log = CleanupLog()
        
        success = consolidate_duplicate_tests(test_group, test_files, output_file, cleanup_log)
        
        assert success is True
        assert output_file.exists()
        assert len(cleanup_log.actions) == 1
        assert cleanup_log.actions[0].action_type == "merge"
        assert cleanup_log.total_merged == 1


class TestConsolidateMultipleGroups:
    """Tests for consolidate_multiple_groups function."""
    
    def test_consolidate_multiple_groups(self, tmp_path):
        """Test consolidating multiple groups of duplicates."""
        test1 = tmp_path / "test_1.py"
        test1.write_text("""
def test_example():
    assert 1 == 1
""")
        
        test2 = tmp_path / "test_2.py"
        test2.write_text("""
def test_another():
    assert 2 == 2
""")
        
        groups = [
            TestGroup(
                tests=["test_example"],
                similarity_score=1.0,
                shared_assertions=[]
            ),
            TestGroup(
                tests=["test_another"],
                similarity_score=1.0,
                shared_assertions=[]
            )
        ]
        
        test_files = {
            "test_example": test1,
            "test_another": test2
        }
        
        output_dir = tmp_path / "merged"
        cleanup_log = CleanupLog()
        
        results = consolidate_multiple_groups(groups, test_files, output_dir, cleanup_log)
        
        assert len(results) == 2
        assert all(success for success in results.values())
        assert output_dir.exists()


class TestPreviewConsolidation:
    """Tests for preview_consolidation function."""
    
    def test_preview_consolidation(self, tmp_path):
        """Test previewing consolidation without performing it."""
        test1 = tmp_path / "test_1.py"
        test1.write_text("""
def test_example():
    assert 1 == 1
    assert True
""")
        
        test_group = TestGroup(
            tests=["test_example"],
            similarity_score=1.0,
            shared_assertions=[]
        )
        
        test_files = {
            "test_example": test1
        }
        
        preview = preview_consolidation(test_group, test_files)
        
        assert 'merged_name' in preview
        assert 'original_tests' in preview
        assert 'unique_assertions_count' in preview
        assert 'merged_code' in preview
        assert preview['tests_to_remove'] == 1
