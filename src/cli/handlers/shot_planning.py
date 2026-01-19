"""
Shot Planning command handler - Process shot planning with cinematic grammar.
"""

import argparse
from pathlib import Path

from ..base import BaseHandler
from ..errors import UserError, SystemError


class ShotPlanningHandler(BaseHandler):
    """Handler for the shot-planning command - shot planning processing."""
    
    command_name = "shot-planning"
    description = "Process shot planning with cinematic grammar analysis"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up shot-planning command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )
        
        parser.add_argument(
            "--style",
            choices=["cinematic", "documentary", "action", "drama"],
            default="cinematic",
            help="Cinematic style (default: cinematic)"
        )
        
        parser.add_argument(
            "--analyze-grammar",
            action="store_true",
            help="Analyze cinematic grammar and shot composition"
        )
        
        parser.add_argument(
            "--camera-specs",
            action="store_true",
            help="Generate detailed camera specifications"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the shot-planning command."""
        try:
            # Import shot engine
            try:
                from shot_engine import ShotEngine
            except ImportError as e:
                raise SystemError(
                    f"ShotEngine not available: {e}",
                    "Ensure shot_engine module is installed"
                )
            
            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )
            
            print(f"Processing shot planning for project: {project_path.absolute()}")
            print(f"Cinematic style: {args.style}")
            
            # Process shot planning
            engine = ShotEngine()
            result = engine.process_shot_planning(project_path)
            
            # Display results
            self.print_success("Shot planning processing completed")
            print(f"  Planning ID: {result['shot_planning_id']}")
            print(f"  Total shots: {result['processing_metadata']['total_shots']}")
            print(f"  Average shot duration: {result['processing_metadata']['average_shot_duration']:.1f} seconds")
            print(f"  Shot variety score: {result['processing_metadata']['shot_variety_score']:.1f}/5.0")
            print(f"  Camera complexity: {result['processing_metadata']['camera_complexity_score']:.1f}/5.0")
            
            # Show cinematic grammar analysis
            if result.get('cinematic_grammar'):
                grammar = result['cinematic_grammar']
                print(f"\n  Cinematic grammar analysis:")
                print(f"    Style: {grammar['cinematic_style']}")
                print(f"    Coverage complete: {grammar['coverage_completeness']['coverage_complete']}")
                print(f"    Visual rhythm: {grammar['visual_rhythm']['rhythm']} ({grammar['visual_rhythm']['tempo']} tempo)")
            
            # Show shot type distribution
            if result.get('cinematic_grammar', {}).get('shot_type_distribution'):
                print(f"\n  Shot type distribution:")
                for shot_type, percentage in result['cinematic_grammar']['shot_type_distribution'].items():
                    print(f"    {shot_type}: {percentage:.1f}%")
            
            # Show camera specifications
            if args.camera_specs and result.get('camera_specifications'):
                specs = result['camera_specifications']
                print(f"\n  Camera requirements:")
                print(f"    Movement complexity: {specs['movement_requirements']['complexity_level']}")
                print(f"    Primary lens: {specs['lens_requirements']['primary_lens']}")
                print(f"    Equipment needed: {', '.join(specs['movement_requirements']['equipment_needed'])}")
            
            print(f"\n  Shot planning saved: shot_planning.json")
            print(f"  Updated project.json with shot planning results")
            
            return 0
            
        except Exception as e:
            return self.handle_error(e, "shot planning processing")
