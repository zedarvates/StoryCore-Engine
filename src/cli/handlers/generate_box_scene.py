"""
Generate Box Scene command handler - Generate simple 3D layout scripts for Blender.
"""

import argparse
from pathlib import Path
from ..base import BaseHandler
from ..errors import UserError, SystemError

class GenerateBoxSceneHandler(BaseHandler):
    """Handler for the generate-box-scene command."""
    
    command_name = "generate-box-scene"
    description = "Generate a Blender script for a simple 3D box layout (room, corridor)"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up generate-box-scene command arguments."""
        parser.add_argument(
            "--scene-type",
            choices=["room", "corridor"],
            default="room",
            help="Type of scene to generate (default: room)"
        )
        parser.add_argument(
            "--name",
            type=str,
            default="location",
            help="Name of the generated object"
        )
        parser.add_argument(
            "--dimensions",
            type=float,
            nargs=3,
            default=[5.0, 2.5, 5.0],
            help="Dimensions [width, height, depth] (default: 5.0 2.5 5.0)"
        )
        parser.add_argument(
            "--width",
            type=float,
            default=5.0,
            help="Width of the space (default: 5.0)"
        )
        parser.add_argument(
            "--depth",
            type=float,
            default=5.0,
            help="Depth of the space (default: 5.0)"
        )
        parser.add_argument(
            "--height",
            type=float,
            default=2.5,
            help="Height of the ceiling (default: 2.5)"
        )

    def execute(self, args: argparse.Namespace) -> int:
        """Execute the generate-box-scene command."""
        try:
            # Check if dimensions was provided as a list (API might send it so)
            if hasattr(args, 'dimensions') and args.dimensions and len(args.dimensions) == 3:
                # [width, height, depth] based on common convention
                width, height, depth = args.dimensions
            else:
                width, height, depth = getattr(args, 'width', 5.0), getattr(args, 'height', 2.5), getattr(args, 'depth', 5.0)
                
            from blender_bridge.box_scene_generator import BoxSceneGenerator
            
            # Using get_blender_script which is available in the current implementation
            script = BoxSceneGenerator.get_blender_script(
                scene_type=args.scene_type,
                width=width,
                depth=depth,
                height=height
            )
            
            # Print the script to stdout
            print(script)
            
            # Optionally store the last output for the API to pick it up later in cli_api.py
            self.last_output = script
            
            return 0
            
        except Exception as e:
            return self.handle_error(e, "box scene generation")
