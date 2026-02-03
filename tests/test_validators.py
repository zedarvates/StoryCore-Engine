"""
Unit tests for JSON Schema validators.

Tests validation functions for all data models and input/output schemas.
"""

import pytest
from datetime import datetime

from src.fact_checker.validators import (
    validate_claim,
    validate_evidence,
    validate_verification_result,
    validate_manipulation_signal,
    validate_report,
    validate_configuration,
    validate_scientific_audit_input,
    validate_antifake_video_input,
    validate_fact_checker_response,
    get_validation_errors,
    ValidationResult
)


class TestValidationResult:
    """Tests for ValidationResult class."""
    
    def test_valid_result(self):
        """Test valid validation result."""
        result = ValidationResult(is_valid=True)
        assert result.is_valid
        assert bool(result) is True
        assert result.errors == []
    
    def test_invalid_result(self):
        """Test invalid validation result."""
        result = ValidationResult(is_valid=False, errors=["Error 1", "Error 2"])
        assert not result.is_valid
        assert bool(result) is False
        assert len(result.errors) == 2


class TestClaimValidation:
    """Tests for claim validation."""
    
    def test_valid_claim(self):
        """Test validation of valid claim data."""
        claim_data = {
            "id": "claim-001",
            "text": "Test claim",
            "position": [0, 10],
            "domain": "physics",
            "confidence": 85.0,
            "risk_level": "low",
            "evidence": [],
            "recommendation": "No action needed"
        }
        result = validate_claim(claim_data)
        assert result.is_valid
    
    def test_claim_missing_required_field(self):
        """Test validation fails when required field is missing."""
        claim_data = {
            "id": "claim-001",
            "position": [0, 10]
            # Missing 'text' field
        }
        result = validate_claim(claim_data)
        assert not result.is_valid
        assert len(result.errors) > 0
    
    def test_claim_invalid_confidence_range(self):
        """Test validation fails for confidence outside valid range."""
        claim_data = {
            "id": "claim-001",
            "text": "Test claim",
            "position": [0, 10],
            "confidence": 150.0  # Invalid: > 100
        }
        result = validate_claim(claim_data)
        assert not result.is_valid
    
    def test_claim_invalid_domain(self):
        """Test validation fails for invalid domain."""
        claim_data = {
            "id": "claim-001",
            "text": "Test claim",
            "position": [0, 10],
            "domain": "invalid_domain"
        }
        result = validate_claim(claim_data)
        assert not result.is_valid


class TestEvidenceValidation:
    """Tests for evidence validation."""
    
    def test_valid_evidence(self):
        """Test validation of valid evidence data."""
        evidence_data = {
            "source": "Test Source",
            "source_type": "academic",
            "credibility_score": 90.0,
            "relevance": 85.0,
            "excerpt": "Test excerpt",
            "url": "https://example.com",
            "publication_date": "2024-01-15T10:30:00Z"
        }
        result = validate_evidence(evidence_data)
        assert result.is_valid
    
    def test_evidence_missing_required_field(self):
        """Test validation fails when required field is missing."""
        evidence_data = {
            "source": "Test Source",
            "source_type": "academic",
            "credibility_score": 90.0,
            # Missing 'relevance' and 'excerpt'
        }
        result = validate_evidence(evidence_data)
        assert not result.is_valid
    
    def test_evidence_invalid_source_type(self):
        """Test validation fails for invalid source type."""
        evidence_data = {
            "source": "Test Source",
            "source_type": "invalid_type",
            "credibility_score": 90.0,
            "relevance": 85.0,
            "excerpt": "Test excerpt"
        }
        result = validate_evidence(evidence_data)
        assert not result.is_valid


class TestManipulationSignalValidation:
    """Tests for manipulation signal validation."""
    
    def test_valid_manipulation_signal(self):
        """Test validation of valid manipulation signal data."""
        signal_data = {
            "type": "emotional_manipulation",
            "severity": "medium",
            "timestamp_start": "00:01:30",
            "timestamp_end": "00:02:15",
            "description": "Test description",
            "evidence": "Test evidence",
            "confidence": 75.0
        }
        result = validate_manipulation_signal(signal_data)
        assert result.is_valid
    
    def test_manipulation_signal_invalid_type(self):
        """Test validation fails for invalid manipulation type."""
        signal_data = {
            "type": "invalid_type",
            "severity": "medium",
            "description": "Test description",
            "evidence": "Test evidence",
            "confidence": 75.0
        }
        result = validate_manipulation_signal(signal_data)
        assert not result.is_valid
    
    def test_manipulation_signal_invalid_confidence(self):
        """Test validation fails for invalid confidence value."""
        signal_data = {
            "type": "emotional_manipulation",
            "severity": "medium",
            "description": "Test description",
            "evidence": "Test evidence",
            "confidence": -10.0  # Invalid: < 0
        }
        result = validate_manipulation_signal(signal_data)
        assert not result.is_valid


class TestConfigurationValidation:
    """Tests for configuration validation."""
    
    def test_valid_configuration(self):
        """Test validation of valid configuration data."""
        config_data = {
            "confidence_threshold": 70.0,
            "risk_level_mappings": {
                "critical": [0, 30],
                "high": [30, 50],
                "medium": [50, 70],
                "low": [70, 100]
            },
            "trusted_sources": {
                "physics": ["Nature", "Science"]
            },
            "custom_domains": ["quantum_physics"],
            "cache_enabled": True,
            "cache_ttl_seconds": 86400,
            "max_concurrent_verifications": 5,
            "timeout_seconds": 60
        }
        result = validate_configuration(config_data)
        assert result.is_valid
    
    def test_configuration_invalid_threshold(self):
        """Test validation fails for invalid confidence threshold."""
        config_data = {
            "confidence_threshold": 150.0  # Invalid: > 100
        }
        result = validate_configuration(config_data)
        assert not result.is_valid
    
    def test_configuration_invalid_max_concurrent(self):
        """Test validation fails for invalid max concurrent value."""
        config_data = {
            "max_concurrent_verifications": 0  # Invalid: < 1
        }
        result = validate_configuration(config_data)
        assert not result.is_valid


class TestScientificAuditInputValidation:
    """Tests for Scientific Audit Agent input validation."""
    
    def test_valid_input(self, valid_scientific_audit_input):
        """Test validation of valid input data."""
        result = validate_scientific_audit_input(valid_scientific_audit_input)
        assert result.is_valid
    
    def test_input_missing_content(self):
        """Test validation fails when content is missing."""
        input_data = {
            "domain_hint": "physics"
            # Missing 'content' field
        }
        result = validate_scientific_audit_input(input_data)
        assert not result.is_valid
    
    def test_input_with_minimal_fields(self):
        """Test validation succeeds with only required fields."""
        input_data = {
            "content": "Test content"
        }
        result = validate_scientific_audit_input(input_data)
        assert result.is_valid


class TestAntiFakeVideoInputValidation:
    """Tests for Anti-Fake Video Agent input validation."""
    
    def test_valid_input(self, valid_antifake_video_input):
        """Test validation of valid input data."""
        result = validate_antifake_video_input(valid_antifake_video_input)
        assert result.is_valid
    
    def test_input_missing_transcript(self):
        """Test validation fails when transcript is missing."""
        input_data = {
            "timestamps": ["00:00:00"]
            # Missing 'transcript' field
        }
        result = validate_antifake_video_input(input_data)
        assert not result.is_valid
    
    def test_input_with_minimal_fields(self):
        """Test validation succeeds with only required fields."""
        input_data = {
            "transcript": "Test transcript"
        }
        result = validate_antifake_video_input(input_data)
        assert result.is_valid


class TestFactCheckerResponseValidation:
    """Tests for Fact Checker Command response validation."""
    
    def test_valid_response(self, valid_fact_checker_response):
        """Test validation of valid response data."""
        result = validate_fact_checker_response(valid_fact_checker_response)
        assert result.is_valid
    
    def test_response_invalid_status(self):
        """Test validation fails for invalid status."""
        response_data = {
            "status": "invalid_status",
            "mode": "text",
            "agent": "scientific_audit",
            "report": {},
            "summary": "Test",
            "processing_time_ms": 1000,
            "cached": False
        }
        result = validate_fact_checker_response(response_data)
        assert not result.is_valid
    
    def test_response_missing_required_field(self):
        """Test validation fails when required field is missing."""
        response_data = {
            "status": "success",
            "mode": "text",
            # Missing other required fields
        }
        result = validate_fact_checker_response(response_data)
        assert not result.is_valid


class TestValidationErrors:
    """Tests for detailed validation error reporting."""
    
    def test_get_validation_errors(self):
        """Test getting detailed validation errors."""
        from src.fact_checker.schemas import CLAIM_SCHEMA
        
        invalid_data = {
            "id": "test",
            "text": "test",
            "position": [0],  # Invalid: should have 2 items
            "confidence": 150  # Invalid: > 100
        }
        
        errors = get_validation_errors(invalid_data, CLAIM_SCHEMA)
        assert len(errors) > 0
        assert all(isinstance(e, tuple) and len(e) == 2 for e in errors)
