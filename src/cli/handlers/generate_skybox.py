"""
Generate Skybox command handler - Generate 360-degree environment textures using ComfyUI.
"""

import argparse
from pathlib import Path
from ..base import BaseHandler
from ..errors import UserError, SystemError

class GenerateSkyboxHandler(BaseHandler):
    """Handler for the generate-skybox command."""
    
    command_name = "generate-skybox"
    description = "Generate a seamless 360-degree skybox texture via ComfyUI"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up generate-skybox command arguments."""
        parser.add_argument(
            "--prompt",
            required=True,
            help="Prompt describing the environment"
        )
        parser.add_argument(
            "--style",
            default="realistic",
            help="Style of the skybox (e.g., realistic, anime, sci-fi)"
        )
        parser.add_argument(
            "--output-dir",
            default="assets/skyboxes",
            help="Directory to save the generated skybox (default: assets/skyboxes)"
        )

    def execute(self, args: argparse.Namespace) -> int:
        """Execute the generate-skybox command."""
        try:
            from blender_bridge.skybox_generator import SkyboxGenerator
            import asyncio
            
            generator = SkyboxGenerator(output_dir=args.output_dir)
            
            print(f"Generating skybox with prompt: {args.prompt}")
            
            # Use generate_skybox which is the actual method name in skybox_generator.py
            result_path = generator.generate_skybox(
                prompt=args.prompt,
                style=args.style
            )
            
            if result_path and Path(result_path).exists():
                self.print_success(f"Skybox generated successfully: {result_path}")
                print(result_path) # Output for backend capture
                return 0
            else:
                self.print_error("Failed to generate skybox. Check if ComfyUI is running.")
                return 1
            
        except Exception as e:
            return self.handle_error(e, "skybox generation")
