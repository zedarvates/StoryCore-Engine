"""
Input Validation Module

This module provides JSON Schema validators and field-level validation
with detailed error messages for all API inputs.

Requirements: 6.7
"""

from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime
import re


class ValidationError(Exception):
    """
    Exception raised when input validation fails.
    
    Attributes:
        field: The field that failed validation
        issue: Description of the validation issue
        expected: What was expected
        received: What was actually received
    """
    def __init__(self, field: str, issue: str, expected: str, received: Any = None):
        self.field = field
        self.issue = issue
        self.expected = expected
        self.received = received
        super().__init__(self._format_message())
    
    def _format_message(self) -> str:
        """Formats the error message."""
        msg = f"Validation error in field '{self.field}': {self.issue}. Expected: {self.expected}"
        if self.received is not None:
            msg += f". Received: {self.received}"
        return msg
    
    def to_dict(self) -> Dict[str, Any]:
        """Converts error to dictionary format for API responses."""
        return {
            "field": self.field,
            "issue": self.issue,
            "expected": self.expected,
            "received": str(self.received) if self.received is not None else None
        }


class ValidationResult:
    """
    Result of validation operation.
    
    Attributes:
        is_valid: Whether validation passed
        errors: List of validation errors
    """
    def __init__(self, is_valid: bool = True, errors: Optional[List[ValidationError]] = None):
        self.is_valid = is_valid
        self.errors = errors or []
    
    def add_error(self, error: ValidationError):
        """Adds a validation error."""
        self.is_valid = False
        self.errors.append(error)
    
    def to_dict(self) -> Dict[str, Any]:
        """Converts result to dictionary format."""
        return {
            "is_valid": self.is_valid,
            "errors": [e.to_dict() for e in self.errors]
        }


# JSON Schema definitions for all API inputs

CLAIM_SCHEMA = {
    "type": "object",
    "required": ["id", "text", "position"],
    "properties": {
        "id": {"type": "string", "minLength": 1},
        "text": {"type": "string", "minLength": 1},
        "position": {
            "type": "array",
            "items": {"type": "integer", "minimum": 0},
            "minItems": 2,
            "maxItems": 2
        },
        "domain": {
            "type": ["string", "null"],
            "enum": ["physics", "biology", "history", "statistics", "general", None]
        },
        "confidence": {
            "type": ["number", "null"],
            "minimum": 0,
            "maximum": 100
        },
        "risk_level": {
            "type": ["string", "null"],
            "enum": ["low", "medium", "high", "critical", None]
        }
    }
}


EVIDENCE_SCHEMA = {
    "type": "object",
    "required": ["source", "source_type", "credibility_score", "relevance", "excerpt"],
    "properties": {
        "source": {"type": "string", "minLength": 1},
        "source_type": {
            "type": "string",
            "enum": ["academic", "news", "government", "encyclopedia"]
        },
        "credibility_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
        },
        "relevance": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
        },
        "excerpt": {"type": "string", "minLength": 1},
        "url": {"type": ["string", "null"]},
        "publication_date": {"type": ["string", "null"]}
    }
}


SCIENTIFIC_AUDIT_INPUT_SCHEMA = {
    "type": "object",
    "required": ["content"],
    "properties": {
        "content": {"type": "string", "minLength": 1, "maxLength": 50000},
        "domain_hint": {
            "type": ["string", "null"],
            "enum": ["physics", "biology", "history", "statistics", "general", None]
        },
        "confidence_threshold": {
            "type": ["number", "null"],
            "minimum": 0,
            "maximum": 100
        },
        "trusted_sources": {
            "type": ["array", "null"],
            "items": {"type": "string"}
        }
    }
}


ANTIFAKE_VIDEO_INPUT_SCHEMA = {
    "type": "object",
    "required": ["transcript"],
    "properties": {
        "transcript": {"type": "string", "minLength": 1, "maxLength": 100000},
        "timestamps": {
            "type": ["array", "null"],
            "items": {"type": "string"}
        },
        "metadata": {
            "type": ["object", "null"],
            "properties": {
                "source": {"type": "string"},
                "duration_seconds": {"type": "number", "minimum": 0}
            }
        }
    }
}


FACT_CHECKER_COMMAND_SCHEMA = {
    "type": "object",
    "required": ["input"],
    "properties": {
        "mode": {
            "type": "string",
            "enum": ["text", "video", "auto"],
            "default": "auto"
        },
        "input": {"type": "string", "minLength": 1},
        "confidence_threshold": {
            "type": ["number", "null"],
            "minimum": 0,
            "maximum": 100
        },
        "detail_level": {
            "type": ["string", "null"],
            "enum": ["summary", "detailed", "full", None]
        },
        "output_format": {
            "type": ["string", "null"],
            "enum": ["json", "markdown", "pdf", None]
        },
        "cache": {"type": ["boolean", "null"]}
    }
}


CONFIGURATION_SCHEMA = {
    "type": "object",
    "properties": {
        "confidence_threshold": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
        },
        "risk_level_mappings": {
            "type": "object",
            "properties": {
                "critical": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 2,
                    "maxItems": 2
                },
                "high": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 2,
                    "maxItems": 2
                },
                "medium": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 2,
                    "maxItems": 2
                },
                "low": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 2,
                    "maxItems": 2
                }
            }
        },
        "trusted_sources": {"type": "object"},
        "custom_domains": {
            "type": "array",
            "items": {"type": "string"}
        },
        "cache_enabled": {"type": "boolean"},
        "cache_ttl_seconds": {
            "type": "integer",
            "minimum": 0
        },
        "max_concurrent_verifications": {
            "type": "integer",
            "minimum": 1,
            "maximum": 100
        },
        "timeout_seconds": {
            "type": "integer",
            "minimum": 1,
            "maximum": 600
        }
    }
}


def validate_claim(claim_data: Dict[str, Any]) -> ValidationResult:
    """
    Validates claim data against schema.
    
    Args:
        claim_data: Dictionary containing claim data
        
    Returns:
        ValidationResult with validation status and errors
    """
    result = ValidationResult()
    
    # Check required fields
    required_fields = ["id", "text", "position"]
    for field in required_fields:
        if field not in claim_data:
            result.add_error(ValidationError(
                field=field,
                issue="Missing required field",
                expected="Field must be present",
                received=None
            ))
    
    if not result.is_valid:
        return result
    
    # Validate id
    if not isinstance(claim_data["id"], str) or len(claim_data["id"]) == 0:
        result.add_error(ValidationError(
            field="id",
            issue="Invalid id format",
            expected="Non-empty string",
            received=type(claim_data["id"]).__name__
        ))
    
    # Validate text
    if not isinstance(claim_data["text"], str) or len(claim_data["text"]) == 0:
        result.add_error(ValidationError(
            field="text",
            issue="Invalid text format",
            expected="Non-empty string",
            received=type(claim_data["text"]).__name__
        ))
    
    # Validate position
    if not isinstance(claim_data["position"], (list, tuple)) or len(claim_data["position"]) != 2:
        result.add_error(ValidationError(
            field="position",
            issue="Invalid position format",
            expected="Array of 2 integers",
            received=f"{type(claim_data['position']).__name__} with length {len(claim_data.get('position', []))}"
        ))
    elif not all(isinstance(x, int) and x >= 0 for x in claim_data["position"]):
        result.add_error(ValidationError(
            field="position",
            issue="Position values must be non-negative integers",
            expected="Array of 2 non-negative integers",
            received=claim_data["position"]
        ))
    
    # Validate optional domain
    if "domain" in claim_data and claim_data["domain"] is not None:
        valid_domains = ["physics", "biology", "history", "statistics", "general"]
        if claim_data["domain"] not in valid_domains:
            result.add_error(ValidationError(
                field="domain",
                issue="Invalid domain value",
                expected=f"One of {valid_domains}",
                received=claim_data["domain"]
            ))
    
    # Validate optional confidence
    if "confidence" in claim_data and claim_data["confidence"] is not None:
        if not isinstance(claim_data["confidence"], (int, float)):
            result.add_error(ValidationError(
                field="confidence",
                issue="Invalid confidence type",
                expected="Number between 0 and 100",
                received=type(claim_data["confidence"]).__name__
            ))
        elif not 0 <= claim_data["confidence"] <= 100:
            result.add_error(ValidationError(
                field="confidence",
                issue="Confidence out of range",
                expected="Number between 0 and 100",
                received=claim_data["confidence"]
            ))
    
    # Validate optional risk_level
    if "risk_level" in claim_data and claim_data["risk_level"] is not None:
        valid_levels = ["low", "medium", "high", "critical"]
        if claim_data["risk_level"] not in valid_levels:
            result.add_error(ValidationError(
                field="risk_level",
                issue="Invalid risk level",
                expected=f"One of {valid_levels}",
                received=claim_data["risk_level"]
            ))
    
    return result


def validate_evidence(evidence_data: Dict[str, Any]) -> ValidationResult:
    """
    Validates evidence data against schema.
    
    Args:
        evidence_data: Dictionary containing evidence data
        
    Returns:
        ValidationResult with validation status and errors
    """
    result = ValidationResult()
    
    # Check required fields
    required_fields = ["source", "source_type", "credibility_score", "relevance", "excerpt"]
    for field in required_fields:
        if field not in evidence_data:
            result.add_error(ValidationError(
                field=field,
                issue="Missing required field",
                expected="Field must be present",
                received=None
            ))
    
    if not result.is_valid:
        return result
    
    # Validate source
    if not isinstance(evidence_data["source"], str) or len(evidence_data["source"]) == 0:
        result.add_error(ValidationError(
            field="source",
            issue="Invalid source format",
            expected="Non-empty string",
            received=type(evidence_data["source"]).__name__
        ))
    
    # Validate source_type
    valid_types = ["academic", "news", "government", "encyclopedia"]
    if evidence_data["source_type"] not in valid_types:
        result.add_error(ValidationError(
            field="source_type",
            issue="Invalid source type",
            expected=f"One of {valid_types}",
            received=evidence_data["source_type"]
        ))
    
    # Validate credibility_score
    if not isinstance(evidence_data["credibility_score"], (int, float)):
        result.add_error(ValidationError(
            field="credibility_score",
            issue="Invalid credibility score type",
            expected="Number between 0 and 100",
            received=type(evidence_data["credibility_score"]).__name__
        ))
    elif not 0 <= evidence_data["credibility_score"] <= 100:
        result.add_error(ValidationError(
            field="credibility_score",
            issue="Credibility score out of range",
            expected="Number between 0 and 100",
            received=evidence_data["credibility_score"]
        ))
    
    # Validate relevance
    if not isinstance(evidence_data["relevance"], (int, float)):
        result.add_error(ValidationError(
            field="relevance",
            issue="Invalid relevance type",
            expected="Number between 0 and 100",
            received=type(evidence_data["relevance"]).__name__
        ))
    elif not 0 <= evidence_data["relevance"] <= 100:
        result.add_error(ValidationError(
            field="relevance",
            issue="Relevance out of range",
            expected="Number between 0 and 100",
            received=evidence_data["relevance"]
        ))
    
    # Validate excerpt
    if not isinstance(evidence_data["excerpt"], str) or len(evidence_data["excerpt"]) == 0:
        result.add_error(ValidationError(
            field="excerpt",
            issue="Invalid excerpt format",
            expected="Non-empty string",
            received=type(evidence_data["excerpt"]).__name__
        ))
    
    # Validate optional URL
    if "url" in evidence_data and evidence_data["url"] is not None:
        if not isinstance(evidence_data["url"], str):
            result.add_error(ValidationError(
                field="url",
                issue="Invalid URL type",
                expected="String",
                received=type(evidence_data["url"]).__name__
            ))
        elif not _is_valid_url(evidence_data["url"]):
            result.add_error(ValidationError(
                field="url",
                issue="Invalid URL format",
                expected="Valid URL string",
                received=evidence_data["url"]
            ))
    
    return result


def validate_scientific_audit_input(input_data: Dict[str, Any]) -> ValidationResult:
    """
    Validates Scientific Audit Agent input.
    
    Args:
        input_data: Dictionary containing input data
        
    Returns:
        ValidationResult with validation status and errors
    """
    result = ValidationResult()
    
    # Check required field
    if "content" not in input_data:
        result.add_error(ValidationError(
            field="content",
            issue="Missing required field",
            expected="Field must be present",
            received=None
        ))
        return result
    
    # Validate content
    if not isinstance(input_data["content"], str):
        result.add_error(ValidationError(
            field="content",
            issue="Invalid content type",
            expected="String",
            received=type(input_data["content"]).__name__
        ))
    elif len(input_data["content"]) == 0:
        result.add_error(ValidationError(
            field="content",
            issue="Empty content",
            expected="Non-empty string (1-50000 characters)",
            received=f"Empty string"
        ))
    elif len(input_data["content"]) > 50000:
        result.add_error(ValidationError(
            field="content",
            issue="Content too long",
            expected="String with max 50000 characters",
            received=f"String with {len(input_data['content'])} characters"
        ))
    
    # Validate optional domain_hint
    if "domain_hint" in input_data and input_data["domain_hint"] is not None:
        valid_domains = ["physics", "biology", "history", "statistics", "general"]
        if input_data["domain_hint"] not in valid_domains:
            result.add_error(ValidationError(
                field="domain_hint",
                issue="Invalid domain hint",
                expected=f"One of {valid_domains}",
                received=input_data["domain_hint"]
            ))
    
    # Validate optional confidence_threshold
    if "confidence_threshold" in input_data and input_data["confidence_threshold"] is not None:
        if not isinstance(input_data["confidence_threshold"], (int, float)):
            result.add_error(ValidationError(
                field="confidence_threshold",
                issue="Invalid confidence threshold type",
                expected="Number between 0 and 100",
                received=type(input_data["confidence_threshold"]).__name__
            ))
        elif not 0 <= input_data["confidence_threshold"] <= 100:
            result.add_error(ValidationError(
                field="confidence_threshold",
                issue="Confidence threshold out of range",
                expected="Number between 0 and 100",
                received=input_data["confidence_threshold"]
            ))
    
    return result


def validate_antifake_video_input(input_data: Dict[str, Any]) -> ValidationResult:
    """
    Validates Anti-Fake Video Agent input.
    
    Args:
        input_data: Dictionary containing input data
        
    Returns:
        ValidationResult with validation status and errors
    """
    result = ValidationResult()
    
    # Check required field
    if "transcript" not in input_data:
        result.add_error(ValidationError(
            field="transcript",
            issue="Missing required field",
            expected="Field must be present",
            received=None
        ))
        return result
    
    # Validate transcript
    if not isinstance(input_data["transcript"], str):
        result.add_error(ValidationError(
            field="transcript",
            issue="Invalid transcript type",
            expected="String",
            received=type(input_data["transcript"]).__name__
        ))
    elif len(input_data["transcript"]) == 0:
        result.add_error(ValidationError(
            field="transcript",
            issue="Empty transcript",
            expected="Non-empty string (1-100000 characters)",
            received=f"Empty string"
        ))
    elif len(input_data["transcript"]) > 100000:
        result.add_error(ValidationError(
            field="transcript",
            issue="Transcript too long",
            expected="String with max 100000 characters",
            received=f"String with {len(input_data['transcript'])} characters"
        ))
    
    # Validate optional timestamps
    if "timestamps" in input_data and input_data["timestamps"] is not None:
        if not isinstance(input_data["timestamps"], list):
            result.add_error(ValidationError(
                field="timestamps",
                issue="Invalid timestamps type",
                expected="Array of strings",
                received=type(input_data["timestamps"]).__name__
            ))
        else:
            for i, ts in enumerate(input_data["timestamps"]):
                if not isinstance(ts, str):
                    result.add_error(ValidationError(
                        field=f"timestamps[{i}]",
                        issue="Invalid timestamp type",
                        expected="String",
                        received=type(ts).__name__
                    ))
    
    # Validate optional metadata
    if "metadata" in input_data and input_data["metadata"] is not None:
        if not isinstance(input_data["metadata"], dict):
            result.add_error(ValidationError(
                field="metadata",
                issue="Invalid metadata type",
                expected="Object",
                received=type(input_data["metadata"]).__name__
            ))
        else:
            metadata = input_data["metadata"]
            if "duration_seconds" in metadata:
                if not isinstance(metadata["duration_seconds"], (int, float)):
                    result.add_error(ValidationError(
                        field="metadata.duration_seconds",
                        issue="Invalid duration type",
                        expected="Number >= 0",
                        received=type(metadata["duration_seconds"]).__name__
                    ))
                elif metadata["duration_seconds"] < 0:
                    result.add_error(ValidationError(
                        field="metadata.duration_seconds",
                        issue="Duration cannot be negative",
                        expected="Number >= 0",
                        received=metadata["duration_seconds"]
                    ))
    
    return result


def validate_fact_checker_command(command_data: Dict[str, Any]) -> ValidationResult:
    """
    Validates Fact Checker Command input.
    
    Args:
        command_data: Dictionary containing command data
        
    Returns:
        ValidationResult with validation status and errors
    """
    result = ValidationResult()
    
    # Check required field
    if "input" not in command_data:
        result.add_error(ValidationError(
            field="input",
            issue="Missing required field",
            expected="Field must be present",
            received=None
        ))
        return result
    
    # Validate input
    if not isinstance(command_data["input"], str) or len(command_data["input"]) == 0:
        result.add_error(ValidationError(
            field="input",
            issue="Invalid input format",
            expected="Non-empty string",
            received=type(command_data["input"]).__name__ if "input" in command_data else None
        ))
    
    # Validate optional mode
    if "mode" in command_data:
        valid_modes = ["text", "video", "auto"]
        if command_data["mode"] not in valid_modes:
            result.add_error(ValidationError(
                field="mode",
                issue="Invalid mode",
                expected=f"One of {valid_modes}",
                received=command_data["mode"]
            ))
    
    # Validate optional confidence_threshold
    if "confidence_threshold" in command_data and command_data["confidence_threshold"] is not None:
        if not isinstance(command_data["confidence_threshold"], (int, float)):
            result.add_error(ValidationError(
                field="confidence_threshold",
                issue="Invalid confidence threshold type",
                expected="Number between 0 and 100",
                received=type(command_data["confidence_threshold"]).__name__
            ))
        elif not 0 <= command_data["confidence_threshold"] <= 100:
            result.add_error(ValidationError(
                field="confidence_threshold",
                issue="Confidence threshold out of range",
                expected="Number between 0 and 100",
                received=command_data["confidence_threshold"]
            ))
    
    # Validate optional detail_level
    if "detail_level" in command_data and command_data["detail_level"] is not None:
        valid_levels = ["summary", "detailed", "full"]
        if command_data["detail_level"] not in valid_levels:
            result.add_error(ValidationError(
                field="detail_level",
                issue="Invalid detail level",
                expected=f"One of {valid_levels}",
                received=command_data["detail_level"]
            ))
    
    # Validate optional output_format
    if "output_format" in command_data and command_data["output_format"] is not None:
        valid_formats = ["json", "markdown", "pdf"]
        if command_data["output_format"] not in valid_formats:
            result.add_error(ValidationError(
                field="output_format",
                issue="Invalid output format",
                expected=f"One of {valid_formats}",
                received=command_data["output_format"]
            ))
    
    return result


def validate_configuration(config_data: Dict[str, Any]) -> ValidationResult:
    """
    Validates configuration data.
    
    Args:
        config_data: Dictionary containing configuration data
        
    Returns:
        ValidationResult with validation status and errors
    """
    result = ValidationResult()
    
    # Validate confidence_threshold
    if "confidence_threshold" in config_data:
        if not isinstance(config_data["confidence_threshold"], (int, float)):
            result.add_error(ValidationError(
                field="confidence_threshold",
                issue="Invalid type",
                expected="Number between 0 and 100",
                received=type(config_data["confidence_threshold"]).__name__
            ))
        elif not 0 <= config_data["confidence_threshold"] <= 100:
            result.add_error(ValidationError(
                field="confidence_threshold",
                issue="Value out of range",
                expected="Number between 0 and 100",
                received=config_data["confidence_threshold"]
            ))
    
    # Validate risk_level_mappings
    if "risk_level_mappings" in config_data:
        mappings = config_data["risk_level_mappings"]
        if not isinstance(mappings, dict):
            result.add_error(ValidationError(
                field="risk_level_mappings",
                issue="Invalid type",
                expected="Object",
                received=type(mappings).__name__
            ))
        else:
            required_levels = ["critical", "high", "medium", "low"]
            for level in required_levels:
                if level not in mappings:
                    result.add_error(ValidationError(
                        field=f"risk_level_mappings.{level}",
                        issue="Missing risk level",
                        expected=f"Array of 2 numbers",
                        received=None
                    ))
                elif not isinstance(mappings[level], (list, tuple)) or len(mappings[level]) != 2:
                    result.add_error(ValidationError(
                        field=f"risk_level_mappings.{level}",
                        issue="Invalid format",
                        expected="Array of 2 numbers",
                        received=type(mappings[level]).__name__
                    ))
    
    # Validate max_concurrent_verifications
    if "max_concurrent_verifications" in config_data:
        value = config_data["max_concurrent_verifications"]
        if not isinstance(value, int):
            result.add_error(ValidationError(
                field="max_concurrent_verifications",
                issue="Invalid type",
                expected="Integer between 1 and 100",
                received=type(value).__name__
            ))
        elif not 1 <= value <= 100:
            result.add_error(ValidationError(
                field="max_concurrent_verifications",
                issue="Value out of range",
                expected="Integer between 1 and 100",
                received=value
            ))
    
    # Validate timeout_seconds
    if "timeout_seconds" in config_data:
        value = config_data["timeout_seconds"]
        if not isinstance(value, int):
            result.add_error(ValidationError(
                field="timeout_seconds",
                issue="Invalid type",
                expected="Integer between 1 and 600",
                received=type(value).__name__
            ))
        elif not 1 <= value <= 600:
            result.add_error(ValidationError(
                field="timeout_seconds",
                issue="Value out of range",
                expected="Integer between 1 and 600",
                received=value
            ))
    
    return result


def _is_valid_url(url: str) -> bool:
    """
    Validates URL format.
    
    Args:
        url: URL string to validate
        
    Returns:
        True if URL is valid
    """
    # Simple URL validation regex
    url_pattern = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
    
    return bool(url_pattern.match(url))
