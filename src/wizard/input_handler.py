"""
Input Handler for Interactive Project Setup Wizard (MVP)

This module provides functions for collecting user input through
interactive CLI prompts with basic validation.
"""

import sys
from typing import Optional, List, Callable, Any


class InputHandler:
    """
    Handles interactive user input collection for the wizard (MVP version)
    
    Simplified for MVP - basic input methods without advanced navigation.
    """
    
    def __init__(self):
        """Initialize the input handler"""
        self.input_stream = sys.stdin
        self.output_stream = sys.stdout
    
    def prompt_text(
        self,
        question: str,
        default: Optional[str] = None,
        validator: Optional[Callable[[str], tuple[bool, str]]] = None
    ) -> str:
        """
        Prompt for simple text input
        
        Args:
            question: The question to ask the user
            default: Optional default value
            validator: Optional validation function that returns (is_valid, error_message)
            
        Returns:
            The validated user input
        """
        while True:
            # Display question
            if default:
                prompt = f"{question} [{default}]: "
            else:
                prompt = f"{question}: "
            
            self.output_stream.write(prompt)
            self.output_stream.flush()
            
            # Get input
            user_input = self.input_stream.readline().strip()
            
            # Use default if no input provided
            if not user_input and default:
                user_input = default
            
            # Validate if validator provided
            if validator:
                is_valid, error_msg = validator(user_input)
                if not is_valid:
                    self.output_stream.write(f"❌ {error_msg}\n")
                    continue
            
            return user_input
    
    def prompt_choice(
        self,
        question: str,
        choices: List[tuple[str, str]],
        default: Optional[int] = None
    ) -> str:
        """
        Prompt for menu selection
        
        Args:
            question: The question to ask
            choices: List of (key, display_name) tuples
            default: Optional default choice index (1-based)
            
        Returns:
            The selected choice key
        """
        while True:
            # Display question
            self.output_stream.write(f"\n{question}\n")
            
            # Display choices
            for i, (key, name) in enumerate(choices, 1):
                default_marker = " (default)" if default == i else ""
                self.output_stream.write(f"  {i}. {name}{default_marker}\n")
            
            # Get selection
            if default:
                prompt = f"\nEnter selection (1-{len(choices)}) [{default}]: "
            else:
                prompt = f"\nEnter selection (1-{len(choices)}): "
            
            self.output_stream.write(prompt)
            self.output_stream.flush()
            
            user_input = self.input_stream.readline().strip()
            
            # Use default if no input
            if not user_input and default:
                return choices[default - 1][0]
            
            # Validate selection
            try:
                selection = int(user_input)
                if 1 <= selection <= len(choices):
                    return choices[selection - 1][0]
                else:
                    self.output_stream.write(f"❌ Please enter a number between 1 and {len(choices)}\n")
            except ValueError:
                self.output_stream.write(f"❌ Please enter a valid number\n")
    
    def prompt_multiline(
        self,
        question: str,
        end_marker: str = "END"
    ) -> str:
        """
        Prompt for multi-line text input
        
        Args:
            question: The question to ask
            end_marker: Text to type to end input (default: "END")
            
        Returns:
            The multi-line text input
        """
        self.output_stream.write(f"\n{question}\n")
        self.output_stream.write(f"(Type '{end_marker}' on a new line when finished)\n\n")
        self.output_stream.flush()
        
        lines = []
        while True:
            line = self.input_stream.readline()
            if line.strip() == end_marker:
                break
            lines.append(line.rstrip('\n'))
        
        return '\n'.join(lines)
    
    def prompt_confirm(
        self,
        question: str,
        default: bool = True
    ) -> bool:
        """
        Prompt for yes/no confirmation
        
        Args:
            question: The question to ask
            default: Default value if user just presses Enter
            
        Returns:
            True for yes, False for no
        """
        default_str = "Y/n" if default else "y/N"
        
        while True:
            self.output_stream.write(f"{question} [{default_str}]: ")
            self.output_stream.flush()
            
            user_input = self.input_stream.readline().strip().lower()
            
            # Use default if no input
            if not user_input:
                return default
            
            # Check for yes/no
            if user_input in ['y', 'yes', 'oui']:
                return True
            elif user_input in ['n', 'no', 'non']:
                return False
            else:
                self.output_stream.write("❌ Please answer 'y' (yes) or 'n' (no)\n")
    
    def display_message(self, message: str):
        """
        Display a message to the user
        
        Args:
            message: The message to display
        """
        self.output_stream.write(f"{message}\n")
        self.output_stream.flush()
    
    def display_error(self, error: str):
        """
        Display an error message to the user
        
        Args:
            error: The error message to display
        """
        self.output_stream.write(f"❌ ERROR: {error}\n")
        self.output_stream.flush()
    
    def display_success(self, message: str):
        """
        Display a success message to the user
        
        Args:
            message: The success message to display
        """
        self.output_stream.write(f"✅ {message}\n")
        self.output_stream.flush()
    
    def display_section(self, title: str):
        """
        Display a section header
        
        Args:
            title: The section title
        """
        separator = "=" * 60
        self.output_stream.write(f"\n{separator}\n")
        self.output_stream.write(f"{title}\n")
        self.output_stream.write(f"{separator}\n\n")
        self.output_stream.flush()


# Convenience functions for direct use
_default_handler = InputHandler()


def prompt_text(
    question: str,
    default: Optional[str] = None,
    validator: Optional[Callable[[str], tuple[bool, str]]] = None
) -> str:
    """Convenience function for text input"""
    return _default_handler.prompt_text(question, default, validator)


def prompt_choice(
    question: str,
    choices: List[tuple[str, str]],
    default: Optional[int] = None
) -> str:
    """Convenience function for choice input"""
    return _default_handler.prompt_choice(question, choices, default)


def prompt_multiline(
    question: str,
    end_marker: str = "END"
) -> str:
    """Convenience function for multi-line input"""
    return _default_handler.prompt_multiline(question, end_marker)


def prompt_confirm(
    question: str,
    default: bool = True
) -> bool:
    """Convenience function for confirmation"""
    return _default_handler.prompt_confirm(question, default)


def display_message(message: str):
    """Convenience function to display message"""
    _default_handler.display_message(message)


def display_error(error: str):
    """Convenience function to display error"""
    _default_handler.display_error(error)


def display_success(message: str):
    """Convenience function to display success"""
    _default_handler.display_success(message)


def display_section(title: str):
    """Convenience function to display section"""
    _default_handler.display_section(title)
