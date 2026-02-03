"""
Generate Audio command handler - Generate audio using ComfyUI.
"""

import argparse
from pathlib import Path

from ..base import BaseHandler
from ..errors import UserError, SystemError


class GenerateAudioHandler(BaseHandler):
    """Handler for the generate-audio command - audio generation."""
    
    command_name = "generate-audio"
    description = "Generate audio using ComfyUI backend"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up generate-audio command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )
        
        parser.add_argument(
            "--workflow",
            help="ComfyUI workflow file to use for audio generation"
        )
        
        parser.add_argument(
            "--type",
            choices=["dialogue", "music", "sfx", "ambience"],
            default="dialogue",
            help="Audio type to generate (default: dialogue)"
        )
        
        parser.add_argument(
            "--shots",
            nargs="+",
            help="Specific shot IDs to generate audio for (default: all)"
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
            "--voice",
            help="Voice ID or name for dialogue generation"
        )
        
        parser.add_argument(
            "--music-style",
            help="Music style for music generation"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the generate-audio command."""
        try:
            # Import ComfyUI audio engine
            try:
                from comfyui_audio_engine import ComfyUIAudioEngine
            except ImportError as e:
                raise SystemError(
                    f"ComfyUIAudioEngine not available: {e}",
                    "Ensure comfyui_audio_engine module is installed"
                )
            
            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )
            
            print(f"Generating audio for project: {project_path.absolute()}")
            print(f"Audio type: {args.type}")
            print(f"ComfyUI URL: {args.comfyui_url}")
            
            if args.mock:
                print("Running in MOCK mode (no actual generation)")
            
            if args.shots:
                print(f"Generating audio for specific shots: {', '.join(args.shots)}")
            else:
                print("Generating audio for all shots")
            
            # Show type-specific options
            if args.type == "dialogue" and args.voice:
                print(f"Voice: {args.voice}")
            elif args.type == "music" and args.music_style:
                print(f"Music style: {args.music_style}")
            
            # Initialize engine
            engine = ComfyUIAudioEngine(
                comfyui_url=args.comfyui_url,
                mock_mode=args.mock
            )
            
            # Generate audio
            result = engine.generate_audio(
                project_path,
                audio_type=args.type,
                workflow_file=args.workflow,
                shot_ids=args.shots,
                voice=args.voice,
                music_style=args.music_style
            )
            
            # Display results
            self.print_success("Audio generation completed")
            print(f"  Total audio files generated: {result['total_generated']}")
            print(f"  Successful: {result['successful']}")
            print(f"  Failed: {result['failed']}")
            print(f"  Total duration: {result['total_duration']:.1f} seconds")
            print(f"  Processing time: {result['processing_time']:.1f} seconds")
            
            # Index generated assets in memory system
            if result.get('generated_audio'):
                from ..memory_integration import index_generated_assets
                
                # Extract asset paths
                asset_paths = [audio['path'] for audio in result['generated_audio']]
                
                # Index assets with context
                indexed = index_generated_assets(
                    project_path=project_path,
                    asset_paths=asset_paths,
                    asset_type="audio",
                    generation_context={
                        "audio_type": args.type,
                        "workflow": args.workflow,
                        "comfyui_url": args.comfyui_url,
                        "voice": args.voice,
                        "music_style": args.music_style,
                        "mock_mode": args.mock
                    }
                )
                
                if indexed:
                    print(f"  Indexed {len(asset_paths)} audio files in memory system")
            
            # Show generation details
            if result.get('generated_audio'):
                print(f"\n  Generated audio files:")
                for audio in result['generated_audio'][:5]:
                    print(f"    {audio['shot_id']}: {audio['path']} ({audio['duration']:.1f}s)")
                
                if len(result['generated_audio']) > 5:
                    remaining = len(result['generated_audio']) - 5
                    print(f"    ... and {remaining} more audio files")
            
            # Show failures
            if result.get('failures'):
                print(f"\n  Failed generations:")
                for failure in result['failures']:
                    print(f"    {failure['shot_id']}: {failure['error']}")
            
            print(f"\n  Audio files saved to: assets/audio/generated/")
            print(f"  Updated project.json with generation metadata")
            
            return 0 if result['failed'] == 0 else 1
            
        except Exception as e:
            return self.handle_error(e, "audio generation")
