"""
Generate Video command handler - Generate videos using ComfyUI.
"""

import argparse
from pathlib import Path

from ..base import BaseHandler
from ..errors import UserError, SystemError


class GenerateVideoHandler(BaseHandler):
    """Handler for the generate-video command - video generation."""
    
    command_name = "generate-video"
    description = "Generate videos using ComfyUI backend"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up generate-video command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )
        
        parser.add_argument(
            "--workflow",
            help="ComfyUI workflow file to use for video generation"
        )
        
        parser.add_argument(
            "--shots",
            nargs="+",
            help="Specific shot IDs to generate (default: all)"
        )
        
        parser.add_argument(
            "--comfyui-url",
            default="http://127.0.0.1:8188",
            help="ComfyUI server URL (default: http://127.0.0.1:8188)"
        )
        
        parser.add_argument(
            "--mock",
            action="store_true",
            help="Use mock mode for testing without ComfyUI"
        )
        
        parser.add_argument(
            "--fps",
            type=int,
            default=24,
            help="Frames per second (default: 24)"
        )
        
        parser.add_argument(
            "--duration",
            type=float,
            help="Video duration in seconds (optional)"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the generate-video command."""
        try:
            # Import ComfyUI video engine
            try:
                from comfyui_video_engine import ComfyUIVideoEngine
            except ImportError as e:
                raise SystemError(
                    f"ComfyUIVideoEngine not available: {e}",
                    "Ensure comfyui_video_engine module is installed"
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
            
            print(f"Generating videos for project: {project_path.absolute()}")
            print(f"ComfyUI URL: {args.comfyui_url}")
            print(f"FPS: {args.fps}")
            
            if args.mock:
                print("Running in MOCK mode (no actual generation)")
            
            if args.shots:
                print(f"Generating specific shots: {', '.join(args.shots)}")
            else:
                print("Generating all shots")
            
            # Initialize engine
            engine = ComfyUIVideoEngine(
                comfyui_url=args.comfyui_url,
                mock_mode=args.mock
            )
            
            # Generate videos
            result = engine.generate_videos(
                project_path,
                workflow_file=args.workflow,
                shot_ids=args.shots,
                fps=args.fps,
                duration=args.duration
            )
            
            # Display results
            self.print_success("Video generation completed")
            print(f"  Total videos generated: {result['total_generated']}")
            print(f"  Successful: {result['successful']}")
            print(f"  Failed: {result['failed']}")
            print(f"  Total duration: {result['total_duration']:.1f} seconds")
            print(f"  Processing time: {result['processing_time']:.1f} seconds")
            
            # Show generation details
            if result.get('generated_videos'):
                print(f"\n  Generated videos:")
                for video in result['generated_videos'][:5]:
                    print(f"    {video['shot_id']}: {video['path']} ({video['duration']:.1f}s)")
                
                if len(result['generated_videos']) > 5:
                    remaining = len(result['generated_videos']) - 5
                    print(f"    ... and {remaining} more videos")
            
            # Show failures
            if result.get('failures'):
                print(f"\n  Failed generations:")
                for failure in result['failures']:
                    print(f"    {failure['shot_id']}: {failure['error']}")
            
            print(f"\n  Videos saved to: assets/video/generated/")
            print(f"  Updated project.json with generation metadata")
            
            return 0 if result['failed'] == 0 else 1
            
        except Exception as e:
            return self.handle_error(e, "video generation")
