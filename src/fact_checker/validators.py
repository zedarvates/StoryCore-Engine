"""
JSON Schema validators for input validation and output verification.

This module provides validation functions for all data models using
the JSON Schema definitions.
"""

from typing import Dict, Any, List, Tuple
from jsonschema import validate, ValidationError, Draft7Validator
from jsonschema.exceptions import SchemaError

from .schemas import (
    CLAIM_SCHEMA,
    EVIDENCE_SCHEMA,
    VERIFICATION_RESULT_SCHEMA,
    MANIPULATION_SIGNAL_SCHEMA,
    REPORT_SCHEMA,
    CONFIGURATION_SCHEMA,
    SCIENTIFIC_AUDIT_INPUT_SCHEMA,
    ANTIFAKE_VIDEO_INPUT_SCHEMA,
    FACT_CHECKER_RESPONSE_SCHEMA,
    COMPLETE_SCHEMA
)


class ValidationResult:
    """Result of a validation operation."""
    
    def __init__(self, is_valid: bool, errors: List[str] = None):
        self.is_valid = is_valid
        self.errors = errors or []
    
    def __bool__(self):
        return self.is_valid
    
    def __repr__(self):
        if self.is_valid:
            return "ValidationResult(valid=True)"
        return f"ValidationResult(valid=False, errors={self.errors})"


def validate_claim(data: Dict[str, Any]) -> ValidationResult:
    """
    Validate claim data against the claim schema.
    
    Args:
        data: Dictionary containing claim data
        
    Returns:
        ValidationResult indicating success or failure with error details
    """
    try:
        validate(instance=data, schema=CLAIM_SCHEMA)
        return ValidationResult(is_valid=True)
    except ValidationError as e:
        return ValidationResult(is_valid=False, errors=[str(e.message)])
    except SchemaError as e:
        return ValidationResult(is_valid=False, errors=[f"Schema error: {str(e)}"])


def validate_evidence(data: Dict[str, Any]) -> ValidationResult:
    """
    Validate evidence data against the evidence schema.
    
    Args:
        data: Dictionary containing evidence data
        
    Returns:
        ValidationResult indicating success or failure with error details
    """
    try:
        validate(instance=data, schema=EVIDENCE_SCHEMA)
        return ValidationResult(is_valid=True)
    except ValidationError as e:
        return ValidationResult(is_valid=False, errors=[str(e.message)])
    except SchemaError as e:
        return ValidationResult(is_valid=False, errors=[f"Schema error: {str(e)}"])


def validate_verification_result(data: Dict[str, Any]) -> ValidationResult:
    """
    Validate verification result data against the schema.
    
    Args:
        data: Dictionary containing verification result data
        
    Returns:
        ValidationResult indicating success or failure with error details
    """
    try:
        validator = Draft7Validator(VERIFICATION_RESULT_SCHEMA)
        errors = list(validator.iter_errors(data))
        if errors:
            error_messages = [e.message for e in errors]
            return ValidationResult(is_valid=False, errors=error_messages)
        return ValidationResult(is_valid=True)
    except SchemaError as e:
        return ValidationResult(is_valid=False, errors=[f"Schema error: {str(e)}"])


def validate_manipulation_signal(data: Dict[str, Any]) -> ValidationResult:
    """
    Validate manipulation signal data against the schema.
    
    Args:
        data: Dictionary containing manipulation signal data
        
    Returns:
        ValidationResult indicating success or failure with error details
    """
    try:
        validate(instance=data, schema=MANIPULATION_SIGNAL_SCHEMA)
        return ValidationResult(is_valid=True)
    except ValidationError as e:
        return ValidationResult(is_valid=False, errors=[str(e.message)])
    except SchemaError as e:
        return ValidationResult(is_valid=False, errors=[f"Schema error: {str(e)}"])


def validate_report(data: Dict[str, Any]) -> ValidationResult:
    """
    Validate report data against the report schema.
    
    Args:
        data: Dictionary containing report data
        
    Returns:
        ValidationResult indicating success or failure with error details
    """
    try:
        validator = Draft7Validator(REPORT_SCHEMA)
        errors = list(validator.iter_errors(data))
        if errors:
            error_messages = [e.message for e in errors]
            return ValidationResult(is_valid=False, errors=error_messages)
        return ValidationResult(is_valid=True)
    except SchemaError as e:
        return ValidationResult(is_valid=False, errors=[f"Schema error: {str(e)}"])


def validate_configuration(data: Dict[str, Any]) -> ValidationResult:
    """
    Validate configuration data against the configuration schema.
    
    Args:
        data: Dictionary containing configuration data
        
    Returns:
        ValidationResult indicating success or failure with error details
    """
    try:
        validate(instance=data, schema=CONFIGURATION_SCHEMA)
        return ValidationResult(is_valid=True)
    except ValidationError as e:
        return ValidationResult(is_valid=False, errors=[str(e.message)])
    except SchemaError as e:
        return ValidationResult(is_valid=False, errors=[f"Schema error: {str(e)}"])


def validate_scientific_audit_input(data: Dict[str, Any]) -> ValidationResult:
    """
    Validate Scientific Audit Agent input data.
    
    Args:
        data: Dictionary containing input data
        
    Returns:
        ValidationResult indicating success or failure with error details
    """
    try:
        validate(instance=data, schema=SCIENTIFIC_AUDIT_INPUT_SCHEMA)
        return ValidationResult(is_valid=True)
    except ValidationError as e:
        return ValidationResult(is_valid=False, errors=[str(e.message)])
    except SchemaError as e:
        return ValidationResult(is_valid=False, errors=[f"Schema error: {str(e)}"])


def validate_antifake_video_input(data: Dict[str, Any]) -> ValidationResult:
    """
    Validate Anti-Fake Video Agent input data.
    
    Args:
        data: Dictionary containing input data
        
    Returns:
        ValidationResult indicating success or failure with error details
    """
    try:
        validate(instance=data, schema=ANTIFAKE_VIDEO_INPUT_SCHEMA)
        return ValidationResult(is_valid=True)
    except ValidationError as e:
        return ValidationResult(is_valid=False, errors=[str(e.message)])
    except SchemaError as e:
        return ValidationResult(is_valid=False, errors=[f"Schema error: {str(e)}"])


def validate_fact_checker_response(data: Dict[str, Any]) -> ValidationResult:
    """
    Validate Fact Checker Command response data.
    
    Args:
        data: Dictionary containing response data
        
    Returns:
        ValidationResult indicating success or failure with error details
    """
    try:
        validate(instance=data, schema=FACT_CHECKER_RESPONSE_SCHEMA)
        return ValidationResult(is_valid=True)
    except ValidationError as e:
        return ValidationResult(is_valid=False, errors=[str(e.message)])
    except SchemaError as e:
        return ValidationResult(is_valid=False, errors=[f"Schema error: {str(e)}"])


def get_validation_errors(data: Dict[str, Any], schema: Dict[str, Any]) -> List[Tuple[str, str]]:
    """
    Get detailed validation errors with field paths.
    
    Args:
        data: Data to validate
        schema: JSON Schema to validate against
        
    Returns:
        List of tuples containing (field_path, error_message)
    """
    validator = Draft7Validator(schema)
    errors = []
    
    for error in validator.iter_errors(data):
        field_path = ".".join(str(p) for p in error.path) if error.path else "root"
        errors.append((field_path, error.message))
    
    return errors
