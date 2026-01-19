"""
Unit tests for Test Infrastructure Manager

Tests the test discovery and validation functionality.
"""

import pytest
from pathlib import Path
import tempfile
import shutil
from src.test_infrastructure_manager import (
    TestInfrastructureManager,
    TestCase,
    ExecutabilityReport,
    TestDiscoveryResult
)


@pytest.fixture
def temp_test_dir():
    """Creates a temporary test directory."""
    temp_dir = Path(tempfile.mkdtemp())
    yield temp_dir
    shutil.rmtree(temp_dir)


@pytest.fixture
def manager(temp_test_dir):
    """Creates a TestInfrastructureManager instance."""
    return TestInfrastructureManager(test_directory=temp_test_dir)


class TestTestInfrastructureManager:
    """Tests for TestInfrastructureManager class."""
    
    def test_initialization(self, temp_test_dir):
        """Test manager initialization."""
        manager = TestInfrastructureManager(test_directory=temp_test_dir)
        assert manager.test_directory == temp_test_dir
        assert manager.discovered_tests == []
    
    def test_discover_python_test_file(self, manager, temp_test_dir):
        """Test discovery of Python test file."""
        # Create a simple test file
        test_file = temp_test_dir / "test_example.py"
        test_file.write_text("""
import pytest

def test_simple():
    assert True

def test_another():
    assert 1 + 1 == 2
""")
        
        tests = manager.discover_tests()
        
        assert len(tests) >= 2
        test_names = [t.test_function for t in tests]
        assert "test_simple" in test_names
        assert "test_another" in test_names
    
    def test_discover_python_test_class(self, manager, temp_test_dir):
        """Test discovery of Python test class."""
        test_file = temp_test_dir / "test_class.py"
        test_file.write_text("""
import pytest

class TestExample:
    def test_method_one(self):
        assert True
    
    def test_method_two(self):
        assert False or True
""")
        
        tests = manager.discover_tests()
        
        assert len(tests) >= 2
        # Check that class tests are discovered
        class_tests = [t for t in tests if "TestExample" in t.name]
        assert len(class_tests) == 2
    
    def test_discover_typescript_test_file(self, manager, temp_test_dir):
        """Test discovery of TypeScript test file."""
        test_file = temp_test_dir / "example.test.ts"
        test_file.write_text("""
import { something } from './module';

describe('Example Suite', () => {
    it('should pass test one', () => {
        expect(true).toBe(true);
    });
    
    test('should pass test two', () => {
        expect(1 + 1).toBe(2);
    });
});
""")
        
        tests = manager.discover_tests()
        
        assert len(tests) >= 2
        # Check that TypeScript tests are discovered
        ts_tests = [t for t in tests if t.test_type == "ui"]
        assert len(ts_tests) >= 2
    
    def test_extract_python_dependencies(self, manager, temp_test_dir):
        """Test extraction of Python dependencies."""
        test_file = temp_test_dir / "test_deps.py"
        test_file.write_text("""
import os
import sys
from pathlib import Path
from typing import List

def test_something():
    pass
""")
        
        tests = manager.discover_tests()
        
        assert len(tests) >= 1
        test = tests[0]
        assert "os" in test.dependencies
        assert "sys" in test.dependencies
        assert "pathlib" in test.dependencies
        assert "typing" in test.dependencies
    
    def test_handle_syntax_error_in_test(self, manager, temp_test_dir):
        """Test handling of syntax errors in test files."""
        test_file = temp_test_dir / "test_broken.py"
        test_file.write_text("""
def test_broken(
    # Missing closing parenthesis
    assert True
""")
        
        tests = manager.discover_tests()
        
        # Should create a broken test case
        broken_tests = [t for t in tests if not t.is_executable]
        assert len(broken_tests) >= 1
        assert any("Syntax error" in issue for t in broken_tests for issue in t.blocking_issues)
    
    def test_validate_executable_python_test(self, manager, temp_test_dir):
        """Test validation of executable Python test."""
        test_file = temp_test_dir / "test_valid.py"
        test_file.write_text("""
def test_valid():
    assert True
""")
        
        tests = manager.discover_tests()
        assert len(tests) >= 1
        
        test_case = tests[0]
        report = manager.validate_executability(test_case)
        
        assert report.is_executable
        assert len(report.missing_dependencies) == 0
        assert len(report.syntax_errors) == 0
    
    def test_validate_test_with_missing_dependency(self, manager, temp_test_dir):
        """Test validation detects missing dependencies."""
        test_file = temp_test_dir / "test_missing_dep.py"
        test_file.write_text("""
import nonexistent_module_xyz123

def test_with_missing_dep():
    pass
""")
        
        tests = manager.discover_tests()
        assert len(tests) >= 1
        
        test_case = tests[0]
        report = manager.validate_executability(test_case)
        
        assert not report.is_executable
        assert "nonexistent_module_xyz123" in report.missing_dependencies
        assert len(report.recommendations) > 0
    
    def test_generate_discovery_report(self, manager, temp_test_dir):
        """Test generation of discovery report."""
        # Create multiple test files
        (temp_test_dir / "test_one.py").write_text("""
def test_a():
    pass

def test_b():
    pass
""")
        
        (temp_test_dir / "test_two.py").write_text("""
def test_c():
    pass
""")
        
        result = manager.generate_discovery_report()
        
        assert isinstance(result, TestDiscoveryResult)
        assert result.total_tests >= 3
        assert result.executable_tests >= 0
        assert result.broken_tests >= 0
        assert result.total_tests == result.executable_tests + result.broken_tests
        assert "executability_percentage" in result.summary
        assert "tests_by_type" in result.summary
    
    def test_determine_test_type_from_path(self, manager, temp_test_dir):
        """Test determination of test type from file path."""
        # Create test files in different directories
        unit_dir = temp_test_dir / "unit"
        unit_dir.mkdir()
        (unit_dir / "test_unit.py").write_text("def test_unit(): pass")
        
        property_dir = temp_test_dir / "property"
        property_dir.mkdir()
        (property_dir / "test_property.py").write_text("def test_property(): pass")
        
        integration_dir = temp_test_dir / "integration"
        integration_dir.mkdir()
        (integration_dir / "test_integration.py").write_text("def test_integration(): pass")
        
        tests = manager.discover_tests()
        
        unit_tests = [t for t in tests if t.test_type == "unit"]
        property_tests = [t for t in tests if t.test_type == "property"]
        integration_tests = [t for t in tests if t.test_type == "integration"]
        
        assert len(unit_tests) >= 1
        assert len(property_tests) >= 1
        assert len(integration_tests) >= 1
    
    def test_executability_percentage_calculation(self, manager, temp_test_dir):
        """Test calculation of executability percentage."""
        # Create 10 valid tests
        for i in range(10):
            (temp_test_dir / f"test_valid_{i}.py").write_text(f"""
def test_valid_{i}():
    pass
""")
        
        # Create 2 broken tests
        for i in range(2):
            (temp_test_dir / f"test_broken_{i}.py").write_text(f"""
import nonexistent_module_{i}

def test_broken_{i}():
    pass
""")
        
        result = manager.generate_discovery_report()
        
        # Should have 12 total tests
        assert result.total_tests >= 12
        
        # Calculate expected percentage
        expected_percentage = (result.executable_tests / result.total_tests) * 100
        assert result.summary["executability_percentage"] == round(expected_percentage, 2)
    
    def test_meets_95_percent_threshold(self, manager, temp_test_dir):
        """Test checking if tests meet 95% executability threshold."""
        # Create 100 valid tests
        for i in range(100):
            (temp_test_dir / f"test_{i}.py").write_text(f"""
def test_{i}():
    pass
""")
        
        result = manager.generate_discovery_report()
        
        # All tests should be executable
        assert result.summary["meets_95_percent_threshold"]
        assert result.summary["executability_percentage"] >= 95.0
    
    def test_does_not_meet_95_percent_threshold(self, manager, temp_test_dir):
        """Test detection when tests don't meet 95% threshold."""
        # Create 10 valid tests
        for i in range(10):
            (temp_test_dir / f"test_valid_{i}.py").write_text(f"""
def test_valid_{i}():
    pass
""")
        
        # Create 10 broken tests (50% broken)
        for i in range(10):
            (temp_test_dir / f"test_broken_{i}.py").write_text(f"""
import nonexistent_module_{i}

def test_broken_{i}():
    pass
""")
        
        result = manager.generate_discovery_report()
        
        # Should not meet 95% threshold
        assert not result.summary["meets_95_percent_threshold"]
        assert result.summary["executability_percentage"] < 95.0
    
    def test_nonexistent_test_directory(self):
        """Test handling of nonexistent test directory."""
        manager = TestInfrastructureManager(test_directory=Path("/nonexistent/path"))
        
        with pytest.raises(FileNotFoundError):
            manager.discover_tests()
    
    def test_empty_test_directory(self, manager, temp_test_dir):
        """Test handling of empty test directory."""
        tests = manager.discover_tests()
        
        assert tests == []
        assert len(manager.discovered_tests) == 0
    
    def test_print_report_does_not_crash(self, manager, temp_test_dir, capsys):
        """Test that print_report executes without errors."""
        # Create a simple test
        (temp_test_dir / "test_simple.py").write_text("""
def test_simple():
    pass
""")
        
        result = manager.generate_discovery_report()
        manager.print_report(result)
        
        captured = capsys.readouterr()
        assert "TEST INFRASTRUCTURE DISCOVERY REPORT" in captured.out
        assert "Total Tests Discovered" in captured.out


@pytest.mark.unit
class TestTestCase:
    """Tests for TestCase dataclass."""
    
    def test_test_case_creation(self):
        """Test TestCase creation with default values."""
        test_case = TestCase(
            name="test_example",
            file_path=Path("test_file.py"),
            test_function="test_example"
        )
        
        assert test_case.name == "test_example"
        assert test_case.file_path == Path("test_file.py")
        assert test_case.test_function == "test_example"
        assert test_case.dependencies == []
        assert test_case.is_executable is True
        assert test_case.blocking_issues == []
        assert test_case.test_type == "unit"
    
    def test_test_case_with_issues(self):
        """Test TestCase with blocking issues."""
        test_case = TestCase(
            name="test_broken",
            file_path=Path("test_broken.py"),
            test_function="test_broken",
            is_executable=False,
            blocking_issues=["Missing dependency: xyz"]
        )
        
        assert not test_case.is_executable
        assert len(test_case.blocking_issues) == 1


@pytest.mark.unit
class TestExecutabilityReport:
    """Tests for ExecutabilityReport dataclass."""
    
    def test_executability_report_creation(self):
        """Test ExecutabilityReport creation."""
        test_case = TestCase(
            name="test_example",
            file_path=Path("test_file.py"),
            test_function="test_example"
        )
        
        report = ExecutabilityReport(
            test_case=test_case,
            is_executable=True
        )
        
        assert report.test_case == test_case
        assert report.is_executable
        assert report.missing_dependencies == []
        assert report.import_errors == []
        assert report.syntax_errors == []
        assert report.configuration_issues == []
        assert report.recommendations == []
    
    def test_executability_report_with_issues(self):
        """Test ExecutabilityReport with various issues."""
        test_case = TestCase(
            name="test_broken",
            file_path=Path("test_broken.py"),
            test_function="test_broken"
        )
        
        report = ExecutabilityReport(
            test_case=test_case,
            is_executable=False,
            missing_dependencies=["module1", "module2"],
            import_errors=["Import failed"],
            syntax_errors=["Syntax error at line 5"],
            configuration_issues=["Missing config"],
            recommendations=["Install dependencies", "Fix syntax"]
        )
        
        assert not report.is_executable
        assert len(report.missing_dependencies) == 2
        assert len(report.import_errors) == 1
        assert len(report.syntax_errors) == 1
        assert len(report.configuration_issues) == 1
        assert len(report.recommendations) == 2
