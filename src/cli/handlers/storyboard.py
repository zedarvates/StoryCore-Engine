"""
Storyboard command handler - Generate and manage storyboards.
"""

import argparse
from pathlib import Path

from ..base import BaseHandler
from ..errors import UserError, SystemError


class StoryboardHandler(BaseHandler):
    """Handler for the storyboard command - storyboard generation."""
    
    command_name = "storyboard"
    description = "Generate and manage project storyboards"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up storyboard command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )
        
        parser.add_argument(
            "--generate",
            action="store_true",
            help="Generate new storyboard from script"
        )
        
        parser.add_argument(
            "--update",
            action="store_true",
            help="Update existing storyboard"
        )
        
        parser.add_argument(
            "--validate",
            action="store_true",
            help="Validate storyboard structure"
        )
        
        parser.add_argument(
            "--shots",
            type=int,
            help="Number of shots to generate (optional)"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the storyboard command."""
        try:
            # Import storyboard engine
            try:
                from storyboard_engine import StoryboardEngine
            except ImportError as e:
                raise SystemError(
                    f"StoryboardEngine not available: {e}",
                    "Ensure storyboard_engine module is installed"
                )
            
            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )
            
            print(f"Processing storyboard for project: {project_path.absolute()}")
            
            # Determine operation
            if args.generate:
                return self._generate_storyboard(project_path, args)
            elif args.update:
                return self._update_storyboard(project_path, args)
            elif args.validate:
                return self._validate_storyboard(project_path, args)
            else:
                # Default: show storyboard info
                return self._show_storyboard_info(project_path, args)
            
        except Exception as e:
            return self.handle_error(e, "storyboard processing")
    
    def _generate_storyboard(self, project_path: Path, args: argparse.Namespace) -> int:
        """Generate new storyboard."""
        from storyboard_engine import StoryboardEngine
        
        print("Generating new storyboard...")
        
        engine = StoryboardEngine()
        result = engine.generate_storyboard(project_path, num_shots=args.shots)
        
        self.print_success("Storyboard generated successfully")
        print(f"  Total shots: {result['total_shots']}")
        print(f"  Storyboard saved: storyboard.json")
        
        return 0
    
    def _update_storyboard(self, project_path: Path, args: argparse.Namespace) -> int:
        """Update existing storyboard."""
        from storyboard_engine import StoryboardEngine
        
        print("Updating storyboard...")
        
        engine = StoryboardEngine()
        result = engine.update_storyboard(project_path)
        
        self.print_success("Storyboard updated successfully")
        print(f"  Updated shots: {result['updated_shots']}")
        
        return 0
    
    def _validate_storyboard(self, project_path: Path, args: argparse.Namespace) -> int:
        """Validate storyboard structure."""
        from storyboard_engine import StoryboardEngine
        
        print("Validating storyboard...")
        
        engine = StoryboardEngine()
        result = engine.validate_storyboard(project_path)
        
        if result['valid']:
            self.print_success("Storyboard is valid")
            return 0
        else:
            self.print_error(f"Storyboard validation failed: {len(result['errors'])} errors")
            for error in result['errors']:
                print(f"  - {error}")
            return 1
    
    def _show_storyboard_info(self, project_path: Path, args: argparse.Namespace) -> int:
        """Show storyboard information."""
        storyboard_file = project_path / "storyboard.json"
        
        if not storyboard_file.exists():
            self.print_error("No storyboard found")
            print("  Generate one with: storycore storyboard --generate")
            return 1
        
        # Load and display storyboard info
        import json
        with open(storyboard_file, 'r') as f:
            storyboard = json.load(f)
        
        print(f"Storyboard information:")
        print(f"  Total shots: {len(storyboard.get('shots', []))}")
        print(f"  Project: {storyboard.get('project_name', 'Unknown')}")
        
        return 0
