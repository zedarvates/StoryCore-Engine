"""
Core data models for the fact-checking system.

This module defines all data structures used throughout the system,
including claims, evidence, verification results, and reports.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime
from enum import Enum


class DomainType(str, Enum):
    """Valid domain classifications for claims."""
    PHYSICS = "physics"
    BIOLOGY = "biology"
    HISTORY = "history"
    STATISTICS = "statistics"
    GENERAL = "general"


class RiskLevel(str, Enum):
    """Risk level classifications for verification results."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class SourceType(str, Enum):
    """Types of evidence sources."""
    ACADEMIC = "academic"
    NEWS = "news"
    GOVERNMENT = "government"
    ENCYCLOPEDIA = "encyclopedia"


class ManipulationType(str, Enum):
    """Types of manipulation signals in video transcripts."""
    LOGICAL_INCONSISTENCY = "logical_inconsistency"
    EMOTIONAL_MANIPULATION = "emotional_manipulation"
    NARRATIVE_BIAS = "narrative_bias"


class SeverityLevel(str, Enum):
    """Severity levels for manipulation signals."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class Claim:
    """
    Represents a factual claim extracted from content.
    
    Attributes:
        id: Unique identifier for the claim
        text: The actual claim text
        position: Start and end character positions in source text
        domain: Domain classification (physics, biology, etc.)
        confidence: Confidence score (0-100)
        risk_level: Risk level classification
        evidence: List of supporting/contradicting evidence
        recommendation: Actionable recommendation for the claim
    """
    id: str
    text: str
    position: Tuple[int, int]
    domain: Optional[str] = None
    confidence: Optional[float] = None
    risk_level: Optional[str] = None
    evidence: List['Evidence'] = field(default_factory=list)
    recommendation: Optional[str] = None


@dataclass
class Evidence:
    """
    Represents evidence for or against a claim.
    
    Attributes:
        source: Name or identifier of the source
        source_type: Type of source (academic, news, etc.)
        credibility_score: Credibility rating (0-100)
        relevance: Relevance to the claim (0-100)
        excerpt: Relevant excerpt from the source
        url: Optional URL to the source
        publication_date: Optional publication date
    """
    source: str
    source_type: str
    credibility_score: float
    relevance: float
    excerpt: str
    url: Optional[str] = None
    publication_date: Optional[datetime] = None


@dataclass
class VerificationResult:
    """
    Result of verifying a single claim.
    
    Attributes:
        claim: The claim that was verified
        confidence: Confidence score (0-100)
        risk_level: Risk level classification
        supporting_evidence: Evidence supporting the claim
        contradicting_evidence: Evidence contradicting the claim
        reasoning: Explanation of the verification decision
        recommendation: Actionable recommendation
    """
    claim: Claim
    confidence: float
    risk_level: str
    supporting_evidence: List[Evidence]
    contradicting_evidence: List[Evidence]
    reasoning: str
    recommendation: str


@dataclass
class ManipulationSignal:
    """
    Represents a detected manipulation signal in video transcripts.
    
    Attributes:
        type: Type of manipulation detected
        severity: Severity level of the manipulation
        timestamp_start: Start timestamp (optional)
        timestamp_end: End timestamp (optional)
        description: Description of the manipulation
        evidence: Evidence supporting the detection
        confidence: Confidence in the detection (0-100)
    """
    type: str
    severity: str
    description: str
    evidence: str
    confidence: float
    timestamp_start: Optional[str] = None
    timestamp_end: Optional[str] = None


@dataclass
class Report:
    """
    Complete verification report.
    
    Attributes:
        metadata: Report metadata (timestamp, version, etc.)
        claims: List of verification results for claims
        manipulation_signals: List of detected manipulation signals
        summary_statistics: Summary statistics for the report
        human_summary: Human-readable summary
        recommendations: List of actionable recommendations
        disclaimer: Disclaimer about automated verification
    """
    metadata: Dict[str, Any]
    claims: List[VerificationResult]
    manipulation_signals: List[ManipulationSignal]
    summary_statistics: Dict[str, Any]
    human_summary: str
    recommendations: List[str]
    disclaimer: str


@dataclass
class Configuration:
    """
    System configuration settings.
    
    Attributes:
        confidence_threshold: Minimum confidence score for acceptance
        risk_level_mappings: Mapping of confidence ranges to risk levels
        trusted_sources: Dictionary of trusted sources by domain
        custom_domains: List of custom domain definitions
        cache_enabled: Whether caching is enabled
        cache_ttl_seconds: Cache time-to-live in seconds
        max_concurrent_verifications: Maximum parallel verifications
        timeout_seconds: Timeout for verification operations
    """
    confidence_threshold: float = 70.0
    risk_level_mappings: Dict[str, Tuple[float, float]] = field(default_factory=lambda: {
        "critical": (0, 30),
        "high": (30, 50),
        "medium": (50, 70),
        "low": (70, 100)
    })
    trusted_sources: Dict[str, List[str]] = field(default_factory=dict)
    custom_domains: List[str] = field(default_factory=list)
    cache_enabled: bool = True
    cache_ttl_seconds: int = 86400  # 24 hours
    max_concurrent_verifications: int = 5
    timeout_seconds: int = 60
