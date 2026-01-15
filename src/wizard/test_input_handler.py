"""
Unit tests for input handler (MVP)
"""

import pytest
from io import StringIO
from .input_handler import InputHandler


class TestInputHandler:
    """Tests for InputHandler class"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.handler = InputHandler()
        self.handler.output_stream = StringIO()
    
    def test_prompt_text_simple(self):
        """Test simple text input"""
        self.handler.input_stream = StringIO("test-project\n")
        result = self.handler.prompt_text("Enter project name")
        assert result == "test-project"
    
    def test_prompt_text_with_default(self):
        """Test text input with default value"""
        self.handler.input_stream = StringIO("\n")  # Empty input
        result = self.handler.prompt_text("Enter name", default="default-name")
        assert result == "default-name"
    
    def test_prompt_text_with_validator_valid(self):
        """Test text input with valid validation"""
        self.handler.input_stream = StringIO("valid-input\n")
        
        def validator(text):
            return (True, "")
        
        result = self.handler.prompt_text("Enter text", validator=validator)
        assert result == "valid-input"
    
    def test_prompt_text_with_validator_invalid_then_valid(self):
        """Test text input with invalid then valid input"""
        self.handler.input_stream = StringIO("invalid\nvalid\n")
        
        call_count = [0]
        
        def validator(text):
            call_count[0] += 1
            if call_count[0] == 1:
                return (False, "Invalid input")
            return (True, "")
        
        result = self.handler.prompt_text("Enter text", validator=validator)
        assert result == "valid"
    
    def test_prompt_choice_first_option(self):
        """Test choice selection - first option"""
        self.handler.input_stream = StringIO("1\n")
        choices = [("action", "Action"), ("drame", "Drame")]
        result = self.handler.prompt_choice("Select genre", choices)
        assert result == "action"
    
    def test_prompt_choice_second_option(self):
        """Test choice selection - second option"""
        self.handler.input_stream = StringIO("2\n")
        choices = [("action", "Action"), ("drame", "Drame")]
        result = self.handler.prompt_choice("Select genre", choices)
        assert result == "drame"
    
    def test_prompt_choice_with_default(self):
        """Test choice selection with default"""
        self.handler.input_stream = StringIO("\n")  # Empty input
        choices = [("action", "Action"), ("drame", "Drame")]
        result = self.handler.prompt_choice("Select genre", choices, default=1)
        assert result == "action"
    
    def test_prompt_choice_invalid_then_valid(self):
        """Test choice with invalid then valid input"""
        self.handler.input_stream = StringIO("5\n2\n")  # 5 is invalid, 2 is valid
        choices = [("action", "Action"), ("drame", "Drame")]
        result = self.handler.prompt_choice("Select genre", choices)
        assert result == "drame"
    
    def test_prompt_choice_non_numeric_then_valid(self):
        """Test choice with non-numeric then valid input"""
        self.handler.input_stream = StringIO("abc\n1\n")
        choices = [("action", "Action"), ("drame", "Drame")]
        result = self.handler.prompt_choice("Select genre", choices)
        assert result == "action"
    
    def test_prompt_multiline(self):
        """Test multi-line input"""
        self.handler.input_stream = StringIO("Line 1\nLine 2\nLine 3\nEND\n")
        result = self.handler.prompt_multiline("Enter story")
        assert result == "Line 1\nLine 2\nLine 3"
    
    def test_prompt_multiline_custom_marker(self):
        """Test multi-line input with custom end marker"""
        self.handler.input_stream = StringIO("Line 1\nLine 2\nDONE\n")
        result = self.handler.prompt_multiline("Enter story", end_marker="DONE")
        assert result == "Line 1\nLine 2"
    
    def test_prompt_multiline_empty(self):
        """Test multi-line input with immediate end"""
        self.handler.input_stream = StringIO("END\n")
        result = self.handler.prompt_multiline("Enter story")
        assert result == ""
    
    def test_prompt_confirm_yes(self):
        """Test confirmation - yes"""
        self.handler.input_stream = StringIO("y\n")
        result = self.handler.prompt_confirm("Continue?")
        assert result is True
    
    def test_prompt_confirm_no(self):
        """Test confirmation - no"""
        self.handler.input_stream = StringIO("n\n")
        result = self.handler.prompt_confirm("Continue?")
        assert result is False
    
    def test_prompt_confirm_yes_variations(self):
        """Test confirmation - various yes inputs"""
        for yes_input in ["y", "yes", "Y", "YES", "oui", "OUI"]:
            self.handler.input_stream = StringIO(f"{yes_input}\n")
            result = self.handler.prompt_confirm("Continue?")
            assert result is True, f"Failed for input: {yes_input}"
    
    def test_prompt_confirm_no_variations(self):
        """Test confirmation - various no inputs"""
        for no_input in ["n", "no", "N", "NO", "non", "NON"]:
            self.handler.input_stream = StringIO(f"{no_input}\n")
            result = self.handler.prompt_confirm("Continue?")
            assert result is False, f"Failed for input: {no_input}"
    
    def test_prompt_confirm_default_true(self):
        """Test confirmation with default true"""
        self.handler.input_stream = StringIO("\n")  # Empty input
        result = self.handler.prompt_confirm("Continue?", default=True)
        assert result is True
    
    def test_prompt_confirm_default_false(self):
        """Test confirmation with default false"""
        self.handler.input_stream = StringIO("\n")  # Empty input
        result = self.handler.prompt_confirm("Continue?", default=False)
        assert result is False
    
    def test_prompt_confirm_invalid_then_valid(self):
        """Test confirmation with invalid then valid input"""
        self.handler.input_stream = StringIO("maybe\ny\n")
        result = self.handler.prompt_confirm("Continue?")
        assert result is True
    
    def test_display_message(self):
        """Test displaying a message"""
        self.handler.display_message("Test message")
        output = self.handler.output_stream.getvalue()
        assert "Test message" in output
    
    def test_display_error(self):
        """Test displaying an error"""
        self.handler.display_error("Test error")
        output = self.handler.output_stream.getvalue()
        assert "ERROR" in output
        assert "Test error" in output
    
    def test_display_success(self):
        """Test displaying a success message"""
        self.handler.display_success("Test success")
        output = self.handler.output_stream.getvalue()
        assert "Test success" in output
    
    def test_display_section(self):
        """Test displaying a section header"""
        self.handler.display_section("Test Section")
        output = self.handler.output_stream.getvalue()
        assert "Test Section" in output
        assert "=" in output  # Should have separator


class TestConvenienceFunctions:
    """Tests for convenience functions"""
    
    def test_convenience_functions_exist(self):
        """Test that all convenience functions are available"""
        from .input_handler import (
            prompt_text, prompt_choice, prompt_multiline,
            prompt_confirm, display_message, display_error,
            display_success, display_section
        )
        
        # Just verify they're callable
        assert callable(prompt_text)
        assert callable(prompt_choice)
        assert callable(prompt_multiline)
        assert callable(prompt_confirm)
        assert callable(display_message)
        assert callable(display_error)
        assert callable(display_success)
        assert callable(display_section)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
