"""
Memory Recover command handler - Recover damaged memory system and project state.
"""

import argparse
import json
from pathlib import Path
from typing import Dict, Any

from ..base import BaseHandler
from ..errors import UserError, SystemError


class MemoryRecoverHandler(BaseHandler):
    """Handler for the memory recover command - memory system recovery."""

    command_name = "memory-recover"
    description = "Recover damaged memory system and project state"
    aliases = ["memory-recover", "mem-recover"]

    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up memory recover command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory to recover (default: current directory)"
        )

        parser.add_argument(
            "--mode",
            choices=["automatic", "desperate"],
            default="automatic",
            help="Recovery mode (default: automatic)"
        )

        parser.add_argument(
            "--format",
            choices=["human", "json"],
            default="human",
            help="Output format (default: human)"
        )

        parser.add_argument(
            "--force",
            action="store_true",
            help="Force recovery even if no errors detected"
        )

    def execute(self, args: argparse.Namespace) -> int:
        """Execute the memory recover command."""
        try:
            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )

            # Import memory system
            try:
                from memory_system import MemorySystemCore
                from memory_system.data_models import RecoveryType
            except ImportError as e:
                raise SystemError(
                    f"Memory system not available: {e}",
                    "Ensure memory_system module is installed"
                )

            # Initialize memory system
            memory_system = MemorySystemCore(project_path)

            # Check if recovery is needed
            validation_result = memory_system.validate_project_state()
            has_errors = not validation_result.valid

            if not has_errors and not args.force:
                print("No errors detected. Use --force to run recovery anyway.")
                return 0

            # Determine recovery type
            recovery_type = RecoveryType.DESPERATE if args.mode == "desperate" else RecoveryType.AUTOMATIC

            # Perform recovery
            print(f"Starting {args.mode} recovery...")
            recovery_report = memory_system.trigger_recovery(recovery_type)

            # Output results
            if args.format == "json":
                print(json.dumps({
                    "success": recovery_report.success,
                    "restored_files": [str(f) for f in recovery_report.restored_files],
                    "lost_files": [str(f) for f in recovery_report.lost_files],
                    "confidence_scores": recovery_report.confidence_scores,
                    "warnings": recovery_report.warnings,
                    "recommendations": recovery_report.recommendations,
                    "timestamp": recovery_report.timestamp
                }, indent=2))
            else:
                self._print_human_results(recovery_report, args)

            return 0 if recovery_report.success else 1

        except Exception as e:
            return self.handle_error(e, "memory recovery")

    def _print_human_results(self, report: 'RecoveryReport', args: argparse.Namespace) -> None:
        """Print human-readable recovery results."""
        print(f"Memory System Recovery Results")
        print(f"Mode: {args.mode}")
        print()

        if report.success:
            print("✓ Recovery completed successfully!")
        else:
            print("⚠️  Recovery completed with issues")

        print()
        print("Summary:")
        print(f"  Restored files: {len(report.restored_files)}")
        print(f"  Lost files: {len(report.lost_files)}")
        print()

        if report.restored_files:
            print("Restored files:")
            for file_path in report.restored_files:
                print(f"  • {file_path}")
            print()

        if report.lost_files:
            print("Lost files:")
            for file_path in report.lost_files:
                print(f"  • {file_path}")
            print()

        if report.confidence_scores:
            print("Confidence scores:")
            for file_path, score in report.confidence_scores.items():
                print(f"  • {file_path}: {score:.1%}")
            print()

        if report.warnings:
            print("Warnings:")
            for warning in report.warnings:
                print(f"  • {warning}")
            print()

        if report.recommendations:
            print("Recommendations:")
            for recommendation in report.recommendations:
                print(f"  • {recommendation}")
            print()

        print(f"Recovery completed at: {report.timestamp}")