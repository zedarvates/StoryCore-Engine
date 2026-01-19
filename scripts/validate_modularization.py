#!/usr/bin/env python3
"""
Validation script for modular CLI architecture.

This script validates that the modularization is correct by checking:
- Module size constraints (<300 lines)
- Handler registration
- Import structure
- Test coverage
- Documentation completeness

Requirements: 10.2, 10.5
"""

import sys
import ast
import importlib.util
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import argparse
import json


class ValidationResult:
    """Result of a validation check."""
    
    def __init__(self, name: str, passed: bool, message: str, details: Optional[Dict] = None):
        self.name = name
        self.passed = passed
        self.message = message
        self.details = details or {}


class ModularizationValidator:
    """Validator for modular CLI architecture."""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.cli_dir = project_root / 'src' / 'cli'
        self.handlers_dir = self.cli_dir / 'handlers'
        self.utils_dir = self.cli_dir / 'utils'
        self.tests_dir = project_root / 'tests'
        self.results: List[ValidationResult] = []
    
    def validate_all(self) -> bool:
        """Run all validation checks."""
        print("="*70)
        print("MODULARIZATION VALIDATION")
        print("="*70)
        
        # Check directory structure
        self.validate_directory_structure()
        
        # Check module sizes
        self.validate_module_sizes()
        
        # Check handler registration
        self.validate_handler_registration()
        
        # Check imports
        self.validate_imports()
        
        # Check documentation
        self.validate_documentation()
        
        # Check test coverage
        self.validate_test_structure()
        
        # Print results
        self.print_results()
        
        # Return overall pass/fail
        return all(r.passed for r in self.results)
    
    def validate_directory_structure(self):
        """Validate that required directories exist."""
        required_dirs = [
            self.cli_dir,
            self.handlers_dir,
            self.utils_dir,
        ]
        
        missing_dirs = [d for d in required_dirs if not d.exists()]
        
        if missing_dirs:
            self.results.append(ValidationResult(
                "Directory Structure",
                False,
                f"Missing required directories: {', '.join(str(d) for d in missing_dirs)}"
            ))
        else:
            self.results.append(ValidationResult(
                "Directory Structure",
                True,
                "All required directories exist"
            ))
    
    def validate_module_sizes(self):
        """Validate that modules are under 300 lines."""
        max_lines = 300
        oversized_modules = []
        
        # Check all Python files in CLI directory
        for py_file in self.cli_dir.rglob('*.py'):
            if '__pycache__' in str(py_file):
                continue
            
            try:
                lines = py_file.read_text(encoding='utf-8').splitlines()
                # Count non-empty, non-comment lines
                code_lines = [l for l in lines if l.strip() and not l.strip().startswith('#')]
                line_count = len(code_lines)
                
                if line_count > max_lines:
                    oversized_modules.append((py_file.relative_to(self.project_root), line_count))
            except Exception as e:
                print(f"Warning: Could not read {py_file}: {e}")
        
        if oversized_modules:
            details = {str(path): count for path, count in oversized_modules}
            self.results.append(ValidationResult(
                "Module Size Constraint",
                False,
                f"Found {len(oversized_modules)} modules exceeding {max_lines} lines",
                details
            ))
        else:
            self.results.append(ValidationResult(
                "Module Size Constraint",
                True,
                f"All modules are under {max_lines} lines"
            ))
    
    def validate_handler_registration(self):
        """Validate that all handlers are properly registered."""
        # Find all handler files
        handler_files = list(self.handlers_dir.glob('*.py'))
        handler_files = [f for f in handler_files if f.name != '__init__.py']
        
        # Check each handler has required attributes
        invalid_handlers = []
        
        for handler_file in handler_files:
            try:
                # Parse the file to check for required attributes
                content = handler_file.read_text(encoding='utf-8')
                tree = ast.parse(content)
                
                # Look for class definitions
                has_handler_class = False
                has_command_name = False
                has_description = False
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.ClassDef):
                        # Check if it's a handler class (inherits from BaseHandler)
                        for base in node.bases:
                            if isinstance(base, ast.Name) and base.id == 'BaseHandler':
                                has_handler_class = True
                                
                                # Check for required attributes
                                for item in node.body:
                                    if isinstance(item, ast.Assign):
                                        for target in item.targets:
                                            if isinstance(target, ast.Name):
                                                if target.id == 'command_name':
                                                    has_command_name = True
                                                elif target.id == 'description':
                                                    has_description = True
                
                if has_handler_class and not (has_command_name and has_description):
                    invalid_handlers.append(handler_file.name)
            
            except Exception as e:
                print(f"Warning: Could not parse {handler_file}: {e}")
        
        if invalid_handlers:
            self.results.append(ValidationResult(
                "Handler Registration",
                False,
                f"Found {len(invalid_handlers)} handlers missing required attributes",
                {"invalid_handlers": invalid_handlers}
            ))
        else:
            self.results.append(ValidationResult(
                "Handler Registration",
                True,
                f"All {len(handler_files)} handlers properly configured"
            ))
    
    def validate_imports(self):
        """Validate that imports follow modular structure."""
        # Check that no files import from old monolithic structure
        problematic_imports = []
        
        for py_file in self.project_root.rglob('*.py'):
            if '__pycache__' in str(py_file) or '.venv' in str(py_file):
                continue
            
            try:
                content = py_file.read_text(encoding='utf-8')
                
                # Check for old-style imports
                if 'from storycore_cli import' in content and 'src.storycore_cli' not in content:
                    problematic_imports.append(str(py_file.relative_to(self.project_root)))
            
            except Exception as e:
                print(f"Warning: Could not read {py_file}: {e}")
        
        if problematic_imports:
            self.results.append(ValidationResult(
                "Import Structure",
                False,
                f"Found {len(problematic_imports)} files with old-style imports",
                {"files": problematic_imports}
            ))
        else:
            self.results.append(ValidationResult(
                "Import Structure",
                True,
                "All imports follow modular structure"
            ))
    
    def validate_documentation(self):
        """Validate that documentation exists for handlers."""
        undocumented_handlers = []
        
        for handler_file in self.handlers_dir.glob('*.py'):
            if handler_file.name == '__init__.py':
                continue
            
            try:
                content = handler_file.read_text(encoding='utf-8')
                tree = ast.parse(content)
                
                # Check for module docstring
                has_module_doc = ast.get_docstring(tree) is not None
                
                # Check for class docstrings
                has_class_doc = False
                for node in ast.walk(tree):
                    if isinstance(node, ast.ClassDef):
                        if ast.get_docstring(node):
                            has_class_doc = True
                            break
                
                if not (has_module_doc or has_class_doc):
                    undocumented_handlers.append(handler_file.name)
            
            except Exception as e:
                print(f"Warning: Could not parse {handler_file}: {e}")
        
        if undocumented_handlers:
            self.results.append(ValidationResult(
                "Documentation",
                False,
                f"Found {len(undocumented_handlers)} handlers without documentation",
                {"undocumented": undocumented_handlers}
            ))
        else:
            self.results.append(ValidationResult(
                "Documentation",
                True,
                "All handlers have documentation"
            ))
    
    def validate_test_structure(self):
        """Validate that test structure matches code structure."""
        # Check for test directories
        unit_tests = self.tests_dir / 'unit'
        integration_tests = self.tests_dir / 'integration'
        
        missing_test_dirs = []
        if not unit_tests.exists():
            missing_test_dirs.append('tests/unit')
        if not integration_tests.exists():
            missing_test_dirs.append('tests/integration')
        
        if missing_test_dirs:
            self.results.append(ValidationResult(
                "Test Structure",
                False,
                f"Missing test directories: {', '.join(missing_test_dirs)}"
            ))
        else:
            # Check that handlers have corresponding tests
            handler_files = [f.stem for f in self.handlers_dir.glob('*.py') if f.name != '__init__.py']
            test_files = [f.stem.replace('test_', '').replace('_handler', '') 
                         for f in (unit_tests / 'handlers').glob('test_*.py')] if (unit_tests / 'handlers').exists() else []
            
            missing_tests = [h for h in handler_files if h not in test_files]
            
            if missing_tests:
                self.results.append(ValidationResult(
                    "Test Structure",
                    False,
                    f"Found {len(missing_tests)} handlers without unit tests",
                    {"missing_tests": missing_tests}
                ))
            else:
                self.results.append(ValidationResult(
                    "Test Structure",
                    True,
                    "Test structure is complete"
                ))
    
    def print_results(self):
        """Print validation results."""
        print("\n" + "="*70)
        print("VALIDATION RESULTS")
        print("="*70)
        
        passed_count = sum(1 for r in self.results if r.passed)
        total_count = len(self.results)
        
        for result in self.results:
            status = "✓ PASS" if result.passed else "✗ FAIL"
            print(f"\n{status}: {result.name}")
            print(f"  {result.message}")
            
            if result.details:
                print("  Details:")
                for key, value in result.details.items():
                    if isinstance(value, list):
                        print(f"    {key}:")
                        for item in value[:5]:  # Show first 5 items
                            print(f"      - {item}")
                        if len(value) > 5:
                            print(f"      ... and {len(value) - 5} more")
                    else:
                        print(f"    {key}: {value}")
        
        print("\n" + "="*70)
        print(f"SUMMARY: {passed_count}/{total_count} checks passed")
        print("="*70)
    
    def export_report(self, output_file: Path):
        """Export validation report to JSON."""
        report = {
            "summary": {
                "total_checks": len(self.results),
                "passed": sum(1 for r in self.results if r.passed),
                "failed": sum(1 for r in self.results if not r.passed)
            },
            "results": [
                {
                    "name": r.name,
                    "passed": r.passed,
                    "message": r.message,
                    "details": r.details
                }
                for r in self.results
            ]
        }
        
        output_file.write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(f"\nReport exported to: {output_file}")


def main():
    """Main validation script entry point."""
    parser = argparse.ArgumentParser(
        description='Validate modular CLI architecture',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        '--dir',
        type=Path,
        default=Path.cwd(),
        help='Project root directory (default: current directory)'
    )
    
    parser.add_argument(
        '--export',
        type=Path,
        help='Export validation report to JSON file'
    )
    
    args = parser.parse_args()
    
    # Validate directory
    if not args.dir.exists():
        print(f"Error: Directory {args.dir} does not exist", file=sys.stderr)
        return 1
    
    # Run validation
    validator = ModularizationValidator(args.dir)
    all_passed = validator.validate_all()
    
    # Export report if requested
    if args.export:
        validator.export_report(args.export)
    
    # Return appropriate exit code
    return 0 if all_passed else 1


if __name__ == '__main__':
    sys.exit(main())
