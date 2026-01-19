"""
Documentation generation utilities for CLI commands.
"""

import argparse
from pathlib import Path
from typing import Dict, List, Optional

from .base import BaseHandler
from .registry import CommandRegistry


class DocumentationGenerator:
    """Generator for CLI command documentation."""
    
    def __init__(self, registry: CommandRegistry):
        self.registry = registry
    
    def generate_command_docs(self, command_name: str) -> Optional[str]:
        """
        Generate markdown documentation for a command.
        
        Args:
            command_name: Name of command to document
            
        Returns:
            Markdown documentation string or None if command not found
        """
        handler = self.registry.get_handler(command_name)
        if not handler:
            return None
        
        lines = []
        
        # Command header
        lines.append(f"# {command_name}")
        lines.append("")
        lines.append(f"**Description:** {handler.description}")
        lines.append("")
        
        # Aliases
        if hasattr(handler, 'aliases') and handler.aliases:
            lines.append(f"**Aliases:** {', '.join(handler.aliases)}")
            lines.append("")
        
        # Get help information
        if hasattr(handler, 'get_help'):
            help_obj = handler.get_help()
            if help_obj:
                # Examples
                if help_obj.examples:
                    lines.append("## Examples")
                    lines.append("")
                    for example in help_obj.examples:
                        lines.append(f"```bash")
                        lines.append(example['command'])
                        lines.append(f"```")
                        lines.append(f"{example['description']}")
                        lines.append("")
                
                # Notes
                if help_obj.notes:
                    lines.append("## Notes")
                    lines.append("")
                    for note in help_obj.notes:
                        lines.append(f"- {note}")
                    lines.append("")
                
                # See also
                if help_obj.see_also:
                    lines.append("## See Also")
                    lines.append("")
                    for related in help_obj.see_also:
                        lines.append(f"- [{related}](#{related})")
                    lines.append("")
        
        return '\n'.join(lines)
    
    def generate_all_docs(self) -> str:
        """
        Generate markdown documentation for all commands.
        
        Returns:
            Complete markdown documentation
        """
        lines = []
        
        # Title
        lines.append("# StoryCore-Engine CLI Reference")
        lines.append("")
        lines.append("Complete reference for all CLI commands.")
        lines.append("")
        
        # Table of contents
        lines.append("## Table of Contents")
        lines.append("")
        
        commands = sorted(self.registry.list_commands())
        for command in commands:
            lines.append(f"- [{command}](#{command})")
        lines.append("")
        
        # Command documentation
        lines.append("## Commands")
        lines.append("")
        
        for command in commands:
            doc = self.generate_command_docs(command)
            if doc:
                lines.append(doc)
                lines.append("---")
                lines.append("")
        
        return '\n'.join(lines)
    
    def save_docs(self, output_path: str) -> bool:
        """
        Save generated documentation to a file.
        
        Args:
            output_path: Path to output file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            docs = self.generate_all_docs()
            
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(docs)
            
            return True
            
        except Exception as e:
            print(f"Failed to save documentation: {e}")
            return False
    
    def generate_command_list(self) -> str:
        """
        Generate a simple list of commands with descriptions.
        
        Returns:
            Formatted command list
        """
        lines = ["Available Commands:", ""]
        
        commands = sorted(self.registry.list_commands())
        
        # Find max command length for alignment
        max_len = max(len(cmd) for cmd in commands) if commands else 0
        
        for command in commands:
            handler = self.registry.get_handler(command)
            if handler:
                padding = " " * (max_len - len(command) + 2)
                lines.append(f"  {command}{padding}{handler.description}")
        
        return '\n'.join(lines)
    
    def generate_quick_reference(self) -> str:
        """
        Generate a quick reference card.
        
        Returns:
            Quick reference text
        """
        lines = [
            "StoryCore-Engine CLI Quick Reference",
            "=" * 50,
            "",
            "Common Commands:",
            "  storycore init <name>        Create new project",
            "  storycore grid               Generate 3x3 grid",
            "  storycore promote            Upscale panels",
            "  storycore qa                 Run quality analysis",
            "  storycore export             Export project",
            "",
            "Help:",
            "  storycore --help             Show general help",
            "  storycore <command> --help   Show command help",
            "",
            "Options:",
            "  --verbose, -v                Enable verbose output",
            "  --quiet, -q                  Suppress output",
            "  --log-level LEVEL            Set log level",
            "",
            "For complete documentation, run:",
            "  storycore help",
            ""
        ]
        
        return '\n'.join(lines)
