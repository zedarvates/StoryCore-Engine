"""
Unit tests for vitest best practices enforcement.
"""

import tempfile
from pathlib import Path
import pytest

from test_cleanup.framework.vitest_best_practices import (
    VitestBestPracticesEnforcer,
    VitestViolation,
    VitestAnalysisReport
)


class TestVitestBestPracticesEnforcer:
    """Tests for VitestBestPracticesEnforcer."""
    
    def test_analyze_file_with_short_test_name(self):
        """Test detection of short test names."""
        enforcer = VitestBestPracticesEnforcer()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.test.ts', delete=False) as f:
            f.write("""
test('short', () => {
    expect(true).toBe(true);
});
""")
            temp_path = Path(f.name)
        
        try:
            violations = enforcer.analyze_file(temp_path)
            
            naming_violations = [v for v in violations if v.violation_type == "test_naming"]
            assert len(naming_violations) > 0
            assert any("too short" in v.message.lower() for v in naming_violations)
        finally:
            temp_path.unlink()
    
    def test_analyze_file_with_generic_test_name(self):
        """Test detection of generic test names."""
        enforcer = VitestBestPracticesEnforcer()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.test.ts', delete=False) as f:
            f.write("""
test('test 1', () => {
    expect(true).toBe(true);
});
""")
            temp_path = Path(f.name)
        
        try:
            violations = enforcer.analyze_file(temp_path)
            
            naming_violations = [v for v in violations if v.violation_type == "test_naming"]
            error_violations = [v for v in naming_violations if v.severity == "error"]
            assert len(error_violations) > 0
            assert "generic" in error_violations[0].message.lower()
        finally:
            temp_path.unlink()
    
    def test_analyze_file_with_missing_behavior_description(self):
        """Test detection of tests without behavior description."""
        enforcer = VitestBestPracticesEnforcer()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.test.ts', delete=False) as f:
            f.write("""
test('user authentication', () => {
    expect(true).toBe(true);
});
""")
            temp_path = Path(f.name)
        
        try:
            violations = enforcer.analyze_file(temp_path)
            
            naming_violations = [v for v in violations if v.violation_type == "test_naming"]
            behavior_violations = [v for v in naming_violations if "behavior" in v.message.lower()]
            assert len(behavior_violations) > 0
        finally:
            temp_path.unlink()
    
    def test_analyze_file_with_missing_assertions(self):
        """Test detection of tests without assertions."""
        enforcer = VitestBestPracticesEnforcer()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.test.ts', delete=False) as f:
            f.write("""
test('something important happens', () => {
    const x = 1 + 1;
    // No assertion
});
""")
            temp_path = Path(f.name)
        
        try:
            violations = enforcer.analyze_file(temp_path)
            
            assertion_violations = [v for v in violations if v.violation_type == "missing_assertion"]
            assert len(assertion_violations) > 0
            assert assertion_violations[0].severity == "error"
        finally:
            temp_path.unlink()
    
    def test_analyze_file_with_many_tests_no_describe(self):
        """Test detection of many tests without describe blocks."""
        enforcer = VitestBestPracticesEnforcer()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.test.ts', delete=False) as f:
            f.write("""
test('test 1 should work', () => { expect(1).toBe(1); });
test('test 2 should work', () => { expect(2).toBe(2); });
test('test 3 should work', () => { expect(3).toBe(3); });
test('test 4 should work', () => { expect(4).toBe(4); });
test('test 5 should work', () => { expect(5).toBe(5); });
test('test 6 should work', () => { expect(6).toBe(6); });
""")
            temp_path = Path(f.name)
        
        try:
            violations = enforcer.analyze_file(temp_path)
            
            org_violations = [v for v in violations if v.violation_type == "test_organization"]
            assert len(org_violations) > 0
            assert "describe" in org_violations[0].message.lower()
        finally:
            temp_path.unlink()
    
    def test_analyze_file_with_bad_testing_library_query(self):
        """Test detection of bad testing-library queries."""
        enforcer = VitestBestPracticesEnforcer()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.test.tsx', delete=False) as f:
            f.write("""
import { render } from '@testing-library/react';

test('should render component', () => {
    const { getByTestId } = render(<MyComponent />);
    expect(getByTestId('my-element')).toBeInTheDocument();
});
""")
            temp_path = Path(f.name)
        
        try:
            violations = enforcer.analyze_file(temp_path)
            
            library_violations = [v for v in violations if v.violation_type == "testing_library_pattern"]
            assert len(library_violations) > 0
            assert "getByRole" in library_violations[0].message or "accessibility" in library_violations[0].message.lower()
        finally:
            temp_path.unlink()
    
    def test_analyze_file_with_async_without_await(self):
        """Test detection of async tests without await."""
        enforcer = VitestBestPracticesEnforcer()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.test.ts', delete=False) as f:
            f.write("""
test('should do something async', async () => {
    const result = 1 + 1;
    expect(result).toBe(2);
});
""")
            temp_path = Path(f.name)
        
        try:
            violations = enforcer.analyze_file(temp_path)
            
            async_violations = [v for v in violations if v.violation_type == "async_pattern"]
            assert len(async_violations) > 0
            assert "await" in async_violations[0].message.lower()
        finally:
            temp_path.unlink()
    
    def test_analyze_file_with_mocks_no_cleanup(self):
        """Test detection of mocks without cleanup."""
        enforcer = VitestBestPracticesEnforcer()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.test.ts', delete=False) as f:
            f.write("""
test('should call function', () => {
    const mockFn = vi.fn();
    mockFn();
    expect(mockFn).toHaveBeenCalled();
});
""")
            temp_path = Path(f.name)
        
        try:
            violations = enforcer.analyze_file(temp_path)
            
            mock_violations = [v for v in violations if v.violation_type == "mock_pattern"]
            cleanup_violations = [v for v in mock_violations if "clear" in v.message.lower() or "beforeEach" in v.message]
            assert len(cleanup_violations) > 0
        finally:
            temp_path.unlink()
    
    def test_analyze_file_with_beforeall_no_afterall(self):
        """Test detection of beforeAll without afterAll."""
        enforcer = VitestBestPracticesEnforcer()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.test.ts', delete=False) as f:
            f.write("""
beforeAll(() => {
    // Setup
});

test('should work', () => {
    expect(true).toBe(true);
});
""")
            temp_path = Path(f.name)
        
        try:
            violations = enforcer.analyze_file(temp_path)
            
            setup_violations = [v for v in violations if v.violation_type == "setup_teardown"]
            assert len(setup_violations) > 0
            assert "afterAll" in setup_violations[0].message
        finally:
            temp_path.unlink()
    
    def test_analyze_file_with_valid_test(self):
        """Test that valid tests don't generate critical violations."""
        enforcer = VitestBestPracticesEnforcer()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.test.ts', delete=False) as f:
            f.write("""
describe('MyComponent', () => {
    test('should render correctly', () => {
        const result = 1 + 1;
        expect(result).toBe(2);
    });
});
""")
            temp_path = Path(f.name)
        
        try:
            violations = enforcer.analyze_file(temp_path)
            
            errors = [v for v in violations if v.severity == "error"]
            assert len(errors) == 0
        finally:
            temp_path.unlink()
    
    def test_analyze_directory(self):
        """Test analyzing a directory of test files."""
        enforcer = VitestBestPracticesEnforcer()
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create test file 1
            test_file_1 = temp_path / "module1.test.ts"
            test_file_1.write_text("""
test('test 1', () => {
    expect(true).toBe(true);
});
""")
            
            # Create test file 2
            test_file_2 = temp_path / "module2.test.tsx"
            test_file_2.write_text("""
describe('Component', () => {
    test('should render properly', () => {
        expect(1).toBe(1);
    });
});
""")
            
            report = enforcer.analyze_directory(temp_path)
            
            assert report.total_files == 2
            assert len(report.files_analyzed) == 2
            assert report.total_violations > 0
    
    def test_get_violations_by_severity(self):
        """Test filtering violations by severity."""
        violations = [
            VitestViolation(
                file_path=Path("test.ts"),
                line_number=1,
                violation_type="test",
                message="Error",
                severity="error"
            ),
            VitestViolation(
                file_path=Path("test.ts"),
                line_number=2,
                violation_type="test",
                message="Warning",
                severity="warning"
            ),
            VitestViolation(
                file_path=Path("test.ts"),
                line_number=3,
                violation_type="test",
                message="Info",
                severity="info"
            )
        ]
        
        report = VitestAnalysisReport(
            total_files=1,
            total_violations=3,
            violations=violations,
            files_analyzed=[Path("test.ts")]
        )
        
        errors = report.get_violations_by_severity("error")
        assert len(errors) == 1
        assert errors[0].message == "Error"
        
        warnings = report.get_violations_by_severity("warning")
        assert len(warnings) == 1
        assert warnings[0].message == "Warning"
    
    def test_analyze_file_with_tobetruthyfalsy(self):
        """Test detection of toBeTruthy/toBeFalsy usage."""
        enforcer = VitestBestPracticesEnforcer()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.test.ts', delete=False) as f:
            f.write("""
test('should be truthy', () => {
    expect(someValue).toBeTruthy();
});
""")
            temp_path = Path(f.name)
        
        try:
            violations = enforcer.analyze_file(temp_path)
            
            assertion_violations = [v for v in violations if v.violation_type == "assertion_pattern"]
            assert len(assertion_violations) > 0
            assert "specific" in assertion_violations[0].message.lower()
        finally:
            temp_path.unlink()
