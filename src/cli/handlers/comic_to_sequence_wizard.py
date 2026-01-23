"""
PanelForge Comic to Sequence Wizard command handler - Transform comic panels into cinematic sequences.
"""

import argparse
from pathlib import Path
from typing import List
import json

from ..base import BaseHandler
from ..errors import UserError, SystemError


class ComicToSequenceWizardHandler(BaseHandler):
    """Handler for the comic-to-sequence-wizard command - comic panel analysis & cinematic conversion."""

    command_name = "comic-to-sequence-wizard"
    description = "Transform comic book panel images into professional cinematic sequences"

    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up comic-to-sequence-wizard command arguments."""
        parser.add_argument(
            "image_path",
            help="Path to the comic panel image file"
        )

        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )

        parser.add_argument(
            "--title",
            help="Comic title (optional)"
        )

        parser.add_argument(
            "--page",
            type=int,
            default=1,
            help="Page number in the comic (default: 1)"
        )

        parser.add_argument(
            "--style",
            choices=["american_comics", "manga", "european_comics", "graphic_novel", "web_comics"],
            default="american_comics",
            help="Comic art style (default: american_comics)"
        )

        parser.add_argument(
            "--preview",
            action="store_true",
            help="Show preview of transformation without processing"
        )

        parser.add_argument(
            "--format",
            choices=["detailed", "summary", "minimal"],
            default="detailed",
            help="Output format (default: detailed)"
        )

    def execute(self, args: argparse.Namespace) -> int:
        """Execute the comic-to-sequence-wizard command."""
        try:
            # Import Comic to Sequence wizard
            try:
                from src.wizard.comic_to_sequence_wizard import (
                    create_comic_to_sequence_wizard,
                    get_transformation_preview,
                    ComicStyle
                )
            except ImportError as e:
                raise SystemError(
                    f"Comic to Sequence wizard modules not available: {e}",
                    "Ensure wizard package is installed"
                )

            # Validate image path
            image_path = Path(args.image_path)
            if not image_path.exists():
                raise UserError(
                    f"Image file not found: {image_path}",
                    "Check the image path and ensure the file exists"
                )

            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )

            print("🎭 PanelForge - Comic to Sequence Wizard")
            print("=" * 60)

            # Handle preview mode
            if args.preview:
                return self._execute_preview_mode(image_path)

            # Execute full transformation
            import asyncio

            wizard = create_comic_to_sequence_wizard()

            # Map style string to enum
            style_map = {
                'american_comics': ComicStyle.AMERICAN_COMICS,
                'manga': ComicStyle.MANGA,
                'european_comics': ComicStyle.EUROPEAN_COMICS,
                'graphic_novel': ComicStyle.GRAPHIC_NOVEL,
                'web_comics': ComicStyle.WEB_COMICS
            }
            comic_style = style_map.get(args.style.lower(), ComicStyle.AMERICAN_COMICS)

            print(f"📖 Processing: {image_path.name}")
            print(f"🎨 Comic style: {comic_style.value.replace('_', ' ').title()}")
            if args.title:
                print(f"📚 Title: {args.title}")
            print(f"📄 Page: {args.page}")

            # Transform comic to sequence
            result = asyncio.run(
                wizard.transform_comic_to_sequence(
                    image_path, args.title, args.page, comic_style
                )
            )

            # Display results based on format
            return self._display_transformation_results(result, args.format)

        except Exception as e:
            return self.handle_error(e, "Comic to sequence transformation")

    def _execute_preview_mode(self, image_path: Path) -> int:
        """Execute preview mode to show transformation potential."""
        print("👁️ Transformation Preview Mode")
        print("-" * 35)

        preview = get_transformation_preview(image_path)

        if 'error' in preview:
            print(f"❌ Error: {preview['error']}")
            return 1

        print(f"🖼️ Image: {preview['image_path']}")
        print(f"📏 File size: {preview['file_size'] / 1024:.0f} KB")
        print(f"🎭 Estimated panels: {preview['estimated_panels']}")
        print(f"⏱️ Processing time: {preview['estimated_processing_time']}")

        print(f"\n🎨 Supported Comic Styles:")
        supported_styles = preview.get('supported_styles', [])
        for style in supported_styles:
            print(f"   • {style.replace('_', ' ').title()}")

        print(f"\n💡 Preview Recommendations:")
        print(f"   • Use high-contrast images for better panel detection")
        print(f"   • Ensure text is clearly readable in panels")
        print(f"   • Try different styles if results seem inaccurate")
        print(f"   • Complex layouts may require manual review")

        return 0

    def _display_transformation_results(self, result, format_type: str) -> int:
        """Display comic transformation results."""
        print(f"\n🎬 Transformation Complete - Confidence: {result.confidence_score:.1f}/10")
        print("=" * 75)

        # Basic info
        sequence = result.comic_sequence
        print(f"🎭 Result ID: {result.result_id}")
        print(f"📚 Comic: {sequence.comic_title} (Page {sequence.page_number})")
        print(f"🎨 Style: {sequence.comic_style.value.replace('_', ' ').title()}")
        print(f"🕒 Processed: {result.creation_timestamp[:19].replace('T', ' ')}")
        print(f"⏱️ Processing time: {result.processing_time:.1f}s")

        # Analysis summary
        print(f"\n📊 Analysis Summary:")
        print(f"   🎭 Panels detected: {result.panel_count}")
        print(f"   🎬 Shots generated: {len(result.cinematic_shots)}")
        print(f"   👥 Characters identified: {result.character_count}")
        print(f"   📋 Layout: {sequence.layout_type.value.replace('_', ' ').title()}")

        if format_type == "minimal":
            return self._display_minimal_format(result)
        elif format_type == "summary":
            return self._display_summary_format(result)
        else:
            return self._display_detailed_format(result)

    def _display_minimal_format(self, result) -> int:
        """Display minimal format output."""
        print(f"\n🎬 Quick Results:")
        print(f"   Panels: {result.panel_count}")
        print(f"   Shots: {len(result.cinematic_shots)}")
        print(f"   Confidence: {result.confidence_score:.1f}/10")

        print(f"\n💾 Results saved to: comic_to_sequence_result.json")
        return 0

    def _display_summary_format(self, result) -> int:
        """Display summary format output."""
        sequence = result.comic_sequence

        print(f"\n🎭 Comic Analysis:")
        print(f"   Layout: {sequence.layout_type.value.replace('_', ' ').title()}")
        print(f"   Mood: {sequence.overall_mood.title() if sequence.overall_mood else 'Neutral'}")
        if sequence.key_themes:
            print(f"   Themes: {', '.join(sequence.key_themes)}")

        print(f"\n🎬 Cinematic Conversion:")
        shot_types = {}
        total_duration = 0

        for shot in result.cinematic_shots:
            shot_type = shot.shot_type
            shot_types[shot_type] = shot_types.get(shot_type, 0) + 1
            total_duration += shot.duration_seconds

        print(f"   Total duration: {total_duration:.1f}s")
        print(f"   Shot types: {', '.join(f'{count}x {shot_type}' for shot_type, count in shot_types.items())}")

        # Show sample shots
        if result.cinematic_shots:
            print(f"\n📋 Sample Shots:")
            for i, shot in enumerate(result.cinematic_shots[:3], 1):
                print(f"   {i}. {shot.shot_type} ({shot.duration_seconds:.1f}s) - {shot.description[:50]}...")

        self._display_generated_assets(result)

        return 0

    def _display_detailed_format(self, result) -> int:
        """Display detailed format output."""
        sequence = result.comic_sequence

        # Comic sequence details
        print(f"\n🎭 Comic Sequence Analysis:")
        print(f"   Title: {sequence.comic_title}")
        print(f"   Page: {sequence.page_number}")
        print(f"   Layout: {sequence.layout_type.value.replace('_', ' ').title()}")
        print(f"   Style: {sequence.comic_style.value.replace('_', ' ').title()}")
        print(f"   Overall mood: {sequence.overall_mood}")
        print(f"   Story progression: {sequence.story_progression}")

        if sequence.key_themes:
            print(f"   Key themes: {', '.join(sequence.key_themes)}")

        # Panel breakdown
        if sequence.panels:
            print(f"\n🎨 Panel Breakdown:")
            for i, panel in enumerate(sequence.panels, 1):
                print(f"   {i}. Panel {panel.panel_number}: {panel.content_description}")
                if panel.characters_present:
                    print(f"      Characters: {', '.join(panel.characters_present)}")
                if panel.camera_angle:
                    print(f"      Camera: {panel.camera_angle.value.replace('_', ' ').title()}")
                if panel.mood_emotion:
                    print(f"      Mood: {panel.mood_emotion.title()}")

        # Cinematic shots breakdown
        if result.cinematic_shots:
            print(f"\n🎬 Cinematic Shots:")
            for i, shot in enumerate(result.cinematic_shots, 1):
                print(f"   {i}. {shot.shot_type} ({shot.duration_seconds:.1f}s)")
                print(f"      Description: {shot.description}")
                print(f"      Camera: {shot.camera_angle.value.replace('_', ' ')}")
                print(f"      Movement: {shot.camera_movement}")
                if shot.dialogue:
                    print(f"      Dialogue: \"{shot.dialogue}\"")
                if shot.sound_effects:
                    print(f"      SFX: {', '.join(shot.sound_effects)}")
                print(f"      Notes: {shot.visual_notes}")

        # Storyboard panels
        if result.storyboard_panels:
            print(f"\n📋 Storyboard Sequence:")
            for i, panel in enumerate(result.storyboard_panels, 1):
                print(f"   {i}. Shot {panel['shot_number']}: {panel['description'][:60]}...")
                print(f"      Duration: {panel['duration']:.1f}s, Camera: {panel['camera_angle']}")

        self._display_generated_assets(result)

        print(f"\n✅ Comic to sequence transformation completed!")
        print(f"   Results saved to project directory for use in video production.")

        return 0

    def _display_generated_assets(self, result) -> None:
        """Display information about generated assets."""
        print(f"\n💾 Generated Files:")

        assets = [
            ("comic_to_sequence_result.json", "Complete transformation results"),
            ("comic_derived_shot_planning.json", "Shot planning for video production"),
            ("comic_derived_storyboard.json", "Storyboard sequence data")
        ]

        for filename, description in assets:
            if any(filename in asset for asset in result.generated_assets):
                print(f"   • {filename} - {description}")

        print(f"\n📊 Project updated with comic analysis metadata")