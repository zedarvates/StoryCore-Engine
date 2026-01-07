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
  storycore grid                     # Generate 3x3 grid in current directory
  storycore grid --project path     # Generate grid in specific project
  storycore promote                  # Upscale panels in current directory
  storycore promote --project path  # Upscale panels in specific project
  storycore qa                       # Run QA scoring on current directory
  storycore qa --project path       # Run QA scoring on specific project
  storycore export                   # Export current directory with QA
  storycore export --project path   # Export specific project with QA
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
    
    # QA command
    qa_parser = subparsers.add_parser("qa", help="Run QA scoring on project")
    qa_parser.add_argument("--project", default=".", help="Project directory to score (default: current directory)")
    
    # Grid command
    grid_parser = subparsers.add_parser("grid", help="Generate grid and slice into panels")
    grid_parser.add_argument("--project", default=".", help="Project directory (default: current directory)")
    grid_parser.add_argument("--grid", default="3x3", help="Grid dimensions: 3x3, 1x2, or 1x4 (default: 3x3)")
    grid_parser.add_argument("--out", default=None, help="Output grid filename (default: grid_<spec>.ppm)")
    grid_parser.add_argument("--cell-size", type=int, default=256, help="Size of each grid cell in pixels (default: 256)")
    
    # Promote command
    promote_parser = subparsers.add_parser("promote", help="Upscale panels to promoted directory")
    promote_parser.add_argument("--project", default=".", help="Project directory (default: current directory)")
    promote_parser.add_argument("--scale", type=int, default=2, help="Scale factor for upscaling (default: 2)")
    promote_parser.add_argument("--method", default="lanczos", choices=["lanczos", "bicubic"], help="Resampling method (default: lanczos)")
    
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
        elif args.command == "qa":
            handle_qa(args)
        elif args.command == "grid":
            handle_grid(args)
        elif args.command == "promote":
            handle_promote(args)
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


def handle_qa(args):
    """Handle QA command."""
    from qa_engine import QAEngine
    
    qa_engine = QAEngine()
    project_path = Path(args.project)
    
    if not project_path.exists():
        print(f"✗ Project directory not found: {project_path}")
        sys.exit(1)
    
    print(f"Running QA scoring on: {project_path.absolute()}")
    
    try:
        qa_report = qa_engine.run_qa_scoring(str(project_path))
        
        # Print results
        print(f"\nQA Scoring Results:")
        print(f"Overall Score: {qa_report['overall_score']:.1f}/5.0")
        print(f"Status: {'PASSED' if qa_report['passed'] else 'FAILED'}")
        
        if qa_report.get("categories"):
            print("\nCategory Scores:")
            for category, score in qa_report["categories"].items():
                status = "✓" if score >= 3.0 else "✗"
                print(f"  {status} {category.replace('_', ' ').title()}: {score:.1f}/5.0")
        
        if qa_report.get("issues"):
            print(f"\nIssues Found: {len(qa_report['issues'])}")
            for issue in qa_report["issues"]:
                print(f"  - {issue['description']}")
                print(f"    Fix: {issue['suggested_fix']}")
        
        if not qa_report["passed"]:
            sys.exit(1)
            
    except Exception as e:
        print(f"✗ QA scoring error: {e}")
        sys.exit(1)


def handle_grid(args):
    """Handle grid command."""
    from grid_generator import GridGenerator
    
    generator = GridGenerator()
    project_path = Path(args.project)
    
    if not project_path.exists():
        print(f"✗ Project directory not found: {project_path}")
        sys.exit(1)
    
    # Validate grid specification
    if args.grid not in ["3x3", "1x2", "1x4"]:
        print(f"✗ Unsupported grid specification: {args.grid}")
        print("  Supported: 3x3, 1x2, 1x4")
        sys.exit(1)
    
    print(f"Generating {args.grid} grid for project: {project_path.absolute()}")
    print(f"Cell size: {args.cell_size}px")
    
    # Show cell dimensions for non-square grids
    if args.grid in ["1x2", "1x4"]:
        cell_width = round(args.cell_size * 16 / 9)
        print(f"Cell dimensions: {cell_width}x{args.cell_size}px (16:9 aspect)")
    
    try:
        grid_path = generator.generate_grid(
            str(project_path), 
            args.grid,
            args.out, 
            args.cell_size
        )
        
        # Calculate number of panels
        cols, rows = map(int, args.grid.split('x'))
        total_panels = cols * rows
        
        print(f"✓ Grid generated successfully")
        print(f"  Grid: {grid_path}")
        print(f"  Panels: assets/images/panels/panel_01.ppm ... panel_{total_panels:02d}.ppm")
        print(f"  Updated project.json asset manifest")
        
    except Exception as e:
        print(f"✗ Grid generation error: {e}")
        sys.exit(1)


def handle_promote(args):
    """Handle promote command."""
    from promotion_engine import promote_panels, update_project_manifest
    
    project_path = Path(args.project)
    
    if not project_path.exists():
        print(f"✗ Project directory not found: {project_path}")
        sys.exit(1)
    
    print(f"Promoting panels in project: {project_path.absolute()}")
    print(f"Scale factor: {args.scale}x")
    print(f"Method: {args.method}")
    
    try:
        result = promote_panels(project_path, args.scale, args.method)
        
        print(f"✓ Promoted {result['metadata']['total_panels']} panels successfully")
        
        # Show resolution changes
        for i, (original, promoted) in enumerate(result['resolutions'], 1):
            print(f"  Panel {i:02d}: {original[0]}x{original[1]} → {promoted[0]}x{promoted[1]}")
        
        print(f"  Output directory: {result['output_dir']}")
        
        # Update project manifest
        update_project_manifest(project_path, result['metadata'])
        print(f"  Updated project.json asset manifest")
        print(f"  Project status: promoted")
        
    except Exception as e:
        print(f"✗ Promotion error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
