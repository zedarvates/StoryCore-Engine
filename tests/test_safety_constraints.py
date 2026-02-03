"""
Tests for safety constraints module.

This module tests the safety and ethical constraints implementation,
including content filtering and uncertainty handling.
"""

import pytest
from src.fact_checker.models import (
    Claim, Evidence, VerificationResult, ManipulationSignal, Report
)
from src.fact_checker.safety_constraints import (
    apply_safety_constraints,
    apply_uncertainty_handling,
    check_content_safety,
    check_uncertainty_compliance,
    add_uncertainty_language,
    get_safety_report
)


def test_intention_attribution_filtering():
    """Test that intention attribution is filtered out."""
    # Create a report with intention attribution
    claim = Claim(
        id="test_1",
        text="The sky is blue",
        position=(0, 15),
        domain="physics"
    )
    
    result = VerificationResult(
        claim=claim,
        confidence=85.0,
        risk_level="low",
        supporting_evidence=[],
        contradicting_evidence=[],
        reasoning="The author intends to mislead readers about the color of the sky.",
        recommendation="Verify the claim"
    )
    
    report = Report(
        metadata={"timestamp": "2024-01-01T00:00:00"},
        claims=[result],
        manipulation_signals=[],
        summary_statistics={"total_claims": 1, "high_risk_count": 0, "average_confidence": 85.0},
        human_summary="The author deliberately tries to deceive the audience.",
        recommendations=["Review content"],
        disclaimer="Standard disclaimer"
    )
    
    # Apply safety constraints
    filtered_report = apply_safety_constraints(report)
    
    # Check that intention attribution is removed
    assert "intends to" not in filtered_report.claims[0].reasoning.lower()
    assert "deliberately" not in filtered_report.human_summary.lower()


def test_political_judgment_filtering():
    """Test that political judgments are filtered out."""
    text = "This is left-wing propaganda designed to push a partisan agenda."
    is_safe, violations = check_content_safety(text)
    
    assert not is_safe
    assert "political_judgment" in violations


def test_medical_advice_filtering():
    """Test that medical advice is filtered out."""
    text = "You should take this medication to cure your disease."
    is_safe, violations = check_content_safety(text)
    
    assert not is_safe
    assert "medical_advice" in violations


def test_fabricated_source_filtering():
    """Test that fabricated sources are filtered out."""
    text = "According to a recent study, this is true."
    is_safe, violations = check_content_safety(text)
    
    assert not is_safe
    assert "fabricated_source" in violations


def test_safe_content_passes():
    """Test that safe content passes all checks."""
    text = "The evidence from NASA indicates that the Earth orbits the Sun."
    is_safe, violations = check_content_safety(text)
    
    assert is_safe
    assert len(violations) == 0


def test_add_uncertainty_language_low_confidence():
    """Test that uncertainty language is added for low confidence."""
    text = "This claim is verified."
    result = add_uncertainty_language(text, confidence=45.0, threshold=70.0)
    
    assert "uncertain" in result.lower() or "confidence" in result.lower()
    assert "45.0" in result


def test_add_uncertainty_language_high_confidence():
    """Test that uncertainty language is NOT added for high confidence."""
    text = "This claim is verified."
    result = add_uncertainty_language(text, confidence=85.0, threshold=70.0)
    
    assert result == text


def test_apply_uncertainty_handling():
    """Test that uncertainty handling is applied to low-confidence claims."""
    claim = Claim(
        id="test_1",
        text="The sky is blue",
        position=(0, 15),
        domain="physics"
    )
    
    # Low confidence result
    result = VerificationResult(
        claim=claim,
        confidence=45.0,
        risk_level="high",
        supporting_evidence=[],
        contradicting_evidence=[],
        reasoning="Limited evidence available.",
        recommendation="Seek additional sources"
    )
    
    report = Report(
        metadata={"timestamp": "2024-01-01T00:00:00"},
        claims=[result],
        manipulation_signals=[],
        summary_statistics={"total_claims": 1, "high_risk_count": 1, "average_confidence": 45.0},
        human_summary="Analysis complete.",
        recommendations=["Review content"],
        disclaimer="Standard disclaimer"
    )
    
    # Apply uncertainty handling
    processed_report = apply_uncertainty_handling(report, confidence_threshold=70.0)
    
    # Check that uncertainty language was added
    assert "uncertain" in processed_report.claims[0].reasoning.lower() or "confidence" in processed_report.claims[0].reasoning.lower()
    assert "45.0" in processed_report.claims[0].reasoning


def test_check_uncertainty_compliance():
    """Test uncertainty compliance checking."""
    claim = Claim(
        id="test_1",
        text="The sky is blue",
        position=(0, 15),
        domain="physics"
    )
    
    # Low confidence result WITHOUT uncertainty language
    result = VerificationResult(
        claim=claim,
        confidence=45.0,
        risk_level="high",
        supporting_evidence=[],
        contradicting_evidence=[],
        reasoning="This is the conclusion.",
        recommendation="Accept the claim"
    )
    
    report = Report(
        metadata={"timestamp": "2024-01-01T00:00:00"},
        claims=[result],
        manipulation_signals=[],
        summary_statistics={"total_claims": 1, "high_risk_count": 1, "average_confidence": 45.0},
        human_summary="Analysis complete.",
        recommendations=["Review content"],
        disclaimer="Standard disclaimer"
    )
    
    # Check compliance
    compliance = check_uncertainty_compliance(report, threshold=70.0)
    
    assert not compliance["is_compliant"]
    assert 0 in compliance["low_confidence_claims"]
    assert 0 in compliance["missing_uncertainty_language"]


def test_get_safety_report():
    """Test safety report generation."""
    claim = Claim(
        id="test_1",
        text="The sky is blue",
        position=(0, 15),
        domain="physics"
    )
    
    result = VerificationResult(
        claim=claim,
        confidence=85.0,
        risk_level="low",
        supporting_evidence=[],
        contradicting_evidence=[],
        reasoning="The author intends to mislead readers.",
        recommendation="Verify the claim"
    )
    
    report = Report(
        metadata={"timestamp": "2024-01-01T00:00:00"},
        claims=[result],
        manipulation_signals=[],
        summary_statistics={"total_claims": 1, "high_risk_count": 0, "average_confidence": 85.0},
        human_summary="Analysis complete.",
        recommendations=["Review content"],
        disclaimer="Standard disclaimer"
    )
    
    # Get safety report
    safety_report = get_safety_report(report)
    
    assert not safety_report["is_compliant"]
    assert safety_report["total_violations"] > 0
    assert safety_report["disclaimer_present"]


def test_sensitive_topic_detection():
    """Test that sensitive topics are detected and disclaimers added."""
    claim = Claim(
        id="test_1",
        text="This medication treats the disease",
        position=(0, 35),
        domain="biology"
    )
    
    result = VerificationResult(
        claim=claim,
        confidence=85.0,
        risk_level="low",
        supporting_evidence=[],
        contradicting_evidence=[],
        reasoning="Medical information found.",
        recommendation="Consult healthcare professional"
    )
    
    report = Report(
        metadata={"timestamp": "2024-01-01T00:00:00"},
        claims=[result],
        manipulation_signals=[],
        summary_statistics={"total_claims": 1, "high_risk_count": 0, "average_confidence": 85.0},
        human_summary="Medical claims analyzed.",
        recommendations=["Review content"],
        disclaimer="Standard disclaimer"
    )
    
    # Apply safety constraints
    filtered_report = apply_safety_constraints(report)
    
    # Check that medical disclaimer was added
    assert "medical" in filtered_report.disclaimer.lower()
    assert "healthcare professional" in filtered_report.disclaimer.lower()


def test_manipulation_signal_filtering():
    """Test that manipulation signals are filtered for safety."""
    signal = ManipulationSignal(
        type="emotional_manipulation",
        severity="high",
        description="The speaker deliberately intends to manipulate emotions.",
        evidence="Emotional language detected",
        confidence=75.0
    )
    
    claim = Claim(id="test_1", text="Test", position=(0, 4))
    result = VerificationResult(
        claim=claim,
        confidence=85.0,
        risk_level="low",
        supporting_evidence=[],
        contradicting_evidence=[],
        reasoning="Test",
        recommendation="Test"
    )
    
    report = Report(
        metadata={"timestamp": "2024-01-01T00:00:00"},
        claims=[result],
        manipulation_signals=[signal],
        summary_statistics={"total_claims": 1, "high_risk_count": 0, "average_confidence": 85.0},
        human_summary="Analysis complete.",
        recommendations=["Review content"],
        disclaimer="Standard disclaimer"
    )
    
    # Apply safety constraints
    filtered_report = apply_safety_constraints(report)
    
    # Check that intention attribution is removed from signal
    assert "deliberately intends" not in filtered_report.manipulation_signals[0].description.lower()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
