"""
Test Schema Version Handling

Tests for backward compatibility and schema version migration functionality.

Requirements: 9.5 (Backward Compatibility)
"""

import pytest
from backend.payload_validator import (
    validate_schema_version,
    get_supported_schema_versions,
    migrate_payload_to_current_version
)


class TestSchemaVersionValidation:
    """Test schema version validation functionality."""
    
    def test_valid_schema_version(self):
        """Test that version 1.0 is valid."""
        payload = {"schema_version": "1.0"}
        is_valid, message = validate_schema_version(payload)
        
        assert is_valid is True
        assert "1.0" in message
        assert "valid" in message.lower()
    
    def test_missing_schema_version(self):
        """Test that missing schema_version is detected."""
        payload = {"report_type": "bug"}
        is_valid, message = validate_schema_version(payload)
        
        assert is_valid is False
        assert "missing" in message.lower()
        assert "schema_version" in message.lower()
    
    def test_invalid_schema_version_type(self):
        """Test that non-string schema_version is rejected."""
        payload = {"schema_version": 1.0}  # Number instead of string
        is_valid, message = validate_schema_version(payload)
        
        assert is_valid is False
        assert "string" in message.lower()
    
    def test_unsupported_schema_version(self):
        """Test that unsupported versions are rejected."""
        payload = {"schema_version": "2.0"}
        is_valid, message = validate_schema_version(payload)
        
        assert is_valid is False
        assert "unsupported" in message.lower()
        assert "2.0" in message


class TestSupportedVersions:
    """Test supported schema versions functionality."""
    
    def test_get_supported_versions(self):
        """Test that supported versions list is returned."""
        versions = get_supported_schema_versions()
        
        assert isinstance(versions, list)
        assert len(versions) > 0
        assert "1.0" in versions


class TestPayloadMigration:
    """Test payload migration from older versions."""
    
    def test_migrate_phase1_payload_missing_version(self):
        """Test migration of Phase 1 payload without schema_version."""
        # Phase 1 payload (MVP - Manual Mode only)
        phase1_payload = {
            "report_type": "bug",
            "timestamp": "2024-01-01T00:00:00Z",
            "system_info": {
                "storycore_version": "0.1.0",
                "python_version": "3.9.0",
                "os_platform": "Linux"
            },
            "user_input": {
                "description": "Test bug report from Phase 1",
                "reproduction_steps": "Step 1, Step 2"
            }
        }
        
        migrated, notes = migrate_payload_to_current_version(phase1_payload)
        
        # Check that schema_version was added
        assert migrated["schema_version"] == "1.0"
        
        # Check that missing fields were added with defaults
        assert "module_context" in migrated
        assert migrated["module_context"]["active_module"] == "unknown"
        
        assert "diagnostics" in migrated
        assert migrated["diagnostics"]["stacktrace"] is None
        assert migrated["diagnostics"]["logs"] == []
        
        assert "screenshot_base64" in migrated
        assert migrated["screenshot_base64"] is None
        
        # Check migration notes
        assert len(notes) > 0
        assert any("Phase 1" in note for note in notes)
    
    def test_migrate_version_0_9_payload(self):
        """Test migration of version 0.9 payload."""
        old_payload = {
            "schema_version": "0.9",
            "report_type": "enhancement",
            "timestamp": "2024-01-01T00:00:00Z",
            "system_info": {
                "storycore_version": "0.1.0",
                "python_version": "3.9.0",
                "os_platform": "Darwin"
            },
            "user_input": {
                "description": "Feature request from version 0.9"
            }
        }
        
        migrated, notes = migrate_payload_to_current_version(old_payload)
        
        # Check version was updated
        assert migrated["schema_version"] == "1.0"
        
        # Check missing fields were added
        assert "module_context" in migrated
        assert "diagnostics" in migrated
        assert "screenshot_base64" in migrated
        
        # Check migration notes mention version migration
        assert any("0.9" in note and "1.0" in note for note in notes)
    
    def test_migrate_current_version_no_changes(self):
        """Test that current version payloads pass through unchanged."""
        current_payload = {
            "schema_version": "1.0",
            "report_type": "question",
            "timestamp": "2024-01-01T00:00:00Z",
            "system_info": {
                "storycore_version": "0.1.0",
                "python_version": "3.9.0",
                "os_platform": "Windows"
            },
            "module_context": {
                "active_module": "grid-generator",
                "module_state": {}
            },
            "user_input": {
                "description": "Question about the system"
            },
            "diagnostics": {
                "stacktrace": None,
                "logs": [],
                "memory_usage_mb": 100,
                "process_state": {}
            },
            "screenshot_base64": None
        }
        
        migrated, notes = migrate_payload_to_current_version(current_payload)
        
        # Check that payload is essentially unchanged
        assert migrated["schema_version"] == "1.0"
        assert migrated["report_type"] == "question"
        assert migrated["module_context"]["active_module"] == "grid-generator"
        
        # Check notes indicate no migration needed
        assert any("already at current version" in note.lower() for note in notes)
    
    def test_migrate_partial_1_0_payload(self):
        """Test migration of 1.0 payload with missing optional fields."""
        partial_payload = {
            "schema_version": "1.0",
            "report_type": "bug",
            "timestamp": "2024-01-01T00:00:00Z",
            "system_info": {
                "storycore_version": "0.1.0",
                "python_version": "3.9.0",
                "os_platform": "Linux"
            },
            "user_input": {
                "description": "Bug report with missing optional fields"
            }
            # Missing: module_context, diagnostics, screenshot_base64
        }
        
        migrated, notes = migrate_payload_to_current_version(partial_payload)
        
        # Check that missing fields were added
        assert "module_context" in migrated
        assert "diagnostics" in migrated
        assert "screenshot_base64" in migrated
        
        # Check migration notes
        assert len(notes) > 0
    
    def test_migrate_preserves_existing_data(self):
        """Test that migration preserves existing data."""
        payload_with_data = {
            "schema_version": "0.9",
            "report_type": "bug",
            "timestamp": "2024-01-01T00:00:00Z",
            "system_info": {
                "storycore_version": "0.1.0",
                "python_version": "3.9.0",
                "os_platform": "Darwin",
                "os_version": "14.0",
                "language": "en_US"
            },
            "user_input": {
                "description": "Detailed bug report with lots of information",
                "reproduction_steps": "Step 1\nStep 2\nStep 3"
            },
            "module_context": {
                "active_module": "promotion-engine",
                "module_state": {"key": "value"}
            }
        }
        
        migrated, notes = migrate_payload_to_current_version(payload_with_data)
        
        # Check that existing data is preserved
        assert migrated["system_info"]["os_version"] == "14.0"
        assert migrated["system_info"]["language"] == "en_US"
        assert migrated["user_input"]["reproduction_steps"] == "Step 1\nStep 2\nStep 3"
        assert migrated["module_context"]["active_module"] == "promotion-engine"
        assert migrated["module_context"]["module_state"]["key"] == "value"
        
        # Check that missing fields were added
        assert "diagnostics" in migrated
        assert "screenshot_base64" in migrated


class TestMigrationIntegration:
    """Test integration of migration with validation."""
    
    def test_migrate_then_validate(self):
        """Test that migrated payloads pass validation."""
        from backend.payload_validator import validate_payload
        
        # Start with Phase 1 payload
        phase1_payload = {
            "report_type": "bug",
            "timestamp": "2024-01-01T00:00:00Z",
            "system_info": {
                "storycore_version": "0.1.0",
                "python_version": "3.9.0",
                "os_platform": "Linux"
            },
            "user_input": {
                "description": "This is a test bug report with sufficient length"
            }
        }
        
        # Migrate it
        migrated, notes = migrate_payload_to_current_version(phase1_payload)
        
        # Validate the migrated payload
        is_valid, errors = validate_payload(migrated)
        
        # Should pass validation
        assert is_valid is True
        assert len(errors) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
