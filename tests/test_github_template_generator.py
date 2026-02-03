"""
Unit tests for GitHub Template Generator
"""

import pytest
from src.github_template_generator import GitHubTemplateGenerator


class TestGitHubTemplateGenerator:
    """Test suite for GitHubTemplateGenerator class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.generator = GitHubTemplateGenerator()
        self.sample_payload = {
            "schema_version": "1.0",
            "report_type": "bug",
            "timestamp": "2026-01-25T12:00:00Z",
            "system_info": {
                "storycore_version": "0.1.0",
                "python_version": "3.9.7",
                "os_platform": "Windows",
                "os_version": "10.0.19041",
                "language": "en_US"
            },
            "module_context": {
                "active_module": "grid-generator",
                "module_state": {}
            },
            "user_input": {
                "description": "The application crashes when generating a grid",
                "reproduction_steps": "1. Open the app\n2. Click Generate Grid\n3. App crashes"
            },
            "diagnostics": {
                "stacktrace": "Traceback (most recent call last):\n  File 'test.py', line 10\n    raise ValueError('Test error')",
                "logs": ["[INFO] Starting grid generation", "[ERROR] Failed to generate grid"],
                "memory_usage_mb": 512,
                "process_state": {"cpu_percent": 45.2}
            },
            "screenshot_base64": None
        }
    
    def test_format_issue_body_contains_all_sections(self):
        """Test that formatted issue body contains all required sections."""
        body = self.generator.format_issue_body(self.sample_payload)
        
        # Check for required sections
        assert "## Report Type" in body
        assert "Bug Report" in body
        assert "## System Context" in body
        assert "## Description" in body
        assert "## Reproduction Steps" in body
        assert "## Diagnostics" in body
        
        # Check system info is present
        assert "StoryCore Version:" in body
        assert "0.1.0" in body
        assert "Active Module:" in body
        assert "grid-generator" in body
        assert "OS Platform:" in body
        assert "Windows" in body
        assert "Python Version:" in body
        assert "3.9.7" in body
        
        # Check user input is present
        assert "The application crashes when generating a grid" in body
        assert "1. Open the app" in body
        
        # Check footer
        assert "This issue was automatically generated" in body
    
    def test_format_issue_body_with_collapsible_diagnostics(self):
        """Test that diagnostics are wrapped in collapsible details tags."""
        body = self.generator.format_issue_body(self.sample_payload)
        
        # Check for collapsible stacktrace
        assert "<details>" in body
        assert "<summary>Stacktrace</summary>" in body
        assert "Traceback (most recent call last)" in body
        assert "</details>" in body
        
        # Check for collapsible logs
        assert "<summary>Application Logs (Last 500 lines)</summary>" in body
        assert "[INFO] Starting grid generation" in body
        assert "[ERROR] Failed to generate grid" in body
        
        # Check for collapsible memory state
        assert "<summary>Memory State</summary>" in body
        assert "memory_usage_mb" in body
        assert "512" in body
    
    def test_format_issue_body_without_optional_fields(self):
        """Test formatting when optional fields are missing."""
        minimal_payload = {
            "report_type": "question",
            "system_info": {
                "storycore_version": "0.1.0",
                "python_version": "3.9.7",
                "os_platform": "Linux"
            },
            "module_context": {
                "active_module": "unknown"
            },
            "user_input": {
                "description": "How do I use this feature?"
            },
            "diagnostics": {}
        }
        
        body = self.generator.format_issue_body(minimal_payload)
        
        # Should still have required sections
        assert "## Report Type" in body
        assert "Question" in body
        assert "## System Context" in body
        assert "## Description" in body
        
        # Should not have optional sections
        assert "## Reproduction Steps" not in body
        assert "Stacktrace" not in body
        assert "Application Logs" not in body
    
    def test_generate_github_url_structure(self):
        """Test that generated URL has correct structure."""
        url = self.generator.generate_github_url(self.sample_payload)
        
        # Check base URL
        assert url.startswith("https://github.com/zedarvates/StoryCore-Engine/issues/new?")
        
        # Check query parameters are present
        assert "title=" in url
        assert "body=" in url
        assert "labels=" in url
        
        # Check title contains report type prefix
        assert "%5BBug%5D" in url or "[Bug]" in url
    
    def test_generate_labels_for_bug_report(self):
        """Test label generation for bug reports."""
        labels = self.generator._generate_labels(self.sample_payload)
        
        assert "from-storycore" in labels
        assert "bug" in labels
        assert "module:grid-generator" in labels
        assert "os:windows" in labels
    
    def test_generate_labels_for_enhancement(self):
        """Test label generation for feature requests."""
        payload = self.sample_payload.copy()
        payload["report_type"] = "enhancement"
        
        labels = self.generator._generate_labels(payload)
        
        assert "from-storycore" in labels
        assert "enhancement" in labels
        assert "bug" not in labels
    
    def test_generate_labels_for_question(self):
        """Test label generation for questions."""
        payload = self.sample_payload.copy()
        payload["report_type"] = "question"
        
        labels = self.generator._generate_labels(payload)
        
        assert "from-storycore" in labels
        assert "question" in labels
        assert "bug" not in labels
    
    def test_generate_labels_for_different_os(self):
        """Test OS label generation for different platforms."""
        # Test macOS
        payload_macos = self.sample_payload.copy()
        payload_macos["system_info"]["os_platform"] = "Darwin"
        labels_macos = self.generator._generate_labels(payload_macos)
        assert "os:macos" in labels_macos
        
        # Test Linux
        payload_linux = self.sample_payload.copy()
        payload_linux["system_info"]["os_platform"] = "Linux"
        labels_linux = self.generator._generate_labels(payload_linux)
        assert "os:linux" in labels_linux
    
    def test_generate_labels_without_module(self):
        """Test label generation when module is unknown."""
        payload = self.sample_payload.copy()
        payload["module_context"]["active_module"] = "unknown"
        
        labels = self.generator._generate_labels(payload)
        
        # Should not include module label for unknown modules
        assert not any(label.startswith("module:") for label in labels)
    
    def test_format_issue_body_with_screenshot(self):
        """Test formatting when screenshot is included."""
        payload = self.sample_payload.copy()
        payload["screenshot_base64"] = "base64encodeddata..."
        
        body = self.generator.format_issue_body(payload)
        
        assert "## Screenshot" in body
        assert "Screenshot attached" in body
    
    def test_url_encoding_special_characters(self):
        """Test that special characters in description are properly encoded."""
        payload = self.sample_payload.copy()
        payload["user_input"]["description"] = "Error with special chars: & < > \" ' /"
        
        url = self.generator.generate_github_url(payload)
        
        # URL should be properly encoded - special chars should be percent-encoded
        assert "%26" in url  # & should be encoded as %26
        assert "%3C" in url or "%3E" in url  # < or > should be encoded
        assert url.startswith("https://github.com/")
