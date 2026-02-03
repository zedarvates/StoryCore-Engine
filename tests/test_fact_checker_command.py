"""
Tests for Fact Checker Command Interface

This module tests the unified command interface including:
- Mode parameter parsing
- Automatic input type detection
- Agent routing
- Parameter handling
- Response formatting
"""

import pytest
from pathlib import Path
import tempfile

from src.fact_checker.fact_checker_command import FactCheckerCommand, create_command
from src.fact_checker.models import Configuration


class TestFactCheckerCommandInitialization:
    """Tests for command initialization."""
    
    def test_init_with_default_config(self):
        """Test initialization with default configuration."""
        command = FactCheckerCommand()
        
        assert command.config is not None
        assert command.scientific_agent is not None
        assert command.video_agent is not None
    
    def test_init_with_custom_config(self):
        """Test initialization with custom configuration."""
        config = Configuration(confidence_threshold=80.0)
        command = FactCheckerCommand(config)
        
        assert command.config.confidence_threshold == 80.0
        assert command.scientific_agent.config.confidence_threshold == 80.0
        assert command.video_agent.config.confidence_threshold == 80.0
    
    def test_create_command_factory(self):
        """Test factory function."""
        command = create_command()
        
        assert isinstance(command, FactCheckerCommand)


class TestModeParameterParsing:
    """Tests for mode parameter parsing (Requirement 3.2)."""
    
    def test_text_mode_explicit(self):
        """Test explicit text mode."""
        command = FactCheckerCommand()
        content = "Water boils at 100 degrees Celsius."
        
        result = command.execute(content, mode="text")
        
        assert result["status"] == "success"
        assert result["mode"] == "text"
        assert result["agent"] == "scientific_audit"
    
    def test_video_mode_explicit(self):
        """Test explicit video mode."""
        command = FactCheckerCommand()
        content = "[00:00:10] This is a video transcript with timestamps."
        
        result = command.execute(content, mode="video")
        
        assert result["status"] == "success"
        assert result["mode"] == "video"
        assert result["agent"] == "antifake_video"
    
    def test_auto_mode_default(self):
        """Test auto mode as default."""
        command = FactCheckerCommand()
        content = "This is regular text content."
        
        result = command.execute(content)  # mode defaults to "auto"
        
        assert result["status"] == "success"
        assert result["mode"] in ["text", "video"]
    
    def test_invalid_mode_raises_error(self):
        """Test that invalid mode raises error."""
        command = FactCheckerCommand()
        content = "Test content"
        
        result = command.execute(content, mode="invalid")
        
        assert result["status"] == "error"
        assert "Invalid mode" in result["error"]["message"]


class TestAutomaticInputTypeDetection:
    """Tests for automatic input type detection (Requirement 3.3)."""
    
    def test_auto_detect_text_content(self):
        """Test auto-detection of regular text content."""
        command = FactCheckerCommand()
        content = """
        This is a regular article about science.
        Water boils at 100 degrees Celsius at sea level.
        The Earth orbits the Sun once per year.
        """
        
        result = command.execute(content, mode="auto")
        
        assert result["status"] == "success"
        assert result["mode"] == "text"
    
    def test_auto_detect_video_transcript_with_timestamps(self):
        """Test auto-detection of video transcript with timestamps."""
        command = FactCheckerCommand()
        content = """
        [00:00:10] Welcome to this video about science.
        [00:00:20] Today we'll discuss water boiling points.
        [00:00:30] Water boils at 100 degrees Celsius.
        [00:00:40] This is true at sea level pressure.
        """
        
        result = command.execute(content, mode="auto")
        
        assert result["status"] == "success"
        assert result["mode"] == "video"
    
    def test_auto_detect_video_transcript_with_keywords(self):
        """Test auto-detection based on transcript keywords."""
        command = FactCheckerCommand()
        content = """
        Video Transcript:
        Speaker: Welcome everyone to today's presentation.
        Narrator: This video will cover important scientific facts.
        [Music plays in background]
        """
        
        result = command.execute(content, mode="auto")
        
        assert result["status"] == "success"
        assert result["mode"] == "video"
    
    def test_auto_detect_with_timecode_format(self):
        """Test auto-detection with timecode format."""
        command = FactCheckerCommand()
        content = """
        00:00:10 - 00:00:20: Introduction to the topic
        00:00:20 - 00:00:35: Main discussion points
        00:00:35 - 00:01:00: Conclusion and summary
        """
        
        result = command.execute(content, mode="auto")
        
        assert result["status"] == "success"
        assert result["mode"] == "video"


class TestAgentRouting:
    """Tests for agent routing (Requirements 3.4, 3.5)."""
    
    def test_route_to_scientific_audit_agent(self):
        """Test routing to Scientific Audit Agent for text mode."""
        command = FactCheckerCommand()
        content = "The speed of light is 299,792,458 meters per second."
        
        result = command.execute(content, mode="text")
        
        assert result["status"] == "success"
        assert result["agent"] == "scientific_audit"
        assert "report" in result
    
    def test_route_to_antifake_video_agent(self):
        """Test routing to Anti-Fake Video Agent for video mode."""
        command = FactCheckerCommand()
        content = "[00:00:10] This is a test transcript."
        
        result = command.execute(content, mode="video")
        
        assert result["status"] == "success"
        assert result["agent"] == "antifake_video"
        assert "report" in result


class TestUnifiedResponseFormat:
    """Tests for unified response format (Requirement 3.6)."""
    
    def test_response_has_required_fields(self):
        """Test that response contains all required fields."""
        command = FactCheckerCommand()
        content = "Test content for verification."
        
        result = command.execute(content, mode="text")
        
        # Check required fields
        assert "status" in result
        assert "mode" in result
        assert "agent" in result
        assert "report" in result
        assert "summary" in result
        assert "processing_time_ms" in result
        assert "cached" in result
    
    def test_response_format_consistent_across_agents(self):
        """Test that response format is consistent regardless of agent."""
        command = FactCheckerCommand()
        
        # Test with text mode
        text_result = command.execute("Text content", mode="text")
        
        # Test with video mode
        video_result = command.execute("[00:00:10] Video content", mode="video")
        
        # Both should have same structure
        assert set(text_result.keys()) == set(video_result.keys())
        assert text_result["status"] == video_result["status"] == "success"
    
    def test_success_response_structure(self):
        """Test structure of success response."""
        command = FactCheckerCommand()
        content = "Test content"
        
        result = command.execute(content, mode="text")
        
        assert result["status"] == "success"
        assert isinstance(result["mode"], str)
        assert isinstance(result["agent"], str)
        assert isinstance(result["report"], dict)
        assert isinstance(result["summary"], str)
        assert isinstance(result["processing_time_ms"], int)
        assert isinstance(result["cached"], bool)
    
    def test_error_response_structure(self):
        """Test structure of error response."""
        command = FactCheckerCommand()
        
        # Trigger error with empty content
        result = command.execute("", mode="text")
        
        assert result["status"] == "error"
        assert "error" in result
        assert "message" in result["error"]
        assert "code" in result["error"]
        assert "processing_time_ms" in result


class TestParameterHandling:
    """Tests for parameter handling (Requirement 3.7)."""
    
    def test_confidence_threshold_parameter(self):
        """Test confidence threshold parameter."""
        command = FactCheckerCommand()
        content = "Test content"
        
        result = command.execute(content, mode="text", confidence_threshold=80.0)
        
        assert result["status"] == "success"
        assert command.config.confidence_threshold == 80.0
    
    def test_confidence_threshold_validation(self):
        """Test confidence threshold validation."""
        command = FactCheckerCommand()
        content = "Test content"
        
        # Test invalid threshold (> 100)
        result = command.execute(content, mode="text", confidence_threshold=150.0)
        
        assert result["status"] == "error"
        assert "threshold" in result["error"]["message"].lower()
    
    def test_detail_level_parameter(self):
        """Test detail level parameter."""
        command = FactCheckerCommand()
        content = "Test content with multiple claims."
        
        # Test summary level
        result_summary = command.execute(content, mode="text", detail_level="summary")
        
        # Test detailed level
        result_detailed = command.execute(content, mode="text", detail_level="detailed")
        
        # Test full level
        result_full = command.execute(content, mode="text", detail_level="full")
        
        assert result_summary["status"] == "success"
        assert result_detailed["status"] == "success"
        assert result_full["status"] == "success"
    
    def test_output_format_parameter(self):
        """Test output format parameter."""
        command = FactCheckerCommand()
        content = "Test content"
        
        # Test JSON format
        result_json = command.execute(content, mode="text", output_format="json")
        assert result_json["status"] == "success"
        assert isinstance(result_json["report"], dict)
        
        # Test Markdown format
        result_md = command.execute(content, mode="text", output_format="markdown")
        assert result_md["status"] == "success"
        assert isinstance(result_md["report"], str)
        
        # Test PDF format (returns bytes)
        result_pdf = command.execute(content, mode="text", output_format="pdf")
        assert result_pdf["status"] == "success"
        assert isinstance(result_pdf["report"], bytes)
    
    def test_cache_parameter(self):
        """Test cache parameter."""
        command = FactCheckerCommand()
        content = "Test content"
        
        # Test with cache enabled
        result_cached = command.execute(content, mode="text", cache=True)
        assert result_cached["status"] == "success"
        
        # Test with cache disabled
        result_no_cache = command.execute(content, mode="text", cache=False)
        assert result_no_cache["status"] == "success"


class TestInputLoading:
    """Tests for input loading from files and strings."""
    
    def test_load_from_string(self):
        """Test loading input from string."""
        command = FactCheckerCommand()
        content = "This is direct string input."
        
        result = command.execute(content, mode="text")
        
        assert result["status"] == "success"
    
    def test_load_from_file(self):
        """Test loading input from file."""
        command = FactCheckerCommand()
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("This is content from a file.")
            temp_path = f.name
        
        try:
            result = command.execute(temp_path, mode="text")
            assert result["status"] == "success"
        finally:
            # Clean up
            Path(temp_path).unlink()
    
    def test_load_from_nonexistent_file(self):
        """Test error handling for nonexistent file."""
        command = FactCheckerCommand()
        
        result = command.execute("nonexistent_file.txt", mode="text")
        
        assert result["status"] == "error"
        assert "not found" in result["error"]["message"].lower()
    
    def test_empty_input_error(self):
        """Test error handling for empty input."""
        command = FactCheckerCommand()
        
        result = command.execute("", mode="text")
        
        assert result["status"] == "error"
        assert "empty" in result["error"]["message"].lower()


class TestCommandStatistics:
    """Tests for command statistics and metadata."""
    
    def test_get_supported_modes(self):
        """Test getting supported modes."""
        command = FactCheckerCommand()
        
        modes = command.get_supported_modes()
        
        assert "text" in modes
        assert "video" in modes
        assert "auto" in modes
    
    def test_get_supported_output_formats(self):
        """Test getting supported output formats."""
        command = FactCheckerCommand()
        
        formats = command.get_supported_output_formats()
        
        assert "json" in formats
        assert "markdown" in formats
        assert "pdf" in formats
    
    def test_get_statistics(self):
        """Test getting command statistics."""
        command = FactCheckerCommand()
        
        stats = command.get_statistics()
        
        assert "command_version" in stats
        assert "supported_modes" in stats
        assert "supported_output_formats" in stats
        assert "scientific_agent" in stats
        assert "video_agent" in stats
        assert "configuration" in stats


class TestEdgeCases:
    """Tests for edge cases and error conditions."""
    
    def test_very_long_input(self):
        """Test handling of very long input."""
        command = FactCheckerCommand()
        
        # Create content just under the limit (50000 chars for text)
        content = "word " * 9999  # ~49995 characters
        
        result = command.execute(content, mode="text")
        
        assert result["status"] == "success"
    
    def test_input_exceeding_limit(self):
        """Test error handling for input exceeding limit."""
        command = FactCheckerCommand()
        
        # Create content exceeding the limit
        content = "word " * 11000  # ~55000 characters
        
        result = command.execute(content, mode="text")
        
        assert result["status"] == "error"
        assert "exceeds maximum length" in result["error"]["message"]
    
    def test_special_characters_in_input(self):
        """Test handling of special characters."""
        command = FactCheckerCommand()
        content = "Test with special chars: @#$%^&*()_+-=[]{}|;':\",./<>?"
        
        result = command.execute(content, mode="text")
        
        assert result["status"] == "success"
    
    def test_unicode_content(self):
        """Test handling of Unicode content."""
        command = FactCheckerCommand()
        content = "Test with Unicode: 你好世界 مرحبا العالم Привет мир"
        
        result = command.execute(content, mode="text")
        
        assert result["status"] == "success"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
