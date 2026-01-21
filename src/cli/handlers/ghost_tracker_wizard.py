"""
Ghost Tracker Wizard command handler - AI-powered project advisor.
"""

import argparse
from pathlib import Path
from typing import List
import json

from ..base import BaseHandler
from ..errors import UserError, SystemError


class GhostTrackerWizardHandler(BaseHandler):
    """Handler for the ghost-tracker-wizard command - AI project advisor."""

    command_name = "ghost-tracker-wizard"
    description = "AI-powered advisor providing insights and recommendations for video storyboard projects"

    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up ghost-tracker-wizard command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )

        parser.add_argument(
            "--focus",
            nargs="+",
            choices=["storytelling", "cinematography", "pacing", "character_development", "production_design", "technical_aspects"],
            help="Focus analysis on specific areas"
        )

        parser.add_argument(
            "--quick-advice",
            help="Get quick advice on a specific question"
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
                from wizard.ghost_tracker_wizard import (
                    create_ghost_tracker_wizard,
                    get_ghost_tracker_advice,
                    AdviceCategory
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

            print("👻 Ghost Tracker Wizard - AI Project Advisor")
            print("=" * 60)

            # Handle quick advice mode
            if args.quick_advice:
                return self._execute_quick_advice(project_path, args.quick_advice)

            # Execute full analysis
            import asyncio

            wizard = create_ghost_tracker_wizard()

            print(f"🔍 Analyzing project: {project_path.absolute()}")
            if args.focus:
                print(f"   Focus areas: {', '.join(args.focus)}")

            print("\n⏳ Starting comprehensive analysis...")
            print("   This may take a moment...")

            # Run analysis
            report = asyncio.run(
                wizard.analyze_project(project_path, args.focus)
            )

            # Display results based on format
            if args.report_only:
                return self._display_report_only(report, project_path)

            return self._display_full_analysis(report, args.format)

        except Exception as e:
            return self.handle_error(e, "Ghost Tracker analysis")

    def _execute_quick_advice(self, project_path: Path, question: str) -> int:
        """Execute quick advice mode."""
        print(f"💡 Quick Advice: {question}")
        print("-" * 40)

        advice = get_ghost_tracker_advice(project_path, question)

        print(advice)
        print("\n" + "=" * 60)
        print("💭 For more detailed analysis, run without --quick-advice")

        return 0

    def _display_report_only(self, report: GhostTrackerReport, project_path: Path) -> int:
        """Display minimal report information."""
        print("\n📊 Analysis Complete")
        print("=" * 30)
        print(f"Overall Score: {report.overall_score}/10.0")
        print(f"Insights Found: {len(report.insights)}")
        print(f"Report Saved: {project_path / 'ghost_tracker_report.json'}")

        return 0

    def _display_full_analysis(self, report: GhostTrackerReport, format_type: str) -> int:
        """Display full analysis results."""
        print(f"\n🎯 Analysis Complete - Score: {report.overall_score}/10.0")
        print("=" * 60)

        # Project info
        metadata = report.metadata
        print(f"📁 Project: {metadata.get('project_name', 'Unknown')}")
        print(f"🕒 Analyzed: {report.analysis_timestamp[:19].replace('T', ' ')}")
        print(f"📊 Insights: {len(report.insights)}")

        if format_type == "minimal":
            return self._display_minimal_format(report)
        elif format_type == "summary":
            return self._display_summary_format(report)
        else:
            return self._display_detailed_format(report)

    def _display_minimal_format(self, report: GhostTrackerReport) -> int:
        """Display minimal format output."""
        print(f"\n🎯 Score: {report.overall_score}/10.0")

        if report.next_steps:
            print("\n🚀 Top Next Steps:")
            for i, step in enumerate(report.next_steps[:3], 1):
                print(f"   {i}. {step}")

        print(f"\n📄 Full report saved to: ghost_tracker_report.json")
        return 0

    def _display_summary_format(self, report: GhostTrackerReport) -> int:
        """Display summary format output."""
        print(f"\n🎯 Overall Assessment: {report.overall_score}/10.0")

        # Strengths
        if report.strengths:
            print("\n✅ Strengths:")
            for strength in report.strengths[:3]:
                print(f"   • {strength}")

        # Key issues
        critical_insights = [i for i in report.insights if i.priority.value == "critical"]
        high_insights = [i for i in report.insights if i.priority.value == "high"]

        if critical_insights or high_insights:
            print("\n⚠️  Priority Areas:")
            for insight in critical_insights + high_insights[:2]:
                print(f"   • {insight.title}")

        # Next steps
        if report.next_steps:
            print("\n🚀 Recommended Next Steps:")
            for step in report.next_steps[:3]:
                print(f"   • {step}")

        print(f"\n📊 Total Insights: {len(report.insights)}")
        print(f"📄 Detailed report saved to: ghost_tracker_report.json")

        return 0

    def _display_detailed_format(self, report: GhostTrackerReport) -> int:
        """Display detailed format output."""
        # Score interpretation
        score = report.overall_score
        if score >= 9.0:
            assessment = "🌟 Excellent - Ready for production!"
        elif score >= 7.5:
            assessment = "✅ Good - Minor improvements suggested"
        elif score >= 6.0:
            assessment = "⚠️ Fair - Several improvements needed"
        else:
            assessment = "🚨 Needs Work - Major revisions recommended"

        print(f"\n🎯 Assessment: {assessment}")

        # Strengths
        if report.strengths:
            print("\n✅ Project Strengths:")
            for strength in report.strengths:
                print(f"   • {strength}")

        # Weaknesses
        if report.weaknesses:
            print("\n⚠️  Key Areas for Improvement:")
            for weakness in report.weaknesses:
                print(f"   • {weakness}")

        # Detailed insights by category
        insights_by_category = {}
        for insight in report.insights:
            category = insight.category.value
            if category not in insights_by_category:
                insights_by_category[category] = []
            insights_by_category[category].append(insight)

        print("\n🔍 Detailed Analysis:"        for category, insights in insights_by_category.items():
            print(f"\n📋 {category.replace('_', ' ').title()}:")
            for insight in insights:
                priority_icon = {
                    "critical": "🚨",
                    "high": "⚠️",
                    "medium": "ℹ️",
                    "low": "💡",
                    "suggestion": "💭"
                }.get(insight.priority.value, "•")

                print(f"   {priority_icon} {insight.title}")
                print(f"      {insight.description}")
                if insight.actionable_steps:
                    print("      💡 Actions:"                    for step in insight.actionable_steps[:2]:
                        print(f"         • {step}")

        # Recommendations
        if report.recommendations:
            print("
📝 Key Recommendations:"            for i, rec in enumerate(report.recommendations[:5], 1):
                print(f"   {i}. {rec}")

        # Next steps
        if report.next_steps:
            print("
🚀 Immediate Next Steps:"            for i, step in enumerate(report.next_steps, 1):
                print(f"   {i}. {step}")

        # Report location
        print("
📄 Complete analysis saved to: ghost_tracker_report.json"        print("   Use this file to review all insights and track improvements")

        return 0