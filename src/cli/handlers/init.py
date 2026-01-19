"""
Init command handler - Initialize new StoryCore-Engine projects.
"""

import argparse
import sys
from pathlib import Path

from ..base import BaseHandler
from ..errors import UserError, SystemError
from ..help import create_command_help


class InitHandler(BaseHandler):
    """Handler for the init command - project initialization."""
    
    command_name = "init"
    description = "Initialize a new StoryCore-Engine project"
    
    def get_help(self):
        """Get enhanced help for init command."""
        return (create_command_help(self.command_name, self.description)
                .add_example(
                    "storycore init my-project",
                    "Create a new project named 'my-project' in current directory"
                )
                .add_example(
                    "storycore init my-project --path ~/projects",
                    "Create project in specific directory"
                )
                .add_example(
                    "storycore init --interactive",
                    "Use interactive wizard for guided project setup"
                )
                .add_note(
                    "Interactive mode provides a guided setup with character creation, "
                    "story generation, and configuration options."
                )
                .add_note(
                    "Legacy mode creates a basic project structure with default settings."
                )
                .add_see_also("validate")
                .add_see_also("grid"))
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up init command arguments."""
        self.setup_help(parser)
        
        parser.add_argument(
            "project_name",
            nargs="?",
            help="Name of the project to create (optional if using --interactive)"
        )
        
        parser.add_argument(
            "--path",
            default=".",
            help="Directory where project will be created (default: current directory)"
        )
        
        parser.add_argument(
            "--interactive", "-i",
            action="store_true",
            help="Use interactive wizard for project setup"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the init command."""
        try:
            # Check if we should use interactive wizard
            use_wizard = args.interactive or args.project_name is None
            
            if use_wizard:
                return self._execute_wizard_mode(args)
            else:
                return self._execute_legacy_mode(args)
                
        except Exception as e:
            return self.handle_error(e, "project initialization")
    
    def _execute_wizard_mode(self, args: argparse.Namespace) -> int:
        """Execute init using interactive wizard."""
        try:
            from wizard.wizard_orchestrator import run_interactive_wizard
            from wizard.config_builder import build_project_configuration
            from wizard.file_writer import create_project_files
        except ImportError as e:
            raise SystemError(
                f"Wizard modules not available: {e}",
                "Ensure wizard package is installed or use legacy mode without --interactive"
            )
        
        print("🎬 StoryCore-Engine Interactive Project Setup")
        print("=" * 50)
        
        # Run wizard
        wizard_state = run_interactive_wizard(args.path)
        
        if wizard_state is None:
            print("Project creation cancelled.")
            return 0
        
        # Build configuration
        config = build_project_configuration(wizard_state)
        
        # Create project files
        success = create_project_files(config, args.path)
        
        if success:
            project_path = Path(args.path) / config.project_name
            self.print_success(f"Project '{config.project_name}' created successfully!")
            print(f"📁 Location: {project_path.absolute()}")
            print(f"📋 Files created:")
            print(f"   ✓ project.json (main configuration)")
            print(f"   ✓ README.md (project documentation)")
            print(f"   ✓ Directory structure (assets, exports, etc.)")
            print(f"\n🚀 Next steps:")
            print(f"   cd {config.project_name}")
            print(f"   storycore grid")
            print(f"   storycore promote")
            print(f"   storycore qa")
            print(f"   storycore export")
            return 0
        else:
            self.print_error("Failed to create project files")
            return 1
    
    def _execute_legacy_mode(self, args: argparse.Namespace) -> int:
        """Execute init using legacy project manager."""
        try:
            from project_manager import ProjectManager
        except ImportError as e:
            raise SystemError(
                f"ProjectManager not available: {e}",
                "Ensure project_manager module is installed"
            )
        
        if not args.project_name:
            raise UserError(
                "Project name is required in legacy mode",
                "Provide a project name or use --interactive flag"
            )
        
        pm = ProjectManager()
        pm.init_project(args.project_name, args.path)
        
        project_path = Path(args.path) / args.project_name
        self.print_success(f"Project '{args.project_name}' initialized successfully")
        print(f"  Location: {project_path.absolute()}")
        print(f"  Files created:")
        print(f"    - project.json")
        print(f"    - storyboard.json")
        print(f"    - assets/images/")
        print(f"    - assets/audio/")
        
        return 0
