"""
Unit tests for data models.

Tests the core data structures including Claim, Evidence, VerificationResult,
ManipulationSignal, Report, and Configuration.
"""

import pytest
from datetime import datetime

from src.fact_checker.models import (
    Claim, Evidence, VerificationResult, ManipulationSignal,
    Report, Configuration, DomainType, RiskLevel, SourceType,
    ManipulationType, SeverityLevel
)


class TestClaim:
    """Tests for the Claim model."""
    
    def test_claim_creation(self, sample_claim):
        """Test basic claim creation."""
        assert sample_claim.id == "claim-001"
        assert sample_claim.text == "Water boils at 100 degrees Celsius at sea level."
        assert sample_claim.position == (0, 50)
        assert sample_claim.domain == "physics"
        assert sample_claim.confidence == 95.0
        assert sample_claim.risk_level == "low"
    
    def test_claim_with_minimal_fields(self):
        """Test claim creation with only required fields."""
        claim = Claim(
            id="claim-002",
            text="Test claim",
            position=(0, 10)
        )
        assert claim.id == "claim-002"
        assert claim.domain is None
        assert claim.confidence is None
        assert claim.evidence == []
    
    def test_claim_with_evidence(self, sample_claim, sample_evidence):
        """Test claim with evidence attached."""
        sample_claim.evidence.append(sample_evidence)
        assert len(sample_claim.evidence) == 1
        assert sample_claim.evidence[0].source == "Physics Textbook"


class TestEvidence:
    """Tests for the Evidence model."""
    
    def test_evidence_creation(self, sample_evidence):
        """Test basic evidence creation."""
        assert sample_evidence.source == "Physics Textbook"
        assert sample_evidence.source_type == "academic"
        assert sample_evidence.credibility_score == 95.0
        assert sample_evidence.relevance == 98.0
        assert "100°C" in sample_evidence.excerpt
    
    def test_evidence_without_optional_fields(self):
        """Test evidence creation without optional fields."""
        evidence = Evidence(
            source="Test Source",
            source_type="news",
            credibility_score=80.0,
            relevance=75.0,
            excerpt="Test excerpt"
        )
        assert evidence.url is None
        assert evidence.publication_date is None
    
    def test_evidence_score_ranges(self):
        """Test that evidence scores are within valid ranges."""
        evidence = Evidence(
            source="Test",
            source_type="academic",
            credibility_score=100.0,
            relevance=0.0,
            excerpt="Test"
        )
        assert 0 <= evidence.credibility_score <= 100
        assert 0 <= evidence.relevance <= 100


class TestVerificationResult:
    """Tests for the VerificationResult model."""
    
    def test_verification_result_creation(self, sample_verification_result):
        """Test basic verification result creation."""
        assert sample_verification_result.confidence == 95.0
        assert sample_verification_result.risk_level == "low"
        assert len(sample_verification_result.supporting_evidence) == 1
        assert len(sample_verification_result.contradicting_evidence) == 0
    
    def test_verification_result_with_contradicting_evidence(
        self, sample_claim, sample_evidence
    ):
        """Test verification result with contradicting evidence."""
        result = VerificationResult(
            claim=sample_claim,
            confidence=30.0,
            risk_level="high",
            supporting_evidence=[],
            contradicting_evidence=[sample_evidence],
            reasoning="Evidence contradicts the claim.",
            recommendation="Review and revise claim."
        )
        assert result.confidence == 30.0
        assert len(result.contradicting_evidence) == 1


class TestManipulationSignal:
    """Tests for the ManipulationSignal model."""
    
    def test_manipulation_signal_creation(self, sample_manipulation_signal):
        """Test basic manipulation signal creation."""
        assert sample_manipulation_signal.type == "emotional_manipulation"
        assert sample_manipulation_signal.severity == "medium"
        assert sample_manipulation_signal.timestamp_start == "00:01:30"
        assert sample_manipulation_signal.confidence == 75.0
    
    def test_manipulation_signal_without_timestamps(self):
        """Test manipulation signal without timestamps."""
        signal = ManipulationSignal(
            type="logical_inconsistency",
            severity="high",
            description="Contradictory statements",
            evidence="Statement A contradicts Statement B",
            confidence=85.0
        )
        assert signal.timestamp_start is None
        assert signal.timestamp_end is None


class TestReport:
    """Tests for the Report model."""
    
    def test_report_creation(self, sample_report):
        """Test basic report creation."""
        assert sample_report.metadata["version"] == "1.0"
        assert len(sample_report.claims) == 1
        assert len(sample_report.manipulation_signals) == 1
        assert sample_report.summary_statistics["total_claims"] == 1
    
    def test_report_metadata_structure(self, sample_report):
        """Test report metadata contains required fields."""
        metadata = sample_report.metadata
        assert "timestamp" in metadata
        assert "version" in metadata
        assert "input_hash" in metadata
        assert "processing_time_ms" in metadata
    
    def test_report_summary_statistics(self, sample_report):
        """Test report summary statistics."""
        stats = sample_report.summary_statistics
        assert stats["total_claims"] == 1
        assert stats["high_risk_count"] == 0
        assert stats["average_confidence"] == 95.0
        assert "physics" in stats["domains_analyzed"]


class TestConfiguration:
    """Tests for the Configuration model."""
    
    def test_configuration_defaults(self):
        """Test configuration with default values."""
        config = Configuration()
        assert config.confidence_threshold == 70.0
        assert config.cache_enabled is True
        assert config.cache_ttl_seconds == 86400
        assert config.max_concurrent_verifications == 5
    
    def test_configuration_custom_values(self, sample_configuration):
        """Test configuration with custom values."""
        assert sample_configuration.confidence_threshold == 70.0
        assert "quantum_physics" in sample_configuration.custom_domains
        assert "physics" in sample_configuration.trusted_sources
    
    def test_configuration_risk_level_mappings(self, sample_configuration):
        """Test risk level mappings in configuration."""
        mappings = sample_configuration.risk_level_mappings
        assert mappings["critical"] == (0, 30)
        assert mappings["high"] == (30, 50)
        assert mappings["medium"] == (50, 70)
        assert mappings["low"] == (70, 100)


class TestEnums:
    """Tests for enum types."""
    
    def test_domain_type_enum(self):
        """Test DomainType enum values."""
        assert DomainType.PHYSICS.value == "physics"
        assert DomainType.BIOLOGY.value == "biology"
        assert DomainType.HISTORY.value == "history"
        assert DomainType.STATISTICS.value == "statistics"
        assert DomainType.GENERAL.value == "general"
    
    def test_risk_level_enum(self):
        """Test RiskLevel enum values."""
        assert RiskLevel.LOW.value == "low"
        assert RiskLevel.MEDIUM.value == "medium"
        assert RiskLevel.HIGH.value == "high"
        assert RiskLevel.CRITICAL.value == "critical"
    
    def test_source_type_enum(self):
        """Test SourceType enum values."""
        assert SourceType.ACADEMIC.value == "academic"
        assert SourceType.NEWS.value == "news"
        assert SourceType.GOVERNMENT.value == "government"
        assert SourceType.ENCYCLOPEDIA.value == "encyclopedia"
    
    def test_manipulation_type_enum(self):
        """Test ManipulationType enum values."""
        assert ManipulationType.LOGICAL_INCONSISTENCY.value == "logical_inconsistency"
        assert ManipulationType.EMOTIONAL_MANIPULATION.value == "emotional_manipulation"
        assert ManipulationType.NARRATIVE_BIAS.value == "narrative_bias"
    
    def test_severity_level_enum(self):
        """Test SeverityLevel enum values."""
        assert SeverityLevel.LOW.value == "low"
        assert SeverityLevel.MEDIUM.value == "medium"
        assert SeverityLevel.HIGH.value == "high"
