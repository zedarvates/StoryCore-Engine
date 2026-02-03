"""
StoryCore-Engine Feedback Payload Validator

This module provides comprehensive JSON schema validation for Report_Payload
beyond Pydantic's basic validation. It validates:
- Schema structure and data types
- Field constraints (min/max lengths, patterns, formats)
- Required fields and nested objects
- Enum values and custom validation rules

Requirements: 5.2 - Payload Schema Validation
"""

import logging
from typing import Dict, Any, List, Tuple
from jsonschema import validate, ValidationError, Draft7Validator
from jsonschema.exceptions import SchemaError

logger = logging.getLogger(__name__)


# JSON Schema v7 definition for Report_Payload
# This matches the schema defined in the design document
REPORT_PAYLOAD_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["schema_version", "report_type", "timestamp", "system_info", "user_input"],
    "properties": {
        "schema_version": {
            "type": "string",
            "const": "1.0",
            "description": "Schema version for backward compatibility"
        },
        "report_type": {
            "type": "string",
            "enum": ["bug", "enhancement", "question"],
            "description": "Type of feedback report"
        },
        "timestamp": {
            "type": "string",
            "format": "date-time",
            "description": "ISO-8601 timestamp of report creation"
        },
        "system_info": {
            "type": "object",
            "required": ["storycore_version", "python_version", "os_platform"],
            "properties": {
                "storycore_version": {
                    "type": "string",
                    "minLength": 1,
                    "description": "StoryCore-Engine version"
                },
                "python_version": {
                    "type": "string",
                    "minLength": 1,
                    "pattern": "^[0-9]+\\.[0-9]+",
                    "description": "Python version (e.g., 3.9.0)"
                },
                "os_platform": {
                    "type": "string",
                    "enum": ["Windows", "Darwin", "Linux", "windows", "darwin", "linux", "macos", "macOS"],
                    "description": "Operating system platform"
                },
                "os_version": {
                    "type": ["string", "null"],
                    "description": "Operating system version"
                },
                "language": {
                    "type": ["string", "null"],
                    "minLength": 2,
                    "maxLength": 10,
                    "description": "Language code (e.g., en-US)"
                }
            },
            "additionalProperties": False
        },
        "module_context": {
            "type": ["object", "null"],
            "properties": {
                "active_module": {
                    "type": "string",
                    "description": "Name of the active StoryCore module"
                },
                "module_state": {
                    "type": "object",
                    "description": "Current state of the active module"
                }
            },
            "additionalProperties": False
        },
        "user_input": {
            "type": "object",
            "required": ["description"],
            "properties": {
                "description": {
                    "type": "string",
                    "minLength": 10,
                    "maxLength": 10000,
                    "description": "User's description of the issue or feedback"
                },
                "reproduction_steps": {
                    "type": ["string", "null"],
                    "maxLength": 10000,
                    "description": "Steps to reproduce the issue"
                }
            },
            "additionalProperties": False
        },
        "diagnostics": {
            "type": ["object", "null"],
            "properties": {
                "stacktrace": {
                    "type": ["string", "null"],
                    "maxLength": 50000,
                    "description": "Exception stacktrace if available"
                },
                "logs": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "maxLength": 5000
                    },
                    "maxItems": 1000,
                    "description": "Application log lines"
                },
                "memory_usage_mb": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1000000,
                    "description": "Memory usage in megabytes"
                },
                "process_state": {
                    "type": "object",
                    "description": "Current process state information"
                }
            },
            "additionalProperties": False
        },
        "screenshot_base64": {
            "type": ["string", "null"],
            "maxLength": 10485760,  # ~10MB base64 encoded
            "pattern": "^[A-Za-z0-9+/]*={0,2}$",
            "description": "Base64-encoded screenshot image"
        }
    },
    "additionalProperties": False
}


def validate_payload(payload: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validate a report payload against the JSON schema.
    
    This function provides comprehensive validation beyond Pydantic's basic
    type checking. It validates:
    - All required fields are present
    - Field types match the schema
    - String lengths are within bounds
    - Enum values are valid
    - Nested objects have correct structure
    - No additional properties are present
    
    Args:
        payload: The report payload dictionary to validate
    
    Returns:
        Tuple[bool, List[str]]: A tuple of (is_valid, error_messages)
            - is_valid: True if payload is valid, False otherwise
            - error_messages: List of validation error messages (empty if valid)
    
    Example:
        >>> payload = {"schema_version": "1.0", "report_type": "bug", ...}
        >>> is_valid, errors = validate_payload(payload)
        >>> if not is_valid:
        ...     print(f"Validation failed: {errors}")
    
    Requirements: 5.2
    """
    try:
        # Validate against the JSON schema
        validate(instance=payload, schema=REPORT_PAYLOAD_SCHEMA)
        logger.info("Payload validation successful")
        return True, []
        
    except ValidationError as e:
        # Collect detailed validation error information
        error_messages = []
        
        # Main error message
        error_path = " -> ".join(str(p) for p in e.path) if e.path else "root"
        error_messages.append(f"Validation error at '{error_path}': {e.message}")
        
        # Add context about the failing value
        if e.instance is not None:
            # Truncate long values for readability
            instance_str = str(e.instance)
            if len(instance_str) > 100:
                instance_str = instance_str[:100] + "..."
            error_messages.append(f"  Invalid value: {instance_str}")
        
        # Add schema constraint that was violated
        if e.validator:
            error_messages.append(f"  Failed constraint: {e.validator} = {e.validator_value}")
        
        logger.warning(f"Payload validation failed: {error_messages[0]}")
        return False, error_messages
        
    except SchemaError as e:
        # This should never happen in production (indicates a bug in our schema)
        error_msg = f"Internal schema error: {e.message}"
        logger.error(error_msg)
        return False, [error_msg]
        
    except Exception as e:
        # Catch any unexpected errors during validation
        error_msg = f"Unexpected validation error: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return False, [error_msg]


def validate_payload_detailed(payload: Dict[str, Any]) -> Tuple[bool, List[Dict[str, Any]]]:
    """
    Validate a report payload and return detailed error information.
    
    This function is similar to validate_payload() but returns structured
    error information suitable for API responses or debugging.
    
    Args:
        payload: The report payload dictionary to validate
    
    Returns:
        Tuple[bool, List[Dict[str, Any]]]: A tuple of (is_valid, error_details)
            - is_valid: True if payload is valid, False otherwise
            - error_details: List of error detail dictionaries with keys:
                - path: JSON path to the error location
                - message: Human-readable error message
                - validator: The validator that failed
                - constraint: The constraint value that was violated
    
    Example:
        >>> is_valid, errors = validate_payload_detailed(payload)
        >>> for error in errors:
        ...     print(f"{error['path']}: {error['message']}")
    
    Requirements: 5.2
    """
    try:
        # Validate against the JSON schema
        validate(instance=payload, schema=REPORT_PAYLOAD_SCHEMA)
        logger.info("Detailed payload validation successful")
        return True, []
        
    except ValidationError as e:
        # Collect all validation errors (not just the first one)
        validator = Draft7Validator(REPORT_PAYLOAD_SCHEMA)
        errors = []
        
        for error in validator.iter_errors(payload):
            error_path = " -> ".join(str(p) for p in error.path) if error.path else "root"
            
            error_detail = {
                "path": error_path,
                "message": error.message,
                "validator": error.validator,
                "constraint": error.validator_value if hasattr(error, 'validator_value') else None
            }
            
            # Add the invalid value (truncated if too long)
            if error.instance is not None:
                instance_str = str(error.instance)
                if len(instance_str) > 100:
                    instance_str = instance_str[:100] + "..."
                error_detail["invalid_value"] = instance_str
            
            errors.append(error_detail)
        
        logger.warning(f"Detailed payload validation failed with {len(errors)} error(s)")
        return False, errors
        
    except SchemaError as e:
        # Internal schema error
        error_detail = {
            "path": "schema",
            "message": f"Internal schema error: {e.message}",
            "validator": "schema",
            "constraint": None
        }
        logger.error(f"Schema error: {e.message}")
        return False, [error_detail]
        
    except Exception as e:
        # Unexpected error
        error_detail = {
            "path": "unknown",
            "message": f"Unexpected validation error: {str(e)}",
            "validator": "unknown",
            "constraint": None
        }
        logger.error(f"Unexpected validation error: {e}", exc_info=True)
        return False, [error_detail]


def get_schema() -> Dict[str, Any]:
    """
    Get the JSON schema for Report_Payload.
    
    This function returns the complete JSON schema definition, which can be
    used for documentation, client-side validation, or schema introspection.
    
    Returns:
        Dict[str, Any]: The JSON schema dictionary
    
    Example:
        >>> schema = get_schema()
        >>> print(schema['properties']['report_type']['enum'])
        ['bug', 'enhancement', 'question']
    """
    return REPORT_PAYLOAD_SCHEMA.copy()


def validate_schema_version(payload: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Validate only the schema version field.
    
    This is useful for quick version checks before full validation,
    allowing for version-specific handling or migration.
    
    Args:
        payload: The report payload dictionary
    
    Returns:
        Tuple[bool, str]: A tuple of (is_valid, message)
            - is_valid: True if version is valid, False otherwise
            - message: Success or error message
    
    Example:
        >>> is_valid, msg = validate_schema_version({"schema_version": "1.0"})
        >>> print(msg)
        'Schema version 1.0 is valid'
    
    Requirements: 9.5 (Backward Compatibility)
    """
    if "schema_version" not in payload:
        return False, "Missing required field: schema_version"
    
    version = payload["schema_version"]
    
    if not isinstance(version, str):
        return False, f"schema_version must be a string, got {type(version).__name__}"
    
    if version != "1.0":
        return False, f"Unsupported schema version: {version}. Only version 1.0 is supported."
    
    return True, f"Schema version {version} is valid"


def get_supported_schema_versions() -> List[str]:
    """
    Get list of supported schema versions.
    
    Returns:
        List of supported schema version strings
    
    Requirements: 9.5 (Backward Compatibility)
    """
    return ["1.0"]


def migrate_payload_to_current_version(payload: Dict[str, Any]) -> Tuple[Dict[str, Any], List[str]]:
    """
    Migrate a payload from an older schema version to the current version.
    
    This function handles backward compatibility by transforming payloads
    from previous implementation phases to the current schema format.
    
    Args:
        payload: The report payload dictionary (potentially old version)
    
    Returns:
        Tuple[Dict[str, Any], List[str]]: A tuple of (migrated_payload, migration_notes)
            - migrated_payload: The payload transformed to current schema version
            - migration_notes: List of migration actions performed
    
    Example:
        >>> old_payload = {"schema_version": "0.9", ...}
        >>> new_payload, notes = migrate_payload_to_current_version(old_payload)
        >>> print(notes)
        ['Migrated from version 0.9 to 1.0', 'Added missing diagnostics field']
    
    Requirements: 9.5 (Backward Compatibility)
    """
    migration_notes = []
    migrated_payload = payload.copy()
    
    # Get current version from payload
    current_version = payload.get("schema_version", "unknown")
    
    # If no schema version, assume it's from Phase 1 (MVP)
    if "schema_version" not in payload:
        migration_notes.append("No schema_version found - assuming Phase 1 payload")
        migrated_payload["schema_version"] = "1.0"
        current_version = "Phase 1"
    
    # Handle Phase 1 payloads (before schema_version was added)
    # Phase 1 had: report_type, timestamp, system_info, user_input
    # Missing: module_context, diagnostics, screenshot_base64
    if current_version == "Phase 1" or current_version == "0.9":
        migration_notes.append(f"Migrating from {current_version} to 1.0")
        
        # Add module_context if missing
        if "module_context" not in migrated_payload:
            migrated_payload["module_context"] = {
                "active_module": "unknown",
                "module_state": {}
            }
            migration_notes.append("Added default module_context")
        
        # Add diagnostics if missing
        if "diagnostics" not in migrated_payload:
            migrated_payload["diagnostics"] = {
                "stacktrace": None,
                "logs": [],
                "memory_usage_mb": 0,
                "process_state": {}
            }
            migration_notes.append("Added default diagnostics")
        
        # Add screenshot_base64 if missing
        if "screenshot_base64" not in migrated_payload:
            migrated_payload["screenshot_base64"] = None
            migration_notes.append("Added default screenshot_base64")
        
        # Ensure schema_version is set to current
        migrated_payload["schema_version"] = "1.0"
    
    # Handle Phase 2 payloads (basic diagnostics but no backend integration)
    # These should already have schema_version "1.0" but might be missing some fields
    elif current_version == "1.0":
        # Ensure all optional fields have proper defaults
        if "module_context" not in migrated_payload:
            migrated_payload["module_context"] = {
                "active_module": "unknown",
                "module_state": {}
            }
            migration_notes.append("Added default module_context for 1.0 payload")
        elif migrated_payload["module_context"] is None:
            migrated_payload["module_context"] = {
                "active_module": "unknown",
                "module_state": {}
            }
            migration_notes.append("Replaced null module_context with default for 1.0 payload")
        
        if "diagnostics" not in migrated_payload:
            migrated_payload["diagnostics"] = {
                "stacktrace": None,
                "logs": [],
                "memory_usage_mb": 0,
                "process_state": {}
            }
            migration_notes.append("Added default diagnostics for 1.0 payload")
        elif migrated_payload["diagnostics"] is None:
            migrated_payload["diagnostics"] = {
                "stacktrace": None,
                "logs": [],
                "memory_usage_mb": 0,
                "process_state": {}
            }
            migration_notes.append("Replaced null diagnostics with default for 1.0 payload")
        
        if "screenshot_base64" not in migrated_payload:
            migrated_payload["screenshot_base64"] = None
            migration_notes.append("Added default screenshot_base64 for 1.0 payload")
    
    # If no migrations were needed
    if not migration_notes:
        migration_notes.append(f"Payload already at current version {current_version}")
    
    return migrated_payload, migration_notes


# Export public API
__all__ = [
    'validate_payload',
    'validate_payload_detailed',
    'get_schema',
    'validate_schema_version',
    'get_supported_schema_versions',
    'migrate_payload_to_current_version',
    'REPORT_PAYLOAD_SCHEMA'
]
