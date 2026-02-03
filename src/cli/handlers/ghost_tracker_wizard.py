"""
Ghost Tracker Wizard command handler - AI-powered tracking analysis.
"""

import argparse
from pathlib import Path
from typing import List, Optional
import json

from ..base import BaseHandler
from ..errors import UserError, SystemError


class GhostTrackerWizardHandler(BaseHandler):
    """Handler for the ghost-tracker-wizard command - Tracking analysis."""

    command_name = "ghost-tracker-wizard"
    description = "AI-powered tracking analysis for continuity and visual consistency"

    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up ghost-tracker-wizard command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )

        parser.add_argument(
            "--mode",
            choices=["continuity", "anomaly_detection", "motion_analysis", "visual_consistency", "quality_assurance"],
            default="continuity",
            help="Tracking analysis mode (default: continuity)"
        )

        parser.add_argument(
            "--shots",
            nargs="+",
            help="Specific shot IDs to analyze"
        )

        parser.add_argument(
            "--report-only",
            action="store_true",
            help="Generate report without displaying detailed output"
        )

        parser.add_argument(
            "--format",
            choices=["detailed", "summary", "minimal"],
            default="detailed",
            help="Output format (default: detailed)"
        )

    def execute(self, args: argparse.Namespace) -> int:
        """Execute the ghost-tracker-wizard command."""
        try:
            # Import Ghost Tracker wizard
            try:
                from src.wizard.ghost_tracker_wizard import (
                    create_ghost_tracker_wizard,
                    TrackingResult,
                    TrackingMode
                )
            except ImportError as e:
                raise SystemError(
                    f"Ghost Tracker wizard modules not available: {e}",
                    "Ensure wizard package is installed"
                )

            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )

            print("👻 Ghost Tracker Wizard - Advanced Tracking System")
            print("=" * 60)

            # Execute full analysis
            import asyncio

            wizard = create_ghost_tracker_wizard()

            print(f"🔍 Analyzing project: {project_path.absolute()}")

            # Parse mode
            mode_map = {
                'continuity': TrackingMode.CONTINUITY,
                'anomaly_detection': TrackingMode.ANOMALY_DETECTION,
                'motion_analysis': TrackingMode.MOTION_ANALYSIS,
                'visual_consistency': TrackingMode.VISUAL_CONSISTENCY,
                'quality_assurance': TrackingMode.QUALITY_ASSURANCE
            }
            tracking_mode = mode_map.get(args.mode, TrackingMode.CONTINUITY)
            print(f"🎯 Tracking mode: {tracking_mode.value.replace('_', ' ').title()}")

            print("\n⏳ Starting tracking analysis...")
            print("   This may take a moment...")

            # Run analysis
            report = asyncio.run(
                wizard.perform_tracking_analysis(project_path, tracking_mode, args.shots)
            )

            # Display results based on format
            if args.report_only:
                return self._display_report_only(report, project_path)

            return self._display_tracking_results(report, args.format)

        except Exception as e:
            return self.handle_error(e, "Ghost Tracker analysis")

    def _display_report_only(self, report: TrackingResult, project_path: Path) -> int:
        """Display minimal report information."""
        print("\n📊 Tracking Analysis Complete")
        print("=" * 30)
        print(f"Elements Tracked: {report.total_elements_tracked}")
        print(f"Issues Found: {report.total_issues_found}")
        print(f"Confidence: {report.overall_confidence:.1f}/10")
        print(f"Report Saved: {project_path / 'ghost_tracking_result.json'}")

        return 0

    def _display_tracking_results(self, report: TrackingResult, format_type: str) -> int:
        """Display tracking analysis results."""
        print(f"\n🎯 Tracking Analysis Complete")
        print("=" * 60)

        # Project info
        print(f"🔍 Elements tracked: {report.total_elements_tracked}")
        print(f"⚠️ Issues found: {report.total_issues_found}")
        print(f"⏱️ Processing time: {report.processing_time:.1f}s")
        print(f"📊 Overall confidence: {report.overall_confidence:.1f}/10")

        if format_type == "minimal":
            return self._display_minimal_tracking(report)
        elif format_type == "summary":
            return self._display_summary_tracking(report)
        else:
            return self._display_detailed_tracking(report)

    def _display_minimal_tracking(self, report: TrackingResult) -> int:
        """Display minimal tracking output."""
        print(f"\n🎯 Score: {report.overall_confidence:.1f}/10")

        if report.continuity_issues:
            print(f"\n⚠️ Found {len(report.continuity_issues)} issues")

        if report.recommendations:
            print("\n🚀 Top Recommendations:")
            for i, rec in enumerate(report.recommendations[:3], 1):
                print(f"   {i}. {rec}")

        print(f"\n📄 Full report saved to: ghost_tracking_result.json")
        return 0

    def _display_summary_tracking(self, report: TrackingResult) -> int:
        """Display summary tracking output."""
        print(f"\n🎯 Overall Assessment: {report.overall_confidence:.1f}/10")

        # Tracked elements summary
        if report.tracked_elements:
            print(f"\n📍 Tracked Elements: {len(report.tracked_elements)}")
            for elem in report.tracked_elements[:3]:
                print(f"   • {elem.name} ({elem.target_type.value}) - seen in {elem.total_occurrences} shots")

        # Issues summary
        if report.continuity_issues:
            print(f"\n⚠️  Issues Found: {len(report.continuity_issues)}")
            for issue in report.continuity_issues[:3]:
                print(f"   • {issue.description[:60]}...")

        # Recommendations
        if report.recommendations:
            print(f"\n🚀 Recommendations:")
            for rec in report.recommendations[:3]:
                print(f"   • {rec}")

        print(f"\n📄 Detailed report saved to: ghost_tracking_result.json")

        return 0

    def _display_detailed_tracking(self, report: TrackingResult) -> int:
        """Display detailed tracking output."""
        # Score interpretation
        score = report.overall_confidence
        if score >= 9.0:
            assessment = "🌟 Excellent - Tracking ready for production!"
        elif score >= 7.5:
            assessment = "✅ Good - Minor issues found"
        elif score >= 6.0:
            assessment = "⚠️ Fair - Several issues need attention"
        else:
            assessment = "🚨 Needs Work - Major issues detected"

        print(f"\n🎯 Assessment: {assessment}")

        # Analysis summary
        if report.analysis_summary:
            print(f"\n📊 Analysis Summary:")
            print(f"   {report.analysis_summary}")

        # Tracked elements by type
        elements_by_type = {}
        for elem in report.tracked_elements:
            elem_type = elem.target_type.value
            if elem_type not in elements_by_type:
                elements_by_type[elem_type] = []
            elements_by_type[elem_type].append(elem)

        print(f"\n🔍 Tracked Elements ({len(report.tracked_elements)} total):")
        for elem_type, elements in elements_by_type.items():
            print(f"\n📋 {elem_type.replace('_', ' ').title()}:")
            for elem in elements:
                print(f"   • {elem.name}")
                print(f"      First seen: {elem.first_seen_shot}")
                print(f"      Last seen: {elem.last_seen_shot}")
                print(f"      Occurrences: {elem.total_occurrences}")
                print(f"      Confidence: {elem.confidence_score:.1f}")

        # Continuity issues
        if report.continuity_issues:
            print(f"\n⚠️  Continuity Issues ({len(report.continuity_issues)}):")
            for issue in report.continuity_issues:
                priority_indicator = {
                    "critical": "🚨",
                    "major": "⚠️",
                    "minor": "ℹ️"
                }.get(issue.severity, "•")

                print(f"   {priority_indicator} {issue.description}")
                print(f"      Severity: {issue.severity}")
                print(f"      Shot affected: {issue.shot_affected}")
                if issue.suggested_fix:
                    print(f"      Fix: {issue.suggested_fix}")

        # Recommendations
        if report.recommendations:
            print(f"\n📝 Recommendations:")
            for i, rec in enumerate(report.recommendations, 1):
                print(f"   {i}. {rec}")

        # Report location
        print(f"\n📄 Complete analysis saved to: ghost_tracking_result.json")

        return 0

