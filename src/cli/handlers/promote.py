"""
Promote command handler - Upscale and enhance panels.
"""

import argparse
from pathlib import Path

from ..base import BaseHandler
from ..errors import UserError, SystemError
from ..memory_integration import log_panel_promotion


class PromoteHandler(BaseHandler):
    """Handler for the promote command - panel promotion and upscaling."""
    
    command_name = "promote"
    description = "Promote panels with upscaling and enhancement"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up promote command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )
        
        parser.add_argument(
            "--scale",
            type=int,
            default=2,
            help="Scale factor for upscaling (default: 2)"
        )
        
        parser.add_argument(
            "--method",
            default="lanczos",
            choices=["lanczos", "bicubic", "bilinear", "nearest"],
            help="Upscaling method (default: lanczos)"
        )
        
        # ComfyUI integration flags (Validates: Requirements 1.4, 11.7)
        parser.add_argument(
            "--mock",
            action="store_true",
            help="Force mock mode (disable real backend generation)"
        )
        
        parser.add_argument(
            "--backend-url",
            type=str,
            help="Override ComfyUI backend URL (default: http://localhost:8000)"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the promote command."""
        try:
            # Import promotion engine
            try:
                from promotion_engine import promote_panels, update_project_manifest
            except ImportError as e:
                raise SystemError(
                    f"PromotionEngine not available: {e}",
                    "Ensure promotion_engine module is installed"
                )
            
            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )
            
            # Validate scale factor
            if args.scale <= 0:
                raise UserError(
                    f"Invalid scale factor: {args.scale}",
                    "Scale factor must be a positive integer"
                )
            
            if args.scale > 4:
                self.print_warning(f"Large scale factor ({args.scale}x) may result in very large files")
            
            # Display promotion info
            print(f"Promoting panels in project: {project_path.absolute()}")
            print(f"Scale factor: {args.scale}x")
            print(f"Method: {args.method}")
            
            # Show backend mode
            if args.mock:
                print(f"Backend mode: Mock (forced)")
            elif args.backend_url:
                print(f"Backend URL: {args.backend_url}")
            else:
                print(f"Backend mode: Auto (will use ComfyUI if available)")
            
            # Promote panels
            # Pass backend configuration if provided
            backend_config = {}
            if args.mock:
                backend_config['force_mock'] = True
            if args.backend_url:
                backend_config['backend_url'] = args.backend_url
            
            result = promote_panels(project_path, args.scale, args.method, **backend_config)
            
            # Log to memory system if enabled
            log_panel_promotion(
                project_path=project_path,
                panel_count=result['metadata']['total_panels'],
                scale_factor=args.scale,
                method=args.method,
                output_dir=str(result['output_dir'])
            )
            
            # Display success message
            self.print_success(f"Promoted {result['metadata']['total_panels']} panels successfully")
            
            # Show resolution changes
            for i, (original, promoted) in enumerate(result['resolutions'], 1):
                print(f"  Panel {i:02d}: {original[0]}x{original[1]} -> {promoted[0]}x{promoted[1]}")
            
            print(f"  Output directory: {result['output_dir']}")
            
            # Update project manifest
            update_project_manifest(project_path, result['metadata'])
            print(f"  Updated project.json asset manifest")
            print(f"  Project status: promoted")
            
            return 0
            
        except Exception as e:
            return self.handle_error(e, "panel promotion")
