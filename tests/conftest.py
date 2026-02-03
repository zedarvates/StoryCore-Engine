"""
Pytest configuration and shared fixtures for the test suite.
"""

import pytest
from datetime import datetime
from typing import Dict, Any

from src.fact_checker.models import (
    Claim, Evidence, VerificationResult, ManipulationSignal,
    Report, Configuration
)


@pytest.fixture
def sample_claim():
    """Fixture providing a sample claim for testing."""
    return Claim(
        id="claim-001",
        text="Water boils at 100 degrees Celsius at sea level.",
        position=(0, 50),
        domain="physics",
        confidence=95.0,
        risk_level="low"
    )


@pytest.fixture
def sample_evidence():
    """Fixture providing sample evidence for testing."""
    return Evidence(
        source="Physics Textbook",
        source_type="academic",
        credibility_score=95.0,
        relevance=98.0,
        excerpt="Water boils at 100°C (212°F) at standard atmospheric pressure.",
        url="https://example.com/physics",
        publication_date=datetime(2020, 1, 1)
    )


@pytest.fixture
def sample_verification_result(sample_claim, sample_evidence):
    """Fixture providing a sample verification result."""
    return VerificationResult(
        claim=sample_claim,
        confidence=95.0,
        risk_level="low",
        supporting_evidence=[sample_evidence],
        contradicting_evidence=[],
        reasoning="The claim is well-supported by scientific literature.",
        recommendation="No changes needed."
    )


@pytest.fixture
def sample_manipulation_signal():
    """Fixture providing a sample manipulation signal."""
    return ManipulationSignal(
        type="emotional_manipulation",
        severity="medium",
        timestamp_start="00:01:30",
        timestamp_end="00:02:15",
        description="Use of fear-based language to influence opinion.",
        evidence="Phrases like 'catastrophic consequences' without supporting data.",
        confidence=75.0
    )


@pytest.fixture
def sample_report(sample_verification_result, sample_manipulation_signal):
    """Fixture providing a sample report."""
    return Report(
        metadata={
            "timestamp": "2024-01-15T10:30:00Z",
            "version": "1.0",
            "input_hash": "abc123",
            "processing_time_ms": 1500
        },
        claims=[sample_verification_result],
        manipulation_signals=[sample_manipulation_signal],
        summary_statistics={
            "total_claims": 1,
            "high_risk_count": 0,
            "average_confidence": 95.0,
            "domains_analyzed": ["physics"]
        },
        human_summary="Analysis complete. 1 claim verified with high confidence.",
        recommendations=["Continue with current content."],
        disclaimer="This is an automated verification. Human review recommended."
    )


@pytest.fixture
def sample_configuration():
    """Fixture providing a sample configuration."""
    return Configuration(
        confidence_threshold=70.0,
        risk_level_mappings={
            "critical": (0, 30),
            "high": (30, 50),
            "medium": (50, 70),
            "low": (70, 100)
        },
        trusted_sources={
            "physics": ["Nature", "Physical Review"],
            "biology": ["Cell", "Nature Biology"]
        },
        custom_domains=["quantum_physics"],
        cache_enabled=True,
        cache_ttl_seconds=86400,
        max_concurrent_verifications=5,
        timeout_seconds=60
    )


@pytest.fixture
def valid_scientific_audit_input():
    """Fixture providing valid Scientific Audit Agent input."""
    return {
        "content": "The Earth orbits the Sun once every 365.25 days.",
        "domain_hint": "physics",
        "confidence_threshold": 70.0,
        "trusted_sources": ["NASA", "ESA"]
    }


@pytest.fixture
def valid_antifake_video_input():
    """Fixture providing valid Anti-Fake Video Agent input."""
    return {
        "transcript": "This is a sample video transcript discussing climate change.",
        "timestamps": ["00:00:00", "00:01:30", "00:03:00"],
        "metadata": {
            "source": "Documentary Film",
            "duration_seconds": 180
        }
    }


@pytest.fixture
def valid_fact_checker_response():
    """Fixture providing valid Fact Checker Command response."""
    return {
        "status": "success",
        "mode": "text",
        "agent": "scientific_audit",
        "report": {
            "metadata": {
                "timestamp": "2024-01-15T10:30:00Z",
                "version": "1.0",
                "input_hash": "abc123",
                "processing_time_ms": 1500
            },
            "claims": [],
            "manipulation_signals": [],
            "summary_statistics": {
                "total_claims": 0,
                "high_risk_count": 0,
                "average_confidence": 0,
                "domains_analyzed": []
            },
            "human_summary": "No claims found.",
            "recommendations": [],
            "disclaimer": "Automated verification."
        },
        "summary": "Analysis complete.",
        "processing_time_ms": 1500,
        "cached": False
    }
