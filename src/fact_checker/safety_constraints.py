"""
Safety Constraints Module

This module implements safety and ethical constraints to prevent harmful
or biased outputs from the fact-checking system.

Requirements: 7.1, 7.2, 7.3, 7.4, 7.7
"""

import re
from typing import List, Dict, Any, Optional, Tuple
from .models import VerificationResult, ManipulationSignal, Report
from .trusted_sources import is_source_trusted, get_source_by_url


# Prohibited content patterns
INTENTION_PATTERNS = [
    r'\b(intends? to|meant to|trying to|attempting to|wants? to|aims? to)\b',
    r'\b(deliberately|intentionally|purposefully|knowingly)\b.*\b(mislead|deceive|manipulate|trick)\b',
    r'\b(author|creator|writer|speaker).*\b(wants?|intends?|tries|attempts)\b',
    r'\b(hidden agenda|ulterior motive|secret plan)\b',
]

POLITICAL_JUDGMENT_PATTERNS = [
    r'\b(left-wing|right-wing|liberal|conservative|progressive|reactionary)\b.*\b(bias|agenda|propaganda)\b',
    r'\b(partisan|biased|one-sided)\b.*\b(political|ideological)\b',
    r'\b(democrat|republican|socialist|communist|fascist)\b.*\b(propaganda|manipulation)\b',
    r'\b(politically motivated|political agenda)\b',
]

MEDICAL_ADVICE_PATTERNS = [
    r'\b(you should|you must|you need to)\b.*\b(take|use|consume|avoid|stop)\b.*\b(medication|drug|treatment|therapy)\b',
    r'\b(diagnos(is|ed|ing)|prescrib(e|ed|ing)|treat(ment)?)\b.*\b(for|with|using)\b',
    r'\b(cure|heal|remedy)\b.*\b(disease|illness|condition|disorder)\b',
    r'\b(medical advice|health recommendation|treatment plan)\b',
]

FABRICATED_SOURCE_PATTERNS = [
    r'\baccording to (a|an|the)?\s*(study|research|report|article)\b(?!.*\b(from|by|published|in)\b)',
    r'\b(experts? say|scientists? claim|researchers? found)\b(?!.*\b(at|from|in)\b)',
    r'\b(recent study|new research)\b(?!.*\b(published|from|by)\b)',
]

# Sensitive topic keywords
SENSITIVE_TOPICS = {
    "political": ["election", "voting", "government", "policy", "legislation", "politician"],
    "religious": ["religion", "faith", "belief", "god", "church", "mosque", "temple", "scripture"],
    "medical": ["health", "disease", "treatment", "medication", "diagnosis", "symptom", "cure"],
    "financial": ["investment", "stock", "trading", "financial advice", "money", "profit"],
    "legal": ["legal advice", "lawsuit", "court", "attorney", "law", "regulation"],
}


def apply_safety_constraints(report: Report, config: Optional[Dict[str, Any]] = None) -> Report:
    """
    Applies safety constraints to a report, filtering prohibited content.
    
    This function:
    1. Filters intention attribution language
    2. Removes political judgments
    3. Removes medical advice
    4. Verifies all sources are from trusted database
    5. Adds appropriate disclaimers
    
    Args:
        report: Report object to filter
        config: Optional configuration for safety settings
        
    Returns:
        Filtered Report object with safety constraints applied
        
    Examples:
        >>> report = Report(...)
        >>> safe_report = apply_safety_constraints(report)
        >>> "intends to mislead" not in safe_report.human_summary
        True
    """
    # Filter claims
    filtered_claims = []
    for result in report.claims:
        filtered_result = _filter_verification_result(result, config)
        filtered_claims.append(filtered_result)
    
    # Filter manipulation signals
    filtered_signals = []
    for signal in report.manipulation_signals:
        filtered_signal = _filter_manipulation_signal(signal, config)
        filtered_signals.append(filtered_signal)
    
    # Filter human summary
    filtered_summary = _filter_text_content(report.human_summary, config)
    
    # Filter recommendations
    filtered_recommendations = [
        _filter_text_content(rec, config) for rec in report.recommendations
    ]
    
    # Verify sources
    _verify_sources_in_report(report, config)
    
    # Add appropriate disclaimers
    enhanced_disclaimer = _generate_enhanced_disclaimer(report, config)
    
    # Create filtered report
    filtered_report = Report(
        metadata=report.metadata,
        claims=filtered_claims,
        manipulation_signals=filtered_signals,
        summary_statistics=report.summary_statistics,
        human_summary=filtered_summary,
        recommendations=filtered_recommendations,
        disclaimer=enhanced_disclaimer
    )
    
    return filtered_report


def _filter_verification_result(
    result: VerificationResult,
    config: Optional[Dict[str, Any]] = None
) -> VerificationResult:
    """
    Filters a single verification result for prohibited content.
    
    Args:
        result: VerificationResult to filter
        config: Optional configuration
        
    Returns:
        Filtered VerificationResult
    """
    # Filter reasoning
    filtered_reasoning = _filter_text_content(result.reasoning, config)
    
    # Filter recommendation
    filtered_recommendation = _filter_text_content(result.recommendation, config)
    
    # Create filtered result
    return VerificationResult(
        claim=result.claim,
        confidence=result.confidence,
        risk_level=result.risk_level,
        supporting_evidence=result.supporting_evidence,
        contradicting_evidence=result.contradicting_evidence,
        reasoning=filtered_reasoning,
        recommendation=filtered_recommendation
    )


def _filter_manipulation_signal(
    signal: ManipulationSignal,
    config: Optional[Dict[str, Any]] = None
) -> ManipulationSignal:
    """
    Filters a manipulation signal for prohibited content.
    
    Args:
        signal: ManipulationSignal to filter
        config: Optional configuration
        
    Returns:
        Filtered ManipulationSignal
    """
    # Filter description
    filtered_description = _filter_text_content(signal.description, config)
    
    # Filter evidence
    filtered_evidence = _filter_text_content(signal.evidence, config)
    
    # Create filtered signal
    return ManipulationSignal(
        type=signal.type,
        severity=signal.severity,
        description=filtered_description,
        evidence=filtered_evidence,
        confidence=signal.confidence,
        timestamp_start=signal.timestamp_start,
        timestamp_end=signal.timestamp_end
    )


def _filter_text_content(text: str, config: Optional[Dict[str, Any]] = None) -> str:
    """
    Filters text content for prohibited patterns.
    
    Args:
        text: Text to filter
        config: Optional configuration
        
    Returns:
        Filtered text with prohibited content replaced
    """
    filtered = text
    
    # Filter intention attribution
    filtered = _filter_intention_attribution(filtered)
    
    # Filter political judgments
    filtered = _filter_political_judgments(filtered)
    
    # Filter medical advice
    filtered = _filter_medical_advice(filtered)
    
    # Filter fabricated sources
    filtered = _filter_fabricated_sources(filtered)
    
    return filtered


def _filter_intention_attribution(text: str) -> str:
    """
    Removes language that attributes intentions or motivations.
    
    Requirement 7.1: SHALL NOT attribute intentions or motivations
    
    Args:
        text: Text to filter
        
    Returns:
        Filtered text
    """
    filtered = text
    
    for pattern in INTENTION_PATTERNS:
        # Find matches
        matches = list(re.finditer(pattern, filtered, re.IGNORECASE))
        
        # Replace with neutral language
        for match in reversed(matches):  # Reverse to maintain indices
            start, end = match.span()
            
            # Extract context
            sentence_start = max(0, filtered.rfind('.', 0, start) + 1)
            sentence_end = filtered.find('.', end)
            if sentence_end == -1:
                sentence_end = len(filtered)
            
            # Replace with neutral observation
            neutral = "The content contains statements that"
            filtered = filtered[:sentence_start] + neutral + filtered[sentence_end:]
    
    return filtered


def _filter_political_judgments(text: str) -> str:
    """
    Removes political judgments and partisan assessments.
    
    Requirement 7.2: SHALL NOT make political judgments
    
    Args:
        text: Text to filter
        
    Returns:
        Filtered text
    """
    filtered = text
    
    for pattern in POLITICAL_JUDGMENT_PATTERNS:
        # Replace with neutral language
        filtered = re.sub(
            pattern,
            "content with political themes",
            filtered,
            flags=re.IGNORECASE
        )
    
    return filtered


def _filter_medical_advice(text: str) -> str:
    """
    Removes medical diagnoses and health advice.
    
    Requirement 7.3: SHALL NOT provide medical diagnoses or health advice
    
    Args:
        text: Text to filter
        
    Returns:
        Filtered text
    """
    filtered = text
    
    for pattern in MEDICAL_ADVICE_PATTERNS:
        # Replace with disclaimer
        filtered = re.sub(
            pattern,
            "medical information (consult healthcare professional)",
            filtered,
            flags=re.IGNORECASE
        )
    
    return filtered


def _filter_fabricated_sources(text: str) -> str:
    """
    Removes references to unverified or fabricated sources.
    
    Requirement 7.4: SHALL NOT generate invented sources
    
    Args:
        text: Text to filter
        
    Returns:
        Filtered text
    """
    filtered = text
    
    for pattern in FABRICATED_SOURCE_PATTERNS:
        # Replace with requirement for specific sources
        filtered = re.sub(
            pattern,
            "claims requiring specific source verification",
            filtered,
            flags=re.IGNORECASE
        )
    
    return filtered


def _verify_sources_in_report(report: Report, config: Optional[Dict[str, Any]] = None) -> None:
    """
    Verifies that all sources in report are from trusted database.
    
    Requirement 7.4: SHALL NOT generate invented sources
    
    Args:
        report: Report to verify
        config: Optional configuration
        
    Raises:
        Warning if untrusted sources are found (logged, not raised)
    """
    untrusted_sources = []
    
    for result in report.claims:
        for evidence in result.supporting_evidence + result.contradicting_evidence:
            if evidence.url:
                if not is_source_trusted(evidence.url, result.claim.domain, config):
                    untrusted_sources.append(evidence.url)
    
    if untrusted_sources:
        # Log warning (in production, use proper logging)
        print(f"WARNING: Found {len(untrusted_sources)} untrusted source(s) in report")


def _generate_enhanced_disclaimer(report: Report, config: Optional[Dict[str, Any]] = None) -> str:
    """
    Generates enhanced disclaimer based on report content.
    
    Requirement 7.7: SHALL include disclaimer in all outputs
    
    Args:
        report: Report to generate disclaimer for
        config: Optional configuration
        
    Returns:
        Enhanced disclaimer text
    """
    disclaimers = [report.disclaimer]
    
    # Check for sensitive topics
    sensitive_found = _detect_sensitive_topics(report)
    
    if "medical" in sensitive_found:
        disclaimers.append(
            "This report contains medical information. "
            "Always consult qualified healthcare professionals for medical advice, "
            "diagnosis, or treatment decisions."
        )
    
    if "political" in sensitive_found:
        disclaimers.append(
            "This report analyzes content with political themes. "
            "The analysis focuses on factual accuracy and does not endorse "
            "any political position or ideology."
        )
    
    if "financial" in sensitive_found:
        disclaimers.append(
            "This report contains financial information. "
            "This is not financial advice. Consult qualified financial advisors "
            "before making investment decisions."
        )
    
    if "legal" in sensitive_found:
        disclaimers.append(
            "This report contains legal information. "
            "This is not legal advice. Consult qualified legal professionals "
            "for legal matters."
        )
    
    if "religious" in sensitive_found:
        disclaimers.append(
            "This report analyzes content with religious themes. "
            "The analysis respects diverse beliefs and focuses on factual claims."
        )
    
    # Check for low confidence
    avg_confidence = report.summary_statistics.get("average_confidence", 100)
    if avg_confidence < 70:
        disclaimers.append(
            "This report contains claims with below-threshold confidence levels. "
            "Exercise additional caution and seek multiple authoritative sources."
        )
    
    return " ".join(disclaimers)


def _detect_sensitive_topics(report: Report) -> List[str]:
    """
    Detects sensitive topics in report content.
    
    Args:
        report: Report to analyze
        
    Returns:
        List of detected sensitive topic categories
    """
    detected = set()
    
    # Combine all text content
    all_text = report.human_summary.lower()
    for result in report.claims:
        all_text += " " + result.claim.text.lower()
        all_text += " " + result.reasoning.lower()
    
    # Check for sensitive keywords
    for topic, keywords in SENSITIVE_TOPICS.items():
        for keyword in keywords:
            if keyword.lower() in all_text:
                detected.add(topic)
                break
    
    return list(detected)


def check_content_safety(text: str) -> Tuple[bool, List[str]]:
    """
    Checks if text content violates safety constraints.
    
    Args:
        text: Text to check
        
    Returns:
        Tuple of (is_safe, list_of_violations)
        
    Examples:
        >>> is_safe, violations = check_content_safety("The author intends to mislead readers")
        >>> is_safe
        False
        >>> "intention_attribution" in violations
        True
    """
    violations = []
    
    # Check for intention attribution
    for pattern in INTENTION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            violations.append("intention_attribution")
            break
    
    # Check for political judgments
    for pattern in POLITICAL_JUDGMENT_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            violations.append("political_judgment")
            break
    
    # Check for medical advice
    for pattern in MEDICAL_ADVICE_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            violations.append("medical_advice")
            break
    
    # Check for fabricated sources
    for pattern in FABRICATED_SOURCE_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            violations.append("fabricated_source")
            break
    
    is_safe = len(violations) == 0
    return is_safe, violations


def add_uncertainty_language(
    text: str,
    confidence: float,
    threshold: float = 70.0
) -> str:
    """
    Adds explicit uncertainty language for low-confidence results.
    
    Requirement 7.5: SHALL explicitly state uncertainty rather than guess
    
    Args:
        text: Original text
        confidence: Confidence score (0-100)
        threshold: Confidence threshold below which to add uncertainty language
        
    Returns:
        Text with uncertainty language added if needed
        
    Examples:
        >>> result = add_uncertainty_language("This is true", 45.0)
        >>> "uncertain" in result.lower() or "unclear" in result.lower()
        True
        >>> result = add_uncertainty_language("This is true", 85.0)
        >>> result
        'This is true'
    """
    if confidence >= threshold:
        return text
    
    # Determine uncertainty level
    if confidence < 30:
        uncertainty_prefix = "⚠️ HIGHLY UNCERTAIN: "
        uncertainty_note = " (Confidence: {:.1f}% - insufficient evidence for reliable conclusion)".format(confidence)
    elif confidence < 50:
        uncertainty_prefix = "⚠️ UNCERTAIN: "
        uncertainty_note = " (Confidence: {:.1f}% - limited supporting evidence)".format(confidence)
    else:
        uncertainty_prefix = "Note: "
        uncertainty_note = " (Confidence: {:.1f}% - below standard threshold)".format(confidence)
    
    # Add uncertainty language
    enhanced_text = uncertainty_prefix + text + uncertainty_note
    
    return enhanced_text


def apply_uncertainty_handling(
    report: Report,
    confidence_threshold: float = 70.0
) -> Report:
    """
    Applies uncertainty handling to all low-confidence results in report.
    
    Requirement 7.5: SHALL explicitly state uncertainty rather than guess
    
    Args:
        report: Report to process
        confidence_threshold: Threshold below which to add uncertainty language
        
    Returns:
        Report with uncertainty language added to low-confidence results
    """
    # Process claims
    processed_claims = []
    for result in report.claims:
        if result.confidence < confidence_threshold:
            # Add uncertainty to reasoning
            enhanced_reasoning = add_uncertainty_language(
                result.reasoning,
                result.confidence,
                confidence_threshold
            )
            
            # Add uncertainty to recommendation
            enhanced_recommendation = add_uncertainty_language(
                result.recommendation,
                result.confidence,
                confidence_threshold
            )
            
            # Create enhanced result
            enhanced_result = VerificationResult(
                claim=result.claim,
                confidence=result.confidence,
                risk_level=result.risk_level,
                supporting_evidence=result.supporting_evidence,
                contradicting_evidence=result.contradicting_evidence,
                reasoning=enhanced_reasoning,
                recommendation=enhanced_recommendation
            )
            processed_claims.append(enhanced_result)
        else:
            processed_claims.append(result)
    
    # Process manipulation signals
    processed_signals = []
    for signal in report.manipulation_signals:
        if signal.confidence < confidence_threshold:
            # Add uncertainty to description
            enhanced_description = add_uncertainty_language(
                signal.description,
                signal.confidence,
                confidence_threshold
            )
            
            # Create enhanced signal
            enhanced_signal = ManipulationSignal(
                type=signal.type,
                severity=signal.severity,
                description=enhanced_description,
                evidence=signal.evidence,
                confidence=signal.confidence,
                timestamp_start=signal.timestamp_start,
                timestamp_end=signal.timestamp_end
            )
            processed_signals.append(enhanced_signal)
        else:
            processed_signals.append(signal)
    
    # Enhance human summary if average confidence is low
    avg_confidence = report.summary_statistics.get("average_confidence", 100)
    enhanced_summary = report.human_summary
    if avg_confidence < confidence_threshold:
        uncertainty_note = (
            f"\n\n⚠️ Note: Overall confidence ({avg_confidence:.1f}%) is below threshold. "
            "Results should be interpreted with caution and verified with additional sources."
        )
        enhanced_summary = report.human_summary + uncertainty_note
    
    # Create processed report
    processed_report = Report(
        metadata=report.metadata,
        claims=processed_claims,
        manipulation_signals=processed_signals,
        summary_statistics=report.summary_statistics,
        human_summary=enhanced_summary,
        recommendations=report.recommendations,
        disclaimer=report.disclaimer
    )
    
    return processed_report


def check_uncertainty_compliance(report: Report, threshold: float = 70.0) -> Dict[str, Any]:
    """
    Checks if report properly handles uncertainty for low-confidence results.
    
    Args:
        report: Report to check
        threshold: Confidence threshold
        
    Returns:
        Dictionary with compliance information
    """
    low_confidence_claims = []
    missing_uncertainty = []
    
    # Check claims
    for i, result in enumerate(report.claims):
        if result.confidence < threshold:
            low_confidence_claims.append(i)
            
            # Check if uncertainty language is present
            uncertainty_keywords = ["uncertain", "unclear", "insufficient evidence", "limited evidence", "below threshold"]
            has_uncertainty = any(
                keyword in result.reasoning.lower() or keyword in result.recommendation.lower()
                for keyword in uncertainty_keywords
            )
            
            if not has_uncertainty:
                missing_uncertainty.append(i)
    
    # Check manipulation signals
    low_confidence_signals = []
    for i, signal in enumerate(report.manipulation_signals):
        if signal.confidence < threshold:
            low_confidence_signals.append(i)
            
            uncertainty_keywords = ["uncertain", "unclear", "insufficient", "limited"]
            has_uncertainty = any(keyword in signal.description.lower() for keyword in uncertainty_keywords)
            
            if not has_uncertainty:
                missing_uncertainty.append(f"signal_{i}")
    
    # Check overall summary
    avg_confidence = report.summary_statistics.get("average_confidence", 100)
    summary_has_uncertainty = False
    if avg_confidence < threshold:
        uncertainty_keywords = ["uncertain", "caution", "below threshold", "limited"]
        summary_has_uncertainty = any(keyword in report.human_summary.lower() for keyword in uncertainty_keywords)
    
    return {
        "is_compliant": len(missing_uncertainty) == 0 and (avg_confidence >= threshold or summary_has_uncertainty),
        "low_confidence_claims": low_confidence_claims,
        "low_confidence_signals": low_confidence_signals,
        "missing_uncertainty_language": missing_uncertainty,
        "average_confidence": avg_confidence,
        "summary_has_uncertainty": summary_has_uncertainty if avg_confidence < threshold else None
    }


def get_safety_report(report: Report) -> Dict[str, Any]:
    """
    Generates a safety compliance report for a verification report.
    
    Args:
        report: Report to analyze
        
    Returns:
        Dictionary with safety compliance information
    """
    # Check all text content
    all_violations = []
    
    # Check human summary
    is_safe, violations = check_content_safety(report.human_summary)
    if not is_safe:
        all_violations.extend([(f"summary", v) for v in violations])
    
    # Check claims
    for i, result in enumerate(report.claims):
        is_safe, violations = check_content_safety(result.reasoning)
        if not is_safe:
            all_violations.extend([(f"claim_{i}_reasoning", v) for v in violations])
        
        is_safe, violations = check_content_safety(result.recommendation)
        if not is_safe:
            all_violations.extend([(f"claim_{i}_recommendation", v) for v in violations])
    
    # Check recommendations
    for i, rec in enumerate(report.recommendations):
        is_safe, violations = check_content_safety(rec)
        if not is_safe:
            all_violations.extend([(f"recommendation_{i}", v) for v in violations])
    
    # Detect sensitive topics
    sensitive_topics = _detect_sensitive_topics(report)
    
    return {
        "is_compliant": len(all_violations) == 0,
        "violations": all_violations,
        "sensitive_topics": sensitive_topics,
        "disclaimer_present": bool(report.disclaimer),
        "total_violations": len(all_violations)
    }
