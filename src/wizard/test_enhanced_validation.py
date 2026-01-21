"""
Unit tests for Enhanced Validation System.
"""

import pytest
from .enhanced_validation import (
    ValidationError,
    ValidationResult,
    ValidationSeverity,
    ValidationType,
    ValidationRule,
    WizardValidator,
    WizardValidationManager,
    create_wizard_validator,
    validate_wizard_form,
    get_field_requirements,
    get_user_friendly_message
)


class TestValidationError:
    """Test ValidationError class."""

    def test_validation_error_creation(self):
        """Test creating a validation error."""
        error = ValidationError(
            field="test_field",
            message="Test error message",
            severity=ValidationSeverity.ERROR,
            validation_type=ValidationType.REQUIRED,
            suggested_fix="Try this fix",
            related_fields=["field1", "field2"]
        )

        assert error.field == "test_field"
        assert error.message == "Test error message"
        assert error.severity == ValidationSeverity.ERROR
        assert error.validation_type == ValidationType.REQUIRED
        assert error.suggested_fix == "Try this fix"
        assert error.related_fields == ["field1", "field2"]

    def test_to_dict(self):
        """Test converting error to dictionary."""
        error = ValidationError(
            field="name",
            message="Name is required",
            severity=ValidationSeverity.ERROR,
            validation_type=ValidationType.REQUIRED
        )

        result = error.to_dict()

        expected = {
            "field": "name",
            "message": "Name is required",
            "severity": "error",
            "type": "required",
            "suggested_fix": None,
            "related_fields": []
        }

        assert result == expected


class TestValidationResult:
    """Test ValidationResult class."""

    def test_validation_result_creation(self):
        """Test creating a validation result."""
        result = ValidationResult(is_valid=True)

        assert result.is_valid is True
        assert result.errors == []
        assert result.warnings == []
        assert result.suggestions == []

    def test_add_error(self):
        """Test adding errors to result."""
        result = ValidationResult(is_valid=True)
        error = ValidationError(field="name", message="Required")

        result.add_error(error)

        assert result.is_valid is False
        assert len(result.errors) == 1
        assert result.errors[0] == error

    def test_add_warning(self):
        """Test adding warnings to result."""
        result = ValidationResult(is_valid=True)
        warning = ValidationError(
            field="tone",
            message="Consider different tone",
            severity=ValidationSeverity.WARNING
        )

        result.add_warning(warning)

        assert result.is_valid is True  # Warnings don't invalidate
        assert len(result.warnings) == 1
        assert result.warnings[0] == warning

    def test_get_errors_by_severity(self):
        """Test filtering errors by severity."""
        result = ValidationResult(is_valid=False)

        error = ValidationError(field="name", message="Required", severity=ValidationSeverity.ERROR)
        warning = ValidationError(field="tone", message="Suggestion", severity=ValidationSeverity.WARNING)

        result.add_error(error)
        result.add_warning(warning)

        critical_errors = result.get_errors_by_severity(ValidationSeverity.CRITICAL)
        assert len(critical_errors) == 0

        error_errors = result.get_errors_by_severity(ValidationSeverity.ERROR)
        assert len(error_errors) == 1
        assert error_errors[0] == error

    def test_has_blocking_errors(self):
        """Test checking for blocking errors."""
        result = ValidationResult(is_valid=True)

        # Add warning - should not block
        warning = ValidationError(field="tone", message="Suggestion", severity=ValidationSeverity.WARNING)
        result.add_warning(warning)
        assert not result.has_blocking_errors()

        # Add error - should block
        error = ValidationError(field="name", message="Required", severity=ValidationSeverity.ERROR)
        result.add_error(error)
        assert result.has_blocking_errors()


class TestValidationRule:
    """Test ValidationRule class."""

    def test_validation_rule_creation(self):
        """Test creating a validation rule."""
        rule = ValidationRule(
            validation_type=ValidationType.REQUIRED,
            condition=lambda x: x is not None,
            error_message="Field is required",
            severity=ValidationSeverity.ERROR,
            suggested_fix="Fill in the field",
            related_fields=["other_field"]
        )

        assert rule.validation_type == ValidationType.REQUIRED
        assert rule.error_message == "Field is required"
        assert rule.severity == ValidationSeverity.ERROR
        assert rule.suggested_fix == "Fill in the field"
        assert rule.related_fields == ["other_field"]

    def test_validate_passing(self):
        """Test validation that passes."""
        rule = ValidationRule(
            validation_type=ValidationType.REQUIRED,
            condition=lambda x: x is not None and len(str(x)) > 0,
            error_message="Field is required"
        )

        result = rule.validate("test value", "test_field")
        assert result is None

    def test_validate_failing(self):
        """Test validation that fails."""
        rule = ValidationRule(
            validation_type=ValidationType.REQUIRED,
            condition=lambda x: x is not None and len(str(x)) > 0,
            error_message="Field is required",
            suggested_fix="Enter a value"
        )

        result = rule.validate("", "test_field")

        assert result is not None
        assert result.field == "test_field"
        assert result.message == "Field is required"
        assert result.suggested_fix == "Enter a value"


class TestWizardValidator:
    """Test WizardValidator class."""

    def test_validator_creation(self):
        """Test creating a validator."""
        validator = WizardValidator()

        assert validator.field_rules == {}
        assert validator.field_dependencies == {}
        assert validator.custom_validators == {}

    def test_add_rule(self):
        """Test adding validation rules."""
        validator = WizardValidator()
        rule = ValidationRule(
            validation_type=ValidationType.REQUIRED,
            condition=lambda x: x is not None,
            error_message="Required"
        )

        validator.add_rule("name", rule)

        assert "name" in validator.field_rules
        assert len(validator.field_rules["name"]) == 1
        assert validator.field_rules["name"][0] == rule

    def test_add_dependency(self):
        """Test adding field dependencies."""
        validator = WizardValidator()

        validator.add_dependency("duration", "format")

        assert "duration" in validator.field_dependencies
        assert "format" in validator.field_dependencies["duration"]

    def test_validate_field_passing(self):
        """Test field validation that passes."""
        validator = WizardValidator()
        rule = ValidationRule(
            validation_type=ValidationType.REQUIRED,
            condition=lambda x: x is not None and len(str(x)) > 0,
            error_message="Required"
        )
        validator.add_rule("name", rule)

        result = validator.validate_field("name", "John Doe")

        assert result.is_valid is True
        assert len(result.errors) == 0

    def test_validate_field_failing(self):
        """Test field validation that fails."""
        validator = WizardValidator()
        rule = ValidationRule(
            validation_type=ValidationType.REQUIRED,
            condition=lambda x: x is not None and len(str(x)) > 0,
            error_message="Name is required"
        )
        validator.add_rule("name", rule)

        result = validator.validate_field("name", "")

        assert result.is_valid is False
        assert len(result.errors) == 1
        assert result.errors[0].message == "Name is required"

    def test_validate_field_with_dependency(self):
        """Test field validation with dependencies."""
        validator = WizardValidator()

        # Add dependency
        validator.add_dependency("duration", "format")

        # Validate without dependency filled
        result = validator.validate_field("duration", 10, {"format": ""})

        assert result.is_valid is False
        assert len(result.errors) == 1
        assert "requires 'format'" in result.errors[0].message

    def test_validate_form(self):
        """Test form validation."""
        validator = WizardValidator()

        # Add rules
        validator.add_rule("name", ValidationRule(
            validation_type=ValidationType.REQUIRED,
            condition=lambda x: x and len(str(x)) > 0,
            error_message="Name is required"
        ))
        validator.add_rule("email", ValidationRule(
            validation_type=ValidationType.FORMAT,
            condition=lambda x: "@" in str(x) if x else True,
            error_message="Invalid email format"
        ))

        form_data = {
            "name": "John",
            "email": "john@example.com"
        }

        result = validator.validate_form(form_data)

        assert result.is_valid is True
        assert len(result.errors) == 0

    def test_get_field_requirements(self):
        """Test getting field requirements."""
        validator = WizardValidator()

        # Add required rule
        validator.add_rule("name", ValidationRule(
            validation_type=ValidationType.REQUIRED,
            condition=lambda x: x is not None,
            error_message="Name is required"
        ))

        # Add dependency
        validator.add_dependency("name", "project")

        requirements = validator.get_field_requirements("name")

        assert requirements["required"] is True
        assert requirements["dependencies"] == ["project"]


class TestWizardValidationManager:
    """Test WizardValidationManager class."""

    def test_manager_creation(self):
        """Test creating a validation manager."""
        manager = WizardValidationManager()

        assert manager.validators == {}

    def test_get_validator_project_init(self):
        """Test getting validator for project init wizard."""
        manager = WizardValidationManager()

        validator = manager.get_validator("project_init")

        assert validator is not None
        assert "project_name" in validator.field_rules

    def test_get_validator_character_wizard(self):
        """Test getting validator for character wizard."""
        manager = WizardValidationManager()

        validator = manager.get_validator("character_wizard")

        assert validator is not None
        assert "name" in validator.field_rules

    def test_get_validator_world_wizard(self):
        """Test getting validator for world wizard."""
        manager = WizardValidationManager()

        validator = manager.get_validator("world_wizard")

        assert validator is not None
        assert "name" in validator.field_rules
        assert "timePeriod" in validator.field_rules

    def test_get_validator_dialogue_wizard(self):
        """Test getting validator for dialogue wizard."""
        manager = WizardValidationManager()

        validator = manager.get_validator("dialogue_wizard")

        assert validator is not None
        assert "characters" in validator.field_rules
        assert "topic" in validator.field_rules


class TestConvenienceFunctions:
    """Test convenience functions."""

    def test_create_wizard_validator(self):
        """Test create_wizard_validator function."""
        validator = create_wizard_validator("project_init")

        assert validator is not None
        assert isinstance(validator, WizardValidator)

    def test_validate_wizard_form(self):
        """Test validate_wizard_form function."""
        form_data = {
            "project_name": "Test Project",
            "format": "court_metrage",
            "duration": 15,
            "story": "A test story with enough content to pass validation."
        }

        result = validate_wizard_form("project_init", form_data)

        assert result.is_valid is True

    def test_validate_wizard_form_with_errors(self):
        """Test validate_wizard_form with validation errors."""
        form_data = {
            "project_name": "",  # Empty name should fail
            "duration": 15,
            "story": "Short"
        }

        result = validate_wizard_form("project_init", form_data)

        assert result.is_valid is False
        assert len(result.errors) > 0

    def test_get_field_requirements(self):
        """Test get_field_requirements function."""
        requirements = get_field_requirements("project_init", "project_name")

        assert requirements["required"] is True


class TestUserFriendlyMessages:
    """Test user-friendly message generation."""

    def test_get_user_friendly_message_with_fix(self):
        """Test user-friendly message with suggested fix."""
        error = ValidationError(
            field="name",
            message="Name is required",
            suggested_fix="Enter a name for your character"
        )

        message = get_user_friendly_message(error)

        assert "Name is required" in message
        assert "💡 Suggestion:" in message
        assert "Enter a name for your character" in message

    def test_get_user_friendly_message_without_fix(self):
        """Test user-friendly message without suggested fix."""
        error = ValidationError(
            field="name",
            message="Name is required"
        )

        message = get_user_friendly_message(error)

        assert message == "Name is required"


class TestIntegrationScenarios:
    """Test integration scenarios."""

    def test_project_init_validation_complete_form(self):
        """Test complete project init form validation."""
        form_data = {
            "project_name": "My Awesome Project",
            "format": "court_metrage",
            "duration": 12,
            "genre": "action",
            "story": "This is a complete story description that should pass all validation rules and contain enough content to be considered valid for the project initialization wizard."
        }

        result = validate_wizard_form("project_init", form_data)

        assert result.is_valid is True
        assert len(result.errors) == 0

    def test_character_wizard_validation(self):
        """Test character wizard validation."""
        form_data = {
            "name": "Alice Johnson",
            "age": 28,
            "personality_traits": ["confident", "intelligent", "compassionate"]
        }

        result = validate_wizard_form("character_wizard", form_data)

        assert result.is_valid is True

    def test_world_wizard_validation(self):
        """Test world wizard validation."""
        form_data = {
            "name": "Eldoria",
            "timePeriod": "Medieval Fantasy",
            "genre": ["fantasy", "adventure"],
            "tone": ["epic", "mysterious"]
        }

        result = validate_wizard_form("world_wizard", form_data)

        assert result.is_valid is True

    def test_dialogue_wizard_validation(self):
        """Test dialogue wizard validation."""
        form_data = {
            "characters": ["Alice", "Bob", "Charlie"],
            "topic": "Planning the heist"
        }

        result = validate_wizard_form("dialogue_wizard", form_data)

        assert result.is_valid is True