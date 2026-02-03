"""
Unit tests for pytest best practices enforcement.
"""

import tempfile
from pathlib import Path
import pytest

from test_cleanup.framework.pytest_best_practices import (
    PytestBestPracticesEnforcer,
    PytestViolation,
    PytestAnalysisReport
)


class TestPytestBestPracticesEnforcer:
    """Tests for PytestBestPracticesEnforcer."""
    
    def test_analyze_file_with_short_test_name(self):
        """Test detection of short test names."""
        enforcer = PytestBestPracticesEnforcer()
        
        # Create temporary test file with short name
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write("""
def test_a():
    assert True
""")
            temp_path = Path(f.name)
        
        try:
            violations = enforcer.analyze_file(temp_path)
            
            # Should have violation for short name
            naming_violations = [v for v in violations if v.violation_type == "test_naming"]
            assert len(naming_violations) > 0
            assert "too short" in naming_violations[0].message.lower()
        finally:
            temp_path.unlink()
    
    def test_analyze_file_with_generic_test_name(self):
        """Test detection of generic test names."""
        enforcer = PytestBestPracticesEnforcer()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write("""
def test_1():
    assert True
""")
            temp_path = Path(f.name)
        
        try:
            violations = enforcer.analyze_file(temp_path)
            
            # Should have error for generic name
            naming_violations = [v for v in violations if v.violation_type == "test_naming"]
            assert len(naming_violations) > 0
            assert naming_violations[0].severity == "error"
            assert "generic" in naming_violations[0].message.lower()
        finally:
            temp_path.unlink()
    
    def test_analyze_file_with_missing_assertions(self):
        """Test detection of tests without assertions."""
        enforcer = PytestBestPracticesEnforcer()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write("""
def test_something_important():
    x = 1 + 1
    # No assertion
""")
            temp_path = Path(f.name)
        
        try:
            violations = enforcer.analyze_file(temp_path)
            
            # Should have error for missing assertion
            assertion_violations = [v for v in violations if v.violation_type == "missing_assertion"]
            assert len(assertion_violations) > 0
            assert assertion_violations[0].severity == "error"
        finally:
            temp_path.unlink()
    
    def test_analyze_file_with_bare_assert(self):
        """Test detection of bare assert True/False."""
        enforcer = PytestBestPracticesEnforcer()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write("""
def test_something_works():
    assert True
""")
            temp_path = Path(f.name)
        
        try:
            violations = enforcer.analyze_file(temp_path)
            
            # Should have warning for bare assert
            bare_assert_violations = [v for v in violations if v.violation_type == "bare_assert"]
            assert len(bare_assert_violations) > 0
            assert bare_assert_violations[0].severity == "warning"
        finally:
            temp_path.unlink()
    
    def test_analyze_file_with_old_style_setup(self):
        """Test detection of old-style setup/teardown."""
        enforcer = PytestBestPracticesEnforcer()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write("""
class TestMyClass:
    def setup(self):
        self.value = 42
    
    def test_something(self):
        assert self.value == 42
""")
            temp_path = Path(f.name)
        
        try:
            violations = enforcer.analyze_file(temp_path)
            
            # Should have warning for old-style setup
            setup_violations = [v for v in violations if v.violation_type == "old_style_setup"]
            assert len(setup_violations) > 0
            assert "fixture" in setup_violations[0].message.lower()
        finally:
            temp_path.unlink()
    
    def test_analyze_file_with_parametrize_opportunity(self):
        """Test detection of parametrize opportunities."""
        enforcer = PytestBestPracticesEnforcer()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write("""
def test_addition_1():
    assert 1 + 1 == 2

def test_addition_2():
    assert 2 + 2 == 4

def test_addition_3():
    assert 3 + 3 == 6
""")
            temp_path = Path(f.name)
        
        try:
            violations = enforcer.analyze_file(temp_path)
            
            # Should suggest parametrize
            param_violations = [v for v in violations if v.violation_type == "parametrize_opportunity"]
            assert len(param_violations) > 0
            assert "parametrize" in param_violations[0].message.lower()
        finally:
            temp_path.unlink()
    
    def test_analyze_file_with_valid_test(self):
        """Test that valid tests don't generate violations."""
        enforcer = PytestBestPracticesEnforcer()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write("""
def test_valid_addition_operation():
    result = 1 + 1
    assert result == 2
""")
            temp_path = Path(f.name)
        
        try:
            violations = enforcer.analyze_file(temp_path)
            
            # Should have no critical violations
            errors = [v for v in violations if v.severity == "error"]
            assert len(errors) == 0
        finally:
            temp_path.unlink()
    
    def test_analyze_directory(self):
        """Test analyzing a directory of test files."""
        enforcer = PytestBestPracticesEnforcer()
        
        # Create temporary directory with test files
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create test file 1
            test_file_1 = temp_path / "test_module1.py"
            test_file_1.write_text("""
def test_1():
    assert True
""")
            
            # Create test file 2
            test_file_2 = temp_path / "test_module2.py"
            test_file_2.write_text("""
def test_something_important():
    result = 1 + 1
    assert result == 2
""")
            
            report = enforcer.analyze_directory(temp_path)
            
            assert report.total_files == 2
            assert len(report.files_analyzed) == 2
            assert report.total_violations > 0  # test_1 should have violations
    
    def test_get_violations_by_severity(self):
        """Test filtering violations by severity."""
        violations = [
            PytestViolation(
                file_path=Path("test.py"),
                line_number=1,
                violation_type="test",
                message="Error",
                severity="error"
            ),
            PytestViolation(
                file_path=Path("test.py"),
                line_number=2,
                violation_type="test",
                message="Warning",
                severity="warning"
            ),
            PytestViolation(
                file_path=Path("test.py"),
                line_number=3,
                violation_type="test",
                message="Info",
                severity="info"
            )
        ]
        
        report = PytestAnalysisReport(
            total_files=1,
            total_violations=3,
            violations=violations,
            files_analyzed=[Path("test.py")]
        )
        
        errors = report.get_violations_by_severity("error")
        assert len(errors) == 1
        assert errors[0].message == "Error"
        
        warnings = report.get_violations_by_severity("warning")
        assert len(warnings) == 1
        assert warnings[0].message == "Warning"
    
    def test_analyze_file_with_parse_error(self):
        """Test handling of files that can't be parsed."""
        enforcer = PytestBestPracticesEnforcer()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write("""
def test_invalid_syntax(
    # Missing closing parenthesis
""")
            temp_path = Path(f.name)
        
        try:
            violations = enforcer.analyze_file(temp_path)
            
            # Should have parse error
            parse_errors = [v for v in violations if v.violation_type == "parse_error"]
            assert len(parse_errors) > 0
            assert parse_errors[0].severity == "error"
        finally:
            temp_path.unlink()
    
    def test_fixture_scope_suggestion(self):
        """Test suggestion for fixture scope on expensive resources."""
        enforcer = PytestBestPracticesEnforcer()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write("""
import pytest

@pytest.fixture
def database_connection():
    # Creates expensive database connection
    return create_database()
""")
            temp_path = Path(f.name)
        
        try:
            violations = enforcer.analyze_file(temp_path)
            
            # Should suggest scope for expensive fixture
            scope_violations = [v for v in violations if v.violation_type == "fixture_scope"]
            assert len(scope_violations) > 0
            assert "scope" in scope_violations[0].message.lower()
        finally:
            temp_path.unlink()
