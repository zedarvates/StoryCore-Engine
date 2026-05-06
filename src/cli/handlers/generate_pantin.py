"""
Generate Pantin command handler - Generate 3D character placeholder scripts for Blender.
"""

import argparse
from pathlib import Path
from ..base import BaseHandler


class GeneratePantinHandler(BaseHandler):
    """Handler for the generate-pantin command."""

    command_name = "generate-pantin"
    description = "Generate a Blender script for a 3D character placeholder (pantin)"

    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up generate-pantin command arguments."""
        parser.add_argument(
            "--character-name", required=True, help="Name of the character"
        )
        parser.add_argument(
            "--height",
            type=float,
            default=1.75,
            help="Height of the character in meters (default: 1.75)",
        )
        parser.add_argument(
            "--color",
            nargs=3,
            type=float,
            default=[0.5, 0.5, 0.5],
            help="RGB color for the material (default: 0.5 0.5 0.5)",
        )
        parser.add_argument(
            "--output-path", help="Path to save the generated Blender script"
        )

    def execute(self, args: argparse.Namespace) -> int:
        """Execute the generate-pantin command."""
        try:
            from blender_bridge.rig_generator import RigGenerator

            generator = RigGenerator()
            script = generator.generate_pantin_script(
                character_name=args.character_name,
                height=args.height,
                color=tuple(args.color),
            )

            if args.output_path:
                output_path = Path(args.output_path)
                output_path.parent.mkdir(parents=True, exist_ok=True)
                output_path.write_text(script, encoding="utf-8")
                self.print_success(f"Blender script saved to {output_path}")

            # Print the script to stdout for the backend to capture if needed
            print(script)

            return 0

        except Exception as e:
            return self.handle_error(e, "pantin generation")
