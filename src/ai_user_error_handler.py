"""
AI User Error Handler - User-friendly error handling and feedback.

This module provides user-facing error handling with clear messages,
parameter validation, and offline mode support.

Key Features:
- User-friendly error messages
- Parameter validation with feedback
- Clear error messages for unsupported content
- Offline mode support
- Error recovery suggestions
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum


class UserErrorType(Enum):
    """Types of user-facing errors."""
    INVALID_PARAMETER = "invalid_parameter"
    UNSUPPORTED_CONTENT = "unsupported_content"
    MISSING_REQUIREMENT = "missing_requirement"
    OFFLINE_MODE = "offline_mode"
    QUOTA_EXCEEDED = "quota_exceeded"
    PERMISSION_DENIED = "permission_denied"


@dataclass
class UserFriendlyError:
    """User-friendly error representation."""
    title: str
    message: str
    error_type: UserErrorType
    suggestions: List[str] = field(default_factory=list)
    details: Optional[str] = None
    recovery_actions: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for UI display."""
        return {
            'title': self.title,
            'message': self.message,
            'error_type': self.error_type.value,
            'suggestions': self.suggestions,
            'details': self.details,
            'recovery_actions': self.recovery_actions,
            'timestamp': self.timestamp.isoformat()
        }


@dataclass
class ParameterValidationResult:
    """Result of parameter validation."""
    valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    corrected_parameters: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'valid': self.valid,
            'errors': self.errors,
            'warnings': self.warnings,
            'corrected_parameters': self.corrected_parameters
        }


class AIUserErrorHandler:
    """
    User-friendly AI Error Handler.
    
    Provides clear, actionable error messages and recovery suggestions
    for end users.
    """
    
    def __init__(self):
        """Initialize user error handler."""
        self.logger = logging.getLogger(__name__)
        
        # Offline mode state
        self.offline_mode = False
        self.cached_models: List[str] = []
        
        # Error message templates
        self.error_templates = self._initialize_error_templates()
        
        self.logger.info("AI User Error Handler initialized")
    
    def _initialize_error_templates(self) -> Dict[UserErrorType, Dict[str, str]]:
        """Initialize user-friendly error message templates."""
        return {
            UserErrorType.INVALID_PARAMETER: {
                'title': 'Invalid Parameter',
                'message': 'One or more parameters are invalid or out of range.'
            },
            UserErrorType.UNSUPPORTED_CONTENT: {
                'title': 'Unsupported Content',
                'message': 'The provided content is not supported for this operation.'
            },
            UserErrorType.MISSING_REQUIREMENT: {
                'title': 'Missing Requirement',
                'message': 'A required component or resource is missing.'
            },
            UserErrorType.OFFLINE_MODE: {
                'title': 'Offline Mode',
                'message': 'This operation requires an internet connection.'
            },
            UserErrorType.QUOTA_EXCEEDED: {
                'title': 'Quota Exceeded',
                'message': 'You have exceeded your usage quota for this operation.'
            },
            UserErrorType.PERMISSION_DENIED: {
                'title': 'Permission Denied',
                'message': 'You do not have permission to perform this operation.'
            }
        }
    
    def validate_parameters(self,
                          parameters: Dict[str, Any],
                          schema: Dict[str, Dict[str, Any]]) -> ParameterValidationResult:
        """
        Validate parameters against schema with user-friendly feedback.
        
        Args:
            parameters: Parameters to validate
            schema: Parameter schema with validation rules
            
        Returns:
            Validation result with errors and suggestions
        """
        errors = []
        warnings = []
        corrected = {}
        
        # Check required parameters
        for param_name, param_schema in schema.items():
            if param_schema.get('required', False) and param_name not in parameters:
                errors.append(f"Required parameter '{param_name}' is missing")
                continue
            
            if param_name not in parameters:
                continue
            
            value = parameters[param_name]
            param_type = param_schema.get('type')
            
            # Type validation
            if param_type == 'int':
                if not isinstance(value, int):
                    try:
                        corrected[param_name] = int(value)
                        warnings.append(f"Parameter '{param_name}' converted to integer")
                    except (ValueError, TypeError):
                        errors.append(f"Parameter '{param_name}' must be an integer")
                        continue
                else:
                    corrected[param_name] = value
            
            elif param_type == 'float':
                if not isinstance(value, (int, float)):
                    try:
                        corrected[param_name] = float(value)
                        warnings.append(f"Parameter '{param_name}' converted to float")
                    except (ValueError, TypeError):
                        errors.append(f"Parameter '{param_name}' must be a number")
                        continue
                else:
                    corrected[param_name] = float(value)
            
            elif param_type == 'bool':
                if not isinstance(value, bool):
                    corrected[param_name] = bool(value)
                    warnings.append(f"Parameter '{param_name}' converted to boolean")
                else:
                    corrected[param_name] = value
            
            elif param_type == 'string':
                if not isinstance(value, str):
                    corrected[param_name] = str(value)
                    warnings.append(f"Parameter '{param_name}' converted to string")
                else:
                    corrected[param_name] = value
            
            else:
                corrected[param_name] = value
            
            # Range validation
            if 'min' in param_schema:
                if corrected[param_name] < param_schema['min']:
                    errors.append(
                        f"Parameter '{param_name}' must be at least {param_schema['min']} "
                        f"(got {corrected[param_name]})"
                    )
            
            if 'max' in param_schema:
                if corrected[param_name] > param_schema['max']:
                    errors.append(
                        f"Parameter '{param_name}' must be at most {param_schema['max']} "
                        f"(got {corrected[param_name]})"
                    )
            
            # Options validation
            if 'options' in param_schema:
                if corrected[param_name] not in param_schema['options']:
                    errors.append(
                        f"Parameter '{param_name}' must be one of {param_schema['options']} "
                        f"(got {corrected[param_name]})"
                    )
        
        return ParameterValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            corrected_parameters=corrected if corrected else None
        )
    
    def create_invalid_parameter_error(self,
                                      parameter_name: str,
                                      provided_value: Any,
                                      expected_type: str,
                                      valid_range: Optional[Tuple[Any, Any]] = None) -> UserFriendlyError:
        """Create user-friendly error for invalid parameter."""
        template = self.error_templates[UserErrorType.INVALID_PARAMETER]
        
        message = f"Parameter '{parameter_name}' has an invalid value: {provided_value}"
        
        suggestions = [
            f"Expected type: {expected_type}"
        ]
        
        if valid_range:
            suggestions.append(f"Valid range: {valid_range[0]} to {valid_range[1]}")
        
        recovery_actions = [
            f"Check the value of '{parameter_name}'",
            "Refer to the documentation for valid parameter values",
            "Try using the default value"
        ]
        
        return UserFriendlyError(
            title=template['title'],
            message=message,
            error_type=UserErrorType.INVALID_PARAMETER,
            suggestions=suggestions,
            recovery_actions=recovery_actions
        )
    
    def create_unsupported_content_error(self,
                                        content_type: str,
                                        supported_types: List[str]) -> UserFriendlyError:
        """Create user-friendly error for unsupported content."""
        template = self.error_templates[UserErrorType.UNSUPPORTED_CONTENT]
        
        message = f"Content type '{content_type}' is not supported for this operation."
        
        suggestions = [
            f"Supported types: {', '.join(supported_types)}"
        ]
        
        recovery_actions = [
            "Convert your content to a supported format",
            "Check the file format and try again",
            "Contact support if you believe this is an error"
        ]
        
        return UserFriendlyError(
            title=template['title'],
            message=message,
            error_type=UserErrorType.UNSUPPORTED_CONTENT,
            suggestions=suggestions,
            recovery_actions=recovery_actions
        )
    
    def create_missing_requirement_error(self,
                                        requirement_name: str,
                                        requirement_type: str) -> UserFriendlyError:
        """Create user-friendly error for missing requirement."""
        template = self.error_templates[UserErrorType.MISSING_REQUIREMENT]
        
        message = f"Required {requirement_type} '{requirement_name}' is not available."
        
        suggestions = []
        recovery_actions = []
        
        if requirement_type == "model":
            suggestions.append("The AI model needs to be downloaded")
            recovery_actions.extend([
                "Download the required model from the model library",
                "Check your internet connection",
                "Ensure you have sufficient disk space"
            ])
        elif requirement_type == "resource":
            suggestions.append("Insufficient system resources")
            recovery_actions.extend([
                "Close other applications to free up resources",
                "Reduce quality settings",
                "Try again later"
            ])
        
        return UserFriendlyError(
            title=template['title'],
            message=message,
            error_type=UserErrorType.MISSING_REQUIREMENT,
            suggestions=suggestions,
            recovery_actions=recovery_actions
        )
    
    def create_offline_mode_error(self,
                                  operation_name: str,
                                  cached_available: bool = False) -> UserFriendlyError:
        """Create user-friendly error for offline mode."""
        template = self.error_templates[UserErrorType.OFFLINE_MODE]
        
        message = f"Operation '{operation_name}' requires an internet connection."
        
        suggestions = []
        recovery_actions = []
        
        if cached_available:
            suggestions.append("Cached results may be available")
            recovery_actions.append("Try using cached results")
        
        recovery_actions.extend([
            "Check your internet connection",
            "Try again when online",
            "Enable offline mode if available"
        ])
        
        return UserFriendlyError(
            title=template['title'],
            message=message,
            error_type=UserErrorType.OFFLINE_MODE,
            suggestions=suggestions,
            recovery_actions=recovery_actions
        )
    
    def enable_offline_mode(self, cached_models: List[str]):
        """Enable offline mode with cached models."""
        self.offline_mode = True
        self.cached_models = cached_models
        self.logger.info(f"Offline mode enabled with {len(cached_models)} cached models")
    
    def disable_offline_mode(self):
        """Disable offline mode."""
        self.offline_mode = False
        self.logger.info("Offline mode disabled")
    
    def is_offline_mode(self) -> bool:
        """Check if offline mode is enabled."""
        return self.offline_mode
    
    def get_cached_models(self) -> List[str]:
        """Get list of cached models available offline."""
        return self.cached_models.copy()
    
    def format_error_for_display(self, error: UserFriendlyError) -> str:
        """Format error for console/UI display."""
        lines = [
            f"❌ {error.title}",
            f"   {error.message}",
            ""
        ]
        
        if error.suggestions:
            lines.append("💡 Suggestions:")
            for suggestion in error.suggestions:
                lines.append(f"   • {suggestion}")
            lines.append("")
        
        if error.recovery_actions:
            lines.append("🔧 What you can do:")
            for i, action in enumerate(error.recovery_actions, 1):
                lines.append(f"   {i}. {action}")
            lines.append("")
        
        if error.details:
            lines.append(f"Details: {error.details}")
        
        return "\n".join(lines)
    
    def get_parameter_help(self, parameter_name: str, schema: Dict[str, Any]) -> str:
        """Get help text for a parameter."""
        if parameter_name not in schema:
            return f"No help available for parameter '{parameter_name}'"
        
        param_schema = schema[parameter_name]
        
        lines = [
            f"Parameter: {parameter_name}",
            f"Type: {param_schema.get('type', 'any')}",
        ]
        
        if 'description' in param_schema:
            lines.append(f"Description: {param_schema['description']}")
        
        if 'default' in param_schema:
            lines.append(f"Default: {param_schema['default']}")
        
        if 'min' in param_schema or 'max' in param_schema:
            min_val = param_schema.get('min', 'none')
            max_val = param_schema.get('max', 'none')
            lines.append(f"Range: {min_val} to {max_val}")
        
        if 'options' in param_schema:
            lines.append(f"Options: {', '.join(map(str, param_schema['options']))}")
        
        if param_schema.get('required', False):
            lines.append("Required: Yes")
        
        return "\n".join(lines)


# Factory function
def create_user_error_handler() -> AIUserErrorHandler:
    """Create user error handler."""
    return AIUserErrorHandler()
