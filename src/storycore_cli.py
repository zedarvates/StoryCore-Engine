#!/usr/bin/env python3
"""
StoryCore-Engine CLI - MVP Bootstrap
Main CLI entry point with init, validate, and export commands.
"""

import argparse
import sys
from pathlib import Path


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="StoryCore-Engine CLI - MVP Bootstrap",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  storycore init my-project          # Initialize new project
  storycore validate                 # Validate current directory
  storycore validate --project path # Validate specific project
  storycore export                   # Export current directory
  storycore export --project path   # Export specific project
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Init command
    init_parser = subparsers.add_parser("init", help="Initialize a new StoryCore-Engine project")
    init_parser.add_argument("project_name", help="Name of the project to create")
    init_parser.add_argument("--path", default=".", help="Base path for project creation (default: current directory)")
    
    # Validate command
    validate_parser = subparsers.add_parser("validate", help="Validate project JSON files")
    validate_parser.add_argument("--project", default=".", help="Project directory to validate (default: current directory)")
    
    # Export command
    export_parser = subparsers.add_parser("export", help="Export project to timestamped snapshot")
    export_parser.add_argument("--project", default=".", help="Project directory to export (default: current directory)")
    export_parser.add_argument("--output", default="exports", help="Export base directory (default: exports)")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    try:
        if args.command == "init":
            handle_init(args)
        elif args.command == "validate":
            handle_validate(args)
        elif args.command == "export":
            handle_export(args)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


def handle_init(args):
    """Handle init command."""
    from project_manager import ProjectManager
    
    pm = ProjectManager()
    pm.init_project(args.project_name, args.path)
    
    project_path = Path(args.path) / args.project_name
    print(f"✓ Project '{args.project_name}' initialized successfully")
    print(f"  Location: {project_path.absolute()}")
    print(f"  Files created:")
    print(f"    - project.json")
    print(f"    - storyboard.json")
    print(f"    - assets/images/")
    print(f"    - assets/audio/")


def handle_validate(args):
    """Handle validate command."""
    from validator import Validator, ValidationError
    
    validator = Validator()
    project_path = Path(args.project)
    
    print(f"Validating project in: {project_path.absolute()}")
    
    try:
        results = validator.validate_project_directory(str(project_path))
        
        all_passed = True
        for filename, result in results.items():
            if result is True:
                print(f"✓ {filename}: PASSED")
            else:
                print(f"✗ {filename}: {result}")
                all_passed = False
        
        if all_passed:
            print("\n✓ All validations passed!")
        else:
            print("\n✗ Some validations failed")
            sys.exit(1)
            
    except Exception as e:
        print(f"✗ Validation error: {e}")
        sys.exit(1)


def handle_export(args):
    """Handle export command."""
    from exporter import Exporter
    
    exporter = Exporter()
    project_path = Path(args.project)
    
    if not project_path.exists():
        print(f"✗ Project directory not found: {project_path}")
        sys.exit(1)
    
    print(f"Exporting project from: {project_path.absolute()}")
    
    try:
        export_dir = exporter.export_project(str(project_path), args.output)
        print(f"✓ Project exported successfully")
        print(f"  Export location: {Path(export_dir).absolute()}")
        print(f"  Files exported:")
        
        # List exported files
        export_path = Path(export_dir)
        for file in export_path.iterdir():
            if file.is_file():
                print(f"    - {file.name}")
                
    except Exception as e:
        print(f"✗ Export error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
