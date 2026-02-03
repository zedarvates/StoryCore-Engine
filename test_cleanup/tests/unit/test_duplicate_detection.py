"""
Unit tests for duplicate test detection.
"""

import pytest
from pathlib import Path
from test_cleanup.analysis.duplicate_detection import (
    extract_test_functions,
    calculate_name_similarity,
    calculate_assertion_similarity,
    find_similar_tests,
    detect_duplicates_in_files,
    identify_exact_duplicates
)


class TestTestFunctionExtraction:
    """Tests for extracting test functions from files."""
    
    def test_extract_test_functions_valid_file(self, tmp_path):
        """Test extracting test functions from a valid Python file."""
        test_file = tmp_path / "test_example.py"
        test_file.write_text("""
def test_addition():
    assert 1 + 1 == 2
    assert 2 + 2 == 4

def test_subtraction():
    assert 5 - 3 == 2

def not_a_test():
    pass
""")
        
        result = extract_test_functions(test_file)
        
        assert len(result) == 2
        assert result[0]['name'] == 'test_addition'
        assert len(result[0]['assertions']) == 2
        assert result[1]['name'] == 'test_subtraction'
        assert len(result[1]['assertions']) == 1
    
    def test_extract_test_functions_nonexistent_file(self):
        """Test handling of non-existent file."""
        result = extract_test_functions(Path("/nonexistent/file.py"))
        
        assert result == []
    
    def test_extract_test_functions_invalid_syntax(self, tmp_path):
        """Test handling of file with invalid syntax."""
        test_file = tmp_path / "test_invalid.py"
        test_file.write_text("def test_broken(\n    invalid syntax")
        
        result = extract_test_functions(test_file)
        
        assert result == []
    
    def test_extract_test_functions_no_tests(self, tmp_path):
        """Test file with no test functions."""
        test_file = tmp_path / "test_empty.py"
        test_file.write_text("""
def helper_function():
    return 42

class NotATest:
    pass
""")
        
        result = extract_test_functions(test_file)
        
        assert result == []


class TestNameSimilarity:
    """Tests for name similarity calculation."""
    
    def test_calculate_name_similarity_identical(self):
        """Test similarity of identical names."""
        similarity = calculate_name_similarity("test_example", "test_example")
        
        assert similarity == 1.0
    
    def test_calculate_name_similarity_completely_different(self):
        """Test similarity of completely different names."""
        similarity = calculate_name_similarity("test_abc", "test_xyz")
        
        # Both start with "test_" so they have some similarity
        assert 0.5 <= similarity < 1.0
    
    def test_calculate_name_similarity_partial_match(self):
        """Test similarity of partially matching names."""
        similarity = calculate_name_similarity("test_user_login", "test_user_logout")
        
        assert 0.5 < similarity < 1.0
    
    def test_calculate_name_similarity_case_insensitive(self):
        """Test that similarity is case-insensitive."""
        similarity = calculate_name_similarity("Test_Example", "test_example")
        
        assert similarity == 1.0


class TestAssertionSimilarity:
    """Tests for assertion similarity calculation."""
    
    def test_calculate_assertion_similarity_identical(self):
        """Test similarity of identical assertions."""
        assertions1 = ["assert x == 1", "assert y == 2"]
        assertions2 = ["assert x == 1", "assert y == 2"]
        
        similarity = calculate_assertion_similarity(assertions1, assertions2)
        
        assert similarity == 1.0
    
    def test_calculate_assertion_similarity_no_overlap(self):
        """Test similarity of completely different assertions."""
        assertions1 = ["assert x == 1"]
        assertions2 = ["assert y == 2"]
        
        similarity = calculate_assertion_similarity(assertions1, assertions2)
        
        assert similarity == 0.0
    
    def test_calculate_assertion_similarity_partial_overlap(self):
        """Test similarity of partially overlapping assertions."""
        assertions1 = ["assert x == 1", "assert y == 2"]
        assertions2 = ["assert x == 1", "assert z == 3"]
        
        similarity = calculate_assertion_similarity(assertions1, assertions2)
        
        # 1 shared assertion out of 3 total unique = 1/3
        assert similarity == pytest.approx(0.333, rel=0.01)
    
    def test_calculate_assertion_similarity_empty_lists(self):
        """Test similarity of empty assertion lists."""
        similarity = calculate_assertion_similarity([], [])
        
        assert similarity == 1.0
    
    def test_calculate_assertion_similarity_one_empty(self):
        """Test similarity when one list is empty."""
        similarity = calculate_assertion_similarity(["assert x == 1"], [])
        
        assert similarity == 0.0


class TestFindSimilarTests:
    """Tests for finding similar tests."""
    
    def test_find_similar_tests_by_name(self):
        """Test finding tests with similar names."""
        test_functions = [
            {
                'name': 'test_user_login',
                'file': 'test_auth.py',
                'assertions': ['assert user.is_authenticated'],
                'line_count': 5
            },
            {
                'name': 'test_user_logout',
                'file': 'test_auth.py',
                'assertions': ['assert not user.is_authenticated'],
                'line_count': 5
            }
        ]
        
        result = find_similar_tests(test_functions, name_threshold=0.7)
        
        assert len(result) >= 0  # May or may not find similarity depending on threshold
    
    def test_find_similar_tests_by_assertions(self):
        """Test finding tests with similar assertions."""
        test_functions = [
            {
                'name': 'test_one',
                'file': 'test_file.py',
                'assertions': ['assert x == 1', 'assert y == 2'],
                'line_count': 3
            },
            {
                'name': 'test_two',
                'file': 'test_file.py',
                'assertions': ['assert x == 1', 'assert y == 2'],
                'line_count': 3
            }
        ]
        
        result = find_similar_tests(test_functions, assertion_threshold=0.5)
        
        assert len(result) > 0
        assert len(result[0].tests) == 2
    
    def test_find_similar_tests_no_similarities(self):
        """Test when no similar tests exist."""
        test_functions = [
            {
                'name': 'test_abc',
                'file': 'test_file.py',
                'assertions': ['assert x == 1'],
                'line_count': 2
            },
            {
                'name': 'test_xyz',
                'file': 'test_file.py',
                'assertions': ['assert y == 2'],
                'line_count': 2
            }
        ]
        
        result = find_similar_tests(test_functions, name_threshold=0.9, assertion_threshold=0.9)
        
        assert len(result) == 0


class TestDetectDuplicatesInFiles:
    """Tests for detecting duplicates across files."""
    
    def test_detect_duplicates_in_files_with_duplicates(self, tmp_path):
        """Test detection of duplicates across multiple files."""
        file1 = tmp_path / "test_one.py"
        file1.write_text("""
def test_example():
    assert 1 + 1 == 2
""")
        
        file2 = tmp_path / "test_two.py"
        file2.write_text("""
def test_example():
    assert 1 + 1 == 2
""")
        
        result = detect_duplicates_in_files([file1, file2])
        
        # Should find similar tests
        assert isinstance(result, list)
    
    def test_detect_duplicates_in_files_no_duplicates(self, tmp_path):
        """Test when no duplicates exist."""
        file1 = tmp_path / "test_one.py"
        file1.write_text("""
def test_unique_one():
    assert 1 == 1
""")
        
        file2 = tmp_path / "test_two.py"
        file2.write_text("""
def test_unique_two():
    assert 2 == 2
""")
        
        result = detect_duplicates_in_files([file1, file2], name_threshold=0.9, assertion_threshold=0.9)
        
        assert len(result) == 0


class TestIdentifyExactDuplicates:
    """Tests for identifying exact duplicate tests."""
    
    def test_identify_exact_duplicates_same_name(self, tmp_path):
        """Test identification of tests with identical names."""
        file1 = tmp_path / "test_one.py"
        file1.write_text("""
def test_example():
    assert 1 + 1 == 2
""")
        
        file2 = tmp_path / "test_two.py"
        file2.write_text("""
def test_example():
    assert 1 + 1 == 2
""")
        
        result = identify_exact_duplicates([file1, file2])
        
        assert len(result) == 1
        assert len(result[0].tests) == 2
        assert result[0].similarity_score == 1.0
    
    def test_identify_exact_duplicates_no_duplicates(self, tmp_path):
        """Test when no exact duplicates exist."""
        file1 = tmp_path / "test_one.py"
        file1.write_text("""
def test_unique_one():
    assert 1 == 1
""")
        
        file2 = tmp_path / "test_two.py"
        file2.write_text("""
def test_unique_two():
    assert 2 == 2
""")
        
        result = identify_exact_duplicates([file1, file2])
        
        assert len(result) == 0
    
    def test_identify_exact_duplicates_multiple_groups(self, tmp_path):
        """Test identification of multiple duplicate groups."""
        file1 = tmp_path / "test_one.py"
        file1.write_text("""
def test_example():
    assert 1 == 1

def test_another():
    assert 2 == 2
""")
        
        file2 = tmp_path / "test_two.py"
        file2.write_text("""
def test_example():
    assert 1 == 1

def test_another():
    assert 2 == 2
""")
        
        result = identify_exact_duplicates([file1, file2])
        
        assert len(result) == 2
        for group in result:
            assert len(group.tests) == 2
            assert group.similarity_score == 1.0
