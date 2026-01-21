"""
Shot Reference Wizard command handler - Generate reference images for shots.
"""

import argparse
from pathlib import Path
from typing import List

from ..base import BaseHandler
from ..errors import UserError, SystemError


class ShotReferenceWizardHandler(BaseHandler):
    """Handler for the shot-reference-wizard command - shot reference image generation."""

    command_name = "shot-reference-wizard"
    description = "Generate reference images for shots using ComfyUI"

    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up shot-reference-wizard command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )

        parser.add_argument(
            "--shots",
            nargs="+",
            help="Specific shot IDs to generate references for (default: all shots)"
        )

        parser.add_argument(
            "--style",
            choices=["cinematic", "storyboard", "realistic", "concept_art", "technical"],
            default="cinematic",
            help="Style for generated reference images (default: cinematic)"
        )

        parser.add_argument(
            "--quality",
            choices=["draft", "standard", "high", "maximum"],
            default="standard",
            help="Quality level for image generation (default: standard)"
        )

        parser.add_argument(
            "--preview",
            action="store_true",
            help="Preview prompts without generating images"
        )

        parser.add_argument(
            "--batch",
            action="store_true",
            help="Enable batch processing for faster generation"
        )

    def execute(self, args: argparse.Namespace) -> int:
        """Execute the shot-reference-wizard command."""
        try:
            # Import shot reference wizard
            try:
                from wizard.shot_reference_wizard import (
                    create_shot_reference_wizard,
                    ReferenceImageStyle,
                    ImageQuality
                )
            except ImportError as e:
                raise SystemError(
                    f"Shot reference wizard modules not available: {e}",
                    "Ensure wizard package is installed"
                )

            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )

            print(f"🎬 Shot Reference Wizard for project: {project_path.absolute()}")
            print("=" * 70)

            # Check if shot planning exists
            shot_planning_file = project_path / "shot_planning.json"
            if not shot_planning_file.exists():
                raise UserError(
                    "Shot planning data not found",
                    "Run 'storycore shot-planning' first to create shot specifications"
                )

            # Initialize wizard
            wizard = create_shot_reference_wizard()

            # Load shot data
            print("📋 Loading shot specifications...")
            shot_specs = wizard.load_shot_data(project_path)
            print(f"   Found {len(shot_specs)} shots to process")

            if not shot_specs:
                raise UserError(
                    "No shots found in project",
                    "Ensure shot planning was completed successfully"
                )

            # Handle preview mode
            if args.preview:
                return self._execute_preview_mode(wizard, args)

            # Filter shots if specific IDs requested
            shots_to_process = shot_specs
            if args.shots:
                shots_to_process = [s for s in shot_specs if s.shot_id in args.shots]
                if not shots_to_process:
                    available_ids = [s.shot_id for s in shot_specs]
                    raise UserError(
                        f"None of the specified shots found: {args.shots}",
                        f"Available shots: {available_ids}"
                    )

            # Execute generation
            import asyncio

            print(f"\n🎨 Configuration:")
            print(f"   Style: {args.style}")
            print(f"   Quality: {args.quality}")
            print(f"   Shots to process: {len(shots_to_process)}")
            if args.batch:
                print("   Mode: Batch processing enabled")

            # Convert parameters to enums
            style_enum = ReferenceImageStyle(args.style.upper())
            quality_enum = ImageQuality(args.quality.upper())

            # Generate reference images
            print(f"\n🚀 Starting image generation...")
            results = asyncio.run(
                wizard.generate_reference_images(
                    project_path, style_enum, quality_enum,
                    [s.shot_id for s in shots_to_process] if args.shots else None
                )
            )

            # Display results
            return self._display_generation_results(results, project_path)

        except Exception as e:
            return self.handle_error(e, "shot reference generation")

    def _execute_preview_mode(self, wizard, args: argparse.Namespace) -> int:
        """Execute preview mode to show generated prompts."""
        print("\n👁️  Preview Mode - Generated Prompts")
        print("-" * 50)

        # Get preview prompts
        shot_ids = args.shots if args.shots else None
        previews = wizard.get_preview_prompts(shot_ids)

        if not previews:
            print("No shots found to preview.")
            return 1

        print(f"Showing prompts for {len(previews)} shots:\n")

        for shot_id, prompt in previews.items():
            print(f"🎬 {shot_id}:")
            print(f"   {prompt}")
            print()

        print("💡 Use these prompts without --preview to generate actual images")
        print("💡 You can modify style/quality parameters to change prompt generation")

        return 0

    def _display_generation_results(self, results, project_path: Path) -> int:
        """Display generation results and return exit code."""
        print(f"\n📊 Generation Results")
        print("=" * 50)

        successful = len([r for r in results if r.success])
        failed = len([r for r in results if not r.success])
        total_time = sum(r.generation_time for r in results)
        avg_time = total_time / len(results) if results else 0

        print(f"Total shots processed: {len(results)}")
        print(f"Successful generations: {successful}")
        print(f"Failed generations: {failed}")
        print(f"Total time: {total_time:.2f} seconds")
        print(f"Average time per shot: {avg_time:.2f} seconds")

        if successful > 0:
            self.print_success(f"{successful} reference images generated successfully!")

            # Show output location
            output_dir = project_path / "shot_references"
            print(f"📁 Images saved to: {output_dir}")

            # Show summary file
            summary_file = project_path / "shot_references_summary.json"
            if summary_file.exists():
                print(f"📋 Generation summary: {summary_file}")

        if failed > 0:
            print(f"\n❌ Failed generations ({failed}):")
            for result in results:
                if not result.success:
                    error_msg = result.error_message or "Unknown error"
                    print(f"   • {result.shot_id}: {error_msg}")

        # Show next steps
        if successful > 0:
            print(f"\n🚀 Next steps:")
            print(f"   • View reference images in your sequence editor")
            print(f"   • Use images for shot visualization and planning")
            print(f"   • Re-run with different styles for variations")
            print(f"   • Integrate with video editing software")

        return 0 if successful > 0 else 1