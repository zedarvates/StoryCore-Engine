"""
Pytest best practices enforcement.

This module analyzes pytest test files and enforces best practices including:
- Proper fixture usage
- Pytest-specific patterns
- Test organization
"""

import ast
from dataclasses import dataclass
from pathlib import Path
from typing import List, Set, Dict, Optional


@dataclass
class PytestViolation:
    """A violation of pytest best practices."""
    file_path: Path
    line_number: int
    violation_type: str
    message: str
    severity: str  # "error", "warning", "info"


@dataclass
class PytestAnalysisReport:
    """Report of pytest best practices analysis."""
    total_files: int
    total_violations: int
    violations: List[PytestViolation]
    files_analyzed: List[Path]
    
    def get_violations_by_severity(self, severity: str) -> List[PytestViolation]:
        """Get violations filtered by severity."""
        return [v for v in self.violations if v.severity == severity]


class PytestBestPracticesEnforcer:
    """Enforces pytest best practices in test files."""
    
    def __init__(self):
        self.violations: List[PytestViolation] = []
        
    def analyze_file(self, file_path: Path) -> List[PytestViolation]:
        """
        Analyze a single pytest file for best practices violations.
        
        Args:
            file_path: Path to the test file
            
        Returns:
            List of violations found
        """
        violations = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                tree = ast.parse(content, filename=str(file_path))
                
            # Check for various best practices
            violations.extend(self._check_fixture_usage(tree, file_path))
            violations.extend(self._check_test_naming(tree, file_path))
            violations.extend(self._check_assertion_patterns(tree, file_path))
            violations.extend(self._check_test_organization(tree, file_path))
            violations.extend(self._check_parametrize_usage(tree, file_path))
            violations.extend(self._check_setup_teardown(tree, file_path))
            
        except Exception as e:
            violations.append(PytestViolation(
                file_path=file_path,
                line_number=0,
                violation_type="parse_error",
                message=f"Failed to parse file: {str(e)}",
                severity="error"
            ))
            
        return violations
    
    def _check_fixture_usage(self, tree: ast.AST, file_path: Path) -> List[PytestViolation]:
        """Check for proper fixture usage."""
        violations = []
        
        # Find all function definitions
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                # Check if function has @pytest.fixture decorator
                has_fixture_decorator = any(
                    isinstance(dec, ast.Name) and dec.id == 'fixture' or
                    isinstance(dec, ast.Attribute) and dec.attr == 'fixture'
                    for dec in node.decorator_list
                )
                
                # Check for setup/teardown patterns that should use fixtures
                if node.name.startswith('test_'):
                    # Look for repeated setup code
                    setup_patterns = self._find_setup_patterns(node)
                    if len(setup_patterns) > 3:
                        violations.append(PytestViolation(
                            file_path=file_path,
                            line_number=node.lineno,
                            violation_type="fixture_opportunity",
                            message=f"Test '{node.name}' has repeated setup code that could be extracted to a fixture",
                            severity="warning"
                        ))
                
                # Check for fixture scope issues
                if has_fixture_decorator:
                    # Check if fixture has proper scope
                    scope_specified = any(
                        isinstance(dec, ast.Call) and
                        any(kw.arg == 'scope' for kw in dec.keywords)
                        for dec in node.decorator_list
                    )
                    
                    # If fixture creates expensive resources, suggest scope
                    if self._creates_expensive_resource(node) and not scope_specified:
                        violations.append(PytestViolation(
                            file_path=file_path,
                            line_number=node.lineno,
                            violation_type="fixture_scope",
                            message=f"Fixture '{node.name}' creates expensive resources but doesn't specify scope",
                            severity="info"
                        ))
        
        return violations
    
    def _check_test_naming(self, tree: ast.AST, file_path: Path) -> List[PytestViolation]:
        """Check for proper test naming conventions."""
        violations = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                if node.name.startswith('test_'):
                    # Check for generic names first (higher severity)
                    generic_names = ['test_1', 'test_2', 'test_basic', 'test_simple']
                    if node.name in generic_names:
                        violations.append(PytestViolation(
                            file_path=file_path,
                            line_number=node.lineno,
                            violation_type="test_naming",
                            message=f"Test name '{node.name}' is too generic. Use descriptive names.",
                            severity="error"
                        ))
                    # Check for descriptive names (only if not generic)
                    elif len(node.name) < 10:
                        violations.append(PytestViolation(
                            file_path=file_path,
                            line_number=node.lineno,
                            violation_type="test_naming",
                            message=f"Test name '{node.name}' is too short. Use descriptive names.",
                            severity="warning"
                        ))
        
        return violations
    
    def _check_assertion_patterns(self, tree: ast.AST, file_path: Path) -> List[PytestViolation]:
        """Check for proper assertion patterns."""
        violations = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and node.name.startswith('test_'):
                # Check for assert statements
                has_assertions = False
                has_bare_assert = False
                
                for child in ast.walk(node):
                    if isinstance(child, ast.Assert):
                        has_assertions = True
                        # Check for bare assert True/False
                        if isinstance(child.test, ast.Constant):
                            if child.test.value in (True, False):
                                has_bare_assert = True
                
                if not has_assertions:
                    violations.append(PytestViolation(
                        file_path=file_path,
                        line_number=node.lineno,
                        violation_type="missing_assertion",
                        message=f"Test '{node.name}' has no assertions",
                        severity="error"
                    ))
                
                if has_bare_assert:
                    violations.append(PytestViolation(
                        file_path=file_path,
                        line_number=node.lineno,
                        violation_type="bare_assert",
                        message=f"Test '{node.name}' uses bare assert True/False",
                        severity="warning"
                    ))
        
        return violations
    
    def _check_test_organization(self, tree: ast.AST, file_path: Path) -> List[PytestViolation]:
        """Check for proper test organization."""
        violations = []
        
        # Check for test classes
        test_classes = []
        standalone_tests = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef) and node.name.startswith('Test'):
                test_classes.append(node)
            elif isinstance(node, ast.FunctionDef) and node.name.startswith('test_'):
                # Check if it's not inside a class
                standalone_tests.append(node)
        
        # If there are many standalone tests, suggest organizing into classes
        if len(standalone_tests) > 10:
            violations.append(PytestViolation(
                file_path=file_path,
                line_number=0,
                violation_type="test_organization",
                message=f"File has {len(standalone_tests)} standalone tests. Consider organizing into test classes.",
                severity="info"
            ))
        
        # Check test class naming
        for cls in test_classes:
            if not cls.name.startswith('Test'):
                violations.append(PytestViolation(
                    file_path=file_path,
                    line_number=cls.lineno,
                    violation_type="class_naming",
                    message=f"Test class '{cls.name}' should start with 'Test'",
                    severity="error"
                ))
        
        return violations
    
    def _check_parametrize_usage(self, tree: ast.AST, file_path: Path) -> List[PytestViolation]:
        """Check for opportunities to use @pytest.mark.parametrize."""
        violations = []
        
        # Look for similar test functions that could be parametrized
        test_functions = []
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and node.name.startswith('test_'):
                test_functions.append(node)
        
        # Group tests by similar names (e.g., test_foo_1, test_foo_2)
        similar_groups: Dict[str, List[ast.FunctionDef]] = {}
        for func in test_functions:
            # Extract base name (remove trailing numbers/suffixes)
            base_name = func.name.rstrip('0123456789_')
            if base_name not in similar_groups:
                similar_groups[base_name] = []
            similar_groups[base_name].append(func)
        
        # Check for groups that could be parametrized
        for base_name, funcs in similar_groups.items():
            if len(funcs) >= 3:
                violations.append(PytestViolation(
                    file_path=file_path,
                    line_number=funcs[0].lineno,
                    violation_type="parametrize_opportunity",
                    message=f"Found {len(funcs)} similar tests starting with '{base_name}'. Consider using @pytest.mark.parametrize.",
                    severity="info"
                ))
        
        return violations
    
    def _check_setup_teardown(self, tree: ast.AST, file_path: Path) -> List[PytestViolation]:
        """Check for old-style setup/teardown methods."""
        violations = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                # Check for old-style setup/teardown
                old_style_methods = ['setup', 'teardown', 'setup_method', 'teardown_method']
                if node.name in old_style_methods:
                    violations.append(PytestViolation(
                        file_path=file_path,
                        line_number=node.lineno,
                        violation_type="old_style_setup",
                        message=f"Method '{node.name}' uses old-style setup/teardown. Consider using fixtures instead.",
                        severity="warning"
                    ))
        
        return violations
    
    def _find_setup_patterns(self, node: ast.FunctionDef) -> List[str]:
        """Find repeated setup patterns in a test function."""
        patterns = []
        
        for child in ast.walk(node):
            if isinstance(child, ast.Assign):
                # Look for variable assignments that might be setup
                for target in child.targets:
                    if isinstance(target, ast.Name):
                        patterns.append(target.id)
        
        return patterns
    
    def _creates_expensive_resource(self, node: ast.FunctionDef) -> bool:
        """Check if a fixture creates expensive resources."""
        expensive_keywords = ['database', 'db', 'connection', 'client', 'session', 'engine']
        
        # Check function name
        func_name_lower = node.name.lower()
        if any(keyword in func_name_lower for keyword in expensive_keywords):
            return True
        
        # Check for expensive operations in body
        for child in ast.walk(node):
            if isinstance(child, ast.Call):
                if isinstance(child.func, ast.Name):
                    call_name_lower = child.func.id.lower()
                    if any(keyword in call_name_lower for keyword in expensive_keywords):
                        return True
        
        return False
    
    def analyze_directory(self, directory: Path) -> PytestAnalysisReport:
        """
        Analyze all pytest files in a directory.
        
        Args:
            directory: Path to directory containing test files
            
        Returns:
            Analysis report with all violations
        """
        all_violations = []
        files_analyzed = []
        
        # Find all test files
        test_files = list(directory.rglob("test_*.py"))
        
        for test_file in test_files:
            violations = self.analyze_file(test_file)
            all_violations.extend(violations)
            files_analyzed.append(test_file)
        
        return PytestAnalysisReport(
            total_files=len(files_analyzed),
            total_violations=len(all_violations),
            violations=all_violations,
            files_analyzed=files_analyzed
        )
