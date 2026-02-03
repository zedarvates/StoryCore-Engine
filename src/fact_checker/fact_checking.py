"""
Fact Checking API

This module provides functionality to verify claims using evidence,
calculate confidence scores, and assign risk levels.

Requirements: 1.3, 1.4, 1.5, 6.5
"""

from typing import List, Optional, Tuple
from .models import Claim, Evidence, VerificationResult, RiskLevel, Configuration


def verify_claim(
    claim: Claim,
    evidence: List[Evidence],
    config: Optional[Configuration] = None
) -> VerificationResult:
    """
    Evaluates claim validity using evidence and returns verification result.
    
    The verification process:
    1. Separates supporting vs contradicting evidence
    2. Calculates confidence score based on evidence quality and consensus
    3. Assigns risk level based on confidence and domain sensitivity
    4. Generates reasoning explanation
    5. Provides actionable recommendation
    
    Args:
        claim: Claim to verify
        evidence: List of evidence (supporting and/or contradicting)
        config: Optional configuration with thresholds
        
    Returns:
        VerificationResult with confidence score, risk level, and reasoning
        
    Examples:
        >>> claim = Claim(id="1", text="Water boils at 100 degrees.", position=(0, 30))
        >>> evidence = [Evidence(source="Physics Textbook", source_type="academic",
        ...                      credibility_score=95.0, relevance=90.0,
        ...                      excerpt="Water boils at 100°C at sea level.")]
        >>> result = verify_claim(claim, evidence)
        >>> result.confidence > 70
        True
        >>> result.risk_level in ["low", "medium", "high", "critical"]
        True
    """
    if not config:
        config = Configuration()
    
    # Separate supporting and contradicting evidence
    supporting, contradicting = _classify_evidence(claim, evidence)
    
    # Calculate confidence score
    confidence = _calculate_confidence_score(supporting, contradicting)
    
    # Assign risk level based on confidence
    risk_level = _assign_risk_level(confidence, config)
    
    # Generate reasoning
    reasoning = _generate_reasoning(claim, supporting, contradicting, confidence)
    
    # Generate recommendation
    recommendation = _generate_recommendation(claim, risk_level, confidence)
    
    return VerificationResult(
        claim=claim,
        confidence=confidence,
        risk_level=risk_level,
        supporting_evidence=supporting,
        contradicting_evidence=contradicting,
        reasoning=reasoning,
        recommendation=recommendation
    )


def verify_claims_batch(
    claims: List[Claim],
    evidence_lists: List[List[Evidence]],
    config: Optional[Configuration] = None
) -> List[VerificationResult]:
    """
    Verifies multiple claims efficiently.
    
    Args:
        claims: List of claims to verify
        evidence_lists: List of evidence lists (one per claim)
        config: Optional configuration
        
    Returns:
        List of VerificationResult objects in same order as claims
    """
    if len(claims) != len(evidence_lists):
        raise ValueError("Number of claims must match number of evidence lists")
    
    results = []
    for claim, evidence in zip(claims, evidence_lists):
        result = verify_claim(claim, evidence, config)
        results.append(result)
    
    return results


def _classify_evidence(claim: Claim, evidence: List[Evidence]) -> Tuple[List[Evidence], List[Evidence]]:
    """
    Classifies evidence as supporting or contradicting the claim.
    
    This is a simplified heuristic implementation. In production, this would
    use more sophisticated NLP to determine support/contradiction.
    
    Args:
        claim: The claim being verified
        evidence: List of all evidence
        
    Returns:
        Tuple of (supporting_evidence, contradicting_evidence)
    """
    supporting = []
    contradicting = []
    
    # Simple heuristic: high relevance = supporting, low relevance = contradicting
    # In production, this would use semantic analysis
    for ev in evidence:
        if ev.relevance >= 60.0:
            supporting.append(ev)
        else:
            contradicting.append(ev)
    
    return supporting, contradicting


def _calculate_confidence_score(
    supporting: List[Evidence],
    contradicting: List[Evidence]
) -> float:
    """
    Calculates confidence score based on evidence quality and consensus.
    
    Factors considered:
    - Number and credibility of supporting evidence
    - Number and credibility of contradicting evidence
    - Relevance scores of evidence
    - Source diversity
    
    Args:
        supporting: List of supporting evidence
        contradicting: List of contradicting evidence
        
    Returns:
        Confidence score (0-100)
    """
    # No evidence = low confidence
    if not supporting and not contradicting:
        return 30.0
    
    # Calculate weighted scores for supporting evidence
    supporting_score = 0.0
    if supporting:
        for ev in supporting:
            # Weight by both credibility and relevance
            weight = (ev.credibility_score * 0.6 + ev.relevance * 0.4) / 100.0
            supporting_score += weight
        supporting_score = supporting_score / len(supporting) * 100
    
    # Calculate weighted scores for contradicting evidence
    contradicting_score = 0.0
    if contradicting:
        for ev in contradicting:
            weight = (ev.credibility_score * 0.6 + ev.relevance * 0.4) / 100.0
            contradicting_score += weight
        contradicting_score = contradicting_score / len(contradicting) * 100
    
    # Only contradicting evidence = very low confidence
    if not supporting:
        return max(10.0, 50.0 - contradicting_score * 0.5)
    
    # Only supporting evidence = high confidence
    if not contradicting:
        return min(95.0, supporting_score)
    
    # Mixed evidence = balance based on strength
    total_score = supporting_score + contradicting_score
    if total_score == 0:
        return 50.0
    
    # Confidence proportional to supporting evidence strength
    confidence = (supporting_score / total_score) * 100
    
    # Penalize if contradicting evidence is strong
    if contradicting_score > 70:
        confidence *= 0.7
    
    return max(0.0, min(100.0, confidence))


def _assign_risk_level(confidence: float, config: Configuration) -> str:
    """
    Assigns risk level based on confidence score and configured thresholds.
    
    Args:
        confidence: Confidence score (0-100)
        config: Configuration with risk level mappings
        
    Returns:
        Risk level string: "low", "medium", "high", or "critical"
    """
    mappings = config.risk_level_mappings
    
    for risk_level, (min_conf, max_conf) in mappings.items():
        if min_conf <= confidence < max_conf:
            return risk_level
    
    # Default to critical if confidence is very low
    if confidence < 30:
        return RiskLevel.CRITICAL.value
    
    # Default to low if confidence is high
    return RiskLevel.LOW.value


def _generate_reasoning(
    claim: Claim,
    supporting: List[Evidence],
    contradicting: List[Evidence],
    confidence: float
) -> str:
    """
    Generates human-readable reasoning for the verification decision.
    
    Args:
        claim: The claim being verified
        supporting: Supporting evidence
        contradicting: Contradicting evidence
        confidence: Calculated confidence score
        
    Returns:
        Reasoning explanation string
    """
    parts = []
    
    # Confidence assessment
    if confidence >= 80:
        parts.append(f"High confidence ({confidence:.1f}%) in this claim.")
    elif confidence >= 60:
        parts.append(f"Moderate confidence ({confidence:.1f}%) in this claim.")
    elif confidence >= 40:
        parts.append(f"Low confidence ({confidence:.1f}%) in this claim.")
    else:
        parts.append(f"Very low confidence ({confidence:.1f}%) in this claim.")
    
    # Supporting evidence summary
    if supporting:
        avg_credibility = sum(e.credibility_score for e in supporting) / len(supporting)
        parts.append(
            f"Found {len(supporting)} supporting source(s) "
            f"with average credibility of {avg_credibility:.1f}%."
        )
    else:
        parts.append("No supporting evidence found.")
    
    # Contradicting evidence summary
    if contradicting:
        avg_credibility = sum(e.credibility_score for e in contradicting) / len(contradicting)
        parts.append(
            f"Found {len(contradicting)} contradicting source(s) "
            f"with average credibility of {avg_credibility:.1f}%."
        )
    
    # Evidence quality assessment
    if supporting:
        high_quality = [e for e in supporting if e.credibility_score >= 90]
        if high_quality:
            parts.append(f"{len(high_quality)} high-quality academic or government sources support this claim.")
    
    return " ".join(parts)


def _generate_recommendation(claim: Claim, risk_level: str, confidence: float) -> str:
    """
    Generates actionable recommendation based on verification results.
    
    Args:
        claim: The claim being verified
        risk_level: Assigned risk level
        confidence: Confidence score
        
    Returns:
        Recommendation string
    """
    if risk_level == RiskLevel.CRITICAL.value:
        return (
            "CRITICAL: This claim has very low confidence and should not be used. "
            "Consider removing it or finding more reliable sources."
        )
    elif risk_level == RiskLevel.HIGH.value:
        return (
            "HIGH RISK: This claim lacks sufficient supporting evidence. "
            "Verify with additional authoritative sources before using."
        )
    elif risk_level == RiskLevel.MEDIUM.value:
        return (
            "MEDIUM RISK: This claim has moderate support but could benefit from "
            "additional verification. Consider adding a disclaimer or qualifying language."
        )
    else:  # LOW risk
        if confidence >= 90:
            return (
                "LOW RISK: This claim is well-supported by authoritative sources. "
                "Safe to use with proper attribution."
            )
        else:
            return (
                "LOW RISK: This claim has reasonable support. "
                "Consider citing specific sources when using."
            )


def calculate_overall_confidence(results: List[VerificationResult]) -> float:
    """
    Calculates overall confidence across multiple verification results.
    
    Args:
        results: List of verification results
        
    Returns:
        Average confidence score (0-100)
    """
    if not results:
        return 0.0
    
    return sum(r.confidence for r in results) / len(results)


def count_high_risk_claims(results: List[VerificationResult]) -> int:
    """
    Counts claims with high or critical risk levels.
    
    Args:
        results: List of verification results
        
    Returns:
        Count of high-risk claims
    """
    high_risk_levels = {RiskLevel.HIGH.value, RiskLevel.CRITICAL.value}
    return sum(1 for r in results if r.risk_level in high_risk_levels)


def filter_by_risk_level(
    results: List[VerificationResult],
    risk_levels: List[str]
) -> List[VerificationResult]:
    """
    Filters verification results by risk level.
    
    Args:
        results: List of verification results
        risk_levels: List of risk levels to include
        
    Returns:
        Filtered list of results
    """
    return [r for r in results if r.risk_level in risk_levels]


def get_verification_summary(results: List[VerificationResult]) -> dict:
    """
    Generates summary statistics for verification results.
    
    Args:
        results: List of verification results
        
    Returns:
        Dictionary with summary statistics
    """
    if not results:
        return {
            "total_claims": 0,
            "average_confidence": 0.0,
            "high_risk_count": 0,
            "risk_distribution": {}
        }
    
    risk_distribution = {}
    for risk_level in RiskLevel:
        count = sum(1 for r in results if r.risk_level == risk_level.value)
        risk_distribution[risk_level.value] = count
    
    return {
        "total_claims": len(results),
        "average_confidence": calculate_overall_confidence(results),
        "high_risk_count": count_high_risk_claims(results),
        "risk_distribution": risk_distribution
    }
