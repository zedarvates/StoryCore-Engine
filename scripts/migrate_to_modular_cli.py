#!/usr/bin/env python3
"""
Migration script for transitioning to modular CLI architecture.

This script helps migrate existing code that imports from the monolithic
storycore_cli.py to use the new modular CLI structure.

Requirements: 10.2, 10.5
"""

import re
import sys
from pathlib import Path
from typing import List, Tuple, Dict
import argparse


# Mapping of old imports to new modular imports
IMPORT_MAPPINGS = {
    # Old monolithic imports -> New modular imports
    r'from\s+storycore_cli\s+import\s+(.+)': 'from src.cli import \\1',
    r'import\s+storycore_cli': 'from src import storycore_cli',
    
    # Handler-specific imports
    r'from\s+storycore_cli\s+import\s+InitHandler': 'from src.cli.handlers.init import InitHandler',
    r'from\s+storycore_cli\s+import\s+GridHandler': 'from src.cli.handlers.grid import GridHandler',
    r'from\s+storycore_cli\s+import\s+PromoteHandler': 'from src.cli.handlers.promote import PromoteHandler',
    r'from\s+storycore_cli\s+import\s+QAHandler': 'from src.cli.handlers.qa import QAHandler',
    r'from\s+storycore_cli\s+import\s+ExportHandler': 'from src.cli.handlers.export import ExportHandler',
    
    # Utility imports
    r'from\s+storycore_cli\s+import\s+load_project': 'from src.cli.utils.project import load_project_config',
    r'from\s+storycore_cli\s+import\s+validate_project': 'from src.cli.utils.project import validate_project_structure',
    
    # Error handling imports
    r'from\s+storycore_cli\s+import\s+CLIError': 'from src.cli.errors import CLIError',
    r'from\s+storycore_cli\s+import\s+UserError': 'from src.cli.errors import UserError',
    r'from\s+storycore_cli\s+import\s+SystemError': 'from src.cli.errors import SystemError',
}


class MigrationReport:
    """Track migration changes and issues."""
    
    def __init__(self):
        self.files_processed = 0
        self.files_modified = 0
        self.changes_made: List[Tuple[str, str, str]] = []  # (file, old, new)
        self.warnings: List[Tuple[str, str]] = []  # (file, warning)
        self.errors: List[Tuple[str, str]] = []  # (file, error)
    
    def add_change(self, file_path: str, old_import: str, new_import: str):
        """Record a successful import migration."""
        self.changes_made.append((file_path, old_import, new_import))
    
    def add_warning(self, file_path: str, message: str):
        """Record a warning during migration."""
        self.warnings.append((file_path, message))
    
    def add_error(self, file_path: str, message: str):
        """Record an error during migration."""
        self.errors.append((file_path, message))
    
    def print_summary(self):
        """Print migration summary."""
        print("\n" + "="*70)
        print("MIGRATION SUMMARY")
        print("="*70)
        print(f"Files processed: {self.files_processed}")
        print(f"Files modified: {self.files_modified}")
        print(f"Changes made: {len(self.changes_made)}")
        print(f"Warnings: {len(self.warnings)}")
        print(f"Errors: {len(self.errors)}")
        
        if self.changes_made:
            print("\n" + "-"*70)
            print("CHANGES MADE:")
            print("-"*70)
            for file_path, old, new in self.changes_made:
                print(f"\n{file_path}:")
                print(f"  - {old}")
                print(f"  + {new}")
        
        if self.warnings:
            print("\n" + "-"*70)
            print("WARNINGS:")
            print("-"*70)
            for file_path, warning in self.warnings:
                print(f"{file_path}: {warning}")
        
        if self.errors:
            print("\n" + "-"*70)
            print("ERRORS:")
            print("-"*70)
            for file_path, error in self.errors:
                print(f"{file_path}: {error}")
        
        print("\n" + "="*70)


def migrate_file(file_path: Path, dry_run: bool = False) -> Tuple[bool, List[str]]:
    """
    Migrate imports in a single file.
    
    Args:
        file_path: Path to the file to migrate
        dry_run: If True, don't write changes, just report them
    
    Returns:
        Tuple of (was_modified, list_of_changes)
    """
    try:
        content = file_path.read_text(encoding='utf-8')
        original_content = content
        changes = []
        
        # Apply each import mapping
        for old_pattern, new_pattern in IMPORT_MAPPINGS.items():
            matches = re.finditer(old_pattern, content)
            for match in matches:
                old_import = match.group(0)
                new_import = re.sub(old_pattern, new_pattern, old_import)
                content = content.replace(old_import, new_import)
                changes.append(f"{old_import} -> {new_import}")
        
        # Write changes if not dry run and content changed
        if content != original_content:
            if not dry_run:
                file_path.write_text(content, encoding='utf-8')
            return True, changes
        
        return False, []
        
    except Exception as e:
        raise Exception(f"Error processing {file_path}: {e}")


def find_python_files(root_dir: Path, exclude_patterns: List[str]) -> List[Path]:
    """
    Find all Python files in directory tree.
    
    Args:
        root_dir: Root directory to search
        exclude_patterns: List of patterns to exclude (e.g., '__pycache__', 'venv')
    
    Returns:
        List of Python file paths
    """
    python_files = []
    
    for path in root_dir.rglob('*.py'):
        # Check if path should be excluded
        should_exclude = False
        for pattern in exclude_patterns:
            if pattern in str(path):
                should_exclude = True
                break
        
        if not should_exclude:
            python_files.append(path)
    
    return python_files


def migrate_project(
    project_dir: Path,
    dry_run: bool = False,
    exclude_patterns: List[str] = None
) -> MigrationReport:
    """
    Migrate all Python files in a project.
    
    Args:
        project_dir: Root directory of the project
        dry_run: If True, don't write changes, just report them
        exclude_patterns: Patterns to exclude from migration
    
    Returns:
        MigrationReport with summary of changes
    """
    if exclude_patterns is None:
        exclude_patterns = ['__pycache__', '.venv', 'venv', 'node_modules', '.git']
    
    report = MigrationReport()
    
    # Find all Python files
    python_files = find_python_files(project_dir, exclude_patterns)
    
    print(f"Found {len(python_files)} Python files to process...")
    
    # Process each file
    for file_path in python_files:
        report.files_processed += 1
        
        try:
            was_modified, changes = migrate_file(file_path, dry_run)
            
            if was_modified:
                report.files_modified += 1
                for change in changes:
                    report.add_change(str(file_path.relative_to(project_dir)), *change.split(' -> '))
                
                if dry_run:
                    print(f"Would modify: {file_path.relative_to(project_dir)}")
                else:
                    print(f"Modified: {file_path.relative_to(project_dir)}")
        
        except Exception as e:
            report.add_error(str(file_path.relative_to(project_dir)), str(e))
    
    return report


def main():
    """Main migration script entry point."""
    parser = argparse.ArgumentParser(
        description='Migrate code to use modular CLI architecture',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run to see what would change
  python migrate_to_modular_cli.py --dry-run
  
  # Migrate specific directory
  python migrate_to_modular_cli.py --dir ./my_project
  
  # Migrate with custom exclusions
  python migrate_to_modular_cli.py --exclude tests --exclude docs
        """
    )
    
    parser.add_argument(
        '--dir',
        type=Path,
        default=Path.cwd(),
        help='Project directory to migrate (default: current directory)'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be changed without modifying files'
    )
    
    parser.add_argument(
        '--exclude',
        action='append',
        default=[],
        help='Additional patterns to exclude (can be specified multiple times)'
    )
    
    args = parser.parse_args()
    
    # Validate directory
    if not args.dir.exists():
        print(f"Error: Directory {args.dir} does not exist", file=sys.stderr)
        return 1
    
    if not args.dir.is_dir():
        print(f"Error: {args.dir} is not a directory", file=sys.stderr)
        return 1
    
    # Run migration
    print(f"Migrating project: {args.dir}")
    if args.dry_run:
        print("DRY RUN MODE - No files will be modified")
    
    default_excludes = ['__pycache__', '.venv', 'venv', 'node_modules', '.git']
    exclude_patterns = default_excludes + args.exclude
    
    report = migrate_project(args.dir, args.dry_run, exclude_patterns)
    report.print_summary()
    
    # Return appropriate exit code
    if report.errors:
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
