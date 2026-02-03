"""
Grid command handler - Generate master coherence sheets (grids).
"""

import argparse
from pathlib import Path

from ..base import BaseHandler
from ..errors import UserError, SystemError
from ..memory_integration import log_grid_generation


class GridHandler(BaseHandler):
    """Handler for the grid command - master coherence sheet generation."""
    
    command_name = "grid"
    description = "Generate grid and slice into panels"
    
    # Supported grid specifications
    SUPPORTED_GRIDS = ["3x3", "1x2", "1x4"]
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up grid command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )
        
        parser.add_argument(
            "--grid",
            default="3x3",
            choices=self.SUPPORTED_GRIDS,
            help="Grid specification (default: 3x3)"
        )
        
        parser.add_argument(
            "--out",
            help="Output path for grid image (optional)"
        )
        
        parser.add_argument(
            "--cell-size",
            type=int,
            default=512,
            help="Cell size in pixels (default: 512)"
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
        """Execute the grid command."""
        try:
            # Import grid generator
            try:
                from grid_generator import GridGenerator
            except ImportError as e:
                raise SystemError(
                    f"GridGenerator not available: {e}",
                    "Ensure grid_generator module is installed"
                )
            
            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )
            
            # Validate grid specification
            if args.grid not in self.SUPPORTED_GRIDS:
                raise UserError(
                    f"Unsupported grid specification: {args.grid}",
                    f"Supported grids: {', '.join(self.SUPPORTED_GRIDS)}"
                )
            
            # Validate cell size
            if args.cell_size <= 0:
                raise UserError(
                    f"Invalid cell size: {args.cell_size}",
                    "Cell size must be a positive integer"
                )
            
            # Display generation info
            print(f"Generating {args.grid} grid for project: {project_path.absolute()}")
            print(f"Cell size: {args.cell_size}px")
            
            # Show backend mode
            if args.mock:
                print(f"Backend mode: Mock (forced)")
            elif args.backend_url:
                print(f"Backend URL: {args.backend_url}")
            else:
                print(f"Backend mode: Auto (will use ComfyUI if available)")
            
            # Show cell dimensions for non-square grids
            if args.grid in ["1x2", "1x4"]:
                cell_width = round(args.cell_size * 16 / 9)
                print(f"Cell dimensions: {cell_width}x{args.cell_size}px (16:9 aspect)")
            
            # Generate grid
            generator = GridGenerator()
            
            # Pass backend configuration if provided
            backend_config = {}
            if args.mock:
                backend_config['force_mock'] = True
            if args.backend_url:
                backend_config['backend_url'] = args.backend_url
            
            grid_path = generator.generate_grid(
                str(project_path),
                args.grid,
                args.out,
                args.cell_size,
                **backend_config
            )
            
            # Calculate number of panels
            cols, rows = map(int, args.grid.split('x'))
            total_panels = cols * rows
            
            # Log to memory system if enabled
            log_grid_generation(
                project_path=project_path,
                grid_spec=args.grid,
                grid_path=str(grid_path),
                panel_count=total_panels,
                cell_size=args.cell_size
            )
            
            # Display success message
            self.print_success("Grid generated successfully")
            print(f"  Grid: {grid_path}")
            print(f"  Panels: assets/images/panels/panel_01.ppm ... panel_{total_panels:02d}.ppm")
            print(f"  Updated project.json asset manifest")
            
            return 0
            
        except Exception as e:
            return self.handle_error(e, "grid generation")
