"""
Vitest best practices enforcement.

This module analyzes vitest/TypeScript test files and enforces best practices including:
- Proper testing-library patterns for React
- Vitest-specific patterns
- Test organization
"""

import re
from dataclasses import dataclass
from pathlib import Path
from typing import List, Set, Dict, Optional


@dataclass
class VitestViolation:
    """A violation of vitest best practices."""
    file_path: Path
    line_number: int
    violation_type: str
    message: str
    severity: str  # "error", "warning", "info"


@dataclass
class VitestAnalysisReport:
    """Report of vitest best practices analysis."""
    total_files: int
    total_violations: int
    violations: List[VitestViolation]
    files_analyzed: List[Path]
    
    def get_violations_by_severity(self, severity: str) -> List[VitestViolation]:
        """Get violations filtered by severity."""
        return [v for v in self.violations if v.severity == severity]


class VitestBestPracticesEnforcer:
    """Enforces vitest best practices in test files."""
    
    def __init__(self):
        self.violations: List[VitestViolation] = []
        
    def analyze_file(self, file_path: Path) -> List[VitestViolation]:
        """
        Analyze a single vitest file for best practices violations.
        
        Args:
            file_path: Path to the test file
            
        Returns:
            List of violations found
        """
        violations = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')
                
            # Check for various best practices
            violations.extend(self._check_test_naming(content, lines, file_path))
            violations.extend(self._check_describe_blocks(content, lines, file_path))
            violations.extend(self._check_testing_library_patterns(content, lines, file_path))
            violations.extend(self._check_async_patterns(content, lines, file_path))
            violations.extend(self._check_mock_patterns(content, lines, file_path))
            violations.extend(self._check_assertion_patterns(content, lines, file_path))
            violations.extend(self._check_setup_teardown(content, lines, file_path))
            
        except Exception as e:
            violations.append(VitestViolation(
                file_path=file_path,
                line_number=0,
                violation_type="parse_error",
                message=f"Failed to parse file: {str(e)}",
                severity="error"
            ))
            
        return violations
    
    def _check_test_naming(self, content: str, lines: List[str], file_path: Path) -> List[VitestViolation]:
        """Check for proper test naming conventions."""
        violations = []
        
        # Find test/it blocks
        test_pattern = re.compile(r"^\s*(test|it)\s*\(\s*['\"](.+?)['\"]")
        
        for line_num, line in enumerate(lines, 1):
            match = test_pattern.search(line)
            if match:
                test_name = match.group(2)
                
                # Check for descriptive names
                if len(test_name) < 10:
                    violations.append(VitestViolation(
                        file_path=file_path,
                        line_number=line_num,
                        violation_type="test_naming",
                        message=f"Test name '{test_name}' is too short. Use descriptive names.",
                        severity="warning"
                    ))
                
                # Check for generic names
                generic_patterns = ['test 1', 'test 2', 'basic test', 'simple test']
                if test_name.lower() in generic_patterns:
                    violations.append(VitestViolation(
                        file_path=file_path,
                        line_number=line_num,
                        violation_type="test_naming",
                        message=f"Test name '{test_name}' is too generic. Use descriptive names.",
                        severity="error"
                    ))
                
                # Check for proper behavior description (should/must/can)
                if not any(word in test_name.lower() for word in ['should', 'must', 'can', 'will', 'does']):
                    violations.append(VitestViolation(
                        file_path=file_path,
                        line_number=line_num,
                        violation_type="test_naming",
                        message=f"Test name '{test_name}' should describe behavior (use 'should', 'must', etc.)",
                        severity="info"
                    ))
        
        return violations
    
    def _check_describe_blocks(self, content: str, lines: List[str], file_path: Path) -> List[VitestViolation]:
        """Check for proper describe block organization."""
        violations = []
        
        # Find describe blocks
        describe_pattern = re.compile(r"^\s*describe\s*\(\s*['\"](.+?)['\"]")
        test_pattern = re.compile(r"^\s*(test|it)\s*\(")
        
        describe_count = 0
        test_count = 0
        in_describe = False
        
        for line_num, line in enumerate(lines, 1):
            if describe_pattern.search(line):
                describe_count += 1
                in_describe = True
            elif test_pattern.search(line):
                test_count += 1
        
        # If there are many tests but no describe blocks, suggest organization
        if test_count > 5 and describe_count == 0:
            violations.append(VitestViolation(
                file_path=file_path,
                line_number=0,
                violation_type="test_organization",
                message=f"File has {test_count} tests but no describe blocks. Consider organizing tests into describe blocks.",
                severity="info"
            ))
        
        return violations
    
    def _check_testing_library_patterns(self, content: str, lines: List[str], file_path: Path) -> List[VitestViolation]:
        """Check for proper testing-library patterns for React."""
        violations = []
        
        # Check if this is a React component test
        is_react_test = 'render(' in content or '@testing-library/react' in content
        
        if is_react_test:
            # Check for proper query usage
            bad_queries = ['getByTestId', 'queryByTestId', 'findByTestId']
            for line_num, line in enumerate(lines, 1):
                for bad_query in bad_queries:
                    if bad_query in line and 'data-testid' not in line:
                        violations.append(VitestViolation(
                            file_path=file_path,
                            line_number=line_num,
                            violation_type="testing_library_pattern",
                            message=f"Avoid using {bad_query}. Prefer getByRole, getByLabelText, or getByText for better accessibility.",
                            severity="warning"
                        ))
            
            # Check for waitFor usage
            if 'waitFor(' in content:
                # Check if waitFor has proper assertions
                waitfor_pattern = re.compile(r'waitFor\s*\(\s*\(\s*\)\s*=>\s*\{')
                for line_num, line in enumerate(lines, 1):
                    if waitfor_pattern.search(line):
                        # Check if there's an expect in the next few lines
                        has_expect = False
                        for i in range(line_num, min(line_num + 5, len(lines))):
                            if 'expect(' in lines[i]:
                                has_expect = True
                                break
                        
                        if not has_expect:
                            violations.append(VitestViolation(
                                file_path=file_path,
                                line_number=line_num,
                                violation_type="testing_library_pattern",
                                message="waitFor should contain assertions. Use waitFor(() => expect(...)).",
                                severity="warning"
                            ))
            
            # Check for proper cleanup
            if 'render(' in content and 'cleanup' not in content and 'afterEach' not in content:
                violations.append(VitestViolation(
                    file_path=file_path,
                    line_number=0,
                    violation_type="testing_library_pattern",
                    message="React tests should include cleanup. Import and use cleanup from @testing-library/react or use afterEach.",
                    severity="info"
                ))
        
        return violations
    
    def _check_async_patterns(self, content: str, lines: List[str], file_path: Path) -> List[VitestViolation]:
        """Check for proper async/await patterns."""
        violations = []
        
        # Check for async tests without await
        async_test_pattern = re.compile(r"^\s*(test|it)\s*\(\s*['\"].+?['\"]\s*,\s*async\s*\(")
        
        for line_num, line in enumerate(lines, 1):
            if async_test_pattern.search(line):
                # Check if there's an await in the test body
                # Look ahead in the next 20 lines
                has_await = False
                for i in range(line_num, min(line_num + 20, len(lines))):
                    if 'await' in lines[i]:
                        has_await = True
                        break
                    # Stop at next test/describe
                    if re.search(r'^\s*(test|it|describe)\s*\(', lines[i]) and i != line_num:
                        break
                
                if not has_await:
                    violations.append(VitestViolation(
                        file_path=file_path,
                        line_number=line_num,
                        violation_type="async_pattern",
                        message="Async test has no await statements. Remove async or add await.",
                        severity="warning"
                    ))
        
        return violations
    
    def _check_mock_patterns(self, content: str, lines: List[str], file_path: Path) -> List[VitestViolation]:
        """Check for proper mock patterns."""
        violations = []
        
        # Check for vi.fn() usage
        if 'vi.fn()' in content:
            # Check if mocks are cleared/reset
            if 'vi.clearAllMocks' not in content and 'vi.resetAllMocks' not in content and 'beforeEach' not in content:
                violations.append(VitestViolation(
                    file_path=file_path,
                    line_number=0,
                    violation_type="mock_pattern",
                    message="Tests using vi.fn() should clear mocks in beforeEach to avoid test interdependence.",
                    severity="warning"
                ))
        
        # Check for proper mock assertions
        mock_call_pattern = re.compile(r'\.toHaveBeenCalled\(\)')
        for line_num, line in enumerate(lines, 1):
            if mock_call_pattern.search(line):
                # Suggest more specific assertions
                violations.append(VitestViolation(
                    file_path=file_path,
                    line_number=line_num,
                    violation_type="mock_pattern",
                    message="Consider using toHaveBeenCalledWith() or toHaveBeenCalledTimes() for more specific assertions.",
                    severity="info"
                ))
        
        return violations
    
    def _check_assertion_patterns(self, content: str, lines: List[str], file_path: Path) -> List[VitestViolation]:
        """Check for proper assertion patterns."""
        violations = []
        
        # Find test blocks and check for assertions
        test_pattern = re.compile(r"^\s*(test|it)\s*\(")
        
        for line_num, line in enumerate(lines, 1):
            if test_pattern.search(line):
                # Check if there's an expect in the test body
                has_expect = False
                for i in range(line_num, min(line_num + 30, len(lines))):
                    if 'expect(' in lines[i]:
                        has_expect = True
                        break
                    # Stop at next test/describe
                    if re.search(r'^\s*(test|it|describe)\s*\(', lines[i]) and i != line_num:
                        break
                
                if not has_expect:
                    violations.append(VitestViolation(
                        file_path=file_path,
                        line_number=line_num,
                        violation_type="missing_assertion",
                        message="Test has no assertions (expect statements).",
                        severity="error"
                    ))
        
        # Check for toBeTruthy/toBeFalsy when more specific matchers exist
        for line_num, line in enumerate(lines, 1):
            if '.toBeTruthy()' in line or '.toBeFalsy()' in line:
                violations.append(VitestViolation(
                    file_path=file_path,
                    line_number=line_num,
                    violation_type="assertion_pattern",
                    message="Consider using more specific matchers like toBe(true), toBeDefined(), or toBeNull().",
                    severity="info"
                ))
        
        return violations
    
    def _check_setup_teardown(self, content: str, lines: List[str], file_path: Path) -> List[VitestViolation]:
        """Check for proper setup/teardown patterns."""
        violations = []
        
        # Check for beforeAll/afterAll without proper cleanup
        if 'beforeAll(' in content and 'afterAll(' not in content:
            violations.append(VitestViolation(
                file_path=file_path,
                line_number=0,
                violation_type="setup_teardown",
                message="Tests using beforeAll should have corresponding afterAll for cleanup.",
                severity="warning"
            ))
        
        # Check for nested beforeEach (can cause confusion)
        beforeeach_count = content.count('beforeEach(')
        if beforeeach_count > 3:
            violations.append(VitestViolation(
                file_path=file_path,
                line_number=0,
                violation_type="setup_teardown",
                message=f"File has {beforeeach_count} beforeEach blocks. Consider simplifying test setup.",
                severity="info"
            ))
        
        return violations
    
    def analyze_directory(self, directory: Path) -> VitestAnalysisReport:
        """
        Analyze all vitest files in a directory.
        
        Args:
            directory: Path to directory containing test files
            
        Returns:
            Analysis report with all violations
        """
        all_violations = []
        files_analyzed = []
        
        # Find all test files (.test.ts, .test.tsx, .spec.ts, .spec.tsx)
        test_patterns = ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx']
        test_files = []
        for pattern in test_patterns:
            test_files.extend(directory.rglob(pattern))
        
        # Remove duplicates
        test_files = list(set(test_files))
        
        for test_file in test_files:
            violations = self.analyze_file(test_file)
            all_violations.extend(violations)
            files_analyzed.append(test_file)
        
        return VitestAnalysisReport(
            total_files=len(files_analyzed),
            total_violations=len(all_violations),
            violations=all_violations,
            files_analyzed=files_analyzed
        )
