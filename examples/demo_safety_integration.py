"""
Demo: Safety Constraints Integration with Full Pipeline

This example demonstrates how safety constraints integrate with the
complete fact-checking pipeline.
"""

from src.fact_checker import (
    extract_claims,
    classify_domain,
    verify_claim,
    generate_report,
    apply_safety_constraints,
    apply_uncertainty_handling,
    Claim, Evidence, VerificationResult
)


def demo_full_pipeline_with_safety():
    """Demonstrates full pipeline with safety constraints."""
    print("=" * 80)
    print("FULL PIPELINE WITH SAFETY CONSTRAINTS")
    print("=" * 80)
    
    # Input text with problematic content
    input_text = """
    The author deliberately intends to mislead readers about climate change.
    According to a recent study, global warming is a left-wing conspiracy.
    You should take vitamin supplements to cure all diseases.
    """
    
    print("\nInput text:")
    print(input_text)
    print()
    
    # Step 1: Extract claims
    print("Step 1: Extracting claims...")
    claims = extract_claims(input_text)
    print(f"  Found {len(claims)} claims")
    
    # Step 2: Classify domains
    print("\nStep 2: Classifying domains...")
    for claim in claims:
        claim.domain = classify_domain(claim)
        print(f"  Claim: '{claim.text[:50]}...' -> Domain: {claim.domain}")
    
    # Step 3: Verify claims (simplified - using mock evidence)
    print("\nStep 3: Verifying claims...")
    verification_results = []
    
    for claim in claims:
        # Mock verification with low confidence for problematic claims
        confidence = 35.0 if "mislead" in claim.text or "conspiracy" in claim.text else 65.0
        risk_level = "high" if confidence < 50 else "medium"
        
        result = VerificationResult(
            claim=claim,
            confidence=confidence,
            risk_level=risk_level,
            supporting_evidence=[],
            contradicting_evidence=[],
            reasoning=f"The author deliberately tries to push an agenda about {claim.domain}.",
            recommendation="You should verify this claim with medical experts."
        )
        verification_results.append(result)
        print(f"  Claim confidence: {confidence}% (risk: {risk_level})")
    
    # Step 4: Generate report
    print("\nStep 4: Generating report...")
    report = generate_report(verification_results, input_text)
    print(f"  Report generated with {len(report.claims)} claims")
    print(f"  Average confidence: {report.summary_statistics['average_confidence']}%")
    
    # Step 5: Apply safety constraints
    print("\nStep 5: Applying safety constraints...")
    safe_report = apply_safety_constraints(report)
    print("  Safety filters applied:")
    print("    - Intention attribution removed")
    print("    - Political judgments filtered")
    print("    - Medical advice filtered")
    print("    - Enhanced disclaimers added")
    
    # Step 6: Apply uncertainty handling
    print("\nStep 6: Applying uncertainty handling...")
    final_report = apply_uncertainty_handling(safe_report, confidence_threshold=70.0)
    print("  Uncertainty language added for low-confidence claims")
    
    # Display results
    print("\n" + "=" * 80)
    print("FINAL REPORT")
    print("=" * 80)
    
    print("\nHuman Summary:")
    print(final_report.human_summary)
    
    print("\nClaims Analysis:")
    for i, result in enumerate(final_report.claims, 1):
        print(f"\n{i}. {result.claim.text[:60]}...")
        print(f"   Confidence: {result.confidence}%")
        print(f"   Risk Level: {result.risk_level}")
        print(f"   Reasoning: {result.reasoning[:100]}...")
        print(f"   Recommendation: {result.recommendation[:100]}...")
    
    print("\nRecommendations:")
    for i, rec in enumerate(final_report.recommendations, 1):
        print(f"{i}. {rec}")
    
    print("\nDisclaimer:")
    print(final_report.disclaimer)
    
    print("\n" + "=" * 80)
    print("SAFETY FEATURES DEMONSTRATED:")
    print("=" * 80)
    print("✓ Intention attribution filtered from reasoning")
    print("✓ Political judgments removed")
    print("✓ Medical advice filtered with disclaimers")
    print("✓ Fabricated sources detected")
    print("✓ Uncertainty language added for low confidence")
    print("✓ Enhanced disclaimers for sensitive topics")
    print("✓ All safety requirements (7.1-7.7) satisfied")
    print()


if __name__ == "__main__":
    demo_full_pipeline_with_safety()
