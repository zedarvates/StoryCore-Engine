"""
Demo: Safety Constraints and Uncertainty Handling

This example demonstrates the safety constraints and uncertainty handling
features of the fact-checking system.

Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7
"""

from src.fact_checker.models import (
    Claim, Evidence, VerificationResult, ManipulationSignal, Report
)
from src.fact_checker.safety_constraints import (
    apply_safety_constraints,
    apply_uncertainty_handling,
    check_content_safety,
    check_uncertainty_compliance,
    get_safety_report
)


def demo_intention_filtering():
    """Demonstrates filtering of intention attribution."""
    print("=" * 80)
    print("DEMO 1: Intention Attribution Filtering")
    print("=" * 80)
    
    # Create a claim with intention attribution
    claim = Claim(
        id="claim_1",
        text="Climate change is caused by human activity",
        position=(0, 45),
        domain="general"
    )
    
    result = VerificationResult(
        claim=claim,
        confidence=85.0,
        risk_level="low",
        supporting_evidence=[],
        contradicting_evidence=[],
        reasoning="The author deliberately intends to mislead readers about climate science.",
        recommendation="Verify with scientific sources"
    )
    
    report = Report(
        metadata={"timestamp": "2024-01-01T00:00:00"},
        claims=[result],
        manipulation_signals=[],
        summary_statistics={"total_claims": 1, "high_risk_count": 0, "average_confidence": 85.0},
        human_summary="The speaker wants to push a specific agenda.",
        recommendations=["Review content"],
        disclaimer="Standard disclaimer"
    )
    
    print("\nBEFORE filtering:")
    print(f"Reasoning: {result.reasoning}")
    print(f"Summary: {report.human_summary}")
    
    # Apply safety constraints
    filtered_report = apply_safety_constraints(report)
    
    print("\nAFTER filtering:")
    print(f"Reasoning: {filtered_report.claims[0].reasoning}")
    print(f"Summary: {filtered_report.human_summary}")
    print()


def demo_political_judgment_filtering():
    """Demonstrates filtering of political judgments."""
    print("=" * 80)
    print("DEMO 2: Political Judgment Filtering")
    print("=" * 80)
    
    text = "This article shows clear left-wing bias and partisan propaganda."
    
    print(f"\nOriginal text: {text}")
    
    is_safe, violations = check_content_safety(text)
    
    print(f"Is safe: {is_safe}")
    print(f"Violations: {violations}")
    print()


def demo_medical_advice_filtering():
    """Demonstrates filtering of medical advice."""
    print("=" * 80)
    print("DEMO 3: Medical Advice Filtering")
    print("=" * 80)
    
    text = "You should take aspirin to cure your headache."
    
    print(f"\nOriginal text: {text}")
    
    is_safe, violations = check_content_safety(text)
    
    print(f"Is safe: {is_safe}")
    print(f"Violations: {violations}")
    print()


def demo_uncertainty_handling():
    """Demonstrates uncertainty handling for low-confidence results."""
    print("=" * 80)
    print("DEMO 4: Uncertainty Handling")
    print("=" * 80)
    
    # Create low-confidence claim
    claim = Claim(
        id="claim_1",
        text="Ancient aliens built the pyramids",
        position=(0, 35),
        domain="history"
    )
    
    result = VerificationResult(
        claim=claim,
        confidence=25.0,  # Very low confidence
        risk_level="critical",
        supporting_evidence=[],
        contradicting_evidence=[],
        reasoning="No credible evidence supports this claim.",
        recommendation="Remove this claim from content"
    )
    
    report = Report(
        metadata={"timestamp": "2024-01-01T00:00:00"},
        claims=[result],
        manipulation_signals=[],
        summary_statistics={"total_claims": 1, "high_risk_count": 1, "average_confidence": 25.0},
        human_summary="Analysis of historical claims completed.",
        recommendations=["Review all claims"],
        disclaimer="Standard disclaimer"
    )
    
    print("\nBEFORE uncertainty handling:")
    print(f"Confidence: {result.confidence}%")
    print(f"Reasoning: {result.reasoning}")
    print(f"Recommendation: {result.recommendation}")
    
    # Apply uncertainty handling
    processed_report = apply_uncertainty_handling(report, confidence_threshold=70.0)
    
    print("\nAFTER uncertainty handling:")
    print(f"Confidence: {processed_report.claims[0].confidence}%")
    print(f"Reasoning: {processed_report.claims[0].reasoning}")
    print(f"Recommendation: {processed_report.claims[0].recommendation}")
    print()


def demo_sensitive_topic_disclaimers():
    """Demonstrates enhanced disclaimers for sensitive topics."""
    print("=" * 80)
    print("DEMO 5: Sensitive Topic Disclaimers")
    print("=" * 80)
    
    # Create medical claim
    claim = Claim(
        id="claim_1",
        text="Vitamin C prevents the common cold",
        position=(0, 35),
        domain="biology"
    )
    
    result = VerificationResult(
        claim=claim,
        confidence=65.0,
        risk_level="medium",
        supporting_evidence=[],
        contradicting_evidence=[],
        reasoning="Mixed evidence on vitamin C effectiveness.",
        recommendation="Consult healthcare professional"
    )
    
    report = Report(
        metadata={"timestamp": "2024-01-01T00:00:00"},
        claims=[result],
        manipulation_signals=[],
        summary_statistics={"total_claims": 1, "high_risk_count": 0, "average_confidence": 65.0},
        human_summary="Medical claims about vitamin C and disease prevention analyzed.",
        recommendations=["Verify with medical sources"],
        disclaimer="Standard disclaimer"
    )
    
    print("\nBEFORE safety constraints:")
    print(f"Disclaimer length: {len(report.disclaimer)} characters")
    print(f"Disclaimer: {report.disclaimer[:100]}...")
    
    # Apply safety constraints
    filtered_report = apply_safety_constraints(report)
    
    print("\nAFTER safety constraints:")
    print(f"Disclaimer length: {len(filtered_report.disclaimer)} characters")
    print(f"Enhanced disclaimer:\n{filtered_report.disclaimer}")
    print()


def demo_safety_compliance_report():
    """Demonstrates safety compliance reporting."""
    print("=" * 80)
    print("DEMO 6: Safety Compliance Report")
    print("=" * 80)
    
    # Create report with multiple violations
    claim = Claim(
        id="claim_1",
        text="The government policy is wrong",
        position=(0, 30),
        domain="general"
    )
    
    result = VerificationResult(
        claim=claim,
        confidence=85.0,
        risk_level="low",
        supporting_evidence=[],
        contradicting_evidence=[],
        reasoning="The author deliberately tries to push left-wing propaganda.",
        recommendation="You should avoid this biased content"
    )
    
    report = Report(
        metadata={"timestamp": "2024-01-01T00:00:00"},
        claims=[result],
        manipulation_signals=[],
        summary_statistics={"total_claims": 1, "high_risk_count": 0, "average_confidence": 85.0},
        human_summary="According to a recent study, this is politically motivated.",
        recommendations=["Review content"],
        disclaimer="Standard disclaimer"
    )
    
    # Get safety report
    safety_report = get_safety_report(report)
    
    print("\nSafety Compliance Report:")
    print(f"Is compliant: {safety_report['is_compliant']}")
    print(f"Total violations: {safety_report['total_violations']}")
    print(f"Violations found:")
    for location, violation_type in safety_report['violations']:
        print(f"  - {location}: {violation_type}")
    print(f"Sensitive topics: {safety_report['sensitive_topics']}")
    print(f"Disclaimer present: {safety_report['disclaimer_present']}")
    print()


def demo_uncertainty_compliance():
    """Demonstrates uncertainty compliance checking."""
    print("=" * 80)
    print("DEMO 7: Uncertainty Compliance Checking")
    print("=" * 80)
    
    # Create low-confidence claim WITHOUT uncertainty language
    claim = Claim(
        id="claim_1",
        text="The moon is made of cheese",
        position=(0, 28),
        domain="general"
    )
    
    result = VerificationResult(
        claim=claim,
        confidence=15.0,  # Very low
        risk_level="critical",
        supporting_evidence=[],
        contradicting_evidence=[],
        reasoning="This is the conclusion based on analysis.",
        recommendation="Accept this finding"
    )
    
    report = Report(
        metadata={"timestamp": "2024-01-01T00:00:00"},
        claims=[result],
        manipulation_signals=[],
        summary_statistics={"total_claims": 1, "high_risk_count": 1, "average_confidence": 15.0},
        human_summary="Analysis completed successfully.",
        recommendations=["Proceed with publication"],
        disclaimer="Standard disclaimer"
    )
    
    # Check uncertainty compliance
    compliance = check_uncertainty_compliance(report, threshold=70.0)
    
    print("\nUncertainty Compliance Report:")
    print(f"Is compliant: {compliance['is_compliant']}")
    print(f"Low confidence claims: {compliance['low_confidence_claims']}")
    print(f"Missing uncertainty language: {compliance['missing_uncertainty_language']}")
    print(f"Average confidence: {compliance['average_confidence']}%")
    print(f"Summary has uncertainty: {compliance['summary_has_uncertainty']}")
    
    # Now apply uncertainty handling
    processed_report = apply_uncertainty_handling(report, confidence_threshold=70.0)
    
    # Check again
    compliance_after = check_uncertainty_compliance(processed_report, threshold=70.0)
    
    print("\nAfter applying uncertainty handling:")
    print(f"Is compliant: {compliance_after['is_compliant']}")
    print(f"Missing uncertainty language: {compliance_after['missing_uncertainty_language']}")
    print()


def main():
    """Run all safety constraint demos."""
    print("\n")
    print("╔" + "=" * 78 + "╗")
    print("║" + " " * 15 + "SAFETY CONSTRAINTS & UNCERTAINTY HANDLING DEMO" + " " * 16 + "║")
    print("╚" + "=" * 78 + "╝")
    print()
    
    demo_intention_filtering()
    demo_political_judgment_filtering()
    demo_medical_advice_filtering()
    demo_uncertainty_handling()
    demo_sensitive_topic_disclaimers()
    demo_safety_compliance_report()
    demo_uncertainty_compliance()
    
    print("=" * 80)
    print("DEMO COMPLETE")
    print("=" * 80)
    print("\nKey Takeaways:")
    print("1. Intention attribution is automatically filtered")
    print("2. Political judgments are removed to maintain neutrality")
    print("3. Medical advice is filtered with appropriate disclaimers")
    print("4. Low-confidence results include explicit uncertainty language")
    print("5. Sensitive topics trigger enhanced disclaimers")
    print("6. Compliance can be checked and enforced programmatically")
    print()


if __name__ == "__main__":
    main()
