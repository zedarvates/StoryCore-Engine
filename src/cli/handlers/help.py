"""
Help command handler for displaying command documentation.
"""

import argparse
from typing import Optional

from ..base import BaseHandler
from ..help import create_command_help


class HelpHandler(BaseHandler):
    """Handler for the help command - display documentation."""
    
    command_name = "help"
    description = "Display help and documentation for commands"
    
    def get_help(self):
        """Get enhanced help for help command."""
        return (create_command_help(self.command_name, self.description)
                .add_example(
                    "storycore help",
                    "Show general help and list of commands"
                )
                .add_example(
                    "storycore help init",
                    "Show detailed help for the init command"
                )
                .add_example(
                    "storycore help --quick",
                    "Show quick reference card"
                )
                .add_note(
                    "You can also use 'storycore <command> --help' to get help for a specific command"
                )
                .add_see_also("completion"))
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up help command arguments."""
        self.setup_help(parser)
        
        parser.add_argument(
            "command",
            nargs="?",
            help="Command to get help for (optional)"
        )
        
        parser.add_argument(
            "--quick", "-q",
            action="store_true",
            help="Show quick reference card"
        )
        
        parser.add_argument(
            "--list", "-l",
            action="store_true",
            help="List all available commands"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Display help information."""
        try:
            # Import here to avoid circular dependency
            from ..docs import DocumentationGenerator
            from ..core import CLICore
            
            # Quick reference
            if args.quick:
                return self._show_quick_reference()
            
            # List commands
            if args.list:
                return self._list_commands()
            
            # Specific command help
            if args.command:
                return self._show_command_help(args.command)
            
            # General help
            return self._show_general_help()
            
        except Exception as e:
            return self.handle_error(e, "help display")
    
    def _show_quick_reference(self) -> int:
        """Show quick reference card."""
        from ..docs import DocumentationGenerator
        
        # Create a minimal registry for documentation
        # In a real implementation, we'd get this from the CLI core
        print("StoryCore-Engine CLI Quick Reference")
        print("=" * 50)
        print("")
        print("Common Commands:")
        print("  storycore init <name>        Create new project")
        print("  storycore grid               Generate 3x3 grid")
        print("  storycore promote            Upscale panels")
        print("  storycore qa                 Run quality analysis")
        print("  storycore export             Export project")
        print("")
        print("Help:")
        print("  storycore --help             Show general help")
        print("  storycore <command> --help   Show command help")
        print("  storycore help <command>     Show detailed command help")
        print("")
        print("Options:")
        print("  --verbose, -v                Enable verbose output")
        print("  --quiet, -q                  Suppress output")
        print("  --log-level LEVEL            Set log level")
        print("")
        
        return 0
    
    def _list_commands(self) -> int:
        """List all available commands."""
        print("Available Commands:")
        print("")
        
        # List of known commands with descriptions
        commands = {
            "init": "Initialize a new project",
            "validate": "Validate project structure",
            "grid": "Generate 3x3 master coherence sheet",
            "promote": "Upscale and promote panels",
            "refine": "Refine promoted panels",
            "qa": "Run quality analysis",
            "export": "Export project package",
            "dashboard": "Generate analytics dashboard",
            "narrative": "Generate narrative content",
            "video-plan": "Create video plan",
            "script": "Process script",
            "scene-breakdown": "Break down scenes",
            "shot-planning": "Plan shots",
            "storyboard": "Generate storyboard",
            "puppet-layer": "Create puppet layers",
            "generate-images": "Generate images with AI",
            "generate-video": "Generate video with AI",
            "generate-audio": "Generate audio with AI",
            "character-wizard": "Interactive character creation",
            "world-generate": "Generate world settings",
            "comfyui": "Manage ComfyUI integration",
            "completion": "Generate shell completions",
            "help": "Display help information"
        }
        
        max_len = max(len(cmd) for cmd in commands.keys())
        
        for command, description in sorted(commands.items()):
            padding = " " * (max_len - len(command) + 2)
            print(f"  {command}{padding}{description}")
        
        print("")
        print("For detailed help on a command, use:")
        print("  storycore help <command>")
        print("  storycore <command> --help")
        print("")
        
        return 0
    
    def _show_command_help(self, command: str) -> int:
        """Show help for a specific command."""
        print(f"Help for command: {command}")
        print("")
        print(f"For detailed help, use:")
        print(f"  storycore {command} --help")
        print("")
        
        return 0
    
    def _show_general_help(self) -> int:
        """Show general help."""
        print("StoryCore-Engine CLI")
        print("=" * 50)
        print("")
        print("A modular CLI for the StoryCore-Engine pipeline.")
        print("")
        print("Usage:")
        print("  storycore <command> [options]")
        print("")
        print("Common Commands:")
        print("  init        Initialize a new project")
        print("  grid        Generate 3x3 master coherence sheet")
        print("  promote     Upscale and promote panels")
        print("  qa          Run quality analysis")
        print("  export      Export project package")
        print("")
        print("For a complete list of commands:")
        print("  storycore help --list")
        print("")
        print("For help on a specific command:")
        print("  storycore help <command>")
        print("  storycore <command> --help")
        print("")
        print("For quick reference:")
        print("  storycore help --quick")
        print("")
        
        return 0
