"""
World Generate command handler - Generate world and environment settings.
"""

import argparse
from pathlib import Path

from ..base import BaseHandler
from ..errors import UserError, SystemError


class WorldGenerateHandler(BaseHandler):
    """Handler for the world-generate command - world generation."""
    
    command_name = "world-generate"
    description = "Generate world and environment settings"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up world-generate command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )
        
        parser.add_argument(
            "--genre",
            choices=["fantasy", "sci-fi", "modern", "historical", "post-apocalyptic"],
            default="fantasy",
            help="World genre (default: fantasy)"
        )
        
        parser.add_argument(
            "--scale",
            choices=["small", "medium", "large", "epic"],
            default="medium",
            help="World scale (default: medium)"
        )
        
        parser.add_argument(
            "--locations",
            type=int,
            help="Number of locations to generate (optional)"
        )
        
        parser.add_argument(
            "--interactive",
            action="store_true",
            help="Use interactive world building wizard"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the world-generate command."""
        try:
            # Import world generator
            try:
                from world_generator import WorldGenerator
            except ImportError as e:
                raise SystemError(
                    f"WorldGenerator not available: {e}",
                    "Ensure world_generator module is installed"
                )
            
            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )
            
            print(f"Generating world for project: {project_path.absolute()}")
            print(f"Genre: {args.genre}")
            print(f"Scale: {args.scale}")
            
            # Initialize generator
            generator = WorldGenerator()
            
            # Generate world
            if args.interactive:
                result = generator.interactive_world_generation(project_path)
            else:
                result = generator.generate_world(
                    project_path,
                    genre=args.genre,
                    scale=args.scale,
                    num_locations=args.locations
                )
            
            # Display results
            self.print_success("World generation completed")
            print(f"  World ID: {result['world_id']}")
            print(f"  World name: {result['world_name']}")
            print(f"  Genre: {result['genre']}")
            print(f"  Scale: {result['scale']}")
            print(f"  Locations generated: {result['total_locations']}")
            
            # Show location summary
            if result.get('locations'):
                print(f"\n  Generated locations:")
                for location in result['locations'][:5]:
                    print(f"    - {location['name']} ({location['type']})")
                
                if len(result['locations']) > 5:
                    remaining = len(result['locations']) - 5
                    print(f"    ... and {remaining} more locations")
            
            # Show world features
            if result.get('world_features'):
                print(f"\n  World features:")
                for feature, value in result['world_features'].items():
                    print(f"    {feature.replace('_', ' ').title()}: {value}")
            
            print(f"\n  World data saved: world.json")
            print(f"  Updated project.json with world metadata")
            
            return 0
            
        except Exception as e:
            return self.handle_error(e, "world generation")
