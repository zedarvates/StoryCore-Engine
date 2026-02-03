"""
Unit tests for the payload validator module.

These tests verify that the JSON schema validator correctly validates
Report_Payload structures according to the schema defined in the design document.

Requirements: 5.2 - Payload Schema Validation
"""

import pytest
from datetime import datetime
from backend.payload_validator import (
    validate_payload,
    validate_payload_detailed,
    get_schema,
    validate_schema_version,
    REPORT_PAYLOAD_SCHEMA
)


# Helper function to create a valid payload
def create_valid_payload(**overrides):
    """Create a valid report payload with optional field overrides."""
    payload = {
        "schema_version": "1.0",
        "report_type": "bug",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "system_info": {
            "storycore_version": "1.0.0",
            "python_version": "3.9.0",
            "os_platform": "Linux",
            "os_version": "Ubuntu 22.04",
            "language": "en-US"
        },
        "module_context": {
            "active_module": "promotion-engine",
            "module_state": {"status": "active"}
        },
        "user_input": {
            "description": "This is a test bug report with sufficient length",
            "reproduction_steps": "1. Do this\n2. Do that\n3. See error"
        },
        "diagnostics": {
            "stacktrace": "Traceback (most recent call last):\n  File test.py, line 1",
            "logs": ["Log line 1", "Log line 2"],
            "memory_usage_mb": 256.5,
            "process_state": {"pid": 12345}
        },
        "screenshot_base64": None
    }
    
    # Apply overrides
    for key, value in overrides.items():
        if '.' in key:
            # Handle nested keys like "system_info.os_platform"
            parts = key.split('.')
            current = payload
            for part in parts[:-1]:
                current = current[part]
            current[parts[-1]] = value
        else:
            payload[key] = value
    
    return payload


class TestValidatePayload:
    """Tests for the validate_payload function."""
    
    def test_valid_payload_passes(self):
        """Test that a valid payload passes validation."""
        payload = create_valid_payload()
        is_valid, errors = validate_payload(payload)
        
        assert is_valid is True
        assert errors == []
    
    def test_missing_required_field_fails(self):
        """Test that missing required fields are detected."""
        payload = create_valid_payload()
        del payload["report_type"]
        
        is_valid, errors = validate_payload(payload)
        
        assert is_valid is False
        assert len(errors) > 0
        assert "report_type" in errors[0] or "required" in errors[0].lower()
    
    def test_invalid_report_type_fails(self):
        """Test that invalid report types are rejected."""
        payload = create_valid_payload(report_type="invalid_type")
        
        is_valid, errors = validate_payload(payload)
        
        assert is_valid is False
        assert len(errors) > 0
        assert "report_type" in errors[0] or "enum" in errors[0].lower()
    
    def test_valid_report_types_pass(self):
        """Test that all valid report types are accepted."""
        for report_type in ["bug", "enhancement", "question"]:
            payload = create_valid_payload(report_type=report_type)
            is_valid, errors = validate_payload(payload)
            
            assert is_valid is True, f"Report type '{report_type}' should be valid"
            assert errors == []
    
    def test_invalid_schema_version_fails(self):
        """Test that invalid schema versions are rejected."""
        payload = create_valid_payload(schema_version="2.0")
        
        is_valid, errors = validate_payload(payload)
        
        assert is_valid is False
        assert len(errors) > 0
        assert "schema_version" in errors[0] or "1.0" in errors[0]
    
    def test_description_too_short_fails(self):
        """Test that descriptions shorter than 10 characters are rejected."""
        payload = create_valid_payload()
        payload["user_input"]["description"] = "Short"
        
        is_valid, errors = validate_payload(payload)
        
        assert is_valid is False
        assert len(errors) > 0
        assert "description" in errors[0] or "minLength" in errors[0]
    
    def test_description_minimum_length_passes(self):
        """Test that descriptions with exactly 10 characters pass."""
        payload = create_valid_payload()
        payload["user_input"]["description"] = "1234567890"  # Exactly 10 chars
        
        is_valid, errors = validate_payload(payload)
        
        assert is_valid is True
        assert errors == []
    
    def test_missing_system_info_required_field_fails(self):
        """Test that missing required system_info fields are detected."""
        payload = create_valid_payload()
        del payload["system_info"]["python_version"]
        
        is_valid, errors = validate_payload(payload)
        
        assert is_valid is False
        assert len(errors) > 0
        assert "python_version" in errors[0] or "required" in errors[0].lower()
    
    def test_invalid_python_version_format_fails(self):
        """Test that invalid Python version formats are rejected."""
        payload = create_valid_payload()
        payload["system_info"]["python_version"] = "invalid"
        
        is_valid, errors = validate_payload(payload)
        
        assert is_valid is False
        assert len(errors) > 0
        assert "python_version" in errors[0] or "pattern" in errors[0].lower()
    
    def test_valid_python_version_formats_pass(self):
        """Test that valid Python version formats are accepted."""
        valid_versions = ["3.9", "3.9.0", "3.10.5", "3.11.0"]
        
        for version in valid_versions:
            payload = create_valid_payload()
            payload["system_info"]["python_version"] = version
            is_valid, errors = validate_payload(payload)
            
            assert is_valid is True, f"Python version '{version}' should be valid"
            assert errors == []
    
    def test_invalid_os_platform_fails(self):
        """Test that invalid OS platforms are rejected."""
        payload = create_valid_payload()
        payload["system_info"]["os_platform"] = "InvalidOS"
        
        is_valid, errors = validate_payload(payload)
        
        assert is_valid is False
        assert len(errors) > 0
        assert "os_platform" in errors[0] or "enum" in errors[0].lower()
    
    def test_valid_os_platforms_pass(self):
        """Test that all valid OS platforms are accepted."""
        valid_platforms = ["Windows", "Darwin", "Linux", "windows", "darwin", "linux", "macos", "macOS"]
        
        for platform in valid_platforms:
            payload = create_valid_payload()
            payload["system_info"]["os_platform"] = platform
            is_valid, errors = validate_payload(payload)
            
            assert is_valid is True, f"OS platform '{platform}' should be valid"
            assert errors == []
    
    def test_optional_fields_can_be_omitted(self):
        """Test that optional fields can be omitted."""
        payload = create_valid_payload()
        del payload["module_context"]
        del payload["diagnostics"]
        del payload["screenshot_base64"]
        payload["system_info"].pop("os_version", None)
        payload["system_info"].pop("language", None)
        payload["user_input"].pop("reproduction_steps", None)
        
        is_valid, errors = validate_payload(payload)
        
        assert is_valid is True
        assert errors == []
    
    def test_null_stacktrace_is_valid(self):
        """Test that null stacktrace is accepted."""
        payload = create_valid_payload()
        payload["diagnostics"]["stacktrace"] = None
        
        is_valid, errors = validate_payload(payload)
        
        assert is_valid is True
        assert errors == []
    
    def test_null_screenshot_is_valid(self):
        """Test that null screenshot is accepted."""
        payload = create_valid_payload(screenshot_base64=None)
        
        is_valid, errors = validate_payload(payload)
        
        assert is_valid is True
        assert errors == []
    
    def test_valid_base64_screenshot_passes(self):
        """Test that valid base64 screenshots are accepted."""
        # Valid base64 string
        valid_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        payload = create_valid_payload(screenshot_base64=valid_base64)
        
        is_valid, errors = validate_payload(payload)
        
        assert is_valid is True
        assert errors == []
    
    def test_invalid_base64_screenshot_fails(self):
        """Test that invalid base64 screenshots are rejected."""
        # Invalid base64 (contains invalid characters)
        invalid_base64 = "This is not base64!@#$%"
        payload = create_valid_payload(screenshot_base64=invalid_base64)
        
        is_valid, errors = validate_payload(payload)
        
        assert is_valid is False
        assert len(errors) > 0
    
    def test_additional_properties_fail(self):
        """Test that additional properties are rejected."""
        payload = create_valid_payload()
        payload["extra_field"] = "should not be here"
        
        is_valid, errors = validate_payload(payload)
        
        assert is_valid is False
        assert len(errors) > 0
        assert "additional" in errors[0].lower() or "extra_field" in errors[0]
    
    def test_negative_memory_usage_fails(self):
        """Test that negative memory usage is rejected."""
        payload = create_valid_payload()
        payload["diagnostics"]["memory_usage_mb"] = -100
        
        is_valid, errors = validate_payload(payload)
        
        assert is_valid is False
        assert len(errors) > 0
        assert "memory_usage_mb" in errors[0] or "minimum" in errors[0].lower()
    
    def test_zero_memory_usage_passes(self):
        """Test that zero memory usage is accepted."""
        payload = create_valid_payload()
        payload["diagnostics"]["memory_usage_mb"] = 0
        
        is_valid, errors = validate_payload(payload)
        
        assert is_valid is True
        assert errors == []
    
    def test_empty_logs_array_passes(self):
        """Test that empty logs array is accepted."""
        payload = create_valid_payload()
        payload["diagnostics"]["logs"] = []
        
        is_valid, errors = validate_payload(payload)
        
        assert is_valid is True
        assert errors == []
    
    def test_logs_with_multiple_entries_pass(self):
        """Test that logs with multiple entries are accepted."""
        payload = create_valid_payload()
        payload["diagnostics"]["logs"] = [f"Log line {i}" for i in range(100)]
        
        is_valid, errors = validate_payload(payload)
        
        assert is_valid is True
        assert errors == []


class TestValidatePayloadDetailed:
    """Tests for the validate_payload_detailed function."""
    
    def test_valid_payload_returns_empty_errors(self):
        """Test that valid payload returns empty error list."""
        payload = create_valid_payload()
        is_valid, errors = validate_payload_detailed(payload)
        
        assert is_valid is True
        assert errors == []
    
    def test_multiple_errors_are_collected(self):
        """Test that multiple validation errors are collected."""
        payload = create_valid_payload()
        del payload["report_type"]  # Missing required field
        payload["user_input"]["description"] = "Short"  # Too short
        
        is_valid, errors = validate_payload_detailed(payload)
        
        assert is_valid is False
        assert len(errors) >= 2  # Should have at least 2 errors
    
    def test_error_details_have_required_fields(self):
        """Test that error details contain required fields."""
        payload = create_valid_payload(report_type="invalid")
        is_valid, errors = validate_payload_detailed(payload)
        
        assert is_valid is False
        assert len(errors) > 0
        
        error = errors[0]
        assert "path" in error
        assert "message" in error
        assert "validator" in error
        assert "constraint" in error
    
    def test_error_path_is_correct(self):
        """Test that error path correctly identifies the location."""
        payload = create_valid_payload()
        payload["system_info"]["python_version"] = "invalid"
        
        is_valid, errors = validate_payload_detailed(payload)
        
        assert is_valid is False
        assert len(errors) > 0
        assert "system_info" in errors[0]["path"]
        assert "python_version" in errors[0]["path"]


class TestGetSchema:
    """Tests for the get_schema function."""
    
    def test_returns_schema_dict(self):
        """Test that get_schema returns a dictionary."""
        schema = get_schema()
        
        assert isinstance(schema, dict)
        assert "$schema" in schema
        assert "properties" in schema
    
    def test_schema_has_required_fields(self):
        """Test that schema defines required fields."""
        schema = get_schema()
        
        assert "required" in schema
        assert "schema_version" in schema["required"]
        assert "report_type" in schema["required"]
        assert "timestamp" in schema["required"]
        assert "system_info" in schema["required"]
        assert "user_input" in schema["required"]
    
    def test_schema_defines_report_types(self):
        """Test that schema defines valid report types."""
        schema = get_schema()
        
        report_type_enum = schema["properties"]["report_type"]["enum"]
        assert "bug" in report_type_enum
        assert "enhancement" in report_type_enum
        assert "question" in report_type_enum
    
    def test_returns_copy_not_reference(self):
        """Test that get_schema returns a copy, not a reference."""
        schema1 = get_schema()
        schema2 = get_schema()
        
        # Modify schema1
        schema1["modified"] = True
        
        # schema2 should not be affected
        assert "modified" not in schema2


class TestValidateSchemaVersion:
    """Tests for the validate_schema_version function."""
    
    def test_valid_version_passes(self):
        """Test that valid schema version passes."""
        payload = {"schema_version": "1.0"}
        is_valid, message = validate_schema_version(payload)
        
        assert is_valid is True
        assert "1.0" in message
        assert "valid" in message.lower()
    
    def test_missing_version_fails(self):
        """Test that missing schema version fails."""
        payload = {}
        is_valid, message = validate_schema_version(payload)
        
        assert is_valid is False
        assert "missing" in message.lower()
        assert "schema_version" in message.lower()
    
    def test_invalid_version_fails(self):
        """Test that invalid schema version fails."""
        payload = {"schema_version": "2.0"}
        is_valid, message = validate_schema_version(payload)
        
        assert is_valid is False
        assert "unsupported" in message.lower() or "2.0" in message
    
    def test_non_string_version_fails(self):
        """Test that non-string schema version fails."""
        payload = {"schema_version": 1.0}
        is_valid, message = validate_schema_version(payload)
        
        assert is_valid is False
        assert "string" in message.lower()


class TestSchemaConstant:
    """Tests for the REPORT_PAYLOAD_SCHEMA constant."""
    
    def test_schema_is_dict(self):
        """Test that schema constant is a dictionary."""
        assert isinstance(REPORT_PAYLOAD_SCHEMA, dict)
    
    def test_schema_has_json_schema_version(self):
        """Test that schema declares JSON Schema version."""
        assert "$schema" in REPORT_PAYLOAD_SCHEMA
        assert "draft-07" in REPORT_PAYLOAD_SCHEMA["$schema"]
    
    def test_schema_is_object_type(self):
        """Test that root schema type is object."""
        assert REPORT_PAYLOAD_SCHEMA["type"] == "object"
    
    def test_schema_has_properties(self):
        """Test that schema defines properties."""
        assert "properties" in REPORT_PAYLOAD_SCHEMA
        assert len(REPORT_PAYLOAD_SCHEMA["properties"]) > 0


# Integration test with realistic payload
class TestRealisticPayloads:
    """Tests with realistic payload examples."""
    
    def test_minimal_bug_report(self):
        """Test a minimal valid bug report."""
        payload = {
            "schema_version": "1.0",
            "report_type": "bug",
            "timestamp": "2024-01-15T10:30:00Z",
            "system_info": {
                "storycore_version": "1.0.0",
                "python_version": "3.9.0",
                "os_platform": "Linux"
            },
            "user_input": {
                "description": "Application crashes when opening large files"
            }
        }
        
        is_valid, errors = validate_payload(payload)
        assert is_valid is True
        assert errors == []
    
    def test_complete_bug_report_with_diagnostics(self):
        """Test a complete bug report with all optional fields."""
        payload = create_valid_payload()
        
        is_valid, errors = validate_payload(payload)
        assert is_valid is True
        assert errors == []
    
    def test_feature_request(self):
        """Test a feature request payload."""
        payload = create_valid_payload(
            report_type="enhancement",
            **{"user_input.description": "Add dark mode support to the UI"}
        )
        payload["user_input"]["description"] = "Add dark mode support to the UI"
        # Remove diagnostics instead of setting to None
        del payload["diagnostics"]
        
        is_valid, errors = validate_payload(payload)
        assert is_valid is True
        assert errors == []
    
    def test_question_without_diagnostics(self):
        """Test a question payload without diagnostics."""
        payload = {
            "schema_version": "1.0",
            "report_type": "question",
            "timestamp": "2024-01-15T10:30:00Z",
            "system_info": {
                "storycore_version": "1.0.0",
                "python_version": "3.9.0",
                "os_platform": "Windows"
            },
            "user_input": {
                "description": "How do I configure the promotion engine parameters?"
            }
        }
        
        is_valid, errors = validate_payload(payload)
        assert is_valid is True
        assert errors == []


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
