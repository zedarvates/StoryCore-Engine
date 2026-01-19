"""
Completion handler for generating shell completion scripts.
"""

import argparse
import sys
from typing import List

from ..base import BaseHandler
from ..help import (
    create_command_help,
    generate_shell_completion_bash,
    generate_shell_completion_fish,
    generate_shell_completion_zsh
)


class CompletionHandler(BaseHandler):
    """Handler for generating shell completion scripts."""
    
    command_name = "completion"
    description = "Generate shell completion scripts"
    aliases = ["complete"]
    
    def get_help(self):
        """Get enhanced help for completion command."""
        return (create_command_help(self.command_name, self.description)
                .add_example(
                    "storycore completion bash > ~/.storycore-completion.bash",
                    "Generate bash completion and save to file"
                )
                .add_example(
                    "storycore completion zsh > ~/.zsh/completions/_storycore",
                    "Generate zsh completion and save to completions directory"
                )
                .add_example(
                    "storycore completion fish > ~/.config/fish/completions/storycore.fish",
                    "Generate fish completion and save to fish completions"
                )
                .add_note(
                    "After generating the completion script, you may need to restart "
                    "your shell or source the completion file for it to take effect."
                )
                .add_note(
                    "For bash, add 'source ~/.storycore-completion.bash' to your ~/.bashrc"
                )
                .add_see_also("help"))
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up completion command arguments."""
        self.setup_help(parser)
        
        parser.add_argument(
            "shell",
            choices=["bash", "zsh", "fish"],
            help="Shell type for completion script"
        )
        
        parser.add_argument(
            "--commands",
            nargs="+",
            help="Specific commands to include (default: all)"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Generate and output shell completion script."""
        try:
            # Get list of commands from registry
            # We'll need to access the registry through the CLI core
            # For now, use a default list of known commands
            commands = args.commands if args.commands else self._get_default_commands()
            
            # Generate completion script based on shell type
            if args.shell == "bash":
                script = generate_shell_completion_bash(commands)
            elif args.shell == "zsh":
                script = generate_shell_completion_zsh(commands)
            elif args.shell == "fish":
                script = generate_shell_completion_fish(commands)
            else:
                self.print_error(f"Unsupported shell: {args.shell}")
                return 1
            
            # Output script to stdout
            print(script)
            
            self.logger.info(f"Generated {args.shell} completion script")
            return 0
            
        except Exception as e:
            return self.handle_error(e, "completion generation")
    
    def _get_default_commands(self) -> List[str]:
        """Get default list of commands."""
        return [
            "init",
            "validate",
            "grid",
            "promote",
            "refine",
            "qa",
            "export",
            "dashboard",
            "narrative",
            "video-plan",
            "script",
            "scene-breakdown",
            "shot-planning",
            "storyboard",
            "puppet-layer",
            "generate-images",
            "generate-video",
            "generate-audio",
            "character-wizard",
            "world-generate",
            "comfyui",
            "completion"
        ]
