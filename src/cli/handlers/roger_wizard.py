"""
Roger Wizard command handler - Data extraction from text files.
"""

import argparse
from pathlib import Path
from typing import List
import json

from ..base import BaseHandler
from ..errors import UserError, SystemError


class RogerWizardHandler(BaseHandler):
    """Handler for the roger-wizard command - intelligent data extraction from text files."""

    command_name = "roger-wizard"
    description = "Extract project data from text files (stories, novels, LLM discussions)"

    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up roger-wizard command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )

        parser.add_argument(
            "--file",
            required=True,
            help="Text file to analyze (story, novel, discussion plan, etc.)"
        )

        parser.add_argument(
            "--focus",
            nargs="+",
            choices=["characters", "locations", "world_building", "plot", "themes"],
            help="Focus extraction on specific areas"
        )

        parser.add_argument(
            "--preview",
            action="store_true",
            help="Show preview of extraction potential without processing"
        )

        parser.add_argument(
            "--format",
            choices=["detailed", "summary", "minimal"],
            default="detailed",
            help="Output format (default: detailed)"
        )

        parser.add_argument(
            "--save-only",
            action="store_true",
            help="Save results without displaying output"
        )

    def execute(self, args: argparse.Namespace) -> int:
        """Execute the roger-wizard command."""
        try:
            # Import Roger wizard
            try:
                from src.wizard.roger_wizard import (
                    create_roger_wizard,
                    get_extraction_preview,
                    RogerExtractionResult
                )
            except ImportError as e:
                raise SystemError(
                    f"Roger wizard modules not available: {e}",
                    "Ensure wizard package is installed"
                )

            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )

            # Validate text file
            text_file_path = Path(args.file)
            if not text_file_path.exists():
                raise UserError(
                    f"Text file not found: {text_file_path}",
                    "Ensure the file path is correct and the file exists"
                )

            if not text_file_path.is_file():
                raise UserError(
                    f"Path is not a file: {text_file_path}",
                    "Provide a path to a text file, not a directory"
                )

            print("🤖 Roger Wizard - Data Extraction Assistant")
            print("=" * 60)

            # Handle preview mode
            if args.preview:
                return self._execute_preview(text_file_path)

            # Execute full extraction
            import asyncio

            wizard = create_roger_wizard()

            print(f"📂 Project: {project_path.absolute()}")
            print(f"📄 Source file: {text_file_path.name}")
            if args.focus:
                print(f"🎯 Focus areas: {', '.join(args.focus)}")

            # Run extraction
            result = asyncio.run(
                wizard.analyze_and_extract(project_path, text_file_path, args.focus)
            )

            # Display results based on format
            if args.save_only:
                return self._display_save_only(result, project_path)

            return self._display_extraction_results(result, args.format)

        except Exception as e:
            return self.handle_error(e, "Roger data extraction")

    def _execute_preview(self, text_file_path: Path) -> int:
        """Execute preview mode to show extraction potential."""
        print(f"👁️  Preview Mode - Analyzing: {text_file_path.name}")
        print("-" * 50)

        preview = get_extraction_preview(text_file_path)

        if 'error' in preview:
            print(f"❌ Error: {preview['error']}")
            return 1

        print(f"📊 File Statistics:")
        print(f"   Size: {preview['file_size']} bytes")
        print(f"   Words: {preview['word_count']}")
        print(f"   Characters: {preview['character_count']}")
        print(f"   Extraction Potential: {preview['extraction_potential'].upper()}")

        print(f"\n🎯 Estimated Extractions:")
        print(f"   Characters: ~{preview['estimated_characters']}")
        print(f"   Locations: ~{preview['estimated_locations']}")

        print(f"\n📝 Preview Text:")
        print(f"   {preview['preview_text']}")

        print("\n💡 Run without --preview to perform actual extraction")
        return 0

    def _display_save_only(self, result: RogerExtractionResult, project_path: Path) -> int:
        """Display minimal info when saving only."""
        print("\n💾 Extraction completed and saved!")
        print("=" * 40)
        print(f"📁 Project: {result.project_id}")
        print(f"📄 Source: {Path(result.source_file).name}")
        print(f"📊 Extracted: {len(result.characters)} chars, {len(result.locations)} locs, {len(result.world_elements)} elements")
        print(f"🎯 Confidence: {result.confidence_metrics.get('overall', 0):.1f}/10")
        print(f"💾 Saved to: {project_path}/roger_extraction_report.json")

        return 0

    def _display_extraction_results(self, result: RogerExtractionResult, format_type: str) -> int:
        """Display extraction results in specified format."""
        print(f"\n🎉 Extraction Complete - Confidence: {result.confidence_metrics.get('overall', 0):.1f}/10")
        print("=" * 80)

        # Project and file info
        print(f"📁 Project ID: {result.project_id}")
        print(f"📄 Source File: {Path(result.source_file).name}")
        print(f"🕒 Extracted: {result.extraction_timestamp[:19].replace('T', ' ')}")

        # Summary
        print(f"\n📝 Summary ({len(result.summary_500_chars)} chars):")
        print(f"   {result.summary_500_chars}")

        if format_type == "minimal":
            return self._display_minimal_format(result)
        elif format_type == "summary":
            return self._display_summary_format(result)
        else:
            return self._display_detailed_format(result)

    def _display_minimal_format(self, result: RogerExtractionResult) -> int:
        """Display minimal format output."""
        stats = result.extraction_stats

        print(f"\n📊 Quick Stats:")
        print(f"   Characters: {stats['total_characters_extracted']}")
        print(f"   Locations: {stats['total_locations_extracted']}")
        print(f"   World Elements: {stats['total_world_elements_extracted']}")
        print(f"   Themes: {stats['themes_identified']}")

        print(f"\n💾 Results saved to project files")
        return 0

    def _display_summary_format(self, result: RogerExtractionResult) -> int:
        """Display summary format output."""
        stats = result.extraction_stats

        print(f"\n📊 Extraction Summary:")
        print(f"   Total Characters: {stats['total_characters_extracted']}")
        print(f"   Total Locations: {stats['total_locations_extracted']}")
        print(f"   World Elements: {stats['total_world_elements_extracted']}")
        print(f"   Themes Identified: {stats['themes_identified']}")
        print(f"   Conflicts Found: {stats['conflicts_identified']}")

        # Show top characters
        if result.characters:
            print(f"\n👥 Top Characters:")
            for i, char in enumerate(result.characters[:3], 1):
                confidence = "High" if char.confidence_score > 0.8 else "Medium" if char.confidence_score > 0.6 else "Low"
                print(f"   {i}. {char.name} ({confidence} confidence)")

        # Show main themes
        if result.main_themes:
            print(f"\n🎭 Main Themes:")
            for theme in result.main_themes[:3]:
                print(f"   • {theme}")

        print(f"\n💾 Full results saved to: roger_extraction_report.json")
        print(f"   Character data saved to: character_definitions.json")
        print(f"   World data saved to: world_building.json")

        return 0

    def _display_detailed_format(self, result: RogerExtractionResult) -> int:
        """Display detailed format output."""
        # Characters section
        if result.characters:
            print(f"\n👥 Extracted Characters ({len(result.characters)}):")
            for i, char in enumerate(result.characters, 1):
                confidence_pct = int(char.confidence_score * 100)
                print(f"\n   {i}. {char.name}")
                print(f"      Role: {char.role_in_story or 'Unknown'}")
                print(f"      Age Group: {char.age_group or 'Unknown'}")
                print(f"      Gender: {char.gender or 'Unknown'}")
                print(f"      Confidence: {confidence_pct}%")
                if char.description:
                    desc = char.description[:100] + "..." if len(char.description) > 100 else char.description
                    print(f"      Description: {desc}")

        # Locations section
        if result.locations:
            print(f"\n🏰 Extracted Locations ({len(result.locations)}):")
            for i, loc in enumerate(result.locations, 1):
                confidence_pct = int(loc.confidence_score * 100)
                print(f"\n   {i}. {loc.name}")
                print(f"      Type: {loc.type}")
                print(f"      Atmosphere: {loc.atmosphere}")
                print(f"      Confidence: {confidence_pct}%")
                if loc.description:
                    desc = loc.description[:80] + "..." if len(loc.description) > 80 else loc.description
                    print(f"      Description: {desc}")

        # World elements section
        if result.world_elements:
            print(f"\n🌍 World Elements ({len(result.world_elements)}):")
            for i, elem in enumerate(result.world_elements, 1):
                confidence_pct = int(elem.confidence_score * 100)
                print(f"\n   {i}. {elem.category.title()}: {elem.name}")
                print(f"      Confidence: {confidence_pct}%")
                if elem.description:
                    desc = elem.description[:80] + "..." if len(elem.description) > 80 else elem.description
                    print(f"      Description: {desc}")
                if elem.rules:
                    print(f"      Rules: {len(elem.rules)} identified")

        # Story elements section
        if result.main_themes or result.main_conflicts or result.plot_summary:
            print(f"\n📖 Story Elements:")

            if result.main_themes:
                print(f"\n   🎭 Themes ({len(result.main_themes)}):")
                for theme in result.main_themes:
                    print(f"      • {theme}")

            if result.main_conflicts:
                print(f"\n   ⚔️  Key Conflicts ({len(result.main_conflicts)}):")
                for conflict in result.main_conflicts:
                    conflict_short = conflict[:60] + "..." if len(conflict) > 60 else conflict
                    print(f"      • {conflict_short}")

            if result.plot_summary:
                print(f"\n   📝 Plot Summary:")
                summary_lines = result.plot_summary.split('. ')
                for line in summary_lines[:2]:  # First 2 sentences
                    if line.strip():
                        print(f"      {line.strip()}.")

        # Confidence metrics
        if result.confidence_metrics:
            print(f"\n🎯 Confidence Metrics:")
            for category, score in result.confidence_metrics.items():
                if category != 'overall':
                    confidence_pct = int(score * 100)
                    print(f"   {category.title()}: {confidence_pct}%")

        # Files saved
        print(f"\n💾 Files Created/Updated:")
        print(f"   • roger_extraction_report.json - Complete extraction report")
        print(f"   • character_definitions.json - Extracted character data")
        print(f"   • world_building.json - World and location data")
        print(f"   • project.json - Updated with extraction metadata")

        # Processing log
        if result.processing_log:
            print(f"\n📋 Processing Log:")
            for log_entry in result.processing_log[-3:]:  # Last 3 entries
                print(f"   • {log_entry}")

        print(f"\n✅ Extraction completed successfully!")
        print(f"   Use the extracted data to populate your StoryCore project wizards.")

        return 0