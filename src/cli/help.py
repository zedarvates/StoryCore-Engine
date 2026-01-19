"""
Enhanced help system with examples and improved formatting.
"""

import argparse
import textwrap
from typing import Dict, List, Optional


class EnhancedHelpFormatter(argparse.RawDescriptionHelpFormatter):
    """Custom help formatter with improved formatting and examples."""
    
    def __init__(self, prog, indent_increment=2, max_help_position=30, width=None):
        super().__init__(prog, indent_increment, max_help_position, width)
    
    def _format_action(self, action):
        """Format an action with improved spacing."""
        # Get the default formatting
        result = super()._format_action(action)
        
        # Add extra line after each action for readability
        if result and not result.endswith('\n\n'):
            result += '\n'
        
        return result


class CommandHelp:
    """Helper class for building command help with examples."""
    
    def __init__(self, command_name: str, description: str):
        self.command_name = command_name
        self.description = description
        self.examples: List[Dict[str, str]] = []
        self.notes: List[str] = []
        self.see_also: List[str] = []
    
    def add_example(self, command: str, description: str) -> 'CommandHelp':
        """
        Add a usage example.
        
        Args:
            command: Example command
            description: Description of what the example does
            
        Returns:
            Self for chaining
        """
        self.examples.append({
            'command': command,
            'description': description
        })
        return self
    
    def add_note(self, note: str) -> 'CommandHelp':
        """
        Add a note to the help text.
        
        Args:
            note: Note text
            
        Returns:
            Self for chaining
        """
        self.notes.append(note)
        return self
    
    def add_see_also(self, command: str) -> 'CommandHelp':
        """
        Add a related command reference.
        
        Args:
            command: Related command name
            
        Returns:
            Self for chaining
        """
        self.see_also.append(command)
        return self
    
    def format_epilog(self) -> str:
        """
        Format the epilog text with examples and notes.
        
        Returns:
            Formatted epilog string
        """
        parts = []
        
        # Add examples section
        if self.examples:
            parts.append("Examples:")
            for example in self.examples:
                parts.append(f"  {example['command']}")
                parts.append(f"    {example['description']}")
                parts.append("")
        
        # Add notes section
        if self.notes:
            parts.append("Notes:")
            for note in self.notes:
                wrapped = textwrap.fill(
                    note,
                    width=70,
                    initial_indent="  • ",
                    subsequent_indent="    "
                )
                parts.append(wrapped)
            parts.append("")
        
        # Add see also section
        if self.see_also:
            parts.append("See also:")
            parts.append(f"  {', '.join(self.see_also)}")
            parts.append("")
        
        return '\n'.join(parts)
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """
        Configure parser with enhanced help.
        
        Args:
            parser: Argument parser to configure
        """
        parser.formatter_class = EnhancedHelpFormatter
        parser.epilog = self.format_epilog()


def create_command_help(command_name: str, description: str) -> CommandHelp:
    """
    Create a CommandHelp instance.
    
    Args:
        command_name: Name of the command
        description: Command description
        
    Returns:
        CommandHelp instance
    """
    return CommandHelp(command_name, description)


def format_command_list(commands: Dict[str, str], title: str = "Available Commands") -> str:
    """
    Format a list of commands with descriptions.
    
    Args:
        commands: Dictionary mapping command names to descriptions
        title: Title for the command list
        
    Returns:
        Formatted command list string
    """
    lines = [title + ":", ""]
    
    # Find max command name length for alignment
    max_len = max(len(cmd) for cmd in commands.keys()) if commands else 0
    
    for command, description in sorted(commands.items()):
        padding = " " * (max_len - len(command) + 2)
        lines.append(f"  {command}{padding}{description}")
    
    return '\n'.join(lines)


def generate_shell_completion_bash(commands: List[str]) -> str:
    """
    Generate bash completion script.
    
    Args:
        commands: List of command names
        
    Returns:
        Bash completion script
    """
    script = f"""# Bash completion for storycore CLI
_storycore_completion() {{
    local cur prev commands
    COMPREPLY=()
    cur="${{COMP_WORDS[COMP_CWORD]}}"
    prev="${{COMP_WORDS[COMP_CWORD-1]}}"
    commands="{' '.join(commands)}"
    
    if [ $COMP_CWORD -eq 1 ]; then
        COMPREPLY=( $(compgen -W "$commands" -- $cur) )
    else
        case "$prev" in
            --project|-p)
                COMPREPLY=( $(compgen -d -- $cur) )
                ;;
            *)
                COMPREPLY=( $(compgen -f -- $cur) )
                ;;
        esac
    fi
    
    return 0
}}

complete -F _storycore_completion storycore
"""
    return script


def generate_shell_completion_zsh(commands: List[str]) -> str:
    """
    Generate zsh completion script.
    
    Args:
        commands: List of command names
        
    Returns:
        Zsh completion script
    """
    script = f"""#compdef storycore

_storycore() {{
    local -a commands
    commands=(
        {' '.join(f"'{cmd}:Execute {cmd} command'" for cmd in commands)}
    )
    
    _arguments -C \\
        '1: :->command' \\
        '*::arg:->args'
    
    case $state in
        command)
            _describe 'command' commands
            ;;
        args)
            case $words[1] in
                *)
                    _files
                    ;;
            esac
            ;;
    esac
}}

_storycore "$@"
"""
    return script


def generate_shell_completion_fish(commands: List[str]) -> str:
    """
    Generate fish completion script.
    
    Args:
        commands: List of command names
        
    Returns:
        Fish completion script
    """
    lines = ["# Fish completion for storycore CLI", ""]
    
    for command in commands:
        lines.append(f"complete -c storycore -n '__fish_use_subcommand' -a {command} -d 'Execute {command} command'")
    
    return '\n'.join(lines)
