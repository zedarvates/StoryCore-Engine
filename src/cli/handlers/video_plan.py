"""
Video Plan command handler - Generate video planning with camera movements.
"""

import argparse
from pathlib import Path

from ..base import BaseHandler
from ..errors import UserError, SystemError


class VideoPlanHandler(BaseHandler):
    """Handler for the video-plan command - video planning generation."""
    
    command_name = "video-plan"
    description = "Generate video plan with camera movements and transitions"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up video-plan command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )
        
        parser.add_argument(
            "--duration",
            type=float,
            help="Target video duration in seconds (optional)"
        )
        
        parser.add_argument(
            "--fps",
            type=int,
            default=24,
            help="Frames per second (default: 24)"
        )
        
        parser.add_argument(
            "--style",
            choices=["cinematic", "documentary", "action", "slow"],
            default="cinematic",
            help="Video style preset (default: cinematic)"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the video-plan command."""
        try:
            # Import video plan engine
            try:
                from video_plan_engine import VideoPlanEngine
            except ImportError as e:
                raise SystemError(
                    f"VideoPlanEngine not available: {e}",
                    "Ensure video_plan_engine module is installed"
                )
            
            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )
            
            # Validate FPS
            if args.fps <= 0:
                raise UserError(
                    f"Invalid FPS value: {args.fps}",
                    "FPS must be a positive integer"
                )
            
            print(f"Generating video plan for project: {project_path.absolute()}")
            
            if args.duration:
                print(f"Target duration: {args.duration:.1f} seconds")
            
            print(f"FPS: {args.fps}")
            print(f"Style: {args.style}")
            
            # Generate video plan
            engine = VideoPlanEngine()
            result = engine.generate_video_plan(project_path)
            
            # Display results
            self.print_success("Video plan generated successfully")
            print(f"  Total shots: {result['total_shots']}")
            print(f"  Total duration: {result['total_duration']:.1f} seconds")
            
            # Show camera movement summary
            if result.get('camera_movements'):
                print(f"\n  Camera movements:")
                for movement, count in result['camera_movements'].items():
                    print(f"    {movement}: {count} shot(s)")
            
            # Show transition summary
            if result.get('transitions'):
                print(f"\n  Transitions:")
                for transition, count in result['transitions'].items():
                    print(f"    {transition}: {count} transition(s)")
            
            print(f"\n  Video plan saved: video_plan.json")
            print(f"  Updated project.json manifest")
            
            return 0
            
        except Exception as e:
            return self.handle_error(e, "video plan generation")
