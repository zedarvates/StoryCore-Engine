"""
Character Wizard command handler - Interactive character creation wizard.
"""

import argparse
from pathlib import Path

from ..base import BaseHandler
from ..errors import UserError, SystemError


class CharacterWizardHandler(BaseHandler):
    """Handler for the character-wizard command - character creation wizard."""
    
    command_name = "character-wizard"
    description = "Interactive character creation wizard"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up character-wizard command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )
        
        parser.add_argument(
            "--resume",
            help="Resume from saved wizard session"
        )
        
        parser.add_argument(
            "--batch",
            type=int,
            help="Create multiple characters in batch mode"
        )
        
        parser.add_argument(
            "--genre",
            help="Character genre for batch creation"
        )
        
        parser.add_argument(
            "--style",
            help="Art style for batch creation"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the character-wizard command."""
        try:
            # Import character wizard orchestrator
            try:
                from character_wizard import CharacterWizardOrchestrator
            except ImportError as e:
                raise SystemError(
                    f"CharacterWizardOrchestrator not available: {e}",
                    "Ensure character_wizard module is installed"
                )
            
            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )
            
            print(f"Starting Character Wizard for project: {project_path.absolute()}")
            
            # Initialize orchestrator
            orchestrator = CharacterWizardOrchestrator(str(project_path))
            
            # Determine wizard mode
            if args.resume:
                return self._resume_wizard(orchestrator, args)
            elif args.batch:
                return self._batch_create(orchestrator, args)
            else:
                return self._interactive_wizard(orchestrator, args)
            
        except Exception as e:
            return self.handle_error(e, "character wizard")
    
    def _interactive_wizard(self, orchestrator, args: argparse.Namespace) -> int:
        """Run interactive character wizard."""
        print("\n🎭 Interactive Character Creation")
        print("=" * 50)
        
        result = orchestrator.start_wizard()
        
        return self._display_wizard_result(result)
    
    def _resume_wizard(self, orchestrator, args: argparse.Namespace) -> int:
        """Resume wizard from saved session."""
        print(f"\n🔄 Resuming wizard session: {args.resume}")
        
        result = orchestrator.resume_wizard(args.resume)
        
        return self._display_wizard_result(result)
    
    def _batch_create(self, orchestrator, args: argparse.Namespace) -> int:
        """Create multiple characters in batch mode."""
        print(f"\n📦 Batch Character Creation ({args.batch} characters)")
        print("=" * 50)
        
        # Build batch parameters
        batch_params = {
            "role": "supporting",
            "genre": args.genre or "fantasy",
            "age_range": "adult",
            "style_preferences": {"art_style": args.style or "realistic"}
        }
        
        results = orchestrator.batch_create_characters(args.batch, batch_params)
        
        # Report batch results
        successful = sum(1 for r in results if r.success)
        
        print(f"\n📊 Batch Creation Results:")
        print(f"  Total characters: {len(results)}")
        print(f"  Successful: {successful}")
        print(f"  Failed: {len(results) - successful}")
        
        if successful > 0:
            self.print_success(f"{successful} characters created successfully")
        
        if len(results) - successful > 0:
            self.print_error(f"{len(results) - successful} characters failed")
            return 1
        
        return 0
    
    def _display_wizard_result(self, result) -> int:
        """Display wizard result and return exit code."""
        if result.success:
            self.print_success("Character creation completed successfully!")
            
            if result.character_profile:
                print(f"  Character: {result.character_profile.name}")
                print(f"  ID: {result.character_profile.character_id}")
                print(f"  Method: {result.character_profile.creation_method.value}")
                print(f"  Quality Score: {result.character_profile.quality_score:.1f}/5.0")
                print(f"  Processing Time: {result.processing_time:.1f}s")
                
                # Show integration status
                if result.integration_status:
                    print(f"\n  Integration Status:")
                    for system, status in result.integration_status.items():
                        status_icon = "✓" if status else "✗"
                        print(f"    {status_icon} {system.replace('_', ' ').title()}")
                
                print(f"\n💡 Next steps:")
                print(f"   • Character saved to library")
                print(f"   • Use in storyboard generation")
                print(f"   • Generate character images with ComfyUI")
            
            return 0
        else:
            self.print_error(f"Character creation failed: {result.error_message}")
            
            if result.warnings:
                print(f"\nWarnings:")
                for warning in result.warnings:
                    print(f"  ⚠️  {warning}")
            
            return 1
