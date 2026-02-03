"""
Request Validator

This module provides JSON schema validation for API requests.
"""

from typing import Any, Dict, Optional, List
import logging

from .models import ErrorDetails, ErrorCodes


logger = logging.getLogger(__name__)


class ValidationError(Exception):
    """Exception raised when validation fails."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class RequestValidator:
    """
    Validates API requests against JSON schemas.
    
    Provides validation for:
    - Required fields
    - Type checking
    - Value constraints
    - Custom validation rules
    """
    
    def __init__(self):
        """Initialize the validator."""
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def validate(
        self,
        params: Dict[str, Any],
        schema: Dict[str, Any],
    ) -> Optional[ErrorDetails]:
        """
        Validate parameters against a schema.
        
        Args:
            params: Request parameters to validate
            schema: JSON schema definition
            
        Returns:
            ErrorDetails if validation fails, None if successful
        """
        try:
            # Validate required fields
            if "required" in schema:
                missing = self._check_required_fields(params, schema["required"])
                if missing:
                    return ErrorDetails(
                        code=ErrorCodes.VALIDATION_ERROR,
                        message=f"Missing required fields: {', '.join(missing)}",
                        details={"missing_fields": missing},
                        remediation=f"Provide values for: {', '.join(missing)}",
                    )
            
            # Validate field types and constraints
            if "properties" in schema:
                for field_name, field_schema in schema["properties"].items():
                    if field_name in params:
                        error = self._validate_field(
                            field_name,
                            params[field_name],
                            field_schema,
                        )
                        if error:
                            return error
            
            return None
            
        except Exception as e:
            self.logger.exception(f"Validation error: {str(e)}")
            return ErrorDetails(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f"Validation failed: {str(e)}",
                details={"exception": str(e)},
            )
    
    def _check_required_fields(
        self,
        params: Dict[str, Any],
        required: List[str],
    ) -> List[str]:
        """
        Check for missing required fields.
        
        Args:
            params: Request parameters
            required: List of required field names
            
        Returns:
            List of missing field names
        """
        return [
            field for field in required
            if field not in params or params[field] is None
        ]
    
    def _validate_field(
        self,
        field_name: str,
        value: Any,
        schema: Dict[str, Any],
    ) -> Optional[ErrorDetails]:
        """
        Validate a single field against its schema.
        
        Args:
            field_name: Name of the field
            value: Field value
            schema: Field schema definition
            
        Returns:
            ErrorDetails if validation fails, None if successful
        """
        # Type validation
        if "type" in schema:
            error = self._validate_type(field_name, value, schema["type"])
            if error:
                return error
        
        # String constraints
        if schema.get("type") == "string":
            if "minLength" in schema and len(value) < schema["minLength"]:
                return ErrorDetails(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Field '{field_name}' is too short",
                    details={
                        "field": field_name,
                        "min_length": schema["minLength"],
                        "actual_length": len(value),
                    },
                    remediation=f"Provide at least {schema['minLength']} characters",
                )
            
            if "maxLength" in schema and len(value) > schema["maxLength"]:
                return ErrorDetails(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Field '{field_name}' is too long",
                    details={
                        "field": field_name,
                        "max_length": schema["maxLength"],
                        "actual_length": len(value),
                    },
                    remediation=f"Provide at most {schema['maxLength']} characters",
                )
            
            if "pattern" in schema:
                import re
                if not re.match(schema["pattern"], value):
                    return ErrorDetails(
                        code=ErrorCodes.VALIDATION_ERROR,
                        message=f"Field '{field_name}' does not match required pattern",
                        details={
                            "field": field_name,
                            "pattern": schema["pattern"],
                        },
                        remediation="Provide a value matching the required format",
                    )
        
        # Number constraints
        if schema.get("type") in ("integer", "number"):
            if "minimum" in schema and value < schema["minimum"]:
                return ErrorDetails(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Field '{field_name}' is below minimum value",
                    details={
                        "field": field_name,
                        "minimum": schema["minimum"],
                        "actual": value,
                    },
                    remediation=f"Provide a value >= {schema['minimum']}",
                )
            
            if "maximum" in schema and value > schema["maximum"]:
                return ErrorDetails(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Field '{field_name}' exceeds maximum value",
                    details={
                        "field": field_name,
                        "maximum": schema["maximum"],
                        "actual": value,
                    },
                    remediation=f"Provide a value <= {schema['maximum']}",
                )
        
        # Enum validation
        if "enum" in schema and value not in schema["enum"]:
            return ErrorDetails(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f"Field '{field_name}' has invalid value",
                details={
                    "field": field_name,
                    "allowed_values": schema["enum"],
                    "actual": value,
                },
                remediation=f"Use one of: {', '.join(map(str, schema['enum']))}",
            )
        
        return None
    
    def _validate_type(
        self,
        field_name: str,
        value: Any,
        expected_type: str,
    ) -> Optional[ErrorDetails]:
        """
        Validate field type.
        
        Args:
            field_name: Name of the field
            value: Field value
            expected_type: Expected type name
            
        Returns:
            ErrorDetails if validation fails, None if successful
        """
        type_map = {
            "string": str,
            "integer": int,
            "number": (int, float),
            "boolean": bool,
            "array": list,
            "object": dict,
        }
        
        if expected_type not in type_map:
            return None
        
        expected_python_type = type_map[expected_type]
        
        if not isinstance(value, expected_python_type):
            return ErrorDetails(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f"Field '{field_name}' has incorrect type",
                details={
                    "field": field_name,
                    "expected_type": expected_type,
                    "actual_type": type(value).__name__,
                },
                remediation=f"Provide a {expected_type} value",
            )
        
        return None
