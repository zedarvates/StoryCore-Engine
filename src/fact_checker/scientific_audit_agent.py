"""
Scientific Audit Agent

This module provides the Scientific Audit Agent for text-based fact verification.
The agent orchestrates the complete verification pipeline from claim extraction
through evidence retrieval to final report generation.

Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
"""

import time
from typing import Dict, Any, Optional, List
from datetime import datetime

from .models import Claim, VerificationResult, Report, Configuration
from .fact_extraction import extract_claims
from .domain_routing import classify_domain
from .trusted_sources import get_trusted_sources
from .evidence_retrieval import retrieve_evidence
from .fact_checking import verify_claim
from .report_generation import generate_report


class ScientificAuditAgent:
    """
    Scientific Audit Agent for text-based fact verification.
    
    This agent orchestrates the complete verification pipeline:
    1. Preprocessing: Text normalization and validation
    2. Extraction: Identify factual claims in the text
    3. Classification: Assign domain categories to claims
    4. Evaluation: Retrieve evidence and verify claims
    5. Scoring: Calculate confidence and assign risk levels
    6. Reporting: Generate structured and human-readable outputs
    
    The agent follows safety constraints:
    - No intention attribution
    - No political judgments
    - No medical advice
    - Explicit uncertainty acknowledgment
    
    Attributes:
        config: Configuration settings for the agent
    """
    
    def __init__(self, config: Optional[Configuration] = None):
        """
        Initializes the Scientific Audit Agent.
        
        Args:
            config: Optional configuration settings. If not provided,
                   uses default configuration.
        """
        self.config = config or Configuration()
    
    def analyze(self, text: str, domain_hint: Optional[str] = None) -> Report:
        """
        Analyzes text content and generates a complete verification report.
        
        This is the main entry point for the agent. It executes the full
        pipeline and returns a comprehensive report with both structured
        data and human-readable summary.
        
        Args:
            text: Input text content to analyze
            domain_hint: Optional hint about the primary domain of the text
            
        Returns:
            Report object with verification results and recommendations
            
        Raises:
            ValueError: If text is empty or invalid
            
        Examples:
            >>> agent = ScientificAuditAgent()
            >>> text = "Water boils at 100 degrees Celsius at sea level."
            >>> report = agent.analyze(text)
            >>> report.summary_statistics['total_claims'] > 0
            True
            >>> len(report.human_summary) > 0
            True
        """
        start_time = time.time()
        
        # Step 1: Preprocessing
        preprocessed_text = self._preprocess(text)
        
        # Step 2: Extraction - Extract factual claims
        claims = self._extract_claims(preprocessed_text, domain_hint)
        
        # Step 3: Classification - Assign domains to claims
        claims = self._classify_claims(claims)
        
        # Step 4: Evaluation - Retrieve evidence and verify claims
        verification_results = self._evaluate_claims(claims)
        
        # Step 5: Scoring - Already done in evaluation step
        # (confidence scores and risk levels assigned during verification)
        
        # Step 6: Reporting - Generate final report
        processing_time_ms = int((time.time() - start_time) * 1000)
        report = self._generate_report(
            verification_results,
            preprocessed_text,
            processing_time_ms
        )
        
        return report
    
    def _preprocess(self, text: str) -> str:
        """
        Preprocesses input text for analysis.
        
        Performs:
        - Validation (non-empty, reasonable length)
        - Normalization (whitespace, encoding)
        - Sanitization (remove problematic characters)
        
        Args:
            text: Raw input text
            
        Returns:
            Preprocessed text ready for analysis
            
        Raises:
            ValueError: If text is empty or invalid
        """
        if not text or not text.strip():
            raise ValueError("Input text cannot be empty")
        
        # Normalize whitespace
        text = " ".join(text.split())
        
        # Check length constraints
        max_length = 50000  # ~5000 words
        if len(text) > max_length:
            raise ValueError(
                f"Input text exceeds maximum length of {max_length} characters. "
                f"Provided: {len(text)} characters."
            )
        
        return text
    
    def _extract_claims(self, text: str, domain_hint: Optional[str] = None) -> List[Claim]:
        """
        Extracts factual claims from preprocessed text.
        
        Uses the fact_extraction API to identify factual assertions.
        
        Args:
            text: Preprocessed text
            domain_hint: Optional domain hint for improved extraction
            
        Returns:
            List of Claim objects
        """
        claims = extract_claims(text, domain_hint)
        
        # Log extraction results
        print(f"[Scientific Audit Agent] Extracted {len(claims)} claim(s)")
        
        return claims
    
    def _classify_claims(self, claims: List[Claim]) -> List[Claim]:
        """
        Classifies claims into domain categories.
        
        Uses the domain_routing API to assign domains to each claim.
        Updates the claim objects in place.
        
        Args:
            claims: List of claims to classify
            
        Returns:
            List of claims with domain assignments
        """
        for claim in claims:
            domain = classify_domain(claim, self.config)
            claim.domain = domain
        
        # Log classification results
        domain_counts = {}
        for claim in claims:
            domain_counts[claim.domain] = domain_counts.get(claim.domain, 0) + 1
        
        print(f"[Scientific Audit Agent] Domain distribution: {domain_counts}")
        
        return claims
    
    def _evaluate_claims(self, claims: List[Claim]) -> List[VerificationResult]:
        """
        Evaluates claims by retrieving evidence and verifying.
        
        For each claim:
        1. Get trusted sources for the claim's domain
        2. Retrieve evidence from those sources
        3. Verify the claim using the evidence
        4. Generate recommendations for risky claims
        
        Args:
            claims: List of classified claims
            
        Returns:
            List of VerificationResult objects
        """
        verification_results = []
        
        for i, claim in enumerate(claims, 1):
            print(f"[Scientific Audit Agent] Evaluating claim {i}/{len(claims)}: {claim.text[:50]}...")
            
            # Get trusted sources for this domain
            sources = get_trusted_sources(claim.domain or "general", self.config)
            
            # Retrieve evidence
            evidence = retrieve_evidence(claim, sources, max_results=5)
            
            # Verify claim with evidence
            result = verify_claim(claim, evidence, self.config)
            
            # Add recommendation for risky claims
            if result.risk_level in ["high", "critical"]:
                result.recommendation = self._generate_risk_recommendation(result)
            
            verification_results.append(result)
        
        return verification_results
    
    def _generate_risk_recommendation(self, result: VerificationResult) -> str:
        """
        Generates specific recommendations for risky claims.
        
        Provides actionable guidance based on the risk level and
        available evidence.
        
        Args:
            result: Verification result for a risky claim
            
        Returns:
            Recommendation string
        """
        claim_text = result.claim.text[:100]
        
        if result.risk_level == "critical":
            return (
                f"CRITICAL RISK: The claim '{claim_text}' has very low confidence "
                f"({result.confidence:.1f}%). This claim should be removed or "
                f"completely rewritten with verified information from authoritative sources. "
                f"Do not publish without substantial revision."
            )
        elif result.risk_level == "high":
            if not result.supporting_evidence:
                return (
                    f"HIGH RISK: The claim '{claim_text}' lacks supporting evidence. "
                    f"Find at least 2-3 authoritative sources that confirm this claim "
                    f"before using it. Consider consulting academic journals, government "
                    f"publications, or established encyclopedias."
                )
            else:
                return (
                    f"HIGH RISK: The claim '{claim_text}' has conflicting evidence. "
                    f"Review the contradicting sources and either revise the claim to "
                    f"be more accurate or add qualifying language (e.g., 'according to', "
                    f"'some studies suggest')."
                )
        
        return result.recommendation
    
    def _generate_report(
        self,
        verification_results: List[VerificationResult],
        original_text: str,
        processing_time_ms: int
    ) -> Report:
        """
        Generates the final verification report.
        
        Uses the report_generation API to create structured and
        human-readable outputs.
        
        Args:
            verification_results: List of verification results
            original_text: Original input text
            processing_time_ms: Processing time in milliseconds
            
        Returns:
            Complete Report object
        """
        report = generate_report(
            verification_results,
            original_text,
            format="json"
        )
        
        # Update processing time in metadata
        report.metadata["processing_time_ms"] = processing_time_ms
        
        # Add agent-specific metadata
        report.metadata["agent"] = "scientific_audit"
        report.metadata["agent_version"] = "1.0"
        
        print(f"[Scientific Audit Agent] Analysis complete in {processing_time_ms}ms")
        
        return report
    
    def analyze_batch(
        self,
        texts: List[str],
        domain_hints: Optional[List[str]] = None
    ) -> List[Report]:
        """
        Analyzes multiple texts in batch.
        
        Processes each text independently and returns a list of reports.
        
        Args:
            texts: List of text strings to analyze
            domain_hints: Optional list of domain hints (one per text)
            
        Returns:
            List of Report objects in same order as input texts
            
        Raises:
            ValueError: If domain_hints length doesn't match texts length
        """
        if domain_hints and len(domain_hints) != len(texts):
            raise ValueError("Number of domain hints must match number of texts")
        
        reports = []
        
        for i, text in enumerate(texts):
            hint = domain_hints[i] if domain_hints else None
            print(f"\n[Scientific Audit Agent] Processing text {i+1}/{len(texts)}")
            
            try:
                report = self.analyze(text, hint)
                reports.append(report)
            except Exception as e:
                print(f"[Scientific Audit Agent] Error processing text {i+1}: {e}")
                # Create error report
                error_report = self._create_error_report(text, str(e))
                reports.append(error_report)
        
        return reports
    
    def _create_error_report(self, text: str, error_message: str) -> Report:
        """
        Creates an error report when analysis fails.
        
        Args:
            text: Original text that failed
            error_message: Error message
            
        Returns:
            Report object indicating the error
        """
        return Report(
            metadata={
                "timestamp": datetime.now().isoformat(),
                "version": "1.0",
                "input_hash": "",
                "processing_time_ms": 0,
                "agent": "scientific_audit",
                "error": error_message
            },
            claims=[],
            manipulation_signals=[],
            summary_statistics={
                "total_claims": 0,
                "high_risk_count": 0,
                "average_confidence": 0.0,
                "domains_analyzed": []
            },
            human_summary=f"Analysis failed: {error_message}",
            recommendations=["Fix the error and retry analysis."],
            disclaimer="This report indicates an error occurred during analysis."
        )
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Returns statistics about the agent's configuration and capabilities.
        
        Returns:
            Dictionary with agent statistics
        """
        return {
            "agent_type": "scientific_audit",
            "version": "1.0",
            "confidence_threshold": self.config.confidence_threshold,
            "max_concurrent_verifications": self.config.max_concurrent_verifications,
            "timeout_seconds": self.config.timeout_seconds,
            "cache_enabled": self.config.cache_enabled,
            "supported_domains": ["physics", "biology", "history", "statistics", "general"]
        }


def create_agent(config: Optional[Configuration] = None) -> ScientificAuditAgent:
    """
    Factory function to create a Scientific Audit Agent.
    
    Args:
        config: Optional configuration settings
        
    Returns:
        Configured ScientificAuditAgent instance
    """
    return ScientificAuditAgent(config)
