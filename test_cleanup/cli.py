"""
Command-line interface for test cleanup tool.

This module provides the CLI entry point for the test cleanup tool,
integrating all phases of the cleanup pipeline.
"""

import argparse
import json
import sys
from pathlib import Path

from test_cleanup.orchestrator import CleanupOrchestrator


def main():
    """Main entry point for the CLI."""
    parser = argparse.ArgumentParser(
        description="Test Suite Cleanup and Optimization Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run full cleanup pipeline
  test-cleanup run --dir tests/

  # Run with dry-run mode (no actual changes)
  test-cleanup run --dir tests/ --dry-run

  # Run only analysis phase
  test-cleanup analyze --dir tests/

  # Run cleanup with custom output directory
  test-cleanup run --dir tests/ --output cleanup_results/

  # Rollback changes
  test-cleanup rollback --dir tests/
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Run command (full pipeline)
    run_parser = subparsers.add_parser(
        "run", help="Run complete cleanup pipeline"
    )
    run_parser.add_argument(
        "--dir", required=True, help="Directory containing tests"
    )
    run_parser.add_argument(
        "--output", help="Output directory for results (default: <dir>/cleanup_output)"
    )
    run_parser.add_argument(
        "--backup", help="Backup directory (default: <dir>/cleanup_backup)"
    )
    run_parser.add_argument(
        "--dry-run", action="store_true", help="Preview changes without applying them"
    )
    run_parser.add_argument(
        "--skip-analysis", action="store_true", help="Skip analysis phase"
    )
    run_parser.add_argument(
        "--skip-cleanup", action="store_true", help="Skip cleanup phase"
    )
    run_parser.add_argument(
        "--skip-validation", action="store_true", help="Skip validation phase"
    )
    run_parser.add_argument(
        "--skip-documentation", action="store_true", help="Skip documentation phase"
    )
    
    # Analyze command
    analyze_parser = subparsers.add_parser(
        "analyze", help="Analyze test suite for issues"
    )
    analyze_parser.add_argument(
        "--dir", required=True, help="Directory containing tests"
    )
    analyze_parser.add_argument(
        "--output", help="Output directory for results (default: <dir>/cleanup_output)"
    )
    
    # Cleanup command
    cleanup_parser = subparsers.add_parser(
        "cleanup", help="Clean up problematic tests"
    )
    cleanup_parser.add_argument(
        "--dir", required=True, help="Directory containing tests"
    )
    cleanup_parser.add_argument(
        "--output", help="Output directory for results (default: <dir>/cleanup_output)"
    )
    cleanup_parser.add_argument(
        "--backup", help="Backup directory (default: <dir>/cleanup_backup)"
    )
    cleanup_parser.add_argument(
        "--dry-run", action="store_true", help="Preview changes without applying them"
    )
    
    # Validate command
    validate_parser = subparsers.add_parser(
        "validate", help="Validate cleaned test suite"
    )
    validate_parser.add_argument(
        "--dir", required=True, help="Directory containing tests"
    )
    validate_parser.add_argument(
        "--output", help="Output directory for results (default: <dir>/cleanup_output)"
    )
    
    # Document command
    document_parser = subparsers.add_parser(
        "document", help="Generate testing documentation"
    )
    document_parser.add_argument(
        "--dir", required=True, help="Directory containing tests"
    )
    document_parser.add_argument(
        "--output", help="Output directory for documentation (default: <dir>/cleanup_output)"
    )
    
    # Rollback command
    rollback_parser = subparsers.add_parser(
        "rollback", help="Rollback changes from backup"
    )
    rollback_parser.add_argument(
        "--dir", required=True, help="Directory containing tests"
    )
    rollback_parser.add_argument(
        "--backup", help="Backup directory (default: <dir>/cleanup_backup)"
    )
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 0
    
    # Execute command
    try:
        if args.command == "run":
            return run_full_pipeline(args)
        elif args.command == "analyze":
            return run_analyze(args)
        elif args.command == "cleanup":
            return run_cleanup(args)
        elif args.command == "validate":
            return run_validate(args)
        elif args.command == "document":
            return run_document(args)
        elif args.command == "rollback":
            return run_rollback(args)
        else:
            parser.print_help()
            return 1
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


def run_full_pipeline(args) -> int:
    """Run the complete cleanup pipeline."""
    orchestrator = CleanupOrchestrator(
        test_dir=Path(args.dir),
        output_dir=Path(args.output) if args.output else None,
        backup_dir=Path(args.backup) if args.backup else None,
        dry_run=args.dry_run,
    )
    
    print("=" * 60)
    print("Test Suite Cleanup Pipeline")
    print("=" * 60)
    print(f"Test directory: {args.dir}")
    print(f"Output directory: {orchestrator.output_dir}")
    print(f"Backup directory: {orchestrator.backup_dir}")
    print(f"Dry run: {args.dry_run}")
    print("=" * 60)
    
    results = orchestrator.run_full_pipeline(
        skip_analysis=args.skip_analysis,
        skip_cleanup=args.skip_cleanup,
        skip_validation=args.skip_validation,
        skip_documentation=args.skip_documentation,
    )
    
    # Print summary
    print("\n" + "=" * 60)
    print("Pipeline Summary")
    print("=" * 60)
    
    if results["success"]:
        print("✓ Pipeline completed successfully")
        
        for phase, result in results["phases"].items():
            print(f"\n{phase.capitalize()}:")
            if "summary" in result:
                for key, value in result["summary"].items():
                    print(f"  {key}: {value}")
    else:
        print("✗ Pipeline failed")
        for error in results["errors"]:
            print(f"  - {error}")
        return 1
    
    # Save full results
    results_file = orchestrator.output_dir / "pipeline_results.json"
    with open(results_file, "w") as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\nFull results saved to: {results_file}")
    
    return 0 if results["success"] else 1


def run_analyze(args) -> int:
    """Run only the analysis phase."""
    orchestrator = CleanupOrchestrator(
        test_dir=Path(args.dir),
        output_dir=Path(args.output) if args.output else None,
    )
    
    print("Running analysis...")
    result = orchestrator.run_analysis()
    
    if result["success"]:
        print("\n✓ Analysis completed successfully")
        print(f"Report: {result['report_path']}")
        
        if "summary" in result:
            print("\nSummary:")
            for key, value in result["summary"].items():
                print(f"  {key}: {value}")
        return 0
    else:
        print(f"\n✗ Analysis failed: {result.get('error', 'Unknown error')}")
        return 1


def run_cleanup(args) -> int:
    """Run only the cleanup phase."""
    orchestrator = CleanupOrchestrator(
        test_dir=Path(args.dir),
        output_dir=Path(args.output) if args.output else None,
        backup_dir=Path(args.backup) if args.backup else None,
        dry_run=args.dry_run,
    )
    
    # Need to run analysis first
    print("Running analysis...")
    analysis_result = orchestrator.run_analysis()
    
    if not analysis_result["success"]:
        print(f"✗ Analysis failed: {analysis_result.get('error', 'Unknown error')}")
        return 1
    
    print("\nRunning cleanup...")
    result = orchestrator.run_cleanup()
    
    if result["success"]:
        print("\n✓ Cleanup completed successfully")
        print(f"Log: {result['log_path']}")
        
        if "summary" in result:
            print("\nSummary:")
            for key, value in result["summary"].items():
                print(f"  {key}: {value}")
        return 0
    else:
        print(f"\n✗ Cleanup failed: {result.get('error', 'Unknown error')}")
        return 1


def run_validate(args) -> int:
    """Run only the validation phase."""
    orchestrator = CleanupOrchestrator(
        test_dir=Path(args.dir),
        output_dir=Path(args.output) if args.output else None,
    )
    
    print("Running validation...")
    result = orchestrator.run_validation()
    
    if result["success"]:
        print("\n✓ Validation passed")
        print(f"Report: {result['report_path']}")
        
        if "summary" in result:
            print("\nSummary:")
            for key, value in result["summary"].items():
                print(f"  {key}: {value}")
        return 0
    else:
        print(f"\n✗ Validation failed")
        if "error" in result:
            print(f"Error: {result['error']}")
        elif "summary" in result:
            print("Issues found:")
            for key, value in result["summary"].items():
                print(f"  {key}: {value}")
        return 1


def run_document(args) -> int:
    """Run only the documentation phase."""
    orchestrator = CleanupOrchestrator(
        test_dir=Path(args.dir),
        output_dir=Path(args.output) if args.output else None,
    )
    
    print("Generating documentation...")
    result = orchestrator.run_documentation()
    
    if result["success"]:
        print("\n✓ Documentation generated successfully")
        print(f"Documentation directory: {result['documentation_dir']}")
        
        if "files" in result:
            print("\nGenerated files:")
            for name, path in result["files"].items():
                print(f"  {name}: {path}")
        return 0
    else:
        print(f"\n✗ Documentation generation failed: {result.get('error', 'Unknown error')}")
        return 1


def run_rollback(args) -> int:
    """Rollback changes from backup."""
    orchestrator = CleanupOrchestrator(
        test_dir=Path(args.dir),
        backup_dir=Path(args.backup) if args.backup else None,
    )
    
    print(f"Rolling back changes from: {orchestrator.backup_dir}")
    
    if orchestrator.rollback():
        print("✓ Rollback completed successfully")
        return 0
    else:
        print("✗ Rollback failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
