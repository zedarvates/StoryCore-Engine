"""
Generate Images command handler - Generate images using ComfyUI.
"""

import argparse
from pathlib import Path

from ..base import BaseHandler
from ..errors import UserError, SystemError


class GenerateImagesHandler(BaseHandler):
    """Handler for the generate-images command - image generation."""
    
    command_name = "generate-images"
    description = "Generate images using ComfyUI backend"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up generate-images command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )
        
        parser.add_argument(
            "--workflow",
            help="ComfyUI workflow file to use"
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
            "--batch-size",
            type=int,
            default=1,
            help="Number of images to generate in parallel (default: 1)"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the generate-images command."""
        try:
            # Import ComfyUI image engine
            try:
                from comfyui_image_engine import ComfyUIImageEngine
            except ImportError as e:
                raise SystemError(
                    f"ComfyUIImageEngine not available: {e}",
                    "Ensure comfyui_image_engine module is installed"
                )
            
            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )
            
            # Validate batch size
            if args.batch_size <= 0:
                raise UserError(
                    f"Invalid batch size: {args.batch_size}",
                    "Batch size must be a positive integer"
                )
            
            print(f"Generating images for project: {project_path.absolute()}")
            print(f"ComfyUI URL: {args.comfyui_url}")
            
            if args.mock:
                print("Running in MOCK mode (no actual generation)")
            
            if args.shots:
                print(f"Generating specific shots: {', '.join(args.shots)}")
            else:
                print("Generating all shots")
            
            # Initialize engine
            engine = ComfyUIImageEngine(
                comfyui_url=args.comfyui_url,
                mock_mode=args.mock
            )
            
            # Generate images
            result = engine.generate_images(
                project_path,
                workflow_file=args.workflow,
                shot_ids=args.shots,
                batch_size=args.batch_size
            )
            
            # Display results
            self.print_success("Image generation completed")
            print(f"  Total images generated: {result['total_generated']}")
            print(f"  Successful: {result['successful']}")
            print(f"  Failed: {result['failed']}")
            print(f"  Processing time: {result['processing_time']:.1f} seconds")
            
            # Index generated assets in memory system
            if result.get('generated_images'):
                from ..memory_integration import index_generated_assets
                
                # Extract asset paths
                asset_paths = [img['path'] for img in result['generated_images']]
                
                # Index assets with context
                indexed = index_generated_assets(
                    project_path=project_path,
                    asset_paths=asset_paths,
                    asset_type="image",
                    generation_context={
                        "workflow": args.workflow,
                        "comfyui_url": args.comfyui_url,
                        "batch_size": args.batch_size,
                        "mock_mode": args.mock
                    }
                )
                
                if indexed:
                    print(f"  Indexed {len(asset_paths)} images in memory system")
            
            # Show generation details
            if result.get('generated_images'):
                print(f"\n  Generated images:")
                for img in result['generated_images'][:5]:
                    print(f"    {img['shot_id']}: {img['path']}")
                
                if len(result['generated_images']) > 5:
                    remaining = len(result['generated_images']) - 5
                    print(f"    ... and {remaining} more images")
            
            # Show failures
            if result.get('failures'):
                print(f"\n  Failed generations:")
                for failure in result['failures']:
                    print(f"    {failure['shot_id']}: {failure['error']}")
            
            print(f"\n  Images saved to: assets/images/generated/")
            print(f"  Updated project.json with generation metadata")
            
            return 0 if result['failed'] == 0 else 1
            
        except Exception as e:
            return self.handle_error(e, "image generation")
