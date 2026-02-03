"""
JSON schema definitions for all configuration files.

This module provides JSON schemas for validation of all memory system files.
"""

from typing import Any, Dict

# Project Configuration Schema
PROJECT_CONFIG_SCHEMA: Dict[str, Any] = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["schema_version", "project_name", "project_type", "creation_timestamp", "objectives"],
    "properties": {
        "schema_version": {
            "type": "string",
            "pattern": "^\\d+\\.\\d+$"
        },
        "project_name": {
            "type": "string",
            "minLength": 1
        },
        "project_type": {
            "type": "string",
            "enum": ["video", "script", "creative", "technical"]
        },
        "creation_timestamp": {
            "type": "string",
            "format": "date-time"
        },
        "objectives": {
            "type": "array",
            "items": {
                "type": "string"
            }
        },
        "memory_system_enabled": {
            "type": "boolean"
        },
        "memory_system_config": {
            "type": "object",
            "properties": {
                "auto_summarize": {"type": "boolean"},
                "summarization_threshold_kb": {"type": "integer", "minimum": 1},
                "auto_translate": {"type": "boolean"},
                "target_languages": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "error_detection_enabled": {"type": "boolean"},
                "auto_recovery_enabled": {"type": "boolean"},
                "max_recovery_attempts": {"type": "integer", "minimum": 1, "maximum": 10}
            }
        }
    }
}

# Memory Schema
MEMORY_SCHEMA: Dict[str, Any] = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["schema_version", "last_updated"],
    "properties": {
        "schema_version": {
            "type": "string",
            "pattern": "^\\d+\\.\\d+$"
        },
        "last_updated": {
            "type": "string",
            "format": "date-time"
        },
        "objectives": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "description", "status", "added"],
                "properties": {
                    "id": {"type": "string"},
                    "description": {"type": "string"},
                    "status": {"type": "string", "enum": ["active", "completed", "abandoned"]},
                    "added": {"type": "string", "format": "date-time"}
                }
            }
        },
        "entities": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "name", "type", "description", "added"],
                "properties": {
                    "id": {"type": "string"},
                    "name": {"type": "string"},
                    "type": {"type": "string", "enum": ["character", "module", "component", "concept"]},
                    "description": {"type": "string"},
                    "attributes": {"type": "object"},
                    "added": {"type": "string", "format": "date-time"}
                }
            }
        },
        "constraints": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "description", "type", "added"],
                "properties": {
                    "id": {"type": "string"},
                    "description": {"type": "string"},
                    "type": {"type": "string", "enum": ["technical", "creative", "business"]},
                    "added": {"type": "string", "format": "date-time"}
                }
            }
        },
        "decisions": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "description", "rationale", "timestamp"],
                "properties": {
                    "id": {"type": "string"},
                    "description": {"type": "string"},
                    "rationale": {"type": "string"},
                    "alternatives_considered": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "timestamp": {"type": "string", "format": "date-time"}
                }
            }
        },
        "style_rules": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["category", "rule", "added"],
                "properties": {
                    "category": {"type": "string", "enum": ["visual", "narrative", "technical"]},
                    "rule": {"type": "string"},
                    "added": {"type": "string", "format": "date-time"}
                }
            }
        },
        "task_backlog": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "description", "priority", "status", "added"],
                "properties": {
                    "id": {"type": "string"},
                    "description": {"type": "string"},
                    "priority": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
                    "status": {"type": "string", "enum": ["pending", "in_progress", "completed"]},
                    "added": {"type": "string", "format": "date-time"}
                }
            }
        },
        "current_state": {
            "type": "object",
            "required": ["phase"],
            "properties": {
                "phase": {"type": "string"},
                "progress_percentage": {"type": "integer", "minimum": 0, "maximum": 100},
                "active_tasks": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "blockers": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "last_activity": {"type": "string", "format": "date-time"}
            }
        }
    }
}

# Variables Schema
VARIABLES_SCHEMA: Dict[str, Any] = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["schema_version", "last_updated", "variables"],
    "properties": {
        "schema_version": {
            "type": "string",
            "pattern": "^\\d+\\.\\d+$"
        },
        "last_updated": {
            "type": "string",
            "format": "date-time"
        },
        "variables": {
            "type": "object",
            "patternProperties": {
                ".*": {
                    "type": "object",
                    "required": ["value", "type", "description", "last_modified"],
                    "properties": {
                        "value": {},  # Any type
                        "type": {"type": "string", "enum": ["string", "number", "boolean", "array", "object"]},
                        "description": {"type": "string"},
                        "last_modified": {"type": "string", "format": "date-time"}
                    }
                }
            }
        }
    }
}

# Errors Detected Schema
ERRORS_SCHEMA: Dict[str, Any] = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["schema_version", "errors"],
    "properties": {
        "schema_version": {
            "type": "string",
            "pattern": "^\\d+\\.\\d+$"
        },
        "errors": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "type", "severity", "detected", "description", "status"],
                "properties": {
                    "id": {"type": "string"},
                    "type": {
                        "type": "string",
                        "enum": ["missing_file", "invalid_json", "inconsistent_state", "corrupted_data", "permission_error"]
                    },
                    "severity": {
                        "type": "string",
                        "enum": ["low", "medium", "high", "critical"]
                    },
                    "detected": {"type": "string", "format": "date-time"},
                    "description": {"type": "string"},
                    "affected_components": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "diagnostic_info": {"type": "object"},
                    "status": {
                        "type": "string",
                        "enum": ["detected", "repair_attempted", "resolved", "requires_manual_intervention"]
                    },
                    "recovery_attempts": {"type": "integer", "minimum": 0}
                }
            }
        }
    }
}


def validate_schema(data: Dict[str, Any], schema: Dict[str, Any]) -> tuple[bool, list[str]]:
    """
    Validate data against a JSON schema.
    
    Args:
        data: The data to validate
        schema: The JSON schema to validate against
        
    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    try:
        import jsonschema
    except ImportError:
        # jsonschema not installed, skip validation
        return True, []
    
    try:
        jsonschema.validate(instance=data, schema=schema)
        return True, []
    except jsonschema.exceptions.ValidationError as e:
        return False, [str(e)]
    except Exception as e:
        return False, [f"Validation error: {str(e)}"]


def get_schema_for_file(filename: str) -> Dict[str, Any]:
    """
    Get the appropriate schema for a given filename.
    
    Args:
        filename: Name of the file
        
    Returns:
        The JSON schema for that file type
    """
    if filename == "project_config.json":
        return PROJECT_CONFIG_SCHEMA
    elif filename == "memory.json":
        return MEMORY_SCHEMA
    elif filename == "variables.json":
        return VARIABLES_SCHEMA
    elif filename == "errors_detected.json":
        return ERRORS_SCHEMA
    else:
        return {}
