"""
Demo script showing basic usage of the fact-checking system data models.

This script demonstrates:
1. Creating claims and evidence
2. Building verification results
3. Generating reports
4. Validating data structures
"""

import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime
from src.fact_checker.models import (
    Claim, Evidence, VerificationResult, ManipulationSignal,
    Report, Configuration
)
from src.fact_checker.validators import (
    validate_claim, validate_evidence, validate_report
)


def demo_claim_creation():
    """Demonstrate creating and validating a claim."""
    print("=" * 60)
    print("DEMO 1: Creating and Validating a Claim")
    print("=" * 60)
    
    # Create a claim
    claim = Claim(
        id="claim-001",
        text="The Earth orbits the Sun once every 365.25 days.",
        position=(0, 50),
        domain="physics",
        confidence=98.0,
        risk_level="low"
    )
    
    print(f"\nCreated claim: {claim.text}")
    print(f"Domain: {claim.domain}")
    print(f"Confidence: {claim.confidence}%")
    print(f"Risk Level: {claim.risk_level}")
    
    # Validate the claim
    claim_dict = {
        "id": claim.id,
        "text": claim.text,
        "position": list(claim.position),
        "domain": claim.domain,
        "confidence": claim.confidence,
        "risk_level": claim.risk_level,
        "evidence": [],
        "recommendation": None
    }
    
    validation_result = validate_claim(claim_dict)
    print(f"\nValidation result: {'✓ Valid' if validation_result.is_valid else '✗ Invalid'}")
    if not validation_result.is_valid:
        print(f"Errors: {validation_result.errors}")


def demo_evidence_and_verification():
    """Demonstrate creating evidence and verification results."""
    print("\n" + "=" * 60)
    print("DEMO 2: Creating Evidence and Verification Results")
    print("=" * 60)
    
    # Create a claim
    claim = Claim(
        id="claim-002",
        text="Water boils at 100°C at sea level.",
        position=(0, 40),
        domain="physics"
    )
    
    # Create supporting evidence
    evidence1 = Evidence(
        source="Physics Textbook - Thermodynamics",
        source_type="academic",
        credibility_score=95.0,
        relevance=98.0,
        excerpt="At standard atmospheric pressure (1 atm), water boils at 100°C (212°F).",
        url="https://example.com/physics/thermodynamics"
    )
    
    evidence2 = Evidence(
        source="National Institute of Standards",
        source_type="government",
        credibility_score=98.0,
        relevance=99.0,
        excerpt="The boiling point of water at 1 atmosphere is 373.15 K (100°C).",
        url="https://example.com/nist/water-properties"
    )
    
    # Create verification result
    verification = VerificationResult(
        claim=claim,
        confidence=97.0,
        risk_level="low",
        supporting_evidence=[evidence1, evidence2],
        contradicting_evidence=[],
        reasoning="The claim is well-supported by multiple authoritative sources.",
        recommendation="No changes needed. Claim is scientifically accurate."
    )
    
    print(f"\nClaim: {claim.text}")
    print(f"Supporting Evidence: {len(verification.supporting_evidence)} sources")
    print(f"Confidence: {verification.confidence}%")
    print(f"Risk Level: {verification.risk_level}")
    print(f"\nRecommendation: {verification.recommendation}")


def demo_manipulation_signal():
    """Demonstrate creating manipulation signals for video analysis."""
    print("\n" + "=" * 60)
    print("DEMO 3: Creating Manipulation Signals")
    print("=" * 60)
    
    # Create manipulation signal
    signal = ManipulationSignal(
        type="emotional_manipulation",
        severity="medium",
        timestamp_start="00:02:15",
        timestamp_end="00:03:30",
        description="Use of fear-based language without supporting evidence",
        evidence="Phrases like 'catastrophic consequences' and 'imminent danger' used repeatedly without data",
        confidence=78.0
    )
    
    print(f"\nDetected: {signal.type}")
    print(f"Severity: {signal.severity}")
    print(f"Time Range: {signal.timestamp_start} - {signal.timestamp_end}")
    print(f"Description: {signal.description}")
    print(f"Confidence: {signal.confidence}%")


def demo_complete_report():
    """Demonstrate creating a complete verification report."""
    print("\n" + "=" * 60)
    print("DEMO 4: Creating a Complete Report")
    print("=" * 60)
    
    # Create sample data
    claim = Claim(
        id="claim-003",
        text="The speed of light is approximately 299,792 km/s.",
        position=(0, 55),
        domain="physics",
        confidence=99.0,
        risk_level="low"
    )
    
    evidence = Evidence(
        source="International Bureau of Weights and Measures",
        source_type="government",
        credibility_score=100.0,
        relevance=100.0,
        excerpt="The speed of light in vacuum is exactly 299,792,458 m/s.",
        url="https://example.com/bipm/speed-of-light"
    )
    
    verification = VerificationResult(
        claim=claim,
        confidence=99.0,
        risk_level="low",
        supporting_evidence=[evidence],
        contradicting_evidence=[],
        reasoning="Claim matches the internationally accepted value.",
        recommendation="Minor precision improvement: specify 'in vacuum' and exact value."
    )
    
    # Create report
    report = Report(
        metadata={
            "timestamp": datetime.now().isoformat(),
            "version": "1.0",
            "input_hash": "abc123def456",
            "processing_time_ms": 1234
        },
        claims=[verification],
        manipulation_signals=[],
        summary_statistics={
            "total_claims": 1,
            "high_risk_count": 0,
            "average_confidence": 99.0,
            "domains_analyzed": ["physics"]
        },
        human_summary="Analysis complete. 1 claim verified with very high confidence. "
                     "The claim is scientifically accurate with minor precision suggestions.",
        recommendations=[
            "Specify 'in vacuum' for complete accuracy",
            "Consider using exact value: 299,792,458 m/s"
        ],
        disclaimer="This is an automated verification system. Human expert review is recommended for critical applications."
    )
    
    print(f"\nReport Metadata:")
    print(f"  Version: {report.metadata['version']}")
    print(f"  Processing Time: {report.metadata['processing_time_ms']}ms")
    
    print(f"\nSummary Statistics:")
    print(f"  Total Claims: {report.summary_statistics['total_claims']}")
    print(f"  High Risk Count: {report.summary_statistics['high_risk_count']}")
    print(f"  Average Confidence: {report.summary_statistics['average_confidence']}%")
    
    print(f"\nHuman Summary:")
    print(f"  {report.human_summary}")
    
    print(f"\nRecommendations:")
    for i, rec in enumerate(report.recommendations, 1):
        print(f"  {i}. {rec}")
    
    print(f"\nDisclaimer:")
    print(f"  {report.disclaimer}")


def demo_configuration():
    """Demonstrate configuration management."""
    print("\n" + "=" * 60)
    print("DEMO 5: Configuration Management")
    print("=" * 60)
    
    # Create configuration
    config = Configuration(
        confidence_threshold=75.0,
        risk_level_mappings={
            "critical": (0, 25),
            "high": (25, 50),
            "medium": (50, 75),
            "low": (75, 100)
        },
        trusted_sources={
            "physics": ["Nature Physics", "Physical Review Letters"],
            "biology": ["Cell", "Nature Biology", "Science"],
            "history": ["Historical Journal", "American Historical Review"]
        },
        custom_domains=["quantum_mechanics", "astrophysics"],
        cache_enabled=True,
        cache_ttl_seconds=3600,
        max_concurrent_verifications=10,
        timeout_seconds=30
    )
    
    print(f"\nConfiguration Settings:")
    print(f"  Confidence Threshold: {config.confidence_threshold}%")
    print(f"  Cache Enabled: {config.cache_enabled}")
    print(f"  Cache TTL: {config.cache_ttl_seconds}s")
    print(f"  Max Concurrent: {config.max_concurrent_verifications}")
    print(f"  Timeout: {config.timeout_seconds}s")
    
    print(f"\nTrusted Sources:")
    for domain, sources in config.trusted_sources.items():
        print(f"  {domain}: {', '.join(sources)}")
    
    print(f"\nCustom Domains: {', '.join(config.custom_domains)}")
    
    print(f"\nRisk Level Mappings:")
    for level, (min_conf, max_conf) in config.risk_level_mappings.items():
        print(f"  {level}: {min_conf}-{max_conf}%")


def main():
    """Run all demos."""
    print("\n" + "=" * 60)
    print("FACT-CHECKING SYSTEM - DATA MODELS DEMO")
    print("=" * 60)
    
    demo_claim_creation()
    demo_evidence_and_verification()
    demo_manipulation_signal()
    demo_complete_report()
    demo_configuration()
    
    print("\n" + "=" * 60)
    print("DEMO COMPLETE")
    print("=" * 60)
    print("\nAll data models created and validated successfully!")
    print("Next steps: Implement core APIs and agents.")


if __name__ == "__main__":
    main()
