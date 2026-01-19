"""
Narrative command handler - Process narrative and style consistency.
"""

import argparse
from pathlib import Path

from ..base import BaseHandler
from ..errors import UserError, SystemError


class NarrativeHandler(BaseHandler):
    """Handler for the narrative command - narrative processing."""
    
    command_name = "narrative"
    description = "Process narrative and ensure style consistency"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up narrative command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )
        
        parser.add_argument(
            "--extract-style",
            action="store_true",
            help="Extract global style from storyboard"
        )
        
        parser.add_argument(
            "--check-consistency",
            action="store_true",
            help="Check for style consistency issues"
        )
        
        parser.add_argument(
            "--augment",
            action="store_true",
            help="Augment prompts with style consistency"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the narrative command."""
        try:
            # Import narrative engine
            try:
                from narrative_engine import NarrativeEngine
            except ImportError as e:
                raise SystemError(
                    f"NarrativeEngine not available: {e}",
                    "Ensure narrative_engine module is installed"
                )
            
            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )
            
            print(f"Processing narrative for project: {project_path.absolute()}")
            
            # Process narrative
            engine = NarrativeEngine()
            result = engine.process_storyboard(project_path)
            
            # Display results
            self.print_success("Narrative processing completed")
            print(f"  Shots processed: {result['shots_processed']}")
            
            # Show global style if extracted
            if result.get('global_style'):
                print(f"\n  Global style extracted:")
                for category, value in result['global_style'].items():
                    print(f"    {category.title()}: {value}")
            
            # Show consistency issues
            if result.get('consistency_issues'):
                issue_count = len(result['consistency_issues'])
                print(f"\n  Consistency issues found: {issue_count}")
                
                # Show first few issues
                for issue in result['consistency_issues'][:3]:
                    print(f"    - {issue['description']}")
                
                if issue_count > 3:
                    print(f"    ... and {issue_count - 3} more issues")
            else:
                print(f"\n  No consistency issues found")
            
            # Show augmentation status
            if result.get('augmented_prompts'):
                print(f"\n  Augmented {len(result['augmented_prompts'])} prompts with style consistency")
            
            print(f"\n  Updated storyboard.json with augmented prompts")
            print(f"  Updated project.json with global style metadata")
            
            return 0
            
        except Exception as e:
            return self.handle_error(e, "narrative processing")
