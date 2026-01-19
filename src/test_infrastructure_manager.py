"""
Test Infrastructure Manager

Discovers and validates test executability across the codebase.
Provides comprehensive reporting on test infrastructure health.

Requirements: 2.1, 2.5
"""

import ast
import importlib.util
import json
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Dict, Optional, Set
import re


@dataclass
class TestCase:
    """Represents a discovered test case."""
    name: str
    file_path: Path
    test_function: str
    dependencies: List[str] = field(default_factory=list)
    is_executable: bool = True
    blocking_issues: List[str] = field(default_factory=list)
    test_type: str = "unit"  # unit, property, integration, ui
    line_number: int = 0


@dataclass
class ExecutabilityReport:
    """Report on test executability status."""
    test_case: TestCase
    is_executable: bool
    missing_dependencies: List[str] = field(default_factory=list)
    import_errors: List[str] = field(default_factory=list)
    syntax_errors: List[str] = field(default_factory=list)
    configuration_issues: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)


@dataclass
class TestDiscoveryResult:
    """Results from test discovery process."""
    total_tests: int
    executable_tests: int
    broken_tests: int
    test_cases: List[TestCase]
    executability_reports: List[ExecutabilityReport]
    summary: Dict[str, any]


class TestInfrastructureManager:
    """
    Manages test infrastructure discovery and validation.
    
    Discovers all test cases in the codebase and validates their executability
    by checking dependencies, imports, and configuration.
    """
    
    def __init__(self, test_directory: Path = Path("tests")):
        """
        Initialize the test infrastructure manager.
        
        Args:
            test_directory: Root directory containing tests
        """
        self.test_directory = test_directory
        self.discovered_tests: List[TestCase] = []
        self.python_test_patterns = [
            r"^test_.*\.py$",  # Python test files
            r".*_test\.py$"     # Alternative Python test pattern
        ]
        self.typescript_test_patterns = [
            r".*\.test\.ts$",   # TypeScript test files
            r".*\.spec\.ts$",   # TypeScript spec files
            r".*\.e2e\.test\.ts$"  # E2E test files
        ]
    
    def discover_tests(self, test_directory: Optional[Path] = None) -> List[TestCase]:
        """
        Discovers all test cases in the specified directory.
        
        Args:
            test_directory: Directory to search for tests (defaults to self.test_directory)
            
        Returns:
            List of discovered TestCase objects
        """
        if test_directory is None:
            test_directory = self.test_directory
        
        if not test_directory.exists():
            raise FileNotFoundError(f"Test directory not found: {test_directory}")
        
        self.discovered_tests = []
        
        # Discover Python tests
        self._discover_python_tests(test_directory)
        
        # Discover TypeScript/JavaScript tests (UI tests)
        self._discover_typescript_tests(test_directory)
        
        return self.discovered_tests
    
    def _discover_python_tests(self, directory: Path) -> None:
        """Discovers Python test files and test functions."""
        for pattern in self.python_test_patterns:
            for test_file in directory.rglob("*.py"):
                if re.match(pattern, test_file.name):
                    self._extract_python_test_cases(test_file)
    
    def _discover_typescript_tests(self, directory: Path) -> None:
        """Discovers TypeScript/JavaScript test files and test functions."""
        for pattern in self.typescript_test_patterns:
            for test_file in directory.rglob("*.ts"):
                if re.match(pattern.replace(r"\.ts$", r"\.ts$"), test_file.name):
                    self._extract_typescript_test_cases(test_file)
    
    def _extract_python_test_cases(self, test_file: Path) -> None:
        """Extracts test cases from a Python test file."""
        try:
            with open(test_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Parse the Python file
            tree = ast.parse(content, filename=str(test_file))
            
            # Extract imports for dependency tracking
            dependencies = self._extract_python_dependencies(tree)
            
            # Determine test type based on path
            test_type = self._determine_test_type(test_file)
            
            # Find test functions and classes
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    if node.name.startswith('test_'):
                        test_case = TestCase(
                            name=f"{test_file.stem}::{node.name}",
                            file_path=test_file,
                            test_function=node.name,
                            dependencies=dependencies,
                            test_type=test_type,
                            line_number=node.lineno
                        )
                        self.discovered_tests.append(test_case)
                
                elif isinstance(node, ast.ClassDef):
                    if node.name.startswith('Test'):
                        # Extract test methods from test class
                        for item in node.body:
                            if isinstance(item, ast.FunctionDef) and item.name.startswith('test_'):
                                test_case = TestCase(
                                    name=f"{test_file.stem}::{node.name}::{item.name}",
                                    file_path=test_file,
                                    test_function=f"{node.name}.{item.name}",
                                    dependencies=dependencies,
                                    test_type=test_type,
                                    line_number=item.lineno
                                )
                                self.discovered_tests.append(test_case)
        
        except SyntaxError as e:
            # File has syntax errors - create a broken test case
            test_case = TestCase(
                name=f"{test_file.stem}::SYNTAX_ERROR",
                file_path=test_file,
                test_function="N/A",
                is_executable=False,
                blocking_issues=[f"Syntax error: {str(e)}"],
                test_type="unknown"
            )
            self.discovered_tests.append(test_case)
        
        except Exception as e:
            # Other parsing errors
            test_case = TestCase(
                name=f"{test_file.stem}::PARSE_ERROR",
                file_path=test_file,
                test_function="N/A",
                is_executable=False,
                blocking_issues=[f"Parse error: {str(e)}"],
                test_type="unknown"
            )
            self.discovered_tests.append(test_case)
    
    def _extract_typescript_test_cases(self, test_file: Path) -> None:
        """Extracts test cases from a TypeScript test file."""
        try:
            with open(test_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Extract dependencies (imports)
            dependencies = self._extract_typescript_dependencies(content)
            
            # Find describe blocks and test/it functions
            # Simple regex-based extraction (not a full parser)
            describe_pattern = r"describe\(['\"]([^'\"]+)['\"]"
            test_pattern = r"(?:it|test)\(['\"]([^'\"]+)['\"]"
            
            describes = re.findall(describe_pattern, content)
            tests = re.findall(test_pattern, content)
            
            # Create test cases
            if describes:
                for describe_name in describes:
                    for test_name in tests:
                        test_case = TestCase(
                            name=f"{test_file.stem}::{describe_name}::{test_name}",
                            file_path=test_file,
                            test_function=test_name,
                            dependencies=dependencies,
                            test_type="ui",
                            line_number=0  # Would need full parser for accurate line numbers
                        )
                        self.discovered_tests.append(test_case)
            else:
                # Tests without describe blocks
                for test_name in tests:
                    test_case = TestCase(
                        name=f"{test_file.stem}::{test_name}",
                        file_path=test_file,
                        test_function=test_name,
                        dependencies=dependencies,
                        test_type="ui",
                        line_number=0
                    )
                    self.discovered_tests.append(test_case)
        
        except Exception as e:
            # Parsing errors
            test_case = TestCase(
                name=f"{test_file.stem}::PARSE_ERROR",
                file_path=test_file,
                test_function="N/A",
                is_executable=False,
                blocking_issues=[f"Parse error: {str(e)}"],
                test_type="ui"
            )
            self.discovered_tests.append(test_case)
    
    def _extract_python_dependencies(self, tree: ast.AST) -> List[str]:
        """Extracts import dependencies from Python AST."""
        dependencies = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    dependencies.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    dependencies.append(node.module)
        
        return list(set(dependencies))  # Remove duplicates
    
    def _extract_typescript_dependencies(self, content: str) -> List[str]:
        """Extracts import dependencies from TypeScript content."""
        import_pattern = r"import\s+.*?\s+from\s+['\"]([^'\"]+)['\"]"
        imports = re.findall(import_pattern, content)
        return list(set(imports))
    
    def _determine_test_type(self, test_file: Path) -> str:
        """Determines the type of test based on file path."""
        path_str = str(test_file)
        
        if "unit" in path_str:
            return "unit"
        elif "property" in path_str:
            return "property"
        elif "integration" in path_str:
            return "integration"
        elif "llm" in path_str or ".test.ts" in path_str:
            return "ui"
        else:
            return "unit"  # Default
    
    def validate_executability(self, test_case: TestCase) -> ExecutabilityReport:
        """
        Checks if a test can be executed and reports issues.
        
        Args:
            test_case: The test case to validate
            
        Returns:
            ExecutabilityReport with validation results
        """
        report = ExecutabilityReport(
            test_case=test_case,
            is_executable=True
        )
        
        # Check if file exists
        if not test_case.file_path.exists():
            report.is_executable = False
            report.configuration_issues.append(f"Test file not found: {test_case.file_path}")
            return report
        
        # Check for existing blocking issues
        if test_case.blocking_issues:
            report.is_executable = False
            report.syntax_errors.extend(test_case.blocking_issues)
            return report
        
        # Validate based on test type
        if test_case.test_type == "ui":
            self._validate_typescript_test(test_case, report)
        else:
            self._validate_python_test(test_case, report)
        
        # Update test case executability
        test_case.is_executable = report.is_executable
        test_case.blocking_issues = (
            report.missing_dependencies +
            report.import_errors +
            report.syntax_errors +
            report.configuration_issues
        )
        
        return report
    
    def _validate_python_test(self, test_case: TestCase, report: ExecutabilityReport) -> None:
        """Validates a Python test case."""
        # Check Python dependencies
        missing_deps = []
        for dep in test_case.dependencies:
            # Skip relative imports and standard library
            if dep.startswith('.') or dep in sys.stdlib_module_names:
                continue
            
            # Try to import the module
            try:
                spec = importlib.util.find_spec(dep.split('.')[0])
                if spec is None:
                    missing_deps.append(dep)
            except (ImportError, ModuleNotFoundError, ValueError):
                missing_deps.append(dep)
        
        if missing_deps:
            report.is_executable = False
            report.missing_dependencies = missing_deps
            report.recommendations.append(
                f"Install missing dependencies: pip install {' '.join(missing_deps)}"
            )
        
        # Try to import the test file itself
        try:
            # Read the file to check for syntax errors
            with open(test_case.file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Try to compile it
            compile(content, str(test_case.file_path), 'exec')
        
        except SyntaxError as e:
            report.is_executable = False
            report.syntax_errors.append(f"Syntax error at line {e.lineno}: {e.msg}")
            report.recommendations.append("Fix syntax errors in the test file")
        
        except Exception as e:
            report.is_executable = False
            report.import_errors.append(f"Import error: {str(e)}")
            report.recommendations.append("Check import statements and dependencies")
    
    def _validate_typescript_test(self, test_case: TestCase, report: ExecutabilityReport) -> None:
        """Validates a TypeScript test case."""
        # Check if Node.js and npm are available
        try:
            subprocess.run(
                ["node", "--version"],
                capture_output=True,
                check=True,
                timeout=5
            )
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            report.is_executable = False
            report.configuration_issues.append("Node.js not found or not accessible")
            report.recommendations.append("Install Node.js to run TypeScript tests")
            return
        
        # Check if package.json exists
        package_json = test_case.file_path.parent.parent / "package.json"
        if not package_json.exists():
            # Try root package.json
            package_json = Path("package.json")
        
        if not package_json.exists():
            report.is_executable = False
            report.configuration_issues.append("package.json not found")
            report.recommendations.append("Create package.json with test dependencies")
            return
        
        # Check for common TypeScript test dependencies
        try:
            with open(package_json, 'r', encoding='utf-8') as f:
                package_data = json.load(f)
            
            dev_deps = package_data.get('devDependencies', {})
            deps = package_data.get('dependencies', {})
            all_deps = {**deps, **dev_deps}
            
            required_deps = ['jest', 'typescript', '@types/jest']
            missing_ts_deps = [dep for dep in required_deps if dep not in all_deps]
            
            if missing_ts_deps:
                report.is_executable = False
                report.missing_dependencies = missing_ts_deps
                report.recommendations.append(
                    f"Install missing TypeScript test dependencies: npm install --save-dev {' '.join(missing_ts_deps)}"
                )
        
        except json.JSONDecodeError:
            report.is_executable = False
            report.configuration_issues.append("Invalid package.json format")
            report.recommendations.append("Fix package.json syntax errors")
        
        except Exception as e:
            report.configuration_issues.append(f"Error reading package.json: {str(e)}")
    
    def generate_discovery_report(self) -> TestDiscoveryResult:
        """
        Generates a comprehensive report on discovered tests.
        
        Returns:
            TestDiscoveryResult with complete discovery and validation data
        """
        if not self.discovered_tests:
            self.discover_tests()
        
        # Validate all tests
        executability_reports = []
        for test_case in self.discovered_tests:
            report = self.validate_executability(test_case)
            executability_reports.append(report)
        
        # Calculate statistics
        total_tests = len(self.discovered_tests)
        executable_tests = sum(1 for tc in self.discovered_tests if tc.is_executable)
        broken_tests = total_tests - executable_tests
        
        # Group by test type
        test_types = {}
        for tc in self.discovered_tests:
            test_types[tc.test_type] = test_types.get(tc.test_type, 0) + 1
        
        # Calculate executability percentage
        executability_percentage = (executable_tests / total_tests * 100) if total_tests > 0 else 0
        
        summary = {
            "total_tests": total_tests,
            "executable_tests": executable_tests,
            "broken_tests": broken_tests,
            "executability_percentage": round(executability_percentage, 2),
            "tests_by_type": test_types,
            "meets_95_percent_threshold": executability_percentage >= 95.0
        }
        
        return TestDiscoveryResult(
            total_tests=total_tests,
            executable_tests=executable_tests,
            broken_tests=broken_tests,
            test_cases=self.discovered_tests,
            executability_reports=executability_reports,
            summary=summary
        )
    
    def print_report(self, result: TestDiscoveryResult) -> None:
        """Prints a formatted test discovery report."""
        print("\n" + "=" * 80)
        print("TEST INFRASTRUCTURE DISCOVERY REPORT")
        print("=" * 80)
        print(f"\nTotal Tests Discovered: {result.total_tests}")
        print(f"Executable Tests: {result.executable_tests}")
        print(f"Broken Tests: {result.broken_tests}")
        print(f"Executability: {result.summary['executability_percentage']}%")
        print(f"Meets 95% Threshold: {'✓ YES' if result.summary['meets_95_percent_threshold'] else '✗ NO'}")
        
        print(f"\nTests by Type:")
        for test_type, count in result.summary['tests_by_type'].items():
            print(f"  {test_type}: {count}")
        
        # Show broken tests
        if result.broken_tests > 0:
            print(f"\n{'=' * 80}")
            print("BROKEN TESTS")
            print("=" * 80)
            
            for report in result.executability_reports:
                if not report.is_executable:
                    print(f"\n✗ {report.test_case.name}")
                    print(f"  File: {report.test_case.file_path}")
                    
                    if report.missing_dependencies:
                        print(f"  Missing Dependencies: {', '.join(report.missing_dependencies)}")
                    
                    if report.import_errors:
                        print(f"  Import Errors:")
                        for error in report.import_errors:
                            print(f"    - {error}")
                    
                    if report.syntax_errors:
                        print(f"  Syntax Errors:")
                        for error in report.syntax_errors:
                            print(f"    - {error}")
                    
                    if report.configuration_issues:
                        print(f"  Configuration Issues:")
                        for issue in report.configuration_issues:
                            print(f"    - {issue}")
                    
                    if report.recommendations:
                        print(f"  Recommendations:")
                        for rec in report.recommendations:
                            print(f"    → {rec}")
        
        print("\n" + "=" * 80)
