"""
Enhanced Validation System for Wizards

Provides better user experience with clear error messages, validation feedback,
and recovery suggestions for wizard forms.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Callable, Union
from enum import Enum
import re


class ValidationSeverity(Enum):
    """Severity levels for validation errors"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class ValidationType(Enum):
    """Types of validation checks"""
    REQUIRED = "required"
    FORMAT = "format"
    LENGTH = "length"
    RANGE = "range"
    CUSTOM = "custom"
    DEPENDENCY = "dependency"


@dataclass
class ValidationError:
    """Represents a single validation error"""
    field: str
    message: str
    severity: ValidationSeverity = ValidationSeverity.ERROR
    validation_type: ValidationType = ValidationType.REQUIRED
    suggested_fix: Optional[str] = None
    related_fields: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            "field": self.field,
            "message": self.message,
            "severity": self.severity.value,
            "type": self.validation_type.value,
            "suggested_fix": self.suggested_fix,
            "related_fields": self.related_fields
        }


@dataclass
class ValidationResult:
    """Result of a validation operation"""
    is_valid: bool
    errors: List[ValidationError] = field(default_factory=list)
    warnings: List[ValidationError] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)

    def add_error(self, error: ValidationError) -> None:
        """Add an error to the result"""
        self.errors.append(error)
        self.is_valid = False

    def add_warning(self, warning: ValidationError) -> None:
        """Add a warning to the result"""
        self.warnings.append(warning)

    def add_suggestion(self, suggestion: str) -> None:
        """Add a suggestion to the result"""
        self.suggestions.append(suggestion)

    def get_errors_by_severity(self, severity: ValidationSeverity) -> List[ValidationError]:
        """Get errors filtered by severity"""
        return [e for e in self.errors if e.severity == severity]

    def get_critical_errors(self) -> List[ValidationError]:
        """Get only critical errors"""
        return self.get_errors_by_severity(ValidationSeverity.CRITICAL)

    def has_blocking_errors(self) -> bool:
        """Check if there are errors that block progression"""
        return any(e.severity in [ValidationSeverity.ERROR, ValidationSeverity.CRITICAL]
                  for e in self.errors)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            "is_valid": self.is_valid,
            "errors": [e.to_dict() for e in self.errors],
            "warnings": [e.to_dict() for e in self.warnings],
            "suggestions": self.suggestions
        }


class ValidationRule:
    """A validation rule with conditions and error messages"""

    def __init__(self,
                 validation_type: ValidationType,
                 condition: Callable[[Any], bool],
                 error_message: str,
                 severity: ValidationSeverity = ValidationSeverity.ERROR,
                 suggested_fix: Optional[str] = None,
                 related_fields: Optional[List[str]] = None):
        self.validation_type = validation_type
        self.condition = condition
        self.error_message = error_message
        self.severity = severity
        self.suggested_fix = suggested_fix
        self.related_fields = related_fields or []

    def validate(self, value: Any, field_name: str) -> Optional[ValidationError]:
        """Apply the validation rule"""
        if not self.condition(value):
            return ValidationError(
                field=field_name,
                message=self.error_message,
                severity=self.severity,
                validation_type=self.validation_type,
                suggested_fix=self.suggested_fix,
                related_fields=self.related_fields
            )
        return None


class WizardValidator:
    """
    Enhanced validator for wizard forms with intelligent error handling
    """

    def __init__(self):
        self.field_rules: Dict[str, List[ValidationRule]] = {}
        self.field_dependencies: Dict[str, List[str]] = {}
        self.custom_validators: Dict[str, Callable] = {}

    def add_rule(self, field: str, rule: ValidationRule) -> None:
        """Add a validation rule for a field"""
        if field not in self.field_rules:
            self.field_rules[field] = []
        self.field_rules[field].append(rule)

    def add_dependency(self, field: str, depends_on: str) -> None:
        """Add field dependency"""
        if field not in self.field_dependencies:
            self.field_dependencies[field] = []
        if depends_on not in self.field_dependencies[field]:
            self.field_dependencies[field].append(depends_on)

    def add_custom_validator(self, name: str, validator_func: Callable) -> None:
        """Add a custom validation function"""
        self.custom_validators[name] = validator_func

    def validate_field(self, field: str, value: Any, all_data: Optional[Dict] = None) -> ValidationResult:
        """Validate a single field"""
        result = ValidationResult(is_valid=True)
        all_data = all_data or {}

        # Check dependencies first
        if field in self.field_dependencies:
            for dep_field in self.field_dependencies[field]:
                if dep_field not in all_data or not all_data[dep_field]:
                    result.add_error(ValidationError(
                        field=field,
                        message=f"Field '{field}' requires '{dep_field}' to be filled first",
                        severity=ValidationSeverity.ERROR,
                        validation_type=ValidationType.DEPENDENCY,
                        suggested_fix=f"Fill in the '{dep_field}' field first"
                    ))
                    return result

        # Apply field rules
        if field in self.field_rules:
            for rule in self.field_rules[field]:
                error = rule.validate(value, field)
                if error:
                    if error.severity == ValidationSeverity.WARNING:
                        result.add_warning(error)
                    else:
                        result.add_error(error)

        return result

    def validate_form(self, form_data: Dict[str, Any]) -> ValidationResult:
        """Validate an entire form"""
        result = ValidationResult(is_valid=True)

        # Validate each field
        for field, value in form_data.items():
            field_result = self.validate_field(field, value, form_data)
            result.errors.extend(field_result.errors)
            result.warnings.extend(field_result.warnings)
            result.suggestions.extend(field_result.suggestions)
            if not field_result.is_valid:
                result.is_valid = False

        # Apply cross-field validation
        cross_field_result = self._validate_cross_field_rules(form_data)
        result.errors.extend(cross_field_result.errors)
        result.warnings.extend(cross_field_result.warnings)
        if not cross_field_result.is_valid:
            result.is_valid = False

        return result

    def _validate_cross_field_rules(self, form_data: Dict[str, Any]) -> ValidationResult:
        """Apply cross-field validation rules"""
        result = ValidationResult(is_valid=True)

        # Example: If genre is "horror", tone should be appropriate
        if "genre" in form_data and "tone" in form_data:
            genre = form_data["genre"]
            tone = form_data["tone"]

            # Handle genre as string or list
            genre_str = ""
            if isinstance(genre, str):
                genre_str = genre.lower()
            elif isinstance(genre, list) and genre:
                genre_str = genre[0].lower() if isinstance(genre[0], str) else ""

            if genre_str == "horror" and tone:
                appropriate_tones = ["dark", "tense", "frightening"]
                tone_str = ""
                if isinstance(tone, str):
                    tone_str = tone.lower()
                elif isinstance(tone, list) and tone:
                    tone_str = " ".join(tone).lower()

                if not any(t in tone_str for t in appropriate_tones):
                    result.add_warning(ValidationError(
                        field="tone",
                        message="For horror genre, consider using 'dark', 'tense', or 'frightening' tones",
                        severity=ValidationSeverity.WARNING,
                        validation_type=ValidationType.CUSTOM,
                        suggested_fix="Try 'dark' or 'tense' for better horror atmosphere"
                    ))

        return result

    def get_field_requirements(self, field: str) -> Dict[str, Any]:
        """Get requirements for a field"""
        requirements = {
            "required": False,
            "min_length": None,
            "max_length": None,
            "pattern": None,
            "allowed_values": None,
            "dependencies": self.field_dependencies.get(field, [])
        }

        if field in self.field_rules:
            for rule in self.field_rules[field]:
                if rule.validation_type == ValidationType.REQUIRED:
                    requirements["required"] = True
                elif rule.validation_type == ValidationType.LENGTH:
                    # Try to extract length requirements from error message
                    if "minimum" in rule.error_message.lower():
                        requirements["min_length"] = self._extract_number(rule.error_message)
                    if "maximum" in rule.error_message.lower():
                        requirements["max_length"] = self._extract_number(rule.error_message)

        return requirements

    def _extract_number(self, text: str) -> Optional[int]:
        """Extract first number from text"""
        match = re.search(r'\d+', text)
        return int(match.group()) if match else None


class WizardValidationManager:
    """
    Manages validation for different wizard types
    """

    def __init__(self):
        self.validators: Dict[str, WizardValidator] = {}
        self._setup_default_validators()

    def get_validator(self, wizard_type: str) -> WizardValidator:
        """Get validator for a wizard type"""
        if wizard_type not in self.validators:
            self.validators[wizard_type] = WizardValidator()
            self._setup_wizard_validator(wizard_type, self.validators[wizard_type])

        return self.validators[wizard_type]

    def _setup_default_validators(self):
        """Set up default validators for common fields"""
        # These will be inherited by specific wizard validators
        pass

    def _setup_wizard_validator(self, wizard_type: str, validator: WizardValidator):
        """Set up validation rules for a specific wizard type"""

        if wizard_type == "project_init":
            self._setup_project_init_validator(validator)
        elif wizard_type == "character_wizard":
            self._setup_character_wizard_validator(validator)
        elif wizard_type == "world_wizard":
            self._setup_world_wizard_validator(validator)
        elif wizard_type == "dialogue_wizard":
            self._setup_dialogue_wizard_validator(validator)

    def _setup_project_init_validator(self, validator: WizardValidator):
        """Set up validation for project initialization wizard"""

        # Project name validation
        validator.add_rule("project_name", ValidationRule(
            validation_type=ValidationType.REQUIRED,
            condition=lambda x: x and isinstance(x, str) and len(x.strip()) > 0,
            error_message="Project name is required",
            suggested_fix="Enter a name for your project"
        ))

        validator.add_rule("project_name", ValidationRule(
            validation_type=ValidationType.FORMAT,
            condition=lambda x: not re.search(r'[<>:"/\\|?*]', x) if x else True,
            error_message="Project name contains invalid characters (< > : \" / \\ | ? *)",
            suggested_fix="Use only letters, numbers, spaces, hyphens, and underscores"
        ))

        validator.add_rule("project_name", ValidationRule(
            validation_type=ValidationType.LENGTH,
            condition=lambda x: len(x) <= 50 if x else True,
            error_message="Project name must be 50 characters or less",
            suggested_fix="Shorten the project name"
        ))

        # Duration validation (depends on format)
        validator.add_rule("duration", ValidationRule(
            validation_type=ValidationType.REQUIRED,
            condition=lambda x: x and isinstance(x, (int, float)) and x > 0,
            error_message="Duration is required",
            suggested_fix="Enter the duration in minutes"
        ))

        validator.add_dependency("duration", "format")

        # Story validation
        validator.add_rule("story", ValidationRule(
            validation_type=ValidationType.REQUIRED,
            condition=lambda x: x and isinstance(x, str) and len(x.strip()) >= 10,
            error_message="Story content is required (minimum 10 characters)",
            suggested_fix="Provide a story description or script"
        ))

        validator.add_rule("story", ValidationRule(
            validation_type=ValidationType.LENGTH,
            condition=lambda x: len(x) <= 10000 if x else True,
            error_message="Story content must be 10,000 characters or less",
            suggested_fix="Shorten the story description"
        ))

    def _setup_character_wizard_validator(self, validator: WizardValidator):
        """Set up validation for character wizard"""

        # Basic identity validation
        validator.add_rule("name", ValidationRule(
            validation_type=ValidationType.REQUIRED,
            condition=lambda x: x and isinstance(x, str) and len(x.strip()) > 0,
            error_message="Character name is required",
            suggested_fix="Enter a name for your character"
        ))

        validator.add_rule("age", ValidationRule(
            validation_type=ValidationType.RANGE,
            condition=lambda x: isinstance(x, int) and 0 <= x <= 150 if x is not None else True,
            error_message="Age must be between 0 and 150",
            suggested_fix="Enter a realistic age for the character"
        ))

        # Personality validation
        validator.add_rule("personality_traits", ValidationRule(
            validation_type=ValidationType.REQUIRED,
            condition=lambda x: x and isinstance(x, list) and len(x) > 0,
            error_message="At least one personality trait is required",
            suggested_fix="Select personality traits that define your character"
        ))

        validator.add_rule("personality_traits", ValidationRule(
            validation_type=ValidationType.RANGE,
            condition=lambda x: len(x) <= 5 if x else True,
            error_message="Maximum 5 personality traits allowed",
            suggested_fix="Focus on the most important traits"
        ))

    def _setup_world_wizard_validator(self, validator: WizardValidator):
        """Set up validation for world wizard"""

        # Basic information validation
        validator.add_rule("name", ValidationRule(
            validation_type=ValidationType.REQUIRED,
            condition=lambda x: x and isinstance(x, str) and len(x.strip()) > 0,
            error_message="World name is required",
            suggested_fix="Enter a name for your world"
        ))

        validator.add_rule("timePeriod", ValidationRule(
            validation_type=ValidationType.REQUIRED,
            condition=lambda x: x and isinstance(x, str) and len(x.strip()) > 0,
            error_message="Time period is required",
            suggested_fix="Specify when your story takes place (e.g., 'Medieval', 'Future', 'Present day')"
        ))

        validator.add_rule("genre", ValidationRule(
            validation_type=ValidationType.REQUIRED,
            condition=lambda x: x and isinstance(x, list) and len(x) > 0,
            error_message="At least one genre must be selected",
            suggested_fix="Choose genres that fit your story"
        ))

        validator.add_rule("tone", ValidationRule(
            validation_type=ValidationType.REQUIRED,
            condition=lambda x: x and isinstance(x, list) and len(x) > 0,
            error_message="At least one tone must be selected",
            suggested_fix="Select tones that set the mood for your world"
        ))

    def _setup_dialogue_wizard_validator(self, validator: WizardValidator):
        """Set up validation for dialogue wizard"""

        # Characters validation
        validator.add_rule("characters", ValidationRule(
            validation_type=ValidationType.REQUIRED,
            condition=lambda x: x and isinstance(x, list) and len(x) >= 2,
            error_message="At least 2 characters are required for dialogue",
            suggested_fix="Add more characters to create a conversation"
        ))

        validator.add_rule("characters", ValidationRule(
            validation_type=ValidationType.RANGE,
            condition=lambda x: len(x) <= 6 if x else True,
            error_message="Maximum 6 characters allowed in one dialogue scene",
            suggested_fix="Consider splitting into multiple scenes"
        ))

        # Topic validation
        validator.add_rule("topic", ValidationRule(
            validation_type=ValidationType.REQUIRED,
            condition=lambda x: x and isinstance(x, str) and len(x.strip()) >= 5,
            error_message="Topic must be at least 5 characters long",
            suggested_fix="Provide a clear topic for the conversation"
        ))

        validator.add_rule("topic", ValidationRule(
            validation_type=ValidationType.LENGTH,
            condition=lambda x: len(x) <= 100 if x else True,
            error_message="Topic must be 100 characters or less",
            suggested_fix="Keep the topic concise"
        ))


# Convenience functions
def create_wizard_validator(wizard_type: str) -> WizardValidator:
    """Create a validator for a specific wizard type"""
    manager = WizardValidationManager()
    return manager.get_validator(wizard_type)


def validate_wizard_form(wizard_type: str, form_data: Dict[str, Any]) -> ValidationResult:
    """Validate a wizard form"""
    validator = create_wizard_validator(wizard_type)
    return validator.validate_form(form_data)


def get_field_requirements(wizard_type: str, field: str) -> Dict[str, Any]:
    """Get validation requirements for a field"""
    validator = create_wizard_validator(wizard_type)
    return validator.get_field_requirements(field)


# Error message templates for better UX
VALIDATION_MESSAGES = {
    "required_field": "This field is required to continue.",
    "invalid_format": "The format of this field is not valid.",
    "too_short": "This field is too short.",
    "too_long": "This field is too long.",
    "invalid_choice": "Please select a valid option.",
    "dependency_missing": "Please fill in the required fields first.",
    "inconsistent_data": "Some fields have conflicting information.",
}

def get_user_friendly_message(error: ValidationError) -> str:
    """Convert validation error to user-friendly message"""
    base_message = error.message

    if error.suggested_fix:
        return f"{base_message}\n💡 Suggestion: {error.suggested_fix}"

    return base_message