"""
Unit tests for input validation module.

Tests validation functions for all API inputs with various edge cases.
"""

import pytest
from src.fact_checker.validation import (
    ValidationError,
    ValidationResult,
    validate_claim,
    validate_evidence,
    validate_scientific_audit_input,
    validate_antifake_video_input,
    validate_fact_checker_command,
    validate_configuration
)


class TestClaimValidation:
    """Tests for claim validation."""
    
    def test_valid_claim(self):
        """Test validation passes for valid claim."""
        claim_data = {
            "id": "claim-123",
            "text": "Water boils at 100 degrees Celsius.",
            "position": [0, 35]
        }
        result = validate_claim(claim_data)
        assert result.is_valid
        assert len(result.errors) == 0
    
    def test_missing_required_field(self):
        """Test validation fails when required field is missing."""
        claim_data = {
            "id": "claim-123",
            "position": [0, 35]
            # Missing 'text' field
        }
        result = validate_claim(claim_data)
        assert not result.is_valid
        assert len(result.errors) > 0
        assert any(e.field == "text" for e in result.errors)
    
    def test_invalid_id_type(self):
        """Test validation fails for invalid id type."""
        claim_data = {
            "id": 123,  # Should be string
            "text": "Water boils at 100 degrees.",
            "position": [0, 35]
        }
        result = validate_claim(claim_data)
        assert not result.is_valid
        assert any(e.field == "id" for e in result.errors)
    
    def test_empty_text(self):
        """Test validation fails for empty text."""
        claim_data = {
            "id": "claim-123",
            "text": "",
            "position": [0, 0]
        }
        result = validate_claim(claim_data)
        assert not result.is_valid
        assert any(e.field == "text" for e in result.errors)
    
    def test_invalid_position_format(self):
        """Test validation fails for invalid position format."""
        claim_data = {
            "id": "claim-123",
            "text": "Water boils at 100 degrees.",
            "position": [0]  # Should have 2 elements
        }
        result = validate_claim(claim_data)
        assert not result.is_valid
        assert any(e.field == "position" for e in result.errors)
    
    def test_negative_position(self):
        """Test validation fails for negative position values."""
        claim_data = {
            "id": "claim-123",
            "text": "Water boils at 100 degrees.",
            "position": [-1, 35]
        }
        result = validate_claim(claim_data)
        assert not result.is_valid
        assert any(e.field == "position" for e in result.errors)
    
    def test_invalid_domain(self):
        """Test validation fails for invalid domain."""
        claim_data = {
            "id": "claim-123",
            "text": "Water boils at 100 degrees.",
            "position": [0, 35],
            "domain": "invalid_domain"
        }
        result = validate_claim(claim_data)
        assert not result.is_valid
        assert any(e.field == "domain" for e in result.errors)
    
    def test_valid_domain(self):
        """Test validation passes for valid domain."""
        claim_data = {
            "id": "claim-123",
            "text": "Water boils at 100 degrees.",
            "position": [0, 35],
            "domain": "physics"
        }
        result = validate_claim(claim_data)
        assert result.is_valid
    
    def test_confidence_out_of_range(self):
        """Test validation fails for confidence out of range."""
        claim_data = {
            "id": "claim-123",
            "text": "Water boils at 100 degrees.",
            "position": [0, 35],
            "confidence": 150  # Should be 0-100
        }
        result = validate_claim(claim_data)
        assert not result.is_valid
        assert any(e.field == "confidence" for e in result.errors)
    
    def test_invalid_risk_level(self):
        """Test validation fails for invalid risk level."""
        claim_data = {
            "id": "claim-123",
            "text": "Water boils at 100 degrees.",
            "position": [0, 35],
            "risk_level": "extreme"  # Should be low/medium/high/critical
        }
        result = validate_claim(claim_data)
        assert not result.is_valid
        assert any(e.field == "risk_level" for e in result.errors)


class TestEvidenceValidation:
    """Tests for evidence validation."""
    
    def test_valid_evidence(self):
        """Test validation passes for valid evidence."""
        evidence_data = {
            "source": "Physics Textbook",
            "source_type": "academic",
            "credibility_score": 95.0,
            "relevance": 90.0,
            "excerpt": "Water boils at 100°C at sea level."
        }
        result = validate_evidence(evidence_data)
        assert result.is_valid
        assert len(result.errors) == 0
    
    def test_missing_required_fields(self):
        """Test validation fails when required fields are missing."""
        evidence_data = {
            "source": "Physics Textbook",
            "source_type": "academic"
            # Missing credibility_score, relevance, excerpt
        }
        result = validate_evidence(evidence_data)
        assert not result.is_valid
        assert len(result.errors) >= 3
    
    def test_invalid_source_type(self):
        """Test validation fails for invalid source type."""
        evidence_data = {
            "source": "Random Blog",
            "source_type": "blog",  # Should be academic/news/government/encyclopedia
            "credibility_score": 50.0,
            "relevance": 60.0,
            "excerpt": "Some text"
        }
        result = validate_evidence(evidence_data)
        assert not result.is_valid
        assert any(e.field == "source_type" for e in result.errors)
    
    def test_credibility_score_out_of_range(self):
        """Test validation fails for credibility score out of range."""
        evidence_data = {
            "source": "Physics Textbook",
            "source_type": "academic",
            "credibility_score": 150.0,  # Should be 0-100
            "relevance": 90.0,
            "excerpt": "Some text"
        }
        result = validate_evidence(evidence_data)
        assert not result.is_valid
        assert any(e.field == "credibility_score" for e in result.errors)
    
    def test_relevance_out_of_range(self):
        """Test validation fails for relevance out of range."""
        evidence_data = {
            "source": "Physics Textbook",
            "source_type": "academic",
            "credibility_score": 95.0,
            "relevance": -10.0,  # Should be 0-100
            "excerpt": "Some text"
        }
        result = validate_evidence(evidence_data)
        assert not result.is_valid
        assert any(e.field == "relevance" for e in result.errors)
    
    def test_invalid_url_format(self):
        """Test validation fails for invalid URL format."""
        evidence_data = {
            "source": "Physics Textbook",
            "source_type": "academic",
            "credibility_score": 95.0,
            "relevance": 90.0,
            "excerpt": "Some text",
            "url": "not-a-valid-url"
        }
        result = validate_evidence(evidence_data)
        assert not result.is_valid
        assert any(e.field == "url" for e in result.errors)
    
    def test_valid_url(self):
        """Test validation passes for valid URL."""
        evidence_data = {
            "source": "Physics Textbook",
            "source_type": "academic",
            "credibility_score": 95.0,
            "relevance": 90.0,
            "excerpt": "Some text",
            "url": "https://example.com/article"
        }
        result = validate_evidence(evidence_data)
        assert result.is_valid


class TestScientificAuditInputValidation:
    """Tests for Scientific Audit Agent input validation."""
    
    def test_valid_input(self):
        """Test validation passes for valid input."""
        input_data = {
            "content": "Water boils at 100 degrees Celsius at sea level."
        }
        result = validate_scientific_audit_input(input_data)
        assert result.is_valid
    
    def test_missing_content(self):
        """Test validation fails when content is missing."""
        input_data = {}
        result = validate_scientific_audit_input(input_data)
        assert not result.is_valid
        assert any(e.field == "content" for e in result.errors)
    
    def test_empty_content(self):
        """Test validation fails for empty content."""
        input_data = {"content": ""}
        result = validate_scientific_audit_input(input_data)
        assert not result.is_valid
        assert any(e.field == "content" for e in result.errors)
    
    def test_content_too_long(self):
        """Test validation fails for content exceeding max length."""
        input_data = {"content": "x" * 50001}  # Max is 50000
        result = validate_scientific_audit_input(input_data)
        assert not result.is_valid
        assert any(e.field == "content" for e in result.errors)
    
    def test_invalid_domain_hint(self):
        """Test validation fails for invalid domain hint."""
        input_data = {
            "content": "Some text",
            "domain_hint": "invalid_domain"
        }
        result = validate_scientific_audit_input(input_data)
        assert not result.is_valid
        assert any(e.field == "domain_hint" for e in result.errors)
    
    def test_confidence_threshold_out_of_range(self):
        """Test validation fails for confidence threshold out of range."""
        input_data = {
            "content": "Some text",
            "confidence_threshold": 150
        }
        result = validate_scientific_audit_input(input_data)
        assert not result.is_valid
        assert any(e.field == "confidence_threshold" for e in result.errors)


class TestAntiFakeVideoInputValidation:
    """Tests for Anti-Fake Video Agent input validation."""
    
    def test_valid_input(self):
        """Test validation passes for valid input."""
        input_data = {
            "transcript": "This is a video transcript with some content."
        }
        result = validate_antifake_video_input(input_data)
        assert result.is_valid
    
    def test_missing_transcript(self):
        """Test validation fails when transcript is missing."""
        input_data = {}
        result = validate_antifake_video_input(input_data)
        assert not result.is_valid
        assert any(e.field == "transcript" for e in result.errors)
    
    def test_empty_transcript(self):
        """Test validation fails for empty transcript."""
        input_data = {"transcript": ""}
        result = validate_antifake_video_input(input_data)
        assert not result.is_valid
        assert any(e.field == "transcript" for e in result.errors)
    
    def test_transcript_too_long(self):
        """Test validation fails for transcript exceeding max length."""
        input_data = {"transcript": "x" * 100001}  # Max is 100000
        result = validate_antifake_video_input(input_data)
        assert not result.is_valid
        assert any(e.field == "transcript" for e in result.errors)
    
    def test_invalid_timestamps_type(self):
        """Test validation fails for invalid timestamps type."""
        input_data = {
            "transcript": "Some transcript",
            "timestamps": "not-an-array"
        }
        result = validate_antifake_video_input(input_data)
        assert not result.is_valid
        assert any(e.field == "timestamps" for e in result.errors)
    
    def test_invalid_timestamp_element(self):
        """Test validation fails for invalid timestamp element."""
        input_data = {
            "transcript": "Some transcript",
            "timestamps": ["00:00:01", 123]  # Second element should be string
        }
        result = validate_antifake_video_input(input_data)
        assert not result.is_valid
        assert any("timestamps[1]" in e.field for e in result.errors)
    
    def test_negative_duration(self):
        """Test validation fails for negative duration."""
        input_data = {
            "transcript": "Some transcript",
            "metadata": {
                "duration_seconds": -10
            }
        }
        result = validate_antifake_video_input(input_data)
        assert not result.is_valid
        assert any("duration_seconds" in e.field for e in result.errors)


class TestFactCheckerCommandValidation:
    """Tests for Fact Checker Command validation."""
    
    def test_valid_command(self):
        """Test validation passes for valid command."""
        command_data = {
            "input": "Water boils at 100 degrees Celsius.",
            "mode": "text"
        }
        result = validate_fact_checker_command(command_data)
        assert result.is_valid
    
    def test_missing_input(self):
        """Test validation fails when input is missing."""
        command_data = {"mode": "text"}
        result = validate_fact_checker_command(command_data)
        assert not result.is_valid
        assert any(e.field == "input" for e in result.errors)
    
    def test_empty_input(self):
        """Test validation fails for empty input."""
        command_data = {"input": ""}
        result = validate_fact_checker_command(command_data)
        assert not result.is_valid
        assert any(e.field == "input" for e in result.errors)
    
    def test_invalid_mode(self):
        """Test validation fails for invalid mode."""
        command_data = {
            "input": "Some text",
            "mode": "invalid_mode"
        }
        result = validate_fact_checker_command(command_data)
        assert not result.is_valid
        assert any(e.field == "mode" for e in result.errors)
    
    def test_invalid_detail_level(self):
        """Test validation fails for invalid detail level."""
        command_data = {
            "input": "Some text",
            "detail_level": "invalid_level"
        }
        result = validate_fact_checker_command(command_data)
        assert not result.is_valid
        assert any(e.field == "detail_level" for e in result.errors)
    
    def test_invalid_output_format(self):
        """Test validation fails for invalid output format."""
        command_data = {
            "input": "Some text",
            "output_format": "xml"  # Should be json/markdown/pdf
        }
        result = validate_fact_checker_command(command_data)
        assert not result.is_valid
        assert any(e.field == "output_format" for e in result.errors)


class TestConfigurationValidation:
    """Tests for configuration validation."""
    
    def test_valid_configuration(self):
        """Test validation passes for valid configuration."""
        config_data = {
            "confidence_threshold": 70.0,
            "max_concurrent_verifications": 5,
            "timeout_seconds": 60
        }
        result = validate_configuration(config_data)
        assert result.is_valid
    
    def test_confidence_threshold_out_of_range(self):
        """Test validation fails for confidence threshold out of range."""
        config_data = {"confidence_threshold": 150.0}
        result = validate_configuration(config_data)
        assert not result.is_valid
        assert any(e.field == "confidence_threshold" for e in result.errors)
    
    def test_missing_risk_level_mapping(self):
        """Test validation fails for missing risk level mapping."""
        config_data = {
            "risk_level_mappings": {
                "critical": [0, 30],
                "high": [30, 50]
                # Missing medium and low
            }
        }
        result = validate_configuration(config_data)
        assert not result.is_valid
        assert any("risk_level_mappings" in e.field for e in result.errors)
    
    def test_max_concurrent_out_of_range(self):
        """Test validation fails for max_concurrent_verifications out of range."""
        config_data = {"max_concurrent_verifications": 150}  # Max is 100
        result = validate_configuration(config_data)
        assert not result.is_valid
        assert any(e.field == "max_concurrent_verifications" for e in result.errors)
    
    def test_timeout_out_of_range(self):
        """Test validation fails for timeout out of range."""
        config_data = {"timeout_seconds": 1000}  # Max is 600
        result = validate_configuration(config_data)
        assert not result.is_valid
        assert any(e.field == "timeout_seconds" for e in result.errors)


class TestValidationError:
    """Tests for ValidationError class."""
    
    def test_error_to_dict(self):
        """Test error converts to dictionary correctly."""
        error = ValidationError(
            field="test_field",
            issue="Test issue",
            expected="Expected value",
            received="Received value"
        )
        error_dict = error.to_dict()
        
        assert error_dict["field"] == "test_field"
        assert error_dict["issue"] == "Test issue"
        assert error_dict["expected"] == "Expected value"
        assert error_dict["received"] == "Received value"
    
    def test_error_message_format(self):
        """Test error message is formatted correctly."""
        error = ValidationError(
            field="test_field",
            issue="Test issue",
            expected="Expected value",
            received="Received value"
        )
        message = str(error)
        
        assert "test_field" in message
        assert "Test issue" in message
        assert "Expected value" in message
        assert "Received value" in message


class TestValidationResult:
    """Tests for ValidationResult class."""
    
    def test_initial_state(self):
        """Test initial state is valid with no errors."""
        result = ValidationResult()
        assert result.is_valid
        assert len(result.errors) == 0
    
    def test_add_error(self):
        """Test adding error changes state to invalid."""
        result = ValidationResult()
        error = ValidationError("field", "issue", "expected")
        result.add_error(error)
        
        assert not result.is_valid
        assert len(result.errors) == 1
        assert result.errors[0] == error
    
    def test_to_dict(self):
        """Test result converts to dictionary correctly."""
        result = ValidationResult()
        error = ValidationError("field", "issue", "expected")
        result.add_error(error)
        
        result_dict = result.to_dict()
        assert result_dict["is_valid"] is False
        assert len(result_dict["errors"]) == 1
