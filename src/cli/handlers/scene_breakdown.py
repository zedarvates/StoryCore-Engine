"""
Scene Breakdown command handler - Process detailed scene breakdowns.
"""

import argparse
from pathlib import Path

from ..base import BaseHandler
from ..errors import UserError, SystemError


class SceneBreakdownHandler(BaseHandler):
    """Handler for the scene-breakdown command - scene breakdown processing."""
    
    command_name = "scene-breakdown"
    description = "Process detailed scene breakdown with lighting and environment"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up scene-breakdown command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )
        
        parser.add_argument(
            "--analyze-lighting",
            action="store_true",
            help="Analyze lighting requirements for each scene"
        )
        
        parser.add_argument(
            "--analyze-environment",
            action="store_true",
            help="Analyze environment and location details"
        )
        
        parser.add_argument(
            "--extract-beats",
            action="store_true",
            help="Extract key story beats from scenes"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the scene-breakdown command."""
        try:
            # Import scene breakdown engine
            try:
                from scene_breakdown_engine import SceneBreakdownEngine
            except ImportError as e:
                raise SystemError(
                    f"SceneBreakdownEngine not available: {e}",
                    "Ensure scene_breakdown_engine module is installed"
                )
            
            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )
            
            print(f"Processing scene breakdown for project: {project_path.absolute()}")
            
            # Process scene breakdown
            engine = SceneBreakdownEngine()
            result = engine.process_scene_breakdown(project_path)
            
            # Display results
            self.print_success("Scene breakdown processing completed")
            print(f"  Breakdown ID: {result['scene_breakdown_id']}")
            print(f"  Total scenes processed: {result['processing_metadata']['total_scenes_processed']}")
            print(f"  Average complexity: {result['processing_metadata']['average_scene_complexity']:.1f}/5.0")
            print(f"  Lighting consistency: {result['processing_metadata']['lighting_consistency_score']:.1f}/5.0")
            print(f"  Color harmony: {result['processing_metadata']['color_harmony_score']:.1f}/5.0")
            
            # Show detailed scene information
            if result.get('detailed_scenes'):
                print(f"\n  Detailed scene breakdown:")
                for scene in result['detailed_scenes'][:3]:
                    print(f"    {scene['scene_id']}: {scene['title']}")
                    print(f"      Purpose: {scene['scene_purpose']['primary']} ({scene['scene_purpose']['cinematic_function']})")
                    print(f"      Environment: {scene['environment']['type']} at {scene['environment']['time_of_day']}")
                    print(f"      Lighting: {scene['lighting']['primary_light']['type']} ({scene['lighting']['primary_light']['direction']})")
                    print(f"      Characters: {len(scene['characters'])} present")
                    print(f"      Key beats: {len(scene['key_beats'])}")
                
                if len(result['detailed_scenes']) > 3:
                    remaining = len(result['detailed_scenes']) - 3
                    print(f"    ... and {remaining} more scenes")
            
            # Show global cinematic rules
            if result.get('global_cinematic_rules'):
                print(f"\n  Global cinematic rules established:")
                rules = result['global_cinematic_rules']
                print(f"    Visual consistency: {rules['visual_consistency']['style_anchor']}")
                print(f"    Color harmony: {rules['visual_consistency']['color_harmony']}")
                print(f"    Lighting logic: {rules['visual_consistency']['lighting_logic']}")
            
            print(f"\n  Scene breakdown saved: scene_breakdown.json")
            print(f"  Updated project.json with breakdown processing results")
            
            return 0
            
        except Exception as e:
            return self.handle_error(e, "scene breakdown processing")
