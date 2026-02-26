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
            from blender_bridge.box_scene_generator import BoxSceneGenerator
            
            generator = BoxSceneGenerator()
            
            if args.scene_type == "room":
                script = generator.generate_room_script(
                    width=args.width,
                    depth=args.depth,
                    height=args.height
                )
            else:
                script = generator.generate_corridor_script(
                    length=args.depth, # depth is used as length for corridor
                    width=args.width,
                    height=args.height
                )
            
            # Print the script to stdout
            print(script)
            
            return 0
            
        except Exception as e:
            return self.handle_error(e, "box scene generation")
