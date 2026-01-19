"""
Error handling and recovery system for Character Setup Wizard

This module provides comprehensive error handling with specific recovery
strategies for different types of failures that can occur during character creation.
"""

import logging
import traceback
from enum import Enum
from dataclasses import dataclass
from typing import Dict, List, Optional, Any, Callable
from pathlib import Path


class ErrorCategory(Enum):
    """Categories of errors that can occur in character creation"""
    INPUT_VALIDATION = "input_validation"
    IMAGE_PROCESSING = "image_processing"
    GENERATION_FAILURE = "generation_failure"
    INTEGRATION_ERROR = "integration_error"
    FILE_SYSTEM_ERROR = "file_system_error"
    NETWORK_ERROR = "network_error"
    CONFIGURATION_ERROR = "configuration_error"
    VALIDATION_ERROR = "validation_error"


class ErrorSeverity(Enum):
    """Severity levels for errors"""
    LOW = "low"          # Warning, can continue
    MEDIUM = "medium"    # Error, but recoverable
    HIGH = "high"        # Critical error, requires intervention
    CRITICAL = "critical"  # System failure, cannot continue


@dataclass
class RecoveryAction:
    """Represents a recovery action for an error"""
    action_type: str  # retry, fallback, manual_input, skip, abort
    description: str
    parameters: Dict[str, Any]
    success_probability: float  # 0.0 to 1.0


@dataclass
class ErrorContext:
    """Context information for an error"""
    operation: str
    step: str
    input_data: Dict[str, Any]
    system_state: Dict[str, Any]
    timestamp: str


class CharacterWizardError(Exception):
    """Base exception for Character Wizard errors"""
    
    def __init__(self, message: str, category: ErrorCategory, severity: ErrorSeverity, 
                 context: Optional[ErrorContext] = None, recovery_actions: Optional[List[RecoveryAction]] = None):
        super().__init__(message)
        self.message = message
        self.category = category
        self.severity = severity
        self.context = context
        self.recovery_actions = recovery_actions or []


class ValidationError(CharacterWizardError):
    """Error in input validation"""
    
    def __init__(self, message: str, field: str, value: Any, context: Optional[ErrorContext] = None):
        super().__init__(message, ErrorCategory.INPUT_VALIDATION, ErrorSeverity.MEDIUM, context)
        self.field = field
        self.value = value


class ImageProcessingError(CharacterWizardError):
    """Error in image processing or analysis"""
    
    def __init__(self, message: str, image_path: str, context: Optional[ErrorContext] = None):
        super().__init__(message, ErrorCategory.IMAGE_PROCESSING, ErrorSeverity.MEDIUM, context)
        self.image_path = image_path


class GenerationError(CharacterWizardError):
    """Error in character generation"""
    
    def __init__(self, message: str, generation_type: str, context: Optional[ErrorContext] = None):
        super().__init__(message, ErrorCategory.GENERATION_FAILURE, ErrorSeverity.HIGH, context)
        self.generation_type = generation_type


class IntegrationError(CharacterWizardError):
    """Error in system integration"""
    
    def __init__(self, message: str, system: str, context: Optional[ErrorContext] = None):
        super().__init__(message, ErrorCategory.INTEGRATION_ERROR, ErrorSeverity.HIGH, context)
        self.system = system


class CharacterWizardErrorHandler:
    """Handles errors with appropriate recovery strategies"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.max_retries = self.config.get('max_error_retries', 3)
        self.recovery_enabled = self.config.get('error_recovery_enabled', True)
        self.detailed_logging = self.config.get('detailed_error_logging', True)
        
        # Set up logging
        self.logger = logging.getLogger('character_wizard.error_handler')
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
        
        # Recovery strategy registry
        self.recovery_strategies: Dict[ErrorCategory, Callable] = {
            ErrorCategory.INPUT_VALIDATION: self._handle_validation_error,
            ErrorCategory.IMAGE_PROCESSING: self._handle_image_processing_error,
            ErrorCategory.GENERATION_FAILURE: self._handle_generation_error,
            ErrorCategory.INTEGRATION_ERROR: self._handle_integration_error,
            ErrorCategory.FILE_SYSTEM_ERROR: self._handle_file_system_error,
            ErrorCategory.NETWORK_ERROR: self._handle_network_error,
            ErrorCategory.CONFIGURATION_ERROR: self._handle_configuration_error,
            ErrorCategory.VALIDATION_ERROR: self._handle_validation_error
        }

    def handle_error(self, error: CharacterWizardError) -> RecoveryAction:
        """
        Handle an error and return appropriate recovery action
        
        Args:
            error: The error to handle
            
        Returns:
            RecoveryAction with recommended recovery strategy
        """
        self._log_error(error)
        
        # Get recovery strategy for error category
        strategy_handler = self.recovery_strategies.get(error.category)
        if strategy_handler:
            return strategy_handler(error)
        else:
            return self._default_recovery_action(error)

    def _log_error(self, error: CharacterWizardError):
        """Log error with appropriate detail level"""
        log_message = f"[{error.category.value}] {error.message}"
        
        if error.severity == ErrorSeverity.CRITICAL:
            self.logger.critical(log_message)
        elif error.severity == ErrorSeverity.HIGH:
            self.logger.error(log_message)
        elif error.severity == ErrorSeverity.MEDIUM:
            self.logger.warning(log_message)
        else:
            self.logger.info(log_message)
        
        if self.detailed_logging and error.context:
            self.logger.debug(f"Error context: {error.context}")
            if hasattr(error, '__traceback__') and error.__traceback__:
                self.logger.debug(f"Traceback: {''.join(traceback.format_tb(error.__traceback__))}")

    def _handle_validation_error(self, error: ValidationError) -> RecoveryAction:
        """Handle input validation errors"""
        if isinstance(error, ValidationError):
            # Specific handling for validation errors
            if error.field in ['image_path', 'file_path']:
                return RecoveryAction(
                    action_type="manual_input",
                    description=f"Please provide a valid {error.field}",
                    parameters={"field": error.field, "current_value": error.value},
                    success_probability=0.9
                )
            else:
                return RecoveryAction(
                    action_type="manual_input",
                    description=f"Please correct the {error.field} field: {error.message}",
                    parameters={"field": error.field, "validation_error": error.message},
                    success_probability=0.8
                )
        
        return RecoveryAction(
            action_type="manual_input",
            description="Please review and correct your input",
            parameters={"error_message": error.message},
            success_probability=0.7
        )

    def _handle_image_processing_error(self, error: ImageProcessingError) -> RecoveryAction:
        """Handle image analysis and processing errors"""
        # Try different recovery strategies based on the specific error
        if "format" in error.message.lower() or "unsupported" in error.message.lower():
            return RecoveryAction(
                action_type="manual_input",
                description="Please provide an image in a supported format (JPG, PNG, WebP, GIF)",
                parameters={"supported_formats": ["jpg", "png", "webp", "gif"]},
                success_probability=0.9
            )
        elif "size" in error.message.lower() or "large" in error.message.lower():
            return RecoveryAction(
                action_type="retry",
                description="Attempting to resize image automatically",
                parameters={"resize_image": True, "max_size_mb": 50},
                success_probability=0.8
            )
        elif "corrupted" in error.message.lower() or "invalid" in error.message.lower():
            return RecoveryAction(
                action_type="manual_input",
                description="The image appears to be corrupted. Please provide a different image",
                parameters={"request_new_image": True},
                success_probability=0.9
            )
        else:
            return RecoveryAction(
                action_type="fallback",
                description="Image analysis failed. Would you like to describe the character manually?",
                parameters={"fallback_to_manual": True},
                success_probability=0.7
            )

    def _handle_generation_error(self, error: GenerationError) -> RecoveryAction:
        """Handle character generation failures"""
        if "timeout" in error.message.lower():
            return RecoveryAction(
                action_type="retry",
                description="Generation timed out. Retrying with adjusted parameters",
                parameters={"increase_timeout": True, "simplify_parameters": True},
                success_probability=0.6
            )
        elif "service" in error.message.lower() or "connection" in error.message.lower():
            return RecoveryAction(
                action_type="fallback",
                description="AI service unavailable. Would you like to create the character manually?",
                parameters={"fallback_to_manual": True},
                success_probability=0.8
            )
        else:
            return RecoveryAction(
                action_type="retry",
                description="Generation failed. Retrying with different parameters",
                parameters={"adjust_parameters": True, "retry_count": 1},
                success_probability=0.5
            )

    def _handle_integration_error(self, error: IntegrationError) -> RecoveryAction:
        """Handle system integration failures"""
        if "comfyui" in error.system.lower():
            return RecoveryAction(
                action_type="fallback",
                description="ComfyUI integration failed. Character will be saved without ComfyUI configuration",
                parameters={"skip_comfyui": True, "save_character": True},
                success_probability=0.9
            )
        elif "puppet" in error.system.lower():
            return RecoveryAction(
                action_type="fallback",
                description="Puppet System integration failed. Character will use default category",
                parameters={"default_puppet_category": "M1", "save_character": True},
                success_probability=0.9
            )
        else:
            return RecoveryAction(
                action_type="retry",
                description="Integration failed. Retrying with fallback configuration",
                parameters={"use_fallback_config": True},
                success_probability=0.6
            )

    def _handle_file_system_error(self, error: CharacterWizardError) -> RecoveryAction:
        """Handle file system errors"""
        if "permission" in error.message.lower():
            return RecoveryAction(
                action_type="manual_input",
                description="Permission denied. Please check file permissions or choose a different location",
                parameters={"check_permissions": True},
                success_probability=0.8
            )
        elif "space" in error.message.lower() or "disk" in error.message.lower():
            return RecoveryAction(
                action_type="manual_input",
                description="Insufficient disk space. Please free up space or choose a different location",
                parameters={"check_disk_space": True},
                success_probability=0.9
            )
        else:
            return RecoveryAction(
                action_type="retry",
                description="File system error. Retrying operation",
                parameters={"retry_file_operation": True},
                success_probability=0.5
            )

    def _handle_network_error(self, error: CharacterWizardError) -> RecoveryAction:
        """Handle network-related errors"""
        return RecoveryAction(
            action_type="retry",
            description="Network error. Retrying connection",
            parameters={"retry_network": True, "increase_timeout": True},
            success_probability=0.6
        )

    def _handle_configuration_error(self, error: CharacterWizardError) -> RecoveryAction:
        """Handle configuration errors"""
        return RecoveryAction(
            action_type="fallback",
            description="Configuration error. Using default settings",
            parameters={"use_default_config": True},
            success_probability=0.8
        )

    def _default_recovery_action(self, error: CharacterWizardError) -> RecoveryAction:
        """Default recovery action for unhandled error types"""
        if error.severity == ErrorSeverity.CRITICAL:
            return RecoveryAction(
                action_type="abort",
                description="Critical error occurred. Cannot continue",
                parameters={"error_details": error.message},
                success_probability=0.0
            )
        else:
            return RecoveryAction(
                action_type="manual_input",
                description="An error occurred. Please review and try again",
                parameters={"error_message": error.message},
                success_probability=0.5
            )

    def create_error_report(self, errors: List[CharacterWizardError]) -> Dict[str, Any]:
        """Create a comprehensive error report"""
        report = {
            "total_errors": len(errors),
            "error_categories": {},
            "severity_distribution": {},
            "errors": []
        }
        
        for error in errors:
            # Count by category
            category = error.category.value
            report["error_categories"][category] = report["error_categories"].get(category, 0) + 1
            
            # Count by severity
            severity = error.severity.value
            report["severity_distribution"][severity] = report["severity_distribution"].get(severity, 0) + 1
            
            # Add error details
            error_detail = {
                "message": error.message,
                "category": category,
                "severity": severity,
                "recovery_actions": [
                    {
                        "type": action.action_type,
                        "description": action.description,
                        "success_probability": action.success_probability
                    }
                    for action in error.recovery_actions
                ]
            }
            
            if error.context:
                error_detail["context"] = {
                    "operation": error.context.operation,
                    "step": error.context.step,
                    "timestamp": error.context.timestamp
                }
            
            report["errors"].append(error_detail)
        
        return report

    def save_error_log(self, errors: List[CharacterWizardError], log_path: Path) -> bool:
        """Save error log to file"""
        try:
            import json
            
            log_path.parent.mkdir(parents=True, exist_ok=True)
            report = self.create_error_report(errors)
            
            with open(log_path, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            
            return True
        except Exception as e:
            self.logger.error(f"Failed to save error log: {e}")
            return False