"""
Unit tests for error handling and exception classes.

Tests security errors, validation errors, resource errors, and error response formatting.
"""

import pytest
from datetime import datetime

from ..exceptions import (
    AssistantError,
    SecurityError,
    ValidationError,
    ResourceError,
    SystemError,
    ConfirmationRequiredError,
    ProjectNotFoundError,
    StorageLimitExceededError,
    PathValidationError,
    DataContractViolationError,
    ProjectError
)


class TestSecurityErrors:
    """Test security error responses."""
    
    def test_security_error_basic(self):
        """Test basic security error creation."""
        error = SecurityError(
            message="Unauthorized access attempt",
            code="UNAUTHORIZED",
            details={"path": "/etc/passwd"},
            suggested_action="Check permissions"
        )
        
        assert error.message == "Unauthorized access attempt"
        assert error.code == "UNAUTHORIZED"
        assert error.category == "security"
        assert error.details["path"] == "/etc/passwd"
        assert error.suggested_action == "Check permissions"
    
    def test_security_error_to_dict(self):
        """Test security error conversion to dictionary."""
        error = SecurityError(
            message="Access denied",
            code="ACCESS_DENIED"
        )
        
        error_dict = error.to_dict()
        
        assert "error" in error_dict
        assert error_dict["error"]["code"] == "ACCESS_DENIED"
        assert error_dict["error"]["message"] == "Access denied"
        assert error_dict["error"]["category"] == "security"
        assert "timestamp" in error_dict["error"]
    
    def test_path_validation_error(self):
        """Test path validation error."""
        error = PathValidationError(
            path="/etc/passwd",
            reason="Path outside project directory"
        )
        
        assert error.code == "PATH_VALIDATION_ERROR"
        assert error.category == "security"
        assert error.details["path"] == "/etc/passwd"
        assert error.details["reason"] == "Path outside project directory"


class TestValidationErrors:
    """Test validation error responses."""
    
    def test_validation_error_basic(self):
        """Test basic validation error creation."""
        error = ValidationError(
            message="Invalid project data",
            code="INVALID_DATA",
            details={"field": "project_name", "error": "Required field missing"},
            suggested_action="Provide project name"
        )
        
        assert error.message == "Invalid project data"
        assert error.code == "INVALID_DATA"
        assert error.category == "validation"
        assert error.details["field"] == "project_name"
    
    def test_data_contract_violation_error(self):
        """Test Data Contract violation error."""
        violations = [
            "Missing required field: project_name",
            "Invalid schema version: 2.0"
        ]
        
        error = DataContractViolationError(violations=violations)
        
        assert error.code == "DATA_CONTRACT_VIOLATION"
        assert error.category == "validation"
        assert error.details["violations"] == violations
        assert len(error.details["violations"]) == 2
    
    def test_validation_error_to_dict(self):
        """Test validation error conversion to dictionary."""
        error = ValidationError(
            message="Validation failed",
            details={"errors": ["Error 1", "Error 2"]}
        )
        
        error_dict = error.to_dict()
        
        assert error_dict["error"]["category"] == "validation"
        assert error_dict["error"]["details"]["errors"] == ["Error 1", "Error 2"]


class TestResourceErrors:
    """Test resource error responses."""
    
    def test_resource_error_basic(self):
        """Test basic resource error creation."""
        error = ResourceError(
            message="File not found",
            code="FILE_NOT_FOUND",
            details={"path": "/path/to/file.txt"},
            suggested_action="Check file path"
        )
        
        assert error.message == "File not found"
        assert error.code == "FILE_NOT_FOUND"
        assert error.category == "resource"
        assert error.details["path"] == "/path/to/file.txt"
    
    def test_project_not_found_error(self):
        """Test project not found error."""
        available = ["project1", "project2", "project3"]
        
        error = ProjectNotFoundError(
            project_name="missing_project",
            available_projects=available
        )
        
        assert error.code == "PROJECT_NOT_FOUND"
        assert error.category == "resource"
        assert error.details["project_name"] == "missing_project"
        assert error.details["available_projects"] == available
        assert "missing_project" in error.message
    
    def test_storage_limit_exceeded_error(self):
        """Test storage limit exceeded error."""
        error = StorageLimitExceededError(
            limit_type="storage_size",
            current_value=55.0,
            limit_value=50.0
        )
        
        assert error.code == "STORAGE_LIMIT_EXCEEDED"
        assert error.category == "resource"
        assert error.details["limit_type"] == "storage_size"
        assert error.details["current_value"] == 55.0
        assert error.details["limit_value"] == 50.0
        assert "storage_size" in error.message
    
    def test_storage_limit_file_count(self):
        """Test storage limit exceeded for file count."""
        error = StorageLimitExceededError(
            limit_type="file_count",
            current_value=250,
            limit_value=248
        )
        
        assert error.details["limit_type"] == "file_count"
        assert error.details["current_value"] == 250
        assert error.details["limit_value"] == 248


class TestConfirmationErrors:
    """Test confirmation required errors."""
    
    def test_confirmation_required_error(self):
        """Test confirmation required error."""
        error = ConfirmationRequiredError(
            message="Deletion requires confirmation",
            file_path="/path/to/file.txt",
            file_size=1024
        )
        
        assert error.code == "CONFIRMATION_REQUIRED"
        assert error.category == "validation"
        assert error.details["file_path"] == "/path/to/file.txt"
        assert error.details["file_size_bytes"] == 1024
        assert "confirmation" in error.suggested_action.lower()
    
    def test_confirmation_without_size(self):
        """Test confirmation error without file size."""
        error = ConfirmationRequiredError(
            message="Deletion requires confirmation",
            file_path="/path/to/file.txt"
        )
        
        assert error.details["file_path"] == "/path/to/file.txt"
        assert "file_size_bytes" not in error.details


class TestProjectErrors:
    """Test project-related errors."""
    
    def test_project_error_basic(self):
        """Test basic project error."""
        error = ProjectError(
            message="Project is corrupted",
            code="PROJECT_CORRUPTED",
            details={"project_name": "test_project"},
            suggested_action="Restore from backup"
        )
        
        assert error.message == "Project is corrupted"
        assert error.code == "PROJECT_CORRUPTED"
        assert error.category == "resource"
        assert error.details["project_name"] == "test_project"


class TestSystemErrors:
    """Test system error responses."""
    
    def test_system_error_basic(self):
        """Test basic system error creation."""
        error = SystemError(
            message="Internal server error",
            code="INTERNAL_ERROR",
            details={"component": "database"},
            suggested_action="Contact support"
        )
        
        assert error.message == "Internal server error"
        assert error.code == "INTERNAL_ERROR"
        assert error.category == "system"
        assert error.details["component"] == "database"


class TestErrorResponseFormat:
    """Test error response formatting."""
    
    def test_error_response_structure(self):
        """Test that error responses have correct structure."""
        error = ValidationError(
            message="Test error",
            code="TEST_ERROR",
            details={"field": "test"},
            suggested_action="Fix it"
        )
        
        response = error.to_dict()
        
        # Check top-level structure
        assert "error" in response
        assert isinstance(response["error"], dict)
        
        # Check required fields
        error_obj = response["error"]
        assert "code" in error_obj
        assert "message" in error_obj
        assert "category" in error_obj
        assert "details" in error_obj
        assert "suggestedAction" in error_obj
        assert "timestamp" in error_obj
    
    def test_error_timestamp_format(self):
        """Test that error timestamp is in ISO format."""
        error = SecurityError(message="Test", code="TEST")
        response = error.to_dict()
        
        timestamp = response["error"]["timestamp"]
        
        # Should be ISO format with Z suffix
        assert timestamp.endswith("Z")
        
        # Should be parseable as ISO datetime
        # Remove Z and parse
        datetime.fromisoformat(timestamp[:-1])
    
    def test_error_details_optional(self):
        """Test that error details are optional."""
        error = ResourceError(
            message="Test error",
            code="TEST_ERROR"
        )
        
        response = error.to_dict()
        
        # Details should be empty dict, not None
        assert response["error"]["details"] == {}
    
    def test_error_suggested_action_optional(self):
        """Test that suggested action is optional."""
        error = ValidationError(
            message="Test error",
            code="TEST_ERROR"
        )
        
        response = error.to_dict()
        
        # Suggested action should be None if not provided
        assert response["error"]["suggestedAction"] is None


class TestErrorInheritance:
    """Test error class inheritance."""
    
    def test_all_errors_inherit_from_assistant_error(self):
        """Test that all custom errors inherit from AssistantError."""
        errors = [
            SecurityError("test", "TEST"),
            ValidationError("test", "TEST"),
            ResourceError("test", "TEST"),
            SystemError("test", "TEST"),
            ProjectError("test", "TEST")
        ]
        
        for error in errors:
            assert isinstance(error, AssistantError)
            assert isinstance(error, Exception)
    
    def test_specialized_errors_inherit_from_base_categories(self):
        """Test that specialized errors inherit from base category errors."""
        # Security errors
        assert isinstance(PathValidationError("path", "reason"), SecurityError)
        
        # Validation errors
        assert isinstance(DataContractViolationError([]), ValidationError)
        assert isinstance(ConfirmationRequiredError("msg", "path"), AssistantError)  # Inherits from AssistantError
        
        # Resource errors
        assert isinstance(ProjectNotFoundError("name"), ResourceError)
        assert isinstance(StorageLimitExceededError("type", 1, 2), ResourceError)
