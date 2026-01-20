"""
Roadmap command handler - Generate, update, and validate public roadmap.
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List

from ..base import BaseHandler
from ..errors import UserError, SystemError


class RoadmapHandler(BaseHandler):
    """Handler for roadmap commands - generate, update, and validate public roadmap."""

    command_name = "roadmap"
    description = "Generate, update, and validate the public roadmap from internal specs"

    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up roadmap command arguments."""
        # Create subparsers for roadmap subcommands
        subparsers = parser.add_subparsers(
            dest="roadmap_command",
            help="Roadmap subcommands",
            required=True
        )

        # Generate subcommand
        generate_parser = subparsers.add_parser(
            "generate",
            help="Generate the public roadmap from internal specs"
        )
        self._setup_generate_parser(generate_parser)

        # Update subcommand
        update_parser = subparsers.add_parser(
            "update",
            help="Update the roadmap to reflect spec changes"
        )
        self._setup_update_parser(update_parser)

        # Validate subcommand
        validate_parser = subparsers.add_parser(
            "validate",
            help="Validate roadmap consistency with specs"
        )
        self._setup_validate_parser(validate_parser)

    def _setup_generate_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up generate subcommand arguments."""
        parser.add_argument(
            "--config",
            type=Path,
            help="Path to config file (default: .kiro/roadmap-config.yaml)"
        )

        parser.add_argument(
            "--specs-dir",
            type=Path,
            help="Path to specs directory (overrides config)"
        )

        parser.add_argument(
            "--output",
            type=Path,
            help="Output path for roadmap file (overrides config)"
        )

        parser.add_argument(
            "--changelog",
            type=Path,
            help="Output path for changelog file (overrides config)"
        )

        parser.add_argument(
            "--max-description-length",
            type=int,
            help="Maximum length for feature descriptions (overrides config)"
        )

        parser.add_argument(
            "--no-future",
            action="store_true",
            help="Exclude future considerations section"
        )

        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview changes without modifying files"
        )

        parser.add_argument(
            "--no-badges",
            action="store_true",
            help="Skip injecting badges into spec files"
        )

        parser.add_argument(
            "--format",
            choices=["human", "json"],
            default="human",
            help="Output format for progress (default: human)"
        )

    def _setup_update_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up update subcommand arguments."""
        parser.add_argument(
            "--config",
            type=Path,
            help="Path to config file (default: .kiro/roadmap-config.yaml)"
        )

        parser.add_argument(
            "--specs-dir",
            type=Path,
            help="Path to specs directory (overrides config)"
        )

        parser.add_argument(
            "--output",
            type=Path,
            help="Path to roadmap file (overrides config)"
        )

        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview changes without modifying files"
        )

        parser.add_argument(
            "--force",
            action="store_true",
            help="Force full regeneration instead of incremental update"
        )

        parser.add_argument(
            "--format",
            choices=["human", "json"],
            default="human",
            help="Output format for progress (default: human)"
        )

    def _setup_validate_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up validate subcommand arguments."""
        parser.add_argument(
            "--config",
            type=Path,
            help="Path to config file (default: .kiro/roadmap-config.yaml)"
        )

        parser.add_argument(
            "--specs-dir",
            type=Path,
            help="Path to specs directory (overrides config)"
        )

        parser.add_argument(
            "--roadmap",
            type=Path,
            help="Path to roadmap file (overrides config)"
        )

        parser.add_argument(
            "--check-links",
            action="store_true",
            default=True,
            help="Validate all links (default: enabled)"
        )

        parser.add_argument(
            "--check-badges",
            action="store_true",
            default=True,
            help="Validate spec badges (default: enabled)"
        )

        parser.add_argument(
            "--format",
            choices=["human", "json"],
            default="human",
            help="Output format (default: human)"
        )

        parser.add_argument(
            "--fix",
            action="store_true",
            help="Attempt to fix validation issues automatically"
        )

    def execute(self, args: argparse.Namespace) -> int:
        """Execute the roadmap command."""
        try:
            # Route to appropriate subcommand handler
            if args.roadmap_command == "generate":
                return self._execute_generate(args)
            elif args.roadmap_command == "update":
                return self._execute_update(args)
            elif args.roadmap_command == "validate":
                return self._execute_validate(args)
            else:
                raise UserError(
                    f"Unknown roadmap subcommand: {args.roadmap_command}",
                    "Use 'roadmap generate', 'roadmap update', or 'roadmap validate'"
                )

        except Exception as e:
            return self.handle_error(e, "roadmap")

    def _execute_generate(self, args: argparse.Namespace) -> int:
        """Execute the generate subcommand."""
        try:
            # Import roadmap components
            from roadmap.roadmap_generator import RoadmapGenerator
            from roadmap.config_loader import ConfigLoader

            # Build CLI overrides dictionary
            cli_overrides = {}
            if args.specs_dir:
                cli_overrides["specs_directory"] = str(args.specs_dir)
            if args.output:
                cli_overrides["output_path"] = str(args.output)
            if args.changelog:
                cli_overrides["changelog_path"] = str(args.changelog)
            if args.max_description_length:
                cli_overrides["max_description_length"] = args.max_description_length
            if args.no_future:
                cli_overrides["include_future"] = False

            # Load configuration with CLI overrides
            config = ConfigLoader.load_config(
                config_path=args.config,
                cli_overrides=cli_overrides
            )

            # Validate specs directory exists
            if not config.specs_directory.exists():
                raise UserError(
                    f"Specs directory not found: {config.specs_directory}",
                    "Create specs directory or specify correct path with --specs-dir"
                )

            # Initialize progress tracking
            start_time = datetime.now()
            stats = {
                "specs_scanned": 0,
                "features_processed": 0,
                "links_validated": 0,
                "badges_injected": 0,
                "warnings": [],
                "errors": []
            }

            # Print header
            if args.format == "human":
                print("=" * 70)
                print("StoryCore-Engine Roadmap Generator")
                print("=" * 70)
                print(f"Specs directory: {config.specs_directory}")
                print(f"Output file: {config.output_path}")
                print(f"Changelog file: {config.changelog_path}")
                if args.config:
                    print(f"Config file: {args.config}")
                if args.dry_run:
                    print("Mode: DRY RUN (no files will be modified)")
                print()

            # Dry run mode
            if args.dry_run:
                return self._execute_dry_run(args, config, stats)

            # Generate roadmap
            if args.format == "human":
                print("Generating roadmap...")
                print()

            generator = RoadmapGenerator(config)
            
            # Capture statistics during generation
            # Note: This is a simplified version - full implementation would
            # need hooks into the generator to capture detailed statistics
            generator.generate()

            # Calculate duration
            duration = (datetime.now() - start_time).total_seconds()

            # Print summary
            if args.format == "human":
                print()
                print("=" * 70)
                print("Generation Complete!")
                print("=" * 70)
                print(f"Duration: {duration:.2f} seconds")
                print()
                print("Generated files:")
                print(f"  ✓ {config.output_path}")
                print(f"  ✓ {config.changelog_path}")
                print()
                
                if not args.no_badges:
                    print("Badges injected into spec files")
                
                print()
                print("Next steps:")
                print("  1. Review the generated ROADMAP.md")
                print("  2. Commit changes to version control")
                print("  3. Run 'roadmap validate' to check for issues")
                print()
            elif args.format == "json":
                result = {
                    "success": True,
                    "duration_seconds": duration,
                    "files_generated": [str(config.output_path), str(config.changelog_path)],
                    "statistics": stats
                }
                print(json.dumps(result, indent=2))

            return 0

        except ImportError as e:
            raise SystemError(
                f"Roadmap module not available: {e}",
                "Ensure roadmap module is installed in src/roadmap/"
            )
        except Exception as e:
            if args.format == "json":
                error_result = {
                    "success": False,
                    "error": str(e),
                    "error_type": type(e).__name__
                }
                print(json.dumps(error_result, indent=2))
            raise

    def _execute_update(self, args: argparse.Namespace) -> int:
        """Execute the update subcommand."""
        try:
            # Import roadmap components
            from roadmap.synchronization_engine import SynchronizationEngine
            from roadmap.config_loader import ConfigLoader

            # Build CLI overrides dictionary
            cli_overrides = {}
            if args.specs_dir:
                cli_overrides["specs_directory"] = str(args.specs_dir)
            if args.output:
                cli_overrides["output_path"] = str(args.output)

            # Load configuration with CLI overrides
            config = ConfigLoader.load_config(
                config_path=args.config,
                cli_overrides=cli_overrides
            )

            # Validate specs directory exists
            if not config.specs_directory.exists():
                raise UserError(
                    f"Specs directory not found: {config.specs_directory}",
                    "Create specs directory or specify correct path with --specs-dir"
                )

            # Validate roadmap exists (unless force regeneration)
            if not args.force and not config.output_path.exists():
                raise UserError(
                    f"Roadmap file not found: {config.output_path}",
                    "Run 'roadmap generate' first or use --force for full regeneration"
                )

            # Initialize progress tracking
            start_time = datetime.now()

            # Print header
            if args.format == "human":
                print("=" * 70)
                print("StoryCore-Engine Roadmap Update")
                print("=" * 70)
                print(f"Specs directory: {config.specs_directory}")
                print(f"Roadmap file: {config.output_path}")
                if args.config:
                    print(f"Config file: {args.config}")
                if args.dry_run:
                    print("Mode: DRY RUN (no files will be modified)")
                if args.force:
                    print("Mode: FORCE (full regeneration)")
                print()

            # Initialize synchronization engine
            sync_engine = SynchronizationEngine(config)

            # Detect changes
            if args.format == "human":
                print("Detecting changes...")
            
            changes = sync_engine.detect_changes()
            
            created_count = len(changes.get('created', []))
            modified_count = len(changes.get('modified', []))
            deleted_count = len(changes.get('deleted', []))
            total_changes = created_count + modified_count + deleted_count

            # Print change summary
            if args.format == "human":
                print(f"  Created: {created_count} spec(s)")
                print(f"  Modified: {modified_count} spec(s)")
                print(f"  Deleted: {deleted_count} spec(s)")
                print()

                if total_changes == 0:
                    print("No changes detected. Roadmap is up to date.")
                    return 0

            # Dry run mode
            if args.dry_run:
                if args.format == "human":
                    print("Changes that would be applied:")
                    for spec in changes.get('created', []):
                        print(f"  + {spec.directory.name}")
                    for spec in changes.get('modified', []):
                        print(f"  ~ {spec.directory.name}")
                    for spec in changes.get('deleted', []):
                        print(f"  - {spec.directory.name}")
                    print()
                    print("Run without --dry-run to apply changes")
                elif args.format == "json":
                    result = {
                        "dry_run": True,
                        "changes": {
                            "created": [str(s.directory.name) for s in changes.get('created', [])],
                            "modified": [str(s.directory.name) for s in changes.get('modified', [])],
                            "deleted": [str(s.directory.name) for s in changes.get('deleted', [])]
                        }
                    }
                    print(json.dumps(result, indent=2))
                return 0

            # Update roadmap
            if args.format == "human":
                print("Updating roadmap...")
            
            if args.force:
                # Force full regeneration
                sync_engine.update_roadmap(changes=None)
            else:
                # Incremental update
                sync_engine.update_roadmap(changes=changes)

            # Calculate duration
            duration = (datetime.now() - start_time).total_seconds()

            # Print summary
            if args.format == "human":
                print()
                print("=" * 70)
                print("Update Complete!")
                print("=" * 70)
                print(f"Duration: {duration:.2f} seconds")
                print(f"Changes applied: {total_changes}")
                print()
                print(f"Updated file: {config.output_path}")
                print()
            elif args.format == "json":
                result = {
                    "success": True,
                    "duration_seconds": duration,
                    "changes_applied": total_changes,
                    "changes": {
                        "created": created_count,
                        "modified": modified_count,
                        "deleted": deleted_count
                    }
                }
                print(json.dumps(result, indent=2))

            return 0

        except ImportError as e:
            raise SystemError(
                f"Roadmap module not available: {e}",
                "Ensure roadmap module is installed in src/roadmap/"
            )
        except Exception as e:
            if args.format == "json":
                error_result = {
                    "success": False,
                    "error": str(e),
                    "error_type": type(e).__name__
                }
                print(json.dumps(error_result, indent=2))
            raise

    def _execute_validate(self, args: argparse.Namespace) -> int:
        """Execute the validate subcommand."""
        try:
            # Import roadmap components
            from roadmap.link_validator import LinkValidator
            from roadmap.spec_scanner import SpecScanner
            from roadmap.config_loader import ConfigLoader

            # Build CLI overrides dictionary
            cli_overrides = {}
            if args.specs_dir:
                cli_overrides["specs_directory"] = str(args.specs_dir)
            if args.roadmap:
                cli_overrides["output_path"] = str(args.roadmap)

            # Load configuration with CLI overrides
            config = ConfigLoader.load_config(
                config_path=args.config,
                cli_overrides=cli_overrides
            )

            # Validate roadmap exists
            if not config.output_path.exists():
                raise UserError(
                    f"Roadmap file not found: {config.output_path}",
                    "Run 'roadmap generate' first"
                )

            # Validate specs directory exists
            if not config.specs_directory.exists():
                raise UserError(
                    f"Specs directory not found: {config.specs_directory}",
                    "Create specs directory or specify correct path with --specs-dir"
                )

            # Initialize validation results
            validation_results = {
                "roadmap_file": str(config.output_path),
                "specs_directory": str(config.specs_directory),
                "checks_performed": [],
                "broken_links": [],
                "missing_badges": [],
                "warnings": [],
                "passed": True
            }

            # Print header
            if args.format == "human":
                print("=" * 70)
                print("StoryCore-Engine Roadmap Validation")
                print("=" * 70)
                print(f"Roadmap file: {config.output_path}")
                print(f"Specs directory: {config.specs_directory}")
                if args.config:
                    print(f"Config file: {args.config}")
                print()

            # Initialize validator
            validator = LinkValidator(config.output_path)
            scanner = SpecScanner(config.specs_directory)

            # Check links
            if args.check_links:
                if args.format == "human":
                    print("Validating links...")
                
                validation_results["checks_performed"].append("links")
                
                # Read roadmap content
                roadmap_content = config.output_path.read_text(encoding='utf-8')
                
                # Validate spec links
                broken_links = validator.validate_spec_links(roadmap_content)
                
                if broken_links:
                    validation_results["passed"] = False
                    validation_results["broken_links"] = [
                        {
                            "line": link.line_number,
                            "text": link.link_text,
                            "target": link.target_path,
                            "reason": link.reason
                        }
                        for link in broken_links
                    ]
                    
                    if args.format == "human":
                        print(f"  ✗ Found {len(broken_links)} broken link(s)")
                        for link in broken_links:
                            print(f"    Line {link.line_number}: {link.target_path}")
                            print(f"      Reason: {link.reason}")
                else:
                    if args.format == "human":
                        print("  ✓ All links are valid")

            # Check badges
            if args.check_badges:
                if args.format == "human":
                    print("Validating badges...")
                
                validation_results["checks_performed"].append("badges")
                
                # Scan specs
                spec_files_list = scanner.scan_specs_directory()
                spec_dirs = [sf.directory for sf in spec_files_list]
                
                # Validate badges
                missing_badges = validator.validate_roadmap_badges(spec_dirs)
                
                if missing_badges:
                    validation_results["warnings"].append(
                        f"{len(missing_badges)} spec(s) missing roadmap badges"
                    )
                    validation_results["missing_badges"] = [
                        {
                            "spec": str(badge.spec_dir.name),
                            "reason": badge.reason
                        }
                        for badge in missing_badges
                    ]
                    
                    if args.format == "human":
                        print(f"  ⚠ Found {len(missing_badges)} spec(s) without badges")
                        for badge in missing_badges[:5]:  # Show first 5
                            print(f"    {badge.spec_dir.name}: {badge.reason}")
                        if len(missing_badges) > 5:
                            print(f"    ... and {len(missing_badges) - 5} more")
                else:
                    if args.format == "human":
                        print("  ✓ All specs have roadmap badges")

            # Attempt fixes if requested
            if args.fix and not validation_results["passed"]:
                if args.format == "human":
                    print()
                    print("Attempting to fix issues...")
                
                # Fix broken links (if we have suggestions)
                # This is a placeholder - actual implementation would need
                # more sophisticated link fixing logic
                if validation_results["broken_links"]:
                    if args.format == "human":
                        print("  Link fixing not yet implemented")
                        print("  Please manually review and fix broken links")

            # Print summary
            if args.format == "human":
                print()
                print("=" * 70)
                if validation_results["passed"]:
                    print("✓ Validation Passed!")
                else:
                    print("✗ Validation Failed")
                print("=" * 70)
                
                if validation_results["warnings"]:
                    print()
                    print("Warnings:")
                    for warning in validation_results["warnings"]:
                        print(f"  ⚠ {warning}")
                
                print()
            elif args.format == "json":
                print(json.dumps(validation_results, indent=2))

            return 0 if validation_results["passed"] else 1

        except ImportError as e:
            raise SystemError(
                f"Roadmap module not available: {e}",
                "Ensure roadmap module is installed in src/roadmap/"
            )
        except Exception as e:
            if args.format == "json":
                error_result = {
                    "success": False,
                    "error": str(e),
                    "error_type": type(e).__name__
                }
                print(json.dumps(error_result, indent=2))
            raise

    def _execute_dry_run(
        self,
        args: argparse.Namespace,
        config: 'RoadmapConfig',
        stats: Dict[str, Any]
    ) -> int:
        """Execute a dry run of roadmap generation."""
        from roadmap.spec_scanner import SpecScanner
        
        # Scan specs
        scanner = SpecScanner(config.specs_directory)
        spec_files_list = scanner.scan_specs_directory()
        
        stats["specs_scanned"] = len(spec_files_list)
        
        if args.format == "human":
            print(f"Would scan {len(spec_files_list)} spec(s):")
            for spec in spec_files_list:
                print(f"  • {spec.directory.name}")
                if spec.requirements:
                    print(f"    - requirements.md")
                if spec.design:
                    print(f"    - design.md")
                if spec.tasks:
                    print(f"    - tasks.md")
            
            print()
            print("Would generate:")
            print(f"  • {config.output_path}")
            print(f"  • {config.changelog_path}")
            
            if not args.no_badges:
                print()
                print(f"Would inject badges into {len(spec_files_list)} spec file(s)")
            
            print()
            print("Run without --dry-run to generate files")
        elif args.format == "json":
            result = {
                "dry_run": True,
                "specs_found": len(spec_files_list),
                "spec_names": [s.directory.name for s in spec_files_list],
                "files_to_generate": [str(config.output_path), str(config.changelog_path)],
                "badges_to_inject": len(spec_files_list) if not args.no_badges else 0
            }
            print(json.dumps(result, indent=2))
        
        return 0
